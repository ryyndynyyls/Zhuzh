/**
 * useThisWeekUtilization Hook
 * Calculates real team utilization from allocations for the current week
 * 
 * Utilization = Total Allocated Hours This Week / (Team Size × 40) × 100
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface UseThisWeekUtilizationOptions {
  orgId: string;
}

/**
 * Get Monday of the current week (matching format used by allocations table)
 */
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayNum = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayNum}`;
}

/**
 * Get end of week (Sunday) for range queries
 */
function getWeekEnd(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  start.setDate(start.getDate() + 6);
  
  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, '0');
  const dayNum = String(start.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayNum}`;
}

export function useThisWeekUtilization(options: UseThisWeekUtilizationOptions) {
  const { orgId } = options;
  
  // Debug: log what orgId we received
  console.log('[Utilization] Hook called with orgId:', orgId || '(empty)');
  
  const [totalAllocatedHours, setTotalAllocatedHours] = useState(0);
  const [teamSize, setTeamSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const weekStart = useMemo(() => getWeekStart(), []);
  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);
  
  const fetchUtilization = useCallback(async () => {
    if (!orgId) {
      console.log('[Utilization] No orgId provided');
      setLoading(false);
      return;
    }
    
    console.log('[Utilization] Fetching for org:', orgId);
    console.log('[Utilization] Week range:', weekStart, 'to', weekEnd);
    setLoading(true);
    setError(null);
    
    try {
      // Get team members (employees and PMs)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('org_id', orgId)
        .in('role', ['employee', 'pm']);
      
      if (usersError) throw usersError;
      
      const teamMemberIds = users?.map(u => u.id) || [];
      console.log('[Utilization] Found', teamMemberIds.length, 'team members');
      setTeamSize(teamMemberIds.length);
      
      if (teamMemberIds.length === 0) {
        setTotalAllocatedHours(0);
        setLoading(false);
        return;
      }
      
      // Get allocations for this week using range query (more resilient)
      const { data: allocations, error: allocError } = await supabase
        .from('allocations')
        .select('planned_hours, week_start')
        .gte('week_start', weekStart)
        .lte('week_start', weekEnd)
        .in('user_id', teamMemberIds);
      
      if (allocError) throw allocError;
      
      console.log('[Utilization] Found', allocations?.length || 0, 'allocations');
      if (allocations && allocations.length > 0) {
        // Log unique week_start values in the results
        const uniqueWeeks = [...new Set(allocations.map(a => a.week_start))];
        console.log('[Utilization] Week starts in results:', uniqueWeeks);
      }

      const total = allocations?.reduce((sum, a) => sum + (a.planned_hours || 0), 0) || 0;
      console.log('[Utilization] Total allocated hours:', total);
      setTotalAllocatedHours(total);
      
    } catch (err) {
      console.error('[Utilization] Failed to fetch:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch utilization'));
    } finally {
      setLoading(false);
    }
  }, [orgId, weekStart, weekEnd]);
  
  useEffect(() => {
    fetchUtilization();
  }, [fetchUtilization]);
  
  // Calculate utilization percentage
  const maxCapacity = teamSize * 40; // 40 hours per person
  const utilizationPercent = maxCapacity > 0 
    ? Math.round((totalAllocatedHours / maxCapacity) * 100) 
    : 0;
  
  return {
    utilizationPercent,
    totalAllocatedHours,
    teamSize,
    maxCapacity,
    weekStart,
    loading,
    error,
    refetch: fetchUtilization,
  };
}
