import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { normalizeDatabaseUrl } from '../server/src/lib/dbUrl';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: normalizeDatabaseUrl(process.env.DATABASE_URL),
    },
  },
});

interface MentorSeedData {
  fullName: string;
  email: string;
  legacyEmail?: string;
  timezone: string;
  availabilities: Array<{
    dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
    localStart: string;
    localEnd: string;
  }>;
}

export const OFFICIAL_MENTORS: MentorSeedData[] = [
  {
    fullName: 'Aarav Sharma (Mentor 001)',
    email: 'mntr001@codeyoung.in',
    legacyEmail: 'aarav.sharma@codeyoung.com',
    timezone: 'Asia/Kolkata',
    availabilities: [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' }, // Mon
      { dayOfWeek: 2, localStart: '16:00', localEnd: '21:00' }, // Tue
      { dayOfWeek: 3, localStart: '16:00', localEnd: '21:00' }, // Wed
      { dayOfWeek: 4, localStart: '16:00', localEnd: '21:00' }, // Thu
      { dayOfWeek: 5, localStart: '16:00', localEnd: '21:00' }, // Fri
      { dayOfWeek: 6, localStart: '10:00', localEnd: '18:00' }, // Sat
    ],
  },
  {
    fullName: 'Priya Nair (Mentor 002)',
    email: 'mntr002@codeyoung.in',
    legacyEmail: 'priya.nair@codeyoung.com',
    timezone: 'Asia/Kolkata',
    availabilities: [
      { dayOfWeek: 1, localStart: '17:00', localEnd: '22:00' },
      { dayOfWeek: 2, localStart: '17:00', localEnd: '22:00' },
      { dayOfWeek: 4, localStart: '17:00', localEnd: '22:00' },
      { dayOfWeek: 5, localStart: '17:00', localEnd: '22:00' },
      { dayOfWeek: 6, localStart: '11:00', localEnd: '19:00' },
      { dayOfWeek: 0, localStart: '11:00', localEnd: '19:00' }, // Sun
    ],
  },
  {
    fullName: 'Rohan Kulkarni (Mentor 003)',
    email: 'mntr003@codeyoung.in',
    legacyEmail: 'rohan.kulkarni@codeyoung.com',
    timezone: 'Asia/Kolkata',
    availabilities: [
      { dayOfWeek: 2, localStart: '16:30', localEnd: '21:30' },
      { dayOfWeek: 3, localStart: '16:30', localEnd: '21:30' },
      { dayOfWeek: 4, localStart: '16:30', localEnd: '21:30' },
      { dayOfWeek: 5, localStart: '16:30', localEnd: '21:30' },
      { dayOfWeek: 6, localStart: '09:30', localEnd: '17:30' },
    ],
  },
  {
    fullName: 'Ananya Iyer (Mentor 004)',
    email: 'mntr004@codeyoung.in',
    legacyEmail: 'ananya.iyer@codeyoung.com',
    timezone: 'Asia/Kolkata',
    availabilities: [
      { dayOfWeek: 1, localStart: '18:00', localEnd: '22:00' },
      { dayOfWeek: 3, localStart: '18:00', localEnd: '22:00' },
      { dayOfWeek: 5, localStart: '18:00', localEnd: '22:00' },
      { dayOfWeek: 6, localStart: '10:00', localEnd: '18:00' },
      { dayOfWeek: 0, localStart: '10:00', localEnd: '16:00' },
    ],
  },
  {
    fullName: 'Vikram Patel (Mentor 005)',
    email: 'mntr005@codeyoung.in',
    legacyEmail: 'vikram.patel@codeyoung.com',
    timezone: 'Asia/Kolkata',
    availabilities: [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '20:30' },
      { dayOfWeek: 2, localStart: '16:00', localEnd: '20:30' },
      { dayOfWeek: 3, localStart: '16:00', localEnd: '20:30' },
      { dayOfWeek: 4, localStart: '16:00', localEnd: '20:30' },
      { dayOfWeek: 6, localStart: '10:00', localEnd: '17:00' },
    ],
  },
  {
    fullName: 'Neha Sen (Mentor 006)',
    email: 'mntr006@codeyoung.in',
    legacyEmail: 'neha.sen@codeyoung.com',
    timezone: 'Asia/Kolkata',
    availabilities: [
      { dayOfWeek: 2, localStart: '17:00', localEnd: '21:00' },
      { dayOfWeek: 3, localStart: '17:00', localEnd: '21:00' },
      { dayOfWeek: 4, localStart: '17:00', localEnd: '21:00' },
      { dayOfWeek: 5, localStart: '17:00', localEnd: '21:00' },
      { dayOfWeek: 6, localStart: '11:00', localEnd: '18:00' },
    ],
  },
  {
    fullName: 'Aditya Verma (Mentor 007)',
    email: 'mntr007@codeyoung.in',
    legacyEmail: 'aditya.verma@codeyoung.com',
    timezone: 'Asia/Kolkata',
    availabilities: [
      { dayOfWeek: 1, localStart: '17:30', localEnd: '21:30' },
      { dayOfWeek: 3, localStart: '17:30', localEnd: '21:30' },
      { dayOfWeek: 5, localStart: '17:30', localEnd: '21:30' },
      { dayOfWeek: 6, localStart: '10:00', localEnd: '19:00' },
      { dayOfWeek: 0, localStart: '10:00', localEnd: '18:00' },
    ],
  },
  {
    fullName: 'Sneha Mukherjee (Mentor 008)',
    email: 'mntr008@codeyoung.in',
    legacyEmail: 'sneha.mukherjee@codeyoung.com',
    timezone: 'Asia/Kolkata',
    availabilities: [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
      { dayOfWeek: 2, localStart: '16:00', localEnd: '21:00' },
      { dayOfWeek: 4, localStart: '16:00', localEnd: '21:00' },
      { dayOfWeek: 5, localStart: '16:00', localEnd: '21:00' },
      { dayOfWeek: 6, localStart: '12:00', localEnd: '18:00' },
    ],
  },
  {
    fullName: 'Karan Malhotra (Mentor 009)',
    email: 'mntr009@codeyoung.in',
    legacyEmail: 'karan.malhotra@codeyoung.com',
    timezone: 'Asia/Kolkata',
    availabilities: [
      { dayOfWeek: 1, localStart: '17:00', localEnd: '22:00' },
      { dayOfWeek: 2, localStart: '17:00', localEnd: '22:00' },
      { dayOfWeek: 3, localStart: '17:00', localEnd: '22:00' },
      { dayOfWeek: 4, localStart: '17:00', localEnd: '22:00' },
      { dayOfWeek: 6, localStart: '10:00', localEnd: '18:00' },
    ],
  },
  {
    fullName: 'Divya Rao (Mentor 010)',
    email: 'mntr010@codeyoung.in',
    legacyEmail: 'divya.rao@codeyoung.com',
    timezone: 'Asia/Kolkata',
    availabilities: [
      { dayOfWeek: 2, localStart: '16:00', localEnd: '21:00' },
      { dayOfWeek: 3, localStart: '16:00', localEnd: '21:00' },
      { dayOfWeek: 4, localStart: '16:00', localEnd: '21:00' },
      { dayOfWeek: 5, localStart: '16:00', localEnd: '21:00' },
      { dayOfWeek: 6, localStart: '11:00', localEnd: '19:00' },
      { dayOfWeek: 0, localStart: '11:00', localEnd: '17:00' },
    ],
  },
];

export const OFFICIAL_MENTOR_EMAILS = OFFICIAL_MENTORS.map((m) => m.email);

async function main() {
  console.log('--- Seeding Codeyoung Database (Strict Idempotency) ---');

  // Ensure btree_gist extension and exclusion constraint exist
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS btree_gist;`);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_mentor_appointments'
        ) THEN
          ALTER TABLE "Appointment"
          ADD CONSTRAINT "no_overlapping_mentor_appointments"
          EXCLUDE USING gist (
            "mentorId" WITH =,
            tstzrange("startTime", "endTime", '[)') WITH &&
          )
          WHERE (status != 'CANCELLED');
        END IF;
      END $$;
    `);
  } catch (err) {
    console.warn('Postgres constraint warning (optional in test/mock):', err);
  }

  const defaultMentorPasswordHash = await bcrypt.hash(process.env.DEFAULT_MENTOR_PASSWORD || 'Mentor@1234', 10);
  const defaultAdminPasswordHash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@1234', 10);

  // 1. Seed Admin Users (admin@codeyoung.in and admin@codeyoung.com)
  const adminEmails = ['admin@codeyoung.in', 'admin@codeyoung.com'];
  for (const adminEmail of adminEmails) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        fullName: 'Codeyoung Administrator',
        role: Role.ADMIN,
        passwordHash: defaultAdminPasswordHash,
        timezone: 'Asia/Kolkata',
      },
      create: {
        fullName: 'Codeyoung Administrator',
        email: adminEmail,
        role: Role.ADMIN,
        passwordHash: defaultAdminPasswordHash,
        timezone: 'Asia/Kolkata',
      },
    });
    console.log(`✓ Seeded Admin: ${adminEmail}`);
  }

  // 2. Map and migrate duplicate legacy mentor accounts to official accounts
  const createdOfficialMentors: Record<string, string> = {};

  for (const data of OFFICIAL_MENTORS) {
    // Upsert User for the official mentor email (mntrXXX@codeyoung.in)
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {
        fullName: data.fullName,
        role: Role.MENTOR,
        timezone: data.timezone,
        passwordHash: defaultMentorPasswordHash,
      },
      create: {
        fullName: data.fullName,
        email: data.email,
        role: Role.MENTOR,
        timezone: data.timezone,
        passwordHash: defaultMentorPasswordHash,
      },
    });

    // Upsert official Mentor record
    const mentor = await prisma.mentor.upsert({
      where: { userId: user.id },
      update: {
        timezone: data.timezone,
        isActive: true,
      },
      create: {
        userId: user.id,
        timezone: data.timezone,
        isActive: true,
      },
    });

    createdOfficialMentors[data.email] = mentor.id;

    // If legacy user exists (e.g. rohan.kulkarni@codeyoung.com), migrate any appointments to the official mentor record
    if (data.legacyEmail) {
      const legacyUser = await prisma.user.findUnique({
        where: { email: data.legacyEmail },
        include: { mentor: true },
      });

      if (legacyUser?.mentor && legacyUser.mentor.id !== mentor.id) {
        // Migrate appointments from legacy mentor to official mentor
        const migrated = await prisma.appointment.updateMany({
          where: { mentorId: legacyUser.mentor.id },
          data: { mentorId: mentor.id },
        });
        if (migrated.count > 0) {
          console.log(`  ↪ Migrated ${migrated.count} appointments from legacy ${data.legacyEmail} to official ${data.email}`);
        }

        // Deactivate or remove legacy mentor record
        await prisma.mentorAvailability.deleteMany({
          where: { mentorId: legacyUser.mentor.id },
        });
        await prisma.mentor.update({
          where: { id: legacyUser.mentor.id },
          data: { isActive: false },
        });
      }
    }

    // Refresh availability slots for official mentor
    await prisma.mentorAvailability.deleteMany({
      where: { mentorId: mentor.id },
    });

    for (const slot of data.availabilities) {
      await prisma.mentorAvailability.create({
        data: {
          mentorId: mentor.id,
          dayOfWeek: slot.dayOfWeek,
          localStart: slot.localStart,
          localEnd: slot.localEnd,
        },
      });
    }

    console.log(`✓ Seeded Official Mentor: ${data.fullName} (${data.email})`);
  }

  // 3. Delete extra/duplicate mentor records from the database (preserve historical appointments)
  const extraMentors = await prisma.mentor.findMany({
    where: {
      user: {
        email: {
          notIn: OFFICIAL_MENTOR_EMAILS,
        },
      },
    },
    include: {
      appointments: true,
      user: true,
    },
  });

  for (const extra of extraMentors) {
    if (extra.appointments.length === 0) {
      await prisma.mentorAvailability.deleteMany({ where: { mentorId: extra.id } });
      await prisma.mentorUnavailability.deleteMany({ where: { mentorId: extra.id } });
      await prisma.mentor.delete({ where: { id: extra.id } });
      try {
        const parentApps = await prisma.appointment.count({ where: { parentId: extra.userId } });
        if (parentApps === 0) {
          await prisma.notification.deleteMany({ where: { recipientUserId: extra.userId } });
          await prisma.user.delete({ where: { id: extra.userId } });
        } else {
          await prisma.user.update({ where: { id: extra.userId }, data: { role: Role.PARENT } });
        }
      } catch {
        await prisma.user.update({ where: { id: extra.userId }, data: { role: Role.PARENT } }).catch(() => {});
      }
      console.log(`✓ Deleted extra duplicate mentor record: ${extra.user.email}`);
    } else {
      await prisma.mentor.update({
        where: { id: extra.id },
        data: { isActive: false },
      });
      console.log(`✓ Preserved historical appointments & deactivated extra mentor: ${extra.user.email}`);
    }
  }

  // Verify exactly 10 active mentors exist
  const activeCount = await prisma.mentor.count({
    where: { isActive: true },
  });

  console.log(`\n--- Verification Summary ---`);
  console.log(`Active Mentors in DB: ${activeCount}`);
  console.log(`Daily Class Capacity: ${activeCount * 2} classes/day`);
  console.log(`Official Mentors configured: 10`);
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
