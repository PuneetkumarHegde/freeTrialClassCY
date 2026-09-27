import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loginApi,
  getMeApi,
  getStoredToken,
  setStoredToken,
  clearStoredAuth,
  getStoredUser,
  setStoredUser,
  AuthUser,
} from '../auth';

// In-memory mock for localStorage in Node test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Auth Client API & Storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('stores and retrieves token correctly in localStorage', () => {
    expect(getStoredToken()).toBeNull();
    setStoredToken('test-jwt-token-123');
    expect(getStoredToken()).toBe('test-jwt-token-123');
  });

  it('stores and retrieves user profile correctly in localStorage', () => {
    expect(getStoredUser()).toBeNull();
    const mockUser: AuthUser = {
      id: 'usr-1',
      fullName: 'John Mentor',
      email: 'mntr001@codeyoung.in',
      role: 'MENTOR',
      timezone: 'Asia/Kolkata',
    };
    setStoredUser(mockUser);
    expect(getStoredUser()).toEqual(mockUser);
  });

  it('clears all auth storage on clearStoredAuth', () => {
    setStoredToken('token-abc');
    setStoredUser({
      id: 'usr-2',
      fullName: 'Admin User',
      email: 'admin@codeyoung.in',
      role: 'ADMIN',
      timezone: 'UTC',
    });
    clearStoredAuth();
    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it('successfully calls /api/auth/login and stores session', async () => {
    const mockResponse = {
      status: 'success',
      data: {
        token: 'signed-token-xyz',
        user: {
          id: 'usr-3',
          fullName: 'Jane Parent',
          email: 'parent@example.com',
          role: 'PARENT' as const,
          timezone: 'America/New_York',
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await loginApi('parent@example.com', 'password123');
    expect(result.token).toBe('signed-token-xyz');
    expect(result.user.email).toBe('parent@example.com');
    expect(result.user.role).toBe('PARENT');
    expect(getStoredToken()).toBe('signed-token-xyz');
    expect(getStoredUser()?.email).toBe('parent@example.com');
  });

  it('throws friendly error message on invalid credentials', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        status: 'error',
        message: 'Invalid email or password.',
      }),
    });

    await expect(loginApi('wrong@example.com', 'badpassword')).rejects.toThrow(
      'Invalid email or password.'
    );
  });

  it('successfully calls /api/auth/me with Bearer token', async () => {
    const mockProfile: AuthUser = {
      id: 'usr-admin',
      fullName: 'System Admin',
      email: 'admin@codeyoung.in',
      role: 'ADMIN',
      timezone: 'Asia/Kolkata',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: mockProfile,
      }),
    });

    const result = await getMeApi('valid-admin-token');
    expect(result).toEqual(mockProfile);
    expect(getStoredUser()).toEqual(mockProfile);
  });
});
