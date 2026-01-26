# Cowork Task Queue

**Created:** 2026-01-15
**Purpose:** Parallel tasks for Cowork while main session continues

---

## 🔴 Priority 1: Slack Button Handlers

**Task ID:** SLACK-HANDLERS
**Time Estimate:** 45-60 min
**Dependencies:** None

The Friday/Monday DMs send but buttons don't work. Build handlers for:

### Files to Create

**`src/slack/actions/confirmWeek.ts`**
```typescript
// Handler for "Looks Good ✓" button
// 1. Get user's allocations for the week
// 2. Create time_confirmation record with status='submitted'
// 3. Create time_entries from allocations (actual = planned)
// 4. Update Slack message to show "Confirmed ✓"
// 5. Notify manager if needed
```

**`src/slack/actions/adjustHours.ts`**
```typescript
// Handler for "Adjust Hours" button
// 1. Open modal with pre-filled hours from allocations
// 2. User edits hours, adds notes
// 3. On submit: create time_confirmation + time_entries
// 4. Update Slack message to show "Submitted"
```

**`src/slack/actions/approveTime.ts`**
```typescript
// Handler for manager "Approve ✓" button
// 1. Update time_confirmation status='approved'
// 2. Set approved_by, approved_at
// 3. Update Slack message to show "Approved by [name]"
```

**`src/slack/actions/rejectTime.ts`**
```typescript
// Handler for manager "Reject" button
// 1. Open modal for rejection reason
// 2. Update time_confirmation status='rejected'
// 3. Notify employee with reason
```

**`src/slack/actions/index.ts`**
- Export all handlers
- Register with Slack app

### Slack Modal Views

**`src/slack/views/adjustHoursModal.ts`**
- Input fields for each project's hours
- Notes field
- Pre-populated from allocations

**`src/slack/views/rejectReasonModal.ts`**
- Text area for rejection reason
- Confirm button

### Integration
Update `src/slack/app.ts` to register all action handlers.

---

## 🔴 Priority 2: Budget Alerts System

**Task ID:** BUDGET-ALERTS
**Time Estimate:** 30-45 min
**Dependencies:** None

Create system to alert when projects hit 75% and 90% budget thresholds.

### Files to Create

**`src/lib/budget-alerts.ts`**
```typescript
// Check all active projects for budget thresholds
// Returns projects that crossed 75% or 90% since last check

interface BudgetAlert {
  projectId: string;
  projectName: string;
  threshold: 75 | 90;
  currentBurn: number;
  budgetAmount: number;
}

export async function checkBudgetThresholds(): Promise<BudgetAlert[]>
export async function sendBudgetAlerts(alerts: BudgetAlert[]): Promise<void>
```

**`src/slack/scheduled/budgetAlerts.ts`**
```typescript
// Scheduled job to check budgets daily at 9am
// Send Slack DM to project owners for alerts
```

**Database: Add tracking table**
```sql
CREATE TABLE budget_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  threshold INT, -- 75 or 90
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  notified_user_id UUID REFERENCES users(id)
);
```

---

## 🟡 Priority 3: Add Unplanned Work Modal

**Task ID:** UNPLANNED-WORK
**Time Estimate:** 30 min
**Dependencies:** SLACK-HANDLERS

Allow employees to add work that wasn't allocated.

### Files to Create

**`src/slack/commands/addTime.ts`**
```typescript
// /add-time command
// Opens modal to log unplanned work
```

**`src/slack/views/addUnplannedModal.ts`**
- Project selector (searchable)
- Hours input
- Notes field
- Date picker (defaults to today)

### On Submit
- Create time_entry with is_unplanned=true
- Add to existing time_confirmation or create new one
- Notify manager of unplanned work

---

## 🟡 Priority 4: Dashboard Integration

**Task ID:** DASHBOARD-INTEGRATION  
**Time Estimate:** 45 min
**Dependencies:** Report components built ✅

Wire up the new report components to the main dashboard.

### Files to Modify

**`src/pages/Dashboard.tsx`** (or similar)
- Add tabs/nav for: Projects | Phases | People | Roles
- Import ReportSelector from reports components
- Add routes for each view

**`src/pages/reports/PhasesPage.tsx`**
- Project selector
- PhaseBreakdown component

**`src/pages/reports/PeoplePage.tsx`**
- Person selector
- PersonSummary component

**`src/pages/reports/RolesPage.tsx`**
- Role selector
- RoleSummary component

---

## 🟡 Priority 5: Populate User Disciplines

**Task ID:** USER-DISCIPLINES
**Time Estimate:** 15 min
**Dependencies:** None

The role_project_summary view needs user.discipline populated.

### Script to Create

**`scripts/populate-disciplines.ts`**
```typescript
// Map 10kft roles to disciplines
// Designer, Developer, ProStrat, Producer, etc.
// Update users table with discipline field
```

### Manual Mapping (if 10kft doesn't have roles)
```typescript
const disciplineMap: Record<string, string> = {
  'andrew@useallfive.com': 'Designer',
  'bret@useallfive.com': 'Developer',
  'jason@useallfive.com': 'Developer',
  // ... etc
};
```

---

## 🟢 Priority 6: Audit Trail UI

**Task ID:** AUDIT-TRAIL-UI
**Time Estimate:** 30 min
**Dependencies:** None

SQL view exists (`budget_audit_trail`). Build the UI.

### Files to Create

**`src/components/AuditTrail.tsx`**
- Timeline view of changes
- Filter by: project, user, date range
- Shows: who changed what, when, old vs new values

**`src/pages/AuditPage.tsx`**
- Full page audit view
- Drill-down from dashboard

---

## Execution Order

1. **SLACK-HANDLERS** — Unblocks the entire Friday flow
2. **BUDGET-ALERTS** — High-value, independent
3. **UNPLANNED-WORK** — Depends on handlers
4. **DASHBOARD-INTEGRATION** — Components ready, just wire up
5. **USER-DISCIPLINES** — Quick win for role views
6. **AUDIT-TRAIL-UI** — Lower priority but requested

---

## How to Assign to Cowork

Copy one task section and tell Cowork:
> "Complete task [TASK-ID]. Create all files listed. Follow the patterns in existing code."

For best results:
- One task at a time
- Explicit file paths
- Show expected function signatures
- Include integration steps
