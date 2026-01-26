import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { TimeConfirmation, TimeConfirmationUpdate, TimeConfirmationWithEntries, ApiError } from '@/types/database'

/**
 * GET /api/confirmations/[id] - Get a single confirmation with entries
 * PATCH /api/confirmations/[id] - Update a draft confirmation
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TimeConfirmationWithEntries | TimeConfirmation | ApiError>
) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Confirmation ID is required' })
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('time_confirmations')
        .select(`
          *,
          entries:time_entries(
            *,
            project:projects(*),
            phase:project_phases(*)
          ),
          user:users(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Confirmation not found' })
        }
        throw error
      }

      return res.status(200).json(data as TimeConfirmationWithEntries)
    } catch (error) {
      console.error('Error fetching confirmation:', error)
      return res.status(500).json({ error: 'Failed to fetch confirmation' })
    }
  }

  if (req.method === 'PATCH') {
    try {
      // First, check if confirmation exists and is editable
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

      // Only allow updates on draft confirmations
      if (existing.status !== 'draft') {
        return res.status(400).json({
          error: 'Cannot update confirmation',
          details: 'Only draft confirmations can be updated'
        })
      }

      const updateData: TimeConfirmationUpdate = req.body

      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString()

      // If submitting, set submitted_at
      if (updateData.status === 'submitted') {
        updateData.submitted_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('time_confirmations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return res.status(200).json(data)
    } catch (error) {
      console.error('Error updating confirmation:', error)
      return res.status(500).json({ error: 'Failed to update confirmation' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
