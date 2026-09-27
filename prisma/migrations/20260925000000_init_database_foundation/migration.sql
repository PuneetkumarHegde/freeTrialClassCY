-- Enable btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('PARENT', 'MENTOR', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable "User"
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PARENT',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable "Mentor"
CREATE TABLE IF NOT EXISTS "Mentor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable "MentorAvailability"
CREATE TABLE IF NOT EXISTS "MentorAvailability" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "localStart" TEXT NOT NULL,
    "localEnd" TEXT NOT NULL,

    CONSTRAINT "MentorAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable "Appointment"
CREATE TABLE IF NOT EXISTS "Appointment" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentGrade" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "learningGoal" TEXT,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "meetingLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Mentor_userId_key" ON "Mentor"("userId");
CREATE INDEX IF NOT EXISTS "Mentor_userId_idx" ON "Mentor"("userId");
CREATE INDEX IF NOT EXISTS "Mentor_isActive_idx" ON "Mentor"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MentorAvailability_mentorId_idx" ON "MentorAvailability"("mentorId");
CREATE INDEX IF NOT EXISTS "MentorAvailability_mentorId_dayOfWeek_idx" ON "MentorAvailability"("mentorId", "dayOfWeek");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_mentorId_idx" ON "Appointment"("mentorId");
CREATE INDEX IF NOT EXISTS "Appointment_parentId_idx" ON "Appointment"("parentId");
CREATE INDEX IF NOT EXISTS "Appointment_startTime_endTime_idx" ON "Appointment"("startTime", "endTime");
CREATE INDEX IF NOT EXISTS "Appointment_status_idx" ON "Appointment"("status");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Mentor_userId_fkey') THEN
    ALTER TABLE "Mentor" ADD CONSTRAINT "Mentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MentorAvailability_mentorId_fkey') THEN
    ALTER TABLE "MentorAvailability" ADD CONSTRAINT "MentorAvailability_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_mentorId_fkey') THEN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_parentId_fkey') THEN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- PostgreSQL Exclusion Constraint: prevent overlapping capacity-consuming appointments for the same mentor
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_mentor_appointments') THEN
    ALTER TABLE "Appointment"
    ADD CONSTRAINT "no_overlapping_mentor_appointments"
    EXCLUDE USING gist (
      "mentorId" WITH =,
      tstzrange("startTime", "endTime", '[)') WITH &&
    )
    WHERE (status != 'CANCELLED');
  END IF;
END $$;
