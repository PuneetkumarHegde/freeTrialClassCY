import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller';
import { googleAuthorize, googleCallback, getGoogleAuthStatus } from '../controllers/gmail-oauth.controller';
import { authenticate } from '../middleware/auth.middleware';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/auth/login', login);

// GET /api/auth/me (Protected)
authRouter.get('/auth/me', authenticate, getMe);

// Google OAuth 2.0 endpoints for Gmail sending (worklord035@gmail.com)
// GET /api/auth/google/authorize
authRouter.get('/auth/google/authorize', googleAuthorize);

// GET /api/auth/google/callback
authRouter.get('/auth/google/callback', googleCallback);

// GET /api/auth/google/status
authRouter.get('/auth/google/status', getGoogleAuthStatus);
