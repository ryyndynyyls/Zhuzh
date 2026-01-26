/**
 * useProjectSettings Hook
 * CRUD operations for project settings including phases
 * Uses API server (bypasses RLS) for write operations
 */

import { useState, useEffect, useCallback } from 'react';
import type { Project, ProjectPhase, ProjectUpdate, ProjectPhaseInsert, ProjectPhaseUpdate } from '../types/database';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface ProjectWithClient extends Project {
  client?: { id: string; name: string } | null;
  totalActual?: number;
  parentProject?: { id: string; name: string; color: string | null } | null;
}

interface UseProjectSettingsResult {
  project: ProjectWithClient | null;
  phases: ProjectPhase[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  
  // Project operations
  updateProject: (updates: ProjectUpdate) => Promise<boolean>;
  
  // Phase operations
  addPhase: (phase: Omit<ProjectPhaseInsert, 'project_id'>) => Promise<ProjectPhase | null>;
  updatePhase: (phaseId: string, updates: ProjectPhaseUpdate) => Promise<boolean>;
  deletePhase: (phaseId: string) => Promise<boolean>;
  reorderPhases: (phaseIds: string[]) => Promise<boolean>;
  
  // Refresh
  refresh: () => Promise<void>;
}

export function useProjectSettings(projectId: string | undefined): UseProjectSettingsResult {
  const [project, setProject] = useState<ProjectWithClient | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch project and phases via API
  const fetchData = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch project
      const projectRes = await fetch(`${API_BASE}/api/projects/${projectId}`);
      if (!projectRes.ok) {
        throw new Error('Failed to fetch project');
      }
      const projectData = await projectRes.json();
      setProject(projectData.project);

      // Fetch phases
      const phasesRes = await fetch(`${API_BASE}/api/projects/${projectId}/phases`);
      if (phasesRes.ok) {
        const phasesData = await phasesRes.json();
        setPhases(phasesData.phases || []);
      }

    } catch (err: any) {
      console.error('Failed to fetch project settings:', err);
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update project via API
  const updateProject = useCallback(async (updates: ProjectUpdate): Promise<boolean> => {
    if (!projectId) return false;
    
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update project');
      }

      const data = await res.json();
      
      // Update local state
      setProject(prev => prev ? { ...prev, ...data.project } : data.project);
      return true;

    } catch (err: any) {
      console.error('Failed to update project:', err);
      setError(err.message || 'Failed to update project');
      return false;
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  // Add phase via API
  const addPhase = useCallback(async (phase: Omit<ProjectPhaseInsert, 'project_id'>): Promise<ProjectPhase | null> => {
    if (!projectId) return null;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(phase),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add phase');
      }

      const data = await res.json();
      
      // Update local state
      setPhases(prev => [...prev, data.phase].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      return data.phase;

    } catch (err: any) {
      console.error('Failed to add phase:', err);
      setError(err.message || 'Failed to add phase');
      return null;
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  // Update phase via API
  const updatePhase = useCallback(async (phaseId: string, updates: ProjectPhaseUpdate): Promise<boolean> => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/phases/${phaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update phase');
      }

      const data = await res.json();
      
      // Optimistic update
      setPhases(prev => prev.map(p => 
        p.id === phaseId ? { ...p, ...data.phase } : p
      ));
      return true;

    } catch (err: any) {
      console.error('Failed to update phase:', err);
      setError(err.message || 'Failed to update phase');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Delete phase via API
  const deletePhase = useCallback(async (phaseId: string): Promise<boolean> => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/phases/${phaseId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete phase');
      }

      // Update local state
      setPhases(prev => prev.filter(p => p.id !== phaseId));
      return true;

    } catch (err: any) {
      console.error('Failed to delete phase:', err);
      setError(err.message || 'Failed to delete phase');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Reorder phases via API
  const reorderPhases = useCallback(async (phaseIds: string[]): Promise<boolean> => {
    if (!projectId) return false;
    
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/phases/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phaseIds }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reorder phases');
      }

      // Reorder local state
      setPhases(prev => {
        const phaseMap = new Map(prev.map(p => [p.id, p]));
        return phaseIds
          .map((id, index) => {
            const phase = phaseMap.get(id);
            return phase ? { ...phase, sort_order: index + 1 } : null;
          })
          .filter((p): p is ProjectPhase => p !== null);
      });

      return true;

    } catch (err: any) {
      console.error('Failed to reorder phases:', err);
      setError(err.message || 'Failed to reorder phases');
      return false;
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  return {
    project,
    phases,
    loading,
    saving,
    error,
    updateProject,
    addPhase,
    updatePhase,
    deletePhase,
    reorderPhases,
    refresh: fetchData,
  };
}
