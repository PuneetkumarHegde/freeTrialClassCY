import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prisma';
import { Role, AppointmentStatus, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { mentorPortalService } from '../services/mentor-portal.service';
import { adminService } from '../services/admin.service';

describe('Phase P8: Mentor Operations, Attendance & Capacity Integration', () => {
  let mentorAId: string;
  let mentorBId: string;
  let mentorAUserId: string;
  let mentorBUserId: string;
  let adminUserId: string;
  let parentUserId: string;
  let testAppointmentId: string;

  beforeAll(async () => {
    // 1. Setup Admin
    const passwordHash = await bcrypt.hash('Admin@1234', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin_test_p8@codeyoung.in' },
      update: { passwordHash, role: Role.ADMIN },
      create: {
        fullName: 'Admin Test P8',
        email: 'admin_test_p8@codeyoung.in',
        passwordHash,
        role: Role.ADMIN,
        timezone: 'Asia/Kolkata',
      },
    });
    adminUserId = adminUser.id;

    // 2. Setup Mentor A
    const mentorPass = await bcrypt.hash('Mentor@1234', 10);
    const mentorUserA = await prisma.user.upsert({
      where: { email: 'mntr_test_a@codeyoung.in' },
      update: { passwordHash: mentorPass, role: Role.MENTOR },
      create: {
        fullName: 'Mentor Test A',
        email: 'mntr_test_a@codeyoung.in',
        passwordHash: mentorPass,
        role: Role.MENTOR,
        timezone: 'Asia/Kolkata',
      },
    });
    mentorAUserId = mentorUserA.id;

    const mentorA = await prisma.mentor.upsert({
      where: { userId: mentorUserA.id },
      update: { timezone: 'Asia/Kolkata', isActive: true },
      create: { userId: mentorUserA.id, timezone: 'Asia/Kolkata', isActive: true },
    });
    mentorAId = mentorA.id;

    // Add availability for Mentor A
    await prisma.mentorAvailability.deleteMany({ where: { mentorId: mentorA.id } });
    await prisma.mentorAvailability.create({
      data: {
        mentorId: mentorA.id,
        dayOfWeek: 1, // Mon
        localStart: '16:00',
        localEnd: '21:00',
      },
    });

    // 3. Setup Mentor B
    const mentorUserB = await prisma.user.upsert({
      where: { email: 'mntr_test_b@codeyoung.in' },
      update: { passwordHash: mentorPass, role: Role.MENTOR },
      create: {
        fullName: 'Mentor Test B',
        email: 'mntr_test_b@codeyoung.in',
        passwordHash: mentorPass,
        role: Role.MENTOR,
        timezone: 'Asia/Kolkata',
      },
    });
    mentorBUserId = mentorUserB.id;

    const mentorB = await prisma.mentor.upsert({
      where: { userId: mentorUserB.id },
      update: { timezone: 'Asia/Kolkata', isActive: true },
      create: { userId: mentorUserB.id, timezone: 'Asia/Kolkata', isActive: true },
    });
    mentorBId = mentorB.id;

    // 4. Setup Parent User
    const parentUser = await prisma.user.upsert({
      where: { email: 'parent_test_p8@example.com' },
      update: {},
      create: {
        fullName: 'Parent Test P8',
        email: 'parent_test_p8@example.com',
        role: Role.PARENT,
        timezone: 'America/New_York',
      },
    });
    parentUserId = parentUser.id;

    // Clean previous test data if present
    await prisma.appointment.deleteMany({
      where: {
        mentorId: { in: [mentorA.id, mentorB.id] },
      },
    });

    // 5. Create appointment for Mentor A with attendance record
    const appointment = await prisma.appointment.create({
      data: {
        mentorId: mentorA.id,
        parentId: parentUser.id,
        studentName: 'Aarav Student',
        studentGrade: 'Grade 5',
        subject: 'Scratch & Coding',
        learningGoal: 'Game development',
        startTime: new Date('2026-10-15T11:00:00.000Z'), // 16:30 IST
        endTime: new Date('2026-10-15T12:00:00.000Z'),
        status: AppointmentStatus.CONFIRMED,
        meetingLink: 'https://demo.codeyoung.com/class/BK-TEST01',
        attendance: {
          create: {
            status: AttendanceStatus.SCHEDULED,
          },
        },
      },
    });
    testAppointmentId = appointment.id;
  });

  afterAll(async () => {
    // Clean up test records
    await prisma.trialAttendance.deleteMany({ where: { appointmentId: testAppointmentId } });
    await prisma.appointment.deleteMany({ where: { id: testAppointmentId } });
    await prisma.mentor.deleteMany({ where: { id: { in: [mentorAId, mentorBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [mentorAUserId, mentorBUserId, parentUserId] } } });
  });

  it('1. Mentor can fetch own profile and weekly working hours', async () => {
    const profile = await mentorPortalService.getMentorProfile(mentorAUserId);

    expect(profile).toBeDefined();
    expect(profile.fullName).toBe('Mentor Test A');
    expect(profile.timezone).toBe('Asia/Kolkata');
    expect(profile.availability.length).toBeGreaterThan(0);
  });

  it('2. Mentor sees date-wise schedule and hourly timeline in mentor timezone', async () => {
    const schedule = await mentorPortalService.getMentorScheduleAndAvailability(mentorAUserId, '2026-10-15');

    expect(schedule).toBeDefined();
    expect(schedule.date).toBe('2026-10-15');
    expect(schedule.dailyCapacity.totalLimit).toBe(2);
    expect(schedule.dailyCapacity.todayCount).toBe(1);
    expect(schedule.dailyCapacity.remainingSlots).toBe(1);
    expect(schedule.timeSlots).toBeInstanceOf(Array);
  });

  it('3. Mentor A can view their assigned appointments', async () => {
    const { appointments } = await mentorPortalService.getMentorAppointments(mentorAUserId);

    expect(appointments.some((a) => a.appointmentId === testAppointmentId)).toBe(true);
  });

  it('4. Mentor B cannot view Mentor A private appointment details', async () => {
    await expect(
      mentorPortalService.getMentorAppointmentById(mentorBUserId, testAppointmentId)
    ).rejects.toThrow('Appointment not found.');
  });

  it('5. Mentor can record class join timestamp in attendance', async () => {
    const attendance = await mentorPortalService.recordClassJoin(mentorAUserId, testAppointmentId);

    expect(attendance).toBeDefined();
    expect(attendance.status).toBe(AttendanceStatus.JOINED);
    expect(attendance.joinedAt).toBeDefined();
  });

  it('6. Assigned mentor can complete trial class & update TrialAttendance to COMPLETED', async () => {
    const updated = await mentorPortalService.completeAppointment(
      mentorAUserId,
      testAppointmentId,
      Role.MENTOR,
      'Student did an outstanding job with coding loops.'
    );

    expect(updated.status).toBe(AppointmentStatus.COMPLETED);

    // Verify TrialAttendance in database
    const attendance = await prisma.trialAttendance.findUnique({
      where: { appointmentId: testAppointmentId },
    });
    expect(attendance?.status).toBe(AttendanceStatus.COMPLETED);
    expect(attendance?.completedAt).toBeDefined();
    expect(attendance?.mentorNotes).toContain('outstanding job');
  });

  it('7. Completed trial now appears in Admin "Completed Trials" report', async () => {
    const completedList = await adminService.getCompletedTrials({ limit: 50 });

    expect(completedList.items.some((item) => item.appointmentId === testAppointmentId)).toBe(true);
  });
});
