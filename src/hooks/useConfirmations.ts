import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { TimeConfirmationRow, TimeEntryRow, UserRow, ProjectRow } from '../types/database';

interface TimeEntryWithRelations extends TimeEntryRow {
  project?: ProjectRow;
}

interface ConfirmationWithRelations extends TimeConfirmationRow {
  entries?: TimeEntryWithRelations[];
  user?: UserRow;
}

export function useConfirmation(userId: string | undefined, weekStart: string) {
  const [confirmation, setConfirmation] = useState<ConfirmationWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfirmation = useCallback(async () => {
    if (!userId) {
      setConfirmation(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('time_confirmations')
        .select('*, entries:time_entries(*, project:projects(name, color))')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setConfirmation(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch confirmation'));
    } finally {
      setLoading(false);
    }
  }, [userId, weekStart]);

  useEffect(() => {
    fetchConfirmation();
  }, [fetchConfirmation]);

  const submitConfirmation = async (entries: Array<{ allocation_id: string; actual_hours: number }>, notes?: string) => {
    if (!userId) throw new Error('User ID required');

    // Create or update confirmation
    let conf = confirmation;
    if (!conf) {
      const { data, error } = await supabase
        .from('time_confirmations')
        .insert({
          user_id: userId,
          week_start: weekStart,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          notes
        })
        .select()
        .single();
      if (error) throw error;
      conf = data;
    } else {
      const { error } = await supabase
        .from('time_confirmations')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          notes
        })
        .eq('id', conf.id);
      if (error) throw error;
    }

    // Delete existing entries and create new ones
    await supabase.from('time_entries').delete().eq('confirmation_id', conf!.id);

    // Get allocations for planned hours
    const { data: allocations } = await supabase
      .from('allocations')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart);

    for (const entry of entries) {
      const alloc = allocations?.find(a => a.id === entry.allocation_id);
      if (alloc) {
        await supabase.from('time_entries').insert({
          confirmation_id: conf!.id,
          project_id: alloc.project_id,
          phase_id: alloc.phase_id,
          allocation_id: alloc.id,
          planned_hours: alloc.planned_hours,
          actual_hours: entry.actual_hours,
          is_unplanned: false
        });
      }
    }

    await fetchConfirmation();
  };

  return { confirmation, loading, error, refetch: fetchConfirmation, submitConfirmation };
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface ApprovalWithWarnings extends ConfirmationWithRelations {
  totalPlanned?: number;
  totalActual?: number;
  variance?: number;
  hasVarianceWarning?: boolean;
  hasRubberStampWarning?: boolean;
}

export function usePendingApprovals(orgId: string) {
  const [approvals, setApprovals] = useState<ApprovalWithWarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchApprovals = useCallback(async (isInitialLoad = false) => {
    if (!orgId) {
      setApprovals([]);
      setLoading(false);
      return;
    }

    // Only show loading spinner on initial load, not refetches
    // This prevents the spinner from interrupting confetti celebrations
    if (isInitialLoad) {
      setLoading(true);
    }
    setError(null);

    try {
      // Use API endpoint that uses service role key (bypasses RLS)
      const res = await fetch(`${API_BASE}/api/approvals?orgId=${orgId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch approvals');
      }
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch approvals'));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchApprovals(true); // Initial load shows spinner
  }, [fetchApprovals]);

  const approveConfirmation = async (id: string, approverId: string) => {
    const res = await fetch(`${API_BASE}/api/approvals/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approverId }),
    });

    if (!res.ok) throw new Error('Failed to approve');
    await fetchApprovals(); // Refetch without spinner
  };

  const rejectConfirmation = async (id: string, reason: string) => {
    const res = await fetch(`${API_BASE}/api/approvals/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) throw new Error('Failed to reject');
    await fetchApprovals(); // Refetch without spinner
  };

  return {
    approvals,
    loading,
    error,
    refetch: fetchApprovals,
    approveConfirmation,
    rejectConfirmation
  };
}
