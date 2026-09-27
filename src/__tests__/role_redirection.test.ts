import { describe, it, expect } from 'vitest';
import { UserRole } from '../api/auth';

describe('Role-Based Navigation & Access Rules', () => {
  function getRedirectPathForRole(role: UserRole): string {
    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'MENTOR':
        return '/mentor/dashboard';
      case 'PARENT':
      default:
        return '/student/dashboard';
    }
  }

  function isRoutePermitted(role: UserRole, targetRoute: string): boolean {
    if (targetRoute.startsWith('/admin')) {
      return role === 'ADMIN';
    }
    if (targetRoute.startsWith('/mentor')) {
      return role === 'MENTOR' || role === 'ADMIN';
    }
    if (targetRoute.startsWith('/student') || targetRoute.startsWith('/parent')) {
      return role === 'PARENT' || role === 'ADMIN';
    }
    return true;
  }

  it('redirects MENTOR to /mentor/dashboard', () => {
    expect(getRedirectPathForRole('MENTOR')).toBe('/mentor/dashboard');
  });

  it('redirects ADMIN to /admin/dashboard', () => {
    expect(getRedirectPathForRole('ADMIN')).toBe('/admin/dashboard');
  });

  it('redirects PARENT to /student/dashboard', () => {
    expect(getRedirectPathForRole('PARENT')).toBe('/student/dashboard');
  });

  it('enforces that PARENT cannot access mentor or admin routes', () => {
    expect(isRoutePermitted('PARENT', '/mentor/dashboard')).toBe(false);
    expect(isRoutePermitted('PARENT', '/mentor/appointments/123')).toBe(false);
    expect(isRoutePermitted('PARENT', '/admin/dashboard')).toBe(false);
    expect(isRoutePermitted('PARENT', '/admin/mentors')).toBe(false);
    expect(isRoutePermitted('PARENT', '/student/dashboard')).toBe(true);
  });

  it('enforces that MENTOR cannot access admin routes or parent private routes', () => {
    expect(isRoutePermitted('MENTOR', '/admin/dashboard')).toBe(false);
    expect(isRoutePermitted('MENTOR', '/admin/appointments')).toBe(false);
    expect(isRoutePermitted('MENTOR', '/student/dashboard')).toBe(false);
    expect(isRoutePermitted('MENTOR', '/mentor/dashboard')).toBe(true);
  });

  it('allows ADMIN to access admin, mentor, and student management views', () => {
    expect(isRoutePermitted('ADMIN', '/admin/dashboard')).toBe(true);
    expect(isRoutePermitted('ADMIN', '/mentor/dashboard')).toBe(true);
    expect(isRoutePermitted('ADMIN', '/student/dashboard')).toBe(true);
  });
});
