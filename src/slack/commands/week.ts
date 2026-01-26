import type { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';
import { buildConfirmWeekModal } from '../views/confirmWeek';
import { getSlackUserTimezone, getWeekStartInTimezone } from '../../lib/timezone';

export function registerWeekCommand(app: App) {
  app.command('/week', async ({ command, ack, client }) => {
    await ack();

    const slackUserId = command.user_id;

    // Get user from database by slack_user_id
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: slackUserId,
        text: "You're not registered in Zhuzh. Please contact your admin."
      });
      return;
    }

    // Get user's timezone (auto-detect from Slack, with optional override)
    const tzInfo = await getSlackUserTimezone(
      client, 
      slackUserId, 
      user.timezone_override
    );

    console.log(`📅 /week for ${user.email}`);
    console.log(`  Timezone: ${tzInfo.timezone} (${tzInfo.label}) [source: ${tzInfo.source}]`);

    // Determine which week (current or 'last')
    const isLastWeek = command.text?.trim().toLowerCase() === 'last';
    const weekStart = getWeekStartInTimezone(tzInfo.timezone, isLastWeek ? -1 : 0);

    console.log(`  Week start: ${weekStart} (${isLastWeek ? 'last week' : 'this week'})`);

    // Get allocations for this week
    const { data: allocations } = await supabase
      .from('allocations')
      .select('*, project:projects(name, color), phase:project_phases(name)')
      .eq('user_id', user.id)
      .eq('week_start', weekStart);

    console.log(`  Allocations found: ${allocations?.length || 0}`);

    // Check if already submitted/draft exists
    const { data: existing } = await supabase
      .from('time_confirmations')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single();

    // Fetch any existing unplanned work entries
    let unplannedEntries: any[] = [];
    if (existing) {
      const { data: entries } = await supabase
        .from('time_entries')
        .select('*, project:projects(name)')
        .eq('confirmation_id', existing.id)
        .eq('is_unplanned', true);
      
      unplannedEntries = entries || [];
      console.log(`  Unplanned entries: ${unplannedEntries.length}`);
    }

    // Open modal (pass timezone and unplanned entries)
    await client.views.open({
      trigger_id: command.trigger_id,
      view: buildConfirmWeekModal(
        allocations || [], 
        weekStart, 
        existing, 
        tzInfo.timezone,
        unplannedEntries
      )
    });

    console.log('  ✅ Modal opened\n');
  });
}
