# ResourceFlow Cowork Tasks — January 15, 2026

**Created by:** Ryan + Claude  
**Purpose:** Agentic work while Ryan is in meeting  
**Estimated time:** 1 hour

---

## Context

ResourceFlow is a Slack-first timekeeping tool for Use All Five (~30 person agency).

**What's working:**
- Web app on port 3001, Slack bot, API server on port 3002
- Google Calendar OAuth connected
- Gemini calendar config generation (85% confidence)
- Budget Dashboard, Company Dashboard, My Timesheet
- `/week` Slack command with confirmation modal

**What's broken:**
- Approvals page shows "Failed to fetch approvals" — likely RLS policy issue

**Key files:**
- `src/pages/ApprovalsPage.tsx` — Approvals UI
- `src/hooks/useConfirmations.ts` — Data fetching hooks
- `src/pages/SettingsPage.tsx` — Calendar config display
- `src/lib/gemini.ts` — Gemini AI integration
- `src/api/server.ts` — Express API server (port 3002)

---

## Task 1: Fix Approvals Page RLS Issue

**Priority:** HIGH (blocks core workflow)  
**Estimated time:** 15 min

The Approvals page fails with "Failed to fetch approvals". The `usePendingApprovals` hook queries Supabase directly but likely hits RLS (Row Level Security) restrictions.

**Steps:**
1. Check RLS policies on `time_confirmations` table
2. Either:
   - Add appropriate RLS policies for admins/PMs to view all org confirmations
   - OR use the service role key via the API server (preferred for admin views)
3. Test that approvals load correctly

**SQL to check current policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'time_confirmations';
```

**Option A - Add RLS Policy:**
```sql
-- Allow admins and PMs to view all confirmations in their org
CREATE POLICY "Admins can view org confirmations" ON time_confirmations
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE org_id = (
        SELECT org_id FROM users WHERE id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'pm')
    )
  );
```

**Option B - Add API endpoint (preferred):**
Add `/api/approvals` to `server.ts` that uses service role key.

**Verify:** Navigate to http://localhost:3001/approvals — should show pending timesheets (or empty state if none)

---

## Task 2: Display "Your Description" in Calendar Config

**Priority:** LOW (cosmetic)  
**Estimated time:** 5 min

In the Settings page, the "Your Description" section shows empty. The config is saved with `admin_description` but it's not displaying.

**File:** `src/pages/SettingsPage.tsx`

**Issue:** The description field is rendered but may be falsy. Check the config object structure.

**Fix:** Ensure the description renders correctly:
```tsx
{config.admin_description && (
  <>
    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
      Your Description
    </Typography>
    <Typography variant="body2" sx={{ 
      bgcolor: 'grey.100', 
      p: 1.5, 
      borderRadius: 1,
      fontStyle: 'italic',
      whiteSpace: 'pre-wrap',
    }}>
      "{config.admin_description}"
    </Typography>
  </>
)}
```

**Verify:** Settings page shows the admin's description in the config summary

---

## Task 3: Add PTO Visibility to Dashboard

**Priority:** MEDIUM (Phase 1 feature, 5.0 score)  
**Estimated time:** 25 min

The calendar is connected and config is generated. Now we need to actually SHOW who's on PTO in the Dashboard and team views.

**Goal:** Add a "Who's Out" section to the Company Dashboard showing:
- People on PTO today/this week
- Upcoming PTO (next 7 days)
- Holiday indicators

**Steps:**

1. **Add API endpoint** to `server.ts`:
```typescript
/**
 * Get team PTO/OOO status
 * GET /api/calendar/team-pto?orgId=xxx&start=2026-01-15&end=2026-01-22
 */
app.get('/api/calendar/team-pto', async (req, res) => {
  const { orgId, start, end } = req.query;
  
  // Get all users with connected calendars
  const { data: users } = await supabase
    .from('users')
    .select('id, name, google_access_token, google_refresh_token, google_token_expiry')
    .eq('org_id', orgId)
    .eq('google_calendar_connected', true);
  
  // Get org calendar config
  const { data: config } = await supabase
    .from('org_calendar_config')
    .select('*')
    .eq('org_id', orgId)
    .single();
  
  // Fetch and classify events for each user
  const teamPto = [];
  for (const user of users || []) {
    // Get user's calendar events
    // Classify using config rules
    // Add to teamPto if PTO/holiday
  }
  
  res.json({ teamPto });
});
```

2. **Add "Who's Out" component** to Dashboard:
```tsx
// src/components/WhosOut.tsx
function WhosOut({ orgId }: { orgId: string }) {
  const [ptoData, setPtoData] = useState([]);
  
  useEffect(() => {
    // Fetch from /api/calendar/team-pto
  }, [orgId]);
  
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Who's Out</Typography>
      {/* Show avatars/names of people on PTO */}
    </Paper>
  );
}
```

3. **Add to Company Dashboard** in `src/pages/DashboardPage.tsx`

**Verify:** Dashboard shows "Who's Out" section with any PTO from connected calendars

---

## Task 4: Create Seed Data for Testing Approvals

**Priority:** MEDIUM (enables testing)  
**Estimated time:** 10 min

To test the Approvals page, we need submitted timesheets.

**Create test data:**
```sql
-- Create a submitted timesheet for testing
INSERT INTO time_confirmations (user_id, week_start, status, submitted_at, notes)
SELECT id, '2026-01-13', 'submitted', NOW(), 'Test submission'
FROM users WHERE email = 'ryand@useallfive.com'
RETURNING id;

-- Add time entries for that confirmation (use the returned ID)
-- INSERT INTO time_entries (confirmation_id, project_id, planned_hours, actual_hours, is_unplanned)
-- VALUES ('CONFIRMATION_ID', 'PROJECT_ID', 40, 42, false);
```

Or create via the `/week` Slack command and submit a timesheet.

---

## Task 5: Add PTOverlap Detection Endpoint

**Priority:** MEDIUM (Phase 1 feature)  
**Estimated time:** 15 min

PTOverlap = when multiple people with similar roles have overlapping PTO, creating coverage gaps.

**Add to `server.ts`:**
```typescript
/**
 * Detect PTO overlaps for coverage risks
 * GET /api/calendar/pto-overlap?orgId=xxx&start=2026-01-15&end=2026-01-31
 */
app.get('/api/calendar/pto-overlap', async (req, res) => {
  // 1. Get all PTO events for date range
  // 2. Group users by role/department
  // 3. Find overlapping PTO within same role groups
  // 4. Flag as risk if >50% of role is out simultaneously
  
  res.json({ overlaps: [] });
});
```

---

## Completion Checklist

When tasks are done, update:

1. **SESSION_STATUS.md** — Mark what was completed
2. **Test the changes:**
   - Approvals page loads without error
   - Settings shows admin description
   - Dashboard shows "Who's Out" (if implemented)

---

## Commands Reference

```bash
# Start all services (3 terminals)
cd /Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow && npm run dev
cd /Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow && npm run slack:dev
cd /Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow && npm run api:dev

# Test Gemini config
curl -s http://localhost:3002/api/calendar/config?orgId=00000000-0000-0000-0000-000000000000

# Test approvals (after fix)
curl -s "http://localhost:3002/api/approvals?orgId=00000000-0000-0000-0000-000000000000"
```

---

## Notes

- Supabase project: `ovyppexeqwwaghwddtip`
- Org UUID: `00000000-0000-0000-0000-000000000000`
- Ryan's user ID: Check `users` table for `ryand@useallfive.com`
- API server handles service role operations (bypasses RLS)
