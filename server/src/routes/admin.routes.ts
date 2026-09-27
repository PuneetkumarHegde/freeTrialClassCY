import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  getAdminMentors,
  createAdminMentor,
  terminateAdminMentor,
  reactivateAdminMentor,
  addAdminMentorUnavailability,
  approveAdminMentorUnavailability,
  rejectAdminMentorUnavailability,
  deleteAdminMentorUnavailability,
  updateAdminMentorAvailability,
  getAdminMentorDashboard,
  getAdminCompletedTrials,
  getAdminEmailLogs,
  getAdminNotifications,
  markAdminNotificationRead,
  markAdminAllNotificationsRead,
  getAdminAppointments,
  getAdminAppointmentById,
  cancelAdminAppointment,
  getAdminCapacity,
  getAdminDashboard,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

export const adminRouter = Router();

// All admin routes strictly require ADMIN role
adminRouter.get(
  '/admin/mentors',
  authenticate,
  requireRole(Role.ADMIN),
  getAdminMentors
);

adminRouter.post(
  '/admin/mentors',
  authenticate,
  requireRole(Role.ADMIN),
  createAdminMentor
);

adminRouter.post(
  '/admin/mentors/:mentorId/terminate',
  authenticate,
  requireRole(Role.ADMIN),
  terminateAdminMentor
);

adminRouter.post(
  '/admin/mentors/:mentorId/reactivate',
  authenticate,
  requireRole(Role.ADMIN),
  reactivateAdminMentor
);

adminRouter.post(
  '/admin/mentors/:mentorId/unavailability',
  authenticate,
  requireRole(Role.ADMIN),
  addAdminMentorUnavailability
);

adminRouter.post(
  '/admin/mentors/:mentorId/unavailability/:unavailabilityId/approve',
  authenticate,
  requireRole(Role.ADMIN),
  approveAdminMentorUnavailability
);

adminRouter.post(
  '/admin/unavailability/:unavailabilityId/approve',
  authenticate,
  requireRole(Role.ADMIN),
  approveAdminMentorUnavailability
);

adminRouter.post(
  '/admin/mentors/:mentorId/unavailability/:unavailabilityId/reject',
  authenticate,
  requireRole(Role.ADMIN),
  rejectAdminMentorUnavailability
);

adminRouter.post(
  '/admin/unavailability/:unavailabilityId/reject',
  authenticate,
  requireRole(Role.ADMIN),
  rejectAdminMentorUnavailability
);

adminRouter.delete(
  '/admin/mentors/:mentorId/unavailability/:unavailabilityId',
  authenticate,
  requireRole(Role.ADMIN),
  deleteAdminMentorUnavailability
);

adminRouter.put(
  '/admin/mentors/:mentorId/availability',
  authenticate,
  requireRole(Role.ADMIN),
  updateAdminMentorAvailability
);

adminRouter.get(
  '/admin/mentors/:mentorId',
  authenticate,
  requireRole(Role.ADMIN),
  getAdminMentorDashboard
);

adminRouter.get(
  '/admin/completed-trials',
  authenticate,
  requireRole(Role.ADMIN),
  getAdminCompletedTrials
);

adminRouter.get(
  '/admin/email-logs',
  authenticate,
  requireRole(Role.ADMIN),
  getAdminEmailLogs
);

adminRouter.get(
  '/admin/notifications',
  authenticate,
  requireRole(Role.ADMIN),
  getAdminNotifications
);

adminRouter.patch(
  '/admin/notifications/:id/read',
  authenticate,
  requireRole(Role.ADMIN),
  markAdminNotificationRead
);

adminRouter.post(
  '/admin/notifications/read-all',
  authenticate,
  requireRole(Role.ADMIN),
  markAdminAllNotificationsRead
);

adminRouter.get(
  '/admin/appointments',
  authenticate,
  requireRole(Role.ADMIN),
  getAdminAppointments
);

adminRouter.get(
  '/admin/appointments/:id',
  authenticate,
  requireRole(Role.ADMIN),
  getAdminAppointmentById
);

adminRouter.patch(
  '/admin/appointments/:id/cancel',
  authenticate,
  requireRole(Role.ADMIN),
  cancelAdminAppointment
);

adminRouter.get(
  '/admin/scheduling/capacity',
  authenticate,
  requireRole(Role.ADMIN),
  getAdminCapacity
);

adminRouter.get(
  '/admin/dashboard',
  authenticate,
  requireRole(Role.ADMIN),
  getAdminDashboard
);
