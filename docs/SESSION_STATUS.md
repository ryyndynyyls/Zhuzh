# ResourceFlow (Zhuzh) Session Status
**Updated:** 2026-02-16
**Current Focus:** ProStrat mini-pilot prep → Internal pilot launch

---

## 🚀 Railway Deployment: LIVE & VERIFIED

| Service | URL | Status |
|---------|-----|--------|
| **Web App** | https://zhuzh-production.up.railway.app | ✅ Working |
| **API Server** | https://zhuzh-api-production.up.railway.app | ✅ Verified |
| **Slack Bot** | https://zhuzh-slack-integration-production.up.railway.app | ✅ Active |

---

## 🎯 Current Priority: ProStrat Mini-Pilot

**Goal:** Get Michelle, Maleno, Kara, and Levi using Zhuzh for 1-2 weeks with real projects while Ryan makes improvements.

**Status:**
- ✅ App is live and working
- ✅ Calendar sync working (18 events synced, PTO/Fridays off showing correctly)
- ✅ All four pilot users have entries in the database (auto-match on Slack OAuth login)
- ⬜ Send invite message to Michelle, Maleno, Kara, Levi
- ⬜ Populate hours for 2 real ProStrat projects
- ⬜ Reschedule team walkthrough meeting

---

## ✅ Completed Today (2026-02-16)

### Major: API Migration (COMPLETE ✅)
**7 frontend hooks migrated from direct Supabase → Express API server**

This was the #1 performance fix. All data queries now go through the API server using the service role key, bypassing slow RLS policies entirely.

**Hooks migrated:**
- `useCurrentUser` → delegates to AuthContext (55→17 lines)
- `useTeamUtilization` → `/api/utilization`
- `useThisWeekUtilization` → `/api/utilization/week` (138→69 lines)
- `useProjects` → `/api/projects`
- `useAllocations` → full CRUD via `/api/allocations`
- `useConfirmations` → REST via API, realtime WebSocket kept direct
- `useResourceCalendar` → `/api/resources/calendar-data` + `/api/allocations` (1239→783 lines)

**New files created:**
- `src/lib/apiClient.ts` — thin fetch wrapper
- `src/api/routes/utilization.ts`, `allocations.ts`, `resources.ts`, `confirmations.ts`

**Environment:** `VITE_API_URL` set in Railway web app service → `https://zhuzh-api-production.up.railway.app`

### Auth Resilience (COMPLETE ✅)
- **Profile caching in localStorage** — instant app load from cache, session verified in background
- **30-second auth timeout** with friendly "Connection Issue" error page + Refresh button
- **Supabase keep-alive ping** — API server pings Supabase every 4 hours to prevent free tier pausing

### Google Calendar Fixes (COMPLETE ✅)
- **Domain hint (`hd`)** added to OAuth URL — restricts account picker to workspace domain
- **Server-side email verification** — rejects tokens from wrong Google account with friendly error message
- **Calendar sync config normalization** — Gemini-generated config format now properly converted to match sync code expectations
- **Google OAuth env vars** added to Railway API service: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- **Production redirect URI** registered in Google Cloud Console
- **Successful sync:** 18 events (PTO, holidays, Fridays off) synced for org

---

## 🎯 Task Sizing — Who Does What

| Task Type | Owner | Examples |
|-----------|-------|----------|
| Quick questions, architecture decisions | **Claude (chat)** | "Should we use X or Y?" |
| Code review, debugging strategy | **Claude (chat)** | "Why is this failing?" |
| Small edits (<50 lines, 1 file) | **Claude (chat)** | Fix a bug, add a field |
| Writing Cowork task specs | **Claude (chat)** | Define subtasks, success criteria |
| Large refactors (>100 lines) | **Cowork** | Restructure a component |
| Multi-file changes | **Cowork** | Feature touching 3+ files |
| Tasks >15 min estimated | **Cowork** | Complex debugging, migrations |
| Simple typos, copy/paste | **Ryan (VSCode)** | Rename a variable |
| Running/testing commands | **Ryan (terminal)** | `npm run dev`, curl tests |
| Browser testing | **Ryan** | Click through UI, verify visuals |

---

## 🐛 Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| Calendar config schema validation | 🟡 MED | Gemini generates different schema than sync code expects. Normalized at load time for UA5, but need validation/standardization for onboarding new orgs |
| Supabase free tier cold starts | 🟡 MED | Keep-alive ping mitigates but doesn't eliminate. Consider Pro ($25/mo) before pilot expands |
| Visual bar spanning | 🟢 LOW | Deferred - grouping/editing works, CSS spanning cosmetic |

---

## 📋 Next Priorities

1. **Send pilot invites** to Michelle, Maleno, Kara, Levi (Slack message ready)
2. **Reschedule team walkthrough** — demo the app, populate hours for 2 ProStrat projects
3. **E2E testing** — verify all pages work smoothly post-migration (test plan in previous session notes)
4. **Marketing page** — on hold, revisit after pilot feedback
5. **Clean up debug logging** before wider rollout

---

## 🧪 E2E Test Plan (Still Pending)

### Test 1: Resource Calendar — Visual Indicators
- [ ] PTO days show stripes (from Google Calendar sync)
- [ ] Fridays off show stripes for attendees
- [ ] Weekends show stripes
- [ ] Normal working days — NO stripes

### Test 2: Allocation Creation
- [ ] Click empty cell → dialog opens
- [ ] Select project, set hours, save
- [ ] Tile appears, totals update cleanly

### Test 3: Allocation Group Editing
- [ ] Click bar → Edit dialog with correct date range
- [ ] Edit All Days works, Delete Group works

### Test 4: Individual Day Editing
- [ ] Click day chip → single-day edit
- [ ] Back to Group button works
- [ ] Set to 0h → deletes just that day

### Test 5-8: Over-allocation warnings, Repeat Last Week, Slack DM, Manager Approvals

---

## 🔗 Quick Reference

**Local development:**
```bash
npm run dev        # Web (3000)
npm run api:dev    # API (3002)
npm run slack:dev  # Slack (3001)
```

**Key URLs:**
- Production: https://zhuzh-production.up.railway.app
- API Health: https://zhuzh-api-production.up.railway.app/health
- Supabase: https://supabase.com/dashboard/project/ovyppexeqwwaghwddtip
- GitHub: https://github.com/ryyndynyyls/Zhuzh

**Trigger calendar sync:**
```bash
curl -s -X POST "https://zhuzh-api-production.up.railway.app/api/calendar/sync" \
  -H "Content-Type: application/json" \
  -d '{"orgId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'
```

**Ryan's User ID:** `ce0c98c1-e9e6-4151-8a41-b4708c4c4795`
**Org ID:** `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

---

## 📊 Database Stats (2026-02-16)

| Metric | Count |
|--------|-------|
| Users | 27 |
| Projects | 224 |
| Allocations | 31,656 |
| Calendar Events Synced | 18 |
| Time Confirmations | 1,822 |
| Time Entries | 5,077 |
