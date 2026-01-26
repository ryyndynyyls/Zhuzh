-- Migration: Michelle's Reporting Views
-- Project: Zhuzh
-- Date: 2026-01-15
-- Description: Phase-level metrics, person-across-projects, role-across-projects views

-- ============================================
-- Task 4: Schema Updates (run first)
-- ============================================

-- Users need discipline field for role-based views
ALTER TABLE users ADD COLUMN IF NOT EXISTS discipline TEXT;

-- Phases need direct budget fields
ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS budget_hours NUMERIC;
ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS budget_amount NUMERIC;

-- Time entries need phase_id for phase-level tracking
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES project_phases(id);

-- Allocations need phase_id too
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES project_phases(id);

-- Index for phase queries
CREATE INDEX IF NOT EXISTS idx_time_entries_phase ON time_entries(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_allocations_phase ON allocations(phase_id) WHERE phase_id IS NOT NULL;

-- ============================================
-- Task 1: Phase Budget Metrics View
-- ============================================

-- Each phase shows same metrics as project:
-- Budget, Incurred, Scheduled, Forecast, Burn Rate
CREATE OR REPLACE VIEW phase_budget_metrics AS
SELECT
  ph.id AS phase_id,
  ph.name AS phase_name,
  ph.project_id,
  p.name AS project_name,
  p.client_id,
  c.name AS client_name,
  
  -- Budget (phase-level)
  COALESCE(ph.budget_hours, 0) AS budget_hours,
  COALESCE(ph.budget_amount, ph.budget_hours * COALESCE(p.hourly_rate, 135), 0) AS budget_amount,
  
  -- Incurred (actual hours from time_entries)
  COALESCE(te_agg.total_actual_hours, 0) AS incurred_hours,
  COALESCE(te_agg.total_actual_hours, 0) * COALESCE(p.hourly_rate, 135) AS incurred_amount,
  
  -- Scheduled (future allocations)
  COALESCE(alloc_agg.future_hours, 0) AS scheduled_hours,
  COALESCE(alloc_agg.future_hours, 0) * COALESCE(p.hourly_rate, 135) AS scheduled_amount,
  
  -- Forecast (incurred + scheduled)
  COALESCE(te_agg.total_actual_hours, 0) + COALESCE(alloc_agg.future_hours, 0) AS forecast_hours,
  (COALESCE(te_agg.total_actual_hours, 0) + COALESCE(alloc_agg.future_hours, 0)) * COALESCE(p.hourly_rate, 135) AS forecast_amount,
  
  -- Variance (positive = under budget, negative = over)
  COALESCE(ph.budget_hours, 0) - (COALESCE(te_agg.total_actual_hours, 0) + COALESCE(alloc_agg.future_hours, 0)) AS variance_hours,
  
  -- Burn rate percentage
  CASE 
    WHEN COALESCE(ph.budget_hours, 0) > 0 
    THEN ROUND((COALESCE(te_agg.total_actual_hours, 0) / ph.budget_hours * 100)::numeric, 1)
    ELSE 0 
  END AS burn_rate_percent,
  
  -- Phase as percent of project budget
  CASE 
    WHEN COALESCE(p.budget_hours, 0) > 0 
    THEN ROUND((COALESCE(ph.budget_hours, 0) / p.budget_hours * 100)::numeric, 1)
    ELSE 0 
  END AS percent_of_project,
  
  -- Status indicator
  CASE
    WHEN COALESCE(ph.budget_hours, 0) = 0 THEN 'no_budget'
    WHEN (COALESCE(te_agg.total_actual_hours, 0) + COALESCE(alloc_agg.future_hours, 0)) > COALESCE(ph.budget_hours, 0) THEN 'over_budget'
    WHEN COALESCE(te_agg.total_actual_hours, 0) / NULLIF(ph.budget_hours, 0) > 0.9 THEN 'at_risk'
    ELSE 'on_track'
  END AS status

FROM project_phases ph
JOIN projects p ON p.id = ph.project_id
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN (
  SELECT 
    te.phase_id,
    SUM(te.actual_hours) AS total_actual_hours
  FROM time_entries te
  WHERE te.phase_id IS NOT NULL
  GROUP BY te.phase_id
) te_agg ON te_agg.phase_id = ph.id
LEFT JOIN (
  SELECT 
    a.phase_id,
    SUM(a.planned_hours) AS future_hours
  FROM allocations a
  WHERE a.phase_id IS NOT NULL 
    AND a.week_start >= date_trunc('week', CURRENT_DATE)::date
  GROUP BY a.phase_id
) alloc_agg ON alloc_agg.phase_id = ph.id
WHERE ph.is_active = true;

-- ============================================
-- Task 2: Person Across Projects View
-- ============================================

-- "Show me Andrew's hours on Cloud Next AND Mars"
CREATE OR REPLACE VIEW person_project_summary AS
SELECT
  u.id AS user_id,
  u.name AS user_name,
  u.email,
  u.discipline,
  p.id AS project_id,
  p.name AS project_name,
  c.name AS client_name,
  
  -- Incurred (actual hours logged)
  COALESCE(te_agg.total_actual_hours, 0) AS incurred_hours,
  COALESCE(te_agg.total_actual_hours, 0) * COALESCE(p.hourly_rate, 135) AS incurred_amount,
  
  -- Scheduled (future allocations)
  COALESCE(alloc_agg.future_hours, 0) AS scheduled_hours,
  COALESCE(alloc_agg.future_hours, 0) * COALESCE(p.hourly_rate, 135) AS scheduled_amount,
  
  -- Total
  COALESCE(te_agg.total_actual_hours, 0) + COALESCE(alloc_agg.future_hours, 0) AS total_hours,
  (COALESCE(te_agg.total_actual_hours, 0) + COALESCE(alloc_agg.future_hours, 0)) * COALESCE(p.hourly_rate, 135) AS total_amount

FROM users u
JOIN (
  -- Get all projects a user has touched (via time entries or allocations)
  SELECT DISTINCT user_id, project_id FROM (
    SELECT tc.user_id, te.project_id 
    FROM time_entries te
    JOIN time_confirmations tc ON tc.id = te.confirmation_id
    UNION
    SELECT user_id, project_id FROM allocations
  ) AS user_projects
) up ON up.user_id = u.id
JOIN projects p ON p.id = up.project_id
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN (
  SELECT 
    tc.user_id,
    te.project_id,
    SUM(te.actual_hours) AS total_actual_hours
  FROM time_entries te
  JOIN time_confirmations tc ON tc.id = te.confirmation_id
  GROUP BY tc.user_id, te.project_id
) te_agg ON te_agg.user_id = u.id AND te_agg.project_id = p.id
LEFT JOIN (
  SELECT 
    a.user_id,
    a.project_id,
    SUM(a.planned_hours) AS future_hours
  FROM allocations a
  WHERE a.week_start >= date_trunc('week', CURRENT_DATE)::date
  GROUP BY a.user_id, a.project_id
) alloc_agg ON alloc_agg.user_id = u.id AND alloc_agg.project_id = p.id;

-- Function to get person totals
CREATE OR REPLACE FUNCTION get_person_totals(p_user_id UUID)
RETURNS TABLE (
  total_incurred_hours NUMERIC,
  total_incurred_amount NUMERIC,
  total_scheduled_hours NUMERIC,
  total_scheduled_amount NUMERIC,
  project_count BIGINT
) AS $$
  SELECT 
    COALESCE(SUM(incurred_hours), 0),
    COALESCE(SUM(incurred_amount), 0),
    COALESCE(SUM(scheduled_hours), 0),
    COALESCE(SUM(scheduled_amount), 0),
    COUNT(DISTINCT project_id)
  FROM person_project_summary
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- Task 3: Role Across Projects View
-- ============================================

-- "Show me Design team hours across all projects"
CREATE OR REPLACE VIEW role_project_summary AS
SELECT
  u.discipline AS role_name,
  p.id AS project_id,
  p.name AS project_name,
  c.name AS client_name,
  
  -- Count of people in this role on this project
  COUNT(DISTINCT u.id) AS team_member_count,
  
  -- Incurred (actual hours logged by role)
  COALESCE(SUM(te_agg.total_actual_hours), 0) AS incurred_hours,
  COALESCE(SUM(te_agg.total_actual_hours), 0) * COALESCE(MAX(p.hourly_rate), 135) AS incurred_amount,
  
  -- Scheduled (future allocations by role)
  COALESCE(SUM(alloc_agg.future_hours), 0) AS scheduled_hours,
  COALESCE(SUM(alloc_agg.future_hours), 0) * COALESCE(MAX(p.hourly_rate), 135) AS scheduled_amount,
  
  -- Total
  COALESCE(SUM(te_agg.total_actual_hours), 0) + COALESCE(SUM(alloc_agg.future_hours), 0) AS total_hours

FROM users u
JOIN (
  SELECT DISTINCT user_id, project_id FROM (
    SELECT tc.user_id, te.project_id 
    FROM time_entries te
    JOIN time_confirmations tc ON tc.id = te.confirmation_id
    UNION
    SELECT user_id, project_id FROM allocations
  ) AS user_projects
) up ON up.user_id = u.id
JOIN projects p ON p.id = up.project_id
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN (
  SELECT 
    tc.user_id,
    te.project_id,
    SUM(te.actual_hours) AS total_actual_hours
  FROM time_entries te
  JOIN time_confirmations tc ON tc.id = te.confirmation_id
  GROUP BY tc.user_id, te.project_id
) te_agg ON te_agg.user_id = u.id AND te_agg.project_id = p.id
LEFT JOIN (
  SELECT 
    a.user_id,
    a.project_id,
    SUM(a.planned_hours) AS future_hours
  FROM allocations a
  WHERE a.week_start >= date_trunc('week', CURRENT_DATE)::date
  GROUP BY a.user_id, a.project_id
) alloc_agg ON alloc_agg.user_id = u.id AND alloc_agg.project_id = p.id
WHERE u.discipline IS NOT NULL
GROUP BY u.discipline, p.id, p.name, c.name;

-- Function to get role totals across all projects
CREATE OR REPLACE FUNCTION get_role_totals(p_discipline TEXT)
RETURNS TABLE (
  total_incurred_hours NUMERIC,
  total_incurred_amount NUMERIC,
  total_scheduled_hours NUMERIC,
  total_scheduled_amount NUMERIC,
  project_count BIGINT,
  team_member_count BIGINT
) AS $$
  SELECT 
    COALESCE(SUM(incurred_hours), 0),
    COALESCE(SUM(incurred_amount), 0),
    COALESCE(SUM(scheduled_hours), 0),
    COALESCE(SUM(scheduled_amount), 0),
    COUNT(DISTINCT project_id),
    SUM(team_member_count)
  FROM role_project_summary
  WHERE role_name = p_discipline;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- Verification queries (run after migration)
-- ============================================

-- Test phase metrics
-- SELECT * FROM phase_budget_metrics LIMIT 5;

-- Test person view
-- SELECT * FROM person_project_summary WHERE user_name ILIKE '%andrew%';

-- Test role view  
-- SELECT * FROM role_project_summary WHERE role_name = 'Designer';
