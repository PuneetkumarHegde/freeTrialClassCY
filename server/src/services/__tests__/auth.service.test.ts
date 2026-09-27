import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { authService } from '../auth.service';
import { config } from '../../lib/env';
import { Role } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';

describe('AuthService', () => {
  const testParentEmail = 'test.auth.parent@example.com';
  const testMentorEmail = 'test.auth.mentor@example.com';
  const testAdminEmail = 'test.auth.admin@example.com';
  const testPassword = 'Password@123';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testPassword, 10);

    // Clean up
    await prisma.appointment.deleteMany({
      where: {
        OR: [
          { parent: { email: testParentEmail } },
          { studentName: { startsWith: 'AuthTest' } },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: { in: [testParentEmail, testMentorEmail, testAdminEmail] },
      },
    });

    // Create test Parent
    await prisma.user.create({
      data: {
        fullName: 'Test Parent',
        email: testParentEmail,
        passwordHash,
        role: Role.PARENT,
        timezone: 'America/New_York',
      },
    });

    // Create test Mentor
    const mentorUser = await prisma.user.create({
      data: {
        fullName: 'Test Mentor',
        email: testMentorEmail,
        passwordHash,
        role: Role.MENTOR,
        timezone: 'Asia/Kolkata',
      },
    });

    await prisma.mentor.create({
      data: {
        userId: mentorUser.id,
        timezone: 'Asia/Kolkata',
        isActive: true,
      },
    });

    // Create test Admin
    await prisma.user.create({
      data: {
        fullName: 'Test Admin',
        email: testAdminEmail,
        passwordHash,
        role: Role.ADMIN,
        timezone: 'Asia/Kolkata',
      },
    });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: {
        OR: [
          { parent: { email: testParentEmail } },
          { studentName: { startsWith: 'AuthTest' } },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [testParentEmail, testMentorEmail, testAdminEmail] },
      },
    });
  });

  it('1. Valid login succeeds and returns signed JWT with safe user info', async () => {
    const result = await authService.login({
      email: testParentEmail,
      password: testPassword,
    });

    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(testParentEmail);
    expect(result.user.role).toBe(Role.PARENT);
    expect((result.user as any).passwordHash).toBeUndefined();

    // Verify token with JWT secret
    const decoded: any = jwt.verify(result.token, config.jwtSecret);
    expect(decoded.userId).toBe(result.user.id);
    expect(decoded.email).toBe(testParentEmail);
    expect(decoded.role).toBe(Role.PARENT);
  });

  it('2. Wrong password returns 401', async () => {
    await expect(
      authService.login({
        email: testParentEmail,
        password: 'WrongPassword123!',
      })
    ).rejects.toThrow('Invalid email or password.');
  });

  it('3. Unknown email returns 401', async () => {
    await expect(
      authService.login({
        email: 'nonexistent@example.com',
        password: testPassword,
      })
    ).rejects.toThrow('Invalid email or password.');
  });

  it('4. User without passwordHash cannot login via password', async () => {
    const unhashedUser = await prisma.user.create({
      data: {
        fullName: 'Passwordless Parent',
        email: 'unhashed@example.com',
        passwordHash: null,
        role: Role.PARENT,
      },
    });

    await expect(
      authService.login({
        email: 'unhashed@example.com',
        password: 'AnyPassword',
      })
    ).rejects.toThrow('Invalid email or password.');

    await prisma.user.delete({ where: { id: unhashedUser.id } });
  });

  it('5. getMe returns authenticated user safe profile', async () => {
    const loginRes = await authService.login({
      email: testAdminEmail,
      password: testPassword,
    });

    const me = await authService.getMe(loginRes.user.id);
    expect(me.id).toBe(loginRes.user.id);
    expect(me.email).toBe(testAdminEmail);
    expect(me.role).toBe(Role.ADMIN);
    expect((me as any).passwordHash).toBeUndefined();
  });
});
