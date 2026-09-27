import { prisma } from '../lib/prisma';

export interface AppointmentRecord {
  id: string;
  mentorId: string;
  parentId: string;
  startTime: Date;
  endTime: Date;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}

export class AppointmentRepository {
  /**
   * Check if a mentor has any non-cancelled appointment overlapping [startTime, endTime)
   */
  async hasConflictingAppointment(mentorId: string, startTime: Date, endTime: Date): Promise<boolean> {
    const conflict = await prisma.appointment.findFirst({
      where: {
        mentorId,
        status: { not: 'CANCELLED' },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    return conflict !== null;
  }

  /**
   * Count CONFIRMED and COMPLETED appointments for a mentor within [dayStart, dayEnd)
   * (Enforces the daily 2-class limit in the mentor's local timezone)
   */
  async countDailyAppointments(mentorId: string, dayStart: Date, dayEnd: Date): Promise<number> {
    return prisma.appointment.count({
      where: {
        mentorId,
        status: {
          in: ['CONFIRMED', 'COMPLETED'],
        },
        startTime: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    });
  }

  /**
   * Find non-cancelled appointments for a set of mentors within a given time window
   */
  async findAppointmentsForMentors(
    mentorIds: string[],
    windowStart: Date,
    windowEnd: Date
  ): Promise<Array<{ id: string; mentorId: string; startTime: Date; endTime: Date; status: string }>> {
    return prisma.appointment.findMany({
      where: {
        mentorId: { in: mentorIds },
        status: { not: 'CANCELLED' },
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart },
      },
      select: {
        id: true,
        mentorId: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });
  }
}

export const appointmentRepository = new AppointmentRepository();
