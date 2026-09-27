import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
import { schedulingService } from '../services/scheduling.service';
import { AppError } from '../middleware/errorHandler';

export const getSlotsQuerySchema = {
  query: z.object({
    date: z
      .string({ message: "Query parameter 'date' is required (YYYY-MM-DD)" })
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Invalid date format. Expected YYYY-MM-DD (e.g. 2026-09-28)",
      }),
    timezone: z.string().optional(),
  }),
};

/**
 * GET /api/scheduling/slots?date=2026-09-28[&timezone=Asia/Kolkata]
 *
 * Returns 1-hour candidate trial slots with simultaneous capacity status.
 * Safe for parents: does NOT expose mentor identities.
 */
export const getAvailableSlots = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date, timezone } = req.query as { date: string; timezone?: string };

    const result = await schedulingService.getAvailableSlotsForDate(
      date,
      timezone || 'Asia/Kolkata'
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/scheduling/capacity?startTime=2026-09-28T12:30:00Z[&endTime=...][&timezone=Asia/Kolkata]
 *
 * Answers: "For this requested date and time, how many eligible mentors can conduct a 1-hour trial class?"
 * Safe for parents: does NOT expose mentor identities.
 */
export const getSlotCapacity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startTime, endTime, date, time, timezone } = req.query as {
      startTime?: string;
      endTime?: string;
      date?: string;
      time?: string;
      timezone?: string;
    };

    const targetTimezone = timezone || 'Asia/Kolkata';

    let startInstant: Temporal.Instant;
    let endInstant: Temporal.Instant | undefined;

    if (startTime) {
      try {
        startInstant = Temporal.Instant.from(startTime);
      } catch {
        throw new AppError(
          `Invalid startTime '${startTime}'. Must be a valid ISO 8601 timestamp (e.g. 2026-09-28T12:30:00Z)`,
          400
        );
      }
    } else if (date && time) {
      // Support date + time query: e.g. date=2026-09-28&time=18:00&timezone=Asia/Kolkata
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new AppError(
          `Invalid date format '${date}'. Expected YYYY-MM-DD`,
          400
        );
      }
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
        throw new AppError(
          `Invalid time format '${time}'. Expected HH:mm (e.g. 18:00)`,
          400
        );
      }
      try {
        const plainDate = Temporal.PlainDate.from(date);
        const [h, m] = time.split(':').map(Number);
        const zdt = plainDate.toZonedDateTime({
          timeZone: targetTimezone,
          plainTime: { hour: h, minute: m, second: 0, millisecond: 0 },
        });
        startInstant = zdt.toInstant();
      } catch {
        throw new AppError('Unable to construct timestamp from date, time, and timezone', 400);
      }
    } else {
      throw new AppError(
        "Missing required parameters. Provide 'startTime' (ISO 8601 string) or both 'date' and 'time'.",
        400
      );
    }

    if (endTime) {
      try {
        endInstant = Temporal.Instant.from(endTime);
      } catch {
        throw new AppError(
          `Invalid endTime '${endTime}'. Must be a valid ISO 8601 timestamp`,
          400
        );
      }
    }

    const internalResult = await schedulingService.getSlotCapacity(
      startInstant,
      endInstant,
      targetTimezone
    );

    // Strip internal mentor identification for parent-facing public response
    const { eligibleMentorIds, eligibleMentors, ...publicData } = internalResult;

    res.status(200).json({
      status: 'success',
      data: publicData,
    });
  } catch (error) {
    next(error);
  }
};
