import { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';

/**
 * Send notification to employee when their timesheet is rejected
 */
export async function sendRejectionNotification(app: App, confirmationId: string) {
  // Get confirmation with user
  const { data: confirmation } = await supabase
    .from('time_confirmations')
    .select('*, user:users!user_id(name, slack_user_id)')
    .eq('id', confirmationId)
    .single();

  if (!confirmation || !confirmation.user?.slack_user_id) return;

  try {
    await app.client.chat.postMessage({
      channel: confirmation.user.slack_user_id,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '❌ Timesheet Needs Revision' }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Your timesheet for *${formatWeekLabel(confirmation.week_start)}* has been returned for revision.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Reason:*\n>${confirmation.rejection_reason || 'No reason provided'}`
          }
        },
        { type: 'divider' },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              action_id: 'adjust_hours',
              text: { type: 'plain_text', text: '✏️ Edit Timesheet' },
              style: 'primary',
              value: JSON.stringify({ weekStart: confirmation.week_start })
            }
          ]
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: '_Please address the feedback and resubmit_' }
          ]
        }
      ]
    });
  } catch (error) {
    console.error(`Failed to send rejection notification to ${confirmation.user.name}:`, error);
  }
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
