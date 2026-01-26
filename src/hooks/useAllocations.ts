import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AllocationRow, ProjectRow, ProjectPhaseRow } from '../types/database';

interface AllocationWithRelations extends AllocationRow {
  project?: ProjectRow;
  phase?: ProjectPhaseRow;
}

interface UseAllocationsOptions {
  weekStart: string;
  userId?: string;
  projectId?: string;
}

export function useAllocations(options: UseAllocationsOptions) {
  const [allocations, setAllocations] = useState<AllocationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllocations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('allocations')
        .select('*, project:projects(id, name, color), phase:project_phases(id, name)')
        .eq('week_start', options.weekStart);

      if (options.userId) query = query.eq('user_id', options.userId);
      if (options.projectId) query = query.eq('project_id', options.projectId);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setAllocations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch allocations'));
    } finally {
      setLoading(false);
    }
  }, [options.weekStart, options.userId, options.projectId]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const createAllocation = async (allocation: Partial<AllocationRow>) => {
    const { data, error } = await supabase
      .from('allocations')
      .insert(allocation)
      .select()
      .single();

    if (error) throw error;
    await fetchAllocations();
    return data;
  };

  const updateAllocation = async (id: string, updates: Partial<AllocationRow>) => {
    const { error } = await supabase
      .from('allocations')
      .update(updates)
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
    updateAllocation,
    deleteAllocation
  };
}
