/**
 * Sub-Projects API Router
 * Handles parent-child project relationships for umbrella projects like "Google Cloud Next 2026"
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Supabase client (using service role for admin operations)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// SUB-PROJECTS CRUD
// ============================================================

/**
 * Get sub-projects for a parent project with budget rollups
 * GET /api/projects/:id/sub-projects
 */
router.get('/projects/:id/sub-projects', async (req, res) => {
  const { id: parentId } = req.params;

  try {
    // Get parent project to verify it exists
    const { data: parent, error: parentError } = await supabase
      .from('projects')
      .select('id, name, budget_hours, hourly_rate, org_id')
      .eq('id', parentId)
      .single();

    if (parentError || !parent) {
      return res.status(404).json({ error: 'Parent project not found' });
    }

    // Get child projects
    const { data: children, error: childError } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, name),
        phases:project_phases(*)
      `)
      .eq('parent_id', parentId)
      .order('priority')
      .order('name');

    if (childError) throw childError;

    // Calculate stats for each child project
    const childrenWithStats = await Promise.all(
      (children || []).map(async (child) => {
        // Get time entries for this child
        const { data: entries } = await supabase
          .from('time_entries')
          .select('actual_hours, is_unplanned')
          .eq('project_id', child.id);

        // Get allocations
        const { data: allocations } = await supabase
          .from('allocations')
          .select('planned_hours')
          .eq('project_id', child.id);

        const totalActual = entries?.reduce((sum, e) => sum + (e.actual_hours || 0), 0) || 0;
        const totalPlanned = allocations?.reduce((sum, a) => sum + (a.planned_hours || 0), 0) || 0;
        const budgetHours = child.budget_hours || 0;

        return {
          id: child.id,
          name: child.name,
          description: child.description,
          color: child.color,
          budgetHours: child.budget_hours,
          hourlyRate: child.hourly_rate,
          isBillable: child.is_billable,
          status: child.status,
          phaseCount: child.phases?.length || 0,
          totalActual,
          totalPlanned,
          remainingHours: budgetHours ? budgetHours - totalActual : null,
          burnPercentage: budgetHours > 0 
            ? Math.round((totalActual / budgetHours) * 100 * 10) / 10 
            : 0,
          budgetStatus: !budgetHours
            ? 'no_budget'
            : totalActual >= budgetHours
              ? 'over_budget'
              : totalActual >= budgetHours * 0.9
                ? 'warning'
                : totalActual >= budgetHours * 0.75
                  ? 'on_track'
                  : 'healthy',
        };
      })
    );

    // Calculate rollup totals
    const rollup = {
      totalBudgetHours: childrenWithStats.reduce((sum, c) => sum + (c.budgetHours || 0), 0),
      totalActualHours: childrenWithStats.reduce((sum, c) => sum + c.totalActual, 0),
      totalPlannedHours: childrenWithStats.reduce((sum, c) => sum + c.totalPlanned, 0),
      childCount: childrenWithStats.length,
      overBudgetCount: childrenWithStats.filter(c => c.budgetStatus === 'over_budget').length,
      atRiskCount: childrenWithStats.filter(c => c.budgetStatus === 'warning').length,
    };

    res.json({
      parent: {
        id: parent.id,
        name: parent.name,
        budgetHours: parent.budget_hours,
        hourlyRate: parent.hourly_rate,
      },
      subProjects: childrenWithStats,
      rollup,
    });

  } catch (err: any) {
    console.error('Failed to fetch sub-projects:', err);
    res.status(500).json({ error: 'Failed to fetch sub-projects' });
  }
});

/**
 * Link an existing project as a sub-project
 * POST /api/projects/:id/sub-projects
 * Body: { childProjectId: string }
 */
router.post('/projects/:id/sub-projects', async (req, res) => {
  const { id: parentId } = req.params;
  const { childProjectId } = req.body;

  if (!childProjectId) {
    return res.status(400).json({ error: 'childProjectId is required' });
  }

  try {
    // Verify parent exists
    const { data: parent } = await supabase
      .from('projects')
      .select('id, org_id')
      .eq('id', parentId)
      .single();

    if (!parent) {
      return res.status(404).json({ error: 'Parent project not found' });
    }

    // Verify child exists and is in same org
    const { data: child } = await supabase
      .from('projects')
      .select('id, org_id, parent_id')
      .eq('id', childProjectId)
      .single();

    if (!child) {
      return res.status(404).json({ error: 'Child project not found' });
    }

    if (child.org_id !== parent.org_id) {
      return res.status(400).json({ error: 'Projects must be in the same organization' });
    }

    if (child.parent_id) {
      return res.status(400).json({ 
        error: 'Project already has a parent',
        hint: 'Unlink from current parent first',
      });
    }

    // Prevent circular references
    if (childProjectId === parentId) {
      return res.status(400).json({ error: 'A project cannot be its own parent' });
    }

    // Update child to set parent_id
    const { data, error } = await supabase
      .from('projects')
      .update({ 
        parent_id: parentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', childProjectId)
      .select()
      .single();

    if (error) throw error;

    res.json({ subProject: data });

  } catch (err: any) {
    console.error('Failed to link sub-project:', err);
    res.status(500).json({ error: 'Failed to link sub-project' });
  }
});

/**
 * Unlink a sub-project from its parent
 * DELETE /api/projects/:parentId/sub-projects/:childId
 */
router.delete('/projects/:parentId/sub-projects/:childId', async (req, res) => {
  const { parentId, childId } = req.params;

  try {
    // Verify the relationship exists
    const { data: child } = await supabase
      .from('projects')
      .select('id, parent_id')
      .eq('id', childId)
      .single();

    if (!child) {
      return res.status(404).json({ error: 'Sub-project not found' });
    }

    if (child.parent_id !== parentId) {
      return res.status(400).json({ error: 'Project is not a sub-project of this parent' });
    }

    // Remove parent_id
    const { error } = await supabase
      .from('projects')
      .update({ 
        parent_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', childId);

    if (error) throw error;

    res.json({ success: true });

  } catch (err: any) {
    console.error('Failed to unlink sub-project:', err);
    res.status(500).json({ error: 'Failed to unlink sub-project' });
  }
});

/**
 * Get available projects that can be linked as sub-projects
 * (Projects without a parent, excluding the current project and its children)
 * GET /api/projects/:id/available-sub-projects
 */
router.get('/projects/:id/available-sub-projects', async (req, res) => {
  const { id: projectId } = req.params;

  try {
    // Get the project's org
    const { data: project } = await supabase
      .from('projects')
      .select('org_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all projects in org without a parent (and not this project)
    const { data: available, error } = await supabase
      .from('projects')
      .select('id, name, color, status, budget_hours')
      .eq('org_id', project.org_id)
      .is('parent_id', null)
      .neq('id', projectId)
      .in('status', ['planning', 'active', 'on-hold'])
      .order('name');

    if (error) throw error;

    res.json({ projects: available || [] });

  } catch (err: any) {
    console.error('Failed to fetch available sub-projects:', err);
    res.status(500).json({ error: 'Failed to fetch available projects' });
  }
});

/**
 * Create a new project as a sub-project
 * POST /api/projects/:id/sub-projects/create
 * Body: { name, description?, budget_hours?, color?, ... }
 */
router.post('/projects/:id/sub-projects/create', async (req, res) => {
  const { id: parentId } = req.params;
  const { name, description, budget_hours, hourly_rate, color, is_billable } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    // Get parent project for org_id and client_id
    const { data: parent } = await supabase
      .from('projects')
      .select('id, org_id, client_id, hourly_rate, color')
      .eq('id', parentId)
      .single();

    if (!parent) {
      return res.status(404).json({ error: 'Parent project not found' });
    }

    // Create new project with parent_id set
    const { data, error } = await supabase
      .from('projects')
      .insert({
        parent_id: parentId,
        org_id: parent.org_id,
        client_id: parent.client_id,
        name,
        description: description || null,
        budget_hours: budget_hours || 0,
        hourly_rate: hourly_rate ?? parent.hourly_rate,
        color: color || parent.color || '#4285F4',
        is_billable: is_billable ?? true,
        is_active: true,
        status: 'planning',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ subProject: data });

  } catch (err: any) {
    console.error('Failed to create sub-project:', err);
    res.status(500).json({ error: 'Failed to create sub-project' });
  }
});

export default router;
