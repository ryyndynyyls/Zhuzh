/**
 * Import 10kft Nested Projects as Sub-Projects
 * 
 * This script:
 * 1. Reads missing_projects.json (child projects that were merged with parents)
 * 2. Creates new projects for each child
 * 3. Sets parent_id to link them to their parent project
 * 4. Sets legacy_10kft_id for reference
 * 
 * Run with: npx tsx scripts/import-10kft-subprojects.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Missing10kftProject {
  id: number;
  name: string;
  phase_name: string;
  parent_id: number;
  archived: boolean;
  starts_at: string;
  ends_at: string;
  client: string | null;
  owner_name: string;
  project_state: string;
}

async function main() {
  console.log('🚀 Starting 10kft sub-project import...\n');

  // Load data files
  const dataDir = path.join(__dirname, '..', 'data', '10kft-export');
  
  const missingProjects: Missing10kftProject[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'missing_projects.json'), 'utf-8')
  );
  
  const projectMapping: Record<string, string> = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'project_mapping.json'), 'utf-8')
  );

  console.log(`📂 Loaded ${missingProjects.length} missing projects to import\n`);

  // Group by parent for logging
  const byParent: Record<number, Missing10kftProject[]> = {};
  for (const p of missingProjects) {
    if (!byParent[p.parent_id]) byParent[p.parent_id] = [];
    byParent[p.parent_id].push(p);
  }

  console.log(`📊 Found ${Object.keys(byParent).length} parent projects with children:\n`);

  // Track results
  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const newMappings: Record<string, string> = {};

  // Process each parent group
  for (const [parentIdStr, children] of Object.entries(byParent)) {
    const parent10kftId = parseInt(parentIdStr);
    const parentUuid = projectMapping[parentIdStr];

    if (!parentUuid) {
      console.log(`⚠️  Parent ${parent10kftId} not found in mapping, skipping ${children.length} children`);
      results.skipped += children.length;
      continue;
    }

    // Get parent project details
    const { data: parentProject, error: parentError } = await supabase
      .from('projects')
      .select('id, name, org_id, client_id, color, hourly_rate')
      .eq('id', parentUuid)
      .single();

    if (parentError || !parentProject) {
      console.log(`⚠️  Parent UUID ${parentUuid} not found in database, skipping`);
      results.skipped += children.length;
      continue;
    }

    console.log(`\n📁 Parent: ${parentProject.name} (${parentUuid})`);
    console.log(`   Creating ${children.length} sub-projects...`);

    for (const child of children) {
      // Check if this child already exists (by legacy_10kft_id)
      const { data: existing } = await supabase
        .from('projects')
        .select('id, name')
        .eq('legacy_10kft_id', child.id)
        .single();

      if (existing) {
        console.log(`   ⏭️  ${child.phase_name} already exists (${existing.id})`);
        results.skipped++;
        newMappings[child.id.toString()] = existing.id;
        continue;
      }

      // Skip archived projects unless you want to import them
      if (child.archived) {
        console.log(`   📦 ${child.phase_name} [ARCHIVED] - skipping`);
        results.skipped++;
        continue;
      }

      // Create the sub-project
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          name: child.phase_name || child.name,
          parent_id: parentUuid,
          org_id: parentProject.org_id,
          client_id: parentProject.client_id,
          color: parentProject.color,
          hourly_rate: parentProject.hourly_rate,
          legacy_10kft_id: child.id,
          status: child.project_state === 'Confirmed' ? 'active' : 'planning',
          is_billable: true,
        })
        .select()
        .single();

      if (createError) {
        console.log(`   ❌ Failed to create ${child.phase_name}: ${createError.message}`);
        results.errors.push(`${child.phase_name}: ${createError.message}`);
        continue;
      }

      console.log(`   ✅ Created: ${child.phase_name} (${newProject.id})`);
      results.created++;
      newMappings[child.id.toString()] = newProject.id;
    }
  }

  // Update the project mapping file with new mappings
  const updatedMapping = { ...projectMapping, ...newMappings };
  fs.writeFileSync(
    path.join(dataDir, 'project_mapping.json'),
    JSON.stringify(updatedMapping, null, 2)
  );

  console.log('\n' + '='.repeat(50));
  console.log('📊 Import Summary:');
  console.log(`   ✅ Created: ${results.created}`);
  console.log(`   ⏭️  Skipped: ${results.skipped}`);
  console.log(`   ❌ Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(e => console.log(`   - ${e}`));
  }

  console.log('\n✨ Done!');
}

main().catch(console.error);
