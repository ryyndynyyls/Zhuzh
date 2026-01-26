/**
 * Budget Routes - Budget dashboard data
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Get detailed budget data for dashboard
 * GET /api/budget/dashboard?orgId=xxx
 */
router.get('/dashboard', async (req, res) => {
  const orgId = req.query.orgId as string | undefined;

  try {
    // Build query for active projects
    let query = supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, name),
        phases:project_phases(*)
      `)
      .eq('is_active', true)
      .order('priority')
      .order('name');

    // Filter by org if provided
    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data: projects, error: projectsError } = await query;

    if (projectsError) throw projectsError;

    // For each project, get actual hours from time_entries
    const projectsWithStats = await Promise.all(
      (projects || []).map(async (project) => {
        const { data: entries } = await supabase
          .from('time_entries')
          .select('actual_hours, is_unplanned')
          .eq('project_id', project.id);

        const { data: allocations } = await supabase
          .from('allocations')
          .select('planned_hours')
          .eq('project_id', project.id);

        const totalActual = entries?.reduce((sum, e) => sum + (e.actual_hours || 0), 0) || 0;
        const unplannedHours = entries
          ?.filter((e) => e.is_unplanned)
          .reduce((sum, e) => sum + (e.actual_hours || 0), 0) || 0;
        const totalPlanned = allocations?.reduce((sum, a) => sum + (a.planned_hours || 0), 0) || 0;
        const budgetHours = project.budget_hours || 0;

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          color: project.color,
          budgetHours: project.budget_hours,
          hourlyRate: project.hourly_rate,
          isBillable: project.is_billable,
          priority: project.priority,
          status: project.status,
          clientId: project.client?.id,
          clientName: project.client?.name,
          phaseCount: project.phases?.length || 0,
          totalActual,
          totalPlanned,
          unplannedHours,
          remainingHours: budgetHours ? budgetHours - totalActual : null,
          burnPercentage: budgetHours > 0 ? Math.round((totalActual / budgetHours) * 100 * 10) / 10 : 0,
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

    // Calculate org-level stats
    const totalBudget = projectsWithStats.reduce((sum, p) => sum + (p.budgetHours || 0), 0);
    const totalActual = projectsWithStats.reduce((sum, p) => sum + p.totalActual, 0);
    const totalPlanned = projectsWithStats.reduce((sum, p) => sum + p.totalPlanned, 0);

    res.json({
      projects: projectsWithStats,
      stats: {
        totalProjects: projectsWithStats.length,
        activeProjects: projectsWithStats.filter((p) => p.status === 'active').length,
        totalBudgetHours: totalBudget,
        totalActualHours: totalActual,
        totalPlannedHours: totalPlanned,
        overallBurnPercentage: totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100 * 10) / 10 : 0,
        projectsOverBudget: projectsWithStats.filter((p) => p.budgetStatus === 'over_budget').length,
        projectsAtRisk: projectsWithStats.filter((p) => p.budgetStatus === 'warning').length,
      },
    });
  } catch (err: any) {
    console.error('Failed to fetch budget dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch budget dashboard' });
  }
});

export default router;
