-- Migration 011: Project Archiving Fields
-- Run this in Supabase SQL Editor

-- First, add is_active column if it doesn't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add archiving columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Add comments for clarity
COMMENT ON COLUMN projects.is_active IS 'Whether the project is active (false = archived)';
COMMENT ON COLUMN projects.archived_at IS 'When the project was archived (null if active)';
COMMENT ON COLUMN projects.archive_reason IS 'Reason for archiving the project';

-- Create index for archived project queries
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active) WHERE is_active = true;

-- Set all existing projects to active (safe default)
UPDATE projects SET is_active = true WHERE is_active IS NULL;

-- View for quick archive candidate lookup (projects with no allocations in last 12 weeks)
CREATE OR REPLACE VIEW archive_candidates AS
WITH recent_activity AS (
  SELECT DISTINCT project_id
  FROM allocations
  WHERE week_start >= CURRENT_DATE - INTERVAL '12 weeks'
)
SELECT 
  p.id,
  p.name,
  p.is_active,
  p.created_at,
  p.updated_at,
  c.name as client_name,
  (SELECT MAX(week_start) FROM allocations WHERE project_id = p.id) as last_allocation,
  (SELECT COUNT(*) FROM allocations WHERE project_id = p.id) as total_allocations,
  (SELECT COALESCE(SUM(actual_hours), 0) FROM time_entries WHERE project_id = p.id) as total_hours_logged
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.is_active = true
  AND p.id NOT IN (SELECT project_id FROM recent_activity WHERE project_id IS NOT NULL)
ORDER BY last_allocation ASC NULLS FIRST;

-- Grant access to the view
GRANT SELECT ON archive_candidates TO authenticated;
