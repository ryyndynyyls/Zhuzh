import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { ApiError, User } from '@/types/database'

interface TeamMemberUtilization {
  user: User
  planned_hours: number
  actual_hours: number
  utilization_percentage: number
  projects: {
    project_id: string
    project_name: string
    project_color: string | null
    planned_hours: number
    actual_hours: number
  }[]
  pto_hours: number
  available_hours: number
}

interface TeamDashboardResponse {
  week_start: string
  team_members: TeamMemberUtilization[]
  total_capacity: number
  total_planned: number
  total_actual: number
  overall_utilization: number
}

/**
 * GET /api/dashboard/team - Team utilization for current/selected week
 *
 * Query params:
 * - weekStart: Week start date (YYYY-MM-DD, defaults to current week's Monday)
 * - orgId: Organization ID (required)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TeamDashboardResponse | ApiError>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { weekStart, orgId } = req.query

    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' })
    }

    // Calculate week start if not provided (Monday of current week)
    let targetWeekStart = weekStart as string
    if (!targetWeekStart) {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(now)
      monday.setDate(now.getDate() + diff)
      targetWeekStart = monday.toISOString().split('T')[0]
    }

    // Get all active users in the organization
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (userError) throw userError

    if (!users || users.length === 0) {
      return res.status(200).json({
        week_start: targetWeekStart,
        team_members: [],
        total_capacity: 0,
        total_planned: 0,
        total_actual: 0,
        overall_utilization: 0
      })
    }

    const userIds = users.map(u => u.id)

    // Get allocations for the week
    const { data: allocations, error: allocError } = await supabase
      .from('allocations')
      .select(`
        user_id,
        project_id,
        planned_hours,
        project:projects(name, color)
      `)
      .eq('week_start', targetWeekStart)
      .in('user_id', userIds)

    if (allocError) throw allocError

    // Get PTO entries for the week (assuming week covers 5 business days)
    const weekEnd = new Date(targetWeekStart)
    weekEnd.setDate(weekEnd.getDate() + 4)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const { data: ptoEntries, error: ptoError } = await supabase
      .from('pto_entries')
      .select('user_id, hours')
      .in('user_id', userIds)
      .gte('date', targetWeekStart)
      .lte('date', weekEndStr)

    if (ptoError) throw ptoError

    // Get approved time confirmations for the week
    const { data: confirmations, error: confError } = await supabase
      .from('time_confirmations')
      .select('id, user_id')
      .eq('week_start', targetWeekStart)
      .eq('status', 'approved')
      .in('user_id', userIds)

    if (confError) throw confError

    // Get time entries for approved confirmations
    let entries: { confirmation_id: string; project_id: string; actual_hours: number }[] = []
    if (confirmations && confirmations.length > 0) {
      const confirmationIds = confirmations.map(c => c.id)
      const { data: entryData, error: entryError } = await supabase
        .from('time_entries')
        .select('confirmation_id, project_id, actual_hours')
        .in('confirmation_id', confirmationIds)

      if (entryError) throw entryError
      entries = entryData || []
    }

    // Map confirmations to users
    const confirmationToUser: Record<string, string> = {}
    confirmations?.forEach(c => {
      confirmationToUser[c.id] = c.user_id
    })

    // Aggregate data by user
    const standardWeeklyHours = 40

    const teamMembers: TeamMemberUtilization[] = users.map(user => {
      // Get user's allocations
      const userAllocations = allocations?.filter(a => a.user_id === user.id) || []
      const plannedHours = userAllocations.reduce((sum, a) => sum + Number(a.planned_hours), 0)

      // Get user's PTO
      const userPto = ptoEntries?.filter(p => p.user_id === user.id) || []
      const ptoHours = userPto.reduce((sum, p) => sum + Number(p.hours), 0)

      // Get user's actual hours
      const userEntries = entries.filter(e => confirmationToUser[e.confirmation_id] === user.id)
      const actualHours = userEntries.reduce((sum, e) => sum + Number(e.actual_hours), 0)

      // Build project breakdown
      const projectMap = new Map<string, { name: string; color: string | null; planned: number; actual: number }>()

      userAllocations.forEach(a => {
        const project = a.project as { name: string; color: string | null } | null
        if (!projectMap.has(a.project_id)) {
          projectMap.set(a.project_id, {
            name: project?.name || 'Unknown',
            color: project?.color || null,
            planned: 0,
            actual: 0
          })
        }
        const proj = projectMap.get(a.project_id)!
        proj.planned += Number(a.planned_hours)
      })

      userEntries.forEach(e => {
        if (!projectMap.has(e.project_id)) {
          projectMap.set(e.project_id, {
            name: 'Unknown',
            color: null,
            planned: 0,
            actual: 0
          })
        }
        const proj = projectMap.get(e.project_id)!
        proj.actual += Number(e.actual_hours)
      })

      const projects = Array.from(projectMap.entries()).map(([projectId, data]) => ({
        project_id: projectId,
        project_name: data.name,
        project_color: data.color,
        planned_hours: data.planned,
        actual_hours: data.actual
      }))

      const availableHours = standardWeeklyHours - ptoHours
      const utilizationPercentage = availableHours > 0 ? (plannedHours / availableHours) * 100 : 0

      return {
        user,
        planned_hours: plannedHours,
        actual_hours: actualHours,
        utilization_percentage: Math.round(utilizationPercentage * 100) / 100,
        projects,
        pto_hours: ptoHours,
        available_hours: availableHours
      }
    })

    // Calculate totals
    const totalCapacity = teamMembers.reduce((sum, m) => sum + m.available_hours, 0)
    const totalPlanned = teamMembers.reduce((sum, m) => sum + m.planned_hours, 0)
    const totalActual = teamMembers.reduce((sum, m) => sum + m.actual_hours, 0)
    const overallUtilization = totalCapacity > 0 ? (totalPlanned / totalCapacity) * 100 : 0

    return res.status(200).json({
      week_start: targetWeekStart,
      team_members: teamMembers,
      total_capacity: totalCapacity,
      total_planned: totalPlanned,
      total_actual: totalActual,
      overall_utilization: Math.round(overallUtilization * 100) / 100
    })
  } catch (error) {
    console.error('Error fetching team dashboard:', error)
    return res.status(500).json({ error: 'Failed to fetch team dashboard data' })
  }
}
