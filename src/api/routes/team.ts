/**
 * Team & Bullpen API Routes
 * 
 * Manages active roster and freelancer bullpen
 * 
 * ROUTE ORDER MATTERS: Specific routes (/roster, /bullpen) must come
 * before parameterized routes (/:userId) to avoid matching conflicts.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================
// SPECIFIC ROUTES (must be defined before parameterized routes)
// ============================================================

/**
 * GET /api/team/roster
 * Get active roster (is_active = true)
 */
router.get('/roster', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[Team:Roster] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ data: users });
  } catch (err) {
    console.error('[Team:Roster] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/team/bullpen
 * Get bullpen (is_freelance = true AND is_active = false)
 */
router.get('/bullpen', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }

    const { data: freelancers, error } = await supabase
      .from('users')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_freelance', true)
      .eq('is_active', false)
      .order('name');

    if (error) {
      console.error('[Team:Bullpen] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ data: freelancers });
  } catch (err) {
    console.error('[Team:Bullpen] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/team/bullpen
 * Add a new freelancer to the bullpen
 */
router.post('/bullpen', async (req: Request, res: Response) => {
  try {
    const { 
      org_id, name, email, job_title, specialty_notes, 
      location, website, contact_email, phone, hourly_rate, discipline 
    } = req.body;

    if (!org_id || !name) {
      return res.status(400).json({ error: 'org_id and name are required' });
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        org_id,
        name,
        email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@freelance.placeholder`,
        role: 'employee',
        slack_user_id: '', // No Slack for external freelancers
        is_active: false,
        is_freelance: true,
        job_title,
        specialty_notes,
        location,
        website,
        contact_email: contact_email || email,
        phone,
        hourly_rate,
        discipline,
      })
      .select()
      .single();

    if (error) {
      console.error('[Team:AddFreelancer] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ data, message: 'Freelancer added to bullpen' });
  } catch (err) {
    console.error('[Team:AddFreelancer] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/team/bullpen/:userId/projects
 * Get past projects for a freelancer from their allocation/timesheet history
 */
router.get('/bullpen/:userId/projects', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get unique projects from allocations
    const { data: allocations, error: allocError } = await supabase
      .from('allocations')
      .select(`
        project_id,
        planned_hours,
        week_start,
        projects (
          id,
          name,
          color,
          clients (name)
        )
      `)
      .eq('user_id', userId)
      .order('week_start', { ascending: false });

    if (allocError) {
      console.error('[Team:Bullpen:Projects] Allocation error:', allocError);
      return res.status(500).json({ error: allocError.message });
    }

    // Get time entries for actual hours
    const { data: timeEntries, error: timeError } = await supabase
      .from('time_entries')
      .select(`
        project_id,
        actual_hours,
        time_confirmations!inner (user_id)
      `)
      .eq('time_confirmations.user_id', userId);

    if (timeError) {
      console.error('[Team:Bullpen:Projects] Time entries error:', timeError);
    }

    // Aggregate by project
    const projectMap = new Map<string, {
      id: string;
      name: string;
      clientName: string | null;
      color: string | null;
      totalPlannedHours: number;
      totalActualHours: number;
      firstWeek: string;
      lastWeek: string;
    }>();

    for (const alloc of allocations || []) {
      const project = alloc.projects as any;
      if (!project) continue;

      const existing = projectMap.get(alloc.project_id);
      if (existing) {
        existing.totalPlannedHours += alloc.planned_hours || 0;
        if (alloc.week_start < existing.firstWeek) existing.firstWeek = alloc.week_start;
        if (alloc.week_start > existing.lastWeek) existing.lastWeek = alloc.week_start;
      } else {
        projectMap.set(alloc.project_id, {
          id: project.id,
          name: project.name,
          clientName: project.clients?.name || null,
          color: project.color,
          totalPlannedHours: alloc.planned_hours || 0,
          totalActualHours: 0,
          firstWeek: alloc.week_start,
          lastWeek: alloc.week_start,
        });
      }
    }

    // Add actual hours from time entries
    for (const entry of timeEntries || []) {
      const existing = projectMap.get(entry.project_id);
      if (existing) {
        existing.totalActualHours += entry.actual_hours || 0;
      }
    }

    const projects = Array.from(projectMap.values()).sort((a, b) => 
      b.lastWeek.localeCompare(a.lastWeek)
    );

    res.json({ data: projects });
  } catch (err) {
    console.error('[Team:Bullpen:Projects] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// PARAMETERIZED ROUTES (/:userId)
// ============================================================

/**
 * GET /api/team/:userId
 * Get single user profile
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Team:GetUser] Error:', error);
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: user });
  } catch (err) {
    console.error('[Team:GetUser] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/team/:userId
 * Update user profile (freelancer details, etc.)
 */
router.patch('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedFields = [
      'name', 'job_title', 'specialty_notes', 'location', 
      'alt_name', 'website', 'contact_email', 'phone',
      'hourly_rate', 'is_freelance', 'discipline', 'avatar_url',
      'notification_preferences', 'dm_frequency'
    ];

    const filteredUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        filteredUpdates[field] = updates[field];
      }
    }
    filteredUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(filteredUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[Team:Update] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    console.error('[Team:Update] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/team/:userId/allocations
 * Get user's allocations with optional week filter
 * Query params: week (ISO date string for week start) or 'current'
 */
router.get('/:userId/allocations', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { week } = req.query;

    let query = supabase
      .from('allocations')
      .select(`
        id,
        project_id,
        planned_hours,
        week_start,
        projects (
          id,
          name,
          color,
          budget_hours,
          budget_amount,
          clients (name)
        )
      `)
      .eq('user_id', userId)
      .order('week_start', { ascending: false });

    // Filter by week if specified
    if (week === 'current') {
      // Get current week's Monday
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);
      const weekStart = monday.toISOString().split('T')[0];
      query = query.eq('week_start', weekStart);
    } else if (week) {
      query = query.eq('week_start', week as string);
    } else {
      // Default: last 4 weeks
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      query = query.gte('week_start', fourWeeksAgo.toISOString().split('T')[0]);
    }

    const { data: allocations, error } = await query;

    if (error) {
      console.error('[Team:Allocations] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Calculate totals
    const totalHours = allocations?.reduce((sum, a) => sum + (a.planned_hours || 0), 0) || 0;
    const projectCount = new Set(allocations?.map(a => a.project_id)).size;

    res.json({ 
      data: allocations,
      summary: {
        totalHours,
        projectCount,
        weekStart: week === 'current' ? 'current' : week || 'last4weeks'
      }
    });
  } catch (err) {
    console.error('[Team:Allocations] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/team/:userId/activate
 * Move user to active roster (set is_active = true)
 */
router.patch('/:userId/activate', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('users')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[Team:Activate] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ data, message: 'User moved to active roster' });
  } catch (err) {
    console.error('[Team:Activate] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/team/:userId/deactivate
 * Move user to bullpen (set is_active = false)
 */
router.patch('/:userId/deactivate', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[Team:Deactivate] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ data, message: 'User moved to bullpen' });
  } catch (err) {
    console.error('[Team:Deactivate] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/team/:userId/avatar
 * Upload avatar image for a user
 * Uses Supabase Storage bucket 'avatars'
 * Permission: own profile OR admin
 */
router.post('/:userId/avatar', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { imageData, mimeType } = req.body; // Base64 encoded image data

    // Validate request
    if (!imageData) {
      return res.status(400).json({ error: 'imageData is required' });
    }

    // Determine file extension from mime type
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    const extension = extensionMap[mimeType] || 'jpg';

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const filename = `${userId}-${Date.now()}.${extension}`;
    const filePath = `avatars/${filename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: mimeType || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Team:Avatar] Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload avatar: ' + uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // Update user record with new avatar URL
    const { data: userData, error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('[Team:Avatar] Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update user: ' + updateError.message });
    }

    res.json({
      data: userData,
      avatar_url: avatarUrl,
      message: 'Avatar uploaded successfully'
    });
  } catch (err) {
    console.error('[Team:Avatar] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/team/:userId/utilization
 * Get user's utilization stats
 */
router.get('/:userId/utilization', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { weeks = '4' } = req.query;
    const numWeeks = parseInt(weeks as string, 10);

    // Get allocations for the specified number of weeks
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (numWeeks * 7));

    const { data: allocations, error } = await supabase
      .from('allocations')
      .select('planned_hours, week_start')
      .eq('user_id', userId)
      .gte('week_start', startDate.toISOString().split('T')[0]);

    if (error) {
      console.error('[Team:Utilization] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Calculate utilization (assuming 40 hours/week capacity)
    const totalPlannedHours = allocations?.reduce((sum, a) => sum + (a.planned_hours || 0), 0) || 0;
    const totalCapacity = numWeeks * 40;
    const utilizationPercent = totalCapacity > 0 ? Math.round((totalPlannedHours / totalCapacity) * 100) : 0;

    // Group by week for trend data
    const weeklyData: Record<string, number> = {};
    for (const alloc of allocations || []) {
      weeklyData[alloc.week_start] = (weeklyData[alloc.week_start] || 0) + (alloc.planned_hours || 0);
    }

    res.json({
      data: {
        totalPlannedHours,
        totalCapacity,
        utilizationPercent,
        weeklyBreakdown: Object.entries(weeklyData).map(([week, hours]) => ({
          week,
          hours,
          utilization: Math.round((hours / 40) * 100)
        })).sort((a, b) => a.week.localeCompare(b.week))
      }
    });
  } catch (err) {
    console.error('[Team:Utilization] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
