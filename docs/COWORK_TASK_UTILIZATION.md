# Cowork Task: Fix 0% Team Utilization Bug

**Priority:** Medium  
**Estimated Time:** 30-60 min debugging  
**Owner:** Cowork Agent  

---

## The Problem

The Company Dashboard shows **0% Team Utilization** even though:
- Resource Calendar displays **167 allocations** with real data
- The allocations table has **244 records** for Jan 2026+
- RLS has been disabled on `allocations` and `projects` tables

Screenshot location: The utilization widget is in the top row of `/dashboard`, showing a circular progress at 0%.

---

## Technical Context

### Where the data flows

```
DashboardPage.tsx
  └── useThisWeekUtilization hook (src/hooks/useThisWeekUtilization.ts)
      └── Queries supabase 'allocations' table
      └── Calculates: totalAllocatedHours / (teamSize × 40)
```

### The hook logic (simplified)

```typescript
// Gets Monday of current week
const weekStart = getWeekStart(); // e.g., "2026-01-13"
const weekEnd = getWeekEnd(weekStart); // e.g., "2026-01-19"

// Query allocations
const { data: allocations } = await supabase
  .from('allocations')
  .select('planned_hours, week_start')
  .gte('week_start', weekStart)
  .lte('week_start', weekEnd)
  .in('user_id', teamMemberIds);
```

### What works (for comparison)

`useResourceCalendar.ts` successfully fetches allocations using:
```typescript
const { data: allocationsData } = await supabase
  .from('allocations')
  .select(`
    id,
    user_id,
    project_id,
    week_start,
    planned_hours,
    projects (id, name, color)
  `)
  .gte('week_start', startDate)
  .lte('week_start', endDate);
```

---

## Likely Culprits (Investigate These)

### 1. Date Format Mismatch
- `getWeekStart()` returns `YYYY-MM-DD` format
- Check if allocations table `week_start` column uses same format
- Try logging: `console.log('weekStart:', weekStart, 'weekEnd:', weekEnd)`

### 2. Team Member ID Filtering
- The hook filters by `user_id IN teamMemberIds`
- Maybe the user IDs don't match what's in allocations
- Try logging: `console.log('teamMemberIds:', teamMemberIds)`
- Compare against: `SELECT DISTINCT user_id FROM allocations`

### 3. Empty Result Set
- The query might return empty array instead of null
- Check: `console.log('allocations:', allocations)`

### 4. Timezone Issues
- `new Date()` uses local time, allocations might be UTC
- The `getWeekStart()` function might calculate wrong week

---

## Debug Steps

1. **Add console logging** to `useThisWeekUtilization.ts`:
   ```typescript
   console.log('[DEBUG] weekStart:', weekStart, 'weekEnd:', weekEnd);
   console.log('[DEBUG] teamMemberIds:', teamMemberIds);
   console.log('[DEBUG] allocations query result:', allocations);
   ```

2. **Check allocations data directly** in Supabase:
   ```sql
   -- What weeks have allocations?
   SELECT DISTINCT week_start FROM allocations ORDER BY week_start DESC LIMIT 10;
   
   -- What user_ids have allocations this week?
   SELECT DISTINCT user_id FROM allocations 
   WHERE week_start >= '2026-01-13' AND week_start <= '2026-01-19';
   
   -- Total hours this week
   SELECT SUM(planned_hours) FROM allocations 
   WHERE week_start >= '2026-01-13' AND week_start <= '2026-01-19';
   ```

3. **Compare with Resource Calendar query** which works:
   - Look at `src/hooks/useResourceCalendar.ts`
   - See what date range it uses and how it queries

---

## Database Info

- **Supabase Project:** `ovyppexeqwwaghwddtip`
- **Org ID:** `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- **Current week start:** Should be `2026-01-13` (Monday, Jan 13)
- **Known data:** 244 allocations exist for Jan 2026+

---

## Files to Modify

| File | What to do |
|------|------------|
| `src/hooks/useThisWeekUtilization.ts` | Add debug logging, fix query if needed |
| `src/pages/DashboardPage.tsx` | Verify hook is called correctly |

---

## Success Criteria

- [ ] Dashboard shows non-zero utilization percentage
- [ ] Tooltip shows actual allocated hours (e.g., "1,200 hrs allocated / 24 people × 40 hrs")
- [ ] Number makes sense given Resource Calendar data
- [ ] Remove debug logging when fixed

---

## How to Test

```bash
# Start the dev server
cd ~/Claude-Projects-MCP/ResourceFlow && npm run dev

# Open browser to http://localhost:3000/dashboard
# Check console for debug logs
# Compare utilization number with Resource Calendar data
```

---

## Notes

- RLS is disabled on `allocations` table (security debt, but shouldn't affect this)
- The Resource Calendar uses similar queries and works fine
- This was a "tricky" bug in previous sessions — take time to debug properly
