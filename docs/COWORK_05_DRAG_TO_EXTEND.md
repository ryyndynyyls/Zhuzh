# Cowork Task: Drag-to-Extend Allocations

**Created:** 2026-01-27
**Estimated time:** 90-120 min
**Why Cowork:** Complex UI interaction, multiple files involved, benefits from focused sub-agent work

---

## Context

On the Resources page, producers need to click and drag allocations to extend them across multiple days — similar to 10,000ft. Currently, allocations are displayed but can't be resized by dragging.

**Important notes from Michelle/Kara feedback:**
- Dragging should respect PTO days (can't allocate on days someone is out)
- Dragging should respect part-time schedules (Hunter works 9/9/4/4/0)
- Consider showing a preview/ghost while dragging
- "Repeat Last Week" already exists as an alternative workflow

## Reference

The Resources page likely uses a calendar/grid view. Check:
- `src/pages/ResourcesPage.tsx` or similar
- `src/components/ResourceCalendar.tsx` or similar
- Any existing allocation bar/cell components

## Subtasks

### Subtask 1: Understand Current Structure
1. Find the Resources page component
2. Identify how allocation bars are rendered
3. Document the current data flow (how allocations are fetched/displayed)
4. Check if there's already any drag library installed (react-dnd, @dnd-kit, etc.)

### Subtask 2: Choose Drag Implementation
Options:
- **Option A:** Native HTML5 drag (simpler, less smooth)
- **Option B:** react-dnd (popular, good docs)
- **Option C:** @dnd-kit (modern, accessible, recommended)

Install if needed: `npm install @dnd-kit/core @dnd-kit/sortable`

### Subtask 3: Add Drag Handle to Allocation Bars
1. Add a drag handle (grip icon or edge) to the right side of each allocation bar
2. Make it visually clear this is draggable (cursor change, hover state)
3. Only show drag handle for users with edit permissions

### Subtask 4: Implement Drag-to-Extend Logic
1. On drag start: capture original allocation end date
2. On drag move: show ghost/preview extending to hovered day
3. On drag end: 
   - Calculate new date range
   - Skip PTO days if user has them
   - Call API to update allocation
4. Handle edge cases:
   - Can't drag past phase end date
   - Can't drag into the past
   - Minimum 1 day allocation

### Subtask 5: API Integration
1. Find or create endpoint: `PATCH /api/allocations/:id`
2. Update allocation with new `end_date`
3. Recalculate hours based on new date range
4. Return updated allocation for UI sync

### Subtask 6: Visual Feedback
1. Show drag preview/ghost while dragging
2. Highlight valid drop targets (days)
3. Show invalid indicator for PTO days or past dates
4. Animate the extension on drop

## Verification
```bash
# Manual test:
# 1. Go to Resources page
# 2. Find an allocation bar
# 3. Grab the right edge and drag to extend
# 4. Release on a future day
# 5. Allocation should extend and persist after refresh
```

## Success Criteria
- [ ] Can drag right edge of allocation to extend
- [ ] Visual preview shows during drag
- [ ] PTO days are skipped/blocked
- [ ] Changes persist to database
- [ ] Works smoothly without jank
- [ ] Undo possible (or confirm before save)

## Out of Scope (for now)
- Drag to shrink (reduce days) — can add later
- Drag to move (change start date) — can add later
- Drag to create new allocation — use existing modal
- Multi-select drag — too complex for v1

## Update After Completion
1. Update `docs/SESSION_STATUS.md` with feature status
2. Note any edge cases discovered
