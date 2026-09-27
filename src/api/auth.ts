export type UserRole = 'PARENT' | 'MENTOR' | 'ADMIN';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  timezone: string;
}

export interface LoginResponse {
  status: 'success' | 'error';
  data?: {
    token: string;
    user: AuthUser;
  };
  message?: string;
}

const TOKEN_KEY = 'codeyoung_auth_token';
const USER_KEY = 'codeyoung_auth_user';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.error('Failed to save token to localStorage', err);
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error('Failed to clear auth storage', err);
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save user to localStorage', err);
  }
}

/**
 * Authenticates with email and password
 */
export async function loginApi(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json();

  if (!response.ok || payload.status === 'error' || !payload.data) {
    const message = payload.message || 'Email or password is incorrect.';
    throw new Error(message);
  }

  setStoredToken(payload.data.token);
  setStoredUser(payload.data.user);

  return payload.data;
}

/**
 * Fetches current authenticated user profile
 */
export async function getMeApi(token: string): Promise<AuthUser> {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json();

  if (!response.ok || payload.status === 'error' || !payload.data) {
    throw new Error(payload.message || 'Unauthorized');
  }

  setStoredUser(payload.data);
  return payload.data;
}
