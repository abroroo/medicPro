# Claude Code Instructions for MedicPro

## Project Context

This is **MedicPro**, a clinic management system. Read `project.md` at the start of each session to understand the project structure, tech stack, and recent changes.

## Critical Instructions

### 1. Documentation Requirement

**After completing any task in this project, you MUST update `project.md`:**

1. Add a new session entry under `## Session History` with:
   - Date
   - Branch name (from git status)
   - Summary of changes made
   - Any issues encountered and how they were resolved
   - Files modified

Example format:
```markdown
### Session N - YYYY-MM-DD

**Branch:** `feature/branch-name`

**Changes made:**
- Description of what was implemented/fixed

**Files modified:**
- `path/to/file.ts` - what changed

**Issues resolved:**
- Issue description and solution
```

### 2. Local Development

- Run `npm run dev` to start the app
- Opens at http://localhost:5001 (or whatever PORT is in .env.local)
- `VITE_API_URL` must be empty in `.env.local` for local API calls
- If set to production URL, local changes won't be tested against local API

### 3. Deployment

- **Frontend only** deploys to Vercel via `vercel --prod`
- **Backend** is on Render (separate deployment)
- Full-stack changes need both deployments

### 4. Database

- Uses Drizzle ORM with PostgreSQL (Neon)
- Schema is in `shared/schema.ts`
- Run `npm run db:push` after schema changes
- Run `npm run db:studio` to view/edit data

### 5. Key Files to Know

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Database schema + Zod validation |
| `server/routes.ts` | All API endpoints |
| `server/storage.ts` | Database operations |
| `server/auth.ts` | Authentication logic |
| `server/middleware/rbac.ts` | Role-based access control |
| `client/src/App.tsx` | Client routes |
| `client/src/hooks/use-auth.tsx` | Auth context |
| `client/src/lib/queryClient.ts` | API client + React Query setup |

### 6. User Roles

The system has role-based access: `head_doctor`, `doctor`, `receptionist`, `user`, `admin`

Check `server/middleware/rbac.ts` for permission logic.

## Git Workflow

- Check `git status` to see current branch and changes
- Commit messages should be single line, descriptive
- Do not mention AI/Claude in commit messages
