# Cowork Task Prompts

Copy-paste these into Cowork subagents. **Make sure to select the ResourceFlow folder first.**

---

## Phase 1 Tasks (Run in Parallel)

---

### Task 1A: Project Scaffold (Bash Agent)

```
You are setting up the foundation for ResourceFlow, a Slack-first timekeeping app.

**Your job:** Create the project structure and install dependencies.

**Working directory:** This folder (ResourceFlow/)

**Steps:**

1. Create this folder structure:
```
src/
├── api/
├── components/
├── db/
│   └── migrations/
├── hooks/
├── lib/
│   ├── supabase.ts
│   └── slack.ts
├── slack/
│   ├── commands/
│   └── scheduled/
├── types/
└── utils/
```

2. Initialize npm and install dependencies:
```bash
npm init -y
npm install react react-dom @mui/material @mui/x-data-grid @emotion/react @emotion/styled
npm install @supabase/supabase-js @slack/bolt
npm install -D typescript @types/react @types/react-dom
```

3. Create a basic tsconfig.json for a React + Node project

4. Create placeholder index files in each folder so the structure is navigable

5. Update COWORK_TASKS.md — mark Task 1A as ✅ Complete

**Output:** Working project scaffold ready for other agents to build on
```

---

### Task 1B: Implementation Plan (Plan Agent)

```
You are creating a detailed implementation plan for ResourceFlow.

**Your job:** Read the specs and create a step-by-step build checklist.

**First, read these files:**
1. specs/product-spec.md — Full feature details
2. docs/FEATURE_PRIORITIZATION.md — What's Phase 1 vs Phase 2

**Then create:** docs/implementation-plan.md

**The plan should include:**

1. **Database Tables** — List each table needed with columns
2. **API Endpoints** — List each endpoint with method, path, purpose
3. **React Components** — List each component with props and responsibilities
4. **Slack Interactions** — List slash commands, modals, scheduled messages

For each item, note:
- Priority (Phase 1 must-have vs nice-to-have)
- Dependencies (what needs to exist first)
- Estimated complexity (small/medium/large)

Focus on Phase 1 features:
- Budget Dashboard ⭐
- Approval Queue ⭐
- Add Unplanned Work ⭐
- PTO/Holiday Visibility ⭐
- Phase Breakdown View ⭐
- Confirm/Adjust Modal
- Company-Wide Dashboard
- Friday Confirmation DM
- Monday Scheduling DM

**Output:** A comprehensive checklist another developer could follow to build ResourceFlow

When done, update COWORK_TASKS.md — mark Task 1B as ✅ Complete
```

---

### Task 1C: Extract Component Patterns (Explore Agent)

```
You are analyzing existing prototypes to extract reusable patterns.

**Your job:** Study the prototype code and document patterns for the build.

**Read these files:**
1. prototypes/slack-mockups.jsx — Slack UI mockups
2. prototypes/app-full.jsx — Web app mockups

**Create:** docs/component-patterns.md

**Document these patterns:**

1. **Color Palette** — What colors are used for status, projects, alerts?
2. **Component Structure** — How are cards, tables, modals structured?
3. **State Patterns** — How is state managed? What data flows where?
4. **Status Indicators** — How are approved/pending/rejected shown?
5. **Variance Display** — How is over/under budget visualized?
6. **Slack Block Patterns** — What Block Kit patterns are used?

For each pattern, include:
- Code snippet showing the pattern
- When to use it
- MUI components that map to it

**Output:** A reference doc so all component builders use consistent patterns

When done, update COWORK_TASKS.md — mark Task 1C as ✅ Complete
```

---

## Phase 2 Tasks (Run After Phase 1)

---

### Task 2A: Database Migrations (Bash Agent)

```
You are creating the database schema for ResourceFlow.

**First, read:**
1. specs/product-spec.md — Look for the Data Model section
2. docs/implementation-plan.md — See the database tables list

**Create:** src/db/migrations/001_initial.sql

**Tables needed:**
- organizations
- users (with role: employee/pm/admin)
- clients
- projects (with budget_hours, hourly_rate, phases)
- project_phases
- allocations (planned hours per user per project per week)
- time_confirmations (weekly submissions)
- time_entries (line items within confirmations)
- issue_flags (proactive flagging)

**Include:**
- Primary keys, foreign keys, indexes
- Row Level Security (RLS) policies for Supabase
- Useful comments explaining each table

**Also create:** src/db/seed.sql
- Sample organization (Use All Five)
- Sample users (Ryan, Michelle, Maleno, Kara)
- Sample projects with budgets
- Sample allocations for testing

When done, update COWORK_TASKS.md — mark Task 2A as ✅ Complete
```

---

### Task 2B: API Routes (General Agent)

```
You are building the API layer for ResourceFlow.

**First, read:**
1. docs/implementation-plan.md — See the API endpoints list
2. src/db/migrations/001_initial.sql — Understand the schema

**Create Vercel serverless functions in:** src/api/

**Endpoints needed:**

Projects:
- GET /api/projects — List all projects (with budget stats)
- GET /api/projects/[id] — Single project with phase breakdown
- POST /api/projects — Create project
- PATCH /api/projects/[id] — Update project

Allocations:
- GET /api/allocations?week=YYYY-MM-DD&user=id — Get allocations
- POST /api/allocations — Create/update allocation
- DELETE /api/allocations/[id] — Remove allocation

Confirmations:
- GET /api/confirmations?week=YYYY-MM-DD&user=id — Get confirmation
- POST /api/confirmations — Submit confirmation
- PATCH /api/confirmations/[id]/approve — Approve
- PATCH /api/confirmations/[id]/reject — Reject with comment

Dashboard:
- GET /api/dashboard/budget — Budget overview for all projects
- GET /api/dashboard/team — Team utilization view

**Use:** 
- Supabase client from src/lib/supabase.ts
- TypeScript
- Proper error handling

When done, update COWORK_TASKS.md — mark Task 2B as ✅ Complete
```

---

## Usage Notes

1. **Select folder first** — In Cowork, select `/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/`

2. **Run Phase 1 in parallel** — Tasks 1A, 1B, 1C have no dependencies on each other

3. **Wait for Phase 1** — Before starting Phase 2, check that 1A is complete (need the folder structure)

4. **Check COWORK_TASKS.md** — Agents will mark their tasks complete there

5. **Come back to main Claude** — After Phase 1-2, we can coordinate Phase 3-4 component work
