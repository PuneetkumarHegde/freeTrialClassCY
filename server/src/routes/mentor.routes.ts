import { Router } from 'express';
import {
  checkMentorAvailability,
  getAllMentors,
  getMentorById,
  checkAvailabilitySchema,
  getMentorParamsSchema,
} from '../controllers/mentor.controller';
import { validateRequest } from '../middleware/validateRequest';

export const mentorRouter = Router();

// GET /api/mentors
mentorRouter.get('/mentors', getAllMentors);

// GET /api/mentors/:mentorId/availability/check
mentorRouter.get(
  '/mentors/:mentorId/availability/check',
  validateRequest(checkAvailabilitySchema),
  checkMentorAvailability
);

// GET /api/mentors/:mentorId
mentorRouter.get(
  '/mentors/:mentorId',
  validateRequest(getMentorParamsSchema),
  getMentorById
);
