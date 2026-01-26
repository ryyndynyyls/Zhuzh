/**
 * useBullpen - Hook for managing freelancer bullpen
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from '../types/database';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface FreelancerProject {
  id: string;
  name: string;
  clientName: string | null;
  color: string | null;
  totalPlannedHours: number;
  totalActualHours: number;
  firstWeek: string;
  lastWeek: string;
}

export function useBullpen(orgId: string | undefined) {
  const [bullpen, setBullpen] = useState<User[]>([]);
  const [roster, setRoster] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch bullpen (inactive freelancers)
  const fetchBullpen = useCallback(async () => {
    if (!orgId) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/team/bullpen?orgId=${orgId}`);
      const json = await response.json();
      
      if (json.error) {
        throw new Error(json.error);
      }
      
      setBullpen(json.data || []);
    } catch (err) {
      console.error('[useBullpen] Fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch bullpen'));
    }
  }, [orgId]);

  // Fetch active roster
  const fetchRoster = useCallback(async () => {
    if (!orgId) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/team/roster?orgId=${orgId}`);
      const json = await response.json();
      
      if (json.error) {
        throw new Error(json.error);
      }
      
      setRoster(json.data || []);
    } catch (err) {
      console.error('[useBullpen] Roster fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch roster'));
    }
  }, [orgId]);

  // Fetch past projects for a freelancer
  const fetchProjects = useCallback(async (userId: string): Promise<FreelancerProject[]> => {
    try {
      const response = await fetch(`${API_BASE}/api/team/bullpen/${userId}/projects`);
      const json = await response.json();
      
      if (json.error) {
        throw new Error(json.error);
      }
      
      return json.data || [];
    } catch (err) {
      console.error('[useBullpen] Projects fetch error:', err);
      return [];
    }
  }, []);

  // Move freelancer to active roster
  const activateFreelancer = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/team/${userId}/activate`, {
        method: 'PATCH',
      });
      const json = await response.json();
      
      if (json.error) {
        throw new Error(json.error);
      }
      
      // Refresh both lists
      await Promise.all([fetchBullpen(), fetchRoster()]);
      return json.data;
    } catch (err) {
      console.error('[useBullpen] Activate error:', err);
      throw err;
    }
  }, [fetchBullpen, fetchRoster]);

  // Move user to bullpen (deactivate)
  const deactivateUser = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/team/${userId}/deactivate`, {
        method: 'PATCH',
      });
      const json = await response.json();
      
      if (json.error) {
        throw new Error(json.error);
      }
      
      // Refresh both lists
      await Promise.all([fetchBullpen(), fetchRoster()]);
      return json.data;
    } catch (err) {
      console.error('[useBullpen] Deactivate error:', err);
      throw err;
    }
  }, [fetchBullpen, fetchRoster]);

  // Update freelancer profile
  const updateFreelancer = useCallback(async (userId: string, updates: Partial<User>) => {
    try {
      const response = await fetch(`${API_BASE}/api/team/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await response.json();
      
      if (json.error) {
        throw new Error(json.error);
      }
      
      // Refresh lists
      await Promise.all([fetchBullpen(), fetchRoster()]);
      return json.data;
    } catch (err) {
      console.error('[useBullpen] Update error:', err);
      throw err;
    }
  }, [fetchBullpen, fetchRoster]);

  // Add new freelancer to bullpen
  const addFreelancer = useCallback(async (freelancer: {
    name: string;
    email?: string;
    job_title?: string;
    specialty_notes?: string;
    location?: string;
    website?: string;
    contact_email?: string;
    phone?: string;
    hourly_rate?: number;
    discipline?: string;
  }) => {
    if (!orgId) throw new Error('No org_id');
    
    try {
      const response = await fetch('/api/team/bullpen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...freelancer, org_id: orgId }),
      });
      const json = await response.json();
      
      if (json.error) {
        throw new Error(json.error);
      }
      
      await fetchBullpen();
      return json.data;
    } catch (err) {
      console.error('[useBullpen] Add error:', err);
      throw err;
    }
  }, [orgId, fetchBullpen]);

  // Initial fetch
  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBullpen(), fetchRoster()]);
      setLoading(false);
    };

    loadData();
  }, [orgId, fetchBullpen, fetchRoster]);

  // Get active freelancers (on roster)
  const activeFreelancers = roster.filter(u => u.is_freelance);

  return {
    bullpen,
    roster,
    activeFreelancers,
    loading,
    error,
    fetchProjects,
    activateFreelancer,
    deactivateUser,
    updateFreelancer,
    addFreelancer,
    refresh: () => Promise.all([fetchBullpen(), fetchRoster()]),
  };
}
