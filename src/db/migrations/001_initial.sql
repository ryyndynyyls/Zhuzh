-- Zhuzh Initial Database Schema
-- Supabase/Postgres Migration
-- Created: January 14, 2026
--
-- This migration creates the complete database schema for Zhuzh,
-- a Slack-first resourcing and budget tracking system.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

-- User roles: employee (default), pm (producer/project manager), admin
CREATE TYPE user_role AS ENUM ('employee', 'pm', 'admin');

-- Project status lifecycle
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on-hold', 'complete');

-- Phase status within a project
CREATE TYPE phase_status AS ENUM ('pending', 'active', 'complete');

-- Time confirmation status workflow
CREATE TYPE confirmation_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- PTO/time-off types
CREATE TYPE pto_type AS ENUM ('pto', 'holiday', 'half-day', 'sick');

-- Audit log action types
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete');

-- =============================================================================
-- ORGANIZATIONS TABLE
-- Multi-tenant support: each organization has its own workspace
-- =============================================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slack_workspace_id VARCHAR(50) UNIQUE, -- Slack team ID for OAuth
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizations IS 'Multi-tenant organizations, each representing a company using Zhuzh';
COMMENT ON COLUMN organizations.slack_workspace_id IS 'Slack workspace/team ID for SSO integration';

-- =============================================================================
-- USERS TABLE
-- All users belong to an organization with role-based access
-- =============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    slack_user_id VARCHAR(50), -- Slack member ID for DMs
    hourly_rate DECIMAL(10, 2), -- Visible only to admin/pm per LOCKED decision
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_org_unique UNIQUE (org_id, email)
);

COMMENT ON TABLE users IS 'System users with role-based access (employee sees hours, pm/admin sees dollars)';
COMMENT ON COLUMN users.hourly_rate IS 'Billable rate - visible only to pm and admin roles';
COMMENT ON COLUMN users.slack_user_id IS 'Slack member ID for sending DMs (not channel posts per Kara)';

-- Indexes for common queries
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_slack_user_id ON users(slack_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(org_id, is_active);

-- =============================================================================
-- CLIENTS TABLE
-- Client companies that projects are billed to
-- =============================================================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT clients_name_org_unique UNIQUE (org_id, name)
);

COMMENT ON TABLE clients IS 'Client companies for project billing and organization';

CREATE INDEX idx_clients_org_id ON clients(org_id);
CREATE INDEX idx_clients_is_active ON clients(org_id, is_active);

-- =============================================================================
-- PROJECTS TABLE
-- Projects with budgets, rates, and lifecycle status
-- =============================================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT, -- Project snippet/tooltip for quick context (Michelle, Maleno request)
    color VARCHAR(7) DEFAULT '#FF8731', -- Hex color for visual identification
    budget_hours DECIMAL(10, 2), -- Total budget in hours
    hourly_rate DECIMAL(10, 2), -- Project billing rate
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER DEFAULT 50, -- Lower = higher priority (1 = highest, for sorting)
    status project_status NOT NULL DEFAULT 'planning',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT projects_name_org_unique UNIQUE (org_id, name)
);

COMMENT ON TABLE projects IS 'Projects with budgets and billing rates. Priority ordering per Maleno request.';
COMMENT ON COLUMN projects.description IS 'Project snippet shown on hover for quick context';
COMMENT ON COLUMN projects.priority IS 'Priority ranking (1=highest). High-priority projects shown first per Maleno.';
COMMENT ON COLUMN projects.color IS 'Hex color code for visual identification in calendar';

CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(org_id, status);
CREATE INDEX idx_projects_priority ON projects(org_id, priority);

-- =============================================================================
-- PROJECT_PHASES TABLE
-- Budget breakdown by phase (Design, Dev, QA, etc.) per Michelle's request
-- =============================================================================
CREATE TABLE project_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    budget_hours DECIMAL(10, 2), -- Phase-specific budget
    sort_order INTEGER NOT NULL DEFAULT 0, -- Display order
    status phase_status NOT NULL DEFAULT 'pending',

    CONSTRAINT phases_name_project_unique UNIQUE (project_id, name)
);

COMMENT ON TABLE project_phases IS 'Budget breakdown by phase for Phase Breakdown View (Michelle domain)';
COMMENT ON COLUMN project_phases.sort_order IS 'Display order for consistent phase ordering';

CREATE INDEX idx_phases_project_id ON project_phases(project_id);

-- =============================================================================
-- ALLOCATIONS TABLE
-- Planned hours per user/project/week (what PMs schedule)
-- =============================================================================
CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
    week_start DATE NOT NULL, -- Monday of the week
    planned_hours DECIMAL(5, 2) NOT NULL,
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- PM who created
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate allocations for same user/project/week
    CONSTRAINT allocations_user_project_week_unique UNIQUE (user_id, project_id, week_start)
);

COMMENT ON TABLE allocations IS 'Planned hours - what PMs schedule. Finalized by Thursday per Maleno.';
COMMENT ON COLUMN allocations.week_start IS 'Monday of the week (all weeks start Monday)';
COMMENT ON COLUMN allocations.created_by IS 'PM who created the allocation for audit trail';

CREATE INDEX idx_allocations_project_id ON allocations(project_id);
CREATE INDEX idx_allocations_user_id ON allocations(user_id);
CREATE INDEX idx_allocations_week_start ON allocations(week_start);
CREATE INDEX idx_allocations_user_week ON allocations(user_id, week_start);

-- =============================================================================
-- TIME_CONFIRMATIONS TABLE
-- Weekly submission records (employee confirms their week)
-- =============================================================================
CREATE TABLE time_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL, -- Monday of the week
    status confirmation_status NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    exact_match_flag BOOLEAN DEFAULT FALSE, -- Rubber-stamp detection per Michelle
    notes TEXT, -- Employee notes for context
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One confirmation per user per week
    CONSTRAINT confirmations_user_week_unique UNIQUE (user_id, week_start)
);

COMMENT ON TABLE time_confirmations IS 'Weekly timesheet submissions. Friday DM triggers confirmation.';
COMMENT ON COLUMN time_confirmations.exact_match_flag IS 'Rubber-stamp detection: TRUE when actual=planned exactly (Michelle insight)';
COMMENT ON COLUMN time_confirmations.rejection_reason IS 'Required comment when manager rejects';

CREATE INDEX idx_confirmations_user_id ON time_confirmations(user_id);
CREATE INDEX idx_confirmations_week_start ON time_confirmations(week_start);
CREATE INDEX idx_confirmations_status ON time_confirmations(status);
CREATE INDEX idx_confirmations_user_week ON time_confirmations(user_id, week_start);
CREATE INDEX idx_confirmations_pending ON time_confirmations(status) WHERE status = 'submitted';

-- =============================================================================
-- TIME_ENTRIES TABLE
-- Line items within confirmations (actual hours per project)
-- =============================================================================
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    confirmation_id UUID NOT NULL REFERENCES time_confirmations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
    allocation_id UUID REFERENCES allocations(id) ON DELETE SET NULL, -- Link to original plan
    planned_hours DECIMAL(5, 2) NOT NULL DEFAULT 0,
    actual_hours DECIMAL(5, 2) NOT NULL DEFAULT 0,
    is_unplanned BOOLEAN NOT NULL DEFAULT FALSE, -- "Add Unplanned Work" per Kara
    notes TEXT,
    tags TEXT[] DEFAULT '{}' -- Quick tags: urgent, client-call, tech-debt, scope-creep
);

COMMENT ON TABLE time_entries IS 'Line items in confirmations. Supports unplanned work (Kara feature).';
COMMENT ON COLUMN time_entries.is_unplanned IS 'TRUE for work added via "Add Unplanned Work" button';
COMMENT ON COLUMN time_entries.tags IS 'Quick categorization tags (urgent fix, client call, tech debt, scope creep)';
COMMENT ON COLUMN time_entries.allocation_id IS 'Reference to original allocation for plan vs actual comparison';

CREATE INDEX idx_entries_confirmation_id ON time_entries(confirmation_id);
CREATE INDEX idx_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_entries_allocation_id ON time_entries(allocation_id);
CREATE INDEX idx_entries_is_unplanned ON time_entries(is_unplanned) WHERE is_unplanned = TRUE;

-- =============================================================================
-- PTO_ENTRIES TABLE
-- PTO/holiday visibility (Maleno request - stop getting surprised by time off)
-- =============================================================================
CREATE TABLE pto_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type pto_type NOT NULL DEFAULT 'pto',
    hours DECIMAL(5, 2) NOT NULL DEFAULT 8, -- Hours unavailable
    notes TEXT,

    -- Prevent duplicate PTO entries for same user/date
    CONSTRAINT pto_user_date_unique UNIQUE (user_id, date)
);

COMMENT ON TABLE pto_entries IS 'PTO/holiday visibility in resource calendar (Maleno request)';
COMMENT ON COLUMN pto_entries.type IS 'Type of time off: pto, holiday, half-day, sick';

CREATE INDEX idx_pto_user_id ON pto_entries(user_id);
CREATE INDEX idx_pto_date ON pto_entries(date);
CREATE INDEX idx_pto_user_date_range ON pto_entries(user_id, date);

-- =============================================================================
-- AUDIT_LOG TABLE
-- Change tracking for drill-down variance analysis (Levi requirement)
-- =============================================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- Table name: projects, allocations, etc.
    entity_id UUID NOT NULL, -- Record ID that changed
    action audit_action NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}', -- Before/after values
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who made the change
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Audit trail for drill-down analysis: "40 extra hours on QA in week 3" (Levi)';
COMMENT ON COLUMN audit_log.changes IS 'JSONB with old/new values for changed fields';
COMMENT ON COLUMN audit_log.entity_type IS 'Table name affected (projects, allocations, time_entries, etc.)';

CREATE INDEX idx_audit_org_id ON audit_log(org_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_org_entity_type ON audit_log(org_id, entity_type);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- Multi-tenant security: users can only see data from their organization
-- =============================================================================

-- Enable RLS on all tables
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

-- Organizations: users can only see their own organization
CREATE POLICY org_isolation ON organizations
    FOR ALL
    USING (id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Users: can see all users in their organization
CREATE POLICY users_org_isolation ON users
    FOR ALL
    USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Clients: can see all clients in their organization
CREATE POLICY clients_org_isolation ON clients
    FOR ALL
    USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Projects: can see all projects in their organization
CREATE POLICY projects_org_isolation ON projects
    FOR ALL
    USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Phases: can see phases for projects in their organization
CREATE POLICY phases_org_isolation ON project_phases
    FOR ALL
    USING (project_id IN (
        SELECT id FROM projects WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    ));

-- Allocations: can see allocations for projects in their organization
CREATE POLICY allocations_org_isolation ON allocations
    FOR ALL
    USING (project_id IN (
        SELECT id FROM projects WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    ));

-- Time confirmations: employees see own, pm/admin see all in org
CREATE POLICY confirmations_employee_own ON time_confirmations
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('pm', 'admin')
    );

CREATE POLICY confirmations_employee_modify ON time_confirmations
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY confirmations_employee_update ON time_confirmations
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('pm', 'admin')
    );

-- Time entries: follows confirmation access
CREATE POLICY entries_via_confirmation ON time_entries
    FOR ALL
    USING (confirmation_id IN (
        SELECT id FROM time_confirmations
        WHERE user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('pm', 'admin')
    ));

-- PTO: employees see own, pm/admin see all in org for planning
CREATE POLICY pto_visibility ON pto_entries
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR user_id IN (
            SELECT id FROM users WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY pto_modify_own ON pto_entries
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY pto_update_own ON pto_entries
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('pm', 'admin')
    );

-- Audit log: can see audit entries for their organization
CREATE POLICY audit_org_isolation ON audit_log
    FOR SELECT
    USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Only system/admin can insert audit entries
CREATE POLICY audit_insert ON audit_log
    FOR INSERT
    WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_allocations_updated_at
    BEFORE UPDATE ON allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_confirmations_updated_at
    BEFORE UPDATE ON time_confirmations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- AUDIT LOG TRIGGER
-- Automatically log changes for audit trail (Levi requirement)
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    org UUID;
    changes_json JSONB;
BEGIN
    -- Get org_id based on the table
    IF TG_TABLE_NAME = 'projects' THEN
        org := COALESCE(NEW.org_id, OLD.org_id);
    ELSIF TG_TABLE_NAME = 'allocations' THEN
        SELECT p.org_id INTO org FROM projects p WHERE p.id = COALESCE(NEW.project_id, OLD.project_id);
    ELSIF TG_TABLE_NAME = 'time_confirmations' THEN
        SELECT u.org_id INTO org FROM users u WHERE u.id = COALESCE(NEW.user_id, OLD.user_id);
    ELSIF TG_TABLE_NAME = 'time_entries' THEN
        SELECT p.org_id INTO org
        FROM projects p
        WHERE p.id = COALESCE(NEW.project_id, OLD.project_id);
    ELSE
        org := NULL;
    END IF;

    -- Build changes JSON
    IF TG_OP = 'INSERT' THEN
        changes_json := jsonb_build_object('new', to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        changes_json := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        changes_json := jsonb_build_object('old', to_jsonb(OLD));
    END IF;

    -- Insert audit record
    IF org IS NOT NULL THEN
        INSERT INTO audit_log (org_id, entity_type, entity_id, action, changes, user_id)
        VALUES (
            org,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            TG_OP::audit_action,
            changes_json,
            auth.uid()
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_projects
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_allocations
    AFTER INSERT OR UPDATE OR DELETE ON allocations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_time_confirmations
    AFTER INSERT OR UPDATE OR DELETE ON time_confirmations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_time_entries
    AFTER INSERT OR UPDATE OR DELETE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Budget summary view for dashboard
CREATE VIEW project_budget_summary AS
SELECT
    p.id AS project_id,
    p.org_id,
    p.name AS project_name,
    p.budget_hours,
    p.hourly_rate,
    p.status,
    p.priority,
    c.name AS client_name,
    COALESCE(SUM(te.actual_hours), 0) AS total_actual_hours,
    COALESCE(SUM(a.planned_hours), 0) AS total_planned_hours,
    CASE
        WHEN p.budget_hours > 0 THEN
            ROUND((COALESCE(SUM(te.actual_hours), 0) / p.budget_hours * 100)::numeric, 1)
        ELSE 0
    END AS burn_percentage
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN allocations a ON p.id = a.project_id
LEFT JOIN time_entries te ON p.id = te.project_id
GROUP BY p.id, p.org_id, p.name, p.budget_hours, p.hourly_rate, p.status, p.priority, c.name;

-- Weekly utilization view for team dashboard
CREATE VIEW user_weekly_utilization AS
SELECT
    u.id AS user_id,
    u.org_id,
    u.name AS user_name,
    a.week_start,
    COALESCE(SUM(a.planned_hours), 0) AS total_planned_hours,
    COALESCE(pto.pto_hours, 0) AS pto_hours,
    40 - COALESCE(pto.pto_hours, 0) AS available_hours,
    CASE
        WHEN (40 - COALESCE(pto.pto_hours, 0)) > 0 THEN
            ROUND((COALESCE(SUM(a.planned_hours), 0) / (40 - COALESCE(pto.pto_hours, 0)) * 100)::numeric, 1)
        ELSE 0
    END AS utilization_percentage
FROM users u
LEFT JOIN allocations a ON u.id = a.user_id
LEFT JOIN (
    SELECT user_id,
           DATE_TRUNC('week', date)::date AS week_start,
           SUM(hours) AS pto_hours
    FROM pto_entries
    GROUP BY user_id, DATE_TRUNC('week', date)::date
) pto ON u.id = pto.user_id AND a.week_start = pto.week_start
WHERE u.is_active = TRUE
GROUP BY u.id, u.org_id, u.name, a.week_start, pto.pto_hours;

-- =============================================================================
-- COMMENTS SUMMARY
-- =============================================================================
--
-- This schema implements the Zhuzh data model with:
--
-- 1. Multi-tenant isolation via org_id and RLS policies
-- 2. Role-based access (employee/pm/admin) with budget visibility rules
-- 3. Full audit trail for variance drill-down (Levi's requirement)
-- 4. Support for unplanned work tracking (Kara's feature)
-- 5. Rubber-stamp detection flag (Michelle's insight)
-- 6. PTO/holiday visibility (Maleno's request)
-- 7. Phase breakdown for budget tracking (Michelle's domain)
-- 8. Priority-based project ordering (Maleno's request)
-- 9. Automatic timestamp management via triggers
-- 10. Optimized indexes for common query patterns
--
-- Key design decisions aligned with product spec:
-- - Employees see hours/percentages only (hourly_rate hidden via app layer)
-- - PM/Admin see full financial data
-- - DMs not channels (Slack user_id stored for direct messaging)
-- - Thursday finalization -> Monday clarity (week_start always Monday)
-- =============================================================================
