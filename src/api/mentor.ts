import { getStoredToken } from './auth';

export interface MentorUnavailabilityItem {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface MentorProfile {
  mentorId: string;
  userId: string;
  fullName: string;
  email: string;
  timezone: string;
  isActive: boolean;
  dailyCapacity?: {
    totalLimit: number;
    todayCount: number;
    remainingSlots: number;
    isLimitReached: boolean;
  };
  availability: Array<{
    id: string;
    dayOfWeek: number;
    localStart: string;
    localEnd: string;
  }>;
  unavailabilities?: MentorUnavailabilityItem[];
}

export interface MentorDailyCapacity {
  totalLimit: number;
  todayCount: number;
  remainingSlots: number;
  isLimitReached: boolean;
  mentorTimezone?: string;
}

export interface MentorAppointment {
  appointmentId: string;
  bookingId: string;
  studentName: string;
  studentGrade: string;
  subject: string;
  learningGoal?: string | null;
  parentName: string;
  parentEmail?: string;
  parentTimezone?: string;
  startTime: string;
  endTime: string;
  mentorTimezone: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  meetingLink?: string | null;
  attendance?: {
    id: string;
    status: 'SCHEDULED' | 'JOINED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
    joinedAt: string | null;
    completedAt: string | null;
    mentorNotes?: string | null;
  } | null;
  createdAt: string;
}

export interface MentorScheduleSlot {
  localStart: string;
  localEnd: string;
  startTimeIso: string;
  endTimeIso: string;
  status: 'AVAILABLE' | 'SCHEDULED' | 'UNAVAILABLE' | 'LIMIT_REACHED' | 'OUTSIDE_HOURS';
  appointment?: {
    id: string;
    studentName: string;
    studentGrade: string;
    subject: string;
    learningGoal: string | null;
    parentName: string;
    status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    meetingLink: string | null;
  };
}

export interface MentorScheduleResponse {
  mentor: {
    id: string;
    fullName: string;
    email: string;
    timezone: string;
    isActive: boolean;
  };
  date: string;
  dailyCapacity: MentorDailyCapacity;
  timeSlots: MentorScheduleSlot[];
  unavailabilities?: MentorUnavailabilityItem[];
  appointments: MentorAppointment[];
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchMentorProfile(): Promise<MentorProfile> {
  const res = await fetch('/api/mentor/profile', {
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') {
    throw new Error(json.message || 'Failed to fetch mentor profile');
  }
  return json.data;
}

export async function addMentorUnavailability(data: {
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<any> {
  const res = await fetch('/api/mentor/unavailability', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') {
    throw new Error(json.message || 'Failed to add unavailability exception');
  }
  return json.data;
}

export async function deleteMentorUnavailability(unavailabilityId: string): Promise<any> {
  const res = await fetch(`/api/mentor/unavailability/${unavailabilityId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') {
    throw new Error(json.message || 'Failed to delete unavailability exception');
  }
  return json.data;
}

export async function fetchMentorSchedule(date?: string): Promise<MentorScheduleResponse> {
  const url = date ? `/api/mentor/schedule?date=${encodeURIComponent(date)}` : '/api/mentor/schedule';
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') {
    throw new Error(json.message || 'Failed to fetch mentor schedule');
  }
  return json.data;
}

export async function fetchMentorAppointments(): Promise<{
  dailyCapacity: MentorDailyCapacity;
  appointments: MentorAppointment[];
}> {
  const res = await fetch('/api/mentor/appointments', {
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') {
    throw new Error(json.message || 'Failed to fetch mentor appointments');
  }
  return json.data;
}

export async function fetchMentorAppointmentById(id: string): Promise<MentorAppointment> {
  const res = await fetch(`/api/mentor/appointments/${id}`, {
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') {
    throw new Error(json.message || 'Failed to fetch appointment details');
  }
  return json.data;
}

export async function recordClassJoin(id: string): Promise<any> {
  const res = await fetch(`/api/mentor/appointments/${id}/join`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') {
    throw new Error(json.message || 'Failed to record class join');
  }
  return json.data;
}

export async function completeAppointment(id: string, mentorNotes?: string): Promise<any> {
  const res = await fetch(`/api/mentor/appointments/${id}/complete`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ mentorNotes }),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') {
    throw new Error(json.message || 'Failed to complete appointment');
  }
  return json.data;
}
