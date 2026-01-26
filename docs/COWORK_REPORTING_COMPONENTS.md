# Cowork Task: Build Reporting API & Components

**Created:** 2026-01-15
**Estimated Time:** 30-45 minutes
**Type:** Code Generation (API + React components)

---

## Context

We just created SQL views for Michelle's reporting needs:
- `phase_budget_metrics` — Phase-level budget data
- `person_project_summary` — Person across all projects
- `role_project_summary` — Role/discipline across all projects

Now we need API endpoints and React components to use them.

---

## Task 1: Create API Endpoints

**Create file:** `src/api/reports/index.ts`

```typescript
// API endpoints for reporting views
// Uses Supabase views created in 004_reporting_views.sql

import { Router } from 'express';
import { supabase } from '../../lib/supabase';

const router = Router();

// GET /api/reports/phases/:projectId
// Returns all phases for a project with full budget metrics
router.get('/phases/:projectId', async (req, res) => {
  const { projectId } = req.params;
  
  const { data, error } = await supabase
    .from('phase_budget_metrics')
    .select('*')
    .eq('project_id', projectId)
    .order('phase_name');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/reports/person/:userId
// Returns all projects for a person with hours
router.get('/person/:userId', async (req, res) => {
  const { userId } = req.params;
  
  const { data, error } = await supabase
    .from('person_project_summary')
    .select('*')
    .eq('user_id', userId)
    .order('total_hours', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Also get totals
  const { data: totals } = await supabase
    .rpc('get_person_totals', { p_user_id: userId });
  
  res.json({ projects: data, totals: totals?.[0] || null });
});

// GET /api/reports/role/:discipline
// Returns all projects for a role with aggregated hours
router.get('/role/:discipline', async (req, res) => {
  const { discipline } = req.params;
  
  const { data, error } = await supabase
    .from('role_project_summary')
    .select('*')
    .eq('role_name', discipline)
    .order('total_hours', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Also get totals
  const { data: totals } = await supabase
    .rpc('get_role_totals', { p_discipline: discipline });
  
  res.json({ projects: data, totals: totals?.[0] || null });
});

// GET /api/reports/roles
// Returns list of all roles with their totals
router.get('/roles', async (req, res) => {
  const { data, error } = await supabase
    .from('role_project_summary')
    .select('role_name')
    .order('role_name');
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Get unique roles
  const roles = [...new Set(data?.map(r => r.role_name))];
  res.json(roles);
});

export default router;
```

---

## Task 2: Create Phase Breakdown Component

**Create file:** `src/components/reports/PhaseBreakdown.tsx`

This component shows phases within a project with the same metrics as the project itself.

**Requirements:**
- Table with columns: Phase Name, Budget, Incurred, Scheduled, Forecast, Variance, Burn %
- Color-coded status (green/yellow/red based on burn rate)
- "% of project" shown as a small badge
- Expandable rows to show assignees per phase (future enhancement)
- Uses MUI DataGrid
- Fetches from `/api/reports/phases/:projectId`

**Design reference (from Michelle's feedback):**
```
Phase Name          Budget    Incurred   Scheduled  Forecast   Status
─────────────────────────────────────────────────────────────────────
Agent Challenge     $85,000   $62,910    $22,680    $85,590    ⚠️ 101%
AI Design Workshop  $100,000  $78,815    $12,561    $91,376    ✓ 91%
AI Science Explorer $60,000   $45,057    -$1,628    $43,429    ✓ 72%
```

---

## Task 3: Create Person Summary Component

**Create file:** `src/components/reports/PersonSummary.tsx`

Shows a single person's hours across ALL their projects.

**Requirements:**
- Header card with person name, discipline, total hours, total amount
- Table of projects with: Project Name, Client, Incurred, Scheduled, Total
- Sorted by total hours descending
- Uses MUI DataGrid
- Fetches from `/api/reports/person/:userId`

---

## Task 4: Create Role Summary Component

**Create file:** `src/components/reports/RoleSummary.tsx`

Shows aggregated hours for a discipline (Designer, Developer, ProStrat) across all projects.

**Requirements:**
- Header card with role name, team member count, total hours
- Table of projects with: Project Name, Team Members, Incurred, Scheduled, Total
- Sorted by total hours descending
- Uses MUI DataGrid
- Fetches from `/api/reports/role/:discipline`

---

## Task 5: Create Report Selector Component

**Create file:** `src/components/reports/ReportSelector.tsx`

A dropdown/tabs to switch between report views:
- By Project (existing dashboard)
- By Phase (new)
- By Person (new)
- By Role (new)

---

## File Structure

After completion, the file structure should be:

```
src/
├── api/
│   └── reports/
│       └── index.ts          ← NEW
├── components/
│   └── reports/
│       ├── PhaseBreakdown.tsx    ← NEW
│       ├── PersonSummary.tsx     ← NEW
│       ├── RoleSummary.tsx       ← NEW
│       ├── ReportSelector.tsx    ← NEW
│       └── index.ts              ← NEW (exports all)
```

---

## Verification

After creating files, verify:
1. All files compile without TypeScript errors
2. Components use proper MUI imports
3. API endpoints follow existing patterns in `src/api/`
4. No hardcoded values — use environment variables where needed

---

## Notes

- Use existing Supabase client from `src/lib/supabase.ts`
- Follow existing component patterns in `src/components/`
- Default bill rate is $135/hr if not specified
- Use MUI's DataGrid for tables, not custom HTML tables
