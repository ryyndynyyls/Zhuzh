import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface ProjectBudgetSummary {
  id: string;
  name: string;
  description: string | null;
  color: string;
  clientId: string | null;
  clientName: string | null;
  budgetHours: number | null;
  hourlyRate: number | null;
  isBillable: boolean;
  priority: number;
  status: string;
  phaseCount: number;
  totalActual: number;
  totalPlanned: number;
  unplannedHours: number;
  remainingHours: number | null;
  burnPercentage: number;
  budgetStatus: 'no_budget' | 'healthy' | 'on_track' | 'warning' | 'over_budget';
  health: 'on-track' | 'at-risk' | 'over-budget';
  // Legacy field mappings for backwards compatibility
  project_id?: string;
  project_name?: string;
  client_name?: string;
  budget_hours?: number;
  burned_hours?: number;
  remaining_hours?: number;
  burn_percentage?: number;
}

export interface BudgetStats {
  totalProjects: number;
  activeProjects: number;
  totalBudgetHours: number;
  totalActualHours: number;
  totalPlannedHours: number;
  overallBurnPercentage: number;
  projectsOverBudget: number;
  projectsAtRisk: number;
  onTrack: number;
  atRisk: number;
  overBudget: number;
  totalBurnedHours: number;
  avgUtilization?: number;
}

export function useBudgetDashboard(orgId?: string) {
  const [projects, setProjects] = useState<ProjectBudgetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [apiStats, setApiStats] = useState<Partial<BudgetStats>>({});

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = orgId 
        ? `${API_BASE}/api/budget/dashboard?orgId=${orgId}`
        : `${API_BASE}/api/budget/dashboard`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error('Failed to fetch budget data');
      }

      const data = await res.json();

      // Map API response to expected format with health status
      const projectsWithHealth = (data.projects || []).map((p: any) => ({
        ...p,
        // Map budgetStatus to health for backwards compatibility
        health: p.budgetStatus === 'over_budget'
          ? 'over-budget'
          : p.budgetStatus === 'warning'
            ? 'at-risk'
            : 'on-track',
        // Legacy field mappings
        project_id: p.id,
        project_name: p.name,
        client_name: p.clientName,
        budget_hours: p.budgetHours || 0,
        burned_hours: p.totalActual,
        remaining_hours: p.remainingHours,
        burn_percentage: p.burnPercentage,
      }));

      setProjects(projectsWithHealth);
      setApiStats(data.stats || {});
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch budget data'));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Summary stats (combine API stats with calculated values)
  const stats: BudgetStats = {
    totalProjects: apiStats.totalProjects ?? projects.length,
    activeProjects: apiStats.activeProjects ?? projects.filter((p) => p.status === 'active').length,
    onTrack: projects.filter((p) => p.health === 'on-track').length,
    atRisk: apiStats.projectsAtRisk ?? projects.filter((p) => p.health === 'at-risk').length,
    overBudget: apiStats.projectsOverBudget ?? projects.filter((p) => p.health === 'over-budget').length,
    totalBudgetHours: apiStats.totalBudgetHours ?? projects.reduce((sum, p) => sum + (p.budgetHours || 0), 0),
    totalBurnedHours: apiStats.totalActualHours ?? projects.reduce((sum, p) => sum + p.totalActual, 0),
    totalActualHours: apiStats.totalActualHours ?? 0,
    totalPlannedHours: apiStats.totalPlannedHours ?? 0,
    overallBurnPercentage: apiStats.overallBurnPercentage ?? 0,
    projectsOverBudget: apiStats.projectsOverBudget ?? 0,
    projectsAtRisk: apiStats.projectsAtRisk ?? 0,
    // Calculate avg utilization from API or use overall burn percentage as proxy
    avgUtilization: (apiStats as any).avgUtilization ?? (
      projects.length > 0 
        ? Math.round(
            projects
              .filter(p => p.status === 'active' && p.budgetHours && p.budgetHours > 0)
              .reduce((sum, p) => sum + Math.min(p.burnPercentage, 100), 0) / 
            Math.max(projects.filter(p => p.status === 'active' && p.budgetHours && p.budgetHours > 0).length, 1)
          )
        : 0
    ),
  };

  return { projects, stats, loading, error, refetch: fetchBudgets };
}
