/**
 * Supabase client for Slack/Node.js usage
 * Uses service role key for full database access (server-side only)
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for server-side

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables.');
  console.error('SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'SET' : 'MISSING');
  throw new Error('Missing Supabase environment variables in .env.local');
}

console.log('🔌 Supabase client initialized (service role)');

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
