import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Allocation, AllocationUpdate, ApiError } from '@/types/database'

/**
 * PATCH /api/allocations/[id] - Update an allocation
 * DELETE /api/allocations/[id] - Delete an allocation
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Allocation | { success: boolean } | ApiError>
) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Allocation ID is required' })
  }

  if (req.method === 'PATCH') {
    try {
      const updateData: AllocationUpdate = req.body

      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('allocations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Allocation not found' })
        }
        throw error
      }

      return res.status(200).json(data)
    } catch (error) {
      console.error('Error updating allocation:', error)
      return res.status(500).json({ error: 'Failed to update allocation' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('allocations')
        .delete()
        .eq('id', id)

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Allocation not found' })
        }
        throw error
      }

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error deleting allocation:', error)
      return res.status(500).json({ error: 'Failed to delete allocation' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
