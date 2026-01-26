/**
 * PTO Event Classification
 * Classifies calendar events as PTO, holiday, partial PTO, etc.
 */

import type { CalendarEvent } from '../../lib/google-calendar';

export interface PtoClassification {
  type: 'pto' | 'holiday' | 'partial_pto' | 'friday_off' | 'none';
  confidence: number;
}

/**
 * Classify an event as PTO, holiday, or none based on config rules
 */
export function classifyEventForPto(
  event: CalendarEvent,
  config: any
): PtoClassification {
  if (!config) {
    // Default classification without config
    const summary = event.summary.toLowerCase();
    if (summary.includes('ooo') || summary.includes('pto') || summary.includes('vacation') || summary.includes('off')) {
      return { type: 'pto', confidence: 0.7 };
    }
    if (summary.includes('holiday')) {
      return { type: 'holiday', confidence: 0.7 };
    }
    return { type: 'none', confidence: 0 };
  }

  let maxScore = 0;
  let detectedType: PtoClassification['type'] = 'none';

  // Check PTO rules
  for (const rule of config.pto_detection?.rules || []) {
    let matches = false;

    if (rule.type === 'event_title_pattern' && rule.pattern) {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        matches = regex.test(event.summary);
      } catch (e) {
        // Invalid regex, skip
      }
    } else if (rule.type === 'all_day_event') {
      matches = event.isAllDay;
    }

    if (matches && (rule.weight || 0.5) > maxScore) {
      maxScore = rule.weight || 0.5;
      detectedType = 'pto';
    }
  }

  // Check holiday rules
  for (const rule of config.holiday_detection?.rules || []) {
    let matches = false;

    if (rule.type === 'event_title_pattern' && rule.pattern) {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        matches = regex.test(event.summary);
      } catch (e) {
        // Invalid regex, skip
      }
    }

    if (matches && (rule.weight || 0.5) > maxScore) {
      maxScore = rule.weight || 0.5;
      detectedType = 'holiday';
    }
  }

  // Check partial day patterns
  for (const pattern of config.partial_day_detection?.patterns || []) {
    try {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(event.summary) && 0.6 > maxScore) {
        maxScore = 0.6;
        detectedType = 'partial_pto';
      }
    } catch (e) {
      // Invalid regex, skip
    }
  }

  // Check recurring schedules (like alternating Fridays)
  for (const schedule of config.recurring_schedules || []) {
    if (schedule.type === 'alternating_day_off' && schedule.pattern) {
      try {
        const regex = new RegExp(schedule.pattern, 'i');
        if (regex.test(event.summary) && 0.8 > maxScore) {
          maxScore = 0.8;
          detectedType = 'friday_off';
        }
      } catch (e) {
        // Invalid regex, skip
      }
    }
  }

  return { type: detectedType, confidence: maxScore };
}
