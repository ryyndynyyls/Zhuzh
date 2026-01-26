/**
 * Slack-specific type definitions for Zhuzh
 * Types for Block Kit payloads, view submissions, actions, and display
 */

import type {
  Allocation,
  Project,
  ProjectPhase,
  TimeConfirmation,
  TimeEntry,
  User,
  UserRole,
} from '../types/database';

// ============================================
// Slack Display Types
// ============================================

/**
 * Allocation formatted for display in Slack messages
 */
export interface SlackAllocation {
  id: string;
  projectName: string;
  projectColor: string | null;
  phaseName: string | null;
  plannedHours: number;
  actualHours?: number;
  isBillable: boolean;
  notes: string | null;
  weekStart: string;
}

/**
 * Time confirmation with related data for Slack approval views
 */
export interface SlackConfirmation {
  id: string;
  userId: string;
  employeeName: string;
  weekStart: string;
  status: TimeConfirmation['status'];
  submittedAt: string | null;
  entries: SlackTimeEntry[];
  totalPlannedHours: number;
  totalActualHours: number;
  variance: number;
  variancePercentage: number;
  exactMatchFlag: boolean;
  notes: string | null;
}

/**
 * Time entry for Slack display
 */
export interface SlackTimeEntry {
  id: string;
  projectName: string;
  phaseName: string | null;
  plannedHours: number;
  actualHours: number;
  variance: number;
  isUnplanned: boolean;
  notes: string | null;
}

/**
 * Project budget info for Slack display
 */
export interface SlackBudgetInfo {
  projectId: string;
  projectName: string;
  clientName: string;
  budgetHours: number;
  usedHours: number;
  remainingHours: number;
  percentageUsed: number;
  hourlyRate: number | null;
  budgetDollars: number | null;
  usedDollars: number | null;
  remainingDollars: number | null;
  isBillable: boolean;
  phases: SlackPhaseInfo[];
}

/**
 * Phase budget info for Slack display
 */
export interface SlackPhaseInfo {
  id: string;
  name: string;
  budgetHours: number;
  usedHours: number;
  remainingHours: number;
  percentageUsed: number;
  status: ProjectPhase['status'];
}

// ============================================
// Block Kit Types
// ============================================

/**
 * Standard Block Kit block types
 */
export type BlockType =
  | 'section'
  | 'divider'
  | 'header'
  | 'context'
  | 'actions'
  | 'input';

/**
 * Text object for Block Kit
 */
export interface TextObject {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

/**
 * Button element for Block Kit
 */
export interface ButtonElement {
  type: 'button';
  text: TextObject;
  action_id: string;
  value?: string;
  style?: 'primary' | 'danger';
  confirm?: ConfirmDialog;
}

/**
 * Confirmation dialog for buttons
 */
export interface ConfirmDialog {
  title: TextObject;
  text: TextObject;
  confirm: TextObject;
  deny: TextObject;
  style?: 'primary' | 'danger';
}

/**
 * Section block
 */
export interface SectionBlock {
  type: 'section';
  text?: TextObject;
  block_id?: string;
  fields?: TextObject[];
  accessory?: ButtonElement | SelectElement;
}

/**
 * Header block
 */
export interface HeaderBlock {
  type: 'header';
  text: TextObject;
  block_id?: string;
}

/**
 * Divider block
 */
export interface DividerBlock {
  type: 'divider';
  block_id?: string;
}

/**
 * Context block
 */
export interface ContextBlock {
  type: 'context';
  elements: TextObject[];
  block_id?: string;
}

/**
 * Actions block
 */
export interface ActionsBlock {
  type: 'actions';
  elements: (ButtonElement | SelectElement)[];
  block_id?: string;
}

/**
 * Select menu element
 */
export interface SelectElement {
  type: 'static_select' | 'external_select' | 'users_select';
  action_id: string;
  placeholder?: TextObject;
  initial_option?: SelectOption;
  options?: SelectOption[];
}

/**
 * Select option
 */
export interface SelectOption {
  text: TextObject;
  value: string;
}

/**
 * Input block
 */
export interface InputBlock {
  type: 'input';
  block_id: string;
  label: TextObject;
  element: InputElement;
  optional?: boolean;
  hint?: TextObject;
}

/**
 * Input element types
 */
export type InputElement =
  | PlainTextInputElement
  | NumberInputElement
  | SelectElement;

/**
 * Plain text input element
 */
export interface PlainTextInputElement {
  type: 'plain_text_input';
  action_id: string;
  placeholder?: TextObject;
  initial_value?: string;
  multiline?: boolean;
  max_length?: number;
}

/**
 * Number input element
 */
export interface NumberInputElement {
  type: 'number_input';
  action_id: string;
  is_decimal_allowed: boolean;
  placeholder?: TextObject;
  initial_value?: string;
  min_value?: string;
  max_value?: string;
}

/**
 * Union type for all block types
 */
export type Block =
  | SectionBlock
  | HeaderBlock
  | DividerBlock
  | ContextBlock
  | ActionsBlock
  | InputBlock;

/**
 * Block Kit message structure
 */
export interface BlockKitMessage {
  blocks: Block[];
  text?: string; // Fallback text for notifications
  thread_ts?: string;
  response_type?: 'in_channel' | 'ephemeral';
}

// ============================================
// View Types
// ============================================

/**
 * Modal view structure
 */
export interface ModalView {
  type: 'modal';
  callback_id: string;
  title: TextObject;
  submit?: TextObject;
  close?: TextObject;
  blocks: Block[];
  private_metadata?: string;
  clear_on_close?: boolean;
  notify_on_close?: boolean;
}

/**
 * Home tab view structure
 */
export interface HomeView {
  type: 'home';
  blocks: Block[];
  private_metadata?: string;
}

// ============================================
// Payload Types
// ============================================

/**
 * View submission payload from Slack
 */
export interface ViewSubmissionPayload {
  type: 'view_submission';
  team: {
    id: string;
    domain: string;
  };
  user: {
    id: string;
    username: string;
    name: string;
    team_id: string;
  };
  view: {
    id: string;
    team_id: string;
    type: string;
    callback_id: string;
    private_metadata: string;
    title: TextObject;
    state: {
      values: Record<string, Record<string, InputStateValue>>;
    };
  };
  response_urls: ResponseUrl[];
}

/**
 * Input state value from view submission
 */
export interface InputStateValue {
  type: string;
  value?: string;
  selected_option?: SelectOption;
  selected_user?: string;
  selected_date?: string;
}

/**
 * Response URL from view submission
 */
export interface ResponseUrl {
  block_id: string;
  action_id: string;
  channel_id: string;
  response_url: string;
}

/**
 * Action payload from Slack (button clicks, select changes, etc.)
 */
export interface ActionPayload {
  type: 'block_actions';
  team: {
    id: string;
    domain: string;
  };
  user: {
    id: string;
    username: string;
    name: string;
    team_id: string;
  };
  channel: {
    id: string;
    name: string;
  };
  message: {
    ts: string;
    thread_ts?: string;
  };
  actions: ActionItem[];
  response_url: string;
  trigger_id: string;
}

/**
 * Individual action item
 */
export interface ActionItem {
  type: string;
  action_id: string;
  block_id: string;
  value?: string;
  selected_option?: SelectOption;
  action_ts: string;
}

/**
 * Slash command payload
 */
export interface SlashCommandPayload {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

// ============================================
// Warning Types
// ============================================

/**
 * Warning level for budget/variance alerts
 */
export type WarningLevel = 'info' | 'warning' | 'critical';

/**
 * Warning message for display
 */
export interface Warning {
  level: WarningLevel;
  message: string;
  context?: string;
}

// ============================================
// Utility Types
// ============================================

/**
 * User context from Slack request
 */
export interface SlackUserContext {
  slackUserId: string;
  slackWorkspaceId: string;
  userId?: string;
  orgId?: string;
  role?: UserRole;
}

/**
 * Week context for commands
 */
export interface WeekContext {
  weekStart: string; // ISO date string (Monday)
  weekEnd: string; // ISO date string (Sunday)
  displayString: string; // Human-readable format
}

/**
 * Private metadata structure for modals
 */
export interface ModalMetadata {
  action: string;
  weekStart?: string;
  confirmationId?: string;
  projectId?: string;
  userId?: string;
  [key: string]: string | undefined;
}
