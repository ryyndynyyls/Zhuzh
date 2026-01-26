/**
 * Quick test for Gemini API
 * Run with: npx ts-node src/test-gemini.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { generateCalendarConfig } from './lib/gemini';

async function test() {
  console.log('🧪 Testing Gemini API...\n');
  
  // Check API key exists
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }
  console.log('✅ GEMINI_API_KEY found (starts with:', apiKey.substring(0, 8) + '...)\n');
  
  // Test config generation with UA5's conventions
  const description = `
    - Orange "Office" calendar has all PTO marked as "[Name] OOO"
    - Green "US Holidays" calendar has federal holidays
    - We have alternating Fridays off tracked by invite attendance to "Fridays off" events
    - Half days are marked as "[Name] OOO - half day" or "still reachable via slack"
  `;
  
  console.log('📝 Testing with description:', description.trim());
  console.log('\n⏳ Calling Gemini...\n');
  
  try {
    const config = await generateCalendarConfig(description);
    
    console.log('✅ Config generated!\n');
    console.log('Confidence:', Math.round(config.confidence_score * 100) + '%');
    console.log('\nPTO Rules:', config.pto_detection.rules.length);
    config.pto_detection.rules.forEach((r: any, i: number) => {
      console.log(`  ${i + 1}. ${r.type}: ${r.pattern || r.calendar_name || 'N/A'}`);
    });
    
    console.log('\nHoliday Rules:', config.holiday_detection.rules.length);
    config.holiday_detection.rules.forEach((r: any, i: number) => {
      console.log(`  ${i + 1}. ${r.type}: ${r.pattern || r.calendar_name || 'N/A'}`);
    });
    
    console.log('\nRecurring Schedules:', config.recurring_schedules.length);
    config.recurring_schedules.forEach((s: any, i: number) => {
      console.log(`  ${i + 1}. ${s.name} (${s.type}) - detection: ${s.detection_method || 'event_exists'}`);
    });
    
    console.log('\nShared Calendars:', config.shared_calendars.length);
    config.shared_calendars.forEach((c: any, i: number) => {
      console.log(`  ${i + 1}. ${c.name} → ${c.purpose}`);
    });
    
    if (config.clarification_questions.length > 0) {
      console.log('\n⚠️ Clarification Questions:');
      config.clarification_questions.forEach((q: string, i: number) => {
        console.log(`  ${i + 1}. ${q}`);
      });
    }
    
    console.log('\n🎉 Gemini test passed!');
    
  } catch (err) {
    console.error('❌ Gemini test failed:', err);
    process.exit(1);
  }
}

test();
