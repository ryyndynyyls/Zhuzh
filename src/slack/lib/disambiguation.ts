/**
 * Slack Disambiguation Service
 * 
 * Handles ambiguous user/project references in Slack commands
 * by presenting interactive buttons for selection.
 * 
 * Flow:
 * 1. User sends command with ambiguous reference (e.g., "add 4h to Cloud Next")
 * 2. We detect multiple matches, store pending command, show buttons
 * 3. User clicks a button to select the right one
 * 4. We resume the original command with the correct ID
 */

import { WebClient } from '@slack/web-api';
import { supabase } from '../lib/supabase';

// In-memory store for pending disambiguations
// In production, use Redis with TTL
interface PendingDisambiguation {
  userId: string;
  channelId: string;
  originalCommand: string;
  commandType: 'add_time' | 'voice' | 'other';
  context: Record<string, any>;
  createdAt: Date;
  type: 'user' | 'project';
  matches: Array<{
    id: string;
    name: string;
    detail: string;
  }>;
}

const pendingDisambiguations = new Map<string, PendingDisambiguation>();

// Clean up old pending disambiguations (older than 10 minutes)
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, pending] of pendingDisambiguations) {
    if (pending.createdAt.getTime() < cutoff) {
      pendingDisambiguations.delete(id);
    }
  }
}, 60 * 1000);

/**
 * Generate a unique ID for disambiguation sessions
 */
function generateDisambiguationId(): string {
  return `disamb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Store a pending disambiguation and return its ID
 */
export function storePendingDisambiguation(pending: Omit<PendingDisambiguation, 'createdAt'>): string {
  const id = generateDisambiguationId();
  pendingDisambiguations.set(id, {
    ...pending,
    createdAt: new Date()
  });
  return id;
}

/**
 * Get a pending disambiguation by ID
 */
export function getPendingDisambiguation(id: string): PendingDisambiguation | undefined {
  return pendingDisambiguations.get(id);
}

/**
 * Clear a pending disambiguation after it's resolved
 */
export function clearPendingDisambiguation(id: string): void {
  pendingDisambiguations.delete(id);
}

/**
 * Build Slack blocks for user disambiguation
 */
export function buildUserDisambiguationBlocks(
  disambiguationId: string,
  query: string,
  matches: Array<{ id: string; name: string; role: string; job_title?: string }>
): any[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🤔 I found multiple people matching *"${query}"*. Which one did you mean?`
      }
    },
    {
      type: 'divider'
    },
    {
      type: 'actions',
      elements: matches.slice(0, 5).map((match, index) => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: `${match.name}`,
          emoji: true
        },
        style: index === 0 ? 'primary' : undefined,
        action_id: `disambiguate_user_${index}`,
        value: JSON.stringify({
          disambiguationId,
          selectedId: match.id,
          selectedName: match.name
        })
      }))
    },
    {
      type: 'context',
      elements: matches.slice(0, 5).map(match => ({
        type: 'mrkdwn',
        text: `*${match.name}* – ${match.job_title || match.role}`
      }))
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '❌ Cancel',
            emoji: true
          },
          action_id: 'disambiguate_cancel',
          value: disambiguationId
        }
      ]
    }
  ];
}

/**
 * Build Slack blocks for project disambiguation
 */
export function buildProjectDisambiguationBlocks(
  disambiguationId: string,
  query: string,
  matches: Array<{ id: string; name: string; client_name: string }>
): any[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🤔 I found multiple projects matching *"${query}"*. Which one did you mean?`
      }
    },
    {
      type: 'divider'
    },
    {
      type: 'actions',
      elements: matches.slice(0, 5).map((match, index) => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: match.name.length > 40 ? match.name.substring(0, 37) + '...' : match.name,
          emoji: true
        },
        style: index === 0 ? 'primary' : undefined,
        action_id: `disambiguate_project_${index}`,
        value: JSON.stringify({
          disambiguationId,
          selectedId: match.id,
          selectedName: match.name
        })
      }))
    },
    {
      type: 'context',
      elements: matches.slice(0, 5).map(match => ({
        type: 'mrkdwn',
        text: `*${match.name}* – _${match.client_name}_`
      }))
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '❌ Cancel',
            emoji: true
          },
          action_id: 'disambiguate_cancel',
          value: disambiguationId
        }
      ]
    }
  ];
}

/**
 * Search for users with fuzzy matching
 */
export async function findUserMatches(
  orgId: string,
  query: string
): Promise<Array<{ id: string; name: string; role: string; job_title?: string; score: number }>> {
  const searchQuery = query.toLowerCase().trim();
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, role, job_title, nicknames')
    .eq('org_id', orgId)
    .eq('is_active', true);

  if (error || !users) return [];

  // Score each user
  const scored = users.map(user => {
    const nameLower = user.name.toLowerCase();
    const nicknamesLower = (user.nicknames || '').toLowerCase();
    const firstName = nameLower.split(' ')[0];
    
    let score = 0;
    
    // Exact full name match
    if (nameLower === searchQuery) score = 100;
    // First name exact match
    else if (firstName === searchQuery) score = 90;
    // Nickname exact match
    else if (nicknamesLower.split(',').map(n => n.trim()).includes(searchQuery)) score = 85;
    // Name starts with query
    else if (nameLower.startsWith(searchQuery) || firstName.startsWith(searchQuery)) score = 70;
    // Nickname starts with query
    else if (nicknamesLower.split(',').some(n => n.trim().startsWith(searchQuery))) score = 65;
    // Name contains query
    else if (nameLower.includes(searchQuery)) score = 50;
    // Nickname contains query
    else if (nicknamesLower.includes(searchQuery)) score = 45;
    
    return { ...user, score };
  }).filter(u => u.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map(({ id, name, role, job_title, score }) => ({
    id, name, role, job_title: job_title || undefined, score
  }));
}

/**
 * Search for projects with fuzzy matching
 */
export async function findProjectMatches(
  orgId: string,
  query: string
): Promise<Array<{ id: string; name: string; client_name: string; score: number }>> {
  const searchQuery = query.toLowerCase().trim();
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, aliases, client:clients(name)')
    .eq('org_id', orgId)
    .in('status', ['planning', 'active', 'on-hold']);

  if (error || !projects) return [];

  // Score each project
  const scored = projects.map(project => {
    const nameLower = project.name.toLowerCase();
    const aliasesLower = (project.aliases || '').toLowerCase();
    const clientName = (project.client as any)?.name || '';
    const clientLower = clientName.toLowerCase();
    
    let score = 0;
    
    // Exact name match
    if (nameLower === searchQuery) score = 100;
    // Exact alias match
    else if (aliasesLower.split(',').map(a => a.trim()).includes(searchQuery)) score = 95;
    // Name starts with query
    else if (nameLower.startsWith(searchQuery)) score = 80;
    // Alias starts with query
    else if (aliasesLower.split(',').some(a => a.trim().startsWith(searchQuery))) score = 75;
    // Name word starts with query
    else if (nameLower.split(' ').some(word => word.startsWith(searchQuery))) score = 70;
    // Name contains query
    else if (nameLower.includes(searchQuery)) score = 60;
    // Alias contains query
    else if (aliasesLower.includes(searchQuery)) score = 55;
    // Client name contains query
    else if (clientLower.includes(searchQuery)) score = 40;
    
    return { 
      id: project.id, 
      name: project.name, 
      client_name: clientName || 'No Client',
      score 
    };
  }).filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored;
}

/**
 * Check if disambiguation is needed for a user query
 * Returns null if unique match found, or matches if disambiguation needed
 */
export async function checkUserDisambiguation(
  orgId: string,
  query: string
): Promise<{ needsDisambiguation: boolean; matches: Array<{ id: string; name: string; role: string; job_title?: string; score: number }> } | { needsDisambiguation: false; match: { id: string; name: string } }> {
  const matches = await findUserMatches(orgId, query);
  
  if (matches.length === 0) {
    return { needsDisambiguation: true, matches: [] };
  }
  
  // If top match is significantly better than second, use it
  if (matches.length === 1 || (matches[0].score >= 90 && (matches.length === 1 || matches[0].score - matches[1].score >= 20))) {
    return { 
      needsDisambiguation: false, 
      match: { id: matches[0].id, name: matches[0].name }
    };
  }
  
  // Multiple good matches - need disambiguation
  return { needsDisambiguation: true, matches };
}

/**
 * Check if disambiguation is needed for a project query
 */
export async function checkProjectDisambiguation(
  orgId: string,
  query: string
): Promise<{ needsDisambiguation: boolean; matches: Array<{ id: string; name: string; client_name: string; score: number }> } | { needsDisambiguation: false; match: { id: string; name: string } }> {
  const matches = await findProjectMatches(orgId, query);
  
  if (matches.length === 0) {
    return { needsDisambiguation: true, matches: [] };
  }
  
  // If top match is significantly better than second, use it
  if (matches.length === 1 || (matches[0].score >= 90 && (matches.length === 1 || matches[0].score - matches[1].score >= 20))) {
    return { 
      needsDisambiguation: false, 
      match: { id: matches[0].id, name: matches[0].name }
    };
  }
  
  // Multiple good matches - need disambiguation
  return { needsDisambiguation: true, matches };
}

/**
 * Send disambiguation message to user
 */
export async function sendUserDisambiguation(
  client: WebClient,
  channelId: string,
  userId: string,
  query: string,
  matches: Array<{ id: string; name: string; role: string; job_title?: string }>,
  pendingContext: {
    originalCommand: string;
    commandType: 'add_time' | 'voice' | 'other';
    context: Record<string, any>;
  }
): Promise<void> {
  const disambiguationId = storePendingDisambiguation({
    userId,
    channelId,
    originalCommand: pendingContext.originalCommand,
    commandType: pendingContext.commandType,
    context: pendingContext.context,
    type: 'user',
    matches: matches.map(m => ({ id: m.id, name: m.name, detail: m.job_title || m.role }))
  });

  await client.chat.postEphemeral({
    channel: channelId,
    user: userId,
    blocks: buildUserDisambiguationBlocks(disambiguationId, query, matches),
    text: `Multiple people match "${query}". Please select one.`
  });
}

/**
 * Send project disambiguation message to user
 */
export async function sendProjectDisambiguation(
  client: WebClient,
  channelId: string,
  userId: string,
  query: string,
  matches: Array<{ id: string; name: string; client_name: string }>,
  pendingContext: {
    originalCommand: string;
    commandType: 'add_time' | 'voice' | 'other';
    context: Record<string, any>;
  }
): Promise<void> {
  const disambiguationId = storePendingDisambiguation({
    userId,
    channelId,
    originalCommand: pendingContext.originalCommand,
    commandType: pendingContext.commandType,
    context: pendingContext.context,
    type: 'project',
    matches: matches.map(m => ({ id: m.id, name: m.name, detail: m.client_name }))
  });

  await client.chat.postEphemeral({
    channel: channelId,
    user: userId,
    blocks: buildProjectDisambiguationBlocks(disambiguationId, query, matches),
    text: `Multiple projects match "${query}". Please select one.`
  });
}
