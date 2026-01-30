# Cowork Task: Polish & Resource Config Display

**Created:** 2026-01-29
**Estimated time:** 30-45 min
**Why Cowork:** Multiple parallel subtasks across different files

---

## Context

Two issues need fixing before the pilot:

### Issue 1: Hunter's Special Hours Not Showing
The `resource_config` parsing infrastructure exists but Hunter (and potentially others) don't have their specialty_notes parsed into `resource_config`. The UI code to display custom schedules exists in ResourceCalendar.tsx (lines 575-601) but only shows when `user.hasCustomSchedule` is true.

**Root cause:** The `resource_config` column is null for users whose specialty_notes existed before the feature was added. Need to bulk re-parse all existing specialty_notes.

### Issue 2: Visual Bar Spanning (Nice-to-have)
The day-level allocation refactor is complete but visual CSS grid spanning wasn't implemented. Grouped allocations show in the dialog but don't visually span multiple days in the grid yet.

---

## Subtasks

### Subtask 1: Bulk Re-Parse Specialty Notes (CRITICAL)

Create and run a script to re-parse all existing specialty_notes into resource_config.

**File to create:** `scripts/reparse-resource-configs.ts`

```typescript
/**
 * Bulk re-parse all specialty_notes into resource_config
 * Run with: npx tsx scripts/reparse-resource-configs.ts
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Copy the parseResourceConfigWithGemini function from src/api/routes/team.ts
// ... (full function implementation)

async function main() {
  console.log('Fetching users with specialty_notes...');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, specialty_notes, resource_config')
    .not('specialty_notes', 'is', null)
    .neq('specialty_notes', '');
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log(`Found ${users?.length || 0} users with specialty_notes`);
  
  for (const user of users || []) {
    // Skip if already parsed recently
    const existingConfig = user.resource_config as any;
    if (existingConfig?.parsed_at) {
      console.log(`  Skipping ${user.name} - already parsed`);
      continue;
    }
    
    console.log(`  Parsing ${user.name}...`);
    const config = await parseResourceConfigWithGemini(user.specialty_notes);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ resource_config: config })
      .eq('id', user.id);
    
    if (updateError) {
      console.error(`    Error updating ${user.name}:`, updateError);
    } else {
      console.log(`    ✓ ${user.name}: ${config.weekly_capacity}h/wk, exclusions: ${config.project_exclusions.join(', ') || 'none'}`);
    }
    
    // Rate limit for Gemini
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('Done!');
}

main();
```

**Steps:**
1. Create the script file
2. Copy the `parseResourceConfigWithGemini` function from `src/api/routes/team.ts`
3. Run: `cd ~/Claude-Projects-MCP/ResourceFlow && npx tsx scripts/reparse-resource-configs.ts`
4. Verify Hunter has `resource_config` populated

### Subtask 2: Verify UI Display Works

After running the script, verify the UI shows custom schedules:

1. Check the ResourceCalendar hook fetches `resource_config`:
   - File: `src/hooks/useResourceCalendar.ts`
   - Line ~407: `.select('id, name, role, email, discipline, avatar_url, resource_config')`

2. Check the component displays it:
   - File: `src/components/ResourceCalendar.tsx`
   - Lines 575-601: Conditional display of custom schedule chip

3. Test in browser:
   - Go to Resources page
   - Find Hunter (or another user with custom schedule)
   - Verify chip shows "26h/wk" or similar

### Subtask 3: Visual Bar Spanning (OPTIONAL - if time permits)

The current calendar renders cells independently. To make multi-day allocations visually span:

**Option A: CSS Grid spanning (more complex)**
- Would require changing how rows are rendered
- Each row would need to know about grouped allocations
- Render bars at row level, not cell level

**Option B: Visual indicator (simpler)**
- Add a subtle visual connector between consecutive same-project cells
- Could be a colored line at top/bottom of cells
- Preserves current cell-based rendering

**Recommendation:** Skip for now. The grouping logic works for editing - visual spanning is cosmetic and can be added post-pilot.

---

## Verification

1. **Resource Config Parsing:**
   ```sql
   -- Run in Supabase SQL editor
   SELECT name, 
          specialty_notes,
          resource_config->>'weekly_capacity' as weekly_hours,
          resource_config->'work_schedule' as schedule
   FROM users 
   WHERE specialty_notes IS NOT NULL 
     AND specialty_notes != ''
   ORDER BY name;
   ```
   
   Expect to see Hunter with `weekly_hours: 26` and custom schedule like `{"mon": 9, "tue": 9, "wed": 4, "thu": 4, "fri": 0, ...}`

2. **UI Display:**
   - Open https://zhuzh-production.up.railway.app (or localhost:3000)
   - Navigate to Resources page
   - Find Hunter's row
   - Should see a chip like "26h/wk" near their name

---

## Success Criteria

- [x] Script created to bulk re-parse specialty_notes
- [ ] Script run successfully
- [ ] Hunter shows custom hours indicator on Resources page
- [ ] Other users with custom schedules also display correctly
- [ ] No console errors related to resource_config

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md`:
   - Mark "Hunter's special hours" as fixed
   - Note any users found with custom schedules

2. If visual spanning was implemented:
   - Document the approach taken
   - Note any edge cases

---

## Files to Touch

| File | Action |
|------|--------|
| `scripts/reparse-resource-configs.ts` | CREATE |
| `src/hooks/useResourceCalendar.ts` | VERIFY (no changes expected) |
| `src/components/ResourceCalendar.tsx` | VERIFY (no changes expected) |
| `docs/SESSION_STATUS.md` | UPDATE |
