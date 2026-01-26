import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { ApiError, TimeConfirmation, User } from '@/types/database'

interface PendingApproval {
  confirmation: TimeConfirmation
  user: User
  entries: {
    project_id: string
    project_name: string
    project_color: string | null
    planned_hours: number
    actual_hours: number
    variance: number
    variance_percentage: number
  }[]
  total_planned: number
  total_actual: number
  total_variance: number
  has_variance_warning: boolean
  has_rubber_stamp_warning: boolean
}

interface ApprovalsQueueResponse {
  pending_count: number
  approvals: PendingApproval[]
}

/**
 * GET /api/dashboard/approvals - Pending approval queue
 *
 * Query params:
 * - orgId: Organization ID (required)
 * - weekStart: Filter by specific week (optional)
 *
 * Returns pending timesheets with:
 * - Variance warnings (>10% difference)
 * - Rubber-stamp warnings (actual = planned exactly)
 * - Entry details with project info
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApprovalsQueueResponse | ApiError>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { orgId, weekStart } = req.query

    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' })
    }

    // Get users in the organization
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, slack_user_id')
      .eq('org_id', orgId)

    if (userError) throw userError

    if (!users || users.length === 0) {
      return res.status(200).json({
        pending_count: 0,
        approvals: []
      })
    }

    const userIds = users.map(u => u.id)
    const userMap = new Map(users.map(u => [u.id, u]))

    // Get submitted (pending) confirmations
    let confirmationQuery = supabase
      .from('time_confirmations')
      .select('*')
      .eq('status', 'submitted')
      .in('user_id', userIds)
      .order('submitted_at', { ascending: true })

    if (weekStart) {
      confirmationQuery = confirmationQuery.eq('week_start', weekStart)
    }

    const { data: confirmations, error: confError } = await confirmationQuery

    if (confError) throw confError

    if (!confirmations || confirmations.length === 0) {
      return res.status(200).json({
        pending_count: 0,
        approvals: []
      })
    }

    const confirmationIds = confirmations.map(c => c.id)

    // Get time entries for these confirmations
    const { data: entries, error: entryError } = await supabase
      .from('time_entries')
      .select(`
        confirmation_id,
        project_id,
        planned_hours,
        actual_hours,
        project:projects(name, color)
      `)
      .in('confirmation_id', confirmationIds)

    if (entryError) throw entryError

    // Build pending approvals
    const approvals: PendingApproval[] = confirmations.map(confirmation => {
      const user = userMap.get(confirmation.user_id)!
      const confirmationEntries = entries?.filter(e => e.confirmation_id === confirmation.id) || []

      let totalPlanned = 0
      let totalActual = 0
      let hasRubberStamp = true
      let hasVarianceWarning = false

      const entryDetails = confirmationEntries.map(entry => {
        const planned = Number(entry.planned_hours)
        const actual = Number(entry.actual_hours)
        const variance = actual - planned
        const variancePercentage = planned > 0 ? (variance / planned) * 100 : 0

        totalPlanned += planned
        totalActual += actual

        // Check for rubber-stamping (exact match)
        if (planned !== actual) {
          hasRubberStamp = false
        }

        // Check for variance warning (>10% difference)
        if (Math.abs(variancePercentage) > 10) {
          hasVarianceWarning = true
        }

        const project = entry.project as { name: string; color: string | null } | null

        return {
          project_id: entry.project_id,
          project_name: project?.name || 'Unknown',
          project_color: project?.color || null,
          planned_hours: planned,
          actual_hours: actual,
          variance,
          variance_percentage: Math.round(variancePercentage * 100) / 100
        }
      })

      // If there are no entries, no rubber-stamp warning
      if (confirmationEntries.length === 0) {
        hasRubberStamp = false
      }

      // Override with exact_match_flag if set
      if (confirmation.exact_match_flag) {
        hasRubberStamp = true
      }

      return {
        confirmation,
        user: user as User,
        entries: entryDetails,
        total_planned: totalPlanned,
        total_actual: totalActual,
        total_variance: totalActual - totalPlanned,
        has_variance_warning: hasVarianceWarning,
        has_rubber_stamp_warning: hasRubberStamp
      }
    })

    return res.status(200).json({
      pending_count: approvals.length,
      approvals
    })
  } catch (error) {
    console.error('Error fetching approvals queue:', error)
    return res.status(500).json({ error: 'Failed to fetch approvals queue' })
  }
}
