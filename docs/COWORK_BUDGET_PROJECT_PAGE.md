# Cowork Task: Budget Project Detail Page

**Created:** 2026-01-21
**Estimated time:** 45-60 min
**Why Cowork:** Multi-file task with new page, route, and API considerations

---

## Context

The Budget Dashboard shows project cards, but clicking them does nothing. Users need to drill into each project to see:
- Detailed budget breakdown by phase
- Week-by-week burn history
- Team member hours on this project
- Edit capabilities for budget and phases

This was discussed with Michelle (approvals/dashboards) and Levi (strategic vision) as a key feature for project managers to track budget health.

**Reference:** See screenshot at `/mnt/user-data/uploads/Screenshot_2026-01-21_at_3_40_30_PM.png`

---

## Key Files

- `src/pages/BudgetDashboard.tsx` — Current dashboard (add click handlers)
- `src/pages/BudgetProjectPage.tsx` — NEW: Detail page to create
- `src/App.tsx` — Add route `/budget/:projectId`
- `src/api/routes/projects.ts` — Has `/api/projects/:id/phases` and `/api/projects/:id/drilldown` endpoints

---

## Existing API Endpoints (already built)

```
GET /api/projects/:id — Project details
GET /api/projects/:id/phases — Phase breakdown with budget metrics
GET /api/projects/:id/drilldown?weeks=8 — Week-by-week breakdown
```

---

## Subtasks

### Subtask 1: Make Project Cards Clickable

In `src/pages/BudgetDashboard.tsx`:
- Wrap each project card in a clickable container
- Navigate to `/budget/${project.id}` on click
- Add hover cursor and subtle hover effect

### Subtask 2: Create BudgetProjectPage Component

Create `src/pages/BudgetProjectPage.tsx` with:

**Header Section:**
- Back button (← Budget Dashboard)
- Project name + client name
- Status chip (On Track / At Risk / Over Budget)
- Edit button (opens edit dialog)

**Budget Overview Card:**
- Total budget (hours and dollars)
- Total spent (hours and dollars)
- Remaining (hours and dollars)
- Burn percentage with progress bar
- Burn rate (hours/week average)

**Phase Breakdown Table:**
- Phase name, budget hours, spent hours, remaining, status
- Progress bar per phase
- Click phase to expand (show team members on that phase)
- Add Phase button
- Edit phase budgets inline

**Weekly Burn Chart:**
- Line/bar chart showing planned vs actual per week
- Use data from `/api/projects/:id/drilldown`
- Highlight variance weeks

**Team Hours Section:**
- Table of team members working on this project
- Show: Name, Role, Hours this month, Total hours
- Click name → TeamMemberModal

### Subtask 3: Add Route

In `src/App.tsx`:
```tsx
<Route path="/budget/:projectId" element={<BudgetProjectPage />} />
```

Import and add the new page.

### Subtask 4: Add Edit Project Dialog

Create inline or modal edit for:
- Project name
- Budget hours
- Hourly rate
- Status (active/complete/on-hold)

Use PATCH `/api/projects/:id` endpoint.

### Subtask 5: Add/Edit Phase Dialog

- Phase name
- Budget hours
- Status

Use existing phase endpoints:
- POST `/api/projects/:id/phases` — Create
- PATCH `/api/projects/:id/phases/:phaseId` — Update (may need to create)

---

## Design Guidelines

- Match existing dark theme (bg: #1a1a1a, cards: #2A2520)
- Use MUI components consistently
- Orange accent (#FF8731) for primary actions
- Status colors: green (healthy), yellow (warning), red (over budget)

---

## Verification

1. Click a project on `/budget` → navigates to `/budget/:projectId`
2. Page loads with project data, phases, and weekly chart
3. Edit project → saves and reflects changes
4. Add phase → appears in list
5. Back button returns to dashboard

---

## Success Criteria

- [ ] Project cards are clickable on Budget Dashboard
- [ ] BudgetProjectPage renders with all sections
- [ ] Phase breakdown table works
- [ ] Weekly burn chart displays
- [ ] Edit project functionality works
- [ ] Add/edit phase functionality works
- [ ] Back navigation works
- [ ] Responsive on different screen sizes

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md`
2. Note any API changes in `docs/live-sync-doc.md`
