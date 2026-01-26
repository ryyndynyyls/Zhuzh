import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Project, ProjectUpdate, ProjectWithPhases, ApiError } from '@/types/database'

/**
 * GET /api/projects/[id] - Get a single project with phases
 * PATCH /api/projects/[id] - Update a project
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProjectWithPhases | Project | ApiError>
) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' })
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          phases:project_phases(*),
          client:clients(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Project not found' })
        }
        throw error
      }

      return res.status(200).json(data as ProjectWithPhases)
    } catch (error) {
      console.error('Error fetching project:', error)
      return res.status(500).json({ error: 'Failed to fetch project' })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const updateData: ProjectUpdate = req.body

      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Project not found' })
        }
        throw error
      }

      return res.status(200).json(data)
    } catch (error) {
      console.error('Error updating project:', error)
      return res.status(500).json({ error: 'Failed to update project' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
