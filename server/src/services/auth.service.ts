import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../lib/env';
import { AppError } from '../middleware/errorHandler';
import { LoginInput, LoginResponseData, AuthUser, JwtTokenPayload } from '../types/auth.types';

export class AuthService {
  /**
   * Authenticate user with email and password, returning signed JWT
   */
  async login(input: LoginInput): Promise<LoginResponseData> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const payload: JwtTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        timezone: user.timezone,
      },
    };
  }

  /**
   * Return authenticated user's safe profile
   */
  async getMe(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        timezone: true,
      },
    });

    if (!user) {
      throw new AppError('User profile not found.', 404);
    }

    return user;
  }
}

export const authService = new AuthService();
