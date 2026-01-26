# Cowork Task: Voice Commands - Phase 1 (Text Commands MVP)

**Created:** January 20, 2026
**Estimated time:** 2-3 hours
**Why Cowork:** Multiple files across components, API, and lib directories. Parallel sub-agents can work on UI and backend simultaneously.

---

## Context

We're building a natural language command system for resource management. This Phase 1 focuses on **text input only** (voice comes in Phase 2). The goal is to let producers type commands like "Move Sam to Agent Challenge for 20 hours next week" and have Gemini interpret and execute them.

**Key files to read first:**
- `/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/specs/voice-commands/SPEC.md` — Full specification
- `/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/src/lib/gemini.ts` — Existing Gemini setup
- `/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/src/api/routes/calendar.ts` — Example of Gemini integration

**Tech stack:**
- React + TypeScript + MUI for frontend
- Express for API
- Gemini 2.0 Flash for LLM
- Supabase for database

---

## Subtasks

### Subtask 1: Create Gemini Resource Wizard Agent (Backend)

**File:** `src/lib/resource-wizard/agent.ts`

Create the Gemini agent configuration with:
1. System prompt (from SPEC.md)
2. Function declarations for all tools
3. Method to call Gemini with context and get structured response

```typescript
// Key exports needed:
export interface ResourceWizardResponse {
  type: 'directive' | 'suggestion' | 'clarification' | 'info';
  message: string;
  actions?: Array<{
    tool: string;
    params: Record<string, any>;
    description: string;
  }>;
  // ... see SPEC.md for full interface
}

export async function processCommand(
  text: string,
  context: ResourceWizardContext
): Promise<ResourceWizardResponse>
```

Use the existing `@google/generative-ai` package already in the project.

---

### Subtask 2: Create Context Builder (Backend)

**File:** `src/lib/resource-wizard/context-builder.ts`

Build the context object that gets passed to Gemini:
1. Fetch current user's org info
2. Fetch users with their allocations for next 4 weeks
3. Fetch active projects with budget info
4. Fetch PTO data from calendar integration (if available)

```typescript
export async function buildContext(
  orgId: string,
  options?: {
    weeks?: number;
    focusProjectId?: string;
    focusUserIds?: string[];
  }
): Promise<ResourceWizardContext>
```

Use the existing `supabase` client from `src/api/lib/supabase.ts`.

---

### Subtask 3: Create Action Executor (Backend)

**File:** `src/lib/resource-wizard/action-executor.ts`

Execute the actions returned by Gemini:
1. Implement handlers for each tool (move_allocation, add_allocation, etc.)
2. Validate parameters before database updates
3. Return results with success/failure status

```typescript
export async function executeActions(
  actions: Array<{ tool: string; params: Record<string, any> }>
): Promise<{
  success: boolean;
  results: Array<{
    tool: string;
    success: boolean;
    error?: string;
    data?: any;
  }>;
}>
```

---

### Subtask 4: Create API Routes (Backend)

**File:** `src/api/routes/voice.ts`

Create the Express routes:
1. `POST /api/voice/process` — Process a command, return response
2. `POST /api/voice/execute` — Execute confirmed actions
3. `GET /api/voice/context` — Get current context (for debugging)

Register routes in `src/api/server.ts`.

---

### Subtask 5: Create CommandBar Component (Frontend)

**File:** `src/components/voice/CommandBar.tsx`

Simple input bar component:
1. Text input with placeholder "Ask Zhuzh..."
2. Submit button (and Enter key handler)
3. Loading state while processing
4. Microphone button (disabled for now, Phase 2)

```tsx
interface CommandBarProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}
```

Use MUI components (TextField, IconButton, etc.)

---

### Subtask 6: Create ResponsePanel Component (Frontend)

**File:** `src/components/voice/ResponsePanel.tsx`

Modal/drawer that shows Gemini's response:
1. Display message from Gemini
2. Show before/after preview for directive commands
3. Show suggestion cards for suggestion responses
4. Cancel and Confirm buttons
5. Call onConfirm with actions when user confirms

```tsx
interface ResponsePanelProps {
  response: ResourceWizardResponse | null;
  onConfirm: (actions: Action[]) => void;
  onCancel: () => void;
  isExecuting: boolean;
}
```

---

### Subtask 7: Create useResourceWizard Hook (Frontend)

**File:** `src/hooks/useResourceWizard.ts`

Main hook that ties everything together:
1. State for current command, response, loading
2. `submitCommand(text)` — calls process API
3. `executeActions(actions)` — calls execute API
4. `reset()` — clears state

```tsx
export function useResourceWizard() {
  // Returns { submitCommand, executeActions, response, isLoading, isExecuting, reset }
}
```

---

### Subtask 8: Integrate into ResourceCalendar Page (Frontend)

**File:** `src/pages/ResourceCalendar.tsx`

Add the command bar and response panel to the page:
1. Import and render CommandBar at bottom of page
2. Import and render ResponsePanel as a modal/drawer
3. Wire up the useResourceWizard hook
4. Refresh allocations after successful execution

---

## Verification

After completing all subtasks, test with these commands:

```bash
# Start the dev servers
npm run dev        # Frontend
npm run api:dev    # Backend

# Open http://localhost:3000/resources
# Type in the command bar:
```

**Test commands:**
1. "Who has availability next week?" — Should return info response
2. "Add Ryan to Google Cloud for 20 hours next week" — Should show confirmation
3. "Show me the Mars project status" — Should return project info

---

## Success Criteria

- [ ] CommandBar renders on ResourceCalendar page
- [ ] Typing a command and pressing Enter calls the API
- [ ] Gemini returns a structured response with actions
- [ ] ResponsePanel shows the response with before/after preview
- [ ] Clicking Confirm executes the actions
- [ ] Allocations table updates after execution
- [ ] Error handling works (shows error message if API fails)

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md` with:
   - What was built
   - Any issues encountered
   - What's ready for Phase 2

2. Note any decisions or changes in `docs/live-sync-doc.md`

---

## Notes for Sub-Agents

- **Subtasks 1-4** (Backend) can run in parallel
- **Subtasks 5-7** (Frontend) can run in parallel after types are defined
- **Subtask 8** depends on 5, 6, 7 being complete
- The existing `src/lib/gemini.ts` has good patterns to follow
- Use the existing Supabase client, don't create a new one
