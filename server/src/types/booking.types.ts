import { z } from 'zod';

export const createBookingSchema = z
  .object({
    student: z.object({
      name: z.string().trim().min(2, 'Student name must be at least 2 characters').max(100),
      grade: z.string().trim().min(1, 'Student grade is required').max(50),
      subject: z.string().trim().min(1, 'Subject is required').max(100),
      learningGoal: z.string().trim().max(500).optional().nullable(),
    }),
    parent: z.object({
      name: z.string().trim().min(2, 'Parent name must be at least 2 characters').max(100),
      email: z
        .string()
        .trim()
        .toLowerCase()
        .email('Invalid parent email address'),
      phone: z.string().trim().max(30).optional().nullable(),
    }),
    startTime: z.string().datetime({ message: 'startTime must be a valid ISO 8601 timestamp' }),
    endTime: z.string().datetime({ message: 'endTime must be a valid ISO 8601 timestamp' }).optional(),
    timezone: z.string().min(1, 'Timezone is required').refine(
      (tz) => {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Invalid IANA timezone identifier' }
    ),
  })
  .refine(
    (data) => {
      const startMs = new Date(data.startTime).getTime();
      const endMs = data.endTime ? new Date(data.endTime).getTime() : startMs + 60 * 60 * 1000;
      return endMs > startMs;
    },
    { message: 'End time must be strictly after start time', path: ['endTime'] }
  )
  .refine(
    (data) => {
      const startMs = new Date(data.startTime).getTime();
      const endMs = data.endTime ? new Date(data.endTime).getTime() : startMs + 60 * 60 * 1000;
      const durationMinutes = (endMs - startMs) / (1000 * 60);
      return Math.abs(durationMinutes - 60) < 0.001;
    },
    { message: 'Trial class duration must be exactly 60 minutes', path: ['endTime'] }
  );

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export interface BookingResponseData {
  bookingId: string;
  appointmentId: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
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
