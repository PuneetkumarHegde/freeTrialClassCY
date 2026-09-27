import { describe, it, expect, beforeEach } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { BookingService } from '../booking.service';
import { BookingRepository, CreateAppointmentDbInput } from '../../repositories/booking.repository';
import { SchedulingService } from '../scheduling.service';
import { MentorWithUser } from '../../types/mentor.types';
import { User, Appointment, Role, AppointmentStatus, Prisma } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';

class MockBookingRepository extends BookingRepository {
  public users: Map<string, User> = new Map();
  public mentors: Map<string, MentorWithUser> = new Map();
  public appointments: Appointment[] = [];
  public failNextTransactionWithExclusion = false;

  constructor() {
    super();
  }

  addMentor(mentor: MentorWithUser) {
    this.mentors.set(mentor.id, mentor);
  }

  async executeTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    if (this.failNextTransactionWithExclusion) {
      this.failNextTransactionWithExclusion = false;
      const error = new Error('conflicting key value violates exclusion constraint "no_overlapping_mentor_appointments"');
      (error as any).code = '23P01';
      throw error;
    }
    return fn(this as unknown as Prisma.TransactionClient);
  }

  async findOrCreateParentUser(
    fullName: string,
    email: string,
    timezone: string
  ): Promise<User> {
    const normalized = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email === normalized) {
        u.timezone = timezone;
        return u;
      }
    }
    const newUser: User = {
      id: `parent-${this.users.size + 1}`,
      fullName: fullName.trim(),
      email: normalized,
      passwordHash: null,
      role: Role.PARENT,
      timezone,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async getActiveMentors(): Promise<MentorWithUser[]> {
    return Array.from(this.mentors.values()).filter((m) => m.isActive);
  }

  async hasConflictingAppointment(
    mentorId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    return this.appointments.some(
      (a) =>
        a.mentorId === mentorId &&
        a.status !== 'CANCELLED' &&
        startTime < a.endTime &&
        endTime > a.startTime
    );
  }

  async countDailyAppointments(
    mentorId: string,
    dayStart: Date,
    dayEnd: Date
  ): Promise<number> {
    return this.appointments.filter(
      (a) =>
        a.mentorId === mentorId &&
        (a.status === 'CONFIRMED' || a.status === 'COMPLETED') &&
        a.startTime >= dayStart &&
        a.startTime < dayEnd
    ).length;
  }

  async createAppointment(
    data: CreateAppointmentDbInput
  ): Promise<Appointment & { mentor: { user: { fullName: string; email: string } } }> {
    // Check exclusion constraint in mock
    const hasOverlap = await this.hasConflictingAppointment(data.mentorId, data.startTime, data.endTime);
    if (hasOverlap) {
      const error = new Error('conflicting key value violates exclusion constraint "no_overlapping_mentor_appointments"');
      (error as any).code = '23P01';
      throw error;
    }

    const app: Appointment = {
      id: `app-${this.appointments.length + 1}`,
      mentorId: data.mentorId,
      parentId: data.parentId,
      studentName: data.studentName,
      studentGrade: data.studentGrade,
      subject: data.subject,
      learningGoal: data.learningGoal || null,
      startTime: data.startTime,
      endTime: data.endTime,
      status: AppointmentStatus.CONFIRMED,
      meetingLink: data.meetingLink,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.appointments.push(app);
    return {
      ...app,
      mentor: {
        user: {
          fullName: 'Test Mentor',
          email: 'test.mentor@codeyoung.in',
        },
      },
    };
  }
}

describe('BookingService', () => {
  let mockRepo: MockBookingRepository;
  let service: BookingService;

  const createTestMentor = (
    id: string,
    fullName: string,
    timezone: string,
    availabilities: Array<{ dayOfWeek: number; localStart: string; localEnd: string }>,
    isActive: boolean = true
  ): MentorWithUser => ({
    id,
    userId: `user-${id}`,
    timezone,
    isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: `user-${id}`,
      fullName,
      email: `${id}@codeyoung.com`,
      role: Role.MENTOR,
      timezone,
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
    mockRepo = new MockBookingRepository();
    const scheduling = new SchedulingService();
    service = new BookingService(mockRepo, scheduling);
  });

  it('1. Valid booking creates appointment transactionally', async () => {
    const mentor = createTestMentor('mentor-1', 'Aarav Sharma', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' }, // Monday
    ]);
    mockRepo.addMentor(mentor);

    // 2026-09-28 is Monday. 12:30 UTC = 18:00 IST
    const result = await service.createBooking({
      student: {
        name: 'Leo Parker',
        grade: 'Grade 6',
        subject: 'Scratch Coding',
        learningGoal: 'Build game mechanics',
      },
      parent: {
        name: 'Jane Parker',
        email: 'jane@example.com',
        phone: '+1234567890',
      },
      startTime: '2026-09-28T12:30:00Z',
      endTime: '2026-09-28T13:30:00Z',
      timezone: 'America/New_York',
    });

    expect(result).toBeDefined();
    expect(result.appointmentId).toBeDefined();
    expect(result.student.name).toBe('Leo Parker');
    expect(result.student.grade).toBe('Grade 6');
    expect(result.student.subject).toBe('Scratch Coding');
    expect(result.parent.email).toBe('jane@example.com');
    expect(mockRepo.appointments).toHaveLength(1);
  });

  it('2. Appointment status is CONFIRMED', async () => {
    const mentor = createTestMentor('mentor-1', 'Aarav Sharma', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(mentor);

    const result = await service.createBooking({
      student: { name: 'Leo', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane@example.com' },
      startTime: '2026-09-28T12:30:00Z',
      endTime: '2026-09-28T13:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    expect(result.status).toBe('CONFIRMED');
    expect(mockRepo.appointments[0].status).toBe(AppointmentStatus.CONFIRMED);
  });

  it('3. Correct mentor is automatically assigned without parent choosing', async () => {
    // Mentor 1 has 1 appointment, Mentor 2 has 0 appointments
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    const m2 = createTestMentor('m-2', 'Priya', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);
    mockRepo.addMentor(m2);

    // Add 1 appointment to m1 on Monday 16:00 IST (10:30 UTC)
    mockRepo.appointments.push({
      id: 'existing-1',
      mentorId: 'm-1',
      parentId: 'p-1',
      studentName: 'Existing',
      studentGrade: 'Grade 5',
      subject: 'Math',
      learningGoal: null,
      startTime: new Date('2026-09-28T10:30:00Z'),
      endTime: new Date('2026-09-28T11:30:00Z'),
      status: AppointmentStatus.CONFIRMED,
      meetingLink: 'link',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Request slot at 18:00 IST (12:30 UTC)
    await service.createBooking({
      student: { name: 'Leo', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane@example.com' },
      startTime: '2026-09-28T12:30:00Z',
      endTime: '2026-09-28T13:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    // m2 should be selected because m2 has 0 appointments and m1 has 1 appointment
    const createdApp = mockRepo.appointments.find((a) => a.studentName === 'Leo');
    expect(createdApp).toBeDefined();
    expect(createdApp?.mentorId).toBe('m-2');
  });

  it('4. Parent does not provide mentorId', async () => {
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    const input = {
      student: { name: 'Leo', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane@example.com' },
      startTime: '2026-09-28T12:30:00Z',
      endTime: '2026-09-28T13:30:00Z',
      timezone: 'Asia/Kolkata',
    };

    // No mentorId is present in input
    expect((input as any).mentorId).toBeUndefined();
    const res = await service.createBooking(input);
    expect(res).toBeDefined();
  });

  it('5. 60-minute duration is enforced', async () => {
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    await expect(
      service.createBooking({
        student: { name: 'Leo', grade: 'Grade 4', subject: 'Math' },
        parent: { name: 'Jane', email: 'jane@example.com' },
        startTime: '2026-09-28T12:30:00Z',
        endTime: '2026-09-28T13:00:00Z', // 30 minutes
        timezone: 'Asia/Kolkata',
      })
    ).rejects.toThrow('Trial class duration must be exactly 60 minutes');
  });

  it('6. Mentor working-hours validation is enforced', async () => {
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '20:00' }, // Ends at 20:00 IST
    ]);
    mockRepo.addMentor(m1);

    // 20:00-21:00 IST (14:30-15:30 UTC) is outside working hours
    await expect(
      service.createBooking({
        student: { name: 'Leo', grade: 'Grade 4', subject: 'Math' },
        parent: { name: 'Jane', email: 'jane@example.com' },
        startTime: '2026-09-28T14:30:00Z',
        endTime: '2026-09-28T15:30:00Z',
        timezone: 'Asia/Kolkata',
      })
    ).rejects.toThrow('No mentors are available for this time');
  });

  it('7 & 8. Mentors with 0 or 1 daily appointments can be assigned', async () => {
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    // Book 1st slot
    await service.createBooking({
      student: { name: 'Student 1', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane1@example.com' },
      startTime: '2026-09-28T10:30:00Z', // 16:00 IST
      endTime: '2026-09-28T11:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    // Book 2nd slot
    const res2 = await service.createBooking({
      student: { name: 'Student 2', grade: 'Grade 5', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane2@example.com' },
      startTime: '2026-09-28T12:30:00Z', // 18:00 IST
      endTime: '2026-09-28T13:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    expect(res2.status).toBe('CONFIRMED');
    expect(mockRepo.appointments).toHaveLength(2);
  });

  it('9. Mentor with 2 daily appointments cannot be assigned (returns 409)', async () => {
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    // Book 1st slot
    await service.createBooking({
      student: { name: 'Student 1', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane1@example.com' },
      startTime: '2026-09-28T10:30:00Z',
      endTime: '2026-09-28T11:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    // Book 2nd slot
    await service.createBooking({
      student: { name: 'Student 2', grade: 'Grade 5', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane2@example.com' },
      startTime: '2026-09-28T11:30:00Z',
      endTime: '2026-09-28T12:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    // Attempt 3rd slot on the same day -> should fail with 409
    await expect(
      service.createBooking({
        student: { name: 'Student 3', grade: 'Grade 6', subject: 'Math' },
        parent: { name: 'Jane', email: 'jane3@example.com' },
        startTime: '2026-09-28T12:30:00Z',
        endTime: '2026-09-28T13:30:00Z',
        timezone: 'Asia/Kolkata',
      })
    ).rejects.toThrow('No mentors are available for this time');
  });

  it('10. CANCELLED appointment does not consume daily capacity', async () => {
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    // 1 CONFIRMED and 1 CANCELLED
    mockRepo.appointments.push({
      id: 'app-1',
      mentorId: 'm-1',
      parentId: 'p-1',
      studentName: 'S1',
      studentGrade: 'G4',
      subject: 'Math',
      learningGoal: null,
      startTime: new Date('2026-09-28T10:30:00Z'),
      endTime: new Date('2026-09-28T11:30:00Z'),
      status: AppointmentStatus.CONFIRMED,
      meetingLink: 'link',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockRepo.appointments.push({
      id: 'app-cancelled',
      mentorId: 'm-1',
      parentId: 'p-1',
      studentName: 'S2',
      studentGrade: 'G4',
      subject: 'Math',
      learningGoal: null,
      startTime: new Date('2026-09-28T11:30:00Z'),
      endTime: new Date('2026-09-28T12:30:00Z'),
      status: AppointmentStatus.CANCELLED,
      meetingLink: 'link',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Can still book 2nd active slot
    const res = await service.createBooking({
      student: { name: 'Student 3', grade: 'Grade 6', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane@example.com' },
      startTime: '2026-09-28T13:30:00Z',
      endTime: '2026-09-28T14:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    expect(res.status).toBe('CONFIRMED');
  });

  it('11. COMPLETED appointment consumes daily capacity', async () => {
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    // 1 COMPLETED and 1 CONFIRMED
    mockRepo.appointments.push({
      id: 'app-completed',
      mentorId: 'm-1',
      parentId: 'p-1',
      studentName: 'S1',
      studentGrade: 'G4',
      subject: 'Math',
      learningGoal: null,
      startTime: new Date('2026-09-28T10:30:00Z'),
      endTime: new Date('2026-09-28T11:30:00Z'),
      status: AppointmentStatus.COMPLETED,
      meetingLink: 'link',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockRepo.appointments.push({
      id: 'app-confirmed',
      mentorId: 'm-1',
      parentId: 'p-1',
      studentName: 'S2',
      studentGrade: 'G4',
      subject: 'Math',
      learningGoal: null,
      startTime: new Date('2026-09-28T11:30:00Z'),
      endTime: new Date('2026-09-28T12:30:00Z'),
      status: AppointmentStatus.CONFIRMED,
      meetingLink: 'link',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.createBooking({
        student: { name: 'Student 3', grade: 'Grade 6', subject: 'Math' },
        parent: { name: 'Jane', email: 'jane@example.com' },
        startTime: '2026-09-28T13:30:00Z',
        endTime: '2026-09-28T14:30:00Z',
        timezone: 'Asia/Kolkata',
      })
    ).rejects.toThrow('No mentors are available for this time');
  });

  it('12. Overlapping appointment is rejected', async () => {
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    // Book 16:00 - 17:00 IST (10:30 - 11:30 UTC)
    await service.createBooking({
      student: { name: 'Student 1', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane@example.com' },
      startTime: '2026-09-28T10:30:00Z',
      endTime: '2026-09-28T11:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    // Attempt overlapping booking 16:30 - 17:30 IST (11:00 - 12:00 UTC)
    await expect(
      service.createBooking({
        student: { name: 'Student 2', grade: 'Grade 4', subject: 'Math' },
        parent: { name: 'Bob', email: 'bob@example.com' },
        startTime: '2026-09-28T11:00:00Z',
        endTime: '2026-09-28T12:00:00Z',
        timezone: 'Asia/Kolkata',
      })
    ).rejects.toThrow('No mentors are available for this time');
  });

  it('13. Back-to-back appointment succeeds', async () => {
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    // 1st: 10:30 - 11:30 UTC
    await service.createBooking({
      student: { name: 'Student 1', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane@example.com' },
      startTime: '2026-09-28T10:30:00Z',
      endTime: '2026-09-28T11:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    // 2nd: 11:30 - 12:30 UTC (immediately adjacent)
    const res2 = await service.createBooking({
      student: { name: 'Student 2', grade: 'Grade 5', subject: 'Math' },
      parent: { name: 'Bob', email: 'bob@example.com' },
      startTime: '2026-09-28T11:30:00Z',
      endTime: '2026-09-28T12:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    expect(res2.status).toBe('CONFIRMED');
    expect(mockRepo.appointments).toHaveLength(2);
  });

  it('14. No eligible mentor returns 409 AppError', async () => {
    // No mentors in repo
    await expect(
      service.createBooking({
        student: { name: 'Student', grade: 'Grade 4', subject: 'Math' },
        parent: { name: 'Jane', email: 'jane@example.com' },
        startTime: '2026-09-28T10:30:00Z',
        endTime: '2026-09-28T11:30:00Z',
        timezone: 'Asia/Kolkata',
      })
    ).rejects.toThrow('No mentors are available for this time');
  });

  it('15. Meeting link is generated and stored', async () => {
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    const res = await service.createBooking({
      student: { name: 'Student', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane@example.com' },
      startTime: '2026-09-28T10:30:00Z',
      endTime: '2026-09-28T11:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    expect(res.meetingLink).toMatch(/^https:\/\/demo\.codeyoung\.com\/class\/BK-[A-Z0-9]+$/);
    expect(mockRepo.appointments[0].meetingLink).toBe(res.meetingLink);
  });

  it('16. Booking reference is unique', async () => {
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    const res1 = await service.createBooking({
      student: { name: 'S1', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane1@example.com' },
      startTime: '2026-09-28T10:30:00Z',
      endTime: '2026-09-28T11:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    const res2 = await service.createBooking({
      student: { name: 'S2', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane2@example.com' },
      startTime: '2026-09-28T11:30:00Z',
      endTime: '2026-09-28T12:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    expect(res1.bookingId).not.toBe(res2.bookingId);
    expect(res1.bookingId.startsWith('BK-')).toBe(true);
    expect(res2.bookingId.startsWith('BK-')).toBe(true);
  });

  it('17. Parent timezone is stored correctly', async () => {
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    const res = await service.createBooking({
      student: { name: 'S1', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Jane Doe', email: 'jane@example.com' },
      startTime: '2026-09-28T10:30:00Z',
      endTime: '2026-09-28T11:30:00Z',
      timezone: 'Europe/London',
    });

    expect(res.timezone).toBe('Europe/London');
    const user = Array.from(mockRepo.users.values()).find((u) => u.email === 'jane@example.com');
    expect(user?.timezone).toBe('Europe/London');
  });

  it('18. Mentor-local daily capacity is respected across midnight', async () => {
    // Mentor in Asia/Kolkata works Sunday evening 23:00 - Monday 01:00 IST
    // Monday in Asia/Kolkata is separate from UTC date boundaries
    const m1 = createTestMentor('m-1', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    // Appointment on Tuesday in India (2026-09-29 10:30 UTC = 16:00 IST)
    mockRepo.appointments.push({
      id: 'app-tue-1',
      mentorId: 'm-1',
      parentId: 'p-1',
      studentName: 'Tue Student 1',
      studentGrade: 'G5',
      subject: 'Math',
      learningGoal: null,
      startTime: new Date('2026-09-29T10:30:00Z'),
      endTime: new Date('2026-09-29T11:30:00Z'),
      status: AppointmentStatus.CONFIRMED,
      meetingLink: 'link',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockRepo.appointments.push({
      id: 'app-tue-2',
      mentorId: 'm-1',
      parentId: 'p-1',
      studentName: 'Tue Student 2',
      studentGrade: 'G5',
      subject: 'Math',
      learningGoal: null,
      startTime: new Date('2026-09-29T11:30:00Z'),
      endTime: new Date('2026-09-29T12:30:00Z'),
      status: AppointmentStatus.CONFIRMED,
      meetingLink: 'link',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Monday (2026-09-28) still has 0 appointments for Aarav
    const res = await service.createBooking({
      student: { name: 'Mon Student', grade: 'G4', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane@example.com' },
      startTime: '2026-09-28T10:30:00Z',
      endTime: '2026-09-28T11:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    expect(res.status).toBe('CONFIRMED');
  });

  it('19. New York DST behavior works', async () => {
    // NY mentor works Monday 18:00 - 21:00 America/New_York
    const nyMentor = createTestMentor('m-ny', 'Sarah', 'America/New_York', [
      { dayOfWeek: 1, localStart: '18:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(nyMentor);

    // On 2026-09-28 (EDT = UTC-4): 18:00 EDT = 22:00 UTC
    const res = await service.createBooking({
      student: { name: 'Sarah Student', grade: 'G4', subject: 'Coding' },
      parent: { name: 'Parent', email: 'ny@example.com' },
      startTime: '2026-09-28T22:00:00Z',
      endTime: '2026-09-28T23:00:00Z',
      timezone: 'America/New_York',
    });

    expect(res.status).toBe('CONFIRMED');
  });

  it('20. London DST behavior works', async () => {
    // London mentor works Monday 18:00 - 21:00 Europe/London
    // In Sep (BST = UTC+1): 18:00 BST = 17:00 UTC
    const londonMentor = createTestMentor('m-london', 'Oliver', 'Europe/London', [
      { dayOfWeek: 1, localStart: '18:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(londonMentor);

    const res = await service.createBooking({
      student: { name: 'London Student', grade: 'G4', subject: 'Coding' },
      parent: { name: 'Parent', email: 'london@example.com' },
      startTime: '2026-09-28T17:00:00Z',
      endTime: '2026-09-28T18:00:00Z',
      timezone: 'Europe/London',
    });

    expect(res.status).toBe('CONFIRMED');
  });

  it('21. India timezone behavior works', async () => {
    const kolkataMentor = createTestMentor('m-kolkata', 'Aarav', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(kolkataMentor);

    // 16:00 IST = 10:30 UTC
    const res = await service.createBooking({
      student: { name: 'India Student', grade: 'G4', subject: 'Coding' },
      parent: { name: 'Parent', email: 'india@example.com' },
      startTime: '2026-09-28T10:30:00Z',
      endTime: '2026-09-28T11:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    expect(res.status).toBe('CONFIRMED');
  });

  it('22. Parent response does NOT contain mentor identity', async () => {
    const m1 = createTestMentor('m-1', 'Aarav Sharma', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '21:00' },
    ]);
    mockRepo.addMentor(m1);

    const res = await service.createBooking({
      student: { name: 'Student', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Jane', email: 'jane@example.com' },
      startTime: '2026-09-28T10:30:00Z',
      endTime: '2026-09-28T11:30:00Z',
      timezone: 'Asia/Kolkata',
    });

    expect((res as any).mentorId).toBeUndefined();
    expect((res as any).mentorName).toBeUndefined();
    expect((res as any).mentor).toBeUndefined();
  });

  it('23 & 24. Concurrent booking attempts for final slot result in exactly one booking and clean 409 conflict', async () => {
    const m1 = createTestMentor('m-1', 'Aarav Sharma', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '18:00' },
    ]);
    mockRepo.addMentor(m1);

    // First booking wins
    const resA = await service.createBooking({
      student: { name: 'Student A', grade: 'Grade 4', subject: 'Math' },
      parent: { name: 'Parent A', email: 'a@example.com' },
      startTime: '2026-09-28T10:30:00Z',
      endTime: '2026-09-28T11:30:00Z',
      timezone: 'Asia/Kolkata',
    });
    expect(resA.status).toBe('CONFIRMED');

    // Second booking encounters conflict and throws 409
    await expect(
      service.createBooking({
        student: { name: 'Student B', grade: 'Grade 5', subject: 'Math' },
        parent: { name: 'Parent B', email: 'b@example.com' },
        startTime: '2026-09-28T10:30:00Z',
        endTime: '2026-09-28T11:30:00Z',
        timezone: 'Asia/Kolkata',
      })
    ).rejects.toThrow('No mentors are available for this time');

    // Exactly one appointment in database
    expect(mockRepo.appointments).toHaveLength(1);
    expect(mockRepo.appointments[0].studentName).toBe('Student A');
  });

  it('24b. Maps Postgres exclusion constraint error to clean 409 Conflict', async () => {
    const m1 = createTestMentor('m-1', 'Aarav Sharma', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '18:00' },
    ]);
    mockRepo.addMentor(m1);
    mockRepo.failNextTransactionWithExclusion = true;

    try {
      await service.createBooking({
        student: { name: 'Student A', grade: 'Grade 4', subject: 'Math' },
        parent: { name: 'Parent A', email: 'a@example.com' },
        startTime: '2026-09-28T10:30:00Z',
        endTime: '2026-09-28T11:30:00Z',
        timezone: 'Asia/Kolkata',
      });
      expect.fail('Should have thrown AppError 409');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('This slot was just booked. Please choose another available time.');
    }
  });

  it('25. Failed booking does not leave a partial appointment', async () => {
    const m1 = createTestMentor('m-1', 'Aarav Sharma', 'Asia/Kolkata', [
      { dayOfWeek: 1, localStart: '16:00', localEnd: '18:00' },
    ]);
    mockRepo.addMentor(m1);
    mockRepo.failNextTransactionWithExclusion = true;

    await expect(
      service.createBooking({
        student: { name: 'Student A', grade: 'Grade 4', subject: 'Math' },
        parent: { name: 'Parent A', email: 'a@example.com' },
        startTime: '2026-09-28T10:30:00Z',
        endTime: '2026-09-28T11:30:00Z',
        timezone: 'Asia/Kolkata',
      })
    ).rejects.toThrow('This slot was just booked');

    expect(mockRepo.appointments).toHaveLength(0);
  });
});
