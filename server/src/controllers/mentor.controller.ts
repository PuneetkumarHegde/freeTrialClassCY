import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { availabilityService } from '../services/availability.service';
import { mentorService } from '../services/mentor.service';

export const checkAvailabilitySchema = {
  params: z.object({
    mentorId: z.string().uuid({ message: 'mentorId must be a valid UUID' }),
  }),
  query: z.object({
    startTime: z.string({ message: 'startTime is required as an ISO 8601 string' }),
    endTime: z.string().optional(),
  }),
};

export const getMentorParamsSchema = {
  params: z.object({
    mentorId: z.string().uuid({ message: 'mentorId must be a valid UUID' }),
  }),
};

/**
 * GET /api/mentors/:mentorId/availability/check?startTime=2026-09-28T12:30:00Z
 */
export const checkMentorAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mentorId } = req.params;
    const { startTime, endTime } = req.query as { startTime: string; endTime?: string };

    const result = await availabilityService.checkAvailabilityFromIso(mentorId, startTime, endTime);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mentors
 */
export const getAllMentors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const activeOnly = req.query.all !== 'true';
    const mentors = await mentorService.getAllMentors(activeOnly);

    res.status(200).json({
      status: 'success',
      count: mentors.length,
      data: mentors,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mentors/:mentorId
 */
export const getMentorById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mentorId } = req.params;
    const mentor = await mentorService.getMentorById(mentorId);

    res.status(200).json({
      status: 'success',
      data: mentor,
    });
  } catch (error) {
    next(error);
  }
};
