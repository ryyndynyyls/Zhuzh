/**
 * Shared Supabase client for API routes
 * Uses service role key for admin operations
 */

import dotenv from 'dotenv';
import path from 'path';

// Load env before creating client
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
