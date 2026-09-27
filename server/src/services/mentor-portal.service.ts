import { Role, AppointmentStatus, AttendanceStatus, NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { Temporal } from '@js-temporal/polyfill';
import { notificationService } from './notification.service';

export class MentorPortalService {
  /**
   * Get mentor profile for the logged in mentor user
   */
  async getMentorProfile(userId: string) {
    const mentor = await prisma.mentor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            timezone: true,
            role: true,
          },
        },
        availability: {
          orderBy: [{ dayOfWeek: 'asc' }, { localStart: 'asc' }],
        },
        unavailabilities: {
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!mentor) {
      throw new AppError('Mentor profile not found for this account.', 404);
    }

    const todayDaily = await this.getMentorDailyCount(mentor.id, mentor.timezone);

    return {
      mentorId: mentor.id,
      userId: mentor.userId,
      fullName: mentor.user.fullName,
      email: mentor.user.email,
      timezone: mentor.timezone,
      isActive: mentor.isActive,
      dailyCapacity: {
        totalLimit: 2,
        todayCount: todayDaily.count,
        remainingSlots: todayDaily.remaining,
        isLimitReached: todayDaily.isLimitReached,
      },
      availability: mentor.availability.map((a) => ({
        id: a.id,
        dayOfWeek: a.dayOfWeek,
        localStart: a.localStart,
        localEnd: a.localEnd,
      })),
      unavailabilities: mentor.unavailabilities.map((u) => ({
        id: u.id,
        startDate: u.startDate.toISOString(),
        endDate: u.endDate.toISOString(),
        reason: u.reason || null,
        status: u.status,
      })),
    };
  }

  /**
   * Calculate daily count on mentor's local calendar day
   */
  private async getMentorDailyCount(mentorId: string, mentorTimezone: string, dateStr?: string) {
    let targetPlainDate: Temporal.PlainDate;
    if (dateStr) {
      try {
        targetPlainDate = Temporal.PlainDate.from(dateStr);
      } catch {
        targetPlainDate = Temporal.Now.zonedDateTimeISO(mentorTimezone).toPlainDate();
      }
    } else {
      targetPlainDate = Temporal.Now.zonedDateTimeISO(mentorTimezone).toPlainDate();
    }

    const dayStartZdt = targetPlainDate.toZonedDateTime({
      timeZone: mentorTimezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
    });
    const dayEndZdt = targetPlainDate.add({ days: 1 }).toZonedDateTime({
      timeZone: mentorTimezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
    });

    const dayStart = new Date(dayStartZdt.toInstant().epochMilliseconds);
    const dayEnd = new Date(dayEndZdt.toInstant().epochMilliseconds);

    const count = await prisma.appointment.count({
      where: {
        mentorId,
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED] },
        startTime: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    });

    return {
      date: targetPlainDate.toString(),
      count,
      remaining: Math.max(0, 2 - count),
      isLimitReached: count >= 2,
    };
  }

  /**
   * Add unavailability exception for logged-in mentor
   * Must be submitted at least 24 hours before the requested start time.
   * Initial status is PENDING.
   */
  async addMentorUnavailability(
    userId: string,
    input: { startDate: string; endDate: string; reason?: string }
  ) {
    const mentor = await prisma.mentor.findUnique({ where: { userId } });
    if (!mentor) {
      throw new AppError('Mentor profile not found.', 404);
    }

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid start or end date format.', 400);
    }

    if (start >= end) {
      throw new AppError('End date must be after start date.', 400);
    }

    // Must be submitted at least 24 hours before the requested start time
    const now = Date.now();
    const minAdvanceMs = 24 * 60 * 60 * 1000;
    if (start.getTime() - now < minAdvanceMs) {
      throw new AppError('Unavailability requests must be submitted at least 24 hours in advance.', 400);
    }

    const created = await prisma.mentorUnavailability.create({
      data: {
        mentorId: mentor.id,
        startDate: start,
        endDate: end,
        reason: input.reason?.trim() || 'Unavailable period',
        status: 'PENDING',
      },
    });

    return {
      id: created.id,
      mentorId: created.mentorId,
      startDate: created.startDate.toISOString(),
      endDate: created.endDate.toISOString(),
      reason: created.reason,
      status: created.status,
    };
  }

  /**
   * Delete unavailability exception for logged-in mentor
   */
  async deleteMentorUnavailability(userId: string, unavailabilityId: string) {
    const mentor = await prisma.mentor.findUnique({ where: { userId } });
    if (!mentor) {
      throw new AppError('Mentor profile not found.', 404);
    }

    const existing = await prisma.mentorUnavailability.findFirst({
      where: { id: unavailabilityId, mentorId: mentor.id },
    });

    if (!existing) {
      throw new AppError('Unavailability record not found or unauthorized.', 404);
    }

    await prisma.mentorUnavailability.delete({
      where: { id: unavailabilityId },
    });

    return { success: true, message: 'Unavailability exception deleted successfully.' };
  }

  /**
   * Get date-wise mentor schedule and hourly availability in mentor's IANA timezone
   */
  async getMentorScheduleAndAvailability(userId: string, targetDateStr?: string) {
    const mentor = await prisma.mentor.findUnique({
      where: { userId },
      include: {
        user: true,
        availability: true,
        unavailabilities: true,
      },
    });

    if (!mentor) {
      throw new AppError('Mentor profile not found.', 404);
    }

    let targetPlainDate: Temporal.PlainDate;
    if (targetDateStr) {
      try {
        targetPlainDate = Temporal.PlainDate.from(targetDateStr);
      } catch {
        targetPlainDate = Temporal.Now.zonedDateTimeISO(mentor.timezone).toPlainDate();
      }
    } else {
      targetPlainDate = Temporal.Now.zonedDateTimeISO(mentor.timezone).toPlainDate();
    }

    const dateStr = targetPlainDate.toString();
    const dayOfWeek = targetPlainDate.dayOfWeek % 7; // 0=Sun, 1=Mon, ..., 6=Sat

    const dayStartZdt = targetPlainDate.toZonedDateTime({
      timeZone: mentor.timezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
    });
    const dayEndZdt = targetPlainDate.add({ days: 1 }).toZonedDateTime({
      timeZone: mentor.timezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
    });

    const dayStart = new Date(dayStartZdt.toInstant().epochMilliseconds);
    const dayEnd = new Date(dayEndZdt.toInstant().epochMilliseconds);

    // Fetch appointments on this day
    const appointments = await prisma.appointment.findMany({
      where: {
        mentorId: mentor.id,
        startTime: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      orderBy: { startTime: 'asc' },
      include: {
        parent: {
          select: {
            fullName: true,
            email: true,
            timezone: true,
          },
        },
        attendance: true,
      },
    });

    // Calculate active count (CONFIRMED and COMPLETED)
    const activeAppointmentsCount = appointments.filter(
      (a) => a.status === AppointmentStatus.CONFIRMED || a.status === AppointmentStatus.COMPLETED
    ).length;

    const remainingSlots = Math.max(0, 2 - activeAppointmentsCount);
    const isLimitReached = activeAppointmentsCount >= 2;

    // Build timeline slots from mentor working hours for this day of week
    const matchingRules = mentor.availability.filter((r) => r.dayOfWeek === dayOfWeek);
    const timeSlots: Array<{
      localStart: string;
      localEnd: string;
      startTimeIso: string;
      endTimeIso: string;
      status: 'AVAILABLE' | 'SCHEDULED' | 'UNAVAILABLE' | 'LIMIT_REACHED' | 'OUTSIDE_HOURS';
      appointment?: {
        id: string;
        studentName: string;
        studentGrade: string;
        subject: string;
        learningGoal: string | null;
        parentName: string;
        status: AppointmentStatus;
        meetingLink: string | null;
      };
    }> = [];

    for (const rule of matchingRules) {
      const [startHour, startMin] = rule.localStart.split(':').map(Number);
      const [endHour, endMin] = rule.localEnd.split(':').map(Number);

      let currentHour = startHour;
      let currentMinute = startMin;

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMinute + 60 <= endMin)
      ) {
        const nextHour = currentHour + 1;
        const nextMinute = currentMinute;

        const slotStartZdt = targetPlainDate.toZonedDateTime({
          timeZone: mentor.timezone,
          plainTime: { hour: currentHour, minute: currentMinute, second: 0, millisecond: 0 },
        });
        const slotEndZdt = targetPlainDate.toZonedDateTime({
          timeZone: mentor.timezone,
          plainTime: { hour: nextHour, minute: nextMinute, second: 0, millisecond: 0 },
        });

        const slotStartInstant = slotStartZdt.toInstant();
        const slotEndInstant = slotEndZdt.toInstant();

        // Check if there is an overlapping appointment
        const matchedApp = appointments.find((app) => {
          const appStartMs = app.startTime.getTime();
          const appEndMs = app.endTime.getTime();
          return (
            app.status !== AppointmentStatus.CANCELLED &&
            appStartMs < slotEndInstant.epochMilliseconds &&
            appEndMs > slotStartInstant.epochMilliseconds
          );
        });

        // Check if there is an overlapping APPROVED unavailability exception
        const isUnavailable = mentor.unavailabilities.some((u) => {
          if (u.status !== 'APPROVED') return false;
          const uStartMs = u.startDate.getTime();
          const uEndMs = u.endDate.getTime();
          return (
            uStartMs < slotEndInstant.epochMilliseconds &&
            uEndMs > slotStartInstant.epochMilliseconds
          );
        });

        const formatSlotTime = (h: number, m: number) => {
          const ampm = h >= 12 ? 'PM' : 'AM';
          const hr = h % 12 || 12;
          return `${String(hr).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
        };

        const localStartFormatted = formatSlotTime(currentHour, currentMinute);
        const localEndFormatted = formatSlotTime(nextHour, nextMinute);

        if (matchedApp) {
          timeSlots.push({
            localStart: localStartFormatted,
            localEnd: localEndFormatted,
            startTimeIso: slotStartZdt.toString(),
            endTimeIso: slotEndZdt.toString(),
            status: 'SCHEDULED',
            appointment: {
              id: matchedApp.id,
              studentName: matchedApp.studentName,
              studentGrade: matchedApp.studentGrade,
              subject: matchedApp.subject,
              learningGoal: matchedApp.learningGoal,
              parentName: matchedApp.parent.fullName,
              status: matchedApp.status,
              meetingLink: matchedApp.meetingLink,
            },
          });
        } else if (isUnavailable) {
          timeSlots.push({
            localStart: localStartFormatted,
            localEnd: localEndFormatted,
            startTimeIso: slotStartZdt.toString(),
            endTimeIso: slotEndZdt.toString(),
            status: 'UNAVAILABLE',
          });
        } else {
          timeSlots.push({
            localStart: localStartFormatted,
            localEnd: localEndFormatted,
            startTimeIso: slotStartZdt.toString(),
            endTimeIso: slotEndZdt.toString(),
            status: isLimitReached ? 'LIMIT_REACHED' : 'AVAILABLE',
          });
        }

        currentHour += 1;
      }
    }

    return {
      mentor: {
        id: mentor.id,
        fullName: mentor.user.fullName,
        email: mentor.user.email,
        timezone: mentor.timezone,
        isActive: mentor.isActive,
      },
      date: dateStr,
      dailyCapacity: {
        totalLimit: 2,
        todayCount: activeAppointmentsCount,
        remainingSlots,
        isLimitReached,
      },
      timeSlots,
      unavailabilities: mentor.unavailabilities.map((u) => ({
        id: u.id,
        startDate: u.startDate.toISOString(),
        endDate: u.endDate.toISOString(),
        reason: u.reason || null,
        status: u.status,
      })),
      appointments: appointments.map((app) => ({
        id: app.id,
        bookingId: `BK-${app.id.substring(0, 6).toUpperCase()}`,
        studentName: app.studentName,
        studentGrade: app.studentGrade,
        subject: app.subject,
        learningGoal: app.learningGoal,
        parentName: app.parent.fullName,
        parentEmail: app.parent.email,
        parentTimezone: app.parent.timezone,
        startTime: app.startTime.toISOString(),
        endTime: app.endTime.toISOString(),
        mentorTimezone: mentor.timezone,
        status: app.status,
        meetingLink: app.meetingLink,
        attendance: app.attendance
          ? {
              id: app.attendance.id,
              status: app.attendance.status,
              joinedAt: app.attendance.joinedAt?.toISOString() || null,
              completedAt: app.attendance.completedAt?.toISOString() || null,
              mentorNotes: app.attendance.mentorNotes,
            }
          : null,
        createdAt: app.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Get all appointments assigned to the logged in mentor
   */
  async getMentorAppointments(userId: string) {
    const mentor = await prisma.mentor.findUnique({
      where: { userId },
    });

    if (!mentor) {
      throw new AppError('Mentor profile not found.', 404);
    }

    const todayDaily = await this.getMentorDailyCount(mentor.id, mentor.timezone);

    const appointments = await prisma.appointment.findMany({
      where: { mentorId: mentor.id },
      orderBy: { startTime: 'desc' },
      include: {
        parent: {
          select: {
            fullName: true,
            email: true,
            timezone: true,
          },
        },
        attendance: true,
      },
    });

    return {
      dailyCapacity: {
        totalLimit: 2,
        todayCount: todayDaily.count,
        remainingSlots: todayDaily.remaining,
        isLimitReached: todayDaily.isLimitReached,
        mentorTimezone: mentor.timezone,
      },
      appointments: appointments.map((app) => ({
        appointmentId: app.id,
        bookingId: `BK-${app.id.substring(0, 6).toUpperCase()}`,
        studentName: app.studentName,
        studentGrade: app.studentGrade,
        subject: app.subject,
        learningGoal: app.learningGoal,
        parentName: app.parent.fullName,
        parentEmail: app.parent.email,
        parentTimezone: app.parent.timezone,
        startTime: app.startTime.toISOString(),
        endTime: app.endTime.toISOString(),
        mentorTimezone: mentor.timezone,
        status: app.status,
        meetingLink: app.meetingLink,
        attendance: app.attendance
          ? {
              id: app.attendance.id,
              status: app.attendance.status,
              joinedAt: app.attendance.joinedAt?.toISOString() || null,
              completedAt: app.attendance.completedAt?.toISOString() || null,
              mentorNotes: app.attendance.mentorNotes,
            }
          : null,
        createdAt: app.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Get single appointment assigned to mentor
   */
  async getMentorAppointmentById(userId: string, appointmentId: string) {
    const mentor = await prisma.mentor.findUnique({
      where: { userId },
    });

    if (!mentor) {
      throw new AppError('Mentor profile not found.', 404);
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        mentorId: mentor.id,
      },
      include: {
        parent: {
          select: {
            fullName: true,
            email: true,
            timezone: true,
          },
        },
        attendance: true,
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found.', 404);
    }

    return {
      appointmentId: appointment.id,
      bookingId: `BK-${appointment.id.substring(0, 6).toUpperCase()}`,
      studentName: appointment.studentName,
      studentGrade: appointment.studentGrade,
      subject: appointment.subject,
      learningGoal: appointment.learningGoal,
      parentName: appointment.parent.fullName,
      parentEmail: appointment.parent.email,
      parentTimezone: appointment.parent.timezone,
      startTime: appointment.startTime.toISOString(),
      endTime: appointment.endTime.toISOString(),
      mentorTimezone: mentor.timezone,
      status: appointment.status,
      meetingLink: appointment.meetingLink,
      attendance: appointment.attendance
        ? {
            id: appointment.attendance.id,
            status: appointment.attendance.status,
            joinedAt: appointment.attendance.joinedAt?.toISOString() || null,
            completedAt: appointment.attendance.completedAt?.toISOString() || null,
            mentorNotes: appointment.attendance.mentorNotes,
          }
        : null,
      createdAt: appointment.createdAt.toISOString(),
    };
  }

  /**
   * Record attendance join timestamp
   */
  async recordClassJoin(userId: string, appointmentId: string) {
    const mentor = await prisma.mentor.findUnique({
      where: { userId },
    });

    if (!mentor) {
      throw new AppError('Mentor profile not found.', 404);
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, mentorId: mentor.id },
      include: { attendance: true },
    });

    if (!appointment) {
      throw new AppError('Appointment not found.', 404);
    }

    return prisma.trialAttendance.upsert({
      where: { appointmentId },
      update: {
        joinedAt: new Date(),
        status: AttendanceStatus.JOINED,
      },
      create: {
        appointmentId,
        joinedAt: new Date(),
        status: AttendanceStatus.JOINED,
      },
    });
  }

  /**
   * Mark appointment as COMPLETED and record attendance completedAt
   */
  async completeAppointment(
    userId: string,
    appointmentId: string,
    userRole: Role,
    mentorNotes?: string
  ) {
    let mentorId: string | undefined;
    let mentorName = 'Mentor';

    if (userRole === Role.MENTOR) {
      const mentor = await prisma.mentor.findUnique({
        where: { userId },
        include: { user: true },
      });
      if (!mentor) {
        throw new AppError('Mentor profile not found.', 404);
      }
      mentorId = mentor.id;
      mentorName = mentor.user.fullName;
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { mentor: { include: { user: true } } },
    });

    if (!appointment) {
      throw new AppError('Appointment not found.', 404);
    }

    if (mentorId && appointment.mentorId !== mentorId) {
      throw new AppError('Appointment not found.', 404);
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new AppError('Cannot complete a cancelled appointment.', 400);
    }

    const now = new Date();

    // 1. Update appointment status
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.COMPLETED },
    });

    // 2. Upsert attendance record as COMPLETED
    await prisma.trialAttendance.upsert({
      where: { appointmentId },
      update: {
        status: AttendanceStatus.COMPLETED,
        completedAt: now,
        mentorNotes: mentorNotes || undefined,
      },
      create: {
        appointmentId,
        status: AttendanceStatus.COMPLETED,
        completedAt: now,
        mentorNotes: mentorNotes || undefined,
      },
    });

    // 3. Notify Admin
    try {
      await notificationService.createAdminNotification({
        type: NotificationType.TRIAL_COMPLETED,
        title: 'Trial Class Completed',
        message: `${appointment.studentName} completed trial with ${appointment.mentor.user.fullName}`,
        appointmentId: appointment.id,
      });
    } catch (err) {
      console.error('Failed to create TRIAL_COMPLETED admin notification:', err);
    }

    return updated;
  }
}

export const mentorPortalService = new MentorPortalService();
