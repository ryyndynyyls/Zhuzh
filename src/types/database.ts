/**
 * TypeScript interfaces for Zhuzh database schema
 * Generated from implementation-plan.md specifications
 */

// Enums
export type UserRole = 'employee' | 'pm' | 'admin'
export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'complete'
export type PhaseStatus = 'pending' | 'active' | 'complete'
export type ConfirmationStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
export type PtoType = 'pto' | 'holiday' | 'half-day' | 'sick'
export type AuditAction = 'create' | 'update' | 'delete'

// Database Row Types
export interface Organization {
  id: string
  name: string
  slack_workspace_id: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  org_id: string
  email: string
  name: string
  role: UserRole
  slack_user_id: string
  hourly_rate: number | null
  is_active: boolean
  is_freelance: boolean
  job_title: string | null
  specialty_notes: string | null
  location: string | null
  alt_name: string | null
  nicknames: string | null  // Comma-separated nicknames for search (e.g., "Fred, Freddy" for Frédéric)
  website: string | null
  contact_email: string | null
  phone: string | null
  discipline: string | null
  avatar_url: string | null  // URL to user avatar image
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  org_id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface Project {
  id: string
  org_id: string
  client_id: string
  parent_id: string | null  // For sub-project rollups
  name: string
  aliases: string | null  // Comma-separated aliases for Slack matching (e.g., "GCN, Cloud Next")
  description: string | null
  color: string | null
  budget_hours: number
  hourly_rate: number | null
  is_billable: boolean
  is_active: boolean
  priority: number | null
  status: ProjectStatus
  legacy_10kft_id: number | null  // For migration mapping
  created_at: string
  updated_at: string
}

export interface ProjectPhase {
  id: string
  project_id: string
  name: string
  budget_hours: number
  sort_order: number
  status: PhaseStatus
}

export interface Allocation {
  id: string
  project_id: string
  user_id: string
  phase_id: string | null
  week_start: string
  planned_hours: number
  is_billable: boolean
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface TimeConfirmation {
  id: string
  user_id: string
  week_start: string
  status: ConfirmationStatus
  submitted_at: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  exact_match_flag: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: string
  confirmation_id: string
  project_id: string
  phase_id: string | null
  allocation_id: string | null
  planned_hours: number
  actual_hours: number
  is_unplanned: boolean
  notes: string | null
  tags: string[] | null
}

export interface PtoEntry {
  id: string
  user_id: string
  date: string
  type: PtoType
  hours: number
  notes: string | null
}

export interface AuditLog {
  id: string
  org_id: string
  entity_type: string
  entity_id: string
  action: AuditAction
  changes: Record<string, unknown>
  user_id: string
  created_at: string
}

// Insert Types (for creating new records)
export interface OrganizationInsert {
  id?: string
  name: string
  slack_workspace_id: string
  created_at?: string
  updated_at?: string
}

export interface UserInsert {
  id?: string
  org_id: string
  email: string
  name: string
  role: UserRole
  slack_user_id: string
  hourly_rate?: number | null
  is_active?: boolean
  is_freelance?: boolean
  job_title?: string | null
  specialty_notes?: string | null
  location?: string | null
  alt_name?: string | null
  nicknames?: string | null  // Comma-separated nicknames for search
  website?: string | null
  contact_email?: string | null
  phone?: string | null
  discipline?: string | null
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface ClientInsert {
  id?: string
  org_id: string
  name: string
  is_active?: boolean
  created_at?: string
}

export interface ProjectInsert {
  id?: string
  org_id: string
  client_id: string
  name: string
  aliases?: string | null  // Comma-separated aliases for Slack matching
  description?: string | null
  color?: string | null
  budget_hours: number
  hourly_rate?: number | null
  is_billable?: boolean
  is_active?: boolean
  priority?: number | null
  status?: ProjectStatus
  created_at?: string
  updated_at?: string
}

export interface ProjectPhaseInsert {
  id?: string
  project_id: string
  name: string
  budget_hours: number
  sort_order?: number
  status?: PhaseStatus
}

export interface AllocationInsert {
  id?: string
  project_id: string
  user_id: string
  phase_id?: string | null
  week_start: string
  planned_hours: number
  is_billable?: boolean
  notes?: string | null
  created_by: string
  created_at?: string
  updated_at?: string
}

export interface TimeConfirmationInsert {
  id?: string
  user_id: string
  week_start: string
  status?: ConfirmationStatus
  submitted_at?: string | null
  approved_by?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  exact_match_flag?: boolean
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface TimeEntryInsert {
  id?: string
  confirmation_id: string
  project_id: string
  phase_id?: string | null
  allocation_id?: string | null
  planned_hours: number
  actual_hours: number
  is_unplanned?: boolean
  notes?: string | null
  tags?: string[] | null
}

export interface PtoEntryInsert {
  id?: string
  user_id: string
  date: string
  type: PtoType
  hours: number
  notes?: string | null
}

export interface AuditLogInsert {
  id?: string
  org_id: string
  entity_type: string
  entity_id: string
  action: AuditAction
  changes: Record<string, unknown>
  user_id: string
  created_at?: string
}

// Update Types (for updating records)
export interface OrganizationUpdate {
  name?: string
  slack_workspace_id?: string
  updated_at?: string
}

export interface UserUpdate {
  email?: string
  name?: string
  role?: UserRole
  slack_user_id?: string
  hourly_rate?: number | null
  is_active?: boolean
  is_freelance?: boolean
  job_title?: string | null
  specialty_notes?: string | null
  location?: string | null
  alt_name?: string | null
  nicknames?: string | null  // Comma-separated nicknames for search
  website?: string | null
  contact_email?: string | null
  phone?: string | null
  discipline?: string | null
  avatar_url?: string | null
  updated_at?: string
}

export interface ClientUpdate {
  name?: string
  is_active?: boolean
}

export interface ProjectUpdate {
  client_id?: string
  name?: string
  aliases?: string | null  // Comma-separated aliases for Slack matching
  description?: string | null
  color?: string | null
  budget_hours?: number
  hourly_rate?: number | null
  is_billable?: boolean
  is_active?: boolean
  priority?: number | null
  status?: ProjectStatus
  updated_at?: string
}

export interface ProjectPhaseUpdate {
  name?: string
  budget_hours?: number
  sort_order?: number
  status?: PhaseStatus
}

export interface AllocationUpdate {
  project_id?: string
  user_id?: string
  phase_id?: string | null
  week_start?: string
  planned_hours?: number
  is_billable?: boolean
  notes?: string | null
  updated_at?: string
}

export interface TimeConfirmationUpdate {
  status?: ConfirmationStatus
  submitted_at?: string | null
  approved_by?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  exact_match_flag?: boolean
  notes?: string | null
  updated_at?: string
}

export interface TimeEntryUpdate {
  project_id?: string
  phase_id?: string | null
  planned_hours?: number
  actual_hours?: number
  is_unplanned?: boolean
  notes?: string | null
  tags?: string[] | null
}

export interface PtoEntryUpdate {
  date?: string
  type?: PtoType
  hours?: number
  notes?: string | null
}

// Supabase Database Type Definition
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: OrganizationInsert
        Update: OrganizationUpdate
      }
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      clients: {
        Row: Client
        Insert: ClientInsert
        Update: ClientUpdate
      }
      projects: {
        Row: Project
        Insert: ProjectInsert
        Update: ProjectUpdate
      }
      project_phases: {
        Row: ProjectPhase
        Insert: ProjectPhaseInsert
        Update: ProjectPhaseUpdate
      }
      allocations: {
        Row: Allocation
        Insert: AllocationInsert
        Update: AllocationUpdate
      }
      time_confirmations: {
        Row: TimeConfirmation
        Insert: TimeConfirmationInsert
        Update: TimeConfirmationUpdate
      }
      time_entries: {
        Row: TimeEntry
        Insert: TimeEntryInsert
        Update: TimeEntryUpdate
      }
      pto_entries: {
        Row: PtoEntry
        Insert: PtoEntryInsert
        Update: PtoEntryUpdate
      }
      audit_log: {
        Row: AuditLog
        Insert: AuditLogInsert
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      project_status: ProjectStatus
      phase_status: PhaseStatus
      confirmation_status: ConfirmationStatus
      pto_type: PtoType
      audit_action: AuditAction
    }
  }
}

// Helper types for API responses with relations
export interface ProjectWithPhases extends Project {
  phases: ProjectPhase[]
}

export interface ProjectWithBudgetStats extends Project {
  phases: ProjectPhase[]
  total_planned_hours: number
  total_actual_hours: number
  budget_remaining: number
  budget_percentage: number
}

export interface AllocationWithRelations extends Allocation {
  project: Project
  user: User
  phase: ProjectPhase | null
}

export interface TimeConfirmationWithEntries extends TimeConfirmation {
  entries: TimeEntry[]
  user: User
}

export interface TimeEntryWithRelations extends TimeEntry {
  project: Project
  phase: ProjectPhase | null
}

// API Response types
export interface ApiError {
  error: string
  details?: string
}

export interface ApiSuccess<T> {
  data: T
}
