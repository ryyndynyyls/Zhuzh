# Cowork Task: Voice Assistant Refinement (Post-Overhaul Polish)

**Created:** 2026-01-22
**Estimated time:** 2-3 hours
**Why Cowork:** Multiple files across the voice system need coordinated changes

---

## Context

The Voice Overhaul (COWORK_VOICE_OVERHAUL.md) is complete and the system is functional. However, reviewing screenshots of actual usage reveals several UX and data quality issues that make the assistant feel less polished than tools like Linear or Notion.

### Screenshots Reviewed

1. **Image 1 (Clarification Modal):** Asking to switch Kate and Andrew's hours — shows UUID in message, good clarification request but UI could be cleaner
2. **Image 3-4 (Critical Health Check):** Shows 19 team members over-allocated by extreme amounts (-80h, -160h) — clearly incorrect data calculation
3. **Images 5-7 (Same Issue):** Showing massive negative availability like "Jep Alaba: -160h available" — this is nonsensical
4. **Image 8 (Enum Error):** `invalid input value for enum user_role: "Developer"` — database schema mismatch

---

## Problem Analysis

### 1. 🔴 CRITICAL: Incorrect Over-Allocation Calculations

The insight engine shows users with -80h, -120h, -160h "available". This is mathematically wrong.

**Root cause:** The insight engine sums ALL allocations across the entire time range (4 weeks by default) but compares to a single week's capacity (40h).

**Current code in `insight-engine.ts`:**
```typescript
const totalHours = user.allocations.reduce((sum, a) => sum + a.hours, 0);
if (totalHours > threshold) { // threshold = 40
```

If a user has 40h/week × 4 weeks = 160h total, the code says they're 120h over capacity!

**Fix:** Either:
- Sum allocations PER WEEK and compare each week to 40h, OR
- Multiply threshold by number of weeks (but this loses weekly granularity)

### 2. 🔴 CRITICAL: Enum Error for Role Filtering

Error: `invalid input value for enum user_role: "Developer"`

**Root cause:** The `suggest_coverage` function at line 987 tries to filter by role:
```typescript
.eq('role', absentUserRole);
```

But the `user_role` enum in Supabase doesn't include "Developer" — it likely has different values.

**Fix:** 
- Query the database to find valid role values
- Map common terms to database enums
- Or remove strict role filtering and use fuzzy matching

### 3. 🟡 MEDIUM: UUIDs Shown to Users

Messages show raw UUIDs like `[ID: ce0c98c1-e9e6-4151-8a41-b4708c4c4795]`.

**Root cause:** The Gemini system prompt asks it to use exact IDs, but it's including them in user-facing messages.

**Fix:** 
- Update system prompt to clarify: "Use IDs internally for function calls, but NEVER show UUIDs to users in your responses"
- Or post-process Gemini responses to strip UUIDs

### 4. 🟡 MEDIUM: Markdown Rendering in Modal

Raw markdown like `**Recommendation:**` and `* bullet points` showing as plain text.

**Fix:** Use a markdown renderer (like `react-markdown`) in ResponsePanel

### 5. 🟡 MEDIUM: Overly Alarming Tone

Messages say "CRITICAL situation" when the data is actually just miscalculated.

**Fix:** After fixing calculation, tone down the language:
- Replace "CRITICAL" with contextual severity
- Don't lead with alarm bells
- Answer the actual question first, then note any concerns

### 6. 🟢 LOW: Response Type Badges

Using "Suggestion" and "Info" badges inconsistently. The flow for a simple question ("which developers have availability next week?") shouldn't feel like an emergency.

---

## Subtasks

### Subtask 1: Fix Over-Allocation Calculation (insight-engine.ts)

**File:** `src/lib/resource-wizard/insight-engine.ts`

Change the `analyzeOverallocations` function to calculate per-week:

```typescript
function analyzeOverallocations(context: ResourceWizardContext): ResourceInsight[] {
  const insights: ResourceInsight[] = [];
  const weeklyCapacity = 40;

  for (const user of context.users) {
    // Group allocations by week
    const byWeek = new Map<string, number>();
    for (const alloc of user.allocations) {
      const current = byWeek.get(alloc.week_start) || 0;
      byWeek.set(alloc.week_start, current + alloc.hours);
    }

    // Check each week
    for (const [weekStart, totalHours] of byWeek) {
      if (totalHours > weeklyCapacity) {
        const overage = totalHours - weeklyCapacity;
        insights.push({
          type: 'overallocation',
          severity: overage > 8 ? 'critical' : 'warning',
          title: `${user.name} is over capacity`,
          description: `Week of ${formatWeekDate(weekStart)}: ${totalHours}h planned (${overage}h over)`,
          affected_entities: {
            users: [{ id: user.id, name: user.name }],
          },
          data: {
            week_start: weekStart,
            total_hours: totalHours,
            capacity: weeklyCapacity,
            overage,
          },
        });
      }
    }
  }

  return insights;
}

// Helper function
function formatWeekDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

Also fix `analyzeUnderutilization` the same way — check per-week, not total.

### Subtask 2: Fix Role Enum Mismatch (action-executor.ts)

**File:** `src/lib/resource-wizard/action-executor.ts`

**Root cause clarified:** The database has TWO role-related fields:
- `role` - The `user_role` enum with values: 'pm', 'admin', 'employee' (system permission role)
- `job_title` - Free text like "Developer", "Designer", "Producer" (job function)

When Gemini says "find developers", it's asking about job function, not system role. The code is querying the wrong field!

**Fix approach:** Search `job_title` instead of `role` when filtering by profession.

Update `executeGetUserAvailability` (around line 656-680):
```typescript
async function executeGetUserAvailability(
  params: { user_id?: string; start_week: string; end_week: string; role_filter?: string },
  orgId: string
): Promise<ActionResult> {
  const { user_id, start_week, end_week, role_filter } = params;

  debug('query', '📊 executeGetUserAvailability', { user_id, start_week, end_week, role_filter });

  // Build user query
  let userQuery = supabase
    .from('users')
    .select('id, name, role, job_title')  // Add job_title to select
    .eq('org_id', orgId)
    .eq('is_active', true);

  if (user_id) {
    userQuery = userQuery.eq('id', user_id);
  }
  
  // Filter by job_title (not role enum) for profession-based queries
  // "Developer", "Designer", etc. are job titles, not system roles
  if (role_filter) {
    userQuery = userQuery.ilike('job_title', `%${role_filter}%`);
  }

  const { data: users, error: usersError } = await userQuery;
  // ... rest of function unchanged
```

Update `executeSuggestCoverage` (around line 970-990):
```typescript
// First, update the select to include job_title:
const { data: absentAllocations, error: allocError } = await allocQuery
  .select(`
    id,
    planned_hours,
    project:projects(id, name),
    user:users(name, role, job_title)  // Add job_title
  `)
  .eq('user_id', absent_user_id)
  .eq('week_start', week_start);

// Then use job_title for matching similar professionals:
const absentUserJobTitle = (absentAllocations[0].user as any)?.job_title;
const absentUserName = (absentAllocations[0].user as any)?.name;

// Find available users - don't filter strictly, just get all active users
// and prioritize by job title match in the response
const { data: availableUsers } = await supabase
  .from('users')
  .select('id, name, role, job_title')
  .eq('org_id', orgId)
  .eq('is_active', true)
  .neq('id', absent_user_id);
  // Removed: .eq('role', absentUserRole) which caused the enum error

// When building suggestions, sort to put matching job titles first:
const suggestions = (availableUsers || []).map(user => {
  // ... existing availability calculation ...
  return {
    user_id: user.id,
    user_name: user.name,
    job_title: user.job_title,
    role_match: user.job_title?.toLowerCase().includes(absentUserJobTitle?.toLowerCase() || '') || false,
    available_hours: availableHours,
    current_allocation: allocatedHours
  };
})
.filter(s => s.available_hours > 0)
.sort((a, b) => {
  // Prioritize role matches, then by availability
  if (a.role_match && !b.role_match) return -1;
  if (!a.role_match && b.role_match) return 1;
  return b.available_hours - a.available_hours;
});
```

**Also update agent.ts function declaration:**

The `role_filter` parameter description should clarify it searches job titles:
```typescript
role_filter: {
  type: SchemaType.STRING,
  description: 'Optional: filter by job function (e.g., "Developer", "Designer", "Producer", "Strategist")'
}
```

### Subtask 3: Remove UUIDs from User-Facing Messages (agent.ts)

**File:** `src/lib/resource-wizard/agent.ts`

Update the system prompt to explicitly forbid showing UUIDs:

In the `<query_instruction>` section, add:

```
6. FORMATTING RULES:
   - NEVER include UUIDs or IDs in your responses to users
   - Use names only: "Ryan Daniels" not "Ryan Daniels [ID: abc-123]"
   - IDs are for function calls only, invisible to users
   - When disambiguating, use role/title: "Ryan Daniels (Director)" not IDs
```

Also add a post-processing step in `voice.ts` to strip any UUIDs that slip through:

```typescript
// After getting response from processCommand
function stripUUIDs(text: string): string {
  // Match [ID: uuid] or (ID: uuid) patterns
  return text.replace(/\s*[\[(]ID:\s*[a-f0-9-]{36}[\])]/gi, '');
}

response.message = stripUUIDs(response.message);
```

### Subtask 4: Add Markdown Rendering to ResponsePanel

**File:** `src/components/voice/ResponsePanel.tsx`

Install react-markdown if not present, then update the component:

```typescript
import ReactMarkdown from 'react-markdown';

// In the render, replace:
// <Typography>{displayMessage}</Typography>
// With:
<Typography component="div" sx={{ '& p': { m: 0 }, '& ul': { pl: 2, my: 1 } }}>
  <ReactMarkdown>{displayMessage}</ReactMarkdown>
</Typography>
```

Also style the markdown output to match MUI:
```typescript
const markdownComponents = {
  p: ({ children }) => <Typography paragraph sx={{ mb: 1 }}>{children}</Typography>,
  ul: ({ children }) => <Box component="ul" sx={{ pl: 2, my: 1 }}>{children}</Box>,
  li: ({ children }) => <Typography component="li" sx={{ mb: 0.5 }}>{children}</Typography>,
  strong: ({ children }) => <strong>{children}</strong>,
};
```

### Subtask 5: Tone Down Alarming Language (personality.ts & agent.ts)

**File:** `src/lib/resource-wizard/personality.ts`

Update the personality system to be less alarming:

```typescript
// Replace "CRITICAL" with more nuanced language
const severityLanguage = {
  critical: {
    prefix: "Heads up:",
    tone: "There's an issue that needs attention"
  },
  warning: {
    prefix: "By the way:",
    tone: "Something to be aware of"
  },
  info: {
    prefix: "",
    tone: ""
  }
};
```

**File:** `src/lib/resource-wizard/agent.ts`

Update system prompt to prioritize answering the question:

```
7. RESPONSE STRUCTURE:
   - ALWAYS answer the user's question FIRST
   - THEN mention any relevant concerns (briefly)
   - Don't lead with warnings or issues
   - Keep insights proportional to the question
   
   Bad: "⚠️ CRITICAL: 5 people are over-allocated. Also, here's who's available..."
   Good: "Here's who has availability next week: Alex (20h), Sam (15h). Note: Ryan is at capacity."
```

### Subtask 6: Improve Query Result Formatting

**File:** `src/components/voice/ResponsePanel.tsx`

The `renderQueryResults` function needs better formatting for availability queries:

```typescript
function renderAvailability(data: any) {
  const { availability } = data;
  if (!availability || availability.length === 0) {
    return <Typography color="text.secondary">No availability data found.</Typography>;
  }

  // Sort by availability (most available first)
  const sorted = [...availability].sort((a, b) => {
    const aAvail = a.weeks?.[0]?.available_hours || 0;
    const bAvail = b.weeks?.[0]?.available_hours || 0;
    return bAvail - aAvail;
  });

  // Group: available vs at/over capacity
  const available = sorted.filter(u => (u.weeks?.[0]?.available_hours || 0) > 0);
  const atCapacity = sorted.filter(u => (u.weeks?.[0]?.available_hours || 0) <= 0);

  return (
    <Box>
      {available.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main' }}>
            Available ({available.length})
          </Typography>
          {available.map(user => (
            <Typography key={user.user_id} sx={{ ml: 2, mb: 0.5 }}>
              {user.user_name}: {user.weeks[0].available_hours}h available
            </Typography>
          ))}
        </>
      )}
      {atCapacity.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
            At Capacity ({atCapacity.length})
          </Typography>
          {atCapacity.map(user => (
            <Typography key={user.user_id} sx={{ ml: 2, mb: 0.5, color: 'text.secondary' }}>
              {user.user_name}: fully allocated
            </Typography>
          ))}
        </>
      )}
    </Box>
  );
}
```

---

## Verification

After completing all subtasks:

1. **Test over-allocation calculation:**
   ```bash
   curl -X POST "http://localhost:3002/api/voice/process?orgId=ORG_ID&userId=USER_ID" \
     -H "Content-Type: application/json" \
     -d '{"text": "how is the team looking this week?"}'
   ```
   - Should NOT show -80h or -160h values
   - Should show per-week overages if any

2. **Test role filtering:**
   ```bash
   curl -X POST "http://localhost:3002/api/voice/process?orgId=ORG_ID&userId=USER_ID" \
     -H "Content-Type: application/json" \
     -d '{"text": "which developers have availability next week?"}'
   ```
   - Should NOT throw enum error
   - Should return developers (or similar roles)

3. **Check UUID stripping:**
   - No UUIDs should appear in the response message

4. **Check markdown rendering:**
   - Bold text and bullets should render properly in the modal

---

## Success Criteria

- [ ] Over-allocation shows realistic per-week numbers (not multi-week sums)
- [ ] Role queries don't throw enum errors
- [ ] No UUIDs visible in user-facing messages
- [ ] Markdown renders properly in response modal
- [ ] Tone is helpful, not alarming
- [ ] "Who has availability?" returns sorted, grouped results

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md` with completion notes
2. Note any new issues discovered
3. Mark this task complete

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/resource-wizard/insight-engine.ts` | Per-week calculation |
| `src/lib/resource-wizard/action-executor.ts` | Role normalization, ilike queries |
| `src/lib/resource-wizard/agent.ts` | System prompt updates |
| `src/lib/resource-wizard/personality.ts` | Tone adjustments |
| `src/api/routes/voice.ts` | UUID stripping |
| `src/components/voice/ResponsePanel.tsx` | Markdown rendering, result formatting |

---

*This refinement pass takes the working voice system and polishes it to production quality.*
