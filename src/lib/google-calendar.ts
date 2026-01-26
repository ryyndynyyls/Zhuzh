/**
 * Google Calendar Integration
 * 
 * Handles OAuth flow, token management, and event fetching
 */

import { google, calendar_v3 } from 'googleapis';

// Types
export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole: string;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  status: string;
  attendees?: { email: string; responseStatus: string }[];
  creator?: { email: string };
  organizer?: { email: string };
  colorId?: string;
}

// Create OAuth2 client
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate OAuth URL for user to authorize
 * Uses login_hint to pre-select their account (from Slack email)
 */
export function getAuthUrl(userEmail: string, state: string): string {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    prompt: 'consent', // Force consent to ensure refresh token
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
    ],
    login_hint: userEmail, // Pre-select their Google account
    state, // For CSRF protection and user identification
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get tokens from Google');
  }
  
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  return {
    access_token: credentials.access_token!,
    refresh_token: refreshToken, // Keep the same refresh token
    expiry_date: credentials.expiry_date || Date.now() + 3600 * 1000,
  };
}

/**
 * Get authenticated Calendar API client
 */
function getCalendarClient(tokens: GoogleTokens): calendar_v3.Calendar {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * List all calendars the user has access to
 */
export async function listCalendars(tokens: GoogleTokens): Promise<CalendarInfo[]> {
  const calendar = getCalendarClient(tokens);
  
  const response = await calendar.calendarList.list();
  const items = response.data.items || [];
  
  return items.map(cal => ({
    id: cal.id!,
    summary: cal.summary || 'Unnamed Calendar',
    description: cal.description || undefined,
    primary: cal.primary || false,
    backgroundColor: cal.backgroundColor || undefined,
    accessRole: cal.accessRole || 'reader',
  }));
}

/**
 * Fetch events from a specific calendar within a date range
 */
export async function getCalendarEvents(
  tokens: GoogleTokens,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient(tokens);
  
  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true, // Expand recurring events
    orderBy: 'startTime',
    maxResults: 250,
  });
  
  const items = response.data.items || [];
  
  return items.map(event => {
    const isAllDay = !event.start?.dateTime;
    const start = isAllDay 
      ? new Date(event.start?.date + 'T00:00:00')
      : new Date(event.start?.dateTime!);
    const end = isAllDay
      ? new Date(event.end?.date + 'T00:00:00')
      : new Date(event.end?.dateTime!);
    
    return {
      id: event.id!,
      calendarId,
      summary: event.summary || '(No title)',
      description: event.description || undefined,
      start,
      end,
      isAllDay,
      status: event.status || 'confirmed',
      attendees: event.attendees?.map(a => ({
        email: a.email!,
        responseStatus: a.responseStatus || 'needsAction',
      })),
      creator: event.creator?.email ? { email: event.creator.email } : undefined,
      organizer: event.organizer?.email ? { email: event.organizer.email } : undefined,
      colorId: event.colorId || undefined,
    };
  });
}

/**
 * Fetch events from multiple calendars
 */
export async function getEventsFromCalendars(
  tokens: GoogleTokens,
  calendarIds: string[],
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const allEvents: CalendarEvent[] = [];
  
  for (const calendarId of calendarIds) {
    try {
      const events = await getCalendarEvents(tokens, calendarId, timeMin, timeMax);
      allEvents.push(...events);
    } catch (error) {
      console.warn(`Failed to fetch events from calendar ${calendarId}:`, error);
      // Continue with other calendars
    }
  }
  
  // Sort by start time
  return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Check if tokens need refresh (within 5 minutes of expiry)
 */
export function tokensNeedRefresh(expiryDate: number): boolean {
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  return Date.now() > (expiryDate - bufferMs);
}

/**
 * Get tokens, refreshing if necessary
 */
export async function getValidTokens(
  accessToken: string,
  refreshToken: string,
  expiryDate: number
): Promise<{ tokens: GoogleTokens; wasRefreshed: boolean }> {
  if (!tokensNeedRefresh(expiryDate)) {
    return {
      tokens: { access_token: accessToken, refresh_token: refreshToken, expiry_date: expiryDate },
      wasRefreshed: false,
    };
  }
  
  const newTokens = await refreshAccessToken(refreshToken);
  return { tokens: newTokens, wasRefreshed: true };
}
