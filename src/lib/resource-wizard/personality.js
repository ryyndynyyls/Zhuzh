"use strict";
/**
 * Personality System
 *
 * Adds warmth, acknowledgment, and natural conversation flow.
 * Transforms robotic responses into colleague-like interactions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.severityLanguage = void 0;
exports.selectTone = selectTone;
exports.getAcknowledgment = getAcknowledgment;
exports.getTransition = getTransition;
exports.softError = softError;
exports.celebrate = celebrate;
exports.formatResponse = formatResponse;
exports.generateProactiveOpener = generateProactiveOpener;
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
function selectTone(context) {
    if (context.hasUrgentIssues)
        return 'urgent';
    if (context.isFirstMessage)
        return 'casual';
    return context.recentTone || 'casual';
}
function getAcknowledgment(tone) {
    const options = ACKNOWLEDGMENTS[tone];
    return options[Math.floor(Math.random() * options.length)];
}
function getTransition(type) {
    const options = TRANSITIONS[type];
    return options[Math.floor(Math.random() * options.length)];
}
function softError(thing) {
    const softener = ERROR_SOFTENERS[Math.floor(Math.random() * ERROR_SOFTENERS.length)];
    return `${softener} ${thing}`;
}
function celebrate() {
    return CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)];
}
// Format a response with personality
function formatResponse(options) {
    const parts = [];
    // Lead with acknowledgment for actions
    if (options.type === 'action') {
        parts.push(getAcknowledgment(options.tone));
        parts.push(options.mainMessage);
    }
    else {
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
exports.severityLanguage = {
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
function generateProactiveOpener(insightCount, criticalCount) {
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
