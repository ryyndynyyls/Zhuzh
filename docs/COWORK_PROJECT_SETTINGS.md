# Cowork Task: Project Settings Page

**Created:** 2026-01-22
**Estimated time:** 2-3 hours
**Why Cowork:** Self-contained feature, multiple components, clear requirements

---

## Context

Project Settings is a critical gap. PMs currently cannot:
- Add/edit/delete phases within a project
- Set or modify phase budgets
- Edit project metadata (name, client, status)
- Archive projects from the UI

The route exists (`/projects/:projectId/settings`) but the page is incomplete.

**Key files:**
- `src/pages/ProjectSettingsPage.tsx` — Main page (exists, needs work)
- `src/api/server.ts` — API endpoints (may need additions)
- `src/styles/tokens.ts` — Design tokens to use

**Database tables:**
- `projects` — id, name, client_id, status, is_archived
- `phases` — id, project_id, name, budget_hours, budget_dollars, start_date, end_date
- `clients` — id, name

---

## Design Principles

1. Use design tokens from `src/styles/tokens.ts`
2. Match the Linear-inspired aesthetic from other pages
3. Tabs or sections for different settings areas
4. Inline editing where possible (click to edit)
5. Confirmation dialogs for destructive actions

---

## Subtasks

### Subtask 1: Project Metadata Section
**Time:** 30 min

Create editable fields for basic project info:

```tsx
// Fields needed:
- Project name (text input)
- Client (dropdown select from clients table)
- Status (dropdown: active, on_hold, completed)
- Project code/number (optional text)
- Notes (textarea, optional)
```

**UI Pattern:**
- Display mode: Show values as text
- Edit mode: Click "Edit" button to reveal form
- Save/Cancel buttons when editing
- Use `colors.dark.bg.secondary` card background

**API:** May need `PATCH /api/projects/:id` endpoint

### Subtask 2: Phases List with CRUD
**Time:** 1 hour

Display all phases for the project with ability to add/edit/delete.

**Phase fields:**
```tsx
interface Phase {
  id: string;
  name: string;
  budget_hours: number | null;
  budget_dollars: number | null;
  start_date: string | null;
  end_date: string | null;
}
```

**UI Components:**
1. **Phase list** — Table or card list showing all phases
   - Columns: Name, Budget Hours, Budget $, Date Range, Actions
   - Use monospace font for numbers
   - Staggered animation on load

2. **Add Phase button** — Opens modal or inline form
   - Fields: name (required), budget_hours, budget_dollars, start_date, end_date
   - Validation: name required, budgets must be positive

3. **Edit Phase** — Click row or edit icon to modify
   - Same fields as add
   - Pre-populated with current values

4. **Delete Phase** — Confirmation dialog required
   - Warning: "This will delete X allocations. Are you sure?"
   - Soft delete preferred (set deleted_at) or hard delete if no allocations

**API Endpoints needed:**
```
GET    /api/projects/:projectId/phases
POST   /api/projects/:projectId/phases
PATCH  /api/phases/:phaseId
DELETE /api/phases/:phaseId
```

Check if these exist in `server.ts` first. Add if missing.

### Subtask 3: Budget Summary Section
**Time:** 30 min

Show rollup of all phase budgets vs actuals:

```tsx
// Display:
- Total Budget Hours: sum of all phase budget_hours
- Total Budget $: sum of all phase budget_dollars
- Hours Used: sum of confirmed time entries
- Budget Remaining: total - used
- Burn rate indicator (on track, over, under)
```

**UI:**
- Card with key metrics
- Progress bar showing % consumed
- Color coding: green (<80%), yellow (80-100%), red (>100%)
- Use `typography.fontFamily.mono` for all numbers

**Data:** Query from existing endpoints or add summary endpoint

### Subtask 4: Danger Zone (Archive/Delete)
**Time:** 30 min

Section at bottom for destructive actions:

```tsx
// Actions:
- Archive Project — Soft delete, can be restored
- Delete Project — Hard delete (only if no time entries?)
```

**UI:**
- Red-tinted section (`colors.dark.error.bg`)
- Clear warning text
- Confirmation modal with project name typed to confirm
- "Type PROJECT_NAME to confirm" pattern

**API:**
```
POST /api/projects/:projectId/archive
POST /api/projects/:projectId/restore
DELETE /api/projects/:projectId (if implementing hard delete)
```

---

## Page Structure

```tsx
<ProjectSettingsPage>
  <PageHeader title="Project Settings" backLink="/budget" />
  
  <Tabs value={tab} onChange={setTab}>
    <Tab label="General" />
    <Tab label="Phases" />
    <Tab label="Budget" />
  </Tabs>
  
  <TabPanel value={0}>
    <ProjectMetadataSection />
  </TabPanel>
  
  <TabPanel value={1}>
    <PhasesSection />
  </TabPanel>
  
  <TabPanel value={2}>
    <BudgetSummarySection />
    <DangerZone />
  </TabPanel>
</ProjectSettingsPage>
```

Or use a single scrollable page with sections if tabs feel heavy.

---

## Verification

```bash
cd ~/Claude-Projects-MCP/ResourceFlow && npm run dev
# Also run API server:
cd ~/Claude-Projects-MCP/ResourceFlow && npm run api:dev
```

1. Navigate to `/budget` → Click a project → Click "Settings" (add link if missing)
2. Verify project metadata displays and edits correctly
3. Add a new phase → Verify it appears in list
4. Edit a phase → Verify changes persist
5. Delete a phase → Verify confirmation and removal
6. Check budget summary shows correct totals
7. Test archive functionality

---

## Success Criteria

- [ ] Project metadata (name, client, status) can be edited
- [ ] Phases list displays all project phases
- [ ] Can add new phases with name and budget
- [ ] Can edit existing phases
- [ ] Can delete phases (with confirmation)
- [ ] Budget summary shows totals and progress
- [ ] Archive project works
- [ ] All forms validate properly
- [ ] Uses design tokens (no hardcoded colors)
- [ ] No TypeScript errors
- [ ] API endpoints exist and work

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md`
2. Note any new API endpoints in comments
3. List any edge cases discovered
