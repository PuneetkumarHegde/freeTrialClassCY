import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// 1. Load canonical root .env file if it exists (single location, no duplicate .env files)
const rootEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// 2. Load AI Studio runtime secrets / environment configuration (/app/.dev.env.json) if present
const devEnvJsonPath = path.resolve('/app/.dev.env.json');
if (fs.existsSync(devEnvJsonPath)) {
  try {
    const raw = fs.readFileSync(devEnvJsonPath, 'utf-8');
    const devEnv = JSON.parse(raw);
    for (const [key, value] of Object.entries(devEnv)) {
      if (value !== undefined && value !== null && !process.env[key]) {
        process.env[key] = String(value);
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
}

// 3. Fallback defaults from .env.example without overwriting existing environment variables
const exampleEnvPath = path.resolve(process.cwd(), '.env.example');
if (fs.existsSync(exampleEnvPath)) {
  dotenv.config({ path: exampleEnvPath });
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
