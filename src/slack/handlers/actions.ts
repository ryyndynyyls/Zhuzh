import type { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';
import { buildConfirmWeekModal } from '../views/confirmWeek';
import { buildAddUnplannedWorkModal } from '../views/addUnplannedWork';
import { buildApprovalDetailModal } from '../views/approvalDetail';
import { getSlackUserTimezone } from '../../lib/timezone';

// Helper to format week label
function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function registerActions(app: App) {
  // "Looks Good" button - quick approve with actual = planned
  // NOTE: Action ID matches fridayDM.ts button
  app.action('confirm_timesheet_looks_good', async ({ ack, body, client }) => {
    await ack();

    const slackUserId = body.user.id;
    const metadata = JSON.parse((body as any).actions[0].value || '{}');
    const { weekStart } = metadata;

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) return;

    // Get allocations
    const { data: allocations } = await supabase
      .from('allocations')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart);

    // Create confirmation with actual = planned
    const { data: confirmation } = await supabase
      .from('time_confirmations')
      .insert({
        user_id: user.id,
        week_start: weekStart,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        exact_match_flag: true
      })
      .select()
      .single();

    if (!confirmation) return;

    // Calculate total hours
    const totalHours = allocations?.reduce((sum, a) => sum + a.planned_hours, 0) || 0;
    const projectCount = allocations?.length || 0;

    // Create entries
    for (const alloc of allocations || []) {
      await supabase
        .from('time_entries')
        .insert({
          confirmation_id: confirmation.id,
          project_id: alloc.project_id,
          phase_id: alloc.phase_id,
          allocation_id: alloc.id,
          planned_hours: alloc.planned_hours,
          actual_hours: alloc.planned_hours, // Same as planned
          is_unplanned: false
        });
    }

    // Rich confirmation message
    const weekLabel = formatWeekLabel(weekStart);
    await client.chat.postMessage({
      channel: slackUserId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Timesheet confirmed!*\n\nYour hours for *${weekLabel}* have been sent for approval.`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `📊 *${totalHours}h* total · ${projectCount} project${projectCount !== 1 ? 's' : ''} · Matched plan exactly`
            }
          ]
        }
      ],
      text: `✅ Timesheet confirmed! ${totalHours}h for ${weekLabel}`
    });
  });

  // "Adjust Hours" button - open confirmation modal
  // NOTE: Action ID matches fridayDM.ts button
  app.action('confirm_timesheet_adjust', async ({ ack, body, client }) => {
    await ack();

    const slackUserId = body.user.id;
    const metadata = JSON.parse((body as any).actions[0].value || '{}');
    const { weekStart } = metadata;

    // Get user and allocations
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) return;

    const { data: allocations } = await supabase
      .from('allocations')
      .select('*, project:projects(name, color), phase:project_phases(name)')
      .eq('user_id', user.id)
      .eq('week_start', weekStart);

    await client.views.open({
      trigger_id: (body as any).trigger_id,
      view: buildConfirmWeekModal(allocations || [], weekStart, null)
    });
  });

  // "Add Unplanned Work" button in confirmation modal
  app.action('add_unplanned_work', async ({ ack, body, client }) => {
    await ack();

    const viewBody = body as any;
    const parentMetadata = JSON.parse(viewBody.view?.private_metadata || '{}');
    const parentViewId = viewBody.view?.id; // Store parent view ID for refresh
    const slackUserId = body.user.id;

    // Get user's timezone
    const { data: user } = await supabase
      .from('users')
      .select('timezone_override')
      .eq('slack_user_id', slackUserId)
      .single();

    const tzInfo = await getSlackUserTimezone(client, slackUserId, user?.timezone_override);

    // Get all active projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, phases:project_phases(id, name)')
      .eq('status', 'active');

    // Pass parent view ID and timezone in metadata so we can refresh after save
    await client.views.push({
      trigger_id: viewBody.trigger_id,
      view: buildAddUnplannedWorkModal(
        projects || [], 
        parentMetadata.weekStart,
        parentViewId,
        tzInfo.timezone
      )
    });
  });

  // Approve timesheet
  app.action('approve_timesheet', async ({ ack, body, client }) => {
    await ack();

    const slackUserId = body.user.id;
    const confirmationId = (body as any).actions[0].value;

    // Get manager
    const { data: manager } = await supabase
      .from('users')
      .select('*')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!manager || manager.role === 'employee') return;

    // Update confirmation
    const { data: confirmation } = await supabase
      .from('time_confirmations')
      .update({
        status: 'approved',
        approved_by: manager.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', confirmationId)
      .select('*, user:users(slack_user_id, name)')
      .single();

    if (!confirmation) return;

    // Notify employee with rich message
    const userData = confirmation.user as any;
    const weekLabel = formatWeekLabel(confirmation.week_start);
    
    await client.chat.postMessage({
      channel: userData.slack_user_id,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Timesheet approved!*\n\nYour hours for *${weekLabel}* have been approved by ${manager.name}.`
          }
        }
      ],
      text: `✅ Your timesheet for ${weekLabel} has been approved!`
    });
  });

  // Reject timesheet - open rejection reason modal
  app.action('reject_timesheet', async ({ ack, body, client }) => {
    await ack();

    const confirmationId = (body as any).actions[0].value;

    await client.views.open({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        callback_id: 'reject_reason_submit',
        private_metadata: JSON.stringify({ confirmationId }),
        title: { type: 'plain_text', text: 'Reject Timesheet' },
        submit: { type: 'plain_text', text: 'Reject' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          {
            type: 'input',
            block_id: 'reason',
            label: { type: 'plain_text', text: 'Rejection Reason' },
            element: {
              type: 'plain_text_input',
              action_id: 'reason_input',
              multiline: true,
              placeholder: { type: 'plain_text', text: 'Please explain why this timesheet needs revision...' }
            }
          }
        ]
      }
    });
  });

  // Handle rejection reason submission
  app.view('reject_reason_submit', async ({ ack, body, view, client }) => {
    await ack();

    const metadata = JSON.parse(view.private_metadata);
    const reasonBlock = view.state.values.reason as any;
    const reason = reasonBlock?.reason_input?.value;

    // Update confirmation
    const { data: confirmation } = await supabase
      .from('time_confirmations')
      .update({
        status: 'rejected',
        rejection_reason: reason
      })
      .eq('id', metadata.confirmationId)
      .select('*, user:users(slack_user_id)')
      .single();

    if (!confirmation) return;

    const userData = confirmation.user as any;
    const weekLabel = formatWeekLabel(confirmation.week_start);
    
    // Notify employee
    await client.chat.postMessage({
      channel: userData.slack_user_id,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `⚠️ *Timesheet needs revision*\n\nYour hours for *${weekLabel}* require changes.` }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Reason:*\n${reason}` }
        },
        {
          type: 'actions',
          elements: [{
            type: 'button',
            action_id: 'confirm_timesheet_adjust',
            text: { type: 'plain_text', text: '✏️ Edit Timesheet' },
            style: 'primary',
            value: JSON.stringify({ weekStart: confirmation.week_start })
          }]
        }
      ]
    });
  });

  // View details action
  app.action('view_details', async ({ ack, body, client }) => {
    await ack();

    const confirmationId = (body as any).actions[0].value;

    const { data: confirmation } = await supabase
      .from('time_confirmations')
      .select('*, user:users(name), entries:time_entries(*, project:projects(name), phase:project_phases(name))')
      .eq('id', confirmationId)
      .single();

    if (!confirmation) return;

    await client.views.open({
      trigger_id: (body as any).trigger_id,
      view: buildApprovalDetailModal(confirmation as any)
    });
  });

  // =============================================================================
  // Monday Preview DM Actions
  // =============================================================================

  // "Looks Good" on Monday preview - just acknowledge, no submission
  app.action('preview_looks_good', async ({ ack, body, client }) => {
    await ack();

    const slackUserId = body.user.id;
    const metadata = JSON.parse((body as any).actions[0].value || '{}');
    const { weekStart } = metadata;
    const weekLabel = formatWeekLabel(weekStart);

    // Just send a friendly confirmation - no database action needed
    // The schedule is already set by the PM
    await client.chat.postMessage({
      channel: slackUserId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `👍 *Got it!*\n\nYour schedule for *${weekLabel}* looks good. We'll check in Friday to confirm your actual hours.`
          }
        }
      ],
      text: `👍 Schedule confirmed for ${weekLabel}`
    });
  });

  // "View Details" on Monday preview - show project details modal
  app.action('preview_view_details', async ({ ack, body, client }) => {
    await ack();

    const slackUserId = body.user.id;
    const metadata = JSON.parse((body as any).actions[0].value || '{}');
    const { weekStart, userId } = metadata;

    // Get allocations with project details
    const { data: allocations } = await supabase
      .from('allocations')
      .select(`
        *,
        project:projects(name, color, description, client:clients(name)),
        phase:project_phases(name)
      `)
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .order('planned_hours', { ascending: false });

    if (!allocations || allocations.length === 0) {
      await client.chat.postMessage({
        channel: slackUserId,
        text: `No allocations found for the week of ${weekStart}.`
      });
      return;
    }

    // Build detailed view
    const weekLabel = formatWeekLabel(weekStart);
    const blocks: any[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📋 ${weekLabel}` }
      },
      { type: 'divider' }
    ];

    for (const alloc of allocations) {
      const project = alloc.project as any;
      const phase = alloc.phase as any;
      const projectClient = project?.client as any;

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${project?.name || 'Unknown'}*${phase ? ` › ${phase.name}` : ''}\n` +
            `${projectClient?.name ? `_${projectClient.name}_\n` : ''}` +
            `*${alloc.planned_hours}h* planned`
        }
      });

      if (project?.description) {
        blocks.push({
          type: 'context',
          elements: [{ type: 'mrkdwn', text: project.description.substring(0, 200) }]
        });
      }

      blocks.push({ type: 'divider' });
    }

    const totalHours = allocations.reduce((sum: number, a: any) => sum + a.planned_hours, 0);
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Total:* ${totalHours} hours` }
    });

    await client.views.open({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        title: { type: 'plain_text', text: 'Week Details' },
        close: { type: 'plain_text', text: 'Close' },
        blocks
      }
    });
  });

  // "Flag Issue" on Monday preview - open issue flagging modal
  app.action('preview_flag_issue', async ({ ack, body, client }) => {
    await ack();

    const metadata = JSON.parse((body as any).actions[0].value || '{}');
    const { weekStart, userId } = metadata;

    await client.views.open({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        callback_id: 'preview_flag_submit',
        private_metadata: JSON.stringify({ weekStart, userId }),
        title: { type: 'plain_text', text: 'Flag an Issue' },
        submit: { type: 'plain_text', text: 'Submit' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Let your PM know about any concerns with your schedule for the week of ' + weekStart
            }
          },
          {
            type: 'input',
            block_id: 'issue_type',
            label: { type: 'plain_text', text: 'Issue Type' },
            element: {
              type: 'static_select',
              action_id: 'issue_type_select',
              placeholder: { type: 'plain_text', text: 'Select an issue type' },
              options: [
                { text: { type: 'plain_text', text: '⏰ Over-allocated' }, value: 'over-allocated' },
                { text: { type: 'plain_text', text: '📅 Conflict with PTO' }, value: 'pto-conflict' },
                { text: { type: 'plain_text', text: '🔄 Wrong project assignment' }, value: 'wrong-project' },
                { text: { type: 'plain_text', text: '❓ Missing allocation' }, value: 'missing-allocation' },
                { text: { type: 'plain_text', text: '💬 Other' }, value: 'other' }
              ]
            }
          },
          {
            type: 'input',
            block_id: 'issue_details',
            label: { type: 'plain_text', text: 'Details' },
            element: {
              type: 'plain_text_input',
              action_id: 'details_input',
              multiline: true,
              placeholder: { type: 'plain_text', text: 'Describe the issue...' }
            }
          }
        ]
      }
    });
  });

  // Handle flag issue submission
  app.view('preview_flag_submit', async ({ ack, body, view, client }) => {
    await ack();

    const slackUserId = body.user.id;
    const metadata = JSON.parse(view.private_metadata);
    const { weekStart, userId } = metadata;
    const values = view.state.values;

    const issueTypeBlock = values.issue_type as any;
    const issueType = issueTypeBlock?.issue_type_select?.selected_option?.value;
    const issueLabel = issueTypeBlock?.issue_type_select?.selected_option?.text?.text;
    const detailsBlock = values.issue_details as any;
    const details = detailsBlock?.details_input?.value;

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('name, org_id')
      .eq('id', userId)
      .single();

    if (!user) return;

    // Get PMs/admins to notify
    const { data: managers } = await supabase
      .from('users')
      .select('slack_user_id')
      .eq('org_id', user.org_id)
      .in('role', ['pm', 'admin']);

    // Notify managers
    for (const manager of managers || []) {
      if (!manager.slack_user_id) continue;

      await client.chat.postMessage({
        channel: manager.slack_user_id,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '⚠️ Schedule Issue Flagged' }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Employee:*\n${user?.name || 'Unknown'}` },
              { type: 'mrkdwn', text: `*Week:*\n${weekStart}` },
              { type: 'mrkdwn', text: `*Issue:*\n${issueLabel}` }
            ]
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Details:*\n${details}` }
          }
        ]
      });
    }

    // Confirm to employee
    await client.chat.postMessage({
      channel: slackUserId,
      text: `✅ Your scheduling concern has been sent to your PM. They'll follow up with you soon.`
    });
  });
}
