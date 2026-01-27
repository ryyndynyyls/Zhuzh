# Cowork Task: Resource Planning Features

**Created:** 2026-01-27
**Estimated time:** 90-120 min
**Why Cowork:** Multiple features, larger scope, benefits from sub-agent parallelization

---

## Context

Feedback from Michelle and Kara (ProStrat standup 2026-01-27) identified key features needed for producer workflow. These are high-priority for pilot adoption.

**Key insight:** Drag-to-allocate is NOT the priority. Kara said dragging "doesn't always work" with part-time employees, holidays, and Fridays off. They prefer text/voice input and "repeat last week" functionality.

## Subtasks

### Subtask 1: Repeat Last Week Feature
**Priority:** HIGH — Kara uses this constantly in 10,000ft

1. Add "Repeat Last Week" button to Resources page header
2. When clicked:
   - Copy all allocations from previous week (Mon-Fri)
   - Create new allocations for current week with same assignments
   - Respect PTO days (skip days user is out)
3. Show confirmation: "Copied 12 allocations from last week. 2 skipped due to PTO."
4. Allow undo (delete the copied allocations)

**API endpoint needed:** `POST /api/allocations/repeat-week`

### Subtask 2: PTO Indicators in Resource Rows
**Priority:** HIGH — Michelle: "Know not to assign Andrew if he's out Friday"

1. We already have PTO data from calendar sync (Who's Out widget works)
2. In Resources page, for each person row:
   - Check if they have PTO on any day in the visible week
   - Show indicator (dot, icon, or grayed cell) on those days
3. When hovering/clicking PTO indicator, show reason if available

**Data source:** Check how Who's Out widget queries PTO data, reuse that

### Subtask 3: Custom Utilization Patterns (Foundation)
**Priority:** HIGH — Hunter works 9h Mon/Tue, 4h Wed/Thu

This is foundational — affects how "100%" is calculated per person.

1. Add to user profile/settings:
   ```typescript
   interface UtilizationPattern {
     monday: number;    // hours available (e.g., 9)
     tuesday: number;   // hours available (e.g., 9)
     wednesday: number; // hours available (e.g., 4)
     thursday: number;  // hours available (e.g., 4)
     friday: number;    // hours available (e.g., 0 for UA5)
   }
   ```
2. Default pattern: 8h Mon-Thu, 0h Fri (UA5 standard)
3. Update utilization calculations to use individual patterns
4. Add UI to edit pattern in Team → User profile modal

**Database:** May need `utilization_patterns` table or JSON field on `users`

### Subtask 4: Utilization Calculation Update
After Subtask 3, update:
1. Dashboard utilization percentage to use individual patterns
2. Resources page "X% utilized" badges
3. Over-allocation warnings to respect custom hours

## Verification
```bash
# Repeat Last Week:
# 1. Create allocations for Week A
# 2. Navigate to Week B
# 3. Click "Repeat Last Week"
# 4. Allocations should appear, minus PTO days

# PTO Indicators:
# 1. Mark someone as out on Wednesday (via calendar or manually)
# 2. Resources page should show indicator on their Wednesday cell

# Custom Utilization:
# 1. Set Hunter to 9/9/4/4/0 pattern
# 2. "100% utilized" for Hunter = 26 hours/week, not 40
```

## Success Criteria
- [ ] Repeat Last Week copies allocations correctly
- [ ] PTO days are skipped during repeat
- [ ] PTO indicators visible in Resources rows
- [ ] Custom utilization patterns can be set per user
- [ ] Utilization % calculations use individual patterns

## Update After Completion
1. Update `docs/SESSION_STATUS.md` with features added
2. Update `specs/product-spec.md` if needed
