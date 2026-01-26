/**
 * Calendar Routes - Events, Config, Team PTO
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { classifyEventForPto } from '../lib/pto-classifier';
import * as googleCalendar from '../../lib/google-calendar';
import * as gemini from '../../lib/gemini';

const router = Router();

/**
 * Get user's calendars
 * GET /api/calendar/list?userId=xxx
 */
router.get('/list', async (req, res) => {
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Get user's tokens
  const { data: user, error } = await supabase
    .from('users')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', userId)
    .single();

  if (error || !user?.google_access_token) {
    return res.status(404).json({ error: 'Calendar not connected' });
  }

  try {
    // Get valid tokens (refresh if needed)
    const { tokens, wasRefreshed } = await googleCalendar.getValidTokens(
      user.google_access_token,
      user.google_refresh_token || '',
      user.google_token_expiry ? new Date(user.google_token_expiry).getTime() : 0
    );

    // Update tokens if refreshed
    if (wasRefreshed) {
      await supabase.from('users').update({
        google_access_token: tokens.access_token,
        google_token_expiry: new Date(tokens.expiry_date).toISOString(),
      }).eq('id', userId);
    }

    const calendars = await googleCalendar.listCalendars(tokens);
    res.json({ calendars });

  } catch (err) {
    console.error('Failed to list calendars:', err);
    res.status(500).json({ error: 'Failed to fetch calendars' });
  }
});

/**
 * Get events for a date range
 * GET /api/calendar/events?userId=xxx&start=2026-01-12&end=2026-01-18
 */
router.get('/events', async (req, res) => {
  const { userId, start, end, calendarIds } = req.query;

  if (!userId || !start || !end) {
    return res.status(400).json({ error: 'userId, start, and end are required' });
  }

  // Get user's tokens
  const { data: user, error } = await supabase
    .from('users')
    .select('google_access_token, google_refresh_token, google_token_expiry, google_calendar_id')
    .eq('id', userId as string)
    .single();

  if (error || !user?.google_access_token) {
    return res.status(404).json({ error: 'Calendar not connected' });
  }

  try {
    const { tokens, wasRefreshed } = await googleCalendar.getValidTokens(
      user.google_access_token,
      user.google_refresh_token || '',
      user.google_token_expiry ? new Date(user.google_token_expiry).getTime() : 0
    );

    if (wasRefreshed) {
      await supabase.from('users').update({
        google_access_token: tokens.access_token,
        google_token_expiry: new Date(tokens.expiry_date).toISOString(),
      }).eq('id', userId as string);
    }

    // Parse calendar IDs or use primary
    const calendarsToFetch = calendarIds
      ? (calendarIds as string).split(',')
      : [user.google_calendar_id || 'primary'];

    const events = await googleCalendar.getEventsFromCalendars(
      tokens,
      calendarsToFetch,
      new Date(start as string),
      new Date(end as string)
    );

    res.json({ events });

  } catch (err) {
    console.error('Failed to fetch events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * Analyze calendar screenshot
 * POST /api/calendar/analyze-screenshot
 * Body: { imageBase64: string, mimeType?: string }
 */
router.post('/analyze-screenshot', async (req, res) => {
  const { imageBase64, mimeType = 'image/png' } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  try {
    const analysis = await gemini.analyzeCalendarScreenshot(imageBase64, mimeType);
    res.json({ analysis });
  } catch (err) {
    console.error('Screenshot analysis failed:', err);
    res.status(500).json({ error: 'Failed to analyze screenshot' });
  }
});

/**
 * Generate calendar config from description
 * POST /api/calendar/generate-config
 * Body: { orgId: string, adminDescription: string, screenshotAnalysis?: object }
 */
router.post('/generate-config', async (req, res) => {
  const { orgId, adminDescription, screenshotAnalysis, userId } = req.body;

  console.log('Generate config request:', { orgId, descLength: adminDescription?.length, hasScreenshot: !!screenshotAnalysis });

  if (!orgId || !adminDescription) {
    return res.status(400).json({ error: 'orgId and adminDescription are required' });
  }

  // Check Gemini API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set!');
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }
  console.log('GEMINI_API_KEY found');

  try {
    console.log('Calling Gemini...');
    const config = await gemini.generateCalendarConfig(adminDescription, screenshotAnalysis);
    console.log('Gemini returned config with confidence:', config.confidence_score);

    // Store in database (created_by is optional for test scenarios)
    const upsertData: Record<string, unknown> = {
      org_id: orgId,
      pto_detection: config.pto_detection,
      holiday_detection: config.holiday_detection,
      partial_day_detection: config.partial_day_detection,
      recurring_schedules: config.recurring_schedules,
      shared_calendars: config.shared_calendars,
      confidence_score: config.confidence_score,
      clarification_questions: config.clarification_questions,
      needs_clarification: config.clarification_questions.length > 0,
      admin_description: adminDescription,
      updated_at: new Date().toISOString(),
    };

    // Only add created_by if userId looks like a real UUID (not a test one)
    if (userId && !userId.startsWith('00000000-0000-0000-0000-')) {
      upsertData.created_by = userId;
    }

    const { data, error } = await supabase
      .from('org_calendar_config')
      .upsert(upsertData as any, { onConflict: 'org_id' })
      .select()
      .single();

    if (error) {
      console.error('Failed to save config:', error);
      return res.status(500).json({ error: 'Failed to save configuration' });
    }

    res.json({ config: data });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Config generation failed:', errorMessage);
    res.status(500).json({ error: `Failed to generate configuration: ${errorMessage}` });
  }
});

/**
 * Get org's calendar config
 * GET /api/calendar/config?orgId=xxx
 */
router.get('/config', async (req, res) => {
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return res.status(400).json({ error: 'orgId is required' });
  }

  const { data, error } = await supabase
    .from('org_calendar_config')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.json({ config: null }); // No config yet
    }
    return res.status(500).json({ error: 'Failed to fetch config' });
  }

  res.json({ config: data });
});

/**
 * Get team PTO/OOO status for a date range
 * GET /api/calendar/team-pto?orgId=xxx&start=2026-01-15&end=2026-01-22
 */
router.get('/team-pto', async (req, res) => {
  const { orgId, start, end } = req.query;

  if (!orgId || !start || !end) {
    return res.status(400).json({ error: 'orgId, start, and end are required' });
  }

  try {
    // Get all users with connected calendars in this org
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, google_access_token, google_refresh_token, google_token_expiry, google_calendar_id')
      .eq('org_id', orgId as string)
      .eq('google_calendar_connected', true);

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Get org calendar config for classification rules
    const { data: config } = await supabase
      .from('org_calendar_config')
      .select('*')
      .eq('org_id', orgId as string)
      .single();

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    const teamPto: Array<{
      userId: string;
      userName: string;
      date: string;
      type: 'pto' | 'holiday' | 'partial_pto' | 'friday_off';
      summary: string;
      isAllDay: boolean;
    }> = [];

    // Fetch and classify events for each user
    for (const user of users || []) {
      if (!user.google_access_token) continue;

      try {
        // Get valid tokens (refresh if needed)
        const { tokens, wasRefreshed } = await googleCalendar.getValidTokens(
          user.google_access_token,
          user.google_refresh_token || '',
          user.google_token_expiry ? new Date(user.google_token_expiry).getTime() : 0
        );

        // Update tokens if refreshed
        if (wasRefreshed) {
          await supabase.from('users').update({
            google_access_token: tokens.access_token,
            google_token_expiry: new Date(tokens.expiry_date).toISOString(),
          }).eq('id', user.id);
        }

        // Get events from their primary calendar
        const events = await googleCalendar.getCalendarEvents(
          tokens,
          user.google_calendar_id || 'primary',
          startDate,
          endDate
        );

        // Classify each event
        for (const event of events) {
          const classification = classifyEventForPto(event, config);

          if (classification.type !== 'none') {
            teamPto.push({
              userId: user.id,
              userName: user.name,
              date: event.start.toISOString().split('T')[0],
              type: classification.type as 'pto' | 'holiday' | 'partial_pto' | 'friday_off',
              summary: event.summary,
              isAllDay: event.isAllDay,
            });
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch calendar for user ${user.name}:`, err);
        // Continue with other users
      }
    }

    // Sort by date, then by user
    teamPto.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.userName.localeCompare(b.userName);
    });

    res.json({ teamPto });

  } catch (err) {
    console.error('Team PTO fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch team PTO' });
  }
});

/**
 * Detect PTO overlaps for coverage risks
 * GET /api/calendar/pto-overlap?orgId=xxx&start=2026-01-15&end=2026-01-31
 */
router.get('/pto-overlap', async (req, res) => {
  const { orgId, start, end } = req.query;

  if (!orgId || !start || !end) {
    return res.status(400).json({ error: 'orgId, start, and end are required' });
  }

  try {
    const startDate = new Date(start as string);
    const endDate = new Date(end as string);

    // Get all users with connected calendars in this org
    const { data: users } = await supabase
      .from('users')
      .select('id, name, role, google_access_token, google_refresh_token, google_token_expiry, google_calendar_id')
      .eq('org_id', orgId as string);

    // Get org calendar config
    const { data: config } = await supabase
      .from('org_calendar_config')
      .select('*')
      .eq('org_id', orgId as string)
      .single();

    // Collect PTO data
    const teamPto: Array<{ userId: string; userName: string; role: string; date: string; type: string }> = [];

    for (const user of users || []) {
      if (!user.google_access_token) continue;

      try {
        const { tokens, wasRefreshed } = await googleCalendar.getValidTokens(
          user.google_access_token,
          user.google_refresh_token || '',
          user.google_token_expiry ? new Date(user.google_token_expiry).getTime() : 0
        );

        if (wasRefreshed) {
          await supabase.from('users').update({
            google_access_token: tokens.access_token,
            google_token_expiry: new Date(tokens.expiry_date).toISOString(),
          }).eq('id', user.id);
        }

        const events = await googleCalendar.getCalendarEvents(
          tokens,
          user.google_calendar_id || 'primary',
          startDate,
          endDate
        );

        for (const event of events) {
          const classification = classifyEventForPto(event, config);
          if (classification.type !== 'none') {
            teamPto.push({
              userId: user.id,
              userName: user.name,
              role: user.role,
              date: event.start.toISOString().split('T')[0],
              type: classification.type,
            });
          }
        }
      } catch (err) {
        // Continue with other users
      }
    }

    // Group PTO by date
    const ptoByDate: Record<string, Array<{ userId: string; userName: string; role: string; type: string }>> = {};
    for (const entry of teamPto) {
      if (!ptoByDate[entry.date]) ptoByDate[entry.date] = [];
      ptoByDate[entry.date].push(entry);
    }

    // Count total people per role
    const roleCounts: Record<string, number> = {};
    for (const user of users || []) {
      roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
    }

    // Detect overlaps
    const overlaps: Array<{
      date: string;
      role: string;
      peopleOut: string[];
      totalInRole: number;
      percentageOut: number;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    for (const [date, entries] of Object.entries(ptoByDate)) {
      const outByRole: Record<string, string[]> = {};
      for (const entry of entries) {
        if (!outByRole[entry.role]) outByRole[entry.role] = [];
        outByRole[entry.role].push(entry.userName);
      }

      for (const [role, peopleOut] of Object.entries(outByRole)) {
        const totalInRole = roleCounts[role] || 1;
        const percentageOut = (peopleOut.length / totalInRole) * 100;

        if (peopleOut.length > 1 || percentageOut >= 50) {
          let severity: 'low' | 'medium' | 'high' = 'low';
          if (percentageOut >= 75) severity = 'high';
          else if (percentageOut >= 50 || peopleOut.length >= 3) severity = 'medium';

          overlaps.push({
            date,
            role,
            peopleOut,
            totalInRole,
            percentageOut: Math.round(percentageOut),
            severity,
          });
        }
      }
    }

    overlaps.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    res.json({
      overlaps,
      summary: {
        totalDaysWithOverlap: new Set(overlaps.map(o => o.date)).size,
        highSeverityCount: overlaps.filter(o => o.severity === 'high').length,
        mediumSeverityCount: overlaps.filter(o => o.severity === 'medium').length,
      },
    });

  } catch (err) {
    console.error('PTO overlap detection error:', err);
    res.status(500).json({ error: 'Failed to detect PTO overlaps' });
  }
});

export default router;
