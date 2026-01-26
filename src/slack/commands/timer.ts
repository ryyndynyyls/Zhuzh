/**
 * Timer Slack Commands
 *
 * /start-timer [project] - Start a timer for a project
 * /stop-timer           - Stop the running timer
 * /log-time 2h [project] - Log time manually
 * /time-status          - Show today's time breakdown
 *
 * These commands require time_tracking_enabled to be true for the user.
 */

import type { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';

// Helper: Get week start (Monday)
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Helper: Format duration in minutes to "Xh Ym"
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// Helper: Parse duration string (e.g., "2h", "1.5h", "30m", "2h30m")
function parseDuration(input: string): number | null {
  const trimmed = input.toLowerCase().trim();

  // Try "2h30m" or "2h 30m" format
  const combined = trimmed.match(/^(\d+(?:\.\d+)?)\s*h\s*(\d+)\s*m?$/);
  if (combined) {
    return Math.round(parseFloat(combined[1]) * 60 + parseInt(combined[2]));
  }

  // Try "2h" or "2.5h" format
  const hours = trimmed.match(/^(\d+(?:\.\d+)?)\s*h$/);
  if (hours) {
    return Math.round(parseFloat(hours[1]) * 60);
  }

  // Try "30m" format
  const mins = trimmed.match(/^(\d+)\s*m$/);
  if (mins) {
    return parseInt(mins[1]);
  }

  // Try just a number (assume hours)
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return Math.round(num * 60);
  }

  return null;
}

// Helper: Fuzzy match project name
async function findProject(query: string, orgId: string): Promise<any | null> {
  const q = query.toLowerCase().trim();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, color')
    .eq('org_id', orgId)
    .eq('is_active', true);

  if (!projects || projects.length === 0) return null;

  // Exact match first
  const exact = projects.find((p) => p.name.toLowerCase() === q);
  if (exact) return exact;

  // Starts with
  const startsWith = projects.find((p) => p.name.toLowerCase().startsWith(q));
  if (startsWith) return startsWith;

  // Contains
  const contains = projects.find((p) => p.name.toLowerCase().includes(q));
  if (contains) return contains;

  // Abbreviation match (e.g., "gcn" -> "Google Cloud Next")
  const abbrev = projects.find((p) => {
    const initials = p.name
      .split(/\s+/)
      .map((w: string) => w[0]?.toLowerCase())
      .join('');
    return initials === q;
  });
  if (abbrev) return abbrev;

  return null;
}

// Helper: Get channel's linked project (if any)
async function getChannelProject(channelId: string, orgId: string): Promise<any | null> {
  const { data } = await supabase
    .from('slack_channel_projects')
    .select('project_id, project:projects(id, name, color)')
    .eq('slack_channel_id', channelId)
    .eq('org_id', orgId)
    .single();

  return data?.project || null;
}

/**
 * /start-timer [project] - Start a timer
 */
export function registerStartTimerCommand(app: App) {
  app.command('/start-timer', async ({ command, ack, client, respond }) => {
    await ack();

    const slackUserId = command.user_id;
    const channelId = command.channel_id;
    const projectQuery = command.text?.trim();

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, org_id, time_tracking_enabled')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) {
      await respond({ response_type: 'ephemeral',
        
        
        text: '❌ Your Slack account is not linked to Zhuzh. Please contact an admin.',
      });
      return;
    }

    if (!user.time_tracking_enabled) {
      await respond({ response_type: 'ephemeral',
        
        
        text: '❌ Time tracking is not enabled for your account. Enable it in *Settings → Timesheet Preferences*.',
      });
      return;
    }

    // Check for existing running timer
    const { data: existingTimer } = await supabase
      .from('time_entries_live')
      .select('id, project_id, started_at, project:projects(name)')
      .eq('user_id', user.id)
      .is('stopped_at', null)
      .eq('entry_type', 'timer')
      .single();

    if (existingTimer) {
      const elapsed = Math.floor(
        (Date.now() - new Date(existingTimer.started_at).getTime()) / 60000
      );
      await respond({ response_type: 'ephemeral',
        
        
        text: `⏱ You already have a timer running on *${(existingTimer.project as any)?.name}* (${formatDuration(elapsed)}). Use \`/stop-timer\` first.`,
      });
      return;
    }

    // Find the project
    let project: any = null;

    if (projectQuery) {
      // User specified a project
      project = await findProject(projectQuery, user.org_id);

      if (!project) {
        // Couldn't find it - show disambiguation
        const { data: allProjects } = await supabase
          .from('projects')
          .select('id, name')
          .eq('org_id', user.org_id)
          .eq('is_active', true)
          .order('name')
          .limit(10);

        const projectList = (allProjects || [])
          .map((p) => `• ${p.name}`)
          .join('\n');

        await respond({ response_type: 'ephemeral',
          
          
          text: `❓ Couldn't find a project matching "${projectQuery}".\n\nTry one of these:\n${projectList}\n\nOr use the exact project name.`,
        });
        return;
      }
    } else {
      // No project specified - try channel-linked project
      project = await getChannelProject(channelId, user.org_id);

      if (!project) {
        // Open a modal to pick a project
        const { data: allProjects } = await supabase
          .from('projects')
          .select('id, name, color')
          .eq('org_id', user.org_id)
          .eq('is_active', true)
          .order('name');

        if (!allProjects || allProjects.length === 0) {
          await respond({ response_type: 'ephemeral',
            
            
            text: '❌ No active projects found.',
          });
          return;
        }

        try {
          await client.views.open({
            trigger_id: command.trigger_id,
            view: buildStartTimerModal(allProjects, channelId),
          });
        } catch (error) {
          console.error('Failed to open start-timer modal:', error);
          await respond({ response_type: 'ephemeral',
            
            
            text: '❌ Failed to open project picker. Try `/start-timer Project Name` instead.',
          });
        }
        return;
      }
    }

    // Start the timer
    const now = new Date();
    const { data: timer, error: createError } = await supabase
      .from('time_entries_live')
      .insert({
        user_id: user.id,
        project_id: project.id,
        entry_type: 'timer',
        started_at: now.toISOString(),
        duration_minutes: 0,
        entry_date: now.toISOString().split('T')[0],
        source: 'slack',
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to start timer:', createError);
      await respond({ response_type: 'ephemeral',
        
        
        text: '❌ Failed to start timer. Please try again.',
      });
      return;
    }

    // Success message
    const isChannelLinked = await getChannelProject(channelId, user.org_id);
    const channelNote = isChannelLinked
      ? `\n_This channel is linked to ${project.name}_`
      : '';

    await respond({ response_type: 'ephemeral',
      
      
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⏱ *Timer started*\n\n*${project.name}*\nStarted at ${now.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}${channelNote}`,
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
  });
}

/**
 * /stop-timer - Stop the running timer
 */
export function registerStopTimerCommand(app: App) {
  app.command('/stop-timer', async ({ command, ack, client, respond }) => {
    await ack();

    const slackUserId = command.user_id;
    const channelId = command.channel_id;
    const notes = command.text?.trim();

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, time_tracking_enabled')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) {
      await respond({ response_type: 'ephemeral',
        
        
        text: '❌ Your Slack account is not linked to Zhuzh.',
      });
      return;
    }

    // Find running timer
    const { data: timer } = await supabase
      .from('time_entries_live')
      .select('id, started_at, project_id, notes, project:projects(name, color)')
      .eq('user_id', user.id)
      .is('stopped_at', null)
      .eq('entry_type', 'timer')
      .single();

    if (!timer) {
      await respond({ response_type: 'ephemeral',
        
        
        text: '❌ No timer running. Use `/start-timer [project]` to start one.',
      });
      return;
    }

    // Calculate duration
    const now = new Date();
    const durationMinutes = Math.floor(
      (now.getTime() - new Date(timer.started_at).getTime()) / 60000
    );

    // Stop the timer
    const combinedNotes = notes
      ? timer.notes
        ? `${timer.notes}\n${notes}`
        : notes
      : timer.notes;

    const { error: updateError } = await supabase
      .from('time_entries_live')
      .update({
        stopped_at: now.toISOString(),
        duration_minutes: durationMinutes,
        notes: combinedNotes,
      })
      .eq('id', timer.id);

    if (updateError) {
      console.error('Failed to stop timer:', updateError);
      await respond({ response_type: 'ephemeral',
        
        
        text: '❌ Failed to stop timer. Please try again.',
      });
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

    const todayTotal = (todayEntries || []).reduce(
      (sum, e) => sum + e.duration_minutes,
      0
    );

    // Success message
    await respond({ response_type: 'ephemeral',
      
      
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Time logged*\n\n*${(timer.project as any)?.name}*\nDuration: *${formatDuration(durationMinutes)}*\n\nToday's total: ${formatDuration(todayTotal)}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '📊 View Timesheet', emoji: true },
              url: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/timesheet`,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '➕ Log More', emoji: true },
              action_id: 'log_more_time_button',
            },
          ],
        },
      ],
    });
  });
}

/**
 * /log-time 2h [project] - Log time manually
 */
export function registerLogTimeCommand(app: App) {
  app.command('/log-time', async ({ command, ack, client, respond }) => {
    await ack();

    const slackUserId = command.user_id;
    const channelId = command.channel_id;
    const text = command.text?.trim() || '';

    // Parse the command text: "2h Project Name" or "2h30m" or just "2h"
    const parts = text.split(/\s+/);
    const durationPart = parts[0];
    const projectQuery = parts.slice(1).join(' ');

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, org_id, time_tracking_enabled')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) {
      await respond({ response_type: 'ephemeral',
        
        
        text: '❌ Your Slack account is not linked to Zhuzh.',
      });
      return;
    }

    if (!user.time_tracking_enabled) {
      await respond({ response_type: 'ephemeral',
        
        
        text: '❌ Time tracking is not enabled. Enable it in *Settings → Timesheet Preferences*.',
      });
      return;
    }

    // Parse duration
    const durationMinutes = parseDuration(durationPart);
    if (!durationMinutes || durationMinutes <= 0) {
      await respond({ response_type: 'ephemeral',
        
        
        text: '❌ Invalid duration. Examples: `2h`, `1.5h`, `30m`, `2h30m`\n\nUsage: `/log-time 2h Project Name`',
      });
      return;
    }

    if (durationMinutes > 24 * 60) {
      await respond({ response_type: 'ephemeral',
        
        
        text: '❌ Duration cannot exceed 24 hours.',
      });
      return;
    }

    // Find project
    let project: any = null;

    if (projectQuery) {
      project = await findProject(projectQuery, user.org_id);
    } else {
      // Try channel-linked project
      project = await getChannelProject(channelId, user.org_id);
    }

    if (!project) {
      // Open modal to pick project
      const { data: allProjects } = await supabase
        .from('projects')
        .select('id, name, color')
        .eq('org_id', user.org_id)
        .eq('is_active', true)
        .order('name');

      if (!allProjects || allProjects.length === 0) {
        await respond({ response_type: 'ephemeral',
          
          
          text: '❌ No active projects found.',
        });
        return;
      }

      try {
        await client.views.open({
          trigger_id: command.trigger_id,
          view: buildLogTimeModal(allProjects, durationMinutes),
        });
      } catch (error) {
        console.error('Failed to open log-time modal:', error);
        await respond({ response_type: 'ephemeral',
          
          
          text: '❌ Failed to open project picker. Try `/log-time 2h Project Name` instead.',
        });
      }
      return;
    }

    // Create manual entry
    const now = new Date();
    const { error: createError } = await supabase.from('time_entries_live').insert({
      user_id: user.id,
      project_id: project.id,
      entry_type: 'manual',
      duration_minutes: durationMinutes,
      entry_date: now.toISOString().split('T')[0],
      source: 'slack',
    });

    if (createError) {
      console.error('Failed to log time:', createError);
      await respond({ response_type: 'ephemeral',
        
        
        text: '❌ Failed to log time. Please try again.',
      });
      return;
    }

    await respond({ response_type: 'ephemeral',
      
      
      text: `✅ Logged *${formatDuration(durationMinutes)}* to *${project.name}*`,
    });
  });
}

/**
 * /time-status - Show today's time breakdown
 */
export function registerTimeStatusCommand(app: App) {
  app.command('/time-status', async ({ command, ack, client, respond }) => {
    await ack();

    const slackUserId = command.user_id;
    const channelId = command.channel_id;

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, time_tracking_enabled')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) {
      await respond({ response_type: 'ephemeral',
        
        
        text: '❌ Your Slack account is not linked to Zhuzh.',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Get today's entries
    const { data: entries } = await supabase
      .from('time_entries_live')
      .select('duration_minutes, project_id, project:projects(name, color)')
      .eq('user_id', user.id)
      .eq('entry_date', today)
      .or('entry_type.eq.manual,stopped_at.not.is.null');

    // Check for running timer
    const { data: runningTimer } = await supabase
      .from('time_entries_live')
      .select('started_at, project:projects(name)')
      .eq('user_id', user.id)
      .is('stopped_at', null)
      .eq('entry_type', 'timer')
      .single();

    // Group by project
    const byProject: Record<string, { name: string; color: string; minutes: number }> = {};

    for (const entry of entries || []) {
      const projectId = entry.project_id;
      const projectName = (entry.project as any)?.name || 'Unknown';
      const projectColor = (entry.project as any)?.color || '#FF8731';

      if (!byProject[projectId]) {
        byProject[projectId] = { name: projectName, color: projectColor, minutes: 0 };
      }
      byProject[projectId].minutes += entry.duration_minutes;
    }

    const projectList = Object.values(byProject);
    const totalMinutes = projectList.reduce((sum, p) => sum + p.minutes, 0);

    // Running timer info
    let runningInfo = '';
    if (runningTimer) {
      const runningElapsed = Math.floor(
        (Date.now() - new Date(runningTimer.started_at).getTime()) / 60000
      );
      runningInfo = `\n\n⏱ *Currently tracking:* ${(runningTimer.project as any)?.name} (${formatDuration(runningElapsed)})`;
    }

    // Build message
    if (projectList.length === 0 && !runningTimer) {
      await respond({ response_type: 'ephemeral',
        
        
        text: `📊 *Today's Time — ${new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}*\n\nNo time logged yet today. Use \`/start-timer\` or \`/log-time\` to get started!`,
      });
      return;
    }

    const projectLines = projectList
      .sort((a, b) => b.minutes - a.minutes)
      .map((p) => `• *${p.name}* — ${formatDuration(p.minutes)}`)
      .join('\n');

    await respond({ response_type: 'ephemeral',
      
      
      text: `📊 *Today's Time — ${new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}*\n\n${projectLines}\n━━━━━━━━━━━━━━━━\n*Total:* ${formatDuration(totalMinutes)}${runningInfo}`,
    });
  });
}

/**
 * Modal: Start Timer (project picker)
 */
function buildStartTimerModal(
  projects: Array<{ id: string; name: string; color: string }>,
  channelId: string
): any {
  return {
    type: 'modal',
    callback_id: 'start_timer_modal',
    private_metadata: JSON.stringify({ channelId }),
    title: {
      type: 'plain_text',
      text: 'Start Timer',
    },
    submit: {
      type: 'plain_text',
      text: 'Start',
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
    },
    blocks: [
      {
        type: 'input',
        block_id: 'project_block',
        element: {
          type: 'static_select',
          action_id: 'project_select',
          placeholder: {
            type: 'plain_text',
            text: 'Select a project...',
          },
          options: projects.map((p) => ({
            text: { type: 'plain_text', text: p.name },
            value: p.id,
          })),
        },
        label: {
          type: 'plain_text',
          text: 'Project',
        },
      },
      {
        type: 'input',
        block_id: 'notes_block',
        optional: true,
        element: {
          type: 'plain_text_input',
          action_id: 'notes_input',
          placeholder: {
            type: 'plain_text',
            text: 'What are you working on?',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Notes (optional)',
        },
      },
    ],
  };
}

/**
 * Modal: Log Time (project picker)
 */
function buildLogTimeModal(
  projects: Array<{ id: string; name: string; color: string }>,
  durationMinutes: number
): any {
  return {
    type: 'modal',
    callback_id: 'log_time_modal',
    private_metadata: JSON.stringify({ durationMinutes }),
    title: {
      type: 'plain_text',
      text: 'Log Time',
    },
    submit: {
      type: 'plain_text',
      text: 'Log Time',
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Logging *${formatDuration(durationMinutes)}*`,
        },
      },
      {
        type: 'input',
        block_id: 'project_block',
        element: {
          type: 'static_select',
          action_id: 'project_select',
          placeholder: {
            type: 'plain_text',
            text: 'Select a project...',
          },
          options: projects.map((p) => ({
            text: { type: 'plain_text', text: p.name },
            value: p.id,
          })),
        },
        label: {
          type: 'plain_text',
          text: 'Project',
        },
      },
      {
        type: 'input',
        block_id: 'notes_block',
        optional: true,
        element: {
          type: 'plain_text_input',
          action_id: 'notes_input',
          placeholder: {
            type: 'plain_text',
            text: 'What did you work on?',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Notes (optional)',
        },
      },
    ],
  };
}
