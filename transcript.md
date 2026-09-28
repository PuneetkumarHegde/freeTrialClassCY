# Codeyoung Trial Class Booking Platform
## Professional Engineering Transcript

This document records the engineering direction, implementation decisions, debugging process and production deployment work for the Codeyoung trial-class booking platform.

The transcript is intentionally organized around substantive engineering decisions rather than routine chat noise. Sensitive credentials are excluded.

---

# 1. Project Vision and Requirements

## Puneetkumar — Engineering Direction

The platform should reproduce the experience of a Codeyoung free trial class.

The core flow is:

- Around 10 mentors are available.
- Parents can book trial classes.
- There can be many interested parents per day.
- The parent chooses a suitable time.
- The system assigns an available mentor automatically.
- The parent and mentor receive the class link.
- Mentors are limited to two demo classes per day.
- Parents may be in the US/UK while mentors are in India.
- Daylight-saving time must be handled correctly.
- The system should feel like a real product, not a basic CRUD assignment.

The important customer idea is:

> Experience the product and the quality coaching before signing up.

## AI — Technical Response

The product should be designed around a trial-first customer journey rather than forcing account creation before the customer can experience the service.

The parent should:

1. Land on the product page.
2. Understand the value of the trial.
3. Select a date and time.
4. Provide student and parent information.
5. Book without mandatory authentication.
6. Receive a confirmation and class link.
7. Attend the trial.

Mentors and admins should have authenticated operational dashboards.

---

# 2. Product Roles and Authentication

## Puneetkumar — Engineering Direction

There should be three operational roles:

- Parent/Student
- Mentor
- Admin

The public site should not expose separate Mentor Login and Admin Login buttons.

There should be one Login entry and the backend should determine the user's role.

The parent should not need an account just to book a trial.

## AI — Technical Response

Use one login form:

```text
Email
Password
Login
```

The database stores the role.

After authentication:

```text
STUDENT/PARENT → Student Dashboard
MENTOR         → Mentor Dashboard
ADMIN          → Admin Dashboard
```

Role selection should not be controlled by the user.

The backend remains the security boundary.

Public booking remains login-free.

---

# 3. Mentor Assignment

## Puneetkumar — Engineering Direction

The parent should not choose the mentor.

The parent chooses a time and the system automatically assigns an available mentor.

There are exactly 10 official mentors.

## AI — Technical Response

Mentor assignment should be performed by the backend.

Eligibility should consider:

- active mentor status
- existing appointments
- daily limit
- working hours
- approved unavailability

The selected mentor should be the eligible mentor with the lowest daily appointment count, with mentor ID as a deterministic tie-breaker.

This keeps internal scheduling complexity away from the parent.

---

# 4. Capacity Model

## Puneetkumar — Engineering Direction

Each mentor should have a maximum of two trial classes per day.

With 10 mentors:

```text
10 × 2 = 20 classes/day
```

The system also needs to handle simultaneous bookings.

## AI — Technical Response

There are two separate capacity concepts:

### Daily capacity

```text
2 classes / mentor / local calendar day
```

### Simultaneous capacity

A mentor can conduct only one class at a time.

Therefore the system must count mentors who are genuinely eligible at the requested time.

The public UI should not expose internal values such as 20/20. It should present useful customer-facing availability states.

---

# 5. Timezone and DST

## Puneetkumar — Engineering Direction

Parents may be in different countries while mentors are in India.

Timezone handling cannot be a fixed offset.

The booking should show the parent their local time, while the mentor should see the same appointment in their own local timezone.

## AI — Technical Response

Use IANA timezone identifiers:

```text
America/New_York
Europe/London
Asia/Kolkata
```

Detect the browser timezone with:

```ts
Intl.DateTimeFormat().resolvedOptions().timeZone
```

Use Temporal for calculations:

```text
Temporal
@js-temporal/polyfill
```

The mentor's daily limit must be evaluated according to the mentor's local calendar day.

A fixed offset such as UTC-5 is not sufficient because DST changes the actual offset.

---

# 6. Scheduling Architecture

## Puneetkumar — Engineering Direction

Availability must not be calculated only in React.

The backend needs to be the source of truth.

## AI — Technical Response

The architecture should separate:

```text
Frontend
   ↓
API
   ↓
Scheduling Service
   ↓
Repository
   ↓
Prisma
   ↓
PostgreSQL
```

The frontend asks for available slots.

The backend evaluates:

- date
- timezone
- working hours
- mentor status
- unavailability
- existing appointments
- daily limits
- simultaneous conflicts

---

# 7. Race Conditions

## Puneetkumar — Engineering Direction

Two parents can click the same slot at almost the same time.

A simple availability check is not enough.

## AI — Technical Response

The booking process must revalidate inside a transaction and rely on a database-level constraint.

PostgreSQL can protect appointment overlap using:

```sql
tstzrange(start_time, end_time, '[)')
```

A losing concurrent request should receive a conflict rather than creating a double booking.

The database must be the final authority.

---

# 8. Booking and Status Model

## Puneetkumar — Engineering Direction

Booking status should distinguish normal bookings, cancellations and completed classes.

Cancelled classes should not continue consuming future capacity.

## AI — Technical Response

Use:

```text
CONFIRMED
CANCELLED
COMPLETED
```

Normal flow:

```text
CONFIRMED → COMPLETED
```

Attendance should remain a separate business concept.

A booking existing in the database does not prove that the student actually completed the trial.

---

# 9. Mentor Unavailability

## Puneetkumar — Engineering Direction

Mentors need to request periods when they cannot conduct classes.

The request must go through admin approval.

Only approved unavailability should block scheduling.

The backend must enforce a 24-hour advance requirement.

## AI — Technical Response

Implement:

```text
Mentor
  ↓
Submit request
  ↓
PENDING
  ↓
Admin
  ↙     ↘
APPROVE  REJECT
  ↓
Blocks scheduling
```

Pending and rejected requests do not block customer availability.

Historical requests should remain auditable.

---

# 10. Mentor Management

## Puneetkumar — Engineering Direction

There must be exactly 10 official mentors.

Admin should be able to add a mentor and terminate a mentor.

Termination must preserve history.

## AI — Technical Response

Adding a mentor creates:

```text
User
role = MENTOR
```

The mentor can then use the same login page and is redirected to the mentor dashboard.

Termination should:

- prevent new bookings
- remove the mentor from active capacity
- preserve historical appointments

Records should not be destroyed merely to remove a mentor from scheduling.

---

# 11. Frontend Design Direction

## Puneetkumar — Engineering Direction

The UI should look like a mature US/UK EdTech/SaaS product.

Avoid a typical AI-generated dashboard appearance.

Use professional spacing, restrained colors, meaningful animation and real tables.

## AI — Technical Response

The frontend uses:

```text
React
TypeScript
Vite
Tailwind CSS
Framer Motion
Lucide React
```

The design direction is:

- white/light background
- navy/charcoal typography
- restrained accent colors
- strong whitespace
- subtle shadows
- controlled motion
- responsive layout

Avoid:

- neon palettes
- excessive gradients
- glassmorphism everywhere
- cartoon-like visuals
- constant animation

---

# 12. Login Experience

## Puneetkumar — Engineering Direction

The login should be a dedicated page rather than a browser-style popup.

It should have one form and role should come from the backend.

## AI — Technical Response

The login page was designed as a split-screen experience.

The left side communicates the educational product.

The right side contains:

- email
- password
- show/hide password
- loading state
- login action
- demo information where appropriate

Framer Motion provides controlled entrance animation.

Reduced-motion behavior was considered.

---

# 13. Admin Operations

## Puneetkumar — Engineering Direction

Admin needs operational visibility.

The dashboard should show useful booking and mentor information rather than decorative metrics.

## AI — Technical Response

Admin functionality includes:

- mentor management
- booking management
- capacity
- completed trials
- email delivery logs
- in-app notifications
- mentor unavailability
- manual booking

Booking records should show useful information such as:

```text
Parent email
Student
Assigned mentor
Date/time
Status
```

Metrics should distinguish booked classes from completed trials.

---

# 14. Email Architecture

## Puneetkumar — Engineering Direction

The parent should enter any real email and the system should automatically send the confirmation.

There should not be a manual admin email step.

## AI — Technical Response

The email service was designed to send automatically after a successful booking.

The final provider was changed to:

```text
Gmail API + OAuth 2.0
```

rather than relying on a sandbox email provider.

The system sends:

```text
Parent confirmation
Mentor assignment
```

and records delivery results.

Email failure should not roll back the booking.

---

# 15. Gmail OAuth

## Puneetkumar — Engineering Direction

Use a real Gmail account and Gmail API because the assignment needs actual dynamic delivery.

## AI — Technical Response

The backend uses Google OAuth credentials and a refresh token.

The production redirect URI was configured as:

```text
https://freetrialclasscy.onrender.com/api/auth/google/callback
```

The Render environment contains the Google/Gmail configuration.

Secrets are intentionally excluded from this transcript.

---

# 16. Gmail OAuth Failure and Recovery

## Puneetkumar — Engineering Direction

The first production test showed:

```text
Gmail OAuth token refresh failed (400)
```

The email system must be diagnosed without changing the booking system unnecessarily.

## AI — Technical Response

That error indicated a Gmail OAuth credential/refresh-token problem rather than a booking problem.

The OAuth authorization flow was corrected.

Later notifications changed from:

```text
OAuth token refresh failed
```

to:

```text
User-rate limit exceeded
(Mail sending)
```

That change was significant: authentication was now reaching the Gmail sending stage.

---

# 17. Gmail Rate Limit

## Puneetkumar — Engineering Direction

The application should not be changed just because Gmail temporarily refuses mail.

## AI — Technical Response

The later error:

```text
User-rate limit exceeded
```

is a Gmail mail-sending rate-limit condition.

The correct response is:

- stop repeatedly generating test bookings
- allow the limit to clear
- perform a small final delivery test
- keep the email failure logs

The booking system itself remains functional.

---

# 18. Database Foundation

## Puneetkumar — Engineering Direction

The existing Supabase database should be preserved.

Do not reset/drop the old database simply to make Prisma happy.

## AI — Technical Response

The existing database caused:

```text
P3005
The database schema is not empty.
```

Because the existing schema already represented the migration foundation, the appropriate one-time operation was:

```bash
npx prisma migrate resolve --applied 20260925000000_init_database_foundation
```

The production log later confirmed:

```text
Migration 20260925000000_init_database_foundation marked as applied.
```

This was a database state operation, not a code change.

No database reset was required.

---

# 19. Render Deployment

## Puneetkumar — Engineering Direction

Deploy the final AI Studio full-stack project to Render as a unified service.

## AI — Technical Response

The final architecture uses:

```text
React frontend
+
Express backend
+
Prisma
+
PostgreSQL
```

inside one deployed application.

Production:

```text
https://freetrialclasscy.onrender.com
```

The application uses:

```bash
npm start
```

for production startup.

---

# 20. Render Problem — Large Repository Transfer

## Puneetkumar — Engineering Direction

Render showed a large download during deployment.

## AI — Technical Response

A Render deployment log showed approximately:

```text
Downloaded 542MB
Extraction took 9s
```

The transfer completed, so it was not ultimately the blocking failure.

It did, however, expose the importance of keeping generated artifacts and unnecessary repository content out of the Git repository.

---

# 21. Render Problem — Prisma Baseline vs Frontend Build

## Puneetkumar — Engineering Direction

The Prisma database baseline needs to be performed without destroying the existing database.

## AI — Technical Response

The Render build command was temporarily changed to:

```bash
npm install && npx prisma migrate resolve --applied 20260925000000_init_database_foundation
```

This successfully marked the migration as applied.

However, that command intentionally did not execute the React build.

The server subsequently started and reported:

```text
ENOENT: no such file or directory,
stat '/opt/render/project/src/dist/index.html'
```

The root cause was straightforward:

```text
Frontend was not built.
```

The permanent build command therefore needed to restore:

```bash
npm install && npx prisma migrate deploy && npm run db:seed && npm run build
```

---

# 22. Render Problem — Production Frontend Path

## Puneetkumar — Engineering Direction

The unified server needs to serve the React output correctly in Render's filesystem.

## AI — Technical Response

The server was adjusted to resolve the frontend output robustly rather than depending on a fragile current working directory.

The expected production artifact is:

```text
dist/index.html
```

---

# 23. Render Problem — Database Connection

## Puneetkumar — Engineering Direction

The production database connection had to work reliably with Supabase.

## AI — Technical Response

Different Supabase pooler endpoints were tested because runtime connections and Prisma migration behavior can differ.

The production configuration ultimately used a working Supabase Session Pooler configuration for Prisma operations.

Credentials were never included in the final documentation.

---

# 24. Environment Configuration

## Puneetkumar — Engineering Direction

Production credentials must stay in Render.

## AI — Technical Response

The production environment was configured with variables for:

```text
DATABASE_URL
APP_BASE_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
GOOGLE_REFRESH_TOKEN
GMAIL_SENDER_EMAIL
GMAIL_FROM_NAME
```

The production OAuth redirect was configured for the Render URL.

A `.env.example` file should contain placeholders only.

---

# 25. Final Production Validation

## Puneetkumar — Engineering Direction

The final application needs to be checked from the real customer and admin perspective.

## AI — Technical Response

The deployed admin interface demonstrated:

```text
Mentors Management (10)
Trial Bookings
Actual Completed Trials
Email Delivery Logs
In-App Notifications
```

The production server started successfully.

The health endpoint was available.

Bookings were being created and mentors were being assigned.

---

# 26. What Was Actually Proven in Production

The latest production state demonstrated:

```text
Frontend              ✓
Backend               ✓
Database              ✓
Prisma migration      ✓
Seeding               ✓
10 mentors            ✓
Booking               ✓
Mentor assignment     ✓
Notifications         ✓
Authentication        ✓
Admin operations      ✓
Mentor operations     ✓
Gmail OAuth           ✓
Gmail mail sending    Rate limited
```

The Gmail rate-limit issue is therefore an external delivery limitation rather than evidence that the booking engine is broken.

---

# 27. Engineering Outcome

## Puneetkumar — Engineering Direction

The goal was not simply to generate a frontend.

The application needed to behave like a real scheduling product under:

- concurrency
- timezones
- DST
- capacity limits
- authentication
- mentor operations
- email failure
- production deployment

## AI — Technical Response

The resulting architecture treats the project as a real operational system.

Important engineering decisions include:

- backend-owned business rules
- database-enforced appointment integrity
- deterministic mentor assignment
- timezone-aware scheduling
- server-side RBAC
- transactional booking
- failure-tolerant email delivery
- operational notification logs
- mentor lifecycle management
- production deployment troubleshooting

---

# 28. Final Technical Stack

```text
Frontend
React
TypeScript
Vite
Tailwind CSS
Framer Motion
Lucide React

Backend
Node.js
Express
TypeScript

Database
PostgreSQL
Supabase
Prisma

Scheduling
Temporal
@js-temporal/polyfill

Authentication
JWT
bcrypt

Email
Gmail API
Google OAuth 2.0

Deployment
GitHub
Render
Supabase
Google Cloud OAuth
```

---

# 29. Final Product Flow

```text
Parent
  ↓
Landing Page
  ↓
Book Free Trial
  ↓
Student + Parent Details
  ↓
Timezone-aware Slot Selection
  ↓
POST /api/bookings
  ↓
Transaction
  ↓
Eligible Mentor Selection
  ↓
Database Conflict Protection
  ↓
Appointment Created
  ↓
Class Link Generated
  ↓
Parent Email
  ↓
Mentor Email
  ↓
In-App Notification
  ↓
Mentor Conducts Trial
  ↓
Attendance / Completion
  ↓
Admin Reporting
```

---

# 30. Closing Engineering Summary

The project evolved from a basic trial-booking concept into a production-oriented full-stack scheduling platform.

The most important engineering lesson is:

> A scheduling UI can suggest availability, but only the backend and database can guarantee that the booking is valid.

The most important product lesson is:

> The parent should experience Codeyoung before being asked to commit to Codeyoung.

The final system therefore combines customer simplicity on the frontend with strict business rules, concurrency protection, timezone correctness, role security and operational visibility in the backend.
