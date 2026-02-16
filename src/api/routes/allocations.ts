/**
 * Allocations Routes - Full CRUD for allocations
 * Used by useAllocations and useResourceCalendar hooks
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Helper: Get Monday of a given date
 */
function getWeekMonday(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Helper: Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * List allocations with date range overlap query
 * GET /api/allocations?startDate=xxx&endDate=xxx&userId=xxx&projectId=xxx
 */
router.get('/', async (req, res) => {
  const { startDate, endDate, userId, projectId } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  try {
    let query = supabase
      .from('allocations')
      .select('*, project:projects(id, name, color), phase:project_phases(id, name)')
      .lte('start_date', endDate as string)
      .gte('end_date', startDate as string);

    if (userId) query = query.eq('user_id', userId as string);
    if (projectId) query = query.eq('project_id', projectId as string);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ allocations: data || [] });
  } catch (err: any) {
    console.error('Failed to fetch allocations:', err);
    res.status(500).json({ error: 'Failed to fetch allocations' });
  }
});

/**
 * Create allocation
 * POST /api/allocations
 * Body: { user_id, project_id, phase_id?, start_date, end_date, planned_hours,
 *         is_billable?, notes?, created_by?, expandToWeek? }
 */
router.post('/', async (req, res) => {
  const {
    user_id, project_id, phase_id, start_date, end_date,
    planned_hours, is_billable, notes, created_by, expandToWeek,
  } = req.body;

  if (!user_id || !project_id || !start_date || !end_date || planned_hours === undefined) {
    return res.status(400).json({ error: 'user_id, project_id, start_date, end_date, and planned_hours are required' });
  }

  try {
    // Expand to full week of single-day records (Mon-Fri)
    if (expandToWeek) {
      const monday = getWeekMonday(start_date);
      const records = [];

      for (let i = 0; i < 5; i++) {
        const d = new Date(monday + 'T00:00:00');
        d.setDate(d.getDate() + i);
        const dateStr = formatDate(d);

        records.push({
          user_id,
          project_id,
          phase_id: phase_id || null,
          start_date: dateStr,
          end_date: dateStr,
          week_start: monday,
          planned_hours,
          is_billable: is_billable ?? true,
          notes: notes || null,
          created_by: created_by || null,
        });
      }

      const { error } = await supabase
        .from('allocations')
        .upsert(records, {
          onConflict: 'user_id,project_id,start_date',
          ignoreDuplicates: false,
        });

      if (error) throw error;
      return res.json({ success: true, count: records.length });
    }

    // Check for overlapping allocations (merge logic)
    // Type assertion needed: start_date/end_date exist in DB but not in generated types
    const { data: existing, error: fetchError } = await (supabase
      .from('allocations')
      .select('id, start_date, end_date, planned_hours, notes')
      .eq('user_id', user_id)
      .eq('project_id', project_id)
      .lte('start_date', end_date)
      .gte('end_date', start_date) as any);

    if (fetchError) throw fetchError;

    if (existing && existing.length > 0) {
      // Merge into first overlapping allocation
      const primary = existing[0];
      let mergedStart = start_date;
      let mergedEnd = end_date;
      let totalHours = planned_hours;

      existing.forEach((e: any) => {
        if (e.start_date < mergedStart) mergedStart = e.start_date;
        if (e.end_date > mergedEnd) mergedEnd = e.end_date;
        totalHours += e.planned_hours;
      });

      const { error: updateError } = await supabase
        .from('allocations')
        .update({
          start_date: mergedStart,
          end_date: mergedEnd,
          week_start: mergedStart,
          planned_hours: totalHours,
          notes: notes || primary.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', primary.id);

      if (updateError) throw updateError;

      // Delete other overlapping records
      if (existing.length > 1) {
        const idsToDelete = existing.slice(1).map((e: any) => e.id);
        await supabase.from('allocations').delete().in('id', idsToDelete);
      }

      return res.json({ allocation: { id: primary.id }, merged: true });
    }

    // No overlap — create new
    const weekStart = getWeekMonday(start_date);

    const { data, error } = await supabase
      .from('allocations')
      .insert({
        user_id,
        project_id,
        phase_id: phase_id || null,
        start_date,
        end_date,
        week_start: weekStart,
        planned_hours,
        is_billable: is_billable ?? true,
        notes: notes || null,
        created_by: created_by || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ allocation: data });
  } catch (err: any) {
    console.error('Failed to create allocation:', err);
    res.status(500).json({ error: err.message || 'Failed to create allocation' });
  }
});

/**
 * Bulk create allocations (Repeat Last Week)
 * POST /api/allocations/bulk
 * Body: { targetWeekStart, createdBy }
 */
router.post('/bulk', async (req, res) => {
  const { targetWeekStart, createdBy } = req.body;

  if (!targetWeekStart || !createdBy) {
    return res.status(400).json({ error: 'targetWeekStart and createdBy are required' });
  }

  try {
    const targetDate = new Date(targetWeekStart + 'T00:00:00');
    const prevDate = new Date(targetDate);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevWeekStart = formatDate(prevDate);
    const prevWeekEnd = new Date(prevDate);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);
    const prevWeekEndStr = formatDate(prevWeekEnd);

    // Get previous week allocations
    const { data: prevAllocations, error: fetchError } = await supabase
      .from('allocations')
      .select('user_id, project_id, phase_id, planned_hours, is_billable, notes, start_date, end_date')
      .lte('start_date', prevWeekEndStr)
      .gte('end_date', prevWeekStart);

    if (fetchError) throw fetchError;
    if (!prevAllocations || prevAllocations.length === 0) {
      return res.json({ count: 0 });
    }

    // Target week end (Friday)
    const targetWeekEnd = new Date(targetDate);
    targetWeekEnd.setDate(targetWeekEnd.getDate() + 4);
    const targetWeekEndStr = formatDate(targetWeekEnd);

    // Check existing
    const { data: existingAllocations } = await supabase
      .from('allocations')
      .select('user_id, project_id, start_date')
      .lte('start_date', targetWeekEndStr)
      .gte('end_date', targetWeekStart);

    const existingKeys = new Set(
      (existingAllocations || []).map((a: any) => `${a.user_id}-${a.project_id}`)
    );

    const newAllocations = prevAllocations
      .filter((a: any) => !existingKeys.has(`${a.user_id}-${a.project_id}`))
      .map((a: any) => ({
        user_id: a.user_id,
        project_id: a.project_id,
        phase_id: a.phase_id,
        start_date: targetWeekStart,
        end_date: targetWeekEndStr,
        week_start: targetWeekStart,
        planned_hours: a.planned_hours,
        is_billable: a.is_billable ?? true,
        notes: a.notes,
        created_by: createdBy,
      }));

    if (newAllocations.length === 0) {
      return res.json({ count: 0 });
    }

    const { error: insertError } = await supabase
      .from('allocations')
      .insert(newAllocations);

    if (insertError) throw insertError;

    res.json({ count: newAllocations.length });
  } catch (err: any) {
    console.error('Failed to bulk create allocations:', err);
    res.status(500).json({ error: 'Failed to bulk create allocations' });
  }
});

/**
 * Update a group of allocations at once (MUST be before /:id to avoid matching "group" as :id)
 * PUT /api/allocations/group
 * Body: { allocationIds: string[], updates: {...} }
 */
router.put('/group', async (req, res) => {
  const { allocationIds, updates } = req.body;

  if (!Array.isArray(allocationIds) || allocationIds.length === 0) {
    return res.status(400).json({ error: 'allocationIds array is required' });
  }

  const updateData: any = { updated_at: new Date().toISOString() };
  if (updates.planned_hours !== undefined) updateData.planned_hours = updates.planned_hours;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.is_billable !== undefined) updateData.is_billable = updates.is_billable;
  if (updates.project_id !== undefined) updateData.project_id = updates.project_id;
  if (updates.phase_id !== undefined) updateData.phase_id = updates.phase_id;

  try {
    const { error } = await supabase
      .from('allocations')
      .update(updateData)
      .in('id', allocationIds);

    if (error) throw error;
    res.json({ success: true, count: allocationIds.length });
  } catch (err: any) {
    console.error('Failed to update allocation group:', err);
    res.status(500).json({ error: 'Failed to update allocation group' });
  }
});

/**
 * Update allocation
 * PUT /api/allocations/:id
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const updateData: any = { updated_at: new Date().toISOString() };

  if (updates.project_id !== undefined) updateData.project_id = updates.project_id;
  if (updates.phase_id !== undefined) updateData.phase_id = updates.phase_id;
  if (updates.start_date !== undefined) {
    updateData.start_date = updates.start_date;
    updateData.week_start = getWeekMonday(updates.start_date);
  }
  if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
  if (updates.planned_hours !== undefined) updateData.planned_hours = updates.planned_hours;
  if (updates.is_billable !== undefined) updateData.is_billable = updates.is_billable;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  try {
    const { error } = await supabase
      .from('allocations')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to update allocation:', err);
    res.status(500).json({ error: 'Failed to update allocation' });
  }
});

/**
 * Delete a group of allocations (MUST be before /:id)
 * DELETE /api/allocations/group
 * Body: { allocationIds: string[] }
 */
router.delete('/group', async (req, res) => {
  const { allocationIds } = req.body;

  if (!Array.isArray(allocationIds) || allocationIds.length === 0) {
    return res.status(400).json({ error: 'allocationIds array is required' });
  }

  try {
    const { error } = await supabase
      .from('allocations')
      .delete()
      .in('id', allocationIds);

    if (error) throw error;
    res.json({ success: true, count: allocationIds.length });
  } catch (err: any) {
    console.error('Failed to delete allocation group:', err);
    res.status(500).json({ error: 'Failed to delete allocation group' });
  }
});

/**
 * Delete allocation
 * DELETE /api/allocations/:id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('allocations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete allocation:', err);
    res.status(500).json({ error: 'Failed to delete allocation' });
  }
});

export default router;
