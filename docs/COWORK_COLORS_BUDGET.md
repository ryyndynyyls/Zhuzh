# Cowork Task: Color-Code Allocations + Project Budget Logic

**Created:** Feb 19, 2026
**Estimated time:** 30-45 min
**Why Cowork:** Touches component rendering, API data flow, and project settings page

---

## Context
From the ProStrat Jam Sesh, Michelle and Kara requested:
1. Allocation blocks on the resource calendar should be color-coded by billing type (billable vs non-billable vs PTO) — similar to how 10,000ft does it
2. Project budget logic needs updating — billable projects use dollars for total budget, non-billable use hours; phases always track hours
3. Archive old projects to declutter dropdowns

**Key files:**
- `src/components/ResourceCalendar.tsx` — AllocationBlock rendering (~line 220)
- `src/hooks/useResourceCalendar.ts` — allocation data includes project info
- `src/pages/ProjectSettingsPage.tsx` (~1010 lines) — project settings UI
- `src/hooks/useProjectSettings.ts` (~267 lines) — project settings data
- `src/api/routes/projects.ts` — project CRUD API

---

## Subtasks

### Subtask 1: Color-Code Allocation Blocks by Billing Type
**Problem:** All allocation blocks use the project's color. Michelle wants billable, non-billable, and PTO to be visually distinct.
**Approach:** Don't replace project colors — instead add a subtle visual indicator:
- **Billable:** Normal project color (current behavior) — maybe with a small "$" icon or subtle border
- **Non-billable:** Project color but with a diagonal hash/pattern overlay or muted opacity, or a distinct left-border style
- **PTO:** Already has its own PTO badge styling — keep as-is

**Alternative simpler approach:** Add a small colored dot or tag to the allocation block:
- Green dot = billable
- Grey dot = non-billable  
- Blue badge = PTO (already exists)

**Data flow:** The allocation API already returns `is_billable` per allocation. The `CalendarAllocation` type in `useResourceCalendar.ts` includes `isBillable`. Check if the project-level `is_billable` flag cascades to allocations.

**File:** `src/components/ResourceCalendar.tsx` — `AllocationBlock` component (~line 220)
**Fix:** Add visual differentiation based on `allocation.isBillable`:
```tsx
// Example: muted opacity for non-billable
sx={{
  bgcolor: allocation.projectColor,
  opacity: allocation.isBillable ? 1 : 0.7,
  borderLeft: allocation.isBillable ? 'none' : '3px dashed rgba(255,255,255,0.3)',
}}
```

### Subtask 2: Project Budget Logic — Dollars vs Hours
**Problem:** 
- Billable projects should show total budget in **dollars** (e.g., $500,000 SOW)
- Non-billable projects should show total budget in **hours**
- Phase budgets are always in **hours**
- When adding phases, the total project budget should update (sum of phase hours)

**Files:** 
- `src/pages/ProjectSettingsPage.tsx` — budget display and input fields
- `src/hooks/useProjectSettings.ts` — data fetching
- `src/api/routes/projects.ts` — API endpoints

**Fix:**
1. In project settings, check `is_billable`:
   - If billable: show "Total Budget" with "$" prefix, keep hourly rate field
   - If non-billable: show "Total Budget" with "hours" suffix, hourly rate shows but can track opportunity cost
2. Phase section: always show hours
3. When phases have budget hours, compute sum and display as "Phase Budget Total: Xh"
4. For billable projects: show both the dollar budget AND the computed phase hours

### Subtask 3: Archive Projects to Declutter Dropdowns
**Problem:** Too many old/completed projects appear in the allocation dropdown.
**Current:** Projects have a `status` field (active, completed, archived). The dropdown already filters by `status=active`.
**Fix:** 
1. Verify the allocation dialog project dropdown only shows `status=active` projects
2. In project settings, add an easy "Archive" button that sets `status=archived`
3. Consider adding a quick "Archive" option to the project list/dashboard
4. Verify archived projects don't appear in dropdowns but their historical data still shows in reports

**Check:** The recent fix to route projects through API uses `/api/projects?status=active`. Verify this filter is working correctly and old projects aren't leaking through.

---

## Verification
```bash
cd ~/Claude-Projects-MCP/ResourceFlow && npm run build

# Test in browser:
# 1. Create allocations for a billable and non-billable project on same user
#    → They should look visually different
# 2. Open project settings for a billable project
#    → Total budget should show in dollars
# 3. Open project settings for a non-billable project  
#    → Total budget should show in hours
# 4. Archive a project → it should disappear from allocation dropdown
```

## Success Criteria
- [ ] Billable and non-billable allocations are visually distinct on resource calendar
- [ ] Billable project settings show dollar budget, non-billable show hours
- [ ] Phase hour budgets are tracked separately and sum correctly
- [ ] Archived projects don't appear in allocation dropdown
- [ ] `npm run build` succeeds

## Update After Completion
1. Update `docs/SESSION_STATUS.md`
2. Commit and push to trigger Railway deploy
