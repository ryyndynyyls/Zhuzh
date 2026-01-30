-- Migration: Add resource_config JSONB to users table
-- This stores parsed scheduling constraints, project exclusions, and preferences
-- extracted from specialty_notes by Gemini

-- Add resource_config column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS resource_config JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN users.resource_config IS 'Parsed resource configuration from specialty_notes. Structure:
{
  "work_schedule": { "mon": 8, "tue": 8, "wed": 8, "thu": 8, "fri": 8, "sat": 0, "sun": 0 },
  "weekly_capacity": 40,
  "project_exclusions": ["Project Name 1", "Project Name 2"],
  "project_preferences": ["Prefers UX work", "Good at animations"],
  "skills": ["digital", "print", "motion"],
  "seniority_notes": "Senior level, one rung below Kate",
  "scheduling_notes": "Prefers morning meetings",
  "parsed_at": "2026-01-29T12:00:00Z",
  "parse_confidence": 0.95
}';

-- Create index for querying by work schedule (useful for finding available resources)
CREATE INDEX IF NOT EXISTS idx_users_resource_config ON users USING GIN (resource_config);

-- Example: Find all users who don't work Fridays
-- SELECT * FROM users WHERE (resource_config->'work_schedule'->>'fri')::int = 0;

-- Example: Find users excluded from a project
-- SELECT * FROM users WHERE resource_config->'project_exclusions' ? 'Google Cloud Next';
