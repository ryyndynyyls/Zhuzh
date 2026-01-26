# Cowork Phase 3: React Components

## CRITICAL: Write Files Directly

**DO NOT just generate content and ask what to do. WRITE ALL FILES DIRECTLY TO DISK.**

After completing each component, verify the file exists. Do not mark complete until written.

---

## Working Directory
`/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/`

## Context Files (Read First)
1. `docs/implementation-plan.md` — Component specs with props
2. `docs/component-patterns.md` — Color palette, status patterns
3. `src/types/database.ts` — TypeScript interfaces (from Phase 2)
4. `prototypes/app-full.jsx` — Visual reference
5. `COWORK_STATUS.md` — Update this as you work!

---

## Setup First

**WRITE:** `src/components/index.ts` — Barrel export file (update as you add components)

**WRITE:** `src/theme.ts` — MUI theme with ResourceFlow colors:
```typescript
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    success: { main: '#4caf50' },  // On track
    warning: { main: '#ff9800' },  // At risk  
    error: { main: '#f44336' },    // Over budget
  },
});
```

---

## Task 3A: Budget Dashboard (Michelle's Domain)

**WRITE TO:** `src/components/BudgetDashboard.tsx`

The main budget view showing all project health at a glance.

**Features:**
- Grid of BudgetCard components
- Filter by: status, client, health (on-track/at-risk/over)
- Search by project name
- Role-based display (employees see hours, managers see dollars)
- Export to CSV button

**Props:**
```typescript
interface BudgetDashboardProps {
  userRole: 'employee' | 'pm' | 'admin';
}
```

**Also write:** `src/components/BudgetCard.tsx`
- Project name, client
- LinearProgress showing burn rate
- Color coded: green (<75%), yellow (75-90%), red (>90%)
- Shows "X of Y hours" or "$X of $Y" based on role
- Health chip (On Track, At Risk, Over Budget)

**Reference:** See `docs/component-patterns.md` for color patterns.

---

## Task 3B: Approval Queue (Michelle's Domain)

**WRITE TO:** `src/components/ApprovalQueue.tsx`

Manager view for reviewing submitted timesheets.

**Features:**
- Stats cards at top: Pending, Approved Today, Flagged
- List of ApprovalCard components
- Bulk select with "Approve Selected" button
- Filter by: employee, date range, flagged only

**Warning Badges to Show:**
- 🟡 **Variance Warning:** Actual differs from planned by >10%
- 🔴 **Rubber-Stamp Warning:** Actual = planned exactly (suspicious)
- Employee notes if present

**Also write:** `src/components/ApprovalCard.tsx`
- Employee avatar and name
- Submission timestamp
- Table: Project | Planned | Actual | Variance
- Warning badges
- Notes section (if present)
- Action buttons: Approve, Reject, View Details

**Also write:** `src/components/RejectionDialog.tsx`
- Modal dialog
- Required textarea for rejection reason
- Cancel / Reject buttons

---

## Task 3C: Employee Timesheet (Kara's Domain)

**WRITE TO:** `src/components/ConfirmModal.tsx`

The "Confirm Your Week" interface (used in web app, mirrors Slack modal).

**Features:**
- Week selector at top
- Table of allocations with editable actual hours
- Variance column (auto-calculated)
- "Add Unplanned Work" button
- Notes textarea
- Submit button (disabled if no changes or already submitted)
- Status indicator (Draft, Submitted, Approved, Rejected)

**Also write:** `src/components/TimeEntryRow.tsx`
- Project color dot + name
- Phase (if applicable)
- Planned hours (read-only)
- Actual hours (editable input)
- Variance display (green if match, yellow if small diff, red if >10%)
- Notes icon (if entry has notes)

**Also write:** `src/components/AddUnplannedWorkModal.tsx`
- Project dropdown (searchable)
- Phase dropdown (optional, based on project)
- Hours input
- Description textarea
- Quick tags: Urgent fix, Client call, Tech debt, Scope creep
- Add / Cancel buttons

---

## Task 3D: Company Dashboard

**WRITE TO:** `src/components/CompanyDashboard.tsx`

High-level overview for leadership (Levi's view).

**Features:**
- Summary cards: Total Projects, At Risk, Team Utilization %
- Projects table with sortable columns
- Priority column (drag to reorder - or just display)
- Quick health indicators per project
- Link to drill into BudgetDashboard

**Columns:**
- Priority rank
- Project name + client
- Budget (hours or $)
- Burn rate (progress bar)
- Health status
- Team members (avatar group)

---

## Task 3E: Supporting Components

**WRITE TO:** `src/components/shared/`

Create these utility components:

**`StatusChip.tsx`**
- Props: `status: 'draft' | 'submitted' | 'approved' | 'rejected'`
- Renders MUI Chip with appropriate color

**`HealthIndicator.tsx`**
- Props: `health: 'on-track' | 'at-risk' | 'over-budget'`
- Small colored dot or badge

**`WeekPicker.tsx`**
- Props: `value: Date`, `onChange: (date: Date) => void`
- Week selector (Monday-based)
- Previous/Next week arrows

**`AvatarGroup.tsx`**
- Props: `users: User[]`, `max?: number`
- Shows overlapping avatars with +N overflow

**`VarianceDisplay.tsx`**
- Props: `planned: number`, `actual: number`
- Shows difference with color coding
- "+2h" in red, "-1h" in green, "0" in gray

---

## Task 3F: App Shell

**WRITE TO:** `src/components/AppShell.tsx`

Main layout wrapper.

**Features:**
- Sidebar navigation (collapsible)
- Header with user menu
- Main content area
- Role-based menu items

**Navigation Items:**
- Dashboard (home icon) — goes to CompanyDashboard
- My Timesheet (clock icon) — goes to ConfirmModal
- Approvals (checkmark icon) — managers only
- Budget (chart icon) — goes to BudgetDashboard
- Team Calendar (calendar icon) — Phase 2 feature, show disabled

**Also write:** `src/components/Sidebar.tsx`
- Logo at top
- Navigation list
- User info at bottom
- Collapse button

---

## Styling Notes

Use MUI components throughout:
- `Card`, `CardContent`, `CardActions` for cards
- `DataGrid` from `@mui/x-data-grid` for tables
- `LinearProgress` for budget bars
- `Chip` for status badges
- `Avatar`, `AvatarGroup` for users
- `Dialog` for modals
- `TextField`, `Select` for forms

Follow patterns from `docs/component-patterns.md`.

---

## Status Updates

As you work, update `COWORK_STATUS.md`:
1. Change ⬜ to 🔄 when starting a task
2. Change 🔄 to ✅ when complete
3. Add completion timestamps
4. Note any decisions made

---

## Completion Checklist

Before finishing, verify ALL files exist:

```bash
ls -la src/components/*.tsx
ls -la src/components/shared/*.tsx
ls -la src/theme.ts
```

**Expected files:**
- [ ] `src/theme.ts`
- [ ] `src/components/index.ts`
- [ ] `src/components/AppShell.tsx`
- [ ] `src/components/Sidebar.tsx`
- [ ] `src/components/BudgetDashboard.tsx`
- [ ] `src/components/BudgetCard.tsx`
- [ ] `src/components/ApprovalQueue.tsx`
- [ ] `src/components/ApprovalCard.tsx`
- [ ] `src/components/RejectionDialog.tsx`
- [ ] `src/components/ConfirmModal.tsx`
- [ ] `src/components/TimeEntryRow.tsx`
- [ ] `src/components/AddUnplannedWorkModal.tsx`
- [ ] `src/components/CompanyDashboard.tsx`
- [ ] `src/components/shared/StatusChip.tsx`
- [ ] `src/components/shared/HealthIndicator.tsx`
- [ ] `src/components/shared/WeekPicker.tsx`
- [ ] `src/components/shared/AvatarGroup.tsx`
- [ ] `src/components/shared/VarianceDisplay.tsx`

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
- ✅ Use TypeScript interfaces from `src/types/database.ts`
