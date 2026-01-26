-- Budget Alert Log Table
-- Tracks when budget threshold alerts have been sent to prevent duplicates
-- Created: 2026-01-16

-- =============================================================================
-- BUDGET ALERT LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS budget_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  threshold INT NOT NULL CHECK (threshold IN (75, 90)),
  burn_percentage DECIMAL(5,2),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  notified_user_id UUID REFERENCES users(id),

  -- Prevent duplicate alerts for same project/threshold
  UNIQUE(project_id, threshold)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_budget_alert_log_project
  ON budget_alert_log(project_id);

CREATE INDEX IF NOT EXISTS idx_budget_alert_log_triggered
  ON budget_alert_log(triggered_at DESC);

-- =============================================================================
-- RESET ALERTS (for new budget cycles)
-- =============================================================================

-- Function to reset alerts when a project budget is increased
-- This allows alerts to fire again if budget was topped up
CREATE OR REPLACE FUNCTION reset_budget_alerts_on_budget_increase()
RETURNS TRIGGER AS $$
BEGIN
  -- If budget hours increased, reset the 90% alert so it can fire again
  IF NEW.budget_hours > OLD.budget_hours THEN
    DELETE FROM budget_alert_log
    WHERE project_id = NEW.id
    AND threshold = 90;

    -- If budget increased by more than 25%, also reset the 75% alert
    IF NEW.budget_hours > OLD.budget_hours * 1.25 THEN
      DELETE FROM budget_alert_log
      WHERE project_id = NEW.id
      AND threshold = 75;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to reset alerts on budget increase
DROP TRIGGER IF EXISTS reset_budget_alerts_trigger ON projects;
CREATE TRIGGER reset_budget_alerts_trigger
  AFTER UPDATE OF budget_hours ON projects
  FOR EACH ROW
  WHEN (NEW.budget_hours > OLD.budget_hours)
  EXECUTE FUNCTION reset_budget_alerts_on_budget_increase();

-- =============================================================================
-- PROJECT BUDGET SUMMARY VIEW (if not exists)
-- =============================================================================

-- This view aggregates budget data for the alerts system
CREATE OR REPLACE VIEW project_budget_summary AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.org_id,
  c.name AS client_name,
  p.budget_hours,
  COALESCE(SUM(te.actual_hours), 0) AS burned_hours,
  CASE
    WHEN p.budget_hours > 0
    THEN ROUND((COALESCE(SUM(te.actual_hours), 0) / p.budget_hours) * 100, 1)
    ELSE 0
  END AS burn_percentage,
  GREATEST(0, p.budget_hours - COALESCE(SUM(te.actual_hours), 0)) AS remaining_hours,
  p.budget_dollars,
  COALESCE(SUM(te.actual_hours * COALESCE(u.hourly_rate, 150)), 0) AS burned_dollars
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN time_entries te ON te.project_id = p.id
LEFT JOIN time_confirmations tc ON te.confirmation_id = tc.id
LEFT JOIN users u ON tc.user_id = u.id
WHERE p.status = 'active'
GROUP BY p.id, p.name, p.org_id, c.name, p.budget_hours, p.budget_dollars;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE budget_alert_log IS
  'Tracks budget threshold alerts to prevent duplicate notifications';

COMMENT ON COLUMN budget_alert_log.threshold IS
  'Budget percentage threshold that triggered the alert (75 or 90)';

COMMENT ON COLUMN budget_alert_log.notified_user_id IS
  'Last user who received this alert notification';
