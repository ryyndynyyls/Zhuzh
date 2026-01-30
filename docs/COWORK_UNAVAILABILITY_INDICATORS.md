# Cowork Task: Unavailability Visual Indicators

**Created:** 2026-01-30
**Estimated time:** 30-45 min
**Why Cowork:** Touches calendar cell rendering, moderate complexity

---

## Context

The resource calendar now shows custom schedules (e.g., Hunter's "33h/wk" chip), but there's no visual indicator showing *which* days a person is unavailable. Producers need to see at a glance:

1. **PTO days** - Already have PTO data, need diagonal stripes
2. **Non-working days from schedule** - e.g., Hunter doesn't work Fridays (0h)
3. **Reduced hours days** - e.g., Hunter only works 3h on Thursdays (optional, lower priority)

**Goal:** Add subtle diagonal lines across calendar cells for days where a resource should not be scheduled.

---

## Current State

**Data available:**
- `user.workSchedule` - Object with `{ mon: 8, tue: 8, wed: 8, thu: 3, fri: 0, sat: 0, sun: 0 }`
- `user.hasCustomSchedule` - Boolean, true if not standard 40h/wk
- PTO data already rendered in cells (beach icon shows)

**Files involved:**
- `src/hooks/useResourceCalendar.ts` - Lines 659-676 already use workSchedule for overallocation calc
- `src/components/ResourceCalendar.tsx` - Cell rendering, ~lines 700-900

---

## Subtasks

### Subtask 1: Add CSS for Diagonal Stripes

Create a reusable CSS class for unavailable days. Add to the component or a shared styles file:

```css
/* Diagonal stripes for unavailable days */
.unavailable-day {
  position: relative;
}

.unavailable-day::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 8px,
    rgba(255, 255, 255, 0.05) 8px,
    rgba(255, 255, 255, 0.05) 10px
  );
}

/* Variant for partial days (e.g., 3h Thursday) - lighter stripes */
.reduced-hours-day::before {
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 12px,
    rgba(255, 255, 255, 0.03) 12px,
    rgba(255, 255, 255, 0.03) 14px
  );
}
```

### Subtask 2: Pass Schedule Data to Cells

The `WeekCellComponent` or equivalent needs access to the user's `workSchedule`. Check how cells are rendered and ensure they receive:

```typescript
interface CellProps {
  // ... existing props
  workSchedule?: WorkSchedule | null;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
}
```

### Subtask 3: Add Unavailability Logic to Cell

In the cell component, determine if the day should show stripes:

```typescript
// Map day index to schedule key
const dayKeys: Record<number, keyof WorkSchedule> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
};

// Get hours for this day
const dayKey = dayKeys[dayOfWeek];
const hoursAvailable = workSchedule?.[dayKey] ?? 8;

// Determine CSS class
const isUnavailable = hoursAvailable === 0;
const isReducedHours = hoursAvailable > 0 && hoursAvailable < 6; // Less than 6h = reduced

const unavailabilityClass = isUnavailable 
  ? 'unavailable-day' 
  : isReducedHours 
    ? 'reduced-hours-day' 
    : '';
```

### Subtask 4: Handle PTO Days

PTO days should also get the diagonal stripes. Check if the cell has PTO entries:

```typescript
const hasPto = cell.ptoEntries && cell.ptoEntries.length > 0;
const isFullDayPto = hasPto && cell.ptoHours && cell.ptoHours >= 8;

// Full day PTO gets full stripes
if (isFullDayPto) {
  unavailabilityClass = 'unavailable-day';
}
```

### Subtask 5: Apply Class to Cell Container

Find where the cell Box/Paper is rendered and add the class:

```tsx
<Box
  className={unavailabilityClass}
  sx={{
    // ... existing styles
  }}
>
  {/* cell content */}
</Box>
```

---

## Visual Reference

**Hunter's row should look like:**
| Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|-----|-----|-----|-----|-----|-----|-----|
| Normal | Normal | Normal | Light stripes (3h) | Full stripes (0h) | Full stripes | Full stripes |

**Someone on PTO Tuesday:**
| Mon | Tue | Wed | Thu | Fri |
|-----|-----|-----|-----|-----|
| Normal | Full stripes + 🏖️ | Normal | Normal | Normal |

---

## Verification

1. **Hunter's row:** Friday should have diagonal stripes, Thursday should have lighter stripes
2. **Standard user:** No stripes on weekdays (Mon-Fri), stripes on Sat/Sun
3. **PTO user:** Day with PTO should have stripes + beach icon
4. **Overallocation still works:** Warning icons should still appear on overallocated days

---

## Success Criteria

- [ ] Friday shows diagonal stripes for Hunter
- [ ] Thursday shows lighter stripes for Hunter (3h day)
- [ ] Sat/Sun show stripes for all users
- [ ] PTO days show stripes
- [ ] Stripes don't interfere with clicking allocations
- [ ] Visual is subtle (not jarring)

---

## Files to Touch

| File | Action |
|------|--------|
| `src/components/ResourceCalendar.tsx` | ADD diagonal stripe logic to cell rendering |
| `src/styles/` or inline | ADD CSS for `.unavailable-day` and `.reduced-hours-day` |
| `src/hooks/useResourceCalendar.ts` | VERIFY workSchedule is passed through (may be fine) |
| `docs/SESSION_STATUS.md` | UPDATE after completion |

---

## Notes

- Keep stripes subtle (low opacity) so they don't overpower the UI
- Pointer-events: none ensures clicks pass through to allocations
- z-index: 1 keeps stripes behind allocation tiles but visible on the cell background
- Consider using MUI's `sx` prop with `'&::before'` instead of external CSS if preferred

---

## Update After Completion

Update `docs/SESSION_STATUS.md`:
- Mark "Unavailability indicators" as complete
- Note any edge cases found
