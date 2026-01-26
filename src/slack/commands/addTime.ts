/**
 * /add-time Command
 *
 * Opens a modal to log unplanned work that wasn't in the weekly allocation.
 * Allows employees to track ad-hoc tasks, urgent fixes, and scope creep.
 *
 * Usage:
 *   /add-time           - Opens modal for current week
 *   /add-time last      - Opens modal for last week
 *   /add-time 2026-01-13 - Opens modal for specific week
 */

import type { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';
import { buildAddUnplannedWorkModal } from '../views/addUnplannedWork';
import { getSlackUserTimezone } from '../../lib/timezone';

export function registerAddTimeCommand(app: App) {
  app.command('/add-time', async ({ command, ack, client }) => {
    await ack();

    const slackUserId = command.user_id;
    const arg = command.text?.trim().toLowerCase();

    // Get user info and timezone
    const { data: user } = await supabase
      .from('users')
      .select('id, timezone_override')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: slackUserId,
        text: '❌ Your Slack account is not linked to Zhuzh. Please contact an admin.'
      });
      return;
    }

    const tzInfo = await getSlackUserTimezone(client, slackUserId, user.timezone_override);

    // Determine which week
    let weekStart: string;
    const now = new Date();

    if (arg === 'last' || arg === 'lastweek' || arg === 'last week') {
      // Last week
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      weekStart = getWeekStart(lastWeek);
    } else if (arg && /^\d{4}-\d{2}-\d{2}$/.test(arg)) {
      // Specific date provided
      weekStart = getWeekStart(new Date(arg));
    } else {
      // Current week (default)
      weekStart = getWeekStart(now);
    }

    // Get active projects for the dropdown
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, phases:project_phases(id, name)')
      .eq('status', 'active')
      .order('name');

    if (!projects || projects.length === 0) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: slackUserId,
        text: '❌ No active projects found. Please contact an admin.'
      });
      return;
    }

    // Open the modal
    try {
      await client.views.open({
        trigger_id: command.trigger_id,
        view: buildAddUnplannedWorkModal(
          projects,
          weekStart,
          undefined, // No parent view
          tzInfo.timezone
        )
      });
    } catch (error) {
      console.error('Failed to open add-time modal:', error);
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: slackUserId,
        text: '❌ Failed to open the form. Please try again.'
      });
    }
  });
}

/**
 * Get the Monday of the week containing the given date
 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}
