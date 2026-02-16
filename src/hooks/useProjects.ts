/**
 * useProjects Hook
 *
 * MIGRATED: Now fetches from API server instead of direct Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/apiClient';
import type { ProjectRow, ClientRow, ProjectPhaseRow } from '../types/database';

export interface ProjectWithRelations extends ProjectRow {
  client: ClientRow | null;
  phases: ProjectPhaseRow[];
  // Computed fields that may be included from budget views
  totalActual?: number;
  totalPlanned?: number;
  burn_percentage?: number;
}

interface UseProjectsOptions {
  status?: string;
  clientId?: string;
  isActive?: boolean;
}

export function useProjects(options: UseProjectsOptions = {}) {
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.status) params.set('status', options.status);
      if (options.clientId) params.set('clientId', options.clientId);
      if (options.isActive !== undefined) params.set('isActive', String(options.isActive));

      const qs = params.toString();
      const data = await api.get<{ projects: ProjectWithRelations[] }>(
        `/api/projects${qs ? `?${qs}` : ''}`
      );
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch projects'));
    } finally {
      setLoading(false);
    }
  }, [options.status, options.clientId, options.isActive]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects };
}

export function useProject(projectId: string | undefined) {
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setLoading(false);
      return;
    }

    async function fetchProject() {
      setLoading(true);
      try {
        const data = await api.get<{ project: ProjectWithRelations }>(
          `/api/projects/${projectId}`
        );
        setProject(data.project);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch project'));
      } finally {
        setLoading(false);
      }
    }

    fetchProject();
  }, [projectId]);

  return { project, loading, error };
}
