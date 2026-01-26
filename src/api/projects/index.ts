import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Project, ProjectInsert, ProjectWithPhases, ApiError } from '@/types/database'

/**
 * GET /api/projects - List all projects with budget stats
 * POST /api/projects - Create a new project
 *
 * Query params (GET):
 * - status: Filter by project status
 * - clientId: Filter by client
 * - isActive: Filter by active status
 * - isBillable: Filter by billable status
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProjectWithPhases[] | Project | ApiError>
) {
  if (req.method === 'GET') {
    try {
      const { status, clientId, isActive, isBillable } = req.query

      let query = supabase
        .from('projects')
        .select('*, phases:project_phases(*)')

      // Apply filters
      if (status) {
        query = query.eq('status', status as string)
      }
      if (clientId) {
        query = query.eq('client_id', clientId as string)
      }
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive === 'true')
      }
      if (isBillable !== undefined) {
        query = query.eq('is_billable', isBillable === 'true')
      }

      // Order by priority then name
      query = query.order('priority', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      return res.status(200).json(data as ProjectWithPhases[])
    } catch (error) {
      console.error('Error fetching projects:', error)
      return res.status(500).json({ error: 'Failed to fetch projects' })
    }
  }

  if (req.method === 'POST') {
    try {
      const projectData: ProjectInsert = req.body

      // Validate required fields
      if (!projectData.org_id || !projectData.client_id || !projectData.name || projectData.budget_hours === undefined) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'org_id, client_id, name, and budget_hours are required'
        })
      }

      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (error) throw error

      return res.status(201).json(data)
    } catch (error) {
      console.error('Error creating project:', error)
      return res.status(500).json({ error: 'Failed to create project' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
