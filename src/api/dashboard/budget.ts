import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { ProjectWithBudgetStats, ApiError } from '@/types/database'

/**
 * GET /api/dashboard/budget - All projects with budget status for dashboard
 *
 * Query params:
 * - status: Filter by project status
 * - clientId: Filter by client
 * - isActive: Filter by active status (default: true)
 *
 * Returns projects with:
 * - phases
 * - total_planned_hours (from allocations)
 * - total_actual_hours (from approved time entries)
 * - budget_remaining
 * - budget_percentage
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProjectWithBudgetStats[] | ApiError>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { status, clientId, isActive = 'true' } = req.query

    // First, get projects with phases
    let projectQuery = supabase
      .from('projects')
      .select(`
        *,
        phases:project_phases(*),
        client:clients(name)
      `)

    // Apply filters
    if (status) {
      projectQuery = projectQuery.eq('status', status as string)
    }
    if (clientId) {
      projectQuery = projectQuery.eq('client_id', clientId as string)
    }
    if (isActive !== undefined) {
      projectQuery = projectQuery.eq('is_active', isActive === 'true')
    }

    // Order by priority then name
    projectQuery = projectQuery
      .order('priority', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })

    const { data: projects, error: projectError } = await projectQuery

    if (projectError) throw projectError

    if (!projects || projects.length === 0) {
      return res.status(200).json([])
    }

    // Get project IDs for aggregation queries
    const projectIds = projects.map(p => p.id)

    // Get total planned hours from allocations
    const { data: allocations, error: allocationError } = await supabase
      .from('allocations')
      .select('project_id, planned_hours')
      .in('project_id', projectIds)

    if (allocationError) throw allocationError

    // Get total actual hours from approved time entries
    const { data: confirmations, error: confirmationError } = await supabase
      .from('time_confirmations')
      .select('id')
      .eq('status', 'approved')

    if (confirmationError) throw confirmationError

    const approvedConfirmationIds = confirmations?.map(c => c.id) || []

    let entries: { project_id: string; actual_hours: number }[] = []
    if (approvedConfirmationIds.length > 0) {
      const { data: entryData, error: entryError } = await supabase
        .from('time_entries')
        .select('project_id, actual_hours')
        .in('confirmation_id', approvedConfirmationIds)
        .in('project_id', projectIds)

      if (entryError) throw entryError
      entries = entryData || []
    }

    // Aggregate hours by project
    const plannedByProject: Record<string, number> = {}
    const actualByProject: Record<string, number> = {}

    allocations?.forEach(a => {
      plannedByProject[a.project_id] = (plannedByProject[a.project_id] || 0) + Number(a.planned_hours)
    })

    entries.forEach(e => {
      actualByProject[e.project_id] = (actualByProject[e.project_id] || 0) + Number(e.actual_hours)
    })

    // Build response with budget stats
    const projectsWithStats: ProjectWithBudgetStats[] = projects.map(project => {
      const totalPlanned = plannedByProject[project.id] || 0
      const totalActual = actualByProject[project.id] || 0
      const budgetHours = Number(project.budget_hours)
      const budgetRemaining = budgetHours - totalActual
      const budgetPercentage = budgetHours > 0 ? (totalActual / budgetHours) * 100 : 0

      return {
        ...project,
        total_planned_hours: totalPlanned,
        total_actual_hours: totalActual,
        budget_remaining: budgetRemaining,
        budget_percentage: Math.round(budgetPercentage * 100) / 100
      }
    })

    return res.status(200).json(projectsWithStats)
  } catch (error) {
    console.error('Error fetching budget dashboard:', error)
    return res.status(500).json({ error: 'Failed to fetch budget dashboard data' })
  }
}
