/**
 * Phases Routes - Phase CRUD (separate from project-scoped routes)
 * Handles /api/phases/:phaseId routes
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Update a phase
 * PATCH /api/phases/:phaseId
 */
router.patch('/:phaseId', async (req, res) => {
  const { phaseId } = req.params;
  const updates = req.body;

  // Only allow specific fields
  const allowedFields = ['name', 'budget_hours', 'status', 'sort_order'];
  const filteredUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = value;
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const { data, error } = await supabase
      .from('project_phases')
      .update(filteredUpdates)
      .eq('id', phaseId)
      .select()
      .single();

    if (error) throw error;

    res.json({ phase: data });
  } catch (err: any) {
    console.error('Failed to update phase:', err);
    res.status(500).json({ error: 'Failed to update phase' });
  }
});

/**
 * Delete a phase
 * DELETE /api/phases/:phaseId
 */
router.delete('/:phaseId', async (req, res) => {
  const { phaseId } = req.params;

  try {
    // Check if phase has allocations
    const { data: allocations } = await supabase
      .from('allocations')
      .select('id')
      .eq('phase_id', phaseId)
      .limit(1);

    if (allocations && allocations.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete phase with existing allocations',
        hint: 'Move or delete allocations first',
      });
    }

    const { error } = await supabase
      .from('project_phases')
      .delete()
      .eq('id', phaseId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete phase:', err);
    res.status(500).json({ error: 'Failed to delete phase' });
  }
});

export default router;
