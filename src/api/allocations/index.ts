import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Allocation, AllocationInsert, AllocationWithRelations, ApiError } from '@/types/database'

/**
 * GET /api/allocations - Query allocations by week/user/project
 * POST /api/allocations - Create a new allocation
 *
 * Query params (GET):
 * - weekStart: Filter by week start date (YYYY-MM-DD)
 * - userId: Filter by user ID
 * - projectId: Filter by project ID
 * - phaseId: Filter by phase ID
 * - isBillable: Filter by billable status
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AllocationWithRelations[] | Allocation | ApiError>
) {
  if (req.method === 'GET') {
    try {
      const { weekStart, userId, projectId, phaseId, isBillable } = req.query

      let query = supabase
        .from('allocations')
        .select(`
          *,
          project:projects(*),
          user:users(*),
          phase:project_phases(*)
        `)

      // Apply filters
      if (weekStart) {
        query = query.eq('week_start', weekStart as string)
      }
      if (userId) {
        query = query.eq('user_id', userId as string)
      }
      if (projectId) {
        query = query.eq('project_id', projectId as string)
      }
      if (phaseId) {
        query = query.eq('phase_id', phaseId as string)
      }
      if (isBillable !== undefined) {
        query = query.eq('is_billable', isBillable === 'true')
      }

      // Order by week_start then user
      query = query.order('week_start', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      return res.status(200).json(data as AllocationWithRelations[])
    } catch (error) {
      console.error('Error fetching allocations:', error)
      return res.status(500).json({ error: 'Failed to fetch allocations' })
    }
  }

  if (req.method === 'POST') {
    try {
      const allocationData: AllocationInsert = req.body

      // Validate required fields
      if (!allocationData.project_id || !allocationData.user_id || !allocationData.week_start ||
          allocationData.planned_hours === undefined || !allocationData.created_by) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'project_id, user_id, week_start, planned_hours, and created_by are required'
        })
      }

      const { data, error } = await supabase
        .from('allocations')
        .insert(allocationData)
        .select()
        .single()

      if (error) throw error

      return res.status(201).json(data)
    } catch (error) {
      console.error('Error creating allocation:', error)
      return res.status(500).json({ error: 'Failed to create allocation' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
