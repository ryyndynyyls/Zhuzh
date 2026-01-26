-- Seed Data for Testing Approvals
-- Run this after the base migrations are in place
-- Project: Zhuzh (ovyppexeqwwaghwddtip)

-- First, get some IDs we'll need
-- Assumes the organization and users exist from the base seed

-- Create a submitted timesheet for testing
-- This will create a test confirmation for the week of Jan 13, 2026

DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_project_id UUID;
  v_confirmation_id UUID;
BEGIN
  -- Get org ID (Use All Five)
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Use All Five' LIMIT 1;

  -- If no org exists, create one
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (id, name, slack_workspace_id)
    VALUES ('00000000-0000-0000-0000-000000000000', 'Use All Five', 'T_USEALLFIVE')
    RETURNING id INTO v_org_id;
  END IF;

  -- Get or create a test user
  SELECT id INTO v_user_id FROM users WHERE email = 'kara@useallfive.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    INSERT INTO users (org_id, name, email, role)
    VALUES (v_org_id, 'Kara Test', 'kara@useallfive.com', 'employee')
    RETURNING id INTO v_user_id;
  END IF;

  -- Get a project or create one
  SELECT id INTO v_project_id FROM projects WHERE org_id = v_org_id LIMIT 1;

  IF v_project_id IS NULL THEN
    INSERT INTO projects (org_id, name, budget_hours, hourly_rate, status, is_billable, is_active)
    VALUES (v_org_id, 'Test Project', 400, 175, 'active', true, true)
    RETURNING id INTO v_project_id;
  END IF;

  -- Create a submitted time confirmation
  INSERT INTO time_confirmations (user_id, week_start, status, submitted_at, notes)
  VALUES (v_user_id, '2026-01-13', 'submitted', NOW(), 'Test submission for approvals demo')
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    status = 'submitted',
    submitted_at = NOW(),
    notes = 'Test submission for approvals demo'
  RETURNING id INTO v_confirmation_id;

  -- Add time entries
  DELETE FROM time_entries WHERE confirmation_id = v_confirmation_id;

  INSERT INTO time_entries (confirmation_id, project_id, planned_hours, actual_hours, is_unplanned, notes)
  VALUES
    (v_confirmation_id, v_project_id, 24, 26, false, 'Main project work'),
    (v_confirmation_id, v_project_id, 16, 14, false, 'Supporting tasks');

  RAISE NOTICE 'Created test approval for user % (confirmation %)', v_user_id, v_confirmation_id;
END $$;

-- Create another submitted timesheet with variance warning (>10% difference)
DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_project_id UUID;
  v_confirmation_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Use All Five' LIMIT 1;

  -- Get or create another test user
  SELECT id INTO v_user_id FROM users WHERE email = 'maleno@useallfive.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    INSERT INTO users (org_id, name, email, role)
    VALUES (v_org_id, 'Maleno Test', 'maleno@useallfive.com', 'employee')
    RETURNING id INTO v_user_id;
  END IF;

  SELECT id INTO v_project_id FROM projects WHERE org_id = v_org_id LIMIT 1;

  -- Create a confirmation with high variance (should trigger warning)
  INSERT INTO time_confirmations (user_id, week_start, status, submitted_at, notes)
  VALUES (v_user_id, '2026-01-13', 'submitted', NOW(), 'Week with extra client calls')
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    status = 'submitted',
    submitted_at = NOW(),
    notes = 'Week with extra client calls'
  RETURNING id INTO v_confirmation_id;

  DELETE FROM time_entries WHERE confirmation_id = v_confirmation_id;

  -- 30 planned, 38 actual = 26% over (variance warning)
  INSERT INTO time_entries (confirmation_id, project_id, planned_hours, actual_hours, is_unplanned, notes)
  VALUES
    (v_confirmation_id, v_project_id, 30, 38, false, 'Project work - ran over due to scope change');

  RAISE NOTICE 'Created variance warning approval for user %', v_user_id;
END $$;

-- Create a rubber-stamp warning (actual = planned exactly)
DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_project_id UUID;
  v_confirmation_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Use All Five' LIMIT 1;

  SELECT id INTO v_user_id FROM users WHERE email = 'ryan@useallfive.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    INSERT INTO users (org_id, name, email, role)
    VALUES (v_org_id, 'Ryan Test', 'ryan@useallfive.com', 'admin')
    RETURNING id INTO v_user_id;
  END IF;

  SELECT id INTO v_project_id FROM projects WHERE org_id = v_org_id LIMIT 1;

  -- Create a confirmation with exact match (rubber-stamp warning)
  INSERT INTO time_confirmations (user_id, week_start, status, submitted_at, exact_match_flag)
  VALUES (v_user_id, '2026-01-13', 'submitted', NOW(), true)
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    status = 'submitted',
    submitted_at = NOW(),
    exact_match_flag = true
  RETURNING id INTO v_confirmation_id;

  DELETE FROM time_entries WHERE confirmation_id = v_confirmation_id;

  -- Exact match = rubber stamp warning
  INSERT INTO time_entries (confirmation_id, project_id, planned_hours, actual_hours, is_unplanned)
  VALUES
    (v_confirmation_id, v_project_id, 40, 40, false);

  RAISE NOTICE 'Created rubber-stamp warning approval for user %', v_user_id;
END $$;

-- Verify the test data
SELECT
  tc.id,
  u.name as employee,
  tc.week_start,
  tc.status,
  tc.notes,
  tc.exact_match_flag,
  COALESCE(SUM(te.planned_hours), 0) as total_planned,
  COALESCE(SUM(te.actual_hours), 0) as total_actual
FROM time_confirmations tc
JOIN users u ON tc.user_id = u.id
LEFT JOIN time_entries te ON tc.id = te.confirmation_id
WHERE tc.status = 'submitted'
GROUP BY tc.id, u.name, tc.week_start, tc.status, tc.notes, tc.exact_match_flag
ORDER BY tc.submitted_at DESC;
