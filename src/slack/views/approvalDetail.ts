import type { View } from '@slack/bolt';

interface TimeEntry {
  project: { name: string };
  phase?: { name: string };
  planned_hours: number;
  actual_hours: number;
}

interface Confirmation {
  id: string;
  user: { name: string };
  week_start: string;
  entries: TimeEntry[];
  notes?: string;
  exact_match_flag: boolean;
}

export function buildApprovalDetailModal(confirmation: Confirmation): View {
  const totalPlanned = confirmation.entries.reduce((sum, e) => sum + e.planned_hours, 0);
  const totalActual = confirmation.entries.reduce((sum, e) => sum + e.actual_hours, 0);
  const variance = totalActual - totalPlanned;
  const variancePercent = totalPlanned > 0 ? Math.abs(variance / totalPlanned * 100) : 0;

  return {
    type: 'modal',
    callback_id: 'approval_detail_action',
    private_metadata: JSON.stringify({ confirmationId: confirmation.id }),
    title: { type: 'plain_text', text: 'Review Timesheet' },
    close: { type: 'plain_text', text: 'Close' },
    blocks: [
      // Employee header
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Employee:* ${confirmation.user.name}\n*Week:* ${formatWeekLabel(confirmation.week_start)}` }
      },
      { type: 'divider' },
      // Warnings
      ...(variancePercent > 10 ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `⚠️ *Variance Warning:* ${variancePercent.toFixed(0)}% difference from plan` }
      }] : []),
      ...(confirmation.exact_match_flag ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `🔍 *Rubber-Stamp Alert:* Actual hours exactly match planned` }
      }] : []),
      // Entries table header
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Project | Planned | Actual | Variance*' }
      },
      // Entries
      ...confirmation.entries.map(entry => {
        const diff = entry.actual_hours - entry.planned_hours;
        const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? String(diff) : '0';
        const emoji = diff > 0 ? '🔴' : diff < 0 ? '🟡' : '✅';
        return {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${entry.project.name}${entry.phase ? ` (${entry.phase.name})` : ''} | ${entry.planned_hours}h | ${entry.actual_hours}h | ${emoji} ${diffStr}h`
          }
        };
      }),
      { type: 'divider' },
      // Totals
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Totals:* ${totalPlanned}h planned → ${totalActual}h actual (${variance >= 0 ? '+' : ''}${variance}h)` }
      },
      // Notes
      ...(confirmation.notes ? [
        { type: 'divider' },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Notes:*\n${confirmation.notes}` }
        }
      ] : []),
      // Action buttons
      { type: 'divider' },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'approve_from_modal',
            text: { type: 'plain_text', text: '✅ Approve' },
            style: 'primary',
            value: confirmation.id
          },
          {
            type: 'button',
            action_id: 'reject_from_modal',
            text: { type: 'plain_text', text: '❌ Reject' },
            style: 'danger',
            value: confirmation.id
          }
        ]
      }
    ]
  };
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
