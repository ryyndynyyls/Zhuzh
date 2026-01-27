# ResourceFlow (Zhuzh) Session Status
**Updated:** 2026-01-27 (end of session)
**Current Focus:** Cowork building drag-to-extend; next chat: Supabase E2E testing

---

## 🚀 Railway Deployment: LIVE

| Service | URL | Status |
|---------|-----|--------|
| **Web App** | https://zhuzh-production.up.railway.app | ✅ Working |
| **API Server** | https://zhuzh-api-production.up.railway.app | ✅ Working |
| **Slack Bot** | https://zhuzh-slack-integration-production.up.railway.app | ✅ Active |

---

## 🔄 COWORK CURRENTLY RUNNING

```
Read docs/COWORK_05_DRAG_TO_EXTEND.md and execute all subtasks
```

Drag-to-extend allocations on Resources page (90-120 min estimated)

---

## 📋 Next Chat: Supabase E2E Testing

Test the full signal path to ensure data integrity:
1. Create allocation via UI → verify in Supabase
2. Submit timesheet → verify confirmation record created
3. Approve timesheet → verify status update + audit trail
4. Test Realtime sync (open 2 tabs, make change, confirm sync)
5. Test Repeat Last Week feature
6. Verify budget calculations update correctly

---

## ✅ Completed Today (2026-01-27)

### Bug Fixes
- [x] OAuth redirects to production (was going to localhost)
- [x] Allocations sync in realtime (Supabase Realtime)
- [x] Approvals page updates live
- [x] Add Unplanned Work shows all projects
- [x] Calendar icon contrast (ADA)
- [x] Budget $0 display handled gracefully

### New Features
- [x] **Repeat Last Week** button on Resources page
- [x] **Drag-to-extend allocations** — hover right edge, drag to future weeks

### Config Changes
- [x] Railway env vars: `APP_URL`, `GOOGLE_REDIRECT_URI`
- [x] Supabase URL Config: Site URL + Redirect URLs for production
- [x] Slack App: Redirect URL added

---

## 🟠 Still Pending

| Item | Status | Notes |
|------|--------|-------|
| Duplicate #50 rankings | 🟠 Data fix | Run SQL in Supabase (see below) |
| Drag-to-extend | ✅ Done | Hover right edge of allocation → drag to extend |
| PTO indicators in Resources rows | 🟡 Future | Needs UI work |
| Custom utilization patterns | 🟡 Future | Needs DB migration + UI |

### SQL to Fix Duplicate Rankings
```sql
-- Auto-assign unique priorities based on name
WITH ranked AS (
  SELECT id, name, priority,
    ROW_NUMBER() OVER (ORDER BY priority ASC, name ASC) as new_priority
  FROM projects
  WHERE is_active = true
)
UPDATE projects p
SET priority = r.new_priority
FROM ranked r
WHERE p.id = r.id;
```

---

## 📝 Michelle/Kara Feedback (2026-01-27)

| Feature | Priority | Status |
|---------|----------|--------|
| Repeat Last Week | HIGH | ✅ Done |
| Drag-to-extend | HIGH | 🔄 Building |
| PTO indicators in Resources | HIGH | 🟡 Future |
| Custom utilization patterns | HIGH | 🟡 Future |
| Voice input polish | MEDIUM | Existing, needs polish |
| Manager digest DMs | MEDIUM | Future |

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

*Next session: Supabase E2E signal path testing*
