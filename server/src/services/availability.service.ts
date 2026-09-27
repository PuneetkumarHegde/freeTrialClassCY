import { Temporal } from '@js-temporal/polyfill';
import { MentorRepository, mentorRepository } from '../repositories/mentor.repository';
import { MentorAvailabilityCheckResult } from '../types/mentor.types';
import { AppError } from '../middleware/errorHandler';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export class AvailabilityService {
  constructor(private mentorRepo: MentorRepository = mentorRepository) {}

  /**
   * Determine if a mentor is available during a requested 1-hour trial class
   *
   * @param mentorId UUID of the mentor
   * @param startInstant Temporal.Instant representing the exact start of the appointment
   * @param endInstant Optional Temporal.Instant for appointment end. Defaults to startInstant + 60 minutes.
   */
  async isMentorAvailable(
    mentorId: string,
    startInstant: Temporal.Instant,
    endInstant?: Temporal.Instant
  ): Promise<MentorAvailabilityCheckResult> {
    // 1. Default endInstant to 60 minutes after start if not provided
    const resolvedEndInstant = endInstant || startInstant.add({ hours: 1 });

    // Validate that end is strictly after start
    if (Temporal.Instant.compare(resolvedEndInstant, startInstant) <= 0) {
      throw new AppError('Appointment end time must be strictly after start time', 400);
    }

    // 2. Load the mentor
    const mentor = await this.mentorRepo.findById(mentorId);

    // 3. Verify mentor exists
    if (!mentor) {
      throw new AppError(`Mentor not found with ID: ${mentorId}`, 404);
    }

    // Prepare UTC time representations for the response
    const requestedUtc = {
      start: startInstant.toString(),
      end: resolvedEndInstant.toString(),
    };

    // 4. Verify mentor timezone and convert requested Instant into mentor's timezone
    let startZdt: Temporal.ZonedDateTime;
    let endZdt: Temporal.ZonedDateTime;
    try {
      startZdt = startInstant.toZonedDateTimeISO(mentor.timezone);
      endZdt = resolvedEndInstant.toZonedDateTimeISO(mentor.timezone);
    } catch (tzError) {
      throw new AppError(`Invalid mentor timezone '${mentor.timezone}' configured in database`, 500);
    }

    // 5. Determine the mentor-local date
    const mentorLocalDate = startZdt.toPlainDate();

    // 6. Determine the mentor-local day of week
    // Temporal ISO dayOfWeek: 1 = Monday, ..., 6 = Saturday, 7 = Sunday
    // Database dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const isoDayOfWeek = startZdt.dayOfWeek;
    const dbDayOfWeek = isoDayOfWeek % 7;
    const dayName = DAY_NAMES[dbDayOfWeek];

    const localStartTime = `${String(startZdt.hour).padStart(2, '0')}:${String(startZdt.minute).padStart(2, '0')}`;
    const localEndTime = `${String(endZdt.hour).padStart(2, '0')}:${String(endZdt.minute).padStart(2, '0')}`;

    const mentorLocal = {
      localDate: mentorLocalDate.toString(),
      dayOfWeek: dayName,
      dayOfWeekNumber: dbDayOfWeek,
      start: localStartTime,
      end: localEndTime,
    };

    // Verify mentor is active
    if (!mentor.isActive) {
      return {
        available: false,
        mentorId: mentor.id,
        mentorName: mentor.user.fullName,
        mentorTimezone: mentor.timezone,
        requestedUtc,
        mentorLocal,
        reason: `Mentor ${mentor.user.fullName} is currently inactive`,
      };
    }

    // 7. Load MentorAvailability for that mentor/day
    const dayAvailabilities = await this.mentorRepo.getAvailabilityForDay(mentor.id, dbDayOfWeek);

    if (dayAvailabilities.length === 0) {
      return {
        available: false,
        mentorId: mentor.id,
        mentorName: mentor.user.fullName,
        mentorTimezone: mentor.timezone,
        requestedUtc,
        mentorLocal,
        reason: `Mentor ${mentor.user.fullName} has no working hours scheduled on ${dayName}s in ${mentor.timezone}`,
      };
    }

    // 8. Compare the requested local time against the configured working intervals
    // Each working interval is defined by localStart ("HH:mm") to localEnd ("HH:mm")
    // on mentorLocalDate in mentor.timezone.
    let matchedRule = null;

    for (const rule of dayAvailabilities) {
      const [startH, startM] = rule.localStart.split(':').map(Number);
      const [endH, endM] = rule.localEnd.split(':').map(Number);

      const ruleStartZdt = mentorLocalDate.toZonedDateTime({
        timeZone: mentor.timezone,
        plainTime: { hour: startH, minute: startM, second: 0, millisecond: 0 },
      });

      const ruleEndZdt = mentorLocalDate.toZonedDateTime({
        timeZone: mentor.timezone,
        plainTime: { hour: endH, minute: endM, second: 0, millisecond: 0 },
      });

      const ruleStartInstant = ruleStartZdt.toInstant();
      const ruleEndInstant = ruleEndZdt.toInstant();

      // Appointment [startInstant, resolvedEndInstant) must fit entirely inside [ruleStartInstant, ruleEndInstant)
      const fitsAtStart = Temporal.Instant.compare(startInstant, ruleStartInstant) >= 0;
      const fitsAtEnd = Temporal.Instant.compare(resolvedEndInstant, ruleEndInstant) <= 0;

      if (fitsAtStart && fitsAtEnd) {
        matchedRule = rule;
        break;
      }
    }

    if (!matchedRule) {
      const availableRanges = dayAvailabilities
        .map((r) => `${r.localStart}–${r.localEnd}`)
        .join(', ');

      return {
        available: false,
        mentorId: mentor.id,
        mentorName: mentor.user.fullName,
        mentorTimezone: mentor.timezone,
        requestedUtc,
        mentorLocal,
        reason: `Requested time ${localStartTime}–${localEndTime} is outside mentor's ${dayName} working hours (${availableRanges} ${mentor.timezone})`,
      };
    }

    // 9. Check if mentor has an overlapping confirmed appointment
    const startDate = new Date(startInstant.epochMilliseconds);
    const endDate = new Date(resolvedEndInstant.epochMilliseconds);

    const hasConflict = await this.mentorRepo.hasConflictingAppointment(mentor.id, startDate, endDate);
    if (hasConflict) {
      return {
        available: false,
        mentorId: mentor.id,
        mentorName: mentor.user.fullName,
        mentorTimezone: mentor.timezone,
        requestedUtc,
        mentorLocal,
        matchingSchedule: {
          dayOfWeek: dayName,
          localStart: matchedRule.localStart,
          localEnd: matchedRule.localEnd,
        },
        reason: `Mentor already has a confirmed appointment during this time interval`,
      };
    }

    // 10. The mentor is fully available
    return {
      available: true,
      mentorId: mentor.id,
      mentorName: mentor.user.fullName,
      mentorTimezone: mentor.timezone,
      requestedUtc,
      mentorLocal,
      matchingSchedule: {
        dayOfWeek: dayName,
        localStart: matchedRule.localStart,
        localEnd: matchedRule.localEnd,
      },
    };
  }

  /**
   * Helper method that accepts ISO timestamp strings, parses them with Temporal.Instant,
   * and invokes isMentorAvailable.
   */
  async checkAvailabilityFromIso(
    mentorId: string,
    startTimeIso: string,
    endTimeIso?: string
  ): Promise<MentorAvailabilityCheckResult> {
    let startInstant: Temporal.Instant;
    try {
      startInstant = Temporal.Instant.from(startTimeIso);
    } catch {
      throw new AppError(
        `Invalid startTime '${startTimeIso}'. Must be a valid ISO 8601 instant (e.g. 2026-09-28T12:30:00Z)`,
        400
      );
    }

    let endInstant: Temporal.Instant | undefined;
    if (endTimeIso) {
      try {
        endInstant = Temporal.Instant.from(endTimeIso);
      } catch {
        throw new AppError(
          `Invalid endTime '${endTimeIso}'. Must be a valid ISO 8601 instant`,
          400
        );
      }
    }

    return this.isMentorAvailable(mentorId, startInstant, endInstant);
  }
}

export const availabilityService = new AvailabilityService();
