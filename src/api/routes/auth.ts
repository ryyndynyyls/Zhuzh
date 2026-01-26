/**
 * Auth Routes - Google OAuth
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';
import * as googleCalendar from '../../lib/google-calendar';

const router = Router();

/**
 * Initiate Google OAuth flow
 * GET /api/auth/google?userId=xxx
 */
router.get('/google', async (req, res) => {
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Get user's email for login_hint
  const { data: user, error } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Generate state token (userId + timestamp for CSRF protection)
  const state = Buffer.from(JSON.stringify({
    userId,
    timestamp: Date.now()
  })).toString('base64');

  const authUrl = googleCalendar.getAuthUrl(user.email, state);

  res.json({ authUrl });
});

/**
 * Google OAuth callback
 * GET /api/auth/google/callback?code=xxx&state=xxx
 */
router.get('/google/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    console.error('Google OAuth error:', oauthError);
    return res.redirect('http://localhost:3001/settings?error=google_oauth_denied');
  }

  if (!code || !state) {
    return res.redirect('http://localhost:3001/settings?error=missing_params');
  }

  try {
    // Decode state
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const { userId, timestamp } = stateData;

    // Check state is not too old (10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      return res.redirect('http://localhost:3001/settings?error=state_expired');
    }

    // Exchange code for tokens
    const tokens = await googleCalendar.exchangeCodeForTokens(code as string);

    // Get list of calendars
    const calendars = await googleCalendar.listCalendars(tokens);
    const primaryCalendar = calendars.find(c => c.primary);

    // Store tokens in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        google_calendar_connected: true,
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expiry: new Date(tokens.expiry_date).toISOString(),
        google_calendar_id: primaryCalendar?.id,
        calendar_connected_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to store tokens:', updateError);
      return res.redirect('http://localhost:3001/settings?error=storage_failed');
    }

    console.log(`✅ Google Calendar connected for user ${userId}`);
    console.log(`   Found ${calendars.length} calendars`);

    res.redirect('http://localhost:3001/settings?calendar=connected');

  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.redirect('http://localhost:3001/settings?error=callback_failed');
  }
});

/**
 * Disconnect Google Calendar
 * POST /api/auth/google/disconnect
 * Body: { userId: string }
 */
router.post('/google/disconnect', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const { error } = await supabase
    .from('users')
    .update({
      google_calendar_connected: false,
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
      google_calendar_id: null,
      calendar_connected_at: null,
    })
    .eq('id', userId);

  if (error) {
    return res.status(500).json({ error: 'Failed to disconnect' });
  }

  res.json({ success: true });
});

export default router;
