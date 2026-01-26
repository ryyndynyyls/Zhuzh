import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { PtoEntry, PtoEntryInsert, ApiError } from '@/types/database'

interface PtoEntryWithUser extends PtoEntry {
  user?: {
    id: string
    name: string
    email: string
  }
}

/**
 * GET /api/pto - Query PTO entries
 * POST /api/pto - Create a new PTO entry
 *
 * Query params (GET):
 * - userId: Filter by user ID
 * - weekStart: Filter by week start date (returns all PTO within that week)
 * - startDate: Filter by date range start
 * - endDate: Filter by date range end
 * - type: Filter by PTO type (pto, holiday, half-day, sick)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PtoEntryWithUser[] | PtoEntry | ApiError>
) {
  if (req.method === 'GET') {
    try {
      const { userId, weekStart, startDate, endDate, type } = req.query

      let query = supabase
        .from('pto_entries')
        .select(`
          *,
          user:users(id, name, email)
        `)

      // Apply filters
      if (userId) {
        query = query.eq('user_id', userId as string)
      }

      if (type) {
        query = query.eq('type', type as string)
      }

      // Week-based filtering
      if (weekStart) {
        const weekStartDate = new Date(weekStart as string)
        const weekEndDate = new Date(weekStartDate)
        weekEndDate.setDate(weekEndDate.getDate() + 6)

        query = query
          .gte('date', weekStartDate.toISOString().split('T')[0])
          .lte('date', weekEndDate.toISOString().split('T')[0])
      } else if (startDate || endDate) {
        // Date range filtering
        if (startDate) {
          query = query.gte('date', startDate as string)
        }
        if (endDate) {
          query = query.lte('date', endDate as string)
        }
      }

      // Order by date
      query = query.order('date', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      return res.status(200).json(data as PtoEntryWithUser[])
    } catch (error) {
      console.error('Error fetching PTO entries:', error)
      return res.status(500).json({ error: 'Failed to fetch PTO entries' })
    }
  }

  if (req.method === 'POST') {
    try {
      const ptoData: PtoEntryInsert = req.body

      // Validate required fields
      if (!ptoData.user_id || !ptoData.date || !ptoData.type || ptoData.hours === undefined) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'user_id, date, type, and hours are required'
        })
      }

      // Validate PTO type
      const validTypes = ['pto', 'holiday', 'half-day', 'sick']
      if (!validTypes.includes(ptoData.type)) {
        return res.status(400).json({
          error: 'Invalid PTO type',
          details: `type must be one of: ${validTypes.join(', ')}`
        })
      }

      // Validate hours
      if (ptoData.hours <= 0 || ptoData.hours > 24) {
        return res.status(400).json({
          error: 'Invalid hours',
          details: 'hours must be between 0 and 24'
        })
      }

      // Check for duplicate entry (same user, same date)
      const { data: existing, error: existingError } = await supabase
        .from('pto_entries')
        .select('id')
        .eq('user_id', ptoData.user_id)
        .eq('date', ptoData.date)
        .maybeSingle()

      if (existingError) throw existingError

      if (existing) {
        return res.status(400).json({
          error: 'Duplicate entry',
          details: 'A PTO entry already exists for this user on this date'
        })
      }

      const { data, error } = await supabase
        .from('pto_entries')
        .insert(ptoData)
        .select()
        .single()

      if (error) throw error

      return res.status(201).json(data)
    } catch (error) {
      console.error('Error creating PTO entry:', error)
      return res.status(500).json({ error: 'Failed to create PTO entry' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
