import { describe, it, expect, beforeEach } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { SchedulingService } from '../scheduling.service';
import { MentorRepository } from '../../repositories/mentor.repository';
import { AppointmentRepository } from '../../repositories/appointment.repository';
import { MentorWithUser } from '../../types/mentor.types';

// In-memory mock repositories for isolated unit testing
class MockMentorRepository extends MentorRepository {
  private mentors: Map<string, MentorWithUser> = new Map();
  private unavailabilities: Array<{
    mentorId: string;
    startDate: Date;
    endDate: Date;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
  }> = [];

  constructor() {
    super();
  }

  addMentor(mentor: MentorWithUser) {
    this.mentors.set(mentor.id, mentor);
  }

  addMockUnavailability(
    mentorId: string,
    startDate: Date,
    endDate: Date,
    status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'APPROVED'
  ) {
    this.unavailabilities.push({ mentorId, startDate, endDate, status });
  }

  async findById(id: string): Promise<MentorWithUser | null> {
    return this.mentors.get(id) || null;
  }

  async findAll(options?: { isActive?: boolean }): Promise<MentorWithUser[]> {
    const list = Array.from(this.mentors.values());
    if (options?.isActive !== undefined) {
      return list.filter((m) => m.isActive === options.isActive);
    }
    return list;
  }

  async hasUnavailabilityException(mentorId: string, startTime: Date, endTime: Date): Promise<boolean> {
    return this.unavailabilities.some(
      (u) =>
        u.mentorId === mentorId &&
        u.status === 'APPROVED' &&
        u.startDate < endTime &&
        u.endDate > startTime
    );
  }
}

interface MockAppointment {
  id: string;
  mentorId: string;
  startTime: Date;
  endTime: Date;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}

class MockAppointmentRepository extends AppointmentRepository {
  private appointments: MockAppointment[] = [];

  addAppointment(app: MockAppointment) {
    this.appointments.push(app);
  }

  clear() {
    this.appointments = [];
  }

  async hasConflictingAppointment(mentorId: string, startTime: Date, endTime: Date): Promise<boolean> {
    return this.appointments.some(
      (app) =>
        app.mentorId === mentorId &&
        app.status !== 'CANCELLED' &&
        startTime < app.endTime &&
        endTime > app.startTime
    );
  }

  async countDailyAppointments(mentorId: string, dayStart: Date, dayEnd: Date): Promise<number> {
    return this.appointments.filter(
      (app) =>
        app.mentorId === mentorId &&
        (app.status === 'CONFIRMED' || app.status === 'COMPLETED') &&
        app.startTime >= dayStart &&
        app.startTime < dayEnd
    ).length;
  }
}

describe('SchedulingService', () => {
  let mentorRepo: MockMentorRepository;
  let appointmentRepo: MockAppointmentRepository;
  let service: SchedulingService;

  // Helper to create a mentor in Asia/Kolkata
  const createKolkataMentor = (
    id: string,
    fullName: string,
    availabilities: Array<{ dayOfWeek: number; localStart: string; localEnd: string }>,
    isActive: boolean = true
  ): MentorWithUser => ({
    id,
    userId: `user-${id}`,
    timezone: 'Asia/Kolkata',
    isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: `user-${id}`,
      fullName,
      email: `${id}@codeyoung.com`,
      role: 'MENTOR',
      timezone: 'Asia/Kolkata',
    },
    availability: availabilities.map((a, i) => ({
      id: `rule-${id}-${i}`,
      mentorId: id,
      dayOfWeek: a.dayOfWeek,
      localStart: a.localStart,
      localEnd: a.localEnd,
    })),
  });

  // Helper to create a mentor in America/New_York
  const createNewYorkMentor = (
    id: string,
    fullName: string,
    availabilities: Array<{ dayOfWeek: number; localStart: string; localEnd: string }>,
    isActive: boolean = true
  ): MentorWithUser => ({
    id,
    userId: `user-${id}`,
    timezone: 'America/New_York',
    isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: `user-${id}`,
      fullName,
      email: `${id}@codeyoung.com`,
      role: 'MENTOR',
      timezone: 'America/New_York',
    },
    availability: availabilities.map((a, i) => ({
      id: `rule-${id}-${i}`,
      mentorId: id,
      dayOfWeek: a.dayOfWeek,
      localStart: a.localStart,
      localEnd: a.localEnd,
    })),
  });

  beforeEach(() => {
    mentorRepo = new MockMentorRepository();
    appointmentRepo = new MockAppointmentRepository();
    service = new SchedulingService(mentorRepo, appointmentRepo);
  });

  describe('Slot Generation & Alignment', () => {
    it('generates exact 60-minute candidate slots from mentor working interval [16:00, 21:00)', () => {
      // Aarav works Monday 16:00 to 21:00 Asia/Kolkata
      const mentor = createKolkataMentor('aarav', 'Aarav Sharma', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
      ]);
      mentorRepo.addMentor(mentor);

      // 2026-09-28 is a Monday
      const slots = service.generateCandidateSlotsForDate('2026-09-28', [mentor]);

      // Exactly 5 1-hour slots: 16-17, 17-18, 18-19, 19-20, 20-21
      expect(slots).toHaveLength(5);

      // Check first slot: 16:00 IST = 10:30 UTC
      expect(slots[0].startInstant.toString()).toBe('2026-09-28T10:30:00Z');
      expect(slots[0].endInstant.toString()).toBe('2026-09-28T11:30:00Z');

      // Check last slot: 20:00 IST = 14:30 UTC -> 21:00 IST = 15:30 UTC
      expect(slots[4].startInstant.toString()).toBe('2026-09-28T14:30:00Z');
      expect(slots[4].endInstant.toString()).toBe('2026-09-28T15:30:00Z');
    });

    it('does not generate partial slots that exceed mentor availability [16:00, 20:30)', () => {
      // Vikram works Monday 16:00 to 20:30 Asia/Kolkata
      const mentor = createKolkataMentor('vikram', 'Vikram Patel', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '20:30' },
      ]);
      mentorRepo.addMentor(mentor);

      const slots = service.generateCandidateSlotsForDate('2026-09-28', [mentor]);

      // Slots should be: 16-17, 17-18, 18-19, 19-20 (4 slots)
      // 20:00-21:00 would exceed 20:30 and must NOT be generated
      expect(slots).toHaveLength(4);
      expect(slots[3].startInstant.toString()).toBe('2026-09-28T13:30:00Z'); // 19:00 IST
      expect(slots[3].endInstant.toString()).toBe('2026-09-28T14:30:00Z');   // 20:00 IST
    });

    it('merges candidate slots across multiple mentors in chronological order without duplicates', () => {
      // Aarav: Monday 16:00–18:00 (16-17, 17-18)
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '18:00' },
      ]);
      // Priya: Monday 17:00–19:00 (17-18, 18-19)
      const m2 = createKolkataMentor('m2', 'Priya', [
        { dayOfWeek: 1, localStart: '17:00', localEnd: '19:00' },
      ]);
      // Aditya: Monday 17:30–18:30 (17:30-18:30)
      const m3 = createKolkataMentor('m3', 'Aditya', [
        { dayOfWeek: 1, localStart: '17:30', localEnd: '18:30' },
      ]);

      const slots = service.generateCandidateSlotsForDate('2026-09-28', [m1, m2, m3]);

      // Unique slots:
      // 1. 16:00–17:00 (10:30 UTC)
      // 2. 17:00–18:00 (11:30 UTC)
      // 3. 17:30–18:30 (12:00 UTC)
      // 4. 18:00–19:00 (12:30 UTC)
      expect(slots).toHaveLength(4);
      expect(slots[0].startInstant.toString()).toBe('2026-09-28T10:30:00Z');
      expect(slots[1].startInstant.toString()).toBe('2026-09-28T11:30:00Z');
      expect(slots[2].startInstant.toString()).toBe('2026-09-28T12:00:00Z');
      expect(slots[3].startInstant.toString()).toBe('2026-09-28T12:30:00Z');
    });

    it('ignores inactive mentors when generating candidate slots', () => {
      const active = createKolkataMentor('active', 'Active', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '18:00' },
      ]);
      const inactive = createKolkataMentor(
        'inactive',
        'Inactive',
        [{ dayOfWeek: 1, localStart: '10:00', localEnd: '14:00' }],
        false
      );

      const slots = service.generateCandidateSlotsForDate('2026-09-28', [active, inactive]);
      expect(slots).toHaveLength(2); // Only active mentor's slots generated
    });
  });

  describe('Simultaneous Capacity & Status Calculation', () => {
    it('returns AVAILABLE when at least 2 mentors can conduct the class', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '19:00' },
      ]);
      const m2 = createKolkataMentor('m2', 'Priya', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '19:00' },
      ]);
      mentorRepo.addMentor(m1);
      mentorRepo.addMentor(m2);

      // 16:00 IST = 10:30 UTC
      const start = Temporal.Instant.from('2026-09-28T10:30:00Z');
      const capacity = await service.getSlotCapacity(start);

      expect(capacity.availableMentorsCount).toBe(2);
      expect(capacity.status).toBe('AVAILABLE');
      expect(capacity.isAvailable).toBe(true);
      expect(capacity.eligibleMentorIds).toEqual(['m1', 'm2']);
    });

    it('returns LIMITED when exactly 1 mentor can conduct the class', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '19:00' },
      ]);
      const m2 = createKolkataMentor('m2', 'Priya', [
        { dayOfWeek: 1, localStart: '18:00', localEnd: '21:00' },
      ]);
      mentorRepo.addMentor(m1);
      mentorRepo.addMentor(m2);

      // 16:00 IST (10:30 UTC): Only m1 works at 16:00
      const start = Temporal.Instant.from('2026-09-28T10:30:00Z');
      const capacity = await service.getSlotCapacity(start);

      expect(capacity.availableMentorsCount).toBe(1);
      expect(capacity.status).toBe('LIMITED');
      expect(capacity.isAvailable).toBe(true);
      expect(capacity.eligibleMentorIds).toEqual(['m1']);
    });

    it('returns FULL when 0 mentors can conduct the class', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '19:00' },
      ]);
      mentorRepo.addMentor(m1);

      // 12:00 IST (06:30 UTC): Nobody works at 12:00
      const start = Temporal.Instant.from('2026-09-28T06:30:00Z');
      const capacity = await service.getSlotCapacity(start);

      expect(capacity.availableMentorsCount).toBe(0);
      expect(capacity.status).toBe('FULL');
      expect(capacity.isAvailable).toBe(false);
      expect(capacity.eligibleMentorIds).toEqual([]);
    });
  });

  describe('Conflicting Appointments', () => {
    it('excludes mentor when they have a confirmed overlapping appointment', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '19:00' },
      ]);
      const m2 = createKolkataMentor('m2', 'Priya', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '19:00' },
      ]);
      mentorRepo.addMentor(m1);
      mentorRepo.addMentor(m2);

      // Aarav has a confirmed appointment 16:00-17:00 IST (10:30-11:30 UTC)
      appointmentRepo.addAppointment({
        id: 'app-1',
        mentorId: 'm1',
        startTime: new Date('2026-09-28T10:30:00Z'),
        endTime: new Date('2026-09-28T11:30:00Z'),
        status: 'CONFIRMED',
      });

      const start = Temporal.Instant.from('2026-09-28T10:30:00Z');
      const capacity = await service.getSlotCapacity(start);

      // Only Priya is available; Aarav is busy
      expect(capacity.availableMentorsCount).toBe(1);
      expect(capacity.status).toBe('LIMITED');
      expect(capacity.eligibleMentorIds).toEqual(['m2']);
    });

    it('does NOT exclude mentor when overlapping appointment is CANCELLED', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '19:00' },
      ]);
      mentorRepo.addMentor(m1);

      // Aarav had an appointment that was cancelled
      appointmentRepo.addAppointment({
        id: 'app-cancelled',
        mentorId: 'm1',
        startTime: new Date('2026-09-28T10:30:00Z'),
        endTime: new Date('2026-09-28T11:30:00Z'),
        status: 'CANCELLED',
      });

      const start = Temporal.Instant.from('2026-09-28T10:30:00Z');
      const capacity = await service.getSlotCapacity(start);

      expect(capacity.availableMentorsCount).toBe(1);
      expect(capacity.isAvailable).toBe(true);
    });

    it('respects half-open intervals [start, end) so adjacent appointments do not conflict', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '20:00' },
      ]);
      mentorRepo.addMentor(m1);

      // Aarav has appointment 16:00-17:00 IST (10:30-11:30 UTC)
      appointmentRepo.addAppointment({
        id: 'app-adjacent',
        mentorId: 'm1',
        startTime: new Date('2026-09-28T10:30:00Z'),
        endTime: new Date('2026-09-28T11:30:00Z'),
        status: 'CONFIRMED',
      });

      // Next slot is 17:00-18:00 IST (11:30-12:30 UTC)
      const nextSlotStart = Temporal.Instant.from('2026-09-28T11:30:00Z');
      const capacity = await service.getSlotCapacity(nextSlotStart);

      expect(capacity.availableMentorsCount).toBe(1);
      expect(capacity.eligibleMentorIds).toEqual(['m1']);
    });
  });

  describe('Daily Capacity Limit (Max 2 classes per mentor-local calendar day)', () => {
    it('allows a mentor with 0 appointments to conduct a trial class', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
      ]);
      mentorRepo.addMentor(m1);

      const start = Temporal.Instant.from('2026-09-28T10:30:00Z');
      const eligible = await service.isMentorEligibleForSlot(
        m1,
        start,
        start.add({ hours: 1 })
      );
      expect(eligible).toBe(true);
    });

    it('allows a mentor with 1 confirmed appointment to conduct a second trial class', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
      ]);
      mentorRepo.addMentor(m1);

      // 1 appointment earlier that day: 16:00-17:00 IST (10:30 UTC)
      appointmentRepo.addAppointment({
        id: 'app-1',
        mentorId: 'm1',
        startTime: new Date('2026-09-28T10:30:00Z'),
        endTime: new Date('2026-09-28T11:30:00Z'),
        status: 'CONFIRMED',
      });

      // Check slot at 18:00-19:00 IST (12:30 UTC)
      const slotStart = Temporal.Instant.from('2026-09-28T12:30:00Z');
      const eligible = await service.isMentorEligibleForSlot(
        m1,
        slotStart,
        slotStart.add({ hours: 1 })
      );
      expect(eligible).toBe(true);
    });

    it('excludes a mentor who has reached the daily limit of 2 CONFIRMED appointments', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
      ]);
      mentorRepo.addMentor(m1);

      // 2 appointments earlier on Monday: 16:00-17:00 and 17:00-18:00 IST
      appointmentRepo.addAppointment({
        id: 'app-1',
        mentorId: 'm1',
        startTime: new Date('2026-09-28T10:30:00Z'),
        endTime: new Date('2026-09-28T11:30:00Z'),
        status: 'CONFIRMED',
      });
      appointmentRepo.addAppointment({
        id: 'app-2',
        mentorId: 'm1',
        startTime: new Date('2026-09-28T11:30:00Z'),
        endTime: new Date('2026-09-28T12:30:00Z'),
        status: 'CONFIRMED',
      });

      // Check slot at 20:00-21:00 IST (14:30 UTC)
      const slotStart = Temporal.Instant.from('2026-09-28T14:30:00Z');
      const eligible = await service.isMentorEligibleForSlot(
        m1,
        slotStart,
        slotStart.add({ hours: 1 })
      );
      expect(eligible).toBe(false);
    });

    it('counts COMPLETED appointments toward the daily 2-class limit', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
      ]);
      mentorRepo.addMentor(m1);

      // 1 COMPLETED appointment and 1 CONFIRMED appointment
      appointmentRepo.addAppointment({
        id: 'app-completed',
        mentorId: 'm1',
        startTime: new Date('2026-09-28T10:30:00Z'),
        endTime: new Date('2026-09-28T11:30:00Z'),
        status: 'COMPLETED',
      });
      appointmentRepo.addAppointment({
        id: 'app-confirmed',
        mentorId: 'm1',
        startTime: new Date('2026-09-28T11:30:00Z'),
        endTime: new Date('2026-09-28T12:30:00Z'),
        status: 'CONFIRMED',
      });

      const slotStart = Temporal.Instant.from('2026-09-28T14:30:00Z');
      const eligible = await service.isMentorEligibleForSlot(
        m1,
        slotStart,
        slotStart.add({ hours: 1 })
      );
      expect(eligible).toBe(false);
    });

    it('does NOT count CANCELLED appointments toward the daily 2-class limit', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
      ]);
      mentorRepo.addMentor(m1);

      // 1 CONFIRMED and 1 CANCELLED appointment
      appointmentRepo.addAppointment({
        id: 'app-confirmed',
        mentorId: 'm1',
        startTime: new Date('2026-09-28T10:30:00Z'),
        endTime: new Date('2026-09-28T11:30:00Z'),
        status: 'CONFIRMED',
      });
      appointmentRepo.addAppointment({
        id: 'app-cancelled',
        mentorId: 'm1',
        startTime: new Date('2026-09-28T11:30:00Z'),
        endTime: new Date('2026-09-28T12:30:00Z'),
        status: 'CANCELLED',
      });

      // Still only 1 active appointment, so slot is available
      const slotStart = Temporal.Instant.from('2026-09-28T14:30:00Z');
      const eligible = await service.isMentorEligibleForSlot(
        m1,
        slotStart,
        slotStart.add({ hours: 1 })
      );
      expect(eligible).toBe(true);
    });

    it('calculates daily limits using mentor local calendar date rather than UTC calendar date', async () => {
      // Mentor in Asia/Kolkata (+05:30)
      const m1 = createKolkataMentor('m1', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
      ]);
      mentorRepo.addMentor(m1);

      // An appointment on Sunday 2026-09-27 at 20:00 IST is 14:30 UTC on 2026-09-27.
      // Another appointment on Tuesday 2026-09-29 at 16:00 IST is 10:30 UTC on 2026-09-29.
      // Neither of these belongs to Monday 2026-09-28 in Asia/Kolkata!
      appointmentRepo.addAppointment({
        id: 'app-sun',
        mentorId: 'm1',
        startTime: new Date('2026-09-27T14:30:00Z'),
        endTime: new Date('2026-09-27T15:30:00Z'),
        status: 'CONFIRMED',
      });
      appointmentRepo.addAppointment({
        id: 'app-tue',
        mentorId: 'm1',
        startTime: new Date('2026-09-29T10:30:00Z'),
        endTime: new Date('2026-09-29T11:30:00Z'),
        status: 'CONFIRMED',
      });

      // Aarav has 0 appointments on Monday 2026-09-28
      const slotStart = Temporal.Instant.from('2026-09-28T10:30:00Z');
      const eligible = await service.isMentorEligibleForSlot(
        m1,
        slotStart,
        slotStart.add({ hours: 1 })
      );
      expect(eligible).toBe(true);
    });
  });

  describe('Multi-Timezone and Daylight Saving Time (DST) Support', () => {
    it('correctly handles candidate slot generation across mentors in different timezones', async () => {
      // Mentor 1 in Asia/Kolkata works Monday 16:00–18:00 IST (10:30–12:30 UTC)
      const kolkataMentor = createKolkataMentor('m-kolkata', 'Aarav', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '18:00' },
      ]);
      // Mentor 2 in America/New_York works Monday 07:00–09:00 EDT (11:00–13:00 UTC)
      // 2026-09-28 is in Daylight Saving Time (EDT = UTC-4): 07:00 EDT = 11:00 UTC
      const nyMentor = createNewYorkMentor('m-ny', 'Sarah', [
        { dayOfWeek: 1, localStart: '07:00', localEnd: '09:00' },
      ]);
      mentorRepo.addMentor(kolkataMentor);
      mentorRepo.addMentor(nyMentor);

      const result = await service.getAvailableSlotsForDate('2026-09-28', 'UTC');

      // Candidate slots generated:
      // From Kolkata: 10:30-11:30 UTC, 11:30-12:30 UTC
      // From NY: 11:00-12:00 UTC, 12:00-13:00 UTC
      expect(result.totalSlots).toBe(4);
      expect(result.slots.map((s) => s.start)).toEqual([
        '2026-09-28T10:30:00Z',
        '2026-09-28T11:00:00Z',
        '2026-09-28T11:30:00Z',
        '2026-09-28T12:00:00Z',
      ]);
    });

    it('correctly accounts for DST transitions (EDT vs EST) in America/New_York', () => {
      // Sarah works Monday 18:00–20:00 America/New_York
      const nyMentor = createNewYorkMentor('m-ny', 'Sarah', [
        { dayOfWeek: 1, localStart: '18:00', localEnd: '20:00' },
      ]);

      // Summer / Early Autumn: 2026-09-28 (EDT = UTC-4)
      // 18:00 EDT = 22:00 UTC
      const summerSlots = service.generateCandidateSlotsForDate('2026-09-28', [nyMentor]);
      expect(summerSlots[0].startInstant.toString()).toBe('2026-09-28T22:00:00Z');

      // Winter: 2026-12-14 (EST = UTC-5)
      // 18:00 EST = 23:00 UTC
      const winterSlots = service.generateCandidateSlotsForDate('2026-12-14', [nyMentor]);
      expect(winterSlots[0].startInstant.toString()).toBe('2026-12-14T23:00:00Z');
    });
  });

  describe('Parent-Facing Safe Responses', () => {
    it('does NOT expose mentor identities or IDs in getAvailableSlotsForDate output', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav Sharma', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '18:00' },
      ]);
      mentorRepo.addMentor(m1);

      const result = await service.getAvailableSlotsForDate('2026-09-28', 'Asia/Kolkata');

      expect(result.slots.length).toBeGreaterThan(0);
      for (const slot of result.slots) {
        expect(slot).toHaveProperty('start');
        expect(slot).toHaveProperty('end');
        expect(slot).toHaveProperty('localStart');
        expect(slot).toHaveProperty('localEnd');
        expect(slot).toHaveProperty('status');
        expect(slot).toHaveProperty('availableMentors');
        expect(slot).toHaveProperty('remainingCapacity');

        // Strictly verify that NO mentor identifying properties exist on slot
        expect((slot as unknown as Record<string, unknown>).mentorId).toBeUndefined();
        expect((slot as unknown as Record<string, unknown>).mentorName).toBeUndefined();
        expect((slot as unknown as Record<string, unknown>).mentors).toBeUndefined();
      }
    });

    it('formats local times according to requested parent timezone', async () => {
      const m1 = createKolkataMentor('m1', 'Aarav Sharma', [
        { dayOfWeek: 1, localStart: '16:00', localEnd: '17:00' },
      ]);
      mentorRepo.addMentor(m1);

      // Request with America/New_York (EDT, UTC-4)
      // 16:00 IST = 10:30 UTC = 06:30 EDT
      const result = await service.getAvailableSlotsForDate('2026-09-28', 'America/New_York');

      expect(result.slots[0].localStart).toBe('06:30');
      expect(result.slots[0].localEnd).toBe('07:30');
      expect(result.slots[0].localFormatted).toBe('06:30 - 07:30');
    });
  });

  describe('Input Validation', () => {
    it('throws 400 for invalid date strings', () => {
      expect(() => service.validateDateString('2026-9-28')).toThrow('Expected YYYY-MM-DD');
      expect(() => service.validateDateString('invalid')).toThrow('Expected YYYY-MM-DD');
      expect(() => service.validateDateString('2026-02-30')).toThrow('Invalid calendar date');
    });

    it('throws 400 for invalid IANA timezones', () => {
      expect(() => service.validateTimezone('Invalid/Timezone')).toThrow('Invalid IANA timezone');
      expect(() => service.validateTimezone('')).toThrow('Invalid or missing');
    });
  });
});
