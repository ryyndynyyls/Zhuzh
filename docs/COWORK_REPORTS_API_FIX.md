# Cowork Task: Reports API Response Format Fix

**Created:** 2026-01-21
**Estimated time:** 25-30 min
**Why Cowork:** Three endpoints need rewriting to match frontend component expectations

---

## Context

The Reports page has three tabs, each with a sophisticated React component expecting specific API response formats. The current API endpoints exist but return wrong formats, causing all three tabs to fail with "Failed to load X data" errors.

**Key file:**
- `src/api/reports/index.ts` — Contains all three endpoints that need fixing

**Reference files (DO NOT MODIFY, just read for expected formats):**
- `src/components/reports/PhaseBreakdown.tsx` — Shows expected `PhaseReportResponse` interface
- `src/components/reports/PersonSummary.tsx` — Shows expected `PeopleSummaryResponse` interface  
- `src/components/reports/RoleSummary.tsx` — Shows expected `RolesSummaryResponse` interface

---

## Subtasks

### Subtask 1: Fix GET /api/reports/phases

**Current response:**
```json
{ "phases": [{phaseId, projectName, ...}] }
```

**Expected response (from PhaseBreakdown.tsx lines 15-35):**
```typescript
interface PhaseMetrics {
  phase_id: number;
  phase_name: string;
  project_name: string;
  project_id: number;
  budgeted_hours: number;
  allocated_hours: number;
  logged_hours: number;
  remaining_hours: number;
  burn_rate: number;  // (logged_hours / budgeted_hours) * 100
  status: 'on_track' | 'at_risk' | 'over_budget' | 'complete';
  start_date: string | null;
  end_date: string | null;
}

interface PhaseReportResponse {
  success: boolean;
  data: PhaseMetrics[];
  meta: {
    total: number;
    by_status: {
      on_track: number;
      at_risk: number;
      over_budget: number;
      complete: number;
    };
  };
}
```

**Status calculation logic:**
- `complete`: phase.status === 'complete'
- `over_budget`: burn_rate > 100
- `at_risk`: burn_rate > 85
- `on_track`: everything else

**Implementation notes:**
- Query `project_phases` with project info
- For each phase, get allocated hours from `allocations` table
- Get logged hours from `time_entries` table
- Calculate `remaining_hours = budgeted_hours - logged_hours`
- Calculate `burn_rate = (logged_hours / budgeted_hours) * 100` (handle division by zero)
- Derive status from burn_rate
- Count statuses for meta.by_status

---

### Subtask 2: Fix GET /api/reports/people

**Current response:**
```json
[{id, name, email, discipline}]
```

**Expected response (from PersonSummary.tsx lines 15-35):**
```typescript
interface PersonSummary {
  person_id: number;
  person_name: string;
  email: string;
  department: string;  // maps to 'discipline' in users table
  is_active: boolean;
  total_allocated_hours: number;
  total_logged_hours: number;
  utilization_percent: number;  // (logged / allocated) * 100
  project_count: number;
}

interface PeopleSummaryResponse {
  success: boolean;
  data: PersonSummary[];
  meta: {
    total_people: number;
    active_count: number;
  };
}
```

**Query params supported:**
- `is_active` — 'true', 'false', or 'all'
- `department` — filter by discipline

**Implementation notes:**
- Query `users` table for base user info
- For each user, aggregate allocations from `allocations` table
- Aggregate logged hours from `time_entries` table
- Count distinct projects from allocations
- Calculate utilization_percent (handle division by zero → 0)
- Map `discipline` → `department` in response

---

### Subtask 3: Fix GET /api/reports/roles

**Current response:**
```json
["Design", "Engineering", ...]
```

**Expected response (from RoleSummary.tsx lines 15-30):**
```typescript
interface RoleSummary {
  role_id: number;  // can be index since disciplines aren't in separate table
  role_name: string;  // the discipline name
  discipline: string;  // same as role_name for now
  total_budgeted_hours: number;
  total_allocated_hours: number;
  total_logged_hours: number;
  project_count: number;
  headcount: number;  // count of users with this discipline
}

interface RolesSummaryResponse {
  success: boolean;
  data: RoleSummary[];
  meta: {
    total_roles: number;
  };
}
```

**Implementation notes:**
- Get distinct disciplines from `users` table
- For each discipline:
  - Count users (headcount)
  - Sum allocations.planned_hours for users with that discipline (total_allocated_hours)
  - Sum time_entries.actual_hours for users with that discipline (total_logged_hours)
  - Sum phase budgets where users of that discipline have allocations (total_budgeted_hours) — this is trickier, may simplify to allocated hours
  - Count distinct projects

---

### Subtask 4: Fix GET /api/reports/role/:roleId (detail endpoint)

The RoleSummary component also calls `/api/reports/role/:roleId` for expanded details.

**Expected response:**
```typescript
interface RoleDetail {
  role_id: number;
  role_name: string;
  discipline: string;
  project_id: number;
  project_name: string;
  phase_id: number;
  phase_name: string;
  budgeted_hours: number;
  allocated_hours: number;
  logged_hours: number;
  remaining_hours: number;
  headcount: number;  // users of this discipline on this phase
}

interface RoleDetailResponse {
  success: boolean;
  data: RoleDetail[];
  meta: {
    role_id: number;
    role_name: string;
    discipline: string;
    total_budgeted_hours: number;
    total_logged_hours: number;
    burn_rate: number;
    total_headcount: number;
    project_count: number;
  };
}
```

**Note:** The current endpoint uses `/role/:discipline` but frontend calls `/role/:roleId`. Since we're using discipline name as the role_id (index), accept either and treat as discipline name.

---

### Subtask 5: Fix GET /api/reports/person/:personId (detail endpoint)

The PersonSummary component calls `/api/reports/person/:personId` for expanded details.

**Expected response:**
```typescript
interface PersonDetail {
  person_id: number;
  person_name: string;
  email: string;
  project_id: number;
  project_name: string;
  phase_id: number;
  phase_name: string;
  role_name: string;  // user's discipline
  allocated_hours: number;
  logged_hours: number;
  remaining_hours: number;
  utilization_percent: number;
}

interface PersonDetailResponse {
  success: boolean;
  data: PersonDetail[];
  meta: {
    person_id: number;
    person_name: string;
    total_allocated_hours: number;
    total_logged_hours: number;
    overall_utilization: number;
    project_count: number;
  };
}
```

---

## Database Tables Reference

```
users: id, name, email, discipline, is_active, org_id
projects: id, name, color, budget_hours, is_active, client_id
project_phases: id, project_id, name, budget_hours, status
allocations: id, user_id, project_id, phase_id, week_start, planned_hours
time_entries: id, user_id, project_id, phase_id, week_start, actual_hours
```

---

## Verification

After implementation, test each endpoint:

```bash
# Phase Breakdown
curl http://localhost:3002/api/reports/phases | jq '.success, .meta.by_status'

# Team Hours
curl http://localhost:3002/api/reports/people | jq '.success, .meta.total_people'

# Role Summary  
curl http://localhost:3002/api/reports/roles | jq '.success, .data[0]'

# Person Detail
curl http://localhost:3002/api/reports/person/1 | jq '.success, .meta'

# Role Detail
curl http://localhost:3002/api/reports/role/Design | jq '.success, .data[0]'
```

Then verify in browser:
- http://localhost:3000/reports → Phase Breakdown tab loads
- http://localhost:3000/reports → Team Hours tab loads
- http://localhost:3000/reports → Role Summary tab loads

---

## Success Criteria

- [ ] GET /api/reports/phases returns `{success, data, meta}` format with status counts
- [ ] GET /api/reports/people returns `{success, data, meta}` with utilization metrics
- [ ] GET /api/reports/roles returns `{success, data, meta}` with headcount and hours
- [ ] GET /api/reports/person/:id returns detail breakdown by project/phase
- [ ] GET /api/reports/role/:id returns detail breakdown by project/phase
- [ ] All three tabs render without errors in the UI
- [ ] Data displays correctly (hours, percentages, status chips)

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md` — mark Reports API as fixed
2. Remove this task from the bugs list
