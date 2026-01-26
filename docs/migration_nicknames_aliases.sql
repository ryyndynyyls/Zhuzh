-- Migration: Add nicknames and aliases for better search/matching
-- Date: 2026-01-22
-- Run this in Supabase SQL Editor

-- Add nicknames column to users for search disambiguation
-- e.g., "Fred, Freddy" for Frédéric, "Richard, Levi" for Levi Brooks, "Hunner" for Hunter
ALTER TABLE users ADD COLUMN IF NOT EXISTS nicknames TEXT;

-- Add aliases column to projects for Slack matching
-- e.g., "GCN, Cloud Next, Next 2026" for "Google Cloud Next 2026"
ALTER TABLE projects ADD COLUMN IF NOT EXISTS aliases TEXT;

-- Create index for faster nickname/alias searches
CREATE INDEX IF NOT EXISTS idx_users_nicknames ON users USING gin(to_tsvector('english', COALESCE(nicknames, '')));
CREATE INDEX IF NOT EXISTS idx_projects_aliases ON projects USING gin(to_tsvector('english', COALESCE(aliases, '')));

-- Add example data for UA5 (update based on actual names in your system)
UPDATE users SET nicknames = 'Richard' WHERE name ILIKE '%Levi%Brooks%';
UPDATE users SET nicknames = 'Hunner' WHERE name ILIKE '%Hunter%';
UPDATE users SET nicknames = 'Kate' WHERE name ILIKE '%Kathryn%';
-- Note: For names with accents like Frédéric, use LIKE with wildcards

-- Comment for future admins
COMMENT ON COLUMN users.nicknames IS 'Comma-separated nicknames for search disambiguation. Admins can edit anyone, employees their own.';
COMMENT ON COLUMN projects.aliases IS 'Comma-separated aliases for Slack command matching (e.g., "GCN, Cloud Next").';
