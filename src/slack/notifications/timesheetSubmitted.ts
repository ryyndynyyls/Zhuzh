import { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';

/**
 * Send notification to managers when an employee submits their timesheet
 */
export async function sendTimesheetSubmittedNotification(app: App, confirmationId: string) {
  // Get confirmation with entries and user
  const { data: confirmation } = await supabase
    .from('time_confirmations')
    .select(`
      *,
      user:users(name, email),
      entries:time_entries(
        planned_hours,
        actual_hours,
        project:projects(name)
      )
    `)
    .eq('id', confirmationId)
    .single();

  if (!confirmation) return;

  // Get managers/admins to notify
  const { data: managers } = await supabase
    .from('users')
    .select('slack_user_id')
    .in('role', ['pm', 'admin'])
    .eq('is_active', true);

  if (!managers || managers.length === 0) return;

  // Calculate totals and variance
  const totalPlanned = confirmation.entries.reduce((sum, e) => sum + e.planned_hours, 0);
  const totalActual = confirmation.entries.reduce((sum, e) => sum + e.actual_hours, 0);
  const variance = totalActual - totalPlanned;
  const variancePercent = totalPlanned > 0 ? Math.abs(variance / totalPlanned * 100) : 0;

  // Build warning blocks
  const warnings = [];
  if (variancePercent > 10) {
    warnings.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `⚠️ *Variance Warning:* ${variancePercent.toFixed(0)}% difference from plan (${variance > 0 ? '+' : ''}${variance}h)` }
    });
  }
  if (confirmation.exact_match_flag) {
    warnings.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `🔍 *Rubber-Stamp Alert:* Actual hours exactly match planned (may need review)` }
    });
  }

  // Build entries table
  const entriesText = confirmation.entries.map(e => {
    const diff = e.actual_hours - e.planned_hours;
    const diffStr = diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff})` : '';
    return `• ${e.project.name}: ${e.planned_hours}h → ${e.actual_hours}h${diffStr}`;
  }).join('\n');

  // Send to each manager
  for (const manager of managers) {
    try {
      await app.client.chat.postMessage({
        channel: manager.slack_user_id,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '📋 New Timesheet Submitted' }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${confirmation.user.name}* submitted their timesheet for *${formatWeekLabel(confirmation.week_start)}*`
            }
          },
          ...warnings,
          { type: 'divider' },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Entries:*\n${entriesText}` }
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Total:* ${totalPlanned}h planned → ${totalActual}h actual` }
          },
          ...(confirmation.notes ? [{
            type: 'section',
            text: { type: 'mrkdwn', text: `*Notes:* ${confirmation.notes}` }
          }] : []),
          { type: 'divider' },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                action_id: 'approve_timesheet',
                text: { type: 'plain_text', text: '✅ Approve' },
                style: 'primary',
                value: confirmationId
              },
              {
                type: 'button',
                action_id: 'reject_timesheet',
                text: { type: 'plain_text', text: '❌ Reject' },
                style: 'danger',
                value: confirmationId
              },
              {
                type: 'button',
                action_id: 'view_details',
                text: { type: 'plain_text', text: 'View Details' },
                value: confirmationId
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error(`Failed to notify manager ${manager.slack_user_id}:`, error);
    }
  }
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
