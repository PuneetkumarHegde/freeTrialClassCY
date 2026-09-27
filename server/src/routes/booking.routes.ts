import { Router } from 'express';
import { createBooking } from '../controllers/booking.controller';

export const bookingRouter = Router();

// POST /api/bookings - Book a 60-minute free trial class
bookingRouter.post('/bookings', createBooking);
