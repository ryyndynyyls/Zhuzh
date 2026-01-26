-- ============================================================
-- User Calendar Events Table
-- Stores synced calendar events for Who's Out widget
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS user_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'pto', 'holiday', 'friday_off'
  summary TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  calendar_event_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, calendar_event_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_calendar_events_user_time 
ON user_calendar_events(user_id, start_time);

CREATE INDEX IF NOT EXISTS idx_user_calendar_events_type 
ON user_calendar_events(event_type, start_time);

-- Index for org-level queries (joins through users)
CREATE INDEX IF NOT EXISTS idx_user_calendar_events_start 
ON user_calendar_events(start_time);

-- ============================================================
-- Verify the table was created
-- ============================================================
-- SELECT 'user_calendar_events table created' as status;
