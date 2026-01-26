/**
 * Budget Alerts Scheduled Job
 *
 * Checks all active projects for budget thresholds (75% and 90%)
 * and sends Slack notifications to project owners and admins.
 *
 * Run daily at 9am.
 */

import { App } from '@slack/bolt';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =============================================================================
// Types
// =============================================================================

interface BudgetAlert {
  projectId: string;
  projectName: string;
  clientName: string | null;
  threshold: 75 | 90;
  currentBurn: number;
  budgetHours: number;
  burnedHours: number;
  remainingHours: number;
}

interface ProjectBudgetData {
  project_id: string;
  project_name: string;
  client_name: string | null;
  budget_hours: number;
  burned_hours: number;
  burn_percentage: number;
  remaining_hours: number;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Check all active projects and send budget alerts
 * Called by scheduler (daily at 9am)
 */
export async function sendBudgetAlerts(app: App, orgId?: string) {
  console.log('💰 Starting daily budget alerts check...');

  try {
    const alerts = await checkBudgetThresholds(orgId);

    if (alerts.length === 0) {
      console.log('  ✅ No budget alerts to send');
      return;
    }

    console.log(`  📬 Found ${alerts.length} projects crossing thresholds`);

    for (const alert of alerts) {
      await sendBudgetAlert(app, alert);
      await logBudgetAlert(alert);
    }

    console.log('✅ Budget alerts job complete');
  } catch (error) {
    console.error('❌ Budget alerts job failed:', error);
  }
}

// =============================================================================
// Core Logic
// =============================================================================

/**
 * Check all projects for budget threshold crossings
 */
export async function checkBudgetThresholds(orgId?: string): Promise<BudgetAlert[]> {
  // Get projects with budget data
  let query = supabase
    .from('project_budget_summary')
    .select('*')
    .gt('budget_hours', 0);  // Only projects with a budget

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data: projects, error } = await query;

  if (error) {
    console.error('  ❌ Error fetching budget data:', error);
    return [];
  }

  if (!projects) return [];

  const alerts: BudgetAlert[] = [];

  for (const project of projects as ProjectBudgetData[]) {
    const burnPct = project.burn_percentage || 0;

    // Check if already alerted for this threshold
    const hasAlerted75 = await hasAlertedThreshold(project.project_id, 75);
    const hasAlerted90 = await hasAlertedThreshold(project.project_id, 90);

    // 90% threshold (critical)
    if (burnPct >= 90 && !hasAlerted90) {
      alerts.push({
        projectId: project.project_id,
        projectName: project.project_name,
        clientName: project.client_name,
        threshold: 90,
        currentBurn: burnPct,
        budgetHours: project.budget_hours,
        burnedHours: project.burned_hours,
        remainingHours: project.remaining_hours
      });
    }
    // 75% threshold (warning) - only if not already at 90%
    else if (burnPct >= 75 && burnPct < 90 && !hasAlerted75) {
      alerts.push({
        projectId: project.project_id,
        projectName: project.project_name,
        clientName: project.client_name,
        threshold: 75,
        currentBurn: burnPct,
        budgetHours: project.budget_hours,
        burnedHours: project.burned_hours,
        remainingHours: project.remaining_hours
      });
    }
  }

  return alerts;
}

/**
 * Check if we've already alerted for a specific threshold
 */
async function hasAlertedThreshold(projectId: string, threshold: number): Promise<boolean> {
  const { data } = await supabase
    .from('budget_alert_log')
    .select('id')
    .eq('project_id', projectId)
    .eq('threshold', threshold)
    .limit(1);

  return !!(data && data.length > 0);
}

/**
 * Log that we sent an alert (prevents duplicate alerts)
 */
async function logBudgetAlert(alert: BudgetAlert): Promise<void> {
  const { error } = await supabase
    .from('budget_alert_log')
    .insert({
      project_id: alert.projectId,
      threshold: alert.threshold,
      burn_percentage: alert.currentBurn,
      triggered_at: new Date().toISOString()
    });

  if (error) {
    console.error(`  ⚠️ Failed to log alert for ${alert.projectName}:`, error);
  }
}

/**
 * Send Slack notification for a budget alert
 */
async function sendBudgetAlert(app: App, alert: BudgetAlert): Promise<void> {
  // Get users to notify (PMs and admins)
  const { data: managers } = await supabase
    .from('users')
    .select('id, name, slack_user_id, role')
    .in('role', ['pm', 'admin'])
    .eq('is_active', true)
    .not('slack_user_id', 'is', null);

  if (!managers || managers.length === 0) {
    console.log(`  ⚠️ No managers to notify for ${alert.projectName}`);
    return;
  }

  const emoji = alert.threshold === 90 ? '🔴' : '🟡';
  const urgencyText = alert.threshold === 90 ? 'CRITICAL' : 'Warning';
  const urgencyColor = alert.threshold === 90 ? '#dc3545' : '#ffc107';

  for (const manager of managers) {
    if (!manager.slack_user_id) continue;

    try {
      await app.client.chat.postMessage({
        channel: manager.slack_user_id,
        text: `${emoji} Budget Alert: ${alert.projectName} has reached ${alert.threshold}% of budget`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${emoji} Budget ${urgencyText}: ${alert.threshold}%`,
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${alert.projectName}* has reached *${alert.currentBurn.toFixed(1)}%* of its budget.`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Client*\n${alert.clientName || 'N/A'}`
              },
              {
                type: 'mrkdwn',
                text: `*Burn Rate*\n${alert.currentBurn.toFixed(1)}%`
              },
              {
                type: 'mrkdwn',
                text: `*Hours Used*\n${alert.burnedHours.toLocaleString()}h of ${alert.budgetHours.toLocaleString()}h`
              },
              {
                type: 'mrkdwn',
                text: `*Remaining*\n${alert.remainingHours.toLocaleString()}h`
              }
            ]
          },
          { type: 'divider' },
          {
            type: 'context',
            elements: [{
              type: 'mrkdwn',
              text: alert.threshold === 90
                ? '⚠️ *Action Required:* Review allocations and consider scope adjustments.'
                : '📊 Monitor closely as this project approaches budget limit.'
            }]
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                action_id: 'view_project_budget',
                text: { type: 'plain_text', text: '📊 View Budget Details', emoji: true },
                url: `${process.env.APP_URL || 'http://localhost:3001'}/budget?project=${alert.projectId}`
              }
            ]
          }
        ]
      });

      console.log(`  ✅ Alerted ${manager.name} about ${alert.projectName}`);

      // Log who was notified
      await supabase
        .from('budget_alert_log')
        .update({ notified_user_id: manager.id })
        .eq('project_id', alert.projectId)
        .eq('threshold', alert.threshold)
        .is('notified_user_id', null);

    } catch (error) {
      console.error(`  ❌ Failed to notify ${manager.name}:`, error);
    }
  }
}

/**
 * Manually trigger alert check for a specific project (for testing)
 */
export async function checkProjectBudget(app: App, projectId: string): Promise<void> {
  const { data: project } = await supabase
    .from('project_budget_summary')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (!project) {
    console.log(`  ❌ Project ${projectId} not found`);
    return;
  }

  const burnPct = project.burn_percentage || 0;
  console.log(`  Project: ${project.project_name}`);
  console.log(`  Burn: ${burnPct.toFixed(1)}%`);

  if (burnPct >= 90) {
    const alert: BudgetAlert = {
      projectId: project.project_id,
      projectName: project.project_name,
      clientName: project.client_name,
      threshold: 90,
      currentBurn: burnPct,
      budgetHours: project.budget_hours,
      burnedHours: project.burned_hours,
      remainingHours: project.remaining_hours
    };
    await sendBudgetAlert(app, alert);
  } else if (burnPct >= 75) {
    const alert: BudgetAlert = {
      projectId: project.project_id,
      projectName: project.project_name,
      clientName: project.client_name,
      threshold: 75,
      currentBurn: burnPct,
      budgetHours: project.budget_hours,
      burnedHours: project.burned_hours,
      remainingHours: project.remaining_hours
    };
    await sendBudgetAlert(app, alert);
  } else {
    console.log(`  ✅ Budget is healthy (${burnPct.toFixed(1)}%)`);
  }
}
