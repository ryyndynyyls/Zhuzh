/**
 * Voice Routes - Natural language command processing
 *
 * Endpoints for the Resource Wizard voice/text command system
 *
 * Debug: Set ZHUZH_DEBUG=true or NODE_ENV=development to see logs
 */

import { Router } from 'express';
import { VoiceCommandSchema, validate } from '../schemas';
import {
  processCommand,
  buildResourceWizardContext,
  executeActions,
  previewActions,
  searchUsers,
  searchProjects,
  getUserAvailability,
  getProjectStatus,
  ProcessRequest,
  ExecuteRequest,
  ConversationMessage
} from '../../lib/resource-wizard';
import { classifyRequest } from '../../lib/resource-wizard/classifier';
import { generateInsights } from '../../lib/resource-wizard/insight-engine';
import { evaluateAdvisory } from '../../lib/resource-wizard/advisory-engine';
import { formatResponse, selectTone, generateProactiveOpener } from '../../lib/resource-wizard/personality';
import type { ResourceInsight } from '../../lib/resource-wizard/types';

// Debug helper for API routes
const DEBUG = process.env.ZHUZH_DEBUG === 'true' || process.env.NODE_ENV === 'development';
function debug(endpoint: string, message: string, data?: any) {
  if (DEBUG) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    console.log(`[Zhuzh:API:${endpoint}] ${timestamp} ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : '');
  }
}

/**
 * Strip UUIDs from user-facing messages
 * Matches patterns like [ID: uuid] or (ID: uuid)
 */
function stripUUIDs(text: string): string {
  return text.replace(/\s*[\[(]ID:\s*[a-f0-9-]{36}[\])]/gi, '');
}

const router = Router();

// In-memory conversation store (would use Redis in production)
const conversations = new Map<string, {
  messages: ConversationMessage[];
  orgId: string;
  userId: string;
  createdAt: Date;
}>();

// Clean up old conversations (older than 30 minutes)
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, conv] of conversations) {
    if (conv.createdAt.getTime() < cutoff) {
      conversations.delete(id);
    }
  }
}, 5 * 60 * 1000);

/**
 * Process a voice/text command
 * POST /api/voice/process
 */
router.post('/process', async (req, res) => {
  // Validate input with Zod
  const validation = validate(VoiceCommandSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid request',
      details: validation.errors.issues
    });
  }
  const { text, context: validatedContext } = validation.data;
  const { conversation_id } = req.body as ProcessRequest;
  const orgId = req.query.orgId as string;
  const userId = req.query.userId as string;

  // Cast validated context to expected type
  const reqContext = validatedContext as { selected_project?: string; selected_users?: string[] } | undefined;

  debug('/process', '→ Incoming request', { text, orgId, userId, hasContext: !!reqContext });

  if (!orgId) {
    debug('/process', '❌ Missing orgId');
    return res.status(400).json({ error: 'orgId query param is required' });
  }

  if (!userId) {
    debug('/process', '❌ Missing userId');
    return res.status(400).json({ error: 'userId query param is required' });
  }

  try {
    // Get existing conversation history if continuing
    let conversationHistory: ConversationMessage[] = [];
    if (conversation_id && conversations.has(conversation_id)) {
      conversationHistory = conversations.get(conversation_id)!.messages;
      debug('/process', '📚 Continuing conversation', { id: conversation_id, historyLength: conversationHistory.length });
    }

    // Build context from database
    debug('/process', '📊 Building context...');
    const context = await buildResourceWizardContext({
      orgId,
      weeks: 4,
      focusProjectId: reqContext?.selected_project,
      focusUserIds: reqContext?.selected_users,
      conversationHistory
    });
    debug('/process', '✓ Context built', {
      usersCount: context.users.length,
      projectsCount: context.projects.length,
      org: context.org.name
    });

    // 1. Classify the request
    const classification = classifyRequest(text);
    debug('/process', '📋 Classified request', classification);

    // 2. For insight requests, pre-generate insights
    let preGeneratedInsights: ResourceInsight[] = [];
    if (classification.category === 'insight') {
      preGeneratedInsights = generateInsights(context);
    }

    // 3. Always check for critical issues to surface proactively
    const criticalInsights = generateInsights(context).filter(i => i.severity === 'critical');

    // 4. Add classification hint to Gemini context
    const enhancedPrompt = `
[Request Classification: ${classification.category} (${Math.round(classification.confidence * 100)}% confidence)]
${criticalInsights.length > 0 ? `[CRITICAL ISSUES DETECTED: ${criticalInsights.length}]` : ''}

User: ${text}
`;

    // Process through Gemini
    debug('/process', '🤖 Calling processCommand...');
    const response = await processCommand(enhancedPrompt, context);
    
    // Strip any UUIDs from user-facing message
    response.message = stripUUIDs(response.message);
    
    debug('/process', '✓ Gemini response', {
      type: response.type,
      actionsCount: response.actions?.length || 0,
      messagePreview: response.message?.slice(0, 100)
    });

    // Store conversation
    const newMessages: ConversationMessage[] = [
      ...conversationHistory,
      { role: 'user', content: text },
      { role: 'assistant', content: response.message }
    ];

    conversations.set(response.conversation_id, {
      messages: newMessages,
      orgId,
      userId,
      createdAt: new Date()
    });

    // Check if all actions are query operations (no confirmation needed)
    const queryTools = ['get_user_availability', 'get_user_allocations', 'get_project_status', 'suggest_coverage'];
    const allActionsAreQueries = response.actions && 
      response.actions.length > 0 && 
      response.actions.every(a => queryTools.includes(a.tool));

    if (allActionsAreQueries && response.actions) {
      // Execute queries immediately and return data
      debug('/process', '📊 Query operations detected, executing immediately', response.actions.map(a => a.tool));
      const result = await executeActions(response.actions, userId, orgId);
      
      // Attach query results to response
      (response as any).query_results = result.results.map(r => ({
        tool: r.tool,
        success: r.success,
        data: r.data,
        error: r.error
      }));
      
      // Change type to 'info' since no confirmation needed
      response.type = 'info';
      response.actions = undefined; // Clear actions since we executed them
      
      debug('/process', '✓ Query executed', { resultsCount: result.results.length });
    } else if (response.actions && response.actions.length > 0) {
      // Regular actions - generate before/after preview
      debug('/process', '⚡ Actions detected, generating preview', response.actions.map(a => a.tool));
      const preview = await previewActions(response.actions, orgId);
      response.before_state = preview.before as any;
      response.after_state = preview.after as any;
    }

    debug('/process', '← Sending response', { type: response.type, actionsCount: response.actions?.length || 0 });
    res.json(response);
  } catch (err: any) {
    debug('/process', '❌ Error', { message: err.message, stack: err.stack });
    console.error('Voice processing error:', err);
    res.status(500).json({
      error: 'Failed to process command',
      details: err.message
    });
  }
});

/**
 * Execute confirmed actions
 * POST /api/voice/execute
 */
router.post('/execute', async (req, res) => {
  const { actions, conversation_id } = req.body as ExecuteRequest;
  const orgId = req.query.orgId as string;
  const userId = req.query.userId as string;

  debug('/execute', '→ Incoming request', {
    actionsCount: actions?.length,
    actions: actions?.map(a => ({ tool: a.tool, params: a.params })),
    orgId,
    userId
  });

  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    debug('/execute', '❌ Missing or empty actions array');
    return res.status(400).json({ error: 'actions array is required' });
  }

  if (!orgId) {
    debug('/execute', '❌ Missing orgId');
    return res.status(400).json({ error: 'orgId query param is required' });
  }

  if (!userId) {
    debug('/execute', '❌ Missing userId');
    return res.status(400).json({ error: 'userId query param is required' });
  }

  try {
    debug('/execute', '⚡ Executing actions...');
    const result = await executeActions(actions, userId, orgId);
    debug('/execute', '✓ Execution complete', {
      success: result.success,
      results: result.results.map(r => ({ tool: r.tool, success: r.success, error: r.error })),
      message: result.message
    });

    // Update conversation with execution result
    if (conversation_id && conversations.has(conversation_id)) {
      const conv = conversations.get(conversation_id)!;
      conv.messages.push({
        role: 'assistant',
        content: result.message
      });
    }

    debug('/execute', '← Sending response', { success: result.success });
    res.json(result);
  } catch (err: any) {
    debug('/execute', '❌ Error', { message: err.message, stack: err.stack });
    console.error('Action execution error:', err);
    res.status(500).json({
      error: 'Failed to execute actions',
      details: err.message
    });
  }
});

/**
 * Get current context for debugging/preview
 * GET /api/voice/context
 */
router.get('/context', async (req, res) => {
  const orgId = req.query.orgId as string;
  const weeks = parseInt(req.query.weeks as string) || 4;
  const projectId = req.query.project_id as string;
  const userIds = req.query.user_ids
    ? (req.query.user_ids as string).split(',')
    : undefined;

  if (!orgId) {
    return res.status(400).json({ error: 'orgId query param is required' });
  }

  try {
    const context = await buildResourceWizardContext({
      orgId,
      weeks,
      focusProjectId: projectId,
      focusUserIds: userIds
    });

    res.json({ context });
  } catch (err: any) {
    console.error('Context build error:', err);
    res.status(500).json({
      error: 'Failed to build context',
      details: err.message
    });
  }
});

/**
 * Search users by name
 * GET /api/voice/search/users
 */
router.get('/search/users', async (req, res) => {
  const orgId = req.query.orgId as string;
  const query = req.query.q as string;
  const role = req.query.role as string;

  if (!orgId) {
    return res.status(400).json({ error: 'orgId query param is required' });
  }

  if (!query) {
    return res.status(400).json({ error: 'q query param is required' });
  }

  try {
    const users = await searchUsers(orgId, query, role);
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Search projects by name
 * GET /api/voice/search/projects
 */
router.get('/search/projects', async (req, res) => {
  const orgId = req.query.orgId as string;
  const query = req.query.q as string;
  const activeOnly = req.query.active_only !== 'false';

  if (!orgId) {
    return res.status(400).json({ error: 'orgId query param is required' });
  }

  if (!query) {
    return res.status(400).json({ error: 'q query param is required' });
  }

  try {
    const projects = await searchProjects(orgId, query, activeOnly);
    res.json({ projects });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get user availability
 * GET /api/voice/availability
 */
router.get('/availability', async (req, res) => {
  const orgId = req.query.orgId as string;
  const startWeek = req.query.start_week as string;
  const endWeek = req.query.end_week as string;
  const userId = req.query.user_id as string;
  const roleFilter = req.query.role as string;

  if (!orgId) {
    return res.status(400).json({ error: 'orgId query param is required' });
  }

  if (!startWeek || !endWeek) {
    return res.status(400).json({ error: 'start_week and end_week are required' });
  }

  try {
    const availability = await getUserAvailability(orgId, startWeek, endWeek, userId, roleFilter);
    res.json({ availability });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get project status
 * GET /api/voice/project/:projectId/status
 */
router.get('/project/:projectId/status', async (req, res) => {
  const { projectId } = req.params;
  const includePhases = req.query.include_phases === 'true';

  try {
    const status = await getProjectStatus(projectId, includePhases);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Clear conversation history
 * DELETE /api/voice/conversation/:id
 */
router.delete('/conversation/:id', (req, res) => {
  const { id } = req.params;

  if (conversations.has(id)) {
    conversations.delete(id);
    res.json({ success: true, message: 'Conversation cleared' });
  } else {
    res.status(404).json({ error: 'Conversation not found' });
  }
});

export default router;
