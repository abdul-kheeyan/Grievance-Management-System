# Product Requirements Document
## Nagrik Setu — Digital Complaint & Grievance Management System

**Collaborating organization:** Unified Mentor
**Reference model:** Consumer Forum / E-Consumer Grievance Portals
**Status:** Phase 1 build complete (reference implementation)

---

## 1. Context & Problem Statement

Grievance handling today is largely manual, which produces four recurring
failures:

1. **No transparency** — complainants cannot see where their case stands.
2. **No escalation mechanism** — stalled complaints have no defined path
   upward.
3. **Poor accountability** — no record ties an outcome to the person/team
   responsible for it.
4. **No data insight** — departments cannot see resolution-time trends,
   bottlenecks, or SLA performance.

## 2. Objectives

**Primary**
- Single digital platform for registration and tracking.
- Transparent, real-time status updates for the citizen.
- Structured, multi-level escalation.
- Improved resolution time and accountability.

**Secondary**
- Higher citizen trust and satisfaction.
- Reduced manual workload for departments.
- Analytics for performance monitoring.
- Scalable across departments/regions.

## 3. Scope

**In scope (Phase 1 — built)**
- Responsive web application.
- Complaint registration and tracking, with attachments.
- Role-based dashboards (Citizen / Officer / Admin).
- Escalation and resolution workflows.
- Reporting and analytics.

**Out of scope (Phase 1, per brief — not built)**
- Native mobile apps.
- AI-based complaint classification.
- Voice-based complaint registration.

*(Listed under "Future Enhancements" below, along with multilingual support
and national-portal integration.)*

## 4. User Roles

| Role    | Can do |
|---------|--------|
| Citizen | Register/log in, file complaints, track status & timeline, view resolution details, request escalation. |
| Officer | View/act on complaints within their own department, update status, record resolution, view department analytics. |
| Admin   | View all complaints system-wide, assign officers, override status, view full analytics, browse the user directory. |

## 5. Functional Requirements → Implementation Map

| Requirement (from brief) | Implementation |
|---|---|
| Online submission with category selection | `NewComplaint.jsx` form + `/api/complaints` POST; 9 categories auto-mapped to 8 departments (`constants.js`) |
| Upload supporting documents/images | Multer upload, up to 5 files / 8MB each, served back via authenticated download endpoint |
| Auto-generated complaint ID | Sequential human-readable IDs, e.g. `GRV-2026-000006` |
| Real-time status updates | Complaint detail page polls current state on load; status change endpoint updates immediately |
| Timeline view of complaint progress | `timeline[]` array on every complaint; every status change, assignment, and escalation appends an entry with actor, role, and timestamp |
| Email/SMS notifications | Implemented as a simulated dispatch layer: `backend/notifications.js` persists an in-app notification (visible via the bell icon / `GET /api/notifications`) and logs a `[notify]` line to the server console standing in for a real email/SMS send. Fires on complaint registration, assignment, status change, and escalation (manual and auto). No real SMTP/Twilio credentials are wired up — swapping in a real provider means editing only that one file. |
| Multi-level escalation (Officer → Supervisor → Admin) | `escalationLevel` field (0/1/2) + visual "Escalation Ladder" component |
| Auto-escalation on SLA breach | `escalationEngine.js` cron sweep (every minute) checks `slaDeadline` on open complaints and bumps the level automatically |
| Citizen dashboard: history & status | `CitizenDashboard.jsx` |
| Officer dashboard: assigned complaints & actions | `OfficerDashboard.jsx`, scoped to `req.user.department` |
| Admin dashboard: system-wide monitoring | `AdminDashboard.jsx` — full table, filterable by status/department |
| Complaints by category/location/department | `/api/analytics/by-category`, `/by-location`, `/by-department` |
| Resolution time analysis | `/api/analytics/summary.avgResolutionHours` |
| SLA compliance reports | `/api/analytics/summary.slaComplianceRate`, computed per complaint at resolution time |

## 6. Non-Functional Requirements

| Requirement | Approach in this build |
|---|---|
| Secure authentication & RBAC | JWT (12h expiry) + bcrypt password hashing; every route enforces role checks server-side, not just in the UI |
| Responsive UI | CSS Grid layout collapses from 4/3/2 columns down to 1 column under 640px; sidebar becomes a top bar on narrow screens |
| Fast response (<3s) | JSON file store + in-memory filtering keeps API responses in the low tens of milliseconds at this data scale; the data layer is isolated so a real DB can be swapped in without touching routes |
| High availability & scalability | Out of scope for a local reference build; the architecture (stateless API + JWT + isolated data layer) is deployable behind a load balancer once backed by a real database |
| Data privacy & compliance readiness | Passwords hashed, never returned by any endpoint; attachment access is ownership/role-checked before serving |

## 7. Data Model (as implemented)

**User**
`id, name, email, password (hashed), phone, role (citizen|officer|admin), department, createdAt`

**Complaint**
`id, complaintId, userId, userName, category, department, description, location, priority, status, escalationLevel, assignedOfficerId, assignedOfficerName, attachments[], slaHours, slaDeadline, createdAt, updatedAt, timeline[], resolution`

**Timeline entry**
`id, status, remark, actorId, actorName, actorRole, timestamp`

**Resolution**
`actionTaken, resolutionDate, remarks, slaStatus (Within SLA | SLA Breached)`

## 8. Key Performance Indicators — where to find them

| KPI | Endpoint |
|---|---|
| Average complaint resolution time | `/api/analytics/summary` → `avgResolutionHours` |
| % resolved within SLA | `/api/analytics/summary` → `slaComplianceRate` |
| Escalation rate | `/api/analytics/summary` → `escalationRate` |
| Complaints closed per department | `/api/analytics/closed-per-department` |
| User satisfaction score | `/api/analytics/summary` → `avgSatisfaction` and `satisfactionResponses`. Citizens submit a 1–5 star rating + optional comment via `POST /complaints/:id/feedback` once a complaint is Resolved/Closed (`ComplaintDetail.jsx`). |

## 9. Assumptions & Constraints

Carried over from the brief:
- Users have basic internet access.
- Departments follow defined SLA policies (modeled here as fixed hours per
  priority — see `constants.js`, tunable per department in a future
  iteration).
- Compliance with government IT policies, data privacy regulations, and a
  fixed implementation timeline apply to any real deployment of this
  reference build.

## 10. Deferred / Future Enhancements

Per the brief, plus implementation notes on how the current architecture
would extend to support them:

- **Mobile app** — the API is already a clean REST contract; a React Native
  or Flutter client could reuse it as-is.
- **AI-based complaint classification** — the category dropdown is the
  natural place to add a suggestion step; would call an LLM/classifier
  before form submission.
- **Multilingual support** — UI strings are not yet externalized into a
  translation layer; would need an i18n library and string extraction.
- **Voice-assisted registration** — would sit in front of the same
  `POST /complaints` endpoint via a speech-to-text step.
- **National grievance portal integration** — would be an outbound
  webhook/sync job off the `complaints` collection.

## 11. Deliverables (this submission)

- [x] Functional web application (backend + frontend)
- [x] Admin and department (officer) dashboards
- [x] This PRD and technical documentation (`README.md`)
- [ ] Deployment-ready build — the frontend builds cleanly (`npm run build`)
      and the backend runs standalone; containerization/cloud deployment
      config was not requested but the app is structured to support it
      (stateless API, no local session state).
