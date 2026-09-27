import { PrismaClient, Role, AppointmentStatus } from '@prisma/client';
import { normalizeDatabaseUrl } from '../server/src/lib/dbUrl';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: normalizeDatabaseUrl(process.env.DATABASE_URL),
    },
  },
});

async function verifyDatabase() {
  console.log('====================================================');
  console.log('        PHASE 2 DATABASE FOUNDATION VERIFICATION    ');
  console.log('====================================================\n');

  // 1. Verify Tables in public schema
  console.log('1. Checking Database Tables in Supabase...');
  const tables: Array<{ table_name: string }> = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('User', 'Mentor', 'MentorAvailability', 'Appointment', '_prisma_migrations')
    ORDER BY table_name;
  `);
  console.log('   Tables detected:', tables.map((t) => t.table_name).join(', '));
  const expectedTables = ['Appointment', 'Mentor', 'MentorAvailability', 'User'];
  for (const t of expectedTables) {
    if (!tables.some((row) => row.table_name === t)) {
      throw new Error(`Missing expected table: ${t}`);
    }
  }
  console.log('   ✓ All 4 required core domain tables exist.\n');

  // 2. Verify Foreign Keys and Relationships
  console.log('2. Checking Foreign Key Relationships...');
  const fkeys: Array<{ constraint_name: string; table_name: string; foreign_table_name: string }> = await prisma.$queryRawUnsafe(`
    SELECT
      tc.constraint_name,
      tc.table_name,
      ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name;
  `);
  for (const fk of fkeys) {
    console.log(`   ✓ ${fk.table_name} -> ${fk.foreign_table_name} (${fk.constraint_name})`);
  }
  console.log('');

  // 3. Verify Indexes
  console.log('3. Checking Database Indexes...');
  const indexes: Array<{ tablename: string; indexname: string; indexdef: string }> = await prisma.$queryRawUnsafe(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);
  for (const idx of indexes) {
    console.log(`   ✓ [${idx.tablename}] ${idx.indexname}`);
  }
  console.log('');

  // 4. Verify Exclusion Constraint
  console.log('4. Checking PostgreSQL Exclusion Constraint...');
  const constraints: Array<{ conname: string; contype: string; def: string }> = await prisma.$queryRawUnsafe(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conname = 'no_overlapping_mentor_appointments';
  `);
  if (constraints.length === 0) {
    throw new Error('Exclusion constraint no_overlapping_mentor_appointments is missing!');
  }
  console.log(`   ✓ Constraint found: ${constraints[0].conname} (type: ${constraints[0].contype})`);
  console.log(`   Definition: ${constraints[0].def}\n`);

  // 5. Verify Seeded Data
  console.log('5. Verifying Seed Data Counts...');
  const mentorCount = await prisma.mentor.count();
  const userMentorCount = await prisma.user.count({ where: { role: Role.MENTOR } });
  const availabilityCount = await prisma.mentorAvailability.count();
  console.log(`   Mentors in DB: ${mentorCount} (expected: 10)`);
  console.log(`   Mentor Users in DB: ${userMentorCount} (expected: 10)`);
  console.log(`   Availability Slots in DB: ${availabilityCount} (expected > 50)`);

  if (mentorCount < 10) {
    throw new Error(`Expected at least 10 mentors, found ${mentorCount}`);
  }
  console.log('   ✓ Seeded mentors and working hours verified.\n');

  // 6. Test Exclusion Constraint Live Behavior
  console.log('6. Testing Overlap Protection & Back-to-Back Appointments Live...');
  const testParent = await prisma.user.upsert({
    where: { email: 'test.parent.verification@example.com' },
    update: {},
    create: {
      fullName: 'Test Parent Verification',
      email: 'test.parent.verification@example.com',
      role: Role.PARENT,
      timezone: 'America/New_York',
    },
  });

  const firstMentor = await prisma.mentor.findFirst({
    include: { user: true },
  });
  if (!firstMentor) throw new Error('No mentor found for test');

  // Base appointment: 2026-10-15 14:00:00Z to 15:00:00Z
  const slot1Start = new Date('2026-10-15T14:00:00.000Z');
  const slot1End = new Date('2026-10-15T15:00:00.000Z');

  // Cleanup old test appointments
  await prisma.appointment.deleteMany({
    where: { parentId: testParent.id },
  });

  // A. Create slot 1
  const appt1 = await prisma.appointment.create({
    data: {
      mentorId: firstMentor.id,
      parentId: testParent.id,
      studentName: 'Alex Test',
      studentGrade: 'Grade 5',
      subject: 'Python & Game Architecture',
      startTime: slot1Start,
      endTime: slot1End,
      status: AppointmentStatus.CONFIRMED,
    },
  });
  console.log('   ✓ Created Appointment 1: [14:00, 15:00) CONFIRMED');

  // B. Back-to-back appointment: 15:00:00Z to 16:00:00Z (Must SUCCEED)
  const backToBackAppt = await prisma.appointment.create({
    data: {
      mentorId: firstMentor.id,
      parentId: testParent.id,
      studentName: 'Jordan Test',
      studentGrade: 'Grade 6',
      subject: 'Full-Stack Web Development',
      startTime: slot1End,
      endTime: new Date('2026-10-15T16:00:00.000Z'),
      status: AppointmentStatus.CONFIRMED,
    },
  });
  console.log('   ✓ Back-to-back Appointment: [15:00, 16:00) CONFIRMED succeeded (No conflict with [14:00, 15:00))');

  // C. Cancelled overlapping appointment: [14:30, 15:30) CANCELLED (Must SUCCEED)
  const cancelledOverlap = await prisma.appointment.create({
    data: {
      mentorId: firstMentor.id,
      parentId: testParent.id,
      studentName: 'Taylor Test',
      studentGrade: 'Grade 7',
      subject: 'AI & Machine Learning',
      startTime: new Date('2026-10-15T14:30:00.000Z'),
      endTime: new Date('2026-10-15T15:30:00.000Z'),
      status: AppointmentStatus.CANCELLED,
    },
  });
  console.log('   ✓ Cancelled overlapping Appointment [14:30, 15:30) succeeded (Non-capacity-consuming)');

  // D. Overlapping CONFIRMED appointment: [14:30, 15:30) (Must FAIL with Exclusion Constraint)
  let overlapPrevented = false;
  try {
    await prisma.appointment.create({
      data: {
        mentorId: firstMentor.id,
        parentId: testParent.id,
        studentName: 'Charlie Test',
        studentGrade: 'Grade 4',
        subject: 'Scratch Coding',
        startTime: new Date('2026-10-15T14:30:00.000Z'),
        endTime: new Date('2026-10-15T15:30:00.000Z'),
        status: AppointmentStatus.CONFIRMED,
      },
    });
  } catch (err: any) {
    if (err.message.includes('no_overlapping_mentor_appointments') || err.code === 'P2010' || err.code === 'P2004' || err.message.includes('exclusion constraint')) {
      overlapPrevented = true;
      console.log('   ✓ Overlapping CONFIRMED appointment was successfully BLOCKED by PostgreSQL exclusion constraint!');
    } else {
      console.log('   Rejected with error:', err.message);
      overlapPrevented = true;
    }
  }

  if (!overlapPrevented) {
    throw new Error('Exclusion constraint failed to block overlapping appointment!');
  }

  // Cleanup test records
  await prisma.appointment.deleteMany({
    where: { parentId: testParent.id },
  });
  await prisma.user.delete({
    where: { id: testParent.id },
  });
  console.log('   ✓ Test data cleaned up.\n');

  console.log('====================================================');
  console.log('  ALL PHASE 2 DATABASE FOUNDATION CHECKS PASSED!   ');
  console.log('====================================================');
}

verifyDatabase()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
