/**
 * Seed script for ResourceFlow test data
 * Run with: npx tsx scripts/seed.ts
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to get Monday of current week
function getWeekStart(weekOffset = 0): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + (weekOffset * 7);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

async function seed() {
  console.log('🌱 Seeding ResourceFlow database...\n');

  const orgId = '00000000-0000-0000-0000-000000000000'; // Use All Five

  // 1. Get Ryan's user ID
  const { data: ryan, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'ryand@useallfive.com')
    .single();

  if (!ryan) {
    console.error('❌ Could not find Ryan in users table. Error:', userError);
    return;
  }

  console.log('✅ Found Ryan:', ryan.name, ryan.id);

  // 2. Get existing clients
  console.log('\n📦 Checking existing clients...');
  
  const { data: allClients } = await supabase.from('clients').select('*');
  console.log('✅ Found clients:', allClients?.map(c => c.name).join(', '));

  if (!allClients?.length) {
    console.error('❌ No clients found in database');
    return;
  }

  // Use the first two clients
  const client1 = allClients[0];
  const client2 = allClients[1] || allClients[0];

  // 3. Create projects
  console.log('\n🚀 Creating projects...');

  const projects = [
    {
      org_id: orgId,
      client_id: client1.id,
      name: `${client1.name} Website Redesign`,
      description: 'Complete redesign of corporate website',
      color: '#3B82F6',
      budget_hours: 200,
      hourly_rate: 150,
      is_billable: true,
      status: 'active' as const,
    },
    {
      org_id: orgId,
      client_id: client1.id,
      name: `${client1.name} Mobile App`,
      description: 'Native iOS and Android app',
      color: '#10B981',
      budget_hours: 400,
      hourly_rate: 175,
      is_billable: true,
      status: 'active' as const,
    },
    {
      org_id: orgId,
      client_id: client2.id,
      name: `${client2.name} Brand Refresh`,
      description: 'Logo, brand guidelines, collateral',
      color: '#8B5CF6',
      budget_hours: 80,
      hourly_rate: 125,
      is_billable: true,
      status: 'active' as const,
    },
  ];

  // Insert projects (don't use upsert, just insert)
  for (const project of projects) {
    // Check if project exists
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('name', project.name)
      .single();

    if (existing) {
      console.log(`  ⏭️  Project "${project.name}" already exists`);
    } else {
      const { error } = await supabase.from('projects').insert(project);
      if (error) {
        console.error(`  ❌ Error creating "${project.name}":`, error.message);
      } else {
        console.log(`  ✅ Created "${project.name}"`);
      }
    }
  }

  // Get all active projects
  const { data: allProjects } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active');

  if (!allProjects?.length) {
    console.error('❌ No active projects found');
    return;
  }

  console.log('\n📊 Active projects:', allProjects.map(p => p.name).join(', '));

  const websiteProject = allProjects.find(p => p.name.includes('Website'));
  const mobileProject = allProjects.find(p => p.name.includes('Mobile'));
  const brandProject = allProjects.find(p => p.name.includes('Brand'));

  // 4. Create project phases for website project
  if (websiteProject) {
    console.log('\n📋 Creating project phases...');

    const phases = [
      { project_id: websiteProject.id, name: 'Discovery', budget_hours: 40, sort_order: 1, status: 'complete' as const },
      { project_id: websiteProject.id, name: 'Design', budget_hours: 60, sort_order: 2, status: 'active' as const },
      { project_id: websiteProject.id, name: 'Development', budget_hours: 80, sort_order: 3, status: 'pending' as const },
      { project_id: websiteProject.id, name: 'QA & Launch', budget_hours: 20, sort_order: 4, status: 'pending' as const },
    ];

    if (mobileProject) {
      phases.push(
        { project_id: mobileProject.id, name: 'UX Research', budget_hours: 60, sort_order: 1, status: 'active' as const },
        { project_id: mobileProject.id, name: 'UI Design', budget_hours: 100, sort_order: 2, status: 'pending' as const },
      );
    }

    for (const phase of phases) {
      const { data: existing } = await supabase
        .from('project_phases')
        .select('id')
        .eq('project_id', phase.project_id)
        .eq('name', phase.name)
        .single();

      if (!existing) {
        await supabase.from('project_phases').insert(phase);
      }
    }
    console.log('✅ Phases created/verified');
  }

  // Get phases for allocations
  const { data: allPhases } = await supabase.from('project_phases').select('*');
  const designPhase = allPhases?.find(p => p.name === 'Design');
  const uxPhase = allPhases?.find(p => p.name === 'UX Research');

  // 5. Create allocations for Ryan this week and next
  console.log('\n📅 Creating allocations for Ryan...');

  const thisWeek = getWeekStart(0);
  const nextWeek = getWeekStart(1);

  // Delete existing allocations for Ryan to start fresh
  await supabase
    .from('allocations')
    .delete()
    .eq('user_id', ryan.id);

  const allocations = [];

  // This week allocations
  if (websiteProject) {
    allocations.push({
      project_id: websiteProject.id,
      user_id: ryan.id,
      phase_id: designPhase?.id || null,
      week_start: thisWeek,
      planned_hours: 20,
      is_billable: true,
      created_by: ryan.id,
    });
  }

  if (mobileProject) {
    allocations.push({
      project_id: mobileProject.id,
      user_id: ryan.id,
      phase_id: uxPhase?.id || null,
      week_start: thisWeek,
      planned_hours: 16,
      is_billable: true,
      created_by: ryan.id,
    });
  }

  // Next week allocations
  if (websiteProject) {
    allocations.push({
      project_id: websiteProject.id,
      user_id: ryan.id,
      phase_id: designPhase?.id || null,
      week_start: nextWeek,
      planned_hours: 24,
      is_billable: true,
      created_by: ryan.id,
    });
  }

  if (brandProject) {
    allocations.push({
      project_id: brandProject.id,
      user_id: ryan.id,
      phase_id: null,
      week_start: nextWeek,
      planned_hours: 8,
      is_billable: true,
      created_by: ryan.id,
    });
  }

  if (allocations.length > 0) {
    const { error: allocError } = await supabase
      .from('allocations')
      .insert(allocations);

    if (allocError) {
      console.error('❌ Error creating allocations:', allocError);
    } else {
      console.log('✅ Allocations created for', thisWeek, 'and', nextWeek);
    }
  }

  // Summary
  console.log('\n✨ Seed complete!\n');
  console.log('Your allocations this week (' + thisWeek + '):');
  if (websiteProject) console.log(`  • ${websiteProject.name}: 20h`);
  if (mobileProject) console.log(`  • ${mobileProject.name}: 16h`);
  console.log(`\nTry /week in Slack now!`);
}

seed().catch(console.error);
