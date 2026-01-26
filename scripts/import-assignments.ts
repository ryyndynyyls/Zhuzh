/**
 * Task 3: Import Assignments (Allocations) from 10,000ft to ResourceFlow
 * 
 * Depends on: user_mapping.json, project_mapping.json (from Tasks 1 & 2)
 * 
 * Run: npx tsx scripts/import-assignments.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

// =============================================================================
// Configuration
// =============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const DATA_DIR = path.join(__dirname, '../data/10kft-export');
const BATCH_SIZE = 100;

// =============================================================================
// Setup
// =============================================================================

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// =============================================================================
// Helpers
// =============================================================================

function loadData(filename: string): any {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Missing required file: ${filename}`);
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const monday = new Date(date.setUTCDate(diff));
  return monday.toISOString().split('T')[0];
}

function calculateWeeklyHours(assignment: any): number {
  // 10kft stores allocation differently based on mode
  // allocation_mode: 'hours_per_day', 'percent', 'fixed'
  
  if (assignment.allocation_mode === 'percent' && assignment.percent) {
    // Convert percent to hours (assuming 40hr week)
    return (assignment.percent / 100) * 40;
  }
  
  if (assignment.hours_per_day) {
    // Multiply by 5 work days
    return assignment.hours_per_day * 5;
  }
  
  if (assignment.fixed_hours) {
    return assignment.fixed_hours;
  }
  
  // Fallback: try to calculate from starts_at/ends_at and total
  return assignment.hours || 0;
}

// =============================================================================
// Main Import
// =============================================================================

async function importAssignments() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Task 3: Import Assignments (Allocations)');
  console.log('═══════════════════════════════════════════════════\n');

  // Load mappings
  console.log('📂 Loading mappings...');
  const userMapping: Record<string, string> = loadData('user_mapping.json');
  const projectMapping: Record<string, string> = loadData('project_mapping.json');
  console.log(`   Users: ${Object.keys(userMapping).length} mapped`);
  console.log(`   Projects: ${Object.keys(projectMapping).length} mapped`);

  // Load assignments
  const assignments = loadData('assignments.json');
  console.log(`   Assignments: ${assignments.length} to process\n`);

  // Group by user/project/week to deduplicate
  const grouped = new Map<string, { userId: string; projectId: string; weekStart: string; hours: number }>();
  let unmapped = 0;

  for (const assignment of assignments) {
    const userId = userMapping[assignment._user_id];
    const projectId = projectMapping[assignment.assignable_id];
    
    if (!userId || !projectId) {
      unmapped++;
      continue;
    }

    if (!assignment.starts_at) continue;

    const weekStart = getWeekStart(assignment.starts_at);
    const key = `${userId}-${projectId}-${weekStart}`;
    const hours = calculateWeeklyHours(assignment);

    if (grouped.has(key)) {
      // Aggregate hours for same user/project/week
      const existing = grouped.get(key)!;
      existing.hours += hours;
    } else {
      grouped.set(key, { userId, projectId, weekStart, hours });
    }
  }

  console.log(`📊 Grouped into ${grouped.size} unique allocations (${unmapped} unmapped)\n`);

  // Batch insert
  const allocations = Array.from(grouped.values());
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allocations.length; i += BATCH_SIZE) {
    const batch = allocations.slice(i, i + BATCH_SIZE);
    
    for (const alloc of batch) {
      // Check for existing allocation
      const { data: existing } = await supabase
        .from('allocations')
        .select('id')
        .eq('user_id', alloc.userId)
        .eq('project_id', alloc.projectId)
        .eq('week_start', alloc.weekStart)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Insert new allocation
      const { error } = await supabase
        .from('allocations')
        .insert({
          user_id: alloc.userId,
          project_id: alloc.projectId,
          week_start: alloc.weekStart,
          planned_hours: Math.round(alloc.hours * 100) / 100, // Round to 2 decimals
          is_billable: true,
        });

      if (error) {
        errors++;
        if (errors < 5) {
          console.error(`   ❌ Error:`, error.message);
        }
      } else {
        created++;
      }
    }

    // Progress
    const progress = Math.min(i + BATCH_SIZE, allocations.length);
    console.log(`   Progress: ${progress}/${allocations.length} processed (${created} created, ${skipped} skipped)`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Created: ${created} allocations`);
  console.log(`⏭️ Skipped (existing): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`⚠️ Unmapped (missing user/project): ${unmapped}`);
}

// Run
importAssignments().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
