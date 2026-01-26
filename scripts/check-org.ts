import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkOrg() {
  const orgId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  
  console.log('Checking for org:', orgId);
  console.log('URL:', (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.slice(0, 40));
  console.log('Has service key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Check without .single() first
  const { data: all, error: allError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', orgId);
    
  console.log('\nWithout .single():');
  console.log('Data:', all);
  console.log('Error:', allError);
  console.log('Row count:', all?.length);
  
  // Try listing all orgs
  const { data: allOrgs, error: listError } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(5);
    
  console.log('\nAll organizations (limit 5):');
  console.log('Data:', allOrgs);
  console.log('Error:', listError);
}

checkOrg().catch(console.error);
