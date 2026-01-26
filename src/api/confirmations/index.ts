import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { TimeConfirmation, TimeConfirmationInsert, TimeConfirmationWithEntries, ApiError } from '@/types/database'

/**
 * GET /api/confirmations - Query confirmations
 * POST /api/confirmations - Submit a new timesheet
 *
 * Query params (GET):
 * - weekStart: Filter by week start date (YYYY-MM-DD)
 * - userId: Filter by user ID
 * - status: Filter by confirmation status (draft, submitted, approved, rejected)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TimeConfirmationWithEntries[] | TimeConfirmation | ApiError>
) {
  if (req.method === 'GET') {
    try {
      const { weekStart, userId, status } = req.query

      let query = supabase
        .from('time_confirmations')
        .select(`
          *,
          entries:time_entries(*),
          user:users(*)
        `)

      // Apply filters
      if (weekStart) {
        query = query.eq('week_start', weekStart as string)
      }
      if (userId) {
        query = query.eq('user_id', userId as string)
      }
      if (status) {
        query = query.eq('status', status as string)
      }

      // Order by most recent first
      query = query.order('week_start', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      return res.status(200).json(data as TimeConfirmationWithEntries[])
    } catch (error) {
      console.error('Error fetching confirmations:', error)
      return res.status(500).json({ error: 'Failed to fetch confirmations' })
    }
  }

  if (req.method === 'POST') {
    try {
      const confirmationData: TimeConfirmationInsert = req.body

      // Validate required fields
      if (!confirmationData.user_id || !confirmationData.week_start) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'user_id and week_start are required'
        })
      }

      // Set default status to draft if not provided
      if (!confirmationData.status) {
        confirmationData.status = 'draft'
      }

      // Set submitted_at if status is submitted
      if (confirmationData.status === 'submitted') {
        confirmationData.submitted_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('time_confirmations')
        .insert(confirmationData)
        .select()
        .single()

      if (error) throw error

      return res.status(201).json(data)
    } catch (error) {
      console.error('Error creating confirmation:', error)
      return res.status(500).json({ error: 'Failed to create confirmation' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
