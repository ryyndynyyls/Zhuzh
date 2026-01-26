import { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';

/**
 * Send budget alert notification when project reaches 75% or 90% threshold
 */
export async function sendBudgetAlertNotification(
  app: App,
  projectId: string,
  threshold: 75 | 90
) {
  // Get project details
  const { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(name)')
    .eq('id', projectId)
    .single();

  if (!project) return;

  // Get budget stats from view
  const { data: budgetStats } = await supabase
    .from('project_budget_summary')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (!budgetStats) return;

  // Get PMs and admins to notify
  const { data: managers } = await supabase
    .from('users')
    .select('slack_user_id, role')
    .in('role', ['pm', 'admin'])
    .eq('is_active', true);

  if (!managers || managers.length === 0) return;

  const emoji = threshold === 90 ? '🔴' : '🟡';
  const urgency = threshold === 90 ? 'CRITICAL' : 'Warning';

  for (const manager of managers) {
    if (!manager.slack_user_id) continue;

    try {
      // Display hours-based budget information
      const budgetDisplay = `${budgetStats.burned_hours ?? 0}h of ${budgetStats.budget_hours ?? 0}h`;

      await app.client.chat.postMessage({
        channel: manager.slack_user_id,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `${emoji} Budget Alert: ${urgency}` }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${project.name}* has reached *${threshold}%* of its budget`
            }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Client:*\n${project.client?.name || 'N/A'}` },
              { type: 'mrkdwn', text: `*Burn Rate:*\n${budgetStats.burn_percentage?.toFixed(0)}%` },
              { type: 'mrkdwn', text: `*Budget Used:*\n${budgetDisplay}` },
              { type: 'mrkdwn', text: `*Remaining:*\n${budgetStats.remaining_hours}h` }
            ]
          },
          { type: 'divider' },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                action_id: 'view_project_budget',
                text: { type: 'plain_text', text: '📊 View Project' },
                url: `${process.env.APP_URL}/budget?project=${projectId}`
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error(`Failed to send budget alert to ${manager.slack_user_id}:`, error);
    }
  }
}

/**
 * Check all projects and send alerts for those hitting thresholds
 * Run this periodically (e.g., after each timesheet submission)
 */
export async function checkAndSendBudgetAlerts(app: App) {
  const { data: projects } = await supabase
    .from('project_budget_summary')
    .select('project_id, burn_percentage');

  if (!projects) return;

  for (const project of projects) {
    if (!project.project_id) continue;

    const burnPct = project.burn_percentage || 0;

    // Check what alerts have already been sent for this project
    const { data: existingAlerts } = await supabase
      .from('budget_alert_log')
      .select('threshold')
      .eq('project_id', project.project_id);

    const alertedThresholds = new Set(existingAlerts?.map(a => a.threshold) ?? []);

    // Send 75% alert if not already sent
    if (burnPct >= 75 && burnPct < 90 && !alertedThresholds.has(75)) {
      await sendBudgetAlertNotification(app, project.project_id, 75);
      await supabase
        .from('budget_alert_log')
        .insert({ project_id: project.project_id, threshold: 75, burn_percentage: burnPct });
    }

    // Send 90% alert if not already sent
    if (burnPct >= 90 && !alertedThresholds.has(90)) {
      await sendBudgetAlertNotification(app, project.project_id, 90);
      await supabase
        .from('budget_alert_log')
        .insert({ project_id: project.project_id, threshold: 90, burn_percentage: burnPct });
    }
  }
}
