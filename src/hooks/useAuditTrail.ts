/**
 * useAuditTrail Hook
 * Fetches audit history for entities (projects, allocations, time entries)
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface AuditEntry {
  id: string;
  action: 'create' | 'update' | 'delete';
  summary: string;
  changes: {
    old?: Record<string, any>;
    new?: Record<string, any>;
  };
  changedBy: string;
  changedByEmail?: string;
  timestamp: string;
}

export interface FullAuditEntry extends AuditEntry {
  entityType: string;
  entityId: string;
}

export type EntityType = 'projects' | 'allocations' | 'time_confirmations' | 'time_entries';

/**
 * Fetch audit trail for a specific entity
 */
export function useAuditTrail(entityType: EntityType | null, entityId: string | null, limit = 50) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAuditTrail = useCallback(async () => {
    if (!entityType || !entityId) {
      setEntries([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/audit/${entityType}/${entityId}?limit=${limit}`
      );

      if (!res.ok) {
        throw new Error('Failed to fetch audit trail');
      }

      const data = await res.json();
      setEntries(data.auditTrail || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch audit trail'));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, limit]);

  useEffect(() => {
    fetchAuditTrail();
  }, [fetchAuditTrail]);

  // Summary stats
  const stats = {
    totalChanges: entries.length,
    creates: entries.filter((e) => e.action === 'create').length,
    updates: entries.filter((e) => e.action === 'update').length,
    deletes: entries.filter((e) => e.action === 'delete').length,
    uniqueContributors: new Set(entries.map((e) => e.changedBy)).size,
    lastChange: entries.length > 0 ? entries[0].timestamp : null,
  };

  return { entries, stats, loading, error, refetch: fetchAuditTrail };
}

/**
 * Fetch full audit trail for a project (including related allocations and time entries)
 */
export function useProjectAuditTrail(projectId: string | null, limit = 100) {
  const [entries, setEntries] = useState<FullAuditEntry[]>([]);
  const [project, setProject] = useState<{ id: string; name: string } | null>(null);
  const [counts, setCounts] = useState({
    projectChanges: 0,
    allocationChanges: 0,
    entryChanges: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjectAuditTrail = useCallback(async () => {
    if (!projectId) {
      setEntries([]);
      setProject(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/audit/project/${projectId}/full?limit=${limit}`
      );

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Project not found');
        }
        throw new Error('Failed to fetch project audit trail');
      }

      const data = await res.json();
      setProject(data.project);
      setEntries(data.auditTrail || []);
      setCounts(data.counts || { projectChanges: 0, allocationChanges: 0, entryChanges: 0 });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch audit trail'));
    } finally {
      setLoading(false);
    }
  }, [projectId, limit]);

  useEffect(() => {
    fetchProjectAuditTrail();
  }, [fetchProjectAuditTrail]);

  // Group entries by date for timeline display
  const entriesByDate = entries.reduce((acc, entry) => {
    const date = new Date(entry.timestamp).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, FullAuditEntry[]>);

  return {
    project,
    entries,
    entriesByDate,
    counts,
    loading,
    error,
    refetch: fetchProjectAuditTrail,
  };
}

/**
 * Format an audit entry for display
 */
export function formatAuditSummary(entry: AuditEntry | FullAuditEntry): string {
  return entry.summary || `${entry.action} action`;
}

/**
 * Get the delta for a numeric field
 */
export function getFieldDelta(
  entry: AuditEntry,
  field: string
): { old: number; new: number; delta: number } | null {
  const oldVal = entry.changes.old?.[field];
  const newVal = entry.changes.new?.[field];

  if (typeof oldVal !== 'number' && typeof newVal !== 'number') {
    return null;
  }

  const oldNum = typeof oldVal === 'number' ? oldVal : 0;
  const newNum = typeof newVal === 'number' ? newVal : 0;

  return {
    old: oldNum,
    new: newNum,
    delta: newNum - oldNum,
  };
}
