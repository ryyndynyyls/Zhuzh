# Cowork Task: Day/Week/Month View Toggle

**Created:** 2026-01-21
**Estimated time:** 45-60 min
**Why Cowork:** Touches multiple components and hooks, needs consistent implementation across pages

---

## Context

Currently both the Timesheet and Resource Calendar pages only show a **week view**. Kara requested the ability to toggle between Day, Week, and Month views for better visibility into workload.

**Current state:**
- `TimesheetPage.tsx` — Week-based confirmation flow
- `ResourceCalendarPage.tsx` — Week-based resource grid
- `ResourceCalendar.tsx` — Component that renders the weekly grid
- `useResourceCalendar.ts` — Hook that fetches allocations by week range

**Goal:**
- Add a toggle (segmented button) to switch between Day / Week / Month views
- Day = single day column, good for "what am I doing today"
- Week = current view (Mon-Sun)
- Month = 4-5 week columns, compressed view

---

## Key Files

- `src/pages/TimesheetPage.tsx` — Employee timesheet confirmation
- `src/pages/ResourceCalendarPage.tsx` — PM/Admin resource planning view
- `src/components/ResourceCalendar.tsx` — The grid component (~400 lines)
- `src/hooks/useResourceCalendar.ts` — Data fetching hook
- `src/components/ConfirmModal.tsx` — Timesheet confirmation modal

---

## Subtasks

### Subtask 1: Create ViewToggle Component

Create a reusable toggle component at `src/components/ViewToggle.tsx`:

```tsx
import React from 'react';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import CalendarViewDayIcon from '@mui/icons-material/CalendarViewDay';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';

export type ViewMode = 'day' | 'week' | 'month';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, newValue) => newValue && onChange(newValue)}
      size="small"
      sx={{
        '& .MuiToggleButton-root': {
          px: 2,
          py: 0.5,
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          },
        },
      }}
    >
      <ToggleButton value="day">
        <CalendarViewDayIcon sx={{ mr: 0.5, fontSize: 18 }} />
        Day
      </ToggleButton>
      <ToggleButton value="week">
        <CalendarViewWeekIcon sx={{ mr: 0.5, fontSize: 18 }} />
        Week
      </ToggleButton>
      <ToggleButton value="month">
        <CalendarViewMonthIcon sx={{ mr: 0.5, fontSize: 18 }} />
        Month
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
```

---

### Subtask 2: Update useResourceCalendar Hook

Modify `src/hooks/useResourceCalendar.ts` to accept a `viewMode` parameter:

**Changes needed:**
1. Add `viewMode: 'day' | 'week' | 'month'` to the hook options
2. Calculate date range based on view mode:
   - Day: just the selected date
   - Week: Mon-Sun of selected week (current behavior)
   - Month: 4-5 weeks centered on current date
3. Return `visibleWeeks` array adjusted for view mode

**Date range calculation:**
```typescript
function getDateRange(baseDate: Date, viewMode: ViewMode): { start: string; end: string; weeks: string[] } {
  if (viewMode === 'day') {
    const dateStr = baseDate.toISOString().split('T')[0];
    return { start: dateStr, end: dateStr, weeks: [dateStr] };
  }
  
  if (viewMode === 'week') {
    // Current behavior - return single week
    const monday = getMonday(baseDate);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
      weeks: [monday.toISOString().split('T')[0]]
    };
  }
  
  // Month view - 5 weeks
  const monday = getMonday(baseDate);
  monday.setDate(monday.getDate() - 14); // Start 2 weeks before
  const weeks: string[] = [];
  for (let i = 0; i < 5; i++) {
    const weekStart = new Date(monday);
    weekStart.setDate(monday.getDate() + (i * 7));
    weeks.push(weekStart.toISOString().split('T')[0]);
  }
  return {
    start: weeks[0],
    end: (() => {
      const lastWeek = new Date(weeks[4]);
      lastWeek.setDate(lastWeek.getDate() + 6);
      return lastWeek.toISOString().split('T')[0];
    })(),
    weeks
  };
}
```

---

### Subtask 3: Update ResourceCalendar Component

Modify `src/components/ResourceCalendar.tsx`:

1. Add `viewMode` prop
2. Adjust column widths based on view:
   - Day: single wide column (name + allocations side by side)
   - Week: current layout
   - Month: narrower columns, abbreviated labels
3. Update the grid rendering to handle different column counts

**Column width suggestions:**
```typescript
const columnWidths = {
  day: { name: 200, cell: 'calc(100% - 200px)' },
  week: { name: 180, cell: 120 },  // Current
  month: { name: 160, cell: 80 },  // Compressed
};
```

**Header label formatting:**
```typescript
function formatColumnHeader(dateStr: string, viewMode: ViewMode): string {
  const date = new Date(dateStr + 'T00:00:00');
  if (viewMode === 'day') {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }
  if (viewMode === 'week') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  // Month - abbreviated
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

---

### Subtask 4: Update ResourceCalendarPage

Modify `src/pages/ResourceCalendarPage.tsx`:

1. Import and add ViewToggle component
2. Add `viewMode` state: `const [viewMode, setViewMode] = useState<ViewMode>('week');`
3. Place toggle in the header area near the navigation arrows
4. Pass `viewMode` to ResourceCalendar and useResourceCalendar

**Layout suggestion:**
```tsx
<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
  <Typography variant="h5">Resources</Typography>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <ViewToggle value={viewMode} onChange={setViewMode} />
    {/* Existing nav arrows */}
  </Box>
</Box>
```

---

### Subtask 5: Update TimesheetPage (Optional Enhancement)

The TimesheetPage uses `ConfirmModal` which is week-focused by design. Two options:

**Option A (Recommended):** Keep Timesheet as week-only (confirmation is inherently weekly)

**Option B:** Add day view only for "what's on my plate today" quick look

If implementing Option B:
1. Add ViewToggle with only 'day' | 'week' options
2. Day view shows single day's allocations in simplified format
3. Still navigate by week for confirmation purposes

**Recommendation:** Start with Option A. The confirmation flow is weekly, so the toggle makes less sense here. Can add later based on feedback.

---

### Subtask 6: Handle Navigation for Different Views

Update the navigation arrows (`<` / `>`) to move by appropriate increments:

```typescript
function navigateView(direction: 'prev' | 'next', currentDate: Date, viewMode: ViewMode): Date {
  const newDate = new Date(currentDate);
  const delta = direction === 'next' ? 1 : -1;
  
  switch (viewMode) {
    case 'day':
      newDate.setDate(newDate.getDate() + delta);
      break;
    case 'week':
      newDate.setDate(newDate.getDate() + (delta * 7));
      break;
    case 'month':
      newDate.setMonth(newDate.getMonth() + delta);
      break;
  }
  
  return newDate;
}
```

Also update "Today" button to work correctly for each view mode.

---

## Verification

After completing all subtasks:

1. **ResourceCalendarPage tests:**
   - [ ] Toggle appears in header
   - [ ] Clicking "Day" shows single day column
   - [ ] Clicking "Week" shows current week (Mon-Sun)
   - [ ] Clicking "Month" shows ~5 weeks
   - [ ] Navigation arrows work correctly for each view
   - [ ] "Today" button works for each view
   - [ ] Allocations display correctly in all views

2. **Performance check:**
   - [ ] Month view doesn't lag with many users/allocations
   - [ ] View switching is instant (no loading state needed)

---

## Success Criteria

- [ ] ViewToggle component created and exported
- [ ] ResourceCalendar supports day/week/month views
- [ ] useResourceCalendar hook handles different date ranges
- [ ] ResourceCalendarPage has working toggle
- [ ] Navigation works correctly for each view mode
- [ ] No visual regressions in week view (current default)

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md` — Mark D/W/M toggle as complete
2. Add to Phase 1 features list
3. Note any edge cases discovered

---

## Notes

- Month view will have narrower columns — may need to truncate project names
- Consider adding allocation count badge for month view cells instead of full blocks
- Day view could show more detail per allocation (notes, phase, etc.)
- Persist user's preferred view mode in localStorage
