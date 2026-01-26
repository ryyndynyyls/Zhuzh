/**
 * Disambiguation Action Handlers
 * 
 * Handles button clicks when users select from disambiguation options
 */

import type { App } from '@slack/bolt';
import {
  getPendingDisambiguation,
  clearPendingDisambiguation
} from '../lib/disambiguation';
import { supabase } from '../lib/supabase';

export function registerDisambiguationActions(app: App) {
  // Handle user selection (buttons 0-4)
  for (let i = 0; i < 5; i++) {
    app.action(`disambiguate_user_${i}`, async ({ ack, body, client }) => {
      await ack();
      
      const value = JSON.parse((body as any).actions[0].value);
      const { disambiguationId, selectedId, selectedName } = value;
      
      const pending = getPendingDisambiguation(disambiguationId);
      if (!pending) {
        await client.chat.postEphemeral({
          channel: (body as any).channel.id,
          user: body.user.id,
          text: '⚠️ This selection has expired. Please try your command again.'
        });
        return;
      }
      
      // Clear the pending disambiguation
      clearPendingDisambiguation(disambiguationId);
      
      // Resume the original command with the selected user
      await resumeCommandWithSelection(
        client,
        pending,
        { type: 'user', id: selectedId, name: selectedName },
        body.user.id,
        (body as any).channel.id
      );
    });
  }

  // Handle project selection (buttons 0-4)
  for (let i = 0; i < 5; i++) {
    app.action(`disambiguate_project_${i}`, async ({ ack, body, client }) => {
      await ack();
      
      const value = JSON.parse((body as any).actions[0].value);
      const { disambiguationId, selectedId, selectedName } = value;
      
      const pending = getPendingDisambiguation(disambiguationId);
      if (!pending) {
        await client.chat.postEphemeral({
          channel: (body as any).channel.id,
          user: body.user.id,
          text: '⚠️ This selection has expired. Please try your command again.'
        });
        return;
      }
      
      // Clear the pending disambiguation
      clearPendingDisambiguation(disambiguationId);
      
      // Resume the original command with the selected project
      await resumeCommandWithSelection(
        client,
        pending,
        { type: 'project', id: selectedId, name: selectedName },
        body.user.id,
        (body as any).channel.id
      );
    });
  }

  // Handle cancel
  app.action('disambiguate_cancel', async ({ ack, body, client }) => {
    await ack();
    
    const disambiguationId = (body as any).actions[0].value;
    clearPendingDisambiguation(disambiguationId);
    
    await client.chat.postEphemeral({
      channel: (body as any).channel.id,
      user: body.user.id,
      text: '👍 Got it, command cancelled.'
    });
  });

  // Quick add time buttons (after project disambiguation)
  const quickAddHours = [1, 2, 4, 8];
  for (const hours of quickAddHours) {
    app.action(`quick_add_${hours}h`, async ({ ack, body, client }) => {
      await ack();
      
      const value = JSON.parse((body as any).actions[0].value);
      const { projectId, weekStart } = value;
      const slackUserId = body.user.id;
      
      // Get user
      const { data: user } = await supabase
        .from('users')
        .select('id, name')
        .eq('slack_user_id', slackUserId)
        .single();

      if (!user) {
        await client.chat.postEphemeral({
          channel: (body as any).channel.id,
          user: slackUserId,
          text: '❌ Your Slack account is not linked to Zhuzh.'
        });
        return;
      }

      // Get project name
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      // Check for existing allocation
      const { data: existing } = await supabase
        .from('allocations')
        .select('id, planned_hours')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq('week_start', weekStart)
        .single();

      if (existing) {
        // Update existing allocation
        const newHours = existing.planned_hours + hours;
        await supabase
          .from('allocations')
          .update({ planned_hours: newHours })
          .eq('id', existing.id);

        await client.chat.postMessage({
          channel: slackUserId,
          text: `✅ Added ${hours}h to *${project?.name || 'Unknown'}* (week of ${weekStart}). Total: ${newHours}h`
        });
      } else {
        // Create new allocation
        await supabase
          .from('allocations')
          .insert({
            user_id: user.id,
            project_id: projectId,
            week_start: weekStart,
            planned_hours: hours,
            is_billable: true,
            created_by: user.id
          });

        await client.chat.postMessage({
          channel: slackUserId,
          text: `✅ Added ${hours}h to *${project?.name || 'Unknown'}* for week of ${weekStart}.`
        });
      }
    });
  }

  // "Other" button - would open a modal for custom hours
  app.action('quick_add_other', async ({ ack, body, client }) => {
    await ack();
    
    const value = JSON.parse((body as any).actions[0].value);
    const { projectId, weekStart } = value;
    
    // Open a simple modal for custom hours input
    await client.views.open({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        callback_id: 'quick_add_custom_hours',
        private_metadata: JSON.stringify({ projectId, weekStart }),
        title: { type: 'plain_text', text: 'Add Hours' },
        submit: { type: 'plain_text', text: 'Add' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          {
            type: 'input',
            block_id: 'hours_input',
            label: { type: 'plain_text', text: 'Hours' },
            element: {
              type: 'number_input',
              action_id: 'hours_value',
              is_decimal_allowed: true,
              min_value: '0.25',
              max_value: '40',
              placeholder: { type: 'plain_text', text: 'Enter hours...' }
            }
          },
          {
            type: 'input',
            block_id: 'notes_input',
            optional: true,
            label: { type: 'plain_text', text: 'Notes (optional)' },
            element: {
              type: 'plain_text_input',
              action_id: 'notes_value',
              placeholder: { type: 'plain_text', text: 'What did you work on?' }
            }
          }
        ]
      }
    });
  });

  // Handle custom hours modal submission
  app.view('quick_add_custom_hours', async ({ ack, body, view, client }) => {
    await ack();
    
    const slackUserId = body.user.id;
    const { projectId, weekStart } = JSON.parse(view.private_metadata);
    const values = view.state.values;
    const hours = parseFloat((values.hours_input as any)?.hours_value?.value || '0');
    const notes = (values.notes_input as any)?.notes_value?.value || null;

    if (hours <= 0) {
      return;
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) return;

    // Get project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    // Check for existing allocation
    const { data: existing } = await supabase
      .from('allocations')
      .select('id, planned_hours')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .eq('week_start', weekStart)
      .single();

    if (existing) {
      const newHours = existing.planned_hours + hours;
      await supabase
        .from('allocations')
        .update({ planned_hours: newHours, notes })
        .eq('id', existing.id);

      await client.chat.postMessage({
        channel: slackUserId,
        text: `✅ Added ${hours}h to *${project?.name || 'Unknown'}* (week of ${weekStart}). Total: ${newHours}h`
      });
    } else {
      await supabase
        .from('allocations')
        .insert({
          user_id: user.id,
          project_id: projectId,
          week_start: weekStart,
          planned_hours: hours,
          is_billable: true,
          notes,
          created_by: user.id
        });

      await client.chat.postMessage({
        channel: slackUserId,
        text: `✅ Added ${hours}h to *${project?.name || 'Unknown'}* for week of ${weekStart}.`
      });
    }
  });
}

/**
 * Resume the original command with the user's selection
 */
async function resumeCommandWithSelection(
  client: any,
  pending: any,
  selection: { type: 'user' | 'project'; id: string; name: string },
  slackUserId: string,
  channelId: string
): Promise<void> {
  const context = pending.context;
  
  // Store the selected ID in the context
  if (selection.type === 'user') {
    context.selectedUserId = selection.id;
    context.selectedUserName = selection.name;
  } else {
    context.selectedProjectId = selection.id;
    context.selectedProjectName = selection.name;
  }

  // Handle different command types
  switch (pending.commandType) {
    case 'add_time':
      await handleAddTimeResume(client, context, slackUserId, channelId, selection);
      break;
    
    case 'voice':
      await handleVoiceCommandResume(client, context, slackUserId, channelId, selection);
      break;
    
    default:
      // Generic confirmation
      await client.chat.postEphemeral({
        channel: channelId,
        user: slackUserId,
        text: `✅ Selected: *${selection.name}*. Processing your request...`
      });
  }
}

/**
 * Resume /add-time command after disambiguation
 */
async function handleAddTimeResume(
  client: any,
  context: any,
  slackUserId: string,
  channelId: string,
  selection: { type: 'user' | 'project'; id: string; name: string }
): Promise<void> {
  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('slack_user_id', slackUserId)
    .single();

  if (!user) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: '❌ Your Slack account is not linked to Zhuzh.'
    });
    return;
  }

  // If we just resolved a project selection, show success and prompt for more details
  if (selection.type === 'project') {
    const projectName = selection.name;
    const weekStart = context.weekStart || getCurrentWeekStart();
    
    // Just confirm and let them use the modal
    await client.chat.postMessage({
      channel: slackUserId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ Got it! You want to add time to *${projectName}*.\n\nHow many hours would you like to log?`
          }
        },
        {
          type: 'actions',
          elements: [
            { type: 'button', text: { type: 'plain_text', text: '1h' }, action_id: 'quick_add_1h', value: JSON.stringify({ projectId: selection.id, hours: 1, weekStart }) },
            { type: 'button', text: { type: 'plain_text', text: '2h' }, action_id: 'quick_add_2h', value: JSON.stringify({ projectId: selection.id, hours: 2, weekStart }) },
            { type: 'button', text: { type: 'plain_text', text: '4h' }, action_id: 'quick_add_4h', value: JSON.stringify({ projectId: selection.id, hours: 4, weekStart }) },
            { type: 'button', text: { type: 'plain_text', text: '8h' }, action_id: 'quick_add_8h', value: JSON.stringify({ projectId: selection.id, hours: 8, weekStart }) },
            { type: 'button', text: { type: 'plain_text', text: 'Other...' }, action_id: 'quick_add_other', style: 'primary', value: JSON.stringify({ projectId: selection.id, weekStart }) }
          ]
        }
      ],
      text: `Add time to ${projectName}`
    });
  }
}

/**
 * Resume voice command after disambiguation
 */
async function handleVoiceCommandResume(
  client: any,
  context: any,
  slackUserId: string,
  channelId: string,
  selection: { type: 'user' | 'project'; id: string; name: string }
): Promise<void> {
  // Re-process the original command with the resolved entity
  const originalCommand = context.originalCommand;
  
  // Build a modified command that includes the full name for clarity
  let clarifiedCommand = originalCommand;
  if (selection.type === 'user') {
    // Replace ambiguous name with full name in the command
    clarifiedCommand = `${originalCommand} (${selection.name})`;
  } else {
    clarifiedCommand = `${originalCommand} (${selection.name})`;
  }
  
  // For now, just confirm the selection
  // In a full implementation, this would call the voice processing endpoint
  await client.chat.postMessage({
    channel: slackUserId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Got it!* Using *${selection.name}*.\n\nProcessing: _"${originalCommand}"_`
        }
      }
    ],
    text: `Using ${selection.name} for: ${originalCommand}`
  });
  
  // TODO: Call the voice processing endpoint with the resolved context
  // This would re-run the command through Gemini with the disambiguated entity
}

/**
 * Get the Monday of the current week
 */
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}
