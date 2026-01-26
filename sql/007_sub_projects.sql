-- Migration: Add sub-project support (parent_id on projects)
-- This enables umbrella projects like "Google Cloud Next 2026" to have
-- child projects that roll up to the parent's budget.

-- Add parent_id column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Add index for efficient parent lookups
CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON projects(parent_id);

-- Add legacy_10kft_id for mapping imported nested projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS legacy_10kft_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_projects_legacy_10kft_id ON projects(legacy_10kft_id);

-- View to get projects with sub-project stats
CREATE OR REPLACE VIEW projects_with_children AS
SELECT 
  p.*,
  COALESCE(
    (SELECT COUNT(*) FROM projects c WHERE c.parent_id = p.id),
    0
  ) AS child_count,
  COALESCE(
    (SELECT SUM(c.budget_hours) FROM projects c WHERE c.parent_id = p.id),
    0
  ) AS children_budget_hours
FROM projects p;

COMMENT ON COLUMN projects.parent_id IS 'References parent project for sub-project rollups';
COMMENT ON COLUMN projects.legacy_10kft_id IS '10,000ft project ID for migration mapping';
