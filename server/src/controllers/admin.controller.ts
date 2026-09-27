import { Request, Response, NextFunction } from 'express';
import { adminService, AdminService } from '../services/admin.service';
import { schedulingService } from '../services/scheduling.service';
import { emailService } from '../services/email.service';
import { notificationService } from '../services/notification.service';
import { adminAppointmentsQuerySchema, appointmentIdParamSchema } from '../types/auth.types';
import { AppError } from '../middleware/errorHandler';

export class AdminController {
  constructor(private service: AdminService = adminService) {}

  /**
   * GET /api/admin/mentors
   */
  getMentors = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getAdminMentors();
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/mentors - Create a new mentor (User.role = MENTOR)
   */
  createMentor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fullName, email, password, timezone, isActive, availabilities } = req.body;
      if (!fullName || !email) {
        throw new AppError('Full name and email are required.', 400);
      }
      const data = await this.service.createMentor({
        fullName,
        email,
        password,
        timezone,
        isActive,
        availabilities,
      });
      res.status(201).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/mentors/:mentorId/terminate - Terminate mentor (preserves historical data)
   */
  terminateMentor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mentorId } = req.params;
      const data = await this.service.terminateMentor(mentorId);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/mentors/:mentorId/reactivate - Reactivate mentor
   */
  reactivateMentor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mentorId } = req.params;
      const data = await this.service.reactivateMentor(mentorId);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/mentors/:mentorId/unavailability - Add unavailable exception period
   */
  addMentorUnavailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mentorId } = req.params;
      const { startDate, endDate, reason } = req.body;
      if (!startDate || !endDate) {
        throw new AppError('startDate and endDate are required.', 400);
      }
      const data = await this.service.addMentorUnavailability(mentorId, {
        startDate,
        endDate,
        reason,
      });
      res.status(201).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/mentors/:mentorId/unavailability/:unavailabilityId/approve
   * POST /api/admin/unavailability/:unavailabilityId/approve
   */
  approveMentorUnavailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const unavailabilityId = req.params.unavailabilityId || req.params.id;
      const data = await this.service.approveMentorUnavailability(unavailabilityId);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/mentors/:mentorId/unavailability/:unavailabilityId/reject
   * POST /api/admin/unavailability/:unavailabilityId/reject
   */
  rejectMentorUnavailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const unavailabilityId = req.params.unavailabilityId || req.params.id;
      const data = await this.service.rejectMentorUnavailability(unavailabilityId);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/admin/mentors/:mentorId/unavailability/:unavailabilityId - Remove exception
   */
  deleteMentorUnavailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { unavailabilityId } = req.params;
      const data = await this.service.deleteMentorUnavailability(unavailabilityId);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/admin/mentors/:mentorId/availability - Update weekly recurring hours
   */
  updateMentorAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mentorId } = req.params;
      const { availabilities } = req.body;
      if (!Array.isArray(availabilities)) {
        throw new AppError('availabilities must be an array.', 400);
      }
      const data = await this.service.updateMentorAvailability(mentorId, availabilities);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/mentors/:mentorId - Inspect mentor dashboard with ADMIN authorization
   */
  getMentorDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mentorId = req.params.mentorId;
      const date = req.query.date ? String(req.query.date) : undefined;
      const data = await this.service.getAdminMentorDashboard(mentorId, date);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/completed-trials - Real attendance completed trials
   */
  getCompletedTrials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const mentorId = req.query.mentorId ? String(req.query.mentorId) : undefined;
      const data = await this.service.getCompletedTrials({ page, limit, mentorId });
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/email-logs - All real transactional email logs
   */
  getEmailLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
      const status = req.query.status as any;
      const data = await emailService.getEmailLogs(limit, status);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/notifications - In-app notification center
   */
  getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await notificationService.getNotifications(req.user?.id);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/admin/notifications/:id/read
   */
  markNotificationRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      const data = await notificationService.markAsRead(id);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/notifications/read-all
   */
  markAllNotificationsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await notificationService.markAllAsRead(req.user?.id);
      res.status(200).json({
        status: 'success',
        message: 'All notifications marked as read.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/appointments
   */
  getAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = adminAppointmentsQuerySchema.parse(req.query);
      const data = await this.service.getAdminAppointments(query);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/appointments/:id
   */
  getAppointmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = appointmentIdParamSchema.parse(req.params);
      const data = await this.service.getAdminAppointmentById(id);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/admin/appointments/:id/cancel
   */
  cancelAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = appointmentIdParamSchema.parse(req.params);
      const updated = await this.service.cancelAppointment(id);
      res.status(200).json({
        status: 'success',
        data: {
          appointmentId: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/scheduling/capacity
   */
  getCapacity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const timezone = (req.query.timezone as string) || 'Asia/Kolkata';
      const data = await schedulingService.getAvailableSlotsForDate(date, timezone);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/dashboard
   */
  getDashboard = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getAdminDashboardSummary();
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const adminController = new AdminController();
export const getAdminMentors = adminController.getMentors;
export const createAdminMentor = adminController.createMentor;
export const terminateAdminMentor = adminController.terminateMentor;
export const reactivateAdminMentor = adminController.reactivateMentor;
export const addAdminMentorUnavailability = adminController.addMentorUnavailability;
export const approveAdminMentorUnavailability = adminController.approveMentorUnavailability;
export const rejectAdminMentorUnavailability = adminController.rejectMentorUnavailability;
export const deleteAdminMentorUnavailability = adminController.deleteMentorUnavailability;
export const updateAdminMentorAvailability = adminController.updateMentorAvailability;
export const getAdminMentorDashboard = adminController.getMentorDashboard;
export const getAdminCompletedTrials = adminController.getCompletedTrials;
export const getAdminEmailLogs = adminController.getEmailLogs;
export const getAdminNotifications = adminController.getNotifications;
export const markAdminNotificationRead = adminController.markNotificationRead;
export const markAdminAllNotificationsRead = adminController.markAllNotificationsRead;
export const getAdminAppointments = adminController.getAppointments;
export const getAdminAppointmentById = adminController.getAppointmentById;
export const cancelAdminAppointment = adminController.cancelAppointment;
export const getAdminCapacity = adminController.getCapacity;
export const getAdminDashboard = adminController.getDashboard;
