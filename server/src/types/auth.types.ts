import { z } from 'zod';
import { Role, AppointmentStatus } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface JwtTokenPayload {
  userId: string;
  email: string;
  role: Role;
  fullName: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  timezone: string;
}

export interface LoginResponseData {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: Role;
    timezone: string;
  };
}

export const appointmentIdParamSchema = z.object({
  id: z.string().uuid('Invalid appointment ID format'),
});

export const adminAppointmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

export type AdminAppointmentsQuery = z.infer<typeof adminAppointmentsQuerySchema>;
