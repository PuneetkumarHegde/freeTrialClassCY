import { Request, Response, NextFunction } from 'express';
import { parentService, ParentService } from '../services/parent.service';
import { appointmentIdParamSchema } from '../types/auth.types';
import { AppError } from '../middleware/errorHandler';

export class ParentController {
  constructor(private service: ParentService = parentService) {}

  /**
   * GET /api/parent/appointments
   */
  getAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401);
      }
      const data = await this.service.getParentAppointments(req.user.id);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/parent/appointments/:id
   */
  getAppointmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401);
      }
      const { id } = appointmentIdParamSchema.parse(req.params);
      const data = await this.service.getParentAppointmentById(req.user.id, id);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const parentController = new ParentController();
export const getParentAppointments = parentController.getAppointments;
export const getParentAppointmentById = parentController.getAppointmentById;
