import type { App } from '@slack/bolt';
import { createClient } from '@supabase/supabase-js';
import { 
  getFridayConfirmationSendTime, 
  getMondayPreviewSendTime,
  getOrgSendTimes 
} from '../../lib/smart-timing';
import { sendFridayDMToUser, sendMondayDMToUser } from '../scheduled';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * /dm-test command for admins to test smart timing
 * 
 * Usage:
 *   /dm-test           - Show your smart timing for this week
 *   /dm-test all       - Show all users' smart timing (admin only)
 *   /dm-test friday    - Trigger Friday DM to yourself now
 *   /dm-test monday    - Trigger Monday DM to yourself now
 */
export function registerDMTestCommand(app: App) {
  app.command('/dm-test', async ({ command, ack, respond }) => {
    await ack();

    const slackUserId = command.user_id;
    const subcommand = command.text?.trim().toLowerCase() || '';

    // Get user from database
    const { data: user } = await supabase
      .from('users')
      .select('id, name, org_id, role')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) {
      await respond({
        response_type: 'ephemeral',
        text: "❌ You're not registered in Zhuzh."
      });
      return;
    }

    // Handle subcommands
    if (subcommand === 'friday') {
      await respond({
        response_type: 'ephemeral',
        text: '📨 Sending Friday confirmation DM to you now...'
      });
      
      await sendFridayDMToUser(app, user.id);
      return;
    }

    if (subcommand === 'monday') {
      await respond({
        response_type: 'ephemeral',
        text: '📨 Sending Monday preview DM to you now...'
      });
      
      await sendMondayDMToUser(app, user.id);
      return;
    }

    if (subcommand === 'all') {
      // Admin only
      if (user.role !== 'admin' && user.role !== 'pm') {
        await respond({
          response_type: 'ephemeral',
          text: '❌ This subcommand is for admins/PMs only.'
        });
        return;
      }

      await respond({
        response_type: 'ephemeral',
        text: '⏳ Calculating smart timing for all users...'
      });

      const allTiming = await getOrgSendTimes(user.org_id);
      
      let message = '*📅 Smart Timing for All Users This Week*\n\n';
      
      for (const u of allTiming) {
        const fridayStr = u.friday.sendAt 
          ? `${u.friday.adjustedDay || 'Friday'} 3pm` 
          : 'Skip';
        const mondayStr = u.monday.sendAt 
          ? `${u.monday.adjustedDay || 'Monday'} 9am` 
          : 'Skip';
        
        message += `*${u.userName}*\n`;
        message += `  Friday DM: ${fridayStr}`;
        if (u.friday.reason !== 'Normal week') message += ` _(${u.friday.reason})_`;
        message += `\n`;
        message += `  Monday DM: ${mondayStr}`;
        if (u.monday.reason !== 'Normal week') message += ` _(${u.monday.reason})_`;
        message += `\n\n`;
      }

      await respond({
        response_type: 'ephemeral',
        text: message
      });
      return;
    }

    // Default: show current user's timing
    // Use the getWeekStart from smart-timing (already handles timezone correctly)
    const friday = await getFridayConfirmationSendTime(user.id);
    const monday = await getMondayPreviewSendTime(user.id);

    const fridayStr = friday.sendAt 
      ? formatDateTime(friday.sendAt) 
      : 'Skip (out all week)';
    const mondayStr = monday.sendAt 
      ? formatDateTime(monday.sendAt) 
      : 'Skip (out all week)';

    const message = `*📅 Your Smart DM Timing This Week*\n\n` +
      `*Friday Confirmation DM*\n` +
      `  Send: ${fridayStr}\n` +
      `  Reason: ${friday.reason}\n\n` +
      `*Monday Preview DM*\n` +
      `  Send: ${mondayStr}\n` +
      `  Reason: ${monday.reason}\n\n` +
      `_Try \`/dm-test friday\` or \`/dm-test monday\` to send one now_`;

    await respond({
      response_type: 'ephemeral',
      text: message
    });
  });
}

// =============================================================================
// Helpers
// =============================================================================

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles'  // Explicit timezone
  });
}
