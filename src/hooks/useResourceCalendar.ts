/**
 * Resource Calendar Hook
 * Fetches allocations for multiple users across a date range
 * Supports day/week/month view modes
 *
 * MIGRATED: Read operations now go through API server (/api/resources/calendar-data).
 * Write operations go through /api/allocations.
 * Realtime subscription kept as direct Supabase WebSocket (per migration plan).
 *
 * Updated 2026-01-29: Now supports day-level allocations with start_date/end_date
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/apiClient';
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
  weeklyCapacity: number;
  workSchedule: WorkSchedule | null;
  hasCustomSchedule: boolean;
}

export interface PtoData {
  id: string;
  date: string;
  hours: number;
  type: 'pto' | 'holiday' | 'half-day' | 'sick';
  notes: string | null;
}

export interface WeekCell {
  weekStart: string;
  date: string;
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
  maxCapacityHours: number;
  totalAllocatedHours: number;
}

interface UseResourceCalendarOptions {
  orgId: string;
  startDate: Date;
  weeksToShow?: number;
  viewMode?: ViewMode;
}

// ============================================================
// PURE UTILITY FUNCTIONS (unchanged from original)
// ============================================================

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

function getWorkingDays(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

function dateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

function isNextWorkingDay(date1: string, date2: string): boolean {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);

  d1.setDate(d1.getDate() + 1);
  while (d1.getDay() === 0 || d1.getDay() === 6) {
    d1.setDate(d1.getDate() + 1);
  }

  return formatDate(d1) === date2;
}

function groupAllocations(allocations: CalendarAllocation[]): AllocationGroup[] {
  if (allocations.length === 0) return [];

  const sorted = [...allocations].sort((a, b) => {
    if (a.userId !== b.userId) return a.userId.localeCompare(b.userId);
    if (a.projectId !== b.projectId) return a.projectId.localeCompare(b.projectId);
    return a.startDate.localeCompare(b.startDate);
  });

  const groups: AllocationGroup[] = [];
  let currentGroup: AllocationGroup | null = null;

  for (const alloc of sorted) {
    const isSingleDay = alloc.startDate === alloc.endDate;

    const canExtendGroup = currentGroup &&
      isSingleDay &&
      currentGroup.userId === alloc.userId &&
      currentGroup.projectId === alloc.projectId &&
      currentGroup.hoursPerDay === alloc.plannedHours &&
      isNextWorkingDay(currentGroup.endDate, alloc.startDate);

    if (canExtendGroup && currentGroup) {
      currentGroup.allocationIds.push(alloc.id);
      currentGroup.endDate = alloc.endDate;
      currentGroup.totalHours += alloc.plannedHours;
      currentGroup.dayCount++;
    } else {
      if (currentGroup) {
        currentGroup.isBar = currentGroup.dayCount > 1;
        groups.push(currentGroup);
      }

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

  if (currentGroup) {
    currentGroup.isBar = currentGroup.dayCount > 1;
    groups.push(currentGroup);
  }

  return groups;
}

function generateWeeks(startDate: Date, count: number): string[] {
  const weeks: string[] = [];
  const current = getWeekStart(startDate);

  for (let i = 0; i < count; i++) {
    weeks.push(formatDate(current));
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

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

function getDateRangeForView(baseDate: Date, viewMode: ViewMode): {
  columns: string[];
  fetchStartDate: string;
  fetchEndDate: string;
  columnsCount: number;
} {
  if (viewMode === 'day') {
    const dateStr = formatDate(baseDate);
    return {
      columns: [dateStr],
      fetchStartDate: dateStr,
      fetchEndDate: dateStr,
      columnsCount: 1,
    };
  }

  if (viewMode === 'week') {
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
  startWeek.setDate(startWeek.getDate() - 14);

  const weeks: string[] = [];
  for (let i = 0; i < 5; i++) {
    const weekStart = new Date(startWeek);
    weekStart.setDate(startWeek.getDate() + (i * 7));
    weeks.push(formatDate(weekStart));
  }

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

// ============================================================
// MAIN HOOK
// ============================================================

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

  // ============================================================
  // FETCH DATA — via API server
  // ============================================================
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        orgId,
        startDate: fetchStartDate,
        endDate: fetchEndDate,
      });

      const data = await api.get<{
        users: Array<{
          id: string;
          name: string;
          role: string;
          email: string;
          discipline: string | null;
          avatar_url: string | null;
          resource_config: {
            work_schedule?: WorkSchedule;
            weekly_capacity?: number;
          } | null;
        }>;
        allocations: Array<any>;
        ptoEntries: Array<any>;
      }>(`/api/resources/calendar-data?${params.toString()}`);

      // Transform users to include resource config fields
      const transformedUsers: CalendarUser[] = (data.users || []).map((u) => {
        const config = u.resource_config;
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

      // Transform allocations to flat structure, filtering out 0-hour allocations
      const transformedAllocations: CalendarAllocation[] = (data.allocations || [])
        .filter((a: any) => a.planned_hours > 0)
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
          weekStart: a.week_start || a.start_date,
          plannedHours: a.planned_hours,
          isBillable: a.is_billable,
          notes: a.notes,
        }));

      setAllocations(transformedAllocations);
      setPtoEntries(data.ptoEntries || []);

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

  // ============================================================
  // REALTIME — kept as direct Supabase WebSocket
  // ============================================================
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('allocations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'allocations',
        },
        (payload) => {
          console.log('📡 Allocation change detected:', payload.eventType);
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Allocations realtime status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchData]);

  // ============================================================
  // BUILD GRID DATA (unchanged from original — pure computation)
  // ============================================================
  const gridData = useMemo((): UserWeekData[] => {
    return users.map(user => {
      const userAllocations = allocations.filter(a => a.userId === user.id);
      const userPto = (ptoEntries as (PtoData & { userId: string })[]).filter(p => p.userId === user.id);
      const weekCells: Record<string, WeekCell> = {};

      columns.forEach(columnDate => {
        let columnAllocations: CalendarAllocation[];
        let hoursPerColumn: number;

        if (viewMode === 'week' || viewMode === 'day') {
          columnAllocations = userAllocations.filter(a =>
            dateInRange(columnDate, a.startDate, a.endDate)
          );
          hoursPerColumn = columnAllocations.reduce((sum, a) => sum + a.plannedHours, 0);
        } else {
          const weekEnd = new Date(parseDate(columnDate));
          weekEnd.setDate(weekEnd.getDate() + 6);
          const weekEndStr = formatDate(weekEnd);

          columnAllocations = userAllocations.filter(a =>
            a.startDate <= weekEndStr && a.endDate >= columnDate
          );

          hoursPerColumn = columnAllocations.reduce((sum, a) => {
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

        const columnPto = userPto.filter(p => {
          if (viewMode === 'week' || viewMode === 'day') {
            return p.date === columnDate;
          } else {
            const weekEnd = new Date(parseDate(columnDate));
            weekEnd.setDate(weekEnd.getDate() + 6);
            return p.date >= columnDate && p.date <= formatDate(weekEnd);
          }
        });

        const ptoHours = columnPto.reduce((sum, p) => sum + p.hours, 0);
        const primaryPtoType = columnPto.length > 0 ? columnPto[0].type : undefined;
        const overThreshold = viewMode === 'week' || viewMode === 'day' ? 8 : 40;

        weekCells[columnDate] = {
          weekStart: columnDate,
          date: columnDate,
          allocations: columnAllocations,
          totalHours: Math.round(hoursPerColumn * 10) / 10,
          isOverAllocated: hoursPerColumn > overThreshold,
          ptoHours: ptoHours > 0 ? ptoHours : undefined,
          ptoType: primaryPtoType,
          ptoEntries: columnPto.length > 0 ? columnPto : undefined,
        };
      });

      const totalAllocatedHours = userAllocations.reduce((sum, a) => sum + a.plannedHours, 0);

      let maxPossibleHours: number;

      if (user.workSchedule) {
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
        const workingDaysInRange = getWorkingDays(fetchStartDate, fetchEndDate);
        const hoursPerDay = user.weeklyCapacity / 5;
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

  // ============================================================
  // CRUD OPERATIONS — via API server
  // ============================================================

  const createAllocation = async (data: {
    userId: string;
    projectId: string;
    phaseId?: string;
    startDate: string;
    endDate: string;
    plannedHours: number;
    isBillable?: boolean;
    notes?: string;
    createdBy: string;
    expandToWeek?: boolean;
  }) => {
    await api.post('/api/allocations', {
      user_id: data.userId,
      project_id: data.projectId,
      phase_id: data.phaseId || null,
      start_date: data.startDate,
      end_date: data.endDate,
      planned_hours: data.plannedHours,
      is_billable: data.isBillable ?? true,
      notes: data.notes || null,
      created_by: data.createdBy,
      expandToWeek: data.expandToWeek,
    });

    await fetchData();
  };

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
    const startDate = data.weekStart;
    const endDateObj = parseDate(data.weekStart);
    endDateObj.setDate(endDateObj.getDate() + 4);
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
    // Map camelCase to snake_case for API
    const apiUpdates: any = {};
    if (updates.projectId !== undefined) apiUpdates.project_id = updates.projectId;
    if (updates.phaseId !== undefined) apiUpdates.phase_id = updates.phaseId;
    if (updates.startDate !== undefined) apiUpdates.start_date = updates.startDate;
    if (updates.endDate !== undefined) apiUpdates.end_date = updates.endDate;
    if (updates.plannedHours !== undefined) apiUpdates.planned_hours = updates.plannedHours;
    if (updates.isBillable !== undefined) apiUpdates.is_billable = updates.isBillable;
    if (updates.notes !== undefined) apiUpdates.notes = updates.notes;

    await api.put(`/api/allocations/${id}`, apiUpdates);
    await fetchData();
  };

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

    const apiUpdates: any = {};
    if (updates.plannedHours !== undefined) apiUpdates.planned_hours = updates.plannedHours;
    if (updates.notes !== undefined) apiUpdates.notes = updates.notes;
    if (updates.isBillable !== undefined) apiUpdates.is_billable = updates.isBillable;
    if (updates.projectId !== undefined) apiUpdates.project_id = updates.projectId;
    if (updates.phaseId !== undefined) apiUpdates.phase_id = updates.phaseId;

    await api.put('/api/allocations/group', {
      allocationIds,
      updates: apiUpdates,
    });

    await fetchData();
  };

  const deleteAllocationGroup = async (allocationIds: string[]) => {
    if (allocationIds.length === 0) return;

    await api.delete('/api/allocations/group', { allocationIds });
    await fetchData();
  };

  const extendAllocation = async (id: string, newEndDate: string) => {
    // Find the original allocation to copy its properties
    const original = allocations.find(a => a.id === id);
    if (!original) {
      throw new Error('Allocation not found');
    }

    // Create individual day records for each new day from day after original end to newEndDate
    const startDay = new Date(original.endDate + 'T00:00:00');
    startDay.setDate(startDay.getDate() + 1);
    const endDay = new Date(newEndDate + 'T00:00:00');

    const current = new Date(startDay);
    while (current <= endDay) {
      const dayOfWeek = current.getDay();
      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = current.toISOString().split('T')[0];
        await api.post('/api/allocations', {
          user_id: original.userId,
          project_id: original.projectId,
          phase_id: original.phaseId || null,
          start_date: dateStr,
          end_date: dateStr,
          planned_hours: original.plannedHours,
          is_billable: original.isBillable,
          notes: original.notes || null,
        });
      }
      current.setDate(current.getDate() + 1);
    }

    await fetchData();
  };

  const deleteAllocation = async (id: string) => {
    await api.delete(`/api/allocations/${id}`);
    await fetchData();
  };

  const clearDayAllocations = async (userId: string, date: string) => {
    await api.delete('/api/allocations/clear-day', { userId, date });
    await fetchData();
  };

  const moveAllocation = async (id: string, newUserId: string, newStartDate: string) => {
    const original = allocations.find(a => a.id === id);
    if (!original) {
      throw new Error('Allocation not found');
    }

    const originalStart = parseDate(original.startDate);
    const originalEnd = parseDate(original.endDate);
    const duration = Math.round((originalEnd.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24));

    const newEndDate = new Date(parseDate(newStartDate));
    newEndDate.setDate(newEndDate.getDate() + duration);

    await updateAllocation(id, {
      startDate: newStartDate,
      endDate: formatDate(newEndDate),
    });
  };

  const repeatLastWeek = async (targetWeekStart: string, createdBy: string): Promise<number> => {
    const result = await api.post<{ count: number }>('/api/allocations/bulk', {
      targetWeekStart,
      createdBy,
    });

    await fetchData();
    return result.count;
  };

  // ============================================================
  // GROUPING HELPERS (unchanged — pure computation)
  // ============================================================
  const allocationGroups = useMemo(() => {
    return groupAllocations(allocations);
  }, [allocations]);

  const getGroupsForUser = useCallback((userId: string): AllocationGroup[] => {
    return allocationGroups.filter(g => g.userId === userId);
  }, [allocationGroups]);

  const getGroupsStartingOn = useCallback((userId: string, date: string): AllocationGroup[] => {
    return allocationGroups.filter(g => g.userId === userId && g.startDate === date);
  }, [allocationGroups]);

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
    allocationGroups,
    ptoEntries,
    loading,
    error,
    viewMode,
    columnsCount,
    refetch: fetchData,
    createAllocation,
    createAllocationLegacy,
    updateAllocation,
    updateAllocationGroup,
    deleteAllocationGroup,
    extendAllocation,
    deleteAllocation,
    clearDayAllocations,
    moveAllocation,
    repeatLastWeek,
    getGroupsForUser,
    getGroupsStartingOn,
    isDateCoveredByBar,
  };
}
