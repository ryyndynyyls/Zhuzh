/**
 * Task 2: Import Projects & Clients from 10,000ft to ResourceFlow
 * 
 * Maps 10kft projects and extracts clients.
 * Creates project_mapping.json and client_mapping.json for subsequent tasks.
 * 
 * Run: npx tsx scripts/import-projects.ts
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

function mapProjectStatus(tenkftState: string | null): 'planning' | 'active' | 'on-hold' | 'complete' {
  if (!tenkftState) return 'active';
  
  const state = tenkftState.toLowerCase();
  if (state === 'confirmed' || state === 'internal') return 'active';
  if (state === 'tentative') return 'planning';
  if (state === 'archived') return 'complete';
  return 'active';
}

// =============================================================================
// Import Clients
// =============================================================================

async function importClients(projects: any[]): Promise<Record<string, string>> {
  console.log('\n📥 Importing Clients...');
  
  // Extract unique client names
  const clientNames = new Set<string>();
  for (const project of projects) {
    if (project.client && typeof project.client === 'string' && project.client.trim()) {
      clientNames.add(project.client.trim());
    }
  }
  
  console.log(`   Found ${clientNames.size} unique clients`);
  
  const mapping: Record<string, string> = {}; // client_name -> uuid
  let created = 0;
  let skipped = 0;

  for (const clientName of clientNames) {
    // Check if client exists
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('name', clientName)
      .eq('org_id', ORG_ID)
      .maybeSingle();

    if (existing) {
      mapping[clientName] = existing.id;
      skipped++;
      continue;
    }

    // Create client
    const { data: inserted, error } = await supabase
      .from('clients')
      .insert({ org_id: ORG_ID, name: clientName })
      .select('id')
      .single();

    if (error) {
      console.error(`   ❌ Error creating client "${clientName}":`, error.message);
      continue;
    }

    mapping[clientName] = inserted.id;
    created++;
  }

  console.log(`   ✅ Created ${created} clients, skipped ${skipped} existing`);
  saveMapping('client_mapping.json', mapping);
  
  return mapping;
}

// =============================================================================
// Import Projects
// =============================================================================

async function importProjects(projects: any[], clientMapping: Record<string, string>): Promise<Record<string, string>> {
  console.log('\n📥 Importing Projects...');
  
  const mapping: Record<string, string> = {}; // tenkft_id -> supabase_uuid
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const project of projects) {
    const projectName = project.name?.trim();
    
    if (!projectName) {
      console.log(`   ⚠️ Skipping project with no name (id: ${project.id})`);
      skipped++;
      continue;
    }

    // Check if project exists
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('name', projectName)
      .eq('org_id', ORG_ID)
      .maybeSingle();

    if (existing) {
      mapping[project.id] = existing.id;
      skipped++;
      continue;
    }

    // Get client_id if client exists
    const clientId = project.client ? clientMapping[project.client.trim()] : null;

    // Create project
    const newProject = {
      org_id: ORG_ID,
      name: projectName,
      client_id: clientId || null,
      description: project.description || null,
      budget_hours: project.budget_total || project.budget || null,
      hourly_rate: project.rate || null,
      is_billable: project.billable !== false,
      status: mapProjectStatus(project.project_state),
      color: project.color || '#3B82F6',
    };

    const { data: inserted, error } = await supabase
      .from('projects')
      .insert(newProject)
      .select('id')
      .single();

    if (error) {
      console.error(`   ❌ Error creating "${projectName}":`, error.message);
      errors++;
      continue;
    }

    mapping[project.id] = inserted.id;
    created++;
    
    if (created % 20 === 0) {
      console.log(`   Progress: ${created} projects created...`);
    }
  }

  console.log(`   ✅ Created ${created} projects, skipped ${skipped} existing, ${errors} errors`);
  saveMapping('project_mapping.json', mapping);
  
  return mapping;
}

// =============================================================================
// Import Phases
// =============================================================================

async function importPhases(phases: any[], projectMapping: Record<string, string>) {
  console.log('\n📥 Importing Project Phases...');
  
  let created = 0;
  let skipped = 0;

  for (const phase of phases) {
    const projectId = projectMapping[phase._project_id];
    
    if (!projectId) {
      skipped++;
      continue;
    }

    // phase_name is the actual phase name, not phase.name (which is the project name)
    const phaseName = (phase.phase_name || phase.name)?.trim();
    if (!phaseName) {
      skipped++;
      continue;
    }

    // Check if phase exists
    const { data: existing } = await supabase
      .from('project_phases')
      .select('id')
      .eq('project_id', projectId)
      .eq('name', phaseName)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Create phase
    const { error } = await supabase
      .from('project_phases')
      .insert({
        project_id: projectId,
        name: phaseName,
        budget_hours: phase.budget_total || phase.budget_items?.[0]?.budget || null,
        sort_order: phase.sort_order || 0,
        status: phase.status === 'archived' ? 'complete' : 'active',
      });

    if (error) {
      // Likely a duplicate, skip silently
      skipped++;
      continue;
    }

    created++;
  }

  console.log(`   ✅ Created ${created} phases, skipped ${skipped}`);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Task 2: Import Projects & Clients');
  console.log('═══════════════════════════════════════════════════\n');

  // Load data
  const projects = loadData('projects.json');
  const phases = loadData('phases.json');
  
  console.log(`📂 Loaded ${projects.length} projects, ${phases.length} phases from 10kft export`);

  // Import in order
  const clientMapping = await importClients(projects);
  const projectMapping = await importProjects(projects, clientMapping);
  await importPhases(phases, projectMapping);

  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📁 client_mapping.json: ${Object.keys(clientMapping).length} clients`);
  console.log(`📁 project_mapping.json: ${Object.keys(projectMapping).length} projects`);
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
