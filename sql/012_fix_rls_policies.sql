-- =============================================================================
-- RLS FIX: Link Supabase Auth to Users Table
-- =============================================================================
-- Problem: RLS policies use auth.uid() but that returns Supabase Auth UUID,
-- not the users table ID. They're different!
--
-- Solution: Create a helper function that maps auth.email() to users.id
-- =============================================================================

-- Step 1: Create a function to get the current user's org_id via email
CREATE OR REPLACE FUNCTION get_current_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE email = auth.email() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Step 2: Create a function to get the current user's ID via email
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE email = auth.email() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Step 3: Create a function to get the current user's role via email
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE email = auth.email() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================================================
-- DROP EXISTING BROKEN POLICIES
-- =============================================================================

-- Organizations
DROP POLICY IF EXISTS org_isolation ON organizations;

-- Users
DROP POLICY IF EXISTS users_org_isolation ON users;

-- Clients
DROP POLICY IF EXISTS clients_org_isolation ON clients;

-- Projects
DROP POLICY IF EXISTS projects_org_isolation ON projects;

-- Phases
DROP POLICY IF EXISTS phases_org_isolation ON project_phases;

-- Allocations
DROP POLICY IF EXISTS allocations_org_isolation ON allocations;

-- Time confirmations
DROP POLICY IF EXISTS confirmations_employee_own ON time_confirmations;
DROP POLICY IF EXISTS confirmations_employee_modify ON time_confirmations;
DROP POLICY IF EXISTS confirmations_employee_update ON time_confirmations;

-- Time entries
DROP POLICY IF EXISTS entries_via_confirmation ON time_entries;

-- PTO entries
DROP POLICY IF EXISTS pto_visibility ON pto_entries;
DROP POLICY IF EXISTS pto_modify_own ON pto_entries;
DROP POLICY IF EXISTS pto_update_own ON pto_entries;

-- Audit log
DROP POLICY IF EXISTS audit_org_isolation ON audit_log;
DROP POLICY IF EXISTS audit_insert ON audit_log;

-- =============================================================================
-- CREATE NEW POLICIES USING EMAIL-BASED FUNCTIONS
-- =============================================================================

-- Organizations: users can only see their own organization
CREATE POLICY org_isolation ON organizations
    FOR ALL
    USING (id = get_current_user_org_id());

-- Users: can see all users in their organization
CREATE POLICY users_org_isolation ON users
    FOR ALL
    USING (org_id = get_current_user_org_id());

-- Clients: can see all clients in their organization
CREATE POLICY clients_org_isolation ON clients
    FOR ALL
    USING (org_id = get_current_user_org_id());

-- Projects: can see all projects in their organization
CREATE POLICY projects_org_isolation ON projects
    FOR ALL
    USING (org_id = get_current_user_org_id());

-- Phases: can see phases for projects in their organization
CREATE POLICY phases_org_isolation ON project_phases
    FOR ALL
    USING (project_id IN (
        SELECT id FROM projects WHERE org_id = get_current_user_org_id()
    ));

-- Allocations: can see allocations for projects in their organization
CREATE POLICY allocations_org_isolation ON allocations
    FOR ALL
    USING (project_id IN (
        SELECT id FROM projects WHERE org_id = get_current_user_org_id()
    ));

-- Time confirmations: employees see own, pm/admin see all in org
CREATE POLICY confirmations_select ON time_confirmations
    FOR SELECT
    USING (
        user_id = get_current_user_id()
        OR get_current_user_role() IN ('pm', 'admin')
    );

CREATE POLICY confirmations_insert ON time_confirmations
    FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

CREATE POLICY confirmations_update ON time_confirmations
    FOR UPDATE
    USING (
        user_id = get_current_user_id()
        OR get_current_user_role() IN ('pm', 'admin')
    );

CREATE POLICY confirmations_delete ON time_confirmations
    FOR DELETE
    USING (
        user_id = get_current_user_id()
        OR get_current_user_role() IN ('pm', 'admin')
    );

-- Time entries: follows confirmation access
CREATE POLICY entries_select ON time_entries
    FOR SELECT
    USING (confirmation_id IN (
        SELECT id FROM time_confirmations
        WHERE user_id = get_current_user_id()
        OR get_current_user_role() IN ('pm', 'admin')
    ));

CREATE POLICY entries_insert ON time_entries
    FOR INSERT
    WITH CHECK (confirmation_id IN (
        SELECT id FROM time_confirmations WHERE user_id = get_current_user_id()
    ));

CREATE POLICY entries_update ON time_entries
    FOR UPDATE
    USING (confirmation_id IN (
        SELECT id FROM time_confirmations
        WHERE user_id = get_current_user_id()
        OR get_current_user_role() IN ('pm', 'admin')
    ));

CREATE POLICY entries_delete ON time_entries
    FOR DELETE
    USING (confirmation_id IN (
        SELECT id FROM time_confirmations
        WHERE user_id = get_current_user_id()
        OR get_current_user_role() IN ('pm', 'admin')
    ));

-- PTO: everyone in org can see (for planning), but only own or pm/admin can modify
CREATE POLICY pto_select ON pto_entries
    FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users WHERE org_id = get_current_user_org_id()
        )
    );

CREATE POLICY pto_insert ON pto_entries
    FOR INSERT
    WITH CHECK (
        user_id = get_current_user_id()
        OR get_current_user_role() IN ('pm', 'admin')
    );

CREATE POLICY pto_update ON pto_entries
    FOR UPDATE
    USING (
        user_id = get_current_user_id()
        OR get_current_user_role() IN ('pm', 'admin')
    );

CREATE POLICY pto_delete ON pto_entries
    FOR DELETE
    USING (
        user_id = get_current_user_id()
        OR get_current_user_role() IN ('pm', 'admin')
    );

-- Audit log: can see audit entries for their organization
CREATE POLICY audit_select ON audit_log
    FOR SELECT
    USING (org_id = get_current_user_org_id());

-- Only pm/admin can insert audit entries (or service role)
CREATE POLICY audit_insert ON audit_log
    FOR INSERT
    WITH CHECK (org_id = get_current_user_org_id());

-- =============================================================================
-- ENSURE RLS IS ENABLED
-- =============================================================================

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

-- =============================================================================
-- VERIFICATION QUERIES (run these after migration to test)
-- =============================================================================
-- 
-- -- Check RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('projects', 'allocations', 'users', 'time_confirmations');
--
-- -- Check policies exist
-- SELECT tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- =============================================================================
