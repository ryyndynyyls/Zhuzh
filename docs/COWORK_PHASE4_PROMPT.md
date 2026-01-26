# Cowork Phase 4: Slack Integration

## CRITICAL: Write Files Directly

**DO NOT just generate content and ask what to do. WRITE ALL FILES DIRECTLY TO DISK.**

After completing each task, verify the file exists. Do not mark complete until written.

---

## Working Directory
`/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/`

## Context Files (Read First)
1. `docs/implementation-plan.md` — Slack interactions spec (Section 4)
2. `src/types/database.ts` — TypeScript interfaces
3. `src/api/` — API routes to call
4. `COWORK_STATUS.md` — Update this as you work!

---

## Task 4A: Slack Bolt App Setup

**WRITE TO:** `src/slack/app.ts`

Main Bolt app configuration:

```typescript
import { App } from '@slack/bolt';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  // Socket mode for development
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Register commands
// ... import and register

export default app;
```

**Also write:** `src/slack/types.ts`
- Slack-specific type definitions
- Block Kit payload types

**Also write:** `src/slack/blocks/index.ts`
- Reusable Block Kit builder functions
- `buildConfirmationBlocks(allocations)`
- `buildApprovalBlocks(confirmation)`
- `buildBudgetBlocks(project)`

---

## Task 4B: Slash Commands

**WRITE TO:** `src/slack/commands/`

### `/week` Command
**File:** `src/slack/commands/week.ts`

Opens the "Confirm Your Week" modal for current week.

```typescript
app.command('/week', async ({ command, ack, client }) => {
  await ack();
  
  // Get user's allocations for current week
  // Open modal with confirmation form
  await client.views.open({
    trigger_id: command.trigger_id,
    view: buildConfirmWeekModal(allocations)
  });
});
```

**Features:**
- Default: current week
- `/week last` — previous week
- Shows planned allocations
- "Looks Good" vs "Adjust Hours" paths

### `/pending` Command
**File:** `src/slack/commands/pending.ts`

Shows pending approvals (PM/admin only).

```typescript
app.command('/pending', async ({ command, ack, respond }) => {
  await ack();
  
  // Check user role
  // Get pending confirmations
  // Respond with summary
  await respond({
    blocks: buildPendingApprovalBlocks(pending)
  });
});
```

### `/budget` Command
**File:** `src/slack/commands/budget.ts`

Quick budget status for a project.

```typescript
app.command('/budget', async ({ command, ack, respond }) => {
  await ack();
  
  const projectName = command.text;
  // Find project, get budget stats
  // Role-based: employees see hours, managers see dollars
  await respond({
    blocks: buildBudgetBlocks(project, userRole)
  });
});
```

---

## Task 4C: Modal Views

**WRITE TO:** `src/slack/views/`

### Confirm Week Modal
**File:** `src/slack/views/confirmWeek.ts`

```typescript
export function buildConfirmWeekModal(allocations: Allocation[], weekStart: Date) {
  return {
    type: 'modal',
    callback_id: 'confirm_week_submit',
    title: { type: 'plain_text', text: 'Confirm Your Week' },
    submit: { type: 'plain_text', text: 'Submit' },
    blocks: [
      // Week header
      // Allocation table with editable hours
      // Add Unplanned Work button
      // Notes textarea
    ]
  };
}
```

### Add Unplanned Work Modal
**File:** `src/slack/views/addUnplannedWork.ts`

```typescript
export function buildAddUnplannedWorkModal(projects: Project[]) {
  return {
    type: 'modal',
    callback_id: 'add_unplanned_submit',
    title: { type: 'plain_text', text: 'Add Unplanned Work' },
    blocks: [
      // Project select
      // Hours input
      // Description
      // Quick tags (checkboxes): Urgent fix, Client call, Tech debt, Scope creep
    ]
  };
}
```

### Approval Detail Modal
**File:** `src/slack/views/approvalDetail.ts`

For managers viewing submission details.

---

## Task 4D: View Submissions (Modal Handlers)

**WRITE TO:** `src/slack/handlers/`

### Modal Submit Handler
**File:** `src/slack/handlers/viewSubmissions.ts`

```typescript
app.view('confirm_week_submit', async ({ ack, body, view, client }) => {
  await ack();
  
  // Extract form values
  // Create/update time_confirmation
  // Create time_entries
  // Notify manager
});

app.view('add_unplanned_submit', async ({ ack, body, view }) => {
  await ack();
  
  // Add unplanned time entry
  // Update modal state
});
```

### Action Handlers
**File:** `src/slack/handlers/actions.ts`

```typescript
// "Looks Good" button - quick approve
app.action('looks_good', async ({ ack, body, client }) => {
  await ack();
  // Submit confirmation with actual = planned
});

// "Adjust Hours" button - open modal
app.action('adjust_hours', async ({ ack, body, client }) => {
  await ack();
  // Open confirm week modal
});

// Approve timesheet
app.action('approve_timesheet', async ({ ack, body, client }) => {
  await ack();
  // Update confirmation status
  // Notify employee
});

// Reject timesheet
app.action('reject_timesheet', async ({ ack, body, client }) => {
  await ack();
  // Open rejection reason modal
});
```

---

## Task 4E: Scheduled Messages

**WRITE TO:** `src/slack/scheduled/`

### Friday Confirmation DM
**File:** `src/slack/scheduled/fridayDM.ts`

```typescript
// Scheduled for Friday 3pm
export async function sendFridayConfirmationDMs(app: App) {
  // Get all users with allocations this week who haven't submitted
  // For each user, send DM with:
  // - "Time to confirm your week!"
  // - Table of planned hours
  // - [Looks Good ✓] [Adjust Hours] buttons
}
```

### Monday Scheduling DM
**File:** `src/slack/scheduled/mondayDM.ts`

```typescript
// Scheduled for Monday 9am
export async function sendMondaySchedulingDMs(app: App) {
  // Get all users with allocations for this week
  // For each user, send DM with:
  // - "Your week has been scheduled!"
  // - Table of project allocations
  // - [Looks Good] [View Details] [Flag Issue] buttons
}
```

### Friday Reminder DM
**File:** `src/slack/scheduled/fridayReminder.ts`

```typescript
// Scheduled for Friday 5pm
export async function sendFridayReminderDMs(app: App) {
  // Get users who still haven't submitted
  // Send reminder DM
}
```

---

## Task 4F: Notifications

**WRITE TO:** `src/slack/notifications/`

### Timesheet Submitted Notification
**File:** `src/slack/notifications/timesheetSubmitted.ts`

Notify manager when employee submits:
- Employee info
- Week summary
- Variance warnings (>10% diff)
- Rubber-stamp warning (actual = planned exactly)
- Approve/Reject buttons

### Budget Alert Notification
**File:** `src/slack/notifications/budgetAlert.ts`

Notify PM/admin when project hits 75% or 90%:
- Project name and current burn
- Projected completion
- "View Project" button

### Rejection Notification
**File:** `src/slack/notifications/rejected.ts`

Notify employee when rejected:
- "Your timesheet needs revision"
- Rejection reason
- "Edit Timesheet" button

---

## Status Updates

As you work, update `COWORK_STATUS.md`:
1. Change ⬜ to 🔄 when starting
2. Change 🔄 to ✅ when file is written AND verified
3. Add completion timestamps

---

## Completion Checklist

```bash
ls -la src/slack/*.ts
ls -la src/slack/commands/*.ts
ls -la src/slack/views/*.ts
ls -la src/slack/handlers/*.ts
ls -la src/slack/scheduled/*.ts
ls -la src/slack/notifications/*.ts
ls -la src/slack/blocks/*.ts
```

**Expected files:**
- [ ] `src/slack/app.ts`
- [ ] `src/slack/types.ts`
- [ ] `src/slack/blocks/index.ts`
- [ ] `src/slack/commands/week.ts`
- [ ] `src/slack/commands/pending.ts`
- [ ] `src/slack/commands/budget.ts`
- [ ] `src/slack/views/confirmWeek.ts`
- [ ] `src/slack/views/addUnplannedWork.ts`
- [ ] `src/slack/views/approvalDetail.ts`
- [ ] `src/slack/handlers/viewSubmissions.ts`
- [ ] `src/slack/handlers/actions.ts`
- [ ] `src/slack/scheduled/fridayDM.ts`
- [ ] `src/slack/scheduled/mondayDM.ts`
- [ ] `src/slack/scheduled/fridayReminder.ts`
- [ ] `src/slack/notifications/timesheetSubmitted.ts`
- [ ] `src/slack/notifications/budgetAlert.ts`
- [ ] `src/slack/notifications/rejected.ts`

Update `COWORK_STATUS.md` and `COWORK_TASKS.md` when done.

---

## DO NOT:
- ❌ Ask "would you like me to write this?"
- ❌ Generate content without saving it
- ❌ Mark tasks complete without verifying files exist
- ❌ Wait for permission to proceed

## DO:
- ✅ Write files directly to disk
- ✅ Verify files exist after writing
- ✅ Update status files as you go
- ✅ Complete all tasks autonomously
- ✅ Use TypeScript throughout
- ✅ Import types from `src/types/database.ts`
