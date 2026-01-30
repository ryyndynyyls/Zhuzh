-- Migration: Convert Multi-Day Allocations to Single-Day Records (FAST VERSION)
-- Run this in Supabase SQL Editor
-- Optimized to avoid timeout - uses generate_series instead of recursive CTE

-- ============================================
-- Step 1: Check current state
-- ============================================
SELECT 
  COUNT(*) as total_allocations,
  COUNT(*) FILTER (WHERE start_date != end_date) as multi_day_to_convert,
  SUM(planned_hours) as total_hours_before
FROM allocations;

-- ============================================
-- Step 2: Create expanded records using generate_series (FAST)
-- ============================================
CREATE TEMP TABLE expanded_allocations AS
SELECT
  a.user_id,
  a.project_id,
  a.phase_id,
  d::date as allocation_date,
  ROUND((a.planned_hours / NULLIF(
    (SELECT COUNT(*)::numeric FROM generate_series(a.start_date, a.end_date, '1 day'::interval) x 
     WHERE EXTRACT(DOW FROM x) NOT IN (0, 6)), 0
  ))::numeric, 2) as daily_hours,
  a.is_billable,
  a.notes,
  a.created_by,
  a.created_at,
  a.id as original_id
FROM allocations a
CROSS JOIN LATERAL generate_series(a.start_date, a.end_date, '1 day'::interval) d
WHERE a.start_date != a.end_date
  AND EXTRACT(DOW FROM d) NOT IN (0, 6);  -- Skip weekends

-- ============================================
-- Step 3: Delete original multi-day allocations
-- ============================================
DELETE FROM allocations WHERE start_date != end_date;

-- ============================================
-- Step 4: Insert expanded single-day allocations
-- ============================================
INSERT INTO allocations (
  user_id, project_id, phase_id, start_date, end_date, week_start,
  planned_hours, is_billable, notes, created_by, created_at
)
SELECT
  user_id, project_id, phase_id, 
  allocation_date, allocation_date,
  date_trunc('week', allocation_date)::date,
  daily_hours, is_billable, notes, created_by, created_at
FROM expanded_allocations
ON CONFLICT (user_id, project_id, start_date)
DO UPDATE SET
  planned_hours = allocations.planned_hours + EXCLUDED.planned_hours,
  updated_at = NOW();

-- ============================================
-- Step 5: Cleanup and verify
-- ============================================
DROP TABLE expanded_allocations;

SELECT 
  COUNT(*) as total_allocations,
  COUNT(*) FILTER (WHERE start_date != end_date) as multi_day_remaining,
  SUM(planned_hours) as total_hours_after
FROM allocations;
