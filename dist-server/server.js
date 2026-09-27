// server/src/lib/env.ts
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
var rootEnvPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
var devEnvJsonPath = path.resolve("/app/.dev.env.json");
if (fs.existsSync(devEnvJsonPath)) {
  try {
    const raw = fs.readFileSync(devEnvJsonPath, "utf-8");
    const devEnv = JSON.parse(raw);
    for (const [key, value] of Object.entries(devEnv)) {
      if (value !== void 0 && value !== null && !process.env[key]) {
        process.env[key] = String(value);
      }
    }
  } catch {
  }
}
var exampleEnvPath = path.resolve(process.cwd(), ".env.example");
if (fs.existsSync(exampleEnvPath)) {
  dotenv.config({ path: exampleEnvPath });
}
var config = {
  port: Number(process.env.PORT) || 3e3,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "codeyoung-jwt-secure-secret-key-2026",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  isDev: (process.env.NODE_ENV || "development") === "development",
  isProd: process.env.NODE_ENV === "production",
  resendApiKey: process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "Codeyoung Admissions <onboarding@resend.dev>",
  appBaseUrl: process.env.APP_BASE_URL || process.env.APP_URL || "http://localhost:3000"
};

// server.ts
import path4 from "path";
import { fileURLToPath } from "url";
import express2 from "express";
import { createServer as createViteServer } from "vite";

// server/src/app.ts
import express from "express";
import cors from "cors";

// server/src/routes/index.ts
import { Router as Router9 } from "express";

// server/src/routes/health.routes.ts
import { Router } from "express";

// server/src/controllers/health.controller.ts
var getHealth = (_req, res) => {
  res.status(200).json({
    status: "ok"
  });
};

// server/src/routes/health.routes.ts
var healthRouter = Router();
healthRouter.get("/health", getHealth);

// server/src/routes/mentor.routes.ts
import { Router as Router2 } from "express";

// server/src/controllers/mentor.controller.ts
import { z } from "zod";

// server/src/services/availability.service.ts
import { Temporal } from "@js-temporal/polyfill";

// server/src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// server/src/lib/dbUrl.ts
function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return "";
  try {
    const protocolIdx = rawUrl.indexOf("://");
    if (protocolIdx === -1) return rawUrl;
    const protocol = rawUrl.substring(0, protocolIdx + 3);
    const rest = rawUrl.substring(protocolIdx + 3);
    const atIdx = rest.lastIndexOf("@");
    if (atIdx === -1) return rawUrl;
    const userPass = rest.substring(0, atIdx);
    const hostRest = rest.substring(atIdx + 1);
    const colonIdx = userPass.indexOf(":");
    if (colonIdx === -1) return rawUrl;
    const user = userPass.substring(0, colonIdx);
    const pass = userPass.substring(colonIdx + 1);
    const decodedUser = decodeURIComponent(user);
    const decodedPass = decodeURIComponent(pass);
    return `${protocol}${encodeURIComponent(decodedUser)}:${encodeURIComponent(decodedPass)}@${hostRest}`;
  } catch {
    return rawUrl;
  }
}

// server/src/lib/prisma.ts
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: normalizeDatabaseUrl(process.env.DATABASE_URL)
    }
  },
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});
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
  }
})();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// server/src/repositories/mentor.repository.ts
var MentorRepository = class {
  /**
   * Find mentor by ID including user profile, configured availability, and unavailabilities
   */
  async findById(id) {
    const mentor = await prisma.mentor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            timezone: true
          }
        },
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { localStart: "asc" }]
        },
        unavailabilities: {
          orderBy: { startDate: "asc" }
        }
      }
    });
    if (!mentor) return null;
    return mentor;
  }
  /**
   * Find all mentors with their user profile, availability, and unavailabilities
   */
  async findAll(options) {
    const whereClause = options?.isActive !== void 0 ? { isActive: options.isActive } : {};
    const mentors = await prisma.mentor.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            timezone: true
          }
        },
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { localStart: "asc" }]
        },
        unavailabilities: {
          orderBy: { startDate: "asc" }
        }
      },
      orderBy: {
        user: {
          fullName: "asc"
        }
      }
    });
    return mentors;
  }
  /**
   * Find availability rules for a mentor on a specific day of week (0 = Sunday ... 6 = Saturday)
   */
  async getAvailabilityForDay(mentorId, dayOfWeek) {
    const rules = await prisma.mentorAvailability.findMany({
      where: {
        mentorId,
        dayOfWeek
      },
      orderBy: {
        localStart: "asc"
      }
    });
    return rules;
  }
  /**
   * Check if mentor has any active (non-cancelled) appointment overlapping [startTime, endTime)
   */
  async hasConflictingAppointment(mentorId, startTime, endTime) {
    const conflict = await prisma.appointment.findFirst({
      where: {
        mentorId,
        status: { not: "CANCELLED" },
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });
    return conflict !== null;
  }
  /**
   * Check if mentor has an explicit APPROVED unavailability exception overlapping [startTime, endTime)
   */
  async hasUnavailabilityException(mentorId, startTime, endTime) {
    try {
      const unavail = await prisma.mentorUnavailability.findFirst({
        where: {
          mentorId,
          status: "APPROVED",
          startDate: { lt: endTime },
          endDate: { gt: startTime }
        }
      });
      return unavail !== null;
    } catch {
      try {
        const unavail = await prisma.mentorUnavailability.findFirst({
          where: {
            mentorId,
            startDate: { lt: endTime },
            endDate: { gt: startTime }
          }
        });
        return unavail !== null;
      } catch {
        return false;
      }
    }
  }
  /**
   * Add an unavailability exception period (defaults to PENDING)
   */
  async addUnavailability(mentorId, startDate, endDate, reason, status = "PENDING") {
    const record = await prisma.mentorUnavailability.create({
      data: {
        mentorId,
        startDate,
        endDate,
        reason,
        status
      }
    });
    return record;
  }
  /**
   * Remove an unavailability exception
   */
  async removeUnavailability(unavailabilityId) {
    await prisma.mentorUnavailability.delete({
      where: { id: unavailabilityId }
    });
  }
  /**
   * Update mentor active status (e.g. terminate/reactivate)
   */
  async setMentorActiveStatus(mentorId, isActive) {
    const updated = await prisma.mentor.update({
      where: { id: mentorId },
      data: { isActive },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            timezone: true
          }
        },
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { localStart: "asc" }]
        },
        unavailabilities: {
          orderBy: { startDate: "asc" }
        }
      }
    });
    return updated;
  }
};
var mentorRepository = new MentorRepository();

// server/src/middleware/errorHandler.ts
import { ZodError } from "zod";
var AppError = class extends Error {
  statusCode;
  isOperational;
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
};
var errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message
    });
    return;
  }
  if ("type" in err && err.type === "entity.parse.failed") {
    res.status(400).json({
      status: "error",
      message: "Invalid JSON payload received in request body"
    });
    return;
  }
  console.error("[Unhandled Error]", err);
  res.status(500).json({
    status: "error",
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message || "Internal server error"
  });
};

// server/src/services/availability.service.ts
var DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];
var AvailabilityService = class {
  constructor(mentorRepo = mentorRepository) {
    this.mentorRepo = mentorRepo;
  }
  mentorRepo;
  /**
   * Determine if a mentor is available during a requested 1-hour trial class
   *
   * @param mentorId UUID of the mentor
   * @param startInstant Temporal.Instant representing the exact start of the appointment
   * @param endInstant Optional Temporal.Instant for appointment end. Defaults to startInstant + 60 minutes.
   */
  async isMentorAvailable(mentorId, startInstant, endInstant) {
    const resolvedEndInstant = endInstant || startInstant.add({ hours: 1 });
    if (Temporal.Instant.compare(resolvedEndInstant, startInstant) <= 0) {
      throw new AppError("Appointment end time must be strictly after start time", 400);
    }
    const mentor = await this.mentorRepo.findById(mentorId);
    if (!mentor) {
      throw new AppError(`Mentor not found with ID: ${mentorId}`, 404);
    }
    const requestedUtc = {
      start: startInstant.toString(),
      end: resolvedEndInstant.toString()
    };
    let startZdt;
    let endZdt;
    try {
      startZdt = startInstant.toZonedDateTimeISO(mentor.timezone);
      endZdt = resolvedEndInstant.toZonedDateTimeISO(mentor.timezone);
    } catch (tzError) {
      throw new AppError(`Invalid mentor timezone '${mentor.timezone}' configured in database`, 500);
    }
    const mentorLocalDate = startZdt.toPlainDate();
    const isoDayOfWeek = startZdt.dayOfWeek;
    const dbDayOfWeek = isoDayOfWeek % 7;
    const dayName = DAY_NAMES[dbDayOfWeek];
    const localStartTime = `${String(startZdt.hour).padStart(2, "0")}:${String(startZdt.minute).padStart(2, "0")}`;
    const localEndTime = `${String(endZdt.hour).padStart(2, "0")}:${String(endZdt.minute).padStart(2, "0")}`;
    const mentorLocal = {
      localDate: mentorLocalDate.toString(),
      dayOfWeek: dayName,
      dayOfWeekNumber: dbDayOfWeek,
      start: localStartTime,
      end: localEndTime
    };
    if (!mentor.isActive) {
      return {
        available: false,
        mentorId: mentor.id,
        mentorName: mentor.user.fullName,
        mentorTimezone: mentor.timezone,
        requestedUtc,
        mentorLocal,
        reason: `Mentor ${mentor.user.fullName} is currently inactive`
      };
    }
    const dayAvailabilities = await this.mentorRepo.getAvailabilityForDay(mentor.id, dbDayOfWeek);
    if (dayAvailabilities.length === 0) {
      return {
        available: false,
        mentorId: mentor.id,
        mentorName: mentor.user.fullName,
        mentorTimezone: mentor.timezone,
        requestedUtc,
        mentorLocal,
        reason: `Mentor ${mentor.user.fullName} has no working hours scheduled on ${dayName}s in ${mentor.timezone}`
      };
    }
    let matchedRule = null;
    for (const rule of dayAvailabilities) {
      const [startH, startM] = rule.localStart.split(":").map(Number);
      const [endH, endM] = rule.localEnd.split(":").map(Number);
      const ruleStartZdt = mentorLocalDate.toZonedDateTime({
        timeZone: mentor.timezone,
        plainTime: { hour: startH, minute: startM, second: 0, millisecond: 0 }
      });
      const ruleEndZdt = mentorLocalDate.toZonedDateTime({
        timeZone: mentor.timezone,
        plainTime: { hour: endH, minute: endM, second: 0, millisecond: 0 }
      });
      const ruleStartInstant = ruleStartZdt.toInstant();
      const ruleEndInstant = ruleEndZdt.toInstant();
      const fitsAtStart = Temporal.Instant.compare(startInstant, ruleStartInstant) >= 0;
      const fitsAtEnd = Temporal.Instant.compare(resolvedEndInstant, ruleEndInstant) <= 0;
      if (fitsAtStart && fitsAtEnd) {
        matchedRule = rule;
        break;
      }
    }
    if (!matchedRule) {
      const availableRanges = dayAvailabilities.map((r) => `${r.localStart}\u2013${r.localEnd}`).join(", ");
      return {
        available: false,
        mentorId: mentor.id,
        mentorName: mentor.user.fullName,
        mentorTimezone: mentor.timezone,
        requestedUtc,
        mentorLocal,
        reason: `Requested time ${localStartTime}\u2013${localEndTime} is outside mentor's ${dayName} working hours (${availableRanges} ${mentor.timezone})`
      };
    }
    const startDate = new Date(startInstant.epochMilliseconds);
    const endDate = new Date(resolvedEndInstant.epochMilliseconds);
    const hasConflict = await this.mentorRepo.hasConflictingAppointment(mentor.id, startDate, endDate);
    if (hasConflict) {
      return {
        available: false,
        mentorId: mentor.id,
        mentorName: mentor.user.fullName,
        mentorTimezone: mentor.timezone,
        requestedUtc,
        mentorLocal,
        matchingSchedule: {
          dayOfWeek: dayName,
          localStart: matchedRule.localStart,
          localEnd: matchedRule.localEnd
        },
        reason: `Mentor already has a confirmed appointment during this time interval`
      };
    }
    return {
      available: true,
      mentorId: mentor.id,
      mentorName: mentor.user.fullName,
      mentorTimezone: mentor.timezone,
      requestedUtc,
      mentorLocal,
      matchingSchedule: {
        dayOfWeek: dayName,
        localStart: matchedRule.localStart,
        localEnd: matchedRule.localEnd
      }
    };
  }
  /**
   * Helper method that accepts ISO timestamp strings, parses them with Temporal.Instant,
   * and invokes isMentorAvailable.
   */
  async checkAvailabilityFromIso(mentorId, startTimeIso, endTimeIso) {
    let startInstant;
    try {
      startInstant = Temporal.Instant.from(startTimeIso);
    } catch {
      throw new AppError(
        `Invalid startTime '${startTimeIso}'. Must be a valid ISO 8601 instant (e.g. 2026-09-28T12:30:00Z)`,
        400
      );
    }
    let endInstant;
    if (endTimeIso) {
      try {
        endInstant = Temporal.Instant.from(endTimeIso);
      } catch {
        throw new AppError(
          `Invalid endTime '${endTimeIso}'. Must be a valid ISO 8601 instant`,
          400
        );
      }
    }
    return this.isMentorAvailable(mentorId, startInstant, endInstant);
  }
};
var availabilityService = new AvailabilityService();

// server/src/services/mentor.service.ts
var MentorService = class {
  constructor(mentorRepo = mentorRepository) {
    this.mentorRepo = mentorRepo;
  }
  mentorRepo;
  async getAllMentors(activeOnly = true) {
    return this.mentorRepo.findAll({ isActive: activeOnly ? true : void 0 });
  }
  async getMentorById(mentorId) {
    const mentor = await this.mentorRepo.findById(mentorId);
    if (!mentor) {
      throw new AppError(`Mentor not found with ID: ${mentorId}`, 404);
    }
    return mentor;
  }
};
var mentorService = new MentorService();

// server/src/controllers/mentor.controller.ts
var checkAvailabilitySchema = {
  params: z.object({
    mentorId: z.string().uuid({ message: "mentorId must be a valid UUID" })
  }),
  query: z.object({
    startTime: z.string({ message: "startTime is required as an ISO 8601 string" }),
    endTime: z.string().optional()
  })
};
var getMentorParamsSchema = {
  params: z.object({
    mentorId: z.string().uuid({ message: "mentorId must be a valid UUID" })
  })
};
var checkMentorAvailability = async (req, res, next) => {
  try {
    const { mentorId } = req.params;
    const { startTime, endTime } = req.query;
    const result = await availabilityService.checkAvailabilityFromIso(mentorId, startTime, endTime);
    res.status(200).json({
      status: "success",
      data: result
    });
  } catch (error) {
    next(error);
  }
};
var getAllMentors = async (req, res, next) => {
  try {
    const activeOnly = req.query.all !== "true";
    const mentors = await mentorService.getAllMentors(activeOnly);
    res.status(200).json({
      status: "success",
      count: mentors.length,
      data: mentors
    });
  } catch (error) {
    next(error);
  }
};
var getMentorById = async (req, res, next) => {
  try {
    const { mentorId } = req.params;
    const mentor = await mentorService.getMentorById(mentorId);
    res.status(200).json({
      status: "success",
      data: mentor
    });
  } catch (error) {
    next(error);
  }
};

// server/src/middleware/validateRequest.ts
import { ZodError as ZodError2 } from "zod";
var validateRequest = (schema) => {
  return async (req, _res, next) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError2) {
        next(error);
      } else {
        next(error);
      }
    }
  };
};

// server/src/routes/mentor.routes.ts
var mentorRouter = Router2();
mentorRouter.get("/mentors", getAllMentors);
mentorRouter.get(
  "/mentors/:mentorId/availability/check",
  validateRequest(checkAvailabilitySchema),
  checkMentorAvailability
);
mentorRouter.get(
  "/mentors/:mentorId",
  validateRequest(getMentorParamsSchema),
  getMentorById
);

// server/src/routes/scheduling.routes.ts
import { Router as Router3 } from "express";

// server/src/controllers/scheduling.controller.ts
import { z as z2 } from "zod";
import { Temporal as Temporal3 } from "@js-temporal/polyfill";

// server/src/services/scheduling.service.ts
import { Temporal as Temporal2 } from "@js-temporal/polyfill";

// server/src/repositories/appointment.repository.ts
var AppointmentRepository = class {
  /**
   * Check if a mentor has any non-cancelled appointment overlapping [startTime, endTime)
   */
  async hasConflictingAppointment(mentorId, startTime, endTime) {
    const conflict = await prisma.appointment.findFirst({
      where: {
        mentorId,
        status: { not: "CANCELLED" },
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });
    return conflict !== null;
  }
  /**
   * Count CONFIRMED and COMPLETED appointments for a mentor within [dayStart, dayEnd)
   * (Enforces the daily 2-class limit in the mentor's local timezone)
   */
  async countDailyAppointments(mentorId, dayStart, dayEnd) {
    return prisma.appointment.count({
      where: {
        mentorId,
        status: {
          in: ["CONFIRMED", "COMPLETED"]
        },
        startTime: {
          gte: dayStart,
          lt: dayEnd
        }
      }
    });
  }
  /**
   * Find non-cancelled appointments for a set of mentors within a given time window
   */
  async findAppointmentsForMentors(mentorIds, windowStart, windowEnd) {
    return prisma.appointment.findMany({
      where: {
        mentorId: { in: mentorIds },
        status: { not: "CANCELLED" },
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart }
      },
      select: {
        id: true,
        mentorId: true,
        startTime: true,
        endTime: true,
        status: true
      }
    });
  }
};
var appointmentRepository = new AppointmentRepository();

// server/src/services/scheduling.service.ts
var SchedulingService = class {
  constructor(mentorRepo = mentorRepository, appointmentRepo = appointmentRepository) {
    this.mentorRepo = mentorRepo;
    this.appointmentRepo = appointmentRepo;
  }
  mentorRepo;
  appointmentRepo;
  /**
   * Validate a strict YYYY-MM-DD date string
   */
  validateDateString(dateStr) {
    if (!dateStr || typeof dateStr !== "string") {
      throw new AppError("Missing required query parameter 'date'", 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new AppError(
        `Invalid date format '${dateStr}'. Expected YYYY-MM-DD (e.g. 2026-09-28)`,
        400
      );
    }
    try {
      return Temporal2.PlainDate.from(dateStr);
    } catch {
      throw new AppError(`Invalid calendar date '${dateStr}'`, 400);
    }
  }
  /**
   * Validate an IANA timezone identifier
   */
  validateTimezone(timezone) {
    if (!timezone || typeof timezone !== "string") {
      throw new AppError("Invalid or missing 'timezone'", 400);
    }
    try {
      Intl.DateTimeFormat(void 0, { timeZone: timezone });
    } catch {
      throw new AppError(
        `Invalid IANA timezone '${timezone}'. Example valid timezones: 'Asia/Kolkata', 'America/New_York', 'UTC'`,
        400
      );
    }
  }
  /**
   * Generate 60-minute candidate trial slots across all active mentors for a requested calendar date.
   *
   * For each active mentor:
   * 1. Evaluates the requested date in the mentor's IANA timezone.
   * 2. Reads that mentor's availability rules for that local day of week.
   * 3. Converts local working hours into Temporal.Instant values, respecting DST.
   * 4. Generates 60-minute trial slots fitting inside working hours.
   * 5. Merges and deduplicates candidate slots across mentors in chronological order.
   */
  generateCandidateSlotsForDate(dateStr, activeMentors) {
    const plainDate = this.validateDateString(dateStr);
    const candidateSlotsMap = /* @__PURE__ */ new Map();
    for (const mentor of activeMentors) {
      if (!mentor.isActive) continue;
      let dbDayOfWeek;
      try {
        dbDayOfWeek = plainDate.dayOfWeek % 7;
      } catch {
        continue;
      }
      const mentorRules = mentor.availability.filter((a) => a.dayOfWeek === dbDayOfWeek);
      for (const rule of mentorRules) {
        const [startH, startM] = rule.localStart.split(":").map(Number);
        const [endH, endM] = rule.localEnd.split(":").map(Number);
        let ruleStartZdt;
        let ruleEndZdt;
        try {
          ruleStartZdt = plainDate.toZonedDateTime({
            timeZone: mentor.timezone,
            plainTime: { hour: startH, minute: startM, second: 0, millisecond: 0 }
          });
          ruleEndZdt = plainDate.toZonedDateTime({
            timeZone: mentor.timezone,
            plainTime: { hour: endH, minute: endM, second: 0, millisecond: 0 }
          });
        } catch {
          continue;
        }
        const ruleEndInstant = ruleEndZdt.toInstant();
        let currentSlotStart = ruleStartZdt;
        while (true) {
          const currentSlotEnd = currentSlotStart.add({ hours: 1 });
          const slotEndInstant = currentSlotEnd.toInstant();
          if (Temporal2.Instant.compare(slotEndInstant, ruleEndInstant) > 0) {
            break;
          }
          const slotStartInstant = currentSlotStart.toInstant();
          const epochKey = slotStartInstant.epochMilliseconds;
          if (!candidateSlotsMap.has(epochKey)) {
            candidateSlotsMap.set(epochKey, {
              startInstant: slotStartInstant,
              endInstant: slotEndInstant
            });
          }
          currentSlotStart = currentSlotEnd;
        }
      }
    }
    return Array.from(candidateSlotsMap.values()).sort(
      (a, b) => Temporal2.Instant.compare(a.startInstant, b.startInstant)
    );
  }
  /**
   * Determine if a mentor is eligible to conduct a 1-hour trial class for a specific slot.
   *
   * A mentor is eligible ONLY when:
   * 1. Mentor is active
   * 2. The entire 60-minute appointment fits inside the mentor's configured working hours on that mentor-local day
   * 3. Mentor does NOT have an overlapping non-cancelled appointment
   * 4. Mentor has NOT reached their daily limit (2 trial classes) on the mentor-local calendar day
   */
  async isMentorEligibleForSlot(mentor, startInstant, endInstant) {
    if (!mentor.isActive) return false;
    let startZdt;
    let endZdt;
    try {
      startZdt = startInstant.toZonedDateTimeISO(mentor.timezone);
      endZdt = endInstant.toZonedDateTimeISO(mentor.timezone);
    } catch {
      return false;
    }
    const mentorLocalDate = startZdt.toPlainDate();
    const dbDayOfWeek = startZdt.dayOfWeek % 7;
    const dayRules = mentor.availability.filter((r) => r.dayOfWeek === dbDayOfWeek);
    if (dayRules.length === 0) return false;
    let fitsWorkingHours = false;
    for (const rule of dayRules) {
      const [startH, startM] = rule.localStart.split(":").map(Number);
      const [endH, endM] = rule.localEnd.split(":").map(Number);
      const ruleStartZdt = mentorLocalDate.toZonedDateTime({
        timeZone: mentor.timezone,
        plainTime: { hour: startH, minute: startM, second: 0, millisecond: 0 }
      });
      const ruleEndZdt = mentorLocalDate.toZonedDateTime({
        timeZone: mentor.timezone,
        plainTime: { hour: endH, minute: endM, second: 0, millisecond: 0 }
      });
      const ruleStartInstant = ruleStartZdt.toInstant();
      const ruleEndInstant = ruleEndZdt.toInstant();
      const fitsAtStart = Temporal2.Instant.compare(startInstant, ruleStartInstant) >= 0;
      const fitsAtEnd = Temporal2.Instant.compare(endInstant, ruleEndInstant) <= 0;
      if (fitsAtStart && fitsAtEnd) {
        fitsWorkingHours = true;
        break;
      }
    }
    if (!fitsWorkingHours) return false;
    const startDate = new Date(startInstant.epochMilliseconds);
    const endDate = new Date(endInstant.epochMilliseconds);
    const hasConflict = await this.appointmentRepo.hasConflictingAppointment(
      mentor.id,
      startDate,
      endDate
    );
    if (hasConflict) return false;
    const hasUnavailability = await this.mentorRepo.hasUnavailabilityException(
      mentor.id,
      startDate,
      endDate
    );
    if (hasUnavailability) return false;
    const dayStartZdt = mentorLocalDate.toZonedDateTime({
      timeZone: mentor.timezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
    });
    const dayEndZdt = mentorLocalDate.add({ days: 1 }).toZonedDateTime({
      timeZone: mentor.timezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
    });
    const dayStart = new Date(dayStartZdt.toInstant().epochMilliseconds);
    const dayEnd = new Date(dayEndZdt.toInstant().epochMilliseconds);
    const dailyAppointmentsCount = await this.appointmentRepo.countDailyAppointments(
      mentor.id,
      dayStart,
      dayEnd
    );
    if (dailyAppointmentsCount >= 2) {
      return false;
    }
    return true;
  }
  /**
   * Determine simultaneous capacity and eligible mentors for an exact 1-hour slot.
   * Answers: "For this requested date and time, how many eligible mentors can conduct a 1-hour trial class?"
   */
  async getSlotCapacity(startInstant, endInstant, displayTimezone = "Asia/Kolkata") {
    const resolvedEndInstant = endInstant || startInstant.add({ hours: 1 });
    if (Temporal2.Instant.compare(resolvedEndInstant, startInstant) <= 0) {
      throw new AppError("End time must be strictly after start time", 400);
    }
    this.validateTimezone(displayTimezone);
    const activeMentors = await this.mentorRepo.findAll({ isActive: true });
    const eligibleMentors = [];
    for (const mentor of activeMentors) {
      const isEligible = await this.isMentorEligibleForSlot(
        mentor,
        startInstant,
        resolvedEndInstant
      );
      if (isEligible) {
        eligibleMentors.push(mentor);
      }
    }
    const availableMentorsCount = eligibleMentors.length;
    let status;
    if (availableMentorsCount >= 2) {
      status = "AVAILABLE";
    } else if (availableMentorsCount === 1) {
      status = "LIMITED";
    } else {
      status = "FULL";
    }
    const localStartZdt = startInstant.toZonedDateTimeISO(displayTimezone);
    const localEndZdt = resolvedEndInstant.toZonedDateTimeISO(displayTimezone);
    const localStart = `${String(localStartZdt.hour).padStart(2, "0")}:${String(localStartZdt.minute).padStart(2, "0")}`;
    const localEnd = `${String(localEndZdt.hour).padStart(2, "0")}:${String(localEndZdt.minute).padStart(2, "0")}`;
    const localDate = localStartZdt.toPlainDate().toString();
    let message;
    if (availableMentorsCount >= 2) {
      message = `${availableMentorsCount} eligible mentors are available for this trial slot`;
    } else if (availableMentorsCount === 1) {
      message = `1 eligible mentor is available for this trial slot (limited availability)`;
    } else {
      message = "No eligible mentors are available for this trial slot";
    }
    return {
      requestedUtc: {
        start: startInstant.toString(),
        end: resolvedEndInstant.toString()
      },
      status,
      availableMentorsCount,
      totalActiveMentors: activeMentors.length,
      isAvailable: availableMentorsCount > 0,
      message,
      localTime: {
        timezone: displayTimezone,
        date: localDate,
        start: localStart,
        end: localEnd
      },
      eligibleMentorIds: eligibleMentors.map((m) => m.id),
      eligibleMentors: eligibleMentors.map((m) => ({
        id: m.id,
        name: m.user.fullName,
        timezone: m.timezone
      }))
    };
  }
  /**
   * Retrieve all generated 1-hour trial slots for a selected date with simultaneous capacity.
   * Public-safe: does NOT expose mentor identities in the response.
   */
  async getAvailableSlotsForDate(dateStr, timezone = "Asia/Kolkata") {
    this.validateDateString(dateStr);
    this.validateTimezone(timezone);
    const activeMentors = await this.mentorRepo.findAll({ isActive: true });
    const candidateSlots = this.generateCandidateSlotsForDate(dateStr, activeMentors);
    const slots = [];
    for (const slot of candidateSlots) {
      const eligibleMentors = [];
      for (const mentor of activeMentors) {
        const isEligible = await this.isMentorEligibleForSlot(
          mentor,
          slot.startInstant,
          slot.endInstant
        );
        if (isEligible) {
          eligibleMentors.push(mentor);
        }
      }
      const availableMentors = eligibleMentors.length;
      let status;
      if (availableMentors >= 2) {
        status = "AVAILABLE";
      } else if (availableMentors === 1) {
        status = "LIMITED";
      } else {
        status = "FULL";
      }
      const localStartZdt = slot.startInstant.toZonedDateTimeISO(timezone);
      const localEndZdt = slot.endInstant.toZonedDateTimeISO(timezone);
      const localStart = `${String(localStartZdt.hour).padStart(2, "0")}:${String(localStartZdt.minute).padStart(2, "0")}`;
      const localEnd = `${String(localEndZdt.hour).padStart(2, "0")}:${String(localEndZdt.minute).padStart(2, "0")}`;
      const localDate = localStartZdt.toPlainDate().toString();
      slots.push({
        start: slot.startInstant.toString(),
        end: slot.endInstant.toString(),
        startTime: slot.startInstant.toString(),
        endTime: slot.endInstant.toString(),
        localDate,
        localStart,
        localEnd,
        localFormatted: `${localStart} - ${localEnd}`,
        status,
        availableMentors,
        remainingCapacity: availableMentors
      });
    }
    const availableSlotsCount = slots.filter((s) => s.status !== "FULL").length;
    return {
      date: dateStr,
      timezone,
      totalSlots: slots.length,
      availableSlotsCount,
      slots
    };
  }
};
var schedulingService = new SchedulingService();

// server/src/controllers/scheduling.controller.ts
var getSlotsQuerySchema = {
  query: z2.object({
    date: z2.string({ message: "Query parameter 'date' is required (YYYY-MM-DD)" }).regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Invalid date format. Expected YYYY-MM-DD (e.g. 2026-09-28)"
    }),
    timezone: z2.string().optional()
  })
};
var getAvailableSlots = async (req, res, next) => {
  try {
    const { date, timezone } = req.query;
    const result = await schedulingService.getAvailableSlotsForDate(
      date,
      timezone || "Asia/Kolkata"
    );
    res.status(200).json({
      status: "success",
      data: result
    });
  } catch (error) {
    next(error);
  }
};
var getSlotCapacity = async (req, res, next) => {
  try {
    const { startTime, endTime, date, time, timezone } = req.query;
    const targetTimezone = timezone || "Asia/Kolkata";
    let startInstant;
    let endInstant;
    if (startTime) {
      try {
        startInstant = Temporal3.Instant.from(startTime);
      } catch {
        throw new AppError(
          `Invalid startTime '${startTime}'. Must be a valid ISO 8601 timestamp (e.g. 2026-09-28T12:30:00Z)`,
          400
        );
      }
    } else if (date && time) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new AppError(
          `Invalid date format '${date}'. Expected YYYY-MM-DD`,
          400
        );
      }
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
        throw new AppError(
          `Invalid time format '${time}'. Expected HH:mm (e.g. 18:00)`,
          400
        );
      }
      try {
        const plainDate = Temporal3.PlainDate.from(date);
        const [h, m] = time.split(":").map(Number);
        const zdt = plainDate.toZonedDateTime({
          timeZone: targetTimezone,
          plainTime: { hour: h, minute: m, second: 0, millisecond: 0 }
        });
        startInstant = zdt.toInstant();
      } catch {
        throw new AppError("Unable to construct timestamp from date, time, and timezone", 400);
      }
    } else {
      throw new AppError(
        "Missing required parameters. Provide 'startTime' (ISO 8601 string) or both 'date' and 'time'.",
        400
      );
    }
    if (endTime) {
      try {
        endInstant = Temporal3.Instant.from(endTime);
      } catch {
        throw new AppError(
          `Invalid endTime '${endTime}'. Must be a valid ISO 8601 timestamp`,
          400
        );
      }
    }
    const internalResult = await schedulingService.getSlotCapacity(
      startInstant,
      endInstant,
      targetTimezone
    );
    const { eligibleMentorIds, eligibleMentors, ...publicData } = internalResult;
    res.status(200).json({
      status: "success",
      data: publicData
    });
  } catch (error) {
    next(error);
  }
};

// server/src/routes/scheduling.routes.ts
var schedulingRouter = Router3();
schedulingRouter.get(
  "/scheduling/slots",
  validateRequest(getSlotsQuerySchema),
  getAvailableSlots
);
schedulingRouter.get(
  "/slots",
  validateRequest(getSlotsQuerySchema),
  getAvailableSlots
);
schedulingRouter.get("/scheduling/capacity", getSlotCapacity);
schedulingRouter.get("/capacity", getSlotCapacity);

// server/src/routes/booking.routes.ts
import { Router as Router4 } from "express";

// server/src/types/booking.types.ts
import { z as z3 } from "zod";
var createBookingSchema = z3.object({
  student: z3.object({
    name: z3.string().trim().min(2, "Student name must be at least 2 characters").max(100),
    grade: z3.string().trim().min(1, "Student grade is required").max(50),
    subject: z3.string().trim().min(1, "Subject is required").max(100),
    learningGoal: z3.string().trim().max(500).optional().nullable()
  }),
  parent: z3.object({
    name: z3.string().trim().min(2, "Parent name must be at least 2 characters").max(100),
    email: z3.string().trim().toLowerCase().email("Invalid parent email address"),
    phone: z3.string().trim().max(30).optional().nullable()
  }),
  startTime: z3.string().datetime({ message: "startTime must be a valid ISO 8601 timestamp" }),
  endTime: z3.string().datetime({ message: "endTime must be a valid ISO 8601 timestamp" }).optional(),
  timezone: z3.string().min(1, "Timezone is required").refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(void 0, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid IANA timezone identifier" }
  )
}).refine(
  (data) => {
    const startMs = new Date(data.startTime).getTime();
    const endMs = data.endTime ? new Date(data.endTime).getTime() : startMs + 60 * 60 * 1e3;
    return endMs > startMs;
  },
  { message: "End time must be strictly after start time", path: ["endTime"] }
).refine(
  (data) => {
    const startMs = new Date(data.startTime).getTime();
    const endMs = data.endTime ? new Date(data.endTime).getTime() : startMs + 60 * 60 * 1e3;
    const durationMinutes = (endMs - startMs) / (1e3 * 60);
    return Math.abs(durationMinutes - 60) < 1e-3;
  },
  { message: "Trial class duration must be exactly 60 minutes", path: ["endTime"] }
);

// server/src/services/booking.service.ts
import { Temporal as Temporal5 } from "@js-temporal/polyfill";
import { Prisma as Prisma2 } from "@prisma/client";

// server/src/repositories/booking.repository.ts
import { Prisma, Role } from "@prisma/client";
var BookingRepository = class {
  constructor(appointmentRepo = appointmentRepository, mentorRepo = mentorRepository) {
    this.appointmentRepo = appointmentRepo;
    this.mentorRepo = mentorRepo;
  }
  appointmentRepo;
  mentorRepo;
  /**
   * Execute operations inside a database transaction with serializable isolation
   */
  async executeTransaction(fn, isolationLevel = Prisma.TransactionIsolationLevel.ReadCommitted) {
    return prisma.$transaction(fn, {
      isolationLevel,
      maxWait: 5e3,
      timeout: 1e4
    });
  }
  /**
   * Find or create a PARENT user by normalized email
   */
  async findOrCreateParentUser(fullName, email, timezone, tx) {
    const client = tx || prisma;
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await client.user.findUnique({
      where: { email: normalizedEmail }
    });
    if (existingUser) {
      if (existingUser.timezone !== timezone) {
        return client.user.update({
          where: { id: existingUser.id },
          data: { timezone }
        });
      }
      return existingUser;
    }
    return client.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        role: Role.PARENT,
        timezone
      }
    });
  }
  /**
   * Get all active mentors with user profile and availability
   */
  async getActiveMentors(tx) {
    const client = tx || prisma;
    const mentors = await client.mentor.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            timezone: true
          }
        },
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { localStart: "asc" }]
        }
      },
      orderBy: {
        id: "asc"
      }
    });
    return mentors;
  }
  /**
   * Check if a mentor has an overlapping active appointment within a transaction
   */
  async hasConflictingAppointment(mentorId, startTime, endTime, tx) {
    const client = tx || prisma;
    const conflict = await client.appointment.findFirst({
      where: {
        mentorId,
        status: { not: "CANCELLED" },
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });
    return conflict !== null;
  }
  /**
   * Check if a mentor has an active APPROVED unavailability exception period overlapping [startTime, endTime)
   */
  async hasUnavailabilityException(mentorId, startTime, endTime, tx) {
    const client = tx || prisma;
    if (!client.mentorUnavailability?.findFirst) {
      return false;
    }
    const unavail = await client.mentorUnavailability.findFirst({
      where: {
        mentorId,
        status: "APPROVED",
        startDate: { lt: endTime },
        endDate: { gt: startTime }
      }
    });
    return unavail !== null;
  }
  /**
   * Count confirmed and completed appointments for mentor in a local day window
   */
  async countDailyAppointments(mentorId, dayStart, dayEnd, tx) {
    const client = tx || prisma;
    return client.appointment.count({
      where: {
        mentorId,
        status: { in: ["CONFIRMED", "COMPLETED"] },
        startTime: {
          gte: dayStart,
          lt: dayEnd
        }
      }
    });
  }
  /**
   * Create an appointment record inside transaction
   */
  async createAppointment(data, tx) {
    const client = tx || prisma;
    const appointment = await client.appointment.create({
      data: {
        mentorId: data.mentorId,
        parentId: data.parentId,
        studentName: data.studentName,
        studentGrade: data.studentGrade,
        subject: data.subject,
        learningGoal: data.learningGoal,
        startTime: data.startTime,
        endTime: data.endTime,
        status: "CONFIRMED",
        meetingLink: data.meetingLink,
        attendance: {
          create: {
            status: "SCHEDULED"
          }
        }
      },
      include: {
        mentor: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true
              }
            }
          }
        }
      }
    });
    return appointment;
  }
  /**
   * Find appointment by ID with relationships
   */
  async findById(id, tx) {
    const client = tx || prisma;
    return client.appointment.findUnique({
      where: { id },
      include: {
        parent: true,
        mentor: {
          include: {
            user: true
          }
        }
      }
    });
  }
};
var bookingRepository = new BookingRepository();

// server/src/services/email.service.ts
import { EmailDeliveryStatus, EmailRecipientType, NotificationType as NotificationType2 } from "@prisma/client";

// server/src/services/notification.service.ts
import { Role as Role2 } from "@prisma/client";
var NotificationService = class {
  /**
   * Create an in-app notification (for Admin or a specific User)
   */
  async createNotification(params) {
    const { type, title, message, appointmentId, recipientUserId } = params;
    try {
      return await prisma.notification.create({
        data: {
          type,
          title,
          message,
          appointmentId,
          recipientUserId
        }
      });
    } catch (err) {
      if (err?.code === "P2003" || String(err).includes("Foreign key constraint")) {
        return await prisma.notification.create({
          data: {
            type,
            title,
            message,
            recipientUserId
          }
        }).catch(() => null);
      }
      return null;
    }
  }
  /**
   * Create notification for all Admin users
   */
  async createAdminNotification(params) {
    const admins = await prisma.user.findMany({
      where: { role: Role2.ADMIN },
      select: { id: true }
    });
    if (admins.length === 0) {
      return this.createNotification(params);
    }
    const created = await Promise.all(
      admins.map(
        (admin) => this.createNotification({
          ...params,
          recipientUserId: admin.id
        })
      )
    );
    return created[0];
  }
  /**
   * Get notifications for admin / user
   */
  async getNotifications(userId, limit = 50) {
    const where = {};
    if (userId) {
      where.OR = [
        { recipientUserId: userId },
        { recipientUserId: null }
        // Global notifications
      ];
    }
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          appointment: {
            select: {
              id: true,
              studentName: true,
              subject: true,
              status: true
            }
          }
        }
      }),
      prisma.notification.count({
        where: {
          ...where,
          readAt: null
        }
      })
    ]);
    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        appointmentId: n.appointmentId,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        isRead: !!n.readAt,
        createdAt: n.createdAt.toISOString(),
        appointment: n.appointment ? {
          id: n.appointment.id,
          studentName: n.appointment.studentName,
          subject: n.appointment.subject,
          status: n.appointment.status
        } : null
      })),
      unreadCount
    };
  }
  /**
   * Mark single notification as read
   */
  async markAsRead(id) {
    const notif = await prisma.notification.findUnique({
      where: { id }
    });
    if (!notif) {
      throw new AppError("Notification not found", 404);
    }
    return prisma.notification.update({
      where: { id },
      data: { readAt: /* @__PURE__ */ new Date() }
    });
  }
  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    const where = { readAt: null };
    if (userId) {
      where.OR = [{ recipientUserId: userId }, { recipientUserId: null }];
    }
    return prisma.notification.updateMany({
      where,
      data: { readAt: /* @__PURE__ */ new Date() }
    });
  }
};
var notificationService = new NotificationService();

// server/src/services/email.service.ts
import { Temporal as Temporal4 } from "@js-temporal/polyfill";
import dotenv2 from "dotenv";
import path2 from "path";
import fs2 from "fs";
var EmailService = class {
  inMemoryRefreshToken = null;
  cachedAccessToken = null;
  tokenExpiresAt = 0;
  /**
   * Resolves Gmail OAuth configuration from environment variables (or runtime store)
   */
  getOAuthConfig() {
    try {
      const envPath = path2.resolve(process.cwd(), ".env");
      if (fs2.existsSync(envPath)) {
        dotenv2.config({ path: envPath, override: true });
      }
    } catch {
    }
    const port = process.env.PORT || "3000";
    const baseUrl = (process.env.APP_URL || process.env.APP_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, "");
    const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID || "").trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET || "").trim();
    const redirectUri = (process.env.GOOGLE_REDIRECT_URI || process.env.GMAIL_REDIRECT_URI || `${baseUrl}/api/auth/google/callback`).trim();
    const refreshToken = (this.inMemoryRefreshToken || process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN || "").trim();
    const accessToken = (process.env.GOOGLE_ACCESS_TOKEN || process.env.GMAIL_ACCESS_TOKEN || "").trim();
    const senderEmail = (process.env.GMAIL_SENDER_EMAIL || "worklord035@gmail.com").trim();
    const fromName = (process.env.GMAIL_FROM_NAME || "Codeyoung Admissions").trim();
    return {
      clientId,
      clientSecret,
      redirectUri,
      refreshToken,
      accessToken,
      senderEmail,
      fromName,
      baseUrl
    };
  }
  /**
   * Generate the Google OAuth 2.0 authorization URL for worklord035@gmail.com
   */
  getGoogleAuthUrl() {
    const config2 = this.getOAuthConfig();
    if (!config2.clientId) {
      throw new Error("GOOGLE_CLIENT_ID is not set in environment variables");
    }
    const params = new URLSearchParams({
      client_id: config2.clientId,
      redirect_uri: config2.redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/gmail.send",
      access_type: "offline",
      prompt: "consent",
      login_hint: config2.senderEmail
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  /**
   * Exchanges an authorization code for tokens and activates Gmail sending in memory
   */
  async exchangeAuthCode(code) {
    const config2 = this.getOAuthConfig();
    if (!config2.clientId || !config2.clientSecret) {
      throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured in environment");
    }
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const bodyParams = new URLSearchParams({
      code,
      client_id: config2.clientId,
      client_secret: config2.clientSecret,
      redirect_uri: config2.redirectUri,
      grant_type: "authorization_code"
    });
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString()
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token && !data.refresh_token) {
      const errorMsg = data.error_description || data.error || `HTTP ${response.status} token exchange error`;
      throw new Error(`Google OAuth code exchange failed: ${errorMsg}`);
    }
    if (data.access_token) {
      this.cachedAccessToken = data.access_token;
      const expiresInSeconds = typeof data.expires_in === "number" ? data.expires_in : 3600;
      this.tokenExpiresAt = Date.now() + expiresInSeconds * 1e3;
    }
    if (data.refresh_token) {
      this.inMemoryRefreshToken = data.refresh_token;
    }
    return {
      senderEmail: config2.senderEmail,
      refreshToken: data.refresh_token || null
    };
  }
  /**
   * Check status of Gmail OAuth configuration
   */
  getStatus() {
    const config2 = this.getOAuthConfig();
    const hasClientId = Boolean(config2.clientId);
    const hasClientSecret = Boolean(config2.clientSecret);
    const hasRefreshToken = Boolean(config2.refreshToken);
    const isConfigured = hasClientId && hasClientSecret && hasRefreshToken;
    return {
      provider: "Gmail API (OAuth 2.0)",
      senderEmail: config2.senderEmail,
      isConfigured,
      hasClientId,
      hasClientSecret,
      hasRefreshToken,
      redirectUri: config2.redirectUri
    };
  }
  /**
   * Encodes a string to RFC 4648 Base64URL without trailing padding
   */
  toBase64Url(input) {
    return Buffer.from(input, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  /**
   * Constructs an RFC 2822 compliant MIME email string
   */
  buildRfc2822Raw(from, to, subject, body) {
    const encodedSubject = `=?utf-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
    const lines = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      body
    ];
    return lines.join("\r\n");
  }
  /**
   * Obtains a valid Google OAuth 2.0 access token using client credentials and refresh token
   */
  async getValidAccessToken(config2) {
    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt - 6e4) {
      return this.cachedAccessToken;
    }
    if (config2.refreshToken && config2.clientId && config2.clientSecret) {
      const tokenUrl = "https://oauth2.googleapis.com/token";
      const bodyParams = new URLSearchParams({
        client_id: config2.clientId,
        client_secret: config2.clientSecret,
        refresh_token: config2.refreshToken,
        grant_type: "refresh_token"
      });
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: bodyParams.toString()
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.access_token) {
        const errorDetail = data.error_description || data.error || response.statusText || "Failed to refresh token";
        throw new Error(`Gmail OAuth token refresh failed (${response.status}): ${errorDetail}`);
      }
      this.cachedAccessToken = data.access_token;
      const expiresInSeconds = typeof data.expires_in === "number" ? data.expires_in : 3600;
      this.tokenExpiresAt = Date.now() + expiresInSeconds * 1e3;
      return this.cachedAccessToken;
    }
    if (config2.accessToken) {
      return config2.accessToken;
    }
    throw new Error(
      "Missing Gmail OAuth 2.0 credentials. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in environment variables."
    );
  }
  /**
   * Dispatches an email via the Gmail REST API (users.messages.send)
   */
  async sendViaGmailApi(config2, recipientEmail, subject, bodyText) {
    const accessToken = await this.getValidAccessToken(config2);
    const fromHeader = `${config2.fromName} <${config2.senderEmail}>`;
    const rfc2822 = this.buildRfc2822Raw(fromHeader, recipientEmail, subject, bodyText);
    const rawBase64Url = this.toBase64Url(rfc2822);
    const gmailSendUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
    const response = await fetch(gmailSendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        raw: rawBase64Url
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id) {
      const errorMsg = data.error?.message || data.error_description || data.error || `Gmail API responded with HTTP ${response.status}`;
      throw new Error(`Gmail API error: ${errorMsg}`);
    }
    return { messageId: data.id };
  }
  /**
   * Helper to format human-readable time range in specified timezone
   */
  formatDateTimeRange(start, end, timeZone) {
    try {
      const instantStart = Temporal4.Instant.fromEpochMilliseconds(start.getTime());
      const zonedDateTimeStart = instantStart.toZonedDateTimeISO(timeZone);
      const instantEnd = Temporal4.Instant.fromEpochMilliseconds(end.getTime());
      const zonedDateTimeEnd = instantEnd.toZonedDateTimeISO(timeZone);
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ];
      const monthName = months[zonedDateTimeStart.month - 1];
      const dateStr = `${monthName} ${zonedDateTimeStart.day}, ${zonedDateTimeStart.year}`;
      const formatTime = (zdt) => {
        let hour = zdt.hour;
        const minute = String(zdt.minute).padStart(2, "0");
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        return `${String(hour).padStart(2, "0")}:${minute} ${ampm}`;
      };
      const timeStr = `${formatTime(zonedDateTimeStart)} \u2013 ${formatTime(zonedDateTimeEnd)} (${timeZone})`;
      return { dateStr, timeStr };
    } catch {
      return {
        dateStr: start.toLocaleDateString("en-US", { timeZone }),
        timeStr: `${start.toLocaleTimeString("en-US", { timeZone })} \u2013 ${end.toLocaleTimeString("en-US", { timeZone })} (${timeZone})`
      };
    }
  }
  /**
   * Send booking confirmation email to Parent (Dynamic recipient)
   */
  async sendParentBookingConfirmation(params) {
    const { appointmentId, parentEmail, parentName, studentName, subject, startTime, endTime, parentTimezone, meetingLink } = params;
    const { dateStr, timeStr } = this.formatDateTimeRange(startTime, endTime, parentTimezone);
    const bookingCode = `BK-${appointmentId.substring(0, 6).toUpperCase()}`;
    const emailSubject = "Your Codeyoung Trial Class is Confirmed";
    const emailBody = `
Dear ${parentName || "Parent"},

Your child's complimentary 1-on-1 STEM trial class with Codeyoung is confirmed!

Booking Details:
\u2022 Student Name: ${studentName}
\u2022 Subject: ${subject}
\u2022 Date: ${dateStr}
\u2022 Time: ${timeStr}
\u2022 Booking ID: ${bookingCode}

Class Link:
${meetingLink}

Please ensure your child has a laptop/computer with Google Chrome and a working microphone/camera.

Best regards,
The Codeyoung Admissions & Mentorship Team
    `.trim();
    return this.sendEmail({
      appointmentId,
      recipientEmail: parentEmail,
      recipientType: EmailRecipientType.PARENT,
      subject: emailSubject,
      text: emailBody
    });
  }
  /**
   * Send assignment notification email to assigned Mentor (Dynamic stored mentor email)
   */
  async sendMentorBookingNotification(params) {
    const {
      appointmentId,
      mentorEmail,
      mentorName,
      studentName,
      studentGrade,
      subject,
      learningGoal,
      startTime,
      endTime,
      mentorTimezone,
      meetingLink
    } = params;
    const { dateStr, timeStr } = this.formatDateTimeRange(startTime, endTime, mentorTimezone);
    const bookingCode = `BK-${appointmentId.substring(0, 6).toUpperCase()}`;
    const { baseUrl } = this.getOAuthConfig();
    const portalUrl = `${baseUrl}/mentor/dashboard`;
    const emailSubject = "New Trial Class Assigned";
    const emailBody = `
Hi ${mentorName || "Mentor"},

A new live 1-on-1 trial class has been assigned to your calendar:

Session Details:
\u2022 Student Name: ${studentName}
\u2022 Grade / Level: ${studentGrade}
\u2022 Subject: ${subject}
\u2022 Student Learning Goal: ${learningGoal || "Exploratory STEM fundamentals"}
\u2022 Date: ${dateStr}
\u2022 Time: ${timeStr} (Mentor Local Time)
\u2022 Booking ID: ${bookingCode}

Classroom Link:
${meetingLink}

Open Mentor Portal:
${portalUrl}

Please be in the classroom 2 minutes prior to session start.

Best regards,
Codeyoung Academic Operations
    `.trim();
    const normalizedEmail = (mentorEmail || "").trim().toLowerCase();
    const isDemoAddress = normalizedEmail.endsWith("@example.com") || normalizedEmail.endsWith("@test.com") || normalizedEmail.endsWith(".invalid");
    if (isDemoAddress) {
      try {
        await prisma.emailLog.create({
          data: {
            appointmentId,
            recipientEmail: mentorEmail,
            recipientType: EmailRecipientType.MENTOR,
            subject: emailSubject,
            emailContent: emailBody,
            status: EmailDeliveryStatus.NOT_DELIVERED,
            errorMessage: "Demo/example mentor email (@example.com). Gmail delivery skipped; assignment displayed in mentor dashboard notification.",
            sentAt: /* @__PURE__ */ new Date()
          }
        });
      } catch (err) {
        console.warn("Failed to write EmailLog for demo mentor:", err);
      }
      try {
        const mentorUser = await prisma.user.findUnique({
          where: { email: normalizedEmail }
        });
        if (mentorUser) {
          await notificationService.createNotification({
            type: NotificationType2.NEW_TRIAL_BOOKING,
            recipientUserId: mentorUser.id,
            title: "New Trial Class Assigned",
            message: `New 1-on-1 trial class (${subject}) booked for ${studentName} (${dateStr}, ${timeStr}).`,
            appointmentId
          });
        }
      } catch (notifErr) {
        console.warn("Failed to notify mentor user for demo email:", notifErr);
      }
      return null;
    }
    return this.sendEmail({
      appointmentId,
      recipientEmail: mentorEmail,
      recipientType: EmailRecipientType.MENTOR,
      subject: emailSubject,
      text: emailBody
    });
  }
  /**
   * Core delivery dispatcher with database logging and safety guarantees
   */
  async sendEmail(options) {
    const { appointmentId, recipientEmail, recipientType, subject, text } = options;
    let log;
    try {
      log = await prisma.emailLog.create({
        data: {
          appointmentId,
          recipientEmail,
          recipientType,
          subject,
          emailContent: text,
          status: EmailDeliveryStatus.QUEUED
        }
      });
    } catch (err) {
      if (err?.code === "P2003" || String(err).includes("Foreign key constraint")) {
        log = await prisma.emailLog.create({
          data: {
            recipientEmail,
            recipientType,
            subject,
            emailContent: text,
            status: EmailDeliveryStatus.QUEUED
          }
        }).catch(() => null);
      }
    }
    if (!log) {
      return null;
    }
    const config2 = this.getOAuthConfig();
    const hasCredentials = config2.refreshToken && config2.clientId && config2.clientSecret || Boolean(config2.accessToken);
    if (!hasCredentials) {
      const updatedLog = await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: EmailDeliveryStatus.NOT_DELIVERED,
          errorMessage: "Gmail OAuth 2.0 credentials not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN). Delivery safely skipped.",
          sentAt: /* @__PURE__ */ new Date()
        }
      });
      return updatedLog;
    }
    try {
      const result = await this.sendViaGmailApi(config2, recipientEmail, subject, text);
      const updatedLog = await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: EmailDeliveryStatus.SENT,
          providerMessageId: result.messageId,
          sentAt: /* @__PURE__ */ new Date()
        }
      });
      return updatedLog;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown Gmail API email delivery error";
      const updatedLog = await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: EmailDeliveryStatus.FAILED,
          errorMessage: errorMsg,
          sentAt: /* @__PURE__ */ new Date()
        }
      });
      try {
        await notificationService.createAdminNotification({
          type: NotificationType2.EMAIL_FAILED,
          title: `Email Delivery Failed (${recipientType})`,
          message: `Failed to deliver "${subject}" to ${recipientEmail} via Gmail API: ${errorMsg}`,
          appointmentId
        });
      } catch (notifErr) {
        console.error("Failed to create EMAIL_FAILED notification:", notifErr);
      }
      return updatedLog;
    }
  }
  /**
   * Get all email logs for Admin inspection
   */
  async getEmailLogs(limit = 100, status) {
    const where = {};
    if (status) {
      where.status = status;
    }
    const logs = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        appointment: {
          select: {
            id: true,
            studentName: true,
            subject: true
          }
        }
      }
    });
    return logs.map((log) => ({
      id: log.id,
      appointmentId: log.appointmentId,
      recipientEmail: log.recipientEmail,
      recipientType: log.recipientType,
      subject: log.subject,
      status: log.status,
      providerMessageId: log.providerMessageId,
      errorMessage: log.errorMessage,
      emailContent: log.emailContent,
      sentAt: log.sentAt ? log.sentAt.toISOString() : null,
      createdAt: log.createdAt.toISOString(),
      studentName: log.appointment?.studentName || null,
      subjectName: log.appointment?.subject || null
    }));
  }
};
var emailService = new EmailService();

// server/src/services/booking.service.ts
import { NotificationType as NotificationType3 } from "@prisma/client";
var BookingService = class {
  constructor(bookingRepo = bookingRepository, scheduling = schedulingService) {
    this.bookingRepo = bookingRepo;
    this.scheduling = scheduling;
  }
  bookingRepo;
  scheduling;
  /**
   * Generates a collision-safe, human-friendly booking reference
   * Format: BK-XXXXXX (e.g. BK-7K9M2P)
   */
  generateBookingReference() {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    const randomBytes = new Uint8Array(4);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
      for (let i = 0; i < 4; i++) {
        code += chars[randomBytes[i] % chars.length];
      }
    } else {
      for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    const timeSuffix = (Date.now() % 1e4).toString().padStart(4, "0");
    return `BK-${code}${timeSuffix}`;
  }
  /**
   * Helper to evaluate if a mentor's configured working hours contain the full 60-minute appointment
   */
  mentorWorkingHoursContainSlot(mentor, startInstant, endInstant) {
    if (!mentor.isActive) return false;
    let startZdt;
    let endZdt;
    try {
      startZdt = startInstant.toZonedDateTimeISO(mentor.timezone);
      endZdt = endInstant.toZonedDateTimeISO(mentor.timezone);
    } catch {
      return false;
    }
    const mentorLocalDate = startZdt.toPlainDate();
    const dbDayOfWeek = startZdt.dayOfWeek % 7;
    const dayRules = mentor.availability.filter((r) => r.dayOfWeek === dbDayOfWeek);
    if (dayRules.length === 0) return false;
    for (const rule of dayRules) {
      const [startH, startM] = rule.localStart.split(":").map(Number);
      const [endH, endM] = rule.localEnd.split(":").map(Number);
      const ruleStartZdt = mentorLocalDate.toZonedDateTime({
        timeZone: mentor.timezone,
        plainTime: { hour: startH, minute: startM, second: 0, millisecond: 0 }
      });
      const ruleEndZdt = mentorLocalDate.toZonedDateTime({
        timeZone: mentor.timezone,
        plainTime: { hour: endH, minute: endM, second: 0, millisecond: 0 }
      });
      const ruleStartInstant = ruleStartZdt.toInstant();
      const ruleEndInstant = ruleEndZdt.toInstant();
      const fitsAtStart = Temporal5.Instant.compare(startInstant, ruleStartInstant) >= 0;
      const fitsAtEnd = Temporal5.Instant.compare(endInstant, ruleEndInstant) <= 0;
      if (fitsAtStart && fitsAtEnd) {
        return true;
      }
    }
    return false;
  }
  /**
   * Main transactional booking workflow
   */
  async createBooking(input) {
    this.scheduling.validateTimezone(input.timezone);
    let startInstant;
    let endInstant;
    try {
      startInstant = Temporal5.Instant.from(input.startTime);
      endInstant = input.endTime ? Temporal5.Instant.from(input.endTime) : startInstant.add({ hours: 1 });
    } catch {
      throw new AppError("Invalid startTime or endTime ISO timestamp", 400);
    }
    const durationMs = endInstant.epochMilliseconds - startInstant.epochMilliseconds;
    if (durationMs !== 60 * 60 * 1e3) {
      throw new AppError("Trial class duration must be exactly 60 minutes", 400);
    }
    const startDate = new Date(startInstant.epochMilliseconds);
    const endDate = new Date(endInstant.epochMilliseconds);
    try {
      const bookingResult = await this.bookingRepo.executeTransaction(async (tx) => {
        const parentUser2 = await this.bookingRepo.findOrCreateParentUser(
          input.parent.name,
          input.parent.email,
          input.timezone,
          tx
        );
        const activeMentors = await this.bookingRepo.getActiveMentors(tx);
        if (activeMentors.length === 0) {
          throw new AppError("No mentors are available for this time. Please choose another available slot.", 409);
        }
        const eligibleMentorsWithLoad = [];
        for (const mentor of activeMentors) {
          const fitsWorkingHours = this.mentorWorkingHoursContainSlot(mentor, startInstant, endInstant);
          if (!fitsWorkingHours) continue;
          const hasConflict = await this.bookingRepo.hasConflictingAppointment(
            mentor.id,
            startDate,
            endDate,
            tx
          );
          if (hasConflict) continue;
          const hasUnavailability = await this.bookingRepo.hasUnavailabilityException(
            mentor.id,
            startDate,
            endDate,
            tx
          );
          if (hasUnavailability) continue;
          const startZdt = startInstant.toZonedDateTimeISO(mentor.timezone);
          const mentorLocalDate = startZdt.toPlainDate();
          const dayStartZdt = mentorLocalDate.toZonedDateTime({
            timeZone: mentor.timezone,
            plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
          });
          const dayEndZdt = mentorLocalDate.add({ days: 1 }).toZonedDateTime({
            timeZone: mentor.timezone,
            plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
          });
          const dayStart = new Date(dayStartZdt.toInstant().epochMilliseconds);
          const dayEnd = new Date(dayEndZdt.toInstant().epochMilliseconds);
          const dailyCount = await this.bookingRepo.countDailyAppointments(
            mentor.id,
            dayStart,
            dayEnd,
            tx
          );
          if (dailyCount >= 2) {
            continue;
          }
          eligibleMentorsWithLoad.push({
            mentor,
            dailyAppointmentsCount: dailyCount
          });
        }
        if (eligibleMentorsWithLoad.length === 0) {
          throw new AppError("No mentors are available for this time. Please choose another available slot.", 409);
        }
        eligibleMentorsWithLoad.sort((a, b) => {
          if (a.dailyAppointmentsCount !== b.dailyAppointmentsCount) {
            return a.dailyAppointmentsCount - b.dailyAppointmentsCount;
          }
          return a.mentor.id.localeCompare(b.mentor.id);
        });
        const selectedMentor2 = eligibleMentorsWithLoad[0].mentor;
        const bookingId = this.generateBookingReference();
        const meetingLink = `https://demo.codeyoung.com/class/${bookingId}`;
        const subject = input.student.subject?.trim() || input.subject?.trim() || "Coding & STEM Fundamentals";
        const appointment2 = await this.bookingRepo.createAppointment(
          {
            mentorId: selectedMentor2.id,
            parentId: parentUser2.id,
            studentName: input.student.name.trim(),
            studentGrade: input.student.grade.trim(),
            subject,
            learningGoal: input.student.learningGoal ? input.student.learningGoal.trim() : null,
            startTime: startDate,
            endTime: endDate,
            meetingLink
          },
          tx
        );
        return {
          response: {
            bookingId,
            appointmentId: appointment2.id,
            status: appointment2.status,
            student: {
              name: appointment2.studentName,
              grade: appointment2.studentGrade,
              subject: appointment2.subject,
              learningGoal: appointment2.learningGoal
            },
            parent: {
              name: input.parent.name.trim(),
              email: parentUser2.email,
              phone: input.parent.phone ? input.parent.phone.trim() : null
            },
            startTime: startInstant.toString(),
            endTime: endInstant.toString(),
            timezone: input.timezone,
            meetingLink,
            createdAt: appointment2.createdAt.toISOString()
          },
          selectedMentor: selectedMentor2,
          parentUser: parentUser2,
          appointment: appointment2
        };
      });
      const { response, selectedMentor, parentUser, appointment } = bookingResult;
      await Promise.allSettled([
        // 1. Send Parent Email
        emailService.sendParentBookingConfirmation({
          appointmentId: appointment.id,
          parentEmail: parentUser.email,
          parentName: input.parent.name,
          studentName: input.student.name,
          subject: input.student.subject,
          startTime: startDate,
          endTime: endDate,
          parentTimezone: input.timezone,
          meetingLink: response.meetingLink
        }),
        // 2. Send Mentor Email
        emailService.sendMentorBookingNotification({
          appointmentId: appointment.id,
          mentorEmail: selectedMentor.user.email,
          mentorName: selectedMentor.user.fullName,
          studentName: input.student.name,
          studentGrade: input.student.grade,
          subject: input.student.subject,
          learningGoal: input.student.learningGoal,
          startTime: startDate,
          endTime: endDate,
          mentorTimezone: selectedMentor.timezone,
          meetingLink: response.meetingLink
        }),
        // 3. Create Admin Notification
        notificationService.createAdminNotification({
          type: NotificationType3.NEW_TRIAL_BOOKING,
          title: "New Trial Class Booked",
          message: `${input.student.name} (${input.student.subject}) scheduled with ${selectedMentor.user.fullName} for ${response.bookingId}`,
          appointmentId: appointment.id
        })
      ]);
      return response;
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      if (err instanceof Prisma2.PrismaClientKnownRequestError) {
        if (err.code === "P2002" || err.code === "P2034") {
          throw new AppError("This slot was just booked. Please choose another available time.", 409);
        }
      }
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("no_overlapping_mentor_appointments") || errorMessage.includes("exclusion constraint") || errorMessage.includes("could not serialize access")) {
        throw new AppError("This slot was just booked. Please choose another available time.", 409);
      }
      console.error("[BookingService Transaction Error]", err);
      throw err;
    }
  }
};
var bookingService = new BookingService();

// server/src/controllers/booking.controller.ts
var BookingController = class {
  constructor(service = bookingService) {
    this.service = service;
  }
  service;
  /**
   * POST /api/bookings
   * Create a new confirmed trial appointment
   */
  createBooking = async (req, res, next) => {
    try {
      const validatedInput = createBookingSchema.parse(req.body);
      const result = await this.service.createBooking(validatedInput);
      res.status(201).json({
        status: "success",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
};
var bookingController = new BookingController();
var createBooking = bookingController.createBooking;

// server/src/routes/booking.routes.ts
var bookingRouter = Router4();
bookingRouter.post("/bookings", createBooking);

// server/src/routes/auth.routes.ts
import { Router as Router5 } from "express";

// server/src/types/auth.types.ts
import { z as z4 } from "zod";
var loginSchema = z4.object({
  email: z4.string().trim().toLowerCase().email("Invalid email address format"),
  password: z4.string().min(1, "Password is required")
});
var appointmentIdParamSchema = z4.object({
  id: z4.string().uuid("Invalid appointment ID format")
});
var adminAppointmentsQuerySchema = z4.object({
  page: z4.coerce.number().int().min(1).default(1),
  limit: z4.coerce.number().int().min(1).max(100).default(20),
  status: z4.enum(["CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  date: z4.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  sortOrder: z4.enum(["asc", "desc"]).optional().default("asc")
});

// server/src/services/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var AuthService = class {
  /**
   * Authenticate user with email and password, returning signed JWT
   */
  async login(input) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    if (!user || !user.passwordHash) {
      throw new AppError("Invalid email or password.", 401);
    }
    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError("Invalid email or password.", 401);
    }
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName
    };
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });
    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        timezone: user.timezone
      }
    };
  }
  /**
   * Return authenticated user's safe profile
   */
  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        timezone: true
      }
    });
    if (!user) {
      throw new AppError("User profile not found.", 404);
    }
    return user;
  }
};
var authService = new AuthService();

// server/src/controllers/auth.controller.ts
var AuthController = class {
  constructor(service = authService) {
    this.service = service;
  }
  service;
  /**
   * POST /api/auth/login
   */
  login = async (req, res, next) => {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await this.service.login(validated);
      res.status(200).json({
        status: "success",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/auth/me
   */
  getMe = async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ status: "error", message: "Authentication required" });
        return;
      }
      const user = await this.service.getMe(req.user.id);
      res.status(200).json({
        status: "success",
        data: user
      });
    } catch (error) {
      next(error);
    }
  };
};
var authController = new AuthController();
var login = authController.login;
var getMe = authController.getMe;

// server/src/controllers/gmail-oauth.controller.ts
import fs3 from "fs";
import path3 from "path";
function updateEnvFile(key, value) {
  try {
    const envPath = path3.resolve(process.cwd(), ".env");
    let content = "";
    if (fs3.existsSync(envPath)) {
      content = fs3.readFileSync(envPath, "utf-8");
    }
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content = content.trimEnd() + `
${key}=${value}
`;
    }
    fs3.writeFileSync(envPath, content, "utf-8");
  } catch (err) {
    console.error(`[OAuth] Note: Could not auto-write ${key} to .env file:`, err);
  }
}
async function googleAuthorize(req, res) {
  try {
    const authUrl = emailService.getGoogleAuthUrl();
    return res.redirect(authUrl);
  } catch (err) {
    return res.status(400).json({
      error: "Failed to generate Google OAuth authorization URL",
      details: err?.message || String(err)
    });
  }
}
async function googleCallback(req, res) {
  const { code, error } = req.query;
  if (error) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Gmail Authorization Failed</title></head>
        <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; line-height: 1.6;">
          <h2 style="color: #dc2626;">Google Authorization Error</h2>
          <p>Google returned an error: <strong>${error}</strong></p>
          <p><a href="/api/auth/google/authorize">Click here to retry authorization</a></p>
        </body>
      </html>
    `);
  }
  if (!code || typeof code !== "string") {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Missing Authorization Code</title></head>
        <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; line-height: 1.6;">
          <h2 style="color: #dc2626;">Missing Authorization Code</h2>
          <p>No authorization code was received in the query parameters.</p>
          <p><a href="/api/auth/google/authorize">Click here to start authorization</a></p>
        </body>
      </html>
    `);
  }
  try {
    const result = await emailService.exchangeAuthCode(code);
    if (result.refreshToken) {
      updateEnvFile("GOOGLE_REFRESH_TOKEN", result.refreshToken);
    }
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gmail OAuth 2.0 Authorization Successful</title>
        </head>
        <body style="font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 40px auto; padding: 24px; line-height: 1.6; background-color: #f8fafc; color: #1e293b;">
          <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <div style="background: #10b981; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">\u2713</div>
              <h2 style="margin: 0; color: #0f172a;">Gmail Authorization Successful!</h2>
            </div>
            
            <p><strong>Authorized Sender:</strong> <code>${result.senderEmail}</code></p>
            <p>The Gmail API has been successfully authorized with <code>https://www.googleapis.com/auth/gmail.send</code> scope. The credentials have been stored securely in the backend environment.</p>

            <div style="margin-top: 24px;">
              <a href="/admin/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">Return to Dashboard</a>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Token Exchange Failed</title></head>
        <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; line-height: 1.6;">
          <h2 style="color: #dc2626;">OAuth Token Exchange Error</h2>
          <p>Failed to exchange authorization code for tokens:</p>
          <pre style="background: #fee2e2; padding: 12px; border-radius: 6px; color: #991b1b; white-space: pre-wrap;">${err?.message || String(err)}</pre>
          <p><a href="/api/auth/google/authorize">Retry Authorization</a></p>
        </body>
      </html>
    `);
  }
}
async function getGoogleAuthStatus(req, res) {
  const status = emailService.getStatus();
  return res.json(status);
}

// server/src/middleware/auth.middleware.ts
import jwt2 from "jsonwebtoken";
async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Authentication required: Missing or malformed authorization header", 401);
    }
    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
      throw new AppError("Authentication required: Token not provided", 401);
    }
    let payload;
    try {
      payload = jwt2.verify(token, config.jwtSecret);
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        throw new AppError("Session expired. Please log in again.", 401);
      }
      throw new AppError("Invalid authentication token.", 401);
    }
    if (!payload.userId) {
      throw new AppError("Invalid authentication token.", 401);
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        timezone: true
      }
    });
    if (!user) {
      throw new AppError("User account not found or deactivated.", 401);
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

// server/src/routes/auth.routes.ts
var authRouter = Router5();
authRouter.post("/auth/login", login);
authRouter.get("/auth/me", authenticate, getMe);
authRouter.get("/auth/google/authorize", googleAuthorize);
authRouter.get("/auth/google/callback", googleCallback);
authRouter.get("/auth/google/status", getGoogleAuthStatus);

// server/src/routes/parent.routes.ts
import { Router as Router6 } from "express";
import { Role as Role3 } from "@prisma/client";

// server/src/services/parent.service.ts
var ParentService = class {
  /**
   * Get all appointments belonging to the parent user
   */
  async getParentAppointments(parentId) {
    const appointments = await prisma.appointment.findMany({
      where: { parentId },
      orderBy: { startTime: "desc" },
      select: {
        id: true,
        studentName: true,
        studentGrade: true,
        subject: true,
        learningGoal: true,
        startTime: true,
        endTime: true,
        status: true,
        meetingLink: true,
        createdAt: true,
        parent: {
          select: {
            timezone: true
          }
        }
      }
    });
    return appointments.map((app2) => ({
      appointmentId: app2.id,
      studentName: app2.studentName,
      studentGrade: app2.studentGrade,
      subject: app2.subject,
      learningGoal: app2.learningGoal,
      startTime: app2.startTime.toISOString(),
      endTime: app2.endTime.toISOString(),
      parentTimezone: app2.parent.timezone,
      status: app2.status,
      meetingLink: app2.meetingLink,
      createdAt: app2.createdAt.toISOString()
    }));
  }
  /**
   * Get a specific appointment for the parent, ensuring ownership
   */
  async getParentAppointmentById(parentId, appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        parentId
      },
      select: {
        id: true,
        studentName: true,
        studentGrade: true,
        subject: true,
        learningGoal: true,
        startTime: true,
        endTime: true,
        status: true,
        meetingLink: true,
        createdAt: true,
        parent: {
          select: {
            timezone: true,
            fullName: true,
            email: true
          }
        }
      }
    });
    if (!appointment) {
      throw new AppError("Appointment not found.", 404);
    }
    return {
      appointmentId: appointment.id,
      studentName: appointment.studentName,
      studentGrade: appointment.studentGrade,
      subject: appointment.subject,
      learningGoal: appointment.learningGoal,
      startTime: appointment.startTime.toISOString(),
      endTime: appointment.endTime.toISOString(),
      parentTimezone: appointment.parent.timezone,
      status: appointment.status,
      meetingLink: appointment.meetingLink,
      createdAt: appointment.createdAt.toISOString()
    };
  }
};
var parentService = new ParentService();

// server/src/controllers/parent.controller.ts
var ParentController = class {
  constructor(service = parentService) {
    this.service = service;
  }
  service;
  /**
   * GET /api/parent/appointments
   */
  getAppointments = async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("Authentication required.", 401);
      }
      const data = await this.service.getParentAppointments(req.user.id);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/parent/appointments/:id
   */
  getAppointmentById = async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("Authentication required.", 401);
      }
      const { id } = appointmentIdParamSchema.parse(req.params);
      const data = await this.service.getParentAppointmentById(req.user.id, id);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
};
var parentController = new ParentController();
var getParentAppointments = parentController.getAppointments;
var getParentAppointmentById = parentController.getAppointmentById;

// server/src/middleware/role.middleware.ts
function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required.", 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError("Forbidden: You do not have permission to access this resource.", 403)
      );
    }
    next();
  };
}

// server/src/routes/parent.routes.ts
var parentRouter = Router6();
parentRouter.get(
  "/parent/appointments",
  authenticate,
  requireRole(Role3.PARENT, Role3.ADMIN),
  getParentAppointments
);
parentRouter.get(
  "/parent/appointments/:id",
  authenticate,
  requireRole(Role3.PARENT, Role3.ADMIN),
  getParentAppointmentById
);

// server/src/routes/mentor-portal.routes.ts
import { Router as Router7 } from "express";
import { Role as Role5 } from "@prisma/client";

// server/src/services/mentor-portal.service.ts
import { Role as Role4, AppointmentStatus, AttendanceStatus, NotificationType as NotificationType4 } from "@prisma/client";
import { Temporal as Temporal6 } from "@js-temporal/polyfill";
var MentorPortalService = class {
  /**
   * Get mentor profile for the logged in mentor user
   */
  async getMentorProfile(userId) {
    const mentor = await prisma.mentor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            timezone: true,
            role: true
          }
        },
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { localStart: "asc" }]
        },
        unavailabilities: {
          orderBy: { startDate: "asc" }
        }
      }
    });
    if (!mentor) {
      throw new AppError("Mentor profile not found for this account.", 404);
    }
    const todayDaily = await this.getMentorDailyCount(mentor.id, mentor.timezone);
    return {
      mentorId: mentor.id,
      userId: mentor.userId,
      fullName: mentor.user.fullName,
      email: mentor.user.email,
      timezone: mentor.timezone,
      isActive: mentor.isActive,
      dailyCapacity: {
        totalLimit: 2,
        todayCount: todayDaily.count,
        remainingSlots: todayDaily.remaining,
        isLimitReached: todayDaily.isLimitReached
      },
      availability: mentor.availability.map((a) => ({
        id: a.id,
        dayOfWeek: a.dayOfWeek,
        localStart: a.localStart,
        localEnd: a.localEnd
      })),
      unavailabilities: mentor.unavailabilities.map((u) => ({
        id: u.id,
        startDate: u.startDate.toISOString(),
        endDate: u.endDate.toISOString(),
        reason: u.reason || null,
        status: u.status
      }))
    };
  }
  /**
   * Calculate daily count on mentor's local calendar day
   */
  async getMentorDailyCount(mentorId, mentorTimezone, dateStr) {
    let targetPlainDate;
    if (dateStr) {
      try {
        targetPlainDate = Temporal6.PlainDate.from(dateStr);
      } catch {
        targetPlainDate = Temporal6.Now.zonedDateTimeISO(mentorTimezone).toPlainDate();
      }
    } else {
      targetPlainDate = Temporal6.Now.zonedDateTimeISO(mentorTimezone).toPlainDate();
    }
    const dayStartZdt = targetPlainDate.toZonedDateTime({
      timeZone: mentorTimezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
    });
    const dayEndZdt = targetPlainDate.add({ days: 1 }).toZonedDateTime({
      timeZone: mentorTimezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
    });
    const dayStart = new Date(dayStartZdt.toInstant().epochMilliseconds);
    const dayEnd = new Date(dayEndZdt.toInstant().epochMilliseconds);
    const count = await prisma.appointment.count({
      where: {
        mentorId,
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED] },
        startTime: {
          gte: dayStart,
          lt: dayEnd
        }
      }
    });
    return {
      date: targetPlainDate.toString(),
      count,
      remaining: Math.max(0, 2 - count),
      isLimitReached: count >= 2
    };
  }
  /**
   * Add unavailability exception for logged-in mentor
   * Must be submitted at least 24 hours before the requested start time.
   * Initial status is PENDING.
   */
  async addMentorUnavailability(userId, input) {
    const mentor = await prisma.mentor.findUnique({ where: { userId } });
    if (!mentor) {
      throw new AppError("Mentor profile not found.", 404);
    }
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError("Invalid start or end date format.", 400);
    }
    if (start >= end) {
      throw new AppError("End date must be after start date.", 400);
    }
    const now = Date.now();
    const minAdvanceMs = 24 * 60 * 60 * 1e3;
    if (start.getTime() - now < minAdvanceMs) {
      throw new AppError("Unavailability requests must be submitted at least 24 hours in advance.", 400);
    }
    const created = await prisma.mentorUnavailability.create({
      data: {
        mentorId: mentor.id,
        startDate: start,
        endDate: end,
        reason: input.reason?.trim() || "Unavailable period",
        status: "PENDING"
      }
    });
    return {
      id: created.id,
      mentorId: created.mentorId,
      startDate: created.startDate.toISOString(),
      endDate: created.endDate.toISOString(),
      reason: created.reason,
      status: created.status
    };
  }
  /**
   * Delete unavailability exception for logged-in mentor
   */
  async deleteMentorUnavailability(userId, unavailabilityId) {
    const mentor = await prisma.mentor.findUnique({ where: { userId } });
    if (!mentor) {
      throw new AppError("Mentor profile not found.", 404);
    }
    const existing = await prisma.mentorUnavailability.findFirst({
      where: { id: unavailabilityId, mentorId: mentor.id }
    });
    if (!existing) {
      throw new AppError("Unavailability record not found or unauthorized.", 404);
    }
    await prisma.mentorUnavailability.delete({
      where: { id: unavailabilityId }
    });
    return { success: true, message: "Unavailability exception deleted successfully." };
  }
  /**
   * Get date-wise mentor schedule and hourly availability in mentor's IANA timezone
   */
  async getMentorScheduleAndAvailability(userId, targetDateStr) {
    const mentor = await prisma.mentor.findUnique({
      where: { userId },
      include: {
        user: true,
        availability: true,
        unavailabilities: true
      }
    });
    if (!mentor) {
      throw new AppError("Mentor profile not found.", 404);
    }
    let targetPlainDate;
    if (targetDateStr) {
      try {
        targetPlainDate = Temporal6.PlainDate.from(targetDateStr);
      } catch {
        targetPlainDate = Temporal6.Now.zonedDateTimeISO(mentor.timezone).toPlainDate();
      }
    } else {
      targetPlainDate = Temporal6.Now.zonedDateTimeISO(mentor.timezone).toPlainDate();
    }
    const dateStr = targetPlainDate.toString();
    const dayOfWeek = targetPlainDate.dayOfWeek % 7;
    const dayStartZdt = targetPlainDate.toZonedDateTime({
      timeZone: mentor.timezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
    });
    const dayEndZdt = targetPlainDate.add({ days: 1 }).toZonedDateTime({
      timeZone: mentor.timezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
    });
    const dayStart = new Date(dayStartZdt.toInstant().epochMilliseconds);
    const dayEnd = new Date(dayEndZdt.toInstant().epochMilliseconds);
    const appointments = await prisma.appointment.findMany({
      where: {
        mentorId: mentor.id,
        startTime: {
          gte: dayStart,
          lt: dayEnd
        }
      },
      orderBy: { startTime: "asc" },
      include: {
        parent: {
          select: {
            fullName: true,
            email: true,
            timezone: true
          }
        },
        attendance: true
      }
    });
    const activeAppointmentsCount = appointments.filter(
      (a) => a.status === AppointmentStatus.CONFIRMED || a.status === AppointmentStatus.COMPLETED
    ).length;
    const remainingSlots = Math.max(0, 2 - activeAppointmentsCount);
    const isLimitReached = activeAppointmentsCount >= 2;
    const matchingRules = mentor.availability.filter((r) => r.dayOfWeek === dayOfWeek);
    const timeSlots = [];
    for (const rule of matchingRules) {
      const [startHour, startMin] = rule.localStart.split(":").map(Number);
      const [endHour, endMin] = rule.localEnd.split(":").map(Number);
      let currentHour = startHour;
      let currentMinute = startMin;
      while (currentHour < endHour || currentHour === endHour && currentMinute + 60 <= endMin) {
        const nextHour = currentHour + 1;
        const nextMinute = currentMinute;
        const slotStartZdt = targetPlainDate.toZonedDateTime({
          timeZone: mentor.timezone,
          plainTime: { hour: currentHour, minute: currentMinute, second: 0, millisecond: 0 }
        });
        const slotEndZdt = targetPlainDate.toZonedDateTime({
          timeZone: mentor.timezone,
          plainTime: { hour: nextHour, minute: nextMinute, second: 0, millisecond: 0 }
        });
        const slotStartInstant = slotStartZdt.toInstant();
        const slotEndInstant = slotEndZdt.toInstant();
        const matchedApp = appointments.find((app2) => {
          const appStartMs = app2.startTime.getTime();
          const appEndMs = app2.endTime.getTime();
          return app2.status !== AppointmentStatus.CANCELLED && appStartMs < slotEndInstant.epochMilliseconds && appEndMs > slotStartInstant.epochMilliseconds;
        });
        const isUnavailable = mentor.unavailabilities.some((u) => {
          if (u.status !== "APPROVED") return false;
          const uStartMs = u.startDate.getTime();
          const uEndMs = u.endDate.getTime();
          return uStartMs < slotEndInstant.epochMilliseconds && uEndMs > slotStartInstant.epochMilliseconds;
        });
        const formatSlotTime = (h, m) => {
          const ampm = h >= 12 ? "PM" : "AM";
          const hr = h % 12 || 12;
          return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
        };
        const localStartFormatted = formatSlotTime(currentHour, currentMinute);
        const localEndFormatted = formatSlotTime(nextHour, nextMinute);
        if (matchedApp) {
          timeSlots.push({
            localStart: localStartFormatted,
            localEnd: localEndFormatted,
            startTimeIso: slotStartZdt.toString(),
            endTimeIso: slotEndZdt.toString(),
            status: "SCHEDULED",
            appointment: {
              id: matchedApp.id,
              studentName: matchedApp.studentName,
              studentGrade: matchedApp.studentGrade,
              subject: matchedApp.subject,
              learningGoal: matchedApp.learningGoal,
              parentName: matchedApp.parent.fullName,
              status: matchedApp.status,
              meetingLink: matchedApp.meetingLink
            }
          });
        } else if (isUnavailable) {
          timeSlots.push({
            localStart: localStartFormatted,
            localEnd: localEndFormatted,
            startTimeIso: slotStartZdt.toString(),
            endTimeIso: slotEndZdt.toString(),
            status: "UNAVAILABLE"
          });
        } else {
          timeSlots.push({
            localStart: localStartFormatted,
            localEnd: localEndFormatted,
            startTimeIso: slotStartZdt.toString(),
            endTimeIso: slotEndZdt.toString(),
            status: isLimitReached ? "LIMIT_REACHED" : "AVAILABLE"
          });
        }
        currentHour += 1;
      }
    }
    return {
      mentor: {
        id: mentor.id,
        fullName: mentor.user.fullName,
        email: mentor.user.email,
        timezone: mentor.timezone,
        isActive: mentor.isActive
      },
      date: dateStr,
      dailyCapacity: {
        totalLimit: 2,
        todayCount: activeAppointmentsCount,
        remainingSlots,
        isLimitReached
      },
      timeSlots,
      unavailabilities: mentor.unavailabilities.map((u) => ({
        id: u.id,
        startDate: u.startDate.toISOString(),
        endDate: u.endDate.toISOString(),
        reason: u.reason || null,
        status: u.status
      })),
      appointments: appointments.map((app2) => ({
        id: app2.id,
        bookingId: `BK-${app2.id.substring(0, 6).toUpperCase()}`,
        studentName: app2.studentName,
        studentGrade: app2.studentGrade,
        subject: app2.subject,
        learningGoal: app2.learningGoal,
        parentName: app2.parent.fullName,
        parentEmail: app2.parent.email,
        parentTimezone: app2.parent.timezone,
        startTime: app2.startTime.toISOString(),
        endTime: app2.endTime.toISOString(),
        mentorTimezone: mentor.timezone,
        status: app2.status,
        meetingLink: app2.meetingLink,
        attendance: app2.attendance ? {
          id: app2.attendance.id,
          status: app2.attendance.status,
          joinedAt: app2.attendance.joinedAt?.toISOString() || null,
          completedAt: app2.attendance.completedAt?.toISOString() || null,
          mentorNotes: app2.attendance.mentorNotes
        } : null,
        createdAt: app2.createdAt.toISOString()
      }))
    };
  }
  /**
   * Get all appointments assigned to the logged in mentor
   */
  async getMentorAppointments(userId) {
    const mentor = await prisma.mentor.findUnique({
      where: { userId }
    });
    if (!mentor) {
      throw new AppError("Mentor profile not found.", 404);
    }
    const todayDaily = await this.getMentorDailyCount(mentor.id, mentor.timezone);
    const appointments = await prisma.appointment.findMany({
      where: { mentorId: mentor.id },
      orderBy: { startTime: "desc" },
      include: {
        parent: {
          select: {
            fullName: true,
            email: true,
            timezone: true
          }
        },
        attendance: true
      }
    });
    return {
      dailyCapacity: {
        totalLimit: 2,
        todayCount: todayDaily.count,
        remainingSlots: todayDaily.remaining,
        isLimitReached: todayDaily.isLimitReached,
        mentorTimezone: mentor.timezone
      },
      appointments: appointments.map((app2) => ({
        appointmentId: app2.id,
        bookingId: `BK-${app2.id.substring(0, 6).toUpperCase()}`,
        studentName: app2.studentName,
        studentGrade: app2.studentGrade,
        subject: app2.subject,
        learningGoal: app2.learningGoal,
        parentName: app2.parent.fullName,
        parentEmail: app2.parent.email,
        parentTimezone: app2.parent.timezone,
        startTime: app2.startTime.toISOString(),
        endTime: app2.endTime.toISOString(),
        mentorTimezone: mentor.timezone,
        status: app2.status,
        meetingLink: app2.meetingLink,
        attendance: app2.attendance ? {
          id: app2.attendance.id,
          status: app2.attendance.status,
          joinedAt: app2.attendance.joinedAt?.toISOString() || null,
          completedAt: app2.attendance.completedAt?.toISOString() || null,
          mentorNotes: app2.attendance.mentorNotes
        } : null,
        createdAt: app2.createdAt.toISOString()
      }))
    };
  }
  /**
   * Get single appointment assigned to mentor
   */
  async getMentorAppointmentById(userId, appointmentId) {
    const mentor = await prisma.mentor.findUnique({
      where: { userId }
    });
    if (!mentor) {
      throw new AppError("Mentor profile not found.", 404);
    }
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        mentorId: mentor.id
      },
      include: {
        parent: {
          select: {
            fullName: true,
            email: true,
            timezone: true
          }
        },
        attendance: true
      }
    });
    if (!appointment) {
      throw new AppError("Appointment not found.", 404);
    }
    return {
      appointmentId: appointment.id,
      bookingId: `BK-${appointment.id.substring(0, 6).toUpperCase()}`,
      studentName: appointment.studentName,
      studentGrade: appointment.studentGrade,
      subject: appointment.subject,
      learningGoal: appointment.learningGoal,
      parentName: appointment.parent.fullName,
      parentEmail: appointment.parent.email,
      parentTimezone: appointment.parent.timezone,
      startTime: appointment.startTime.toISOString(),
      endTime: appointment.endTime.toISOString(),
      mentorTimezone: mentor.timezone,
      status: appointment.status,
      meetingLink: appointment.meetingLink,
      attendance: appointment.attendance ? {
        id: appointment.attendance.id,
        status: appointment.attendance.status,
        joinedAt: appointment.attendance.joinedAt?.toISOString() || null,
        completedAt: appointment.attendance.completedAt?.toISOString() || null,
        mentorNotes: appointment.attendance.mentorNotes
      } : null,
      createdAt: appointment.createdAt.toISOString()
    };
  }
  /**
   * Record attendance join timestamp
   */
  async recordClassJoin(userId, appointmentId) {
    const mentor = await prisma.mentor.findUnique({
      where: { userId }
    });
    if (!mentor) {
      throw new AppError("Mentor profile not found.", 404);
    }
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, mentorId: mentor.id },
      include: { attendance: true }
    });
    if (!appointment) {
      throw new AppError("Appointment not found.", 404);
    }
    return prisma.trialAttendance.upsert({
      where: { appointmentId },
      update: {
        joinedAt: /* @__PURE__ */ new Date(),
        status: AttendanceStatus.JOINED
      },
      create: {
        appointmentId,
        joinedAt: /* @__PURE__ */ new Date(),
        status: AttendanceStatus.JOINED
      }
    });
  }
  /**
   * Mark appointment as COMPLETED and record attendance completedAt
   */
  async completeAppointment(userId, appointmentId, userRole, mentorNotes) {
    let mentorId;
    let mentorName = "Mentor";
    if (userRole === Role4.MENTOR) {
      const mentor = await prisma.mentor.findUnique({
        where: { userId },
        include: { user: true }
      });
      if (!mentor) {
        throw new AppError("Mentor profile not found.", 404);
      }
      mentorId = mentor.id;
      mentorName = mentor.user.fullName;
    }
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { mentor: { include: { user: true } } }
    });
    if (!appointment) {
      throw new AppError("Appointment not found.", 404);
    }
    if (mentorId && appointment.mentorId !== mentorId) {
      throw new AppError("Appointment not found.", 404);
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new AppError("Cannot complete a cancelled appointment.", 400);
    }
    const now = /* @__PURE__ */ new Date();
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.COMPLETED }
    });
    await prisma.trialAttendance.upsert({
      where: { appointmentId },
      update: {
        status: AttendanceStatus.COMPLETED,
        completedAt: now,
        mentorNotes: mentorNotes || void 0
      },
      create: {
        appointmentId,
        status: AttendanceStatus.COMPLETED,
        completedAt: now,
        mentorNotes: mentorNotes || void 0
      }
    });
    try {
      await notificationService.createAdminNotification({
        type: NotificationType4.TRIAL_COMPLETED,
        title: "Trial Class Completed",
        message: `${appointment.studentName} completed trial with ${appointment.mentor.user.fullName}`,
        appointmentId: appointment.id
      });
    } catch (err) {
      console.error("Failed to create TRIAL_COMPLETED admin notification:", err);
    }
    return updated;
  }
};
var mentorPortalService = new MentorPortalService();

// server/src/controllers/mentor-portal.controller.ts
var MentorPortalController = class {
  constructor(service = mentorPortalService) {
    this.service = service;
  }
  service;
  /**
   * GET /api/mentor/profile
   */
  getProfile = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Authentication required.", 401);
      const data = await this.service.getMentorProfile(req.user.id);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * POST /api/mentor/unavailability - Add unavailable exception period
   */
  addUnavailability = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Authentication required.", 401);
      const { startDate, endDate, reason } = req.body;
      if (!startDate || !endDate) {
        throw new AppError("startDate and endDate are required.", 400);
      }
      const data = await this.service.addMentorUnavailability(req.user.id, {
        startDate,
        endDate,
        reason
      });
      res.status(201).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * DELETE /api/mentor/unavailability/:unavailabilityId
   */
  deleteUnavailability = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Authentication required.", 401);
      const { unavailabilityId } = req.params;
      const data = await this.service.deleteMentorUnavailability(req.user.id, unavailabilityId);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/mentor/schedule?date=YYYY-MM-DD
   */
  getSchedule = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Authentication required.", 401);
      const dateStr = req.query.date ? String(req.query.date) : void 0;
      const data = await this.service.getMentorScheduleAndAvailability(req.user.id, dateStr);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/mentor/appointments
   */
  getAppointments = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Authentication required.", 401);
      const data = await this.service.getMentorAppointments(req.user.id);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/mentor/appointments/:id
   */
  getAppointmentById = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Authentication required.", 401);
      const { id } = appointmentIdParamSchema.parse(req.params);
      const data = await this.service.getMentorAppointmentById(req.user.id, id);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * POST /api/mentor/appointments/:id/join
   */
  joinClass = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Authentication required.", 401);
      const { id } = appointmentIdParamSchema.parse(req.params);
      const attendance = await this.service.recordClassJoin(req.user.id, id);
      res.status(200).json({
        status: "success",
        data: attendance
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * PATCH /api/mentor/appointments/:id/complete
   */
  completeAppointment = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Authentication required.", 401);
      const { id } = appointmentIdParamSchema.parse(req.params);
      const mentorNotes = req.body?.mentorNotes ? String(req.body.mentorNotes) : void 0;
      const data = await this.service.completeAppointment(req.user.id, id, req.user.role, mentorNotes);
      res.status(200).json({
        status: "success",
        data: {
          appointmentId: data.id,
          status: data.status,
          updatedAt: data.updatedAt.toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  };
};
var mentorPortalController = new MentorPortalController();
var getMentorProfile = mentorPortalController.getProfile;
var addMentorUnavailability = mentorPortalController.addUnavailability;
var deleteMentorUnavailability = mentorPortalController.deleteUnavailability;
var getMentorSchedule = mentorPortalController.getSchedule;
var getMentorAppointments = mentorPortalController.getAppointments;
var getMentorAppointmentById = mentorPortalController.getAppointmentById;
var joinMentorClass = mentorPortalController.joinClass;
var completeMentorAppointment = mentorPortalController.completeAppointment;

// server/src/routes/mentor-portal.routes.ts
var mentorPortalRouter = Router7();
mentorPortalRouter.get(
  "/mentor/profile",
  authenticate,
  requireRole(Role5.MENTOR, Role5.ADMIN),
  getMentorProfile
);
mentorPortalRouter.post(
  "/mentor/unavailability",
  authenticate,
  requireRole(Role5.MENTOR, Role5.ADMIN),
  addMentorUnavailability
);
mentorPortalRouter.delete(
  "/mentor/unavailability/:unavailabilityId",
  authenticate,
  requireRole(Role5.MENTOR, Role5.ADMIN),
  deleteMentorUnavailability
);
mentorPortalRouter.get(
  "/mentor/schedule",
  authenticate,
  requireRole(Role5.MENTOR, Role5.ADMIN),
  getMentorSchedule
);
mentorPortalRouter.get(
  "/mentor/appointments",
  authenticate,
  requireRole(Role5.MENTOR, Role5.ADMIN),
  getMentorAppointments
);
mentorPortalRouter.get(
  "/mentor/appointments/:id",
  authenticate,
  requireRole(Role5.MENTOR, Role5.ADMIN),
  getMentorAppointmentById
);
mentorPortalRouter.post(
  "/mentor/appointments/:id/join",
  authenticate,
  requireRole(Role5.MENTOR, Role5.ADMIN),
  joinMentorClass
);
mentorPortalRouter.patch(
  "/mentor/appointments/:id/complete",
  authenticate,
  requireRole(Role5.MENTOR, Role5.ADMIN),
  completeMentorAppointment
);

// server/src/routes/admin.routes.ts
import { Router as Router8 } from "express";
import { Role as Role7 } from "@prisma/client";

// server/src/services/admin.service.ts
import { AppointmentStatus as AppointmentStatus2, AttendanceStatus as AttendanceStatus2, Role as Role6 } from "@prisma/client";
import bcrypt2 from "bcryptjs";
import { Temporal as Temporal7 } from "@js-temporal/polyfill";
var AdminService = class {
  /**
   * Get list of all mentors with user profiles, availability, unavailabilities, and real capacity
   */
  async getAdminMentors() {
    const mentors = await prisma.mentor.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            timezone: true
          }
        },
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { localStart: "asc" }]
        },
        unavailabilities: {
          orderBy: { startDate: "asc" }
        },
        _count: {
          select: {
            appointments: {
              where: { status: { in: ["CONFIRMED", "COMPLETED"] } }
            }
          }
        }
      },
      orderBy: [
        { isActive: "desc" },
        { user: { email: "asc" } }
      ]
    });
    const mentorsWithCapacity = await Promise.all(
      mentors.map(async (m) => {
        const todayPlain = Temporal7.Now.zonedDateTimeISO(m.timezone).toPlainDate();
        const startZdt = todayPlain.toZonedDateTime({
          timeZone: m.timezone,
          plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
        });
        const endZdt = todayPlain.add({ days: 1 }).toZonedDateTime({
          timeZone: m.timezone,
          plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
        });
        const todayStart = new Date(startZdt.toInstant().epochMilliseconds);
        const todayEnd = new Date(endZdt.toInstant().epochMilliseconds);
        const todayCount = await prisma.appointment.count({
          where: {
            mentorId: m.id,
            status: { in: [AppointmentStatus2.CONFIRMED, AppointmentStatus2.COMPLETED] },
            startTime: { gte: todayStart, lt: todayEnd }
          }
        });
        return {
          id: m.id,
          userId: m.userId,
          fullName: m.user.fullName,
          email: m.user.email,
          timezone: m.timezone,
          isActive: m.isActive,
          activeAppointmentsCount: m._count.appointments,
          todayAppointmentsCount: todayCount,
          dailyLimit: 2,
          remainingTodayCapacity: Math.max(0, 2 - todayCount),
          isDailyLimitReached: todayCount >= 2,
          availability: m.availability.map((a) => ({
            id: a.id,
            dayOfWeek: a.dayOfWeek,
            localStart: a.localStart,
            localEnd: a.localEnd
          })),
          unavailabilities: m.unavailabilities.map((u) => ({
            id: u.id,
            startDate: u.startDate.toISOString(),
            endDate: u.endDate.toISOString(),
            reason: u.reason || null,
            status: u.status
          }))
        };
      })
    );
    return mentorsWithCapacity;
  }
  /**
   * Terminate a mentor (Admin only) - deactivates mentor without deleting historical data
   */
  async terminateMentor(mentorId) {
    const mentor = await prisma.mentor.findUnique({
      where: { id: mentorId },
      include: { user: true }
    });
    if (!mentor) {
      throw new AppError("Mentor not found.", 404);
    }
    const updated = await prisma.mentor.update({
      where: { id: mentorId },
      data: { isActive: false },
      include: { user: true }
    });
    return {
      id: updated.id,
      userId: updated.userId,
      fullName: updated.user.fullName,
      email: updated.user.email,
      isActive: updated.isActive,
      message: `Mentor ${updated.user.fullName} (${updated.user.email}) has been terminated. They will not receive new trial bookings. Historical records are preserved.`
    };
  }
  /**
   * Reactivate a mentor (Admin only) - restores mentor to scheduling pool
   */
  async reactivateMentor(mentorId) {
    const mentor = await prisma.mentor.findUnique({
      where: { id: mentorId },
      include: { user: true }
    });
    if (!mentor) {
      throw new AppError("Mentor not found.", 404);
    }
    const updated = await prisma.mentor.update({
      where: { id: mentorId },
      data: { isActive: true },
      include: { user: true }
    });
    return {
      id: updated.id,
      userId: updated.userId,
      fullName: updated.user.fullName,
      email: updated.user.email,
      isActive: updated.isActive,
      message: `Mentor ${updated.user.fullName} (${updated.user.email}) has been reactivated and added back to daily scheduling capacity.`
    };
  }
  /**
   * Add an unavailability exception period for a mentor (Admin only)
   */
  async addMentorUnavailability(mentorId, input) {
    const mentor = await prisma.mentor.findUnique({ where: { id: mentorId } });
    if (!mentor) {
      throw new AppError("Mentor not found.", 404);
    }
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError("Invalid start or end date format.", 400);
    }
    if (start >= end) {
      throw new AppError("End date must be after start date.", 400);
    }
    const created = await prisma.mentorUnavailability.create({
      data: {
        mentorId,
        startDate: start,
        endDate: end,
        reason: input.reason?.trim() || "Unavailable period",
        status: "APPROVED"
      }
    });
    return {
      id: created.id,
      mentorId: created.mentorId,
      startDate: created.startDate.toISOString(),
      endDate: created.endDate.toISOString(),
      reason: created.reason,
      status: created.status
    };
  }
  /**
   * Approve a mentor unavailability request (Admin only)
   */
  async approveMentorUnavailability(unavailabilityId) {
    const unavail = await prisma.mentorUnavailability.findUnique({
      where: { id: unavailabilityId },
      include: { mentor: { include: { user: true } } }
    });
    if (!unavail) {
      throw new AppError("Unavailability record not found.", 404);
    }
    const updated = await prisma.mentorUnavailability.update({
      where: { id: unavailabilityId },
      data: { status: "APPROVED" }
    });
    return {
      id: updated.id,
      mentorId: updated.mentorId,
      mentorName: unavail.mentor.user.fullName,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      status: updated.status,
      reason: updated.reason,
      message: "Unavailability request approved. Scheduler will block this time window."
    };
  }
  /**
   * Reject a mentor unavailability request (Admin only)
   */
  async rejectMentorUnavailability(unavailabilityId) {
    const unavail = await prisma.mentorUnavailability.findUnique({
      where: { id: unavailabilityId },
      include: { mentor: { include: { user: true } } }
    });
    if (!unavail) {
      throw new AppError("Unavailability record not found.", 404);
    }
    const updated = await prisma.mentorUnavailability.update({
      where: { id: unavailabilityId },
      data: { status: "REJECTED" }
    });
    return {
      id: updated.id,
      mentorId: updated.mentorId,
      mentorName: unavail.mentor.user.fullName,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      status: updated.status,
      reason: updated.reason,
      message: "Unavailability request rejected."
    };
  }
  /**
   * Delete an unavailability exception period
   */
  async deleteMentorUnavailability(unavailabilityId) {
    const existing = await prisma.mentorUnavailability.findUnique({
      where: { id: unavailabilityId }
    });
    if (!existing) {
      throw new AppError("Unavailability record not found.", 404);
    }
    await prisma.mentorUnavailability.delete({
      where: { id: unavailabilityId }
    });
    return { success: true, message: "Unavailability exception deleted successfully." };
  }
  /**
   * Update mentor recurring working hours availability
   */
  async updateMentorAvailability(mentorId, availabilities) {
    const mentor = await prisma.mentor.findUnique({ where: { id: mentorId } });
    if (!mentor) {
      throw new AppError("Mentor not found.", 404);
    }
    await prisma.mentorAvailability.deleteMany({
      where: { mentorId }
    });
    for (const rule of availabilities) {
      await prisma.mentorAvailability.create({
        data: {
          mentorId,
          dayOfWeek: rule.dayOfWeek,
          localStart: rule.localStart,
          localEnd: rule.localEnd
        }
      });
    }
    const updated = await prisma.mentorAvailability.findMany({
      where: { mentorId },
      orderBy: [{ dayOfWeek: "asc" }, { localStart: "asc" }]
    });
    return updated;
  }
  /**
   * Create a new mentor (Admin only)
   */
  async createMentor(input) {
    const email = input.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("A user with this email address already exists.", 400);
    }
    const rawPassword = input.password || process.env.DEFAULT_MENTOR_PASSWORD || "Mentor@1234";
    const passwordHash = await bcrypt2.hash(rawPassword, 10);
    const timezone = input.timezone || "Asia/Kolkata";
    const newMentor = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: input.fullName.trim(),
          email,
          passwordHash,
          role: Role6.MENTOR,
          timezone
        }
      });
      const mentor = await tx.mentor.create({
        data: {
          userId: user.id,
          timezone,
          isActive: input.isActive !== void 0 ? input.isActive : true
        }
      });
      const defaultAvailabilities = input.availabilities || [
        { dayOfWeek: 1, localStart: "16:00", localEnd: "21:00" },
        { dayOfWeek: 2, localStart: "16:00", localEnd: "21:00" },
        { dayOfWeek: 3, localStart: "16:00", localEnd: "21:00" },
        { dayOfWeek: 4, localStart: "16:00", localEnd: "21:00" },
        { dayOfWeek: 5, localStart: "16:00", localEnd: "21:00" },
        { dayOfWeek: 6, localStart: "10:00", localEnd: "18:00" }
      ];
      for (const rule of defaultAvailabilities) {
        await tx.mentorAvailability.create({
          data: {
            mentorId: mentor.id,
            dayOfWeek: rule.dayOfWeek,
            localStart: rule.localStart,
            localEnd: rule.localEnd
          }
        });
      }
      return { user, mentor };
    });
    return {
      id: newMentor.mentor.id,
      userId: newMentor.user.id,
      fullName: newMentor.user.fullName,
      email: newMentor.user.email,
      timezone: newMentor.mentor.timezone,
      isActive: newMentor.mentor.isActive
    };
  }
  /**
   * Admin inspection of a specific mentor's full dashboard and schedule
   */
  async getAdminMentorDashboard(mentorId, targetDateStr) {
    const mentor = await prisma.mentor.findUnique({
      where: { id: mentorId },
      include: {
        user: true,
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { localStart: "asc" }]
        },
        unavailabilities: {
          orderBy: { startDate: "asc" }
        }
      }
    });
    if (!mentor) {
      throw new AppError("Mentor not found.", 404);
    }
    let targetPlainDate;
    if (targetDateStr) {
      try {
        targetPlainDate = Temporal7.PlainDate.from(targetDateStr);
      } catch {
        targetPlainDate = Temporal7.Now.zonedDateTimeISO(mentor.timezone).toPlainDate();
      }
    } else {
      targetPlainDate = Temporal7.Now.zonedDateTimeISO(mentor.timezone).toPlainDate();
    }
    const dayStartZdt = targetPlainDate.toZonedDateTime({
      timeZone: mentor.timezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
    });
    const dayEndZdt = targetPlainDate.add({ days: 1 }).toZonedDateTime({
      timeZone: mentor.timezone,
      plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
    });
    const dayStart = new Date(dayStartZdt.toInstant().epochMilliseconds);
    const dayEnd = new Date(dayEndZdt.toInstant().epochMilliseconds);
    const [todayAppointments, allAppointments] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          mentorId: mentor.id,
          startTime: { gte: dayStart, lt: dayEnd }
        },
        orderBy: { startTime: "asc" },
        include: {
          parent: { select: { fullName: true, email: true, timezone: true } },
          attendance: true
        }
      }),
      prisma.appointment.findMany({
        where: { mentorId: mentor.id },
        orderBy: { startTime: "desc" },
        take: 30,
        include: {
          parent: { select: { fullName: true, email: true, timezone: true } },
          attendance: true
        }
      })
    ]);
    const activeTodayCount = todayAppointments.filter(
      (a) => a.status === AppointmentStatus2.CONFIRMED || a.status === AppointmentStatus2.COMPLETED
    ).length;
    const completedTrials = allAppointments.filter(
      (a) => a.status === AppointmentStatus2.COMPLETED || a.attendance?.status === AttendanceStatus2.COMPLETED
    );
    return {
      mentor: {
        id: mentor.id,
        fullName: mentor.user.fullName,
        email: mentor.user.email,
        timezone: mentor.timezone,
        isActive: mentor.isActive
      },
      date: targetPlainDate.toString(),
      dailyCapacity: {
        totalLimit: 2,
        todayCount: activeTodayCount,
        remainingSlots: Math.max(0, 2 - activeTodayCount),
        isLimitReached: activeTodayCount >= 2
      },
      todaySchedule: todayAppointments.map((app2) => ({
        id: app2.id,
        bookingId: `BK-${app2.id.substring(0, 6).toUpperCase()}`,
        studentName: app2.studentName,
        studentGrade: app2.studentGrade,
        subject: app2.subject,
        learningGoal: app2.learningGoal,
        parentName: app2.parent.fullName,
        parentEmail: app2.parent.email,
        startTime: app2.startTime.toISOString(),
        endTime: app2.endTime.toISOString(),
        status: app2.status,
        meetingLink: app2.meetingLink,
        attendance: app2.attendance
      })),
      allAppointments: allAppointments.map((app2) => ({
        id: app2.id,
        bookingId: `BK-${app2.id.substring(0, 6).toUpperCase()}`,
        studentName: app2.studentName,
        studentGrade: app2.studentGrade,
        subject: app2.subject,
        parentName: app2.parent.fullName,
        parentEmail: app2.parent.email,
        startTime: app2.startTime.toISOString(),
        endTime: app2.endTime.toISOString(),
        status: app2.status,
        meetingLink: app2.meetingLink,
        attendance: app2.attendance
      })),
      unavailabilities: mentor.unavailabilities.map((u) => ({
        id: u.id,
        startDate: u.startDate.toISOString(),
        endDate: u.endDate.toISOString(),
        reason: u.reason || null,
        status: u.status
      })),
      completedTrialsCount: completedTrials.length
    };
  }
  /**
   * Paginated appointments listing for Admin (sorted earliest first)
   */
  async getAdminAppointments(query) {
    const { page, limit, status, date, sortOrder = "asc" } = query;
    const skip = (page - 1) * limit;
    const where = {};
    if (status) {
      where.status = status;
    }
    if (date) {
      const dayStart = /* @__PURE__ */ new Date(`${date}T00:00:00.000Z`);
      const dayEnd = /* @__PURE__ */ new Date(`${date}T23:59:59.999Z`);
      where.startTime = {
        gte: dayStart,
        lte: dayEnd
      };
    }
    const [total, items] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: sortOrder === "desc" ? "desc" : "asc" },
        include: {
          parent: {
            select: {
              id: true,
              fullName: true,
              email: true,
              timezone: true
            }
          },
          mentor: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  timezone: true
                }
              }
            }
          },
          attendance: true
        }
      })
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      items: items.map((app2) => ({
        id: app2.id,
        bookingId: `BK-${app2.id.substring(0, 6).toUpperCase()}`,
        studentName: app2.studentName,
        studentGrade: app2.studentGrade,
        subject: app2.subject,
        learningGoal: app2.learningGoal,
        startTime: app2.startTime.toISOString(),
        endTime: app2.endTime.toISOString(),
        status: app2.status,
        meetingLink: app2.meetingLink,
        createdAt: app2.createdAt.toISOString(),
        parent: {
          id: app2.parent.id,
          name: app2.parent.fullName,
          email: app2.parent.email,
          timezone: app2.parent.timezone
        },
        mentor: {
          id: app2.mentor.id,
          name: app2.mentor.user.fullName,
          email: app2.mentor.user.email,
          timezone: app2.mentor.timezone
        },
        attendance: app2.attendance ? {
          id: app2.attendance.id,
          status: app2.attendance.status,
          joinedAt: app2.attendance.joinedAt?.toISOString() || null,
          completedAt: app2.attendance.completedAt?.toISOString() || null,
          mentorNotes: app2.attendance.mentorNotes
        } : null
      }))
    };
  }
  /**
   * Real Completed Trials query (driven strictly by TrialAttendance status = COMPLETED)
   */
  async getCompletedTrials(query) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = {
      status: AttendanceStatus2.COMPLETED
    };
    if (query.mentorId) {
      where.appointment = {
        mentorId: query.mentorId
      };
    }
    const [total, records] = await Promise.all([
      prisma.trialAttendance.count({ where }),
      prisma.trialAttendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { completedAt: "desc" },
        include: {
          appointment: {
            include: {
              parent: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  timezone: true
                }
              },
              mentor: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                      timezone: true
                    }
                  }
                }
              }
            }
          }
        }
      })
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      items: records.map((rec) => ({
        attendanceId: rec.id,
        appointmentId: rec.appointmentId,
        bookingId: `BK-${rec.appointment.id.substring(0, 6).toUpperCase()}`,
        studentName: rec.appointment.studentName,
        studentGrade: rec.appointment.studentGrade,
        subject: rec.appointment.subject,
        learningGoal: rec.appointment.learningGoal,
        startTime: rec.appointment.startTime.toISOString(),
        endTime: rec.appointment.endTime.toISOString(),
        status: rec.status,
        joinedAt: rec.joinedAt?.toISOString() || null,
        completedAt: rec.completedAt?.toISOString() || null,
        mentorNotes: rec.mentorNotes,
        parent: {
          id: rec.appointment.parent.id,
          name: rec.appointment.parent.fullName,
          email: rec.appointment.parent.email
        },
        mentor: {
          id: rec.appointment.mentor.id,
          name: rec.appointment.mentor.user.fullName,
          email: rec.appointment.mentor.user.email,
          timezone: rec.appointment.mentor.timezone
        }
      }))
    };
  }
  /**
   * Get single appointment full details for Admin
   */
  async getAdminAppointmentById(id) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            timezone: true
          }
        },
        mentor: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                timezone: true
              }
            }
          }
        },
        attendance: true
      }
    });
    if (!appointment) {
      throw new AppError("Appointment not found.", 404);
    }
    return {
      id: appointment.id,
      bookingId: `BK-${appointment.id.substring(0, 6).toUpperCase()}`,
      studentName: appointment.studentName,
      studentGrade: appointment.studentGrade,
      subject: appointment.subject,
      learningGoal: appointment.learningGoal,
      startTime: appointment.startTime.toISOString(),
      endTime: appointment.endTime.toISOString(),
      status: appointment.status,
      meetingLink: appointment.meetingLink,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
      parent: {
        id: appointment.parent.id,
        name: appointment.parent.fullName,
        email: appointment.parent.email,
        timezone: appointment.parent.timezone
      },
      mentor: {
        id: appointment.mentor.id,
        name: appointment.mentor.user.fullName,
        email: appointment.mentor.user.email,
        timezone: appointment.mentor.timezone
      },
      attendance: appointment.attendance ? {
        id: appointment.attendance.id,
        status: appointment.attendance.status,
        joinedAt: appointment.attendance.joinedAt?.toISOString() || null,
        completedAt: appointment.attendance.completedAt?.toISOString() || null,
        mentorNotes: appointment.attendance.mentorNotes
      } : null
    };
  }
  /**
   * Cancel an appointment (ADMIN only) - releases mentor capacity
   */
  async cancelAppointment(id) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        parent: true,
        mentor: { include: { user: true } }
      }
    });
    if (!appointment) {
      throw new AppError("Appointment not found.", 404);
    }
    if (appointment.status === AppointmentStatus2.CANCELLED) {
      return appointment;
    }
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus2.CANCELLED }
    });
    await prisma.trialAttendance.updateMany({
      where: { appointmentId: id },
      data: { status: AttendanceStatus2.CANCELLED }
    });
    try {
      await notificationService.createAdminNotification({
        type: "TRIAL_CANCELLED",
        title: "Trial Booking Cancelled",
        message: `Booking BK-${id.substring(0, 6).toUpperCase()} for ${appointment.studentName} was cancelled by Admin.`,
        appointmentId: id
      });
      if (appointment.mentor?.userId) {
        await prisma.notification.create({
          data: {
            type: "TRIAL_CANCELLED",
            recipientUserId: appointment.mentor.userId,
            title: "Trial Booking Cancelled",
            message: `Trial session BK-${id.substring(0, 6).toUpperCase()} for ${appointment.studentName} was cancelled by Admin. Slot capacity has been freed up.`,
            appointmentId: id
          }
        });
      }
    } catch (err) {
      console.error("Failed to create TRIAL_CANCELLED notification:", err);
    }
    return updated;
  }
  /**
   * Get Admin dashboard summary stats
   */
  async getAdminDashboardSummary() {
    const activeMentors = await prisma.mentor.findMany({
      where: { isActive: true },
      include: { user: true }
    });
    const activeMentorsCount = activeMentors.length;
    const totalDailyCapacity = activeMentorsCount * 2;
    let todayAppointmentsCount = 0;
    for (const m of activeMentors) {
      const todayPlain = Temporal7.Now.zonedDateTimeISO(m.timezone).toPlainDate();
      const startZdt = todayPlain.toZonedDateTime({
        timeZone: m.timezone,
        plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
      });
      const endZdt = todayPlain.add({ days: 1 }).toZonedDateTime({
        timeZone: m.timezone,
        plainTime: { hour: 0, minute: 0, second: 0, millisecond: 0 }
      });
      const todayStart = new Date(startZdt.toInstant().epochMilliseconds);
      const todayEnd = new Date(endZdt.toInstant().epochMilliseconds);
      const mCount = await prisma.appointment.count({
        where: {
          mentorId: m.id,
          status: { in: [AppointmentStatus2.CONFIRMED, AppointmentStatus2.COMPLETED] },
          startTime: { gte: todayStart, lt: todayEnd }
        }
      });
      todayAppointmentsCount += mCount;
    }
    const remainingTodayCapacity = Math.max(0, totalDailyCapacity - todayAppointmentsCount);
    const [
      totalAppointments,
      totalBookedAppointments,
      confirmedCount,
      completedCount,
      cancelledCount,
      completedTrialsActualCount,
      unreadNotificationsCount
    ] = await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: { not: AppointmentStatus2.CANCELLED } } }),
      prisma.appointment.count({ where: { status: AppointmentStatus2.CONFIRMED } }),
      prisma.appointment.count({ where: { status: AppointmentStatus2.COMPLETED } }),
      prisma.appointment.count({ where: { status: AppointmentStatus2.CANCELLED } }),
      prisma.trialAttendance.count({
        where: { status: AttendanceStatus2.COMPLETED }
      }),
      prisma.notification.count({
        where: { readAt: null }
      })
    ]);
    return {
      activeMentorsCount,
      totalAppointments,
      totalBookedAppointments,
      confirmedAppointments: confirmedCount,
      completedAppointments: completedCount,
      completedRatio: `${completedCount} / ${totalBookedAppointments}`,
      cancelledAppointments: cancelledCount,
      todayAppointmentsCount,
      todayRatio: `${todayAppointmentsCount} / ${totalDailyCapacity}`,
      totalDailyCapacity,
      remainingTodayCapacity,
      completedTrialsActualCount,
      unreadNotificationsCount
    };
  }
};
var adminService = new AdminService();

// server/src/controllers/admin.controller.ts
var AdminController = class {
  constructor(service = adminService) {
    this.service = service;
  }
  service;
  /**
   * GET /api/admin/mentors
   */
  getMentors = async (_req, res, next) => {
    try {
      const data = await this.service.getAdminMentors();
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * POST /api/admin/mentors - Create a new mentor (User.role = MENTOR)
   */
  createMentor = async (req, res, next) => {
    try {
      const { fullName, email, password, timezone, isActive, availabilities } = req.body;
      if (!fullName || !email) {
        throw new AppError("Full name and email are required.", 400);
      }
      const data = await this.service.createMentor({
        fullName,
        email,
        password,
        timezone,
        isActive,
        availabilities
      });
      res.status(201).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * POST /api/admin/mentors/:mentorId/terminate - Terminate mentor (preserves historical data)
   */
  terminateMentor = async (req, res, next) => {
    try {
      const { mentorId } = req.params;
      const data = await this.service.terminateMentor(mentorId);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * POST /api/admin/mentors/:mentorId/reactivate - Reactivate mentor
   */
  reactivateMentor = async (req, res, next) => {
    try {
      const { mentorId } = req.params;
      const data = await this.service.reactivateMentor(mentorId);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * POST /api/admin/mentors/:mentorId/unavailability - Add unavailable exception period
   */
  addMentorUnavailability = async (req, res, next) => {
    try {
      const { mentorId } = req.params;
      const { startDate, endDate, reason } = req.body;
      if (!startDate || !endDate) {
        throw new AppError("startDate and endDate are required.", 400);
      }
      const data = await this.service.addMentorUnavailability(mentorId, {
        startDate,
        endDate,
        reason
      });
      res.status(201).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * POST /api/admin/mentors/:mentorId/unavailability/:unavailabilityId/approve
   * POST /api/admin/unavailability/:unavailabilityId/approve
   */
  approveMentorUnavailability = async (req, res, next) => {
    try {
      const unavailabilityId = req.params.unavailabilityId || req.params.id;
      const data = await this.service.approveMentorUnavailability(unavailabilityId);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * POST /api/admin/mentors/:mentorId/unavailability/:unavailabilityId/reject
   * POST /api/admin/unavailability/:unavailabilityId/reject
   */
  rejectMentorUnavailability = async (req, res, next) => {
    try {
      const unavailabilityId = req.params.unavailabilityId || req.params.id;
      const data = await this.service.rejectMentorUnavailability(unavailabilityId);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * DELETE /api/admin/mentors/:mentorId/unavailability/:unavailabilityId - Remove exception
   */
  deleteMentorUnavailability = async (req, res, next) => {
    try {
      const { unavailabilityId } = req.params;
      const data = await this.service.deleteMentorUnavailability(unavailabilityId);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * PUT /api/admin/mentors/:mentorId/availability - Update weekly recurring hours
   */
  updateMentorAvailability = async (req, res, next) => {
    try {
      const { mentorId } = req.params;
      const { availabilities } = req.body;
      if (!Array.isArray(availabilities)) {
        throw new AppError("availabilities must be an array.", 400);
      }
      const data = await this.service.updateMentorAvailability(mentorId, availabilities);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/admin/mentors/:mentorId - Inspect mentor dashboard with ADMIN authorization
   */
  getMentorDashboard = async (req, res, next) => {
    try {
      const mentorId = req.params.mentorId;
      const date = req.query.date ? String(req.query.date) : void 0;
      const data = await this.service.getAdminMentorDashboard(mentorId, date);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/admin/completed-trials - Real attendance completed trials
   */
  getCompletedTrials = async (req, res, next) => {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const mentorId = req.query.mentorId ? String(req.query.mentorId) : void 0;
      const data = await this.service.getCompletedTrials({ page, limit, mentorId });
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/admin/email-logs - All real transactional email logs
   */
  getEmailLogs = async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
      const status = req.query.status;
      const data = await emailService.getEmailLogs(limit, status);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/admin/notifications - In-app notification center
   */
  getNotifications = async (req, res, next) => {
    try {
      const data = await notificationService.getNotifications(req.user?.id);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * PATCH /api/admin/notifications/:id/read
   */
  markNotificationRead = async (req, res, next) => {
    try {
      const id = req.params.id;
      const data = await notificationService.markAsRead(id);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * POST /api/admin/notifications/read-all
   */
  markAllNotificationsRead = async (req, res, next) => {
    try {
      await notificationService.markAllAsRead(req.user?.id);
      res.status(200).json({
        status: "success",
        message: "All notifications marked as read."
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/admin/appointments
   */
  getAppointments = async (req, res, next) => {
    try {
      const query = adminAppointmentsQuerySchema.parse(req.query);
      const data = await this.service.getAdminAppointments(query);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/admin/appointments/:id
   */
  getAppointmentById = async (req, res, next) => {
    try {
      const { id } = appointmentIdParamSchema.parse(req.params);
      const data = await this.service.getAdminAppointmentById(id);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * PATCH /api/admin/appointments/:id/cancel
   */
  cancelAppointment = async (req, res, next) => {
    try {
      const { id } = appointmentIdParamSchema.parse(req.params);
      const updated = await this.service.cancelAppointment(id);
      res.status(200).json({
        status: "success",
        data: {
          appointmentId: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt.toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/admin/scheduling/capacity
   */
  getCapacity = async (req, res, next) => {
    try {
      const date = req.query.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const timezone = req.query.timezone || "Asia/Kolkata";
      const data = await schedulingService.getAvailableSlotsForDate(date, timezone);
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /api/admin/dashboard
   */
  getDashboard = async (_req, res, next) => {
    try {
      const data = await this.service.getAdminDashboardSummary();
      res.status(200).json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
};
var adminController = new AdminController();
var getAdminMentors = adminController.getMentors;
var createAdminMentor = adminController.createMentor;
var terminateAdminMentor = adminController.terminateMentor;
var reactivateAdminMentor = adminController.reactivateMentor;
var addAdminMentorUnavailability = adminController.addMentorUnavailability;
var approveAdminMentorUnavailability = adminController.approveMentorUnavailability;
var rejectAdminMentorUnavailability = adminController.rejectMentorUnavailability;
var deleteAdminMentorUnavailability = adminController.deleteMentorUnavailability;
var updateAdminMentorAvailability = adminController.updateMentorAvailability;
var getAdminMentorDashboard = adminController.getMentorDashboard;
var getAdminCompletedTrials = adminController.getCompletedTrials;
var getAdminEmailLogs = adminController.getEmailLogs;
var getAdminNotifications = adminController.getNotifications;
var markAdminNotificationRead = adminController.markNotificationRead;
var markAdminAllNotificationsRead = adminController.markAllNotificationsRead;
var getAdminAppointments = adminController.getAppointments;
var getAdminAppointmentById = adminController.getAppointmentById;
var cancelAdminAppointment = adminController.cancelAppointment;
var getAdminCapacity = adminController.getCapacity;
var getAdminDashboard = adminController.getDashboard;

// server/src/routes/admin.routes.ts
var adminRouter = Router8();
adminRouter.get(
  "/admin/mentors",
  authenticate,
  requireRole(Role7.ADMIN),
  getAdminMentors
);
adminRouter.post(
  "/admin/mentors",
  authenticate,
  requireRole(Role7.ADMIN),
  createAdminMentor
);
adminRouter.post(
  "/admin/mentors/:mentorId/terminate",
  authenticate,
  requireRole(Role7.ADMIN),
  terminateAdminMentor
);
adminRouter.post(
  "/admin/mentors/:mentorId/reactivate",
  authenticate,
  requireRole(Role7.ADMIN),
  reactivateAdminMentor
);
adminRouter.post(
  "/admin/mentors/:mentorId/unavailability",
  authenticate,
  requireRole(Role7.ADMIN),
  addAdminMentorUnavailability
);
adminRouter.post(
  "/admin/mentors/:mentorId/unavailability/:unavailabilityId/approve",
  authenticate,
  requireRole(Role7.ADMIN),
  approveAdminMentorUnavailability
);
adminRouter.post(
  "/admin/unavailability/:unavailabilityId/approve",
  authenticate,
  requireRole(Role7.ADMIN),
  approveAdminMentorUnavailability
);
adminRouter.post(
  "/admin/mentors/:mentorId/unavailability/:unavailabilityId/reject",
  authenticate,
  requireRole(Role7.ADMIN),
  rejectAdminMentorUnavailability
);
adminRouter.post(
  "/admin/unavailability/:unavailabilityId/reject",
  authenticate,
  requireRole(Role7.ADMIN),
  rejectAdminMentorUnavailability
);
adminRouter.delete(
  "/admin/mentors/:mentorId/unavailability/:unavailabilityId",
  authenticate,
  requireRole(Role7.ADMIN),
  deleteAdminMentorUnavailability
);
adminRouter.put(
  "/admin/mentors/:mentorId/availability",
  authenticate,
  requireRole(Role7.ADMIN),
  updateAdminMentorAvailability
);
adminRouter.get(
  "/admin/mentors/:mentorId",
  authenticate,
  requireRole(Role7.ADMIN),
  getAdminMentorDashboard
);
adminRouter.get(
  "/admin/completed-trials",
  authenticate,
  requireRole(Role7.ADMIN),
  getAdminCompletedTrials
);
adminRouter.get(
  "/admin/email-logs",
  authenticate,
  requireRole(Role7.ADMIN),
  getAdminEmailLogs
);
adminRouter.get(
  "/admin/notifications",
  authenticate,
  requireRole(Role7.ADMIN),
  getAdminNotifications
);
adminRouter.patch(
  "/admin/notifications/:id/read",
  authenticate,
  requireRole(Role7.ADMIN),
  markAdminNotificationRead
);
adminRouter.post(
  "/admin/notifications/read-all",
  authenticate,
  requireRole(Role7.ADMIN),
  markAdminAllNotificationsRead
);
adminRouter.get(
  "/admin/appointments",
  authenticate,
  requireRole(Role7.ADMIN),
  getAdminAppointments
);
adminRouter.get(
  "/admin/appointments/:id",
  authenticate,
  requireRole(Role7.ADMIN),
  getAdminAppointmentById
);
adminRouter.patch(
  "/admin/appointments/:id/cancel",
  authenticate,
  requireRole(Role7.ADMIN),
  cancelAdminAppointment
);
adminRouter.get(
  "/admin/scheduling/capacity",
  authenticate,
  requireRole(Role7.ADMIN),
  getAdminCapacity
);
adminRouter.get(
  "/admin/dashboard",
  authenticate,
  requireRole(Role7.ADMIN),
  getAdminDashboard
);

// server/src/routes/index.ts
var apiRouter = Router9();
apiRouter.use(healthRouter);
apiRouter.use(mentorRouter);
apiRouter.use(schedulingRouter);
apiRouter.use(bookingRouter);
apiRouter.use(authRouter);
apiRouter.use(parentRouter);
apiRouter.use(mentorPortalRouter);
apiRouter.use(adminRouter);

// server/src/middleware/notFoundHandler.ts
var notFoundHandler = (req, res) => {
  res.status(404).json({
    status: "error",
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
};

// server/src/app.ts
function createApp() {
  const app2 = express();
  app2.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
          config.clientUrl,
          "http://localhost:3000",
          "http://localhost:5173",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:5173"
        ];
        if (config.isDev || allowedOrigins.includes(origin) || origin.endsWith(".run.app")) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"]
    })
  );
  app2.use(express.json({ limit: "2mb" }));
  app2.use(express.urlencoded({ extended: true, limit: "2mb" }));
  app2.use("/api", apiRouter);
  app2.use("/api", notFoundHandler);
  app2.use(errorHandler);
  return app2;
}
var app = createApp();

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path4.dirname(__filename);
async function startServer() {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path4.resolve(__dirname, "dist");
    app.use(express2.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path4.resolve(distPath, "index.html"));
    });
  }
  const PORT = config.port || 3e3;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Codeyoung] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Codeyoung] Backend health check: http://0.0.0.0:${PORT}/api/health`);
  });
}
startServer().catch((err) => {
  console.error("[Codeyoung] Failed to start server:", err);
  process.exit(1);
});
