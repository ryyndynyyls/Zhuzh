/**
 * Friday Confirmation DM
 * 
 * "Confirm Your Week" — looking back at hours worked
 * Sends at smart times based on PTO and Friday Off schedules
 */

import { App } from '@slack/bolt';
import { createClient } from '@supabase/supabase-js';
import { buildWeekTableText } from '../blocks';
import { getFridayConfirmationSendTime, type SendTimeResult } from '../../lib/smart-timing';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =============================================================================
// Types
// =============================================================================

interface UserToNotify {
  userId: string;
  userName: string;
  slackUserId: string;
  orgId: string;
  timing: SendTimeResult;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Send Friday confirmation DMs to all users whose send time matches now
 * Called by scheduler (cron job or Slack workflow)
 */
export async function sendFridayConfirmationDMs(app: App, orgId?: string) {
  console.log('🕐 Starting Friday confirmation DM job...');
  
  const weekStart = getCurrentWeekStart();
  const now = new Date();
  
  // Get users to notify
  const usersToNotify = await getUsersToNotifyNow(weekStart, now, orgId);
  
  console.log(`📬 Found ${usersToNotify.length} users to notify`);
  
  for (const user of usersToNotify) {
    await sendConfirmationDM(app, user, weekStart);
  }
  
  console.log('✅ Friday DM job complete');
}

/**
 * Send a confirmation DM to a specific user (for testing/manual trigger)
 */
export async function sendFridayDMToUser(app: App, userId: string) {
  const weekStart = getCurrentWeekStart();
  
  const { data: user } = await supabase
    .from('users')
    .select('id, name, slack_user_id, org_id')
    .eq('id', userId)
    .single();
  
  if (!user?.slack_user_id) {
    console.log(`⚠️ User ${userId} has no Slack ID`);
    return;
  }
  
  const timing = await getFridayConfirmationSendTime(userId, new Date(weekStart));
  
  await sendConfirmationDM(app, {
    userId: user.id,
    userName: user.name,
    slackUserId: user.slack_user_id,
    orgId: user.org_id,
    timing
  }, weekStart);
}

// =============================================================================
// Core Logic
// =============================================================================

/**
 * Get all users who should receive a DM right now
 */
async function getUsersToNotifyNow(
  weekStart: string,
  now: Date,
  filterOrgId?: string
): Promise<UserToNotify[]> {
  // Get all users with allocations this week who haven't submitted
  let query = supabase
    .from('allocations')
    .select('user_id, users!inner(id, name, slack_user_id, org_id)')
    .eq('week_start', weekStart);
  
  const { data: allocations } = await query;
  if (!allocations) return [];
  
  // Get unique users
  const userMap = new Map<string, any>();
  for (const alloc of allocations) {
    if (!userMap.has(alloc.user_id)) {
      userMap.set(alloc.user_id, alloc.users);
    }
  }
  
  // Check who has already submitted
  const { data: submitted } = await supabase
    .from('time_confirmations')
    .select('user_id')
    .eq('week_start', weekStart)
    .in('status', ['submitted', 'approved']);
  
  const submittedUserIds = new Set(submitted?.map(s => s.user_id) || []);
  
  // Filter and check timing
  const usersToNotify: UserToNotify[] = [];
  const windowMs = 5 * 60 * 1000; // 5 minute window
  
  for (const [userId, user] of userMap) {
    // Skip if already submitted
    if (submittedUserIds.has(userId)) continue;
    
    // Skip if no Slack ID
    if (!user.slack_user_id) continue;
    
    // Skip if filtering by org and doesn't match
    if (filterOrgId && user.org_id !== filterOrgId) continue;
    
    // Get smart send time
    const timing = await getFridayConfirmationSendTime(userId, new Date(weekStart));
    
    // Skip if null (user out all week)
    if (!timing.sendAt) {
      console.log(`⏭️ Skipping ${user.name}: ${timing.reason}`);
      continue;
    }
    
    // Check if send time is within window of now
    const diff = Math.abs(timing.sendAt.getTime() - now.getTime());
    if (diff <= windowMs) {
      usersToNotify.push({
        userId,
        userName: user.name,
        slackUserId: user.slack_user_id,
        orgId: user.org_id,
        timing
      });
      
      if (timing.adjustedDay) {
        console.log(`📅 ${user.name}: Sending on ${timing.adjustedDay} (${timing.reason})`);
      }
    }
  }
  
  return usersToNotify;
}

/**
 * Send the actual DM to a user
 */
async function sendConfirmationDM(
  app: App,
  user: UserToNotify,
  weekStart: string
) {
  // Check if user has time tracking enabled
  const { data: userSettings } = await supabase
    .from('users')
    .select('time_tracking_enabled')
    .eq('id', user.userId)
    .single();

  const hasTimeTracking = userSettings?.time_tracking_enabled || false;

  // Get user's allocations for this week
  const { data: allocations } = await supabase
    .from('allocations')
    .select('*, project:projects(id, name, color)')
    .eq('user_id', user.userId)
    .eq('week_start', weekStart);

  // Calculate week end for time entries query
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // If time tracking enabled, get tracked time for the week
  let trackedTimeByProject: Record<string, number> = {};
  let totalTrackedMinutes = 0;

  if (hasTimeTracking) {
    const { data: timeEntries } = await supabase
      .from('time_entries_live')
      .select('project_id, duration_minutes')
      .eq('user_id', user.userId)
      .gte('entry_date', weekStart)
      .lte('entry_date', weekEndStr)
      .or('entry_type.eq.manual,stopped_at.not.is.null');

    for (const entry of timeEntries || []) {
      trackedTimeByProject[entry.project_id] = (trackedTimeByProject[entry.project_id] || 0) + entry.duration_minutes;
      totalTrackedMinutes += entry.duration_minutes;
    }
  }

  const totalPlannedHours = allocations?.reduce((sum, a) => sum + a.planned_hours, 0) || 0;
  const totalTrackedHours = Math.round((totalTrackedMinutes / 60) * 100) / 100;

  // Build timing context message
  let timingNote = '';
  if (user.timing.adjustedDay) {
    timingNote = `\n_Sent ${user.timing.adjustedDay} instead of Friday: ${user.timing.reason}_`;
  }

  // Build the appropriate message based on time tracking status
  let tableText: string;
  let summaryText: string;
  let primaryButtonText: string;
  let actionValue: any;

  if (hasTimeTracking && totalTrackedMinutes > 0) {
    // Show plan vs tracked comparison
    tableText = buildWeekComparisonTable(allocations || [], trackedTimeByProject);
    summaryText = `*Total:* ${totalPlannedHours}h planned → ${totalTrackedHours}h tracked`;
    primaryButtonText = '✓ Confirm Tracked Hours';
    actionValue = JSON.stringify({ weekStart, userId: user.userId, useTrackedTime: true });
  } else {
    // Classic confirmation (no tracking data)
    tableText = buildWeekTableText(allocations || []);
    summaryText = `*Total:* ${totalPlannedHours} hours`;
    primaryButtonText = '✓ Looks Good';
    actionValue = JSON.stringify({ weekStart, userId: user.userId, useTrackedTime: false });
  }

  try {
    await app.client.chat.postMessage({
      channel: user.slackUserId,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: hasTimeTracking && totalTrackedMinutes > 0 ? '📊 Your week in review' : '⏰ Time to confirm your week!' }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Here's your ${hasTimeTracking && totalTrackedMinutes > 0 ? 'tracked time' : 'plan'} for *${formatWeekLabel(weekStart)}*:${timingNote}`
          }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: tableText }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: summaryText }
        },
        { type: 'divider' },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              action_id: 'confirm_timesheet_looks_good',
              text: { type: 'plain_text', text: primaryButtonText },
              style: 'primary',
              value: actionValue
            },
            {
              type: 'button',
              action_id: 'confirm_timesheet_adjust',
              text: { type: 'plain_text', text: 'Adjust Hours' },
              value: JSON.stringify({ weekStart, userId: user.userId })
            }
          ]
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: '_Only visible to you • Please submit by end of day_' }
          ]
        }
      ]
    });

    console.log(`✅ Sent Friday DM to ${user.userName}${hasTimeTracking ? ' (with tracked time)' : ''}`);
  } catch (error) {
    console.error(`❌ Failed to send Friday DM to ${user.userName}:`, error);
  }
}

/**
 * Build a comparison table showing planned vs tracked time
 */
function buildWeekComparisonTable(
  allocations: any[],
  trackedTimeByProject: Record<string, number>
): string {
  // Gather all project IDs (from allocations + tracked time)
  const allProjectIds = new Set<string>();
  allocations.forEach(a => allProjectIds.add(a.project_id));
  Object.keys(trackedTimeByProject).forEach(id => allProjectIds.add(id));

  // Build rows
  const rows: string[] = [];
  rows.push('```');
  rows.push('                        Planned  Tracked');
  rows.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const alloc of allocations) {
    const projectName = (alloc.project?.name || 'Unknown').slice(0, 22).padEnd(22);
    const planned = alloc.planned_hours.toString().padStart(5) + 'h';
    const trackedMinutes = trackedTimeByProject[alloc.project_id] || 0;
    const trackedHours = Math.round((trackedMinutes / 60) * 10) / 10;
    const tracked = trackedHours.toString().padStart(5) + 'h';

    // Indicator for variance
    const diff = trackedHours - alloc.planned_hours;
    let indicator = ' ';
    if (diff > 2) indicator = '↑';
    else if (diff < -2) indicator = '↓';

    rows.push(`${projectName} ${planned}  ${tracked} ${indicator}`);
    allProjectIds.delete(alloc.project_id);
  }

  // Add any tracked projects not in allocations (unplanned work)
  for (const projectId of allProjectIds) {
    const trackedMinutes = trackedTimeByProject[projectId] || 0;
    if (trackedMinutes > 0) {
      const trackedHours = Math.round((trackedMinutes / 60) * 10) / 10;
      rows.push(`${'(unplanned)'.padEnd(22)}     —  ${trackedHours.toString().padStart(5)}h +`);
    }
  }

  rows.push('```');
  return rows.join('\n');
}

// =============================================================================
// Helpers
// =============================================================================

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
