/**
 * Timer Routes - Live Time Tracking
 *
 * Endpoints for real-time timer management and manual time entry.
 * This is an optional feature - users must enable time_tracking_enabled in settings.
 *
 * Timer operations:
 *   POST /api/timer/start     - Start a new timer
 *   POST /api/timer/stop      - Stop the running timer
 *   GET  /api/timer/current   - Get current running timer
 *   DELETE /api/timer/discard - Discard running timer without saving
 *
 * Manual entry:
 *   POST   /api/timer/entries     - Create a manual time entry
 *   GET    /api/timer/entries     - Get time entries (with filters)
 *   PATCH  /api/timer/entries/:id - Update an entry
 *   DELETE /api/timer/entries/:id - Delete an entry
 *
 * Summaries:
 *   GET /api/timer/summary/today - Today's time breakdown
 *   GET /api/timer/summary/week  - Week's time with plan vs actual
 *
 * User settings:
 *   GET   /api/timer/settings     - Get user's time tracking settings
 *   PATCH /api/timer/settings     - Update settings
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// ============================================================
// HELPER: Get Monday of the week for a given date
// ============================================================
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// ============================================================
// HELPER: Calculate duration in minutes
// ============================================================
function calculateDurationMinutes(startedAt: string, stoppedAt: string): number {
  const start = new Date(startedAt).getTime();
  const stop = new Date(stoppedAt).getTime();
  return Math.round((stop - start) / 60000); // Convert ms to minutes
}

// ============================================================
// TIMER OPERATIONS
// ============================================================

/**
 * Start a new timer
 * POST /api/timer/start
 * Body: { userId, projectId, phaseId?, notes?, source? }
 */
router.post('/start', async (req, res) => {
  const { userId, projectId, phaseId, notes, source = 'web' } = req.body;

  if (!userId || !projectId) {
    return res.status(400).json({ error: 'userId and projectId are required' });
  }

  try {
    // Check if user has time tracking enabled
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, time_tracking_enabled')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.time_tracking_enabled) {
      return res.status(403).json({
        error: 'Time tracking is not enabled',
        message: 'Enable time tracking in Settings to use this feature',
      });
    }

    // Check if there's already a running timer (unique index will also enforce this)
    const { data: existingTimer } = await supabase
      .from('time_entries_live')
      .select('id, project_id')
      .eq('user_id', userId)
      .is('stopped_at', null)
      .eq('entry_type', 'timer')
      .single();

    if (existingTimer) {
      return res.status(409).json({
        error: 'Timer already running',
        message: 'Stop the current timer before starting a new one',
        runningTimerId: existingTimer.id,
        runningProjectId: existingTimer.project_id,
      });
    }

    // Verify project exists and is active
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, color, is_active')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.is_active) {
      return res.status(400).json({ error: 'Cannot track time on archived project' });
    }

    // Create the timer entry
    const now = new Date();
    const { data: timer, error: createError } = await supabase
      .from('time_entries_live')
      .insert({
        user_id: userId,
        project_id: projectId,
        phase_id: phaseId || null,
        entry_type: 'timer',
        started_at: now.toISOString(),
        stopped_at: null,
        duration_minutes: 0,
        entry_date: now.toISOString().split('T')[0],
        notes: notes || null,
        source,
      })
      .select(`
        *,
        project:projects(id, name, color),
        phase:project_phases(id, name)
      `)
      .single();

    if (createError) {
      // Check for unique constraint violation (concurrent start)
      if (createError.code === '23505') {
        return res.status(409).json({
          error: 'Timer already running',
          message: 'A timer was started by another request',
        });
      }
      throw createError;
    }

    res.json({
      timer,
      message: `Timer started on ${project.name}`,
    });
  } catch (err: any) {
    console.error('Failed to start timer:', err);
    res.status(500).json({ error: 'Failed to start timer' });
  }
});

/**
 * Stop the running timer
 * POST /api/timer/stop
 * Body: { userId, notes? }
 */
router.post('/stop', async (req, res) => {
  const { userId, notes } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Find the running timer
    const { data: timer, error: findError } = await supabase
      .from('time_entries_live')
      .select(`
        *,
        project:projects(id, name, color),
        phase:project_phases(id, name)
      `)
      .eq('user_id', userId)
      .is('stopped_at', null)
      .eq('entry_type', 'timer')
      .single();

    if (findError || !timer) {
      return res.status(404).json({
        error: 'No running timer',
        message: 'Start a timer first',
      });
    }

    // Calculate duration
    const now = new Date();
    const durationMinutes = calculateDurationMinutes(timer.started_at, now.toISOString());

    // Update the timer with stop time and duration
    const updateData: Record<string, any> = {
      stopped_at: now.toISOString(),
      duration_minutes: durationMinutes,
    };

    // Add notes if provided (append to existing if any)
    if (notes) {
      updateData.notes = timer.notes ? `${timer.notes}\n${notes}` : notes;
    }

    const { data: stoppedTimer, error: updateError } = await supabase
      .from('time_entries_live')
      .update(updateData)
      .eq('id', timer.id)
      .select(`
        *,
        project:projects(id, name, color),
        phase:project_phases(id, name)
      `)
      .single();

    if (updateError) throw updateError;

    // Get today's total for the response
    const { data: todayEntries } = await supabase
      .from('time_entries_live')
      .select('duration_minutes')
      .eq('user_id', userId)
      .eq('entry_date', now.toISOString().split('T')[0])
      .not('stopped_at', 'is', null);

    const todayTotal = (todayEntries || []).reduce((sum, e) => sum + e.duration_minutes, 0);

    res.json({
      timer: stoppedTimer,
      duration: {
        minutes: durationMinutes,
        formatted: formatDuration(durationMinutes),
      },
      todayTotal: {
        minutes: todayTotal,
        formatted: formatDuration(todayTotal),
      },
      message: `Logged ${formatDuration(durationMinutes)} to ${(timer.project as any)?.name || 'project'}`,
    });
  } catch (err: any) {
    console.error('Failed to stop timer:', err);
    res.status(500).json({ error: 'Failed to stop timer' });
  }
});

/**
 * Get current running timer
 * GET /api/timer/current?userId=xxx
 */
router.get('/current', async (req, res) => {
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  try {
    const { data: timer, error } = await supabase
      .from('time_entries_live')
      .select(`
        *,
        project:projects(id, name, color),
        phase:project_phases(id, name)
      `)
      .eq('user_id', userId)
      .is('stopped_at', null)
      .eq('entry_type', 'timer')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!timer) {
      return res.json({ running: false, timer: null });
    }

    // Calculate elapsed time
    const elapsed = calculateDurationMinutes(timer.started_at, new Date().toISOString());

    res.json({
      running: true,
      timer: {
        ...timer,
        elapsedMinutes: elapsed,
        elapsedFormatted: formatDuration(elapsed),
      },
    });
  } catch (err: any) {
    console.error('Failed to get current timer:', err);
    res.status(500).json({ error: 'Failed to get current timer' });
  }
});

/**
 * Discard running timer without saving
 * DELETE /api/timer/discard?userId=xxx
 */
router.delete('/discard', async (req, res) => {
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  try {
    // Find and delete the running timer
    const { data: timer, error: findError } = await supabase
      .from('time_entries_live')
      .select('id, project_id')
      .eq('user_id', userId)
      .is('stopped_at', null)
      .eq('entry_type', 'timer')
      .single();

    if (findError || !timer) {
      return res.status(404).json({
        error: 'No running timer to discard',
      });
    }

    const { error: deleteError } = await supabase
      .from('time_entries_live')
      .delete()
      .eq('id', timer.id);

    if (deleteError) throw deleteError;

    res.json({
      discarded: true,
      message: 'Timer discarded',
    });
  } catch (err: any) {
    console.error('Failed to discard timer:', err);
    res.status(500).json({ error: 'Failed to discard timer' });
  }
});

// ============================================================
// MANUAL TIME ENTRY
// ============================================================

/**
 * Create a manual time entry
 * POST /api/timer/entries
 * Body: { userId, projectId, phaseId?, durationMinutes, entryDate?, notes?, source? }
 */
router.post('/entries', async (req, res) => {
  const {
    userId,
    projectId,
    phaseId,
    durationMinutes,
    entryDate,
    notes,
    source = 'web',
  } = req.body;

  if (!userId || !projectId || durationMinutes === undefined) {
    return res.status(400).json({
      error: 'userId, projectId, and durationMinutes are required',
    });
  }

  if (durationMinutes <= 0) {
    return res.status(400).json({ error: 'durationMinutes must be positive' });
  }

  try {
    // Check time tracking is enabled
    const { data: user } = await supabase
      .from('users')
      .select('time_tracking_enabled')
      .eq('id', userId)
      .single();

    if (!user?.time_tracking_enabled) {
      return res.status(403).json({
        error: 'Time tracking is not enabled',
      });
    }

    // Verify project
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, is_active')
      .eq('id', projectId)
      .single();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.is_active) {
      return res.status(400).json({ error: 'Cannot track time on archived project' });
    }

    // Create manual entry
    const { data: entry, error: createError } = await supabase
      .from('time_entries_live')
      .insert({
        user_id: userId,
        project_id: projectId,
        phase_id: phaseId || null,
        entry_type: 'manual',
        started_at: null,
        stopped_at: null,
        duration_minutes: durationMinutes,
        entry_date: entryDate || new Date().toISOString().split('T')[0],
        notes: notes || null,
        source,
      })
      .select(`
        *,
        project:projects(id, name, color),
        phase:project_phases(id, name)
      `)
      .single();

    if (createError) throw createError;

    res.json({
      entry,
      message: `Logged ${formatDuration(durationMinutes)} to ${project.name}`,
    });
  } catch (err: any) {
    console.error('Failed to create time entry:', err);
    res.status(500).json({ error: 'Failed to create time entry' });
  }
});

/**
 * Get time entries
 * GET /api/timer/entries?userId=xxx&startDate=xxx&endDate=xxx&projectId=xxx
 */
router.get('/entries', async (req, res) => {
  const {
    userId,
    startDate,
    endDate,
    projectId,
  } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  try {
    let query = supabase
      .from('time_entries_live')
      .select(`
        *,
        project:projects(id, name, color),
        phase:project_phases(id, name)
      `)
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Only include completed entries (not running timers)
    query = query.or('entry_type.eq.manual,stopped_at.not.is.null');

    if (startDate) {
      query = query.gte('entry_date', startDate);
    }

    if (endDate) {
      query = query.lte('entry_date', endDate);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: entries, error } = await query;

    if (error) throw error;

    res.json({ entries: entries || [] });
  } catch (err: any) {
    console.error('Failed to fetch time entries:', err);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

/**
 * Update a time entry
 * PATCH /api/timer/entries/:id
 * Body: { durationMinutes?, notes?, projectId?, phaseId? }
 */
router.patch('/entries/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const allowedFields = ['duration_minutes', 'notes', 'project_id', 'phase_id', 'entry_date'];
  const filteredUpdates: Record<string, any> = {};

  // Map camelCase to snake_case
  if (updates.durationMinutes !== undefined) filteredUpdates.duration_minutes = updates.durationMinutes;
  if (updates.notes !== undefined) filteredUpdates.notes = updates.notes;
  if (updates.projectId !== undefined) filteredUpdates.project_id = updates.projectId;
  if (updates.phaseId !== undefined) filteredUpdates.phase_id = updates.phaseId;
  if (updates.entryDate !== undefined) filteredUpdates.entry_date = updates.entryDate;

  if (Object.keys(filteredUpdates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const { data: entry, error } = await supabase
      .from('time_entries_live')
      .update(filteredUpdates)
      .eq('id', id)
      .select(`
        *,
        project:projects(id, name, color),
        phase:project_phases(id, name)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Entry not found' });
      }
      throw error;
    }

    res.json({ entry });
  } catch (err: any) {
    console.error('Failed to update time entry:', err);
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

/**
 * Delete a time entry
 * DELETE /api/timer/entries/:id
 */
router.delete('/entries/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('time_entries_live')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ deleted: true });
  } catch (err: any) {
    console.error('Failed to delete time entry:', err);
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

// ============================================================
// SUMMARIES
// ============================================================

/**
 * Get today's time summary
 * GET /api/timer/summary/today?userId=xxx
 */
router.get('/summary/today', async (req, res) => {
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    // Get all completed entries for today
    const { data: entries, error } = await supabase
      .from('time_entries_live')
      .select(`
        *,
        project:projects(id, name, color),
        phase:project_phases(id, name)
      `)
      .eq('user_id', userId)
      .eq('entry_date', today)
      .or('entry_type.eq.manual,stopped_at.not.is.null')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by project
    const byProject: Record<string, { project: any; entries: any[]; totalMinutes: number }> = {};

    for (const entry of entries || []) {
      const projectId = entry.project_id;
      if (!byProject[projectId]) {
        byProject[projectId] = {
          project: entry.project,
          entries: [],
          totalMinutes: 0,
        };
      }
      byProject[projectId].entries.push(entry);
      byProject[projectId].totalMinutes += entry.duration_minutes;
    }

    // Check for running timer
    const { data: runningTimer } = await supabase
      .from('time_entries_live')
      .select(`
        *,
        project:projects(id, name, color)
      `)
      .eq('user_id', userId)
      .is('stopped_at', null)
      .eq('entry_type', 'timer')
      .single();

    const runningElapsed = runningTimer
      ? calculateDurationMinutes(runningTimer.started_at, new Date().toISOString())
      : 0;

    const completedTotal = (entries || []).reduce((sum, e) => sum + e.duration_minutes, 0);
    const grandTotal = completedTotal + runningElapsed;

    res.json({
      date: today,
      byProject: Object.values(byProject).map((p) => ({
        ...p.project,
        totalMinutes: p.totalMinutes,
        totalFormatted: formatDuration(p.totalMinutes),
        entryCount: p.entries.length,
      })),
      runningTimer: runningTimer
        ? {
            ...runningTimer,
            elapsedMinutes: runningElapsed,
            elapsedFormatted: formatDuration(runningElapsed),
          }
        : null,
      totals: {
        completedMinutes: completedTotal,
        completedFormatted: formatDuration(completedTotal),
        runningMinutes: runningElapsed,
        runningFormatted: formatDuration(runningElapsed),
        grandTotalMinutes: grandTotal,
        grandTotalFormatted: formatDuration(grandTotal),
      },
    });
  } catch (err: any) {
    console.error('Failed to get today summary:', err);
    res.status(500).json({ error: 'Failed to get today summary' });
  }
});

/**
 * Get week's time summary with plan vs actual
 * GET /api/timer/summary/week?userId=xxx&weekStart=xxx
 */
router.get('/summary/week', async (req, res) => {
  const userId = req.query.userId as string;
  let weekStart = req.query.weekStart as string;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  // Default to current week
  if (!weekStart) {
    weekStart = getWeekStart(new Date());
  }

  // Calculate week end (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  try {
    // Get tracked time entries for the week
    const { data: entries, error: entriesError } = await supabase
      .from('time_entries_live')
      .select(`
        *,
        project:projects(id, name, color),
        phase:project_phases(id, name)
      `)
      .eq('user_id', userId)
      .gte('entry_date', weekStart)
      .lte('entry_date', weekEndStr)
      .or('entry_type.eq.manual,stopped_at.not.is.null');

    if (entriesError) throw entriesError;

    // Get allocations (planned hours) for the week
    const { data: allocations, error: allocError } = await supabase
      .from('allocations')
      .select(`
        *,
        project:projects(id, name, color)
      `)
      .eq('user_id', userId)
      .eq('week_start', weekStart);

    if (allocError) throw allocError;

    // Build comparison by project
    const projectMap: Record<
      string,
      {
        project: any;
        plannedMinutes: number;
        trackedMinutes: number;
        entries: any[];
      }
    > = {};

    // Add allocations (planned)
    for (const alloc of allocations || []) {
      const projectId = alloc.project_id;
      if (!projectMap[projectId]) {
        projectMap[projectId] = {
          project: alloc.project,
          plannedMinutes: 0,
          trackedMinutes: 0,
          entries: [],
        };
      }
      projectMap[projectId].plannedMinutes += (alloc.planned_hours || 0) * 60;
    }

    // Add tracked time
    for (const entry of entries || []) {
      const projectId = entry.project_id;
      if (!projectMap[projectId]) {
        projectMap[projectId] = {
          project: entry.project,
          plannedMinutes: 0,
          trackedMinutes: 0,
          entries: [],
        };
      }
      projectMap[projectId].trackedMinutes += entry.duration_minutes;
      projectMap[projectId].entries.push(entry);
    }

    // Calculate totals
    const projects = Object.values(projectMap).map((p) => ({
      ...p.project,
      plannedHours: Math.round((p.plannedMinutes / 60) * 100) / 100,
      trackedHours: Math.round((p.trackedMinutes / 60) * 100) / 100,
      varianceHours: Math.round(((p.trackedMinutes - p.plannedMinutes) / 60) * 100) / 100,
      entryCount: p.entries.length,
    }));

    const totalPlanned = projects.reduce((sum, p) => sum + p.plannedHours, 0);
    const totalTracked = projects.reduce((sum, p) => sum + p.trackedHours, 0);

    res.json({
      weekStart,
      weekEnd: weekEndStr,
      projects,
      totals: {
        plannedHours: totalPlanned,
        trackedHours: totalTracked,
        varianceHours: Math.round((totalTracked - totalPlanned) * 100) / 100,
      },
    });
  } catch (err: any) {
    console.error('Failed to get week summary:', err);
    res.status(500).json({ error: 'Failed to get week summary' });
  }
});

// ============================================================
// USER SETTINGS
// ============================================================

/**
 * Get user's time tracking settings
 * GET /api/timer/settings?userId=xxx
 */
router.get('/settings', async (req, res) => {
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, time_tracking_enabled, time_tracking_daily_summary, time_tracking_widget_position')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }

    res.json({
      settings: {
        enabled: user.time_tracking_enabled || false,
        dailySummary: user.time_tracking_daily_summary || false,
        widgetPosition: user.time_tracking_widget_position || 'bottom',
      },
    });
  } catch (err: any) {
    console.error('Failed to get timer settings:', err);
    res.status(500).json({ error: 'Failed to get timer settings' });
  }
});

/**
 * Update user's time tracking settings
 * PATCH /api/timer/settings
 * Body: { userId, enabled?, dailySummary?, widgetPosition? }
 */
router.patch('/settings', async (req, res) => {
  const { userId, enabled, dailySummary, widgetPosition } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const updates: Record<string, any> = {};
  if (enabled !== undefined) updates.time_tracking_enabled = enabled;
  if (dailySummary !== undefined) updates.time_tracking_daily_summary = dailySummary;
  if (widgetPosition !== undefined) updates.time_tracking_widget_position = widgetPosition;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No settings to update' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, time_tracking_enabled, time_tracking_daily_summary, time_tracking_widget_position')
      .single();

    if (error) throw error;

    res.json({
      settings: {
        enabled: user.time_tracking_enabled || false,
        dailySummary: user.time_tracking_daily_summary || false,
        widgetPosition: user.time_tracking_widget_position || 'bottom',
      },
      message: 'Settings updated',
    });
  } catch (err: any) {
    console.error('Failed to update timer settings:', err);
    res.status(500).json({ error: 'Failed to update timer settings' });
  }
});

// ============================================================
// HELPER: Format duration
// ============================================================
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default router;
