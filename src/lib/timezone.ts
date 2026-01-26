/**
 * Timezone utilities for Zhuzh
 * 
 * Philosophy: Auto-detect first, manual override as rare fallback
 * 
 * Sources (in priority order):
 * 1. Manual override (from DB) — rare, for edge cases
 * 2. Slack client timezone — auto-updates when user travels
 * 3. Browser timezone — for web app
 * 4. Default to America/Los_Angeles (UA5 HQ)
 */

import type { WebClient } from '@slack/web-api';

export interface TimezoneInfo {
  timezone: string;           // IANA timezone string, e.g., "America/New_York"
  offset: string;             // e.g., "-05:00"
  label: string;              // e.g., "EST" or "Eastern Time"
  source: 'override' | 'slack' | 'browser' | 'default';
}

const DEFAULT_TIMEZONE = 'America/Los_Angeles';

/**
 * Get timezone for a Slack user
 * Fetches fresh from Slack API each time (travels with user)
 */
export async function getSlackUserTimezone(
  client: WebClient,
  slackUserId: string,
  manualOverride?: string | null
): Promise<TimezoneInfo> {
  // 1. Check for manual override first
  if (manualOverride) {
    return buildTimezoneInfo(manualOverride, 'override');
  }

  // 2. Fetch from Slack API (auto-updates when user travels)
  try {
    const result = await client.users.info({ user: slackUserId });
    const tz = result.user?.tz;
    
    if (tz) {
      return buildTimezoneInfo(tz, 'slack');
    }
  } catch (error) {
    console.warn('Failed to fetch Slack timezone:', error);
  }

  // 3. Fall back to default
  return buildTimezoneInfo(DEFAULT_TIMEZONE, 'default');
}

/**
 * Build timezone info object from IANA timezone string
 */
export function buildTimezoneInfo(
  timezone: string,
  source: TimezoneInfo['source']
): TimezoneInfo {
  const now = new Date();
  
  // Get offset
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  });
  const parts = formatter.formatToParts(now);
  const offsetPart = parts.find(p => p.type === 'timeZoneName');
  const offset = offsetPart?.value || '';

  // Get label (e.g., "EST", "PST")
  const labelFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  });
  const labelParts = labelFormatter.formatToParts(now);
  const labelPart = labelParts.find(p => p.type === 'timeZoneName');
  const label = labelPart?.value || timezone;

  return { timezone, offset, label, source };
}

/**
 * Get current date in a specific timezone (as YYYY-MM-DD)
 */
export function getCurrentDateInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD format
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Get Monday of current week in a specific timezone
 */
export function getWeekStartInTimezone(timezone: string, weekOffset = 0): string {
  // Get current date in the user's timezone
  const today = getCurrentDateInTimezone(timezone);
  const [year, month, day] = today.split('-').map(Number);
  
  // Create date object (in local context, but we just need the math)
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = Sunday
  
  // Calculate days to subtract to get to Monday
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Get Monday
  const monday = new Date(year, month - 1, day - daysFromMonday + (weekOffset * 7));
  
  // Format as YYYY-MM-DD
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  
  return `${y}-${m}-${d}`;
}

/**
 * Format a date string for display in a specific timezone
 */
export function formatDateInTimezone(
  dateString: string, // YYYY-MM-DD
  timezone: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { ...options, timeZone: timezone });
}

/**
 * Format week range (Mon-Fri) for display
 */
export function formatWeekRange(weekStart: string, timezone: string): string {
  const [year, month, day] = weekStart.split('-').map(Number);
  const monday = new Date(year, month - 1, day);
  const friday = new Date(year, month - 1, day + 4);
  
  const mondayStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fridayStr = friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  return `${mondayStr} - ${fridayStr}`;
}

/**
 * Check if current time is within notification window (e.g., 9am-6pm)
 */
export function isWithinNotificationWindow(
  timezone: string,
  startHour = 9,
  endHour = 18
): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  });
  const hourStr = formatter.format(now);
  const hour = parseInt(hourStr, 10);
  
  return hour >= startHour && hour < endHour;
}

/**
 * Get the best time to send a notification (returns Date object)
 * If outside window, returns next available time
 */
export function getBestNotificationTime(
  timezone: string,
  preferredHour = 15, // 3pm default (Friday reminder time)
  preferredMinute = 0
): Date {
  const now = new Date();
  
  // Get current time in user's timezone
  const tzNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  // Create target time today
  const target = new Date(tzNow);
  target.setHours(preferredHour, preferredMinute, 0, 0);
  
  // If we've passed the preferred time today, schedule for tomorrow
  if (tzNow > target) {
    target.setDate(target.getDate() + 1);
  }
  
  return target;
}
