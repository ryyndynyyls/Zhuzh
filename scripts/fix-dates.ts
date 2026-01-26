/**
 * Fix allocations to correct Monday date (2026-01-12)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log('🔧 Fixing allocation dates...\n');

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

  // Fix this week: 2026-01-13 → 2026-01-12
  const { error: err1 } = await supabase
    .from('allocations')
    .update({ week_start: '2026-01-12' })
    .eq('user_id', ryan.id)
    .eq('week_start', '2026-01-13');

  if (err1) console.error('Error fixing this week:', err1);
  else console.log('✅ Fixed this week: 2026-01-13 → 2026-01-12');

  // Fix next week: 2026-01-20 → 2026-01-19
  const { error: err2 } = await supabase
    .from('allocations')
    .update({ week_start: '2026-01-19' })
    .eq('user_id', ryan.id)
    .eq('week_start', '2026-01-20');

  if (err2) console.error('Error fixing next week:', err2);
  else console.log('✅ Fixed next week: 2026-01-20 → 2026-01-19');

  // Verify
  const { data: allocations } = await supabase
    .from('allocations')
    .select('week_start, planned_hours, project:projects(name)')
    .eq('user_id', ryan.id)
    .order('week_start');

  console.log('\n📊 Updated allocations:');
  allocations?.forEach(a => {
    const proj = a.project as any;
    console.log(`  ${a.week_start} → ${proj?.name}: ${a.planned_hours}h`);
  });

  console.log('\n🎉 Now try /week in Slack!');
}

fix().catch(console.error);
