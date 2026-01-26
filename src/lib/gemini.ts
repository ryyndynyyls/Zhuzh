/**
 * Gemini AI Integration
 * 
 * Analyzes admin descriptions and calendar screenshots
 * to generate organization-specific detection config
 */

import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';

// Types
export interface PTODetectionRule {
  type: 'event_title_pattern' | 'all_day_event' | 'calendar_source' | 'google_ooo_flag';
  pattern?: string;
  calendar_name?: string;
  weight: number;
}

export interface HolidayDetectionRule {
  type: 'calendar_source' | 'event_title_pattern';
  calendar_name?: string;
  pattern?: string;
  weight: number;
}

export interface RecurringSchedule {
  name: string;
  type: 'alternating_day_off' | 'seasonal_half_day' | 'weekly_off';
  day?: string;
  pattern?: string;
  months?: number[];
  detection_method?: 'event_exists' | 'invite_attendance' | 'calendar_source';
}

export interface CalendarConfig {
  pto_detection: {
    rules: PTODetectionRule[];
  };
  holiday_detection: {
    rules: HolidayDetectionRule[];
  };
  partial_day_detection: {
    patterns: string[];
    default_hours_deducted: number;
  };
  recurring_schedules: RecurringSchedule[];
  shared_calendars: {
    name: string;
    purpose: 'pto_source' | 'holiday_source' | 'company_events';
  }[];
  confidence_score: number;
  clarification_questions: string[];
}

// Initialize Gemini client
function getGeminiModel(): GenerativeModel {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  // Use gemini-2.0-flash (the current fast model) or gemini-1.5-pro as fallback
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

/**
 * Convert base64 image to Gemini Part
 */
function imageToGenerativePart(base64Data: string, mimeType: string): Part {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
}

/**
 * Analyze calendar screenshot using vision
 */
export async function analyzeCalendarScreenshot(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<{
  calendars_detected: { color: string; apparent_purpose: string }[];
  pto_patterns: string[];
  holiday_events: string[];
  other_observations: string[];
}> {
  const model = getGeminiModel();
  
  const prompt = `Analyze this Google Calendar screenshot. Identify:

1. Different calendar colors visible and what each seems to be used for
2. Any PTO/OOO/vacation events (note the exact format used)
3. Holiday events
4. Any patterns in how events are named

Output as JSON:
{
  "calendars_detected": [
    { "color": "orange", "apparent_purpose": "Office/PTO calendar" },
    { "color": "green", "apparent_purpose": "Federal holidays" }
  ],
  "pto_patterns": ["Name OOO", "Name OOO - still reachable"],
  "holiday_events": ["Christmas Eve", "Christmas Day"],
  "other_observations": ["Fridays off events suggest alternating schedule"]
}

Return ONLY the JSON, no markdown formatting.`;

  const imagePart = imageToGenerativePart(imageBase64, mimeType);
  
  const result = await model.generateContent([prompt, imagePart]);
  const response = result.response;
  const text = response.text();
  
  try {
    // Clean up any markdown formatting
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse Gemini response:', text);
    throw new Error('Failed to parse calendar analysis');
  }
}

/**
 * Generate calendar detection config from admin description
 */
export async function generateCalendarConfig(
  adminDescription: string,
  screenshotAnalysis?: {
    calendars_detected: { color: string; apparent_purpose: string }[];
    pto_patterns: string[];
    holiday_events: string[];
    other_observations: string[];
  }
): Promise<CalendarConfig> {
  const model = getGeminiModel();
  
  const contextFromScreenshot = screenshotAnalysis 
    ? `

Screenshot analysis found:
- Calendars: ${screenshotAnalysis.calendars_detected.map(c => `${c.color} (${c.apparent_purpose})`).join(', ')}
- PTO patterns: ${screenshotAnalysis.pto_patterns.join(', ')}
- Holidays: ${screenshotAnalysis.holiday_events.join(', ')}
- Other: ${screenshotAnalysis.other_observations.join('; ')}
`
    : '';

  const prompt = `You are configuring a time tracking system's calendar integration for a creative agency.

The admin described their calendar setup as:
"${adminDescription}"
${contextFromScreenshot}

Generate a JSON configuration for detecting:
1. PTO/vacation days (full days off)
2. Holiday sources
3. Partial day events
4. Recurring schedules (like alternating Fridays off)
5. Which shared calendars to monitor

Output format:
{
  "pto_detection": {
    "rules": [
      { "type": "event_title_pattern", "pattern": "(?i)(\\\\w+)\\\\s+OOO", "weight": 0.95 },
      { "type": "calendar_source", "calendar_name": "Office", "weight": 0.9 },
      { "type": "all_day_event", "weight": 0.5 }
    ]
  },
  "holiday_detection": {
    "rules": [
      { "type": "calendar_source", "calendar_name": "US Holidays", "weight": 1.0 },
      { "type": "event_title_pattern", "pattern": "(?i)office closed", "weight": 0.9 }
    ]
  },
  "partial_day_detection": {
    "patterns": ["(?i)half day", "(?i)leaving early"],
    "default_hours_deducted": 4
  },
  "recurring_schedules": [
    { "name": "Alternating Fridays", "type": "alternating_day_off", "day": "friday", "pattern": "(?i)friday(s)?\\\\s+off" }
  ],
  "shared_calendars": [
    { "name": "Office", "purpose": "pto_source" },
    { "name": "US Holidays", "purpose": "holiday_source" }
  ],
  "confidence_score": 0.85,
  "clarification_questions": []
}

Rules:
- Patterns should be regex (escape backslashes for JSON)
- Weight is 0.0-1.0 indicating confidence
- Add clarification_questions if something is ambiguous
- Be specific to their described conventions
- If they mention colors (like "orange calendar"), map to calendar names
- If they mention "alternating Fridays" or "Fridays off", add a recurring_schedule with type "alternating_day_off"
- If Fridays off are tracked by calendar invite attendance, set detection_method to "invite_attendance"
- For invite-based detection, add a rule to check if user is an attendee (not just if event exists)

Example recurring_schedules for alternating Fridays:
"recurring_schedules": [
  {
    "name": "Alternating Fridays",
    "type": "alternating_day_off",
    "day": "friday",
    "pattern": "(?i)friday(s)?\\\\s+off",
    "detection_method": "invite_attendance"
  }
]

Return ONLY the JSON, no markdown formatting.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse Gemini config response:', text);
    throw new Error('Failed to generate calendar configuration');
  }
}

/**
 * Generate follow-up clarification questions
 */
export async function generateClarificationQuestions(
  adminDescription: string,
  currentConfig: CalendarConfig
): Promise<string[]> {
  const model = getGeminiModel();
  
  const prompt = `A time tracking system needs clarification about this agency's calendar setup.

Admin's description:
"${adminDescription}"

Current detection config (partial):
${JSON.stringify(currentConfig, null, 2)}

Areas where we're uncertain:
- confidence_score is ${currentConfig.confidence_score}
- ${currentConfig.clarification_questions.length > 0 ? 'Already flagged: ' + currentConfig.clarification_questions.join(', ') : 'No questions flagged yet'}

Generate 2-4 specific, actionable questions to clarify ambiguities. Focus on:
1. Which calendars contain PTO vs holidays
2. How to distinguish partial days from full days off
3. Any recurring schedule patterns
4. What event titles indicate availability vs unavailability

Output as a JSON array of strings:
["Question 1?", "Question 2?"]

Return ONLY the JSON array, no markdown formatting.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse clarification questions:', text);
    return [];
  }
}

/**
 * Apply detection rules to an event and classify it
 */
export function classifyEvent(
  event: { summary: string; isAllDay: boolean; calendarName: string },
  config: CalendarConfig
): { type: 'pto' | 'holiday' | 'partial_pto' | 'meeting' | 'unknown'; confidence: number } {
  let maxScore = 0;
  let detectedType: 'pto' | 'holiday' | 'partial_pto' | 'meeting' | 'unknown' = 'unknown';
  
  // Check PTO rules
  for (const rule of config.pto_detection.rules) {
    let matches = false;
    
    if (rule.type === 'event_title_pattern' && rule.pattern) {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        matches = regex.test(event.summary);
      } catch (e) {
        console.warn('Invalid regex pattern:', rule.pattern);
      }
    } else if (rule.type === 'calendar_source' && rule.calendar_name) {
      matches = event.calendarName.toLowerCase().includes(rule.calendar_name.toLowerCase());
    } else if (rule.type === 'all_day_event') {
      matches = event.isAllDay;
    }
    
    if (matches && rule.weight > maxScore) {
      maxScore = rule.weight;
      detectedType = 'pto';
    }
  }
  
  // Check holiday rules
  for (const rule of config.holiday_detection.rules) {
    let matches = false;
    
    if (rule.type === 'calendar_source' && rule.calendar_name) {
      matches = event.calendarName.toLowerCase().includes(rule.calendar_name.toLowerCase());
    } else if (rule.type === 'event_title_pattern' && rule.pattern) {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        matches = regex.test(event.summary);
      } catch (e) {
        console.warn('Invalid regex pattern:', rule.pattern);
      }
    }
    
    if (matches && rule.weight > maxScore) {
      maxScore = rule.weight;
      detectedType = 'holiday';
    }
  }
  
  // Check partial day patterns
  for (const pattern of config.partial_day_detection.patterns) {
    try {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(event.summary)) {
        if (0.7 > maxScore) { // Partial day has lower default weight
          maxScore = 0.7;
          detectedType = 'partial_pto';
        }
      }
    } catch (e) {
      console.warn('Invalid regex pattern:', pattern);
    }
  }
  
  // If no detection, it's probably a meeting
  if (detectedType === 'unknown' && !event.isAllDay) {
    detectedType = 'meeting';
    maxScore = 0.5;
  }
  
  return { type: detectedType, confidence: maxScore };
}
