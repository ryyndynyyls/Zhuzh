/**
 * Debug: Check dates and allocations
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// The getWeekStart function from the Slack command
function getWeekStart(weekOffset = 0): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday + (weekOffset * 7));
  return monday.toISOString().split('T')[0];
}

async function debug() {
  console.log('🔍 DEBUG INFO\n');
  
  // Date calculations
  const now = new Date();
  console.log('📅 Date calculations:');
  console.log('  now:', now.toISOString());
  console.log('  now.getDay():', now.getDay(), '(0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)');
  console.log('  now.getDate():', now.getDate());
  console.log('  getWeekStart(0):', getWeekStart(0));
  console.log('  getWeekStart(-1):', getWeekStart(-1));
  
  // What dates SHOULD be
  console.log('\n📆 Expected (if today is Wed Jan 14, 2026):');
  console.log('  This Monday: 2026-01-12');
  console.log('  Last Monday: 2026-01-05');

  // Get Ryan
  const { data: ryan } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'ryand@useallfive.com')
    .single();

  if (!ryan) {
    console.error('❌ Ryan not found');
    return;
  }

  // Check allocations in DB
  const { data: allocations } = await supabase
    .from('allocations')
    .select('week_start, planned_hours, project:projects(name)')
    .eq('user_id', ryan.id)
    .order('week_start');

  console.log('\n📊 Allocations in database:');
  allocations?.forEach(a => {
    const proj = a.project as any;
    console.log(`  ${a.week_start} → ${proj?.name}: ${a.planned_hours}h`);
  });

  // The fix
  console.log('\n🔧 To fix, allocations should have week_start = 2026-01-12 (this Monday)');
}

debug().catch(console.error);
