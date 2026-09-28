# Codeyoung Trial Class Booking Platform

A production-oriented full-stack trial-class booking platform for Codeyoung.

The platform allows parents to book a free 1:1 trial class without creating an account first. The system automatically assigns an available mentor, handles mentor capacity and timezone/DST rules, sends class details by email, and provides separate dashboards for Students/Parents, Mentors, and Admins.

---

## 1. Project Overview

### Objective

Build a trial-class experience where a parent can:

1. Visit the Codeyoung website.
2. Choose a suitable trial date and time.
3. Enter student and parent/guardian details.
4. Confirm the trial without mandatory signup.
5. Receive a confirmation email containing the class link.
6. Attend the live trial with an automatically assigned mentor.

The platform is designed around the idea:

> **Experience Codeyoung before you join.**

The trial is therefore treated as an experience before signup rather than a signup-first workflow.

---

## 2. How to Run the Project

### Prerequisites

Install the following before running the project:

- Node.js 20+
- npm
- PostgreSQL / Supabase PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd freeTrialClassCY
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="your-postgresql-connection-string"
JWT_SECRET="your-jwt-secret"

APP_BASE_URL="http://localhost:3000"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
GOOGLE_REFRESH_TOKEN="your-google-refresh-token"

GMAIL_SENDER_EMAIL="your-gmail-address"
GMAIL_FROM_NAME="Codeyoung Admissions"
```

Never commit `.env` or any secret values to Git.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Apply Database Migrations

```bash
npx prisma migrate deploy
```

### 6. Seed the Database

```bash
npm run db:seed
```

This creates the demo Admin and the 10 official mentors.

### 7. Start the Development Server

```bash
npm run dev
```

Check the terminal output for the local application URL.

### 8. Check Backend Health

Open:

```
http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok"
}
```

### 9. Demo Login

**Admin**

```
Email: admin@codeyoung.in
Password: Admin@1234
```

**Mentor**

```
Email: mntr001@codeyoung.in
Password: Mentor@1234
```

### 10. Run Tests

```bash
npm test
```

### 11. Run Type Checking

```bash
npm run typecheck
```

### 12. Build for Production

```bash
npm run build
```

### 13. Start the Production Build

```bash
npm start
```

---

## 3. Main Features

### Parent / Student

- Public landing page
- Book Free Trial without login
- Student details collection
- Parent/guardian details collection
- Date and time selection
- Automatic timezone detection
- Manual IANA timezone override
- Availability-aware slot selection
- Booking confirmation
- Automatic mentor assignment
- Trial countdown
- Class link
- Login-based student dashboard
- Appointment history
- Join class
- Booking status visibility

### Mentor

- Secure login
- Mentor dashboard
- Mentor email/profile
- Today's trial classes
- Upcoming classes
- Student details
- Parent/guardian details
- Mentor-local appointment time
- Daily capacity indicator
- Class join action
- Mark class as completed
- Submit unavailability requests
- View unavailability request status

### Admin

- Secure admin login
- Admin dashboard
- Overall booking metrics
- Daily capacity
- Mentor management
- Add mentor
- Terminate mentor
- View all appointments
- View student/parent details
- View assigned mentor
- View booking status
- Approve/reject mentor unavailability
- Manual mentor assignment
- Email delivery status
- Notifications
- Operational monitoring

---

## 3. Scheduling Rules

The platform has **10 official mentors**.

Each mentor can conduct a maximum of:

- **2 trial classes per day**
- **1 hour per trial class**

Therefore:

```
10 mentors × 2 classes = 20 trial classes/day maximum
```

### Simultaneous Capacity

If all 10 mentors are available, the platform can support:

```
10 simultaneous trial classes
```

The backend does not simply hardcode the available capacity. It derives availability from active, eligible mentors and their schedules.

### Appointment Status

```
CONFIRMED
CANCELLED
COMPLETED
```

Normal lifecycle:

```
CONFIRMED → COMPLETED
```

Cancelled appointments do not consume active booking capacity.

Completed appointments count toward the mentor's daily limit.

---

## 4. Automatic Mentor Assignment

Parents do **not** select a mentor.

The parent selects a time.

The backend then finds an eligible mentor based on:

- Mentor active status
- Working availability
- Existing appointments
- Daily appointment limit
- Mentor unavailability
- Timezone
- Appointment overlap
- Database-level concurrency protection

The current assignment strategy prefers the mentor with the lowest number of appointments for the relevant day, with mentor ID used as a deterministic tie-breaker.

This keeps mentor assignment automatic and prevents exposing internal mentor availability to parents.

---

## 5. Timezone and DST Handling

Parents and mentors may be located in different countries.

For example:

```
Parent: United States
Mentor: India
```

The application uses **IANA timezone identifiers** rather than manually storing UTC offsets.

Examples:

```
America/New_York
Europe/London
Asia/Kolkata
```

### Parent

The browser timezone is detected using:

```javascript
Intl.DateTimeFormat().resolvedOptions().timeZone
```

The user can manually override it when necessary.

### Mentor

Each mentor has a stored IANA timezone.

### Time Library

The project uses:

```
Temporal
@js-temporal/polyfill
```

This provides safer handling of:

- Timezones
- DST transitions
- Local dates
- UTC timestamps
- Cross-timezone conversion

The database stores appointment timestamps using PostgreSQL `timestamptz`.

---

## 6. Booking Concurrency and Database Integrity

A major requirement is preventing two parents from receiving the same mentor/time slot when they book simultaneously.

Application-level checks alone are not sufficient because of race conditions.

The database therefore uses PostgreSQL-level protection.

The appointment time range is represented using:

```
tstzrange
```

with a half-open interval:

```
[startTime, endTime)
```

An exclusion constraint prevents overlapping appointments for the same mentor.

This provides database-level protection even when multiple booking requests arrive concurrently.

The booking operation also runs transactionally.

If another request wins the slot first, the losing request receives an appropriate conflict response instead of creating an invalid overlapping appointment.

---

## 7. Mentor Unavailability

Mentors can request periods when they are unavailable.

Workflow:

```
Mentor submits request
        ↓
Admin reviews request
        ↓
Approve / Reject
        ↓
Approved request blocks scheduling
```

Important rules:

- Pending requests do not block booking.
- Rejected requests do not block booking.
- Approved requests block booking.
- Requests must be submitted at least 24 hours before the requested start time.
- The mentor can see the status of their request.
- Admin controls final approval.

Example:

```
Mentor 003
27 September
12:00 PM – 4:00 PM
```

If approved, the scheduler will not assign new trials to that mentor during the requested period.

---

## 8. Authentication and RBAC

The application uses:

- JWT authentication
- Password hashing with bcrypt
- Role-based access control
- Protected routes
- Backend authorization

Roles:

```
STUDENT / PARENT
MENTOR
ADMIN
```

The role is stored in the database.

It is **not inferred from the email address**.

### Login

The public application has one main Login entry.

The login form accepts:

```
Email
Password
```

After authentication, the backend role determines the dashboard:

```
STUDENT/PARENT → Student Dashboard
MENTOR         → Mentor Dashboard
ADMIN          → Admin Dashboard
```

Mentor and Admin routes are protected by backend RBAC.

Frontend route protection is only a UX layer; backend authorization is the actual security boundary.

---

## 9. Demo Accounts

The seeded development/demo accounts are:

### Admin

```
Email: admin@codeyoung.in
Password: Admin@1234
```

### Mentors

```
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

Mentor demo password:

```
Mentor@1234
```

For production, these demo passwords should be changed.

---

## 10. Email Delivery

The application uses the **Gmail API with OAuth 2.0**.

Resend is not part of the current implementation.

### Booking Email Flow

After a successful booking:

```
Parent books trial
       ↓
Backend confirms appointment
       ↓
Mentor assigned
       ↓
Booking committed
       ↓
Parent confirmation email
       ↓
Mentor assignment email
       ↓
Class link available
```

Email delivery happens after the booking transaction so an email failure does not roll back a valid booking.

The application records email delivery information through `EmailLog`.

Possible states include:

```
QUEUED
SENT
FAILED
NOT_DELIVERED
```

Admin notifications can surface email failures.

### Gmail OAuth Environment Variables

The backend requires configuration similar to:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_REFRESH_TOKEN=
GMAIL_SENDER_EMAIL=
GMAIL_FROM_NAME=
```

Do not commit these values to Git.

---

## 11. Class Link

A dummy class link is generated for the trial appointment.

Example format:

```
https://demo.codeyoung.com/class/BK-1024
```

The application also provides a protected classroom route:

```
/class/:appointmentId
```

Access is restricted to authorized participants such as:

- Associated parent/student
- Assigned mentor
- Admin

---

## 12. Frontend

The frontend is built with:

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React
- React Router
- Temporal

### Design Direction

The interface follows a professional EdTech/SaaS visual style:

- Light background
- Navy/charcoal typography
- Restrained blue/teal accents
- Generous whitespace
- Subtle shadows
- Subtle motion
- Responsive layout
- Clear hierarchy
- Minimal visual noise

The design intentionally avoids:

- Excessive gradients
- Heavy glassmorphism
- Neon UI
- Constant animations
- Overly cartoonish components
- Unnecessary dashboard sections

---

## 13. Landing Page

Primary message:

> **Experience Codeyoung before you join.**

Supporting message communicates that the user can experience:

- 1:1 mentoring
- The learning platform
- Coaching quality
- A real trial class
- No commitment required

Primary CTA:

```
Book a Free Trial
```

The public navigation keeps the experience simple and exposes the main Login entry without placing separate Mentor/Admin login buttons in the public header.

---

## 14. Availability UX

The parent sees availability rather than internal mentor information.

Slot states:

```
AVAILABLE
LIMITED
FULL
```

Where:

```
AVAILABLE → 2 or more eligible mentors
LIMITED   → 1 eligible mentor
FULL      → 0 eligible mentors
```

A full slot is disabled.

The parent is not shown internal information such as:

```
20/20 mentors/classes
```

Instead, the UI communicates customer-friendly states such as:

```
Fully booked — all mentors are currently teaching.
```

For a completely unavailable day:

```
No trial times available for this date.
Let’s find another time.
```

---

## 15. Trial Countdown

After booking, the user can see a live countdown to the upcoming trial.

Examples:

```
Your trial starts in 2 days
```

or:

```
Your trial starts in 18 minutes
```

When the class becomes available, the interface provides the Join Class action.

---

## 16. Admin Dashboard

The Admin Dashboard provides operational visibility.

Example metrics:

```
Total Booked Classes
Completed Classes
Today's Classes
Daily Capacity
```

Example:

```
Total Booked Classes: 6

Completed Classes: 3 / 6

Today's Classes: 5 / 20
```

Cancelled bookings are excluded from the booked-class count.

The admin can inspect:

- Booking date
- Booking time
- Parent email
- Student details
- Assigned mentor
- Status
- Attendance
- Email delivery state

---

## 17. Mentor Management

Admin can:

### Add Mentor

Create a new mentor with:

- Name
- Email
- Password
- Role = MENTOR
- Timezone
- Availability

The mentor can then log in through the normal login page and is redirected to the Mentor Dashboard.

### Terminate Mentor

Terminated mentors:

- Cannot receive new bookings
- Are excluded from capacity
- Remain visible in historical records
- Keep historical appointments

Historical data is preserved rather than deleting appointment history.

---

## 18. Attendance

Booking and attendance are treated as separate concepts.

A booking being confirmed does not automatically mean the student attended.

Attendance can therefore represent the actual trial experience.

This allows the admin to distinguish:

```
Booked
```

from:

```
Actually attended
```

---

## 19. Project Architecture

The current application is a unified full-stack project.

```
root/
├── src/                       # React frontend
│   ├── components/
│   ├── pages/
│   ├── api/
│   └── ...
│
├── server/
│   └── src/                   # Express backend
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── middleware/
│       ├── routes/
│       └── ...
│
├── prisma/
│   └── schema.prisma
│
├── scripts/
│   └── ...
│
├── server.ts                  # Full-stack server entry
├── package.json
├── vite.config.ts
└── ...
```

The root project is the canonical application structure.

---

## 20. Backend Architecture

The backend follows a layered design.

Conceptually:

```
HTTP Request
     ↓
Route
     ↓
Controller
     ↓
Service
     ↓
Repository
     ↓
Prisma
     ↓
PostgreSQL
```

Responsibilities are separated so that:

- Controllers handle HTTP concerns.
- Services contain business rules.
- Repositories handle persistence.
- Middleware handles authentication/authorization.
- Validation protects API boundaries.
- Prisma handles database access.

---

## 21. Core Backend Technologies

```
Node.js
Express
TypeScript
Prisma
PostgreSQL
JWT
bcrypt
Zod
Temporal
Gmail API
```

---

## 22. Important API Endpoints

### Health

```http
GET /api/health
```

### Authentication

```http
POST /api/auth/login
GET  /api/auth/me
```

### Google OAuth

```http
GET /api/auth/google/authorize
GET /api/auth/google/callback
GET /api/auth/google/status
```

### Scheduling

```http
GET /api/scheduling/slots
GET /api/scheduling/capacity
```

### Booking

```http
POST /api/bookings
```

### Mentors

```http
GET /api/mentors
GET /api/mentors/:mentorId
GET /api/mentors/:mentorId/availability/check
```

Additional protected endpoints are available for:

- Student appointments
- Mentor appointments
- Mentor completion
- Mentor unavailability
- Admin operations
- Notifications
- Attendance
- Email logs
- Classroom access

---

# 24. Production Build

Build the complete application:

```bash
npm run build
```

Start production server:

```bash
npm start
```

The production server serves the built React frontend and Express API from the same application.

---

# 25. Testing

Run the test suite:

```bash
npm test
```

Run TypeScript validation:

```bash
npm run typecheck
```

Run the production build:

```bash
npm run build
```

The project includes tests covering areas such as:

- Mentor availability
- Scheduling
- Capacity
- Booking
- Concurrency
- Authentication
- RBAC
- Mentor operations
- Admin operations
- Email handling
- API behavior

---

# 26. Database

PostgreSQL is used as the primary relational database.

Prisma provides the ORM/data-access layer.

Important database concepts include:

- Users
- Mentors
- Mentor availability
- Appointments
- Attendance
- Email logs
- Notifications
- Unavailability requests

The database also contains indexes and constraints required for scheduling integrity.

---

# 27. Security

The application applies several security controls.

### Authentication

Passwords are hashed using bcrypt.

### Authorization

JWT authentication and backend RBAC protect role-specific endpoints.

### Validation

Zod validates incoming request data.

### Database Safety

Prisma parameterization and database constraints protect persistence operations.

### Environment Secrets

Sensitive values are stored in environment variables.

Do not commit:

```
.env
JWT secrets
Database passwords
Google client secrets
Google refresh tokens
API keys
```

### CORS

The backend restricts cross-origin access according to the configured deployment environment.

---

# 28. Deployment

The current architecture supports deployment as a unified Render Web Service.

Typical Render configuration:

### Root Directory

```
.
```

### Build Command

```bash
npm install && npx prisma migrate deploy && npm run db:seed && npm run build
```

### Start Command

```bash
npm start
```

The application uses PostgreSQL/Supabase as its database.

Gmail OAuth is used for transactional email.

---

## 29. Render Environment

Production environment variables should include the required database, authentication, application URL, and Gmail OAuth configuration.

Example:

```env
DATABASE_URL=...
JWT_SECRET=...
APP_BASE_URL=https://your-production-domain
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-production-domain/api/auth/google/callback
GOOGLE_REFRESH_TOKEN=...
GMAIL_SENDER_EMAIL=...
GMAIL_FROM_NAME=Codeyoung Admissions
```

Secrets must be configured in Render Environment Variables rather than committed to Git.

---

# 30. Google OAuth Production Configuration

For production, the Google OAuth redirect URI must exactly match the backend callback URL.

Example:

```
https://your-production-domain/api/auth/google/callback
```

The same URI must be configured in:

1. Google Cloud OAuth Client
2. Production environment variable
3. Application configuration

Any mismatch can cause OAuth callback failures.

---

# 31. Error Handling

The application distinguishes between different classes of errors.

Examples:

### Invalid booking data

```
400 Bad Request
```

### Authentication failure

```
401 Unauthorized
```

### Insufficient permissions

```
403 Forbidden
```

### Slot/mentor conflict

```
409 Conflict
```

### Unexpected server failure

```
500 Internal Server Error
```

The frontend converts these into user-friendly messages instead of exposing internal implementation details.

---

# 32. Important Product Decisions

### Parent Does Not Select Mentor

This keeps the booking experience simple and prevents exposing internal scheduling information.

### Booking Does Not Require Signup

A parent should be able to experience the product before creating an account.

### Role Comes From Database

The application never assumes that an email address represents a specific role.

### Timezone Uses IANA IDs

This avoids incorrect manual UTC-offset calculations and improves DST handling.

### Capacity Is Backend Controlled

The frontend only displays availability. The backend remains authoritative.

### Database Protects Against Race Conditions

Availability checks are not treated as sufficient protection by themselves.

### Booking and Email Are Separate

A valid booking should not disappear because an external email provider temporarily fails.

### Historical Data Is Preserved

Terminating a mentor does not erase their historical appointments.

---

# 33. Customer Experience Flow

The complete parent journey is:

```
Landing Page
     ↓
Book a Free Trial
     ↓
Student Details
     ↓
Parent / Guardian Details
     ↓
Date & Time
     ↓
Availability Check
     ↓
Automatic Mentor Assignment
     ↓
Booking Confirmation
     ↓
Email Confirmation
     ↓
Trial Countdown
     ↓
Join Class
     ↓
Trial Experience
```

---

# 34. Mentor Experience Flow

```
Login
  ↓
Mentor Dashboard
  ↓
Today's Classes
  ↓
Student Details
  ↓
Local Appointment Time
  ↓
Join Class
  ↓
Conduct Trial
  ↓
Mark Completed
```

---

# 35. Admin Experience Flow

```
Login
  ↓
Admin Dashboard
  ↓
Monitor Capacity
  ↓
View Bookings
  ↓
Manage Mentors
  ↓
Approve / Reject Unavailability
  ↓
Inspect Attendance
  ↓
Monitor Email Notifications
```

---

# 36. Current Scope

The core implementation focuses on:

- Trial booking
- Automatic mentor assignment
- Mentor capacity
- Daily capacity
- Simultaneous capacity
- Timezone/DST handling
- Concurrency protection
- Parent experience
- Mentor dashboard
- Admin dashboard
- Mentor unavailability
- Mentor management
- Authentication
- RBAC
- Attendance
- Gmail transactional email
- Protected classroom
- Notifications
- Email logging

---

# 37. Future Improvements

Potential production enhancements include:

- Real video classroom provider integration
- Calendar integrations
- SMS/WhatsApp notifications
- Automated rescheduling
- Parent feedback collection
- Trial performance analytics
- Advanced mentor scheduling
- Multi-region deployment
- Observability and centralized logging
- Automated database backups
- CI/CD pipeline
- Automated security scanning

These are outside the core trial-booking requirement unless explicitly enabled.

---

# 38. Engineering Principles

The implementation follows these principles:

1. **Backend is authoritative.**
2. **Database constraints protect critical invariants.**
3. **Business logic belongs in services rather than UI components.**
4. **Authentication and authorization are enforced server-side.**
5. **Timezone-aware scheduling is mandatory.**
6. **External service failures should not corrupt core booking state.**
7. **Historical records should be preserved.**
8. **Customer-facing UX should hide unnecessary operational complexity.**
9. **The system should fail clearly when capacity is unavailable.**
10. **Real data and real integrations should be used instead of fake production behavior wherever possible.**

---

# 39. Submission Checklist

Before submission, verify:

- [ ] Repository is accessible
- [ ] README is present
- [ ] `.env` is not committed
- [ ] Database connection works
- [ ] Prisma client generates successfully
- [ ] Database migrations apply
- [ ] Seed data works
- [ ] Exactly 10 official mentors exist
- [ ] Admin login works
- [ ] Mentor login works
- [ ] Parent can book without login
- [ ] Mentor assignment works
- [ ] Capacity rules work
- [ ] Timezone conversion works
- [ ] DST handling is tested
- [ ] Booking concurrency is protected
- [ ] Mentor unavailability workflow works
- [ ] Admin mentor management works
- [ ] Classroom access is protected
- [ ] Email configuration is valid
- [ ] Gmail OAuth redirect URI is configured
- [ ] Production build succeeds
- [ ] Production health endpoint works

---

## Final Product

The final platform provides a complete trial-class booking workflow from the parent's first visit through mentor assignment, class participation, attendance, and administrative management.

The key engineering focus is not only creating a booking form, but building a reliable scheduling system that handles:

```
Availability
Capacity
Concurrency
Timezones
DST
Authentication
Authorization
Email delivery
Mentor operations
Admin operations
Customer experience
```

The result is a practical full-stack trial-class platform designed around the experience of trying Codeyoung before making a signup decision.
