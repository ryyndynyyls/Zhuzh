import type { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';
import { sendTimesheetSubmittedNotification } from '../notifications/timesheetSubmitted';
import { buildConfirmWeekModal } from '../views/confirmWeek';

// Helper to format week label
function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function registerViewSubmissions(app: App) {
  // Handle confirm week submission
  app.view('confirm_week_submit', async ({ ack, body, view, client }) => {
    await ack();
    console.log('📝 Timesheet submission started...');

    const slackUserId = body.user.id;
    const metadata = JSON.parse(view.private_metadata);
    const { weekStart, confirmationId } = metadata;

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user) {
      console.log('  ❌ User not found');
      return;
    }
    console.log(`  User: ${user.email}`);
    console.log(`  Week: ${weekStart}`);

    // Extract hours from form values
    const values = view.state.values;
    const entries: Array<{ allocation_id: string; actual_hours: number }> = [];

    for (const [blockId, block] of Object.entries(values)) {
      if (blockId.startsWith('hours_')) {
        const allocationId = blockId.replace('hours_', '');
        const hoursBlock = block as any;
        const actualHours = parseFloat(hoursBlock.actual_hours?.value || '0');
        entries.push({ allocation_id: allocationId, actual_hours: actualHours });
        console.log(`  Entry: ${allocationId} = ${actualHours}h`);
      }
    }

    const notesBlock = values.notes as any;
    const notes = notesBlock?.notes_input?.value || null;
    if (notes) console.log(`  Notes: "${notes}"`);

    // Create or update confirmation
    let confirmation;
    if (confirmationId) {
      // Update existing (clear approval on resubmit)
      console.log(`  Updating existing confirmation: ${confirmationId}`);
      const { data, error } = await supabase
        .from('time_confirmations')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          approved_by: null,
          approved_at: null,
          rejection_reason: null,
          notes
        })
        .eq('id', confirmationId)
        .select()
        .single();
      if (error) console.log('  ❌ Update error:', error);
      confirmation = data;
    } else {
      // Create new
      console.log('  Creating new confirmation...');
      const { data, error } = await supabase
        .from('time_confirmations')
        .insert({
          user_id: user.id,
          week_start: weekStart,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          notes
        })
        .select()
        .single();
      if (error) console.log('  ❌ Insert error:', error);
      confirmation = data;
    }

    if (!confirmation) {
      console.log('  ❌ No confirmation created');
      return;
    }
    console.log(`  ✅ Confirmation ID: ${confirmation.id}`);

    // Get allocations for planned hours and check for exact match
    const { data: allocations } = await supabase
      .from('allocations')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart);

    let exactMatchFlag = true;

    // Delete existing PLANNED entries (keep unplanned ones)
    await supabase
      .from('time_entries')
      .delete()
      .eq('confirmation_id', confirmation.id)
      .eq('is_unplanned', false);

    console.log('  Creating time entries...');
    for (const entry of entries) {
      const allocation = allocations?.find(a => a.id === entry.allocation_id);
      if (allocation) {
        if (allocation.planned_hours !== entry.actual_hours) {
          exactMatchFlag = false;
        }

        const { error: entryError } = await supabase
          .from('time_entries')
          .insert({
            confirmation_id: confirmation.id,
            project_id: allocation.project_id,
            phase_id: allocation.phase_id,
            allocation_id: allocation.id,
            planned_hours: allocation.planned_hours,
            actual_hours: entry.actual_hours,
            is_unplanned: false
          });
        if (entryError) console.log('  ❌ Entry error:', entryError);
      }
    }

    console.log(`  Exact match: ${exactMatchFlag}`);

    // Update exact_match_flag
    await supabase
      .from('time_confirmations')
      .update({ exact_match_flag: exactMatchFlag })
      .eq('id', confirmation.id);

    // Notify managers
    console.log('  Notifying managers...');
    try {
      await sendTimesheetSubmittedNotification(app, confirmation.id);
      console.log('  ✅ Managers notified');
    } catch (notifyError) {
      console.log('  ⚠️ Notification error:', notifyError);
    }

    // Confirm to user with rich feedback
    const totalActual = entries.reduce((sum, e) => sum + e.actual_hours, 0);
    const weekLabel = formatWeekLabel(weekStart);
    
    await client.chat.postMessage({
      channel: slackUserId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Timesheet submitted!*\n\nYour hours for *${weekLabel}* have been sent for approval.`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `📊 *${totalActual}h* total · ${entries.length} project${entries.length !== 1 ? 's' : ''}`
            }
          ]
        }
      ],
      text: `✅ Timesheet submitted! ${totalActual}h for ${weekLabel}`
    });

    console.log('  ✅ Submission complete!\n');
  });

  // Handle add unplanned work submission
  app.view('add_unplanned_submit', async ({ ack, body, view, client }) => {
    await ack();
    console.log('➕ Add unplanned work started...');

    const slackUserId = body.user.id;
    const metadata = JSON.parse(view.private_metadata);
    const { weekStart, parentViewId, timezone } = metadata;
    const values = view.state.values;

    const projectBlock = values.project as any;
    const projectId = projectBlock?.project_select?.selected_option?.value;
    const hoursBlock = values.hours as any;
    const hours = parseFloat(hoursBlock?.hours_input?.value || '0');
    const descBlock = values.description as any;
    const description = descBlock?.description_input?.value;
    const tagsBlock = values.tags as any;
    const tags = tagsBlock?.tags_select?.selected_options?.map((o: any) => o.value) || [];

    console.log(`  Project: ${projectId}`);
    console.log(`  Hours: ${hours}`);
    console.log(`  Description: ${description}`);
    console.log(`  Tags: ${tags.join(', ')}`);

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!user || !projectId) {
      console.log('  ❌ User not found or no project selected');
      return;
    }

    // Get or create confirmation for this week
    let { data: confirmation } = await supabase
      .from('time_confirmations')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single();

    if (!confirmation) {
      console.log('  Creating draft confirmation...');
      const { data, error } = await supabase
        .from('time_confirmations')
        .insert({
          user_id: user.id,
          week_start: weekStart,
          status: 'draft'
        })
        .select()
        .single();
      if (error) console.log('  ❌ Error:', error);
      confirmation = data;
    }

    if (!confirmation) {
      console.log('  ❌ No confirmation');
      return;
    }

    // Add unplanned entry
    const { error: entryError } = await supabase
      .from('time_entries')
      .insert({
        confirmation_id: confirmation.id,
        project_id: projectId,
        planned_hours: 0,
        actual_hours: hours,
        is_unplanned: true,
        notes: description,
        tags
      });

    if (entryError) {
      console.log('  ❌ Entry error:', entryError);
    } else {
      console.log('  ✅ Unplanned work added');
    }

    // REFRESH THE PARENT MODAL with updated data
    if (parentViewId) {
      console.log('  🔄 Refreshing parent modal...');
      
      try {
        // Get allocations
        const { data: allocations } = await supabase
          .from('allocations')
          .select('*, project:projects(name, color), phase:project_phases(name)')
          .eq('user_id', user.id)
          .eq('week_start', weekStart);

        // Get unplanned entries
        const { data: unplannedEntries } = await supabase
          .from('time_entries')
          .select('*, project:projects(name)')
          .eq('confirmation_id', confirmation.id)
          .eq('is_unplanned', true);

        // Update the parent modal
        await client.views.update({
          view_id: parentViewId,
          view: buildConfirmWeekModal(
            allocations || [],
            weekStart,
            confirmation,
            timezone || 'America/Los_Angeles',
            unplannedEntries || []
          )
        });

        console.log('  ✅ Parent modal refreshed!');
      } catch (updateError) {
        console.log('  ⚠️ Could not refresh parent modal:', updateError);
        // Fall back to DM notification
        await client.chat.postMessage({
          channel: slackUserId,
          text: `✅ Added ${hours}h of unplanned work. Re-open /week to see it in your timesheet.`
        });
      }
    } else {
      // No parent view ID, send DM
      await client.chat.postMessage({
        channel: slackUserId,
        text: `✅ Added ${hours}h of unplanned work. Don't forget to submit your timesheet!`
      });
    }
  });
}
