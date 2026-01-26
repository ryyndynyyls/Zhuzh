/**
 * Resource Wizard Types
 * TypeScript definitions for the voice command system
 */

// ============================================================
// CONTEXT TYPES - Data passed to Gemini
// ============================================================

export interface WizardOrg {
  id: string;
  name: string;
  size: number;
}

export interface WizardAllocation {
  week_start: string;
  project_id: string;
  project_name: string;
  hours: number;
  phase_id?: string;
  phase_name?: string;
}

export interface WizardUser {
  id: string;
  name: string;
  email: string;
  role: string;
  job_title?: string;
  location?: string;
  is_freelance?: boolean;
  specialty_notes?: string;
  weekly_capacity: number;
  allocations: WizardAllocation[];
  pto_dates: string[];
}

export interface WizardPhase {
  id: string;
  name: string;
  budget_hours: number;
  hours_used: number;
  status: string;
}

export interface WizardProject {
  id: string;
  name: string;
  client_name: string;
  budget_hours: number;
  hours_used: number;
  status: string;
  phases: WizardPhase[];
}

export interface ResourceWizardContext {
  org: WizardOrg;
  current_date: string;
  current_week_start: string;
  users: WizardUser[];
  projects: WizardProject[];
  conversation_history: ConversationMessage[];
}

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProcessRequest {
  text: string;
  context?: {
    current_week?: string;
    selected_users?: string[];
    selected_project?: string;
  };
  conversation_id?: string;
}

export interface ActionCall {
  tool: string;
  params: Record<string, unknown>;
  description: string;
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  actions: ActionCall[];
  warnings?: string[];
}

export interface StateSnapshot {
  users: Array<{
    id: string;
    name: string;
    allocations: Array<{
      project_name: string;
      hours: number;
    }>;
    total_hours: number;
  }>;
}

export type ResponseType = 'directive' | 'suggestion' | 'clarification' | 'info';

export interface ProcessResponse {
  type: ResponseType;
  message: string;
  actions?: ActionCall[];
  suggestions?: Suggestion[];
  before_state?: StateSnapshot;
  after_state?: StateSnapshot;
  conversation_id: string;
}

export interface ExecuteRequest {
  actions: ActionCall[];
  conversation_id?: string;
}

export interface ActionResult {
  tool: string;
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

export interface ExecuteResponse {
  success: boolean;
  results: ActionResult[];
  message: string;
}

// ============================================================
// FUNCTION CALLING TYPES (Gemini Tools)
// ============================================================

export interface MoveAllocationParams {
  from_user_id?: string;
  to_user_id: string;
  project_id: string;
  hours: number;
  week_start: string;
  phase_id?: string;
}

export interface AddAllocationParams {
  user_id: string;
  project_id: string;
  hours: number;
  week_start: string;
  phase_id?: string;
  is_billable?: boolean;
}

export interface RemoveAllocationParams {
  user_id: string;
  project_id: string;
  week_start: string;
}

export interface GetUserAvailabilityParams {
  user_id?: string;
  start_week: string;
  end_week: string;
  role_filter?: string;
}

export interface GetProjectStatusParams {
  project_id: string;
  include_phases?: boolean;
}

export interface SuggestCoverageParams {
  absent_user_id: string;
  week_start: string;
  project_id?: string;
  preferred_role?: string;
}

export interface BulkChange {
  action: 'add' | 'remove' | 'update';
  user_id: string;
  project_id: string;
  hours: number;
  week_start: string;
}

export interface BulkUpdateAllocationsParams {
  changes: BulkChange[];
}

export interface SearchUsersParams {
  query: string;
  role?: string;
}

export interface SearchProjectsParams {
  query: string;
  active_only?: boolean;
}

// Union type for all function parameters
export type FunctionParams =
  | MoveAllocationParams
  | AddAllocationParams
  | RemoveAllocationParams
  | GetUserAvailabilityParams
  | GetProjectStatusParams
  | SuggestCoverageParams
  | BulkUpdateAllocationsParams
  | SearchUsersParams
  | SearchProjectsParams;

// Function names
export type FunctionName =
  | 'move_allocation'
  | 'add_allocation'
  | 'remove_allocation'
  | 'get_user_availability'
  | 'get_project_status'
  | 'suggest_coverage'
  | 'bulk_update_allocations'
  | 'search_users'
  | 'search_projects';

// ============================================================
// CONVERSATION STATE
// ============================================================

export interface ConversationState {
  id: string;
  org_id: string;
  user_id: string;
  messages: ConversationMessage[];
  pending_actions?: ActionCall[];
  created_at: string;
  updated_at: string;
}

// ============================================================
// REQUEST CLASSIFICATION & ENHANCED RESPONSE TYPES
// ============================================================

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
