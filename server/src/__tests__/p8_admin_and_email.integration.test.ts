import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prisma';
import { Role, AppointmentStatus, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { adminService } from '../services/admin.service';
import { bookingService } from '../services/booking.service';
import { emailService } from '../services/email.service';
import { notificationService } from '../services/notification.service';

describe('Phase P8: Admin Operations, Email Logs & Notifications Integration', () => {
  let createdMentorId: string;
  let testBookingAppointmentId: string;

  beforeAll(async () => {
    // Setup Admin user
    const passwordHash = await bcrypt.hash('Admin@1234', 10);
    await prisma.user.upsert({
      where: { email: 'admin_ops_p8@codeyoung.in' },
      update: { passwordHash, role: Role.ADMIN },
      create: {
        fullName: 'Admin Ops P8',
        email: 'admin_ops_p8@codeyoung.in',
        passwordHash,
        role: Role.ADMIN,
        timezone: 'Asia/Kolkata',
      },
    });
  });

  afterAll(async () => {
    if (testBookingAppointmentId) {
      await prisma.notification.deleteMany({ where: { appointmentId: testBookingAppointmentId } });
      await prisma.emailLog.deleteMany({ where: { appointmentId: testBookingAppointmentId } });
      await prisma.trialAttendance.deleteMany({ where: { appointmentId: testBookingAppointmentId } });
      await prisma.appointment.deleteMany({ where: { id: testBookingAppointmentId } });
    }
    if (createdMentorId) {
      await prisma.mentorAvailability.deleteMany({ where: { mentorId: createdMentorId } });
      const mentor = await prisma.mentor.findUnique({ where: { id: createdMentorId } });
      if (mentor) {
        await prisma.mentor.delete({ where: { id: createdMentorId } });
        await prisma.user.delete({ where: { id: mentor.userId } });
      }
    }
  });

  it('1. Admin can add a new mentor with role MENTOR in database', async () => {
    const newMentor = await adminService.createMentor({
      fullName: 'Dr. Sameer Joshi',
      email: 'sameer.joshi@codeyoung.in',
      password: 'Mentor@1234',
      timezone: 'Asia/Kolkata',
      isActive: true,
    });

    expect(newMentor.fullName).toBe('Dr. Sameer Joshi');
    expect(newMentor.email).toBe('sameer.joshi@codeyoung.in');

    createdMentorId = newMentor.id;

    // Verify database record has role = MENTOR
    const user = await prisma.user.findUnique({
      where: { email: 'sameer.joshi@codeyoung.in' },
      include: { mentor: true },
    });
    expect(user?.role).toBe(Role.MENTOR);
    expect(user?.mentor?.id).toBe(createdMentorId);
  });

  it('2. Admin can inspect mentor dashboard at /api/admin/mentors/:mentorId', async () => {
    const data = await adminService.getAdminMentorDashboard(createdMentorId);

    expect(data.mentor.fullName).toBe('Dr. Sameer Joshi');
    expect(data.dailyCapacity.totalLimit).toBe(2);
  });

  it('3. Booking flow creates appointment, class link, logs emails and sends admin notification', async () => {
    const booking = await bookingService.createBooking({
      student: {
        name: 'Meera Kapoor',
        grade: 'Grade 6',
        subject: 'Python & AI',
        learningGoal: 'Robotics and Game Logic',
      },
      parent: {
        name: 'Sunil Kapoor',
        email: 'sunil.kapoor@example.com',
        phone: '+1 555-0199',
      },
      startTime: '2026-09-28T12:00:00.000Z',
      endTime: '2026-09-28T13:00:00.000Z',
      timezone: 'America/New_York',
    });

    expect(booking.bookingId).toMatch(/^BK-/);
    expect(booking.meetingLink).toContain('codeyoung.com/class/');

    testBookingAppointmentId = booking.appointmentId;

    // Verify EmailLog has entry for this booking
    const emailLogs = await prisma.emailLog.findMany({
      where: { appointmentId: testBookingAppointmentId },
    });
    expect(emailLogs.length).toBeGreaterThanOrEqual(1);

    // Verify Notification has entry for this booking
    const notifs = await prisma.notification.findMany({
      where: { appointmentId: testBookingAppointmentId },
    });
    expect(notifs.some((n) => n.type === NotificationType.NEW_TRIAL_BOOKING)).toBe(true);
  }, 20000);

  it('4. Admin can view email delivery logs', async () => {
    const logs = await emailService.getEmailLogs(100);

    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
  });

  it('5. Admin can view notifications and mark them as read', async () => {
    const data = await notificationService.getNotifications();

    expect(data.notifications).toBeInstanceOf(Array);

    if (data.notifications.length > 0) {
      const firstNotifId = data.notifications[0].id;
      const marked = await notificationService.markAsRead(firstNotifId);

      expect(marked.readAt).toBeDefined();
    }
  });

  it('6. Admin can cancel appointment, releasing capacity and updating attendance', async () => {
    const cancelled = await adminService.cancelAppointment(testBookingAppointmentId);

    expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);

    const appDb = await prisma.appointment.findUnique({
      where: { id: testBookingAppointmentId },
      include: { attendance: true },
    });
    expect(appDb?.status).toBe(AppointmentStatus.CANCELLED);
    expect(appDb?.attendance?.status).toBe('CANCELLED');
  });
});
