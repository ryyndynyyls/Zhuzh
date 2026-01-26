# Cowork Task: Fix Resources Week View + Reports API

**Created:** 2026-01-21
**Estimated time:** 30 min
**Why Cowork:** Two independent bug fixes that can run in parallel

---

## Context

Two bugs identified in testing:

1. **Resources Week View** — Shows 5 weeks instead of 7 days when "Week" toggle is selected
2. **Reports Phase Breakdown** — "Network error while loading phase data" because endpoint mismatch

**Screenshots:**
- Resources: `/mnt/user-data/uploads/Screenshot_2026-01-21_at_3_41_13_PM.png` (Week view showing weeks, not days)
- Reports: `/mnt/user-data/uploads/Screenshot_2026-01-21_at_3_41_36_PM.png` (Network error)

---

## Subtask 1: Fix Resources Week View (Parallel)

**Files:**
- `src/pages/ResourceCalendarPage.tsx`
- `src/components/ResourceCalendar.tsx`

**Problem:**
The Day/Week/Month toggle exists (added by Cowork) but Week view still shows multiple weeks instead of a single week with 7 day columns.

**Expected behavior:**
- **Day view:** Single day column with hourly breakdown (or just that day's allocations)
- **Week view:** 7 columns (Mon-Sun) showing allocations per day
- **Month view:** 4-5 columns (weeks) showing allocations per week (current behavior)

**Fix approach:**
1. Check `ResourceCalendar.tsx` for how `viewMode` prop is used
2. When `viewMode === 'week'`, generate 7 date columns (one per day of the selected week)
3. When `viewMode === 'day'`, show single day
4. When `viewMode === 'month'`, show weeks (current behavior)

**Data consideration:**
- Allocations are stored at week level (`week_start`)
- For day view, may need to divide weekly hours by 5 (business days)
- Or show the full week's allocation in each day cell

---

## Subtask 2: Fix Reports Phase Breakdown API (Parallel)

**Files:**
- `src/api/reports/index.ts`
- `src/components/reports/PhaseBreakdown.tsx`

**Problem:**
- Frontend calls: `GET /api/reports/phases?${params}` (expecting all phases across all projects)
- Backend has: `GET /api/reports/phases/:projectId` (single project only)

**Fix approach:**

Add new endpoint in `src/api/reports/index.ts`:

```typescript
/**
 * GET /api/reports/phases
 * Returns phase breakdown across ALL active projects
 * Query params: startDate, endDate, clientId (optional filters)
 */
router.get('/phases', async (req: Request, res: Response) => {
  const { startDate, endDate, clientId } = req.query;
  
  try {
    // Get all active projects with their phases
    let query = supabase
      .from('projects')
      .select(`
        id, name, color, budget_hours, hourly_rate,
        client:clients(id, name),
        phases:project_phases(
          id, name, budget_hours, status,
          allocations:allocations(planned_hours),
          entries:time_entries(actual_hours)
        )
      `)
      .eq('is_active', true);
    
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Calculate totals per phase
    const phasesWithMetrics = (data || []).flatMap(project => 
      (project.phases || []).map(phase => ({
        projectId: project.id,
        projectName: project.name,
        projectColor: project.color,
        clientName: project.client?.name,
        phaseId: phase.id,
        phaseName: phase.name,
        budgetHours: phase.budget_hours || 0,
        plannedHours: phase.allocations?.reduce((sum, a) => sum + (a.planned_hours || 0), 0) || 0,
        actualHours: phase.entries?.reduce((sum, e) => sum + (e.actual_hours || 0), 0) || 0,
        status: phase.status,
      }))
    );
    
    res.json({ phases: phasesWithMetrics });
  } catch (err: any) {
    console.error('Failed to fetch all phases:', err);
    res.status(500).json({ error: err.message });
  }
});
```

**Important:** Place this route BEFORE the `/:projectId` route (Express matches first defined).

---

## Verification

### Week View:
1. Go to `/resources`
2. Click "Week" toggle
3. Should show 7 columns (Mon-Sun) for current week
4. Click "Month" — should show 4-5 week columns
5. Click "Day" — should show single day

### Reports:
1. Go to `/reports`
2. "Phase Breakdown" tab should load without error
3. Should show phases grouped by project
4. Team Hours and Role Summary tabs should also work

---

## Success Criteria

- [ ] Week view shows 7 day columns
- [ ] Month view shows week columns (unchanged)
- [ ] Day view shows single day
- [ ] Reports Phase Breakdown loads data
- [ ] No console errors on Reports page

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md`
2. Note the new `/api/reports/phases` endpoint in docs
