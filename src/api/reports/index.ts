/**
 * Reports API for Zhuzh
 * Provides endpoints for phase budgets, person hours, and role summaries
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const router = Router();

// Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

type PhaseStatus = 'on_track' | 'at_risk' | 'over_budget' | 'complete';

interface PhaseMetrics {
  phase_id: number;
  phase_name: string;
  project_name: string;
  project_id: number;
  budgeted_hours: number;
  allocated_hours: number;
  logged_hours: number;
  remaining_hours: number;
  burn_rate: number;
  status: PhaseStatus;
  start_date: string | null;
  end_date: string | null;
}

interface PhaseReportResponse {
  success: boolean;
  data: PhaseMetrics[];
  meta: {
    total: number;
    by_status: {
      on_track: number;
      at_risk: number;
      over_budget: number;
      complete: number;
    };
  };
}

interface PersonSummary {
  person_id: number;
  person_name: string;
  email: string;
  department: string;
  is_active: boolean;
  total_allocated_hours: number;
  total_logged_hours: number;
  utilization_percent: number;
  project_count: number;
}

interface PeopleSummaryResponse {
  success: boolean;
  data: PersonSummary[];
  meta: {
    total_people: number;
    active_count: number;
  };
}

interface RoleSummary {
  role_id: number;
  role_name: string;
  discipline: string;
  total_budgeted_hours: number;
  total_allocated_hours: number;
  total_logged_hours: number;
  project_count: number;
  headcount: number;
}

interface RolesSummaryResponse {
  success: boolean;
  data: RoleSummary[];
  meta: {
    total_roles: number;
  };
}

interface RoleDetail {
  role_id: number;
  role_name: string;
  discipline: string;
  project_id: number;
  project_name: string;
  phase_id: number;
  phase_name: string;
  budgeted_hours: number;
  allocated_hours: number;
  logged_hours: number;
  remaining_hours: number;
  headcount: number;
}

interface RoleDetailResponse {
  success: boolean;
  data: RoleDetail[];
  meta: {
    role_id: number;
    role_name: string;
    discipline: string;
    total_budgeted_hours: number;
    total_logged_hours: number;
    burn_rate: number;
    total_headcount: number;
    project_count: number;
  };
}

interface PersonDetail {
  person_id: number;
  person_name: string;
  email: string;
  project_id: number;
  project_name: string;
  phase_id: number;
  phase_name: string;
  role_name: string;
  allocated_hours: number;
  logged_hours: number;
  remaining_hours: number;
  utilization_percent: number;
}

interface PersonDetailResponse {
  success: boolean;
  data: PersonDetail[];
  meta: {
    person_id: number;
    person_name: string;
    total_allocated_hours: number;
    total_logged_hours: number;
    overall_utilization: number;
    project_count: number;
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculatePhaseStatus(burnRate: number, dbStatus: string): PhaseStatus {
  if (dbStatus === 'complete') return 'complete';
  if (burnRate > 100) return 'over_budget';
  if (burnRate > 85) return 'at_risk';
  return 'on_track';
}

// ============================================================
// PHASE BUDGET METRICS
// ============================================================

/**
 * GET /api/reports/phases
 * Returns phase breakdown across ALL active projects
 * Query params: startDate, endDate, clientId (optional filters)
 */
router.get('/phases', async (req: Request, res: Response) => {
  const { clientId } = req.query;

  try {
    // Get all active projects with their phases
    let query = supabase
      .from('projects')
      .select(`
        id, name, color, budget_hours, hourly_rate,
        client:clients(id, name),
        phases:project_phases(
          id, name, budget_hours, status
        )
      `)
      .eq('is_active', true);

    if (clientId && typeof clientId === 'string') {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // For each phase, get allocated and logged hours
    const phasesWithMetrics: PhaseMetrics[] = await Promise.all(
      (data || []).flatMap(project =>
        (project.phases || []).map(async (phase: any) => {
          // Get allocated hours from allocations
          const { data: allocData } = await supabase
            .from('allocations')
            .select('planned_hours')
            .eq('phase_id', phase.id);

          const allocatedHours = (allocData || []).reduce(
            (sum: number, a: any) => sum + (a.planned_hours || 0),
            0
          );

          // Get logged hours from time_entries
          const { data: entriesData } = await supabase
            .from('time_entries')
            .select('actual_hours')
            .eq('phase_id', phase.id);

          const loggedHours = (entriesData || []).reduce(
            (sum: number, e: any) => sum + (e.actual_hours || 0),
            0
          );

          const budgetedHours = phase.budget_hours || 0;
          const remainingHours = budgetedHours - loggedHours;
          const burnRate = budgetedHours > 0 ? (loggedHours / budgetedHours) * 100 : 0;
          const status = calculatePhaseStatus(burnRate, phase.status);

          return {
            phase_id: phase.id,
            phase_name: phase.name,
            project_name: project.name,
            project_id: project.id,
            budgeted_hours: budgetedHours,
            allocated_hours: allocatedHours,
            logged_hours: loggedHours,
            remaining_hours: remainingHours,
            burn_rate: Math.round(burnRate * 100) / 100,
            status,
            start_date: phase.start_date || null,
            end_date: phase.end_date || null,
          };
        })
      )
    );

    // Count statuses for meta
    const byStatus = {
      on_track: phasesWithMetrics.filter(p => p.status === 'on_track').length,
      at_risk: phasesWithMetrics.filter(p => p.status === 'at_risk').length,
      over_budget: phasesWithMetrics.filter(p => p.status === 'over_budget').length,
      complete: phasesWithMetrics.filter(p => p.status === 'complete').length,
    };

    const response: PhaseReportResponse = {
      success: true,
      data: phasesWithMetrics,
      meta: {
        total: phasesWithMetrics.length,
        by_status: byStatus,
      },
    };

    res.json(response);
  } catch (err: any) {
    console.error('Failed to fetch all phases:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/phases/:projectId
 * Returns all phases for a project with full budget metrics
 */
router.get('/phases/:projectId', async (req: Request, res: Response) => {
  const { projectId } = req.params;

  try {
    const { data, error } = await supabase
      .from('phase_budget_metrics')
      .select('*')
      .eq('project_id', projectId)
      .order('phase_name');

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Failed to fetch phase metrics:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PERSON ACROSS PROJECTS
// ============================================================

/**
 * GET /api/reports/person/:userId
 * Returns all projects for a person with hours breakdown by phase
 */
router.get('/person/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const personId = parseInt(userId, 10);

  try {
    // Get user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, discipline')
      .eq('id', personId)
      .single();

    if (userError) throw userError;
    if (!userData) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get all allocations for this user with project and phase info
    const { data: allocations, error: allocError } = await supabase
      .from('allocations')
      .select(`
        id, planned_hours, phase_id, project_id,
        project:projects(id, name),
        phase:project_phases(id, name)
      `)
      .eq('user_id', personId);

    if (allocError) throw allocError;

    // Get time entries for this user
    const { data: timeEntries, error: timeError } = await supabase
      .from('time_entries')
      .select('phase_id, actual_hours')
      .eq('user_id', personId);

    if (timeError) throw timeError;

    // Group time entries by phase
    const loggedByPhase: Record<number, number> = {};
    (timeEntries || []).forEach((entry: any) => {
      loggedByPhase[entry.phase_id] = (loggedByPhase[entry.phase_id] || 0) + (entry.actual_hours || 0);
    });

    // Group allocations by phase
    const allocationsByPhase: Record<number, { allocated: number; project: any; phase: any }> = {};
    (allocations || []).forEach((alloc: any) => {
      if (!allocationsByPhase[alloc.phase_id]) {
        allocationsByPhase[alloc.phase_id] = {
          allocated: 0,
          project: alloc.project,
          phase: alloc.phase,
        };
      }
      allocationsByPhase[alloc.phase_id].allocated += alloc.planned_hours || 0;
    });

    // Build detail records
    const details: PersonDetail[] = Object.entries(allocationsByPhase).map(([phaseId, data]) => {
      const phaseIdNum = parseInt(phaseId, 10);
      const allocatedHours = data.allocated;
      const loggedHours = loggedByPhase[phaseIdNum] || 0;
      const remainingHours = allocatedHours - loggedHours;
      const utilizationPercent = allocatedHours > 0 ? (loggedHours / allocatedHours) * 100 : 0;

      return {
        person_id: personId,
        person_name: userData.name,
        email: userData.email,
        project_id: data.project?.id || 0,
        project_name: data.project?.name || 'Unknown',
        phase_id: phaseIdNum,
        phase_name: data.phase?.name || 'Unknown',
        role_name: userData.discipline || 'Unknown',
        allocated_hours: allocatedHours,
        logged_hours: loggedHours,
        remaining_hours: remainingHours,
        utilization_percent: Math.round(utilizationPercent * 100) / 100,
      };
    });

    // Calculate totals
    const totalAllocated = details.reduce((sum, d) => sum + d.allocated_hours, 0);
    const totalLogged = details.reduce((sum, d) => sum + d.logged_hours, 0);
    const overallUtilization = totalAllocated > 0 ? (totalLogged / totalAllocated) * 100 : 0;
    const uniqueProjects = new Set(details.map(d => d.project_id));

    const response: PersonDetailResponse = {
      success: true,
      data: details,
      meta: {
        person_id: personId,
        person_name: userData.name,
        total_allocated_hours: totalAllocated,
        total_logged_hours: totalLogged,
        overall_utilization: Math.round(overallUtilization * 100) / 100,
        project_count: uniqueProjects.size,
      },
    };

    res.json(response);
  } catch (err: any) {
    console.error('Failed to fetch person summary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/people
 * Returns list of all people with their totals
 * Query params: is_active ('true', 'false', 'all'), department
 */
router.get('/people', async (req: Request, res: Response) => {
  const { is_active, department } = req.query;

  try {
    // Get all users
    let userQuery = supabase
      .from('users')
      .select('id, name, email, discipline, is_active')
      .order('name');

    // Filter by is_active if not 'all'
    if (is_active && is_active !== 'all') {
      userQuery = userQuery.eq('is_active', is_active === 'true');
    }

    // Filter by department/discipline
    if (department && typeof department === 'string') {
      userQuery = userQuery.eq('discipline', department);
    }

    const { data: users, error: userError } = await userQuery;
    if (userError) throw userError;

    // For each user, get allocations and time entries
    const peopleWithMetrics: PersonSummary[] = await Promise.all(
      (users || []).map(async (user: any) => {
        // Get allocations
        const { data: allocations } = await supabase
          .from('allocations')
          .select('planned_hours, project_id')
          .eq('user_id', user.id);

        const totalAllocated = (allocations || []).reduce(
          (sum: number, a: any) => sum + (a.planned_hours || 0),
          0
        );

        // Count distinct projects
        const projectIds = new Set((allocations || []).map((a: any) => a.project_id));

        // Get time entries
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('actual_hours')
          .eq('user_id', user.id);

        const totalLogged = (timeEntries || []).reduce(
          (sum: number, e: any) => sum + (e.actual_hours || 0),
          0
        );

        const utilizationPercent = totalAllocated > 0 ? (totalLogged / totalAllocated) * 100 : 0;

        return {
          person_id: user.id,
          person_name: user.name,
          email: user.email,
          department: user.discipline || 'Unknown',
          is_active: user.is_active ?? true,
          total_allocated_hours: totalAllocated,
          total_logged_hours: totalLogged,
          utilization_percent: Math.round(utilizationPercent * 100) / 100,
          project_count: projectIds.size,
        };
      })
    );

    const activeCount = peopleWithMetrics.filter(p => p.is_active).length;

    const response: PeopleSummaryResponse = {
      success: true,
      data: peopleWithMetrics,
      meta: {
        total_people: peopleWithMetrics.length,
        active_count: activeCount,
      },
    };

    res.json(response);
  } catch (err: any) {
    console.error('Failed to fetch people:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ROLE ACROSS PROJECTS
// ============================================================

/**
 * GET /api/reports/role/:roleId
 * Returns all projects for a role with aggregated hours by phase
 * roleId can be numeric index or discipline name
 */
router.get('/role/:roleId', async (req: Request, res: Response) => {
  const roleIdParam = req.params.roleId as string;

  try {
    // Determine the discipline name
    let discipline: string = roleIdParam;

    // If it looks numeric, get the discipline from the disciplines list
    if (/^\d+$/.test(roleIdParam)) {
      const { data: disciplines } = await supabase
        .from('users')
        .select('discipline')
        .not('discipline', 'is', null)
        .order('discipline');

      const uniqueDisciplines = Array.from(new Set(disciplines?.map((d: any) => d.discipline)));
      const index = parseInt(roleIdParam, 10);
      discipline = uniqueDisciplines[index] || roleIdParam;
    }

    // Get all users with this discipline
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('discipline', discipline);

    if (userError) throw userError;

    const userIds = (users || []).map((u: any) => u.id);
    if (userIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        meta: {
          role_id: parseInt(roleIdParam, 10) || 0,
          role_name: discipline,
          discipline,
          total_budgeted_hours: 0,
          total_logged_hours: 0,
          burn_rate: 0,
          total_headcount: 0,
          project_count: 0,
        },
      });
    }

    // Get all allocations for these users with project and phase info
    const { data: allocations, error: allocError } = await supabase
      .from('allocations')
      .select(`
        user_id, planned_hours, phase_id, project_id,
        project:projects(id, name),
        phase:project_phases(id, name, budget_hours)
      `)
      .in('user_id', userIds);

    if (allocError) throw allocError;

    // Get time entries for these users
    const { data: timeEntries, error: timeError } = await supabase
      .from('time_entries')
      .select('user_id, phase_id, actual_hours')
      .in('user_id', userIds);

    if (timeError) throw timeError;

    // Group time entries by phase
    const loggedByPhase: Record<number, number> = {};
    const usersByPhase: Record<number, Set<number>> = {};

    (timeEntries || []).forEach((entry: any) => {
      loggedByPhase[entry.phase_id] = (loggedByPhase[entry.phase_id] || 0) + (entry.actual_hours || 0);
      if (!usersByPhase[entry.phase_id]) usersByPhase[entry.phase_id] = new Set();
      usersByPhase[entry.phase_id].add(entry.user_id);
    });

    // Group allocations by phase
    const allocationsByPhase: Record<number, {
      allocated: number;
      project: any;
      phase: any;
      users: Set<number>;
    }> = {};

    (allocations || []).forEach((alloc: any) => {
      if (!allocationsByPhase[alloc.phase_id]) {
        allocationsByPhase[alloc.phase_id] = {
          allocated: 0,
          project: alloc.project,
          phase: alloc.phase,
          users: new Set(),
        };
      }
      allocationsByPhase[alloc.phase_id].allocated += alloc.planned_hours || 0;
      allocationsByPhase[alloc.phase_id].users.add(alloc.user_id);
    });

    // Determine role_id (index in disciplines list)
    const { data: allDisciplines } = await supabase
      .from('users')
      .select('discipline')
      .not('discipline', 'is', null)
      .order('discipline');

    const uniqueDisciplines = Array.from(new Set(allDisciplines?.map((d: any) => d.discipline)));
    const roleIndex = uniqueDisciplines.indexOf(discipline);

    // Build detail records
    const details: RoleDetail[] = Object.entries(allocationsByPhase).map(([phaseId, data]) => {
      const phaseIdNum = parseInt(phaseId, 10);
      const allocatedHours = data.allocated;
      const loggedHours = loggedByPhase[phaseIdNum] || 0;
      const budgetedHours = data.phase?.budget_hours || allocatedHours;
      const remainingHours = budgetedHours - loggedHours;
      const headcount = data.users.size;

      return {
        role_id: roleIndex >= 0 ? roleIndex : 0,
        role_name: discipline,
        discipline,
        project_id: data.project?.id || 0,
        project_name: data.project?.name || 'Unknown',
        phase_id: phaseIdNum,
        phase_name: data.phase?.name || 'Unknown',
        budgeted_hours: budgetedHours,
        allocated_hours: allocatedHours,
        logged_hours: loggedHours,
        remaining_hours: remainingHours,
        headcount,
      };
    });

    // Calculate totals
    const totalBudgeted = details.reduce((sum, d) => sum + d.budgeted_hours, 0);
    const totalLogged = details.reduce((sum, d) => sum + d.logged_hours, 0);
    const burnRate = totalBudgeted > 0 ? (totalLogged / totalBudgeted) * 100 : 0;
    const uniqueProjects = new Set(details.map(d => d.project_id));

    const response: RoleDetailResponse = {
      success: true,
      data: details,
      meta: {
        role_id: roleIndex >= 0 ? roleIndex : 0,
        role_name: discipline,
        discipline,
        total_budgeted_hours: totalBudgeted,
        total_logged_hours: totalLogged,
        burn_rate: Math.round(burnRate * 100) / 100,
        total_headcount: userIds.length,
        project_count: uniqueProjects.size,
      },
    };

    res.json(response);
  } catch (err: any) {
    console.error('Failed to fetch role summary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/roles
 * Returns list of all roles/disciplines with metrics
 */
router.get('/roles', async (req: Request, res: Response) => {
  try {
    // Get all users with their disciplines
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, discipline')
      .not('discipline', 'is', null);

    if (userError) throw userError;

    // Group users by discipline
    const usersByDiscipline: Record<string, number[]> = {};
    (users || []).forEach((user: any) => {
      if (!usersByDiscipline[user.discipline]) {
        usersByDiscipline[user.discipline] = [];
      }
      usersByDiscipline[user.discipline].push(user.id);
    });

    // Get sorted unique disciplines
    const disciplines = Object.keys(usersByDiscipline).sort();

    // For each discipline, calculate metrics
    const rolesWithMetrics: RoleSummary[] = await Promise.all(
      disciplines.map(async (discipline, index) => {
        const userIds = usersByDiscipline[discipline];
        const headcount = userIds.length;

        // Get allocations for these users
        const { data: allocations } = await supabase
          .from('allocations')
          .select('planned_hours, project_id, phase_id')
          .in('user_id', userIds);

        const totalAllocated = (allocations || []).reduce(
          (sum: number, a: any) => sum + (a.planned_hours || 0),
          0
        );

        // Count distinct projects
        const projectIds = new Set((allocations || []).map((a: any) => a.project_id));

        // Get phase budget hours for phases these users are allocated to
        const phaseIds = Array.from(new Set((allocations || []).map((a: any) => a.phase_id)));
        let totalBudgeted = 0;
        if (phaseIds.length > 0) {
          const { data: phases } = await supabase
            .from('project_phases')
            .select('budget_hours')
            .in('id', phaseIds);

          totalBudgeted = (phases || []).reduce(
            (sum: number, p: any) => sum + (p.budget_hours || 0),
            0
          );
        }

        // Get time entries for these users
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('actual_hours')
          .in('user_id', userIds);

        const totalLogged = (timeEntries || []).reduce(
          (sum: number, e: any) => sum + (e.actual_hours || 0),
          0
        );

        return {
          role_id: index,
          role_name: discipline,
          discipline,
          total_budgeted_hours: totalBudgeted,
          total_allocated_hours: totalAllocated,
          total_logged_hours: totalLogged,
          project_count: projectIds.size,
          headcount,
        };
      })
    );

    const response: RolesSummaryResponse = {
      success: true,
      data: rolesWithMetrics,
      meta: {
        total_roles: rolesWithMetrics.length,
      },
    };

    res.json(response);
  } catch (err: any) {
    console.error('Failed to fetch roles:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
