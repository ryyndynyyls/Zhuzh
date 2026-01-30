-- Migration: Convert Multi-Day Allocations to Single-Day Records (FIXED)
-- Run this in Supabase SQL Editor
-- Fixed: Aggregates duplicates before inserting

-- ============================================
-- Step 1: Check current state
-- ============================================
SELECT 
  COUNT(*) as total_allocations,
  COUNT(*) FILTER (WHERE start_date != end_date) as multi_day_to_convert,
  SUM(planned_hours) as total_hours_before
FROM allocations;

-- ============================================
-- Step 2: Create expanded records using generate_series
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
  a.created_at
FROM allocations a
CROSS JOIN LATERAL generate_series(a.start_date, a.end_date, '1 day'::interval) d
WHERE a.start_date != a.end_date
  AND EXTRACT(DOW FROM d) NOT IN (0, 6);

-- ============================================
-- Step 3: Aggregate duplicates within expanded data
-- ============================================
CREATE TEMP TABLE aggregated_allocations AS
SELECT
  user_id,
  project_id,
  MAX(phase_id) as phase_id,
  allocation_date,
  SUM(daily_hours) as daily_hours,
  BOOL_OR(is_billable) as is_billable,
  MAX(notes) as notes,
  MAX(created_by) as created_by,
  MIN(created_at) as created_at
FROM expanded_allocations
GROUP BY user_id, project_id, allocation_date;

-- ============================================
-- Step 4: Delete original multi-day allocations
-- ============================================
DELETE FROM allocations WHERE start_date != end_date;

-- ============================================
-- Step 5: Insert aggregated single-day allocations
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
FROM aggregated_allocations
ON CONFLICT (user_id, project_id, start_date)
DO UPDATE SET
  planned_hours = allocations.planned_hours + EXCLUDED.planned_hours,
  updated_at = NOW();

-- ============================================
-- Step 6: Cleanup and verify
-- ============================================
DROP TABLE expanded_allocations;
DROP TABLE aggregated_allocations;

SELECT 
  COUNT(*) as total_allocations,
  COUNT(*) FILTER (WHERE start_date != end_date) as multi_day_remaining,
  SUM(planned_hours) as total_hours_after
FROM allocations;
