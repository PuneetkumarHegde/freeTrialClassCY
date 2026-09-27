import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../lib/env';
import { Role, AppointmentStatus } from '@prisma/client';
import { authService } from '../services/auth.service';
import { parentService } from '../services/parent.service';
import { mentorPortalService } from '../services/mentor-portal.service';
import { adminService } from '../services/admin.service';
import { requireRole } from '../middleware/role.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

describe('Role-Based Access Control & Endpoints Integration', () => {
  let parentAUser: any;
  let parentBUser: any;
  let mentorAUser: any;
  let mentorBUser: any;
  let mentorARecord: any;
  let mentorBRecord: any;
  let adminUser: any;

  let appointmentParentA_MentorA: any;
  let appointmentParentB_MentorB: any;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    // Clean test records
    await prisma.appointment.deleteMany({
      where: {
        studentName: { startsWith: 'RBACTest' },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'parentA@rbac.test',
            'parentB@rbac.test',
            'mentorA@rbac.test',
            'mentorB@rbac.test',
            'admin@rbac.test',
          ],
        },
      },
    });

    // Create Parents
    parentAUser = await prisma.user.create({
      data: {
        fullName: 'Parent Alice',
        email: 'parentA@rbac.test',
        passwordHash,
        role: Role.PARENT,
        timezone: 'America/New_York',
      },
    });

    parentBUser = await prisma.user.create({
      data: {
        fullName: 'Parent Bob',
        email: 'parentB@rbac.test',
        passwordHash,
        role: Role.PARENT,
        timezone: 'Europe/London',
      },
    });

    // Create Mentors
    mentorAUser = await prisma.user.create({
      data: {
        fullName: 'Mentor Alan',
        email: 'mentorA@rbac.test',
        passwordHash,
        role: Role.MENTOR,
        timezone: 'Asia/Kolkata',
      },
    });

    mentorARecord = await prisma.mentor.create({
      data: {
        userId: mentorAUser.id,
        timezone: 'Asia/Kolkata',
        isActive: true,
      },
    });

    mentorBUser = await prisma.user.create({
      data: {
        fullName: 'Mentor Beth',
        email: 'mentorB@rbac.test',
        passwordHash,
        role: Role.MENTOR,
        timezone: 'America/New_York',
      },
    });

    mentorBRecord = await prisma.mentor.create({
      data: {
        userId: mentorBUser.id,
        timezone: 'America/New_York',
        isActive: true,
      },
    });

    // Create Admin
    adminUser = await prisma.user.create({
      data: {
        fullName: 'Admin System',
        email: 'admin@rbac.test',
        passwordHash,
        role: Role.ADMIN,
        timezone: 'Asia/Kolkata',
      },
    });

    // Create Appointments
    appointmentParentA_MentorA = await prisma.appointment.create({
      data: {
        mentorId: mentorARecord.id,
        parentId: parentAUser.id,
        studentName: 'RBACTest Student Alice',
        studentGrade: 'Grade 5',
        subject: 'Math',
        learningGoal: 'Geometry',
        startTime: new Date('2026-09-28T12:00:00Z'),
        endTime: new Date('2026-09-28T13:00:00Z'),
        status: AppointmentStatus.CONFIRMED,
        meetingLink: 'https://demo.codeyoung.com/class/BK-ALICE1',
      },
    });

    appointmentParentB_MentorB = await prisma.appointment.create({
      data: {
        mentorId: mentorBRecord.id,
        parentId: parentBUser.id,
        studentName: 'RBACTest Student Bob',
        studentGrade: 'Grade 7',
        subject: 'Python',
        learningGoal: 'Loops',
        startTime: new Date('2026-09-28T14:00:00Z'),
        endTime: new Date('2026-09-28T15:00:00Z'),
        status: AppointmentStatus.CONFIRMED,
        meetingLink: 'https://demo.codeyoung.com/class/BK-BOB1',
      },
    });
  }, 20000);

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: {
        studentName: { startsWith: 'RBACTest' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'parentA@rbac.test',
            'parentB@rbac.test',
            'mentorA@rbac.test',
            'mentorB@rbac.test',
            'admin@rbac.test',
          ],
        },
      },
    });
  }, 20000);

  // =========================================================================
  // Authentication & Middleware Tests
  // =========================================================================
  describe('Auth Middleware', () => {
    it('rejects request with missing Authorization header (401)', async () => {
      const req: any = { headers: {} };
      const next = (err?: any) => {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(401);
      };
      await authenticate(req, {} as any, next);
    });

    it('rejects request with invalid token string (401)', async () => {
      const req: any = { headers: { authorization: 'Bearer invalid.token.string' } };
      const next = (err?: any) => {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(401);
      };
      await authenticate(req, {} as any, next);
    });

    it('rejects expired JWT token (401)', async () => {
      const expiredToken = jwt.sign(
        { userId: parentAUser.id, email: parentAUser.email, role: Role.PARENT },
        config.jwtSecret,
        { expiresIn: '-1s' }
      );
      const req: any = { headers: { authorization: `Bearer ${expiredToken}` } };
      const next = (err?: any) => {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(401);
        expect(err.message).toContain('Session expired');
      };
      await authenticate(req, {} as any, next);
    });

    it('accepts valid JWT and populates req.user', async () => {
      const token = jwt.sign(
        { userId: parentAUser.id, email: parentAUser.email, role: Role.PARENT },
        config.jwtSecret,
        { expiresIn: '1h' }
      );
      const req: any = { headers: { authorization: `Bearer ${token}` } };
      let called = false;
      const next = (err?: any) => {
        expect(err).toBeUndefined();
        called = true;
      };
      await authenticate(req, {} as any, next);
      expect(called).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(parentAUser.id);
      expect(req.user.role).toBe(Role.PARENT);
    });
  });

  // =========================================================================
  // Role Middleware Tests
  // =========================================================================
  describe('Role Middleware', () => {
    it('allows user with matching role', () => {
      const req: any = { user: { role: Role.ADMIN } };
      let passed = false;
      const middleware = requireRole(Role.ADMIN);
      middleware(req, {} as any, (err?: any) => {
        expect(err).toBeUndefined();
        passed = true;
      });
      expect(passed).toBe(true);
    });

    it('rejects user with unauthorized role (403)', () => {
      const req: any = { user: { role: Role.PARENT } };
      let errorThrown: any = null;
      const middleware = requireRole(Role.ADMIN, Role.MENTOR);
      middleware(req, {} as any, (err?: any) => {
        errorThrown = err;
      });
      expect(errorThrown).toBeInstanceOf(AppError);
      expect(errorThrown.statusCode).toBe(403);
      expect(errorThrown.message).toContain('Forbidden');
    });
  });

  // =========================================================================
  // Parent Authorization & Access Control
  // =========================================================================
  describe('Parent Access Control', () => {
    it('Parent A can view only their own appointments', async () => {
      const appointments = await parentService.getParentAppointments(parentAUser.id);
      expect(appointments.length).toBeGreaterThanOrEqual(1);
      const hasAlice = appointments.some((a) => a.appointmentId === appointmentParentA_MentorA.id);
      const hasBob = appointments.some((a) => a.appointmentId === appointmentParentB_MentorB.id);
      expect(hasAlice).toBe(true);
      expect(hasBob).toBe(false);
    });

    it('Parent A can retrieve details of their own appointment', async () => {
      const detail = await parentService.getParentAppointmentById(
        parentAUser.id,
        appointmentParentA_MentorA.id
      );
      expect(detail).toBeDefined();
      expect(detail.studentName).toBe('RBACTest Student Alice');
      expect((detail as any).mentorId).toBeUndefined();
      expect((detail as any).mentorEmail).toBeUndefined();
    });

    it('Parent A cannot retrieve Parent B appointment (returns 404, does not leak existence)', async () => {
      await expect(
        parentService.getParentAppointmentById(parentAUser.id, appointmentParentB_MentorB.id)
      ).rejects.toThrow('Appointment not found.');
    });
  });

  // =========================================================================
  // Mentor Authorization & Access Control
  // =========================================================================
  describe('Mentor Access Control', () => {
    it('Mentor A can view own profile with availability', async () => {
      const profile = await mentorPortalService.getMentorProfile(mentorAUser.id);
      expect(profile).toBeDefined();
      expect(profile.email).toBe('mentorA@rbac.test');
      expect(profile.timezone).toBe('Asia/Kolkata');
    });

    it('Mentor A can view appointments assigned to them, but NOT Mentor B appointments', async () => {
      const { appointments } = await mentorPortalService.getMentorAppointments(mentorAUser.id);
      expect(appointments.some((a: any) => a.appointmentId === appointmentParentA_MentorA.id)).toBe(true);
      expect(appointments.some((a: any) => a.appointmentId === appointmentParentB_MentorB.id)).toBe(false);
    });

    it('Mentor A cannot access Mentor B appointment by ID (returns 404)', async () => {
      await expect(
        mentorPortalService.getMentorAppointmentById(
          mentorAUser.id,
          appointmentParentB_MentorB.id
        )
      ).rejects.toThrow('Appointment not found.');
    });

    it('Assigned Mentor can mark a CONFIRMED appointment as COMPLETED', async () => {
      const updated = await mentorPortalService.completeAppointment(
        mentorAUser.id,
        appointmentParentA_MentorA.id,
        Role.MENTOR
      );
      expect(updated.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('Mentor cannot complete a CANCELLED appointment', async () => {
      // Create cancelled appointment for Mentor B
      const cancelledApp = await prisma.appointment.create({
        data: {
          mentorId: mentorBRecord.id,
          parentId: parentBUser.id,
          studentName: 'RBACTest Cancelled',
          studentGrade: 'Grade 5',
          subject: 'Math',
          startTime: new Date('2026-09-28T16:00:00Z'),
          endTime: new Date('2026-09-28T17:00:00Z'),
          status: AppointmentStatus.CANCELLED,
          meetingLink: 'link',
        },
      });

      await expect(
        mentorPortalService.completeAppointment(mentorBUser.id, cancelledApp.id, Role.MENTOR)
      ).rejects.toThrow('Cannot complete a cancelled appointment.');
    });
  });

  // =========================================================================
  // Admin Operations & Management
  // =========================================================================
  describe('Admin Operations', () => {
    it('Admin can view all mentors', async () => {
      const mentors = await adminService.getAdminMentors();
      expect(mentors.length).toBeGreaterThanOrEqual(2);
      expect(mentors.some((m) => m.email === 'mentorA@rbac.test')).toBe(true);
      expect(mentors.some((m) => m.email === 'mentorB@rbac.test')).toBe(true);
    });

    it('Admin can view all appointments with pagination', async () => {
      const result = await adminService.getAdminAppointments({ page: 1, limit: 10 });
      expect(result.pagination.total).toBeGreaterThanOrEqual(2);
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items.some((a) => a.id === appointmentParentA_MentorA.id)).toBe(true);
    });

    it('Admin can view any single appointment full details including parent & mentor', async () => {
      const detail = await adminService.getAdminAppointmentById(appointmentParentB_MentorB.id);
      expect(detail).toBeDefined();
      expect(detail.parent.email).toBe('parentB@rbac.test');
      expect(detail.mentor.email).toBe('mentorB@rbac.test');
    });

    it('Admin can cancel an appointment', async () => {
      const cancelled = await adminService.cancelAppointment(appointmentParentB_MentorB.id);
      expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);

      // Verify in database
      const inDb = await prisma.appointment.findUnique({
        where: { id: appointmentParentB_MentorB.id },
      });
      expect(inDb?.status).toBe(AppointmentStatus.CANCELLED);
    });

    it('Admin dashboard summary returns aggregate system metrics', async () => {
      const summary = await adminService.getAdminDashboardSummary();
      expect(summary.activeMentorsCount).toBeGreaterThan(0);
      expect(summary.totalAppointments).toBeGreaterThan(0);
      expect(summary.cancelledAppointments).toBeGreaterThanOrEqual(1);
      expect(summary.totalDailyCapacity).toBe(summary.activeMentorsCount * 2);
    });
  });
});
