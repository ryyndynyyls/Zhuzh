/**
 * Clients Routes - Client management
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Get clients for an org
 * GET /api/clients?orgId=xxx
 */
router.get('/', async (req, res) => {
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return res.status(400).json({ error: 'orgId is required' });
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    res.json({ clients: data || [] });
  } catch (err: any) {
    console.error('Failed to fetch clients:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

export default router;
