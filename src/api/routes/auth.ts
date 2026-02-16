/**
 * Auth Routes - Google OAuth
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';
import * as googleCalendar from '../../lib/google-calendar';

const router = Router();

// Get base URL for redirects (production or local)
const getAppUrl = () => process.env.APP_URL || 'http://localhost:3001';

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
    return res.redirect(`${getAppUrl()}/settings?error=google_oauth_denied`);
  }

  if (!code || !state) {
    return res.redirect(`${getAppUrl()}/settings?error=missing_params`);
  }

  try {
    // Decode state
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const { userId, timestamp } = stateData;

    // Check state is not too old (10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      return res.redirect(`${getAppUrl()}/settings?error=state_expired`);
    }

    // Get the user's expected email from our database
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError || !dbUser) {
      return res.redirect(`${getAppUrl()}/settings?error=user_not_found`);
    }

    // Exchange code for tokens
    const tokens = await googleCalendar.exchangeCodeForTokens(code as string);

    // Verify the Google account matches the user's registered email
    const { google } = await import('googleapis');
    const oauth2 = google.oauth2({ version: 'v2', auth: undefined });
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: tokens.access_token });
    const userInfo = await google.oauth2({ version: 'v2', auth: oauth2Client }).userinfo.get();
    const googleEmail = userInfo.data.email?.toLowerCase();
    const expectedEmail = dbUser.email.toLowerCase();

    if (googleEmail !== expectedEmail) {
      console.warn(`❌ Google account mismatch: got ${googleEmail}, expected ${expectedEmail}`);
      return res.redirect(
        `${getAppUrl()}/settings?error=email_mismatch&expected=${encodeURIComponent(expectedEmail)}`
      );
    }

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
      return res.redirect(`${getAppUrl()}/settings?error=storage_failed`);
    }

    console.log(`✅ Google Calendar connected for user ${userId}`);
    console.log(`   Found ${calendars.length} calendars`);

    res.redirect(`${getAppUrl()}/settings?calendar=connected`);

  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.redirect(`${getAppUrl()}/settings?error=callback_failed`);
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
