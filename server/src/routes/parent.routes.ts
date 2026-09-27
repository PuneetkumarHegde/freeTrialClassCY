import { Router } from 'express';
import { Role } from '@prisma/client';
import { getParentAppointments, getParentAppointmentById } from '../controllers/parent.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

export const parentRouter = Router();

// Parent protected routes
parentRouter.get(
  '/parent/appointments',
  authenticate,
  requireRole(Role.PARENT, Role.ADMIN),
  getParentAppointments
);

parentRouter.get(
  '/parent/appointments/:id',
  authenticate,
  requireRole(Role.PARENT, Role.ADMIN),
  getParentAppointmentById
);
