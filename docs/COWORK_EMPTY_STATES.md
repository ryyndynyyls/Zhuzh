# Cowork Task: Empty States

**Created:** 2026-01-22
**Estimated time:** 1-1.5 hours
**Why Cowork:** Multiple pages, independent, design-focused, pattern-based

---

## Context

When pages have no data, they currently show nothing or a bare "No items" message. Good empty states guide users on what to do next and make the app feel polished.

**Key files:**
- `src/styles/tokens.ts` — Design tokens
- `src/styles/animations.ts` — Fade-in animations
- Various page files (listed below)

---

## Design Principles

1. **Helpful, not just decorative** — Tell users what this page is for and how to get started
2. **Consistent pattern** — Same visual structure across all empty states
3. **Use brand personality** — Warm, encouraging, not robotic
4. **Actionable** — Include a CTA button when relevant
5. **Use design tokens** — No hardcoded colors

---

## Empty State Component

Create a reusable component first:

**File:** `src/components/EmptyState.tsx`

```tsx
import { Box, Typography, Button } from '@mui/material';
import { colors, spacing, typography } from '../styles/tokens';
import { pageFadeIn } from '../styles/animations';

interface EmptyStateProps {
  icon?: React.ReactNode;        // Optional icon or illustration
  title: string;                  // "No projects yet"
  description: string;            // "Create your first project to start tracking budgets"
  actionLabel?: string;           // "Create Project"
  onAction?: () => void;          // Click handler
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  secondaryAction 
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        ...pageFadeIn,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: spacing[12],
        px: spacing[4],
        maxWidth: 400,
        mx: 'auto',
      }}
    >
      {icon && (
        <Box sx={{ 
          mb: spacing[4], 
          color: colors.dark.text.tertiary,
          fontSize: 48,
        }}>
          {icon}
        </Box>
      )}
      
      <Typography 
        variant="h6" 
        sx={{ 
          color: colors.dark.text.primary,
          mb: spacing[2],
          fontWeight: typography.fontWeight.semibold,
        }}
      >
        {title}
      </Typography>
      
      <Typography 
        variant="body2" 
        sx={{ 
          color: colors.dark.text.secondary,
          mb: actionLabel ? spacing[5] : 0,
          lineHeight: typography.lineHeight.relaxed,
        }}
      >
        {description}
      </Typography>
      
      {actionLabel && onAction && (
        <Button 
          variant="contained" 
          color="primary"
          onClick={onAction}
          sx={{ mb: secondaryAction ? spacing[2] : 0 }}
        >
          {actionLabel}
        </Button>
      )}
      
      {secondaryAction && (
        <Button 
          variant="text" 
          size="small"
          onClick={secondaryAction.onClick}
          sx={{ color: colors.dark.text.secondary }}
        >
          {secondaryAction.label}
        </Button>
      )}
    </Box>
  );
}
```

---

## Subtasks (Run in Parallel)

### Subtask 1: Dashboard Empty State
**File:** `src/pages/DashboardPage.tsx`
**Time:** 10 min

When: No allocations for current user this week

```tsx
<EmptyState
  icon={<CalendarIcon />}  // or relevant MUI icon
  title="No hours planned this week"
  description="You don't have any allocations scheduled. Check with your PM or enjoy the downtime!"
/>
```

Note: Dashboard likely always has data (metrics), so this may only apply to a specific section.

### Subtask 2: Budget Page Empty State
**File:** `src/pages/BudgetPage.tsx` or `src/components/BudgetDashboard.tsx`
**Time:** 15 min

When: No projects exist

```tsx
<EmptyState
  icon={<FolderIcon />}
  title="No projects yet"
  description="Create your first project to start tracking budgets and allocations."
  actionLabel="Create Project"
  onAction={() => navigate('/projects/new')} // or open modal
/>
```

Also handle: Projects exist but all are archived
```tsx
<EmptyState
  title="All projects archived"
  description="Your active projects will appear here. Restore archived projects from the admin panel."
  actionLabel="View Archives"
  onAction={() => navigate('/admin/archives')}
/>
```

### Subtask 3: Approvals Page Empty State
**File:** `src/pages/ApprovalsPage.tsx` or `src/components/ApprovalQueue.tsx`
**Time:** 15 min

When: No pending approvals

```tsx
<EmptyState
  icon={<CheckCircleIcon />}
  title="All caught up!"
  description="No timesheets waiting for approval. Your team's hours are confirmed."
/>
```

This is a positive empty state — celebrate the inbox zero feeling.

### Subtask 4: Team Page Empty State
**File:** `src/pages/TeamPage.tsx`
**Time:** 10 min

When: No team members (unlikely but handle it)

```tsx
<EmptyState
  icon={<PeopleIcon />}
  title="No team members"
  description="Team members will appear here once they're added to the system."
  actionLabel="Add Team Member"
  onAction={() => openAddMemberModal()}
/>
```

### Subtask 5: Timesheet Page Empty State
**File:** `src/pages/TimesheetPage.tsx`
**Time:** 15 min

When: No allocations for selected week

```tsx
<EmptyState
  icon={<EventBusyIcon />}
  title="No hours planned"
  description="You don't have any allocations for this week. If this seems wrong, reach out to your PM."
  secondaryAction={{
    label: "View a different week",
    onClick: () => openWeekPicker()
  }}
/>
```

### Subtask 6: Resources/Calendar Empty State
**File:** `src/pages/ResourceCalendarPage.tsx`
**Time:** 10 min

When: No allocations visible in current view

```tsx
<EmptyState
  icon={<CalendarTodayIcon />}
  title="No allocations in this view"
  description="Try adjusting the date range or filters to see scheduled work."
/>
```

### Subtask 7: Project Settings - Phases Empty State
**File:** `src/pages/ProjectSettingsPage.tsx`
**Time:** 10 min

When: Project has no phases

```tsx
<EmptyState
  icon={<LayersIcon />}
  title="No phases yet"
  description="Break this project into phases to track budgets more granularly."
  actionLabel="Add Phase"
  onAction={() => openAddPhaseModal()}
/>
```

---

## Icon Suggestions

Use MUI icons (`@mui/icons-material`):

| Context | Icon |
|---------|------|
| Projects/Budget | `FolderOutlined`, `WorkOutline` |
| Approvals | `CheckCircleOutline`, `ThumbUpOutlined` |
| Team | `PeopleOutlined`, `GroupOutlined` |
| Calendar/Time | `CalendarTodayOutlined`, `EventBusyOutlined` |
| Phases | `LayersOutlined`, `AccountTreeOutlined` |
| General empty | `InboxOutlined`, `SearchOffOutlined` |

---

## Verification

```bash
cd ~/Claude-Projects-MCP/ResourceFlow && npm run dev
```

For each page, temporarily force empty state (comment out data or filter to empty) and verify:
1. Empty state renders centered
2. Animation plays on mount
3. Action button works (if present)
4. Responsive on mobile widths

---

## Success Criteria

- [ ] `EmptyState` component created and exported
- [ ] Budget page has empty state
- [ ] Approvals page has empty state (positive messaging)
- [ ] Team page has empty state
- [ ] Timesheet page has empty state
- [ ] Resources page has empty state
- [ ] Project Settings phases has empty state
- [ ] All empty states use design tokens
- [ ] Action buttons work where applicable
- [ ] No TypeScript errors

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md`
2. List which pages got empty states
3. Note any pages skipped and why
