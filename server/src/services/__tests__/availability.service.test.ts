import { describe, it, expect, beforeEach } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { AvailabilityService } from '../availability.service';
import { MentorRepository } from '../../repositories/mentor.repository';
import { MentorWithUser } from '../../types/mentor.types';

// Mock repository for unit testing AvailabilityService without touching the database
class MockMentorRepository extends MentorRepository {
  private mentors: Map<string, MentorWithUser> = new Map();
  private appointments: Array<{ mentorId: string; start: Date; end: Date }> = [];

  constructor() {
    super();
    // Seed test mentor in Asia/Kolkata
    this.mentors.set('kolkata-mentor-1', {
      id: 'kolkata-mentor-1',
      userId: 'user-1',
      timezone: 'Asia/Kolkata',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-1',
        fullName: 'Aarav Sharma',
        email: 'aarav@codeyoung.com',
        role: 'MENTOR',
        timezone: 'Asia/Kolkata',
      },
      availability: [
        {
          id: 'rule-mon',
          mentorId: 'kolkata-mentor-1',
          dayOfWeek: 1, // Monday
          localStart: '16:00',
          localEnd: '21:00',
        },
        {
          id: 'rule-sat',
          mentorId: 'kolkata-mentor-1',
          dayOfWeek: 6, // Saturday
          localStart: '10:00',
          localEnd: '18:00',
        },
      ],
    });

    // Seed test mentor in America/New_York (for DST testing)
    this.mentors.set('ny-mentor-1', {
      id: 'ny-mentor-1',
      userId: 'user-2',
      timezone: 'America/New_York',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-2',
        fullName: 'Sarah Jenkins',
        email: 'sarah@codeyoung.com',
        role: 'MENTOR',
        timezone: 'America/New_York',
      },
      availability: [
        {
          id: 'rule-ny-mon',
          mentorId: 'ny-mentor-1',
          dayOfWeek: 1, // Monday
          localStart: '18:00',
          localEnd: '21:00',
        },
      ],
    });

    // Seed inactive mentor
    this.mentors.set('inactive-mentor', {
      id: 'inactive-mentor',
      userId: 'user-3',
      timezone: 'Asia/Kolkata',
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-3',
        fullName: 'Inactive Mentor',
        email: 'inactive@codeyoung.com',
        role: 'MENTOR',
        timezone: 'Asia/Kolkata',
      },
      availability: [
        {
          id: 'rule-inactive-mon',
          mentorId: 'inactive-mentor',
          dayOfWeek: 1,
          localStart: '16:00',
          localEnd: '21:00',
        },
      ],
    });
  }

  addAppointment(mentorId: string, start: Date, end: Date) {
    this.appointments.push({ mentorId, start, end });
  }

  async findById(id: string): Promise<MentorWithUser | null> {
    return this.mentors.get(id) || null;
  }

  async getAvailabilityForDay(mentorId: string, dayOfWeek: number) {
    const mentor = this.mentors.get(mentorId);
    if (!mentor) return [];
    return mentor.availability.filter((a) => a.dayOfWeek === dayOfWeek);
  }

  async hasConflictingAppointment(mentorId: string, startTime: Date, endTime: Date): Promise<boolean> {
    return this.appointments.some(
      (app) => app.mentorId === mentorId && startTime < app.end && endTime > app.start
    );
  }
}

describe('AvailabilityService', () => {
  let mockRepo: MockMentorRepository;
  let service: AvailabilityService;

  beforeEach(() => {
    mockRepo = new MockMentorRepository();
    service = new AvailabilityService(mockRepo);
  });

  it('identifies mentor as available when 1-hour appointment falls within working interval', async () => {
    // 2026-09-28 is a Monday. 12:30:00Z = 18:00:00 IST (+05:30)
    // Aarav works 16:00 to 21:00 on Monday
    const start = Temporal.Instant.from('2026-09-28T12:30:00Z');
    const result = await service.isMentorAvailable('kolkata-mentor-1', start);

    expect(result.available).toBe(true);
    expect(result.mentorLocal.localDate).toBe('2026-09-28');
    expect(result.mentorLocal.dayOfWeek).toBe('Monday');
    expect(result.mentorLocal.start).toBe('18:00');
    expect(result.mentorLocal.end).toBe('19:00');
    expect(result.matchingSchedule).toEqual({
      dayOfWeek: 'Monday',
      localStart: '16:00',
      localEnd: '21:00',
    });
  });

  it('identifies mentor as available at the exact end boundary [20:00, 21:00)', async () => {
    // 14:30:00Z = 20:00:00 IST. End is 21:00:00 IST
    const start = Temporal.Instant.from('2026-09-28T14:30:00Z');
    const result = await service.isMentorAvailable('kolkata-mentor-1', start);

    expect(result.available).toBe(true);
    expect(result.mentorLocal.start).toBe('20:00');
    expect(result.mentorLocal.end).toBe('21:00');
  });

  it('rejects requested appointment that extends beyond mentor working interval [20:30, 21:30)', async () => {
    // 15:00:00Z = 20:30:00 IST. End is 21:30:00 IST (working hours end at 21:00)
    const start = Temporal.Instant.from('2026-09-28T15:00:00Z');
    const result = await service.isMentorAvailable('kolkata-mentor-1', start);

    expect(result.available).toBe(false);
    expect(result.reason).toContain('outside mentor\'s Monday working hours');
  });

  it('rejects requested appointment that starts before mentor working interval [15:30, 16:30)', async () => {
    // 10:00:00Z = 15:30:00 IST. Working hours start at 16:00
    const start = Temporal.Instant.from('2026-09-28T10:00:00Z');
    const result = await service.isMentorAvailable('kolkata-mentor-1', start);

    expect(result.available).toBe(false);
    expect(result.reason).toContain('outside mentor\'s Monday working hours');
  });

  it('rejects when requested appointment is on a day with no mentor availability', async () => {
    // 2026-09-27 is Sunday. Aarav has no Sunday hours
    const start = Temporal.Instant.from('2026-09-27T12:30:00Z');
    const result = await service.isMentorAvailable('kolkata-mentor-1', start);

    expect(result.available).toBe(false);
    expect(result.reason).toContain('no working hours scheduled on Sundays');
  });

  it('correctly maps mentor-local date and day of week across UTC midnight', async () => {
    // 2026-09-28T03:00:00Z is 08:30 IST on Monday morning (2026-09-28)
    // (For a parent in California, this is Sunday evening 20:00 PDT)
    const start = Temporal.Instant.from('2026-09-28T03:00:00Z');
    const result = await service.isMentorAvailable('kolkata-mentor-1', start);

    expect(result.mentorLocal.localDate).toBe('2026-09-28');
    expect(result.mentorLocal.dayOfWeek).toBe('Monday');
    expect(result.mentorLocal.dayOfWeekNumber).toBe(1);
    expect(result.mentorLocal.start).toBe('08:30');
    expect(result.available).toBe(false); // 08:30 is outside 16:00-21:00
  });

  it('correctly respects Daylight Saving Time (DST) for America/New_York mentor', async () => {
    // Sarah Jenkins works Monday 18:00 - 21:00 America/New_York
    // During summer/autumn (EDT = UTC-4):
    // 18:00 EDT = 22:00:00Z on Monday 2026-09-28
    const summerStart = Temporal.Instant.from('2026-09-28T22:00:00Z');
    const summerResult = await service.isMentorAvailable('ny-mentor-1', summerStart);
    expect(summerResult.available).toBe(true);
    expect(summerResult.mentorLocal.start).toBe('18:00');
    expect(summerResult.mentorLocal.end).toBe('19:00');

    // During winter (EST = UTC-5):
    // 18:00 EST = 23:00:00Z on Monday 2026-12-14
    const winterStart = Temporal.Instant.from('2026-12-14T23:00:00Z');
    const winterResult = await service.isMentorAvailable('ny-mentor-1', winterStart);
    expect(winterResult.available).toBe(true);
    expect(winterResult.mentorLocal.start).toBe('18:00');
    expect(winterResult.mentorLocal.end).toBe('19:00');

    // If we request 22:00:00Z during winter:
    // That corresponds to 17:00:00 EST (before 18:00 start)
    const winterEarlyStart = Temporal.Instant.from('2026-12-14T22:00:00Z');
    const winterEarlyResult = await service.isMentorAvailable('ny-mentor-1', winterEarlyStart);
    expect(winterEarlyResult.available).toBe(false);
    expect(winterEarlyResult.mentorLocal.start).toBe('17:00');
  });

  it('rejects when mentor has a conflicting booked appointment', async () => {
    // Add existing appointment on Monday 18:00 - 19:00 IST
    // 18:00 IST = 12:30:00Z
    const appStart = new Date('2026-09-28T12:30:00Z');
    const appEnd = new Date('2026-09-28T13:30:00Z');
    mockRepo.addAppointment('kolkata-mentor-1', appStart, appEnd);

    // Request same slot: 12:30:00Z
    const start = Temporal.Instant.from('2026-09-28T12:30:00Z');
    const result = await service.isMentorAvailable('kolkata-mentor-1', start);

    expect(result.available).toBe(false);
    expect(result.reason).toContain('already has a confirmed appointment');
  });

  it('returns available: false when mentor is inactive', async () => {
    const start = Temporal.Instant.from('2026-09-28T12:30:00Z');
    const result = await service.isMentorAvailable('inactive-mentor', start);

    expect(result.available).toBe(false);
    expect(result.reason).toContain('is currently inactive');
  });

  it('throws 404 when mentor ID does not exist', async () => {
    const start = Temporal.Instant.from('2026-09-28T12:30:00Z');
    await expect(service.isMentorAvailable('non-existent-id', start)).rejects.toThrow('Mentor not found');
  });
});
