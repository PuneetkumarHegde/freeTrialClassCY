import { Prisma, Role, User, Appointment } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { appointmentRepository, AppointmentRepository } from './appointment.repository';
import { mentorRepository, MentorRepository } from './mentor.repository';
import { MentorWithUser } from '../types/mentor.types';

export interface CreateAppointmentDbInput {
  mentorId: string;
  parentId: string;
  studentName: string;
  studentGrade: string;
  subject: string;
  learningGoal?: string | null;
  startTime: Date;
  endTime: Date;
  meetingLink: string;
}

export class BookingRepository {
  constructor(
    private appointmentRepo: AppointmentRepository = appointmentRepository,
    private mentorRepo: MentorRepository = mentorRepository
  ) {}

  /**
   * Execute operations inside a database transaction with serializable isolation
   */
  async executeTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    isolationLevel: Prisma.TransactionIsolationLevel = Prisma.TransactionIsolationLevel.ReadCommitted
  ): Promise<T> {
    return prisma.$transaction(fn, {
      isolationLevel,
      maxWait: 5000,
      timeout: 10000,
    });
  }

  /**
   * Find or create a PARENT user by normalized email
   */
  async findOrCreateParentUser(
    fullName: string,
    email: string,
    timezone: string,
    tx?: Prisma.TransactionClient
  ): Promise<User> {
    const client = tx || prisma;
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await client.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.timezone !== timezone) {
        return client.user.update({
          where: { id: existingUser.id },
          data: { timezone },
        });
      }
      return existingUser;
    }

    return client.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        role: Role.PARENT,
        timezone,
      },
    });
  }

  /**
   * Get all active mentors with user profile and availability
   */
  async getActiveMentors(tx?: Prisma.TransactionClient): Promise<MentorWithUser[]> {
    const client = tx || prisma;
    const mentors = await client.mentor.findMany({
      where: { isActive: true },
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
      },
      orderBy: {
        id: 'asc',
      },
    });

    return mentors as unknown as MentorWithUser[];
  }

  /**
   * Check if a mentor has an overlapping active appointment within a transaction
   */
  async hasConflictingAppointment(
    mentorId: string,
    startTime: Date,
    endTime: Date,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = tx || prisma;
    const conflict = await client.appointment.findFirst({
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
   * Check if a mentor has an active APPROVED unavailability exception period overlapping [startTime, endTime)
   */
  async hasUnavailabilityException(
    mentorId: string,
    startTime: Date,
    endTime: Date,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = tx || prisma;
    if (!client.mentorUnavailability?.findFirst) {
      return false;
    }
    const unavail = await client.mentorUnavailability.findFirst({
      where: {
        mentorId,
        status: 'APPROVED',
        startDate: { lt: endTime },
        endDate: { gt: startTime },
      },
    });

    return unavail !== null;
  }

  /**
   * Count confirmed and completed appointments for mentor in a local day window
   */
  async countDailyAppointments(
    mentorId: string,
    dayStart: Date,
    dayEnd: Date,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const client = tx || prisma;
    return client.appointment.count({
      where: {
        mentorId,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        startTime: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    });
  }

  /**
   * Create an appointment record inside transaction
   */
  async createAppointment(
    data: CreateAppointmentDbInput,
    tx?: Prisma.TransactionClient
  ): Promise<Appointment & { mentor: { user: { fullName: string; email: string } } }> {
    const client = tx || prisma;
    const appointment = await client.appointment.create({
      data: {
        mentorId: data.mentorId,
        parentId: data.parentId,
        studentName: data.studentName,
        studentGrade: data.studentGrade,
        subject: data.subject,
        learningGoal: data.learningGoal,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'CONFIRMED',
        meetingLink: data.meetingLink,
        attendance: {
          create: {
            status: 'SCHEDULED',
          },
        },
      },
      include: {
        mentor: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return appointment;
  }

  /**
   * Find appointment by ID with relationships
   */
  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.appointment.findUnique({
      where: { id },
      include: {
        parent: true,
        mentor: {
          include: {
            user: true,
          },
        },
      },
    });
  }
}

export const bookingRepository = new BookingRepository();
