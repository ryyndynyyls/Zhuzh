/**
 * Resource Calendar Hook
 * Fetches allocations for multiple users across a date range
 * Supports day/week/month view modes
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type ViewMode = 'day' | 'week' | 'month';

export interface CalendarAllocation {
  id: string;
  userId: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  phaseId: string | null;
  phaseName: string | null;
  weekStart: string;
  plannedHours: number;
  isBillable: boolean;
  notes: string | null;
}

export interface CalendarUser {
  id: string;
  name: string;
  role: string;
  email: string;
  discipline: string | null;
  avatar_url?: string | null;
}

export interface WeekCell {
  weekStart: string;
  allocations: CalendarAllocation[];
  totalHours: number;
  isOverAllocated: boolean;
  ptoHours?: number;
  ptoType?: 'pto' | 'holiday' | 'friday_off';
}

export interface UserWeekData {
  user: CalendarUser;
  weeks: Record<string, WeekCell>;
  averageUtilization: number;
}

interface UseResourceCalendarOptions {
  orgId: string;
  startDate: Date;
  weeksToShow?: number;
  viewMode?: ViewMode;
}

/**
 * Get Monday of a given week
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  return new Date(d.setDate(diff));
}

/**
 * Format date as YYYY-MM-DD (local timezone)
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate array of week start dates
 */
function generateWeeks(startDate: Date, count: number): string[] {
  const weeks: string[] = [];
  const current = getWeekStart(startDate);

  for (let i = 0; i < count; i++) {
    weeks.push(formatDate(current));
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

/**
 * Generate array of day dates for week view (Mon-Sun)
 */
function generateDays(startDate: Date): string[] {
  const days: string[] = [];
  const monday = getWeekStart(startDate);

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(formatDate(day));
  }

  return days;
}

/**
 * Get date range based on view mode
 */
function getDateRangeForView(baseDate: Date, viewMode: ViewMode): { columns: string[]; weeksToFetch: string[]; columnsCount: number } {
  if (viewMode === 'day') {
    // Day view: single day column, fetch the week it belongs to
    const monday = getWeekStart(baseDate);
    return {
      columns: [formatDate(baseDate)],
      weeksToFetch: [formatDate(monday)],
      columnsCount: 1,
    };
  }

  if (viewMode === 'week') {
    // Week view: 7 day columns (Mon-Sun), fetch that single week
    const monday = getWeekStart(baseDate);
    const days = generateDays(baseDate);
    return {
      columns: days,
      weeksToFetch: [formatDate(monday)],
      columnsCount: 7,
    };
  }

  // Month view: 5 weeks centered around current week
  const monday = getWeekStart(baseDate);
  const startWeek = new Date(monday);
  startWeek.setDate(startWeek.getDate() - 14); // Start 2 weeks before

  const weeks: string[] = [];
  for (let i = 0; i < 5; i++) {
    const weekStart = new Date(startWeek);
    weekStart.setDate(startWeek.getDate() + (i * 7));
    weeks.push(formatDate(weekStart));
  }

  return {
    columns: weeks,
    weeksToFetch: weeks,
    columnsCount: 5,
  };
}

/**
 * Navigate by view mode
 */
export function navigateByViewMode(currentDate: Date, direction: 'prev' | 'next', viewMode: ViewMode): Date {
  const newDate = new Date(currentDate);
  const delta = direction === 'next' ? 1 : -1;

  switch (viewMode) {
    case 'day':
      newDate.setDate(newDate.getDate() + delta);
      break;
    case 'week':
      newDate.setDate(newDate.getDate() + (delta * 7));
      break;
    case 'month':
      newDate.setMonth(newDate.getMonth() + delta);
      break;
  }

  return newDate;
}

export function useResourceCalendar(options: UseResourceCalendarOptions) {
  const { orgId, startDate, weeksToShow = 6, viewMode = 'week' } = options;

  const [users, setUsers] = useState<CalendarUser[]>([]);
  const [allocations, setAllocations] = useState<CalendarAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Realtime subscription ref
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Generate columns and weeks to fetch based on view mode
  const { columns, weeksToFetch, columnsCount } = useMemo(() => {
    return getDateRangeForView(startDate, viewMode);
  }, [startDate, viewMode]);

  // For backwards compatibility, expose columns as "weeks"
  const weeks = columns;
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch users in the org (employees and PMs)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, role, email, discipline, avatar_url')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .in('role', ['employee', 'pm', 'admin'])
        .order('name');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch allocations for the date range (use weeksToFetch, not columns)
      const startWeek = weeksToFetch[0];
      const endWeek = weeksToFetch[weeksToFetch.length - 1];

      const { data: allocData, error: allocError } = await supabase
        .from('allocations')
        .select(`
          id,
          user_id,
          project_id,
          phase_id,
          week_start,
          planned_hours,
          is_billable,
          notes,
          project:projects(id, name, color),
          phase:project_phases(id, name)
        `)
        .gte('week_start', startWeek)
        .lte('week_start', endWeek)
        .in('user_id', (usersData || []).map(u => u.id));

      if (allocError) throw allocError;
      

      // Transform to flat structure
      const transformedAllocations: CalendarAllocation[] = (allocData || []).map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        projectId: a.project_id,
        projectName: a.project?.name || 'Unknown',
        projectColor: a.project?.color || '#9E9E9E',
        phaseId: a.phase_id,
        phaseName: a.phase?.name || null,
        weekStart: a.week_start,
        plannedHours: a.planned_hours,
        isBillable: a.is_billable,
        notes: a.notes,
      }));
      
      setAllocations(transformedAllocations);
      
    } catch (err) {
      console.error('Resource calendar fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch resource data'));
    } finally {
      setLoading(false);
    }
  }, [orgId, weeksToFetch]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up Supabase Realtime subscription for allocations
  useEffect(() => {
    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to allocation changes
    const channel = supabase
      .channel('allocations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'allocations',
        },
        (payload) => {
          console.log('📡 Allocation change detected:', payload.eventType);
          // Refetch data when any allocation changes
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Allocations realtime status:', status);
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchData]);
  
  // Build the grid data structure
  const gridData = useMemo((): UserWeekData[] => {
    return users.map(user => {
      const userAllocations = allocations.filter(a => a.userId === user.id);
      const weekCells: Record<string, WeekCell> = {};

      // Initialize all columns (days in week view, weeks in month view)
      columns.forEach(columnDate => {
        // Find allocations for this column
        // In week view, columnDate is a specific day - match by week_start of that day
        // In month view, columnDate IS the week_start
        let columnAllocations: CalendarAllocation[];
        let hoursPerColumn: number;

        if (viewMode === 'week') {
          // Week view: distribute weekly allocations across days
          // Get the week_start for this day
          const dayDate = new Date(columnDate + 'T00:00:00');
          const monday = getWeekStart(dayDate);
          const weekStartStr = formatDate(monday);
          const weekAllocations = userAllocations.filter(a => a.weekStart === weekStartStr);

          // Show allocations on Monday only (or we could show daily portion)
          const dayOfWeek = dayDate.getDay();
          const isMonday = dayOfWeek === 1;

          if (isMonday) {
            columnAllocations = weekAllocations;
            hoursPerColumn = weekAllocations.reduce((sum, a) => sum + a.plannedHours, 0);
          } else {
            // Show empty for other days but could show daily breakdown if needed
            columnAllocations = [];
            hoursPerColumn = 0;
          }
        } else if (viewMode === 'day') {
          // Day view: show full week allocation for that day's week
          const dayDate = new Date(columnDate + 'T00:00:00');
          const monday = getWeekStart(dayDate);
          const weekStartStr = formatDate(monday);
          columnAllocations = userAllocations.filter(a => a.weekStart === weekStartStr);
          hoursPerColumn = columnAllocations.reduce((sum, a) => sum + a.plannedHours, 0);
        } else {
          // Month view: column IS the week_start
          columnAllocations = userAllocations.filter(a => a.weekStart === columnDate);
          hoursPerColumn = columnAllocations.reduce((sum, a) => sum + a.plannedHours, 0);
        }

        weekCells[columnDate] = {
          weekStart: columnDate,
          allocations: columnAllocations,
          totalHours: hoursPerColumn,
          isOverAllocated: hoursPerColumn > (viewMode === 'week' ? 40 : 40), // 40h weekly
        };
      });

      // Calculate average utilization based on weeks, not columns
      const uniqueWeeks = [...new Set(weeksToFetch)];
      const totalAllocatedHours = uniqueWeeks.reduce((sum, weekStart) => {
        const weekAllocations = userAllocations.filter(a => a.weekStart === weekStart);
        return sum + weekAllocations.reduce((s, a) => s + a.plannedHours, 0);
      }, 0);
      const maxPossibleHours = uniqueWeeks.length * 40;
      const averageUtilization = maxPossibleHours > 0 ? (totalAllocatedHours / maxPossibleHours) * 100 : 0;

      return {
        user,
        weeks: weekCells,
        averageUtilization,
      };
    });
  }, [users, allocations, columns, viewMode, weeksToFetch]);
  
  // CRUD operations
  const createAllocation = async (data: {
    userId: string;
    projectId: string;
    phaseId?: string;
    weekStart: string;
    plannedHours: number;
    isBillable?: boolean;
    notes?: string;
    createdBy: string;
  }) => {
    const { error } = await supabase
      .from('allocations')
      .insert({
        user_id: data.userId,
        project_id: data.projectId,
        phase_id: data.phaseId || null,
        week_start: data.weekStart,
        planned_hours: data.plannedHours,
        is_billable: data.isBillable ?? true,
        notes: data.notes || null,
        created_by: data.createdBy,
      });
    
    if (error) throw error;
    await fetchData();
  };
  
  const updateAllocation = async (id: string, updates: Partial<{
    projectId: string;
    phaseId: string | null;
    weekStart: string;
    plannedHours: number;
    isBillable: boolean;
    notes: string | null;
  }>) => {
    const updateData: any = {};
    if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
    if (updates.phaseId !== undefined) updateData.phase_id = updates.phaseId;
    if (updates.weekStart !== undefined) updateData.week_start = updates.weekStart;
    if (updates.plannedHours !== undefined) updateData.planned_hours = updates.plannedHours;
    if (updates.isBillable !== undefined) updateData.is_billable = updates.isBillable;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    updateData.updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('allocations')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    await fetchData();
  };
  
  const deleteAllocation = async (id: string) => {
    const { error } = await supabase
      .from('allocations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await fetchData();
  };
  
  const moveAllocation = async (id: string, newUserId: string, newWeekStart: string) => {
    await updateAllocation(id, {
      weekStart: newWeekStart,
    });

    // Note: Moving to a different user requires a delete + create due to the user_id column
    // For now, we only support moving to different weeks for the same user
    // Full drag-and-drop to different users would need additional logic
  };

  /**
   * Repeat Last Week - Copy all allocations from the previous week to the target week
   * @param targetWeekStart - The week to copy allocations TO
   * @param createdBy - User ID of who is creating these allocations
   * @returns Number of allocations created
   */
  const repeatLastWeek = async (targetWeekStart: string, createdBy: string): Promise<number> => {
    // Calculate previous week
    const targetDate = new Date(targetWeekStart + 'T00:00:00');
    const prevDate = new Date(targetDate);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevWeekStart = prevDate.toISOString().split('T')[0];

    console.log(`📋 Repeat Last Week: Copying from ${prevWeekStart} to ${targetWeekStart}`);

    // Get allocations from previous week
    const { data: prevAllocations, error: fetchError } = await supabase
      .from('allocations')
      .select('user_id, project_id, phase_id, planned_hours, is_billable, notes')
      .eq('week_start', prevWeekStart);

    if (fetchError) throw fetchError;
    if (!prevAllocations || prevAllocations.length === 0) {
      console.log('📋 No allocations found in previous week');
      return 0;
    }

    // Check for existing allocations in target week to avoid duplicates
    const { data: existingAllocations } = await supabase
      .from('allocations')
      .select('user_id, project_id, phase_id')
      .eq('week_start', targetWeekStart);

    const existingKeys = new Set(
      (existingAllocations || []).map(a => `${a.user_id}-${a.project_id}-${a.phase_id || 'null'}`)
    );

    // Filter out allocations that already exist in target week
    const newAllocations = prevAllocations
      .filter(a => !existingKeys.has(`${a.user_id}-${a.project_id}-${a.phase_id || 'null'}`))
      .map(a => ({
        user_id: a.user_id,
        project_id: a.project_id,
        phase_id: a.phase_id,
        week_start: targetWeekStart,
        planned_hours: a.planned_hours,
        is_billable: a.is_billable ?? true,
        notes: a.notes,
        created_by: createdBy,
      }));

    if (newAllocations.length === 0) {
      console.log('📋 All allocations already exist in target week');
      return 0;
    }

    // Bulk insert
    const { error: insertError } = await supabase
      .from('allocations')
      .insert(newAllocations);

    if (insertError) throw insertError;

    console.log(`📋 Created ${newAllocations.length} allocations`);
    await fetchData();
    return newAllocations.length;
  };

  return {
    users,
    weeks,
    gridData,
    allocations,
    loading,
    error,
    viewMode,
    columnsCount,
    refetch: fetchData,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    moveAllocation,
    repeatLastWeek,
  };
}
