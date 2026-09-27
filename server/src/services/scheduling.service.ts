import { Temporal } from '@js-temporal/polyfill';
import { MentorRepository, mentorRepository } from '../repositories/mentor.repository';
import { AppointmentRepository, appointmentRepository } from '../repositories/appointment.repository';
import { MentorWithUser } from '../types/mentor.types';
import {
  DateSlotsResult,
  InternalSlotCapacityResult,
  SlotAvailability,
  SlotAvailabilityStatus,
  SlotCapacityResult,
} from '../types/scheduling.types';
import { AppError } from '../middleware/errorHandler';

export class SchedulingService {
  constructor(
    private mentorRepo: MentorRepository = mentorRepository,
    private appointmentRepo: AppointmentRepository = appointmentRepository
  ) {}

  /**
   * Validate a strict YYYY-MM-DD date string
   */
  validateDateString(dateStr: string): Temporal.PlainDate {
    if (!dateStr || typeof dateStr !== 'string') {
      throw new AppError("Missing required query parameter 'date'", 400);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new AppError(
        `Invalid date format '${dateStr}'. Expected YYYY-MM-DD (e.g. 2026-09-28)`,
        400
      );
    }

    try {
      return Temporal.PlainDate.from(dateStr);
    } catch {
      throw new AppError(`Invalid calendar date '${dateStr}'`, 400);
    }
  }

  /**
   * Validate an IANA timezone identifier
   */
  validateTimezone(timezone: string): void {
    if (!timezone || typeof timezone !== 'string') {
      throw new AppError("Invalid or missing 'timezone'", 400);
    }
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      throw new AppError(
        `Invalid IANA timezone '${timezone}'. Example valid timezones: 'Asia/Kolkata', 'America/New_York', 'UTC'`,
        400
      );
    }
  }

  /**
   * Generate 60-minute candidate trial slots across all active mentors for a requested calendar date.
   *
   * For each active mentor:
   * 1. Evaluates the requested date in the mentor's IANA timezone.
   * 2. Reads that mentor's availability rules for that local day of week.
   * 3. Converts local working hours into Temporal.Instant values, respecting DST.
   * 4. Generates 60-minute trial slots fitting inside working hours.
   * 5. Merges and deduplicates candidate slots across mentors in chronological order.
   */
  generateCandidateSlotsForDate(
    dateStr: string,
    activeMentors: MentorWithUser[]
  ): Array<{ startInstant: Temporal.Instant; endInstant: Temporal.Instant }> {
    const plainDate = this.validateDateString(dateStr);
    const candidateSlotsMap = new Map<
      number,
      { startInstant: Temporal.Instant; endInstant: Temporal.Instant }
    >();

    for (const mentor of activeMentors) {
      if (!mentor.isActive) continue;

      let dbDayOfWeek: number;
      try {
        // Temporal ISO dayOfWeek: 1 = Monday ... 7 = Sunday
        // DB dayOfWeek: 0 = Sunday ... 6 = Saturday
        dbDayOfWeek = plainDate.dayOfWeek % 7;
      } catch {
        continue;
      }

      const mentorRules = mentor.availability.filter((a) => a.dayOfWeek === dbDayOfWeek);

      for (const rule of mentorRules) {
        const [startH, startM] = rule.localStart.split(':').map(Number);
        const [endH, endM] = rule.localEnd.split(':').map(Number);

        let ruleStartZdt: Temporal.ZonedDateTime;
        let ruleEndZdt: Temporal.ZonedDateTime;
        try {
          ruleStartZdt = plainDate.toZonedDateTime({
            timeZone: mentor.timezone,
            plainTime: { hour: startH, minute: startM, second: 0, millisecond: 0 },
          });
          ruleEndZdt = plainDate.toZonedDateTime({
            timeZone: mentor.timezone,
            plainTime: { hour: endH, minute: endM, second: 0, millisecond: 0 },
          });
        } catch {
          // If timezone conversion fails for this rule, skip safely
          continue;
        }

        const ruleEndInstant = ruleEndZdt.toInstant();
        let currentSlotStart = ruleStartZdt;

        // Generate 60-minute trial intervals fitting strictly inside [ruleStartZdt, ruleEndZdt)
        while (true) {
          const currentSlotEnd = currentSlotStart.add({ hours: 1 });
          const slotEndInstant = currentSlotEnd.toInstant();

          // Interval check: appointment must fit entirely within working interval [start, end)
          if (Temporal.Instant.compare(slotEndInstant, ruleEndInstant) > 0) {
            break;
          }

          const slotStartInstant = currentSlotStart.toInstant();
          const epochKey = slotStartInstant.epochMilliseconds;

          if (!candidateSlotsMap.has(epochKey)) {
            candidateSlotsMap.set(epochKey, {
              startInstant: slotStartInstant,
              endInstant: slotEndInstant,
            });
          }

          currentSlotStart = currentSlotEnd;
        }
      }
    }

    // Sort candidate slots chronologically
    return Array.from(candidateSlotsMap.values()).sort((a, b) =>
      Temporal.Instant.compare(a.startInstant, b.startInstant)
    );
  }

  /**
   * Determine if a mentor is eligible to conduct a 1-hour trial class for a specific slot.
   *
   * A mentor is eligible ONLY when:
   * 1. Mentor is active
   * 2. The entire 60-minute appointment fits inside the mentor's configured working hours on that mentor-local day
   * 3. Mentor does NOT have an overlapping non-cancelled appointment
   * 4. Mentor has NOT reached their daily limit (2 trial classes) on the mentor-local calendar day
   */
  async isMentorEligibleForSlot(
    mentor: MentorWithUser,
    startInstant: Temporal.Instant,
    endInstant: Temporal.Instant
  ): Promise<boolean> {
    if (!mentor.isActive) return false;

    // 1. Working hours check in mentor's timezone
    let startZdt: Temporal.ZonedDateTime;
    let endZdt: Temporal.ZonedDateTime;
    try {
      startZdt = startInstant.toZonedDateTimeISO(mentor.timezone);
      endZdt = endInstant.toZonedDateTimeISO(mentor.timezone);
    } catch {
      return false;
    }

    const mentorLocalDate = startZdt.toPlainDate();
    const dbDayOfWeek = startZdt.dayOfWeek % 7;

    const dayRules = mentor.availability.filter((r) => r.dayOfWeek === dbDayOfWeek);
    if (dayRules.length === 0) return false;

    let fitsWorkingHours = false;
    for (const rule of dayRules) {
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

      // Half-open interval [startInstant, endInstant) must fit inside [ruleStartInstant, ruleEndInstant)
      const fitsAtStart = Temporal.Instant.compare(startInstant, ruleStartInstant) >= 0;
      const fitsAtEnd = Temporal.Instant.compare(endInstant, ruleEndInstant) <= 0;

      if (fitsAtStart && fitsAtEnd) {
        fitsWorkingHours = true;
        break;
      }
    }

    if (!fitsWorkingHours) return false;

    // 2. Conflicting overlapping appointment check
    const startDate = new Date(startInstant.epochMilliseconds);
    const endDate = new Date(endInstant.epochMilliseconds);
    const hasConflict = await this.appointmentRepo.hasConflictingAppointment(
      mentor.id,
      startDate,
      endDate
    );
    if (hasConflict) return false;

    // 2b. Check explicit unavailability exception period
    const hasUnavailability = await this.mentorRepo.hasUnavailabilityException(
      mentor.id,
      startDate,
      endDate
    );
    if (hasUnavailability) return false;

    // 3. Daily capacity check: Maximum 2 trial classes per local calendar day
    // Daily limits are determined by the mentor's stored IANA timezone and Temporal (never UTC dates)
    const dayStartZdt = mentorLocalDate.toZonedDateTime({
      timeZone: mentor.timezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
    });
    const dayEndZdt = mentorLocalDate.add({ days: 1 }).toZonedDateTime({
      timeZone: mentor.timezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
    });

    const dayStart = new Date(dayStartZdt.toInstant().epochMilliseconds);
    const dayEnd = new Date(dayEndZdt.toInstant().epochMilliseconds);

    // Counts CONFIRMED and COMPLETED appointments; CANCELLED appointments are excluded
    const dailyAppointmentsCount = await this.appointmentRepo.countDailyAppointments(
      mentor.id,
      dayStart,
      dayEnd
    );

    if (dailyAppointmentsCount >= 2) {
      return false;
    }

    return true;
  }

  /**
   * Determine simultaneous capacity and eligible mentors for an exact 1-hour slot.
   * Answers: "For this requested date and time, how many eligible mentors can conduct a 1-hour trial class?"
   */
  async getSlotCapacity(
    startInstant: Temporal.Instant,
    endInstant?: Temporal.Instant,
    displayTimezone: string = 'Asia/Kolkata'
  ): Promise<InternalSlotCapacityResult> {
    const resolvedEndInstant = endInstant || startInstant.add({ hours: 1 });

    if (Temporal.Instant.compare(resolvedEndInstant, startInstant) <= 0) {
      throw new AppError('End time must be strictly after start time', 400);
    }

    this.validateTimezone(displayTimezone);

    // Fetch all active mentors from database
    const activeMentors = await this.mentorRepo.findAll({ isActive: true });

    const eligibleMentors: MentorWithUser[] = [];

    for (const mentor of activeMentors) {
      const isEligible = await this.isMentorEligibleForSlot(
        mentor,
        startInstant,
        resolvedEndInstant
      );
      if (isEligible) {
        eligibleMentors.push(mentor);
      }
    }

    const availableMentorsCount = eligibleMentors.length;
    let status: SlotAvailabilityStatus;
    if (availableMentorsCount >= 2) {
      status = 'AVAILABLE';
    } else if (availableMentorsCount === 1) {
      status = 'LIMITED';
    } else {
      status = 'FULL';
    }

    // Local time representation in requested timezone
    const localStartZdt = startInstant.toZonedDateTimeISO(displayTimezone);
    const localEndZdt = resolvedEndInstant.toZonedDateTimeISO(displayTimezone);
    const localStart = `${String(localStartZdt.hour).padStart(2, '0')}:${String(localStartZdt.minute).padStart(2, '0')}`;
    const localEnd = `${String(localEndZdt.hour).padStart(2, '0')}:${String(localEndZdt.minute).padStart(2, '0')}`;
    const localDate = localStartZdt.toPlainDate().toString();

    let message: string;
    if (availableMentorsCount >= 2) {
      message = `${availableMentorsCount} eligible mentors are available for this trial slot`;
    } else if (availableMentorsCount === 1) {
      message = `1 eligible mentor is available for this trial slot (limited availability)`;
    } else {
      message = 'No eligible mentors are available for this trial slot';
    }

    return {
      requestedUtc: {
        start: startInstant.toString(),
        end: resolvedEndInstant.toString(),
      },
      status,
      availableMentorsCount,
      totalActiveMentors: activeMentors.length,
      isAvailable: availableMentorsCount > 0,
      message,
      localTime: {
        timezone: displayTimezone,
        date: localDate,
        start: localStart,
        end: localEnd,
      },
      eligibleMentorIds: eligibleMentors.map((m) => m.id),
      eligibleMentors: eligibleMentors.map((m) => ({
        id: m.id,
        name: m.user.fullName,
        timezone: m.timezone,
      })),
    };
  }

  /**
   * Retrieve all generated 1-hour trial slots for a selected date with simultaneous capacity.
   * Public-safe: does NOT expose mentor identities in the response.
   */
  async getAvailableSlotsForDate(
    dateStr: string,
    timezone: string = 'Asia/Kolkata'
  ): Promise<DateSlotsResult> {
    this.validateDateString(dateStr);
    this.validateTimezone(timezone);

    // 1. Load active mentors from DB
    const activeMentors = await this.mentorRepo.findAll({ isActive: true });

    // 2. Generate candidate 60-minute slots
    const candidateSlots = this.generateCandidateSlotsForDate(dateStr, activeMentors);

    // 3. For each candidate slot, evaluate capacity across active mentors
    const slots: SlotAvailability[] = [];

    for (const slot of candidateSlots) {
      const eligibleMentors: MentorWithUser[] = [];

      for (const mentor of activeMentors) {
        const isEligible = await this.isMentorEligibleForSlot(
          mentor,
          slot.startInstant,
          slot.endInstant
        );
        if (isEligible) {
          eligibleMentors.push(mentor);
        }
      }

      const availableMentors = eligibleMentors.length;
      let status: SlotAvailabilityStatus;
      if (availableMentors >= 2) {
        status = 'AVAILABLE';
      } else if (availableMentors === 1) {
        status = 'LIMITED';
      } else {
        status = 'FULL';
      }

      const localStartZdt = slot.startInstant.toZonedDateTimeISO(timezone);
      const localEndZdt = slot.endInstant.toZonedDateTimeISO(timezone);
      const localStart = `${String(localStartZdt.hour).padStart(2, '0')}:${String(localStartZdt.minute).padStart(2, '0')}`;
      const localEnd = `${String(localEndZdt.hour).padStart(2, '0')}:${String(localEndZdt.minute).padStart(2, '0')}`;
      const localDate = localStartZdt.toPlainDate().toString();

      slots.push({
        start: slot.startInstant.toString(),
        end: slot.endInstant.toString(),
        startTime: slot.startInstant.toString(),
        endTime: slot.endInstant.toString(),
        localDate,
        localStart,
        localEnd,
        localFormatted: `${localStart} - ${localEnd}`,
        status,
        availableMentors,
        remainingCapacity: availableMentors,
      });
    }

    const availableSlotsCount = slots.filter((s) => s.status !== 'FULL').length;

    return {
      date: dateStr,
      timezone,
      totalSlots: slots.length,
      availableSlotsCount,
      slots,
    };
  }
}

export const schedulingService = new SchedulingService();
