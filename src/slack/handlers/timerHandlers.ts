/**
 * Timer Handlers - View submissions and button actions for timer commands
 */

import type { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';

// Helper: Format duration
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/**
 * Register view submission handlers for timer modals
 */
export function registerTimerViewSubmissions(app: App) {
  // Handle start_timer_modal submission
  app.view('start_timer_modal', async ({ ack, view, body, client }) => {
    await ack();

    const slackUserId = body.user.id;
    const values = view.state.values;

    const projectId = values.project_block?.project_select?.selected_option?.value;
    const notes = values.notes_block?.notes_input?.value || null;

    const metadata = JSON.parse(view.private_metadata || '{}');
    const channelId = metadata.channelId;

    if (!projectId) {
      console.error('No project selected in start_timer_modal');
      return;
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) return;

    // Check for existing timer
    const { data: existingTimer } = await supabase
      .from('time_entries_live')
      .select('id')
      .eq('user_id', user.id)
      .is('stopped_at', null)
      .eq('entry_type', 'timer')
      .single();

    if (existingTimer) {
      if (channelId) {
        await client.chat.postEphemeral({
          channel: channelId,
          user: slackUserId,
          text: '❌ You already have a timer running. Stop it first with `/stop-timer`.',
        });
      }
      return;
    }

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    // Start timer
    const now = new Date();
    const { error: createError } = await supabase.from('time_entries_live').insert({
      user_id: user.id,
      project_id: projectId,
      entry_type: 'timer',
      started_at: now.toISOString(),
      duration_minutes: 0,
      entry_date: now.toISOString().split('T')[0],
      notes,
      source: 'slack',
    });

    if (createError) {
      console.error('Failed to start timer:', createError);
      return;
    }

    // Send confirmation
    if (channelId) {
      await client.chat.postEphemeral({
        channel: channelId,
        user: slackUserId,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `⏱ *Timer started*\n\n*${project?.name || 'Project'}*\nStarted at ${now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '⏹ Stop Timer', emoji: true },
                action_id: 'stop_timer_button',
                style: 'danger',
              },
            ],
          },
        ],
      });
    }
  });

  // Handle log_time_modal submission
  app.view('log_time_modal', async ({ ack, view, body, client }) => {
    await ack();

    const slackUserId = body.user.id;
    const values = view.state.values;

    const projectId = values.project_block?.project_select?.selected_option?.value;
    const notes = values.notes_block?.notes_input?.value || null;

    const metadata = JSON.parse(view.private_metadata || '{}');
    const durationMinutes = metadata.durationMinutes;

    if (!projectId || !durationMinutes) {
      console.error('Missing data in log_time_modal');
      return;
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) return;

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    // Create manual entry
    const now = new Date();
    const { error: createError } = await supabase.from('time_entries_live').insert({
      user_id: user.id,
      project_id: projectId,
      entry_type: 'manual',
      duration_minutes: durationMinutes,
      entry_date: now.toISOString().split('T')[0],
      notes,
      source: 'slack',
    });

    if (createError) {
      console.error('Failed to log time:', createError);
      return;
    }

    // Send confirmation via DM (since we don't have channel context from modal)
    try {
      await client.chat.postMessage({
        channel: slackUserId,
        text: `✅ Logged *${formatDuration(durationMinutes)}* to *${project?.name || 'project'}*`,
      });
    } catch (err) {
      console.error('Failed to send log confirmation:', err);
    }
  });
}

/**
 * Register button action handlers for timer commands
 */
export function registerTimerActions(app: App) {
  // Stop timer button
  app.action('stop_timer_button', async ({ ack, body, client }) => {
    await ack();

    const slackUserId = body.user.id;

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) return;

    // Find running timer
    const { data: timer } = await supabase
      .from('time_entries_live')
      .select('id, started_at, project:projects(name)')
      .eq('user_id', user.id)
      .is('stopped_at', null)
      .eq('entry_type', 'timer')
      .single();

    if (!timer) {
      await client.chat.postMessage({
        channel: slackUserId,
        text: '❌ No timer running.',
      });
      return;
    }

    // Stop timer
    const now = new Date();
    const startedAt = timer.started_at ? new Date(timer.started_at).getTime() : now.getTime();
    const durationMinutes = Math.floor((now.getTime() - startedAt) / 60000);

    const { error: updateError } = await supabase
      .from('time_entries_live')
      .update({
        stopped_at: now.toISOString(),
        duration_minutes: durationMinutes,
      })
      .eq('id', timer.id);

    if (updateError) {
      console.error('Failed to stop timer:', updateError);
      return;
    }

    // Get today's total
    const today = now.toISOString().split('T')[0];
    const { data: todayEntries } = await supabase
      .from('time_entries_live')
      .select('duration_minutes')
      .eq('user_id', user.id)
      .eq('entry_date', today)
      .not('stopped_at', 'is', null);

    const todayTotal = (todayEntries || []).reduce((sum, e) => sum + e.duration_minutes, 0);

    // Send confirmation
    await client.chat.postMessage({
      channel: slackUserId,
      text: `✅ Logged *${formatDuration(durationMinutes)}* to *${(timer.project as any)?.name}*\n\nToday's total: ${formatDuration(todayTotal)}`,
    });
  });

  // Log more time button
  app.action('log_more_time_button', async ({ ack, body, client }) => {
    await ack();

    const slackUserId = body.user.id;

    // Get user's org to fetch projects
    const { data: user } = await supabase
      .from('users')
      .select('org_id')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) return;

    // Get projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, color')
      .eq('org_id', user.org_id)
      .eq('is_active', true)
      .order('name');

    if (!projects || projects.length === 0) {
      await client.chat.postMessage({
        channel: slackUserId,
        text: '❌ No active projects found.',
      });
      return;
    }

    // Open a simple log time modal (default 1 hour)
    try {
      await client.views.open({
        trigger_id: (body as any).trigger_id,
        view: {
          type: 'modal',
          callback_id: 'log_time_quick_modal',
          title: { type: 'plain_text', text: 'Log Time' },
          submit: { type: 'plain_text', text: 'Log Time' },
          close: { type: 'plain_text', text: 'Cancel' },
          blocks: [
            {
              type: 'input',
              block_id: 'project_block',
              element: {
                type: 'static_select',
                action_id: 'project_select',
                placeholder: { type: 'plain_text', text: 'Select a project...' },
                options: projects.map((p) => ({
                  text: { type: 'plain_text', text: p.name },
                  value: p.id,
                })),
              },
              label: { type: 'plain_text', text: 'Project' },
            },
            {
              type: 'input',
              block_id: 'duration_block',
              element: {
                type: 'plain_text_input',
                action_id: 'duration_input',
                placeholder: { type: 'plain_text', text: 'e.g., 2h, 30m, 1h30m' },
              },
              label: { type: 'plain_text', text: 'Duration' },
            },
            {
              type: 'input',
              block_id: 'notes_block',
              optional: true,
              element: {
                type: 'plain_text_input',
                action_id: 'notes_input',
                placeholder: { type: 'plain_text', text: 'What did you work on?' },
              },
              label: { type: 'plain_text', text: 'Notes (optional)' },
            },
          ],
        },
      });
    } catch (error) {
      console.error('Failed to open log time modal:', error);
    }
  });

  // Handle log_time_quick_modal submission
  app.view('log_time_quick_modal', async ({ ack, view, body, client }) => {
    const values = view.state.values;
    const projectId = values.project_block?.project_select?.selected_option?.value;
    const durationInput = values.duration_block?.duration_input?.value || '';
    const notes = values.notes_block?.notes_input?.value || null;

    // Parse duration
    const durationMinutes = parseDuration(durationInput);

    if (!durationMinutes || durationMinutes <= 0) {
      await ack({
        response_action: 'errors',
        errors: {
          duration_block: 'Invalid duration. Try: 2h, 30m, or 1h30m',
        },
      });
      return;
    }

    await ack();

    const slackUserId = body.user.id;

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user || !projectId) return;

    // Get project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    // Create entry
    const now = new Date();
    const { error: createError } = await supabase.from('time_entries_live').insert({
      user_id: user.id,
      project_id: projectId,
      entry_type: 'manual',
      duration_minutes: durationMinutes,
      entry_date: now.toISOString().split('T')[0],
      notes,
      source: 'slack',
    });

    if (createError) {
      console.error('Failed to log time:', createError);
      return;
    }

    // Confirm
    await client.chat.postMessage({
      channel: slackUserId,
      text: `✅ Logged *${formatDuration(durationMinutes)}* to *${project?.name || 'project'}*`,
    });
  });
}

// Helper: Parse duration string
function parseDuration(input: string): number | null {
  const trimmed = input.toLowerCase().trim();

  // "2h30m" or "2h 30m"
  const combined = trimmed.match(/^(\d+(?:\.\d+)?)\s*h\s*(\d+)\s*m?$/);
  if (combined) {
    return Math.round(parseFloat(combined[1]) * 60 + parseInt(combined[2]));
  }

  // "2h" or "2.5h"
  const hours = trimmed.match(/^(\d+(?:\.\d+)?)\s*h$/);
  if (hours) {
    return Math.round(parseFloat(hours[1]) * 60);
  }

  // "30m"
  const mins = trimmed.match(/^(\d+)\s*m$/);
  if (mins) {
    return parseInt(mins[1]);
  }

  // Just a number (assume hours)
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return Math.round(num * 60);
  }

  return null;
}
