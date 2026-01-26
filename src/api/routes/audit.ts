/**
 * Audit Routes - Audit trail for entities
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Get audit trail for an entity
 * GET /api/audit/:entityType/:entityId
 */
router.get('/:entityType/:entityId', async (req, res) => {
  const { entityType, entityId } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  const allowedEntityTypes = ['projects', 'allocations', 'time_confirmations', 'time_entries'];
  if (!allowedEntityTypes.includes(entityType)) {
    return res.status(400).json({
      error: 'Invalid entity type',
      allowedTypes: allowedEntityTypes,
    });
  }

  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select(`
        *,
        user:users(id, name, email)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Format audit entries for display
    const formattedEntries = (data || []).map((entry) => {
      let summary = '';
      const changes = entry.changes || {};

      if (entry.action === 'create') {
        summary = `Created ${entityType.replace('_', ' ')}`;
      } else if (entry.action === 'delete') {
        summary = `Deleted ${entityType.replace('_', ' ')}`;
      } else if (entry.action === 'update') {
        // Summarize key changes
        const typedChanges = changes as { old?: Record<string, unknown>; new?: Record<string, unknown> };
        const oldData = typedChanges.old || {};
        const newData = typedChanges.new || {};
        const changedFields: string[] = [];

        // Check for hours changes
        if (oldData.planned_hours !== newData.planned_hours) {
          changedFields.push(`planned: ${oldData.planned_hours || 0} → ${newData.planned_hours || 0}`);
        }
        if (oldData.actual_hours !== newData.actual_hours) {
          changedFields.push(`actual: ${oldData.actual_hours || 0} → ${newData.actual_hours || 0}`);
        }
        if (oldData.budget_hours !== newData.budget_hours) {
          changedFields.push(`budget: ${oldData.budget_hours || 0} → ${newData.budget_hours || 0}`);
        }
        if (oldData.status !== newData.status) {
          changedFields.push(`status: ${oldData.status} → ${newData.status}`);
        }

        summary = changedFields.length > 0 ? changedFields.join(', ') : 'Updated';
      }

      return {
        id: entry.id,
        action: entry.action,
        summary,
        changes: entry.changes,
        changedBy: entry.user?.name || 'System',
        changedByEmail: entry.user?.email,
        timestamp: entry.created_at,
      };
    });

    res.json({ auditTrail: formattedEntries });
  } catch (err: any) {
    console.error('Failed to fetch audit trail:', err);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

/**
 * Get audit trail for a project (including phases, allocations, entries)
 * GET /api/audit/project/:projectId/full
 */
router.get('/project/:projectId/full', async (req, res) => {
  const { projectId } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

  try {
    // Get project and related entity IDs
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, org_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get allocation IDs for this project
    const { data: allocations } = await supabase
      .from('allocations')
      .select('id')
      .eq('project_id', projectId);

    // Get time entry IDs for this project
    const { data: entries } = await supabase
      .from('time_entries')
      .select('id')
      .eq('project_id', projectId);

    const allocationIds = allocations?.map((a) => a.id) || [];
    const entryIds = entries?.map((e) => e.id) || [];

    // Get all related audit entries
    const { data: auditData, error } = await supabase
      .from('audit_log')
      .select(`
        *,
        user:users(id, name, email)
      `)
      .eq('org_id', project.org_id)
      .or(
        `entity_id.eq.${projectId},` +
          `entity_id.in.(${allocationIds.join(',')}),` +
          `entity_id.in.(${entryIds.join(',')})`
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Format entries
    const formattedEntries = (auditData || []).map((entry) => ({
      id: entry.id,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      action: entry.action,
      changes: entry.changes,
      changedBy: entry.user?.name || 'System',
      timestamp: entry.created_at,
    }));

    res.json({
      project: { id: project.id, name: project.name },
      auditTrail: formattedEntries,
      counts: {
        projectChanges: formattedEntries.filter((e) => e.entityType === 'projects').length,
        allocationChanges: formattedEntries.filter((e) => e.entityType === 'allocations').length,
        entryChanges: formattedEntries.filter((e) => e.entityType === 'time_entries').length,
      },
    });
  } catch (err: any) {
    console.error('Failed to fetch project audit trail:', err);
    res.status(500).json({ error: 'Failed to fetch project audit trail' });
  }
});

export default router;
