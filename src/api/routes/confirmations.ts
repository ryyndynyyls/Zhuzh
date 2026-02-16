/**
 * Confirmations Routes - Time confirmation queries
 * For useConfirmation hook (NOT usePendingApprovals which already uses /api/approvals)
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Get a user's time confirmation for a specific week
 * GET /api/confirmations?userId=xxx&weekStart=xxx
 */
router.get('/', async (req, res) => {
  const { userId, weekStart } = req.query;

  if (!userId || !weekStart) {
    return res.status(400).json({ error: 'userId and weekStart are required' });
  }

  try {
    const { data, error } = await supabase
      .from('time_confirmations')
      .select('*, entries:time_entries(*, project:projects(name, color))')
      .eq('user_id', userId as string)
      .eq('week_start', weekStart as string)
      .maybeSingle();

    if (error) throw error;
    res.json({ confirmation: data });
  } catch (err: any) {
    console.error('Failed to fetch confirmation:', err);
    res.status(500).json({ error: 'Failed to fetch confirmation' });
  }
});

/**
 * Submit (create or update) a time confirmation with entries
 * POST /api/confirmations/submit
 * Body: { userId, weekStart, entries: [{ allocation_id, actual_hours }], notes? }
 */
router.post('/submit', async (req, res) => {
  const { userId, weekStart, entries, notes } = req.body;

  if (!userId || !weekStart || !entries) {
    return res.status(400).json({ error: 'userId, weekStart, and entries are required' });
  }

  try {
    // Get or create confirmation
    let { data: confirmation } = await supabase
      .from('time_confirmations')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (confirmation) {
      const { data, error } = await supabase
        .from('time_confirmations')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          notes,
        })
        .eq('id', confirmation.id)
        .select()
        .single();
      if (error) throw error;
      confirmation = data;
    } else {
      const { data, error } = await supabase
        .from('time_confirmations')
        .insert({
          user_id: userId,
          week_start: weekStart,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          notes,
        })
        .select()
        .single();
      if (error) throw error;
      confirmation = data;
    }

    // Delete existing entries
    await supabase.from('time_entries').delete().eq('confirmation_id', confirmation.id);

    // Get allocations for planned hours
    const { data: allocations } = await supabase
      .from('allocations')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart);

    let exactMatch = true;

    // Create new entries
    for (const entry of entries) {
      const alloc = allocations?.find((a: any) => a.id === entry.allocation_id);
      if (alloc) {
        if (alloc.planned_hours !== entry.actual_hours) {
          exactMatch = false;
        }

        await supabase.from('time_entries').insert({
          confirmation_id: confirmation.id,
          project_id: alloc.project_id,
          phase_id: alloc.phase_id,
          allocation_id: alloc.id,
          planned_hours: alloc.planned_hours,
          actual_hours: entry.actual_hours,
          is_unplanned: false,
          notes: entry.notes,
        });
      }
    }

    // Update exact_match_flag
    await supabase
      .from('time_confirmations')
      .update({ exact_match_flag: exactMatch })
      .eq('id', confirmation.id);

    res.json({ confirmation });
  } catch (err: any) {
    console.error('Failed to submit confirmation:', err);
    res.status(500).json({ error: 'Failed to submit confirmation' });
  }
});

export default router;
