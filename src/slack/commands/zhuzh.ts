/**
 * /zhuzh Command - Natural Language Interface
 * 
 * The main entry point for natural language resource management.
 * Handles disambiguation conversationally when needed.
 * 
 * Usage:
 *   /zhuzh add 4h to GCN for Ryan next week
 *   /zhuzh show me Ryan's hours
 *   /zhuzh who's available next week?
 *   /zhuzh how's the Agent Challenge budget?
 */

import type { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';
import {
  findProjectMatches,
  findUserMatches,
} from '../lib/disambiguation';
import {
  sendDisambiguationMessage,
  sendHoursPrompt,
} from '../handlers/conversational';

// Simple intent patterns
const PATTERNS = {
  addTime: /^add\s+(\d+(?:\.\d+)?)\s*h(?:ours?)?\s+(?:to\s+)?(.+?)(?:\s+for\s+(.+?))?(?:\s+(this|next)\s+week)?$/i,
  addTimeTo: /^add\s+(?:time|hours?)\s+(?:to\s+)?(.+)$/i,
  showHours: /^(?:show|get|what(?:'s| is))\s+(?:me\s+)?(.+?)(?:'s)?\s+hours?/i,
  projectStatus: /^(?:how(?:'s| is)|show|get)\s+(?:the\s+)?(.+?)\s+(?:budget|status|doing)/i,
  whoAvailable: /^who(?:'s| is)\s+(?:available|free)/i,
  // Timer patterns
  timerStart: /^start(?:\s+(.+))?$/i,
  timerStop: /^stop(?:\s+(.*))?$/i,
  timerLog: /^log\s+(\d+(?:\.\d+)?)\s*h(?:ours?)?(?:\s*(\d+)\s*m(?:in(?:ute)?s?)?)?(?:\s+(?:to\s+)?(.+))?$/i,
  timerStatus: /^(?:status|today|time)$/i,
};

export function registerZhuzh(app: App) {
  app.command('/zhuzh', async ({ command, ack, client }) => {
    await ack();
    
    const slackUserId = command.user_id;
    const channelId = command.channel_id;
    const text = command.text?.trim() || '';
    
    // Get user from database
    const { data: user } = await supabase
      .from('users')
      .select('id, name, org_id, role')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) {
      await client.chat.postEphemeral({
        channel: channelId,
        user: slackUserId,
        text: '❌ Your Slack account is not linked to Zhuzh. Please contact an admin.'
      });
      return;
    }

    // No text = show help
    if (!text) {
      await client.chat.postEphemeral({
        channel: channelId,
        user: slackUserId,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*👋 Hey! I\'m Zhuzh, your resource management assistant.*\n\nHere are some things you can ask me:'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Time Tracking*\n' +
                    '- `/zhuzh start [project]` - Start a timer\n' +
                    '- `/zhuzh stop` - Stop the running timer\n' +
                    '- `/zhuzh log 2h [project]` - Log time manually\n' +
                    '- `/zhuzh status` - Todays time breakdown\n\n' +
                    '*Resource Management*\n' +
                    '- `/zhuzh add 4h to [project]` - Add planned hours\n' +
                    '- `/zhuzh show my hours` - See your allocations\n' +
                    '- `/zhuzh hows [project] budget?` - Check project status\n' +
                    '- `/zhuzh whos available next week?` - Find availability'
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '_Tip: I understand project aliases! "GCN" → "Google Cloud Next 2026"_'
              }
            ]
          }
        ],
        text: 'I\'m Zhuzh, your resource management assistant.'
      });
      return;
    }

    // Parse the command
    await parseAndExecute(client, user, channelId, slackUserId, text);
  });
}

async function parseAndExecute(
  client: any,
  user: { id: string; name: string; org_id: string; role: string },
  channelId: string,
  slackUserId: string,
  text: string
): Promise<void> {
  const orgId = user.org_id;
  const weekStart = getCurrentWeekStart();
  const nextWeekStart = getNextWeekStart();

  // Timer: start
  const timerStartMatch = text.match(PATTERNS.timerStart);
  if (timerStartMatch) {
    await handleTimerStart(client, user, channelId, slackUserId, timerStartMatch[1]);
    return;
  }

  // Timer: stop
  const timerStopMatch = text.match(PATTERNS.timerStop);
  if (timerStopMatch) {
    await handleTimerStop(client, user, channelId, slackUserId, timerStopMatch[1]);
    return;
  }

  // Timer: log 2h [project]
  const timerLogMatch = text.match(PATTERNS.timerLog);
  if (timerLogMatch) {
    const hours = parseFloat(timerLogMatch[1]);
    const mins = timerLogMatch[2] ? parseInt(timerLogMatch[2]) : 0;
    await handleTimerLog(client, user, channelId, slackUserId, hours, mins, timerLogMatch[3]);
    return;
  }

  // Timer: status
  const timerStatusMatch = text.match(PATTERNS.timerStatus);
  if (timerStatusMatch) {
    await handleTimerStatus(client, user, channelId, slackUserId);
    return;
  }

  // Pattern: add 4h to [project]
  const addTimeMatch = text.match(PATTERNS.addTime);
  if (addTimeMatch) {
    const [, hoursStr, projectQuery, userQuery, weekType] = addTimeMatch;
    const hours = parseFloat(hoursStr);
    const targetWeek = weekType === 'next' ? nextWeekStart : weekStart;
    
    // Find the project
    const projectMatches = await findProjectMatches(orgId, projectQuery);
    
    if (projectMatches.length === 0) {
      await client.chat.postMessage({
        channel: slackUserId,
        text: `❌ I couldn't find a project matching "${projectQuery}". Try a different name or check the project list.`
      });
      return;
    }
    
    // Check if disambiguation needed
    if (projectMatches.length > 1 && projectMatches[0].score < 95) {
      // Need disambiguation
      await sendDisambiguationMessage(
        client,
        slackUserId,  // DM the user
        slackUserId,
        'project',
        projectQuery,
        projectMatches.slice(0, 5).map(p => ({ id: p.id, name: p.name, detail: p.client_name })),
        text,
        { hours, targetUser: userQuery, weekStart: targetWeek }
      );
      return;
    }
    
    // Single match - proceed
    const project = projectMatches[0];
    
    // If a user was specified (for PMs/admins), resolve that too
    if (userQuery && (user.role === 'pm' || user.role === 'admin')) {
      const userMatches = await findUserMatches(orgId, userQuery);
      
      if (userMatches.length === 0) {
        await client.chat.postMessage({
          channel: slackUserId,
          text: `❌ I couldn't find anyone named "${userQuery}".`
        });
        return;
      }
      
      if (userMatches.length > 1 && userMatches[0].score < 95) {
        // Need user disambiguation
        await sendDisambiguationMessage(
          client,
          slackUserId,
          slackUserId,
          'user',
          userQuery,
          userMatches.slice(0, 5).map(u => ({ id: u.id, name: u.name, detail: u.job_title || u.role })),
          text,
          { hours, project, weekStart: targetWeek }
        );
        return;
      }
      
      // Add hours for the specified user
      const targetUser = userMatches[0];
      await addHoursToProject(client, slackUserId, targetUser.id, targetUser.name, project.id, project.name, hours, targetWeek);
    } else {
      // Add hours for the current user
      await addHoursToProject(client, slackUserId, user.id, user.name, project.id, project.name, hours, targetWeek);
    }
    return;
  }

  // Pattern: add time to [project] (no hours specified)
  const addTimeToMatch = text.match(PATTERNS.addTimeTo);
  if (addTimeToMatch) {
    const [, projectQuery] = addTimeToMatch;
    
    const projectMatches = await findProjectMatches(orgId, projectQuery);
    
    if (projectMatches.length === 0) {
      await client.chat.postMessage({
        channel: slackUserId,
        text: `❌ I couldn't find a project matching "${projectQuery}".`
      });
      return;
    }
    
    if (projectMatches.length > 1 && projectMatches[0].score < 95) {
      await sendDisambiguationMessage(
        client,
        slackUserId,
        slackUserId,
        'project',
        projectQuery,
        projectMatches.slice(0, 5).map(p => ({ id: p.id, name: p.name, detail: p.client_name })),
        text,
        { weekStart }
      );
      return;
    }
    
    // Ask for hours
    const project = projectMatches[0];
    await sendHoursPrompt(client, slackUserId, slackUserId, project.name, project.id, weekStart, {});
    return;
  }

  // Pattern: show [user]'s hours
  const showHoursMatch = text.match(PATTERNS.showHours);
  if (showHoursMatch) {
    const [, userQuery] = showHoursMatch;
    
    // "my hours" = current user
    if (userQuery.toLowerCase() === 'my' || userQuery.toLowerCase() === 'me') {
      await showUserHours(client, slackUserId, user.id, user.name, weekStart);
      return;
    }
    
    const userMatches = await findUserMatches(orgId, userQuery);
    
    if (userMatches.length === 0) {
      await client.chat.postMessage({
        channel: slackUserId,
        text: `❌ I couldn't find anyone named "${userQuery}".`
      });
      return;
    }
    
    if (userMatches.length > 1 && userMatches[0].score < 95) {
      await sendDisambiguationMessage(
        client,
        slackUserId,
        slackUserId,
        'user',
        userQuery,
        userMatches.slice(0, 5).map(u => ({ id: u.id, name: u.name, detail: u.job_title || u.role })),
        text,
        { action: 'show_hours', weekStart }
      );
      return;
    }
    
    const targetUser = userMatches[0];
    await showUserHours(client, slackUserId, targetUser.id, targetUser.name, weekStart);
    return;
  }

  // Pattern: project status
  const projectStatusMatch = text.match(PATTERNS.projectStatus);
  if (projectStatusMatch) {
    const [, projectQuery] = projectStatusMatch;
    
    const projectMatches = await findProjectMatches(orgId, projectQuery);
    
    if (projectMatches.length === 0) {
      await client.chat.postMessage({
        channel: slackUserId,
        text: `❌ I couldn't find a project matching "${projectQuery}".`
      });
      return;
    }
    
    if (projectMatches.length > 1 && projectMatches[0].score < 95) {
      await sendDisambiguationMessage(
        client,
        slackUserId,
        slackUserId,
        'project',
        projectQuery,
        projectMatches.slice(0, 5).map(p => ({ id: p.id, name: p.name, detail: p.client_name })),
        text,
        { action: 'project_status' }
      );
      return;
    }
    
    await showProjectStatus(client, slackUserId, projectMatches[0].id);
    return;
  }

  // Fallback: didn't understand
  await client.chat.postMessage({
    channel: slackUserId,
    text: `🤔 I didn't quite understand that. Try:\n- \`add 4h to [project]\`\n- \`show my hours\`\n- \`how's [project] budget?\``
  });
}

// =============================================================================
// Action Executors
// =============================================================================

async function addHoursToProject(
  client: any,
  channelId: string,
  userId: string,
  userName: string,
  projectId: string,
  projectName: string,
  hours: number,
  weekStart: string
): Promise<void> {
  // Get org_id for the user
  const { data: userInfo } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', userId)
    .single();

  // Check for existing allocation
  const { data: existing } = await supabase
    .from('allocations')
    .select('id, planned_hours')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('week_start', weekStart)
    .single();

  let totalHours = hours;

  if (existing) {
    totalHours = existing.planned_hours + hours;
    await supabase
      .from('allocations')
      .update({ planned_hours: totalHours })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('allocations')
      .insert({
        user_id: userId,
        project_id: projectId,
        week_start: weekStart,
        planned_hours: hours,
        is_billable: true,
        created_by: userId,
        org_id: userInfo?.org_id
      });
  }

  const weekLabel = formatWeekLabel(weekStart);
  const existingNote = existing ? ` (total: ${totalHours}h)` : '';

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ Added *${hours}h* to *${projectName}* for ${userName}${existingNote}`
        }
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `📅 ${weekLabel}` }
        ]
      }
    ],
    text: `Added ${hours}h to ${projectName}`
  });
}

async function showUserHours(
  client: any,
  channelId: string,
  userId: string,
  userName: string,
  weekStart: string
): Promise<void> {
  const { data: allocations } = await supabase
    .from('allocations')
    .select('planned_hours, project:projects(name)')
    .eq('user_id', userId)
    .eq('week_start', weekStart);

  if (!allocations || allocations.length === 0) {
    await client.chat.postMessage({
      channel: channelId,
      text: `📊 *${userName}* has no allocations for the week of ${weekStart}.`
    });
    return;
  }

  const totalHours = allocations.reduce((sum, a) => sum + a.planned_hours, 0);
  const projectList = allocations
    .map(a => `- ${(a.project as any)?.name || 'Unknown'}: *${a.planned_hours}h*`)
    .join('\n');

  const weekLabel = formatWeekLabel(weekStart);

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📊 *${userName}'s hours* for ${weekLabel}:\n\n${projectList}\n\n*Total: ${totalHours}h*`
        }
      }
    ],
    text: `${userName}'s hours: ${totalHours}h`
  });
}

async function showProjectStatus(
  client: any,
  channelId: string,
  projectId: string
): Promise<void> {
  const { data: project } = await supabase
    .from('projects')
    .select('name, budget_hours, client:clients(name)')
    .eq('id', projectId)
    .single();

  if (!project) {
    await client.chat.postMessage({
      channel: channelId,
      text: '❌ Project not found.'
    });
    return;
  }

  // Get hours used from time entries
  const { data: entries } = await supabase
    .from('time_entries')
    .select('actual_hours')
    .eq('project_id', projectId);

  const hoursUsed = entries?.reduce((sum, e) => sum + (e.actual_hours || 0), 0) || 0;
  const budgetPct = project.budget_hours > 0 
    ? Math.round((hoursUsed / project.budget_hours) * 100) 
    : 0;
  const remaining = project.budget_hours - hoursUsed;

  let statusEmoji = '🟢';
  if (budgetPct >= 100) statusEmoji = '🔴';
  else if (budgetPct >= 75) statusEmoji = '🟡';

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${statusEmoji} *${project.name}*\n_${(project.client as any)?.name || 'No Client'}_`
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Budget:*\n${project.budget_hours}h` },
          { type: 'mrkdwn', text: `*Used:*\n${hoursUsed}h (${budgetPct}%)` },
          { type: 'mrkdwn', text: `*Remaining:*\n${remaining}h` }
        ]
      }
    ],
    text: `${project.name}: ${hoursUsed}/${project.budget_hours}h (${budgetPct}%)`
  });
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

function getNextWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + 7;
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

// =============================================================================
// Timer Functions (Live Time Tracking)
// =============================================================================

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

async function handleTimerStart(
  client: any,
  user: { id: string; name: string; org_id: string },
  channelId: string,
  slackUserId: string,
  projectQuery: string | undefined
): Promise<void> {
  // Check if time tracking is enabled
  const { data: userSettings } = await supabase
    .from('users')
    .select('time_tracking_enabled')
    .eq('id', user.id)
    .single();

  if (!userSettings?.time_tracking_enabled) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: '❌ Time tracking is not enabled. Enable it in *Settings → Timesheet Preferences* in the web app.',
    });
    return;
  }

  // Check for existing running timer
  const { data: existingTimer } = await supabase
    .from('time_entries_live')
    .select('id, started_at, project:projects(name)')
    .eq('user_id', user.id)
    .is('stopped_at', null)
    .eq('entry_type', 'timer')
    .single();

  if (existingTimer) {
    const elapsed = Math.floor(
      (Date.now() - new Date(existingTimer.started_at).getTime()) / 60000
    );
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: `⏱ Timer already running on *${(existingTimer.project as any)?.name}* (${formatDuration(elapsed)})\n\nUse \`/zhuzh stop\` first.`,
    });
    return;
  }

  // Find project
  let project: any = null;
  if (projectQuery) {
    const matches = await findProjectMatches(user.org_id, projectQuery);
    if (matches.length === 0) {
      await client.chat.postEphemeral({
        channel: channelId,
        user: slackUserId,
        text: `❌ Couldn't find a project matching "${projectQuery}"`,
      });
      return;
    }
    project = matches[0];
  } else {
    // No project specified - list recent ones
    const { data: recentAllocs } = await supabase
      .from('allocations')
      .select('project:projects(id, name)')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(5);

    const projectList = [...new Set((recentAllocs || []).map(a => (a.project as any)?.name))].slice(0, 5);
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: `Which project? Try:\n\`/zhuzh start ${projectList[0] || 'Project Name'}\`\n\nYour recent projects:\n${projectList.map(p => `- ${p}`).join('\n')}`,
    });
    return;
  }

  // Start the timer
  const now = new Date();
  const { error } = await supabase.from('time_entries_live').insert({
    user_id: user.id,
    project_id: project.id,
    entry_type: 'timer',
    started_at: now.toISOString(),
    duration_minutes: 0,
    entry_date: now.toISOString().split('T')[0],
    source: 'slack',
  });

  if (error) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: '❌ Failed to start timer. Please try again.',
    });
    return;
  }

  await client.chat.postEphemeral({
    channel: channelId,
    user: slackUserId,
    text: `⏱ *Timer started*\n\n*${project.name}*\nStarted at ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}\n\nUse \`/zhuzh stop\` when done.`,
  });
}

async function handleTimerStop(
  client: any,
  user: { id: string; name: string },
  channelId: string,
  slackUserId: string,
  notes: string | undefined
): Promise<void> {
  // Find running timer
  const { data: timer } = await supabase
    .from('time_entries_live')
    .select('id, started_at, notes, project:projects(name)')
    .eq('user_id', user.id)
    .is('stopped_at', null)
    .eq('entry_type', 'timer')
    .single();

  if (!timer) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: '❌ No timer running. Use `/zhuzh start [project]` to start one.',
    });
    return;
  }

  // Stop it
  const now = new Date();
  const durationMinutes = Math.floor(
    (now.getTime() - new Date(timer.started_at).getTime()) / 60000
  );

  const combinedNotes = notes
    ? timer.notes ? `${timer.notes}\n${notes}` : notes
    : timer.notes;

  await supabase
    .from('time_entries_live')
    .update({
      stopped_at: now.toISOString(),
      duration_minutes: durationMinutes,
      notes: combinedNotes,
    })
    .eq('id', timer.id);

  // Get today's total
  const today = now.toISOString().split('T')[0];
  const { data: todayEntries } = await supabase
    .from('time_entries_live')
    .select('duration_minutes')
    .eq('user_id', user.id)
    .eq('entry_date', today)
    .not('stopped_at', 'is', null);

  const todayTotal = (todayEntries || []).reduce((sum, e) => sum + e.duration_minutes, 0);

  await client.chat.postEphemeral({
    channel: channelId,
    user: slackUserId,
    text: `✅ *Time logged*\n\n*${(timer.project as any)?.name}*\nDuration: *${formatDuration(durationMinutes)}*\n\nToday's total: ${formatDuration(todayTotal)}`,
  });
}

async function handleTimerLog(
  client: any,
  user: { id: string; name: string; org_id: string },
  channelId: string,
  slackUserId: string,
  hours: number,
  minutes: number,
  projectQuery: string | undefined
): Promise<void> {
  // Check time tracking enabled
  const { data: userSettings } = await supabase
    .from('users')
    .select('time_tracking_enabled')
    .eq('id', user.id)
    .single();

  if (!userSettings?.time_tracking_enabled) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: '❌ Time tracking is not enabled. Enable it in *Settings → Timesheet Preferences*.',
    });
    return;
  }

  const totalMinutes = Math.round(hours * 60) + (minutes || 0);

  if (totalMinutes <= 0 || totalMinutes > 24 * 60) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: '❌ Invalid duration. Must be between 1 minute and 24 hours.',
    });
    return;
  }

  // Find project
  if (!projectQuery) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: '❌ Please specify a project: `/zhuzh log 2h Project Name`',
    });
    return;
  }

  const matches = await findProjectMatches(user.org_id, projectQuery);
  if (matches.length === 0) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: `❌ Couldn't find a project matching "${projectQuery}"`,
    });
    return;
  }

  const project = matches[0];
  const now = new Date();

  await supabase.from('time_entries_live').insert({
    user_id: user.id,
    project_id: project.id,
    entry_type: 'manual',
    duration_minutes: totalMinutes,
    entry_date: now.toISOString().split('T')[0],
    source: 'slack',
  });

  await client.chat.postEphemeral({
    channel: channelId,
    user: slackUserId,
    text: `✅ Logged *${formatDuration(totalMinutes)}* to *${project.name}*`,
  });
}

async function handleTimerStatus(
  client: any,
  user: { id: string; name: string },
  channelId: string,
  slackUserId: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Get today's completed entries
  const { data: entries } = await supabase
    .from('time_entries_live')
    .select('duration_minutes, project:projects(name, color)')
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
  const byProject: Record<string, number> = {};
  for (const entry of entries || []) {
    const name = (entry.project as any)?.name || 'Unknown';
    byProject[name] = (byProject[name] || 0) + entry.duration_minutes;
  }

  const projectList = Object.entries(byProject)
    .sort((a, b) => b[1] - a[1])
    .map(([name, mins]) => `- *${name}* -- ${formatDuration(mins)}`)
    .join('\n');

  const totalMinutes = Object.values(byProject).reduce((sum, m) => sum + m, 0);

  let runningInfo = '';
  if (runningTimer) {
    const elapsed = Math.floor(
      (Date.now() - new Date(runningTimer.started_at).getTime()) / 60000
    );
    runningInfo = `\n\n⏱ *Currently tracking:* ${(runningTimer.project as any)?.name} (${formatDuration(elapsed)})`;
  }

  if (Object.keys(byProject).length === 0 && !runningTimer) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: slackUserId,
      text: `📊 *Today's Time*\n\nNo time logged yet. Use \`/zhuzh start [project]\` or \`/zhuzh log 2h [project]\``,
    });
    return;
  }

  await client.chat.postEphemeral({
    channel: channelId,
    user: slackUserId,
    text: `📊 *Today's Time -- ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}*\n\n${projectList || '_No completed entries_'}\n━━━━━━━━━━━━━━━━\n*Total:* ${formatDuration(totalMinutes)}${runningInfo}`,
  });
}
