/**
 * useProjectPhases Hook
 * Fetches phase breakdown with budget data for a specific project
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  budget_hours: number | null;
  sort_order: number;
  status: 'pending' | 'active' | 'complete';
  totalPlanned: number;
  totalActual: number;
  remainingHours: number | null;
  burnPercentage: number;
  variance: number;
  budgetStatus: 'no_budget' | 'healthy' | 'on_track' | 'warning' | 'over_budget';
}

export interface ProjectWithPhases {
  id: string;
  name: string;
  budget_hours: number | null;
  hourly_rate: number | null;
  status: string;
  org_id: string;
  totalActual: number;
  totalPlanned: number;
  burnPercentage: number;
}

export function useProjectPhases(projectId: string | null) {
  const [project, setProject] = useState<ProjectWithPhases | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPhases = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setPhases([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/phases`);

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Project not found');
        }
        throw new Error('Failed to fetch project phases');
      }

      const data = await res.json();
      setProject(data.project);
      setPhases(data.phases || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch phases'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPhases();
  }, [fetchPhases]);

  // Calculated stats
  const stats = {
    totalPhases: phases.length,
    completedPhases: phases.filter((p) => p.status === 'complete').length,
    activePhases: phases.filter((p) => p.status === 'active').length,
    phasesOverBudget: phases.filter((p) => p.budgetStatus === 'over_budget').length,
    phasesAtRisk: phases.filter((p) => p.budgetStatus === 'warning').length,
    totalVariance: phases.reduce((sum, p) => sum + p.variance, 0),
  };

  return { project, phases, stats, loading, error, refetch: fetchPhases };
}

/**
 * Get phases for multiple projects (for dashboard overview)
 */
export function useAllProjectPhases(projectIds: string[]) {
  const [phasesMap, setPhasesMap] = useState<Record<string, ProjectPhase[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllPhases = useCallback(async () => {
    if (projectIds.length === 0) {
      setPhasesMap({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        projectIds.map(async (id) => {
          const res = await fetch(`${API_BASE}/api/projects/${id}/phases`);
          if (!res.ok) return { id, phases: [] };
          const data = await res.json();
          return { id, phases: data.phases || [] };
        })
      );

      const map: Record<string, ProjectPhase[]> = {};
      for (const result of results) {
        map[result.id] = result.phases;
      }
      setPhasesMap(map);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch phases'));
    } finally {
      setLoading(false);
    }
  }, [projectIds.join(',')]);

  useEffect(() => {
    fetchAllPhases();
  }, [fetchAllPhases]);

  return { phasesMap, loading, error, refetch: fetchAllPhases };
}
