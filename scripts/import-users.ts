/**
 * Task 1: Import Users from 10,000ft to ResourceFlow
 * 
 * Maps 10kft users to ResourceFlow users table.
 * Creates user_mapping.json for subsequent tasks.
 * 
 * Run: npx tsx scripts/import-users.ts
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
const ORG_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; // Use All Five

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

function loadData(filename: string): any[] {
  const filepath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function saveMapping(filename: string, mapping: Record<string, string>): void {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(mapping, null, 2));
  console.log(`💾 Saved ${filename}`);
}

function mapRole(tenkftRole: string | null): 'employee' | 'pm' | 'admin' {
  if (!tenkftRole) return 'employee';
  
  const role = tenkftRole.toLowerCase();
  if (role.includes('prostrat') || role.includes('producer') || role.includes('manager')) {
    return 'pm';
  }
  // For now, no one gets admin - that's assigned manually
  return 'employee';
}

// =============================================================================
// Main Import
// =============================================================================

async function importUsers() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Task 1: Import Users');
  console.log('═══════════════════════════════════════════════════\n');

  // Load 10kft users
  const tenkftUsers = loadData('users.json');
  console.log(`📂 Loaded ${tenkftUsers.length} users from 10kft export\n`);

  const mapping: Record<string, string> = {}; // tenkft_id -> supabase_uuid
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of tenkftUsers) {
    const email = user.email?.toLowerCase()?.trim();
    
    if (!email) {
      console.log(`⚠️ Skipping user ${user.first_name} ${user.last_name} - no email`);
      skipped++;
      continue;
    }

    // Check if user already exists
    const { data: existing, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('org_id', ORG_ID)
      .maybeSingle();

    if (lookupError) {
      console.error(`❌ Error looking up ${email}:`, lookupError.message);
      errors++;
      continue;
    }

    if (existing) {
      console.log(`⏭️ User exists: ${email} -> ${existing.id}`);
      mapping[user.id] = existing.id;
      skipped++;
      continue;
    }

    // Create new user
    const newUser = {
      org_id: ORG_ID,
      email: email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: mapRole(user.role),
      hourly_rate: user.billrate > 0 ? user.billrate : null,
      is_active: !user.archived,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert(newUser)
      .select('id')
      .single();

    if (insertError) {
      console.error(`❌ Error creating ${email}:`, insertError.message);
      errors++;
      continue;
    }

    console.log(`✅ Created: ${newUser.name} (${newUser.role}) -> ${inserted.id}`);
    mapping[user.id] = inserted.id;
    created++;
  }

  // Save mapping file
  saveMapping('user_mapping.json', mapping);

  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️ Skipped (existing): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📁 Mapping saved to: user_mapping.json`);
  console.log(`📊 Total mapped: ${Object.keys(mapping).length} users`);
}

// Run
importUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
