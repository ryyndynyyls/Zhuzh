import { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';

/**
 * Send Friday reminder DMs to users who still haven't submitted
 * Scheduled for Friday 5:00 PM
 */
export async function sendFridayReminderDMs(app: App) {
  const weekStart = getCurrentWeekStart();

  // Get all users with allocations this week
  const { data: allocations } = await supabase
    .from('allocations')
    .select('user_id, users!inner(id, name, slack_user_id)')
    .eq('week_start', weekStart);

  if (!allocations) return;

  // Get unique users
  const userMap = new Map();
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

  // Send reminders to users who still haven't submitted
  for (const [userId, user] of userMap) {
    if (submittedUserIds.has(userId)) continue;

    try {
      await app.client.chat.postMessage({
        channel: user.slack_user_id,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🔔 *Reminder:* Please confirm your timesheet for ${formatWeekLabel(weekStart)}`
            }
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '_This is your last chance before the week closes!_' }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                action_id: 'looks_good',
                text: { type: 'plain_text', text: '✓ Looks Good' },
                style: 'primary',
                value: JSON.stringify({ weekStart })
              },
              {
                type: 'button',
                action_id: 'adjust_hours',
                text: { type: 'plain_text', text: 'Adjust Hours' },
                value: JSON.stringify({ weekStart })
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error(`Failed to send Friday reminder to ${user.name}:`, error);
    }
  }
}

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
