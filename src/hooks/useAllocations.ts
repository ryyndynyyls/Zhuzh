/**
 * useAllocations Hook
 *
 * MIGRATED: Now uses API server instead of direct Supabase.
 * Supports both legacy (week_start) and new (start_date/end_date) allocation models.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/apiClient';

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
 */
interface UseAllocationsOptions {
  /** @deprecated Use startDate/endDate instead */
  weekStart?: string;
  startDate?: string;
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
      const params = new URLSearchParams({
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
      });
      if (options.userId) params.set('userId', options.userId);
      if (options.projectId) params.set('projectId', options.projectId);

      const data = await api.get<{ allocations: AllocationWithRelations[] }>(
        `/api/allocations?${params.toString()}`
      );
      setAllocations(data.allocations || []);
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
    const data = await api.post<{ allocation: any }>('/api/allocations', allocation);
    await fetchAllocations();
    return data.allocation;
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
    await api.put(`/api/allocations/${id}`, updates);
    await fetchAllocations();
  };

  const deleteAllocation = async (id: string) => {
    await api.delete(`/api/allocations/${id}`);
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
