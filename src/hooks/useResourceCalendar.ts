/**
 * Resource Calendar Hook
 * Fetches allocations for multiple users across a date range
 * Supports day/week/month view modes
 *
 * Updated 2026-01-29: Now supports day-level allocations with start_date/end_date
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PtoEntry } from '../types/database';

export type ViewMode = 'day' | 'week' | 'month';

export interface CalendarAllocation {
  id: string;
  userId: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  phaseId: string | null;
  phaseName: string | null;
  startDate: string;  // ISO date string (YYYY-MM-DD)
  endDate: string;    // ISO date string (YYYY-MM-DD)
  weekStart: string;  // Deprecated: kept for backwards compatibility
  plannedHours: number;
  isBillable: boolean;
  notes: string | null;
}

/**
 * Grouped allocation for visual display
 * Consecutive single-day allocations with same user+project+hours are grouped into bars
 * Updated 2026-01-29: Added for single-day allocation model
 */
export interface AllocationGroup {
  id: string;              // ID of first allocation in group (used as key)
  allocationIds: string[]; // All allocation IDs in this group
  userId: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  phaseId: string | null;
  phaseName: string | null;
  startDate: string;       // First day of the group
  endDate: string;         // Last day of the group
  hoursPerDay: number;     // Hours per day (same across group)
  totalHours: number;      // Sum of all days
  dayCount: number;        // Number of days in group
  isBillable: boolean;
  notes: string | null;
  isBar: boolean;          // true if multi-day bar, false if single tile
}

/**
 * User's configured work schedule (from resource_config)
 */
export interface WorkSchedule {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

export interface CalendarUser {
  id: string;
  name: string;
  role: string;
  email: string;
  discipline: string | null;
  avatar_url?: string | null;
  // Resource config fields
  weeklyCapacity: number;  // Total weekly hours (e.g., 26 for part-time)
  workSchedule: WorkSchedule | null;  // Per-day breakdown if non-standard
  hasCustomSchedule: boolean;  // True if not standard 40h/wk
}

export interface PtoData {
  id: string;
  date: string;
  hours: number;
  type: 'pto' | 'holiday' | 'half-day' | 'sick';
  notes: string | null;
}

export interface WeekCell {
  weekStart: string;  // For backwards compatibility (column date)
  date: string;       // The actual date this cell represents
  allocations: CalendarAllocation[];
  totalHours: number;
  isOverAllocated: boolean;
  ptoHours?: number;
  ptoType?: 'pto' | 'holiday' | 'half-day' | 'sick';
  ptoEntries?: PtoData[];
}

export interface UserWeekData {
  user: CalendarUser;
  weeks: Record<string, WeekCell>;
  averageUtilization: number;
  /** User's max capacity for the displayed range (hours) */
  maxCapacityHours: number;
  /** Total hours allocated in the displayed range */
  totalAllocatedHours: number;
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
 * Parse a YYYY-MM-DD string into a Date object (local timezone)
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Calculate number of working days (Mon-Fri) between two dates inclusive
 */
function getWorkingDays(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Check if a date falls within an allocation's date range
 */
function dateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Check if date2 is the next working day after date1
 * Skips weekends (Sat/Sun)
 */
function isNextWorkingDay(date1: string, date2: string): boolean {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);

  // Move to next day
  d1.setDate(d1.getDate() + 1);

  // Skip weekend
  while (d1.getDay() === 0 || d1.getDay() === 6) {
    d1.setDate(d1.getDate() + 1);
  }

  return formatDate(d1) === date2;
}

/**
 * Group consecutive single-day allocations with same user+project+hours
 * This creates visual "bars" for multi-day allocations
 * Updated 2026-01-29: Added for single-day allocation model
 */
function groupAllocations(allocations: CalendarAllocation[]): AllocationGroup[] {
  if (allocations.length === 0) return [];

  // Sort by user, project, date
  const sorted = [...allocations].sort((a, b) => {
    if (a.userId !== b.userId) return a.userId.localeCompare(b.userId);
    if (a.projectId !== b.projectId) return a.projectId.localeCompare(b.projectId);
    return a.startDate.localeCompare(b.startDate);
  });

  const groups: AllocationGroup[] = [];
  let currentGroup: AllocationGroup | null = null;

  for (const alloc of sorted) {
    // Only group single-day allocations (start_date === end_date)
    const isSingleDay = alloc.startDate === alloc.endDate;

    const canExtendGroup = currentGroup &&
      isSingleDay &&
      currentGroup.userId === alloc.userId &&
      currentGroup.projectId === alloc.projectId &&
      currentGroup.hoursPerDay === alloc.plannedHours &&
      isNextWorkingDay(currentGroup.endDate, alloc.startDate);

    if (canExtendGroup && currentGroup) {
      // Extend current group
      currentGroup.allocationIds.push(alloc.id);
      currentGroup.endDate = alloc.endDate;
      currentGroup.totalHours += alloc.plannedHours;
      currentGroup.dayCount++;
    } else {
      // Finalize and push current group
      if (currentGroup) {
        currentGroup.isBar = currentGroup.dayCount > 1;
        groups.push(currentGroup);
      }

      // Start new group
      currentGroup = {
        id: alloc.id,
        allocationIds: [alloc.id],
        userId: alloc.userId,
        projectId: alloc.projectId,
        projectName: alloc.projectName,
        projectColor: alloc.projectColor,
        phaseId: alloc.phaseId,
        phaseName: alloc.phaseName,
        startDate: alloc.startDate,
        endDate: alloc.endDate,
        hoursPerDay: alloc.plannedHours,
        totalHours: alloc.plannedHours,
        dayCount: 1,
        isBillable: alloc.isBillable,
        notes: alloc.notes,
        isBar: false,
      };
    }
  }

  // Don't forget the last group
  if (currentGroup) {
    currentGroup.isBar = currentGroup.dayCount > 1;
    groups.push(currentGroup);
  }

  return groups;
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
function getDateRangeForView(baseDate: Date, viewMode: ViewMode): {
  columns: string[];
  fetchStartDate: string;
  fetchEndDate: string;
  columnsCount: number;
} {
  if (viewMode === 'day') {
    // Day view: single day column, fetch allocations that overlap with that day
    const dateStr = formatDate(baseDate);
    return {
      columns: [dateStr],
      fetchStartDate: dateStr,
      fetchEndDate: dateStr,
      columnsCount: 1,
    };
  }

  if (viewMode === 'week') {
    // Week view: 7 day columns (Mon-Sun), fetch allocations that overlap with the week
    const monday = getWeekStart(baseDate);
    const days = generateDays(baseDate);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    return {
      columns: days,
      fetchStartDate: formatDate(monday),
      fetchEndDate: formatDate(sunday),
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

  // End date is Sunday of the last week
  const lastWeekStart = parseDate(weeks[weeks.length - 1]);
  const lastWeekSunday = new Date(lastWeekStart);
  lastWeekSunday.setDate(lastWeekSunday.getDate() + 6);

  return {
    columns: weeks,
    fetchStartDate: weeks[0],
    fetchEndDate: formatDate(lastWeekSunday),
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
  const [ptoEntries, setPtoEntries] = useState<PtoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Realtime subscription ref
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Generate columns and date range based on view mode
  const { columns, fetchStartDate, fetchEndDate, columnsCount } = useMemo(() => {
    return getDateRangeForView(startDate, viewMode);
  }, [startDate, viewMode]);

  // For backwards compatibility, expose columns as "weeks"
  const weeks = columns;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch users in the org (employees and PMs)
      // Include resource_config for custom working hours
      // Note: resource_config exists but may not be in generated types - using type assertion
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, role, email, discipline, avatar_url, resource_config')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .in('role', ['employee', 'pm', 'admin'])
        .order('name') as { data: Array<{
          id: string;
          name: string;
          role: string;
          email: string;
          discipline: string | null;
          avatar_url: string | null;
          resource_config: {
            work_schedule?: { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number };
            weekly_capacity?: number;
          } | null;
        }> | null; error: any };

      if (usersError) throw usersError;
      
      // Transform users to include resource config fields
      const transformedUsers: CalendarUser[] = (usersData || []).map((u: any) => {
        const config = u.resource_config as {
          work_schedule?: { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number };
          weekly_capacity?: number;
        } | null;
        
        const weeklyCapacity = config?.weekly_capacity ?? 40;
        const workSchedule = config?.work_schedule ?? null;
        const hasCustomSchedule = weeklyCapacity !== 40;
        
        return {
          id: u.id,
          name: u.name,
          role: u.role,
          email: u.email,
          discipline: u.discipline,
          avatar_url: u.avatar_url,
          weeklyCapacity,
          workSchedule,
          hasCustomSchedule,
        };
      });
      
      setUsers(transformedUsers);

      const userIds = transformedUsers.map(u => u.id);

      // Fetch allocations that overlap with the view's date range
      // An allocation overlaps if: allocation.start_date <= fetchEndDate AND allocation.end_date >= fetchStartDate
      const { data: allocData, error: allocError } = await supabase
        .from('allocations')
        .select(`
          id,
          user_id,
          project_id,
          phase_id,
          start_date,
          end_date,
          week_start,
          planned_hours,
          is_billable,
          notes,
          project:projects(id, name, color),
          phase:project_phases(id, name)
        `)
        .lte('start_date', fetchEndDate)
        .gte('end_date', fetchStartDate)
        .in('user_id', userIds);

      if (allocError) throw allocError;


      // Transform to flat structure, filtering out 0-hour allocations
      const transformedAllocations: CalendarAllocation[] = (allocData || [])
        .filter((a: any) => a.planned_hours > 0) // Filter out 0h allocations
        .map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        projectId: a.project_id,
        projectName: a.project?.name || 'Unknown',
        projectColor: a.project?.color || '#9E9E9E',
        phaseId: a.phase_id,
        phaseName: a.phase?.name || null,
        startDate: a.start_date,
        endDate: a.end_date,
        weekStart: a.week_start || a.start_date, // Fallback for backwards compatibility
        plannedHours: a.planned_hours,
        isBillable: a.is_billable,
        notes: a.notes,
      }));

      setAllocations(transformedAllocations);

      // Fetch PTO entries for users in date range
      const { data: ptoData, error: ptoError } = await supabase
        .from('pto_entries')
        .select('id, date, hours, type, notes, user_id')
        .gte('date', fetchStartDate)
        .lte('date', fetchEndDate)
        .in('user_id', userIds);

      if (ptoError) {
        console.warn('Failed to fetch PTO entries:', ptoError);
      }

      // Fetch calendar events (Google Calendar OOO, PTO, etc.) for users in date range
      // These are synced from Google Calendar and classified by event_type
      const { data: calendarEventsData, error: calendarError } = await supabase
        .from('user_calendar_events')
        .select('id, user_id, summary, start_time, end_time, is_all_day, event_type')
        .gte('start_time', fetchStartDate)
        .lte('start_time', fetchEndDate + 'T23:59:59')
        .in('user_id', userIds)
        .in('event_type', ['pto', 'holiday', 'partial_pto', 'friday_off']);

      if (calendarError) {
        console.warn('Failed to fetch calendar events:', calendarError);
      }

      // Transform PTO entries
      const transformedPto: (PtoData & { userId: string })[] = (ptoData || []).map((p: any) => ({
        id: p.id,
        date: p.date,
        hours: p.hours,
        type: p.type,
        notes: p.notes,
        userId: p.user_id,
      }));

      // Transform calendar events into PTO-like entries
      // All-day events = 8h, otherwise calculate from duration
      const calendarPto: (PtoData & { userId: string })[] = (calendarEventsData || []).map((e: any) => {
        const startDate = e.start_time.split('T')[0]; // Extract YYYY-MM-DD
        const hours = e.is_all_day ? 8 : Math.min(8,
          (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / (1000 * 60 * 60)
        );

        // Map event_type to pto_type
        const typeMap: Record<string, 'pto' | 'holiday' | 'half-day' | 'sick'> = {
          'pto': 'pto',
          'holiday': 'holiday',
          'partial_pto': 'half-day',
          'friday_off': 'pto',
        };

        return {
          id: e.id,
          date: startDate,
          hours,
          type: typeMap[e.event_type] || 'pto',
          notes: e.summary || null,
          userId: e.user_id,
        };
      });

      // Merge PTO entries and calendar events, avoiding duplicates (same user+date)
      const existingKeys = new Set(transformedPto.map(p => `${p.userId}-${p.date}`));
      const mergedPto = [
        ...transformedPto,
        ...calendarPto.filter(c => !existingKeys.has(`${c.userId}-${c.date}`))
      ];

      setPtoEntries(mergedPto as any);

    } catch (err) {
      console.error('Resource calendar fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch resource data'));
    } finally {
      setLoading(false);
    }
  }, [orgId, fetchStartDate, fetchEndDate]);

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
      const userPto = (ptoEntries as (PtoData & { userId: string })[]).filter(p => p.userId === user.id);
      const weekCells: Record<string, WeekCell> = {};

      // Initialize all columns
      columns.forEach(columnDate => {
        // Find allocations that overlap with this column date
        let columnAllocations: CalendarAllocation[];
        let hoursPerColumn: number;

        if (viewMode === 'week' || viewMode === 'day') {
          // Week/Day view: columnDate is a specific day
          // Show allocations that include this day
          columnAllocations = userAllocations.filter(a =>
            dateInRange(columnDate, a.startDate, a.endDate)
          );

          // Calculate hours for this specific day
          // Sum FULL planned hours for all allocations overlapping this day
          // This matches producer expectations: if you're allocated 8h to a project
          // that spans Mon-Fri, you're doing 8h of work that week, shown on each day
          hoursPerColumn = columnAllocations.reduce((sum, a) => sum + a.plannedHours, 0);
        } else {
          // Month view: columnDate is a week_start (Monday)
          // Show allocations that overlap with this week (Mon-Sun)
          const weekEnd = new Date(parseDate(columnDate));
          weekEnd.setDate(weekEnd.getDate() + 6);
          const weekEndStr = formatDate(weekEnd);

          columnAllocations = userAllocations.filter(a =>
            a.startDate <= weekEndStr && a.endDate >= columnDate
          );

          // Calculate total hours for this week
          hoursPerColumn = columnAllocations.reduce((sum, a) => {
            // Calculate portion of allocation within this week
            const effectiveStart = a.startDate > columnDate ? a.startDate : columnDate;
            const effectiveEnd = a.endDate < weekEndStr ? a.endDate : weekEndStr;
            const daysInWeek = getWorkingDays(effectiveStart, effectiveEnd);
            const totalWorkingDays = getWorkingDays(a.startDate, a.endDate);
            const hoursThisWeek = totalWorkingDays > 0
              ? (a.plannedHours * daysInWeek / totalWorkingDays)
              : a.plannedHours;
            return sum + hoursThisWeek;
          }, 0);
        }

        // Find PTO for this column date
        const columnPto = userPto.filter(p => {
          if (viewMode === 'week' || viewMode === 'day') {
            return p.date === columnDate;
          } else {
            // Month view: check if PTO falls within this week
            const weekEnd = new Date(parseDate(columnDate));
            weekEnd.setDate(weekEnd.getDate() + 6);
            return p.date >= columnDate && p.date <= formatDate(weekEnd);
          }
        });

        const ptoHours = columnPto.reduce((sum, p) => sum + p.hours, 0);
        const primaryPtoType = columnPto.length > 0 ? columnPto[0].type : undefined;

        // Over-allocation threshold: 8h per day in week view, 40h per week in month view
        const overThreshold = viewMode === 'week' || viewMode === 'day' ? 8 : 40;

        weekCells[columnDate] = {
          weekStart: columnDate,  // For backwards compatibility
          date: columnDate,
          allocations: columnAllocations,
          totalHours: Math.round(hoursPerColumn * 10) / 10, // Round to 1 decimal
          isOverAllocated: hoursPerColumn > overThreshold,
          ptoHours: ptoHours > 0 ? ptoHours : undefined,
          ptoType: primaryPtoType,
          ptoEntries: columnPto.length > 0 ? columnPto : undefined,
        };
      });

      // Calculate average utilization based on total hours vs USER'S ACTUAL capacity
      const totalAllocatedHours = userAllocations.reduce((sum, a) => sum + a.plannedHours, 0);

      // Calculate capacity using user's configured working hours
      // If user has custom schedule (e.g., 9/9/4/4/0), use that; otherwise use 8h/day
      let maxPossibleHours: number;
      
      if (user.workSchedule) {
        // Count actual hours based on user's per-day schedule
        maxPossibleHours = 0;
        const current = parseDate(fetchStartDate);
        const end = parseDate(fetchEndDate);
        const dayMap: Record<number, keyof typeof user.workSchedule> = {
          0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
        };
        
        while (current <= end) {
          const dayKey = dayMap[current.getDay()];
          maxPossibleHours += user.workSchedule[dayKey] || 0;
          current.setDate(current.getDate() + 1);
        }
      } else {
        // Fall back to user's weekly capacity spread across working days
        const workingDaysInRange = getWorkingDays(fetchStartDate, fetchEndDate);
        const hoursPerDay = user.weeklyCapacity / 5; // Assume 5-day week
        maxPossibleHours = workingDaysInRange * hoursPerDay;
      }

      const averageUtilization = maxPossibleHours > 0
        ? (totalAllocatedHours / maxPossibleHours) * 100
        : 0;

      return {
        user,
        weeks: weekCells,
        averageUtilization,
        maxCapacityHours: maxPossibleHours,
        totalAllocatedHours,
      };
    });
  }, [users, allocations, ptoEntries, columns, viewMode, fetchStartDate, fetchEndDate]);

  // CRUD operations - Updated for single-day allocation model
  const createAllocation = async (data: {
    userId: string;
    projectId: string;
    phaseId?: string;
    startDate: string;
    endDate: string;
    plannedHours: number;      // Hours PER DAY (not total)
    isBillable?: boolean;
    notes?: string;
    createdBy: string;
    expandToWeek?: boolean;    // If true, create Mon-Fri single-day records
  }) => {
    // If expandToWeek is set, create 5 single-day records (Mon-Fri)
    if (data.expandToWeek) {
      const monday = formatDate(getWeekStart(parseDate(data.startDate)));
      const records = [];

      for (let i = 0; i < 5; i++) {
        const d = new Date(parseDate(monday));
        d.setDate(d.getDate() + i);
        const dateStr = formatDate(d);

        records.push({
          user_id: data.userId,
          project_id: data.projectId,
          phase_id: data.phaseId || null,
          start_date: dateStr,
          end_date: dateStr, // Single-day: start = end
          week_start: monday,
          planned_hours: data.plannedHours,
          is_billable: data.isBillable ?? true,
          notes: data.notes || null,
          created_by: data.createdBy,
        });
      }

      console.log('📝 Creating week of single-day allocations:', records.length);

      // Use upsert to handle conflicts (add hours if allocation exists)
      const { error } = await supabase
        .from('allocations')
        .upsert(records, {
          onConflict: 'user_id,project_id,start_date',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('❌ Failed to create week allocations:', error);
        throw error;
      }

      console.log('✅ Week allocations created');
      await fetchData();
      return;
    }

    // For single-day allocation, ensure start_date === end_date
    const effectiveEndDate = data.startDate === data.endDate ? data.endDate : data.startDate;

    console.log('📝 Creating single-day allocation:', {
      user_id: data.userId,
      project_id: data.projectId,
      date: data.startDate,
      planned_hours: data.plannedHours,
      created_by: data.createdBy,
    });

    // First, check for existing allocations for same user+project that overlap
    const { data: existing, error: fetchError } = await supabase
      .from('allocations')
      .select('id, start_date, end_date, planned_hours, notes')
      .eq('user_id', data.userId)
      .eq('project_id', data.projectId)
      .lte('start_date', data.endDate)  // existing starts before new ends
      .gte('end_date', data.startDate) as { data: Array<{
        id: string;
        start_date: string;
        end_date: string;
        planned_hours: number;
        notes: string | null;
      }> | null; error: any };

    if (fetchError) {
      console.error('❌ Failed to check existing allocations:', fetchError);
      throw fetchError;
    }

    if (existing && existing.length > 0) {
      // Found overlapping allocation(s) - merge into the first one
      const primary = existing[0];
      console.log('🔄 Found overlapping allocation, merging...', primary);

      // Calculate merged date range (union of all ranges)
      let mergedStart = data.startDate;
      let mergedEnd = data.endDate;
      let totalHours = data.plannedHours;

      existing.forEach(e => {
        if (e.start_date < mergedStart) mergedStart = e.start_date;
        if (e.end_date > mergedEnd) mergedEnd = e.end_date;
        totalHours += e.planned_hours;
      });

      // Update the primary allocation with merged values
      const { error: updateError } = await supabase
        .from('allocations')
        .update({
          start_date: mergedStart,
          end_date: mergedEnd,
          week_start: mergedStart, // For backwards compatibility
          planned_hours: totalHours,
          notes: data.notes || primary.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', primary.id);

      if (updateError) {
        console.error('❌ Failed to merge allocation:', updateError);
        throw updateError;
      }

      // Delete any additional overlapping allocations (merge all into one)
      if (existing.length > 1) {
        const idsToDelete = existing.slice(1).map(e => e.id);
        const { error: deleteError } = await supabase
          .from('allocations')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.warn('⚠️ Failed to clean up duplicate allocations:', deleteError);
        } else {
          console.log(`🧹 Cleaned up ${idsToDelete.length} duplicate allocation(s)`);
        }
      }

      console.log('✅ Allocation merged:', { id: primary.id, totalHours, mergedStart, mergedEnd });
      await fetchData();
      return;
    }

    // No overlapping allocation found - create new one
    // Calculate week_start for backwards compatibility (Monday of start_date's week)
    const startDateObj = parseDate(data.startDate);
    const weekStart = formatDate(getWeekStart(startDateObj));

    const { data: result, error } = await supabase
      .from('allocations')
      .insert({
        user_id: data.userId,
        project_id: data.projectId,
        phase_id: data.phaseId || null,
        start_date: data.startDate,
        end_date: data.endDate,
        week_start: weekStart, // For backwards compatibility
        planned_hours: data.plannedHours,
        is_billable: data.isBillable ?? true,
        notes: data.notes || null,
        created_by: data.createdBy,
      })
      .select();

    if (error) {
      console.error('❌ Allocation insert failed:', error);
      const enhancedError = new Error(error.message || 'Failed to save allocation');
      (enhancedError as any).code = error.code;
      throw enhancedError;
    }

    console.log('✅ Allocation created:', result);
    await fetchData();
  };

  /**
   * Legacy createAllocation wrapper for backwards compatibility
   * Converts weekStart to startDate/endDate (Mon-Fri)
   */
  const createAllocationLegacy = async (data: {
    userId: string;
    projectId: string;
    phaseId?: string;
    weekStart: string;
    plannedHours: number;
    isBillable?: boolean;
    notes?: string;
    createdBy: string;
  }) => {
    // Convert week_start to start_date (Monday) and end_date (Friday)
    const startDate = data.weekStart;
    const endDateObj = parseDate(data.weekStart);
    endDateObj.setDate(endDateObj.getDate() + 4); // Friday
    const endDate = formatDate(endDateObj);

    return createAllocation({
      ...data,
      startDate,
      endDate,
    });
  };

  const updateAllocation = async (id: string, updates: Partial<{
    projectId: string;
    phaseId: string | null;
    startDate: string;
    endDate: string;
    plannedHours: number;
    isBillable: boolean;
    notes: string | null;
  }>) => {
    const updateData: any = {};
    if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
    if (updates.phaseId !== undefined) updateData.phase_id = updates.phaseId;
    if (updates.startDate !== undefined) {
      updateData.start_date = updates.startDate;
      // Update week_start for backwards compatibility
      const startDateObj = parseDate(updates.startDate);
      updateData.week_start = formatDate(getWeekStart(startDateObj));
    }
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
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

  /**
   * Update multiple allocations in a group at once (Edit All functionality)
   * Used when user wants to change all days in a grouped bar
   * Updated 2026-01-29: Added for single-day allocation model
   */
  const updateAllocationGroup = async (
    allocationIds: string[],
    updates: Partial<{
      plannedHours: number;
      notes: string | null;
      isBillable: boolean;
      projectId: string;
      phaseId: string | null;
    }>
  ) => {
    if (allocationIds.length === 0) return;

    const updateData: any = {};
    if (updates.plannedHours !== undefined) updateData.planned_hours = updates.plannedHours;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.isBillable !== undefined) updateData.is_billable = updates.isBillable;
    if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
    if (updates.phaseId !== undefined) updateData.phase_id = updates.phaseId;
    updateData.updated_at = new Date().toISOString();

    console.log(`📝 Updating ${allocationIds.length} allocations in group:`, updateData);

    const { error } = await supabase
      .from('allocations')
      .update(updateData)
      .in('id', allocationIds);

    if (error) {
      console.error('❌ Failed to update allocation group:', error);
      throw error;
    }

    console.log('✅ Allocation group updated');
    await fetchData();
  };

  /**
   * Delete multiple allocations in a group at once
   * Used when user wants to delete all days in a grouped bar
   */
  const deleteAllocationGroup = async (allocationIds: string[]) => {
    if (allocationIds.length === 0) return;

    console.log(`🗑️ Deleting ${allocationIds.length} allocations in group`);

    const { error } = await supabase
      .from('allocations')
      .delete()
      .in('id', allocationIds);

    if (error) {
      console.error('❌ Failed to delete allocation group:', error);
      throw error;
    }

    console.log('✅ Allocation group deleted');
    await fetchData();
  };

  /**
   * Extend an allocation's end date (drag-to-extend functionality)
   */
  const extendAllocation = async (id: string, newEndDate: string) => {
    const { error } = await supabase
      .from('allocations')
      .update({
        end_date: newEndDate,
        updated_at: new Date().toISOString(),
      })
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

  const moveAllocation = async (id: string, newUserId: string, newStartDate: string) => {
    // Get the original allocation to calculate the duration
    const original = allocations.find(a => a.id === id);
    if (!original) {
      throw new Error('Allocation not found');
    }

    // Calculate new end date maintaining the same duration
    const originalStart = parseDate(original.startDate);
    const originalEnd = parseDate(original.endDate);
    const duration = Math.round((originalEnd.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24));

    const newEndDate = new Date(parseDate(newStartDate));
    newEndDate.setDate(newEndDate.getDate() + duration);

    await updateAllocation(id, {
      startDate: newStartDate,
      endDate: formatDate(newEndDate),
    });

    // Note: Moving to a different user requires a delete + create due to the unique constraint
    // For now, we only support moving to different dates for the same user
  };

  /**
   * Repeat Last Week - Copy all allocations from the previous week to the target week
   * Updated to work with day-level allocations
   * @param targetWeekStart - The Monday of the week to copy allocations TO
   * @param createdBy - User ID of who is creating these allocations
   * @returns Number of allocations created
   */
  const repeatLastWeek = async (targetWeekStart: string, createdBy: string): Promise<number> => {
    // Calculate previous week
    const targetDate = parseDate(targetWeekStart);
    const prevDate = new Date(targetDate);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevWeekStart = formatDate(prevDate);
    const prevWeekEnd = new Date(prevDate);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);
    const prevWeekEndStr = formatDate(prevWeekEnd);

    console.log(`📋 Repeat Last Week: Copying allocations that overlap with ${prevWeekStart} to ${prevWeekEndStr}`);

    // Get allocations that overlap with previous week
    // Using type assertion to handle the transition period before DB migration
    const { data: prevAllocations, error: fetchError } = await supabase
      .from('allocations')
      .select('user_id, project_id, phase_id, planned_hours, is_billable, notes, start_date, end_date')
      .lte('start_date', prevWeekEndStr)
      .gte('end_date', prevWeekStart) as { data: Array<{
        user_id: string;
        project_id: string;
        phase_id: string | null;
        planned_hours: number;
        is_billable: boolean;
        notes: string | null;
        start_date: string;
        end_date: string;
      }> | null; error: any };

    if (fetchError) throw fetchError;
    if (!prevAllocations || prevAllocations.length === 0) {
      console.log('📋 No allocations found in previous week');
      return 0;
    }

    // Target week dates
    const targetWeekEnd = new Date(targetDate);
    targetWeekEnd.setDate(targetWeekEnd.getDate() + 4); // Friday
    const targetWeekEndStr = formatDate(targetWeekEnd);

    // Check for existing allocations in target week to avoid duplicates
    const { data: existingAllocations } = await supabase
      .from('allocations')
      .select('user_id, project_id, start_date')
      .lte('start_date', targetWeekEndStr)
      .gte('end_date', targetWeekStart) as { data: Array<{
        user_id: string;
        project_id: string;
        start_date: string;
      }> | null; error: any };

    const existingKeys = new Set(
      (existingAllocations || []).map(a => `${a.user_id}-${a.project_id}`)
    );

    // Filter out allocations that already exist and create new ones for target week
    const newAllocations = prevAllocations
      .filter(a => !existingKeys.has(`${a.user_id}-${a.project_id}`))
      .map(a => ({
        user_id: a.user_id,
        project_id: a.project_id,
        phase_id: a.phase_id,
        start_date: targetWeekStart,
        end_date: targetWeekEndStr,
        week_start: targetWeekStart, // For backwards compatibility
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

  // Compute grouped allocations for visual display (bars vs tiles)
  // Updated 2026-01-29: Added for single-day allocation model
  const allocationGroups = useMemo(() => {
    return groupAllocations(allocations);
  }, [allocations]);

  // Helper to get groups for a specific user
  const getGroupsForUser = useCallback((userId: string): AllocationGroup[] => {
    return allocationGroups.filter(g => g.userId === userId);
  }, [allocationGroups]);

  // Helper to get groups that start on a specific date (for rendering spanning bars)
  const getGroupsStartingOn = useCallback((userId: string, date: string): AllocationGroup[] => {
    return allocationGroups.filter(g => g.userId === userId && g.startDate === date);
  }, [allocationGroups]);

  // Helper to check if a date is part of a multi-day group (but not the start)
  // Used to avoid rendering duplicate tiles for days covered by a spanning bar
  const isDateCoveredByBar = useCallback((userId: string, date: string): boolean => {
    return allocationGroups.some(g =>
      g.userId === userId &&
      g.isBar &&
      date > g.startDate &&
      date <= g.endDate
    );
  }, [allocationGroups]);

  return {
    users,
    weeks,
    gridData,
    allocations,
    allocationGroups,           // NEW: Grouped allocations for visual display
    ptoEntries,
    loading,
    error,
    viewMode,
    columnsCount,
    refetch: fetchData,
    createAllocation,
    createAllocationLegacy,     // For backwards compatibility
    updateAllocation,
    updateAllocationGroup,      // NEW: Update all allocations in a group
    deleteAllocationGroup,      // NEW: Delete all allocations in a group
    extendAllocation,
    deleteAllocation,
    moveAllocation,
    repeatLastWeek,
    // NEW: Grouping helpers
    getGroupsForUser,
    getGroupsStartingOn,
    isDateCoveredByBar,
  };
}
