/**
 * Resource Wizard Action Executor
 *
 * Executes confirmed allocation actions from the Gemini agent
 *
 * Debug: Set ZHUZH_DEBUG=true or NODE_ENV=development to see logs
 */

import { createClient } from '@supabase/supabase-js';
import {
  ActionCall,
  ActionResult,
  ExecuteResponse,
  MoveAllocationParams,
  AddAllocationParams,
  RemoveAllocationParams,
  BulkUpdateAllocationsParams,
  BulkChange
} from './types';

// Debug helper
const DEBUG = process.env.ZHUZH_DEBUG === 'true' || process.env.NODE_ENV === 'development';
function debug(stage: string, message: string, data?: any) {
  if (DEBUG) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    console.log(`[Zhuzh:EXECUTOR:${stage}] ${timestamp} ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : '');
  }
}

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
// Use service role key to bypass RLS for action execution
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

debug('init', '🔌 Supabase config', {
  url: supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : 'MISSING',
  hasKey: !!supabaseKey,
  keyType: supabaseKey?.includes('service_role') ? 'service_role' : 'anon'
});

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Execute a list of actions
 */
export async function executeActions(
  actions: ActionCall[],
  executorUserId: string,
  orgId: string
): Promise<ExecuteResponse> {
  debug('main', '⚡ executeActions called', {
    actionsCount: actions.length,
    executorUserId,
    orgId,
    tools: actions.map(a => a.tool)
  });

  const results: ActionResult[] = [];
  let allSucceeded = true;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    debug('main', `▶️ [${i + 1}/${actions.length}] Executing: ${action.tool}`, action.params);

    try {
      const result = await executeAction(action, executorUserId, orgId);
      results.push(result);

      debug('main', `${result.success ? '✅' : '❌'} [${i + 1}/${actions.length}] ${action.tool}`, {
        success: result.success,
        data: result.data,
        error: result.error
      });

      if (!result.success) {
        allSucceeded = false;
      }
    } catch (error: any) {
      debug('main', `💥 [${i + 1}/${actions.length}] ${action.tool} threw exception`, {
        message: error.message,
        stack: error.stack?.slice(0, 300)
      });

      results.push({
        tool: action.tool,
        success: false,
        error: error.message || 'Unknown error'
      });
      allSucceeded = false;
    }
  }

  // Generate summary message
  const successCount = results.filter(r => r.success).length;
  const message = allSucceeded
    ? `Successfully completed ${results.length} action${results.length === 1 ? '' : 's'}`
    : `Completed ${successCount} of ${results.length} actions`;

  debug('main', '📊 Execution summary', {
    success: allSucceeded,
    successCount,
    totalCount: results.length,
    message
  });

  return {
    success: allSucceeded,
    results,
    message
  };
}

/**
 * Execute a single action
 */
async function executeAction(
  action: ActionCall,
  executorUserId: string,
  orgId: string
): Promise<ActionResult> {
  switch (action.tool) {
    case 'add_allocation':
      return executeAddAllocation(action.params as unknown as AddAllocationParams, executorUserId, orgId);

    case 'remove_allocation':
      return executeRemoveAllocation(action.params as unknown as RemoveAllocationParams, orgId);

    case 'move_allocation':
      return executeMoveAllocation(action.params as unknown as MoveAllocationParams, executorUserId, orgId);

    case 'bulk_update_allocations':
      return executeBulkUpdate(action.params as unknown as BulkUpdateAllocationsParams, executorUserId, orgId);

    // Query operations - execute and return data
    case 'get_user_availability':
      return executeGetUserAvailability(action.params as any, orgId);
    
    case 'get_user_allocations':
      return executeGetUserAllocations(action.params as any, orgId);

    case 'get_project_status':
      return executeGetProjectStatus(action.params as any);

    case 'suggest_coverage':
      return executeSuggestCoverage(action.params as any, orgId);
    
    case 'search_users':
    case 'search_projects':
      return {
        tool: action.tool,
        success: true,
        data: { note: 'Search operation - use context data instead' }
      };

    default:
      return {
        tool: action.tool,
        success: false,
        error: `Unknown tool: ${action.tool}`
      };
  }
}

/**
 * Add a new allocation
 */
async function executeAddAllocation(
  params: AddAllocationParams,
  executorUserId: string,
  orgId: string
): Promise<ActionResult> {
  const { user_id, project_id, hours, week_start, phase_id, is_billable } = params;

  debug('add', '📥 executeAddAllocation', { user_id, project_id, hours, week_start, phase_id });

  // Validate the week_start is a Monday
  // Use noon to avoid timezone issues when parsing date string
  const weekDate = new Date(week_start + 'T12:00:00');
  const dayOfWeek = weekDate.getDay();
  debug('add', '📅 Week validation', { week_start, dayOfWeek, isMonday: dayOfWeek === 1 });

  if (dayOfWeek !== 1) {
    debug('add', '❌ Invalid week_start - not a Monday', { dayOfWeek });
    return {
      tool: 'add_allocation',
      success: false,
      error: `week_start must be a Monday (got day ${dayOfWeek}: ${week_start})`
    };
  }

  // Check if allocation already exists
  debug('add', '🔍 Checking for existing allocation...');
  const { data: existing, error: findError } = await supabase
    .from('allocations')
    .select('id, planned_hours')
    .eq('user_id', user_id)
    .eq('project_id', project_id)
    .eq('week_start', week_start)
    .maybeSingle();

  if (findError) {
    debug('add', '❌ Error finding existing allocation', findError);
  }

  if (existing) {
    debug('add', '📝 Found existing allocation, updating', { existingId: existing.id, currentHours: existing.planned_hours, newTotal: existing.planned_hours + hours });

    // Update existing allocation
    const { error } = await supabase
      .from('allocations')
      .update({
        planned_hours: existing.planned_hours + hours,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      debug('add', '❌ Update failed', { error: error.message, code: error.code, details: error.details });
      return {
        tool: 'add_allocation',
        success: false,
        error: error.message
      };
    }

    debug('add', '✅ Update successful');

    // Log audit
    await logAudit(orgId, 'allocations', existing.id, 'update', executorUserId, {
      old: { planned_hours: existing.planned_hours },
      new: { planned_hours: existing.planned_hours + hours }
    });

    return {
      tool: 'add_allocation',
      success: true,
      data: { allocation_id: existing.id, total_hours: existing.planned_hours + hours }
    };
  } else {
    // Create new allocation
    debug('add', '➕ Creating new allocation');
    const insertData = {
      user_id,
      project_id,
      phase_id: phase_id || null,
      week_start,
      planned_hours: hours,
      is_billable: is_billable ?? true,
      created_by: executorUserId
    };
    debug('add', '📤 Insert data', insertData);

    const { data, error } = await supabase
      .from('allocations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      debug('add', '❌ Insert failed', { error: error.message, code: error.code, details: error.details, hint: error.hint });
      return {
        tool: 'add_allocation',
        success: false,
        error: error.message
      };
    }

    debug('add', '✅ Insert successful', { newId: data.id });

    // Log audit
    await logAudit(orgId, 'allocations', data.id, 'create', executorUserId, {
      new: { user_id, project_id, planned_hours: hours, week_start }
    });

    return {
      tool: 'add_allocation',
      success: true,
      data: { allocation_id: data.id }
    };
  }
}

/**
 * Remove an allocation
 */
async function executeRemoveAllocation(
  params: RemoveAllocationParams,
  orgId: string
): Promise<ActionResult> {
  const { user_id, project_id, week_start } = params;

  debug('remove', '📥 executeRemoveAllocation', { user_id, project_id, week_start });

  // Find the allocation
  debug('remove', '🔍 Finding allocation to remove...');
  const { data: allocation, error: findError } = await supabase
    .from('allocations')
    .select('*')
    .eq('user_id', user_id)
    .eq('project_id', project_id)
    .eq('week_start', week_start)
    .maybeSingle();

  if (findError) {
    debug('remove', '❌ Error finding allocation', { error: findError.message, code: findError.code });
    return {
      tool: 'remove_allocation',
      success: false,
      error: findError.message
    };
  }

  if (!allocation) {
    debug('remove', '❌ Allocation not found');
    return {
      tool: 'remove_allocation',
      success: false,
      error: 'Allocation not found'
    };
  }

  debug('remove', '✓ Found allocation', { id: allocation.id, hours: allocation.planned_hours });

  // Delete the allocation
  debug('remove', '🗑️ Deleting allocation...');
  const { error: deleteError } = await supabase
    .from('allocations')
    .delete()
    .eq('id', allocation.id);

  if (deleteError) {
    debug('remove', '❌ Delete failed', { error: deleteError.message, code: deleteError.code });
    return {
      tool: 'remove_allocation',
      success: false,
      error: deleteError.message
    };
  }

  debug('remove', '✅ Delete successful');

  // Log audit
  await logAudit(orgId, 'allocations', allocation.id, 'delete', allocation.created_by, {
    old: allocation
  });

  return {
    tool: 'remove_allocation',
    success: true,
    data: { removed_hours: allocation.planned_hours }
  };
}

/**
 * Move allocation (from one user to another, or adjust hours)
 */
async function executeMoveAllocation(
  params: MoveAllocationParams,
  executorUserId: string,
  orgId: string
): Promise<ActionResult> {
  const { from_user_id, to_user_id, project_id, hours, week_start, phase_id } = params;

  debug('move', '📥 executeMoveAllocation', { from_user_id, to_user_id, project_id, hours, week_start, phase_id });

  // If from_user_id is provided, reduce their hours
  if (from_user_id) {
    debug('move', '🔍 Finding source allocation...');
    const { data: fromAlloc, error: fromError } = await supabase
      .from('allocations')
      .select('id, planned_hours')
      .eq('user_id', from_user_id)
      .eq('project_id', project_id)
      .eq('week_start', week_start)
      .maybeSingle();

    if (fromError) {
      debug('move', '⚠️ Error finding source allocation', { error: fromError.message });
    }

    if (fromAlloc) {
      const newHours = fromAlloc.planned_hours - hours;
      debug('move', '✓ Found source allocation', { id: fromAlloc.id, currentHours: fromAlloc.planned_hours, newHours });

      if (newHours <= 0) {
        // Remove allocation entirely
        debug('move', '🗑️ Removing source allocation entirely (hours would be <= 0)');
        const { error: deleteError } = await supabase
          .from('allocations')
          .delete()
          .eq('id', fromAlloc.id);

        if (deleteError) {
          debug('move', '❌ Delete failed', { error: deleteError.message });
        } else {
          debug('move', '✅ Source allocation deleted');
        }

        await logAudit(orgId, 'allocations', fromAlloc.id, 'delete', executorUserId, {
          old: { planned_hours: fromAlloc.planned_hours }
        });
      } else {
        // Reduce hours
        debug('move', '📝 Reducing source allocation hours');
        const { error: updateError } = await supabase
          .from('allocations')
          .update({ planned_hours: newHours, updated_at: new Date().toISOString() })
          .eq('id', fromAlloc.id);

        if (updateError) {
          debug('move', '❌ Update failed', { error: updateError.message });
        } else {
          debug('move', '✅ Source allocation updated');
        }

        await logAudit(orgId, 'allocations', fromAlloc.id, 'update', executorUserId, {
          old: { planned_hours: fromAlloc.planned_hours },
          new: { planned_hours: newHours }
        });
      }
    } else {
      debug('move', '⚠️ Source allocation not found - proceeding with add only');
    }
  }

  // Add hours to to_user
  debug('move', '➕ Adding allocation to target user...');
  const addResult = await executeAddAllocation(
    {
      user_id: to_user_id,
      project_id,
      hours,
      week_start,
      phase_id,
      is_billable: true
    },
    executorUserId,
    orgId
  );

  if (!addResult.success) {
    debug('move', '❌ Failed to add allocation to target user', { error: addResult.error });
    return {
      tool: 'move_allocation',
      success: false,
      error: `Failed to add allocation to target user: ${addResult.error}`
    };
  }

  debug('move', '✅ Move completed successfully', { from_user_id, to_user_id, hours_moved: hours });

  return {
    tool: 'move_allocation',
    success: true,
    data: {
      from_user_id,
      to_user_id,
      hours_moved: hours
    }
  };
}

/**
 * Execute bulk allocation changes
 */
async function executeBulkUpdate(
  params: BulkUpdateAllocationsParams,
  executorUserId: string,
  orgId: string
): Promise<ActionResult> {
  const { changes } = params;
  const results: ActionResult[] = [];

  debug('bulk', '📥 executeBulkUpdate', { changesCount: changes.length, executorUserId, orgId });

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    let result: ActionResult;

    debug('bulk', `▶️ [${i + 1}/${changes.length}] Processing ${change.action}`, { user_id: change.user_id, project_id: change.project_id, hours: change.hours });

    switch (change.action) {
      case 'add':
        result = await executeAddAllocation(
          {
            user_id: change.user_id,
            project_id: change.project_id,
            hours: change.hours,
            week_start: change.week_start
          },
          executorUserId,
          orgId
        );
        break;

      case 'remove':
        result = await executeRemoveAllocation(
          {
            user_id: change.user_id,
            project_id: change.project_id,
            week_start: change.week_start
          },
          orgId
        );
        break;

      case 'update':
        // For update, we need to set to specific hours, not add
        result = await updateAllocationHours(change, executorUserId, orgId);
        break;

      default:
        debug('bulk', `❌ Unknown action: ${(change as any).action}`);
        result = {
          tool: 'bulk_update_allocations',
          success: false,
          error: `Unknown action: ${(change as any).action}`
        };
    }

    debug('bulk', `${result.success ? '✅' : '❌'} [${i + 1}/${changes.length}] ${change.action}`, { success: result.success, error: result.error });
    results.push(result);
  }

  const allSucceeded = results.every(r => r.success);
  const successCount = results.filter(r => r.success).length;

  debug('bulk', '📊 Bulk update summary', { allSucceeded, successCount, totalCount: changes.length });

  return {
    tool: 'bulk_update_allocations',
    success: allSucceeded,
    data: {
      changes_attempted: changes.length,
      changes_succeeded: successCount
    },
    error: allSucceeded ? undefined : 'Some changes failed'
  };
}

/**
 * Update allocation to specific hours (not add)
 */
async function updateAllocationHours(
  change: BulkChange,
  executorUserId: string,
  orgId: string
): Promise<ActionResult> {
  const { user_id, project_id, hours, week_start } = change;

  debug('update', '📥 updateAllocationHours', { user_id, project_id, hours, week_start });

  debug('update', '🔍 Finding existing allocation...');
  const { data: existing, error: findError } = await supabase
    .from('allocations')
    .select('id, planned_hours')
    .eq('user_id', user_id)
    .eq('project_id', project_id)
    .eq('week_start', week_start)
    .maybeSingle();

  if (findError) {
    debug('update', '⚠️ Error finding allocation', { error: findError.message });
  }

  if (!existing) {
    // Create new if doesn't exist
    debug('update', '➕ No existing allocation, creating new one');
    return executeAddAllocation(
      { user_id, project_id, hours, week_start },
      executorUserId,
      orgId
    );
  }

  debug('update', '✓ Found existing allocation', { id: existing.id, currentHours: existing.planned_hours, newHours: hours });

  // Update existing
  debug('update', '📝 Updating allocation hours...');
  const { error } = await supabase
    .from('allocations')
    .update({
      planned_hours: hours,
      updated_at: new Date().toISOString()
    })
    .eq('id', existing.id);

  if (error) {
    debug('update', '❌ Update failed', { error: error.message, code: error.code });
    return {
      tool: 'bulk_update_allocations',
      success: false,
      error: error.message
    };
  }

  debug('update', '✅ Update successful');

  await logAudit(orgId, 'allocations', existing.id, 'update', executorUserId, {
    old: { planned_hours: existing.planned_hours },
    new: { planned_hours: hours }
  });

  return {
    tool: 'bulk_update_allocations',
    success: true,
    data: { updated_allocation: existing.id }
  };
}

/**
 * Log an audit entry
 */
async function logAudit(
  orgId: string,
  entityType: string,
  entityId: string,
  action: 'create' | 'update' | 'delete',
  userId: string,
  changes: Record<string, unknown>
): Promise<void> {
  debug('audit', `📋 Logging ${action} for ${entityType}`, { entityId, userId });
  try {
    const { error } = await supabase.from('audit_log').insert({
      org_id: orgId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      user_id: userId,
      changes
    });
    if (error) {
      debug('audit', '⚠️ Audit log insert failed', { error: error.message });
    } else {
      debug('audit', '✓ Audit logged');
    }
  } catch (error: any) {
    debug('audit', '❌ Audit log exception', { error: error.message });
    console.error('Failed to log audit:', error);
  }
}

// ============================================================
// QUERY OPERATIONS
// ============================================================

/**
 * Get user availability for a date range
 * 
 * NOTE: role_filter searches job_title ("Developer", "Designer"), NOT the role enum (pm, admin, employee)
 */
async function executeGetUserAvailability(
  params: { user_id?: string; start_week: string; end_week: string; role_filter?: string },
  orgId: string
): Promise<ActionResult> {
  const { user_id, start_week, end_week, role_filter } = params;

  debug('query', '📊 executeGetUserAvailability', { user_id, start_week, end_week, role_filter });

  // Build user query - include job_title for filtering by profession
  let userQuery = supabase
    .from('users')
    .select('id, name, role, job_title')
    .eq('org_id', orgId)
    .eq('is_active', true);

  if (user_id) {
    userQuery = userQuery.eq('id', user_id);
  }
  
  // Filter by job_title (not role enum) for profession-based queries
  // "Developer", "Designer", etc. are job titles, not system roles (pm/admin/employee)
  if (role_filter) {
    userQuery = userQuery.ilike('job_title', `%${role_filter}%`);
  }

  const { data: users, error: usersError } = await userQuery;

  if (usersError || !users) {
    return { tool: 'get_user_availability', success: false, error: usersError?.message || 'No users found' };
  }

  const userIds = users.map(u => u.id);

  // Fetch allocations
  const { data: allocations } = await supabase
    .from('allocations')
    .select('user_id, week_start, planned_hours')
    .in('user_id', userIds)
    .gte('week_start', start_week)
    .lte('week_start', end_week);

  // Fetch PTO
  const { data: ptoEntries } = await supabase
    .from('pto_entries')
    .select('user_id, date')
    .in('user_id', userIds)
    .gte('date', start_week)
    .lte('date', end_week);

  // Generate week list
  const weeks: string[] = [];
  const current = new Date(start_week + 'T12:00:00');
  const end = new Date(end_week + 'T12:00:00');
  while (current <= end) {
    weeks.push(formatLocalDate(current));
    current.setDate(current.getDate() + 7);
  }

  // Build availability per user
  const availability = users.map(user => {
    const userWeeks = weeks.map(weekStart => {
      const weekAllocations = (allocations || [])
        .filter(a => a.user_id === user.id && a.week_start === weekStart);
      const allocatedHours = weekAllocations.reduce((sum, a) => sum + a.planned_hours, 0);

      const hasPto = (ptoEntries || []).some(p => p.user_id === user.id && p.date >= weekStart);

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

  debug('query', '✅ User availability fetched', { usersCount: availability.length });

  return {
    tool: 'get_user_availability',
    success: true,
    data: { availability }
  };
}

/**
 * Get a user's allocations across all projects
 */
async function executeGetUserAllocations(
  params: { user_id: string; start_week: string; end_week: string },
  orgId: string
): Promise<ActionResult> {
  const { user_id, start_week, end_week } = params;

  debug('query', '📊 executeGetUserAllocations', { user_id, start_week, end_week });

  // Get user info
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('id', user_id)
    .single();

  if (userError || !user) {
    return { tool: 'get_user_allocations', success: false, error: 'User not found' };
  }

  // Fetch all allocations for this user
  const { data: allocations, error: allocError } = await supabase
    .from('allocations')
    .select(`
      id,
      week_start,
      planned_hours,
      is_billable,
      project:projects(id, name, client:clients(name)),
      phase:project_phases(id, name)
    `)
    .eq('user_id', user_id)
    .gte('week_start', start_week)
    .lte('week_start', end_week)
    .order('week_start');

  if (allocError) {
    return { tool: 'get_user_allocations', success: false, error: allocError.message };
  }

  // Group by project
  const byProject: Record<string, {
    project_id: string;
    project_name: string;
    client_name: string;
    total_hours: number;
    weeks: Array<{ week_start: string; hours: number; phase?: string }>;
  }> = {};

  let grandTotal = 0;

  for (const alloc of allocations || []) {
    const project = alloc.project as any;
    const projectId = project?.id || 'unknown';
    const projectName = project?.name || 'Unknown Project';
    const clientName = project?.client?.name || 'No Client';
    const phaseName = (alloc.phase as any)?.name;

    if (!byProject[projectId]) {
      byProject[projectId] = {
        project_id: projectId,
        project_name: projectName,
        client_name: clientName,
        total_hours: 0,
        weeks: []
      };
    }

    byProject[projectId].total_hours += alloc.planned_hours;
    byProject[projectId].weeks.push({
      week_start: alloc.week_start,
      hours: alloc.planned_hours,
      phase: phaseName
    });

    grandTotal += alloc.planned_hours;
  }

  const projects = Object.values(byProject).sort((a, b) => b.total_hours - a.total_hours);

  debug('query', '✅ User allocations fetched', { 
    user: user.name, 
    projectCount: projects.length,
    totalHours: grandTotal 
  });

  return {
    tool: 'get_user_allocations',
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      },
      date_range: { start_week, end_week },
      total_hours: grandTotal,
      projects
    }
  };
}

/**
 * Get project status including budget and allocations
 */
async function executeGetProjectStatus(
  params: { project_id: string; include_phases?: boolean }
): Promise<ActionResult> {
  const { project_id, include_phases } = params;

  debug('query', '📊 executeGetProjectStatus', { project_id, include_phases });

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      budget_hours,
      status,
      client:clients(name),
      phases:project_phases(id, name, budget_hours, status)
    `)
    .eq('id', project_id)
    .single();

  if (projectError || !project) {
    return { tool: 'get_project_status', success: false, error: 'Project not found' };
  }

  // Get hours used from time entries
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('actual_hours')
    .eq('project_id', project_id);

  const hoursUsed = (timeEntries || []).reduce((sum, e) => sum + (e.actual_hours || 0), 0);

  // Get current and future allocations
  const today = new Date();
  const weekStart = getWeekStart(today);

  const { data: allocations } = await supabase
    .from('allocations')
    .select(`
      planned_hours,
      week_start,
      user:users(id, name)
    `)
    .eq('project_id', project_id)
    .gte('week_start', weekStart)
    .order('week_start');

  const budgetPercent = project.budget_hours > 0 
    ? Math.round((hoursUsed / project.budget_hours) * 100) 
    : 0;

  debug('query', '✅ Project status fetched', { 
    project: project.name, 
    budgetPercent,
    allocationsCount: allocations?.length || 0
  });

  return {
    tool: 'get_project_status',
    success: true,
    data: {
      project: {
        id: project.id,
        name: project.name,
        client_name: (project.client as any)?.name || 'No Client',
        status: project.status
      },
      budget: {
        total_hours: project.budget_hours || 0,
        hours_used: hoursUsed,
        hours_remaining: (project.budget_hours || 0) - hoursUsed,
        percent_used: budgetPercent
      },
      upcoming_allocations: (allocations || []).map(a => ({
        user_id: (a.user as any)?.id,
        user_name: (a.user as any)?.name || 'Unknown',
        hours: a.planned_hours,
        week_start: a.week_start
      })),
      phases: include_phases ? ((project.phases as any[]) || []).map(p => ({
        id: p.id,
        name: p.name,
        budget_hours: p.budget_hours || 0,
        status: p.status
      })) : undefined
    }
  };
}

/**
 * Suggest coverage when someone is unavailable
 * 
 * Uses job_title for matching similar professionals, not the role enum
 */
async function executeSuggestCoverage(
  params: { absent_user_id: string; week_start: string; project_id?: string },
  orgId: string
): Promise<ActionResult> {
  const { absent_user_id, week_start, project_id } = params;

  debug('query', '📊 executeSuggestCoverage', { absent_user_id, week_start, project_id });

  // Get the absent user's allocations for that week - include job_title for matching
  let allocQuery = supabase
    .from('allocations')
    .select(`
      id,
      planned_hours,
      project:projects(id, name),
      user:users(name, role, job_title)
    `)
    .eq('user_id', absent_user_id)
    .eq('week_start', week_start);

  if (project_id) {
    allocQuery = allocQuery.eq('project_id', project_id);
  }

  const { data: absentAllocations, error: allocError } = await allocQuery;

  if (allocError || !absentAllocations || absentAllocations.length === 0) {
    return {
      tool: 'suggest_coverage',
      success: true,
      data: {
        message: 'No allocations found for this user in the specified week',
        suggestions: []
      }
    };
  }

  const absentUserJobTitle = (absentAllocations[0].user as any)?.job_title;
  const absentUserName = (absentAllocations[0].user as any)?.name;

  // Find available users - get all active users, then prioritize by job title match
  // Don't filter strictly by role enum (which caused the error)
  const { data: availableUsers } = await supabase
    .from('users')
    .select('id, name, role, job_title')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .neq('id', absent_user_id);

  // Get their allocations for that week
  const userIds = (availableUsers || []).map(u => u.id);
  
  const { data: existingAllocations } = await supabase
    .from('allocations')
    .select('user_id, planned_hours')
    .in('user_id', userIds)
    .eq('week_start', week_start);

  // Calculate availability and match by job title
  const suggestions = (availableUsers || []).map(user => {
    const userAllocs = (existingAllocations || []).filter(a => a.user_id === user.id);
    const allocatedHours = userAllocs.reduce((sum, a) => sum + a.planned_hours, 0);
    const availableHours = 40 - allocatedHours;
    
    // Check if job title matches (for prioritization)
    const jobTitleMatch = absentUserJobTitle && user.job_title && 
      user.job_title.toLowerCase().includes(absentUserJobTitle.toLowerCase());

    return {
      user_id: user.id,
      user_name: user.name,
      job_title: user.job_title,
      role_match: jobTitleMatch,
      available_hours: availableHours,
      current_allocation: allocatedHours
    };
  })
  .filter(s => s.available_hours > 0)
  .sort((a, b) => {
    // Prioritize job title matches, then by availability
    if (a.role_match && !b.role_match) return -1;
    if (!a.role_match && b.role_match) return 1;
    return b.available_hours - a.available_hours;
  });

  debug('query', '✅ Coverage suggestions generated', { 
    absentUser: absentUserName,
    suggestionsCount: suggestions.length 
  });

  return {
    tool: 'suggest_coverage',
    success: true,
    data: {
      absent_user: {
        id: absent_user_id,
        name: absentUserName,
        job_title: absentUserJobTitle
      },
      allocations_to_cover: absentAllocations.map(a => ({
        project_name: (a.project as any)?.name,
        hours: a.planned_hours
      })),
      total_hours_to_cover: absentAllocations.reduce((sum, a) => sum + a.planned_hours, 0),
      suggestions
    }
  };
}

// Helper function for date formatting
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatLocalDate(d);
}

/**
 * Preview the before/after state for a set of actions
 */
export async function previewActions(
  actions: ActionCall[],
  _orgId: string
): Promise<{
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}> {
  debug('preview', '👁️ previewActions called', { actionsCount: actions.length });

  // Get unique user IDs and project IDs from actions
  const userIds = new Set<string>();
  const projectIds = new Set<string>();

  for (const action of actions) {
    const params = action.params;
    if (params.user_id) userIds.add(params.user_id as string);
    if (params.from_user_id) userIds.add(params.from_user_id as string);
    if (params.to_user_id) userIds.add(params.to_user_id as string);
    if (params.project_id) projectIds.add(params.project_id as string);
  }

  debug('preview', '🔍 Fetching current allocations', { userIds: Array.from(userIds), projectIds: Array.from(projectIds) });

  // Fetch current allocations for affected users
  const { data: currentAllocations, error: fetchError } = await supabase
    .from('allocations')
    .select(`
      id,
      user_id,
      project_id,
      planned_hours,
      week_start,
      user:users(name),
      project:projects(name)
    `)
    .in('user_id', Array.from(userIds))
    .in('project_id', Array.from(projectIds));

  if (fetchError) {
    debug('preview', '⚠️ Error fetching allocations', { error: fetchError.message });
  }

  debug('preview', '✓ Fetched allocations', { count: currentAllocations?.length || 0 });

  // Build before state
  const before: Record<string, Array<{ project: string; hours: number }>> = {};
  for (const alloc of currentAllocations || []) {
    const userName = (alloc.user as any)?.name || alloc.user_id;
    if (!before[userName]) before[userName] = [];
    before[userName].push({
      project: (alloc.project as any)?.name || alloc.project_id,
      hours: alloc.planned_hours
    });
  }

  // Simulate after state
  const after = JSON.parse(JSON.stringify(before));

  for (const action of actions) {
    // Simplified simulation - in production would be more thorough
    if (action.tool === 'add_allocation') {
      // Would need user name lookup
      // This is a simplified version
    }
  }

  debug('preview', '✓ Preview generated', { beforeKeys: Object.keys(before), afterKeys: Object.keys(after) });

  return { before, after };
}
