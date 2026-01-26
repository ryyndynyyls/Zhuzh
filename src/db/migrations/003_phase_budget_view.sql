-- Phase Budget Summary View
-- Migration for Phase Breakdown + Audit Trail features
-- Created: January 15, 2026

-- =============================================================================
-- PROJECT PHASE BUDGET SUMMARY VIEW
-- Shows budget breakdown by phase with planned vs actual hours
-- =============================================================================

CREATE OR REPLACE VIEW project_phase_budget_summary AS
SELECT
    pp.id AS phase_id,
    pp.project_id,
    pp.name AS phase_name,
    pp.budget_hours AS phase_budget_hours,
    pp.sort_order,
    pp.status AS phase_status,
    p.org_id,
    p.name AS project_name,
    p.budget_hours AS project_budget_hours,
    p.status AS project_status,
    -- Sum of allocations for this phase
    COALESCE(SUM(DISTINCT a.planned_hours), 0) AS total_planned_hours,
    -- Sum of actual hours from time entries for this phase
    COALESCE(SUM(te.actual_hours), 0) AS total_actual_hours,
    -- Burn percentage relative to phase budget
    CASE
        WHEN pp.budget_hours > 0 THEN
            ROUND((COALESCE(SUM(te.actual_hours), 0) / pp.budget_hours * 100)::numeric, 1)
        ELSE 0
    END AS burn_percentage,
    -- Remaining hours in phase budget
    CASE
        WHEN pp.budget_hours IS NOT NULL THEN
            pp.budget_hours - COALESCE(SUM(te.actual_hours), 0)
        ELSE NULL
    END AS remaining_hours,
    -- Variance: actual - planned (positive = over, negative = under)
    COALESCE(SUM(te.actual_hours), 0) - COALESCE(SUM(DISTINCT a.planned_hours), 0) AS variance_hours
FROM project_phases pp
JOIN projects p ON pp.project_id = p.id
LEFT JOIN allocations a ON pp.id = a.phase_id
LEFT JOIN time_entries te ON pp.id = te.phase_id
GROUP BY
    pp.id,
    pp.project_id,
    pp.name,
    pp.budget_hours,
    pp.sort_order,
    pp.status,
    p.org_id,
    p.name,
    p.budget_hours,
    p.status
ORDER BY pp.sort_order;

COMMENT ON VIEW project_phase_budget_summary IS 'Phase-level budget breakdown showing planned vs actual hours per phase (Michelle domain)';

-- =============================================================================
-- BUDGET AUDIT TRAIL VIEW
-- Formatted audit log for budget/allocation changes
-- =============================================================================

CREATE OR REPLACE VIEW budget_audit_trail AS
SELECT
    al.id AS audit_id,
    al.org_id,
    al.entity_type,
    al.entity_id,
    al.action,
    al.changes,
    al.created_at,
    u.name AS changed_by_name,
    u.email AS changed_by_email,
    -- Extract key changes for display
    CASE
        WHEN al.entity_type = 'projects' THEN
            COALESCE(al.changes->'new'->>'name', al.changes->'old'->>'name')
        WHEN al.entity_type = 'allocations' THEN
            (SELECT p.name FROM projects p WHERE p.id::text = COALESCE(
                al.changes->'new'->>'project_id',
                al.changes->'old'->>'project_id'
            ))
        WHEN al.entity_type = 'time_entries' THEN
            (SELECT p.name FROM projects p WHERE p.id::text = COALESCE(
                al.changes->'new'->>'project_id',
                al.changes->'old'->>'project_id'
            ))
        WHEN al.entity_type = 'time_confirmations' THEN
            (SELECT usr.name FROM users usr WHERE usr.id::text = COALESCE(
                al.changes->'new'->>'user_id',
                al.changes->'old'->>'user_id'
            ))
        ELSE NULL
    END AS context_name,
    -- Hours change summary
    CASE
        WHEN al.entity_type IN ('allocations', 'time_entries') AND al.action = 'update' THEN
            CONCAT(
                'Hours: ',
                COALESCE(al.changes->'old'->>'actual_hours', al.changes->'old'->>'planned_hours', '0'),
                ' → ',
                COALESCE(al.changes->'new'->>'actual_hours', al.changes->'new'->>'planned_hours', '0')
            )
        WHEN al.entity_type IN ('allocations', 'time_entries') AND al.action = 'create' THEN
            CONCAT(
                'Hours: +',
                COALESCE(al.changes->'new'->>'actual_hours', al.changes->'new'->>'planned_hours', '0')
            )
        WHEN al.entity_type IN ('allocations', 'time_entries') AND al.action = 'delete' THEN
            CONCAT(
                'Hours: -',
                COALESCE(al.changes->'old'->>'actual_hours', al.changes->'old'->>'planned_hours', '0')
            )
        ELSE NULL
    END AS hours_summary
FROM audit_log al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC;

COMMENT ON VIEW budget_audit_trail IS 'Formatted audit trail for variance drill-down analysis (Levi requirement)';

-- =============================================================================
-- PROJECT BUDGET DETAILED VIEW
-- Extended project summary including phase counts and unplanned work
-- =============================================================================

CREATE OR REPLACE VIEW project_budget_detailed AS
SELECT
    p.id AS project_id,
    p.org_id,
    p.name AS project_name,
    p.description,
    p.color,
    p.budget_hours,
    p.hourly_rate,
    p.is_billable,
    p.priority,
    p.status,
    c.id AS client_id,
    c.name AS client_name,
    -- Phase counts
    COUNT(DISTINCT pp.id) AS phase_count,
    -- Total actual hours from all time entries
    COALESCE(SUM(te.actual_hours), 0) AS total_actual_hours,
    -- Total planned hours from allocations
    COALESCE((
        SELECT SUM(a.planned_hours)
        FROM allocations a
        WHERE a.project_id = p.id
    ), 0) AS total_planned_hours,
    -- Unplanned work hours
    COALESCE(SUM(CASE WHEN te.is_unplanned THEN te.actual_hours ELSE 0 END), 0) AS unplanned_hours,
    -- Burn percentage
    CASE
        WHEN p.budget_hours > 0 THEN
            ROUND((COALESCE(SUM(te.actual_hours), 0) / p.budget_hours * 100)::numeric, 1)
        ELSE 0
    END AS burn_percentage,
    -- Remaining hours
    CASE
        WHEN p.budget_hours IS NOT NULL THEN
            p.budget_hours - COALESCE(SUM(te.actual_hours), 0)
        ELSE NULL
    END AS remaining_hours,
    -- Budget status indicator
    CASE
        WHEN p.budget_hours IS NULL THEN 'no_budget'
        WHEN COALESCE(SUM(te.actual_hours), 0) >= p.budget_hours THEN 'over_budget'
        WHEN COALESCE(SUM(te.actual_hours), 0) >= p.budget_hours * 0.9 THEN 'warning'
        WHEN COALESCE(SUM(te.actual_hours), 0) >= p.budget_hours * 0.75 THEN 'on_track'
        ELSE 'healthy'
    END AS budget_status
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN project_phases pp ON p.id = pp.project_id
LEFT JOIN time_entries te ON p.id = te.project_id
WHERE p.status IN ('planning', 'active', 'on-hold')
GROUP BY
    p.id,
    p.org_id,
    p.name,
    p.description,
    p.color,
    p.budget_hours,
    p.hourly_rate,
    p.is_billable,
    p.priority,
    p.status,
    c.id,
    c.name
ORDER BY p.priority, p.name;

COMMENT ON VIEW project_budget_detailed IS 'Detailed project budget view for dashboard with status indicators';
