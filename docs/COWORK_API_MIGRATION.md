# Cowork Task: Migrate Frontend Hooks from Direct Supabase to API Server

**Created:** 2026-02-16
**Estimated time:** 45-60 min
**Why Cowork:** 7 files (2000+ lines total), multi-file refactor, needs new API routes + hook rewrites

---

## Context

All 7 frontend hooks currently query Supabase directly from the browser using the anon key + RLS policies. Every RLS policy calls `get_current_user_org_id()` which runs `SELECT org_id FROM users WHERE email = auth.email() LIMIT 1` as a sub-query on every single request. This cascading overhead causes severe latency, especially on cold starts.

The API server (`src/api/server.ts`) already uses the **service role key** which bypasses RLS entirely. Most data endpoints already exist in `src/api/routes/`. The fix is to route all frontend data access through the API server.

### Current Architecture (broken)
```
Browser → Supabase (anon key + RLS) → slow cascading sub-queries
```

### Target Architecture
```
Browser → Express API (service role key, no RLS) → fast direct queries
```

## Files to Migrate

| Hook | Lines | Supabase Calls | Existing API Route? |
|------|-------|---------------|-------------------|
| `src/hooks/useCurrentUser.ts` | 55 | 1 (user lookup) | No — but AuthContext cache now handles this |
| `src/hooks/useTeamUtilization.ts` | 49 | 1 (allocations aggregate) | No — needs new route |
| `src/hooks/useThisWeekUtilization.ts` | 138 | 2 (users + allocations) | No — needs new route |
| `src/hooks/useProjects.ts` | 90 | 1 (projects + joins) | Yes — `src/api/routes/projects.ts` |
| `src/hooks/useAllocations.ts` | 219 | ~3 (CRUD) | Partial — some allocation routes exist |
| `src/hooks/useConfirmations.ts` | 234 | ~5 (CRUD + realtime) | Yes — `src/api/routes/approvals.ts` |
| `src/hooks/useResourceCalendar.ts` | 1239 | ~15 (reads + writes + realtime) | Partial — needs new routes |

## Subtasks

### Subtask 1: Create API Helper for Frontend

Create `src/lib/api.ts` — a thin fetch wrapper that all hooks will use.

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}
```

Also ensure `VITE_API_URL` is set in `.env.local` and Railway env vars:
- Local: `VITE_API_URL=http://localhost:3002`
- Production: `VITE_API_URL=https://zhuzh-api-production.up.railway.app`

### Subtask 2: Migrate Simple Hooks (useCurrentUser, useTeamUtilization, useThisWeekUtilization)

**useCurrentUser.ts** — May not need migration since AuthContext now caches the profile. Review if this hook is even still used. If it is, it can read from AuthContext instead of querying Supabase.

**useTeamUtilization.ts** — Create new API route:
- `GET /api/team/utilization?orgId=xxx` → Returns utilization data
- Move Supabase query from hook to route handler
- Update hook to use `apiFetch`

**useThisWeekUtilization.ts** — Create new API route:
- `GET /api/team/utilization/week?orgId=xxx` → Returns this week's utilization
- Move both Supabase queries (users + allocations) to route handler
- Update hook to use `apiFetch`

### Subtask 3: Migrate useProjects

API route already exists at `src/api/routes/projects.ts`. 
- Check what endpoints exist and if they return the same data shape
- Update hook to use `apiFetch` instead of direct Supabase calls
- Ensure project search/filter works through API

### Subtask 4: Migrate useAllocations

This hook does CRUD operations. Need API routes for:
- `GET /api/allocations?userId=xxx&startDate=xxx&endDate=xxx`
- `POST /api/allocations` (create)
- `PUT /api/allocations/:id` (update)
- `DELETE /api/allocations/:id` (delete)

Some may already exist. Check `src/api/routes/` for existing allocation endpoints.
Move all Supabase queries to API route handlers.
Update hook to use `apiFetch`.

### Subtask 5: Migrate useConfirmations

Approvals route exists at `src/api/routes/approvals.ts`.
- Map existing endpoints to hook's data needs
- Handle realtime subscriptions — NOTE: Supabase realtime can stay as a direct connection since it's a WebSocket, not an RLS-gated query. Only migrate the REST queries.
- Update hook to use `apiFetch` for CRUD, keep `supabase` import only for realtime channel

### Subtask 6: Migrate useResourceCalendar (THE BIG ONE)

This is the most complex hook (1239 lines, ~15 Supabase calls). Break it into:

**Read operations — move to API:**
- Fetch users for calendar → `GET /api/resources/users?orgId=xxx`
- Fetch allocations for date range → `GET /api/resources/allocations?orgId=xxx&start=xxx&end=xxx`
- Fetch PTO entries → `GET /api/resources/pto?orgId=xxx&start=xxx&end=xxx`
- Fetch calendar events → `GET /api/resources/calendar-events?orgId=xxx&start=xxx&end=xxx`
- Fetch previous week allocations (for "Repeat Last Week") → Same allocations endpoint with different dates

Consider creating a single combined endpoint:
- `GET /api/resources/calendar-data?orgId=xxx&start=xxx&end=xxx` → Returns { users, allocations, pto, calendarEvents } in one call

**Write operations — move to API:**
- Create allocation → `POST /api/resources/allocations`
- Update allocation → `PUT /api/resources/allocations/:id`
- Delete allocation → `DELETE /api/resources/allocations/:id`
- Bulk create (repeat last week) → `POST /api/resources/allocations/bulk`

**Realtime — KEEP direct Supabase:**
- The realtime subscription for allocation changes can stay as a direct Supabase WebSocket. Only migrate REST queries.

### Subtask 7: Verify & Environment Variables

1. Add `VITE_API_URL` to:
   - `.env.local` (local dev): `http://localhost:3002`
   - Railway web app service env vars (production): `https://zhuzh-api-production.up.railway.app`
2. Test each page loads correctly with API routes
3. Verify no remaining direct Supabase queries (except realtime channels):
   ```bash
   grep -r "supabase.from" src/hooks/ --include="*.ts" --include="*.tsx"
   ```
   Should only show realtime-related usage.

## Verification

```bash
# 1. Check no direct Supabase data queries remain in hooks
grep -r "supabase.from" src/hooks/ --include="*.ts" --include="*.tsx"
# Should return ZERO results (realtime uses supabase.channel, not supabase.from)

# 2. Run dev server and test each page
npm run dev     # Terminal 1 (port 3000)
npm run api:dev # Terminal 2 (port 3002)

# 3. Test pages load:
# - /timesheet (My Timesheet)
# - /resources (Resource Calendar)
# - /team (Team page)
# - /budget (Budget dashboard)
# - /approvals (Approval queue)

# 4. Test production after deploy
git push  # Railway auto-deploys
# Visit https://zhuzh-production.up.railway.app and verify all pages
```

## Success Criteria

- [ ] All 7 hooks migrated to use API server instead of direct Supabase
- [ ] New API routes created for any missing endpoints
- [ ] `src/lib/api.ts` helper created and used consistently
- [ ] `VITE_API_URL` env var set locally and in Railway
- [ ] Realtime subscriptions still work (kept as direct Supabase WebSocket)
- [ ] All pages load correctly in local dev
- [ ] All pages load correctly in production
- [ ] No `supabase.from()` calls remain in hooks (only `supabase.channel()` for realtime)

## Update After Completion

1. Update `docs/SESSION_STATUS.md` with:
   - Migration complete
   - Any new API routes created
   - Any issues found
2. Note: After this migration, RLS policies become less critical since API uses service role key. Can simplify/remove them later.
