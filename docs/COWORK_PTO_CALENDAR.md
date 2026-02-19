# Cowork Task: PTO/Calendar → Resource Calendar Integration

**Created:** Feb 19, 2026
**Estimated time:** 30-45 min
**Why Cowork:** Touches multiple files across API routes, hooks, and component rendering logic

---

## Context
Google Calendar sync is working — PTO events, holidays, and Fridays-off are already stored in the `user_calendar_events` table. The resource calendar API already returns these as `ptoEntries`. The data flows into the grid and PTO badges show up. BUT:

1. PTO days are NOT showing the diagonal stripe pattern (unavailable indicator)
2. "Allocate for whole week" does NOT skip PTO/Friday-off days
3. No way to batch-delete all allocations for a single day

The striping logic already works for custom work schedules (e.g., someone with 0h on Fridays gets stripes). We need to extend this to also cover PTO days from calendar sync.

**Key files:**
- `src/components/ResourceCalendar.tsx` — WeekCellComponent renders stripes (~line 440), AllocationDialog handles week allocation
- `src/hooks/useResourceCalendar.ts` — grid data computation, PTO merging (~line 480-545)
- `src/api/routes/resources.ts` — calendar-data endpoint returns ptoEntries

---

## Subtasks

### Subtask 1: PTO Days Show Stripes on Resource Calendar
**Problem:** PTO days from Google Calendar don't show diagonal stripes like 0h work schedule days do.
**Current logic in WeekCellComponent (~line 448):**
```typescript
const isUnavailable = (viewMode === 'week' || viewMode === 'day') && (hoursAvailable === 0 || isFullDayPto);
```
This checks `isFullDayPto` which is based on `cell.ptoHours >= 8`. This SHOULD already work.
**Debug:** Check if `cell.ptoEntries` and `cell.ptoHours` are actually being populated from the calendar events. The issue may be in the grid data computation in `useResourceCalendar.ts` where PTO entries are merged into week cells.
**Verify:** In week view, a day with PTO should show stripes AND the PTO badge. In month view, PTO should be reflected in the week summary.

### Subtask 2: "Allocate for Whole Week" Skips PTO Days
**Problem:** When checking "Allocate for whole week (Mon-Fri, 8h per day)", it creates 5 allocations even if the person has PTO on one of those days.
**File:** `src/hooks/useResourceCalendar.ts` — `createAllocation` function with `expandToWeek` flag (~line 588)
**Fix:** When `expandToWeek` is true:
1. Fetch the user's PTO entries for that week
2. Skip any day where user has full-day PTO (>= 8h)
3. For partial PTO days, reduce hours accordingly (or skip — confirm with Ryan)
4. Also skip days where the user's work schedule is 0h

The PTO data is already available in the hook's `ptoEntries` state. Pass it into the create logic.

### Subtask 3: Batch Delete All Allocations for a Day
**Problem:** Michelle wants to clear all of a person's allocations for a single day at once (e.g., when someone is suddenly off).
**Approach:** Add a "Clear Day" button/option to the WeekCellComponent or the allocation dialog.
**Implementation:**
1. In `WeekCellComponent`, add a context menu or button that appears when a cell has multiple allocations
2. Add a `deleteAllocationsForDay(userId: string, date: string)` function to the hook
3. API: use the existing delete endpoint but in a batch — delete all allocations where `user_id = X AND start_date = Y`
4. Could also add a right-click context menu with "Clear all allocations for this day"

**Simpler approach:** When clicking the total hours label at the bottom of a cell, show a popover with "Clear day" option. Or add it to the existing allocation dialog when opening from a cell with multiple allocations.

---

## Verification
```bash
cd ~/Claude-Projects-MCP/ResourceFlow && npm run build

# Test in browser:
# 1. Find a user with PTO synced from Google Calendar
# 2. In week view, their PTO day should show diagonal stripes
# 3. Try "Allocate for whole week" for that user — PTO day should be skipped
# 4. Add multiple allocations to a day, then use batch delete to clear them all
```

## Success Criteria
- [ ] PTO days from Google Calendar show diagonal stripes in week/day view
- [ ] "Allocate for whole week" skips PTO days and 0h schedule days
- [ ] Can delete all allocations for a person's day in one action
- [ ] `npm run build` succeeds

## Update After Completion
1. Update `docs/SESSION_STATUS.md`
2. Commit and push to trigger Railway deploy
