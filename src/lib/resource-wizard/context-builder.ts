/**
 * Resource Wizard Context Builder
 *
 * Fetches and structures data from the database
 * to provide context to the Gemini agent
 *
 * Debug: Set ZHUZH_DEBUG=true or NODE_ENV=development to see logs
 */

import { createClient } from '@supabase/supabase-js';
import {
  ResourceWizardContext,
  WizardOrg,
  WizardUser,
  WizardProject,
  WizardPhase,
  ConversationMessage
} from './types';

// Debug helper
const DEBUG = process.env.ZHUZH_DEBUG === 'true' || process.env.NODE_ENV === 'development';
function debug(stage: string, message: string, data?: any) {
  if (DEBUG) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    console.log(`[Zhuzh:CONTEXT:${stage}] ${timestamp} ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : '');
  }
}

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
// Use service role key to bypass RLS for context building
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

debug('init', '🔌 Supabase config', {
  url: supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : 'MISSING',
  hasKey: !!supabaseKey
});

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Format a date as YYYY-MM-DD in local timezone
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the Monday of a given date's week (in local timezone)
 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return formatLocalDate(d);
}

/**
 * Get week start dates for the next N weeks
 */
function getWeekStarts(startDate: Date, weeks: number): string[] {
  const starts: string[] = [];
  const current = new Date(startDate);

  // Start from the Monday of the current week
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  current.setDate(diff);

  for (let i = 0; i < weeks; i++) {
    starts.push(formatLocalDate(current));
    current.setDate(current.getDate() + 7);
  }

  return starts;
}

interface BuildContextOptions {
  orgId: string;
  weeks?: number;
  focusProjectId?: string;
  focusUserIds?: string[];
  conversationHistory?: ConversationMessage[];
}

/**
 * Build the full context for the Resource Wizard
 */
export async function buildResourceWizardContext(
  options: BuildContextOptions
): Promise<ResourceWizardContext> {
  const { orgId, weeks = 4, focusProjectId, focusUserIds, conversationHistory = [] } = options;

  debug('build', '📊 Building context', { orgId, weeks, focusProjectId, focusUserIds: focusUserIds?.length });

  const today = new Date();
  const currentWeekStart = getWeekStart(today);
  const weekStarts = getWeekStarts(today, weeks);
  const endWeek = weekStarts[weekStarts.length - 1];

  debug('build', '📅 Date range', { currentWeekStart, endWeek, weeksCount: weekStarts.length });

  // Fetch organization
  debug('build', '🏢 Fetching organization...');
  const org = await fetchOrganization(orgId);
  debug('build', '✓ Organization', { name: org.name, size: org.size });

  // Fetch users with their allocations
  debug('build', '👥 Fetching users...');
  const users = await fetchUsersWithAllocations(orgId, currentWeekStart, endWeek, focusUserIds);
  debug('build', '✓ Users fetched', { count: users.length, names: users.map(u => u.name) });

  // Fetch active projects
  debug('build', '📁 Fetching projects...');
  const projects = await fetchProjects(orgId, focusProjectId);
  debug('build', '✓ Projects fetched', { count: projects.length, names: projects.map(p => p.name) });

  debug('build', '✅ Context build complete');

  return {
    org,
    current_date: formatLocalDate(today),
    current_week_start: currentWeekStart,
    users,
    projects,
    conversation_history: conversationHistory
  };
}

/**
 * Fetch organization info
 */
async function fetchOrganization(orgId: string): Promise<WizardOrg> {
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    throw new Error(`Failed to fetch organization: ${orgError?.message}`);
  }

  // Get user count for org size
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('is_active', true);

  return {
    id: org.id,
    name: org.name,
    size: count || 0
  };
}

/**
 * Fetch users with their allocations for the specified weeks
 */
async function fetchUsersWithAllocations(
  orgId: string,
  startWeek: string,
  endWeek: string,
  focusUserIds?: string[]
): Promise<WizardUser[]> {
  // Build user query
  let userQuery = supabase
    .from('users')
    .select('id, name, email, role, job_title, location, is_freelance, specialty_notes')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name');

  if (focusUserIds && focusUserIds.length > 0) {
    userQuery = userQuery.in('id', focusUserIds);
  }

  const { data: users, error: usersError } = await userQuery;

  if (usersError) {
    throw new Error(`Failed to fetch users: ${usersError.message}`);
  }

  if (!users || users.length === 0) {
    return [];
  }

  // Fetch allocations for all users in the date range
  const userIds = users.map(u => u.id);

  const { data: allocations, error: allocError } = await supabase
    .from('allocations')
    .select(`
      id,
      user_id,
      project_id,
      phase_id,
      week_start,
      planned_hours,
      project:projects(id, name),
      phase:project_phases(id, name)
    `)
    .in('user_id', userIds)
    .gte('week_start', startWeek)
    .lte('week_start', endWeek);

  if (allocError) {
    console.error('Failed to fetch allocations:', allocError);
  }

  // Fetch PTO entries
  const { data: ptoEntries, error: ptoError } = await supabase
    .from('pto_entries')
    .select('user_id, date')
    .in('user_id', userIds)
    .gte('date', startWeek)
    .lte('date', endWeek);

  if (ptoError) {
    console.error('Failed to fetch PTO entries:', ptoError);
  }

  // Build user objects with allocations
  return users.map(user => {
    const userAllocations = (allocations || [])
      .filter(a => a.user_id === user.id)
      .map(a => ({
        week_start: a.week_start,
        project_id: a.project_id,
        project_name: (a.project as any)?.name || 'Unknown',
        hours: a.planned_hours,
        phase_id: a.phase_id || undefined,
        phase_name: (a.phase as any)?.name || undefined
      }));

    const userPto = (ptoEntries || [])
      .filter(p => p.user_id === user.id)
      .map(p => p.date);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'employee',
      job_title: user.job_title || undefined,
      location: user.location || undefined,
      is_freelance: user.is_freelance || false,
      specialty_notes: user.specialty_notes || undefined,
      weekly_capacity: 40, // Default, could be fetched from user settings
      allocations: userAllocations,
      pto_dates: userPto
    };
  });
}

/**
 * Fetch active projects with their phases and budget info
 */
async function fetchProjects(
  orgId: string,
  focusProjectId?: string
): Promise<WizardProject[]> {
  let projectQuery = supabase
    .from('projects')
    .select(`
      id,
      name,
      budget_hours,
      status,
      client:clients(name),
      phases:project_phases(id, name, budget_hours, status)
    `)
    .eq('org_id', orgId)
    .in('status', ['planning', 'active', 'on-hold'])
    .order('name');

  if (focusProjectId) {
    projectQuery = projectQuery.eq('id', focusProjectId);
  }

  const { data: projects, error: projectsError } = await projectQuery;

  if (projectsError) {
    throw new Error(`Failed to fetch projects: ${projectsError.message}`);
  }

  if (!projects || projects.length === 0) {
    return [];
  }

  // Fetch hours used for each project
  const projectIds = projects.map(p => p.id);

  const { data: timeEntries, error: entriesError } = await supabase
    .from('time_entries')
    .select('project_id, actual_hours')
    .in('project_id', projectIds);

  if (entriesError) {
    console.error('Failed to fetch time entries:', entriesError);
  }

  // Calculate hours used per project
  const hoursUsedByProject = new Map<string, number>();
  for (const entry of timeEntries || []) {
    const current = hoursUsedByProject.get(entry.project_id) || 0;
    hoursUsedByProject.set(entry.project_id, current + (entry.actual_hours || 0));
  }

  // Build project objects
  return projects.map(project => {
    const phases = ((project.phases as any[]) || []).map((phase: any) => ({
      id: phase.id,
      name: phase.name,
      budget_hours: phase.budget_hours || 0,
      hours_used: 0, // Would need separate query per phase
      status: phase.status || 'pending'
    }));

    return {
      id: project.id,
      name: project.name,
      client_name: (project.client as any)?.name || 'No Client',
      budget_hours: project.budget_hours || 0,
      hours_used: hoursUsedByProject.get(project.id) || 0,
      status: project.status,
      phases
    };
  });
}

/**
 * Search for users by name, nickname, or job title
 * Uses fuzzy matching including the nicknames field
 */
export async function searchUsers(
  orgId: string,
  query: string,
  role?: string
): Promise<Array<{ id: string; name: string; role: string; job_title?: string; matchedOn?: string }>> {
  // Search by name OR nicknames OR job_title
  // Using multiple conditions since ilike doesn't support OR on different columns in one call
  const searchQuery = query.toLowerCase().trim();
  
  let userQuery = supabase
    .from('users')
    .select('id, name, role, job_title, nicknames')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .limit(20);

  if (role) {
    userQuery = userQuery.eq('role', role);
  }

  const { data, error } = await userQuery;

  if (error) {
    console.error('User search error:', error);
    return [];
  }

  // Filter and score results
  const results = (data || []).map(user => {
    const nameLower = user.name.toLowerCase();
    const nicknamesLower = (user.nicknames || '').toLowerCase();
    const jobTitleLower = (user.job_title || '').toLowerCase();
    
    let matchedOn: string | undefined;
    let score = 0;
    
    // Exact name match (highest priority)
    if (nameLower === searchQuery) {
      score = 100;
      matchedOn = 'name';
    }
    // Name starts with query
    else if (nameLower.startsWith(searchQuery) || nameLower.split(' ').some((part: string) => part.startsWith(searchQuery))) {
      score = 80;
      matchedOn = 'name';
    }
    // Name contains query
    else if (nameLower.includes(searchQuery)) {
      score = 60;
      matchedOn = 'name';
    }
    // Nickname match
    else if (nicknamesLower.split(',').some((nick: string) => nick.trim() === searchQuery)) {
      score = 90;
      matchedOn = 'nickname';
    }
    else if (nicknamesLower.includes(searchQuery)) {
      score = 70;
      matchedOn = 'nickname';
    }
    // Job title match (lower priority)
    else if (jobTitleLower.includes(searchQuery)) {
      score = 40;
      matchedOn = 'job_title';
    }
    
    return { ...user, score, matchedOn };
  }).filter(u => u.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return results.map(({ id, name, role, job_title, matchedOn }) => ({
    id,
    name,
    role,
    job_title: job_title || undefined,
    matchedOn
  }));
}

/**
 * Search for projects by name or alias
 * Uses fuzzy matching including the aliases field
 */
export async function searchProjects(
  orgId: string,
  query: string,
  activeOnly: boolean = true
): Promise<Array<{ id: string; name: string; client_name: string; matchedOn?: string }>> {
  const searchQuery = query.toLowerCase().trim();
  
  let projectQuery = supabase
    .from('projects')
    .select('id, name, aliases, client:clients(name)')
    .eq('org_id', orgId)
    .limit(20);

  if (activeOnly) {
    projectQuery = projectQuery.in('status', ['planning', 'active', 'on-hold']);
  }

  const { data, error } = await projectQuery;

  if (error) {
    console.error('Project search error:', error);
    return [];
  }

  // Filter and score results
  const results = (data || []).map(project => {
    const nameLower = project.name.toLowerCase();
    const aliasesLower = (project.aliases || '').toLowerCase();
    const clientName = (project.client as any)?.name || '';
    const clientLower = clientName.toLowerCase();
    
    let matchedOn: string | undefined;
    let score = 0;
    
    // Exact name match (highest priority)
    if (nameLower === searchQuery) {
      score = 100;
      matchedOn = 'name';
    }
    // Name starts with query
    else if (nameLower.startsWith(searchQuery) || nameLower.split(' ').some((part: string) => part.toLowerCase().startsWith(searchQuery))) {
      score = 80;
      matchedOn = 'name';
    }
    // Name contains query
    else if (nameLower.includes(searchQuery)) {
      score = 60;
      matchedOn = 'name';
    }
    // Alias exact match
    else if (aliasesLower.split(',').some((alias: string) => alias.trim() === searchQuery)) {
      score = 95;
      matchedOn = 'alias';
    }
    // Alias contains query
    else if (aliasesLower.includes(searchQuery)) {
      score = 75;
      matchedOn = 'alias';
    }
    // Client name match (lower priority but still useful)
    else if (clientLower.includes(searchQuery)) {
      score = 50;
      matchedOn = 'client';
    }
    
    return { 
      id: project.id, 
      name: project.name, 
      client_name: clientName || 'No Client',
      score, 
      matchedOn 
    };
  }).filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return results.map(({ id, name, client_name, matchedOn }) => ({
    id,
    name,
    client_name,
    matchedOn
  }));
}

/**
 * Get user availability for a date range
 */
export async function getUserAvailability(
  orgId: string,
  startWeek: string,
  endWeek: string,
  userId?: string,
  roleFilter?: string
): Promise<Array<{
  user_id: string;
  user_name: string;
  role: string;
  weeks: Array<{
    week_start: string;
    allocated_hours: number;
    available_hours: number;
    has_pto: boolean;
  }>;
}>> {
  // Build user query
  let userQuery = supabase
    .from('users')
    .select('id, name, role')
    .eq('org_id', orgId)
    .eq('is_active', true);

  if (userId) {
    userQuery = userQuery.eq('id', userId);
  }
  if (roleFilter) {
    userQuery = userQuery.eq('role', roleFilter);
  }

  const { data: users, error: usersError } = await userQuery;

  if (usersError || !users) {
    return [];
  }

  const userIds = users.map(u => u.id);

  // Fetch allocations
  const { data: allocations } = await supabase
    .from('allocations')
    .select('user_id, week_start, planned_hours')
    .in('user_id', userIds)
    .gte('week_start', startWeek)
    .lte('week_start', endWeek);

  // Fetch PTO
  const { data: ptoEntries } = await supabase
    .from('pto_entries')
    .select('user_id, date')
    .in('user_id', userIds)
    .gte('date', startWeek)
    .lte('date', endWeek);

  // Generate week list
  const weeks: string[] = [];
  const current = new Date(startWeek + 'T12:00:00'); // Use noon to avoid timezone issues
  const end = new Date(endWeek + 'T12:00:00');
  while (current <= end) {
    weeks.push(formatLocalDate(current));
    current.setDate(current.getDate() + 7);
  }

  // Build availability per user
  return users.map(user => {
    const userWeeks = weeks.map(weekStart => {
      const weekAllocations = (allocations || [])
        .filter(a => a.user_id === user.id && a.week_start === weekStart);
      const allocatedHours = weekAllocations.reduce((sum, a) => sum + a.planned_hours, 0);

      // Check for PTO in this week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const hasPto = (ptoEntries || []).some(p => {
        const ptoDate = new Date(p.date);
        return p.user_id === user.id && ptoDate >= new Date(weekStart) && ptoDate <= weekEnd;
      });

      return {
        week_start: weekStart,
        allocated_hours: allocatedHours,
        available_hours: 40 - allocatedHours,
        has_pto: hasPto
      };
    });

    return {
      user_id: user.id,
      user_name: user.name,
      role: user.role,
      weeks: userWeeks
    };
  });
}

/**
 * Get project status with budget info
 */
export async function getProjectStatus(
  projectId: string,
  includePhases: boolean = false
): Promise<{
  project: WizardProject;
  current_allocations: Array<{
    user_name: string;
    hours: number;
    week_start: string;
  }>;
}> {
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      budget_hours,
      status,
      client:clients(name),
      phases:project_phases(id, name, budget_hours, status)
    `)
    .eq('id', projectId)
    .single();

  if (error || !project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Get hours used
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('actual_hours')
    .eq('project_id', projectId);

  const hoursUsed = (timeEntries || []).reduce((sum, e) => sum + (e.actual_hours || 0), 0);

  // Get current allocations
  const today = new Date();
  const weekStart = getWeekStart(today);

  const { data: allocations } = await supabase
    .from('allocations')
    .select(`
      planned_hours,
      week_start,
      user:users(name)
    `)
    .eq('project_id', projectId)
    .gte('week_start', weekStart);

  const phases: WizardPhase[] = includePhases
    ? ((project.phases as any[]) || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        budget_hours: p.budget_hours || 0,
        hours_used: 0,
        status: p.status
      }))
    : [];

  return {
    project: {
      id: project.id,
      name: project.name,
      client_name: (project.client as any)?.name || 'No Client',
      budget_hours: project.budget_hours || 0,
      hours_used: hoursUsed,
      status: project.status,
      phases
    },
    current_allocations: (allocations || []).map(a => ({
      user_name: (a.user as any)?.name || 'Unknown',
      hours: a.planned_hours,
      week_start: a.week_start
    }))
  };
}
