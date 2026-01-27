"use strict";
/**
 * Request Classifier
 *
 * Determines the category of incoming requests to route to appropriate handlers.
 * Uses pattern matching + Gemini for ambiguous cases.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyRequest = classifyRequest;
// Pattern definitions for each category
const ACTION_PATTERNS = [
    /\b(add|remove|move|assign|unassign|allocate|delete)\b/i,
    /\b(\d+)\s*h(ours?)?\b/i, // Contains hours
];
const QUERY_PATTERNS = [
    /\b(show|display|list|get|what(?:'s| is|'re| are))\b/i,
    /\bwho(?:'s| is)\s+(on|available|working|assigned)\b/i,
    /\bhow\s+many\b/i,
];
const INSIGHT_PATTERNS = [
    /\bhow(?:'s| is)\s+(?:the\s+)?team\b/i,
    /\b(overview|summary|analysis|breakdown)\b/i,
    /\b(looking|doing|going)\b.*\?$/i, // "How's X looking?"
    /\bany\s+(issues?|problems?|concerns?|risks?)\b/i,
];
const ADVISORY_PATTERNS = [
    /\bshould\s+(?:I|we)\b/i,
    /\bwould\s+(?:it|you)\s+recommend\b/i,
    /\bgood\s+idea\b/i,
    /\bmake\s+sense\b/i,
    /\bwhat\s+do\s+you\s+think\b/i,
];
function classifyRequest(text) {
    // Score each category
    const scores = {
        action: scorePatterns(text, ACTION_PATTERNS),
        query: scorePatterns(text, QUERY_PATTERNS),
        insight: scorePatterns(text, INSIGHT_PATTERNS),
        advisory: scorePatterns(text, ADVISORY_PATTERNS),
    };
    // Find highest scoring category
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [category, confidence] = sorted[0];
    // Extract entities
    const entities = extractEntities(text);
    return {
        category: category,
        confidence,
        original_text: text,
        extracted_entities: entities,
    };
}
function scorePatterns(text, patterns) {
    let score = 0;
    for (const pattern of patterns) {
        if (pattern.test(text))
            score += 1;
    }
    return score / patterns.length;
}
function extractEntities(text) {
    // Extract time references
    const timeMatch = text.match(/\b(this|next)\s+week\b/i);
    const hoursMatch = text.match(/\b(\d+(?:\.\d+)?)\s*h(?:ours?)?\b/i);
    return {
        timeframe: timeMatch ? timeMatch[0] : undefined,
        hours: hoursMatch ? parseFloat(hoursMatch[1]) : undefined,
        // Users and projects extracted via context matching later
    };
}
