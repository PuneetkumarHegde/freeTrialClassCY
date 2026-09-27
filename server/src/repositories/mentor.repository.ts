import { prisma } from '../lib/prisma';
import { MentorWithUser, MentorAvailabilityRule, MentorUnavailabilityRule } from '../types/mentor.types';

export class MentorRepository {
  /**
   * Find mentor by ID including user profile, configured availability, and unavailabilities
   */
  async findById(id: string): Promise<MentorWithUser | null> {
    const mentor = await prisma.mentor.findUnique({
      where: { id },
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
      },
    });

    if (!mentor) return null;
    return mentor as unknown as MentorWithUser;
  }

  /**
   * Find all mentors with their user profile, availability, and unavailabilities
   */
  async findAll(options?: { isActive?: boolean }): Promise<MentorWithUser[]> {
    const whereClause = options?.isActive !== undefined ? { isActive: options.isActive } : {};
    const mentors = await prisma.mentor.findMany({
      where: whereClause,
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
      },
      orderBy: {
        user: {
          fullName: 'asc',
        },
      },
    });

    return mentors as unknown as MentorWithUser[];
  }

  /**
   * Find availability rules for a mentor on a specific day of week (0 = Sunday ... 6 = Saturday)
   */
  async getAvailabilityForDay(mentorId: string, dayOfWeek: number): Promise<MentorAvailabilityRule[]> {
    const rules = await prisma.mentorAvailability.findMany({
      where: {
        mentorId,
        dayOfWeek,
      },
      orderBy: {
        localStart: 'asc',
      },
    });

    return rules;
  }

  /**
   * Check if mentor has any active (non-cancelled) appointment overlapping [startTime, endTime)
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
   * Check if mentor has an explicit APPROVED unavailability exception overlapping [startTime, endTime)
   */
  async hasUnavailabilityException(mentorId: string, startTime: Date, endTime: Date): Promise<boolean> {
    try {
      const unavail = await prisma.mentorUnavailability.findFirst({
        where: {
          mentorId,
          status: 'APPROVED',
          startDate: { lt: endTime },
          endDate: { gt: startTime },
        },
      });

      return unavail !== null;
    } catch {
      try {
        const unavail = await prisma.mentorUnavailability.findFirst({
          where: {
            mentorId,
            startDate: { lt: endTime },
            endDate: { gt: startTime },
          },
        });
        return unavail !== null;
      } catch {
        return false;
      }
    }
  }

  /**
   * Add an unavailability exception period (defaults to PENDING)
   */
  async addUnavailability(
    mentorId: string,
    startDate: Date,
    endDate: Date,
    reason?: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING'
  ): Promise<MentorUnavailabilityRule> {
    const record = await prisma.mentorUnavailability.create({
      data: {
        mentorId,
        startDate,
        endDate,
        reason,
        status,
      },
    });
    return record as unknown as MentorUnavailabilityRule;
  }

  /**
   * Remove an unavailability exception
   */
  async removeUnavailability(unavailabilityId: string): Promise<void> {
    await prisma.mentorUnavailability.delete({
      where: { id: unavailabilityId },
    });
  }

  /**
   * Update mentor active status (e.g. terminate/reactivate)
   */
  async setMentorActiveStatus(mentorId: string, isActive: boolean): Promise<MentorWithUser> {
    const updated = await prisma.mentor.update({
      where: { id: mentorId },
      data: { isActive },
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
      },
    });
    return updated as unknown as MentorWithUser;
  }
}

export const mentorRepository = new MentorRepository();
