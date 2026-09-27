import { Request, Response, NextFunction } from 'express';
import { mentorPortalService, MentorPortalService } from '../services/mentor-portal.service';
import { appointmentIdParamSchema } from '../types/auth.types';
import { AppError } from '../middleware/errorHandler';

export class MentorPortalController {
  constructor(private service: MentorPortalService = mentorPortalService) {}

  /**
   * GET /api/mentor/profile
   */
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Authentication required.', 401);
      const data = await this.service.getMentorProfile(req.user.id);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/mentor/unavailability - Add unavailable exception period
   */
  addUnavailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Authentication required.', 401);
      const { startDate, endDate, reason } = req.body;
      if (!startDate || !endDate) {
        throw new AppError('startDate and endDate are required.', 400);
      }
      const data = await this.service.addMentorUnavailability(req.user.id, {
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
   * DELETE /api/mentor/unavailability/:unavailabilityId
   */
  deleteUnavailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Authentication required.', 401);
      const { unavailabilityId } = req.params;
      const data = await this.service.deleteMentorUnavailability(req.user.id, unavailabilityId);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/mentor/schedule?date=YYYY-MM-DD
   */
  getSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Authentication required.', 401);
      const dateStr = req.query.date ? String(req.query.date) : undefined;
      const data = await this.service.getMentorScheduleAndAvailability(req.user.id, dateStr);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/mentor/appointments
   */
  getAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Authentication required.', 401);
      const data = await this.service.getMentorAppointments(req.user.id);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/mentor/appointments/:id
   */
  getAppointmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Authentication required.', 401);
      const { id } = appointmentIdParamSchema.parse(req.params);
      const data = await this.service.getMentorAppointmentById(req.user.id, id);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/mentor/appointments/:id/join
   */
  joinClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Authentication required.', 401);
      const { id } = appointmentIdParamSchema.parse(req.params);
      const attendance = await this.service.recordClassJoin(req.user.id, id);
      res.status(200).json({
        status: 'success',
        data: attendance,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/mentor/appointments/:id/complete
   */
  completeAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Authentication required.', 401);
      const { id } = appointmentIdParamSchema.parse(req.params);
      const mentorNotes = req.body?.mentorNotes ? String(req.body.mentorNotes) : undefined;
      const data = await this.service.completeAppointment(req.user.id, id, req.user.role, mentorNotes);
      res.status(200).json({
        status: 'success',
        data: {
          appointmentId: data.id,
          status: data.status,
          updatedAt: data.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const mentorPortalController = new MentorPortalController();
export const getMentorProfile = mentorPortalController.getProfile;
export const addMentorUnavailability = mentorPortalController.addUnavailability;
export const deleteMentorUnavailability = mentorPortalController.deleteUnavailability;
export const getMentorSchedule = mentorPortalController.getSchedule;
export const getMentorAppointments = mentorPortalController.getAppointments;
export const getMentorAppointmentById = mentorPortalController.getAppointmentById;
export const joinMentorClass = mentorPortalController.joinClass;
export const completeMentorAppointment = mentorPortalController.completeAppointment;
