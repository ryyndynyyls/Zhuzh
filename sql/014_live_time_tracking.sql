-- Migration 014: Live Time Tracking (Optional Feature)
-- Run this in Supabase SQL Editor
--
-- This migration adds support for opt-in real-time time tracking.
-- Users can track time via web timer or Slack commands.
-- Tracked time pre-populates the Friday confirmation DM.
--
-- Philosophy: This is OPTIONAL and trust-based. No surveillance.
-- Default is OFF - users must explicitly enable in Settings.

-- =============================================================================
-- USER SETTINGS FOR TIME TRACKING
-- =============================================================================

-- Add time tracking preference columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS time_tracking_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS time_tracking_daily_summary BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS time_tracking_widget_position VARCHAR(20) DEFAULT 'bottom';

-- Add constraint for valid widget positions
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_widget_position;
ALTER TABLE users ADD CONSTRAINT valid_widget_position
  CHECK (time_tracking_widget_position IN ('bottom', 'floating'));

-- Add comments for clarity
COMMENT ON COLUMN users.time_tracking_enabled IS 'When TRUE, user can track time in real-time via web/Slack. Default OFF.';
COMMENT ON COLUMN users.time_tracking_daily_summary IS 'When TRUE, send daily summary DM at 6pm with tracked hours.';
COMMENT ON COLUMN users.time_tracking_widget_position IS 'Where to show timer widget: bottom bar or floating.';

-- =============================================================================
-- LIVE TIME ENTRIES TABLE
-- Stores both timer entries (start/stop) and manual entries
-- =============================================================================

CREATE TABLE IF NOT EXISTS time_entries_live (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,

  -- Entry type: 'timer' (started/stopped) or 'manual' (direct entry)
  entry_type TEXT NOT NULL DEFAULT 'timer',

  -- For timer entries: when timer started and stopped
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,

  -- Calculated (for timer) or entered (for manual) duration in minutes
  duration_minutes INTEGER NOT NULL DEFAULT 0,

  -- Which date this entry applies to (for weekly rollup)
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Optional notes/description
  notes TEXT,

  -- Source: 'web' or 'slack' (for analytics)
  source TEXT DEFAULT 'web',

  -- Link to confirmation once approved in Friday DM
  confirmation_id UUID REFERENCES time_confirmations(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_entry_type CHECK (entry_type IN ('timer', 'manual')),
  CONSTRAINT valid_source CHECK (source IN ('web', 'slack')),
  CONSTRAINT timer_has_start CHECK (
    entry_type = 'manual' OR started_at IS NOT NULL
  )
);

-- Index for fetching user's entries for a date range
CREATE INDEX IF NOT EXISTS idx_time_entries_live_user_date
  ON time_entries_live(user_id, entry_date);

-- Index for fetching entries by project (for project time reports)
CREATE INDEX IF NOT EXISTS idx_time_entries_live_project
  ON time_entries_live(project_id, entry_date);

-- CRITICAL: Ensure only ONE running timer per user at any time
-- A timer is "running" when started_at is set but stopped_at is NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_running_timer
  ON time_entries_live(user_id)
  WHERE stopped_at IS NULL AND entry_type = 'timer';

-- Index for finding unconfirmed entries (not yet linked to a confirmation)
CREATE INDEX IF NOT EXISTS idx_time_entries_live_unconfirmed
  ON time_entries_live(user_id, entry_date)
  WHERE confirmation_id IS NULL;

-- =============================================================================
-- SLACK CHANNEL TO PROJECT MAPPING
-- For channel-aware timer suggestions
-- =============================================================================

CREATE TABLE IF NOT EXISTS slack_channel_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slack_channel_id VARCHAR(50) NOT NULL,
  slack_channel_name VARCHAR(255),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One project per channel
  CONSTRAINT unique_channel_project UNIQUE (slack_channel_id)
);

CREATE INDEX IF NOT EXISTS idx_slack_channel_projects_org
  ON slack_channel_projects(org_id);

CREATE INDEX IF NOT EXISTS idx_slack_channel_projects_channel
  ON slack_channel_projects(slack_channel_id);

COMMENT ON TABLE slack_channel_projects IS 'Maps Slack channels to projects for auto-suggesting timers in channel context';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE time_entries_live ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_channel_projects ENABLE ROW LEVEL SECURITY;

-- Users can see and modify their own time entries
CREATE POLICY time_entries_live_own ON time_entries_live
  FOR ALL
  USING (user_id = auth.uid());

-- PMs and admins can see all time entries in their org
CREATE POLICY time_entries_live_pm_view ON time_entries_live
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('pm', 'admin')
    AND user_id IN (
      SELECT id FROM users WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- Channel mappings visible to all in org
CREATE POLICY slack_channel_projects_org_view ON slack_channel_projects
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- PMs and admins can modify channel mappings
CREATE POLICY slack_channel_projects_pm_modify ON slack_channel_projects
  FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('pm', 'admin')
    AND org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- =============================================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- =============================================================================

CREATE TRIGGER update_time_entries_live_updated_at
  BEFORE UPDATE ON time_entries_live
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- AUDIT TRIGGER FOR TIME ENTRIES
-- =============================================================================

-- Extend audit trigger to include time_entries_live
CREATE OR REPLACE FUNCTION audit_time_entries_live_function()
RETURNS TRIGGER AS $$
DECLARE
  org UUID;
  changes_json JSONB;
BEGIN
  -- Get org_id from the user
  SELECT u.org_id INTO org FROM users u WHERE u.id = COALESCE(NEW.user_id, OLD.user_id);

  -- Build changes JSON
  IF TG_OP = 'INSERT' THEN
    changes_json := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    changes_json := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    changes_json := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  -- Insert audit record
  IF org IS NOT NULL THEN
    INSERT INTO audit_log (org_id, entity_type, entity_id, action, changes, user_id)
    VALUES (
      org,
      'time_entries_live',
      COALESCE(NEW.id, OLD.id),
      TG_OP::audit_action,
      changes_json,
      auth.uid()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_time_entries_live
  AFTER INSERT OR UPDATE OR DELETE ON time_entries_live
  FOR EACH ROW EXECUTE FUNCTION audit_time_entries_live_function();

-- =============================================================================
-- HELPER VIEW: Daily Time Summary
-- Aggregates time entries by user and project for a given date
-- =============================================================================

CREATE OR REPLACE VIEW time_entries_daily_summary AS
SELECT
  tel.user_id,
  tel.entry_date,
  tel.project_id,
  p.name AS project_name,
  p.color AS project_color,
  COUNT(*) AS entry_count,
  SUM(tel.duration_minutes) AS total_minutes,
  ROUND(SUM(tel.duration_minutes) / 60.0, 2) AS total_hours,
  MIN(tel.started_at) AS first_entry,
  MAX(COALESCE(tel.stopped_at, tel.created_at)) AS last_entry
FROM time_entries_live tel
JOIN projects p ON tel.project_id = p.id
WHERE tel.stopped_at IS NOT NULL OR tel.entry_type = 'manual'
GROUP BY tel.user_id, tel.entry_date, tel.project_id, p.name, p.color;

COMMENT ON VIEW time_entries_daily_summary IS 'Aggregated time entries by user, date, and project for dashboard displays';

-- =============================================================================
-- HELPER VIEW: Weekly Time Summary with Plan vs Actual
-- Compares tracked time against planned allocations
-- =============================================================================

CREATE OR REPLACE VIEW time_entries_weekly_comparison AS
SELECT
  u.id AS user_id,
  u.name AS user_name,
  DATE_TRUNC('week', tel.entry_date)::DATE AS week_start,
  p.id AS project_id,
  p.name AS project_name,
  p.color AS project_color,
  COALESCE(a.planned_hours, 0) AS planned_hours,
  ROUND(SUM(tel.duration_minutes) / 60.0, 2) AS tracked_hours,
  ROUND(SUM(tel.duration_minutes) / 60.0, 2) - COALESCE(a.planned_hours, 0) AS variance_hours
FROM time_entries_live tel
JOIN users u ON tel.user_id = u.id
JOIN projects p ON tel.project_id = p.id
LEFT JOIN allocations a ON (
  a.user_id = tel.user_id
  AND a.project_id = tel.project_id
  AND a.week_start = DATE_TRUNC('week', tel.entry_date)::DATE
)
WHERE tel.stopped_at IS NOT NULL OR tel.entry_type = 'manual'
GROUP BY u.id, u.name, DATE_TRUNC('week', tel.entry_date)::DATE, p.id, p.name, p.color, a.planned_hours;

COMMENT ON VIEW time_entries_weekly_comparison IS 'Compares tracked time against planned allocations for Friday DM';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
--
-- Summary of changes:
-- 1. Added time_tracking_enabled, time_tracking_daily_summary,
--    time_tracking_widget_position columns to users table
-- 2. Created time_entries_live table for timer and manual entries
-- 3. Created slack_channel_projects table for channel→project mapping
-- 4. Added RLS policies for multi-tenant security
-- 5. Added audit triggers for compliance
-- 6. Created helper views for daily and weekly summaries
--
-- To verify:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'time_entries_live';
--
-- SELECT * FROM time_entries_live LIMIT 1;
