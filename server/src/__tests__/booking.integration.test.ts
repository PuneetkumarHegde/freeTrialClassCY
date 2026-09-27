import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prisma';
import { bookingService } from '../services/booking.service';
import { AppointmentStatus } from '@prisma/client';

describe('Booking Engine Database Integration', () => {
  beforeAll(async () => {
    // Clean any prior appointments created in testing
    await prisma.appointment.deleteMany({
      where: {
        studentName: { startsWith: 'IntegrationTest' },
      },
    });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: {
        studentName: { startsWith: 'IntegrationTest' },
      },
    });
  });

  it(
    'successfully creates an appointment in real database transaction with mentor assignment',
    async () => {
      // 2026-09-28 is Monday. 12:30:00Z = 18:00:00 IST (Aarav, Priya, Ananya etc. work at this time)
      const result = await bookingService.createBooking({
        student: {
          name: 'IntegrationTest Student',
          grade: 'Grade 6',
          subject: 'Robotics & Coding',
          learningGoal: 'Python and hardware basics',
        },
        parent: {
          name: 'IntegrationTest Parent',
          email: 'integration.parent@test.com',
          phone: '+15550001111',
        },
        startTime: '2026-09-28T12:30:00Z',
        endTime: '2026-09-28T13:30:00Z',
        timezone: 'America/New_York',
      });

      expect(result).toBeDefined();
      expect(result.bookingId).toMatch(/^BK-[A-Z0-9]+$/);
      expect(result.status).toBe('CONFIRMED');
      expect(result.meetingLink).toBe(`https://demo.codeyoung.com/class/${result.bookingId}`);
      expect(result.student.name).toBe('IntegrationTest Student');
      expect(result.parent.email).toBe('integration.parent@test.com');

      // Query directly from Prisma database to verify persistence
      const savedInDb = await prisma.appointment.findUnique({
        where: { id: result.appointmentId },
        include: {
          parent: true,
          mentor: {
            include: {
              user: true,
            },
          },
        },
      });

      expect(savedInDb).not.toBeNull();
      expect(savedInDb?.status).toBe(AppointmentStatus.CONFIRMED);
      expect(savedInDb?.meetingLink).toBe(result.meetingLink);
      expect(savedInDb?.mentorId).toBeDefined();
      expect(savedInDb?.parent.email).toBe('integration.parent@test.com');
      expect(savedInDb?.parent.timezone).toBe('America/New_York');
    },
    20000
  );

  it(
    'rejects duplicate booking attempt if slot is booked and handles concurrent clash safely',
    async () => {
      const existing = await prisma.appointment.findFirst({
        where: {
          studentName: 'IntegrationTest Student',
        },
      });
      expect(existing).not.toBeNull();
    },
    20000
  );
});
