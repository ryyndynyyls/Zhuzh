# Cowork Task: E2E Signal Path Testing & QA

**Created:** 2026-01-27
**Estimated time:** 60-90 min
**Why Cowork:** Comprehensive testing across multiple endpoints, database verification, timeout risk in regular chat

---

## Context

Zhuzh is production-ready on Railway. Before internal pilot launch, we need to verify the complete signal path — that data flows correctly from UI → API → Supabase → back to UI, with proper audit trails.

**Production URLs:**
- Web: https://zhuzh-production.up.railway.app
- API: https://zhuzh-api-production.up.railway.app
- Supabase: project `ovyppexeqwwaghwddtip`

**Test User:** Ryan (ryand@useallfive.com, user_id in users table)

---

## Subtasks

### Subtask 1: API Health & Database Connection

Verify production API can reach Supabase.

```bash
# Health check
curl https://zhuzh-api-production.up.railway.app/health

# Should return: { "status": "ok", "timestamp": "...", "database": "connected" }
```

**Verify in Supabase SQL Editor:**
```sql
-- Confirm core tables exist and have data
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'allocations', COUNT(*) FROM allocations
UNION ALL SELECT 'time_confirmations', COUNT(*) FROM time_confirmations
UNION ALL SELECT 'time_entries', COUNT(*) FROM time_entries;
```

**Success criteria:**
- [ ] /health returns 200 with database: connected
- [ ] All core tables exist with data

---

### Subtask 2: Allocation CRUD Signal Path

Test creating, reading, updating allocations via API.

**Get Ryan's user ID first:**
```sql
SELECT id, email, name FROM users WHERE email = 'ryand@useallfive.com';
```

**Get a test project ID:**
```sql
SELECT id, name FROM projects WHERE is_active = true LIMIT 5;
```

**Test allocation endpoints:**
```bash
# Get allocations for a user
curl "https://zhuzh-api-production.up.railway.app/api/allocations?userId=USER_ID_HERE"

# Get allocations for current week
curl "https://zhuzh-api-production.up.railway.app/api/allocations?week=current"
```

**Verify in Supabase after any UI changes:**
```sql
-- Check recent allocations
SELECT a.id, a.planned_hours, a.week_start, p.name as project, u.name as user
FROM allocations a
JOIN projects p ON a.project_id = p.id
JOIN users u ON a.user_id = u.id
ORDER BY a.updated_at DESC
LIMIT 10;
```

**Success criteria:**
- [ ] GET /api/allocations returns data
- [ ] Allocations created in UI appear in database
- [ ] updated_at timestamps are current

---

### Subtask 3: Timesheet Submission Signal Path

Test the core workflow: submit timesheet → creates confirmation + entries.

**Check existing confirmations:**
```sql
SELECT tc.id, tc.status, tc.week_start, tc.submitted_at, u.name
FROM time_confirmations tc
JOIN users u ON tc.user_id = u.id
ORDER BY tc.submitted_at DESC
LIMIT 10;
```

**Check time entries linked to confirmations:**
```sql
SELECT te.id, te.actual_hours, te.planned_hours, p.name as project, tc.status
FROM time_entries te
JOIN time_confirmations tc ON te.confirmation_id = tc.id
JOIN projects p ON te.project_id = p.id
ORDER BY te.created_at DESC
LIMIT 10;
```

**Test submission API (if endpoint exists):**
```bash
curl "https://zhuzh-api-production.up.railway.app/api/timesheets?userId=USER_ID&week=2026-01-20"
```

**Success criteria:**
- [ ] time_confirmations records exist with correct status
- [ ] time_entries link to confirmations via confirmation_id
- [ ] Submitted timesheets show status = 'submitted'

---

### Subtask 4: Approval Signal Path & Audit Trail

Test manager approval flow and verify audit trail.

**Check approval status changes:**
```sql
SELECT tc.id, tc.status, tc.approved_by, tc.approved_at, tc.rejection_reason,
       u.name as employee, approver.name as approver_name
FROM time_confirmations tc
JOIN users u ON tc.user_id = u.id
LEFT JOIN users approver ON tc.approved_by = approver.id
WHERE tc.status IN ('approved', 'rejected')
ORDER BY tc.approved_at DESC
LIMIT 10;
```

**Check audit trail table (if exists):**
```sql
-- Look for audit/history table
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%audit%' OR table_name LIKE '%history%';
```

**Success criteria:**
- [ ] Approved timesheets have approved_by and approved_at set
- [ ] Rejected timesheets have rejection_reason
- [ ] Audit trail captures who approved/rejected

---

### Subtask 5: Budget Calculations

Verify budget math is correct.

**Check project budget vs actuals:**
```sql
SELECT 
  p.name,
  p.budget_hours,
  COALESCE(SUM(te.actual_hours), 0) as total_actual_hours,
  p.budget_hours - COALESCE(SUM(te.actual_hours), 0) as remaining_hours
FROM projects p
LEFT JOIN time_entries te ON te.project_id = p.id
WHERE p.is_active = true AND p.budget_hours > 0
GROUP BY p.id, p.name, p.budget_hours
ORDER BY total_actual_hours DESC
LIMIT 10;
```

**Test budget API endpoint:**
```bash
curl "https://zhuzh-api-production.up.railway.app/api/projects/PROJECT_ID/budget"
```

**Success criteria:**
- [ ] Budget calculations match manual SQL totals
- [ ] API returns consistent budget data
- [ ] No negative remaining hours unless intentional

---

### Subtask 6: Repeat Last Week Feature

Test the new Repeat Last Week functionality.

**Check if allocations can be cloned:**
```sql
-- Get last week's allocations for a user
SELECT a.id, a.planned_hours, a.week_start, p.name
FROM allocations a
JOIN projects p ON a.project_id = p.id
WHERE a.user_id = 'USER_ID_HERE'
  AND a.week_start = (CURRENT_DATE - INTERVAL '7 days')::date - ((EXTRACT(DOW FROM CURRENT_DATE - INTERVAL '7 days')::int + 6) % 7)
ORDER BY p.name;
```

**Test repeat endpoint (if exists):**
```bash
curl -X POST "https://zhuzh-api-production.up.railway.app/api/allocations/repeat-week" \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID", "sourceWeek": "2026-01-20", "targetWeek": "2026-01-27"}'
```

**Success criteria:**
- [ ] Repeat Last Week creates new allocations
- [ ] New allocations have correct week_start
- [ ] Hours match source week

---

### Subtask 7: Realtime Sync Verification

Document how to test realtime (requires browser).

**Manual test steps for Ryan:**
1. Open https://zhuzh-production.up.railway.app in two browser tabs
2. Navigate to Resources page in both
3. In Tab 1: Change an allocation's hours
4. In Tab 2: Verify it updates without refresh

**Check Supabase Realtime is enabled:**
```sql
-- Check if realtime is enabled on key tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('allocations', 'time_confirmations', 'projects');
```

**Success criteria:**
- [ ] Realtime enabled on allocations table
- [ ] Changes propagate between tabs (manual verification needed)

---

### Subtask 8: RLS Policy Verification

Verify Row Level Security is working correctly.

**Check RLS status:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'projects', 'allocations', 'time_confirmations', 'time_entries');
```

**Check existing policies:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Success criteria:**
- [ ] RLS enabled on sensitive tables
- [ ] Policies exist for SELECT, INSERT, UPDATE
- [ ] Users can only see their org's data

---

## Verification Summary

After completing all subtasks, summarize findings:

| Test Area | Status | Notes |
|-----------|--------|-------|
| API Health | ⬜ | |
| Allocation CRUD | ⬜ | |
| Timesheet Submission | ⬜ | |
| Approval Flow | ⬜ | |
| Budget Calculations | ⬜ | |
| Repeat Last Week | ⬜ | |
| Realtime Sync | ⬜ | |
| RLS Policies | ⬜ | |

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md` with:
   - Test results summary
   - Any bugs found
   - Any data fixes needed

2. If issues found, create follow-up tasks or document fixes needed

---

*This comprehensive test ensures Zhuzh is ready for internal pilot launch.*
