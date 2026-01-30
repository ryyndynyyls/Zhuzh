-- Migration: Convert Multi-Day Allocations to Single-Day Records
-- Project: ResourceFlow
-- Date: 2026-01-29
-- Description: Changes the data model so each allocation represents a single day.
--              This makes "planned_hours" mean "hours for THIS day" rather than
--              "total hours across multiple days". Visual grouping handles display.

-- ============================================
-- Step 1: Create temp table with expanded days
-- ============================================

-- This expands each multi-day allocation into individual day records,
-- distributing the total hours across working days (Mon-Fri).
CREATE TEMP TABLE expanded_allocations AS
WITH RECURSIVE date_series AS (
  -- Base case: start with the first day of each multi-day allocation
  SELECT
    id as original_id,
    user_id,
    project_id,
    phase_id,
    start_date as current_date,
    end_date,
    planned_hours,
    is_billable,
    notes,
    created_by,
    created_at,
    -- Calculate the number of working days in the original range
    -- This helps us distribute hours evenly
    (
      SELECT COUNT(*)::int
      FROM generate_series(start_date, end_date, '1 day'::interval) d
      WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)  -- Exclude Sat (6) and Sun (0)
    ) as total_working_days
  FROM allocations
  WHERE start_date != end_date  -- Only multi-day allocations

  UNION ALL

  -- Recursive case: add one day at a time until we reach end_date
  SELECT
    original_id,
    user_id,
    project_id,
    phase_id,
    (current_date + INTERVAL '1 day')::date,
    end_date,
    planned_hours,
    is_billable,
    notes,
    created_by,
    created_at,
    total_working_days
  FROM date_series
  WHERE current_date < end_date
)
-- Select all days, calculating hours per day
SELECT
  user_id,
  project_id,
  phase_id,
  current_date as allocation_date,
  CASE
    WHEN total_working_days > 0 THEN ROUND((planned_hours / total_working_days)::numeric, 2)
    ELSE planned_hours
  END as daily_hours,
  is_billable,
  notes,
  created_by,
  created_at,
  original_id
FROM date_series
WHERE EXTRACT(DOW FROM current_date) NOT IN (0, 6);  -- Skip weekends

-- ============================================
-- Step 2: Count records before migration (for verification)
-- ============================================

-- Store counts for verification
DO $$
DECLARE
  total_before INT;
  multi_day_count INT;
  total_hours_before NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_before FROM allocations;
  SELECT COUNT(*) INTO multi_day_count FROM allocations WHERE start_date != end_date;
  SELECT COALESCE(SUM(planned_hours), 0) INTO total_hours_before FROM allocations;

  RAISE NOTICE 'Before migration:';
  RAISE NOTICE '  Total allocations: %', total_before;
  RAISE NOTICE '  Multi-day allocations to expand: %', multi_day_count;
  RAISE NOTICE '  Total planned hours: %', total_hours_before;
END $$;

-- ============================================
-- Step 3: Delete original multi-day allocations
-- ============================================

DELETE FROM allocations WHERE start_date != end_date;

-- ============================================
-- Step 4: Insert expanded single-day allocations
-- ============================================

INSERT INTO allocations (
  user_id,
  project_id,
  phase_id,
  start_date,
  end_date,
  week_start,
  planned_hours,
  is_billable,
  notes,
  created_by,
  created_at
)
SELECT
  user_id,
  project_id,
  phase_id,
  allocation_date,
  allocation_date,  -- start_date = end_date for single-day
  date_trunc('week', allocation_date)::date,  -- Monday of that week
  daily_hours,
  is_billable,
  notes,
  created_by,
  created_at
FROM expanded_allocations
-- Avoid creating duplicates if a single-day record already exists
ON CONFLICT (user_id, project_id, start_date)
DO UPDATE SET
  planned_hours = allocations.planned_hours + EXCLUDED.planned_hours,
  updated_at = NOW();

-- ============================================
-- Step 5: Clean up temp table
-- ============================================

DROP TABLE expanded_allocations;

-- ============================================
-- Step 6: Verify migration
-- ============================================

DO $$
DECLARE
  total_after INT;
  multi_day_remaining INT;
  total_hours_after NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_after FROM allocations;
  SELECT COUNT(*) INTO multi_day_remaining FROM allocations WHERE start_date != end_date;
  SELECT COALESCE(SUM(planned_hours), 0) INTO total_hours_after FROM allocations;

  RAISE NOTICE 'After migration:';
  RAISE NOTICE '  Total allocations: %', total_after;
  RAISE NOTICE '  Multi-day allocations remaining: % (should be 0)', multi_day_remaining;
  RAISE NOTICE '  Total planned hours: % (should be similar to before)', total_hours_after;

  IF multi_day_remaining > 0 THEN
    RAISE WARNING 'Migration incomplete: % multi-day allocations still exist!', multi_day_remaining;
  END IF;
END $$;

-- ============================================
-- Step 7: Add comment explaining the new model
-- ============================================

COMMENT ON TABLE allocations IS
'Planned hours - what PMs schedule.
Each record represents a SINGLE DAY allocation.
planned_hours = hours for THIS specific day.
Visual grouping of consecutive days is handled by the frontend.
Updated 2026-01-29: Migrated from multi-day to single-day model.';

COMMENT ON COLUMN allocations.planned_hours IS
'Hours allocated for THIS specific day (not total across a range)';

-- ============================================
-- Optional: Add constraint to enforce single-day allocations
-- ============================================

-- Uncomment to enforce going forward (prevents future multi-day records):
-- ALTER TABLE allocations
--   ADD CONSTRAINT allocations_single_day
--   CHECK (start_date = end_date);

-- ============================================
-- Verification queries (run after migration)
-- ============================================

-- Should return 0 (no multi-day allocations remain):
-- SELECT COUNT(*) FROM allocations WHERE start_date != end_date;

-- Check a sample of converted records:
-- SELECT user_id, project_id, start_date, planned_hours
-- FROM allocations
-- ORDER BY user_id, project_id, start_date
-- LIMIT 20;
