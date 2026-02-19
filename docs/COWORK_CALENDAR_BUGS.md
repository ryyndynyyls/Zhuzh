# Cowork Task: Resource Calendar Bug Fixes

**Created:** Feb 19, 2026
**Estimated time:** 30-45 min
**Why Cowork:** Multiple bugs across 1900+ line component + hook file, parallel subtasks

---

## Context
Michelle, Kara, and Ryan did a ProStrat Jam Sesh testing the resource calendar in production. Several bugs were identified that need fixing before the internal pilot continues next week.

**Key files:**
- `src/components/ResourceCalendar.tsx` (~1914 lines) — main component with AllocationDialog
- `src/hooks/useResourceCalendar.ts` (~783 lines) — data fetching + state management
- `src/api/routes/allocations.ts` — allocation CRUD API

---

## Subtasks

### Subtask 1: Fix Hours Input UX in AllocationDialog
**Problem:** The "Hours (for this day)" field opens with a literal `8` value. When you clear it, you get `0` stuck and end up typing `08`. 
**Fix:** Change from controlled `value={plannedHours}` to use an empty string when cleared, with greyed-out placeholder showing "8". On save, default to 8 if empty.
**File:** `src/components/ResourceCalendar.tsx` — look for the hours `<TextField>` in `AllocationDialog` (~line 1145)
**Approach:**
- Change state from `number` to `string` for the input: `const [hoursInput, setHoursInput] = useState<string>('')`
- Set placeholder="8" on the TextField
- On dialog open, set hoursInput to allocation hours as string, or empty for new
- On save, parse to number with fallback to 8
- Also apply to the "Edit All Days" `groupHoursPerDay` field

### Subtask 2: Fix Plus Button Disappearing at 40h
**Problem:** When a user is fully allocated (40h/week or 8h/day), the "+" button to add more allocations disappears. Users need to overallocate and adjust.
**File:** `src/components/ResourceCalendar.tsx` — `WeekCellComponent` (~line 450)
**Current logic:** `cell.totalHours < overThreshold` controls visibility. Change to always show the add button regardless of hours.
**Fix:** Remove the `cell.totalHours < overThreshold` condition from the add button visibility. Keep the over-allocation warning icon.

### Subtask 3: Fix Drag-to-Extend Date/Utilization Bugs
**Problem:** When dragging an allocation to extend it across days:
1. The extended tiles show the original entry date instead of their actual date
2. Utilization % doesn't update after drag
**File:** `src/hooks/useResourceCalendar.ts` — `extendAllocation` function
**File:** `src/components/ResourceCalendar.tsx` — drag extend handlers
**Fix:** After extending, the new allocations created should have correct start_date/end_date per day. The grid data should refetch/recompute after extend completes. Check that `extendAllocation` creates individual day records with correct dates.

### Subtask 4: Fix Snackbar Covering Smart Assistant
**Problem:** Success toast notification pops up at bottom-center and covers the Gemini voice assistant input bar.
**File:** `src/components/ResourceCalendar.tsx` — Snackbar at ~line 1896
**Fix:** Change `anchorOrigin` from `{ vertical: 'bottom', horizontal: 'center' }` to `{ vertical: 'top', horizontal: 'center' }` or `{ vertical: 'bottom', horizontal: 'left' }` so it doesn't overlap the smart assistant bar.

### Subtask 5: Clean Up Zero-Hour Allocations Display
**Problem:** 0h allocation tiles sometimes appear on the calendar grid.
**File:** `src/components/ResourceCalendar.tsx` — `WeekCellComponent`
**Current:** There's already a filter `cell.allocations.filter(a => a.plannedHours > 0)` at ~line 448. Verify this is working. Also check that decimal display uses clean rounding (e.g., `8` not `8.0` or `7.999999`).
**Fix:** Ensure all hour displays use `Math.round(hours * 100) / 100` and strip trailing zeros.

---

## Verification
```bash
# Build locally to check for compile errors
cd ~/Claude-Projects-MCP/ResourceFlow && npm run build

# Test in browser
# 1. Open resource calendar, click cell → hours field should be empty with placeholder
# 2. Allocate someone to 40h → plus button should still be visible
# 3. Drag an allocation → extended days should show correct dates
# 4. Add allocation → toast should not cover smart assistant bar
# 5. No 0h tiles visible, hours display cleanly
```

## Success Criteria
- [ ] Hours input field is empty with placeholder, no stuck zeros
- [ ] Plus button always visible even at/above 40h
- [ ] Drag-to-extend shows correct dates and updates utilization
- [ ] Snackbar doesn't overlap smart assistant
- [ ] No 0h allocations displayed, clean decimal display
- [ ] `npm run build` succeeds with no errors

## Update After Completion
1. Update `docs/SESSION_STATUS.md`
2. Commit and push to trigger Railway deploy
