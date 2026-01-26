/**
 * Reset Ryan's timesheet for testing
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function reset() {
  // Get Ryan
  const { data: ryan } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'ryand@useallfive.com')
    .single();

  if (!ryan) {
    console.log('❌ Ryan not found');
    return;
  }

  // Get his confirmations
  const { data: confirmations } = await supabase
    .from('time_confirmations')
    .select('id')
    .eq('user_id', ryan.id);

  if (confirmations && confirmations.length > 0) {
    const ids = confirmations.map(c => c.id);
    
    // Delete time entries first (foreign key)
    await supabase
      .from('time_entries')
      .delete()
      .in('confirmation_id', ids);
    console.log('✅ Deleted time entries');

    // Delete confirmations
    await supabase
      .from('time_confirmations')
      .delete()
      .eq('user_id', ryan.id);
    console.log('✅ Deleted confirmations');
  }

  console.log('\n🧹 Reset complete! Try /week again.');
}

reset().catch(console.error);
