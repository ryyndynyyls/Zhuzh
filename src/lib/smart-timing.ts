/**
 * Smart Timing for Slack DMs
 * 
 * Determines optimal send times based on PTO and schedule patterns.
 * Uses calendar config from Gemini analysis + cached calendar events.
 */

import { createClient } from '@supabase/supabase-js';

// Use service role for server-side operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =============================================================================
// Types
// =============================================================================

export interface SendTimeResult {
  sendAt: Date | null;  // null = skip entirely
  reason: string;
  originalDay: string;
  adjustedDay?: string;
}

interface RecurringSchedule {
  name: string;
  type: 'alternating_day_off' | 'every_week' | 'seasonal';
  day_of_week?: number; // 0 = Sunday, 5 = Friday
  detection?: {
    method: 'calendar_invite' | 'group_membership' | 'manual';
    event_title_contains?: string;
    group_name?: string;
  };
}

// =============================================================================
// Date Helpers
// =============================================================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function setTime(date: Date, hours: number, minutes: number = 0): Date {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

// =============================================================================
// PTO Detection
// =============================================================================

/**
 * Check if user has PTO/holiday on a specific date
 */
async function checkPTOForDate(userId: string, date: Date): Promise<boolean> {
  const dateStr = formatDate(date);
  
  // Check cached calendar events
  const { data: events } = await supabase
    .from('user_calendar_events')
    .select('event_type')
    .eq('user_id', userId)
    .in('event_type', ['pto', 'holiday', 'friday_off'])
    .lte('start_time', `${dateStr}T23:59:59`)
    .gte('end_time', `${dateStr}T00:00:00`);
  
  if (events && events.length > 0) {
    return true;
  }
  
  // Also check pto_entries table (manual entries)
  const { data: ptoEntries } = await supabase
    .from('pto_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .limit(1);
  
  return !!(ptoEntries && ptoEntries.length > 0);
}

/**
 * Check if user is out for the entire work week (Mon-Fri)
 */
async function checkPTOAllWeek(userId: string, weekStart: Date): Promise<boolean> {
  const workDays = [0, 1, 2, 3, 4].map(d => addDays(weekStart, d)); // Mon-Fri
  
  for (const day of workDays) {
    const isOff = await checkPTOForDate(userId, day);
    if (!isOff) return false; // Found a working day
  }
  
  return true; // Out all week
}

// =============================================================================
// Friday Off Group Detection
// =============================================================================

/**
 * Check if user is in the "Friday Off" group for a specific Friday
 * UA5 uses alternating Fridays tracked via calendar invites
 */
async function checkFridayOffGroup(userId: string, orgId: string, friday: Date): Promise<boolean> {
  // Get org's recurring schedule config
  const { data: config } = await supabase
    .from('org_calendar_config')
    .select('recurring_schedules')
    .eq('org_id', orgId)
    .single();
  
  if (!config?.recurring_schedules) return false;
  
  const schedules = config.recurring_schedules as RecurringSchedule[];
  const fridayOffSchedule = schedules.find(s => 
    s.type === 'alternating_day_off' && s.day_of_week === 5
  );
  
  if (!fridayOffSchedule) return false;
  
  // Check for calendar event indicating Friday Off
  const fridayStr = formatDate(friday);
  const { data: events } = await supabase
    .from('user_calendar_events')
    .select('summary, event_type')
    .eq('user_id', userId)
    .eq('event_type', 'friday_off')
    .lte('start_time', `${fridayStr}T23:59:59`)
    .gte('end_time', `${fridayStr}T00:00:00`);
  
  return !!(events && events.length > 0);
}

// =============================================================================
// Get User's Org
// =============================================================================

async function getUserOrgId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', userId)
    .single();
  
  return data?.org_id || null;
}

// =============================================================================
// Friday Confirmation Send Time
// =============================================================================

/**
 * Determine when to send the "Confirm Your Week" DM
 * 
 * Logic:
 * - Out all week? → Skip entirely
 * - PTO Thu + Fri (or Fri Off + PTO Thu)? → Wednesday 3pm
 * - PTO Fri (or in Fri Off group)? → Thursday 3pm
 * - Normal → Friday 3pm
 */
export async function getFridayConfirmationSendTime(
  userId: string,
  weekStart: Date = getWeekStart()
): Promise<SendTimeResult> {
  const orgId = await getUserOrgId(userId);
  if (!orgId) {
    return { sendAt: null, reason: 'User has no org', originalDay: 'Friday' };
  }
  
  const mon = weekStart;
  const wed = addDays(weekStart, 2);
  const thu = addDays(weekStart, 3);
  const fri = addDays(weekStart, 4);
  
  // Check if out all week
  const isOutAllWeek = await checkPTOAllWeek(userId, weekStart);
  if (isOutAllWeek) {
    return { 
      sendAt: null, 
      reason: 'User is out all week',
      originalDay: 'Friday'
    };
  }
  
  // Check Friday
  const isFridayOff = await checkFridayOffGroup(userId, orgId, fri);
  const hasPTOFriday = await checkPTOForDate(userId, fri);
  const fridayUnavailable = isFridayOff || hasPTOFriday;
  
  // Check Thursday
  const hasPTOThursday = await checkPTOForDate(userId, thu);
  
  // Check Wednesday (for cascading)
  const hasPTOWednesday = await checkPTOForDate(userId, wed);
  
  // Determine send time
  if (fridayUnavailable && hasPTOThursday && hasPTOWednesday) {
    // Cascade further back? For now, skip if Wed-Fri all out
    return {
      sendAt: null,
      reason: 'User is out Wed-Fri',
      originalDay: 'Friday'
    };
  }
  
  if (fridayUnavailable && hasPTOThursday) {
    return {
      sendAt: setTime(wed, 15, 0), // Wednesday 3pm
      reason: isFridayOff 
        ? 'Friday Off group + Thursday PTO' 
        : 'Thursday + Friday PTO',
      originalDay: 'Friday',
      adjustedDay: 'Wednesday'
    };
  }
  
  if (fridayUnavailable) {
    return {
      sendAt: setTime(thu, 15, 0), // Thursday 3pm
      reason: isFridayOff ? 'Friday Off group this week' : 'Friday PTO',
      originalDay: 'Friday',
      adjustedDay: 'Thursday'
    };
  }
  
  // Normal: Friday 3pm
  return {
    sendAt: setTime(fri, 15, 0),
    reason: 'Normal week',
    originalDay: 'Friday'
  };
}

// =============================================================================
// Monday Preview Send Time
// =============================================================================

/**
 * Determine when to send the "Your Week Ahead" DM
 * 
 * Logic:
 * - Out all week? → Skip entirely
 * - PTO Mon + Tue + Wed? → Thursday 9am
 * - PTO Mon + Tue? → Wednesday 9am
 * - PTO Mon? → Tuesday 9am
 * - Normal → Monday 9am
 */
export async function getMondayPreviewSendTime(
  userId: string,
  weekStart: Date = getWeekStart()
): Promise<SendTimeResult> {
  const orgId = await getUserOrgId(userId);
  if (!orgId) {
    return { sendAt: null, reason: 'User has no org', originalDay: 'Monday' };
  }
  
  const mon = weekStart;
  const tue = addDays(weekStart, 1);
  const wed = addDays(weekStart, 2);
  const thu = addDays(weekStart, 3);
  
  // Check if out all week
  const isOutAllWeek = await checkPTOAllWeek(userId, weekStart);
  if (isOutAllWeek) {
    return { 
      sendAt: null, 
      reason: 'User is out all week',
      originalDay: 'Monday'
    };
  }
  
  // Check each day
  const hasPTOMon = await checkPTOForDate(userId, mon);
  const hasPTOTue = await checkPTOForDate(userId, tue);
  const hasPTOWed = await checkPTOForDate(userId, wed);
  const hasPTOThu = await checkPTOForDate(userId, thu);
  
  // Determine send time
  if (hasPTOMon && hasPTOTue && hasPTOWed && hasPTOThu) {
    // Out Mon-Thu, could send Friday but that's weird for a "week ahead" preview
    return {
      sendAt: null,
      reason: 'User is out Mon-Thu',
      originalDay: 'Monday'
    };
  }
  
  if (hasPTOMon && hasPTOTue && hasPTOWed) {
    return {
      sendAt: setTime(thu, 9, 0), // Thursday 9am
      reason: 'Monday + Tuesday + Wednesday PTO',
      originalDay: 'Monday',
      adjustedDay: 'Thursday'
    };
  }
  
  if (hasPTOMon && hasPTOTue) {
    return {
      sendAt: setTime(wed, 9, 0), // Wednesday 9am
      reason: 'Monday + Tuesday PTO',
      originalDay: 'Monday',
      adjustedDay: 'Wednesday'
    };
  }
  
  if (hasPTOMon) {
    return {
      sendAt: setTime(tue, 9, 0), // Tuesday 9am
      reason: 'Monday PTO',
      originalDay: 'Monday',
      adjustedDay: 'Tuesday'
    };
  }
  
  // Normal: Monday 9am
  return {
    sendAt: setTime(mon, 9, 0),
    reason: 'Normal week',
    originalDay: 'Monday'
  };
}

// =============================================================================
// Batch: Get All Users' Send Times
// =============================================================================

export interface UserSendTime {
  userId: string;
  userName: string;
  slackUserId: string;
  friday: SendTimeResult;
  monday: SendTimeResult;
  workingDays: number[]; // 0=Mon, 1=Tue, etc.
  messageVariant: 'normal' | 'partial_week' | 'single_day';
}

// =============================================================================
// Partial Week & Message Variants
// =============================================================================

/**
 * Get which days a user is working this week (Mon-Fri = 0-4)
 */
export async function getWorkingDays(userId: string, weekStart: Date): Promise<number[]> {
  const workingDays: number[] = [];
  
  for (let i = 0; i < 5; i++) { // Mon-Fri
    const day = addDays(weekStart, i);
    const isOff = await checkPTOForDate(userId, day);
    if (!isOff) {
      workingDays.push(i);
    }
  }
  
  return workingDays;
}

/**
 * Determine message variant based on working days
 * - normal: 3+ working days → "Your Week Ahead" / "Confirm Your Week"
 * - partial_week: 2 days → "Your Resourcing" / "Confirm Your Hours" 
 * - single_day: 1 day → "Your Resourcing for Today" / "Confirm Today's Hours"
 */
function getMessageVariant(workingDays: number[]): 'normal' | 'partial_week' | 'single_day' {
  if (workingDays.length >= 3) return 'normal';
  if (workingDays.length === 2) return 'partial_week';
  return 'single_day';
}

/**
 * For partial weeks, get the optimal send times:
 * - Morning: First working day at 9am
 * - Confirmation: Last working day at 3pm (or end of last day)
 */
export async function getPartialWeekSendTimes(
  userId: string,
  weekStart: Date
): Promise<{ morning: SendTimeResult; confirmation: SendTimeResult; workingDays: number[] }> {
  const workingDays = await getWorkingDays(userId, weekStart);
  
  if (workingDays.length === 0) {
    return {
      morning: { sendAt: null, reason: 'User is out all week', originalDay: 'Monday' },
      confirmation: { sendAt: null, reason: 'User is out all week', originalDay: 'Friday' },
      workingDays: []
    };
  }
  
  const firstWorkDay = workingDays[0];
  const lastWorkDay = workingDays[workingDays.length - 1];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  const morningDate = addDays(weekStart, firstWorkDay);
  const confirmDate = addDays(weekStart, lastWorkDay);
  
  return {
    morning: {
      sendAt: setTime(morningDate, 9, 0),
      reason: workingDays.length === 1 
        ? `Single working day: ${dayNames[firstWorkDay]}`
        : `First working day: ${dayNames[firstWorkDay]}`,
      originalDay: 'Monday',
      adjustedDay: dayNames[firstWorkDay]
    },
    confirmation: {
      sendAt: setTime(confirmDate, 15, 0),
      reason: workingDays.length === 1
        ? `Single working day: ${dayNames[lastWorkDay]}`
        : `Last working day: ${dayNames[lastWorkDay]}`,
      originalDay: 'Friday',
      adjustedDay: dayNames[lastWorkDay]
    },
    workingDays
  };
}

// =============================================================================
// Personal Calendar Blocks (Appointments, etc.)
// =============================================================================

/**
 * Check if user has a personal event blocking a specific time
 * Used to avoid sending DMs during doctor appointments, etc.
 */
export async function checkPersonalBlock(
  userId: string, 
  targetTime: Date
): Promise<{ isBlocked: boolean; reason?: string }> {
  // Query calendar_events_cache for events at this time
  const timeStr = targetTime.toISOString();
  
  const { data: events } = await supabase
    .from('user_calendar_events')
    .select('summary, start_time, end_time')
    .eq('user_id', userId)
    .lte('start_time', timeStr)
    .gte('end_time', timeStr);
  
  if (events && events.length > 0) {
    // Check if any event looks like a personal block
    const blockingEvent = events.find(e => {
      const summary = e.summary.toLowerCase();
      return summary.includes('appointment') || 
             summary.includes('doctor') ||
             summary.includes('dentist') ||
             summary.includes('meeting') ||
             summary.includes('interview') ||
             summary.includes('call');
    });
    
    if (blockingEvent) {
      return { isBlocked: true, reason: blockingEvent.summary };
    }
  }
  
  return { isBlocked: false };
}

/**
 * Adjust send time if it conflicts with a personal block
 * Tries 30 min increments before/after
 */
export async function adjustForPersonalBlocks(
  userId: string,
  originalTime: Date,
  maxAdjustMinutes: number = 60
): Promise<Date> {
  const { isBlocked } = await checkPersonalBlock(userId, originalTime);
  if (!isBlocked) return originalTime;
  
  // Try adjusting backward and forward in 30 min increments
  for (let offset = 30; offset <= maxAdjustMinutes; offset += 30) {
    // Try earlier
    const earlier = new Date(originalTime.getTime() - offset * 60 * 1000);
    const { isBlocked: blockedEarlier } = await checkPersonalBlock(userId, earlier);
    if (!blockedEarlier) return earlier;
    
    // Try later
    const later = new Date(originalTime.getTime() + offset * 60 * 1000);
    const { isBlocked: blockedLater } = await checkPersonalBlock(userId, later);
    if (!blockedLater) return later;
  }
  
  // Couldn't find a good time, return original
  return originalTime;
}

/**
 * Get send times for all users in an org
 * Uses partial week logic for smarter timing
 */
export async function getOrgSendTimes(
  orgId: string,
  weekStart: Date = getWeekStart()
): Promise<UserSendTime[]> {
  const { data: users } = await supabase
    .from('users')
    .select('id, name, slack_user_id')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .not('slack_user_id', 'is', null);
  
  if (!users) return [];
  
  const results: UserSendTime[] = [];
  
  for (const user of users) {
    // Use partial week logic for smarter send times
    const { morning, confirmation, workingDays } = await getPartialWeekSendTimes(user.id, weekStart);
    const messageVariant = getMessageVariant(workingDays);
    
    results.push({
      userId: user.id,
      userName: user.name,
      slackUserId: user.slack_user_id,
      monday: morning,
      friday: confirmation,
      workingDays,
      messageVariant
    });
  }
  
  return results;
}

/**
 * Get users who should receive a DM at a specific datetime
 * Used by the scheduler to batch send DMs
 */
export async function getUsersToNotify(
  orgId: string,
  targetTime: Date,
  dmType: 'friday' | 'monday'
): Promise<{ userId: string; slackUserId: string; userName: string }[]> {
  const weekStart = getWeekStart(targetTime);
  const allSendTimes = await getOrgSendTimes(orgId, weekStart);
  
  // Filter to users whose send time matches the target (within 5 min window)
  const targetMs = targetTime.getTime();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  
  return allSendTimes
    .filter(u => {
      const sendTime = dmType === 'friday' ? u.friday.sendAt : u.monday.sendAt;
      if (!sendTime) return false;
      const diff = Math.abs(sendTime.getTime() - targetMs);
      return diff <= windowMs;
    })
    .map(u => ({
      userId: u.userId,
      slackUserId: u.slackUserId,
      userName: u.userName
    }));
}
