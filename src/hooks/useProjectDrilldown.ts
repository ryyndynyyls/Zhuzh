/**
 * useProjectDrilldown Hook
 * Fetches week-by-week variance data for a project
 * Powers the "40 extra hours on QA in week 3" drill-down view
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface WeekBreakdown {
  weekStart: string;
  planned: number;
  actual: number;
  variance: number;
  unplanned: number;
  byPhase: Array<{
    id: string;
    name: string;
    planned: number;
    actual: number;
    variance: number;
  }>;
  byUser: Array<{
    id: string;
    name: string;
    planned: number;
    actual: number;
    variance: number;
  }>;
}

export interface VarianceHighlight {
  week: string;
  variance: number;
  topContributors: Array<{
    name: string;
    variance: number;
  }>;
}

export interface ProjectDrilldownData {
  project: {
    id: string;
    name: string;
    budget_hours: number | null;
    hourly_rate: number | null;
    color: string;
  };
  weeks: WeekBreakdown[];
  totals: {
    planned: number;
    actual: number;
    variance: number;
    unplanned: number;
  };
  biggestVariances: VarianceHighlight[];
  dateRange: {
    start: string;
    end: string;
    weeksCount: number;
  };
}

export function useProjectDrilldown(projectId: string | null, weeksBack: number = 8) {
  const [data, setData] = useState<ProjectDrilldownData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDrilldown = useCallback(async () => {
    if (!projectId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/drilldown?weeks=${weeksBack}`);

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Project not found');
        }
        throw new Error('Failed to fetch project drilldown');
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch drilldown'));
    } finally {
      setLoading(false);
    }
  }, [projectId, weeksBack]);

  useEffect(() => {
    fetchDrilldown();
  }, [fetchDrilldown]);

  return { data, loading, error, refetch: fetchDrilldown };
}
