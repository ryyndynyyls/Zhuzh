# Cowork Task: Modularize API Server

**Created:** 2026-01-20  
**Estimated time:** 45-60 min  
**Why Cowork:** server.ts is ~1,600 lines — causes chat timeouts

---

## Context

The file `src/api/server.ts` has grown into a monolithic Express server with all routes inline. Every time we need to add or modify endpoints, we risk chat timeouts because of the file size.

**Current structure (problematic):**
```
src/api/server.ts  ← 1,600+ lines, ALL routes inline
```

**Target structure (modular):**
```
src/api/
├── server.ts              ← Slim entry (~100 lines)
├── routes/
│   ├── index.ts           ← Exports all routers
│   ├── auth.ts            ← Google OAuth
│   ├── calendar.ts        ← Calendar events, config
│   ├── approvals.ts       ← Approval workflows  
│   ├── projects.ts        ← Project CRUD + phases
│   ├── budget.ts          ← Budget dashboard + drilldown
│   ├── audit.ts           ← Audit trail
│   └── db-tools.ts        ← Dev introspection tools
└── lib/
    ├── google-calendar.ts ← Already exists
    └── gemini.ts          ← Already exists
```

---

## Subtasks (Parallel-Safe)

These can run simultaneously as sub-agents:

### Subtask 1: Create routes/auth.ts
**Extract these endpoints:**
- `GET /api/auth/google` — Initiate OAuth
- `GET /api/auth/google/callback` — OAuth callback
- `POST /api/auth/google/disconnect` — Disconnect

**File:** `src/api/routes/auth.ts`

```typescript
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import * as googleCalendar from '../../lib/google-calendar';

const router = Router();
const supabase = createClient(/* ... */);

// Move OAuth routes here...

export default router;
```

---

### Subtask 2: Create routes/calendar.ts
**Extract these endpoints:**
- `GET /api/calendar/list`
- `GET /api/calendar/events`
- `POST /api/calendar/analyze-screenshot`
- `POST /api/calendar/generate-config`
- `GET /api/calendar/config`
- `GET /api/calendar/team-pto`
- `GET /api/calendar/pto-overlap`

**File:** `src/api/routes/calendar.ts`

Note: Keep the existing `calendarSyncRouter` separate or merge based on what makes sense.

---

### Subtask 3: Create routes/approvals.ts
**Extract these endpoints:**
- `GET /api/approvals`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

**File:** `src/api/routes/approvals.ts`

---

### Subtask 4: Create routes/projects.ts
**Extract these endpoints:**
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `GET /api/clients`
- `POST /api/projects/:id/phases`
- `GET /api/projects/:id/phases`
- `PATCH /api/phases/:phaseId`
- `DELETE /api/phases/:phaseId`
- `POST /api/projects/:id/phases/reorder`
- `GET /api/projects/:id/drilldown`

**File:** `src/api/routes/projects.ts`

---

### Subtask 5: Create routes/budget.ts
**Extract these endpoints:**
- `GET /api/budget/dashboard`

**File:** `src/api/routes/budget.ts`

---

### Subtask 6: Create routes/audit.ts
**Extract these endpoints:**
- `GET /api/audit/:entityType/:entityId`
- `GET /api/audit/project/:projectId/full`

**File:** `src/api/routes/audit.ts`

---

### Subtask 7: Create routes/db-tools.ts
**Extract these endpoints:**
- `GET /api/db/tables`
- `GET /api/db/schema/:table`
- `POST /api/db/query`
- `GET /api/db/summary`
- `GET /api/db/sample/:table`

**File:** `src/api/routes/db-tools.ts`

---

### Subtask 8: Create routes/index.ts
**Aggregate and export all routers:**

```typescript
export { default as authRouter } from './auth';
export { default as calendarRouter } from './calendar';
export { default as approvalsRouter } from './approvals';
export { default as projectsRouter } from './projects';
export { default as budgetRouter } from './budget';
export { default as auditRouter } from './audit';
export { default as dbToolsRouter } from './db-tools';
```

---

### Subtask 9: Slim down server.ts
**Replace inline routes with imports:**

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Route imports
import {
  authRouter,
  calendarRouter,
  approvalsRouter,
  projectsRouter,
  budgetRouter,
  auditRouter,
  dbToolsRouter,
} from './routes';
import reportsRouter from './reports';
import calendarSyncRouter from './calendar';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/budget', budgetRouter);
app.use('/api/audit', auditRouter);
app.use('/api/db', dbToolsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/calendar', calendarSyncRouter);

const PORT = process.env.API_PORT || 3002;
app.listen(PORT, () => {
  console.log(`🗓️  Zhuzh API server running on port ${PORT}`);
});

export default app;
```

---

## Shared Setup

Each route file needs:

```typescript
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

Consider creating a shared `src/api/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

---

## Helper Functions to Extract

The `classifyEventForPto()` function is used by multiple calendar endpoints. Move to:
`src/api/lib/pto-classifier.ts`

---

## Verification

After refactoring, test all endpoints:

```bash
# Start API server
cd ~/Claude-Projects-MCP/ResourceFlow && npm run api:dev

# Test key endpoints
curl http://localhost:3002/api/db/summary
curl "http://localhost:3002/api/approvals?orgId=a1b2c3d4-e5f6-7890-abcd-ef1234567890"
curl "http://localhost:3002/api/budget/dashboard?orgId=a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

## Success Criteria

- [ ] `server.ts` is under 150 lines
- [ ] Each route file is under 300 lines
- [ ] All existing endpoints still work
- [ ] API server starts without errors
- [ ] TypeScript compiles without errors

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md` with completion status
2. Add to `docs/live-sync-doc.md`:
   - "✅ API server modularized into route files"
