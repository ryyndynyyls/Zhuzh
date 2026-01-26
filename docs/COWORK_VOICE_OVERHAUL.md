# Cowork Task: Zhuzh Voice Assistant Deep Overhaul

**Created:** 2026-01-22
**Estimated time:** 3-4 hours (parallelizable)
**Why Cowork:** Multi-file refactor across agent, types, executor, and new modules. Fresh context needed for each subsystem.

---

## Vision

Transform Zhuzh from a **transactional command processor** into an **intelligent, proactive resource advisor** that:

1. **Anticipates needs** before users ask
2. **Synthesizes insights** from data patterns
3. **Provides strategic recommendations** with reasoning
4. **Feels like a trusted colleague**, not a CLI

---

## Current Architecture (3,272 lines)

```
src/lib/resource-wizard/
├── agent.ts           (562 lines) - Gemini integration, system prompt
├── action-executor.ts (1,126 lines) - Executes functions
├── context-builder.ts (687 lines) - Builds team/project context
├── types.ts           (200 lines) - TypeScript definitions
└── index.ts           (exports)

src/api/routes/voice.ts (~350 lines) - REST API
src/components/voice/
├── CommandBar.tsx     (490 lines) - Input UI
└── ResponsePanel.tsx  (770 lines) - Output/preview UI
```

---

## Request Taxonomy (New Concept)

The core insight: **Not all requests should be handled the same way.**

| Type | Example | Current Handling | New Handling |
|------|---------|------------------|--------------|
| **Action** | "Add 8h to Patina for Ryan" | ✅ Works | Keep, improve feedback |
| **Query** | "Who's available next week?" | ✅ Works | Keep, add insights |
| **Insight** | "How's the team looking?" | ❌ Doesn't exist | Synthesize + recommend |
| **Advisory** | "Should I move Ryan to Agent Challenge?" | ❌ Doesn't exist | Reason + suggest |
| **Proactive** | (No prompt - triggered by context) | ❌ Doesn't exist | Alert on anomalies |

---

## Subtasks

### Subtask 1: New Types & Interfaces
**File:** `src/lib/resource-wizard/types.ts`
**Can parallelize:** Yes (foundational, needed by others)

Add new types for the request taxonomy:

```typescript
// Request classification
export type RequestCategory = 'action' | 'query' | 'insight' | 'advisory';

export interface ClassifiedRequest {
  category: RequestCategory;
  confidence: number;
  original_text: string;
  extracted_entities: {
    users?: string[];
    projects?: string[];
    timeframe?: string;
    hours?: number;
  };
}

// Insight types
export interface ResourceInsight {
  type: 'overallocation' | 'underutilization' | 'budget_warning' | 'coverage_gap' | 'pattern';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affected_entities: {
    users?: { id: string; name: string }[];
    projects?: { id: string; name: string }[];
  };
  suggested_action?: ActionCall;
  data?: Record<string, unknown>;
}

// Advisory response
export interface AdvisoryResponse {
  recommendation: 'proceed' | 'caution' | 'avoid';
  reasoning: string[];
  factors_considered: {
    factor: string;
    assessment: 'positive' | 'neutral' | 'negative';
    detail: string;
  }[];
  alternative_suggestions?: {
    description: string;
    actions: ActionCall[];
  }[];
}

// Proactive alert
export interface ProactiveAlert {
  id: string;
  type: 'overallocation' | 'budget' | 'availability' | 'deadline';
  urgency: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  suggested_actions?: ActionCall[];
  dismiss_action?: string;
  created_at: string;
}

// Enhanced response type
export type EnhancedResponseType = 
  | 'directive'      // Action with confirmation
  | 'info'           // Simple information
  | 'clarification'  // Need more info
  | 'insight'        // Synthesized analysis
  | 'advisory'       // Strategic recommendation
  | 'proactive';     // Unsolicited alert

export interface EnhancedProcessResponse {
  type: EnhancedResponseType;
  message: string;
  
  // Action responses
  actions?: ActionCall[];
  before_state?: StateSnapshot;
  after_state?: StateSnapshot;
  
  // Insight responses
  insights?: ResourceInsight[];
  
  // Advisory responses
  advisory?: AdvisoryResponse;
  
  // Proactive responses
  alerts?: ProactiveAlert[];
  
  // Always present
  conversation_id: string;
  personality_tone?: 'casual' | 'professional' | 'urgent';
}
```

### Subtask 2: Request Classifier
**File:** `src/lib/resource-wizard/classifier.ts` (NEW)
**Can parallelize:** Yes

Create intelligent request classification:

```typescript
/**
 * Request Classifier
 * 
 * Determines the category of incoming requests to route to appropriate handlers.
 * Uses pattern matching + Gemini for ambiguous cases.
 */

// Pattern definitions for each category
const ACTION_PATTERNS = [
  /\b(add|remove|move|assign|unassign|allocate|delete)\b/i,
  /\b(\d+)\s*h(ours?)?\b/i,  // Contains hours
];

const QUERY_PATTERNS = [
  /\b(show|display|list|get|what(?:'s| is|'re| are))\b/i,
  /\bwho(?:'s| is)\s+(on|available|working|assigned)\b/i,
  /\bhow\s+many\b/i,
];

const INSIGHT_PATTERNS = [
  /\bhow(?:'s| is)\s+(?:the\s+)?team\b/i,
  /\b(overview|summary|analysis|breakdown)\b/i,
  /\b(looking|doing|going)\b.*\?$/i,  // "How's X looking?"
  /\bany\s+(issues?|problems?|concerns?|risks?)\b/i,
];

const ADVISORY_PATTERNS = [
  /\bshould\s+(?:I|we)\b/i,
  /\bwould\s+(?:it|you)\s+recommend\b/i,
  /\bgood\s+idea\b/i,
  /\bmake\s+sense\b/i,
  /\bwhat\s+do\s+you\s+think\b/i,
];

export function classifyRequest(text: string): ClassifiedRequest {
  // Score each category
  const scores = {
    action: scorePatterns(text, ACTION_PATTERNS),
    query: scorePatterns(text, QUERY_PATTERNS),
    insight: scorePatterns(text, INSIGHT_PATTERNS),
    advisory: scorePatterns(text, ADVISORY_PATTERNS),
  };
  
  // Find highest scoring category
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [category, confidence] = sorted[0];
  
  // Extract entities
  const entities = extractEntities(text);
  
  return {
    category: category as RequestCategory,
    confidence,
    original_text: text,
    extracted_entities: entities,
  };
}

function scorePatterns(text: string, patterns: RegExp[]): number {
  let score = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) score += 1;
  }
  return score / patterns.length;
}

function extractEntities(text: string) {
  // Extract time references
  const timeMatch = text.match(/\b(this|next)\s+week\b/i);
  const hoursMatch = text.match(/\b(\d+(?:\.\d+)?)\s*h(?:ours?)?\b/i);
  
  return {
    timeframe: timeMatch ? timeMatch[0] : undefined,
    hours: hoursMatch ? parseFloat(hoursMatch[1]) : undefined,
    // Users and projects extracted via context matching later
  };
}
```

### Subtask 3: Insight Engine
**File:** `src/lib/resource-wizard/insight-engine.ts` (NEW)
**Can parallelize:** Yes

Build the intelligence layer:

```typescript
/**
 * Insight Engine
 * 
 * Analyzes context to generate proactive insights and recommendations.
 * This is the "brain" that makes Zhuzh intelligent.
 */

import { ResourceWizardContext, ResourceInsight, WizardUser, WizardProject } from './types';

export function generateInsights(context: ResourceWizardContext): ResourceInsight[] {
  const insights: ResourceInsight[] = [];
  
  // Run all analysis functions
  insights.push(...analyzeOverallocations(context));
  insights.push(...analyzeUnderutilization(context));
  insights.push(...analyzeBudgetStatus(context));
  insights.push(...analyzeUpcomingPTO(context));
  insights.push(...analyzeCoverageGaps(context));
  
  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return insights;
}

function analyzeOverallocations(context: ResourceWizardContext): ResourceInsight[] {
  const insights: ResourceInsight[] = [];
  const threshold = 40; // Standard work week
  
  for (const user of context.users) {
    const totalHours = user.allocations.reduce((sum, a) => sum + a.hours, 0);
    
    if (totalHours > threshold) {
      const overage = totalHours - threshold;
      insights.push({
        type: 'overallocation',
        severity: overage > 8 ? 'critical' : 'warning',
        title: `${user.name} is overallocated`,
        description: `${totalHours}h planned (${overage}h over capacity)`,
        affected_entities: {
          users: [{ id: user.id, name: user.name }],
        },
        data: {
          total_hours: totalHours,
          capacity: threshold,
          overage,
          breakdown: user.allocations,
        },
      });
    }
  }
  
  return insights;
}

function analyzeUnderutilization(context: ResourceWizardContext): ResourceInsight[] {
  const insights: ResourceInsight[] = [];
  const threshold = 20; // Less than 50% utilized
  
  for (const user of context.users) {
    // Skip freelancers (variable capacity)
    if (user.is_freelance) continue;
    
    const totalHours = user.allocations.reduce((sum, a) => sum + a.hours, 0);
    
    if (totalHours < threshold && user.pto_dates.length === 0) {
      insights.push({
        type: 'underutilization',
        severity: 'info',
        title: `${user.name} has significant availability`,
        description: `Only ${totalHours}h allocated (${user.weekly_capacity - totalHours}h available)`,
        affected_entities: {
          users: [{ id: user.id, name: user.name }],
        },
        data: {
          total_hours: totalHours,
          available: user.weekly_capacity - totalHours,
          role: user.role,
        },
      });
    }
  }
  
  return insights;
}

function analyzeBudgetStatus(context: ResourceWizardContext): ResourceInsight[] {
  const insights: ResourceInsight[] = [];
  
  for (const project of context.projects) {
    if (project.budget_hours === 0) continue;
    
    const burnRate = project.hours_used / project.budget_hours;
    
    if (burnRate >= 1) {
      insights.push({
        type: 'budget_warning',
        severity: 'critical',
        title: `${project.name} is over budget`,
        description: `${project.hours_used}h used of ${project.budget_hours}h budget (${Math.round(burnRate * 100)}%)`,
        affected_entities: {
          projects: [{ id: project.id, name: project.name }],
        },
        data: {
          budget: project.budget_hours,
          used: project.hours_used,
          burn_rate: burnRate,
        },
      });
    } else if (burnRate >= 0.85) {
      insights.push({
        type: 'budget_warning',
        severity: 'warning',
        title: `${project.name} budget at ${Math.round(burnRate * 100)}%`,
        description: `${project.budget_hours - project.hours_used}h remaining`,
        affected_entities: {
          projects: [{ id: project.id, name: project.name }],
        },
        data: {
          budget: project.budget_hours,
          used: project.hours_used,
          remaining: project.budget_hours - project.hours_used,
        },
      });
    }
  }
  
  return insights;
}

function analyzeUpcomingPTO(context: ResourceWizardContext): ResourceInsight[] {
  const insights: ResourceInsight[] = [];
  
  // Find users with PTO who have allocations
  for (const user of context.users) {
    if (user.pto_dates.length === 0) continue;
    if (user.allocations.length === 0) continue;
    
    const totalPlannedHours = user.allocations.reduce((sum, a) => sum + a.hours, 0);
    
    if (totalPlannedHours > 0) {
      insights.push({
        type: 'coverage_gap',
        severity: 'warning',
        title: `${user.name} has PTO but ${totalPlannedHours}h planned`,
        description: `PTO: ${user.pto_dates.join(', ')}. Coverage may be needed.`,
        affected_entities: {
          users: [{ id: user.id, name: user.name }],
        },
        data: {
          pto_dates: user.pto_dates,
          planned_hours: totalPlannedHours,
          projects: user.allocations.map(a => a.project_name),
        },
      });
    }
  }
  
  return insights;
}

function analyzeCoverageGaps(context: ResourceWizardContext): ResourceInsight[] {
  // More sophisticated analysis could go here
  // e.g., projects with no designer, deadlines approaching, etc.
  return [];
}
```

### Subtask 4: Advisory Engine
**File:** `src/lib/resource-wizard/advisory-engine.ts` (NEW)
**Can parallelize:** Yes

Strategic recommendation system:

```typescript
/**
 * Advisory Engine
 * 
 * Provides strategic recommendations for resource decisions.
 * Evaluates multiple factors and explains reasoning.
 */

import { ResourceWizardContext, AdvisoryResponse, WizardUser, WizardProject } from './types';

interface AdvisoryRequest {
  action: 'add' | 'move' | 'remove';
  user_id: string;
  project_id: string;
  hours: number;
  week_start: string;
}

export function evaluateAdvisory(
  request: AdvisoryRequest,
  context: ResourceWizardContext
): AdvisoryResponse {
  const factors: AdvisoryResponse['factors_considered'] = [];
  
  const user = context.users.find(u => u.id === request.user_id);
  const project = context.projects.find(p => p.id === request.project_id);
  
  if (!user || !project) {
    return {
      recommendation: 'avoid',
      reasoning: ['Could not find the specified user or project.'],
      factors_considered: [],
    };
  }
  
  // Factor 1: Capacity
  const currentLoad = user.allocations.reduce((sum, a) => sum + a.hours, 0);
  const newLoad = currentLoad + request.hours;
  const capacityUsed = newLoad / user.weekly_capacity;
  
  factors.push({
    factor: 'User Capacity',
    assessment: capacityUsed > 1 ? 'negative' : capacityUsed > 0.9 ? 'neutral' : 'positive',
    detail: `${user.name} would be at ${Math.round(capacityUsed * 100)}% capacity (${newLoad}h)`,
  });
  
  // Factor 2: Project Budget
  if (project.budget_hours > 0) {
    const budgetRemaining = project.budget_hours - project.hours_used;
    factors.push({
      factor: 'Project Budget',
      assessment: budgetRemaining < request.hours ? 'negative' : budgetRemaining < request.hours * 2 ? 'neutral' : 'positive',
      detail: `${project.name} has ${budgetRemaining}h budget remaining`,
    });
  }
  
  // Factor 3: PTO Conflicts
  if (user.pto_dates.length > 0) {
    factors.push({
      factor: 'PTO Conflicts',
      assessment: 'negative',
      detail: `${user.name} has PTO scheduled: ${user.pto_dates.join(', ')}`,
    });
  } else {
    factors.push({
      factor: 'Availability',
      assessment: 'positive',
      detail: `No PTO conflicts for ${user.name}`,
    });
  }
  
  // Factor 4: Role Match (if we have specialty info)
  if (user.specialty_notes) {
    const isGoodMatch = assessRoleMatch(user, project);
    factors.push({
      factor: 'Skill Match',
      assessment: isGoodMatch ? 'positive' : 'neutral',
      detail: isGoodMatch 
        ? `${user.name}'s skills align with this project`
        : `Consider whether ${user.name}'s skills match project needs`,
    });
  }
  
  // Calculate recommendation
  const negatives = factors.filter(f => f.assessment === 'negative').length;
  const positives = factors.filter(f => f.assessment === 'positive').length;
  
  let recommendation: AdvisoryResponse['recommendation'];
  let reasoning: string[] = [];
  
  if (negatives >= 2) {
    recommendation = 'avoid';
    reasoning = [
      'Multiple concerns identified with this allocation.',
      ...factors.filter(f => f.assessment === 'negative').map(f => f.detail),
    ];
  } else if (negatives === 1) {
    recommendation = 'caution';
    reasoning = [
      'This allocation is possible but has some concerns.',
      ...factors.filter(f => f.assessment === 'negative').map(f => `⚠️ ${f.detail}`),
    ];
  } else {
    recommendation = 'proceed';
    reasoning = [
      'This looks like a good allocation.',
      ...factors.filter(f => f.assessment === 'positive').map(f => `✓ ${f.detail}`),
    ];
  }
  
  // Suggest alternatives if not proceeding
  const alternatives = recommendation !== 'proceed' 
    ? findAlternatives(request, context) 
    : undefined;
  
  return {
    recommendation,
    reasoning,
    factors_considered: factors,
    alternative_suggestions: alternatives,
  };
}

function assessRoleMatch(user: WizardUser, project: WizardProject): boolean {
  // Simple heuristic - could be much smarter
  const specialty = user.specialty_notes?.toLowerCase() || '';
  const projectName = project.name.toLowerCase();
  
  // Very basic matching
  if (specialty.includes('design') && projectName.includes('design')) return true;
  if (specialty.includes('develop') && (projectName.includes('dev') || projectName.includes('build'))) return true;
  
  return true; // Default to good match if we can't determine
}

function findAlternatives(
  request: AdvisoryRequest,
  context: ResourceWizardContext
): AdvisoryResponse['alternative_suggestions'] {
  // Find users with similar roles who have availability
  const targetUser = context.users.find(u => u.id === request.user_id);
  if (!targetUser) return undefined;
  
  const alternatives: AdvisoryResponse['alternative_suggestions'] = [];
  
  for (const user of context.users) {
    if (user.id === request.user_id) continue;
    if (user.role !== targetUser.role) continue;
    
    const load = user.allocations.reduce((sum, a) => sum + a.hours, 0);
    const available = user.weekly_capacity - load;
    
    if (available >= request.hours && user.pto_dates.length === 0) {
      alternatives.push({
        description: `Assign to ${user.name} instead (${available}h available)`,
        actions: [{
          tool: 'add_allocation',
          params: {
            user_id: user.id,
            project_id: request.project_id,
            hours: request.hours,
            week_start: request.week_start,
          },
          description: `Add ${request.hours}h for ${user.name}`,
        }],
      });
    }
  }
  
  return alternatives.length > 0 ? alternatives.slice(0, 3) : undefined;
}
```

### Subtask 5: Personality & Voice System
**File:** `src/lib/resource-wizard/personality.ts` (NEW)
**Can parallelize:** Yes

Make responses feel human:

```typescript
/**
 * Personality System
 * 
 * Adds warmth, acknowledgment, and natural conversation flow.
 * Transforms robotic responses into colleague-like interactions.
 */

// Acknowledgment phrases by tone
const ACKNOWLEDGMENTS = {
  casual: ['Got it!', 'On it!', 'Done!', 'You got it!', 'Sure thing!'],
  professional: ['Understood.', 'I\'ll take care of that.', 'Processing now.', 'Confirmed.'],
  urgent: ['Right away.', 'Handling this now.', 'On it immediately.'],
};

// Transition phrases
const TRANSITIONS = {
  addition: ['Also,', 'By the way,', 'While I\'m at it,', 'I should mention,'],
  warning: ['Heads up:', 'Just so you know,', 'One thing to note:', 'Quick flag:'],
  suggestion: ['You might want to', 'Consider', 'A thought:', 'One option:'],
};

// Error softeners
const ERROR_SOFTENERS = [
  'I couldn\'t quite find',
  'I\'m not seeing',
  'Hmm, I don\'t see',
  'I\'m having trouble finding',
];

// Success celebrations (for big actions)
const CELEBRATIONS = [
  '🎉 Done!',
  '✨ All set!',
  '👍 Sorted!',
  '✅ You\'re good to go!',
];

export type Tone = 'casual' | 'professional' | 'urgent';

export function selectTone(context: { 
  hasUrgentIssues: boolean; 
  isFirstMessage: boolean;
  recentTone?: Tone;
}): Tone {
  if (context.hasUrgentIssues) return 'urgent';
  if (context.isFirstMessage) return 'casual';
  return context.recentTone || 'casual';
}

export function getAcknowledgment(tone: Tone): string {
  const options = ACKNOWLEDGMENTS[tone];
  return options[Math.floor(Math.random() * options.length)];
}

export function getTransition(type: 'addition' | 'warning' | 'suggestion'): string {
  const options = TRANSITIONS[type];
  return options[Math.floor(Math.random() * options.length)];
}

export function softError(thing: string): string {
  const softener = ERROR_SOFTENERS[Math.floor(Math.random() * ERROR_SOFTENERS.length)];
  return `${softener} ${thing}`;
}

export function celebrate(): string {
  return CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)];
}

// Format a response with personality
export function formatResponse(options: {
  tone: Tone;
  type: 'action' | 'query' | 'insight' | 'advisory' | 'error';
  mainMessage: string;
  additionalInfo?: string;
  warnings?: string[];
  suggestions?: string[];
}): string {
  const parts: string[] = [];
  
  // Lead with acknowledgment for actions
  if (options.type === 'action') {
    parts.push(getAcknowledgment(options.tone));
    parts.push(options.mainMessage);
  } else {
    parts.push(options.mainMessage);
  }
  
  // Add warnings
  if (options.warnings?.length) {
    parts.push('');
    for (const warning of options.warnings) {
      parts.push(`${getTransition('warning')} ${warning}`);
    }
  }
  
  // Add suggestions
  if (options.suggestions?.length) {
    parts.push('');
    for (const suggestion of options.suggestions) {
      parts.push(`${getTransition('suggestion')} ${suggestion}`);
    }
  }
  
  // Add additional info
  if (options.additionalInfo) {
    parts.push('');
    parts.push(options.additionalInfo);
  }
  
  return parts.join('\n');
}

// Generate proactive opener based on insights
export function generateProactiveOpener(insightCount: number, criticalCount: number): string | null {
  if (criticalCount > 0) {
    return `🚨 I noticed ${criticalCount} urgent issue${criticalCount > 1 ? 's' : ''} you should know about:`;
  }
  if (insightCount >= 3) {
    return `📊 A few things caught my attention:`;
  }
  if (insightCount > 0) {
    return `💡 Quick heads up:`;
  }
  return null;
}
```

### Subtask 6: Refactor System Prompt
**File:** `src/lib/resource-wizard/agent.ts`
**Can parallelize:** After Subtask 1 (needs types)

Rewrite the system prompt using SI → RI → QI structure:

```typescript
// New structured prompt
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
   - Example: "Which Ryan?\n• Ryan Daniels (Director of Strategy)\n• Ryan Gordon (Developer)"
   - Never guess—always ask

AVAILABLE WEEKS: {available_weeks}
Always use exact IDs from context when calling functions.
</query_instruction>`;
```

### Subtask 7: Update Response Handler
**File:** `src/api/routes/voice.ts`
**Can parallelize:** After Subtasks 1, 3, 4, 5

Integrate the new systems:

```typescript
// In the /process endpoint

import { classifyRequest } from '../../lib/resource-wizard/classifier';
import { generateInsights } from '../../lib/resource-wizard/insight-engine';
import { evaluateAdvisory } from '../../lib/resource-wizard/advisory-engine';
import { formatResponse, selectTone, generateProactiveOpener } from '../../lib/resource-wizard/personality';

// After building context, before calling Gemini:

// 1. Classify the request
const classification = classifyRequest(text);
debug('/process', '📋 Classified request', classification);

// 2. For insight requests, pre-generate insights
let preGeneratedInsights: ResourceInsight[] = [];
if (classification.category === 'insight') {
  preGeneratedInsights = generateInsights(context);
}

// 3. For advisory requests, prepare evaluation context
// (will be used after Gemini identifies the specific action)

// 4. Always check for critical issues to surface proactively
const criticalInsights = generateInsights(context).filter(i => i.severity === 'critical');

// 5. Add classification hint to Gemini context
const enhancedPrompt = `
[Request Classification: ${classification.category} (${Math.round(classification.confidence * 100)}% confidence)]
${criticalInsights.length > 0 ? `[CRITICAL ISSUES DETECTED: ${criticalInsights.length}]` : ''}

User: ${text}
`;
```

### Subtask 8: Update Response Panel UI
**File:** `src/components/voice/ResponsePanel.tsx`
**Can parallelize:** After Subtask 1

Add new UI for insights and advisory:

```tsx
// New component for insights
function InsightCard({ insight }: { insight: ResourceInsight }) {
  const severityColors = {
    critical: 'error',
    warning: 'warning', 
    info: 'info',
  } as const;
  
  const severityIcons = {
    critical: '🚨',
    warning: '⚠️',
    info: '💡',
  };
  
  return (
    <Alert severity={severityColors[insight.severity]} sx={{ mb: 1 }}>
      <AlertTitle>
        {severityIcons[insight.severity]} {insight.title}
      </AlertTitle>
      {insight.description}
      {insight.suggested_action && (
        <Button size="small" sx={{ mt: 1 }}>
          Fix this
        </Button>
      )}
    </Alert>
  );
}

// New component for advisory
function AdvisoryPanel({ advisory }: { advisory: AdvisoryResponse }) {
  const recommendationStyles = {
    proceed: { color: 'success.main', icon: '✅', label: 'Good to go' },
    caution: { color: 'warning.main', icon: '⚠️', label: 'Proceed with caution' },
    avoid: { color: 'error.main', icon: '🚫', label: 'Not recommended' },
  };
  
  const style = recommendationStyles[advisory.recommendation];
  
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ color: style.color }}>
          {style.icon} {style.label}
        </Typography>
        
        <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
          {advisory.reasoning.join(' ')}
        </Typography>
        
        <Typography variant="subtitle2">Factors Considered:</Typography>
        {advisory.factors_considered.map((factor, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <span>{factor.assessment === 'positive' ? '✓' : factor.assessment === 'negative' ? '✗' : '○'}</span>
            <Typography variant="body2">
              <strong>{factor.factor}:</strong> {factor.detail}
            </Typography>
          </Box>
        ))}
        
        {advisory.alternative_suggestions && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2">Alternatives:</Typography>
            {advisory.alternative_suggestions.map((alt, i) => (
              <Button key={i} size="small" sx={{ mt: 1, mr: 1 }}>
                {alt.description}
              </Button>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

### Subtask 9: Integration & Testing
**Can parallelize:** No (depends on all above)

1. Update `src/lib/resource-wizard/index.ts` exports
2. Add new routes if needed
3. Test each request category:
   - Action: "Add 8h to Patina for Ryan"
   - Query: "Who's available next week?"
   - Insight: "How's the team looking?"
   - Advisory: "Should I move Ryan to Agent Challenge?"
4. Verify personality phrases appear correctly
5. Test insight generation with various data states

---

## Verification Commands

```bash
# Start all servers
cd ~/Claude-Projects-MCP/ResourceFlow
npm run dev & npm run api:dev

# Test via curl
curl -X POST http://localhost:3002/api/voice/process \
  -H "Content-Type: application/json" \
  -d '{"text":"how is the team looking for next week?"}' \
  "?orgId=YOUR_ORG_ID&userId=YOUR_USER_ID"
```

---

## Success Criteria

- [ ] Request classifier correctly identifies all 4 categories
- [ ] Insight engine generates relevant insights from context
- [ ] Advisory engine evaluates decisions with clear reasoning
- [ ] Personality phrases appear in responses naturally
- [ ] System prompt follows SI → RI → QI structure
- [ ] UI displays insights and advisory responses correctly
- [ ] No regressions in existing action/query functionality
- [ ] Response times remain under 3 seconds

---

## After Completion

1. Update `docs/SESSION_STATUS.md`:
   - Mark voice overhaul complete
   - Note any new decisions
   - List any follow-up tasks discovered

2. Update `docs/live-sync-doc.md` if locked decisions made

3. Test with real data and note any edge cases

---

## Execution Order (for parallelization)

**Wave 1 (parallel):**
- Subtask 1: Types
- Subtask 2: Classifier  
- Subtask 3: Insight Engine
- Subtask 4: Advisory Engine
- Subtask 5: Personality System

**Wave 2 (parallel, after Wave 1):**
- Subtask 6: System Prompt (needs types)
- Subtask 7: API Integration (needs all engines)
- Subtask 8: UI Updates (needs types)

**Wave 3 (sequential):**
- Subtask 9: Integration & Testing

---

*This task will transform Zhuzh from a command processor into an intelligent colleague. Let's make it magical! ✨*
