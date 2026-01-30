# Cowork Task: Day-Level Allocations Refactor

**Created:** 2026-01-29
**Estimated time:** 45-60 min
**Why Cowork:** Multi-file refactor (migration, hook, component, dialog), complex logic changes

---

## Context

### Current State
- Allocations have `start_date` and `end_date` fields
- A single allocation record can span multiple days (e.g., Mon-Fri)
- `planned_hours` represents TOTAL hours for the entire date range
- Display divides hours by working days, showing ~1.6h/day for an 8h Mon-Fri allocation
- This causes confusion: users expect "8h" to mean "8h per day"

### Desired State
- `planned_hours` represents hours PER DAY
- Each day gets its own allocation record (or we store per-day data)
- Visual grouping: consecutive days with same project+hours show as a single bar
- When hours differ on a day, that day shows as a separate tile
- Edit modal offers "Edit All Days" vs "Edit This Day" options

### User Flow
1. Click + on Monday → Modal: Date, Hours, ☐ "Allocate for whole week"
2. Check box → Creates 5 records (Mon-Fri, 8h each)
3. Calendar shows one long bar "Project X - 8h"
4. Click bar → Edit modal with "Edit All" and individual day tiles
5. Edit Wed to 4h → Calendar shows: Mon-Tue bar | Wed tile | Thu-Fri bar

---

## Subtasks

### Subtask 1: Database Migration

**File:** `src/db/migrations/006_single_day_allocations.sql`

Convert existing multi-day allocations to single-day records:

```sql
-- Migration: Convert multi-day allocations to individual day records
-- Each day gets planned_hours / working_days_count

-- Step 1: Create temp table with expanded days
CREATE TEMP TABLE expanded_allocations AS
WITH RECURSIVE date_series AS (
  SELECT 
    id as original_id,
    user_id,
    project_id,
    phase_id,
    start_date as current_date,
    end_date,
    planned_hours,
    is_billable,
    notes,
    created_by,
    created_at,
    -- Count working days in original range
    (SELECT COUNT(*) 
     FROM generate_series(start_date, end_date, '1 day'::interval) d 
     WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)) as total_working_days
  FROM allocations
  WHERE start_date != end_date  -- Only multi-day allocations
  
  UNION ALL
  
  SELECT 
    original_id,
    user_id,
    project_id,
    phase_id,
    (current_date + INTERVAL '1 day')::date,
    end_date,
    planned_hours,
    is_billable,
    notes,
    created_by,
    created_at,
    total_working_days
  FROM date_series
  WHERE current_date < end_date
)
SELECT 
  user_id,
  project_id,
  phase_id,
  current_date as allocation_date,
  CASE 
    WHEN total_working_days > 0 THEN planned_hours / total_working_days
    ELSE planned_hours
  END as daily_hours,
  is_billable,
  notes,
  created_by,
  created_at,
  original_id
FROM date_series
WHERE EXTRACT(DOW FROM current_date) NOT IN (0, 6);  -- Skip weekends

-- Step 2: Delete original multi-day allocations
DELETE FROM allocations WHERE start_date != end_date;

-- Step 3: Insert expanded single-day allocations
INSERT INTO allocations (user_id, project_id, phase_id, start_date, end_date, week_start, planned_hours, is_billable, notes, created_by, created_at)
SELECT 
  user_id,
  project_id,
  phase_id,
  allocation_date,
  allocation_date,  -- start_date = end_date for single-day
  date_trunc('week', allocation_date)::date,  -- Monday of that week
  daily_hours,
  is_billable,
  notes,
  created_by,
  created_at
FROM expanded_allocations;

-- Step 4: Clean up
DROP TABLE expanded_allocations;

-- Step 5: Add constraint to ensure single-day allocations going forward
-- (Optional - can be added later if we want to enforce this)
-- ALTER TABLE allocations ADD CONSTRAINT single_day_allocation CHECK (start_date = end_date);
```

**Verification:**
```sql
-- Should return 0 after migration
SELECT COUNT(*) FROM allocations WHERE start_date != end_date;

-- Check total hours are preserved (approximately)
SELECT SUM(planned_hours) FROM allocations;
```

---

### Subtask 2: Update Hook - Grouping Logic

**File:** `src/hooks/useResourceCalendar.ts`

Add a new function to group consecutive single-day allocations:

```typescript
interface AllocationGroup {
  id: string;  // ID of first allocation in group
  allocationIds: string[];  // All allocation IDs in this group
  userId: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;  // Hours per day (same across group)
  totalHours: number;   // Sum of all days
  dayCount: number;
  isBillable: boolean;
  notes: string | null;
  // For display: is this a multi-day bar or single tile?
  isBar: boolean;
}

/**
 * Group consecutive single-day allocations with same user+project+hours
 */
function groupAllocations(allocations: CalendarAllocation[]): AllocationGroup[] {
  // Sort by user, project, date
  const sorted = [...allocations].sort((a, b) => {
    if (a.userId !== b.userId) return a.userId.localeCompare(b.userId);
    if (a.projectId !== b.projectId) return a.projectId.localeCompare(b.projectId);
    return a.startDate.localeCompare(b.startDate);
  });

  const groups: AllocationGroup[] = [];
  let currentGroup: AllocationGroup | null = null;

  for (const alloc of sorted) {
    const canExtendGroup = currentGroup && 
      currentGroup.userId === alloc.userId &&
      currentGroup.projectId === alloc.projectId &&
      currentGroup.hoursPerDay === alloc.plannedHours &&
      isNextWorkingDay(currentGroup.endDate, alloc.startDate);

    if (canExtendGroup && currentGroup) {
      // Extend current group
      currentGroup.allocationIds.push(alloc.id);
      currentGroup.endDate = alloc.endDate;
      currentGroup.totalHours += alloc.plannedHours;
      currentGroup.dayCount++;
    } else {
      // Start new group
      if (currentGroup) {
        currentGroup.isBar = currentGroup.dayCount > 1;
        groups.push(currentGroup);
      }
      currentGroup = {
        id: alloc.id,
        allocationIds: [alloc.id],
        userId: alloc.userId,
        projectId: alloc.projectId,
        projectName: alloc.projectName,
        projectColor: alloc.projectColor,
        startDate: alloc.startDate,
        endDate: alloc.endDate,
        hoursPerDay: alloc.plannedHours,
        totalHours: alloc.plannedHours,
        dayCount: 1,
        isBillable: alloc.isBillable,
        notes: alloc.notes,
        isBar: false,
      };
    }
  }

  // Don't forget the last group
  if (currentGroup) {
    currentGroup.isBar = currentGroup.dayCount > 1;
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Check if date2 is the next working day after date1
 */
function isNextWorkingDay(date1: string, date2: string): boolean {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  // Move to next day
  d1.setDate(d1.getDate() + 1);
  
  // Skip weekend
  while (d1.getDay() === 0 || d1.getDay() === 6) {
    d1.setDate(d1.getDate() + 1);
  }
  
  return formatDate(d1) === date2;
}
```

Update `createAllocation` to handle "whole week" option:

```typescript
const createAllocation = async (data: {
  userId: string;
  projectId: string;
  date: string;          // Single date
  hoursPerDay: number;   // Hours for this day
  expandToWeek?: boolean; // If true, create Mon-Fri records
  // ... other fields
}) => {
  if (data.expandToWeek) {
    // Create 5 records (Mon-Fri)
    const monday = getWeekMonday(data.date);
    const records = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(parseDate(monday));
      d.setDate(d.getDate() + i);
      records.push({
        user_id: data.userId,
        project_id: data.projectId,
        start_date: formatDate(d),
        end_date: formatDate(d),
        week_start: monday,
        planned_hours: data.hoursPerDay,
        // ...
      });
    }
    await supabase.from('allocations').insert(records);
  } else {
    // Create single record
    await supabase.from('allocations').insert({
      start_date: data.date,
      end_date: data.date,
      planned_hours: data.hoursPerDay,
      // ...
    });
  }
};
```

Add `updateAllocationGroup` for "Edit All" functionality:

```typescript
const updateAllocationGroup = async (
  allocationIds: string[], 
  updates: { hoursPerDay?: number; notes?: string }
) => {
  const { error } = await supabase
    .from('allocations')
    .update({
      planned_hours: updates.hoursPerDay,
      notes: updates.notes,
      updated_at: new Date().toISOString(),
    })
    .in('id', allocationIds);
    
  if (error) throw error;
  await fetchData();
};
```

---

### Subtask 3: Update Dialog - Edit Mode

**File:** `src/components/ResourceCalendar.tsx`

Update `AllocationDialog` to support:
- New allocation: single day + "expand to week" checkbox
- Edit single tile: just edit that day's hours
- Edit bar (group): show "Edit All Days" button + individual day tiles

```typescript
interface AllocationDialogProps {
  // ... existing props
  allocationGroup?: AllocationGroup;  // When editing a grouped bar
  onUpdateGroup?: (ids: string[], updates: { hoursPerDay?: number }) => void;
}

function AllocationDialog({ allocationGroup, onUpdateGroup, ...props }) {
  const [editMode, setEditMode] = useState<'all' | 'single'>('all');
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  // When editing a group (bar), show the group view
  if (allocationGroup && allocationGroup.isBar) {
    return (
      <Dialog>
        <DialogTitle>Edit Allocation</DialogTitle>
        <DialogContent>
          {/* Group summary */}
          <Alert severity="info">
            <strong>{allocationGroup.projectName}</strong><br/>
            {formatDateRange(allocationGroup.startDate, allocationGroup.endDate)} 
            ({allocationGroup.dayCount} days @ {allocationGroup.hoursPerDay}h/day)
          </Alert>

          {/* Edit All section */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Edit All Days</Typography>
            <TextField
              label="Hours per day"
              type="number"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
            />
            <Button onClick={() => onUpdateGroup(allocationGroup.allocationIds, { hoursPerDay })}>
              Apply to All Days
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Individual day tiles */}
          <Typography variant="subtitle2">Or edit individual days:</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {allocationGroup.allocationIds.map((id, i) => {
              const date = /* calculate date from startDate + i */;
              return (
                <Chip
                  key={id}
                  label={`${formatDay(date)} ${hoursPerDay}h`}
                  onClick={() => {
                    setSelectedDayId(id);
                    setEditMode('single');
                  }}
                />
              );
            })}
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  // Single day edit (existing behavior)
  return (/* existing dialog JSX */);
}
```

---

### Subtask 4: Update Visual Rendering

**File:** `src/components/ResourceCalendar.tsx`

Update `WeekCellComponent` to:
1. Receive grouped allocations instead of raw allocations
2. Render bars that span multiple columns (CSS grid)
3. Render single-day tiles normally

This is the most complex visual change. Key approach:
- In week view, groups that span multiple days render ONCE in the first day's column
- Use CSS `grid-column: span X` to make it visually span
- Single-day allocations (tiles) render normally

```typescript
function WeekCellComponent({ 
  cell, 
  allocationGroups,  // NEW: grouped allocations
  columnIndex,       // NEW: which column this is (0-6 for week view)
  // ...
}) {
  // Filter to groups that START on this column
  const groupsStartingHere = allocationGroups.filter(g => 
    g.startDate === cell.date
  );

  // Filter to single-day allocations on this date
  const singleDayAllocations = allocationGroups.filter(g => 
    !g.isBar && g.startDate === cell.date
  );

  return (
    <Box>
      {/* Multi-day bars (spanning) */}
      {groupsStartingHere.filter(g => g.isBar).map(group => (
        <Box
          key={group.id}
          sx={{
            gridColumn: `span ${group.dayCount}`,
            // ... bar styling
          }}
          onClick={() => onAllocationGroupClick(group)}
        >
          {group.projectName} - {group.hoursPerDay}h/day
        </Box>
      ))}

      {/* Single-day tiles */}
      {singleDayAllocations.map(group => (
        <AllocationBlock
          key={group.id}
          allocation={/* convert group back to allocation */}
          onClick={() => onAllocationClick(group.allocationIds[0])}
        />
      ))}
    </Box>
  );
}
```

---

### Subtask 5: Revert Partial Fix from Earlier Session

**File:** `src/hooks/useResourceCalendar.ts`

The earlier session made a partial fix that assumed "hours = total for range". 
With the new model (hours = per day), we need to update the calculation:

```typescript
// In gridData memo, for week/day view:
hoursPerColumn = columnAllocations.reduce((sum, a) => sum + a.plannedHours, 0);
// This is now CORRECT because plannedHours = hours for that specific day
```

This should already be correct after Subtask 1 migration (all allocations are single-day).

---

## Verification

After completing all subtasks:

1. **Database check:**
   ```sql
   -- All allocations should be single-day
   SELECT COUNT(*) FROM allocations WHERE start_date != end_date;
   -- Should return 0
   ```

2. **UI check - Create:**
   - Click + on Monday
   - Enter 8h, check "Allocate for whole week"
   - Verify 5 records created in DB
   - Verify single bar shows in calendar

3. **UI check - Edit All:**
   - Click the bar
   - Change hours to 6h, click "Apply to All"
   - Verify all 5 records updated
   - Verify bar still shows as single bar

4. **UI check - Edit Single:**
   - Click the bar
   - Click Wednesday tile
   - Change to 4h, save
   - Verify bar splits: Mon-Tue bar | Wed tile | Thu-Fri bar

5. **Overallocation check:**
   - Create 3 overlapping 8h allocations on same day
   - Verify shows 24h total with warning

---

## Success Criteria

- [ ] Migration converts existing multi-day allocations to single-day records
- [ ] New allocations always create single-day records
- [ ] "Allocate for whole week" creates 5 records (Mon-Fri)
- [ ] Calendar visually groups consecutive same-hours allocations into bars
- [ ] Edit dialog shows "Edit All" + individual day options for groups
- [ ] Editing a single day splits the visual bar appropriately
- [ ] Overallocation warnings work correctly (sum of hours per day)
- [ ] Delete works for both single allocations and groups

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md`:
   - Move "Day-level adjustment" from TODO to Completed
   - Note the new data model (single-day records, visual grouping)
   
2. Update `docs/live-sync-doc.md` if any UX decisions need to be locked

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/db/migrations/006_single_day_allocations.sql` | NEW - migration script |
| `src/hooks/useResourceCalendar.ts` | Add grouping logic, update CRUD |
| `src/components/ResourceCalendar.tsx` | Update dialog, cell rendering |
| `docs/SESSION_STATUS.md` | Update after completion |

---

*Created by Claude for Cowork execution*
