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
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Gemini for resource config parsing
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ============================================================
// RESOURCE CONFIG PARSING (Gemini-powered)
// ============================================================

interface WorkSchedule {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

interface ResourceConfig {
  work_schedule: WorkSchedule;
  weekly_capacity: number;
  project_exclusions: string[];
  project_preferences: string[];
  skills: string[];
  seniority_notes: string | null;
  scheduling_notes: string | null;
  parsed_at: string;
  parse_confidence: number;
}

const DEFAULT_SCHEDULE: WorkSchedule = {
  mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0
};

/**
 * Parse specialty_notes into structured resource configuration using Gemini
 */
async function parseResourceConfigWithGemini(specialtyNotes: string): Promise<ResourceConfig> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are parsing employee profile notes into structured scheduling and resource configuration.

EMPLOYEE NOTES:
"${specialtyNotes}"

Extract the following information and return ONLY valid JSON (no markdown, no explanation):

{
  "work_schedule": {
    "mon": <hours 0-12, default 8>,
    "tue": <hours 0-12, default 8>,
    "wed": <hours 0-12, default 8>,
    "thu": <hours 0-12, default 8>,
    "fri": <hours 0-12, default 8>,
    "sat": <hours 0-12, default 0>,
    "sun": <hours 0-12, default 0>
  },
  "weekly_capacity": <total hours, calculate from schedule>,
  "project_exclusions": [<project names or patterns they should NOT be assigned to>],
  "project_preferences": [<work preferences, what they're good at, what they prefer>],
  "skills": [<specific skills mentioned: "UX", "motion graphics", "print", "digital", etc.>],
  "seniority_notes": "<any notes about seniority, reporting structure, level>",
  "scheduling_notes": "<any other scheduling preferences: meeting times, timezone, etc.>",
  "parse_confidence": <0.0-1.0, how confident you are in this parse>
}

PARSING RULES:
1. "Fridays off" or "doesn't work Fridays" → fri: 0
2. "Part-time" without specifics → assume 4 hours/day Mon-Fri
3. "9/9/4/4/0" means Mon:9, Tue:9, Wed:4, Thu:4, Fri:0
4. "Do not schedule for X" or "Not to be scheduled for X" or "Not to be resourced on X" → add X to project_exclusions
5. "Prefers X over Y" → add to project_preferences
6. Skills like "UX", "motion", "print", "digital", "design systems", "animations" → add to skills
7. If nothing about schedule is mentioned, use defaults (8 hours Mon-Fri)
8. Set parse_confidence lower if notes are ambiguous
9. "One rung below Kate" or similar hierarchy notes → add to seniority_notes

Return ONLY the JSON object.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    let jsonText = response.text().trim();
    
    // Clean up response - remove markdown code blocks if present
    if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
    else if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
    if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText);
    
    // Validate hours
    const validateHours = (val: any, def: number) => {
      if (typeof val !== 'number') return def;
      return Math.min(12, Math.max(0, val));
    };

    // Calculate weekly capacity from schedule
    const schedule = {
      mon: validateHours(parsed.work_schedule?.mon, 8),
      tue: validateHours(parsed.work_schedule?.tue, 8),
      wed: validateHours(parsed.work_schedule?.wed, 8),
      thu: validateHours(parsed.work_schedule?.thu, 8),
      fri: validateHours(parsed.work_schedule?.fri, 8),
      sat: validateHours(parsed.work_schedule?.sat, 0),
      sun: validateHours(parsed.work_schedule?.sun, 0),
    };
    
    const weeklyCapacity = Object.values(schedule).reduce((a, b) => a + b, 0);

    return {
      work_schedule: schedule,
      weekly_capacity: weeklyCapacity,
      project_exclusions: Array.isArray(parsed.project_exclusions) ? parsed.project_exclusions : [],
      project_preferences: Array.isArray(parsed.project_preferences) ? parsed.project_preferences : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      seniority_notes: parsed.seniority_notes || null,
      scheduling_notes: parsed.scheduling_notes || null,
      parsed_at: new Date().toISOString(),
      parse_confidence: typeof parsed.parse_confidence === 'number' 
        ? Math.min(1, Math.max(0, parsed.parse_confidence)) 
        : 0.8
    };
  } catch (error) {
    console.error('[ResourceConfig] Parse error:', error);
    // Return defaults on error
    return {
      work_schedule: DEFAULT_SCHEDULE,
      weekly_capacity: 40,
      project_exclusions: [],
      project_preferences: [],
      skills: [],
      seniority_notes: null,
      scheduling_notes: null,
      parsed_at: new Date().toISOString(),
      parse_confidence: 0
    };
  }
}

/**
 * Check if a project name fuzzy-matches any exclusion pattern
 */
function matchesExclusion(projectName: string, exclusions: string[]): { 
  matches: boolean; 
  matchedPattern?: string; 
  confidence: number 
} {
  if (!exclusions || exclusions.length === 0) {
    return { matches: false, confidence: 1.0 };
  }

  const projectLower = projectName.toLowerCase();
  
  for (const exclusion of exclusions) {
    const exclusionLower = exclusion.toLowerCase();
    
    // Exact match
    if (projectLower === exclusionLower) {
      return { matches: true, matchedPattern: exclusion, confidence: 1.0 };
    }
    
    // Project contains exclusion pattern
    if (projectLower.includes(exclusionLower)) {
      return { matches: true, matchedPattern: exclusion, confidence: 0.9 };
    }
    
    // Exclusion contains project name
    if (exclusionLower.includes(projectLower)) {
      return { matches: true, matchedPattern: exclusion, confidence: 0.8 };
    }
    
    // Word-level matching (for "Google Cloud" matching "Google Cloud Veo Booth")
    const exclusionWords = exclusionLower.split(/\s+/);
    const projectWords = projectLower.split(/\s+/);
    const matchingWords = exclusionWords.filter(w => 
      projectWords.some(pw => pw.includes(w) || w.includes(pw))
    );
    
    if (matchingWords.length >= 2 || (matchingWords.length === 1 && exclusionWords.length === 1)) {
      const confidence = matchingWords.length / exclusionWords.length;
      if (confidence >= 0.5) {
        return { matches: true, matchedPattern: exclusion, confidence: confidence * 0.7 };
      }
    }
  }

  return { matches: false, confidence: 1.0 };
}

// ============================================================
// RESOURCE CONFIG ROUTES
// ============================================================

/**
 * POST /api/team/parse-config
 * Parse specialty_notes into structured resource_config
 */
router.post('/parse-config', async (req: Request, res: Response) => {
  try {
    const { specialty_notes, userId } = req.body;

    if (!specialty_notes) {
      // Return defaults if no notes
      const defaultConfig: ResourceConfig = {
        work_schedule: DEFAULT_SCHEDULE,
        weekly_capacity: 40,
        project_exclusions: [],
        project_preferences: [],
        skills: [],
        seniority_notes: null,
        scheduling_notes: null,
        parsed_at: new Date().toISOString(),
        parse_confidence: 1.0
      };
      return res.json({ data: defaultConfig });
    }

    console.log('[ResourceConfig] Parsing notes for user:', userId);
    const config = await parseResourceConfigWithGemini(specialty_notes);
    console.log('[ResourceConfig] Parsed config:', {
      weekly_capacity: config.weekly_capacity,
      exclusions: config.project_exclusions,
      skills: config.skills,
      confidence: config.parse_confidence
    });

    // If userId provided, also update the user record
    if (userId) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          resource_config: config,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[ResourceConfig] DB update error:', updateError);
        // Still return the config even if update fails
      }
    }

    res.json({ data: config });
  } catch (err) {
    console.error('[ResourceConfig] Unexpected error:', err);
    res.status(500).json({ error: 'Failed to parse resource config' });
  }
});

/**
 * POST /api/team/check-exclusion
 * Check if a user is excluded from a project (fuzzy match)
 */
router.post('/check-exclusion', async (req: Request, res: Response) => {
  try {
    const { userId, projectName } = req.body;

    if (!userId || !projectName) {
      return res.status(400).json({ error: 'userId and projectName are required' });
    }

    // Get user's resource_config
    const { data: user, error } = await supabase
      .from('users')
      .select('name, resource_config, specialty_notes')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const config = user.resource_config as ResourceConfig | null;
    const exclusions = config?.project_exclusions || [];

    const match = matchesExclusion(projectName, exclusions);

    res.json({
      data: {
        userName: user.name,
        projectName,
        isExcluded: match.matches,
        matchedPattern: match.matchedPattern,
        confidence: match.confidence,
        message: match.matches 
          ? `${user.name}'s profile notes say not to schedule for "${match.matchedPattern}". "${projectName}" appears to match. Is this an exception?`
          : null
      }
    });
  } catch (err) {
    console.error('[CheckExclusion] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/team/:userId/availability
 * Get user's availability based on resource_config work_schedule
 */
router.get('/:userId/availability', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { date } = req.query; // Optional: specific date to check

    const { data: user, error } = await supabase
      .from('users')
      .select('name, resource_config')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const config = user.resource_config as ResourceConfig | null;
    const schedule = config?.work_schedule || DEFAULT_SCHEDULE;
    const weeklyCapacity = config?.weekly_capacity || 40;

    // If specific date requested, check that day
    if (date) {
      const d = new Date(date as string);
      const dayOfWeek = d.getDay();
      const dayMap: Record<number, keyof WorkSchedule> = {
        0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
      };
      const dayKey = dayMap[dayOfWeek];
      const hoursAvailable = schedule[dayKey];

      return res.json({
        data: {
          date,
          dayOfWeek: dayKey,
          hoursAvailable,
          isWorkingDay: hoursAvailable > 0
        }
      });
    }

    // Return full schedule
    res.json({
      data: {
        schedule,
        weeklyCapacity,
        workingDays: Object.entries(schedule)
          .filter(([_, hours]) => hours > 0)
          .map(([day]) => day)
      }
    });
  } catch (err) {
    console.error('[Availability] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

    // Parse specialty_notes if provided
    let resource_config = null;
    if (specialty_notes) {
      resource_config = await parseResourceConfigWithGemini(specialty_notes);
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
        resource_config,
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
 * Automatically parses resource_config if specialty_notes changes
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
      'notification_preferences', 'dm_frequency', 'nicknames'
    ];

    const filteredUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        filteredUpdates[field] = updates[field];
      }
    }

    // If specialty_notes is being updated, re-parse resource_config
    if ('specialty_notes' in updates && updates.specialty_notes) {
      console.log('[Team:Update] Parsing resource config for specialty_notes change');
      const resourceConfig = await parseResourceConfigWithGemini(updates.specialty_notes);
      filteredUpdates.resource_config = resourceConfig;
      console.log('[Team:Update] Parsed config:', {
        weekly_capacity: resourceConfig.weekly_capacity,
        exclusions: resourceConfig.project_exclusions,
        skills: resourceConfig.skills
      });
    } else if ('specialty_notes' in updates && !updates.specialty_notes) {
      // Clear resource_config if notes are cleared
      filteredUpdates.resource_config = {
        work_schedule: DEFAULT_SCHEDULE,
        weekly_capacity: 40,
        project_exclusions: [],
        project_preferences: [],
        skills: [],
        seniority_notes: null,
        scheduling_notes: null,
        parsed_at: new Date().toISOString(),
        parse_confidence: 1.0
      };
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

    // Get user's resource_config for capacity
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('resource_config')
      .eq('id', userId)
      .single();

    const weeklyCapacity = (user?.resource_config as ResourceConfig)?.weekly_capacity || 40;

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

    // Calculate utilization using user's actual capacity
    const totalPlannedHours = allocations?.reduce((sum, a) => sum + (a.planned_hours || 0), 0) || 0;
    const totalCapacity = numWeeks * weeklyCapacity;
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
        weeklyCapacity,
        utilizationPercent,
        weeklyBreakdown: Object.entries(weeklyData).map(([week, hours]) => ({
          week,
          hours,
          utilization: Math.round((hours / weeklyCapacity) * 100)
        })).sort((a, b) => a.week.localeCompare(b.week))
      }
    });
  } catch (err) {
    console.error('[Team:Utilization] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
