# Team Task Tracker API

A production-grade REST API for managing tasks within a team. Built with Node.js, Express, TypeScript, PostgreSQL, and Redis.

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express.js 5 |
| Language | TypeScript 6 (strict) |
| ORM | Prisma 6 + PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (access + refresh token rotation) |
| Validation | Zod 4 |
| Docs | Swagger / OpenAPI 3.0 |
| Tests | Jest + Supertest |
| Container | Docker + Docker Compose |

---

## Quick Start

The only prerequisite is Docker Desktop.

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd nxtwave

# 2. Copy environment variables
cp .env.example .env
# Edit .env and set strong JWT secrets

# 3. Start everything
docker compose up --build
```

The API is available at `http://localhost:3000` immediately. No manual setup required — migrations run automatically on startup.

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port (default: 3000) | No |
| `POSTGRES_USER` | PostgreSQL username | Yes |
| `POSTGRES_PASSWORD` | PostgreSQL password | Yes |
| `POSTGRES_DB` | PostgreSQL database name | Yes |
| `DATABASE_URL` | Full PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (min 32 chars) | Yes |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (min 32 chars) | Yes |
| `BCRYPT_ROUNDS` | Password hashing rounds (default: 12) | No |

---

## API Documentation

Swagger UI is available at:
```
http://localhost:3000/api/docs
```

Raw OpenAPI spec (JSON):
```
http://localhost:3000/api/docs.json
```

---

## Available Endpoints

| Method | Endpoint | Auth | Roles |
|---|---|---|---|
| POST | `/api/v1/auth/register` | No | — |
| POST | `/api/v1/auth/login` | No | — |
| POST | `/api/v1/auth/refresh` | No | — |
| POST | `/api/v1/auth/logout` | No | — |
| GET | `/api/v1/users` | Yes | ADMIN |
| GET | `/api/v1/users/:id` | Yes | ADMIN |
| PATCH | `/api/v1/users/:id` | Yes | ADMIN |
| DELETE | `/api/v1/users/:id` | Yes | ADMIN |
| GET | `/api/v1/projects` | Yes | ADMIN, MANAGER |
| POST | `/api/v1/projects` | Yes | ADMIN, MANAGER |
| GET | `/api/v1/projects/:id` | Yes | ADMIN, MANAGER |
| PATCH | `/api/v1/projects/:id` | Yes | ADMIN, MANAGER |
| DELETE | `/api/v1/projects/:id` | Yes | ADMIN, MANAGER |
| GET | `/api/v1/tasks` | Yes | ALL |
| POST | `/api/v1/tasks` | Yes | ADMIN, MANAGER |
| GET | `/api/v1/tasks/:id` | Yes | ALL |
| PATCH | `/api/v1/tasks/:id` | Yes | ALL |
| PATCH | `/api/v1/tasks/:id/status` | Yes | Assignee, MANAGER, ADMIN |
| DELETE | `/api/v1/tasks/:id` | Yes | ADMIN, MANAGER |
| GET | `/api/v1/analytics` | Yes | ADMIN, MANAGER |
| GET | `/api/v1/analytics/overdue` | Yes | ADMIN, MANAGER |
| GET | `/api/v1/analytics/completion-time` | Yes | ADMIN, MANAGER |
| GET | `/api/v1/notifications/subscribe` | Yes | ALL (SSE) |
| GET | `/health` | No | — |

---

## Task Status Machine

Status transitions are enforced server-side. Free-form status updates are rejected.

```
TODO → IN_PROGRESS → IN_REVIEW → DONE
  ↘         ↘            ↘
        BLOCKED (reachable from any active state)
BLOCKED → TODO | IN_PROGRESS
```

Only the task's assignee or a MANAGER/ADMIN can advance a task's status.

---

## Role Permissions

| Action | ADMIN | MANAGER | MEMBER |
|---|---|---|---|
| Manage users | ✅ | ❌ | ❌ |
| Manage projects | ✅ | ✅ | ❌ |
| Create/delete tasks | ✅ | ✅ | ❌ |
| View all tasks | ✅ | ✅ | ❌ |
| View own tasks | ✅ | ✅ | ✅ |
| Update own assigned task | ✅ | ✅ | ✅ |
| Update task status | ✅ | ✅ | ✅ (own only) |
| View analytics | ✅ | ✅ | ❌ |

---

## Caching Strategy

Redis caching is applied to task list queries scoped by assignee.

**Cache key pattern:**
```
tasks:assignee:{userId}   — tasks assigned to a specific user
tasks:org:{orgId}         — all tasks in an org (ADMIN/MANAGER queries)
```

**TTL:** 300 seconds (5 minutes)

**Invalidation strategy: write-invalidate**

On any task write operation (create, update, status change, delete), the relevant cache keys are immediately deleted. The next read rebuilds the cache from the database. This approach was chosen over write-through because:
- It's simpler to implement correctly
- It guarantees no stale reads
- It handles edge cases like reassignment automatically (both old and new assignee caches are invalidated)

---

## Database Design Decisions

**Why separate `status` transitions from `update` endpoint?**

The task status machine is a critical business rule — `TODO → IN_PROGRESS → IN_REVIEW → DONE`. If status were part of the general `PATCH /tasks/:id` endpoint, it would be easy for a client to bypass the machine by sending any status value freely. A dedicated `PATCH /tasks/:id/status` endpoint makes the machine explicit and enforces it at the routing level.

**Index strategy:**

Five indexes are placed on the `tasks` table based on the most frequent query patterns:

```sql
@@index([status])      -- filter tasks by status
@@index([assigneeId])  -- load tasks for a user (also the Redis cache key)
@@index([dueDate])     -- find overdue tasks in analytics
@@index([orgId])       -- scope all queries to an organization
@@index([projectId])   -- load tasks within a project
```

Without these, every filtered query would require a full table scan. The `assigneeId` index is especially important as it directly supports both the task list endpoint and the Redis cache key pattern.

**Soft delete on users:**

Users are deactivated (`isActive: false`) rather than hard-deleted. This preserves referential integrity — tasks created by or assigned to that user remain intact with their history. All active refresh tokens are revoked on deactivation.

**Refresh token storage:**

Only a SHA-256 hash of the refresh token is stored in the database, never the raw JWT. If the database is compromised, attackers get useless hashes. Token rotation on every refresh means a stolen token can only be used once before it's revoked.

---

## Running Tests

Tests run against a real database — make sure PostgreSQL and Redis are running first.

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

**Test coverage:**
- Auth flow — register, login, refresh token rotation, logout, protected routes
- Task status machine — all valid transitions, invalid transitions, DONE finality
- RBAC enforcement — member access restrictions, cross-user task access
- Pagination and filtering

---

## Local Development (without Docker)

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Start development server with hot reload
npm run dev
```

---

## Project Structure

```
src/
├── config/          # DB, Redis, env, Swagger config
├── middleware/      # auth, rbac, validate, errorHandler
├── lib/             # cache, errors, statusMachine, eventEmitter, sseManager
├── modules/
│   ├── auth/        # register, login, refresh, logout
│   ├── users/       # CRUD (ADMIN only)
│   ├── projects/    # CRUD (ADMIN + MANAGER)
│   ├── tasks/       # CRUD + status machine
│   ├── analytics/   # overdue counts, avg completion time
│   └── notifications/ # SSE real-time notifications
├── types/           # shared TypeScript types
├── app.ts           # Express app setup
└── server.ts        # entry point
prisma/
├── schema.prisma    # database schema
└── migrations/      # migration history
tests/
├── auth.test.ts     # auth integration tests
├── tasks.test.ts    # task + RBAC integration tests
└── helpers/         # test utilities
```

---

## Bonus Features Implemented

- **Analytics endpoint** — overdue task count per user + average completion time using PostgreSQL raw SQL with `AVG` and `EXTRACT(EPOCH)`
- **SSE real-time notifications** — assignees receive instant push events when their task status changes or they are assigned a new task
- **Swagger/OpenAPI 3.0** — full interactive documentation at `/api/docs`
- **Integration tests** — 32 tests covering auth flows, status machine, RBAC enforcement, pagination

---

## What I Would Improve Given More Time

- **Invite-based org membership** — currently any user can join an org by slug. Production would require email invites with expiring tokens.
- **Refresh token family detection** — detect token reuse attacks by tracking token families and revoking all tokens in a family on reuse.
- **WebSocket upgrade for SSE** — SSE works well but WebSockets would allow bidirectional communication for collaborative features like real-time comments.
- **Rate limiting per endpoint** — currently using a global rate limiter. Production would apply stricter limits on auth endpoints specifically.
- **Cursor-based pagination** — offset pagination has performance issues at scale. Cursor-based pagination would be more efficient for large datasets.
- **Audit log** — track all state changes (who changed what, when) for compliance and debugging.
- **Test coverage for analytics and SSE** — the two bonus features lack dedicated integration tests due to time constraints.