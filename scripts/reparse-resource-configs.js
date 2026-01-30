"use strict";
/**
 * Bulk re-parse all specialty_notes into resource_config
 *
 * This script processes all users who have specialty_notes but no resource_config
 * and uses Gemini to parse their notes into structured scheduling data.
 *
 * Run with: npx tsx scripts/reparse-resource-configs.ts
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const generative_ai_1 = require("@google/generative-ai");
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
const geminiKey = process.env.GEMINI_API_KEY;
if (!geminiKey) {
    console.error('Missing GEMINI_API_KEY');
    process.exit(1);
}
const genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
const DEFAULT_SCHEDULE = {
    mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0
};
// ============================================================
// GEMINI PARSING (copied from src/api/routes/team.ts)
// ============================================================
async function parseResourceConfigWithGemini(specialtyNotes) {
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
        if (jsonText.startsWith('```json'))
            jsonText = jsonText.slice(7);
        else if (jsonText.startsWith('```'))
            jsonText = jsonText.slice(3);
        if (jsonText.endsWith('```'))
            jsonText = jsonText.slice(0, -3);
        jsonText = jsonText.trim();
        const parsed = JSON.parse(jsonText);
        // Validate hours
        const validateHours = (val, def) => {
            if (typeof val !== 'number')
                return def;
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
    }
    catch (error) {
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
// ============================================================
// MAIN SCRIPT
// ============================================================
async function main() {
    console.log('🔍 Fetching users with specialty_notes...\n');
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, specialty_notes, resource_config')
        .not('specialty_notes', 'is', null)
        .neq('specialty_notes', '')
        .order('name');
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }
    console.log(`Found ${users?.length || 0} users with specialty_notes\n`);
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const customSchedules = [];
    for (const user of users || []) {
        // Check if already parsed
        const existingConfig = user.resource_config;
        if (existingConfig?.parsed_at) {
            console.log(`⏭️  ${user.name} - already parsed (${existingConfig.weekly_capacity}h/wk)`);
            skipped++;
            if (existingConfig.weekly_capacity !== 40) {
                customSchedules.push(`${user.name}: ${existingConfig.weekly_capacity}h/wk`);
            }
            continue;
        }
        console.log(`📝 Parsing ${user.name}...`);
        console.log(`   Notes: "${user.specialty_notes?.substring(0, 80)}..."`);
        try {
            const config = await parseResourceConfigWithGemini(user.specialty_notes);
            const { error: updateError } = await supabase
                .from('users')
                .update({
                resource_config: config,
                updated_at: new Date().toISOString()
            })
                .eq('id', user.id);
            if (updateError) {
                console.error(`   ❌ Error updating ${user.name}:`, updateError.message);
                errors++;
            }
            else {
                const scheduleStr = config.weekly_capacity !== 40
                    ? `${config.weekly_capacity}h/wk (custom)`
                    : '40h/wk (standard)';
                const exclusionsStr = config.project_exclusions.length
                    ? `| exclusions: ${config.project_exclusions.join(', ')}`
                    : '';
                console.log(`   ✅ ${scheduleStr} ${exclusionsStr}`);
                processed++;
                if (config.weekly_capacity !== 40) {
                    customSchedules.push(`${user.name}: ${config.weekly_capacity}h/wk`);
                }
            }
        }
        catch (err) {
            console.error(`   ❌ Parse error for ${user.name}:`, err);
            errors++;
        }
        // Rate limit for Gemini API
        await new Promise(r => setTimeout(r, 500));
    }
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary');
    console.log('='.repeat(50));
    console.log(`✅ Processed: ${processed}`);
    console.log(`⏭️  Skipped (already parsed): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    if (customSchedules.length > 0) {
        console.log('\n👥 Users with custom schedules:');
        customSchedules.forEach(s => console.log(`   • ${s}`));
    }
    console.log('\n✨ Done!');
}
main().catch(console.error);
