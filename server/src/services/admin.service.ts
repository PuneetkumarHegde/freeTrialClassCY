import { AppointmentStatus, AttendanceStatus, Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AdminAppointmentsQuery } from '../types/auth.types';
import { Temporal } from '@js-temporal/polyfill';
import { notificationService } from './notification.service';
import { emailService } from './email.service';

export interface CreateMentorInput {
  fullName: string;
  email: string;
  password?: string;
  timezone?: string;
  isActive?: boolean;
  availabilities?: Array<{
    dayOfWeek: number;
    localStart: string;
    localEnd: string;
  }>;
}

export class AdminService {
  /**
   * Get list of all mentors with user profiles, availability, unavailabilities, and real capacity
   */
  async getAdminMentors() {
    const mentors = await prisma.mentor.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            timezone: true,
          },
        },
        availability: {
          orderBy: [{ dayOfWeek: 'asc' }, { localStart: 'asc' }],
        },
        unavailabilities: {
          orderBy: { startDate: 'asc' },
        },
        _count: {
          select: {
            appointments: {
              where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
            },
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { user: { email: 'asc' } },
      ],
    });

    // Calculate today's active count per mentor in their local IANA timezone
    const mentorsWithCapacity = await Promise.all(
      mentors.map(async (m) => {
        const todayPlain = Temporal.Now.zonedDateTimeISO(m.timezone).toPlainDate();
        const startZdt = todayPlain.toZonedDateTime({
          timeZone: m.timezone,
          plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
        });
        const endZdt = todayPlain.add({ days: 1 }).toZonedDateTime({
          timeZone: m.timezone,
          plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
        });

        const todayStart = new Date(startZdt.toInstant().epochMilliseconds);
        const todayEnd = new Date(endZdt.toInstant().epochMilliseconds);

        const todayCount = await prisma.appointment.count({
          where: {
            mentorId: m.id,
            status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED] },
            startTime: { gte: todayStart, lt: todayEnd },
          },
        });

        return {
          id: m.id,
          userId: m.userId,
          fullName: m.user.fullName,
          email: m.user.email,
          timezone: m.timezone,
          isActive: m.isActive,
          activeAppointmentsCount: m._count.appointments,
          todayAppointmentsCount: todayCount,
          dailyLimit: 2,
          remainingTodayCapacity: Math.max(0, 2 - todayCount),
          isDailyLimitReached: todayCount >= 2,
          availability: m.availability.map((a) => ({
            id: a.id,
            dayOfWeek: a.dayOfWeek,
            localStart: a.localStart,
            localEnd: a.localEnd,
          })),
          unavailabilities: m.unavailabilities.map((u) => ({
            id: u.id,
            startDate: u.startDate.toISOString(),
            endDate: u.endDate.toISOString(),
            reason: u.reason || null,
            status: u.status,
          })),
        };
      })
    );

    return mentorsWithCapacity;
  }

  /**
   * Terminate a mentor (Admin only) - deactivates mentor without deleting historical data
   */
  async terminateMentor(mentorId: string) {
    const mentor = await prisma.mentor.findUnique({
      where: { id: mentorId },
      include: { user: true },
    });

    if (!mentor) {
      throw new AppError('Mentor not found.', 404);
    }

    const updated = await prisma.mentor.update({
      where: { id: mentorId },
      data: { isActive: false },
      include: { user: true },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      fullName: updated.user.fullName,
      email: updated.user.email,
      isActive: updated.isActive,
      message: `Mentor ${updated.user.fullName} (${updated.user.email}) has been terminated. They will not receive new trial bookings. Historical records are preserved.`,
    };
  }

  /**
   * Reactivate a mentor (Admin only) - restores mentor to scheduling pool
   */
  async reactivateMentor(mentorId: string) {
    const mentor = await prisma.mentor.findUnique({
      where: { id: mentorId },
      include: { user: true },
    });

    if (!mentor) {
      throw new AppError('Mentor not found.', 404);
    }

    const updated = await prisma.mentor.update({
      where: { id: mentorId },
      data: { isActive: true },
      include: { user: true },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      fullName: updated.user.fullName,
      email: updated.user.email,
      isActive: updated.isActive,
      message: `Mentor ${updated.user.fullName} (${updated.user.email}) has been reactivated and added back to daily scheduling capacity.`,
    };
  }

  /**
   * Add an unavailability exception period for a mentor (Admin only)
   */
  async addMentorUnavailability(
    mentorId: string,
    input: { startDate: string; endDate: string; reason?: string }
  ) {
    const mentor = await prisma.mentor.findUnique({ where: { id: mentorId } });
    if (!mentor) {
      throw new AppError('Mentor not found.', 404);
    }

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid start or end date format.', 400);
    }

    if (start >= end) {
      throw new AppError('End date must be after start date.', 400);
    }

    const created = await prisma.mentorUnavailability.create({
      data: {
        mentorId,
        startDate: start,
        endDate: end,
        reason: input.reason?.trim() || 'Unavailable period',
        status: 'APPROVED',
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
   * Approve a mentor unavailability request (Admin only)
   */
  async approveMentorUnavailability(unavailabilityId: string) {
    const unavail = await prisma.mentorUnavailability.findUnique({
      where: { id: unavailabilityId },
      include: { mentor: { include: { user: true } } },
    });

    if (!unavail) {
      throw new AppError('Unavailability record not found.', 404);
    }

    const updated = await prisma.mentorUnavailability.update({
      where: { id: unavailabilityId },
      data: { status: 'APPROVED' },
    });

    return {
      id: updated.id,
      mentorId: updated.mentorId,
      mentorName: unavail.mentor.user.fullName,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      status: updated.status,
      reason: updated.reason,
      message: 'Unavailability request approved. Scheduler will block this time window.',
    };
  }

  /**
   * Reject a mentor unavailability request (Admin only)
   */
  async rejectMentorUnavailability(unavailabilityId: string) {
    const unavail = await prisma.mentorUnavailability.findUnique({
      where: { id: unavailabilityId },
      include: { mentor: { include: { user: true } } },
    });

    if (!unavail) {
      throw new AppError('Unavailability record not found.', 404);
    }

    const updated = await prisma.mentorUnavailability.update({
      where: { id: unavailabilityId },
      data: { status: 'REJECTED' },
    });

    return {
      id: updated.id,
      mentorId: updated.mentorId,
      mentorName: unavail.mentor.user.fullName,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      status: updated.status,
      reason: updated.reason,
      message: 'Unavailability request rejected.',
    };
  }

  /**
   * Delete an unavailability exception period
   */
  async deleteMentorUnavailability(unavailabilityId: string) {
    const existing = await prisma.mentorUnavailability.findUnique({
      where: { id: unavailabilityId },
    });

    if (!existing) {
      throw new AppError('Unavailability record not found.', 404);
    }

    await prisma.mentorUnavailability.delete({
      where: { id: unavailabilityId },
    });

    return { success: true, message: 'Unavailability exception deleted successfully.' };
  }

  /**
   * Update mentor recurring working hours availability
   */
  async updateMentorAvailability(
    mentorId: string,
    availabilities: Array<{ dayOfWeek: number; localStart: string; localEnd: string }>
  ) {
    const mentor = await prisma.mentor.findUnique({ where: { id: mentorId } });
    if (!mentor) {
      throw new AppError('Mentor not found.', 404);
    }

    // Delete existing and recreate
    await prisma.mentorAvailability.deleteMany({
      where: { mentorId },
    });

    for (const rule of availabilities) {
      await prisma.mentorAvailability.create({
        data: {
          mentorId,
          dayOfWeek: rule.dayOfWeek,
          localStart: rule.localStart,
          localEnd: rule.localEnd,
        },
      });
    }

    const updated = await prisma.mentorAvailability.findMany({
      where: { mentorId },
      orderBy: [{ dayOfWeek: 'asc' }, { localStart: 'asc' }],
    });

    return updated;
  }

  /**
   * Create a new mentor (Admin only)
   */
  async createMentor(input: CreateMentorInput) {
    const email = input.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('A user with this email address already exists.', 400);
    }

    const rawPassword = input.password || process.env.DEFAULT_MENTOR_PASSWORD || 'Mentor@1234';
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const timezone = input.timezone || 'Asia/Kolkata';

    // Transactional creation of User, Mentor, and availability
    const newMentor = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: input.fullName.trim(),
          email,
          passwordHash,
          role: Role.MENTOR,
          timezone,
        },
      });

      const mentor = await tx.mentor.create({
        data: {
          userId: user.id,
          timezone,
          isActive: input.isActive !== undefined ? input.isActive : true,
        },
      });

      const defaultAvailabilities = input.availabilities || [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
        { dayOfWeek: 2, localStart: '16:00', localEnd: '21:00' },
        { dayOfWeek: 3, localStart: '16:00', localEnd: '21:00' },
        { dayOfWeek: 4, localStart: '16:00', localEnd: '21:00' },
        { dayOfWeek: 5, localStart: '16:00', localEnd: '21:00' },
        { dayOfWeek: 6, localStart: '10:00', localEnd: '18:00' },
      ];

      for (const rule of defaultAvailabilities) {
        await tx.mentorAvailability.create({
          data: {
            mentorId: mentor.id,
            dayOfWeek: rule.dayOfWeek,
            localStart: rule.localStart,
            localEnd: rule.localEnd,
          },
        });
      }

      return { user, mentor };
    });

    return {
      id: newMentor.mentor.id,
      userId: newMentor.user.id,
      fullName: newMentor.user.fullName,
      email: newMentor.user.email,
      timezone: newMentor.mentor.timezone,
      isActive: newMentor.mentor.isActive,
    };
  }

  /**
   * Admin inspection of a specific mentor's full dashboard and schedule
   */
  async getAdminMentorDashboard(mentorId: string, targetDateStr?: string) {
    const mentor = await prisma.mentor.findUnique({
      where: { id: mentorId },
      include: {
        user: true,
        availability: {
          orderBy: [{ dayOfWeek: 'asc' }, { localStart: 'asc' }],
        },
        unavailabilities: {
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!mentor) {
      throw new AppError('Mentor not found.', 404);
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

    const [todayAppointments, allAppointments] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          mentorId: mentor.id,
          startTime: { gte: dayStart, lt: dayEnd },
        },
        orderBy: { startTime: 'asc' },
        include: {
          parent: { select: { fullName: true, email: true, timezone: true } },
          attendance: true,
        },
      }),
      prisma.appointment.findMany({
        where: { mentorId: mentor.id },
        orderBy: { startTime: 'desc' },
        take: 30,
        include: {
          parent: { select: { fullName: true, email: true, timezone: true } },
          attendance: true,
        },
      }),
    ]);

    const activeTodayCount = todayAppointments.filter(
      (a) => a.status === AppointmentStatus.CONFIRMED || a.status === AppointmentStatus.COMPLETED
    ).length;

    const completedTrials = allAppointments.filter(
      (a) => a.status === AppointmentStatus.COMPLETED || a.attendance?.status === AttendanceStatus.COMPLETED
    );

    return {
      mentor: {
        id: mentor.id,
        fullName: mentor.user.fullName,
        email: mentor.user.email,
        timezone: mentor.timezone,
        isActive: mentor.isActive,
      },
      date: targetPlainDate.toString(),
      dailyCapacity: {
        totalLimit: 2,
        todayCount: activeTodayCount,
        remainingSlots: Math.max(0, 2 - activeTodayCount),
        isLimitReached: activeTodayCount >= 2,
      },
      todaySchedule: todayAppointments.map((app) => ({
        id: app.id,
        bookingId: `BK-${app.id.substring(0, 6).toUpperCase()}`,
        studentName: app.studentName,
        studentGrade: app.studentGrade,
        subject: app.subject,
        learningGoal: app.learningGoal,
        parentName: app.parent.fullName,
        parentEmail: app.parent.email,
        startTime: app.startTime.toISOString(),
        endTime: app.endTime.toISOString(),
        status: app.status,
        meetingLink: app.meetingLink,
        attendance: app.attendance,
      })),
      allAppointments: allAppointments.map((app) => ({
        id: app.id,
        bookingId: `BK-${app.id.substring(0, 6).toUpperCase()}`,
        studentName: app.studentName,
        studentGrade: app.studentGrade,
        subject: app.subject,
        parentName: app.parent.fullName,
        parentEmail: app.parent.email,
        startTime: app.startTime.toISOString(),
        endTime: app.endTime.toISOString(),
        status: app.status,
        meetingLink: app.meetingLink,
        attendance: app.attendance,
      })),
      unavailabilities: mentor.unavailabilities.map((u) => ({
        id: u.id,
        startDate: u.startDate.toISOString(),
        endDate: u.endDate.toISOString(),
        reason: u.reason || null,
        status: u.status,
      })),
      completedTrialsCount: completedTrials.length,
    };
  }

  /**
   * Paginated appointments listing for Admin (sorted earliest first)
   */
  async getAdminAppointments(query: AdminAppointmentsQuery) {
    const { page, limit, status, date } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {};

    if (status) {
      where.status = status as AppointmentStatus;
    }

    if (date) {
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);
      where.startTime = {
        gte: dayStart,
        lte: dayEnd,
      };
    }

    const [total, items] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          parent: {
            select: {
              id: true,
              fullName: true,
              email: true,
              timezone: true,
            },
          },
          mentor: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  timezone: true,
                },
              },
            },
          },
          attendance: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      items: items.map((app) => ({
        id: app.id,
        bookingId: `BK-${app.id.substring(0, 6).toUpperCase()}`,
        studentName: app.studentName,
        studentGrade: app.studentGrade,
        subject: app.subject,
        learningGoal: app.learningGoal,
        startTime: app.startTime.toISOString(),
        endTime: app.endTime.toISOString(),
        status: app.status,
        meetingLink: app.meetingLink,
        createdAt: app.createdAt.toISOString(),
        parent: {
          id: app.parent.id,
          name: app.parent.fullName,
          email: app.parent.email,
          timezone: app.parent.timezone,
        },
        mentor: {
          id: app.mentor.id,
          name: app.mentor.user.fullName,
          email: app.mentor.user.email,
          timezone: app.mentor.timezone,
        },
        attendance: app.attendance
          ? {
              id: app.attendance.id,
              status: app.attendance.status,
              joinedAt: app.attendance.joinedAt?.toISOString() || null,
              completedAt: app.attendance.completedAt?.toISOString() || null,
              mentorNotes: app.attendance.mentorNotes,
            }
          : null,
      })),
    };
  }

  /**
   * Real Completed Trials query (driven strictly by TrialAttendance status = COMPLETED)
   */
  async getCompletedTrials(query: { page?: number; limit?: number; mentorId?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TrialAttendanceWhereInput = {
      status: AttendanceStatus.COMPLETED,
    };

    if (query.mentorId) {
      where.appointment = {
        mentorId: query.mentorId,
      };
    }

    const [total, records] = await Promise.all([
      prisma.trialAttendance.count({ where }),
      prisma.trialAttendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { completedAt: 'desc' },
        include: {
          appointment: {
            include: {
              parent: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  timezone: true,
                },
              },
              mentor: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                      timezone: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      items: records.map((rec) => ({
        attendanceId: rec.id,
        appointmentId: rec.appointmentId,
        bookingId: `BK-${rec.appointment.id.substring(0, 6).toUpperCase()}`,
        studentName: rec.appointment.studentName,
        studentGrade: rec.appointment.studentGrade,
        subject: rec.appointment.subject,
        learningGoal: rec.appointment.learningGoal,
        startTime: rec.appointment.startTime.toISOString(),
        endTime: rec.appointment.endTime.toISOString(),
        status: rec.status,
        joinedAt: rec.joinedAt?.toISOString() || null,
        completedAt: rec.completedAt?.toISOString() || null,
        mentorNotes: rec.mentorNotes,
        parent: {
          id: rec.appointment.parent.id,
          name: rec.appointment.parent.fullName,
          email: rec.appointment.parent.email,
        },
        mentor: {
          id: rec.appointment.mentor.id,
          name: rec.appointment.mentor.user.fullName,
          email: rec.appointment.mentor.user.email,
          timezone: rec.appointment.mentor.timezone,
        },
      })),
    };
  }

  /**
   * Get single appointment full details for Admin
   */
  async getAdminAppointmentById(id: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            timezone: true,
          },
        },
        mentor: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                timezone: true,
              },
            },
          },
        },
        attendance: true,
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found.', 404);
    }

    return {
      id: appointment.id,
      bookingId: `BK-${appointment.id.substring(0, 6).toUpperCase()}`,
      studentName: appointment.studentName,
      studentGrade: appointment.studentGrade,
      subject: appointment.subject,
      learningGoal: appointment.learningGoal,
      startTime: appointment.startTime.toISOString(),
      endTime: appointment.endTime.toISOString(),
      status: appointment.status,
      meetingLink: appointment.meetingLink,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
      parent: {
        id: appointment.parent.id,
        name: appointment.parent.fullName,
        email: appointment.parent.email,
        timezone: appointment.parent.timezone,
      },
      mentor: {
        id: appointment.mentor.id,
        name: appointment.mentor.user.fullName,
        email: appointment.mentor.user.email,
        timezone: appointment.mentor.timezone,
      },
      attendance: appointment.attendance
        ? {
            id: appointment.attendance.id,
            status: appointment.attendance.status,
            joinedAt: appointment.attendance.joinedAt?.toISOString() || null,
            completedAt: appointment.attendance.completedAt?.toISOString() || null,
            mentorNotes: appointment.attendance.mentorNotes,
          }
        : null,
    };
  }

  /**
   * Cancel an appointment (ADMIN only) - releases mentor capacity
   */
  async cancelAppointment(id: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        parent: true,
        mentor: { include: { user: true } },
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found.', 404);
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      return appointment;
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
    });

    // Update attendance record if exists
    await prisma.trialAttendance.updateMany({
      where: { appointmentId: id },
      data: { status: AttendanceStatus.CANCELLED },
    });

    // Notify Admin of cancellation
    try {
      await notificationService.createAdminNotification({
        type: 'TRIAL_CANCELLED',
        title: 'Trial Booking Cancelled',
        message: `Booking BK-${id.substring(0, 6).toUpperCase()} for ${appointment.studentName} was cancelled by Admin.`,
        appointmentId: id,
      });
    } catch (err) {
      console.error('Failed to create TRIAL_CANCELLED notification:', err);
    }

    return updated;
  }

  /**
   * Get Admin dashboard summary stats
   */
  async getAdminDashboardSummary() {
    const activeMentors = await prisma.mentor.findMany({
      where: { isActive: true },
      include: { user: true },
    });

    const activeMentorsCount = activeMentors.length;
    // Theoretical maximum daily capacity across active mentors (2 per active mentor per day)
    const totalDailyCapacity = activeMentorsCount * 2;

    // Calculate today's used classes across active mentors in their respective local calendar days
    let todayAppointmentsCount = 0;
    for (const m of activeMentors) {
      const todayPlain = Temporal.Now.zonedDateTimeISO(m.timezone).toPlainDate();
      const startZdt = todayPlain.toZonedDateTime({
        timeZone: m.timezone,
        plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
      });
      const endZdt = todayPlain.add({ days: 1 }).toZonedDateTime({
        timeZone: m.timezone,
        plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 },
      });
      const todayStart = new Date(startZdt.toInstant().epochMilliseconds);
      const todayEnd = new Date(endZdt.toInstant().epochMilliseconds);

      const mCount = await prisma.appointment.count({
        where: {
          mentorId: m.id,
          status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED] },
          startTime: { gte: todayStart, lt: todayEnd },
        },
      });
      todayAppointmentsCount += mCount;
    }

    const remainingTodayCapacity = Math.max(0, totalDailyCapacity - todayAppointmentsCount);

    const [
      totalAppointments,
      totalBookedAppointments,
      confirmedCount,
      completedCount,
      cancelledCount,
      completedTrialsActualCount,
      unreadNotificationsCount,
    ] = await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: { not: AppointmentStatus.CANCELLED } } }),
      prisma.appointment.count({ where: { status: AppointmentStatus.CONFIRMED } }),
      prisma.appointment.count({ where: { status: AppointmentStatus.COMPLETED } }),
      prisma.appointment.count({ where: { status: AppointmentStatus.CANCELLED } }),
      prisma.trialAttendance.count({
        where: { status: AttendanceStatus.COMPLETED },
      }),
      prisma.notification.count({
        where: { readAt: null },
      }),
    ]);

    return {
      activeMentorsCount,
      totalAppointments,
      totalBookedAppointments,
      confirmedAppointments: confirmedCount,
      completedAppointments: completedCount,
      completedRatio: `${completedCount} / ${totalBookedAppointments}`,
      cancelledAppointments: cancelledCount,
      todayAppointmentsCount,
      todayRatio: `${todayAppointmentsCount} / ${totalDailyCapacity}`,
      totalDailyCapacity,
      remainingTodayCapacity,
      completedTrialsActualCount,
      unreadNotificationsCount,
    };
  }
}

export const adminService = new AdminService();
