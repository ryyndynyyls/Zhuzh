/**
 * Conversational Message Handler
 * 
 * Listens for DM replies to Zhuzh and handles:
 * - Numbered selections from disambiguation (e.g., "1", "2")
 * - Text replies that match options (e.g., "Cloud Next")
 * - Confirmations ("yes", "no", "cancel")
 * 
 * This enables natural conversation flow:
 * 
 * User: /zhuzh add 4h to GCN for Ryan next week
 * Zhuzh: I found multiple projects matching "GCN". Reply with a number:
 *        1️⃣ Google Cloud Next 2026 (Google)
 *        2️⃣ GNI 2025 (Google)
 *        Or type "cancel" to abort.
 * User: 1
 * Zhuzh: ✅ Added 4h to Google Cloud Next 2026 for Ryan Daniels (Jan 27-31)
 */

import type { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';

// =============================================================================
// Conversation State Management
// =============================================================================

interface ConversationState {
  userId: string;
  channelId: string;
  type: 'project_disambiguation' | 'user_disambiguation' | 'hours_input' | 'confirmation';
  originalCommand: string;
  context: Record<string, any>;
  options?: Array<{ id: string; name: string; detail?: string }>;
  createdAt: Date;
  expiresAt: Date;
}

// In-memory conversation store (keyed by `${channelId}_${userId}`)
// In production, use Redis with TTL
const conversationStates = new Map<string, ConversationState>();

// Cleanup expired conversations every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of conversationStates) {
    if (state.expiresAt.getTime() < now) {
      conversationStates.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Store a conversation state
 */
export function setConversationState(
  channelId: string,
  userId: string,
  state: Omit<ConversationState, 'userId' | 'channelId' | 'createdAt' | 'expiresAt'>
): void {
  const key = `${channelId}_${userId}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minute TTL
  
  conversationStates.set(key, {
    ...state,
    userId,
    channelId,
    createdAt: now,
    expiresAt
  });
}

/**
 * Get conversation state
 */
export function getConversationState(channelId: string, userId: string): ConversationState | undefined {
  return conversationStates.get(`${channelId}_${userId}`);
}

/**
 * Clear conversation state
 */
export function clearConversationState(channelId: string, userId: string): void {
  conversationStates.delete(`${channelId}_${userId}`);
}

// =============================================================================
// Message Formatting
// =============================================================================

/**
 * Format a list of options as numbered choices
 */
export function formatNumberedOptions(
  options: Array<{ id: string; name: string; detail?: string }>
): string {
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  
  return options
    .slice(0, 10)
    .map((opt, i) => `${emojis[i]} *${opt.name}*${opt.detail ? ` _(${opt.detail})_` : ''}`)
    .join('\n');
}

/**
 * Send a disambiguation message and set up conversation state
 */
export async function sendDisambiguationMessage(
  client: any,
  channelId: string,
  userId: string,
  type: 'project' | 'user',
  query: string,
  options: Array<{ id: string; name: string; detail?: string }>,
  originalCommand: string,
  context: Record<string, any>
): Promise<void> {
  const entityType = type === 'project' ? 'projects' : 'people';
  const optionsList = formatNumberedOptions(options);
  
  // Store conversation state
  setConversationState(channelId, userId, {
    type: type === 'project' ? 'project_disambiguation' : 'user_disambiguation',
    originalCommand,
    context,
    options
  });

  // Send the message
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🤔 I found multiple ${entityType} matching *"${query}"*. Reply with a number:`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: optionsList
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '_Reply with a number (1-' + options.length + '), type a name, or say "cancel"_'
          }
        ]
      }
    ],
    text: `Multiple ${entityType} match "${query}". Please reply with a number.`
  });
}

/**
 * Send a quick hours input prompt
 */
export async function sendHoursPrompt(
  client: any,
  channelId: string,
  userId: string,
  projectName: string,
  projectId: string,
  weekStart: string,
  context: Record<string, any>
): Promise<void> {
  setConversationState(channelId, userId, {
    type: 'hours_input',
    originalCommand: `add time to ${projectName}`,
    context: { ...context, projectId, projectName, weekStart }
  });

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ Got it! Adding time to *${projectName}*.\n\nHow many hours? (e.g., "4" or "4.5")`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Week of ${weekStart} • Reply with a number or "cancel"_`
          }
        ]
      }
    ],
    text: `How many hours to add to ${projectName}?`
  });
}

// =============================================================================
// Message Handler Registration
// =============================================================================

export function registerConversationalHandler(app: App) {
  // Listen for all direct messages to the bot
  app.message(async ({ message, client, say }) => {
    // Only handle messages in DMs (im channel type)
    // Ignore bot messages
    if ((message as any).subtype || (message as any).bot_id) return;
    
    const userId = (message as any).user;
    const channelId = (message as any).channel;
    const text = ((message as any).text || '').trim();
    
    // Check if there's an active conversation state
    const state = getConversationState(channelId, userId);
    
    if (!state) {
      // No active conversation - this might be a new command or just chat
      // Could route to Gemini for natural language, but for now just acknowledge
      return;
    }
    
    // Handle cancel
    if (text.toLowerCase() === 'cancel' || text.toLowerCase() === 'nevermind' || text.toLowerCase() === 'abort') {
      clearConversationState(channelId, userId);
      await say('👍 No problem, cancelled.');
      return;
    }
    
    // Route to appropriate handler based on conversation type
    switch (state.type) {
      case 'project_disambiguation':
      case 'user_disambiguation':
        await handleDisambiguationReply(client, say, state, text, userId, channelId);
        break;
        
      case 'hours_input':
        await handleHoursInput(client, say, state, text, userId, channelId);
        break;
        
      case 'confirmation':
        await handleConfirmationReply(client, say, state, text, userId, channelId);
        break;
    }
  });
}

// =============================================================================
// Reply Handlers
// =============================================================================

async function handleDisambiguationReply(
  client: any,
  say: any,
  state: ConversationState,
  text: string,
  userId: string,
  channelId: string
): Promise<void> {
  const options = state.options || [];
  let selectedOption: { id: string; name: string; detail?: string } | null = null;
  
  // Try to parse as a number (1-based index)
  const numericInput = parseInt(text, 10);
  if (!isNaN(numericInput) && numericInput >= 1 && numericInput <= options.length) {
    selectedOption = options[numericInput - 1];
  }
  
  // Try to match by name
  if (!selectedOption) {
    const textLower = text.toLowerCase();
    selectedOption = options.find(opt => 
      opt.name.toLowerCase() === textLower ||
      opt.name.toLowerCase().includes(textLower) ||
      opt.name.toLowerCase().startsWith(textLower)
    ) || null;
  }
  
  if (!selectedOption) {
    // Couldn't match - ask again
    await say(`❓ I didn't understand "${text}". Please reply with a number (1-${options.length}) or type the name.`);
    return;
  }
  
  // Clear the conversation state
  clearConversationState(channelId, userId);
  
  // Now complete the original action
  const isProject = state.type === 'project_disambiguation';
  
  if (isProject) {
    // Ask for hours
    await sendHoursPrompt(
      client,
      channelId,
      userId,
      selectedOption.name,
      selectedOption.id,
      state.context.weekStart || getCurrentWeekStart(),
      state.context
    );
  } else {
    // User disambiguation - resume with selected user
    state.context.selectedUserId = selectedOption.id;
    state.context.selectedUserName = selectedOption.name;
    
    await say(`✅ Using *${selectedOption.name}*. Processing your request...`);
    
    // TODO: Call voice command processor with resolved user
  }
}

async function handleHoursInput(
  client: any,
  say: any,
  state: ConversationState,
  text: string,
  userId: string,
  channelId: string
): Promise<void> {
  // Parse hours from input
  const hours = parseFloat(text.replace(/[^0-9.]/g, ''));
  
  if (isNaN(hours) || hours <= 0 || hours > 80) {
    await say(`❓ Please enter a valid number of hours (e.g., "4" or "4.5"). Maximum is 80 hours.`);
    return;
  }
  
  const { projectId, projectName, weekStart } = state.context;
  
  // Get user from Slack ID
  const { data: user } = await supabase
    .from('users')
    .select('id, name, org_id')
    .eq('slack_user_id', userId)
    .single();

  if (!user) {
    await say('❌ Your Slack account is not linked to Zhuzh. Please contact an admin.');
    clearConversationState(channelId, userId);
    return;
  }

  // Check for existing allocation
  const { data: existing } = await supabase
    .from('allocations')
    .select('id, planned_hours')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .eq('week_start', weekStart)
    .single();

  let totalHours = hours;
  
  if (existing) {
    // Update existing allocation
    totalHours = existing.planned_hours + hours;
    const { error } = await supabase
      .from('allocations')
      .update({ planned_hours: totalHours })
      .eq('id', existing.id);

    if (error) {
      await say(`❌ Failed to update allocation: ${error.message}`);
      clearConversationState(channelId, userId);
      return;
    }
  } else {
    // Create new allocation
    const { error } = await supabase
      .from('allocations')
      .insert({
        user_id: user.id,
        project_id: projectId,
        week_start: weekStart,
        planned_hours: hours,
        is_billable: true,
        created_by: user.id,
        org_id: user.org_id
      });

    if (error) {
      await say(`❌ Failed to create allocation: ${error.message}`);
      clearConversationState(channelId, userId);
      return;
    }
  }

  // Clear conversation and confirm
  clearConversationState(channelId, userId);
  
  const weekLabel = formatWeekLabel(weekStart);
  const existingNote = existing ? ` (total now: ${totalHours}h)` : '';
  
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Done!* Added ${hours}h to *${projectName}*${existingNote}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📅 ${weekLabel} • ${user.name}`
          }
        ]
      }
    ],
    text: `Added ${hours}h to ${projectName}`
  });
}

async function handleConfirmationReply(
  client: any,
  say: any,
  state: ConversationState,
  text: string,
  userId: string,
  channelId: string
): Promise<void> {
  const textLower = text.toLowerCase();
  
  if (textLower === 'yes' || textLower === 'y' || textLower === 'confirm' || textLower === 'ok') {
    clearConversationState(channelId, userId);
    // Execute the pending action
    // TODO: Implement based on what was being confirmed
    await say('✅ Confirmed!');
  } else if (textLower === 'no' || textLower === 'n') {
    clearConversationState(channelId, userId);
    await say('👍 No problem, cancelled.');
  } else {
    await say('❓ Please reply "yes" or "no".');
  }
}

// =============================================================================
// Helpers
// =============================================================================

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
