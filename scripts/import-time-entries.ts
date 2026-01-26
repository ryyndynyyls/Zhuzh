/**
 * Task 4: Import Time Entries from 10,000ft to ResourceFlow
 * 
 * Depends on: user_mapping.json, project_mapping.json (from Tasks 1 & 2)
 * 
 * Creates time_confirmations (one per user/week) and time_entries (line items)
 * 
 * Run: npx tsx scripts/import-time-entries.ts
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
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setUTCDate(diff));
  return monday.toISOString().split('T')[0];
}

// =============================================================================
// Types
// =============================================================================

interface GroupedEntry {
  userId: string;
  projectId: string;
  weekStart: string;
  totalHours: number;
  notes: string[];
  isApproved: boolean;
}

interface WeekGroup {
  userId: string;
  weekStart: string;
  entries: GroupedEntry[];
  isApproved: boolean;
}

// =============================================================================
// Main Import
// =============================================================================

async function importTimeEntries() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Task 4: Import Time Entries');
  console.log('═══════════════════════════════════════════════════\n');

  // Load mappings
  console.log('📂 Loading mappings...');
  const userMapping: Record<string, string> = loadData('user_mapping.json');
  const projectMapping: Record<string, string> = loadData('project_mapping.json');
  console.log(`   Users: ${Object.keys(userMapping).length} mapped`);
  console.log(`   Projects: ${Object.keys(projectMapping).length} mapped`);

  // Load time entries
  const timeEntries = loadData('time_entries.json');
  console.log(`   Time Entries: ${timeEntries.length} to process\n`);

  // Group by user -> week -> project
  const userWeeks = new Map<string, WeekGroup>();
  let unmapped = 0;

  for (const entry of timeEntries) {
    const userId = userMapping[entry._user_id];
    const projectId = projectMapping[entry.assignable_id];
    
    if (!userId || !projectId) {
      unmapped++;
      continue;
    }

    if (!entry.date) continue;

    const weekStart = getWeekStart(entry.date);
    const userWeekKey = `${userId}-${weekStart}`;
    const entryKey = `${userId}-${projectId}-${weekStart}`;

    // Get or create week group
    if (!userWeeks.has(userWeekKey)) {
      userWeeks.set(userWeekKey, {
        userId,
        weekStart,
        entries: [],
        isApproved: true, // Will be set to false if any entry is not approved
      });
    }

    const weekGroup = userWeeks.get(userWeekKey)!;
    
    // Check if we already have an entry for this project
    let projectEntry = weekGroup.entries.find(e => e.projectId === projectId);
    
    if (!projectEntry) {
      projectEntry = {
        userId,
        projectId,
        weekStart,
        totalHours: 0,
        notes: [],
        isApproved: entry.approved ?? true,
      };
      weekGroup.entries.push(projectEntry);
    }

    projectEntry.totalHours += entry.hours || 0;
    if (entry.notes) {
      projectEntry.notes.push(entry.notes);
    }
    if (!entry.approved) {
      weekGroup.isApproved = false;
    }
  }

  console.log(`📊 Grouped into ${userWeeks.size} user-weeks (${unmapped} unmapped entries)\n`);

  // Process each week
  let confirmationsCreated = 0;
  let confirmationsSkipped = 0;
  let entriesCreated = 0;
  let entriesSkipped = 0;
  let errors = 0;

  const weeks = Array.from(userWeeks.values());
  
  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];

    // Check if confirmation already exists
    const { data: existingConfirmation } = await supabase
      .from('time_confirmations')
      .select('id')
      .eq('user_id', week.userId)
      .eq('week_start', week.weekStart)
      .maybeSingle();

    let confirmationId: string;

    if (existingConfirmation) {
      confirmationId = existingConfirmation.id;
      confirmationsSkipped++;
    } else {
      // Create confirmation
      const { data: newConfirmation, error } = await supabase
        .from('time_confirmations')
        .insert({
          user_id: week.userId,
          week_start: week.weekStart,
          status: week.isApproved ? 'approved' : 'submitted',
          submitted_at: new Date().toISOString(),
          approved_at: week.isApproved ? new Date().toISOString() : null,
        })
        .select('id')
        .single();

      if (error) {
        errors++;
        continue;
      }

      confirmationId = newConfirmation.id;
      confirmationsCreated++;
    }

    // Create time entries for this confirmation
    for (const entry of week.entries) {
      // Check if entry exists
      const { data: existingEntry } = await supabase
        .from('time_entries')
        .select('id')
        .eq('confirmation_id', confirmationId)
        .eq('project_id', entry.projectId)
        .maybeSingle();

      if (existingEntry) {
        entriesSkipped++;
        continue;
      }

      const { error } = await supabase
        .from('time_entries')
        .insert({
          confirmation_id: confirmationId,
          project_id: entry.projectId,
          planned_hours: 0, // Historical data - we don't know what was planned
          actual_hours: Math.round(entry.totalHours * 100) / 100,
          notes: entry.notes.length > 0 ? entry.notes.slice(0, 3).join(' | ') : null,
          is_unplanned: false,
        });

      if (error) {
        errors++;
      } else {
        entriesCreated++;
      }
    }

    // Progress every 100 weeks
    if ((i + 1) % 100 === 0 || i === weeks.length - 1) {
      console.log(`   Progress: ${i + 1}/${weeks.length} weeks processed`);
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Confirmations created: ${confirmationsCreated}`);
  console.log(`⏭️ Confirmations skipped: ${confirmationsSkipped}`);
  console.log(`✅ Time entries created: ${entriesCreated}`);
  console.log(`⏭️ Time entries skipped: ${entriesSkipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`⚠️ Unmapped entries: ${unmapped}`);
}

// Run
importTimeEntries().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
