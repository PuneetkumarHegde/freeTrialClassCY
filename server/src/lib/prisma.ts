import { PrismaClient } from '@prisma/client';
import { normalizeDatabaseUrl } from './dbUrl';
import './env';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: normalizeDatabaseUrl(process.env.DATABASE_URL),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// Auto-ensure schema migrations for UnavailabilityStatus
(async () => {
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UnavailabilityStatus') THEN
          CREATE TYPE "UnavailabilityStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        END IF;
      END
      $$;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "MentorUnavailability"
      ADD COLUMN IF NOT EXISTS "status" "UnavailabilityStatus" DEFAULT 'PENDING';
    `);
  } catch {
    // ignore
  }
})();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
