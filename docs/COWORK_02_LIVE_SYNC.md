# Cowork Task: Live Sync & Real-time Updates

**Created:** 2026-01-27
**Estimated time:** 45-60 min
**Why Cowork:** Multiple files involved, needs systematic debugging, benefits from fresh context

---

## Context

Two related issues confirmed during E2E testing and Michelle/Kara call:
1. **Allocations not syncing to UI** — Ryan added an allocation on Resources page, UI didn't update
2. **Approvals not updating live** — After timesheet submission, Approvals page should reflect changes without refresh

This is the most critical issue — they noticed it live in the resourcing call.

## Subtasks

### Subtask 1: Debug Allocation Creation Flow
1. Find the allocation creation endpoint in `src/api/routes/`
2. Add logging to confirm:
   - Request received
   - Data validated
   - Supabase insert attempted
   - Supabase response (success/error)
3. Check if the API returns the created allocation to the frontend
4. Trace frontend code that handles the response

### Subtask 2: Check Frontend State Management
1. Find where allocations are stored in React state (likely a hook or context)
2. Verify that after POST success, the new allocation is added to local state
3. Check if there's optimistic updates or if it waits for server response
4. Look for any caching issues (React Query, SWR, or manual cache)

### Subtask 3: Fix Allocation Sync
Based on findings from Subtasks 1-2:
- If API not returning data → Fix API response
- If frontend not updating state → Fix state update logic
- If cache stale → Add cache invalidation

### Subtask 4: Approvals Real-time Updates
1. Find how Approvals page fetches pending approvals
2. Options to implement:
   - **Option A:** Polling (check every 30s)
   - **Option B:** Supabase Realtime subscription
   - **Option C:** Refetch on window focus
3. Implement simplest reliable solution (recommend Option C first, add Option A)

### Subtask 5: Write Verification Script
Create `scripts/test-sync.ts`:
```typescript
// 1. Create allocation via API
// 2. Query Supabase directly to confirm it exists
// 3. Log results
```

## Verification
```bash
# Manual test:
# 1. Open Resources page
# 2. Add allocation for any user
# 3. Allocation should appear immediately without refresh

# 4. Open Approvals page in another tab
# 5. Submit timesheet from My Timesheet page
# 6. Approvals page should show new pending item within 30s
```

## Success Criteria
- [ ] Allocations appear immediately after creation
- [ ] Approvals page updates without manual refresh
- [ ] Verification script passes
- [ ] No console errors during operations

## Update After Completion
1. Update `docs/SESSION_STATUS.md` with fixes made
2. Remove any debug logging added (or flag for cleanup)
