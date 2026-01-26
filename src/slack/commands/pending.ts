import type { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';
import { buildPendingApprovalBlocks } from '../blocks';

export function registerPendingCommand(app: App) {
  app.command('/pending', async ({ command, ack, respond }) => {
    await ack();

    const slackUserId = command.user_id;

    // Get user and check role
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user || user.role === 'employee') {
      await respond({
        text: "⛔ This command is only available to managers and admins."
      });
      return;
    }

    // Get pending confirmations
    const { data: pending } = await supabase
      .from('time_confirmations')
      .select('*, user:users!user_id(name, email), entries:time_entries(*)')
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });

    if (!pending || pending.length === 0) {
      await respond({
        text: "✅ No pending timesheets to review!"
      });
      return;
    }

    await respond({
      blocks: buildPendingApprovalBlocks(pending as Array<{
        id: string;
        week_start: string;
        submitted_at: string | null;
        user?: { name: string; email: string } | null;
      }>)
    });
  });
}
