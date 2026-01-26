/**
 * Import Missing Projects (Nested Phases) from 10,000ft
 * 
 * These 45 "projects" are actually phases under parent projects.
 * We need to:
 * 1. Ensure parent projects exist (create if missing)
 * 2. Create these as phases under their parents
 * 3. Update project_mapping.json for assignments import
 * 
 * Run: npx tsx scripts/import-missing-projects.ts
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
const ORG_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; // UA5

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

function loadJSON(filename: string): any {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Missing file: ${filename}`);
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function saveJSON(filename: string, data: any): void {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// =============================================================================
// Main Import
// =============================================================================

async function importMissingProjects() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Import Missing Projects (Nested Phases)');
  console.log('═══════════════════════════════════════════════════\n');

  // Load data
  const missingProjects = loadJSON('missing_projects.json');
  const projectMapping: Record<string, string> = loadJSON('project_mapping.json');
  const clientMapping: Record<string, string> = loadJSON('client_mapping.json');
  
  console.log(`📂 Loaded ${missingProjects.length} missing projects\n`);

  // Track unique parent IDs we need to resolve
  const parentIds = new Set<number>();
  for (const proj of missingProjects) {
    if (proj.parent_id) {
      parentIds.add(proj.parent_id);
    }
  }
  console.log(`🔗 Found ${parentIds.size} unique parent projects to resolve\n`);

  // Check which parents exist in our mapping
  const missingParents: number[] = [];
  for (const parentId of parentIds) {
    if (!projectMapping[parentId.toString()]) {
      missingParents.push(parentId);
    }
  }

  if (missingParents.length > 0) {
    console.log(`⚠️  ${missingParents.length} parent projects not in mapping:`);
    console.log(`   ${missingParents.join(', ')}`);
    console.log(`   These will be created as umbrella projects\n`);
  }

  // Stats
  let projectsCreated = 0;
  let phasesCreated = 0;
  let skipped = 0;
  let errors = 0;

  // First pass: Create any missing parent projects as umbrellas
  for (const parentId of missingParents) {
    // Find a child that references this parent to get context
    const child = missingProjects.find((p: any) => p.parent_id === parentId);
    const parentName = child?.name || `Project ${parentId}`;
    
    // Check if it exists
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('external_id', parentId.toString())
      .maybeSingle();

    if (existing) {
      projectMapping[parentId.toString()] = existing.id;
      console.log(`   Found existing parent: ${parentId} → ${existing.id}`);
      continue;
    }

    // Create umbrella project
    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        org_id: ORG_ID,
        name: parentName,
        external_id: parentId.toString(),
        is_active: true,
        is_billable: true,
      })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Failed to create parent ${parentId}:`, error.message);
      errors++;
    } else {
      projectMapping[parentId.toString()] = newProject.id;
      projectsCreated++;
      console.log(`   ✅ Created umbrella project: ${parentName} (${parentId})`);
    }
  }

  console.log('');

  // Second pass: Import the 45 missing projects as phases
  console.log('📦 Importing phases...\n');

  for (const proj of missingProjects) {
    const tenKftId = proj.id.toString();
    
    // Skip if already mapped
    if (projectMapping[tenKftId]) {
      skipped++;
      continue;
    }

    // Get parent project ID
    const parentResourceFlowId = proj.parent_id 
      ? projectMapping[proj.parent_id.toString()]
      : null;

    if (!parentResourceFlowId && proj.parent_id) {
      console.log(`   ⚠️ Skipping ${proj.name} - parent ${proj.parent_id} not found`);
      skipped++;
      continue;
    }

    // Determine if this should be a project or phase
    // If it has a parent, it's a phase. Otherwise it's a standalone project.
    if (parentResourceFlowId) {
      // Create as phase under parent project
      const phaseName = proj.phase_name || proj.name;
      
      // Check if phase already exists
      const { data: existingPhase } = await supabase
        .from('project_phases')
        .select('id')
        .eq('project_id', parentResourceFlowId)
        .eq('name', phaseName)
        .maybeSingle();

      if (existingPhase) {
        // Map to existing phase (for assignments, we'll use project_id)
        projectMapping[tenKftId] = parentResourceFlowId;
        skipped++;
        continue;
      }

      // Create phase
      const { data: newPhase, error } = await supabase
        .from('project_phases')
        .insert({
          project_id: parentResourceFlowId,
          name: phaseName,
          external_id: tenKftId,
          starts_at: proj.starts_at,
          ends_at: proj.ends_at,
          is_active: !proj.archived,
        })
        .select()
        .single();

      if (error) {
        console.error(`   ❌ Failed to create phase "${phaseName}":`, error.message);
        errors++;
      } else {
        // Map 10kft "project" ID to ResourceFlow project ID (for assignments)
        // Assignments will go to the parent project, phase tracked separately
        projectMapping[tenKftId] = parentResourceFlowId;
        phasesCreated++;
        console.log(`   ✅ Phase: ${phaseName} → ${parentResourceFlowId}`);
      }
    } else {
      // No parent - create as standalone project
      let clientId = null;
      if (proj.client) {
        // Try to find or create client
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('name', proj.client)
          .eq('org_id', ORG_ID)
          .maybeSingle();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const { data: newClient } = await supabase
            .from('clients')
            .insert({ org_id: ORG_ID, name: proj.client })
            .select()
            .single();
          clientId = newClient?.id;
        }
      }

      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          org_id: ORG_ID,
          client_id: clientId,
          name: proj.name,
          external_id: tenKftId,
          starts_at: proj.starts_at,
          ends_at: proj.ends_at,
          is_active: !proj.archived,
          is_billable: true,
        })
        .select()
        .single();

      if (error) {
        console.error(`   ❌ Failed to create project "${proj.name}":`, error.message);
        errors++;
      } else {
        projectMapping[tenKftId] = newProject.id;
        projectsCreated++;
        console.log(`   ✅ Project: ${proj.name}`);
      }
    }
  }

  // Save updated mapping
  saveJSON('project_mapping.json', projectMapping);
  console.log('\n💾 Saved updated project_mapping.json');

  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Projects created: ${projectsCreated}`);
  console.log(`✅ Phases created: ${phasesCreated}`);
  console.log(`⏭️  Skipped (existing): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`\n📊 Total mappings: ${Object.keys(projectMapping).length}`);
}

// Run
importMissingProjects().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
