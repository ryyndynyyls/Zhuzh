export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      allocations: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          is_billable: boolean
          notes: string | null
          phase_id: string | null
          planned_hours: number
          project_id: string
          start_date: string
          updated_at: string
          user_id: string
          week_start: string // Deprecated: kept for backwards compatibility, use start_date instead
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          is_billable?: boolean
          notes?: string | null
          phase_id?: string | null
          planned_hours: number
          project_id: string
          start_date: string
          updated_at?: string
          user_id: string
          week_start?: string // Deprecated: kept for backwards compatibility, use start_date instead
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          is_billable?: boolean
          notes?: string | null
          phase_id?: string | null
          planned_hours?: number
          project_id?: string
          start_date?: string
          updated_at?: string
          user_id?: string
          week_start?: string // Deprecated: kept for backwards compatibility, use start_date instead
        }
        Relationships: [
          {
            foreignKeyName: "allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_weekly_utilization"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phase_budget_metrics"
            referencedColumns: ["phase_id"]
          },
          {
            foreignKeyName: "allocations_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phase_budget_summary"
            referencedColumns: ["phase_id"]
          },
          {
            foreignKeyName: "allocations_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "archive_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "role_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "allocations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "allocations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "allocations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_weekly_utilization"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "allocations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          changes: Json
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          org_id: string
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          changes?: Json
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          org_id: string
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          org_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_weekly_utilization"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_alert_log: {
        Row: {
          burn_percentage: number | null
          id: string
          notified_user_id: string | null
          project_id: string
          threshold: number
          triggered_at: string | null
        }
        Insert: {
          burn_percentage?: number | null
          id?: string
          notified_user_id?: string | null
          project_id: string
          threshold: number
          triggered_at?: string | null
        }
        Update: {
          burn_percentage?: number | null
          id?: string
          notified_user_id?: string | null
          project_id?: string
          threshold?: number
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_alert_log_notified_user_id_fkey"
            columns: ["notified_user_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "budget_alert_log_notified_user_id_fkey"
            columns: ["notified_user_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "budget_alert_log_notified_user_id_fkey"
            columns: ["notified_user_id"]
            isOneToOne: false
            referencedRelation: "user_weekly_utilization"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "budget_alert_log_notified_user_id_fkey"
            columns: ["notified_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_alert_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "archive_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_alert_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_alert_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_alert_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_alert_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_alert_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_alert_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "role_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_alert_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["project_id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_calendar_config: {
        Row: {
          admin_description: string | null
          clarification_questions: string[] | null
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          holiday_detection: Json
          id: string
          needs_clarification: boolean | null
          org_id: string
          partial_day_detection: Json
          pto_detection: Json
          recurring_schedules: Json
          screenshot_analysis: Json | null
          shared_calendars: Json
          updated_at: string | null
        }
        Insert: {
          admin_description?: string | null
          clarification_questions?: string[] | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          holiday_detection?: Json
          id?: string
          needs_clarification?: boolean | null
          org_id: string
          partial_day_detection?: Json
          pto_detection?: Json
          recurring_schedules?: Json
          screenshot_analysis?: Json | null
          shared_calendars?: Json
          updated_at?: string | null
        }
        Update: {
          admin_description?: string | null
          clarification_questions?: string[] | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          holiday_detection?: Json
          id?: string
          needs_clarification?: boolean | null
          org_id?: string
          partial_day_detection?: Json
          pto_detection?: Json
          recurring_schedules?: Json
          screenshot_analysis?: Json | null
          shared_calendars?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_calendar_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_calendar_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_calendar_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_weekly_utilization"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_calendar_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_calendar_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slack_workspace_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slack_workspace_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slack_workspace_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_phases: {
        Row: {
          budget_amount: number | null
          budget_hours: number | null
          id: string
          name: string
          project_id: string
          sort_order: number
          status: Database["public"]["Enums"]["phase_status"]
        }
        Insert: {
          budget_amount?: number | null
          budget_hours?: number | null
          id?: string
          name: string
          project_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["phase_status"]
        }
        Update: {
          budget_amount?: number | null
          budget_hours?: number | null
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["phase_status"]
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "archive_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "role_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["project_id"]
          },
        ]
      }
      projects: {
        Row: {
          aliases: string | null
          archive_reason: string | null
          archived_at: string | null
          budget_hours: number | null
          client_id: string | null
          color: string | null
          created_at: string
          description: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          is_billable: boolean
          legacy_10kft_id: number | null
          name: string
          org_id: string
          parent_id: string | null
          priority: number | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          aliases?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          budget_hours?: number | null
          client_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_billable?: boolean
          legacy_10kft_id?: number | null
          name: string
          org_id: string
          parent_id?: string | null
          priority?: number | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          aliases?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          budget_hours?: number | null
          client_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_billable?: boolean
          legacy_10kft_id?: number | null
          name?: string
          org_id?: string
          parent_id?: string | null
          priority?: number | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "archive_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_budget_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "role_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["project_id"]
          },
        ]
      }
      pto_entries: {
        Row: {
          date: string
          hours: number
          id: string
          notes: string | null
          type: Database["public"]["Enums"]["pto_type"]
          user_id: string
        }
        Insert: {
          date: string
          hours?: number
          id?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["pto_type"]
          user_id: string
        }
        Update: {
          date?: string
          hours?: number
          id?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["pto_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pto_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pto_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pto_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_weekly_utilization"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pto_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          org_id: string
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          org_id: string
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          org_id?: string
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      slack_channel_projects: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          project_id: string
          slack_channel_id: string
          slack_channel_name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          project_id: string
          slack_channel_id: string
          slack_channel_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          project_id?: string
          slack_channel_id?: string
          slack_channel_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slack_channel_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "slack_channel_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "slack_channel_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_weekly_utilization"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "slack_channel_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_channel_projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_channel_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "archive_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_channel_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "slack_channel_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "slack_channel_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "slack_channel_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_channel_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_channel_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "role_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "slack_channel_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["project_id"]
          },
        ]
      }
      time_confirmations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          exact_match_flag: boolean | null
          id: string
          notes: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["confirmation_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          exact_match_flag?: boolean | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["confirmation_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          exact_match_flag?: boolean | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["confirmation_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_confirmations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_confirmations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_confirmations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_weekly_utilization"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_confirmations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_weekly_utilization"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          actual_hours: number
          allocation_id: string | null
          confirmation_id: string
          id: string
          is_unplanned: boolean
          notes: string | null
          phase_id: string | null
          planned_hours: number
          project_id: string
          tags: string[] | null
        }
        Insert: {
          actual_hours?: number
          allocation_id?: string | null
          confirmation_id: string
          id?: string
          is_unplanned?: boolean
          notes?: string | null
          phase_id?: string | null
          planned_hours?: number
          project_id: string
          tags?: string[] | null
        }
        Update: {
          actual_hours?: number
          allocation_id?: string | null
          confirmation_id?: string
          id?: string
          is_unplanned?: boolean
          notes?: string | null
          phase_id?: string | null
          planned_hours?: number
          project_id?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_confirmation_id_fkey"
            columns: ["confirmation_id"]
            isOneToOne: false
            referencedRelation: "time_confirmations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phase_budget_metrics"
            referencedColumns: ["phase_id"]
          },
          {
            foreignKeyName: "time_entries_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phase_budget_summary"
            referencedColumns: ["phase_id"]
          },
          {
            foreignKeyName: "time_entries_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "archive_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "role_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["project_id"]
          },
        ]
      }
      time_entries_live: {
        Row: {
          confirmation_id: string | null
          created_at: string
          duration_minutes: number
          entry_date: string
          entry_type: string
          id: string
          notes: string | null
          phase_id: string | null
          project_id: string
          source: string | null
          started_at: string | null
          stopped_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmation_id?: string | null
          created_at?: string
          duration_minutes?: number
          entry_date?: string
          entry_type?: string
          id?: string
          notes?: string | null
          phase_id?: string | null
          project_id: string
          source?: string | null
          started_at?: string | null
          stopped_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmation_id?: string | null
          created_at?: string
          duration_minutes?: number
          entry_date?: string
          entry_type?: string
          id?: string
          notes?: string | null
          phase_id?: string | null
          project_id?: string
          source?: string | null
          started_at?: string | null
          stopped_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_live_confirmation_id_fkey"
            columns: ["confirmation_id"]
            isOneToOne: false
            referencedRelation: "time_confirmations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_live_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phase_budget_metrics"
            referencedColumns: ["phase_id"]
          },
          {
            foreignKeyName: "time_entries_live_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phase_budget_summary"
            referencedColumns: ["phase_id"]
          },
          {
            foreignKeyName: "time_entries_live_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "archive_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "role_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_live_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_entries_live_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_entries_live_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_weekly_utilization"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_entries_live_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_calendar_events: {
        Row: {
          all_day: boolean | null
          calendar_event_id: string
          created_at: string | null
          end_time: string
          event_type: string
          id: string
          start_time: string
          summary: string
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          calendar_event_id: string
          created_at?: string | null
          end_time: string
          event_type: string
          id?: string
          start_time: string
          summary: string
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          calendar_event_id?: string
          created_at?: string | null
          end_time?: string
          event_type?: string
          id?: string
          start_time?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_weekly_utilization"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          alt_name: string | null
          avatar_url: string | null
          calendar_connected_at: string | null
          contact_email: string | null
          created_at: string
          discipline: string | null
          dm_frequency: string | null
          email: string
          google_access_token: string | null
          google_calendar_connected: boolean | null
          google_calendar_id: string | null
          google_refresh_token: string | null
          google_token_expiry: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          is_freelance: boolean | null
          job_title: string | null
          location: string | null
          name: string
          nicknames: string | null
          notification_preferences: Json | null
          org_id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          slack_user_id: string | null
          specialty_notes: string | null
          time_tracking_daily_summary: boolean | null
          time_tracking_enabled: boolean | null
          time_tracking_widget_position: string | null
          timezone_override: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          alt_name?: string | null
          avatar_url?: string | null
          calendar_connected_at?: string | null
          contact_email?: string | null
          created_at?: string
          discipline?: string | null
          dm_frequency?: string | null
          email: string
          google_access_token?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          is_freelance?: boolean | null
          job_title?: string | null
          location?: string | null
          name: string
          nicknames?: string | null
          notification_preferences?: Json | null
          org_id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          slack_user_id?: string | null
          specialty_notes?: string | null
          time_tracking_daily_summary?: boolean | null
          time_tracking_enabled?: boolean | null
          time_tracking_widget_position?: string | null
          timezone_override?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          alt_name?: string | null
          avatar_url?: string | null
          calendar_connected_at?: string | null
          contact_email?: string | null
          created_at?: string
          discipline?: string | null
          dm_frequency?: string | null
          email?: string
          google_access_token?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          is_freelance?: boolean | null
          job_title?: string | null
          location?: string | null
          name?: string
          nicknames?: string | null
          notification_preferences?: Json | null
          org_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          slack_user_id?: string | null
          specialty_notes?: string | null
          time_tracking_daily_summary?: boolean | null
          time_tracking_enabled?: boolean | null
          time_tracking_widget_position?: string | null
          timezone_override?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      archive_candidates: {
        Row: {
          client_name: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          last_allocation: string | null
          name: string | null
          total_allocations: number | null
          total_hours_logged: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      budget_audit_trail: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"] | null
          audit_id: string | null
          changed_by_email: string | null
          changed_by_name: string | null
          changes: Json | null
          context_name: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          hours_summary: string | null
          org_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      person_project_summary: {
        Row: {
          client_name: string | null
          discipline: string | null
          email: string | null
          incurred_amount: number | null
          incurred_hours: number | null
          project_id: string | null
          project_name: string | null
          scheduled_amount: number | null
          scheduled_hours: number | null
          total_amount: number | null
          total_hours: number | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
      phase_budget_metrics: {
        Row: {
          budget_amount: number | null
          budget_hours: number | null
          burn_rate_percent: number | null
          client_id: string | null
          client_name: string | null
          forecast_amount: number | null
          forecast_hours: number | null
          incurred_amount: number | null
          incurred_hours: number | null
          percent_of_project: number | null
          phase_id: string | null
          phase_name: string | null
          project_id: string | null
          project_name: string | null
          scheduled_amount: number | null
          scheduled_hours: number | null
          status: string | null
          variance_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "archive_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "role_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["client_id"]
          },
        ]
      }
      project_budget_detailed: {
        Row: {
          budget_hours: number | null
          budget_status: string | null
          burn_percentage: number | null
          client_id: string | null
          client_name: string | null
          color: string | null
          description: string | null
          hourly_rate: number | null
          is_billable: boolean | null
          org_id: string | null
          phase_count: number | null
          priority: number | null
          project_id: string | null
          project_name: string | null
          remaining_hours: number | null
          status: Database["public"]["Enums"]["project_status"] | null
          total_actual_hours: number | null
          total_planned_hours: number | null
          unplanned_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budget_summary: {
        Row: {
          budget_hours: number | null
          burn_percentage: number | null
          burned_hours: number | null
          client_name: string | null
          org_id: string | null
          project_id: string | null
          project_name: string | null
          remaining_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phase_budget_summary: {
        Row: {
          burn_percentage: number | null
          org_id: string | null
          phase_budget_hours: number | null
          phase_id: string | null
          phase_name: string | null
          phase_status: Database["public"]["Enums"]["phase_status"] | null
          project_budget_hours: number | null
          project_id: string | null
          project_name: string | null
          project_status: Database["public"]["Enums"]["project_status"] | null
          remaining_hours: number | null
          sort_order: number | null
          total_actual_hours: number | null
          total_planned_hours: number | null
          variance_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "archive_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "role_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects_with_children: {
        Row: {
          budget_hours: number | null
          child_count: number | null
          children_budget_hours: number | null
          client_id: string | null
          color: string | null
          created_at: string | null
          description: string | null
          hourly_rate: number | null
          id: string | null
          is_billable: boolean | null
          legacy_10kft_id: number | null
          name: string | null
          org_id: string | null
          parent_id: string | null
          priority: number | null
          status: Database["public"]["Enums"]["project_status"] | null
          updated_at: string | null
        }
        Insert: {
          budget_hours?: number | null
          child_count?: never
          children_budget_hours?: never
          client_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          hourly_rate?: number | null
          id?: string | null
          is_billable?: boolean | null
          legacy_10kft_id?: number | null
          name?: string | null
          org_id?: string | null
          parent_id?: string | null
          priority?: number | null
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string | null
        }
        Update: {
          budget_hours?: number | null
          child_count?: never
          children_budget_hours?: never
          client_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          hourly_rate?: number | null
          id?: string | null
          is_billable?: boolean | null
          legacy_10kft_id?: number | null
          name?: string | null
          org_id?: string | null
          parent_id?: string | null
          priority?: number | null
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "archive_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_budget_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "role_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["project_id"]
          },
        ]
      }
      role_project_summary: {
        Row: {
          client_name: string | null
          incurred_amount: number | null
          incurred_hours: number | null
          project_id: string | null
          project_name: string | null
          role_name: string | null
          scheduled_amount: number | null
          scheduled_hours: number | null
          team_member_count: number | null
          total_hours: number | null
        }
        Relationships: []
      }
      time_entries_daily_summary: {
        Row: {
          entry_count: number | null
          entry_date: string | null
          first_entry: string | null
          last_entry: string | null
          project_color: string | null
          project_id: string | null
          project_name: string | null
          total_hours: number | null
          total_minutes: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "archive_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_detailed"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_budget_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "role_project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_live_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "person_project_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_entries_live_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "time_entries_weekly_comparison"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_entries_live_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_weekly_utilization"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_entries_live_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries_weekly_comparison: {
        Row: {
          planned_hours: number | null
          project_color: string | null
          project_id: string | null
          project_name: string | null
          tracked_hours: number | null
          user_id: string | null
          user_name: string | null
          variance_hours: number | null
          week_start: string | null
        }
        Relationships: []
      }
      user_weekly_utilization: {
        Row: {
          available_hours: number | null
          org_id: string | null
          pto_hours: number | null
          total_planned_hours: number | null
          user_id: string | null
          user_name: string | null
          utilization_percentage: number | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_current_user_id: { Args: never; Returns: string }
      get_current_user_org_id: { Args: never; Returns: string }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_person_totals: {
        Args: { p_user_id: string }
        Returns: {
          project_count: number
          total_incurred_amount: number
          total_incurred_hours: number
          total_scheduled_amount: number
          total_scheduled_hours: number
        }[]
      }
      get_role_totals: {
        Args: { p_discipline: string }
        Returns: {
          project_count: number
          team_member_count: number
          total_incurred_amount: number
          total_incurred_hours: number
          total_scheduled_amount: number
          total_scheduled_hours: number
        }[]
      }
      get_user_org_id: { Args: never; Returns: string }
    }
    Enums: {
      audit_action: "create" | "update" | "delete"
      confirmation_status: "draft" | "submitted" | "approved" | "rejected"
      phase_status: "pending" | "active" | "complete"
      project_status: "planning" | "active" | "on-hold" | "complete"
      pto_type: "pto" | "holiday" | "half-day" | "sick"
      user_role: "employee" | "pm" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audit_action: ["create", "update", "delete"],
      confirmation_status: ["draft", "submitted", "approved", "rejected"],
      phase_status: ["pending", "active", "complete"],
      project_status: ["planning", "active", "on-hold", "complete"],
      pto_type: ["pto", "holiday", "half-day", "sick"],
      user_role: ["employee", "pm", "admin"],
    },
  },
} as const

// =============================================================================
// CONVENIENCE TYPE ALIASES
// =============================================================================
// These provide friendly names for common database types used throughout the app

// Table Row Types (for reading data)
export type User = Tables<'users'>
export type Project = Tables<'projects'>
export type Allocation = Tables<'allocations'>
export type TimeConfirmation = Tables<'time_confirmations'>
export type TimeEntry = Tables<'time_entries'>
export type TimeEntryLive = Tables<'time_entries_live'>
export type ProjectPhase = Tables<'project_phases'>
export type Client = Tables<'clients'>
export type Organization = Tables<'organizations'>
export type AuditLogEntry = Tables<'audit_log'>
export type PtoEntry = Tables<'pto_entries'>
export type OrgCalendarConfig = Tables<'org_calendar_config'>
export type UserCalendarEvent = Tables<'user_calendar_events'>
export type SlackChannelProject = Tables<'slack_channel_projects'>
export type BudgetAlertLog = Tables<'budget_alert_log'>

// Row Type Aliases (for backward compatibility)
export type UserRow = User
export type ProjectRow = Project
export type AllocationRow = Allocation
export type TimeConfirmationRow = TimeConfirmation
export type TimeEntryRow = TimeEntry
export type TimeEntryLiveRow = TimeEntryLive
export type ProjectPhaseRow = ProjectPhase
export type ClientRow = Client
export type OrganizationRow = Organization

// Table Insert Types (for creating data)
export type UserInsert = TablesInsert<'users'>
export type ProjectInsert = TablesInsert<'projects'>
export type AllocationInsert = TablesInsert<'allocations'>
export type TimeConfirmationInsert = TablesInsert<'time_confirmations'>
export type TimeEntryInsert = TablesInsert<'time_entries'>
export type TimeEntryLiveInsert = TablesInsert<'time_entries_live'>
export type ProjectPhaseInsert = TablesInsert<'project_phases'>
export type ClientInsert = TablesInsert<'clients'>

// Table Update Types (for updating data)
export type UserUpdate = TablesUpdate<'users'>
export type ProjectUpdate = TablesUpdate<'projects'>
export type AllocationUpdate = TablesUpdate<'allocations'>
export type TimeConfirmationUpdate = TablesUpdate<'time_confirmations'>
export type TimeEntryUpdate = TablesUpdate<'time_entries'>
export type TimeEntryLiveUpdate = TablesUpdate<'time_entries_live'>
export type ProjectPhaseUpdate = TablesUpdate<'project_phases'>

// Enum Types
export type UserRole = Enums<'user_role'>
export type ConfirmationStatus = Enums<'confirmation_status'>
export type ProjectStatus = Enums<'project_status'>
export type PhaseStatus = Enums<'phase_status'>
export type PtoType = Enums<'pto_type'>
export type AuditAction = Enums<'audit_action'>

// View Types (read-only)
export type ArchiveCandidate = Tables<'archive_candidates'>
export type PersonProjectSummary = Tables<'person_project_summary'>
export type ProjectBudgetSummary = Tables<'project_budget_summary'>
export type ProjectBudgetDetailed = Tables<'project_budget_detailed'>
export type PhaseBudgetMetrics = Tables<'phase_budget_metrics'>
export type ProjectPhaseBudgetSummary = Tables<'project_phase_budget_summary'>
export type ProjectsWithChildren = Tables<'projects_with_children'>
export type RoleProjectSummary = Tables<'role_project_summary'>
export type UserWeeklyUtilization = Tables<'user_weekly_utilization'>
export type TimeEntriesDailySummary = Tables<'time_entries_daily_summary'>
export type TimeEntriesWeeklyComparison = Tables<'time_entries_weekly_comparison'>
export type BudgetAuditTrail = Tables<'budget_audit_trail'>
