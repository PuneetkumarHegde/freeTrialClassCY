import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  getMentorProfile,
  getMentorSchedule,
  getMentorAppointments,
  getMentorAppointmentById,
  joinMentorClass,
  completeMentorAppointment,
  addMentorUnavailability,
  deleteMentorUnavailability,
} from '../controllers/mentor-portal.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

export const mentorPortalRouter = Router();

// All mentor routes require MENTOR or ADMIN role
mentorPortalRouter.get(
  '/mentor/profile',
  authenticate,
  requireRole(Role.MENTOR, Role.ADMIN),
  getMentorProfile
);

mentorPortalRouter.post(
  '/mentor/unavailability',
  authenticate,
  requireRole(Role.MENTOR, Role.ADMIN),
  addMentorUnavailability
);

mentorPortalRouter.delete(
  '/mentor/unavailability/:unavailabilityId',
  authenticate,
  requireRole(Role.MENTOR, Role.ADMIN),
  deleteMentorUnavailability
);

mentorPortalRouter.get(
  '/mentor/schedule',
  authenticate,
  requireRole(Role.MENTOR, Role.ADMIN),
  getMentorSchedule
);

mentorPortalRouter.get(
  '/mentor/appointments',
  authenticate,
  requireRole(Role.MENTOR, Role.ADMIN),
  getMentorAppointments
);

mentorPortalRouter.get(
  '/mentor/appointments/:id',
  authenticate,
  requireRole(Role.MENTOR, Role.ADMIN),
  getMentorAppointmentById
);

mentorPortalRouter.post(
  '/mentor/appointments/:id/join',
  authenticate,
  requireRole(Role.MENTOR, Role.ADMIN),
  joinMentorClass
);

mentorPortalRouter.patch(
  '/mentor/appointments/:id/complete',
  authenticate,
  requireRole(Role.MENTOR, Role.ADMIN),
  completeMentorAppointment
);
