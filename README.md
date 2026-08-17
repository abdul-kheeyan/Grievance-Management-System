# Nagrik Setu — Digital Complaint & Grievance Management System

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-18.x-blue)](https://react.dev/)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-green)](https://www.mongodb.com/atlas)
[![License](https://img.shields.io/badge/License-MIT-orange)](#license)

**Nagrik Setu** is a production-ready, full-stack Digital Complaint & Grievance Management System designed for citizens to register complaints, monitor resolution progress in real time, and for municipal/government departments to manage workflows using role-based dashboards, SLA-driven auto-escalation, and interactive analytics.

Built in accordance with the **Unified Mentor** project brief for e-Governance and consumer grievance management systems.

---

## 📋 Table of Contents
1. [Key Features](#-key-features)
2. [Project Architecture & Directory Structure](#-project-architecture--directory-structure)
3. [Tech Stack](#-tech-stack)
4. [Database Layer (MongoDB Atlas & Fallback)](#-database-layer-mongodb-atlas--fallback)
5. [Environment Variables (`.env`)](#-environment-variables-env)
6. [Local Installation & Setup](#-local-installation--setup)
7. [Demo Accounts](#-demo-accounts)
8. [Deployment Guide (GitHub, Render & Vercel)](#-deployment-guide-github-render--vercel)
9. [Complete API Reference](#-complete-api-reference)
10. [Security & Best Practices](#-security--best-practices)
11. [License](#-license)

---

## ✨ Key Features

### 👤 Citizen Portal
- **Complaint Registration**: File complaints under specific categories (Water, Electricity, Public Works, Finance, etc.) with priority levels, description, geolocation, and multi-file attachments (images/documents).
- **Real-Time Tracking**: Interactive timeline showing state transitions (`Submitted` → `Assigned` → `In Progress` → `Escalated` → `Resolved` → `Closed`).
- **Manual Escalation**: Request manual case escalation if SLA windows are breached or progress stalls.
- **Feedback & Rating System**: 1–5 star rating and comments upon grievance resolution.

### 👮 Officer Portal
- **Department-Scoped Access**: Officers view and manage complaints exclusively routed to their department.
- **Status Updates & Actions**: Update case status, log field inspection remarks, and attach resolution notes.
- **Departmental Analytics**: Monitor SLA compliance rates, average resolution time, and complaint trends.

### 🛡️ Admin Oversight & Command Center
- **System-Wide Dashboard**: Monitor grievances across all municipal departments with filters for status, priority, and department.
- **Officer Assignment**: Assign newly submitted complaints to specialized officers within routed departments.
- **SLA Breach Monitoring**: Real-time visibility into auto-escalated cases.
- **Comprehensive Analytics**: KPIs, category breakdown, department performance metrics, and location heatmaps.

### ⚙️ SLA Auto-Escalation Engine
- **Automated SLA Windows**: Priority-based resolution timelines:
  - **Critical**: 24 Hours
  - **High**: 48 Hours
  - **Medium**: 96 Hours
  - **Low**: 168 Hours
- **Background Cron Sweeper**: Background cron worker (`escalationEngine.js`) inspects open complaints every minute and automatically escalates breached complaints (`Officer` → `Supervisor` → `Admin`).

---

## 📁 Project Architecture & Directory Structure

```
grievance-system/
├── .gitignore                   # Central Git ignore rules (ignores .env, node_modules, db.json, uploads)
├── README.md                    # System documentation
├── docs/
│   └── PRD.md                   # Product Requirements Document
├── backend/                     # Express REST API Server
│   ├── .env                     # Local backend environment configuration
│   ├── .env.example             # Backend environment template
│   ├── server.js                # API entrypoint & middleware initializations
│   ├── db.js                    # Dual Database layer (MongoDB Atlas + LowDB fallback)
│   ├── constants.js             # Department maps, SLA hours, priorities, & statuses
│   ├── escalationEngine.js      # Background node-cron SLA breach sweeper
│   ├── notifications.js         # In-app notification dispatcher
│   ├── seed.js                  # Automated database seeder (MongoDB Atlas support)
│   ├── middleware/
│   │   └── auth.js              # JWT verification & role authorization guards
│   ├── routes/
│   │   ├── auth.js              # Authentication (Register, Login, /me)
│   │   ├── complaints.js        # Complaint CRUD, attachments, escalation & feedback
│   │   ├── users.js             # User & officer directory management
│   │   ├── analytics.js        # KPI summaries, trends, and category distribution
│   │   └── notifications.js    # User notification endpoints
│   └── uploads/                 # Storage for complaint attachments
└── frontend/                    # React 18 + Vite Web Application
    ├── .env                     # Local frontend environment configuration
    ├── .env.example             # Frontend environment template
    ├── index.html               # HTML entrypoint
    ├── vite.config.js           # Vite configuration & dev proxy
    └── src/
        ├── main.jsx             # React entrypoint
        ├── App.jsx              # Routing & application shell
        ├── api.js               # Axios instance with auth interceptors
        ├── AuthContext.jsx       # Context for user sessions & JWT persistence
        ├── styles.css           # Custom design system ("case-file" theme)
        ├── components/          # Reusable UI components (Layout, Bell, Guards)
        └── pages/               # Dashboards (Citizen, Officer, Admin), Login, Register
```

---

## 🛠️ Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18, React Router v6, Axios, Recharts | Vite build system, Vanilla CSS custom design system |
| **Backend** | Node.js, Express.js | CommonJS modular REST API |
| **Database** | MongoDB Atlas (Cloud) / Mongoose | Primary production DB via Mongoose; LowDB JSON file fallback |
| **Authentication** | JWT (`jsonwebtoken`), `bcryptjs` | Bearer Token auth with password hashing |
| **File Storage** | Multer | Multi-file attachment handling (images & PDFs) |
| **Job Scheduler** | `node-cron` | Background cron worker for SLA auto-escalation |

---

## 🗄️ Database Layer (MongoDB Atlas & Fallback)

The backend features a **dual-adapter data persistence layer** in `backend/db.js`:

1. **MongoDB Atlas (Cloud Production)**: Connected using `mongoose`. When `MONGODB_URI` is supplied in `backend/.env`, all data (`users`, `complaints`, `notifications`, `counters`) automatically persists to your cloud MongoDB Atlas Cluster.
2. **LowDB (Local Development Fallback)**: If no `MONGODB_URI` is set, the server seamlessly falls back to a zero-config local JSON file (`backend/data/db.json`), requiring no database installation for quick offline testing.

---

## 🔑 Environment Variables (`.env`)

### Backend Configuration (`backend/.env`)

Create a `.env` file in the `backend/` directory:

```env
PORT=4000
MONGODB_URI=mongodb+srv://hunterladdu145_db_user:g5BdhLt44E9W5FzK@cluster0.zjafbwy.mongodb.net/grievance_db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=grievance_system_super_secret_jwt_key_2026
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend Configuration (`frontend/.env`)

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=/api
```

*(Note: When deploying frontend to Vercel/Netlify, set `VITE_API_BASE_URL` to your live backend API URL, e.g., `https://your-backend.onrender.com/api`)*.

---

## 🚀 Local Installation & Setup

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher

### Step 1: Clone the Repository
```bash
git clone https://github.com/<YOUR_USERNAME>/grievance-management-system.git
cd grievance-management-system
```

### Step 2: Setup and Start Backend
```bash
cd backend
npm install

# Seed demo accounts & complaints directly into MongoDB Atlas
npm run seed

# Start the Express server
npm start
```
*The Backend API will start at `http://localhost:4000`.*

### Step 3: Setup and Start Frontend
Open a new terminal window:
```bash
cd frontend
npm install

# Start the Vite development server
npm run dev
```
*The Frontend app will open at `http://localhost:5173`.*

---

## 👥 Demo Accounts

The database seeder (`npm run seed`) provisions pre-configured accounts for testing:

| Role | Department | Email | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | General Administration | `admin@grievance.gov` | `Admin@123` |
| **Officer** | Water & Sanitation | `officer1@grievance.gov` | `Officer@123` |
| **Officer** | Power & Utilities | `officer2@grievance.gov` | `Officer@123` |
| **Officer** | Public Works | `officer3@grievance.gov` | `Officer@123` |
| **Officer** | Consumer Affairs | `officer4@grievance.gov` | `Officer@123` |
| **Officer** | Finance & Billing | `officer5@grievance.gov` | `Officer@123` |
| **Officer** | Transport | `officer6@grievance.gov` | `Officer@123` |
| **Officer** | Health | `officer7@grievance.gov` | `Officer@123` |
| **Officer** | General Administration | `officer8@grievance.gov` | `Officer@123` |
| **Citizen** | N/A | `ravi@example.com` | `Citizen@123` |
| **Citizen** | N/A | `priya@example.com` | `Citizen@123` |
| **Citizen** | N/A | `amit@example.com` | `Citizen@123` |

*Citizens can also self-register via the sign-up form on the login screen.*

---

## 🌐 Deployment Guide (GitHub, Render & Vercel)

### Step 1: Push Code to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Nagrik Setu Grievance System"
git remote add origin https://github.com/<YOUR_USERNAME>/grievance-management-system.git
git branch -M main
git push -u origin main
```
*(All `.env` files, `node_modules`, and local uploads are protected by `.gitignore`)*.

### Step 2: Deploy Backend on Render.com
1. Go to [Render.com](https://render.com) and click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Set **Root Directory**: `backend`.
4. Set **Build Command**: `npm install`.
5. Set **Start Command**: `npm start`.
6. Add **Environment Variables**:
   - `MONGODB_URI` = `<YOUR_MONGODB_ATLAS_CONNECTION_STRING>`
   - `JWT_SECRET` = `<YOUR_SECRET_KEY>`
   - `NODE_ENV` = `production`
7. Click **Deploy**. Note down your service URL (e.g. `https://grievance-api.onrender.com`).

### Step 3: Deploy Frontend on Vercel
1. Go to [Vercel.com](https://vercel.com) and click **Add New...** → **Project**.
2. Import your GitHub repository.
3. Set **Root Directory**: `frontend`.
4. Framework Preset: **Vite**.
5. Add **Environment Variable**:
   - `VITE_API_BASE_URL` = `https://grievance-api.onrender.com/api`
6. Click **Deploy**.

---

## 📡 Complete API Reference

All protected endpoints require an `Authorization: Bearer <JWT_TOKEN>` header.

### Authentication Endpoints
- `POST /api/auth/register` — Register new citizen or officer account.
- `POST /api/auth/login` — Authenticate and receive JWT token.
- `GET /api/auth/me` — Fetch currently authenticated user profile.

### Complaint Endpoints
- `POST /api/complaints` — Submit a complaint (Supports multi-part file uploads).
- `GET /api/complaints` — List complaints (Filtered & role-scoped for Citizen/Officer/Admin).
- `GET /api/complaints/meta` — Get available categories, priorities, and status metadata.
- `GET /api/complaints/:id` — Retrieve detailed complaint timeline and record.
- `GET /api/complaints/:id/attachments/:filename` — Download uploaded case attachments.
- `PATCH /api/complaints/:id/assign` — (Admin) Assign complaint to an officer in routed department.
- `PATCH /api/complaints/:id/status` — (Officer/Admin) Update status and record resolution details.
- `POST /api/complaints/:id/escalate` — Request manual escalation level bump.
- `POST /api/complaints/:id/feedback` — Submit post-resolution citizen feedback and 1-5 star rating.

### Analytics & Reporting Endpoints
- `GET /api/analytics/summary` — Fetch summary metrics (Total, Resolved, SLA breach compliance, Avg resolution hours).
- `GET /api/analytics/by-category` — Get breakdown of grievances by category.
- `GET /api/analytics/by-department` — (Admin) Get breakdown of grievances by department.
- `GET /api/analytics/by-location` — Location distribution of reported issues.
- `GET /api/analytics/trend` — Grievance submission volume trend over time.
- `GET /api/analytics/closed-per-department` — Resolution volume per department.

### User & Notification Endpoints
- `GET /api/users/officers` — (Admin) Fetch officer directory by department.
- `GET /api/users` — (Admin) Full system user directory.
- `GET /api/notifications` — Fetch user notifications.
- `PATCH /api/notifications/:id/read` — Mark single notification as read.
- `PATCH /api/notifications/read-all` — Mark all user notifications as read.

---

## 🔒 Security & Best Practices

- **Password Hashing**: Cryptographic password hashing using `bcryptjs` with salt rounds.
- **JWT Protection**: Stateless authorization with expiration windows and role guards.
- **Sanitized Inputs**: Category, department, and role validation against predefined constants.
- **File Upload Protection**: Multer limits upload size to 8MB and enforces MIME-type restrictions (`jpeg`, `png`, `pdf`, `doc`).
- **Secrets Isolation**: Zero hardcoded secrets in version control; managed cleanly via `.env`.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
*Created for the Unified Mentor Project Brief on Digital Complaint & Grievance Management.*
