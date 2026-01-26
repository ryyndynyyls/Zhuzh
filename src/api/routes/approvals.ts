/**
 * Approvals Routes - Timesheet approval workflows
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Get pending approvals for an org
 * GET /api/approvals?orgId=xxx
 */
router.get('/', async (req, res) => {
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return res.status(400).json({ error: 'orgId is required' });
  }

  try {
    // Get pending confirmations with user and entry details
    // Using service role key bypasses RLS
    const { data, error } = await supabase
      .from('time_confirmations')
      .select(`
        *,
        user:users!time_confirmations_user_id_fkey(id, name, email, avatar_url, discipline),
        entries:time_entries(
          *,
          project:projects(id, name, color)
        )
      `)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch approvals:', error);
      return res.status(500).json({ error: 'Failed to fetch approvals' });
    }

    // Filter to org's users (since we can't easily join through users.org_id)
    const { data: orgUsers } = await supabase
      .from('users')
      .select('id')
      .eq('org_id', orgId);

    const orgUserIds = new Set(orgUsers?.map(u => u.id) || []);
    const filteredApprovals = data?.filter(a => orgUserIds.has(a.user_id)) || [];

    // Add variance and rubber-stamp warnings
    const approvalsWithWarnings = filteredApprovals.map(approval => {
      const entries = approval.entries || [];
      const totalPlanned = entries.reduce((sum: number, e: any) => sum + (e.planned_hours || 0), 0);
      const totalActual = entries.reduce((sum: number, e: any) => sum + (e.actual_hours || 0), 0);
      const variance = totalActual - totalPlanned;
      const variancePercent = totalPlanned > 0 ? Math.abs(variance / totalPlanned) * 100 : 0;

      return {
        ...approval,
        totalPlanned,
        totalActual,
        variance,
        hasVarianceWarning: variancePercent > 10,
        hasRubberStampWarning: totalPlanned > 0 && totalPlanned === totalActual,
      };
    });

    res.json({ approvals: approvalsWithWarnings });

  } catch (err) {
    console.error('Approvals fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

/**
 * Approve a timesheet
 * POST /api/approvals/:id/approve
 * Body: { approverId: string }
 */
router.post('/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { approverId } = req.body;

  if (!approverId) {
    return res.status(400).json({ error: 'approverId is required' });
  }

  const { error } = await supabase
    .from('time_confirmations')
    .update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to approve:', error);
    return res.status(500).json({ error: 'Failed to approve' });
  }

  res.json({ success: true });
});

/**
 * Reject a timesheet
 * POST /api/approvals/:id/reject
 * Body: { reason: string }
 */
router.post('/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'reason is required' });
  }

  const { error } = await supabase
    .from('time_confirmations')
    .update({
      status: 'rejected',
      rejection_reason: reason,
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to reject:', error);
    return res.status(500).json({ error: 'Failed to reject' });
  }

  res.json({ success: true });
});

export default router;
