/**
 * Utilization Routes
 * Team utilization data from views and computed queries
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Get team utilization from the user_weekly_utilization view
 * GET /api/utilization?weekStart=2026-02-09
 */
router.get('/', async (req, res) => {
  const { weekStart } = req.query;

  if (!weekStart) {
    return res.status(400).json({ error: 'weekStart query parameter is required' });
  }

  try {
    const { data, error } = await supabase
      .from('user_weekly_utilization')
      .select('*')
      .eq('week_start', weekStart as string);

    if (error) throw error;

    res.json({ utilization: data || [] });
  } catch (err: any) {
    console.error('Failed to fetch team utilization:', err);
    res.status(500).json({ error: 'Failed to fetch team utilization' });
  }
});

/**
 * Get this week's utilization computed from users + allocations
 * GET /api/utilization/week?orgId=xxx
 */
router.get('/week', async (req, res) => {
  const { orgId } = req.query;

  if (!orgId) {
    return res.status(400).json({ error: 'orgId query parameter is required' });
  }

  try {
    // Calculate this week's Monday and Sunday
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    const weekEndDate = new Date(monday);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEnd = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, '0')}-${String(weekEndDate.getDate()).padStart(2, '0')}`;

    // Get team members (employees and PMs)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('org_id', orgId as string)
      .in('role', ['employee', 'pm']);

    if (usersError) throw usersError;

    const teamMemberIds = users?.map(u => u.id) || [];
    const teamSize = teamMemberIds.length;

    if (teamSize === 0) {
      return res.json({
        utilizationPercent: 0,
        totalAllocatedHours: 0,
        teamSize: 0,
        maxCapacity: 0,
        weekStart,
      });
    }

    // Get allocations for this week
    const { data: allocations, error: allocError } = await supabase
      .from('allocations')
      .select('planned_hours, week_start')
      .gte('week_start', weekStart)
      .lte('week_start', weekEnd)
      .in('user_id', teamMemberIds);

    if (allocError) throw allocError;

    const totalAllocatedHours = allocations?.reduce((sum, a) => sum + (a.planned_hours || 0), 0) || 0;
    const maxCapacity = teamSize * 40;
    const utilizationPercent = maxCapacity > 0
      ? Math.round((totalAllocatedHours / maxCapacity) * 100)
      : 0;

    res.json({
      utilizationPercent,
      totalAllocatedHours,
      teamSize,
      maxCapacity,
      weekStart,
    });
  } catch (err: any) {
    console.error('Failed to fetch week utilization:', err);
    res.status(500).json({ error: 'Failed to fetch week utilization' });
  }
});

export default router;
