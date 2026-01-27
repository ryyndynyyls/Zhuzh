# ResourceFlow (Zhuzh) Session Status
**Updated:** 2026-01-27 (post E2E review)
**Current Focus:** Bug Fixes & Features from E2E Testing

---

## 🚀 Railway Deployment: LIVE

| Service | URL | Status |
|---------|-----|--------|
| **Web App** | https://zhuzh-production.up.railway.app | ✅ Working |
| **API Server** | https://zhuzh-api-production.up.railway.app | ✅ Working |
| **Slack Bot** | https://zhuzh-slack-integration-production.up.railway.app | ✅ Active |

---

## 🔧 COWORK TASKS QUEUED

Run these in Claude Desktop → Tasks mode. Mount ResourceFlow folder, then paste the command.

| Task | Command | Est. Time | Priority |
|------|---------|-----------|----------|
| **01: OAuth Config** | `Read docs/COWORK_01_OAUTH_CONFIG.md and execute all subtasks` | 15 min | 🔴 Critical |
| **02: Live Sync** | `Read docs/COWORK_02_LIVE_SYNC.md and execute all subtasks` | 45-60 min | 🔴 Critical |
| **03: UI Polish** | `Read docs/COWORK_03_UI_POLISH.md and execute all subtasks` | 30 min | 🟠 Medium |
| **04: Resource Features** | `Read docs/COWORK_04_RESOURCE_FEATURES.md and execute all subtasks` | 90-120 min | 🟠 Medium |

**Recommended order:** 01 → 02 → 03 → 04

---

## 📋 Issues Found in E2E Testing (2026-01-27)

### 🔴 Critical
- [x] OAuth redirects to localhost instead of production **FIXED 2026-01-27**
- [x] Allocations created but UI doesn't update **FIXED 2026-01-27** (Added Supabase Realtime)

### 🟠 Medium  
- [x] Add Unplanned Work shows limited project list **FIXED 2026-01-27** (Now fetches all active projects)
- [x] Approvals page doesn't update in real-time **FIXED 2026-01-27** (Added Supabase Realtime)
- [ ] Duplicate #50 rankings in Active Projects **DATA ISSUE** - Multiple projects have priority=50 in database. Fix by updating project priorities in Supabase.

### 🟡 Low/Polish
- [x] Calendar icon contrast (ADA) **FIXED 2026-01-27** (Added filter:invert to date picker icons)
- [x] Budget mismatch display (31.55/0 hrs) **FIXED 2026-01-27** (Now shows "No budget set" gracefully)

---

## 📝 New Features from Michelle/Kara Feedback

From ProStrat standup 2026-01-27:

| Feature | Priority | Status |
|---------|----------|--------|
| Repeat Last Week | HIGH | ✅ **DONE** - Button added to Resource Calendar toolbar |
| PTO indicators in Resources rows | HIGH | ⚠️ Needs DB migration + UI (see below) |
| Custom utilization patterns per user | HIGH | ⚠️ Needs DB migration + UI (see below) |
| Voice input during resourcing calls | MEDIUM | Already built, needs polish |
| Manager digest DMs | MEDIUM | Future |

**Key insight:** Drag-to-allocate deprioritized. Michelle/Kara prefer text input + repeat functionality.

---

## ✅ Phase 1: COMPLETE

All original features shipped. See previous status for full list.

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
- Supabase: https://supabase.com/dashboard/project/ovyppexeqwwaghwddtip
- GitHub: https://github.com/ryyndynyyls/Zhuzh

---

---

## 🔧 MANUAL STEPS REQUIRED (Ryan)

### ✅ COMPLETED - OAuth Fix (do these now)
1. **Railway Dashboard** - Add/verify env vars for API service:
   - `APP_URL=https://zhuzh-production.up.railway.app`
   - `GOOGLE_REDIRECT_URI=https://zhuzh-api-production.up.railway.app/api/auth/google/callback`

2. **Google Cloud Console** (console.cloud.google.com):
   - APIs & Services → Credentials → OAuth 2.0 Client ID
   - Add redirect URI: `https://zhuzh-api-production.up.railway.app/api/auth/google/callback`

3. **Redeploy** API service on Railway

### 🟠 PENDING - Database Migrations for PTO & Custom Hours

Run this SQL in Supabase SQL Editor to add support for:
- Custom weekly hours (e.g., 32 hours for part-time workers)
- PTO indicators visible in Resource Calendar

```sql
-- Add weekly_hours column to users (defaults to 40)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS weekly_hours INTEGER DEFAULT 40;

-- Add comment for documentation
COMMENT ON COLUMN users.weekly_hours IS 'Standard work hours per week for this user. Used for utilization calculations.';
```

After running this, the UI will need a settings page update (can do in next session).

---

## 🔄 CLAUDE CURRENTLY WORKING ON

**Task 04: Resource Features** - ✅ Repeat Last Week done, PTO/Custom utilization in progress

### ✅ Task 03: UI Polish - COMPLETED
- Calendar icon contrast fixed (ADA)
- Budget display handles $0 budgets gracefully
- Unplanned Work now shows ALL active projects

### ✅ Task 02: Live Sync - COMPLETED
Added Supabase Realtime subscriptions to:
- `useResourceCalendar.ts` - Allocations now sync instantly across all open tabs/users
- `useConfirmations.ts` - Approvals page now updates automatically when timesheets are submitted

---

### 🟢 FIX DUPLICATE RANKINGS (Quick Data Fix)

In Supabase SQL Editor, run:
```sql
-- Check which projects have duplicate priority
SELECT priority, COUNT(*), array_agg(name) as project_names
FROM projects
WHERE is_active = true
GROUP BY priority
HAVING COUNT(*) > 1;

-- Then manually update priorities to be unique
-- Example: UPDATE projects SET priority = 51 WHERE id = 'xxx';
```

---

*Session completed. Deploy changes and run manual steps above.*
