import type { View } from '@slack/types';
import { formatWeekRange } from '../../lib/timezone';

interface Allocation {
  id: string;
  project: { name: string; color: string | null };
  phase?: { name: string } | null;
  planned_hours: number;
}

interface UnplannedEntry {
  id: string;
  project: { name: string };
  actual_hours: number;
  notes?: string | null;
}

interface ExistingConfirmation {
  id: string;
  status: string;
  notes?: string | null;
}

// Map hex colors to closest emoji circles
function getColorEmoji(hexColor: string): string {
  const colorMap: Record<string, string> = {
    // Blues
    '#2196F3': '🔵', '#1976D2': '🔵', '#0D47A1': '🔵',
    // Greens  
    '#4CAF50': '🟢', '#388E3C': '🟢', '#1B5E20': '🟢',
    // Reds
    '#F44336': '🔴', '#D32F2F': '🔴', '#B71C1C': '🔴',
    // Oranges
    '#FF9800': '🟠', '#F57C00': '🟠', '#E65100': '🟠',
    // Yellows
    '#FFEB3B': '🟡', '#FBC02D': '🟡', '#F9A825': '🟡',
    // Purples
    '#9C27B0': '🟣', '#7B1FA2': '🟣', '#4A148C': '🟣',
    // Browns
    '#795548': '🟤', '#5D4037': '🟤', '#3E2723': '🟤',
    // Grays
    '#9E9E9E': '⚪', '#607D8B': '⚪',
  };
  
  // Direct match
  const upper = hexColor?.toUpperCase();
  if (colorMap[upper]) return colorMap[upper];
  
  // Fallback: parse hex and find closest
  if (hexColor?.startsWith('#') && hexColor.length === 7) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Simple hue detection
    if (r > 200 && g < 100 && b < 100) return '🔴';
    if (r > 200 && g > 150 && b < 100) return '🟠';
    if (r > 200 && g > 200 && b < 100) return '🟡';
    if (r < 100 && g > 150 && b < 100) return '🟢';
    if (r < 100 && g < 150 && b > 200) return '🔵';
    if (r > 150 && g < 100 && b > 150) return '🟣';
    if (r > 100 && g < 100 && b < 100) return '🟤';
  }
  
  return '⚪'; // Default
}

export function buildConfirmWeekModal(
  allocations: Allocation[],
  weekStart: string,
  existing?: ExistingConfirmation | null,
  timezone: string = 'America/Los_Angeles',
  unplannedEntries: UnplannedEntry[] = []
): View {
  const weekLabel = formatWeekRange(weekStart, timezone);
  const status = existing?.status;
  const isApproved = status === 'approved';
  const isSubmitted = status === 'submitted';
  const isRejected = status === 'rejected';

  // Calculate totals
  const totalPlanned = allocations.reduce((sum, a) => sum + a.planned_hours, 0);
  const totalUnplanned = unplannedEntries.reduce((sum, e) => sum + e.actual_hours, 0);

  // Build the modal
  const blocks: any[] = [];

  // ═══════════════════════════════════════════
  // HEADER: Week date (always prominent)
  // ═══════════════════════════════════════════
  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: weekLabel, emoji: true }
  });

  // Summary line
  if (!isApproved && !isSubmitted && !isRejected) {
    blocks.push({
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `${totalPlanned}h planned  ·  ${allocations.length} project${allocations.length !== 1 ? 's' : ''}`
      }]
    });
  }

  blocks.push({ type: 'divider' });

  // ═══════════════════════════════════════════
  // PROJECT INPUTS: Color-coded with clear separation
  // ═══════════════════════════════════════════
  for (const alloc of allocations) {
    const colorDot = getColorEmoji(alloc.project.color ?? '#808080');
    const phaseSuffix = alloc.phase ? `  ›  ${alloc.phase.name}` : '';
    
    blocks.push({
      type: 'input',
      block_id: `hours_${alloc.id}`,
      label: {
        type: 'plain_text',
        text: `${colorDot}  ${alloc.project.name}${phaseSuffix}`
      },
      hint: {
        type: 'plain_text',
        text: `Planned: ${alloc.planned_hours}h`
      },
      element: {
        type: 'number_input',
        action_id: 'actual_hours',
        is_decimal_allowed: true,
        initial_value: String(alloc.planned_hours),
        placeholder: { type: 'plain_text', text: 'Hours' }
      },
      optional: false
    });
  }

  // ═══════════════════════════════════════════
  // UNPLANNED WORK: Cleaner hierarchy
  // ═══════════════════════════════════════════
  if (unplannedEntries.length > 0) {
    blocks.push({ type: 'divider' });
    
    // Section header
    blocks.push({
      type: 'section',
      text: { 
        type: 'mrkdwn', 
        text: `*Unplanned Work*  ·  ${totalUnplanned}h`
      }
    });

    // List each entry clearly
    const entryLines = unplannedEntries.map(entry => {
      const note = entry.notes ? ` — _${entry.notes}_` : '';
      return `• ${entry.project.name}: *${entry.actual_hours}h*${note}`;
    });

    blocks.push({
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: entryLines.join('\n')
      }]
    });
  }

  // ═══════════════════════════════════════════
  // ADD BUTTON + NOTES
  // ═══════════════════════════════════════════
  blocks.push(
    { type: 'divider' },
    {
      type: 'actions',
      block_id: 'add_work_actions',
      elements: [{
        type: 'button',
        action_id: 'add_unplanned_work',
        text: { type: 'plain_text', text: '+ Add Unplanned Work', emoji: true }
      }]
    },
    {
      type: 'input',
      block_id: 'notes',
      label: { type: 'plain_text', text: 'Notes' },
      element: {
        type: 'plain_text_input',
        action_id: 'notes_input',
        multiline: true,
        initial_value: existing?.notes || '',
        placeholder: { type: 'plain_text', text: 'Anything to note about this week?' }
      },
      optional: true
    }
  );

  // ═══════════════════════════════════════════
  // STATUS BANNER (at bottom, before submit)
  // ═══════════════════════════════════════════
  if (isSubmitted) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: '📤  *Submitted* — awaiting approval. Editing will require re-approval.'
        }]
      }
    );
  } else if (isRejected) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: '⚠️  *Needs revision* — please review and resubmit.'
        }]
      }
    );
  } else if (isApproved) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: '✅  *Approved* — this timesheet has been approved.'
        }]
      }
    );
  }

  // Submit button text
  let submitButtonText = 'Submit';
  if (isSubmitted || isRejected) {
    submitButtonText = 'Resubmit';
  }

  return {
    type: 'modal',
    callback_id: 'confirm_week_submit',
    private_metadata: JSON.stringify({ weekStart, confirmationId: existing?.id }),
    title: { type: 'plain_text', text: 'Confirm Hours' },
    submit: isApproved ? undefined : { type: 'plain_text', text: submitButtonText },
    close: { type: 'plain_text', text: isApproved ? 'Done' : 'Cancel' },
    blocks
  } as View;
}
