import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Ensure .env is explicitly loaded from root workspace, cwd, or fallback files
const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(process.cwd(), '.env.example'),
];

for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
  }
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'codeyoung-jwt-secure-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
  resendApiKey: process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'Codeyoung Admissions <onboarding@resend.dev>',
  appBaseUrl: process.env.APP_BASE_URL || process.env.APP_URL || 'http://localhost:3000',
};
