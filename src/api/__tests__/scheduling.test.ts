import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatSlotRange, fetchAvailableSlots } from '../scheduling';

describe('formatSlotRange', () => {
  it('formats slot range in America/New_York correctly with Temporal', () => {
    // 12:30 UTC in America/New_York (EDT, UTC-4) is 08:30
    const start = '2026-09-28T12:30:00Z';
    const end = '2026-09-28T13:30:00Z';
    const formatted = formatSlotRange(start, end, 'America/New_York');
    expect(formatted).toBe('08:30 - 09:30');
  });

  it('formats slot range in Asia/Kolkata correctly', () => {
    // 12:30 UTC in Asia/Kolkata (IST, UTC+5:30) is 18:00
    const start = '2026-09-28T12:30:00Z';
    const end = '2026-09-28T13:30:00Z';
    const formatted = formatSlotRange(start, end, 'Asia/Kolkata');
    expect(formatted).toBe('18:00 - 19:00');
  });

  it('formats slot range in Europe/London correctly', () => {
    // 12:30 UTC in Europe/London on Sept 28 (BST, UTC+1) is 13:30
    const start = '2026-09-28T12:30:00Z';
    const end = '2026-09-28T13:30:00Z';
    const formatted = formatSlotRange(start, end, 'Europe/London');
    expect(formatted).toBe('13:30 - 14:30');
  });

  it('handles invalid timezone gracefully without throwing', () => {
    const start = '2026-09-28T12:30:00Z';
    const end = '2026-09-28T13:30:00Z';
    const formatted = formatSlotRange(start, end, 'Invalid/Timezone_Name');
    expect(formatted).toBe('12:30 - 13:30');
  });
});

describe('fetchAvailableSlots', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches slots from backend API with correct query parameters', async () => {
    const mockData = {
      date: '2026-09-28',
      timezone: 'America/New_York',
      totalSlots: 2,
      availableSlotsCount: 2,
      slots: [
        {
          start: '2026-09-28T12:30:00Z',
          end: '2026-09-28T13:30:00Z',
          startTime: '2026-09-28T12:30:00Z',
          endTime: '2026-09-28T13:30:00Z',
          localDate: '2026-09-28',
          localStart: '08:30',
          localEnd: '09:30',
          localFormatted: '08:30 - 09:30',
          status: 'AVAILABLE',
          availableMentors: 5,
          remainingCapacity: 5,
        },
      ],
    };

    let requestedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      requestedUrl = url;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          data: mockData,
        }),
      });
    });

    const result = await fetchAvailableSlots('2026-09-28', 'America/New_York');
    expect(result.date).toBe('2026-09-28');
    expect(result.slots.length).toBe(1);
    expect(result.slots[0].status).toBe('AVAILABLE');
    expect(result.slots[0].availableMentors).toBe(5);
    expect(requestedUrl).toContain('/api/scheduling/slots?date=2026-09-28&timezone=America%2FNew_York');
  });

  it('throws friendly customer error when backend returns HTTP error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ status: 'error', message: 'Internal Server Error' }),
    });

    await expect(fetchAvailableSlots('2026-09-28', 'America/New_York')).rejects.toThrow(
      "We couldn't load trial times right now. Please try again."
    );
  });

  it('throws friendly customer error when fetch encounters a network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(fetchAvailableSlots('2026-09-28', 'America/New_York')).rejects.toThrow(
      "We couldn't load trial times right now. Please try again."
    );
  });
});
