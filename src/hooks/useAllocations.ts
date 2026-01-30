import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Allocation type that includes relationships and supports both new (start_date/end_date)
 * and legacy (week_start) fields.
 *
 * Note: This type is manually defined to support the transition to day-level allocations.
 * After running the database migration, regenerate Supabase types to get auto-generated types.
 */
interface AllocationWithRelations {
  id: string;
  user_id: string;
  project_id: string;
  phase_id: string | null;
  start_date: string;
  end_date: string;
  week_start: string;
  planned_hours: number;
  is_billable: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project: { id: string; name: string; color: string | null };
  phase: { id: string; name: string } | null;
}

/**
 * Options for filtering allocations
 * Updated 2026-01-29: Now supports date range queries instead of just weekStart
 */
interface UseAllocationsOptions {
  /** @deprecated Use startDate/endDate instead. Single date to fetch allocations for. */
  weekStart?: string;
  /** Start of date range to fetch allocations that overlap with */
  startDate?: string;
  /** End of date range to fetch allocations that overlap with */
  endDate?: string;
  userId?: string;
  projectId?: string;
}

/**
 * Get Monday of a given date
 */
function getWeekMonday(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Get Friday of a given week
 */
function getWeekFriday(dateStr: string): string {
  const monday = getWeekMonday(dateStr);
  const date = new Date(monday + 'T00:00:00');
  date.setDate(date.getDate() + 4);
  return date.toISOString().split('T')[0];
}

export function useAllocations(options: UseAllocationsOptions) {
  const [allocations, setAllocations] = useState<AllocationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Resolve date range from options (backwards compatible with weekStart)
  const resolvedStartDate = options.startDate || options.weekStart || '';
  const resolvedEndDate = options.endDate || (options.weekStart ? getWeekFriday(options.weekStart) : '');

  const fetchAllocations = useCallback(async () => {
    if (!resolvedStartDate || !resolvedEndDate) {
      setAllocations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query allocations that overlap with the date range
      // An allocation overlaps if: allocation.start_date <= resolvedEndDate AND allocation.end_date >= resolvedStartDate
      let query = supabase
        .from('allocations')
        .select('*, project:projects(id, name, color), phase:project_phases(id, name)')
        .lte('start_date', resolvedEndDate)
        .gte('end_date', resolvedStartDate);

      if (options.userId) query = query.eq('user_id', options.userId);
      if (options.projectId) query = query.eq('project_id', options.projectId);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      // Cast data to our type - this handles the transition period before DB migration
      setAllocations((data || []) as AllocationWithRelations[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch allocations'));
    } finally {
      setLoading(false);
    }
  }, [resolvedStartDate, resolvedEndDate, options.userId, options.projectId]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  /**
   * Create a new allocation
   * Updated to use start_date/end_date columns
   */
  const createAllocation = async (allocation: {
    user_id: string;
    project_id: string;
    phase_id?: string | null;
    start_date: string;
    end_date: string;
    planned_hours: number;
    is_billable?: boolean;
    notes?: string | null;
    created_by?: string | null;
  }) => {
    // Calculate week_start for backwards compatibility
    const weekStart = getWeekMonday(allocation.start_date);

    const { data, error } = await supabase
      .from('allocations')
      .insert({
        ...allocation,
        week_start: weekStart,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchAllocations();
    return data;
  };

  /**
   * Legacy create allocation wrapper for backwards compatibility
   */
  const createAllocationLegacy = async (allocation: {
    user_id: string;
    project_id: string;
    phase_id?: string | null;
    week_start: string;
    planned_hours: number;
    is_billable?: boolean;
    notes?: string | null;
    created_by?: string | null;
  }) => {
    // Convert week_start to start_date (Monday) and end_date (Friday)
    const startDate = allocation.week_start;
    const endDate = getWeekFriday(allocation.week_start);

    return createAllocation({
      user_id: allocation.user_id,
      project_id: allocation.project_id,
      phase_id: allocation.phase_id,
      start_date: startDate,
      end_date: endDate,
      planned_hours: allocation.planned_hours,
      is_billable: allocation.is_billable,
      notes: allocation.notes,
      created_by: allocation.created_by,
    });
  };

  const updateAllocation = async (id: string, updates: Partial<{
    project_id: string;
    phase_id: string | null;
    start_date: string;
    end_date: string;
    planned_hours: number;
    is_billable: boolean;
    notes: string | null;
  }>) => {
    const updateData: any = { ...updates };

    // If start_date is being updated, also update week_start for backwards compatibility
    if (updates.start_date) {
      updateData.week_start = getWeekMonday(updates.start_date);
    }

    const { error } = await supabase
      .from('allocations')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    await fetchAllocations();
  };

  const deleteAllocation = async (id: string) => {
    const { error } = await supabase
      .from('allocations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchAllocations();
  };

  return {
    allocations,
    loading,
    error,
    refetch: fetchAllocations,
    createAllocation,
    createAllocationLegacy,
    updateAllocation,
    deleteAllocation
  };
}
