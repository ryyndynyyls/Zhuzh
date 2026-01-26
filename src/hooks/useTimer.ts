/**
 * useTimer Hook - Live Time Tracking State Management
 *
 * Manages timer state including:
 * - Current running timer
 * - Starting/stopping timers
 * - Manual time entry
 * - Today's summary
 *
 * Timer state persists in the database, not just locally.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Types
export interface TimerProject {
  id: string;
  name: string;
  color: string;
}

export interface TimerPhase {
  id: string;
  name: string;
}

export interface TimerEntry {
  id: string;
  user_id: string;
  project_id: string;
  phase_id: string | null;
  entry_type: 'timer' | 'manual';
  started_at: string | null;
  stopped_at: string | null;
  duration_minutes: number;
  entry_date: string;
  notes: string | null;
  source: 'web' | 'slack';
  project?: TimerProject;
  phase?: TimerPhase;
  elapsedMinutes?: number;
  elapsedFormatted?: string;
}

export interface TimerSettings {
  enabled: boolean;
  dailySummary: boolean;
  widgetPosition: 'bottom' | 'floating';
}

export interface TodaySummary {
  date: string;
  byProject: Array<{
    id: string;
    name: string;
    color: string;
    totalMinutes: number;
    totalFormatted: string;
    entryCount: number;
  }>;
  runningTimer: TimerEntry | null;
  totals: {
    completedMinutes: number;
    completedFormatted: string;
    runningMinutes: number;
    runningFormatted: string;
    grandTotalMinutes: number;
    grandTotalFormatted: string;
  };
}

interface UseTimerOptions {
  userId: string | undefined;
  enabled?: boolean;
}

export function useTimer({ userId, enabled = true }: UseTimerOptions) {
  // State
  const [currentTimer, setCurrentTimer] = useState<TimerEntry | null>(null);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [settings, setSettings] = useState<TimerSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track elapsed time with an interval
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current timer
  const fetchCurrentTimer = useCallback(async () => {
    if (!userId || !enabled) return;

    try {
      const res = await fetch(`${API_BASE}/api/timer/current?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch timer');

      const data = await res.json();
      setCurrentTimer(data.timer);

      // If there's a running timer, calculate initial elapsed time
      if (data.timer?.started_at) {
        const startTime = new Date(data.timer.started_at).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - startTime) / 1000));
      } else {
        setElapsedSeconds(0);
      }
    } catch (err: any) {
      console.error('Failed to fetch current timer:', err);
    }
  }, [userId, enabled]);

  // Fetch today's summary
  const fetchTodaySummary = useCallback(async () => {
    if (!userId || !enabled) return;

    try {
      const res = await fetch(`${API_BASE}/api/timer/summary/today?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch summary');

      const data = await res.json();
      setTodaySummary(data);
    } catch (err: any) {
      console.error('Failed to fetch today summary:', err);
    }
  }, [userId, enabled]);

  // Fetch user's timer settings
  const fetchSettings = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await fetch(`${API_BASE}/api/timer/settings?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch settings');

      const data = await res.json();
      setSettings(data.settings);
    } catch (err: any) {
      console.error('Failed to fetch timer settings:', err);
    }
  }, [userId]);

  // Start a timer
  const startTimer = useCallback(
    async (projectId: string, phaseId?: string, notes?: string) => {
      if (!userId) return { success: false, error: 'Not logged in' };

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/timer/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            projectId,
            phaseId,
            notes,
            source: 'web',
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to start timer');
          return { success: false, error: data.error };
        }

        setCurrentTimer(data.timer);
        setElapsedSeconds(0);
        fetchTodaySummary();

        return { success: true, timer: data.timer };
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [userId, fetchTodaySummary]
  );

  // Stop the current timer
  const stopTimer = useCallback(
    async (notes?: string) => {
      if (!userId) return { success: false, error: 'Not logged in' };

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/timer/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, notes }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to stop timer');
          return { success: false, error: data.error };
        }

        setCurrentTimer(null);
        setElapsedSeconds(0);
        fetchTodaySummary();

        return {
          success: true,
          timer: data.timer,
          duration: data.duration,
          todayTotal: data.todayTotal,
        };
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [userId, fetchTodaySummary]
  );

  // Discard the current timer without saving
  const discardTimer = useCallback(async () => {
    if (!userId) return { success: false, error: 'Not logged in' };

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/timer/discard?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to discard timer');
        return { success: false, error: data.error };
      }

      setCurrentTimer(null);
      setElapsedSeconds(0);

      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Log manual time entry
  const logTime = useCallback(
    async (
      projectId: string,
      durationMinutes: number,
      options?: {
        phaseId?: string;
        entryDate?: string;
        notes?: string;
      }
    ) => {
      if (!userId) return { success: false, error: 'Not logged in' };

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/timer/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            projectId,
            durationMinutes,
            phaseId: options?.phaseId,
            entryDate: options?.entryDate,
            notes: options?.notes,
            source: 'web',
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to log time');
          return { success: false, error: data.error };
        }

        fetchTodaySummary();
        return { success: true, entry: data.entry };
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [userId, fetchTodaySummary]
  );

  // Update timer interval when currentTimer changes
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start new interval if timer is running
    if (currentTimer?.started_at) {
      intervalRef.current = setInterval(() => {
        const startTime = new Date(currentTimer.started_at!).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentTimer?.started_at]);

  // Initial fetch
  useEffect(() => {
    if (userId && enabled) {
      fetchCurrentTimer();
      fetchTodaySummary();
      fetchSettings();
    }
  }, [userId, enabled, fetchCurrentTimer, fetchTodaySummary, fetchSettings]);

  // Format elapsed time
  const formatElapsed = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    // State
    currentTimer,
    todaySummary,
    settings,
    loading,
    error,

    // Computed
    isRunning: !!currentTimer,
    elapsedSeconds,
    elapsedFormatted: formatElapsed(elapsedSeconds),
    elapsedMinutes: Math.floor(elapsedSeconds / 60),

    // Actions
    startTimer,
    stopTimer,
    discardTimer,
    logTime,

    // Refresh
    refresh: fetchCurrentTimer,
    refreshSummary: fetchTodaySummary,
  };
}

// Helper to format duration in minutes to "Xh Ym" format
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
