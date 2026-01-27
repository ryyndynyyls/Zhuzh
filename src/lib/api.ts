import { supabase } from './supabase';
import type {
  ProjectRow,
  AllocationRow,
  TimeConfirmationRow,
  TimeEntryRow,
  PtoEntry
} from '../types/database';

// ============================================
// PROJECTS
// ============================================

export async function getProjects(filters?: {
  status?: string;
  clientId?: string;
  isActive?: boolean
}) {
  let query = supabase
    .from('projects')
    .select('*, client:clients(id, name), phases:project_phases(*)');

  if (filters?.status) query = query.eq('status', filters.status as 'active' | 'complete' | 'planning' | 'on-hold');
  if (filters?.clientId) query = query.eq('client_id', filters.clientId);
  if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);

  const { data, error } = await query.order('priority', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getProject(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*, client:clients(name), phases:project_phases(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getProjectBudgetSummary() {
  const { data, error } = await supabase
    .from('project_budget_summary')
    .select('*')
    .order('burn_percentage', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createProject(project: Partial<ProjectRow> & { name: string; org_id: string }) {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, updates: Partial<ProjectRow>) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// ALLOCATIONS
// ============================================

export async function getAllocations(weekStart: string, userId?: string, projectId?: string) {
  let query = supabase
    .from('allocations')
    .select('*, project:projects(id, name, color), phase:project_phases(id, name)')
    .eq('week_start', weekStart);

  if (userId) query = query.eq('user_id', userId);
  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createAllocation(allocation: Partial<AllocationRow> & { week_start: string; planned_hours: number; project_id: string; user_id: string }) {
  const { data, error } = await supabase
    .from('allocations')
    .insert(allocation)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAllocation(id: string, updates: Partial<AllocationRow>) {
  const { data, error } = await supabase
    .from('allocations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAllocation(id: string) {
  const { error } = await supabase
    .from('allocations')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/**
 * Bulk create allocations (for Repeat Last Week feature)
 */
export async function bulkCreateAllocations(
  allocations: Array<Partial<AllocationRow> & { week_start: string; planned_hours: number; project_id: string; user_id: string }>
) {
  if (allocations.length === 0) return [];

  const { data, error } = await supabase
    .from('allocations')
    .insert(allocations)
    .select();
  if (error) throw error;
  return data;
}

/**
 * Get allocations for a specific week (for copying)
 */
export async function getAllocationsForWeek(weekStart: string, orgId?: string) {
  let query = supabase
    .from('allocations')
    .select('*, project:projects(id, name, color, org_id), phase:project_phases(id, name), user:users(id, name, org_id)')
    .eq('week_start', weekStart);

  // If orgId provided, filter by projects in that org
  if (orgId) {
    query = query.eq('project.org_id', orgId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ============================================
// CONFIRMATIONS
// ============================================

export async function getConfirmation(userId: string, weekStart: string) {
  const { data, error } = await supabase
    .from('time_confirmations')
    .select('*, entries:time_entries(*, project:projects(name, color))')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPendingApprovals() {
  const { data, error } = await supabase
    .from('time_confirmations')
    .select('*, user:users(id, name, email), entries:time_entries(*, project:projects(name, color))')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function submitConfirmation(
  userId: string,
  weekStart: string,
  entries: Array<{ allocation_id: string; actual_hours: number; notes?: string }>,
  notes?: string
) {
  // Get or create confirmation
  let { data: confirmation } = await supabase
    .from('time_confirmations')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (confirmation) {
    // Update existing
    const { data, error } = await supabase
      .from('time_confirmations')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        notes
      })
      .eq('id', confirmation.id)
      .select()
      .single();
    if (error) throw error;
    confirmation = data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('time_confirmations')
      .insert({
        user_id: userId,
        week_start: weekStart,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        notes
      })
      .select()
      .single();
    if (error) throw error;
    confirmation = data;
  }

  // Delete existing entries
  await supabase
    .from('time_entries')
    .delete()
    .eq('confirmation_id', confirmation.id);

  // Get allocations for planned hours
  const { data: allocations } = await supabase
    .from('allocations')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart);

  // Check for exact match (rubber-stamp)
  let exactMatch = true;

  // Create new entries
  for (const entry of entries) {
    const alloc = allocations?.find(a => a.id === entry.allocation_id);
    if (alloc) {
      if (alloc.planned_hours !== entry.actual_hours) {
        exactMatch = false;
      }

      await supabase
        .from('time_entries')
        .insert({
          confirmation_id: confirmation.id,
          project_id: alloc.project_id,
          phase_id: alloc.phase_id,
          allocation_id: alloc.id,
          planned_hours: alloc.planned_hours,
          actual_hours: entry.actual_hours,
          is_unplanned: false,
          notes: entry.notes
        });
    }
  }

  // Update exact_match_flag
  await supabase
    .from('time_confirmations')
    .update({ exact_match_flag: exactMatch })
    .eq('id', confirmation.id);

  return confirmation;
}

export async function approveConfirmation(id: string, approverId: string) {
  const { data, error } = await supabase
    .from('time_confirmations')
    .update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function rejectConfirmation(id: string, reason: string) {
  const { data, error } = await supabase
    .from('time_confirmations')
    .update({
      status: 'rejected',
      rejection_reason: reason
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PTO
// ============================================

export async function getPtoEntries(weekStart: string, userId?: string) {
  let query = supabase
    .from('pto_entries')
    .select('*, user:users(name)')
    .gte('date', weekStart)
    .lte('date', addDays(weekStart, 6));

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createPtoEntry(entry: Partial<PtoEntry> & { date: string; user_id: string }) {
  const { data, error } = await supabase
    .from('pto_entries')
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// TEAM UTILIZATION
// ============================================

export async function getTeamUtilization(weekStart: string) {
  const { data, error } = await supabase
    .from('user_weekly_utilization')
    .select('*')
    .eq('week_start', weekStart);
  if (error) throw error;
  return data;
}

// ============================================
// USERS
// ============================================

export async function getUsers(orgId?: string) {
  let query = supabase
    .from('users')
    .select('*')
    .eq('is_active', true);

  if (orgId) query = query.eq('org_id', orgId);

  const { data, error } = await query.order('name');
  if (error) throw error;
  return data;
}

export async function getUserBySlackId(slackUserId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('slack_user_id', slackUserId)
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// HELPERS
// ============================================

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
