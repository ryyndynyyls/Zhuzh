# Cowork Task: Fix Remaining TypeScript Errors

**Created:** 2026-01-26
**Estimated time:** 30-45 min with parallel sub-agents
**Why Cowork:** 108 errors across 15+ files, parallelizable by category

---

## Context

We've already completed:
- ✅ Installed missing packages (@dnd-kit/*, framer-motion)
- ✅ Added Vite env types (src/vite-env.d.ts)
- ✅ Deleted dead Next.js API routes
- ✅ Fixed MUI Grid v6 syntax (ApprovalQueue, BudgetDashboard, MarketingPage)
- ✅ Regenerated Supabase types (src/types/supabase.ts)

**108 errors remain.** They fall into clear categories that can be fixed in parallel.

---

## Subtasks (Run in Parallel)

### 🔄 PARALLEL GROUP: All 5 subtasks can run simultaneously

---

#### Subtask 1: Express Request Param Types (25 errors)

**Files:**
- `src/api/routes/calendar.ts` (14 errors)
- `src/api/routes/db-tools.ts` (6 errors)
- `src/api/routes/timer.ts` (5 errors)

**Problem:** `req.query.param` returns `string | ParsedQs | (string | ParsedQs)[]`, not `string`.

**Fix pattern:**
```typescript
// BEFORE
const userId = req.query.user_id;

// AFTER
const userId = req.query.user_id as string;
// OR for safety:
const userId = typeof req.query.user_id === 'string' ? req.query.user_id : '';
```

Also fix `req.params` issues the same way:
```typescript
const id = req.params.id as string;
```

---

#### Subtask 2: Supabase View/RPC Types (15 errors)

**Files:**
- `src/slack/notifications/budgetAlert.ts` (11 errors)
- `src/slack/commands/budget.ts` (2 errors)
- `src/slack/scheduled/budgetAlerts.ts` (2 errors)

**Problem:** The `project_budget_summary` view and related queries return types that don't match expected properties like `last_alert_threshold`, `burn_percentage`, etc.

**Fix:** Add explicit type assertions or create interface for the view response:

```typescript
// Option 1: Type assertion
const projects = data as Array<{
  project_id: string;
  name: string;
  client: string | null;
  budget_hours: number | null;
  burned_hours: number;
  burn_percentage: number;
  remaining_hours: number;
  last_alert_threshold: number | null;
  // ... other fields
}>;

// Option 2: Add interface to src/types/database.ts
interface ProjectBudgetSummary {
  project_id: string;
  name: string;
  // ... 
}
```

---

#### Subtask 3: SpeechRecognition Types (5 errors)

**File:** `src/components/voice/CommandBar.tsx`

**Problem:** `SpeechRecognition` and related types aren't recognized.

**Fix:** Add type declarations at top of file or in a `.d.ts` file:

```typescript
// Add to src/types/speech.d.ts OR top of CommandBar.tsx
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
```

Then update usage:
```typescript
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
```

---

#### Subtask 4: Slack Bolt View Import (3 errors)

**Files:**
- `src/slack/views/addUnplannedWork.ts`
- `src/slack/views/approvalDetail.ts`
- `src/slack/views/confirmWeek.ts`

**Problem:** `View` is not a named export from `@slack/bolt`.

**Fix:** Use the correct import:
```typescript
// BEFORE
import { View } from '@slack/bolt';

// AFTER - View is a type, import from types
import type { View } from '@slack/types';
// OR just use the inline type
import type { ModalView } from '@slack/bolt';
```

Check what the file actually needs - it might just need `ModalView` or `HomeView`.

---

#### Subtask 5: Null Checks & Type Mismatches (50+ errors)

**Files:** Various (useProjects.ts, lib/api.ts, TimesheetPage.tsx, etc.)

**Common patterns to fix:**

**A) `string | null` → `string`:**
```typescript
// BEFORE
const color: string = project.color; // Error if color can be null

// AFTER
const color: string = project.color ?? '#808080';
// OR
const color: string = project.color || '#808080';
// OR if truly optional
const color: string | undefined = project.color ?? undefined;
```

**B) `boolean | null` → `boolean`:**
```typescript
// BEFORE  
const enabled: boolean = settings.time_tracking_enabled;

// AFTER
const enabled: boolean = settings.time_tracking_enabled ?? false;
```

**C) Allocation type mismatch:**
```typescript
// The Supabase query returns allocations with joined project/phase
// But the function expects plain Allocation[]
// Fix by updating the function signature or mapping the data
```

**D) Status enum issues:**
```typescript
// BEFORE
updateProject(id, { status: 'active' });

// AFTER - use the enum value or cast
updateProject(id, { status: 'active' as const });
```

**E) `project.budget_hours` possibly null:**
```typescript
// BEFORE
const remaining = project.budget_hours - burned;

// AFTER
const remaining = (project.budget_hours ?? 0) - burned;
```

---

## Verification

After all subtasks complete, run:

```bash
cd /Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow

# Check for remaining errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Should be 0

# If not 0, show what's left
npx tsc --noEmit 2>&1 | grep "error TS" | head -20

# Test build
npm run build
```

---

## Success Criteria

- [ ] `npx tsc --noEmit` returns 0 errors
- [ ] `npm run build` succeeds
- [ ] No `as any` escape hatches (prefer proper typing)

---

## After Completion

1. Commit all changes:
```bash
git add -A
git commit -m "Fix all TypeScript errors for Railway deployment"
git push origin main
```

2. Update `docs/SESSION_STATUS.md`:
   - Change blocker to resolved
   - Note TypeScript errors fixed
   - Next step: Deploy to Railway

---

## File Reference

Quick list of files to modify:

```
src/api/routes/calendar.ts
src/api/routes/db-tools.ts
src/api/routes/timer.ts
src/slack/notifications/budgetAlert.ts
src/slack/commands/budget.ts
src/slack/scheduled/budgetAlerts.ts
src/components/voice/CommandBar.tsx
src/slack/views/addUnplannedWork.ts
src/slack/views/approvalDetail.ts
src/slack/views/confirmWeek.ts
src/hooks/useProjects.ts
src/lib/api.ts
src/pages/TimesheetPage.tsx
src/slack/notifications/rejected.ts
src/slack/handlers/actions.ts
src/lib/resource-wizard/context-builder.ts
```
