-- Migration: Day-Level Allocations
-- Project: ResourceFlow
-- Date: 2026-01-29
-- Description: Add start_date and end_date columns to allocations table
--              to support day-level allocation granularity instead of week_start only.

-- ============================================
-- Step 1: Add new columns
-- ============================================

-- Add start_date and end_date columns
ALTER TABLE allocations
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

COMMENT ON COLUMN allocations.start_date IS 'First day of the allocation (inclusive)';
COMMENT ON COLUMN allocations.end_date IS 'Last day of the allocation (inclusive)';

-- ============================================
-- Step 2: Migrate existing data
-- ============================================

-- Existing allocations use week_start (Monday).
-- For backwards compatibility, set start_date = week_start (Monday)
-- and end_date = week_start + 4 days (Friday) for a Mon-Fri work week.
UPDATE allocations
SET
  start_date = week_start,
  end_date = week_start + INTERVAL '4 days'
WHERE start_date IS NULL;

-- ============================================
-- Step 3: Make columns NOT NULL after migration
-- ============================================

ALTER TABLE allocations
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date SET NOT NULL;

-- ============================================
-- Step 4: Add constraint for valid date range
-- ============================================

ALTER TABLE allocations
  ADD CONSTRAINT allocations_valid_date_range
  CHECK (end_date >= start_date);

-- ============================================
-- Step 5: Update unique constraint
-- ============================================

-- Drop old constraint (if it exists)
ALTER TABLE allocations
  DROP CONSTRAINT IF EXISTS allocations_user_project_week_unique;

-- New unique constraint: user + project + start_date
-- This allows multiple allocations per week as long as they start on different days
ALTER TABLE allocations
  ADD CONSTRAINT allocations_user_project_start_date_unique
  UNIQUE (user_id, project_id, start_date);

-- ============================================
-- Step 6: Add indexes for date range queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_allocations_start_date ON allocations(start_date);
CREATE INDEX IF NOT EXISTS idx_allocations_end_date ON allocations(end_date);
CREATE INDEX IF NOT EXISTS idx_allocations_date_range ON allocations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_allocations_user_date_range ON allocations(user_id, start_date, end_date);

-- ============================================
-- Step 7: Optional - Drop week_start column
-- ============================================

-- IMPORTANT: Do NOT drop week_start until all application code is migrated!
-- The column is kept for backwards compatibility during the transition.
-- Once all code uses start_date/end_date, you can run:
-- ALTER TABLE allocations DROP COLUMN week_start;

-- ============================================
-- Step 8: Update reporting views that reference week_start
-- ============================================

-- Update phase_budget_metrics view to use start_date instead of week_start
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

  -- Scheduled (future allocations - now uses start_date)
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
    AND a.start_date >= CURRENT_DATE  -- Changed from week_start
  GROUP BY a.phase_id
) alloc_agg ON alloc_agg.phase_id = ph.id;

-- Update person_project_summary view to use start_date instead of week_start
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

  -- Scheduled (future allocations - now uses start_date)
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
  WHERE a.start_date >= CURRENT_DATE  -- Changed from week_start
  GROUP BY a.user_id, a.project_id
) alloc_agg ON alloc_agg.user_id = u.id AND alloc_agg.project_id = p.id;

-- Update role_project_summary view to use start_date instead of week_start
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

  -- Scheduled (future allocations by role - now uses start_date)
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
  WHERE a.start_date >= CURRENT_DATE  -- Changed from week_start
  GROUP BY a.user_id, a.project_id
) alloc_agg ON alloc_agg.user_id = u.id AND alloc_agg.project_id = p.id
WHERE u.discipline IS NOT NULL
GROUP BY u.discipline, p.id, p.name, c.name;

-- ============================================
-- Verification queries (run after migration)
-- ============================================

-- Check that all allocations have start_date and end_date populated
-- SELECT COUNT(*) AS total,
--        COUNT(start_date) AS with_start_date,
--        COUNT(end_date) AS with_end_date
-- FROM allocations;

-- Check date ranges look reasonable
-- SELECT id, week_start, start_date, end_date,
--        (end_date - start_date + 1) AS days_span
-- FROM allocations
-- LIMIT 10;
