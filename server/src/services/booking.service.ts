import { Temporal } from '@js-temporal/polyfill';
import { Prisma } from '@prisma/client';
import { BookingRepository, bookingRepository } from '../repositories/booking.repository';
import { SchedulingService, schedulingService } from './scheduling.service';
import { MentorWithUser } from '../types/mentor.types';
import { CreateBookingInput, BookingResponseData } from '../types/booking.types';
import { AppError } from '../middleware/errorHandler';
import { emailService } from './email.service';
import { notificationService } from './notification.service';
import { NotificationType } from '@prisma/client';

export class BookingService {
  constructor(
    private bookingRepo: BookingRepository = bookingRepository,
    private scheduling: SchedulingService = schedulingService
  ) {}

  /**
   * Generates a collision-safe, human-friendly booking reference
   * Format: BK-XXXXXX (e.g. BK-7K9M2P)
   */
  private generateBookingReference(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    const randomBytes = new Uint8Array(4);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
      for (let i = 0; i < 4; i++) {
        code += chars[randomBytes[i] % chars.length];
      }
    } else {
      for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    const timeSuffix = (Date.now() % 10000).toString().padStart(4, '0');
    return `BK-${code}${timeSuffix}`;
  }

  /**
   * Helper to evaluate if a mentor's configured working hours contain the full 60-minute appointment
   */
  private mentorWorkingHoursContainSlot(
    mentor: MentorWithUser,
    startInstant: Temporal.Instant,
    endInstant: Temporal.Instant
  ): boolean {
    if (!mentor.isActive) return false;

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

      const fitsAtStart = Temporal.Instant.compare(startInstant, ruleStartInstant) >= 0;
      const fitsAtEnd = Temporal.Instant.compare(endInstant, ruleEndInstant) <= 0;

      if (fitsAtStart && fitsAtEnd) {
        return true;
      }
    }

    return false;
  }

  /**
   * Main transactional booking workflow
   */
  async createBooking(input: CreateBookingInput): Promise<BookingResponseData> {
    // 1. Validate timezone
    this.scheduling.validateTimezone(input.timezone);

    // 2. Parse ISO start and end instants using Temporal
    let startInstant: Temporal.Instant;
    let endInstant: Temporal.Instant;
    try {
      startInstant = Temporal.Instant.from(input.startTime);
      endInstant = input.endTime
        ? Temporal.Instant.from(input.endTime)
        : startInstant.add({ hours: 1 });
    } catch {
      throw new AppError('Invalid startTime or endTime ISO timestamp', 400);
    }

    // Enforce 60-minute duration strictly
    const durationMs = endInstant.epochMilliseconds - startInstant.epochMilliseconds;
    if (durationMs !== 60 * 60 * 1000) {
      throw new AppError('Trial class duration must be exactly 60 minutes', 400);
    }

    const startDate = new Date(startInstant.epochMilliseconds);
    const endDate = new Date(endInstant.epochMilliseconds);

    // 3. Execute transactional booking
    try {
      const bookingResult = await this.bookingRepo.executeTransaction(async (tx) => {
        // A. Resolve or create parent user
        const parentUser = await this.bookingRepo.findOrCreateParentUser(
          input.parent.name,
          input.parent.email,
          input.timezone,
          tx
        );

        // B. Fetch all active mentors
        const activeMentors = await this.bookingRepo.getActiveMentors(tx);
        if (activeMentors.length === 0) {
          throw new AppError('No mentors are available for this time. Please choose another available slot.', 409);
        }

        // C. Filter for eligible mentors inside the transaction
        const eligibleMentorsWithLoad: Array<{
          mentor: MentorWithUser;
          dailyAppointmentsCount: number;
        }> = [];

        for (const mentor of activeMentors) {
          // Rule 1: Working hours fit
          const fitsWorkingHours = this.mentorWorkingHoursContainSlot(mentor, startInstant, endInstant);
          if (!fitsWorkingHours) continue;

          // Rule 2: No overlapping non-cancelled appointment
          const hasConflict = await this.bookingRepo.hasConflictingAppointment(
            mentor.id,
            startDate,
            endDate,
            tx
          );
          if (hasConflict) continue;

          // Rule 2b: No overlapping unavailability exception period
          const hasUnavailability = await this.bookingRepo.hasUnavailabilityException(
            mentor.id,
            startDate,
            endDate,
            tx
          );
          if (hasUnavailability) continue;

          // Rule 3: Daily capacity check (< 2 classes on mentor's local calendar day)
          const startZdt = startInstant.toZonedDateTimeISO(mentor.timezone);
          const mentorLocalDate = startZdt.toPlainDate();
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

          const dailyCount = await this.bookingRepo.countDailyAppointments(
            mentor.id,
            dayStart,
            dayEnd,
            tx
          );

          if (dailyCount >= 2) {
            continue;
          }

          eligibleMentorsWithLoad.push({
            mentor,
            dailyAppointmentsCount: dailyCount,
          });
        }

        // D. Check if at least one mentor is eligible
        if (eligibleMentorsWithLoad.length === 0) {
          throw new AppError('No mentors are available for this time. Please choose another available slot.', 409);
        }

        // E. Deterministic, fair mentor selection:
        // 1. Prefer mentor with lowest daily appointment count (0 before 1)
        // 2. Deterministic secondary tie-breaker: mentor ID ascending
        eligibleMentorsWithLoad.sort((a, b) => {
          if (a.dailyAppointmentsCount !== b.dailyAppointmentsCount) {
            return a.dailyAppointmentsCount - b.dailyAppointmentsCount;
          }
          return a.mentor.id.localeCompare(b.mentor.id);
        });

        const selectedMentor = eligibleMentorsWithLoad[0].mentor;

        // F. Generate collision-safe booking reference and deterministic meeting link
        const bookingId = this.generateBookingReference();
        const meetingLink = `https://demo.codeyoung.com/class/${bookingId}`;

        const subject = input.student.subject?.trim() || (input as any).subject?.trim() || 'Coding & STEM Fundamentals';

        // G. Create appointment record transactionally
        const appointment = await this.bookingRepo.createAppointment(
          {
            mentorId: selectedMentor.id,
            parentId: parentUser.id,
            studentName: input.student.name.trim(),
            studentGrade: input.student.grade.trim(),
            subject,
            learningGoal: input.student.learningGoal ? input.student.learningGoal.trim() : null,
            startTime: startDate,
            endTime: endDate,
            meetingLink,
          },
          tx
        );

        // H. Return confirmed booking data (sanitized of mentor internal identities)
        return {
          response: {
            bookingId,
            appointmentId: appointment.id,
            status: appointment.status,
            student: {
              name: appointment.studentName,
              grade: appointment.studentGrade,
              subject: appointment.subject,
              learningGoal: appointment.learningGoal,
            },
            parent: {
              name: input.parent.name.trim(),
              email: parentUser.email,
              phone: input.parent.phone ? input.parent.phone.trim() : null,
            },
            startTime: startInstant.toString(),
            endTime: endInstant.toString(),
            timezone: input.timezone,
            meetingLink,
            createdAt: appointment.createdAt.toISOString(),
          },
          selectedMentor,
          parentUser,
          appointment,
        };
      });

      // Post-transaction notifications & emails (failure-safe via Promise.allSettled)
      const { response, selectedMentor, parentUser, appointment } = bookingResult;

      await Promise.allSettled([
        // 1. Send Parent Email
        emailService.sendParentBookingConfirmation({
          appointmentId: appointment.id,
          parentEmail: parentUser.email,
          parentName: input.parent.name,
          studentName: input.student.name,
          subject: input.student.subject,
          startTime: startDate,
          endTime: endDate,
          parentTimezone: input.timezone,
          meetingLink: response.meetingLink,
        }),

        // 2. Send Mentor Email
        emailService.sendMentorBookingNotification({
          appointmentId: appointment.id,
          mentorEmail: selectedMentor.user.email,
          mentorName: selectedMentor.user.fullName,
          studentName: input.student.name,
          studentGrade: input.student.grade,
          subject: input.student.subject,
          learningGoal: input.student.learningGoal,
          startTime: startDate,
          endTime: endDate,
          mentorTimezone: selectedMentor.timezone,
          meetingLink: response.meetingLink,
        }),

        // 3. Create Admin Notification
        notificationService.createAdminNotification({
          type: NotificationType.NEW_TRIAL_BOOKING,
          title: 'New Trial Class Booked',
          message: `${input.student.name} (${input.student.subject}) scheduled with ${selectedMentor.user.fullName} for ${response.bookingId}`,
          appointmentId: appointment.id,
        }),
      ]);

      return response;
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }

      // Handle PostgreSQL exclusion constraint violation and serialization failures
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002' || err.code === 'P2034') {
          throw new AppError('This slot was just booked. Please choose another available time.', 409);
        }
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes('no_overlapping_mentor_appointments') ||
        errorMessage.includes('exclusion constraint') ||
        errorMessage.includes('could not serialize access')
      ) {
        throw new AppError('This slot was just booked. Please choose another available time.', 409);
      }

      console.error('[BookingService Transaction Error]', err);
      throw err;
    }
  }
}

export const bookingService = new BookingService();
