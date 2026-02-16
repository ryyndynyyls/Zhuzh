/**
 * Projects Routes - Project CRUD, Phases, Drilldown, Archiving
 * 
 * ROUTE ORDER MATTERS: Specific routes (/archive/candidates, /archived)
 * must come before parameterized routes (/:id) to avoid matching conflicts.
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// ============================================================
// LIST PROJECTS
// ============================================================

/**
 * List projects with optional filters
 * GET /api/projects?status=active&clientId=xxx&isActive=true
 */
router.get('/', async (req, res) => {
  const { status, clientId, isActive } = req.query;

  try {
    let query = supabase
      .from('projects')
      .select('*, client:clients(id, name), phases:project_phases(*)');

    if (status) query = query.eq('status', status as 'active' | 'complete' | 'planning' | 'on-hold');
    if (clientId) query = query.eq('client_id', clientId as string);
    if (isActive !== undefined) query = query.eq('is_active', isActive === 'true');

    const { data, error } = await query.order('priority', { ascending: true });
    if (error) throw error;

    res.json({ projects: data || [] });
  } catch (err: any) {
    console.error('Failed to list projects:', err);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// ============================================================
// SPECIFIC ROUTES (must be defined before /:id routes)
// ============================================================

/**
 * Get archive candidates - projects with no recent activity
 * GET /api/projects/archive/candidates?inactiveWeeks=12
 * 
 * OPTIMIZED: Uses 3 queries instead of N*3 queries
 */
router.get('/archive/candidates', async (req, res) => {
  const inactiveWeeks = parseInt(req.query.inactiveWeeks as string) || 12;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (inactiveWeeks * 7));
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  try {
    // Query 1: Get all active projects with client info
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select(`
        id, name, color, is_active, budget_hours, hourly_rate,
        created_at, updated_at,
        client:clients(id, name)
      `)
      .eq('is_active', true)
      .order('name');

    if (projectError) throw projectError;
    if (!projects || projects.length === 0) {
      return res.json({ candidates: [], summary: { total: 0, cutoffDate: cutoffStr, inactiveWeeks } });
    }

    const projectIds = projects.map(p => p.id);

    // Query 2: Get latest allocation date per project (single query)
    const { data: latestAllocations } = await supabase
      .from('allocations')
      .select('project_id, week_start')
      .in('project_id', projectIds)
      .order('week_start', { ascending: false });

    // Build map of project_id -> latest week_start
    const latestAllocationMap = new Map<string, string>();
    for (const alloc of latestAllocations || []) {
      if (!latestAllocationMap.has(alloc.project_id)) {
        latestAllocationMap.set(alloc.project_id, alloc.week_start);
      }
    }

    // Query 3: Get total hours per project (single query)
    const { data: hoursByProject } = await supabase
      .from('time_entries')
      .select('project_id, actual_hours')
      .in('project_id', projectIds);

    // Build map of project_id -> total hours
    const hoursMap = new Map<string, number>();
    for (const entry of hoursByProject || []) {
      const current = hoursMap.get(entry.project_id) || 0;
      hoursMap.set(entry.project_id, current + (entry.actual_hours || 0));
    }

    // Filter and enrich projects
    const now = new Date().getTime();
    const candidates = projects
      .filter(project => {
        const lastActivity = latestAllocationMap.get(project.id);
        // No allocations at all, or last allocation before cutoff
        return !lastActivity || lastActivity < cutoffStr;
      })
      .map(project => {
        const lastActivity = latestAllocationMap.get(project.id) || null;
        const totalHoursLogged = hoursMap.get(project.id) || 0;
        const weeksInactive = lastActivity
          ? Math.floor((now - new Date(lastActivity).getTime()) / (7 * 24 * 60 * 60 * 1000))
          : null;

        return {
          ...project,
          lastActivity,
          totalHoursLogged,
          weeksInactive,
        };
      })
      // Sort by weeks inactive (most inactive first, nulls at end)
      .sort((a, b) => (b.weeksInactive || 999) - (a.weeksInactive || 999));

    res.json({
      candidates,
      summary: {
        total: candidates.length,
        cutoffDate: cutoffStr,
        inactiveWeeks,
      }
    });
  } catch (err: any) {
    console.error('Failed to get archive candidates:', err);
    res.status(500).json({ error: 'Failed to get archive candidates' });
  }
});

/**
 * Bulk archive projects
 * POST /api/projects/archive/bulk
 * Body: { projectIds: string[], reason?: string }
 */
router.post('/archive/bulk', async (req, res) => {
  const { projectIds, reason } = req.body;

  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return res.status(400).json({ error: 'projectIds array is required' });
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .update({
        is_active: false,
        archived_at: new Date().toISOString(),
        archive_reason: reason || 'Bulk archive - no recent activity',
        updated_at: new Date().toISOString(),
      })
      .in('id', projectIds)
      .select();

    if (error) throw error;

    res.json({
      archived: data,
      count: data?.length || 0,
      message: `${data?.length || 0} projects archived`,
    });
  } catch (err: any) {
    console.error('Failed to bulk archive projects:', err);
    res.status(500).json({ error: 'Failed to bulk archive projects' });
  }
});

/**
 * Get archived projects
 * GET /api/projects/archived
 */
router.get('/archived', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id, name, color, archived_at, archive_reason,
        budget_hours, hourly_rate,
        client:clients(id, name)
      `)
      .eq('is_active', false)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false });

    if (error) throw error;

    res.json({ projects: data });
  } catch (err: any) {
    console.error('Failed to get archived projects:', err);
    res.status(500).json({ error: 'Failed to get archived projects' });
  }
});

// ============================================================
// PARAMETERIZED ROUTES (/:id)
// ============================================================

/**
 * Get a single project
 * GET /api/projects/:id
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw error;
    }

    // Get total actual hours
    const { data: entries } = await supabase
      .from('time_entries')
      .select('actual_hours')
      .eq('project_id', id);

    const totalActual = entries?.reduce((sum, e) => sum + (e.actual_hours || 0), 0) || 0;

    // If this is a sub-project, fetch parent project info
    let parentProject = null;
    if (data.parent_id) {
      const { data: parent } = await supabase
        .from('projects')
        .select('id, name, color')
        .eq('id', data.parent_id)
        .single();
      parentProject = parent;
    }

    res.json({ project: { ...data, totalActual, parentProject } });
  } catch (err: any) {
    console.error('Failed to fetch project:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

/**
 * Update a project
 * PATCH /api/projects/:id
 */
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Only allow specific fields to be updated
  const allowedFields = [
    'name', 'description', 'color', 'budget_hours', 'hourly_rate',
    'is_billable', 'is_active', 'priority', 'status', 'client_id'
  ];

  const filteredUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = value;
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  filteredUpdates.updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('projects')
      .update(filteredUpdates)
      .eq('id', id)
      .select(`
        *,
        client:clients(id, name)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw error;
    }

    res.json({ project: data });
  } catch (err: any) {
    console.error('Failed to update project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/**
 * Archive a single project
 * POST /api/projects/:id/archive
 */
router.post('/:id/archive', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const { data, error } = await supabase
      .from('projects')
      .update({
        is_active: false,
        archived_at: new Date().toISOString(),
        archive_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ project: data, message: 'Project archived' });
  } catch (err: any) {
    console.error('Failed to archive project:', err);
    res.status(500).json({ error: 'Failed to archive project' });
  }
});

/**
 * Unarchive a project
 * POST /api/projects/:id/unarchive
 */
router.post('/:id/unarchive', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('projects')
      .update({
        is_active: true,
        archived_at: null,
        archive_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ project: data, message: 'Project restored' });
  } catch (err: any) {
    console.error('Failed to unarchive project:', err);
    res.status(500).json({ error: 'Failed to unarchive project' });
  }
});

// ============================================================
// PROJECT PHASES
// ============================================================

/**
 * Get phases for a project with budget breakdown
 * GET /api/projects/:id/phases
 */
router.get('/:id/phases', async (req, res) => {
  const { id } = req.params;

  try {
    // Get project info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, budget_hours, hourly_rate, status, org_id')
      .eq('id', id)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw projectError;
    }

    // Get phases with budget summary
    const { data: phases, error: phasesError } = await supabase
      .from('project_phases')
      .select('*')
      .eq('project_id', id)
      .order('sort_order');

    if (phasesError) throw phasesError;

    // For each phase, calculate planned/actual hours from allocations and time_entries
    const phasesWithStats = await Promise.all(
      (phases || []).map(async (phase) => {
        // Get allocations for this phase
        const { data: allocations } = await supabase
          .from('allocations')
          .select('planned_hours')
          .eq('phase_id', phase.id);

        // Get time entries for this phase
        const { data: entries } = await supabase
          .from('time_entries')
          .select('actual_hours')
          .eq('phase_id', phase.id);

        const totalPlanned = allocations?.reduce((sum, a) => sum + (a.planned_hours || 0), 0) || 0;
        const totalActual = entries?.reduce((sum, e) => sum + (e.actual_hours || 0), 0) || 0;
        const budgetHours = phase.budget_hours || 0;

        return {
          ...phase,
          totalPlanned,
          totalActual,
          remainingHours: budgetHours ? budgetHours - totalActual : null,
          burnPercentage: budgetHours > 0 ? Math.round((totalActual / budgetHours) * 100 * 10) / 10 : 0,
          variance: totalActual - totalPlanned,
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

    // Calculate project totals
    const projectTotalActual = phasesWithStats.reduce((sum, p) => sum + p.totalActual, 0);
    const projectTotalPlanned = phasesWithStats.reduce((sum, p) => sum + p.totalPlanned, 0);

    res.json({
      project: {
        ...project,
        totalActual: projectTotalActual,
        totalPlanned: projectTotalPlanned,
        burnPercentage: project.budget_hours
          ? Math.round((projectTotalActual / project.budget_hours) * 100 * 10) / 10
          : 0,
      },
      phases: phasesWithStats,
    });
  } catch (err: any) {
    console.error('Failed to fetch project phases:', err);
    res.status(500).json({ error: 'Failed to fetch project phases' });
  }
});

/**
 * Create a new phase
 * POST /api/projects/:id/phases
 */
router.post('/:id/phases', async (req, res) => {
  const { id: projectId } = req.params;
  const { name, budget_hours, status = 'pending' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    // Get max sort_order
    const { data: existing } = await supabase
      .from('project_phases')
      .select('sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('project_phases')
      .insert({
        project_id: projectId,
        name,
        budget_hours: budget_hours || 0,
        sort_order: nextOrder,
        status,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ phase: data });
  } catch (err: any) {
    console.error('Failed to create phase:', err);
    res.status(500).json({ error: 'Failed to create phase' });
  }
});

/**
 * Reorder phases
 * POST /api/projects/:id/phases/reorder
 */
router.post('/:id/phases/reorder', async (req, res) => {
  const { id: projectId } = req.params;
  const { phaseIds } = req.body;

  if (!Array.isArray(phaseIds)) {
    return res.status(400).json({ error: 'phaseIds must be an array' });
  }

  try {
    // Update each phase's sort_order
    const updates = phaseIds.map((phaseId, index) =>
      supabase
        .from('project_phases')
        .update({ sort_order: index })
        .eq('id', phaseId)
        .eq('project_id', projectId) // Safety check
    );

    await Promise.all(updates);

    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to reorder phases:', err);
    res.status(500).json({ error: 'Failed to reorder phases' });
  }
});

/**
 * Get week-by-week breakdown for a project
 * GET /api/projects/:id/drilldown?weeks=8
 */
router.get('/:id/drilldown', async (req, res) => {
  const { id: projectId } = req.params;
  const weeksBack = Math.min(parseInt(req.query.weeks as string) || 8, 52);

  try {
    // Calculate date range
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (weeksBack * 7));
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get project info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, budget_hours, hourly_rate, color')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get allocations for this project in date range
    const { data: allocations } = await supabase
      .from('allocations')
      .select('id, week_start, planned_hours, user_id, phase_id, user:users(id, name), phase:project_phases(id, name)')
      .eq('project_id', projectId)
      .gte('week_start', startDateStr)
      .order('week_start', { ascending: true });

    // Get time entries for this project
    const { data: entries } = await supabase
      .from('time_entries')
      .select('id, actual_hours, phase_id, is_unplanned, confirmation_id, phase:project_phases(id, name)')
      .eq('project_id', projectId);

    // Get confirmations separately
    const confirmationIds = [...new Set((entries || []).map(e => e.confirmation_id).filter(Boolean))];

    const confirmationsMap = new Map<string, any>();
    if (confirmationIds.length > 0) {
      const { data: confirmations } = await supabase
        .from('time_confirmations')
        .select('id, user_id, week_start, user:users(id, name)')
        .in('id', confirmationIds)
        .gte('week_start', startDateStr);

      for (const conf of confirmations || []) {
        confirmationsMap.set(conf.id, conf);
      }
    }

    // Build week-by-week breakdown using plain objects
    const weekMap: Record<string, any> = {};

    // Process allocations (planned hours)
    for (const alloc of allocations || []) {
      const week = alloc.week_start;
      if (!weekMap[week]) {
        weekMap[week] = {
          weekStart: week,
          planned: 0,
          actual: 0,
          variance: 0,
          byPhase: {} as Record<string, any>,
          byUser: {} as Record<string, any>,
          unplanned: 0,
        };
      }
      const weekData = weekMap[week];
      weekData.planned += alloc.planned_hours || 0;

      // By phase
      const phaseId = alloc.phase_id || 'no-phase';
      const phaseName = (alloc.phase as any)?.name || 'No Phase';
      if (!weekData.byPhase[phaseId]) {
        weekData.byPhase[phaseId] = { name: phaseName, planned: 0, actual: 0 };
      }
      weekData.byPhase[phaseId].planned += alloc.planned_hours || 0;

      // By user
      const userId = alloc.user_id;
      const userName = (alloc.user as any)?.name || 'Unknown';
      if (!weekData.byUser[userId]) {
        weekData.byUser[userId] = { name: userName, planned: 0, actual: 0 };
      }
      weekData.byUser[userId].planned += alloc.planned_hours || 0;
    }

    // Process time entries (actual hours)
    for (const entry of entries || []) {
      const conf = confirmationsMap.get(entry.confirmation_id);
      if (!conf) continue;

      const week = conf.week_start;
      if (!week || week < startDateStr) continue;

      if (!weekMap[week]) {
        weekMap[week] = {
          weekStart: week,
          planned: 0,
          actual: 0,
          variance: 0,
          byPhase: {} as Record<string, any>,
          byUser: {} as Record<string, any>,
          unplanned: 0,
        };
      }
      const weekData = weekMap[week];
      weekData.actual += entry.actual_hours || 0;

      if (entry.is_unplanned) {
        weekData.unplanned += entry.actual_hours || 0;
      }

      // By phase
      const phaseId = entry.phase_id || 'no-phase';
      const phaseName = (entry.phase as any)?.name || 'No Phase';
      if (!weekData.byPhase[phaseId]) {
        weekData.byPhase[phaseId] = { name: phaseName, planned: 0, actual: 0 };
      }
      weekData.byPhase[phaseId].actual += entry.actual_hours || 0;

      // By user
      const userId = conf.user_id;
      const userName = (conf.user as any)?.name || 'Unknown';
      if (userId) {
        if (!weekData.byUser[userId]) {
          weekData.byUser[userId] = { name: userName, planned: 0, actual: 0 };
        }
        weekData.byUser[userId].actual += entry.actual_hours || 0;
      }
    }

    // Convert to array and calculate variances
    const weeks = Object.values(weekMap)
      .map((week: any) => {
        week.variance = week.actual - week.planned;

        // Convert byPhase object to array
        const byPhase = Object.entries(week.byPhase).map(([id, data]: [string, any]) => ({
          id,
          name: data.name,
          planned: data.planned,
          actual: data.actual,
          variance: data.actual - data.planned,
        }));

        // Convert byUser object to array
        const byUser = Object.entries(week.byUser).map(([id, data]: [string, any]) => ({
          id,
          name: data.name,
          planned: data.planned,
          actual: data.actual,
          variance: data.actual - data.planned,
        }));

        return {
          weekStart: week.weekStart,
          planned: week.planned,
          actual: week.actual,
          variance: week.variance,
          unplanned: week.unplanned,
          byPhase,
          byUser,
        };
      })
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    // Calculate totals
    const totals = {
      planned: weeks.reduce((sum, w) => sum + w.planned, 0),
      actual: weeks.reduce((sum, w) => sum + w.actual, 0),
      variance: weeks.reduce((sum, w) => sum + w.variance, 0),
      unplanned: weeks.reduce((sum, w) => sum + w.unplanned, 0),
    };

    // Find biggest variance weeks
    const biggestVariances = [...weeks]
      .filter((w) => Math.abs(w.variance) > 0)
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 3)
      .map((w) => ({
        week: w.weekStart,
        variance: w.variance,
        topContributors: w.byPhase
          .filter((p) => Math.abs(p.variance) > 0)
          .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
          .slice(0, 2)
          .map((p) => ({ name: p.name, variance: p.variance })),
      }));

    res.json({
      project,
      weeks,
      totals,
      biggestVariances,
      dateRange: {
        start: startDateStr,
        end: now.toISOString().split('T')[0],
        weeksCount: weeks.length,
      },
    });
  } catch (err: any) {
    console.error('Failed to fetch project drilldown:', err);
    res.status(500).json({ error: 'Failed to fetch project drilldown' });
  }
});

export default router;
