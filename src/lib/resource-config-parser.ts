/**
 * Resource Config Parser
 * 
 * Uses Gemini to parse natural language profile notes into structured
 * resource configuration (work schedule, project exclusions, preferences).
 * 
 * This enables:
 * - Calendar visuals (gray out non-working days, capacity indicators)
 * - Over-allocation warnings based on actual daily capacity
 * - Voice assistant filtering (exclude resources from certain projects)
 * - Smart recommendations based on preferences and skills
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface WorkSchedule {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

export interface ResourceConfig {
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

const DEFAULT_CONFIG: ResourceConfig = {
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

/**
 * Parse specialty notes into structured resource configuration
 * 
 * @param specialtyNotes - Natural language notes about the resource
 * @param existingConfig - Existing config to merge with (for partial updates)
 * @returns Parsed ResourceConfig
 */
export async function parseResourceConfig(
  specialtyNotes: string | null | undefined,
  existingConfig?: Partial<ResourceConfig>
): Promise<ResourceConfig> {
  if (!specialtyNotes || specialtyNotes.trim().length === 0) {
    return {
      ...DEFAULT_CONFIG,
      ...existingConfig,
      parsed_at: new Date().toISOString()
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
4. "Do not schedule for X" or "Not to be resourced on X" → add X to project_exclusions
5. "Prefers X over Y" → add to project_preferences
6. Skills like "UX", "motion", "print", "digital", "design systems" → add to skills
7. If nothing about schedule is mentioned, use defaults (8 hours Mon-Fri)
8. Set parse_confidence lower if notes are ambiguous

Examples:
- "Works Mon-Thu, 9/9/4/4 schedule" → mon:9, tue:9, wed:4, thu:4, fri:0, weekly_capacity:26
- "Not to be scheduled for Google Cloud projects" → project_exclusions: ["Google Cloud"]
- "Expert designer - digital, print, animations" → skills: ["digital", "print", "animations"]

Return ONLY the JSON object.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Clean up response - remove markdown code blocks if present
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText);
    
    // Validate and merge with defaults
    const config: ResourceConfig = {
      work_schedule: {
        mon: validateHours(parsed.work_schedule?.mon, 8),
        tue: validateHours(parsed.work_schedule?.tue, 8),
        wed: validateHours(parsed.work_schedule?.wed, 8),
        thu: validateHours(parsed.work_schedule?.thu, 8),
        fri: validateHours(parsed.work_schedule?.fri, 8),
        sat: validateHours(parsed.work_schedule?.sat, 0),
        sun: validateHours(parsed.work_schedule?.sun, 0),
      },
      weekly_capacity: parsed.weekly_capacity || calculateWeeklyCapacity(parsed.work_schedule),
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

    console.log('📊 Parsed resource config:', {
      weekly_capacity: config.weekly_capacity,
      exclusions: config.project_exclusions,
      confidence: config.parse_confidence
    });

    return config;
  } catch (error) {
    console.error('Failed to parse resource config:', error);
    // Return defaults on error
    return {
      ...DEFAULT_CONFIG,
      ...existingConfig,
      parsed_at: new Date().toISOString(),
      parse_confidence: 0
    };
  }
}

/**
 * Check if a project name matches any exclusion patterns (fuzzy match)
 */
export function matchesExclusion(
  projectName: string, 
  exclusions: string[]
): { matches: boolean; matchedPattern?: string; confidence: number } {
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
    const matchingWords = exclusionWords.filter(w => projectWords.some(pw => pw.includes(w) || w.includes(pw)));
    
    if (matchingWords.length >= 2 || (matchingWords.length === 1 && exclusionWords.length === 1)) {
      const confidence = matchingWords.length / exclusionWords.length;
      if (confidence >= 0.5) {
        return { matches: true, matchedPattern: exclusion, confidence: confidence * 0.7 };
      }
    }
  }

  return { matches: false, confidence: 1.0 };
}

/**
 * Check if a user is available on a specific day based on their work schedule
 */
export function isAvailableOnDay(
  schedule: WorkSchedule,
  dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
): { available: boolean; hours: number } {
  const dayMap: Record<number, keyof WorkSchedule> = {
    0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
  };
  
  const day = dayMap[dayOfWeek];
  const hours = schedule[day] || 0;
  
  return {
    available: hours > 0,
    hours
  };
}

/**
 * Get capacity for a specific date
 */
export function getCapacityForDate(
  schedule: WorkSchedule,
  date: Date
): number {
  const dayOfWeek = date.getDay();
  return isAvailableOnDay(schedule, dayOfWeek).hours;
}

/**
 * Calculate weekly capacity from schedule
 */
function calculateWeeklyCapacity(schedule?: Partial<WorkSchedule>): number {
  if (!schedule) return 40;
  
  return (
    (schedule.mon || 0) +
    (schedule.tue || 0) +
    (schedule.wed || 0) +
    (schedule.thu || 0) +
    (schedule.fri || 0) +
    (schedule.sat || 0) +
    (schedule.sun || 0)
  );
}

/**
 * Validate hours value
 */
function validateHours(value: any, defaultValue: number): number {
  if (typeof value !== 'number') return defaultValue;
  if (value < 0) return 0;
  if (value > 12) return 12;
  return value;
}

/**
 * Parse a voice command update to resource config
 * e.g., "Hunter is now working Fridays" or "Remove Hunter from Google Cloud projects"
 */
export async function parseVoiceConfigUpdate(
  command: string,
  currentConfig: ResourceConfig
): Promise<{ updatedConfig: ResourceConfig; description: string }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are updating an employee's resource configuration based on a voice command.

CURRENT CONFIG:
${JSON.stringify(currentConfig, null, 2)}

VOICE COMMAND:
"${command}"

Return ONLY valid JSON with:
1. The updated config (merge changes with current)
2. A human-readable description of what changed

{
  "updated_config": { <full ResourceConfig with changes applied> },
  "description": "<what changed, e.g., 'Updated Friday hours from 0 to 8'>"
}

Examples:
- "Hunter is working Fridays now" → update fri: 8, recalculate weekly_capacity
- "Don't schedule Hunter for Ailey anymore" → add "Ailey" to project_exclusions
- "Hunter prefers motion work" → add to project_preferences

Return ONLY the JSON object.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    let jsonText = response.text().trim();
    
    // Clean markdown
    if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
    else if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
    if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
    
    const parsed = JSON.parse(jsonText.trim());
    
    return {
      updatedConfig: {
        ...currentConfig,
        ...parsed.updated_config,
        parsed_at: new Date().toISOString()
      },
      description: parsed.description || 'Configuration updated'
    };
  } catch (error) {
    console.error('Failed to parse voice config update:', error);
    return {
      updatedConfig: currentConfig,
      description: 'Failed to parse update'
    };
  }
}
