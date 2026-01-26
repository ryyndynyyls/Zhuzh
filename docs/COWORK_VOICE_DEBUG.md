# Cowork Task: Voice Commands Debug & Fix

**Created:** 2026-01-20  
**Estimated time:** 45-60 min  
**Why Cowork:** Multi-file debugging across frontend → API → Gemini → executor chain. Needs systematic instrumentation and iterative testing.

---

## Context

Voice commands feature was built but has two issues observed during ProStrat demo:

### Issue 1: Transcription Unreliable
- Web Speech API listening state shows inconsistently
- Sometimes continues listening when it shouldn't
- UI doesn't reliably reflect mic state

### Issue 2: Gemini Parses But Doesn't Execute
- Transcription reaches Gemini
- Gemini appears to parse the intent
- But no actual database changes happen
- The action executor may not be getting called, or calls may be failing silently

---

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useResourceWizard.ts` | Frontend hook — voice capture, API calls |
| `src/components/voice/CommandBar.tsx` | UI — mic button, transcription display |
| `src/components/voice/ResponsePanel.tsx` | UI — shows Gemini response/preview |
| `src/api/routes/voice.ts` | API routes — `/process` and `/execute` |
| `src/api/services/gemini-agent.ts` | Gemini integration — function calling |
| `src/api/services/context-builder.ts` | Builds context for Gemini (users, projects, allocations) |
| `src/api/services/action-executor.ts` | Executes the actual DB changes |

---

## Subtasks

### Subtask 1: Add Logging Throughout the Chain

Add console.log statements at every step to trace the flow:

**Frontend (useResourceWizard.ts):**
```typescript
console.log('[Voice] Transcription received:', transcript);
console.log('[Voice] Sending to /api/voice/process');
console.log('[Voice] Process response:', response);
console.log('[Voice] Sending to /api/voice/execute');
console.log('[Voice] Execute response:', executeResponse);
```

**API Routes (voice.ts):**
```typescript
console.log('[API /voice/process] Request body:', req.body);
console.log('[API /voice/process] Gemini response:', geminiResult);
console.log('[API /voice/execute] Request body:', req.body);
console.log('[API /voice/execute] Execution result:', result);
```

**Gemini Agent:**
```typescript
console.log('[Gemini] Input prompt:', prompt);
console.log('[Gemini] Function call:', functionCall);
console.log('[Gemini] Arguments:', args);
```

**Action Executor:**
```typescript
console.log('[Executor] Action type:', action.type);
console.log('[Executor] Params:', action.params);
console.log('[Executor] DB result:', dbResult);
```

### Subtask 2: Fix Web Speech API State Management

In `useResourceWizard.ts` or `CommandBar.tsx`, audit the speech recognition lifecycle:

1. Check if `recognition.stop()` is being called properly
2. Verify `onend` handler updates state correctly
3. Add explicit state management:
```typescript
const [isListening, setIsListening] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);

recognition.onstart = () => {
  console.log('[Speech] Started');
  setIsListening(true);
};

recognition.onend = () => {
  console.log('[Speech] Ended');
  setIsListening(false);
};

recognition.onerror = (event) => {
  console.log('[Speech] Error:', event.error);
  setIsListening(false);
};
```

4. Ensure the UI reflects these states accurately

### Subtask 3: Verify Gemini Function Calling

Test Gemini agent in isolation:

```typescript
// Create a test script or add to existing test
const testPrompt = "Move Andrew to Agent Challenge for 8 hours next Monday";

const result = await geminiAgent.process(testPrompt, context);
console.log('Gemini result:', JSON.stringify(result, null, 2));

// Expected: result should contain a function_call with:
// - name: 'move_allocation' or 'add_allocation'  
// - args: { userId, projectId, hours, date, etc. }
```

Check:
- Is `result.functionCall` populated?
- Are the arguments valid (real user IDs, project IDs)?
- Is the context being passed correctly?

### Subtask 4: Verify Action Executor

Test action executor in isolation:

```typescript
// Test with a known-good action
const testAction = {
  type: 'add_allocation',
  params: {
    userId: 'known-user-uuid',
    projectId: 'known-project-uuid', 
    hours: 4,
    date: '2026-01-27'
  }
};

const result = await actionExecutor.execute(testAction);
console.log('Executor result:', result);
```

Check:
- Does the Supabase client have proper credentials?
- Is RLS blocking the insert? (Check service role vs user role)
- Are there validation errors being swallowed?

### Subtask 5: Wire Up End-to-End with Error Handling

Once individual pieces work, ensure the chain handles errors:

```typescript
// In voice.ts /process route
try {
  const geminiResult = await geminiAgent.process(transcript, context);
  
  if (!geminiResult.functionCall) {
    return res.json({ 
      success: false, 
      error: 'Gemini did not return an action',
      rawResponse: geminiResult 
    });
  }
  
  return res.json({ success: true, action: geminiResult.functionCall });
} catch (error) {
  console.error('[API /voice/process] Error:', error);
  return res.status(500).json({ success: false, error: error.message });
}
```

### Subtask 6: Test Full Flow

With all instrumentation in place:

1. Start all three servers (web, api, slack)
2. Open browser console
3. Open terminal running API server
4. Click mic, say: "Add 4 hours for Ryan on Agent Challenge next Monday"
5. Trace the logs through the entire chain
6. Identify where it breaks

Document:
- What logs appear?
- Where does the chain stop?
- What error (if any) is thrown?

---

## Verification

Run this sequence and confirm each step works:

```bash
# 1. API server running with visible logs
npm run api:dev

# 2. Web app running
npm run dev

# 3. In browser, open DevTools console

# 4. Test voice command
# - Click mic button
# - Say "Show me who's available next week"
# - Watch console + terminal logs

# 5. Verify in Supabase
# - If action should create allocation, check allocations table
```

---

## Success Criteria

- [ ] Console logs trace the full path from mic → transcription → API → Gemini → executor → DB
- [ ] Transcription state (listening/not listening) accurately reflects in UI
- [ ] A simple voice command ("Add 4 hours for [name] on [project] [date]") successfully creates an allocation in the database
- [ ] Errors at any step are logged and surfaced to the user

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md`:
   - Mark "Voice commands — link transcription to actions" as ✅ or note remaining issues
2. Remove debug logging (or make it conditional on `NODE_ENV=development`)
3. Note any architectural issues discovered in `docs/live-sync-doc.md`
