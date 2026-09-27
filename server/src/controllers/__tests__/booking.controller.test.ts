import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { createBooking } from '../booking.controller';
import { bookingService } from '../../services/booking.service';

vi.mock('../../services/booking.service', () => {
  return {
    bookingService: {
      createBooking: vi.fn(),
    },
  };
});

describe('Booking Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock as unknown as Response['status'],
      json: jsonMock as unknown as Response['json'],
    };
    mockNext = vi.fn();
  });

  it('returns 201 with booking confirmation for valid payload', async () => {
    mockReq = {
      body: {
        student: {
          name: 'Leo Parker',
          grade: 'Grade 5',
          subject: 'Scratch Coding',
          learningGoal: 'Animation',
        },
        parent: {
          name: 'Jane Parker',
          email: 'jane@example.com',
          phone: '+1234567890',
        },
        startTime: '2026-09-28T12:30:00Z',
        endTime: '2026-09-28T13:30:00Z',
        timezone: 'America/New_York',
      },
    };

    const mockResponseData = {
      bookingId: 'BK-TEST1234',
      appointmentId: 'uuid-123',
      status: 'CONFIRMED' as const,
      student: {
        name: 'Leo Parker',
        grade: 'Grade 5',
        subject: 'Scratch Coding',
        learningGoal: 'Animation',
      },
      parent: {
        name: 'Jane Parker',
        email: 'jane@example.com',
        phone: '+1234567890',
      },
      startTime: '2026-09-28T12:30:00Z',
      endTime: '2026-09-28T13:30:00Z',
      timezone: 'America/New_York',
      meetingLink: 'https://demo.codeyoung.com/class/BK-TEST1234',
      createdAt: '2026-09-25T12:00:00.000Z',
    };

    (bookingService.createBooking as any).mockResolvedValue(mockResponseData);

    await createBooking(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 'success',
      data: mockResponseData,
    });
  });

  it('rejects payload with missing parent email or student name with 400 validation error', async () => {
    mockReq = {
      body: {
        student: {
          name: '',
          grade: 'Grade 5',
          subject: 'Math',
        },
        parent: {
          name: 'Jane',
          email: 'invalid-email',
        },
        startTime: '2026-09-28T12:30:00Z',
        endTime: '2026-09-28T13:30:00Z',
        timezone: 'Asia/Kolkata',
      },
    };

    await createBooking(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ZodError',
      })
    );
  });

  it('rejects non-60-minute duration with 400 validation error', async () => {
    mockReq = {
      body: {
        student: {
          name: 'Leo',
          grade: 'Grade 5',
          subject: 'Math',
        },
        parent: {
          name: 'Jane',
          email: 'jane@example.com',
        },
        startTime: '2026-09-28T12:30:00Z',
        endTime: '2026-09-28T13:00:00Z', // 30 min duration
        timezone: 'Asia/Kolkata',
      },
    };

    await createBooking(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ZodError',
      })
    );
  });
});
