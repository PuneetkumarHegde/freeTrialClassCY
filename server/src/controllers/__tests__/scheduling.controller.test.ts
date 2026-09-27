import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { getAvailableSlots, getSlotCapacity } from '../scheduling.controller';
import { schedulingService } from '../../services/scheduling.service';
import { Temporal } from '@js-temporal/polyfill';

vi.mock('../../services/scheduling.service', () => {
  return {
    schedulingService: {
      getAvailableSlotsForDate: vi.fn(),
      getSlotCapacity: vi.fn(),
    },
  };
});

describe('Scheduling Controller', () => {
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

  describe('getAvailableSlots', () => {
    it('returns 200 with generated slots for date and default timezone', async () => {
      mockReq = {
        query: {
          date: '2026-09-28',
        },
      };

      const mockData = {
        date: '2026-09-28',
        timezone: 'Asia/Kolkata',
        totalSlots: 5,
        availableSlotsCount: 5,
        slots: [],
      };
      (schedulingService.getAvailableSlotsForDate as any).mockResolvedValue(mockData);

      await getAvailableSlots(mockReq as Request, mockRes as Response, mockNext);

      expect(schedulingService.getAvailableSlotsForDate).toHaveBeenCalledWith(
        '2026-09-28',
        'Asia/Kolkata'
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: mockData,
      });
    });

    it('passes custom timezone parameter to scheduling service', async () => {
      mockReq = {
        query: {
          date: '2026-09-28',
          timezone: 'America/New_York',
        },
      };

      (schedulingService.getAvailableSlotsForDate as any).mockResolvedValue({
        date: '2026-09-28',
        timezone: 'America/New_York',
        totalSlots: 0,
        availableSlotsCount: 0,
        slots: [],
      });

      await getAvailableSlots(mockReq as Request, mockRes as Response, mockNext);

      expect(schedulingService.getAvailableSlotsForDate).toHaveBeenCalledWith(
        '2026-09-28',
        'America/New_York'
      );
    });

    it('calls next with error if service throws', async () => {
      mockReq = {
        query: { date: 'invalid' },
      };
      const error = new Error('Service error');
      (schedulingService.getAvailableSlotsForDate as any).mockRejectedValue(error);

      await getAvailableSlots(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getSlotCapacity', () => {
    it('returns capacity and sanitizes internal mentor IDs/names from public response', async () => {
      mockReq = {
        query: {
          startTime: '2026-09-28T12:30:00Z',
          timezone: 'Asia/Kolkata',
        },
      };

      (schedulingService.getSlotCapacity as any).mockResolvedValue({
        requestedUtc: {
          start: '2026-09-28T12:30:00Z',
          end: '2026-09-28T13:30:00Z',
        },
        status: 'AVAILABLE',
        availableMentorsCount: 4,
        totalActiveMentors: 10,
        isAvailable: true,
        message: '4 mentors are available',
        localTime: {
          timezone: 'Asia/Kolkata',
          date: '2026-09-28',
          start: '18:00',
          end: '19:00',
        },
        // Internal fields that MUST NOT leak to parents
        eligibleMentorIds: ['mentor-1', 'mentor-2'],
        eligibleMentors: [
          { id: 'mentor-1', name: 'Aarav Sharma', timezone: 'Asia/Kolkata' },
          { id: 'mentor-2', name: 'Priya Nair', timezone: 'Asia/Kolkata' },
        ],
      });

      await getSlotCapacity(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(200);
      const responseData = jsonMock.mock.calls[0][0].data;

      expect(responseData.status).toBe('AVAILABLE');
      expect(responseData.availableMentorsCount).toBe(4);
      expect(responseData.isAvailable).toBe(true);
      expect(responseData.eligibleMentorIds).toBeUndefined();
      expect(responseData.eligibleMentors).toBeUndefined();
    });

    it('supports date and time query parameters', async () => {
      mockReq = {
        query: {
          date: '2026-09-28',
          time: '18:00',
          timezone: 'Asia/Kolkata',
        },
      };

      (schedulingService.getSlotCapacity as any).mockResolvedValue({
        requestedUtc: {
          start: '2026-09-28T12:30:00Z',
          end: '2026-09-28T13:30:00Z',
        },
        status: 'AVAILABLE',
        availableMentorsCount: 4,
        totalActiveMentors: 10,
        isAvailable: true,
        message: '4 mentors available',
      });

      await getSlotCapacity(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(schedulingService.getSlotCapacity).toHaveBeenCalled();
    });

    it('returns error when startTime is invalid ISO string', async () => {
      mockReq = {
        query: {
          startTime: 'not-an-iso',
        },
      };

      await getSlotCapacity(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid startTime'),
          statusCode: 400,
        })
      );
    });

    it('returns error when required parameters are missing', async () => {
      mockReq = {
        query: {},
      };

      await getSlotCapacity(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Missing required parameters'),
          statusCode: 400,
        })
      );
    });
  });
});
