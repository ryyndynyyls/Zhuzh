/**
 * Calendar Sync API Endpoints
 *
 * Provides endpoints for:
 * - Triggering calendar sync
 * - Getting who's out data
 * - Syncing Friday Off attendees
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  syncUserCalendar,
  syncOrgCalendars,
  detectFridayOffAttendees,
  getWhosOut,
  getWhosOutWeek,
  isUserOut,
} from '../../lib/calendar-sync';

const router = Router();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =============================================================================
// Calendar Sync Endpoints
// =============================================================================

/**
 * POST /api/calendar/sync
 * Trigger calendar sync for a user or all users (admin)
 * Body: { userId?: string, orgId?: string, startDate?: string, endDate?: string }
 */
router.post('/sync', async (req, res) => {
  const { userId, orgId, startDate, endDate } = req.body;

  // Default to next 2 weeks if no dates provided
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  try {
    if (userId) {
      // Sync single user
      const result = await syncUserCalendar(userId, start, end);
      return res.json({
        success: result.errors.length === 0,
        result,
      });
    }

    if (orgId) {
      // Sync all users in org
      const result = await syncOrgCalendars(orgId, start, end);
      return res.json(result);
    }

    return res.status(400).json({
      error: 'Either userId or orgId is required',
    });
  } catch (err: any) {
    console.error('Calendar sync error:', err);
    return res.status(500).json({
      error: 'Failed to sync calendars',
      message: err.message,
    });
  }
});

/**
 * POST /api/calendar/sync-friday-off
 * Detect and sync Friday Off attendees for a specific Friday
 * Body: { orgId: string, friday: string }
 */
router.post('/sync-friday-off', async (req, res) => {
  const { orgId, friday } = req.body;

  if (!orgId || !friday) {
    return res.status(400).json({
      error: 'orgId and friday are required',
    });
  }

  try {
    const result = await detectFridayOffAttendees(orgId, new Date(friday));
    return res.json({
      success: true,
      eventFound: result.eventFound,
      usersCount: result.users.length,
      users: result.users,
    });
  } catch (err: any) {
    console.error('Friday Off sync error:', err);
    return res.status(500).json({
      error: 'Failed to sync Friday Off attendees',
      message: err.message,
    });
  }
});

// =============================================================================
// Who's Out Query Endpoints
// =============================================================================

/**
 * GET /api/calendar/whos-out?orgId=xxx&date=2026-01-16
 * Get who's out on a specific date (from synced data)
 */
router.get('/whos-out', async (req, res) => {
  const { orgId, date } = req.query;

  if (!orgId || !date) {
    return res.status(400).json({
      error: 'orgId and date are required',
    });
  }

  try {
    const users = await getWhosOut(orgId as string, new Date(date as string));
    return res.json({
      date,
      users,
      count: users.length,
    });
  } catch (err: any) {
    console.error('Who\'s out query error:', err);
    return res.status(500).json({
      error: 'Failed to fetch who\'s out',
      message: err.message,
    });
  }
});

/**
 * GET /api/calendar/whos-out/week?orgId=xxx&weekStart=2026-01-12
 * Get who's out for each day of a week (from synced data)
 */
router.get('/whos-out/week', async (req, res) => {
  const { orgId, weekStart } = req.query;

  if (!orgId || !weekStart) {
    return res.status(400).json({
      error: 'orgId and weekStart are required',
    });
  }

  try {
    const days = await getWhosOutWeek(orgId as string, new Date(weekStart as string));
    return res.json({
      weekStart,
      days,
    });
  } catch (err: any) {
    console.error('Who\'s out week query error:', err);
    return res.status(500).json({
      error: 'Failed to fetch week data',
      message: err.message,
    });
  }
});

/**
 * GET /api/calendar/user-status?userId=xxx&date=2026-01-16
 * Check if a specific user is out on a date
 */
router.get('/user-status', async (req, res) => {
  const { userId, date } = req.query;

  if (!userId || !date) {
    return res.status(400).json({
      error: 'userId and date are required',
    });
  }

  try {
    const status = await isUserOut(userId as string, new Date(date as string));
    return res.json(status);
  } catch (err: any) {
    console.error('User status query error:', err);
    return res.status(500).json({
      error: 'Failed to check user status',
      message: err.message,
    });
  }
});

// =============================================================================
// Sync Status Endpoint
// =============================================================================

/**
 * GET /api/calendar/sync-status?orgId=xxx
 * Get sync status for an organization
 */
router.get('/sync-status', async (req, res) => {
  const { orgId } = req.query;

  if (!orgId) {
    return res.status(400).json({
      error: 'orgId is required',
    });
  }

  try {
    // Get users with calendar connected
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, google_calendar_connected, calendar_connected_at')
      .eq('org_id', orgId)
      .eq('is_active', true);

    if (usersError) throw usersError;

    // Get count of synced events
    const { count: eventCount } = await supabase
      .from('user_calendar_events')
      .select('id', { count: 'exact', head: true })
      .in('user_id', users?.map(u => u.id) || []);

    // Get most recent sync (from events)
    const { data: recentEvent } = await supabase
      .from('user_calendar_events')
      .select('created_at')
      .in('user_id', users?.map(u => u.id) || [])
      .order('created_at', { ascending: false })
      .limit(1);

    const connectedUsers = users?.filter(u => u.google_calendar_connected) || [];

    return res.json({
      orgId,
      totalUsers: users?.length || 0,
      connectedUsers: connectedUsers.length,
      usersWithCalendar: connectedUsers.map(u => ({
        id: u.id,
        name: u.name,
        connectedAt: u.calendar_connected_at,
      })),
      syncedEventCount: eventCount || 0,
      lastSyncedAt: recentEvent?.[0]?.created_at || null,
    });
  } catch (err: any) {
    console.error('Sync status error:', err);
    return res.status(500).json({
      error: 'Failed to get sync status',
      message: err.message,
    });
  }
});

export default router;
