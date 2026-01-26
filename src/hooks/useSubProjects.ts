/**
 * useSubProjects Hook
 * Manages sub-project data and operations for Project Settings page
 */

import { useState, useEffect, useCallback } from 'react';
import type { Project } from '../types/database';

interface SubProjectStats {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  budgetHours: number;
  hourlyRate: number | null;
  isBillable: boolean;
  status: string;
  phaseCount: number;
  totalActual: number;
  totalPlanned: number;
  remainingHours: number | null;
  burnPercentage: number;
  budgetStatus: 'no_budget' | 'over_budget' | 'warning' | 'on_track' | 'healthy';
}

interface SubProjectsRollup {
  totalBudgetHours: number;
  totalActualHours: number;
  totalPlannedHours: number;
  childCount: number;
  overBudgetCount: number;
  atRiskCount: number;
}

interface AvailableProject {
  id: string;
  name: string;
  color: string | null;
  status: string;
  budget_hours: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export function useSubProjects(projectId: string | undefined) {
  const [subProjects, setSubProjects] = useState<SubProjectStats[]>([]);
  const [rollup, setRollup] = useState<SubProjectsRollup | null>(null);
  const [availableProjects, setAvailableProjects] = useState<AvailableProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sub-projects
  const fetchSubProjects = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/projects/${projectId}/sub-projects`);
      if (!response.ok) {
        throw new Error('Failed to fetch sub-projects');
      }

      const data = await response.json();
      setSubProjects(data.subProjects || []);
      setRollup(data.rollup || null);
    } catch (err: any) {
      console.error('Failed to fetch sub-projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch available projects that can be linked
  const fetchAvailableProjects = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/available-sub-projects`);
      if (!response.ok) {
        throw new Error('Failed to fetch available projects');
      }

      const data = await response.json();
      setAvailableProjects(data.projects || []);
    } catch (err: any) {
      console.error('Failed to fetch available projects:', err);
    }
  }, [projectId]);

  // Link an existing project as a sub-project
  const linkSubProject = useCallback(async (childProjectId: string) => {
    if (!projectId) return false;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/projects/${projectId}/sub-projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childProjectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to link sub-project');
      }

      // Refresh data
      await fetchSubProjects();
      await fetchAvailableProjects();
      return true;
    } catch (err: any) {
      console.error('Failed to link sub-project:', err);
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [projectId, fetchSubProjects, fetchAvailableProjects]);

  // Unlink a sub-project
  const unlinkSubProject = useCallback(async (childId: string) => {
    if (!projectId) return false;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/api/projects/${projectId}/sub-projects/${childId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unlink sub-project');
      }

      // Refresh data
      await fetchSubProjects();
      await fetchAvailableProjects();
      return true;
    } catch (err: any) {
      console.error('Failed to unlink sub-project:', err);
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [projectId, fetchSubProjects, fetchAvailableProjects]);

  // Create a new sub-project
  const createSubProject = useCallback(async (data: {
    name: string;
    description?: string;
    budget_hours?: number;
    hourly_rate?: number;
    color?: string;
    is_billable?: boolean;
  }) => {
    if (!projectId) return null;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/projects/${projectId}/sub-projects/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create sub-project');
      }

      const result = await response.json();

      // Refresh data
      await fetchSubProjects();
      await fetchAvailableProjects();
      return result.subProject;
    } catch (err: any) {
      console.error('Failed to create sub-project:', err);
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  }, [projectId, fetchSubProjects, fetchAvailableProjects]);

  // Initial fetch
  useEffect(() => {
    fetchSubProjects();
    fetchAvailableProjects();
  }, [fetchSubProjects, fetchAvailableProjects]);

  return {
    subProjects,
    rollup,
    availableProjects,
    loading,
    saving,
    error,
    linkSubProject,
    unlinkSubProject,
    createSubProject,
    refresh: fetchSubProjects,
  };
}
