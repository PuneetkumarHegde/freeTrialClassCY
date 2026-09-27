import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../lib/env';
import { prisma } from '../lib/prisma';
import { AppError } from './errorHandler';
import { JwtTokenPayload, AuthUser } from '../types/auth.types';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required: Missing or malformed authorization header', 401);
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      throw new AppError('Authentication required: Token not provided', 401);
    }

    let payload: JwtTokenPayload;
    try {
      payload = jwt.verify(token, config.jwtSecret) as JwtTokenPayload;
    } catch (jwtErr: any) {
      if (jwtErr.name === 'TokenExpiredError') {
        throw new AppError('Session expired. Please log in again.', 401);
      }
      throw new AppError('Invalid authentication token.', 401);
    }

    if (!payload.userId) {
      throw new AppError('Invalid authentication token.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        timezone: true,
      },
    });

    if (!user) {
      throw new AppError('User account not found or deactivated.', 401);
    }

    req.user = user as AuthUser;
    next();
  } catch (error) {
    next(error);
  }
}
