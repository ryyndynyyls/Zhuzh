-- Migration 010: User Preferences (DM Frequency, Notification Settings, Avatar)
-- Run this in Supabase SQL Editor

-- Add user preference columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS dm_frequency VARCHAR(20) DEFAULT 'weekly';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"slack_dm": true, "email_summary": false, "reminder_day": "friday", "reminder_time": "09:00"}';

-- Add constraint for valid dm_frequency values
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_dm_frequency;
ALTER TABLE users ADD CONSTRAINT valid_dm_frequency 
  CHECK (dm_frequency IN ('daily', 'weekly', 'biweekly', 'none'));

-- Add comments for clarity
COMMENT ON COLUMN users.dm_frequency IS 'How often user receives Slack DM confirmations: daily, weekly, biweekly, none';
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image (Supabase Storage or external)';
COMMENT ON COLUMN users.notification_preferences IS 'JSON object with notification settings: slack_dm (bool), email_summary (bool), reminder_day (string), reminder_time (string HH:MM)';

-- Create index for DM scheduling queries
CREATE INDEX IF NOT EXISTS idx_users_dm_frequency ON users(dm_frequency) WHERE is_active = true;

-- Example notification_preferences structure:
-- {
--   "slack_dm": true,           -- Receive Slack DM confirmations
--   "email_summary": false,     -- Receive weekly email summary
--   "reminder_day": "friday",   -- Day to receive confirmation DM
--   "reminder_time": "09:00"    -- Time to receive DM (HH:MM in user's timezone)
-- }

-- Update existing users with defaults (safe to re-run)
UPDATE users 
SET 
  dm_frequency = COALESCE(dm_frequency, 'weekly'),
  notification_preferences = COALESCE(notification_preferences, '{"slack_dm": true, "email_summary": false, "reminder_day": "friday", "reminder_time": "09:00"}'::jsonb)
WHERE dm_frequency IS NULL OR notification_preferences IS NULL;
