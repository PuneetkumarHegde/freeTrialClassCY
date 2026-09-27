export interface MentorAvailabilityRule {
  id: string;
  mentorId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  localStart: string; // "HH:mm" e.g. "16:00"
  localEnd: string;   // "HH:mm" e.g. "21:00"
}

export interface MentorUnavailabilityRule {
  id: string;
  mentorId: string;
  startDate: Date;
  endDate: Date;
  reason?: string | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface MentorWithUser {
  id: string;
  userId: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    timezone: string;
  };
  availability: MentorAvailabilityRule[];
  unavailabilities?: MentorUnavailabilityRule[];
}

export interface MentorAvailabilityCheckResult {
  available: boolean;
  mentorId: string;
  mentorName: string;
  mentorTimezone: string;
  requestedUtc: {
    start: string;
    end: string;
  };
  mentorLocal: {
    localDate: string; // "YYYY-MM-DD"
    dayOfWeek: string; // e.g. "Monday"
    dayOfWeekNumber: number; // 0-6
    start: string;     // "HH:mm"
    end: string;       // "HH:mm"
  };
  matchingSchedule?: {
    dayOfWeek: string;
    localStart: string;
    localEnd: string;
  };
  reason?: string;
}
