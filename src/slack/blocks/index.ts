/**
 * Reusable Block Kit builder functions for Zhuzh Slack app
 * Generates consistent, accessible Slack message blocks
 */

import type {
  Block,
  SectionBlock,
  HeaderBlock,
  DividerBlock,
  ContextBlock,
  ActionsBlock,
  ButtonElement,
  TextObject,
  SlackAllocation,
  SlackConfirmation,
  SlackBudgetInfo,
  Warning,
  WarningLevel,
} from '../types';
import type { UserRole } from '../../types/database';

// ============================================
// Helper Functions
// ============================================

/**
 * Create a plain text object
 */
function plainText(text: string, emoji = true): TextObject {
  return { type: 'plain_text', text, emoji };
}

/**
 * Create a markdown text object
 */
function mrkdwn(text: string): TextObject {
  return { type: 'mrkdwn', text };
}

/**
 * Create a button element
 */
function button(
  text: string,
  actionId: string,
  value?: string,
  style?: 'primary' | 'danger'
): ButtonElement {
  const btn: ButtonElement = {
    type: 'button',
    text: plainText(text),
    action_id: actionId,
  };
  if (value) btn.value = value;
  if (style) btn.style = style;
  return btn;
}

/**
 * Format hours for display
 */
function formatHours(hours: number): string {
  return hours % 1 === 0 ? hours.toString() : hours.toFixed(1);
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display
 */
function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Build a text-based progress bar
 */
function buildProgressBar(percentage: number, width = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  const filledChar = percentage >= 90 ? '!' : '#';
  return `[${''.padStart(filled, filledChar)}${''.padStart(empty, '-')}]`;
}

/**
 * Get warning emoji based on level
 */
function getWarningEmoji(level: WarningLevel): string {
  switch (level) {
    case 'critical':
      return '[!]';
    case 'warning':
      return '[*]';
    case 'info':
    default:
      return '[i]';
  }
}

// ============================================
// Confirmation Blocks
// ============================================

/**
 * Build blocks for time confirmation view (employee confirming their week)
 */
export function buildConfirmationBlocks(
  allocations: SlackAllocation[],
  weekStart: string
): Block[] {
  const blocks: Block[] = [];

  // Header with week info
  const weekDate = new Date(weekStart);
  const weekEnd = new Date(weekDate);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const headerText = `Time Confirmation: ${weekDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} - ${weekEnd.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;

  blocks.push({
    type: 'header',
    text: plainText(headerText),
  } as HeaderBlock);

  blocks.push({ type: 'divider' } as DividerBlock);

  // Total hours summary
  const totalPlanned = allocations.reduce((sum, a) => sum + a.plannedHours, 0);

  blocks.push({
    type: 'section',
    text: mrkdwn(`*Total Planned Hours:* ${formatHours(totalPlanned)}`),
  } as SectionBlock);

  blocks.push({ type: 'divider' } as DividerBlock);

  // Build allocation table
  if (allocations.length === 0) {
    blocks.push({
      type: 'section',
      text: mrkdwn('_No allocations for this week._'),
    } as SectionBlock);
  } else {
    // Table header
    blocks.push({
      type: 'section',
      text: mrkdwn('*Project* | *Phase* | *Hours* | *Billable*'),
    } as SectionBlock);

    // Table rows
    for (const allocation of allocations) {
      const phaseName = allocation.phaseName || '-';
      const billable = allocation.isBillable ? 'Yes' : 'No';
      const row = `${allocation.projectName} | ${phaseName} | ${formatHours(allocation.plannedHours)} | ${billable}`;

      blocks.push({
        type: 'section',
        text: mrkdwn(row),
      } as SectionBlock);
    }
  }

  blocks.push({ type: 'divider' } as DividerBlock);

  // Action buttons
  blocks.push({
    type: 'actions',
    elements: [
      button('Confirm Exact', 'confirm_exact', weekStart, 'primary'),
      button('Edit Hours', 'edit_hours', weekStart),
      button('Add Unplanned', 'add_unplanned', weekStart),
    ],
  } as ActionsBlock);

  return blocks;
}

// ============================================
// Approval Blocks
// ============================================

/**
 * Build blocks for approval view (manager approving employee time)
 */
export function buildApprovalBlocks(
  confirmation: SlackConfirmation,
  employee: { name: string; email: string }
): Block[] {
  const blocks: Block[] = [];

  // Header
  blocks.push({
    type: 'header',
    text: plainText(`Time Approval: ${employee.name}`),
  } as HeaderBlock);

  // Week info and submission time
  const weekDate = new Date(confirmation.weekStart);
  const weekEnd = new Date(weekDate);
  weekEnd.setDate(weekEnd.getDate() + 6);

  blocks.push({
    type: 'context',
    elements: [
      mrkdwn(
        `*Week:* ${weekDate.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`
      ),
      mrkdwn(
        `*Submitted:* ${confirmation.submittedAt ? new Date(confirmation.submittedAt).toLocaleString() : 'N/A'}`
      ),
    ],
  } as ContextBlock);

  blocks.push({ type: 'divider' } as DividerBlock);

  // Summary section
  blocks.push({
    type: 'section',
    fields: [
      mrkdwn(`*Total Planned:*\n${formatHours(confirmation.totalPlannedHours)} hrs`),
      mrkdwn(`*Total Actual:*\n${formatHours(confirmation.totalActualHours)} hrs`),
      mrkdwn(`*Variance:*\n${formatHours(confirmation.variance)} hrs`),
      mrkdwn(
        `*Variance %:*\n${confirmation.variancePercentage > 0 ? '+' : ''}${formatPercentage(confirmation.variancePercentage)}`
      ),
    ],
  } as SectionBlock);

  // Exact match indicator
  if (confirmation.exactMatchFlag) {
    blocks.push({
      type: 'context',
      elements: [mrkdwn('[OK] Employee confirmed hours match exactly as planned')],
    } as ContextBlock);
  }

  blocks.push({ type: 'divider' } as DividerBlock);

  // Planned vs Actual table header
  blocks.push({
    type: 'section',
    text: mrkdwn('*Project* | *Planned* | *Actual* | *Variance*'),
  } as SectionBlock);

  // Entry rows
  for (const entry of confirmation.entries) {
    const varianceStr =
      entry.variance > 0
        ? `+${formatHours(entry.variance)}`
        : formatHours(entry.variance);
    const unplannedTag = entry.isUnplanned ? ' _(unplanned)_' : '';
    const row = `${entry.projectName}${unplannedTag} | ${formatHours(entry.plannedHours)} | ${formatHours(entry.actualHours)} | ${varianceStr}`;

    blocks.push({
      type: 'section',
      text: mrkdwn(row),
    } as SectionBlock);
  }

  // Variance warnings
  const warnings = buildVarianceWarnings(confirmation);
  if (warnings.length > 0) {
    blocks.push({ type: 'divider' } as DividerBlock);
    blocks.push(...buildWarningSection(warnings));
  }

  // Notes if present
  if (confirmation.notes) {
    blocks.push({ type: 'divider' } as DividerBlock);
    blocks.push({
      type: 'section',
      text: mrkdwn(`*Employee Notes:*\n${confirmation.notes}`),
    } as SectionBlock);
  }

  blocks.push({ type: 'divider' } as DividerBlock);

  // Action buttons
  blocks.push({
    type: 'actions',
    elements: [
      button('Approve', 'approve_time', confirmation.id, 'primary'),
      button('Reject', 'reject_time', confirmation.id, 'danger'),
      button('Request Changes', 'request_changes', confirmation.id),
    ],
  } as ActionsBlock);

  return blocks;
}

/**
 * Build variance warnings based on confirmation data
 */
function buildVarianceWarnings(confirmation: SlackConfirmation): Warning[] {
  const warnings: Warning[] = [];

  // High variance warning
  if (Math.abs(confirmation.variancePercentage) >= 20) {
    warnings.push({
      level: 'critical',
      message: `High variance detected: ${formatPercentage(Math.abs(confirmation.variancePercentage))} difference from planned`,
      context: 'This may indicate planning issues or scope changes',
    });
  } else if (Math.abs(confirmation.variancePercentage) >= 10) {
    warnings.push({
      level: 'warning',
      message: `Moderate variance: ${formatPercentage(Math.abs(confirmation.variancePercentage))} difference from planned`,
    });
  }

  // Unplanned work warning
  const unplannedEntries = confirmation.entries.filter((e) => e.isUnplanned);
  if (unplannedEntries.length > 0) {
    const unplannedHours = unplannedEntries.reduce(
      (sum, e) => sum + e.actualHours,
      0
    );
    warnings.push({
      level: 'info',
      message: `${unplannedEntries.length} unplanned ${unplannedEntries.length === 1 ? 'entry' : 'entries'} totaling ${formatHours(unplannedHours)} hours`,
    });
  }

  return warnings;
}

// ============================================
// Budget Blocks
// ============================================

/**
 * Build blocks for budget display
 * Role-based: hours only for employees, dollars for managers/admins
 */
export function buildBudgetBlocks(
  project: SlackBudgetInfo,
  userRole: UserRole
): Block[] {
  const blocks: Block[] = [];
  const showDollars = userRole === 'pm' || userRole === 'admin';

  // Header
  blocks.push({
    type: 'header',
    text: plainText(`Budget: ${project.projectName}`),
  } as HeaderBlock);

  // Client info
  blocks.push({
    type: 'context',
    elements: [
      mrkdwn(`*Client:* ${project.clientName}`),
      mrkdwn(`*Billable:* ${project.isBillable ? 'Yes' : 'No'}`),
    ],
  } as ContextBlock);

  blocks.push({ type: 'divider' } as DividerBlock);

  // Progress bar
  const progressBar = buildProgressBar(project.percentageUsed);
  const statusEmoji =
    project.percentageUsed >= 90
      ? '[!]'
      : project.percentageUsed >= 75
        ? '[*]'
        : '[OK]';

  blocks.push({
    type: 'section',
    text: mrkdwn(
      `*Budget Progress:* ${statusEmoji}\n\`${progressBar}\` ${formatPercentage(project.percentageUsed)} used`
    ),
  } as SectionBlock);

  // Hours breakdown
  const hoursFields: TextObject[] = [
    mrkdwn(`*Budget:*\n${formatHours(project.budgetHours)} hrs`),
    mrkdwn(`*Used:*\n${formatHours(project.usedHours)} hrs`),
    mrkdwn(`*Remaining:*\n${formatHours(project.remainingHours)} hrs`),
  ];

  blocks.push({
    type: 'section',
    fields: hoursFields,
  } as SectionBlock);

  // Dollar breakdown (managers/admins only)
  if (showDollars && project.budgetDollars !== null) {
    blocks.push({ type: 'divider' } as DividerBlock);

    const dollarFields: TextObject[] = [
      mrkdwn(`*Budget:*\n${formatCurrency(project.budgetDollars)}`),
      mrkdwn(`*Used:*\n${formatCurrency(project.usedDollars || 0)}`),
      mrkdwn(`*Remaining:*\n${formatCurrency(project.remainingDollars || 0)}`),
    ];

    blocks.push({
      type: 'section',
      text: mrkdwn('*Financial Summary:*'),
    } as SectionBlock);

    blocks.push({
      type: 'section',
      fields: dollarFields,
    } as SectionBlock);

    if (project.hourlyRate) {
      blocks.push({
        type: 'context',
        elements: [mrkdwn(`_Hourly rate: ${formatCurrency(project.hourlyRate)}_`)],
      } as ContextBlock);
    }
  }

  // Phase breakdown (if phases exist)
  if (project.phases.length > 0) {
    blocks.push({ type: 'divider' } as DividerBlock);

    blocks.push({
      type: 'section',
      text: mrkdwn('*Phase Breakdown:*'),
    } as SectionBlock);

    // Phase table header
    blocks.push({
      type: 'section',
      text: mrkdwn('*Phase* | *Budget* | *Used* | *Status*'),
    } as SectionBlock);

    for (const phase of project.phases) {
      const phaseProgress = buildProgressBar(phase.percentageUsed, 10);
      const statusText =
        phase.status === 'complete'
          ? '[Done]'
          : phase.status === 'active'
            ? '[Active]'
            : '[Pending]';
      const row = `${phase.name} | ${formatHours(phase.budgetHours)}h | ${formatHours(phase.usedHours)}h | ${statusText}`;

      blocks.push({
        type: 'section',
        text: mrkdwn(row),
      } as SectionBlock);
    }
  }

  // Budget warnings
  const warnings: Warning[] = [];
  if (project.percentageUsed >= 100) {
    warnings.push({
      level: 'critical',
      message: 'Budget exceeded! Project is over budget.',
    });
  } else if (project.percentageUsed >= 90) {
    warnings.push({
      level: 'critical',
      message: `Only ${formatHours(project.remainingHours)} hours remaining (${formatPercentage(100 - project.percentageUsed)})`,
    });
  } else if (project.percentageUsed >= 75) {
    warnings.push({
      level: 'warning',
      message: `Budget 75% consumed. ${formatHours(project.remainingHours)} hours remaining.`,
    });
  }

  if (warnings.length > 0) {
    blocks.push({ type: 'divider' } as DividerBlock);
    blocks.push(...buildWarningSection(warnings));
  }

  return blocks;
}

/**
 * Build blocks for all projects budget summary
 */
export function buildAllProjectsBudgetBlocks(
  projects: Array<{
    project_name: string | null;
    client_name: string | null;
    budget_hours: number | null;
    burned_hours: number | null;
    burn_percentage: number | null;
    remaining_hours: number | null;
  }> | null,
  userRole: UserRole
): Block[] {
  const blocks: Block[] = [];

  blocks.push({
    type: 'header',
    text: plainText('Project Budget Summary'),
  } as HeaderBlock);

  blocks.push({ type: 'divider' } as DividerBlock);

  if (!projects || projects.length === 0) {
    blocks.push({
      type: 'section',
      text: mrkdwn('_No projects found._'),
    } as SectionBlock);
    return blocks;
  }

  for (const project of projects) {
    const burnPct = project.burn_percentage ?? 0;
    const progressBar = buildProgressBar(burnPct, 10);
    const statusEmoji = burnPct >= 90 ? '[!]' : burnPct >= 75 ? '[*]' : '[OK]';

    blocks.push({
      type: 'section',
      text: mrkdwn(
        `*${project.project_name || 'Unknown'}* (${project.client_name || 'No Client'})\n` +
        `${statusEmoji} \`${progressBar}\` ${formatPercentage(burnPct)} used | ${formatHours(project.remaining_hours ?? 0)}h remaining`
      ),
    } as SectionBlock);
  }

  return blocks;
}

/**
 * Build blocks for pending approval notification
 */
export function buildPendingApprovalBlocks(
  confirmations: Array<{
    id: string;
    week_start: string;
    submitted_at: string | null;
    user?: { name: string; email: string } | null;
  }>
): Block[] {
  const blocks: Block[] = [];

  blocks.push({
    type: 'header',
    text: plainText('Pending Approvals'),
  } as HeaderBlock);

  blocks.push({ type: 'divider' } as DividerBlock);

  if (!confirmations || confirmations.length === 0) {
    blocks.push({
      type: 'section',
      text: mrkdwn('_No pending approvals._'),
    } as SectionBlock);
    return blocks;
  }

  for (const conf of confirmations) {
    const weekDate = new Date(conf.week_start);
    const weekLabel = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    blocks.push({
      type: 'section',
      text: mrkdwn(`*${conf.user?.name || 'Unknown'}* - Week of ${weekLabel}`),
      accessory: button('Review', 'review_approval', conf.id),
    } as SectionBlock);
  }

  return blocks;
}

// ============================================
// Table Builders
// ============================================

/**
 * Build a markdown table of allocations for week view
 */
export function buildWeekTable(allocations: SlackAllocation[]): Block[] {
  const blocks: Block[] = [];

  if (allocations.length === 0) {
    blocks.push({
      type: 'section',
      text: mrkdwn('_No allocations for this week._'),
    } as SectionBlock);
    return blocks;
  }

  // Group by project
  const byProject = allocations.reduce(
    (acc, alloc) => {
      if (!acc[alloc.projectName]) {
        acc[alloc.projectName] = [];
      }
      acc[alloc.projectName].push(alloc);
      return acc;
    },
    {} as Record<string, SlackAllocation[]>
  );

  // Build table
  let tableText = '```\n';
  tableText += 'Project                 | Phase          | Hours | Billable\n';
  tableText += '------------------------|----------------|-------|----------\n';

  for (const [projectName, projectAllocations] of Object.entries(byProject)) {
    for (const alloc of projectAllocations) {
      const projCol = projectName.substring(0, 23).padEnd(23);
      const phaseCol = (alloc.phaseName || '-').substring(0, 14).padEnd(14);
      const hoursCol = formatHours(alloc.plannedHours).padStart(5);
      const billCol = alloc.isBillable ? ' Yes ' : ' No  ';
      tableText += `${projCol} | ${phaseCol} | ${hoursCol} | ${billCol}\n`;
    }
  }

  // Total row
  const totalHours = allocations.reduce((sum, a) => sum + a.plannedHours, 0);
  tableText += '------------------------|----------------|-------|----------\n';
  tableText += `${'TOTAL'.padEnd(23)} |                | ${formatHours(totalHours).padStart(5)} |\n`;
  tableText += '```';

  blocks.push({
    type: 'section',
    text: mrkdwn(tableText),
  } as SectionBlock);

  return blocks;
}

// ============================================
// Warning Section
// ============================================

/**
 * Build warning blocks from warning array
 */
export function buildWarningSection(warnings: Warning[]): Block[] {
  const blocks: Block[] = [];

  for (const warning of warnings) {
    const emoji = getWarningEmoji(warning.level);
    let text = `${emoji} ${warning.message}`;
    if (warning.context) {
      text += `\n_${warning.context}_`;
    }

    blocks.push({
      type: 'section',
      text: mrkdwn(text),
    } as SectionBlock);
  }

  return blocks;
}

// ============================================
// Simple Text Builders (for DMs)
// ============================================

/**
 * Build a simple markdown string table of allocations for DM messages
 * Unlike buildWeekTable which returns Block[], this returns a plain string
 */
export function buildWeekTableText(allocations: Array<{
  project?: { name: string; color?: string };
  planned_hours: number;
}>): string {
  if (!allocations || allocations.length === 0) {
    return '_No allocations for this week._';
  }

  // Build simple list format (more readable in DMs)
  const lines: string[] = [];
  
  for (const alloc of allocations) {
    const projectName = alloc.project?.name || 'Unknown Project';
    const hours = alloc.planned_hours;
    lines.push(`• *${projectName}:* ${hours}h`);
  }

  return lines.join('\n');
}

// ============================================
// Utility Exports
// ============================================

export {
  plainText,
  mrkdwn,
  button,
  formatHours,
  formatCurrency,
  formatPercentage,
  buildProgressBar,
};
