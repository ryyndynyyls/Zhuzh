/**
 * Personality System
 *
 * Adds warmth, acknowledgment, and natural conversation flow.
 * Transforms robotic responses into colleague-like interactions.
 */

// Acknowledgment phrases by tone
const ACKNOWLEDGMENTS = {
  casual: ['Got it!', 'On it!', 'Done!', 'You got it!', 'Sure thing!'],
  professional: ['Understood.', 'I\'ll take care of that.', 'Processing now.', 'Confirmed.'],
  urgent: ['Right away.', 'Handling this now.', 'On it immediately.'],
};

// Transition phrases
const TRANSITIONS = {
  addition: ['Also,', 'By the way,', 'While I\'m at it,', 'I should mention,'],
  warning: ['Heads up:', 'Just so you know,', 'One thing to note:', 'Quick flag:'],
  suggestion: ['You might want to', 'Consider', 'A thought:', 'One option:'],
};

// Error softeners
const ERROR_SOFTENERS = [
  'I couldn\'t quite find',
  'I\'m not seeing',
  'Hmm, I don\'t see',
  'I\'m having trouble finding',
];

// Success celebrations (for big actions)
const CELEBRATIONS = [
  '🎉 Done!',
  '✨ All set!',
  '👍 Sorted!',
  '✅ You\'re good to go!',
];

export type Tone = 'casual' | 'professional' | 'urgent';

export function selectTone(context: {
  hasUrgentIssues: boolean;
  isFirstMessage: boolean;
  recentTone?: Tone;
}): Tone {
  if (context.hasUrgentIssues) return 'urgent';
  if (context.isFirstMessage) return 'casual';
  return context.recentTone || 'casual';
}

export function getAcknowledgment(tone: Tone): string {
  const options = ACKNOWLEDGMENTS[tone];
  return options[Math.floor(Math.random() * options.length)];
}

export function getTransition(type: 'addition' | 'warning' | 'suggestion'): string {
  const options = TRANSITIONS[type];
  return options[Math.floor(Math.random() * options.length)];
}

export function softError(thing: string): string {
  const softener = ERROR_SOFTENERS[Math.floor(Math.random() * ERROR_SOFTENERS.length)];
  return `${softener} ${thing}`;
}

export function celebrate(): string {
  return CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)];
}

// Format a response with personality
export function formatResponse(options: {
  tone: Tone;
  type: 'action' | 'query' | 'insight' | 'advisory' | 'error';
  mainMessage: string;
  additionalInfo?: string;
  warnings?: string[];
  suggestions?: string[];
}): string {
  const parts: string[] = [];

  // Lead with acknowledgment for actions
  if (options.type === 'action') {
    parts.push(getAcknowledgment(options.tone));
    parts.push(options.mainMessage);
  } else {
    parts.push(options.mainMessage);
  }

  // Add warnings
  if (options.warnings?.length) {
    parts.push('');
    for (const warning of options.warnings) {
      parts.push(`${getTransition('warning')} ${warning}`);
    }
  }

  // Add suggestions
  if (options.suggestions?.length) {
    parts.push('');
    for (const suggestion of options.suggestions) {
      parts.push(`${getTransition('suggestion')} ${suggestion}`);
    }
  }

  // Add additional info
  if (options.additionalInfo) {
    parts.push('');
    parts.push(options.additionalInfo);
  }

  return parts.join('\n');
}

// Severity language mapping - less alarming, more helpful
export const severityLanguage = {
  critical: {
    prefix: 'Heads up:',
    tone: "There's an issue that needs attention"
  },
  warning: {
    prefix: 'By the way:',
    tone: 'Something to be aware of'
  },
  info: {
    prefix: '',
    tone: ''
  }
};

// Generate proactive opener based on insights
// Now uses softer language that doesn't alarm unnecessarily
export function generateProactiveOpener(insightCount: number, criticalCount: number): string | null {
  if (criticalCount > 0) {
    // Changed from 🚨 "urgent issues" to softer "needs attention"
    return `Heads up: ${criticalCount === 1 ? 'Something needs' : `${criticalCount} things need`} your attention.`;
  }
  if (insightCount >= 3) {
    return `A few things to be aware of:`;
  }
  if (insightCount > 0) {
    return `Quick note:`;
  }
  return null;
}
