/**
 * Monday Preview DM
 * 
 * "Your Week Ahead" — looking forward at planned hours
 * Sends at smart times based on PTO
 */

import { App } from '@slack/bolt';
import { createClient } from '@supabase/supabase-js';
import { buildWeekTableText } from '../blocks';
import { getMondayPreviewSendTime, type SendTimeResult } from '../../lib/smart-timing';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
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
 * Send Monday preview DMs to all users whose send time matches now
 * Called by scheduler (cron job or Slack workflow)
 */
export async function sendMondaySchedulingDMs(app: App, orgId?: string) {
  console.log('🕐 Starting Monday preview DM job...');
  
  const weekStart = getCurrentWeekStart();
  const now = new Date();
  
  // Get users to notify
  const usersToNotify = await getUsersToNotifyNow(weekStart, now, orgId);
  
  console.log(`📬 Found ${usersToNotify.length} users to notify`);
  
  for (const user of usersToNotify) {
    await sendPreviewDM(app, user, weekStart);
  }
  
  console.log('✅ Monday DM job complete');
}

/**
 * Send a preview DM to a specific user (for testing/manual trigger)
 */
export async function sendMondayDMToUser(app: App, userId: string) {
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
  
  const timing = await getMondayPreviewSendTime(userId, new Date(weekStart));
  
  await sendPreviewDM(app, {
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
  // Get all users with allocations this week
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
  
  // Filter and check timing
  const usersToNotify: UserToNotify[] = [];
  const windowMs = 5 * 60 * 1000; // 5 minute window
  
  for (const [userId, user] of userMap) {
    // Skip if no Slack ID
    if (!user.slack_user_id) continue;
    
    // Skip if filtering by org and doesn't match
    if (filterOrgId && user.org_id !== filterOrgId) continue;
    
    // Get smart send time
    const timing = await getMondayPreviewSendTime(userId, new Date(weekStart));
    
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
 * Send the actual preview DM to a user
 */
async function sendPreviewDM(
  app: App,
  user: UserToNotify,
  weekStart: string
) {
  // Get user's allocations for this week
  const { data: allocations } = await supabase
    .from('allocations')
    .select('*, project:projects(name, color, description)')
    .eq('user_id', user.userId)
    .eq('week_start', weekStart)
    .order('planned_hours', { ascending: false });
  
  const totalHours = allocations?.reduce((sum, a) => sum + a.planned_hours, 0) || 0;
  
  // Build timing context message
  let timingNote = '';
  if (user.timing.adjustedDay) {
    timingNote = `\n_Sent ${user.timing.adjustedDay} instead of Monday: ${user.timing.reason}_`;
  }
  
  try {
    await app.client.chat.postMessage({
      channel: user.slackUserId,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📅 Your week has been scheduled!' }
        },
        {
          type: 'section',
          text: { 
            type: 'mrkdwn', 
            text: `Here's your plan for *${formatWeekLabel(weekStart)}*:${timingNote}` 
          }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: buildWeekTableText(allocations || []) }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Total:* ${totalHours} hours` }
        },
        { type: 'divider' },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              action_id: 'preview_looks_good',
              text: { type: 'plain_text', text: '✓ Looks Good' },
              style: 'primary',
              value: JSON.stringify({ weekStart, userId: user.userId })
            },
            {
              type: 'button',
              action_id: 'preview_view_details',
              text: { type: 'plain_text', text: 'View Details' },
              value: JSON.stringify({ weekStart, userId: user.userId })
            },
            {
              type: 'button',
              action_id: 'preview_flag_issue',
              text: { type: 'plain_text', text: '⚠ Flag Issue' },
              value: JSON.stringify({ weekStart, userId: user.userId })
            }
          ]
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: '_Only visible to you • Schedule finalized by PM on Thursday_' }
          ]
        }
      ]
    });
    
    console.log(`✅ Sent Monday DM to ${user.userName}`);
  } catch (error) {
    console.error(`❌ Failed to send Monday DM to ${user.userName}:`, error);
  }
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
