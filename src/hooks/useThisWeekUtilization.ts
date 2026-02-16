/**
 * useThisWeekUtilization Hook
 * Calculates real team utilization from allocations for the current week
 *
 * MIGRATED: Now fetches from API server instead of direct Supabase.
 * Utilization = Total Allocated Hours This Week / (Team Size x 40) x 100
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/apiClient';

interface UseThisWeekUtilizationOptions {
  orgId: string;
}

interface WeekUtilizationResponse {
  utilizationPercent: number;
  totalAllocatedHours: number;
  teamSize: number;
  maxCapacity: number;
  weekStart: string;
}

export function useThisWeekUtilization(options: UseThisWeekUtilizationOptions) {
  const { orgId } = options;

  const [data, setData] = useState<WeekUtilizationResponse>({
    utilizationPercent: 0,
    totalAllocatedHours: 0,
    teamSize: 0,
    maxCapacity: 0,
    weekStart: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUtilization = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.get<WeekUtilizationResponse>(
        `/api/utilization/week?orgId=${encodeURIComponent(orgId)}`
      );
      setData(result);
    } catch (err) {
      console.error('[Utilization] Failed to fetch:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch utilization'));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchUtilization();
  }, [fetchUtilization]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchUtilization,
  };
}
