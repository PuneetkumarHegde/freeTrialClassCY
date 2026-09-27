import { Router } from 'express';
import {
  getAvailableSlots,
  getSlotCapacity,
  getSlotsQuerySchema,
} from '../controllers/scheduling.controller';
import { validateRequest } from '../middleware/validateRequest';

export const schedulingRouter = Router();

// GET /api/scheduling/slots?date=2026-09-28
schedulingRouter.get(
  '/scheduling/slots',
  validateRequest(getSlotsQuerySchema),
  getAvailableSlots
);

// Alias: GET /api/slots?date=2026-09-28
schedulingRouter.get(
  '/slots',
  validateRequest(getSlotsQuerySchema),
  getAvailableSlots
);

// GET /api/scheduling/capacity?startTime=2026-09-28T12:30:00Z
schedulingRouter.get('/scheduling/capacity', getSlotCapacity);

// Alias: GET /api/capacity
schedulingRouter.get('/capacity', getSlotCapacity);
