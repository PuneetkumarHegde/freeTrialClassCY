import { getStoredToken } from './auth';

export interface MentorUnavailabilityItem {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface AdminMentorItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  timezone: string;
  isActive: boolean;
  activeAppointmentsCount: number;
  todayAppointmentsCount: number;
  dailyLimit: number;
  remainingTodayCapacity: number;
  isDailyLimitReached: boolean;
  availability: Array<{
    id: string;
    dayOfWeek: number;
    localStart: string;
    localEnd: string;
  }>;
  unavailabilities: MentorUnavailabilityItem[];
}

export interface AdminDashboardSummary {
  activeMentorsCount: number;
  totalAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  todayAppointmentsCount: number;
  totalDailyCapacity: number;
  remainingTodayCapacity: number;
  completedTrialsActualCount: number;
  unreadNotificationsCount: number;
}

export interface AdminAppointmentItem {
  id: string;
  bookingId: string;
  studentName: string;
  studentGrade: string;
  subject: string;
  learningGoal?: string | null;
  startTime: string;
  endTime: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  meetingLink?: string | null;
  createdAt: string;
  parent: {
    id: string;
    name: string;
    email: string;
    timezone?: string;
  };
  mentor: {
    id: string;
    name: string;
    email: string;
    timezone?: string;
  };
  attendance?: {
    id: string;
    status: 'SCHEDULED' | 'JOINED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
    joinedAt: string | null;
    completedAt: string | null;
    mentorNotes?: string | null;
  } | null;
}

export interface CompletedTrialItem {
  attendanceId: string;
  appointmentId: string;
  bookingId: string;
  studentName: string;
  studentGrade: string;
  subject: string;
  learningGoal?: string | null;
  startTime: string;
  endTime: string;
  status: 'COMPLETED';
  joinedAt: string | null;
  completedAt: string | null;
  mentorNotes?: string | null;
  parent: {
    id: string;
    name: string;
    email: string;
  };
  mentor: {
    id: string;
    name: string;
    email: string;
    timezone: string;
  };
}

export interface EmailLogItem {
  id: string;
  appointmentId: string | null;
  recipientEmail: string;
  recipientType: 'PARENT' | 'MENTOR' | 'ADMIN';
  subject: string;
  status: 'QUEUED' | 'SENT' | 'FAILED' | 'NOT_DELIVERED';
  providerMessageId: string | null;
  errorMessage: string | null;
  emailContent: string | null;
  sentAt: string | null;
  createdAt: string;
  studentName?: string | null;
  subjectName?: string | null;
}

export interface NotificationItem {
  id: string;
  type: 'NEW_TRIAL_BOOKING' | 'TRIAL_COMPLETED' | 'TRIAL_CANCELLED' | 'EMAIL_FAILED';
  title: string;
  message: string;
  appointmentId: string | null;
  readAt: string | null;
  isRead: boolean;
  createdAt: string;
  appointment?: {
    id: string;
    studentName: string;
    subject: string;
    status: string;
  } | null;
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchAdminDashboard(): Promise<AdminDashboardSummary> {
  const res = await fetch('/api/admin/dashboard', { headers: getAuthHeaders() });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to fetch admin dashboard');
  return json.data;
}

export async function fetchAdminMentors(): Promise<AdminMentorItem[]> {
  const res = await fetch('/api/admin/mentors', { headers: getAuthHeaders() });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to fetch mentors');
  return json.data;
}

export async function terminateAdminMentor(mentorId: string): Promise<any> {
  const res = await fetch(`/api/admin/mentors/${mentorId}/terminate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to terminate mentor');
  return json.data;
}

export async function reactivateAdminMentor(mentorId: string): Promise<any> {
  const res = await fetch(`/api/admin/mentors/${mentorId}/reactivate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to reactivate mentor');
  return json.data;
}

export async function addAdminMentorUnavailability(
  mentorId: string,
  data: { startDate: string; endDate: string; reason?: string }
): Promise<any> {
  const res = await fetch(`/api/admin/mentors/${mentorId}/unavailability`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to add unavailability');
  return json.data;
}

export async function approveAdminMentorUnavailability(
  unavailabilityId: string
): Promise<any> {
  const res = await fetch(`/api/admin/unavailability/${unavailabilityId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to approve unavailability');
  return json.data;
}

export async function rejectAdminMentorUnavailability(
  unavailabilityId: string
): Promise<any> {
  const res = await fetch(`/api/admin/unavailability/${unavailabilityId}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to reject unavailability');
  return json.data;
}

export async function deleteAdminMentorUnavailability(
  mentorId: string,
  unavailabilityId: string
): Promise<any> {
  const res = await fetch(`/api/admin/mentors/${mentorId}/unavailability/${unavailabilityId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to delete unavailability');
  return json.data;
}

export async function updateAdminMentorAvailability(
  mentorId: string,
  availabilities: Array<{ dayOfWeek: number; localStart: string; localEnd: string }>
): Promise<any> {
  const res = await fetch(`/api/admin/mentors/${mentorId}/availability`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ availabilities }),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to update availability');
  return json.data;
}

export async function createAdminMentor(data: {
  fullName: string;
  email: string;
  password?: string;
  timezone?: string;
  isActive?: boolean;
}): Promise<any> {
  const res = await fetch('/api/admin/mentors', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to create mentor');
  return json.data;
}

export async function fetchAdminMentorDashboard(mentorId: string, date?: string): Promise<any> {
  const url = date ? `/api/admin/mentors/${mentorId}?date=${encodeURIComponent(date)}` : `/api/admin/mentors/${mentorId}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to fetch mentor dashboard');
  return json.data;
}

export async function fetchAdminAppointments(params?: {
  page?: number;
  limit?: number;
  status?: string;
  date?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  pagination: { page: number; limit: number; total: number; totalPages: number };
  items: AdminAppointmentItem[];
}> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.status) q.set('status', params.status);
  if (params?.date) q.set('date', params.date);
  if (params?.sortOrder) q.set('sortOrder', params.sortOrder);

  const res = await fetch(`/api/admin/appointments?${q.toString()}`, { headers: getAuthHeaders() });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to fetch appointments');
  return json.data;
}

export async function fetchCompletedTrials(params?: {
  page?: number;
  limit?: number;
  mentorId?: string;
}): Promise<{
  pagination: { page: number; limit: number; total: number; totalPages: number };
  items: CompletedTrialItem[];
}> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.mentorId) q.set('mentorId', params.mentorId);

  const res = await fetch(`/api/admin/completed-trials?${q.toString()}`, { headers: getAuthHeaders() });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to fetch completed trials');
  return json.data;
}

export async function fetchEmailLogs(status?: string): Promise<EmailLogItem[]> {
  const url = status ? `/api/admin/email-logs?status=${encodeURIComponent(status)}` : '/api/admin/email-logs';
  const res = await fetch(url, { headers: getAuthHeaders() });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to fetch email logs');
  return json.data;
}

export async function fetchNotifications(): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  const res = await fetch('/api/admin/notifications', { headers: getAuthHeaders() });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to fetch notifications');
  return json.data;
}

export async function markNotificationAsRead(id: string): Promise<any> {
  const res = await fetch(`/api/admin/notifications/${id}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to mark notification as read');
  return json.data;
}

export async function markAllNotificationsAsRead(): Promise<any> {
  const res = await fetch('/api/admin/notifications/read-all', {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to mark all notifications as read');
  return json.data;
}

export async function cancelAdminAppointment(id: string): Promise<any> {
  const res = await fetch(`/api/admin/appointments/${id}/cancel`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to cancel appointment');
  return json.data;
}
