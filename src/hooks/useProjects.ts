import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ProjectRow, ClientRow, ProjectPhaseRow } from '../types/database';

interface ProjectWithRelations extends ProjectRow {
  client?: ClientRow;
  phases?: ProjectPhaseRow[];
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
      let query = supabase
        .from('projects')
        .select('*, client:clients(*), phases:project_phases(*)');

      if (options.status) query = query.eq('status', options.status);
      if (options.clientId) query = query.eq('client_id', options.clientId);
      if (options.isActive !== undefined) query = query.eq('is_active', options.isActive);

      const { data, error: fetchError } = await query.order('priority', { ascending: true });

      if (fetchError) throw fetchError;
      setProjects(data || []);
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
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('*, client:clients(*), phases:project_phases(*)')
          .eq('id', projectId)
          .single();

        if (fetchError) throw fetchError;
        setProject(data);
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
