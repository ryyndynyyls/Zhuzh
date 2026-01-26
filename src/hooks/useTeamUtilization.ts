import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UserUtilization {
  user_id: string;
  user_name: string;
  week_start: string;
  total_planned_hours: number;
  total_actual_hours: number;
  utilization_percentage: number;
  has_pto: boolean;
  pto_hours: number;
}

export function useTeamUtilization(weekStart: string) {
  const [utilization, setUtilization] = useState<UserUtilization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUtilization = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_weekly_utilization')
        .select('*')
        .eq('week_start', weekStart);

      if (fetchError) throw fetchError;
      setUtilization(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team utilization'));
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchUtilization();
  }, [fetchUtilization]);

  // Summary stats
  const avgUtilization = utilization.length > 0
    ? utilization.reduce((sum, u) => sum + u.utilization_percentage, 0) / utilization.length
    : 0;

  return { utilization, avgUtilization, loading, error, refetch: fetchUtilization };
}
