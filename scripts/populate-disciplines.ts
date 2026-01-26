/**
 * Populate user disciplines from 10kft role data
 * Run: npx tsx scripts/populate-disciplines.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DATA_DIR = path.join(__dirname, '../data/10kft-export');

async function populateDisciplines() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Populate User Disciplines from 10kft');
  console.log('═══════════════════════════════════════════════════\n');

  // Load 10kft users
  const users10kft = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf-8')
  );

  console.log(`📂 Loaded ${users10kft.length} users from 10kft\n`);

  // Build email -> role map
  const roleMap: Record<string, string> = {};
  for (const u of users10kft) {
    if (u.email && u.role) {
      roleMap[u.email.toLowerCase()] = u.role;
    }
  }

  console.log('Role distribution from 10kft:');
  const roleCounts: Record<string, number> = {};
  for (const role of Object.values(roleMap)) {
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  console.log(roleCounts);
  console.log('');

  // Get ResourceFlow users
  const { data: rfUsers, error } = await supabase
    .from('users')
    .select('id, email, name, discipline')
    .eq('org_id', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

  if (error) {
    console.error('Failed to fetch users:', error);
    return;
  }

  console.log(`📊 Found ${rfUsers?.length} ResourceFlow users\n`);

  // Update each user
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const user of rfUsers || []) {
    const role = roleMap[user.email?.toLowerCase()];
    
    if (!role) {
      console.log(`   ⚠️  No role found for ${user.email}`);
      notFound++;
      continue;
    }

    if (user.discipline === role) {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ discipline: role })
      .eq('id', user.id);

    if (updateError) {
      console.error(`   ❌ Failed to update ${user.name}:`, updateError.message);
    } else {
      console.log(`   ✅ ${user.name}: ${role}`);
      updated++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped (already set): ${skipped}`);
  console.log(`⚠️  No role in 10kft: ${notFound}`);
}

populateDisciplines().catch(console.error);
