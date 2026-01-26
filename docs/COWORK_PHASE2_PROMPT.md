# Cowork Phase 2: Database + API

## CRITICAL: Write Files Directly

**DO NOT just generate content and ask what to do. WRITE ALL FILES DIRECTLY TO DISK.**

After completing each task, verify the file exists using `ls` or `cat`. Do not mark a task complete until the file is on disk.

---

## Working Directory
`/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/`

## Context Files (Read First)
1. `specs/product-spec.md` — Data model details
2. `docs/implementation-plan.md` — Build checklist
3. `COWORK_STATUS.md` — Update status here as you work

---

## Task 2A: Database Schema

**WRITE TO:** `src/db/migrations/001_initial.sql`

Create the complete Supabase/Postgres schema:

```sql
-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slack_workspace_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Continue with all tables...
```

**Tables needed:**
- `organizations` — Multi-tenant support
- `users` — With role enum (employee/pm/admin), slack_user_id
- `clients` — Client companies
- `projects` — With budget_hours, hourly_rate, status enum
- `project_phases` — Budget breakdown by phase
- `allocations` — Planned hours per user/project/week
- `time_confirmations` — Weekly submission records
- `time_entries` — Line items within confirmations
- `issue_flags` — Proactive alerts (over budget, etc.)

**Include:** UUIDs, foreign keys, indexes, RLS policies, comments.

**THEN WRITE:** `src/db/seed.sql` with test data:
- Org: "Use All Five"
- Users: Ryan, Michelle, Maleno, Kara + 3 employees
- 3-4 projects with phases and budgets
- Sample allocations and one submitted confirmation

**✓ Verify:** Run `ls src/db/` — both files should exist.

---

## Task 2B: API Routes

**WRITE TO:** `src/api/` folder

First, create the Supabase client:

**WRITE:** `src/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

**WRITE:** `src/types/database.ts` — TypeScript interfaces for all tables

**WRITE these API route files:**

| File | Method | Purpose |
|------|--------|---------|
| `src/api/projects/index.ts` | GET, POST | List all / Create |
| `src/api/projects/[id].ts` | GET, PATCH | Single / Update |
| `src/api/allocations/index.ts` | GET, POST | Query / Upsert |
| `src/api/allocations/[id].ts` | DELETE | Remove |
| `src/api/confirmations/index.ts` | GET, POST | Query / Submit |
| `src/api/confirmations/[id]/approve.ts` | PATCH | Approve |
| `src/api/confirmations/[id]/reject.ts` | PATCH | Reject |
| `src/api/dashboard/budget.ts` | GET | All project budgets |
| `src/api/dashboard/team.ts` | GET | Team utilization |
| `src/api/dashboard/approvals.ts` | GET | Pending queue |

Each route: TypeScript, imports supabase client, try/catch error handling.

**✓ Verify:** Run `find src/api -name "*.ts"` — should list all files.

---

## Status Updates

Update `COWORK_STATUS.md` as you go:
1. ⬜ → 🔄 when starting
2. 🔄 → ✅ when file is written AND verified
3. Add timestamps to the completion log

---

## Completion Checklist

Before finishing, verify ALL files exist:

```bash
# Run this to confirm
ls -la src/db/migrations/001_initial.sql
ls -la src/db/seed.sql
ls -la src/lib/supabase.ts
ls -la src/types/database.ts
ls -la src/api/projects/
ls -la src/api/allocations/
ls -la src/api/confirmations/
ls -la src/api/dashboard/
```

**Then update:**
1. `COWORK_STATUS.md` — All tasks ✅
2. `COWORK_TASKS.md` — Mark Phase 2 complete

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
