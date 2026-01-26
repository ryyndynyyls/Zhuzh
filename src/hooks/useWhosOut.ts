/**
 * useWhosOut Hook
 *
 * Fetches who's out data for the dashboard
 * - Fetches current week by default
 * - Supports week navigation (prev/next)
 * - Groups by day
 * - Shows PTO type (vacation, friday off, holiday)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export type PtoType = 'pto' | 'holiday' | 'partial_pto' | 'friday_off';

export interface WhosOutEntry {
  userId: string;
  userName: string;
  type: PtoType;
  summary: string;
}

export interface WhosOutDay {
  date: string;
  users: WhosOutEntry[];
}

export interface UseWhosOutOptions {
  orgId: string;
  initialWeekOffset?: number;
}

export interface UseWhosOutReturn {
  // Data
  days: WhosOutDay[];
  todayUsers: WhosOutEntry[];
  upcomingDays: WhosOutDay[];

  // State
  loading: boolean;
  error: string | null;
  weekOffset: number;
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;

  // Actions
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  refresh: () => void;
  triggerSync: () => Promise<void>;
}

// Get Monday of the week containing the given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Format date as YYYY-MM-DD (local timezone)
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useWhosOut({ orgId, initialWeekOffset = 0 }: UseWhosOutOptions): UseWhosOutReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<WhosOutDay[]>([]);
  const [weekOffset, setWeekOffset] = useState(initialWeekOffset);

  // Calculate week boundaries
  const today = useMemo(() => new Date(), []);
  const todayStr = formatDate(today);

  const weekStart = useMemo(() => {
    const base = getWeekStart(today);
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [today, weekOffset]);

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  // Generate week label
  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === 1) return 'Next Week';
    if (weekOffset === -1) return 'Last Week';
    return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [weekOffset, weekStart]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startStr = formatDate(weekStart);
      const response = await fetch(
        `${API_BASE}/api/calendar/whos-out/week?orgId=${orgId}&weekStart=${startStr}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch who\'s out data');
      }

      const data = await response.json();
      setDays(data.days || []);
    } catch (err) {
      console.error('useWhosOut fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [orgId, weekStart]);

  // Initial fetch and refetch on dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Computed values
  const todayUsers = useMemo(() => {
    const todayData = days.find(d => d.date === todayStr);
    return todayData?.users || [];
  }, [days, todayStr]);

  // All days in the week (not just upcoming)
  const upcomingDays = useMemo(() => {
    return days
      .filter(d => d.users.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [days]);

  // Navigation actions
  const goToPrevWeek = useCallback(() => {
    setWeekOffset(w => w - 1);
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekOffset(w => w + 1);
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setWeekOffset(0);
  }, []);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Trigger a calendar sync
  const triggerSync = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/calendar/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          startDate: formatDate(weekStart),
          endDate: formatDate(new Date(weekEnd.getTime() + 14 * 24 * 60 * 60 * 1000)), // 2 more weeks
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync calendars');
      }

      // Refetch data after sync
      await fetchData();
    } catch (err) {
      console.error('Calendar sync error:', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setLoading(false);
    }
  }, [orgId, weekStart, weekEnd, fetchData]);

  return {
    // Data
    days,
    todayUsers,
    upcomingDays,

    // State
    loading,
    error,
    weekOffset,
    weekStart,
    weekEnd,
    weekLabel,

    // Actions
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
    refresh,
    triggerSync,
  };
}

export default useWhosOut;
