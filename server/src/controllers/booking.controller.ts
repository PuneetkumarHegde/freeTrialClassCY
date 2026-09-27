import { Request, Response, NextFunction } from 'express';
import { createBookingSchema } from '../types/booking.types';
import { bookingService, BookingService } from '../services/booking.service';

export class BookingController {
  constructor(private service: BookingService = bookingService) {}

  /**
   * POST /api/bookings
   * Create a new confirmed trial appointment
   */
  createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Validate request payload using Zod
      const validatedInput = createBookingSchema.parse(req.body);

      // 2. Delegate to BookingService
      const result = await this.service.createBooking(validatedInput);

      // 3. Return successful response with 201 Created
      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const bookingController = new BookingController();
export const createBooking = bookingController.createBooking;
