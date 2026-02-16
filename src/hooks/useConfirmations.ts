/**
 * useConfirmations Hook
 *
 * MIGRATED: REST queries now go through API server.
 * Realtime subscriptions kept as direct Supabase WebSocket (per migration plan).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/apiClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { TimeConfirmationRow, TimeEntryRow, UserRow } from '../types/database';

interface TimeEntryWithRelations extends TimeEntryRow {
  project: { name: string; color: string | null };
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
      const data = await api.get<{ confirmation: ConfirmationWithRelations | null }>(
        `/api/confirmations?userId=${encodeURIComponent(userId)}&weekStart=${encodeURIComponent(weekStart)}`
      );
      setConfirmation(data.confirmation);
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

    await api.post('/api/confirmations/submit', {
      userId,
      weekStart,
      entries,
      notes,
    });

    await fetchConfirmation();
  };

  return { confirmation, loading, error, refetch: fetchConfirmation, submitConfirmation };
}

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

  // Realtime subscription ref
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchApprovals = useCallback(async (isInitialLoad = false) => {
    if (!orgId) {
      setApprovals([]);
      setLoading(false);
      return;
    }

    // Only show loading spinner on initial load, not refetches
    if (isInitialLoad) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await api.get<{ approvals: ApprovalWithWarnings[] }>(
        `/api/approvals?orgId=${encodeURIComponent(orgId)}`
      );
      setApprovals(data.approvals || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch approvals'));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchApprovals(true);
  }, [fetchApprovals]);

  // Realtime subscription — kept as direct Supabase WebSocket
  useEffect(() => {
    if (!orgId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('approvals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_confirmations',
        },
        (payload) => {
          console.log('📡 Approval change detected:', payload.eventType);
          fetchApprovals(false);
        }
      )
      .subscribe((status) => {
        console.log('📡 Approvals realtime status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orgId, fetchApprovals]);

  const approveConfirmation = async (id: string, approverId: string) => {
    await api.post(`/api/approvals/${id}/approve`, { approverId });
    await fetchApprovals();
  };

  const rejectConfirmation = async (id: string, reason: string) => {
    await api.post(`/api/approvals/${id}/reject`, { reason });
    await fetchApprovals();
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
