# Cowork Tasks: Michelle's Reporting Views

**Created:** 2026-01-15
**Context:** Michelle needs phase-level budget metrics identical to project-level, plus cross-project views by person and role.

---

## Task 1: Phase Budget Metrics View

**Goal:** Phases should show the SAME metrics as projects — budget, incurred, scheduled, over-budget forecast.

**Michelle's Pain:** 
> "I like the info you get for the total project and wish I could get that by phase too"

**Current State:** `project_phase_budget_summary` view exists but is basic.

**Create:** `phase_budget_metrics` view

```sql
-- Each phase should show:
-- 1. phase_budget (from project_phases.budget_hours * bill_rate OR direct budget)
-- 2. incurred (actual hours logged * bill_rate)
-- 3. scheduled (future allocated hours * bill_rate)  
-- 4. forecast_variance (incurred + scheduled - budget)
-- 5. percent_of_project (phase_budget / project_budget)
-- 6. burn_rate (incurred / budget as percentage)

CREATE OR REPLACE VIEW phase_budget_metrics AS
SELECT
  ph.id AS phase_id,
  ph.name AS phase_name,
  ph.project_id,
  p.name AS project_name,
  p.client_id,
  
  -- Budget (phase-level if set, otherwise proportional)
  COALESCE(ph.budget_hours, 0) AS budget_hours,
  COALESCE(ph.budget_hours * COALESCE(p.hourly_rate, 135), 0) AS budget_amount,
  
  -- Incurred (actual hours from time_entries for this phase)
  COALESCE(te.total_actual_hours, 0) AS incurred_hours,
  COALESCE(te.total_actual_hours * COALESCE(p.hourly_rate, 135), 0) AS incurred_amount,
  
  -- Scheduled (future allocations for this phase)
  COALESCE(alloc.future_hours, 0) AS scheduled_hours,
  COALESCE(alloc.future_hours * COALESCE(p.hourly_rate, 135), 0) AS scheduled_amount,
  
  -- Forecast
  COALESCE(te.total_actual_hours, 0) + COALESCE(alloc.future_hours, 0) AS forecast_hours,
  (COALESCE(te.total_actual_hours, 0) + COALESCE(alloc.future_hours, 0)) * COALESCE(p.hourly_rate, 135) AS forecast_amount,
  
  -- Variance (negative = over budget)
  COALESCE(ph.budget_hours, 0) - (COALESCE(te.total_actual_hours, 0) + COALESCE(alloc.future_hours, 0)) AS variance_hours,
  
  -- Burn rate
  CASE 
    WHEN COALESCE(ph.budget_hours, 0) > 0 
    THEN ROUND((COALESCE(te.total_actual_hours, 0) / ph.budget_hours * 100)::numeric, 1)
    ELSE 0 
  END AS burn_rate_percent,
  
  -- Phase as percent of project
  CASE 
    WHEN COALESCE(p.budget_hours, 0) > 0 
    THEN ROUND((COALESCE(ph.budget_hours, 0) / p.budget_hours * 100)::numeric, 1)
    ELSE 0 
  END AS percent_of_project

FROM project_phases ph
JOIN projects p ON p.id = ph.project_id
LEFT JOIN (
  -- Aggregate actual hours by phase
  SELECT 
    te.phase_id,
    SUM(te.actual_hours) AS total_actual_hours
  FROM time_entries te
  WHERE te.phase_id IS NOT NULL
  GROUP BY te.phase_id
) te ON te.phase_id = ph.id
LEFT JOIN (
  -- Aggregate future allocations by phase
  SELECT 
    a.phase_id,
    SUM(a.planned_hours) AS future_hours
  FROM allocations a
  WHERE a.phase_id IS NOT NULL 
    AND a.week_start >= date_trunc('week', CURRENT_DATE)
  GROUP BY a.phase_id
) alloc ON alloc.phase_id = ph.id;
```

**Acceptance Criteria:**
- [ ] View returns all phases with budget metrics
- [ ] Matches project-level metric calculations
- [ ] Shows percent_of_project for context
- [ ] Handles phases with no budget gracefully

---

## Task 2: Person Across Projects View

**Goal:** See a single person's hours/fees across ALL their projects.

**Michelle's Pain:**
> "Look at Andrew's hours on both Cloud Next and Mars"

**Create:** `person_project_summary` view

```sql
-- For a given user, show:
-- 1. Each project they've worked on
-- 2. Hours incurred on each
-- 3. Hours scheduled on each
-- 4. Total across all projects

CREATE OR REPLACE VIEW person_project_summary AS
SELECT
  u.id AS user_id,
  u.name AS user_name,
  u.email,
  p.id AS project_id,
  p.name AS project_name,
  c.name AS client_name,
  
  -- Incurred (actual hours logged)
  COALESCE(te.total_actual_hours, 0) AS incurred_hours,
  COALESCE(te.total_actual_hours * COALESCE(p.hourly_rate, 135), 0) AS incurred_amount,
  
  -- Scheduled (future allocations)
  COALESCE(alloc.future_hours, 0) AS scheduled_hours,
  COALESCE(alloc.future_hours * COALESCE(p.hourly_rate, 135), 0) AS scheduled_amount,
  
  -- Total
  COALESCE(te.total_actual_hours, 0) + COALESCE(alloc.future_hours, 0) AS total_hours,
  (COALESCE(te.total_actual_hours, 0) + COALESCE(alloc.future_hours, 0)) * COALESCE(p.hourly_rate, 135) AS total_amount

FROM users u
CROSS JOIN projects p
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN (
  -- User's actual hours per project
  SELECT 
    tc.user_id,
    te.project_id,
    SUM(te.actual_hours) AS total_actual_hours
  FROM time_entries te
  JOIN time_confirmations tc ON tc.id = te.confirmation_id
  GROUP BY tc.user_id, te.project_id
) te ON te.user_id = u.id AND te.project_id = p.id
LEFT JOIN (
  -- User's future allocations per project
  SELECT 
    a.user_id,
    a.project_id,
    SUM(a.planned_hours) AS future_hours
  FROM allocations a
  WHERE a.week_start >= date_trunc('week', CURRENT_DATE)
  GROUP BY a.user_id, a.project_id
) alloc ON alloc.user_id = u.id AND alloc.project_id = p.id
WHERE 
  -- Only include projects user has touched
  (COALESCE(te.total_actual_hours, 0) > 0 OR COALESCE(alloc.future_hours, 0) > 0);
```

**Also create function for totals:**

```sql
CREATE OR REPLACE FUNCTION get_person_totals(p_user_id UUID)
RETURNS TABLE (
  total_incurred_hours NUMERIC,
  total_incurred_amount NUMERIC,
  total_scheduled_hours NUMERIC,
  total_scheduled_amount NUMERIC,
  project_count INT
) AS $$
  SELECT 
    SUM(incurred_hours),
    SUM(incurred_amount),
    SUM(scheduled_hours),
    SUM(scheduled_amount),
    COUNT(DISTINCT project_id)::INT
  FROM person_project_summary
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL;
```

**Acceptance Criteria:**
- [ ] View shows all projects a user has worked on
- [ ] Includes both incurred and scheduled hours
- [ ] Can filter by date range (add parameters)
- [ ] Function returns totals for dashboard cards

---

## Task 3: Role Across Projects View

**Goal:** See aggregated hours by role (Designer, Developer, ProStrat) across all projects.

**Michelle's Pain:**
> "Look at design team hours on both Cloud Next and Mars"

**Prerequisite:** Users need a `role` or `discipline` field. Check if exists, add if not.

**Create:** `role_project_summary` view

```sql
-- For a given role/discipline, show:
-- 1. Each project the role has worked on
-- 2. Aggregated hours from all users in that role
-- 3. Breakdown by individual if needed

CREATE OR REPLACE VIEW role_project_summary AS
SELECT
  u.discipline AS role_name,
  p.id AS project_id,
  p.name AS project_name,
  c.name AS client_name,
  
  -- Count of people in this role on this project
  COUNT(DISTINCT u.id) AS team_member_count,
  
  -- Incurred (actual hours logged by role)
  COALESCE(SUM(te.actual_hours), 0) AS incurred_hours,
  COALESCE(SUM(te.actual_hours) * COALESCE(p.hourly_rate, 135), 0) AS incurred_amount,
  
  -- Scheduled (future allocations by role)
  COALESCE(SUM(alloc.planned_hours), 0) AS scheduled_hours,
  COALESCE(SUM(alloc.planned_hours) * COALESCE(p.hourly_rate, 135), 0) AS scheduled_amount

FROM users u
JOIN projects p ON TRUE
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN time_confirmations tc ON tc.user_id = u.id
LEFT JOIN time_entries te ON te.confirmation_id = tc.id AND te.project_id = p.id
LEFT JOIN allocations alloc ON alloc.user_id = u.id 
  AND alloc.project_id = p.id 
  AND alloc.week_start >= date_trunc('week', CURRENT_DATE)
WHERE u.discipline IS NOT NULL
GROUP BY u.discipline, p.id, p.name, c.name, p.hourly_rate
HAVING COALESCE(SUM(te.actual_hours), 0) > 0 OR COALESCE(SUM(alloc.planned_hours), 0) > 0;
```

**Acceptance Criteria:**
- [ ] View aggregates by role/discipline
- [ ] Shows team_member_count for context
- [ ] Can drill down to see individual contributors
- [ ] Handles users without discipline gracefully

---

## Task 4: Add Missing Schema Fields

**Check and add if missing:**

```sql
-- Users might need discipline field
ALTER TABLE users ADD COLUMN IF NOT EXISTS discipline TEXT;

-- Phases might need direct budget fields
ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS budget_hours NUMERIC;
ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS budget_amount NUMERIC;

-- Time entries need phase_id for phase-level tracking
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES project_phases(id);

-- Allocations need phase_id too
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES project_phases(id);
```

---

## Files to Create

1. `src/db/migrations/004_reporting_views.sql` — All views and functions
2. `src/api/reports/person.ts` — API endpoint for person view
3. `src/api/reports/role.ts` — API endpoint for role view
4. `src/api/reports/phase.ts` — API endpoint for phase metrics

---

## Testing

After creating views, test with:

```sql
-- Phase metrics for Google Cloud Next
SELECT * FROM phase_budget_metrics 
WHERE project_name ILIKE '%cloud next%';

-- Andrew's projects
SELECT * FROM person_project_summary 
WHERE user_name ILIKE '%andrew%';

-- Design team across projects
SELECT * FROM role_project_summary 
WHERE role_name = 'Designer';
```

---

## Notes for Cowork

- Check existing schema before adding columns
- Use COALESCE to handle NULLs gracefully
- Default bill rate is $135/hr for UA5
- Views should be performant with indexes
- Add RLS policies if views contain sensitive data
