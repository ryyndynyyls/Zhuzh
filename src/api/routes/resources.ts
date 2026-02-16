/**
 * Resources Routes - Resource calendar combined data endpoint
 * Returns users, allocations, PTO, and calendar events in one call
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Get combined resource calendar data
 * GET /api/resources/calendar-data?orgId=xxx&startDate=xxx&endDate=xxx
 *
 * Returns { users, allocations, ptoEntries } in one response
 */
router.get('/calendar-data', async (req, res) => {
  const { orgId, startDate, endDate } = req.query;

  if (!orgId || !startDate || !endDate) {
    return res.status(400).json({ error: 'orgId, startDate, and endDate are required' });
  }

  try {
    // Fetch users in the org (employees, PMs, admins)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, role, email, discipline, avatar_url, resource_config')
      .eq('org_id', orgId as string)
      .eq('is_active', true)
      .in('role', ['employee', 'pm', 'admin'])
      .order('name');

    if (usersError) throw usersError;

    const userIds = (usersData || []).map((u: any) => u.id);

    if (userIds.length === 0) {
      return res.json({ users: [], allocations: [], ptoEntries: [] });
    }

    // Fetch allocations, PTO, and calendar events in parallel
    const [allocResult, ptoResult, calendarResult] = await Promise.all([
      // Allocations overlapping the date range
      supabase
        .from('allocations')
        .select(`
          id, user_id, project_id, phase_id, start_date, end_date,
          week_start, planned_hours, is_billable, notes,
          project:projects(id, name, color),
          phase:project_phases(id, name)
        `)
        .lte('start_date', endDate as string)
        .gte('end_date', startDate as string)
        .in('user_id', userIds),

      // PTO entries
      supabase
        .from('pto_entries')
        .select('id, date, hours, type, notes, user_id')
        .gte('date', startDate as string)
        .lte('date', endDate as string)
        .in('user_id', userIds),

      // Calendar events (Google Calendar OOO, PTO, etc.)
      supabase
        .from('user_calendar_events')
        .select('id, user_id, summary, start_time, end_time, is_all_day, event_type')
        .gte('start_time', startDate as string)
        .lte('start_time', (endDate as string) + 'T23:59:59')
        .in('user_id', userIds)
        .in('event_type', ['pto', 'holiday', 'partial_pto', 'friday_off']),
    ]);

    if (allocResult.error) throw allocResult.error;

    // Warn but don't fail on PTO/calendar errors
    if (ptoResult.error) console.warn('Failed to fetch PTO entries:', ptoResult.error);
    if (calendarResult.error) console.warn('Failed to fetch calendar events:', calendarResult.error);

    // Transform PTO entries
    const ptoEntries = (ptoResult.data || []).map((p: any) => ({
      id: p.id,
      date: p.date,
      hours: p.hours,
      type: p.type,
      notes: p.notes,
      userId: p.user_id,
    }));

    // Transform calendar events into PTO-like entries
    const typeMap: Record<string, string> = {
      'pto': 'pto',
      'holiday': 'holiday',
      'partial_pto': 'half-day',
      'friday_off': 'pto',
    };

    const calendarPto = (calendarResult.data || []).map((e: any) => {
      const startDateStr = e.start_time.split('T')[0];
      const hours = e.is_all_day ? 8 : Math.min(8,
        (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / (1000 * 60 * 60)
      );

      return {
        id: e.id,
        date: startDateStr,
        hours,
        type: typeMap[e.event_type] || 'pto',
        notes: e.summary || null,
        userId: e.user_id,
      };
    });

    // Merge PTO entries and calendar events, avoiding duplicates
    const existingKeys = new Set(ptoEntries.map((p: any) => `${p.userId}-${p.date}`));
    const mergedPto = [
      ...ptoEntries,
      ...calendarPto.filter((c: any) => !existingKeys.has(`${c.userId}-${c.date}`)),
    ];

    res.json({
      users: usersData || [],
      allocations: allocResult.data || [],
      ptoEntries: mergedPto,
    });
  } catch (err: any) {
    console.error('Failed to fetch resource calendar data:', err);
    res.status(500).json({ error: 'Failed to fetch resource calendar data' });
  }
});

export default router;
