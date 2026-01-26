import type { View } from '@slack/bolt';

interface Project {
  id: string;
  name: string;
  phases?: { id: string; name: string }[];
}

export function buildAddUnplannedWorkModal(
  projects: Project[],
  weekStart: string,
  parentViewId?: string,
  timezone: string = 'America/Los_Angeles'
): View {
  return {
    type: 'modal',
    callback_id: 'add_unplanned_submit',
    private_metadata: JSON.stringify({ weekStart, parentViewId, timezone }),
    title: { type: 'plain_text', text: 'Add Unplanned Work' },
    submit: { type: 'plain_text', text: 'Add' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      // Project select
      {
        type: 'input',
        block_id: 'project',
        label: { type: 'plain_text', text: 'Project' },
        element: {
          type: 'static_select',
          action_id: 'project_select',
          placeholder: { type: 'plain_text', text: 'Select a project' },
          options: projects.map(p => ({
            text: { type: 'plain_text', text: p.name },
            value: p.id
          }))
        }
      },
      // Hours input
      {
        type: 'input',
        block_id: 'hours',
        label: { type: 'plain_text', text: 'Hours' },
        element: {
          type: 'number_input',
          action_id: 'hours_input',
          is_decimal_allowed: true,
          placeholder: { type: 'plain_text', text: 'Enter hours' }
        }
      },
      // Description
      {
        type: 'input',
        block_id: 'description',
        label: { type: 'plain_text', text: 'Description' },
        element: {
          type: 'plain_text_input',
          action_id: 'description_input',
          multiline: true,
          placeholder: { type: 'plain_text', text: 'What did you work on?' }
        }
      },
      // Quick tags
      {
        type: 'input',
        block_id: 'tags',
        label: { type: 'plain_text', text: 'Tags (optional)' },
        element: {
          type: 'checkboxes',
          action_id: 'tags_select',
          options: [
            { text: { type: 'plain_text', text: '🔥 Urgent fix' }, value: 'urgent' },
            { text: { type: 'plain_text', text: '📞 Client call' }, value: 'client-call' },
            { text: { type: 'plain_text', text: '🔧 Tech debt' }, value: 'tech-debt' },
            { text: { type: 'plain_text', text: '📈 Scope creep' }, value: 'scope-creep' }
          ]
        },
        optional: true
      }
    ]
  };
}
