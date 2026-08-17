# Nagrik Setu — Digital Complaint & Grievance Management System

A centralized web platform for citizens to register complaints, track them in
real time, and for departments to manage resolution through role-based
dashboards, SLA-driven escalation, and analytics.

Built for the **Unified Mentor** project brief on Digital Complaint &
Grievance Management, modeled after e-consumer grievance portals.

---

## 1. What's included

```
grievance-system/
├── backend/                 Express REST API (JWT auth, SQLite-free JSON DB)
│   ├── server.js             App entrypoint
│   ├── db.js                 lowdb (file-based) data store
│   ├── constants.js          Categories → department map, SLA hours, statuses
│   ├── escalationEngine.js   Cron job: auto-escalates SLA breaches
│   ├── seed.js                Demo data seeder
│   ├── middleware/auth.js    JWT verification & role guards
│   └── routes/                auth.js, complaints.js, users.js, analytics.js
├── frontend/                 React + Vite single-page app
│   └── src/
│       ├── pages/             Login, Register, dashboards, complaint detail, analytics
│       ├── components/        Layout, status badges, escalation ladder
│       └── styles.css         Design system ("case-file" civic theme)
└── docs/
    └── PRD.md                 Product Requirements Document
```

## 2. Tech stack

| Layer          | Choice                                         |
|-----------------|------------------------------------------------|
| Frontend        | React 18, React Router, Recharts, Vite         |
| Backend         | Node.js, Express                                |
| Data store      | lowdb (JSON file) — zero-config, swappable for PostgreSQL/MySQL later |
| Auth            | JWT (jsonwebtoken) + bcrypt password hashing    |
| File uploads    | Multer                                          |
| Scheduling      | node-cron (SLA breach auto-escalation)          |

> The PRD's suggested stack lists PostgreSQL/MySQL. This build uses a
> file-based JSON store (`lowdb`) so the whole system runs with **zero
> external services** — no database server to install. The data-access layer
> is isolated in `backend/db.js` and `backend/routes/*`, so swapping in
> PostgreSQL/Prisma later only touches those files, not the API contracts
> or the frontend.

## 3. Running it locally

You need Node.js 18+ installed. Two terminals:

**Terminal 1 — Backend API**
```bash
cd backend
npm install
npm run seed     # creates demo accounts + sample complaints (run once)
npm start        # runs on http://localhost:4000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm install
npm run dev      # runs on http://localhost:5173
```

Open **http://localhost:5173** in your browser. The Vite dev server proxies
`/api` calls to the backend automatically (see `frontend/vite.config.js`).

To create a production build of the frontend: `npm run build` (outputs to
`frontend/dist`, which can be served by any static host or by Express).

## 4. Demo accounts (created by `npm run seed`)

| Role    | Email                     | Password     | Notes                          |
|---------|----------------------------|--------------|---------------------------------|
| Admin   | admin@grievance.gov        | Admin@123    | Full system access              |
| Officer | officer1@grievance.gov     | Officer@123  | Water & Sanitation dept         |
| Officer | officer2@grievance.gov     | Officer@123  | Power & Utilities dept          |
| Officer | officer3@grievance.gov     | Officer@123  | Public Works dept               |
| Officer | officer4@grievance.gov     | Officer@123  | Consumer Affairs dept           |
| Officer | officer5@grievance.gov     | Officer@123  | Finance & Billing dept          |
| Officer | officer6@grievance.gov     | Officer@123  | Transport dept                  |
| Officer | officer7@grievance.gov     | Officer@123  | Health dept                     |
| Officer | officer8@grievance.gov     | Officer@123  | General Administration dept     |
| Citizen | ravi@example.com           | Citizen@123  | Sample citizen with filed cases |
| Citizen | priya@example.com          | Citizen@123  | Sample citizen with filed cases |
| Citizen | amit@example.com           | Citizen@123  | Sample citizen with filed cases |

New citizens can also self-register from the login screen.

## 5. Feature walkthrough

**Citizen**
- File a complaint: pick a category (auto-routes to the right department),
  set priority, add location/description, attach photos/documents.
- Track status in real time on a timeline, see the current escalation level.
- Request escalation manually if progress stalls.

**Officer**
- See only complaints in their own department.
- Update status (Assigned → In Progress → Resolved/Closed), record the
  action taken and resolution remarks.
- View department-level analytics (category mix, trend, SLA compliance).

**Admin**
- See every complaint system-wide, filterable by status/department.
- Assign complaints to the right officer within the routed department.
- Full analytics: resolution time, SLA compliance, escalation rate,
  by-department breakdown.
- Browse the full user/officer directory.

**Escalation logic** (implements the brief's "Officer → Supervisor → Admin"
requirement):
- Every complaint gets an SLA deadline based on its priority when created
  (Critical: 24h, High: 48h, Medium: 96h, Low: 168h).
- A background job (`escalationEngine.js`) sweeps all open complaints every
  minute; anything past its SLA deadline is automatically escalated one
  level and given a fresh (shorter) window at the next level.
- Citizens can also manually request escalation at any time before the
  complaint is resolved.

## 6. API summary

All endpoints are under `/api` and (except `/auth/register` and
`/auth/login`) require `Authorization: Bearer <token>`.

| Method | Route                                   | Who           | Purpose |
|--------|-------------------------------------------|---------------|---------|
| POST   | /auth/register                            | Public        | Citizen sign-up |
| POST   | /auth/login                               | Public        | Sign in |
| GET    | /auth/me                                  | Any            | Current user profile |
| POST   | /complaints                               | Citizen        | File a complaint (multipart, supports attachments) |
| GET    | /complaints                               | Any            | List complaints, scoped by role, filterable by status/category/department/priority |
| GET    | /complaints/meta                          | Any            | Categories, priorities, statuses for form dropdowns |
| GET    | /complaints/:id                           | Owner/Officer/Admin | Complaint detail + timeline |
| GET    | /complaints/:id/attachments/:filename     | Owner/Officer/Admin | Download an attachment |
| PATCH  | /complaints/:id/assign                    | Admin          | Assign an officer |
| PATCH  | /complaints/:id/status                    | Officer/Admin  | Update status / resolve |
| POST   | /complaints/:id/escalate                  | Any (owner/officer/admin) | Manual escalation |
| POST   | /complaints/:id/feedback                  | Citizen (own, resolved)| Submit a 1–5 star satisfaction rating + comment |
| GET    | /notifications                            | Any            | List the current user's notifications (email/SMS are simulated + logged in-app) |
| PATCH  | /notifications/:id/read                   | Any            | Mark one notification as read |
| PATCH  | /notifications/read-all                   | Any            | Mark all of the current user's notifications as read |
| GET    | /users/officers                           | Admin          | Officer list (for assignment) |
| GET    | /users                                    | Admin          | Full user directory |
| GET    | /analytics/summary                        | Officer/Admin  | KPIs |
| GET    | /analytics/by-category                    | Officer/Admin  | Category breakdown |
| GET    | /analytics/by-department                  | Admin          | Department breakdown |
| GET    | /analytics/trend                          | Officer/Admin  | Volume over time |
| GET    | /analytics/closed-per-department          | Admin          | Closed cases per department |

## 7. What's in scope vs. deferred (per the PRD)

Matches the brief's Phase 1 scope: web-responsive app, registration &
tracking, role dashboards, escalation workflows, reporting/analytics.
Deferred to future phases (as the brief specifies): native mobile apps,
AI-based complaint classification, voice-based registration, multilingual
support, and integration with national grievance portals.

## 8. Notes on production-readiness

This is a fully functional demo/reference build. Before a real deployment:
- Swap `lowdb` for PostgreSQL/MySQL (schemas map directly — see `constants.js`
  and the object shapes in `routes/complaints.js`).
- Move file uploads to S3/Blob storage instead of local disk.
- Add real email/SMS delivery in place of the current simulated dispatch
  (`backend/notifications.js` already fires at every status change, so this
  is a one-file swap for nodemailer/Twilio/etc.).
- Put JWT_SECRET in a proper secrets manager (currently reads from
  `process.env.JWT_SECRET` with a dev fallback).
- Add HTTPS, rate limiting, and audit logging for compliance readiness.
