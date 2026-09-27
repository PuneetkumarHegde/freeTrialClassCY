import { Temporal } from '@js-temporal/polyfill';

export type SlotAvailabilityStatus = 'AVAILABLE' | 'LIMITED' | 'FULL';

export interface SlotAvailability {
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  localFormatted: string;
  status: SlotAvailabilityStatus;
  availableMentors: number;
  remainingCapacity: number;
}

export interface DateSlotsResponse {
  date: string;
  timezone: string;
  totalSlots: number;
  availableSlotsCount: number;
  slots: SlotAvailability[];
}

export interface SelectedSlotData {
  startTime: string;
  endTime: string;
  timezone: string;
  formattedTime: string;
}

/**
 * Format UTC ISO timestamps into a localized slot range string (HH:MM - HH:MM)
 * using the parent's IANA timezone and Temporal.
 */
export function formatSlotRange(
  startTimeIso: string,
  endTimeIso: string,
  timezone: string
): string {
  try {
    const startInstant = Temporal.Instant.from(startTimeIso);
    const endInstant = Temporal.Instant.from(endTimeIso);
    const startZdt = startInstant.toZonedDateTimeISO(timezone);
    const endZdt = endInstant.toZonedDateTimeISO(timezone);

    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${pad(startZdt.hour)}:${pad(startZdt.minute)}`;
    const endStr = `${pad(endZdt.hour)}:${pad(endZdt.minute)}`;
    return `${startStr} - ${endStr}`;
  } catch {
    // If timezone is invalid or still being typed, fallback safely
    return `${startTimeIso.substring(11, 16)} - ${endTimeIso.substring(11, 16)}`;
  }
}

/**
 * Fetch available trial slots for a given date and timezone from the backend API.
 */
export async function fetchAvailableSlots(
  date: string,
  timezone: string
): Promise<DateSlotsResponse> {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const url = `${baseUrl}/api/scheduling/slots?date=${encodeURIComponent(
    date
  )}&timezone=${encodeURIComponent(timezone)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error("We couldn't load trial times right now. Please try again.");
    }

    const payload = await res.json();
    if (payload.status !== 'success' || !payload.data) {
      throw new Error(payload.message || "We couldn't load trial times right now. Please try again.");
    }

    return payload.data as DateSlotsResponse;
  } catch (error) {
    if (error instanceof Error && error.message.includes("We couldn't load")) {
      throw error;
    }
    throw new Error("We couldn't load trial times right now. Please try again.");
  }
}
