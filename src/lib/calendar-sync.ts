/**
 * Calendar Sync Service v2
 *
 * Key insight: The shared "Office/Home" calendar contains EVERYONE's PTO.
 * We only need ONE synced user to get company-wide visibility.
 *
 * Event patterns to parse:
 * - "Cindy OOO" → Cindy is out
 * - "Jacob OOO - LA" → Jacob is out (with location)
 * - "UA5 Office Closed: MLK Jr. Day" → Everyone is out (holiday)
 * - "Fridays off 1/23" → Attendees are on alternating Friday schedule
 */

import { createClient } from '@supabase/supabase-js';
import {
  CalendarEvent,
  getCalendarEvents,
  getValidTokens,
  listCalendars,
} from './google-calendar';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =============================================================================
// Types
// =============================================================================

export type EventType = 'pto' | 'holiday' | 'friday_off' | 'meeting' | null;

export interface OrgCalendarConfig {
  pto_detection: {
    title_patterns: string[];
    all_day_events: boolean;
    calendar_names: string[];
  };
  recurring_schedules: Array<{
    name: string;
    type: string;
    day_of_week: number;
    detection: {
      method: string;
      event_title_contains: string;
    };
  }>;
}

export interface SyncResult {
  userId: string;
  userName: string;
  eventsProcessed: number;
  eventsSynced: number;
  userEventsDetected: number;
  errors: string[];
}

export interface UserCalendarEvent {
  user_id: string;
  event_type: EventType;
  summary: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  calendar_event_id: string;
}

// =============================================================================
// Default Config (UA5 patterns)
// =============================================================================

const DEFAULT_CONFIG: OrgCalendarConfig = {
  pto_detection: {
    title_patterns: ['OOO', 'PTO', 'Vacation', 'Out of Office', 'Time Off', 'Day Off', 'Days Off', 'Taking Off'],
    all_day_events: true,
    calendar_names: ['PTO', 'Time Off', 'Home', 'Office']
  },
  recurring_schedules: [
    {
      name: 'Fridays Off',
      type: 'alternating_day_off',
      day_of_week: 5,
      detection: {
        method: 'calendar_invite',
        event_title_contains: 'Fridays off'
      }
    }
  ]
};

// Holiday patterns (checked BEFORE PTO)
const HOLIDAY_PATTERNS = [
  'office closed',
  'company closed',
  'company holiday',
  'holiday',
  'mlk',
  'martin luther king',
  'memorial day',
  'independence day',
  'labor day',
  'thanksgiving',
  'christmas',
  'new year',
  'presidents day',
  'juneteenth',
  'veterans day'
];

// =============================================================================
// Name Matching
// =============================================================================

// Name aliases for fuzzy matching (calendar name → database first name)
const NAME_ALIASES: Record<string, string> = {
  // Nicknames
  'kate': 'kathryn',
  'fred': 'frédéric',
  'frederic': 'frédéric',
  // Handle "Ryan G" vs "Ryan D" disambiguation (two Ryans!)
  'ryan g': 'ryan gordon',
  'ryan g.': 'ryan gordon', 
  'ryan d': 'ryan daniels',
  'ryan d.': 'ryan daniels',
  // Full name variations
  'troy curtis zaretsky-kreiner': 'troy kreiner',
  'troy zaretsky-kreiner': 'troy kreiner',
};

/**
 * Extract person name from event title
 * Only for PTO-style events on shared calendars:
 * "Cindy OOO" → "Cindy"
 * "Jacob OOO - LA" → "Jacob"
 * "Ryan G. PTO" → "Ryan G."
 * 
 * Note: Personal events like "Ryan Drops Off Car" are NOT extracted here.
 * Those are handled by smart-timing for personal block avoidance.
 */
function extractNameFromTitle(title: string): string | null {
  // Pattern: "Name OOO" or "Name OOO - Location" (with optional middle initial/letter)
  const oooMatch = title.match(/^([A-Za-zÀ-ÖØ-öø-ÿ]+(?:\s+[A-Z]\.?)?(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ-]+)?)\s+OOO/i);
  if (oooMatch) return oooMatch[1].trim();

  // Pattern: "Name PTO" or "Name Vacation" or "Name Out"
  const ptoMatch = title.match(/^([A-Za-zÀ-ÖØ-öø-ÿ]+(?:\s+[A-Z]\.?)?(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ-]+)?)\s+(?:PTO|Vacation|Out)\b/i);
  if (ptoMatch) return ptoMatch[1].trim();

  // Pattern: "Name's Birthday" or "Name's Appointment" - possessive indicates ownership
  const possessiveMatch = title.match(/^([A-Za-zÀ-ÖØ-öø-ÿ]+(?:\s+[A-Z]\.?)?)'s\s+/i);
  if (possessiveMatch) return possessiveMatch[1].trim();

  return null;
}

/**
 * Match extracted name to a user in the org
 * Handles:
 * - Exact first name match
 * - Aliases (Kate → Kathryn, Ryan G → Ryan Gordon)
 * - Creator email fallback for ambiguous names (two Ryans!)
 * - Partial matches
 */
async function matchNameToUser(
  name: string,
  orgId: string,
  userCache?: Map<string, { id: string; name: string }>,
  creatorEmail?: string  // Use event creator to disambiguate
): Promise<{ id: string; name: string } | null> {
  const cacheKey = creatorEmail ? `${name.toLowerCase()}_${creatorEmail}` : name.toLowerCase();
  if (userCache?.has(cacheKey)) {
    return userCache.get(cacheKey)!;
  }

  // Get all users for the org
  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('org_id', orgId)
    .eq('is_active', true);

  if (!users) return null;

  const nameLower = name.toLowerCase();
  
  // 1. Check aliases first (e.g., "kate" → "kathryn", "ryan g." → "ryan gordon")
  const aliasedName = NAME_ALIASES[nameLower];
  if (aliasedName) {
    const match = users.find(u => u.name.toLowerCase() === aliasedName);
    if (match) {
      userCache?.set(cacheKey, match);
      return match;
    }
  }

  // 2. Try exact full name match
  const exactMatch = users.find(u => u.name.toLowerCase() === nameLower);
  if (exactMatch) {
    userCache?.set(cacheKey, exactMatch);
    return exactMatch;
  }

  // 3. Try first name + initial match ("Ryan G" → "Ryan Gordon")
  const initialMatch = nameLower.match(/^([a-zà-öø-ÿ]+)\s+([a-z])\.?$/i);
  if (initialMatch) {
    const [, first, initial] = initialMatch;
    const match = users.find(u => {
      const parts = u.name.toLowerCase().split(' ');
      return parts[0] === first && parts[1]?.startsWith(initial);
    });
    if (match) {
      userCache?.set(cacheKey, match);
      return match;
    }
  }

  // 4. Try first name only match
  const firstName = nameLower.split(' ')[0];
  const firstNameMatches = users.filter(u => 
    u.name.toLowerCase().split(' ')[0] === firstName
  );
  
  // If unique match, use it
  if (firstNameMatches.length === 1) {
    userCache?.set(cacheKey, firstNameMatches[0]);
    return firstNameMatches[0];
  }
  
  // 5. MULTIPLE MATCHES + CREATOR EMAIL → Disambiguate!
  // e.g., "Ryan" matches both Ryans, but creator email tells us which one
  if (firstNameMatches.length > 1 && creatorEmail) {
    const creatorMatch = firstNameMatches.find(u => 
      u.email?.toLowerCase() === creatorEmail.toLowerCase()
    );
    if (creatorMatch) {
      userCache?.set(cacheKey, creatorMatch);
      return creatorMatch;
    }
  }

  // 6. Try partial/starts-with match
  const partialMatch = users.find(u => 
    u.name.toLowerCase().startsWith(nameLower)
  );
  if (partialMatch) {
    userCache?.set(cacheKey, partialMatch);
    return partialMatch;
  }

  return null;
}

// =============================================================================
// Core Sync Functions
// =============================================================================

/**
 * Sync calendar events for a single user
 * Also extracts OTHER users' PTO from shared calendar events
 */
export async function syncUserCalendar(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<SyncResult> {
  const result: SyncResult = {
    userId,
    userName: 'Unknown',
    eventsProcessed: 0,
    eventsSynced: 0,
    userEventsDetected: 0,
    errors: []
  };

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, org_id, google_access_token, google_refresh_token, google_token_expiry, google_calendar_id')
      .eq('id', userId)
      .eq('google_calendar_connected', true)
      .single();

    if (userError || !user) {
      result.errors.push('User not found or calendar not connected');
      return result;
    }

    result.userName = user.name;

    if (!user.google_access_token || !user.google_refresh_token) {
      result.errors.push('Missing calendar tokens');
      return result;
    }

    const { tokens, wasRefreshed } = await getValidTokens(
      user.google_access_token,
      user.google_refresh_token,
      new Date(user.google_token_expiry).getTime()
    );

    if (wasRefreshed) {
      await supabase
        .from('users')
        .update({
          google_access_token: tokens.access_token,
          google_token_expiry: new Date(tokens.expiry_date).toISOString()
        })
        .eq('id', userId);
    }

    const config = await getOrgCalendarConfig(user.org_id);

    // Get ALL calendars the user has access to (including shared ones)
    const calendars = await listCalendars(tokens);
    
    // Prioritize shared/office calendars for PTO visibility
    const calendarIds = calendars
      .filter(c => c.primary || c.summary?.toLowerCase().includes('home') || c.summary?.toLowerCase().includes('office') || c.summary?.toLowerCase().includes('pto'))
      .map(c => c.id)
      .slice(0, 5); // Limit to 5 calendars

    const allEvents: CalendarEvent[] = [];
    for (const calendarId of calendarIds) {
      try {
        const events = await getCalendarEvents(tokens, calendarId, startDate, endDate);
        allEvents.push(...events);
      } catch (err) {
        result.errors.push(`Failed to fetch from calendar ${calendarId}`);
      }
    }

    result.eventsProcessed = allEvents.length;

    // User name cache for matching
    const userCache = new Map<string, { id: string; name: string }>();
    const eventsToStore: UserCalendarEvent[] = [];
    const seenEventKeys = new Set<string>(); // Dedupe by user_id + calendar_event_id

    for (const event of allEvents) {
      // First, check if this is a company-wide event (holiday/closure)
      const eventType = classifyEvent(event, config);
      
      if (eventType === 'holiday') {
        // Company-wide holiday - store for ALL active users
        const { data: allUsers } = await supabase
          .from('users')
          .select('id')
          .eq('org_id', user.org_id)
          .eq('is_active', true);

        for (const u of allUsers || []) {
          const eventKey = `${u.id}_holiday_${event.id}`;
          if (seenEventKeys.has(eventKey)) continue;
          seenEventKeys.add(eventKey);
          
          eventsToStore.push({
            user_id: u.id,
            event_type: 'holiday',
            summary: event.summary,
            start_time: event.start.toISOString(),
            end_time: event.end.toISOString(),
            all_day: event.isAllDay,
            calendar_event_id: eventKey
          });
        }
        continue;
      }

      if (eventType === 'friday_off' && event.attendees) {
        // Friday Off event - store for each attendee (include ALL except declined)
        // This includes: accepted, tentative, and needsAction (not yet responded)
        const attendeeEmails = event.attendees
          .filter(a => a.responseStatus !== 'declined') // Include needsAction/tentative/accepted
          .map(a => a.email.toLowerCase());

        // Match by email first
        const { data: matchedByEmail } = await supabase
          .from('users')
          .select('id, email')
          .eq('org_id', user.org_id)
          .in('email', attendeeEmails);

        // Also try to match by name from email (for aliases like kate@... → kathryn)
        const matchedUsers = matchedByEmail || [];
        const matchedIds = new Set(matchedUsers.map(u => u.id));

        // If some attendees weren't matched by email, try name matching
        for (const email of attendeeEmails) {
          // Extract name part from email (before @)
          const namePart = email.split('@')[0].replace(/[.\-_]/g, ' ');
          const matchedUser = await matchNameToUser(namePart, user.org_id, userCache, email);
          if (matchedUser && !matchedIds.has(matchedUser.id)) {
            matchedUsers.push(matchedUser);
            matchedIds.add(matchedUser.id);
          }
        }

        for (const u of matchedUsers || []) {
          const eventKey = `${u.id}_fridayoff_${event.id}`;
          if (seenEventKeys.has(eventKey)) continue;
          seenEventKeys.add(eventKey);
          
          eventsToStore.push({
            user_id: u.id,
            event_type: 'friday_off',
            summary: event.summary,
            start_time: event.start.toISOString(),
            end_time: event.end.toISOString(),
            all_day: event.isAllDay,
            calendar_event_id: eventKey
          });
          result.userEventsDetected++;
        }
        continue;
      }

      // Try to extract a person's name from the event title
      const extractedName = extractNameFromTitle(event.summary);
      if (extractedName) {
        // Use creator email for disambiguation (e.g., "Ryan Drops Off Car" → which Ryan?)
        const creatorEmail = event.creator?.email || event.organizer?.email;
        const matchedUser = await matchNameToUser(extractedName, user.org_id, userCache, creatorEmail);
        if (matchedUser) {
          const eventKey = `${matchedUser.id}_pto_${event.id}`;
          if (seenEventKeys.has(eventKey)) continue;
          seenEventKeys.add(eventKey);
          
          eventsToStore.push({
            user_id: matchedUser.id,
            event_type: 'pto',
            summary: event.summary,
            start_time: event.start.toISOString(),
            end_time: event.end.toISOString(),
            all_day: event.isAllDay,
            calendar_event_id: eventKey
          });
          result.userEventsDetected++;
        }
        // If we extracted a name but couldn't match it, skip this event
        // (don't assign to syncing user - it's someone else's PTO)
        continue;
      }

      // Only assign generic PTO to syncing user if NO name was extracted
      // (e.g., "PTO" or "Vacation" without a person's name)
      if (eventType === 'pto') {
        const eventKey = `${userId}_pto_${event.id}`;
        if (seenEventKeys.has(eventKey)) continue;
        seenEventKeys.add(eventKey);
        
        eventsToStore.push({
          user_id: userId,
          event_type: 'pto',
          summary: event.summary,
          start_time: event.start.toISOString(),
          end_time: event.end.toISOString(),
          all_day: event.isAllDay,
          calendar_event_id: eventKey
        });
      }
    }

    // Upsert events
    if (eventsToStore.length > 0) {
      const { error: upsertError } = await supabase
        .from('user_calendar_events')
        .upsert(eventsToStore, {
          onConflict: 'user_id,calendar_event_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        result.errors.push(`Failed to store events: ${upsertError.message}`);
      } else {
        result.eventsSynced = eventsToStore.length;
      }
    }

    return result;
  } catch (err: any) {
    result.errors.push(err.message || 'Unknown error');
    return result;
  }
}

/**
 * Sync calendars for all users in an organization
 */
export async function syncOrgCalendars(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; results: SyncResult[]; summary: string }> {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('org_id', orgId)
    .eq('google_calendar_connected', true)
    .eq('is_active', true);

  if (error || !users) {
    return { success: false, results: [], summary: 'Failed to fetch users' };
  }

  const results: SyncResult[] = [];
  let totalSynced = 0;
  let totalErrors = 0;

  for (const user of users) {
    const result = await syncUserCalendar(user.id, startDate, endDate);
    results.push(result);
    totalSynced += result.eventsSynced;
    totalErrors += result.errors.length;
  }

  return {
    success: totalErrors === 0,
    results,
    summary: `Synced ${totalSynced} events for ${users.length} users (${totalErrors} errors)`
  };
}

/**
 * Detect "Fridays Off" attendees from calendar invites
 */
export async function detectFridayOffAttendees(
  orgId: string,
  friday: Date
): Promise<{ users: string[]; eventFound: boolean }> {
  const { data: connectedUsers } = await supabase
    .from('users')
    .select('id, google_access_token, google_refresh_token, google_token_expiry, google_calendar_id')
    .eq('org_id', orgId)
    .eq('google_calendar_connected', true)
    .limit(1);

  if (!connectedUsers || connectedUsers.length === 0) {
    return { users: [], eventFound: false };
  }

  const user = connectedUsers[0];

  try {
    const { tokens } = await getValidTokens(
      user.google_access_token,
      user.google_refresh_token,
      new Date(user.google_token_expiry).getTime()
    );

    const dayStart = new Date(friday);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(friday);
    dayEnd.setHours(23, 59, 59, 999);

    const events = await getCalendarEvents(
      tokens,
      user.google_calendar_id || 'primary',
      dayStart,
      dayEnd
    );

    const fridayOffEvent = events.find(e =>
      e.summary.toLowerCase().includes('fridays off') ||
      e.summary.toLowerCase().includes('friday off')
    );

    if (!fridayOffEvent || !fridayOffEvent.attendees) {
      return { users: [], eventFound: false };
    }

    const attendeeEmails = fridayOffEvent.attendees
      .filter(a => a.responseStatus !== 'declined') // Include needsAction/tentative/accepted
      .map(a => a.email.toLowerCase());

    // Match by email first
    const { data: matchedByEmail } = await supabase
      .from('users')
      .select('id, email')
      .eq('org_id', orgId)
      .in('email', attendeeEmails);

    const matchedUsers = matchedByEmail || [];
    const matchedIds = new Set(matchedUsers.map(u => u.id));

    // Also try to match by name from email (for aliases)
    for (const email of attendeeEmails) {
      const namePart = email.split('@')[0].replace(/[.\-_]/g, ' ');
      // Simple first-name matching
      const firstName = namePart.split(' ')[0]?.toLowerCase();
      if (firstName && !matchedIds.has(firstName)) {
        const { data: nameMatch } = await supabase
          .from('users')
          .select('id, name, nicknames')
          .eq('org_id', orgId)
          .eq('is_active', true);

        const matched = nameMatch?.find(u => 
          u.name.toLowerCase().split(' ')[0] === firstName ||
          u.nicknames?.toLowerCase().includes(firstName)
        );
        if (matched && !matchedIds.has(matched.id)) {
          matchedUsers.push(matched);
          matchedIds.add(matched.id);
        }
      }
    }

    const userIds = matchedUsers?.map(u => u.id) || [];

    const fridayStr = friday.toISOString().split('T')[0];
    for (const matchedUser of matchedUsers || []) {
      await supabase
        .from('user_calendar_events')
        .upsert({
          user_id: matchedUser.id,
          event_type: 'friday_off',
          summary: fridayOffEvent.summary,
          start_time: dayStart.toISOString(),
          end_time: dayEnd.toISOString(),
          all_day: true,
          calendar_event_id: `friday_off_${fridayStr}_${matchedUser.id}`
        }, { onConflict: 'user_id,calendar_event_id' });
    }

    return { users: userIds, eventFound: true };
  } catch (err) {
    console.error('Error detecting Friday Off attendees:', err);
    return { users: [], eventFound: false };
  }
}

// =============================================================================
// Event Classification
// =============================================================================

/**
 * Classify an event based on org's calendar config
 * Order: Friday Off → Holiday → PTO → Meeting
 */
export function classifyEvent(event: CalendarEvent, config: OrgCalendarConfig): EventType {
  const title = event.summary.toLowerCase();

  // 1. Friday Off (most specific)
  for (const schedule of config.recurring_schedules) {
    if (
      schedule.type === 'alternating_day_off' &&
      title.includes(schedule.detection.event_title_contains.toLowerCase())
    ) {
      return 'friday_off';
    }
  }

  // 2. Holiday patterns BEFORE PTO
  for (const pattern of HOLIDAY_PATTERNS) {
    if (title.includes(pattern)) {
      return 'holiday';
    }
  }

  // 3. PTO patterns with word boundaries
  const ptoPatterns = config.pto_detection.title_patterns.map(p => p.toLowerCase());
  for (const pattern of ptoPatterns) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(title)) {
      return 'pto';
    }
  }

  // 4. All-day events on PTO calendars
  if (event.isAllDay && config.pto_detection.all_day_events) {
    const calendarName = event.calendarId?.toLowerCase() || '';
    for (const ptoCalendar of config.pto_detection.calendar_names) {
      if (calendarName.includes(ptoCalendar.toLowerCase())) {
        return 'pto';
      }
    }
  }

  return 'meeting';
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get who's out on a specific date
 * Handles:
 * - Multi-day events with exclusive end dates (Google Calendar convention)
 * - Timezone offsets (events stored as midnight local time = ~05:00 UTC for EST)
 */
export async function getWhosOut(
  orgId: string,
  date: Date
): Promise<Array<{ userId: string; userName: string; type: EventType; summary: string }>> {
  const dateStr = date.toISOString().split('T')[0];
  
  // For timezone-aware comparisons:
  // - Start: use end of day (23:59) to catch events starting at any point during the day
  // - End: use 12:00 (noon) as threshold - if event ends before noon, it probably ended yesterday
  //   (This handles Google Calendar's exclusive end dates where ending "Jan 30" means midnight Jan 30)
  const dayEnd = `${dateStr}T23:59:59Z`;
  const dayNoon = `${dateStr}T12:00:00Z`;

  // Event includes this date if:
  // - Event started on or before end of this day
  // - Event ends AFTER noon of this day (handles exclusive end dates + timezone offset)
  const { data, error } = await supabase
    .from('user_calendar_events')
    .select(`
      user_id,
      event_type,
      summary,
      users!inner(name, org_id)
    `)
    .eq('users.org_id', orgId)
    .in('event_type', ['pto', 'holiday', 'friday_off'])
    .lte('start_time', dayEnd)   // Event started by end of this day
    .gt('end_time', dayNoon);    // Event ends after noon (handles exclusive end + timezone)

  if (error || !data) {
    console.error('getWhosOut error:', error);
    return [];
  }

  return data.map((row: any) => ({
    userId: row.user_id,
    userName: row.users.name,
    type: row.event_type,
    summary: row.summary
  }));
}

/**
 * Get who's out for a week
 */
export async function getWhosOutWeek(
  orgId: string,
  weekStart: Date
): Promise<Array<{ date: string; users: Array<{ userId: string; userName: string; type: EventType; summary: string }> }>> {
  const result: Array<{ date: string; users: Array<{ userId: string; userName: string; type: EventType; summary: string }> }> = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const users = await getWhosOut(orgId, date);
    result.push({ date: dateStr, users });
  }

  return result;
}

/**
 * Check if a user is out on a specific date
 */
export async function isUserOut(userId: string, date: Date): Promise<{ isOut: boolean; reason?: string }> {
  const dateStr = date.toISOString().split('T')[0];
  const dayStart = `${dateStr}T00:00:00Z`;
  const dayEnd = `${dateStr}T23:59:59Z`;

  const { data } = await supabase
    .from('user_calendar_events')
    .select('event_type, summary')
    .eq('user_id', userId)
    .in('event_type', ['pto', 'holiday', 'friday_off'])
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd)
    .limit(1);

  if (data && data.length > 0) {
    return { isOut: true, reason: data[0].summary };
  }

  return { isOut: false };
}

/**
 * Get a user's working days for a given week
 * Returns which days they're actually working (not on PTO)
 */
export async function getUserWorkingDays(
  userId: string,
  weekStart: Date
): Promise<{ workingDays: number[]; ptoSummary: Map<number, string> }> {
  const workingDays: number[] = [];
  const ptoSummary = new Map<number, string>();

  for (let i = 0; i < 5; i++) { // Mon-Fri (0-4)
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const { isOut, reason } = await isUserOut(userId, date);
    
    if (isOut) {
      ptoSummary.set(i, reason || 'Out');
    } else {
      workingDays.push(i);
    }
  }

  return { workingDays, ptoSummary };
}

// =============================================================================
// Helper Functions
// =============================================================================

async function getOrgCalendarConfig(orgId: string): Promise<OrgCalendarConfig> {
  const { data } = await supabase
    .from('org_calendar_config')
    .select('pto_detection, recurring_schedules')
    .eq('org_id', orgId)
    .single();

  if (data?.pto_detection && data?.recurring_schedules) {
    return {
      pto_detection: data.pto_detection as OrgCalendarConfig['pto_detection'],
      recurring_schedules: data.recurring_schedules as OrgCalendarConfig['recurring_schedules']
    };
  }

  return DEFAULT_CONFIG;
}
