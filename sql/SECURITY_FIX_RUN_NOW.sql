-- ============================================
-- ZHUZH SECURITY FIX - RUN IN SUPABASE SQL EDITOR
-- ============================================
-- Created: 2026-01-22
-- Purpose: Ensure RLS enabled, create security audit log
-- Time: ~1 minute to run
-- ============================================

-- STEP 1: Ensure RLS is enabled on all tables
-- (Safe to run even if already enabled)
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pto_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;


-- STEP 2: Create security audit log table for API-level logging
-- ============================================
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  
  -- What
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  
  -- Context
  org_id UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  
  -- Details
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  
  -- When
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for security audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's audit log
DROP POLICY IF EXISTS security_audit_select ON security_audit_log;
CREATE POLICY security_audit_select ON security_audit_log
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Allow inserts (service role will insert from API)
DROP POLICY IF EXISTS security_audit_insert ON security_audit_log;
CREATE POLICY security_audit_insert ON security_audit_log
    FOR INSERT
    WITH CHECK (true);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_security_audit_org_created ON security_audit_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_created ON security_audit_log(user_id, created_at DESC);


-- STEP 3: Verify RLS is enabled
-- ============================================
SELECT 
  c.relname as table_name,
  CASE WHEN c.relrowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
AND c.relkind = 'r'
AND c.relname IN (
  'organizations', 'users', 'clients', 'projects', 'project_phases',
  'allocations', 'time_confirmations', 'time_entries', 'time_entries_live',
  'pto_entries', 'audit_log', 'security_audit_log'
)
ORDER BY c.relname;


-- ============================================
-- DONE! Security fixes applied.
-- ============================================
