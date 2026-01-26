import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { TimeConfirmation, ApiError } from '@/types/database'

/**
 * POST /api/confirmations/[id]/reject - Reject a timesheet with reason
 *
 * Request body:
 * - rejected_by: UUID of the rejecting user (required)
 * - rejection_reason: Reason for rejection (required)
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
    const { rejected_by, rejection_reason } = req.body

    if (!rejected_by) {
      return res.status(400).json({
        error: 'Missing required field',
        details: 'rejected_by is required'
      })
    }

    if (!rejection_reason || rejection_reason.trim() === '') {
      return res.status(400).json({
        error: 'Missing required field',
        details: 'rejection_reason is required and cannot be empty'
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
        error: 'Cannot reject confirmation',
        details: `Confirmation is in '${existing.status}' status. Only submitted confirmations can be rejected.`
      })
    }

    // Update the confirmation to rejected
    const { data, error } = await supabase
      .from('time_confirmations')
      .update({
        status: 'rejected',
        rejection_reason: rejection_reason.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return res.status(200).json(data)
  } catch (error) {
    console.error('Error rejecting confirmation:', error)
    return res.status(500).json({ error: 'Failed to reject confirmation' })
  }
}
