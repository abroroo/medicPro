# MedicPro - Clinic Management System

## Overview

MedicPro is a full-stack clinic management application for managing patients, doctors, visits, queues, and clinical notes. Built with React + TypeScript frontend and Express + Drizzle ORM backend.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| Backend | Express.js, TypeScript, Passport.js (auth) |
| Database | PostgreSQL (Neon serverless) |
| ORM | Drizzle ORM |
| State | TanStack Query (React Query) |
| Routing | Wouter |
| Validation | Zod |

## Project Structure

```
medicPro/
├── client/                    # React frontend
│   └── src/
│       ├── components/        # UI components
│       │   ├── ui/            # shadcn/ui components
│       │   ├── dashboard/     # Dashboard-specific components
│       │   └── reports/       # Report components
│       ├── hooks/             # Custom React hooks (use-auth, use-mobile)
│       ├── lib/               # Utilities (queryClient, protected-route)
│       └── pages/             # Route pages
│           ├── auth-page.tsx
│           ├── dashboard.tsx
│           ├── patients.tsx
│           ├── patient-detail.tsx
│           ├── doctors.tsx
│           ├── queue.tsx
│           ├── waiting-display.tsx
│           ├── reports.tsx
│           └── users-page.tsx
├── server/                    # Express backend
│   ├── index.ts               # Server entry point
│   ├── config.ts              # Environment configuration
│   ├── routes.ts              # API routes
│   ├── storage.ts             # Database operations
│   ├── auth.ts                # Passport authentication
│   ├── db.ts                  # Database connection
│   ├── vite.ts                # Vite dev middleware
│   └── middleware/
│       └── rbac.ts            # Role-based access control
├── shared/
│   └── schema.ts              # Drizzle schema + Zod validation
├── .env                       # Production env (VITE_API_URL for Vercel)
├── .env.local                 # Local dev env (overrides .env)
├── vercel.json                # Vercel deployment config (frontend only)
└── package.json
```

## Database Schema

### Tables

- **clinics** - Clinic information
- **users** - All users (doctors, receptionists, head_doctors, regular users)
- **admins** - System administrators (separate table)
- **patients** - Patient records
- **visits** - Patient visits/appointments
- **clinical_notes** - Medical notes for visits
- **queue** - Patient queue management

### User Roles

| Role | Description |
|------|-------------|
| `head_doctor` | Can manage doctors and users |
| `doctor` | Can treat patients, write clinical notes |
| `receptionist` | Can manage queue and patients |
| `user` | Basic access |
| `admin` | System administrator (separate table) |

## Deployment Architecture

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | https://medic-pro.vercel.app |
| Backend API | Render | https://medicpro-50xk.onrender.com |
| Database | Neon | PostgreSQL serverless |

## Local Development

### Prerequisites
- Node.js
- PostgreSQL database (or Neon account)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure `.env.local`:
   ```env
   DATABASE_URL=postgresql://...
   SESSION_SECRET=your-32-char-secret
   NODE_ENV=development
   PORT=5001
   VITE_API_URL=         # Empty for local API
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5001

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run server + client (Vite middleware) |
| `npm run dev:local` | Run server and client separately |
| `npm run build` | Build client for production |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |

## Environment Variables

### Server (.env.local)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session encryption key (32+ chars) |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default: 5000) |
| `CORS_ORIGIN` | Allowed CORS origin |

### Client (Vite)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base URL. Empty = same origin (local dev) |

---

## Session History

### Session 1 - 2026-01-21

**Context:** Working on branch `feature/replace-doctor-with-user-with-doctor-role`

**Changes discussed:**
- Modified files: `add-to-queue-modal.tsx`, `patient-detail.tsx`, `routes.ts`, `storage.ts`
- Recent commits indicate role-based access control implementation

**Tasks completed:**
1. Documented how to run the app locally (`npm run dev` on port 5001)
2. Fixed CORS issue - local client was calling production API
   - Root cause: `.env` had `VITE_API_URL=https://medicpro-50xk.onrender.com`
   - Fix: Added `VITE_API_URL=` (empty) to `.env.local` to use local API
3. Clarified deployment architecture (Vercel = frontend only, Render = API)
4. Created this documentation (`project.md`) and `CLAUDE.md`
