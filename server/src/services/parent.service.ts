import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export class ParentService {
  /**
   * Get all appointments belonging to the parent user
   */
  async getParentAppointments(parentId: string) {
    const appointments = await prisma.appointment.findMany({
      where: { parentId },
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        studentName: true,
        studentGrade: true,
        subject: true,
        learningGoal: true,
        startTime: true,
        endTime: true,
        status: true,
        meetingLink: true,
        createdAt: true,
        parent: {
          select: {
            timezone: true,
          },
        },
      },
    });

    return appointments.map((app) => ({
      appointmentId: app.id,
      studentName: app.studentName,
      studentGrade: app.studentGrade,
      subject: app.subject,
      learningGoal: app.learningGoal,
      startTime: app.startTime.toISOString(),
      endTime: app.endTime.toISOString(),
      parentTimezone: app.parent.timezone,
      status: app.status,
      meetingLink: app.meetingLink,
      createdAt: app.createdAt.toISOString(),
    }));
  }

  /**
   * Get a specific appointment for the parent, ensuring ownership
   */
  async getParentAppointmentById(parentId: string, appointmentId: string) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        parentId,
      },
      select: {
        id: true,
        studentName: true,
        studentGrade: true,
        subject: true,
        learningGoal: true,
        startTime: true,
        endTime: true,
        status: true,
        meetingLink: true,
        createdAt: true,
        parent: {
          select: {
            timezone: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      // Return 404 so existence of another user's appointment is never leaked
      throw new AppError('Appointment not found.', 404);
    }

    return {
      appointmentId: appointment.id,
      studentName: appointment.studentName,
      studentGrade: appointment.studentGrade,
      subject: appointment.subject,
      learningGoal: appointment.learningGoal,
      startTime: appointment.startTime.toISOString(),
      endTime: appointment.endTime.toISOString(),
      parentTimezone: appointment.parent.timezone,
      status: appointment.status,
      meetingLink: appointment.meetingLink,
      createdAt: appointment.createdAt.toISOString(),
    };
  }
}

export const parentService = new ParentService();
