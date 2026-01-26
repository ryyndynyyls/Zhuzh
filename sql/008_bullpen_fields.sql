-- ============================================
-- 008: Bullpen / Freelancer Fields
-- Run in Supabase SQL Editor
-- ============================================

-- Add freelancer-specific fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_freelance BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS alt_name TEXT;  -- Nicknames for matching
ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email TEXT;  -- May differ from login email
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index for bullpen queries
CREATE INDEX IF NOT EXISTS idx_users_freelance_active 
ON users (is_freelance, is_active) 
WHERE is_freelance = true;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;
