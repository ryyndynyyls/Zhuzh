"use strict";
/**
 * Google Calendar Integration
 *
 * Handles OAuth flow, token management, and event fetching
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthUrl = getAuthUrl;
exports.exchangeCodeForTokens = exchangeCodeForTokens;
exports.refreshAccessToken = refreshAccessToken;
exports.listCalendars = listCalendars;
exports.getCalendarEvents = getCalendarEvents;
exports.getEventsFromCalendars = getEventsFromCalendars;
exports.tokensNeedRefresh = tokensNeedRefresh;
exports.getValidTokens = getValidTokens;
const googleapis_1 = require("googleapis");
// Create OAuth2 client
function getOAuth2Client() {
    return new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
}
/**
 * Generate OAuth URL for user to authorize
 * Uses login_hint to pre-select their account (from Slack email)
 */
function getAuthUrl(userEmail, state) {
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
async function exchangeCodeForTokens(code) {
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
async function refreshAccessToken(refreshToken) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    return {
        access_token: credentials.access_token,
        refresh_token: refreshToken, // Keep the same refresh token
        expiry_date: credentials.expiry_date || Date.now() + 3600 * 1000,
    };
}
/**
 * Get authenticated Calendar API client
 */
function getCalendarClient(tokens) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
    });
    return googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
}
/**
 * List all calendars the user has access to
 */
async function listCalendars(tokens) {
    const calendar = getCalendarClient(tokens);
    const response = await calendar.calendarList.list();
    const items = response.data.items || [];
    return items.map(cal => ({
        id: cal.id,
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
async function getCalendarEvents(tokens, calendarId, timeMin, timeMax) {
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
            : new Date(event.start?.dateTime);
        const end = isAllDay
            ? new Date(event.end?.date + 'T00:00:00')
            : new Date(event.end?.dateTime);
        return {
            id: event.id,
            calendarId,
            summary: event.summary || '(No title)',
            description: event.description || undefined,
            start,
            end,
            isAllDay,
            status: event.status || 'confirmed',
            attendees: event.attendees?.map(a => ({
                email: a.email,
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
async function getEventsFromCalendars(tokens, calendarIds, timeMin, timeMax) {
    const allEvents = [];
    for (const calendarId of calendarIds) {
        try {
            const events = await getCalendarEvents(tokens, calendarId, timeMin, timeMax);
            allEvents.push(...events);
        }
        catch (error) {
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
function tokensNeedRefresh(expiryDate) {
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    return Date.now() > (expiryDate - bufferMs);
}
/**
 * Get tokens, refreshing if necessary
 */
async function getValidTokens(accessToken, refreshToken, expiryDate) {
    if (!tokensNeedRefresh(expiryDate)) {
        return {
            tokens: { access_token: accessToken, refresh_token: refreshToken, expiry_date: expiryDate },
            wasRefreshed: false,
        };
    }
    const newTokens = await refreshAccessToken(refreshToken);
    return { tokens: newTokens, wasRefreshed: true };
}
