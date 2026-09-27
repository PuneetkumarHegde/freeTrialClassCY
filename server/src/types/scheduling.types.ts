export type SlotAvailabilityStatus = 'AVAILABLE' | 'LIMITED' | 'FULL';

export interface SlotAvailability {
  start: string;              // ISO UTC string e.g. "2026-09-28T10:30:00Z"
  end: string;                // ISO UTC string e.g. "2026-09-28T11:30:00Z"
  startTime: string;          // ISO UTC string (alias)
  endTime: string;            // ISO UTC string (alias)
  localDate: string;          // e.g. "2026-09-28" in requested timezone
  localStart: string;         // e.g. "16:00" in requested timezone
  localEnd: string;           // e.g. "17:00" in requested timezone
  localFormatted: string;     // e.g. "16:00 - 17:00"
  status: SlotAvailabilityStatus;
  availableMentors: number;
  remainingCapacity: number;  // alias for availableMentors
}

export interface DateSlotsResult {
  date: string;
  timezone: string;
  totalSlots: number;
  availableSlotsCount: number;
  slots: SlotAvailability[];
}

export interface SlotCapacityResult {
  requestedUtc: {
    start: string;
    end: string;
  };
  status: SlotAvailabilityStatus;
  availableMentorsCount: number;
  totalActiveMentors: number;
  isAvailable: boolean;
  message: string;
  localTime?: {
    timezone: string;
    date: string;
    start: string;
    end: string;
  };
}

export interface InternalSlotCapacityResult extends SlotCapacityResult {
  eligibleMentorIds: string[];
  eligibleMentors: Array<{
    id: string;
    name: string;
    timezone: string;
  }>;
}
