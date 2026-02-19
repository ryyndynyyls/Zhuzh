# Cowork Task: Resource Calendar Bug Fixes (Post-Workshop)

**Created:** 2026-02-19
**Estimated time:** 45 min
**Why Cowork:** Multiple files, 6 independent fixes that can be parallelized
**Source:** ProStrat Jam Sesh workshop feedback (Feb 19, 2026)

---

## Context

Michelle, Kara, and Ryan tested Zhuzh live in a workshop session. Several UX bugs were identified on the Resource Calendar. All fixes are in the frontend — mostly in `src/components/ResourceCalendar.tsx` and `src/hooks/useResourceCalendar.ts`.

Production: https://zhuzh-production.up.railway.app
Codebase: `/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/`

---

## Subtasks

### Subtask 1: Fix drag-to-extend date and utilization bugs
**File:** `src/components/ResourceCalendar.tsx` (handleDragExtendStart function ~line 1370) and `src/hooks/useResourceCalendar.ts` (extendAllocation ~line 695)

**Problem:** When dragging an allocation from Monday to Tuesday-Friday:
- Clicking into Tuesday's tile still shows Monday's date in the edit dialog
- Utilization % doesn't update after drag (stays at 20% instead of recalculating)

**Fix:**
- After `extendAllocation` succeeds, the hook should refetch/recalculate the grid data
- The drag operation creates new single-day allocations for each extended day — verify each gets its own correct `start_date` and `end_date`
- Ensure the grid re-renders with updated totals after extension

### Subtask 2: Plus button always visible (even at 40h+)
**File:** `src/components/ResourceCalendar.tsx` (WeekCellComponent, ~line 870)

**Problem:** The "+" button to add allocations disappears when a resource hits 40h for the week. Michelle needs to overallocate and then adjust.

**Fix:** Find the condition that hides the add button (likely `cell.totalHours < overThreshold`) and remove or change it. The "+" should ALWAYS be visible on hover, regardless of total hours. The over-allocation warning (orange icon) should still appear — just don't hide the ability to add.

Current code (~line 910):
```tsx
{(filteredAllocations.length > 0 || cell.ptoEntries) && cell.totalHours < overThreshold && (
```
Change to:
```tsx
{(filteredAllocations.length > 0 || cell.ptoEntries) && (
```

### Subtask 3: Hours input UX — placeholder instead of value
**File:** `src/components/ResourceCalendar.tsx` (AllocationDialog, ~line 1140-1160)

**Problem:** The "Hours (for this day)" input field starts with a literal `8` as a value. When you clear it, you get `0` and have to delete it. Typing appends to the existing value (e.g., "08").

**Fix:**
- For NEW allocations: field should be empty with a greyed-out placeholder of "8"
- For EDIT allocations: field should show the current value
- When the field is cleared, it should be truly empty (empty string), not "0"
- On save, if empty, default to 8 (or require a value)

Change the TextField to use an empty string default for new allocations:
```tsx
const [plannedHours, setPlannedHours] = useState<number | ''>(allocation?.plannedHours || '');
```
Update the TextField:
```tsx
<TextField
  label="Hours (for this day)"
  type="number"
  value={plannedHours}
  onChange={(e) => setPlannedHours(e.target.value === '' ? '' : Number(e.target.value))}
  placeholder="8"
  inputProps={{ min: 0, max: 24, step: 0.5 }}
  fullWidth
/>
```
On save, coerce empty to 8:
```tsx
const finalHours = plannedHours === '' ? 8 : plannedHours;
```

### Subtask 4: Clean up decimal display on tiles
**File:** `src/components/ResourceCalendar.tsx` (AllocationBlock component, ~line 730 and WeekCellComponent total hours ~line 930)

**Problem:** Hours sometimes show messy floating point values like 7.999999 or 0.5000001.

**Fix:** Round display values everywhere:
- AllocationBlock: `{Math.round(hoursToShow * 2) / 2}h` (rounds to nearest 0.5)
- Total hours display: `{Math.round(cell.totalHours * 2) / 2}h`
- Or simpler: use `parseFloat(hoursToShow.toFixed(1))` to show max 1 decimal

### Subtask 5: Move snackbar so it doesn't cover smart assistant
**File:** `src/components/ResourceCalendar.tsx` (~line 1615)

**Problem:** Success/error toast notification covers the Gemini voice input bar at the bottom of the screen.

**Fix:** Change the Snackbar anchorOrigin from bottom-center to top-center:
```tsx
<Snackbar
  open={snackbar.open}
  autoHideDuration={4000}
  onClose={() => setSnackbar({ ...snackbar, open: false })}
  anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
>
```

### Subtask 6: Filter 0h allocations from display
**File:** `src/components/ResourceCalendar.tsx` (WeekCellComponent)

**Problem:** Allocations with 0 planned hours still show as tiles on the calendar.

**Note:** There's already a filter `const filteredAllocations = cell.allocations.filter(a => a.plannedHours > 0);` at ~line 860. Verify this is working. If 0h allocations still appear, the issue may be in the hook's data transformation. Check `useResourceCalendar.ts` where allocations are mapped to cells.

---

## Verification

After all fixes, test in production:
1. Create allocation → hours field should be empty with "8" placeholder
2. Save → no decimal weirdness on tile
3. Drag allocation to extend → new days show correct dates, utilization updates
4. Allocate someone to 40h+ → plus button still visible
5. Save allocation → toast appears at TOP of screen, not blocking voice input
6. No 0h ghost tiles visible

```bash
cd ~/Claude-Projects-MCP/ResourceFlow && npm run dev
# Test in browser at localhost:3000/resources
```

## Success Criteria
- [ ] Drag-to-extend creates correct per-day allocations with right dates
- [ ] Utilization recalculates after drag
- [ ] Plus button visible at any hour count
- [ ] Hours input: empty placeholder for new, value for edit
- [ ] No messy decimals on tiles or totals
- [ ] Snackbar at top, not covering voice assistant
- [ ] No 0h allocation tiles

## Update After Completion
1. Update `docs/SESSION_STATUS.md` with fixes completed
2. `git push origin main` to trigger Railway deploy
