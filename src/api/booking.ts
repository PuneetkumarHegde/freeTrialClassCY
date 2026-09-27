export interface CreateBookingPayload {
  student: {
    name: string;
    grade: string;
    subject: string;
    learningGoal?: string;
  };
  parent: {
    name: string;
    email: string;
    phone?: string;
  };
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface ConfirmedBookingData {
  bookingId: string;
  appointmentId: string;
  status: string;
  student: {
    name: string;
    grade: string;
    subject: string;
    learningGoal?: string | null;
  };
  parent: {
    name: string;
    email: string;
    phone?: string | null;
  };
  startTime: string;
  endTime: string;
  timezone: string;
  meetingLink: string;
  createdAt: string;
}

/**
 * Submit free trial booking request to POST /api/bookings
 */
export async function createBooking(
  payload: CreateBookingPayload
): Promise<ConfirmedBookingData> {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const response = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();

  if (!response.ok) {
    const errorMsg =
      json?.message ||
      'Failed to confirm your free trial booking. Please select another slot and try again.';
    throw new Error(errorMsg);
  }

  if (json.status !== 'success' || !json.data) {
    throw new Error(
      json?.message || 'Invalid booking response received from the server.'
    );
  }

  return json.data as ConfirmedBookingData;
}
