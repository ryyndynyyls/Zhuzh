# ResourceFlow (Zhuzh) Session Status
**Updated:** 2026-02-19
**Current Focus:** Post-ProStrat Jam Sesh bug fixes and feature work

---

## 🚀 Railway Deployment: LIVE & VERIFIED

| Service | URL | Status |
|---------|-----|--------|
| **Web App** | https://zhuzh-production.up.railway.app | ✅ Working |
| **API Server** | https://zhuzh-api-production.up.railway.app | ✅ Verified |
| **Slack Bot** | https://zhuzh-slack-integration-production.up.railway.app | ✅ Active |

---

## 🎯 Current Priority: ProStrat Jam Sesh Follow-Up

**ProStrat meeting completed Feb 19** with Michelle, Maleno, Kara, Ryan. Identified bugs and feature requests during live testing. Maleno scheduling follow-up for next week (Michelle out).

### Completed Today (Feb 19)
- ✅ Fixed project dropdown empty bug (RLS → API migration)
- ✅ Built cascading phase selector in allocation dialog
- ✅ Fixed TeamMemberModal loading hang (RLS → API migration)
- ✅ Cataloged all bugs/features from ProStrat session
- ✅ Created 3 Cowork task files
- ✅ **COWORK_CALENDAR_BUGS.md** — All 5 subtasks complete:
  - Hours input uses empty field with placeholder "8" (no more stuck zeros)
  - Plus button always visible even at/above 40h
  - Drag-to-extend creates proper day records with correct dates
  - Snackbar moved to top-center (no longer covers smart assistant)
  - Decimal display cleaned up with proper rounding

### Cowork Tasks Ready to Execute

**1. `docs/COWORK_CALENDAR_BUGS.md` — Resource Calendar Bug Fixes**
- Hours input UX (empty placeholder instead of stuck zero)
- Plus button disappears at 40h (should always show)
- Drag-to-extend shows wrong dates, utilization doesn't update
- Snackbar toast covers smart assistant bar
- Zero-hour allocations and decimal cleanup

**2. `docs/COWORK_PTO_CALENDAR.md` — PTO/Calendar → Resource Calendar**
- PTO days need diagonal stripes on resource calendar
- "Allocate for whole week" should skip PTO days
- Batch delete all allocations for a day

**3. `docs/COWORK_COLORS_BUDGET.md` — Color-Coding + Budget Logic**
- Color-code billable vs non-billable allocation blocks
- Billable projects: total budget in dollars, phases in hours
- Non-billable projects: total budget in hours
- Archive old projects to declutter dropdowns

### Other Items (Not yet in Cowork tasks)
- Agent Challenge missing from project phases (quick DB add)
- Voice command mapping needs more work (lower priority)
- Notes visibility confirmed as good (no change needed)

---

## Recent Fixes (Feb 19)
- **Project dropdown:** Migrated from Supabase direct → API in ResourceCalendarPage.tsx
- **Phase selector:** Added cascading Sub-project/Phase dropdown in AllocationDialog
- **TeamMemberModal:** Migrated user fetch and save from Supabase direct → API
- **Railway deploy:** Discovered caching issue — empty commits don't bust cache, need actual file changes

---

## Tech Notes
- Railway auto-deploy sometimes doesn't trigger — watch for stale deploys
- Multiple components still query Supabase directly (RLS blocks them). Known remaining: TeamMemberModal avatar upload, past projects fetch
- Phase selector dropdown needs `ListboxProps={{ style: { maxHeight: 200 } }}` to prevent overflow

---

## Links

| Resource | URL |
|----------|-----|
| **Production App** | https://zhuzh-production.up.railway.app |
| **Production API** | https://zhuzh-api-production.up.railway.app/health |
| Supabase Dashboard | https://supabase.com/dashboard/project/ovyppexeqwwaghwddtip |
| GitHub Repo | https://github.com/ryyndynyyls/Zhuzh |
| ProStrat Meeting Notes | See Gemini transcript from Feb 19, 2026 |
