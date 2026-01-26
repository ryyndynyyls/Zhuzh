/**
 * Resource Wizard Gemini Agent
 *
 * Configures the Gemini AI agent with function declarations
 * for managing resource allocations via natural language
 * 
 * Debug: Check API server logs for [Zhuzh:AGENT] entries
 */

import { GoogleGenerativeAI, GenerativeModel, FunctionDeclarationsTool, Content, SchemaType } from '@google/generative-ai';
import { ResourceWizardContext, ProcessResponse, ActionCall } from './types';

// Debug helper
const DEBUG = process.env.NODE_ENV === 'development' || process.env.ZHUZH_DEBUG === 'true';
function debug(stage: string, message: string, data?: any) {
  if (DEBUG) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    console.log(`[Zhuzh:${stage}] ${timestamp} ${message}`, data !== undefined ? data : '');
  }
}

// System prompt for the Resource Wizard
const SYSTEM_PROMPT = `<system_instruction>
You are Zhuzh, an intelligent resource management assistant for creative agencies. You don't just execute commands—you provide insights, anticipate needs, and act like a trusted colleague.
</system_instruction>

<role_instruction>
You are the resource wizard for {org_name} ({org_size} people). Today is {current_date} ({day_name}).

Your personality:
- Warm and professional, like a helpful colleague
- Proactive—notice issues before being asked
- Clear and concise—respect people's time
- Honest about limitations

Your capabilities:
1. ACTIONS: Add, move, remove allocations (use functions)
2. QUERIES: Look up schedules, availability, project status
3. INSIGHTS: Analyze data patterns, identify issues
4. ADVICE: Evaluate decisions, suggest alternatives
</role_instruction>

<query_instruction>
When processing requests:

1. CLASSIFY the request type:
   - Action: "add 8h", "move Ryan", "remove allocation" → Use functions
   - Query: "who's available", "show hours" → Use query functions
   - Insight: "how's the team", "any issues" → Synthesize + analyze
   - Advisory: "should I", "good idea?" → Evaluate + recommend

2. For ACTIONS:
   - ALWAYS use functions—don't just describe what you would do
   - Validate capacity before adding (flag if >40h)
   - Check budget status
   - Warn about conflicts

3. For INSIGHTS:
   - Synthesize data from context
   - Prioritize: Critical → Warning → Info
   - Always include "why it matters"

4. For ADVISORY:
   - Evaluate multiple factors
   - State your recommendation clearly
   - Explain reasoning
   - Suggest alternatives if recommending against

5. DISAMBIGUATION:
   - When names match multiple people, list them with ROLES
   - Example: "Which Ryan?\\n• Ryan Daniels (Director of Strategy)\\n• Ryan Gordon (Developer)"
   - Never guess—always ask

6. FORMATTING RULES:
   - NEVER include UUIDs or IDs in your responses to users
   - Use names only: "Ryan Daniels" not "Ryan Daniels [ID: abc-123]"
   - IDs are for function calls only, invisible to users
   - When disambiguating, use role/title: "Ryan Daniels (Director)" not IDs

7. RESPONSE STRUCTURE:
   - ALWAYS answer the user's question FIRST
   - THEN mention any relevant concerns (briefly)
   - Don't lead with warnings or issues
   - Keep insights proportional to the question

   Bad: "⚠️ CRITICAL: 5 people are over-allocated. Also, here's who's available..."
   Good: "Here's who has availability next week: Alex (20h), Sam (15h). Note: Ryan is at capacity."

AVAILABLE WEEKS: {available_weeks}
Always use exact IDs from context when calling functions.
</query_instruction>`;

// Function declarations for Gemini
const FUNCTION_DECLARATIONS: FunctionDeclarationsTool = {
  functionDeclarations: [
    {
      name: 'add_allocation',
      description: 'Add a new allocation for a user on a project. USE THIS when the user asks to add someone to a project or add hours.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          user_id: {
            type: SchemaType.STRING,
            description: 'UUID of the user (use exact ID from context)'
          },
          project_id: {
            type: SchemaType.STRING,
            description: 'UUID of the project (use exact ID from context)'
          },
          hours: {
            type: SchemaType.NUMBER,
            description: 'Number of hours to allocate'
          },
          week_start: {
            type: SchemaType.STRING,
            description: 'Start date of the week (YYYY-MM-DD, must be a Monday)'
          },
          phase_id: {
            type: SchemaType.STRING,
            description: 'Optional: specific phase'
          },
          is_billable: {
            type: SchemaType.BOOLEAN,
            description: 'Whether the hours are billable (default: true)'
          }
        },
        required: ['user_id', 'project_id', 'hours', 'week_start']
      }
    },
    {
      name: 'move_allocation',
      description: 'Move hours from one user to another on a project',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          from_user_id: {
            type: SchemaType.STRING,
            description: 'UUID of user to remove hours from'
          },
          to_user_id: {
            type: SchemaType.STRING,
            description: 'UUID of user to add hours to'
          },
          project_id: {
            type: SchemaType.STRING,
            description: 'UUID of the project'
          },
          hours: {
            type: SchemaType.NUMBER,
            description: 'Number of hours to move'
          },
          week_start: {
            type: SchemaType.STRING,
            description: 'Start date of the week (YYYY-MM-DD, must be a Monday)'
          }
        },
        required: ['to_user_id', 'project_id', 'hours', 'week_start']
      }
    },
    {
      name: 'remove_allocation',
      description: 'Remove an allocation entirely',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          user_id: {
            type: SchemaType.STRING,
            description: 'UUID of the user'
          },
          project_id: {
            type: SchemaType.STRING,
            description: 'UUID of the project'
          },
          week_start: {
            type: SchemaType.STRING,
            description: 'Start date of the week (YYYY-MM-DD)'
          }
        },
        required: ['user_id', 'project_id', 'week_start']
      }
    },
    {
      name: 'get_user_availability',
      description: "Get a user's availability (remaining capacity) for specified weeks. Use for questions about who is available.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          user_id: {
            type: SchemaType.STRING,
            description: 'UUID of the user (optional - if omitted, returns all users)'
          },
          start_week: {
            type: SchemaType.STRING,
            description: 'Start of date range (YYYY-MM-DD)'
          },
          end_week: {
            type: SchemaType.STRING,
            description: 'End of date range (YYYY-MM-DD)'
          },
          role_filter: {
            type: SchemaType.STRING,
            description: 'Optional: filter by role'
          }
        },
        required: ['start_week', 'end_week']
      }
    },
    {
      name: 'get_user_allocations',
      description: "Get a specific user's allocations across ALL projects. Use when someone asks 'show me X's hours' or 'what is X working on' or 'X's time across projects'. Returns detailed breakdown by project and week.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          user_id: {
            type: SchemaType.STRING,
            description: 'UUID of the user to get allocations for'
          },
          start_week: {
            type: SchemaType.STRING,
            description: 'Start of date range (YYYY-MM-DD, must be a Monday)'
          },
          end_week: {
            type: SchemaType.STRING,
            description: 'End of date range (YYYY-MM-DD, must be a Monday)'
          }
        },
        required: ['user_id', 'start_week', 'end_week']
      }
    },
    {
      name: 'get_project_status',
      description: 'Get current status of a project including budget burn and allocations',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          project_id: {
            type: SchemaType.STRING,
            description: 'UUID of the project'
          },
          include_phases: {
            type: SchemaType.BOOLEAN,
            description: 'Include phase-level breakdown'
          }
        },
        required: ['project_id']
      }
    },
    {
      name: 'suggest_coverage',
      description: 'Suggest how to cover work when someone is unavailable',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          absent_user_id: {
            type: SchemaType.STRING,
            description: 'UUID of the user who is out'
          },
          week_start: {
            type: SchemaType.STRING,
            description: 'Week to find coverage for'
          },
          project_id: {
            type: SchemaType.STRING,
            description: 'Optional: specific project to cover'
          }
        },
        required: ['absent_user_id', 'week_start']
      }
    },
    {
      name: 'bulk_update_allocations',
      description: 'Apply multiple allocation changes at once',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          changes: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                action: { type: SchemaType.STRING },
                user_id: { type: SchemaType.STRING },
                project_id: { type: SchemaType.STRING },
                hours: { type: SchemaType.NUMBER },
                week_start: { type: SchemaType.STRING }
              }
            },
            description: 'Array of allocation changes'
          }
        },
        required: ['changes']
      }
    }
  ]
};

/**
 * Get configured Gemini model
 */
function getGeminiModel(): GenerativeModel {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    debug('AGENT', '❌ GEMINI_API_KEY not set!');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: [FUNCTION_DECLARATIONS]
  });
}

/**
 * Build the system prompt with context
 */
function buildSystemPrompt(context: ResourceWizardContext): string {
  // Calculate additional date info
  const currentDate = new Date(context.current_date + 'T12:00:00');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = dayNames[currentDate.getDay()];
  
  // Calculate next week's Monday
  const currentWeekDate = new Date(context.current_week_start + 'T12:00:00');
  const nextWeekDate = new Date(currentWeekDate);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekStart = `${nextWeekDate.getFullYear()}-${String(nextWeekDate.getMonth() + 1).padStart(2, '0')}-${String(nextWeekDate.getDate()).padStart(2, '0')}`;
  
  // Generate list of available weeks
  const availableWeeks: string[] = [];
  const weekDate = new Date(currentWeekDate);
  for (let i = 0; i < 4; i++) {
    availableWeeks.push(`${weekDate.getFullYear()}-${String(weekDate.getMonth() + 1).padStart(2, '0')}-${String(weekDate.getDate()).padStart(2, '0')}`);
    weekDate.setDate(weekDate.getDate() + 7);
  }
  
  return SYSTEM_PROMPT
    .replace('{org_name}', context.org.name)
    .replace('{org_size}', String(context.org.size))
    .replace('{current_date}', context.current_date)
    .replace('{day_name}', currentDayName)
    .replace('{available_weeks}', availableWeeks.join(', '));
}

/**
 * Build context summary for the model
 */
function buildContextSummary(context: ResourceWizardContext): string {
  // Build user summary with specialty notes for smarter matching
  const userSummary = context.users.map(user => {
    const allocSum = user.allocations.reduce((sum, a) => sum + a.hours, 0);
    const available = user.weekly_capacity - allocSum;
    const allocList = user.allocations
      .map(a => `${a.project_name}: ${a.hours}h`)
      .join(', ');
    const ptoNote = user.pto_dates.length > 0
      ? ` [PTO: ${user.pto_dates.join(', ')}]`
      : '';
    const displayRole = user.job_title || user.role || 'employee';
    const locationNote = user.location ? ` [${user.location}]` : '';
    const freelanceNote = user.is_freelance ? ' [FREELANCE]' : '';
    const specialtyNote = user.specialty_notes ? `\n      Specialty: ${user.specialty_notes}` : '';

    return `- ${user.name} [ID: ${user.id}] (${displayRole})${locationNote}${freelanceNote}${ptoNote}: ${allocSum}h allocated, ${available}h available
      Current allocations: ${allocList || 'none'}${specialtyNote}`;
  }).join('\n');

  // Build project summary
  const projectSummary = context.projects.map(proj => {
    const budgetPct = proj.budget_hours > 0
      ? Math.round((proj.hours_used / proj.budget_hours) * 100)
      : 0;
    return `- ${proj.name} [ID: ${proj.id}] (${proj.client_name}): ${proj.hours_used}/${proj.budget_hours}h (${budgetPct}%)`;
  }).join('\n');

  return `
=== CURRENT TEAM STATUS (Week of ${context.current_week_start}) ===

TEAM MEMBERS:
${userSummary}

ACTIVE PROJECTS:
${projectSummary}

=== IMPORTANT: Use the [ID: xxx] values when calling functions ===
=== When matching for coverage, use Specialty notes to find the right discipline match ===
`;
}

/**
 * Process a user command through Gemini
 */
export async function processCommand(
  userInput: string,
  context: ResourceWizardContext
): Promise<ProcessResponse> {
  const startTime = Date.now();
  
  debug('AGENT', '🤖 Processing command:', userInput);
  debug('AGENT', '📊 Context summary:', {
    org: context.org.name,
    usersCount: context.users.length,
    projectsCount: context.projects.length,
    currentWeek: context.current_week_start
  });

  const model = getGeminiModel();
  const contents: Content[] = [];

  // Add conversation history
  for (const msg of context.conversation_history) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }

  // Build the full prompt
  const contextSummary = buildContextSummary(context);
  const systemContext = buildSystemPrompt(context);
  const fullPrompt = `${systemContext}\n\n${contextSummary}\n\nUser command: ${userInput}`;

  debug('AGENT', '📝 Prompt length:', `${fullPrompt.length} chars`);

  contents.push({
    role: 'user',
    parts: [{ text: fullPrompt }]
  });

  try {
    debug('AGENT', '⏳ Calling Gemini API...');
    
    const result = await model.generateContent({ contents });
    const response = result.response;
    const duration = Date.now() - startTime;

    debug('AGENT', `✅ Gemini responded in ${duration}ms`);

    // Check for function calls
    const functionCalls = response.functionCalls();
    
    debug('AGENT', '🔧 Function calls:', functionCalls?.length || 0);

    if (functionCalls && functionCalls.length > 0) {
      // Log each function call
      functionCalls.forEach((fc, i) => {
        debug('AGENT', `📋 Function ${i + 1}:`, {
          name: fc.name,
          args: fc.args
        });
      });

      // Build actions from function calls
      const actions: ActionCall[] = functionCalls.map(fc => ({
        tool: fc.name,
        params: fc.args as Record<string, unknown>,
        description: generateActionDescription(fc.name, fc.args as Record<string, unknown>, context)
      }));

      const textResponse = response.text() || 'I will make the following changes:';

      debug('AGENT', '🎯 Response type: directive');
      debug('AGENT', '⚡ Actions:', actions.map(a => `${a.tool}: ${a.description}`));

      return {
        type: 'directive',
        message: textResponse,
        actions,
        conversation_id: generateConversationId()
      };
    } else {
      // No function calls - informational response
      const textResponse = response.text();
      const type = determineResponseType(textResponse);

      debug('AGENT', `💬 Response type: ${type}`);
      debug('AGENT', '📄 Message preview:', textResponse?.slice(0, 150) + '...');

      return {
        type,
        message: textResponse,
        conversation_id: generateConversationId()
      };
    }
  } catch (error: any) {
    debug('AGENT', '❌ Gemini error:', error.message);
    console.error('[Zhuzh:AGENT] Full error:', error);
    throw error;
  }
}

/**
 * Generate a human-readable description for an action
 */
function generateActionDescription(
  toolName: string,
  params: Record<string, unknown>,
  context: ResourceWizardContext
): string {
  const findUser = (id: string) => context.users.find(u => u.id === id)?.name || id;
  const findProject = (id: string) => context.projects.find(p => p.id === id)?.name || id;

  switch (toolName) {
    case 'add_allocation':
      return `Add ${params.hours}h for ${findUser(params.user_id as string)} on ${findProject(params.project_id as string)} (week of ${params.week_start})`;

    case 'remove_allocation':
      return `Remove ${findUser(params.user_id as string)} from ${findProject(params.project_id as string)} (week of ${params.week_start})`;

    case 'move_allocation':
      const from = params.from_user_id ? `from ${findUser(params.from_user_id as string)}` : '';
      return `Move ${params.hours}h ${from} to ${findUser(params.to_user_id as string)} on ${findProject(params.project_id as string)}`;

    case 'bulk_update_allocations':
      const changes = params.changes as Array<Record<string, unknown>>;
      return `Apply ${changes?.length || 0} allocation change(s)`;

    case 'get_user_availability':
      return `Check availability from ${params.start_week} to ${params.end_week}`;

    case 'get_project_status':
      return `Get status for ${findProject(params.project_id as string)}`;

    default:
      return `Execute ${toolName}`;
  }
}

/**
 * Determine response type from text content
 */
function determineResponseType(text: string): 'suggestion' | 'clarification' | 'info' {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('option') || lowerText.includes('suggest') || lowerText.includes('recommend')) {
    return 'suggestion';
  }

  if (lowerText.includes('?') && (lowerText.includes('which') || lowerText.includes('do you mean') || lowerText.includes('clarify'))) {
    return 'clarification';
  }

  return 'info';
}

/**
 * Generate a conversation ID
 */
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Continue a multi-turn conversation
 */
export async function continueConversation(
  userInput: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  context: ResourceWizardContext
): Promise<ProcessResponse> {
  context.conversation_history = conversationHistory;
  return processCommand(userInput, context);
}
