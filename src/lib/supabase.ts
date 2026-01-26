import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Debug: log env vars (remove in production)
console.log('🔑 Supabase URL:', supabaseUrl ? 'SET' : 'MISSING')
console.log('🔑 Supabase Key:', supabaseKey ? 'SET' : 'MISSING')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing! Check .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)
