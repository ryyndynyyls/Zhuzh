import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { TimeConfirmation, ApiError } from '@/types/database'

/**
 * POST /api/confirmations/[id]/approve - Approve a timesheet
 *
 * Request body:
 * - approved_by: UUID of the approving user (required)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TimeConfirmation | ApiError>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Confirmation ID is required' })
  }

  try {
    const { approved_by } = req.body

    if (!approved_by) {
      return res.status(400).json({
        error: 'Missing required field',
        details: 'approved_by is required'
      })
    }

    // First, check if confirmation exists and is in submitted status
    const { data: existing, error: fetchError } = await supabase
      .from('time_confirmations')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Confirmation not found' })
      }
      throw fetchError
    }

    if (existing.status !== 'submitted') {
      return res.status(400).json({
        error: 'Cannot approve confirmation',
        details: `Confirmation is in '${existing.status}' status. Only submitted confirmations can be approved.`
      })
    }

    // Update the confirmation to approved
    const { data, error } = await supabase
      .from('time_confirmations')
      .update({
        status: 'approved',
        approved_by,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return res.status(200).json(data)
  } catch (error) {
    console.error('Error approving confirmation:', error)
    return res.status(500).json({ error: 'Failed to approve confirmation' })
  }
}
