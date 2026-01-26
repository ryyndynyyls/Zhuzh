-- Timezone support for ResourceFlow
-- Run this in Supabase SQL Editor

-- Add timezone override column (optional - only for rare manual overrides)
-- The primary timezone comes from Slack API auto-detection
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS timezone_override TEXT DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN users.timezone_override IS 
'Optional manual timezone override (IANA format, e.g., America/New_York). 
If NULL, timezone is auto-detected from Slack. 
Only set this for edge cases like "notify me on Tokyo time even though I am in LA".';

-- Example: To set a manual override for a user
-- UPDATE users SET timezone_override = 'America/New_York' WHERE email = 'someone@useallfive.com';

-- To clear an override (go back to auto-detect)
-- UPDATE users SET timezone_override = NULL WHERE email = 'someone@useallfive.com';
