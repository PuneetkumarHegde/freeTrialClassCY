# Codeyoung Trial Class Booking Platform

A full-stack appointment booking platform for Codeyoung's free trial-class experience.

The product is designed around one core idea:

> **Experience Codeyoung before you join.**

Parents can book a free 1-hour trial without creating an account first. The system automatically assigns an eligible mentor, handles mentor capacity and time zones correctly, creates a class link, and sends booking information by email when delivery is available.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Product Flow](#core-product-flow)
3. [User Roles](#user-roles)
4. [Parent Experience](#parent-experience)
5. [Mentor Experience](#mentor-experience)
6. [Admin Experience](#admin-experience)
7. [Mentor Capacity Rules](#mentor-capacity-rules)
8. [Availability and Booking Logic](#availability-and-booking-logic)
9. [Timezone and DST Handling](#timezone-and-dst-handling)
10. [Concurrency and Booking Safety](#concurrency-and-booking-safety)
11. [Booking Statuses](#booking-statuses)
12. [Email System](#email-system)
13. [Email Failure and Admin Notifications](#email-failure-and-admin-notifications)
14. [Gmail OAuth](#gmail-oauth)
15. [Mentor Unavailability](#mentor-unavailability)
16. [Authentication and RBAC](#authentication-and-rbac)
17. [Classroom](#classroom)
18. [Project Architecture](#project-architecture)
19. [Project Structure](#project-structure)
20. [Technology Stack](#technology-stack)
21. [Database](#database)
22. [API Overview](#api-overview)
23. [Frontend Pages](#frontend-pages)
24. [UI/UX Design](#uiux-design)
25. [Validation and Security](#validation-and-security)
26. [Seed and Demo Data](#seed-and-demo-data)
27. [Environment Variables](#environment-variables)
28. [Installation](#installation)
29. [Running the Project](#running-the-project)
30. [Testing](#testing)
31. [Demo Accounts](#demo-accounts)
32. [Important Demo Scenarios](#important-demo-scenarios)
33. [Error Handling](#error-handling)
34. [Project Principles](#project-principles)
35. [Deliberately Not Included](#deliberately-not-included)
36. [Submission Files](#submission-files)
37. [Final Verification Checklist](#final-verification-checklist)

---

# 1. Project Overview

The Codeyoung Trial Class Booking Platform provides a complete trial-class scheduling workflow.

### Main objectives

- Let parents book a free trial without signing up first.
- Allow the parent to choose a date and time.
- Automatically assign an available mentor.
- Maintain exactly 10 official initial mentors.
- Limit every mentor to a maximum of 2 trial classes per local calendar day.
- Prevent overlapping mentor appointments.
- Prevent more than 10 simultaneous classes.
- Correctly handle India, US, UK and other IANA time zones.
- Correctly handle daylight-saving-time transitions.
- Protect booking creation against race conditions.
- Provide separate Parent/Student, Mentor and Admin experiences.
- Send parent and mentor booking emails when delivery is configured and allowed.
- Record email delivery status.
- Notify the admin when an email fails.
- Allow mentors to request temporary unavailability.
- Allow admins to approve or reject unavailability requests.
- Preserve historical bookings when a mentor is terminated.
- Provide a protected dummy classroom.

---

# 2. Core Product Flow

```text
                    CODEYOUNG
                        │
                        ▼
              "Experience Codeyoung
                  before you join"
                        │
                        ▼
                Book Free Trial
                        │
                        ▼
              Student Information
                        │
                        ▼
              Parent/Guardian Info
                        │
                        ▼
                 Date & Time
                        │
                        ▼
              Availability Check
                        │
                ┌───────┴───────┐
                │               │
             AVAILABLE          FULL
                │               │
                ▼               ▼
        Auto-assign Mentor   Choose another
                │               date/time
                ▼
          Create Booking
                │
        ┌───────┴────────┐
        ▼                ▼
   Parent Email     Mentor Email
        │                │
        └───────┬────────┘
                ▼
          Dummy Class Link
                │
                ▼
            Trial Class
                │
                ▼
             Complete
```

The parent never selects a mentor.

---

# 3. User Roles

The application has three roles.

| Role | Main responsibility |
|---|---|
| Parent/Student | Book and attend a trial |
| Mentor | View assigned trials and conduct/complete classes |
| Admin | Manage mentors, bookings, availability, notifications and operations |

Role is stored in the database and enforced by the backend.

The application does **not** infer a role from an email address.

---

# 4. Parent Experience

## Public landing page

The public site communicates:

> **Experience Codeyoung before you join.**

The main CTA is:

> **Book a Free Trial**

The parent does not have to create an account before booking.

A single public **Login** entry is available for existing users.

---

## Parent booking flow

```text
Landing
  ↓
Book Free Trial
  ↓
Student Details
  ↓
Parent / Guardian Details
  ↓
Date & Time
  ↓
Review
  ↓
Confirmation
```

### Student information

The booking collects relevant student information such as:

- Student name
- Grade / level
- Interested subject
- Learning goal when applicable

### Parent information

The booking collects:

- Parent/guardian name
- Parent email
- Parent phone where configured

The parent email is the destination for the booking confirmation.

---

# 5. Mentor Experience

Mentors have a protected login and dashboard.

### Mentor dashboard shows

- Mentor name
- Mentor email
- Today's classes
- Student name
- Student grade
- Subject
- Parent information
- Local date/time
- Booking status
- Join Class button
- Complete Class action
- Daily capacity
- Unavailability requests and their status

### Daily capacity

Examples:

```text
0 / 2
1 / 2
2 / 2
```

A mentor at `2 / 2` cannot receive another trial booking for that local calendar day.

---

# 6. Admin Experience

The Admin Dashboard provides operational visibility.

### Admin features

- View bookings
- View bookings earliest first
- View parent email
- View assigned mentor
- View booking date/time
- View booking status
- Manage mentors
- Add mentors
- Terminate mentors
- View mentor capacity
- Review mentor unavailability requests
- Approve/reject unavailability
- View email logs
- View email failures
- View notifications
- View completed trials
- View today's classes
- Manually create bookings
- View student/class details
- Inspect operational capacity

---

## Admin metrics

The dashboard uses the following concepts:

### Total Booked Classes

Counts booked classes while excluding cancelled bookings.

Example:

```text
Total Booked Classes
6
```

### Completed Classes

Shows completed classes against total booked classes.

```text
Completed Classes
3 / 6
```

### Today's Classes

Shows today's classes against the overall daily capacity.

```text
Today's Classes
5 / 20
```

The overall capacity display is intentionally simple and does not require showing mentor names.

---

# 7. Mentor Capacity Rules

The platform has two independent capacity constraints.

## 7.1 Simultaneous capacity

There are exactly 10 official active mentors initially.

Therefore the maximum number of simultaneous 1-hour trial classes is:

```text
10 mentors
10 simultaneous classes maximum
```

If all mentors are teaching during a slot:

```text
Fully booked — all mentors are currently teaching.
```

The system does not expose mentor identities to parents.

---

## 7.2 Daily capacity

Each mentor can conduct at most:

```text
2 trial classes / local calendar day
```

With 10 mentors:

```text
10 × 2 = 20 theoretical daily classes
```

A mentor's daily count is calculated using **that mentor's own timezone**, not UTC.

---

## 7.3 Cancelled appointments

Cancelled appointments do not consume capacity.

Example:

```text
Mentor 003

Class 1 → COMPLETED
Class 2 → CANCELLED

Effective count = 1 / 2
```

A new booking can therefore be assigned if all other eligibility conditions pass.

---

# 8. Availability and Booking Logic

Availability and booking use the same scheduling/eligibility rules.

This prevents the frontend from showing a slot as available when the booking service would reject it.

---

## Slot generation

The parent provides:

```text
date = YYYY-MM-DD
timezone = IANA timezone
```

The system generates 60-minute trial slots in the parent's local timezone.

Each slot is converted to an absolute instant.

---

## Mentor eligibility

For each requested slot the backend checks:

1. Mentor is active.
2. Mentor has working availability at that instant.
3. Mentor has fewer than 2 active classes on their local calendar day.
4. Mentor has no overlapping appointment.
5. Mentor does not have an approved unavailability period covering the slot.

Only eligible mentors can be assigned.

---

## Parent privacy

The parent sees availability status, not mentor identity.

Example:

```text
2:00 PM
Available

3:00 PM
Limited

4:00 PM
Fully booked
```

The backend decides which mentor is assigned.

---

## Mentor selection

The scheduling service automatically selects an eligible mentor.

The parent never chooses a mentor.

The implementation uses a deterministic selection rule among eligible mentors so that assignment is predictable while respecting the scheduling constraints.

---

## Full slot

Parent-facing message:

> **Fully booked — all mentors are currently teaching.**

---

## Entire day full

The parent-facing interface does not expose internal capacity numbers such as `20/20`.

Instead it can show:

> **No trial times available for this date. Let's find another time.**

The parent can choose another available date.

The system does not silently move the booking to another date.

---

## Race condition

A slot can become unavailable between:

```text
Availability displayed
        ↓
Parent clicks Book
```

Therefore the final booking request always re-checks availability inside the backend transaction.

If another user takes the last available slot first:

> **This slot was just booked. Choose another available time.**

Entered parent/student information should be preserved where possible.

---

# 9. Timezone and DST Handling

Timezone handling is a core part of the platform.

## Parent timezone

The browser timezone can be detected with:

```javascript
Intl.DateTimeFormat().resolvedOptions().timeZone
```

The user can manually override the detected timezone.

The application uses **IANA timezone identifiers**, not manually calculated UTC offsets.

Examples:

```text
America/New_York
Europe/London
Asia/Kolkata
```

---

## Mentor timezone

The mentor timezone is stored in the mentor profile.

The scheduler does not depend on the mentor's browser timezone.

Initial official mentors use:

```text
Asia/Kolkata
```

---

## Appointment storage

Appointment timestamps represent absolute instants and are stored using PostgreSQL `timestamptz`.

Conceptually:

```text
Parent local time
       ↓
IANA timezone
       ↓
Absolute instant
       ↓
PostgreSQL timestamptz
       ↓
Viewer-specific local display
```

---

## Display

The same appointment may appear as:

```text
Parent — America/New_York
10:30 AM – 11:30 AM
```

and:

```text
Mentor — Asia/Kolkata
8:00 PM – 9:00 PM
```

Both refer to the same absolute appointment.

---

## DST

Temporal / `@js-temporal/polyfill` is used for timezone-aware conversion.

The implementation is designed to correctly handle:

- US DST
- UK DST
- DST start
- DST end
- 23-hour local days
- 25-hour local days
- Mentor local-day capacity boundaries

Daily capacity is based on the mentor's local calendar day even when DST changes the UTC duration of that day.

---

# 10. Concurrency and Booking Safety

Concurrency is protected at multiple levels.

## Application-level protection

The booking operation runs through a database transaction.

The scheduling logic checks:

- active mentor
- working hours
- daily capacity
- overlapping appointments
- approved unavailability

---

## Database-level protection

A PostgreSQL exclusion constraint protects against overlapping appointments for the same mentor.

The appointment range uses half-open intervals:

```text
[start, end)
```

Therefore:

```text
17:00–18:00
18:00–19:00
```

do not overlap.

But:

```text
17:00–18:00
17:30–18:30
```

do overlap.

The database constraint is the final protection against concurrent overlapping bookings.

---

## Why availability alone is insufficient

Availability is informational and can become stale.

Therefore:

```text
GET availability
        ↓
Parent sees available
        ↓
POST booking
        ↓
Backend re-checks everything
        ↓
Transaction + database constraint
        ↓
Booking created or friendly conflict returned
```

---

# 11. Booking Statuses

The normal lifecycle is:

```text
CONFIRMED
    ↓
COMPLETED
```

A booking can also become:

```text
CONFIRMED
    ↓
CANCELLED
```

### Status meaning

| Status | Meaning |
|---|---|
| CONFIRMED | Trial is booked |
| COMPLETED | Trial was completed |
| CANCELLED | Trial was cancelled |

Cancelled appointments do not consume mentor capacity.

---

# 12. Email System

After a successful booking, the system attempts to notify:

1. Parent
2. Assigned mentor

The booking itself does not depend on email delivery succeeding.

---

## Parent email

The parent receives a confirmation containing information such as:

- Parent name
- Student name
- Subject
- Date
- Time in parent timezone
- Booking ID
- Dummy classroom link

---

## Mentor email

When the assigned mentor has a real/usable email address, the mentor receives:

- Student name
- Grade / level
- Subject
- Learning goal where available
- Date
- Time in mentor timezone
- Booking ID
- Classroom link
- Mentor portal link

---

## Demo mentor email

If a mentor has a demo/example address such as:

```text
mentor@example.com
```

the system should not attempt real Gmail delivery to that address.

The assignment remains visible in the Mentor Dashboard.

---

# 13. Email Failure and Admin Notifications

Email failure does **not** cancel or roll back the booking.

This is important because scheduling and email delivery are separate concerns.

## Parent email failure

```text
Booking created
      ↓
Parent email attempted
      ↓
Delivery fails
      ↓
Booking remains CONFIRMED
      ↓
EmailLog = FAILED
      ↓
Admin EMAIL_FAILED notification
```

## Mentor email failure

```text
Booking created
      ↓
Mentor email attempted
      ↓
Delivery fails
      ↓
Booking remains CONFIRMED
      ↓
EmailLog = FAILED
      ↓
Admin EMAIL_FAILED notification
```

The admin notification contains the recipient type and delivery failure information.

The admin can inspect email delivery through the Email Logs area.

---

## Email log statuses

The system records delivery state such as:

```text
QUEUED
SENT
FAILED
NOT_DELIVERED
```

Logs can contain:

- Recipient email
- Recipient type
- Subject
- Appointment ID
- Provider message ID where available
- Error message
- Created time
- Sent time
- Related student/appointment information

---

# 14. Gmail OAuth

The current real email implementation uses the Gmail API rather than a Resend sandbox.

The configured sender account is:

```text
worklord035@gmail.com
```

The parent recipient remains dynamic.

Example:

```text
Parent enters:
parent@example.com

System sends:
worklord035@gmail.com
        ↓
parent@example.com
```

The system does not require the admin to manually send the booking email.

---

## Gmail API flow

```text
Google Cloud Project
        ↓
Gmail API enabled
        ↓
OAuth Web Client
        ↓
OAuth authorization
        ↓
Refresh token
        ↓
Backend
        ↓
Gmail messages.send
        ↓
Parent / Mentor
```

Required OAuth scope:

```text
https://www.googleapis.com/auth/gmail.send
```

---

## Important Gmail setup values

The project expects values equivalent to:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
GOOGLE_REFRESH_TOKEN
GMAIL_SENDER_EMAIL
GMAIL_FROM_NAME
```

Example redirect URI for local development:

```text
http://localhost:3000/api/auth/google/callback
```

The actual client secret and refresh token must never be committed to Git.

---

## OAuth routes

```text
GET /api/auth/google/authorize
GET /api/auth/google/callback
GET /api/auth/google/status
```

---

# 15. Mentor Unavailability

Mentors can request temporary unavailability.

The mentor submits:

- Date
- Start time
- End time
- Reason

The request must be submitted at least 24 hours before its start time.

---

## Workflow

```text
Mentor
  │
  ▼
Request Unavailability
  │
  ▼
PENDING
  │
  ├──────────────┐
  ▼              ▼
APPROVED       REJECTED
  │              │
  ▼              ▼
Blocks         Does not
scheduling     block scheduling
```

Only **APPROVED** requests affect scheduling.

A pending request does not block booking.

A rejected request does not block booking.

The mentor can see the status of their requests.

---

## Admin actions

Admin can:

- Review request
- Approve
- Reject

Approved unavailability is incorporated into mentor eligibility checks.

---

# 16. Authentication and RBAC

The public trial booking does not require login.

Existing users can use:

```text
/login
```

There is one login form.

There is no public role selector.

The backend/database determines the user's role.

---

## Role redirects

```text
STUDENT / PARENT
        ↓
/student/dashboard

MENTOR
        ↓
/mentor/dashboard

ADMIN
        ↓
/admin/dashboard
```

---

## Mentor accounts

The initial official mentor accounts follow:

```text
mntr001@codeyoung.in
mntr002@codeyoung.in
mntr003@codeyoung.in
...
mntr010@codeyoung.in
```

Role is stored in the database.

It is not inferred from the email address.

---

## Admin account

```text
admin@codeyoung.in
```

---

## Adding a mentor

Admin can add a mentor.

A new mentor receives:

- Own account
- Own email
- Password
- MENTOR role
- Mentor profile
- Timezone/availability configuration as required

The new mentor can log in through the same `/login` page and is redirected to the Mentor Dashboard.

A mentor cannot access the Admin Dashboard.

---

## Terminating a mentor

Admin can terminate a mentor.

A terminated mentor:

- Cannot receive new bookings.
- Is excluded from active scheduling capacity.
- Remains in the database/history as required.
- Keeps historical appointments intact.
- Does not have historical booking records deleted merely because the mentor is terminated.

---

# 17. Classroom

The platform uses a dummy class link.

Example:

```text
https://demo.codeyoung.com/class/BK-1024
```

A real Zoom or Google Meet integration is not required.

The classroom route is protected.

Access is limited to the relevant:

- Parent/Student
- Assigned Mentor
- Admin

The class page can provide a simple trial-session experience and Join Class action.

---

# 18. Project Architecture

The application follows a layered architecture:

```text
React Frontend
      │
      │ REST API
      ▼
Express Routes
      │
      ▼
Controllers
      │
      ▼
Services / Business Logic
      │
      ├── Scheduling
      ├── Booking
      ├── Authentication
      ├── Email
      ├── Notifications
      └── Mentor Operations
      │
      ▼
Repositories / Prisma
      │
      ▼
PostgreSQL
```

The scheduling rules live in the backend.

The frontend does not decide whether a booking is actually valid.

---

# 19. Project Structure

```text
codeyoung-platform/
│
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── lib/
│   │   ├── types/
│   │   └── app.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── shared/
│
├── .env.example
├── .gitignore
├── README.md
└── TRANSCRIPT.md
```

---

## Architecture figure

```text
┌──────────────────────────────────────────────────────────┐
│                    PARENT / MENTOR / ADMIN               │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│              React + TypeScript + Vite                   │
│        Tailwind CSS + Framer Motion + Lucide             │
└────────────────────────────┬─────────────────────────────┘
                             │ REST
                             ▼
┌──────────────────────────────────────────────────────────┐
│              Node.js + Express + TypeScript              │
├──────────────────────────────────────────────────────────┤
│ Controllers                                               │
│ Routes                                                    │
│ Middleware                                                │
│ Services                                                  │
│ Repositories                                              │
└──────────────┬──────────────────┬────────────────────────┘
               │                  │
               ▼                  ▼
      ┌────────────────┐   ┌──────────────────┐
      │ Scheduling     │   │ Gmail API        │
      │ Booking        │   │ Email Delivery   │
      │ Capacity       │   │ Notifications    │
      │ Timezones/DST  │   └──────────────────┘
      └───────┬────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│                 PostgreSQL + Prisma                      │
├──────────────────────────────────────────────────────────┤
│ Users                                                     │
│ Mentors                                                   │
│ Mentor Availability                                       │
│ Appointments                                              │
│ Attendance                                                │
│ Email Logs                                                │
│ Notifications                                             │
│ Unavailability Requests                                   │
└──────────────────────────────────────────────────────────┘
```

---

# 20. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React
- Temporal polyfill where frontend timezone handling is required

## Backend

- Node.js
- Express
- TypeScript
- Zod
- JWT
- bcrypt
- Prisma

## Database

- PostgreSQL
- PostgreSQL `timestamptz`
- PostgreSQL exclusion constraint
- Prisma ORM

## Time handling

- Temporal
- `@js-temporal/polyfill`
- IANA timezone identifiers

## Email

- Gmail API
- Google OAuth 2.0

---

# 21. Database

The database is designed around the application's actual scheduling and operational requirements.

Core entities include:

```text
User
Mentor
MentorAvailability
Appointment
TrialAttendance
EmailLog
Notification
MentorUnavailability
```

---

## Appointment data

Appointments include information required to determine:

- Assigned mentor
- Parent
- Student
- Subject
- Start time
- End time
- Booking status
- Meeting/class link

Times are stored as absolute timestamps.

---

## Important indexes and constraints

The database protects:

- Mentor appointment overlap
- Foreign-key relationships
- Appointment lookup
- Mentor lookup
- Time-based scheduling queries

The PostgreSQL exclusion constraint is a key part of concurrent booking protection.

---

# 22. API Overview

The backend exposes REST APIs grouped around the main workflows.

## Health

```text
GET /api/health
```

---

## Authentication

```text
POST /api/auth/login
GET  /api/auth/me
```

Google OAuth:

```text
GET /api/auth/google/authorize
GET /api/auth/google/callback
GET /api/auth/google/status
```

---

## Scheduling

```text
GET /api/scheduling/slots
GET /api/scheduling/capacity
```

Slots accept a date and optional IANA timezone.

---

## Booking

```text
POST /api/bookings
```

Booking is public and login-free for the parent flow.

---

## Mentors

Examples include:

```text
GET /api/mentors
GET /api/mentors/:mentorId
GET /api/mentors/:mentorId/availability/check
```

Protected mentor/admin operations are RBAC-controlled.

---

## Mentor dashboard

Mentor endpoints provide:

- Own profile
- Own classes
- Capacity
- Class details
- Completion
- Unavailability requests

---

## Admin

Admin endpoints provide:

- Mentor management
- Booking management
- Capacity
- Dashboard metrics
- Notifications
- Email logs
- Manual scheduling
- Mentor unavailability approval/rejection

Exact endpoint paths can vary with the implemented route modules; the backend route definitions are the source of truth.

---

# 23. Frontend Pages

## Public

```text
/
```

Landing page.

```text
/book-trial
```

Trial booking experience.

```text
/login
```

Unified login.

---

## Parent/Student

```text
/student/dashboard
```

Authenticated student/parent experience where applicable.

---

## Mentor

```text
/mentor/login
/mentor/dashboard
```

The mentor login route may be used as a dedicated internal entry point, while authentication still uses the same backend role system.

---

## Admin

```text
/admin/login
/admin/dashboard
```

Admin operations are protected by backend RBAC.

---

# 24. UI/UX Design

The design direction is professional US/UK SaaS/EdTech.

## Design principles

- White/light interface
- Navy/charcoal primary text
- Restrained blue/teal/green accents
- Generous whitespace
- Strong typography
- Clean cards
- Subtle shadows
- Minimal gradients
- Small meaningful animations
- Responsive layouts
- Clear loading states
- Clear empty states
- Clear error states

---

## Avoided design patterns

The product intentionally avoids:

- Neon colors
- Excessive gradients
- Excessive glassmorphism
- Cartoonish UI
- Constant animations
- Overly colorful cards
- Unnecessary features

---

## Login experience

The login page uses a dedicated full-page layout.

It includes:

- Codeyoung branding
- Educational/product visual area
- Email field
- Password field
- Password visibility control
- Loading state
- Form validation
- Reduced-motion consideration
- Role-based redirect after successful authentication

There is no role selector.

---

# 25. Validation and Security

## Input validation

Backend requests use schema validation.

Examples:

- Student details
- Parent email
- Date/time
- IANA timezone
- Booking start time
- Unavailability date/time
- Mentor information

---

## Authentication

The backend uses:

- Password hashing with bcrypt
- JWT-based authentication
- Protected routes
- Role-based authorization

---

## Authorization

Examples:

```text
Parent
  → Own permitted student/booking/class resources

Mentor
  → Own mentor resources

Admin
  → Administrative resources
```

A mentor cannot access admin operations merely by knowing an endpoint URL.

---

## Database safety

The implementation avoids unsafe interpolated SQL.

Database access uses Prisma and safe/parameterized database operations.

---

## Environment security

Secrets must be stored in environment configuration.

Never commit:

- Gmail client secret
- Gmail refresh token
- Access tokens
- Database passwords
- API secrets

---

# 26. Seed and Demo Data

The initial official mentor pool is exactly:

```text
mntr001@codeyoung.in
mntr002@codeyoung.in
mntr003@codeyoung.in
mntr004@codeyoung.in
mntr005@codeyoung.in
mntr006@codeyoung.in
mntr007@codeyoung.in
mntr008@codeyoung.in
mntr009@codeyoung.in
mntr010@codeyoung.in
```

There should be no extra duplicate initial mentor records.

If additional mentors are intentionally created later through Admin → Add Mentor, they are legitimate new mentor records rather than duplicate seed records.

Seed operations should be idempotent and should not continuously create duplicate official mentors.

---

## Mentor 003 example

The mentor capacity display can show:

```text
Mentor 003
1 / 2
1 slot remaining
```

This reflects real database appointments.

---

## Demo capacity scenarios

The system supports demonstrating:

### Simultaneous full

10 mentors are occupied at the same time.

Result:

```text
Fully booked
```

### Daily full

All 10 mentors have reached 2 active classes.

Result:

```text
No trial times available for this date.
```

The parent UI should not expose internal mentor-capacity calculations unnecessarily.

---

# 27. Environment Variables

The project uses environment configuration for infrastructure and secrets.

Typical values include:

```text
DATABASE_URL=...

JWT_SECRET=...

PORT=3000

APP_BASE_URL=http://localhost:5173

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_REFRESH_TOKEN=...

GMAIL_SENDER_EMAIL=worklord035@gmail.com
GMAIL_FROM_NAME=Codeyoung Admissions
```

Do not copy secrets into `README.md`.

Use `.env.example` for non-secret variable names and safe placeholders.

---

# 28. Installation

## Requirements

Install:

- Node.js
- npm
- PostgreSQL / Supabase PostgreSQL
- Git

A Google Cloud project is required only when real Gmail delivery is being tested.

---

## Clone

```bash
git clone <repository-url>
cd codeyoung-platform
```

---

## Install backend dependencies

```bash
cd server
npm install
```

---

## Install frontend dependencies

```bash
cd ../client
npm install
```

---

## Configure environment

Create the project's environment configuration using the existing environment-loading setup.

At minimum configure:

```text
DATABASE_URL
JWT_SECRET
PORT
APP_BASE_URL
```

For Gmail:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
GOOGLE_REFRESH_TOKEN
GMAIL_SENDER_EMAIL
GMAIL_FROM_NAME
```

---

# 29. Running the Project

## Start backend

From:

```text
server/
```

run the project's configured development command, for example:

```bash
npm run dev
```

The backend is configured around:

```text
http://localhost:3000
```

---

## Start frontend

From:

```text
client/
```

run:

```bash
npm run dev
```

Vite commonly runs on:

```text
http://localhost:5173
```

If the port is already occupied, Vite may choose another available port.

---

## Database

Run Prisma commands from the backend project as required by the repository configuration.

Typical commands include:

```bash
npx prisma generate
npx prisma migrate dev
```

For seed data, use the project's configured seed command.

---

## Health check

After starting the backend:

```text
GET /api/health
```

Expected result should indicate that the backend is running.

---

# 30. Testing

The project includes automated tests for the major scheduling and security rules.

Testing covers areas such as:

- Mentor availability
- Slot generation
- Timezone conversion
- DST behavior
- Daily mentor capacity
- Simultaneous capacity
- Overlapping appointments
- Cancelled bookings
- Booking validation
- Race-condition handling
- Authentication
- RBAC
- Booking controller behavior
- Email behavior
- Mentor/admin operations

The latest implementation verification reported:

```text
15 test suites
130 tests passed
TypeScript/typecheck clean
Build successful
```

These figures describe the verification state reported during development; rerun the repository's test/build commands to verify the current checkout.

---

# 31. Demo Accounts

The configured demo accounts include:

## Admin

```text
Email:
admin@codeyoung.in

Password:
Admin@1234
```

## Mentors

```text
mntr001@codeyoung.in
mntr002@codeyoung.in
...
mntr010@codeyoung.in
```

The demo mentor password configured during development is:

```text
Mentor@1234
```

For a submitted production repository, credentials should be treated as demo-only credentials and changed if the environment is exposed.

---

# 32. Important Demo Scenarios

## Scenario 1 — Normal booking

```text
Parent
 ↓
Book Free Trial
 ↓
Select date
 ↓
Select available time
 ↓
Enter student/parent information
 ↓
Confirm
 ↓
Backend assigns mentor
 ↓
Booking confirmed
 ↓
Class link generated
```

---

## Scenario 2 — Fully booked slot

Arrange for all active mentors to be teaching at the same time.

The parent sees:

```text
Fully booked — all mentors are currently teaching.
```

The parent can select another slot.

---

## Scenario 3 — Full day

All 10 mentors have reached 2 active classes for their local calendar day.

The parent sees a friendly full-day state rather than internal capacity numbers.

---

## Scenario 4 — Booking race

Two users attempt to book the final available mentor simultaneously.

Expected behavior:

```text
Request A → booking succeeds
Request B → 409/conflict handling
```

The second user receives:

```text
This slot was just booked. Choose another available time.
```

---

## Scenario 5 — Mentor timezone

Parent:

```text
America/New_York
```

Mentor:

```text
Asia/Kolkata
```

Both see the same appointment in their own local time.

---

## Scenario 6 — Mentor unavailability

```text
Mentor
 ↓
Submit unavailable request
 ↓
PENDING
 ↓
Admin reviews
 ↓
APPROVED
 ↓
Scheduler excludes that period
```

A pending request alone does not block booking.

---

## Scenario 7 — Mentor termination

Admin terminates a mentor.

Expected:

```text
Mentor removed from active scheduling
        +
Historical appointments preserved
```

---

## Scenario 8 — Parent email failure

```text
Booking succeeds
 ↓
Gmail delivery fails
 ↓
Booking remains CONFIRMED
 ↓
EmailLog = FAILED
 ↓
Admin EMAIL_FAILED notification
```

---

## Scenario 9 — Mentor email failure

```text
Booking succeeds
 ↓
Mentor email delivery fails
 ↓
Booking remains CONFIRMED
 ↓
EmailLog = FAILED
 ↓
Admin EMAIL_FAILED notification
 ↓
Mentor can still see class in dashboard
```

---

# 33. Error Handling

The application uses customer-friendly error states.

Examples:

### Full slot

> Fully booked — all mentors are currently teaching.

### Full day

> No trial times available for this date. Let's find another time.

### Race condition

> This slot was just booked. Choose another available time.

### Invalid data

The user is shown a specific validation message instead of a generic server error.

### Email failure

The booking remains successful and the failure is handled through logging/admin notification.

The parent should not receive a confusing error saying the booking failed merely because an email provider failed.

---

# 34. Project Principles

## 1. Booking is experience-first

The trial lets the parent experience Codeyoung before deciding whether to sign up.

## 2. Parent chooses time, not mentor

Mentor assignment is a backend scheduling responsibility.

## 3. Backend is authoritative

Frontend availability is informational.

The backend always validates the final booking.

## 4. Timezone is an IANA concept

Never rely on manually calculated UTC offsets.

## 5. Mentor capacity uses mentor-local days

The 2-class rule is based on the mentor's local calendar day.

## 6. Database protects scheduling integrity

Application checks are supplemented by PostgreSQL constraints.

## 7. Email is separate from booking

A delivery failure must not destroy a valid booking.

## 8. Historical data matters

Terminating a mentor does not delete historical appointment information.

## 9. Keep the product focused

The assignment does not need unrelated product features.

---

# 35. Deliberately Not Included

The project intentionally does not add unnecessary scope such as:

- Payment processing
- Full CRM
- AI mentor matching
- Real Zoom integration
- Real Google Meet classroom infrastructure
- Chat system
- Mobile application
- Complex marketing automation
- Unnecessary parent mentor selection
- Unnecessary booking steps
- Unrelated analytics features

The goal is a focused, production-minded trial booking system.

---

# 36. Submission Files

The submission should contain:

```text
README.md
TRANSCRIPT.md
```

### README.md

Contains:

- Product overview
- Features
- Architecture
- Project structure
- Scheduling rules
- Timezone/DST behavior
- Capacity rules
- Booking safety
- Authentication/RBAC
- Email/Gmail behavior
- Email failure behavior
- Mentor unavailability
- Database
- API overview
- Installation
- Environment configuration
- Running instructions
- Testing
- Demo accounts
- Demo scenarios
- Scope decisions

### TRANSCRIPT.md

Contains the development conversation/transcript used during the AI-assisted implementation.

Secrets such as API keys, OAuth secrets and refresh tokens must be redacted before submission.

---

# 37. Final Verification Checklist

Before submission, verify:

## Product

- [ ] Landing page works.
- [ ] Book Free Trial works without login.
- [ ] Parent cannot select a mentor.
- [ ] Student details work.
- [ ] Parent details work.
- [ ] Date/time selection works.
- [ ] Confirmation works.
- [ ] Class link is generated.

## Mentors

- [ ] Exactly 10 official seed mentors exist.
- [ ] No duplicate initial mentor records exist.
- [ ] Mentor email is visible where required.
- [ ] Mentor dashboard works.
- [ ] Mentor capacity shows 0/2, 1/2 or 2/2.
- [ ] Mentor can complete a trial.
- [ ] Admin can add a mentor.
- [ ] Admin can terminate a mentor.
- [ ] Historical bookings remain after termination.

## Scheduling

- [ ] Maximum 2 classes per mentor/day.
- [ ] Daily limit uses mentor timezone.
- [ ] Maximum 10 simultaneous classes.
- [ ] Overlapping appointments are blocked.
- [ ] Cancelled appointments do not consume capacity.
- [ ] Approved unavailability blocks scheduling.
- [ ] Pending unavailability does not block scheduling.
- [ ] Rejected unavailability does not block scheduling.
- [ ] Race conditions are protected.

## Timezone

- [ ] Browser timezone auto-detection works.
- [ ] Manual timezone override works.
- [ ] IANA zones are used.
- [ ] PostgreSQL timestamptz is used.
- [ ] Parent sees parent-local time.
- [ ] Mentor sees mentor-local time.
- [ ] DST scenarios are handled.

## Authentication

- [ ] `/login` works.
- [ ] Parent/student redirect works.
- [ ] Mentor redirect works.
- [ ] Admin redirect works.
- [ ] Mentor cannot access Admin Dashboard.
- [ ] Parent cannot access Mentor/Admin resources.
- [ ] Backend RBAC is enforced.

## Email

- [ ] Gmail API is configured when real email testing is required.
- [ ] Parent receives confirmation when delivery succeeds.
- [ ] Mentor receives assignment when the mentor email is usable.
- [ ] Demo/example mentor emails are not sent through Gmail.
- [ ] EmailLog is created.
- [ ] SENT/FAILED status is recorded.
- [ ] Email failure does not cancel booking.
- [ ] Admin receives EMAIL_FAILED notification.
- [ ] Gmail secrets are not committed.

## Admin

- [ ] Total Booked Classes excludes cancelled bookings.
- [ ] Completed Classes displays completed/total booked.
- [ ] Today's Classes displays X/20.
- [ ] Bookings are ordered earliest first.
- [ ] Parent email is visible.
- [ ] Mentor assignment is visible.
- [ ] Email logs are accessible.
- [ ] Notifications are accessible.
- [ ] Unavailability requests can be approved/rejected.

## Quality

- [ ] Frontend connects to real backend APIs.
- [ ] Backend connects to real PostgreSQL.
- [ ] No fake frontend-only booking logic.
- [ ] No hardcoded production secrets.
- [ ] Build passes.
- [ ] Tests pass.
- [ ] README is up to date.
- [ ] TRANSCRIPT.md is included.
