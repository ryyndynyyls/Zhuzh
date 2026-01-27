# Cowork Task: UI/UX Polish & Bug Fixes

**Created:** 2026-01-27
**Estimated time:** 30 min
**Why Cowork:** Multiple small fixes across different files, good for parallel work

---

## Context

Several small UI issues found during E2E testing that should be fixed before pilot.

## Subtasks

### Subtask 1: Calendar Icon Contrast (ADA)
**Issue:** Date picker icon on Approvals page is too dark, fails accessibility.

1. Find the date picker component (likely in `src/components/` or within Approvals page)
2. Update icon color to white or `text.primary` from theme
3. Check other date pickers in app for consistency

**File hint:** Look for `DatePicker`, `Calendar`, or MUI date components

### Subtask 2: Duplicate #50 Rankings
**Issue:** Multiple projects showing #50 (2025 Maintenance, 24 Hour Home Care, 24Hr Maintenance)

1. Find where project rankings are calculated/displayed (Dashboard Active Projects table)
2. Check if `priority` or `rank` field exists in projects table
3. If rankings are calculated: fix the sorting logic
4. If rankings come from data: this is a data issue, document it

**File hint:** Look in Dashboard page or project list component

### Subtask 3: Budget Mismatch Display
**Issue:** 24 Hour Home Care shows 31.55/0 hrs — time logged but budget shows 0

1. Find Budget dashboard component
2. Check if this is:
   - Display issue (budget exists but not showing)
   - Data issue (budget truly is 0)
   - Calculation issue (burned hours not matching budget source)
3. If budget is 0, should show "No budget set" instead of "31.55/0 hrs"
4. Add graceful handling for projects without budgets

### Subtask 4: Unplanned Work Project List
**Issue:** "Add Unplanned Work" modal only shows projects user is already assigned to

1. Find the Unplanned Work modal component
2. Find the query that populates the project dropdown
3. Change query to fetch ALL active projects, not just user's assignments
4. Keep search/filter functionality

**File hint:** Look for `UnplannedWork`, `AddEntry`, or similar in `src/components/`

## Verification
```bash
# Manual checks:
# 1. Approvals page → date picker icon should be clearly visible (white)
# 2. Dashboard → no duplicate rankings in Active Projects
# 3. Budget page → projects without budgets display gracefully
# 4. My Timesheet → Add Unplanned Work → should see ALL projects in dropdown
```

## Success Criteria
- [ ] Calendar icon passes WCAG contrast requirements
- [ ] No duplicate rankings in project list
- [ ] Budget display handles $0 budgets gracefully
- [ ] Unplanned Work shows full project list

## Update After Completion
1. Update `docs/SESSION_STATUS.md` with fixes made
