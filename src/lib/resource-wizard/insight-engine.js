"use strict";
/**
 * Insight Engine
 *
 * Analyzes context to generate proactive insights and recommendations.
 * This is the "brain" that makes Zhuzh intelligent.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInsights = generateInsights;
function generateInsights(context) {
    const insights = [];
    // Run all analysis functions
    insights.push(...analyzeOverallocations(context));
    insights.push(...analyzeUnderutilization(context));
    insights.push(...analyzeBudgetStatus(context));
    insights.push(...analyzeUpcomingPTO(context));
    insights.push(...analyzeCoverageGaps(context));
    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return insights;
}
/**
 * Helper to format week dates nicely
 */
function formatWeekDate(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
/**
 * Analyze over-allocations PER WEEK (not total across all weeks)
 *
 * Previous bug: Was summing ALL allocations across 4 weeks and comparing to 40h,
 * which made everyone look 120h+ over capacity!
 */
function analyzeOverallocations(context) {
    const insights = [];
    const weeklyCapacity = 40;
    for (const user of context.users) {
        // Group allocations by week
        const byWeek = new Map();
        for (const alloc of user.allocations) {
            const current = byWeek.get(alloc.week_start) || 0;
            byWeek.set(alloc.week_start, current + alloc.hours);
        }
        // Check each week individually
        const overallocatedWeeks = [];
        for (const [weekStart, totalHours] of byWeek) {
            if (totalHours > weeklyCapacity) {
                const overage = totalHours - weeklyCapacity;
                overallocatedWeeks.push({ week: weekStart, hours: totalHours, overage });
            }
        }
        // If user has overallocated weeks, create ONE insight summarizing them
        if (overallocatedWeeks.length > 0) {
            const totalOverage = overallocatedWeeks.reduce((sum, w) => sum + w.overage, 0);
            const maxOverage = Math.max(...overallocatedWeeks.map(w => w.overage));
            // Build description
            let description;
            if (overallocatedWeeks.length === 1) {
                const w = overallocatedWeeks[0];
                description = `Week of ${formatWeekDate(w.week)}: ${w.hours}h planned (${w.overage}h over)`;
            }
            else {
                description = `${overallocatedWeeks.length} weeks over capacity. Worst: ${formatWeekDate(overallocatedWeeks[0].week)} at ${overallocatedWeeks[0].hours}h`;
            }
            insights.push({
                type: 'overallocation',
                severity: maxOverage > 8 ? 'critical' : 'warning',
                title: `${user.name} is over capacity`,
                description,
                affected_entities: {
                    users: [{ id: user.id, name: user.name }],
                },
                data: {
                    weeks: overallocatedWeeks,
                    total_overage: totalOverage,
                    max_overage: maxOverage,
                    capacity: weeklyCapacity,
                },
            });
        }
    }
    return insights;
}
/**
 * Analyze under-utilization PER WEEK
 *
 * Only flags users who have significant availability in the CURRENT week
 * (not across all weeks, which would always show everyone as available)
 */
function analyzeUnderutilization(context) {
    const insights = [];
    const utilizationThreshold = 0.5; // Less than 50% utilized
    const currentWeek = context.current_week_start;
    for (const user of context.users) {
        // Skip freelancers (variable capacity)
        if (user.is_freelance)
            continue;
        // Skip users on PTO
        if (user.pto_dates.length > 0)
            continue;
        // Look at current week only
        const currentWeekAllocations = user.allocations.filter(a => a.week_start === currentWeek);
        const currentWeekHours = currentWeekAllocations.reduce((sum, a) => sum + a.hours, 0);
        const utilizationRate = currentWeekHours / user.weekly_capacity;
        if (utilizationRate < utilizationThreshold) {
            const availableHours = user.weekly_capacity - currentWeekHours;
            insights.push({
                type: 'underutilization',
                severity: 'info',
                title: `${user.name} has ${availableHours}h available`,
                description: `This week: ${currentWeekHours}h of ${user.weekly_capacity}h capacity`,
                affected_entities: {
                    users: [{ id: user.id, name: user.name }],
                },
                data: {
                    week: currentWeek,
                    allocated_hours: currentWeekHours,
                    available_hours: availableHours,
                    utilization_rate: Math.round(utilizationRate * 100),
                    role: user.role,
                },
            });
        }
    }
    return insights;
}
function analyzeBudgetStatus(context) {
    const insights = [];
    for (const project of context.projects) {
        if (project.budget_hours === 0)
            continue;
        const burnRate = project.hours_used / project.budget_hours;
        if (burnRate >= 1) {
            insights.push({
                type: 'budget_warning',
                severity: 'critical',
                title: `${project.name} is over budget`,
                description: `${project.hours_used}h used of ${project.budget_hours}h budget (${Math.round(burnRate * 100)}%)`,
                affected_entities: {
                    projects: [{ id: project.id, name: project.name }],
                },
                data: {
                    budget: project.budget_hours,
                    used: project.hours_used,
                    burn_rate: burnRate,
                },
            });
        }
        else if (burnRate >= 0.85) {
            insights.push({
                type: 'budget_warning',
                severity: 'warning',
                title: `${project.name} budget at ${Math.round(burnRate * 100)}%`,
                description: `${project.budget_hours - project.hours_used}h remaining`,
                affected_entities: {
                    projects: [{ id: project.id, name: project.name }],
                },
                data: {
                    budget: project.budget_hours,
                    used: project.hours_used,
                    remaining: project.budget_hours - project.hours_used,
                },
            });
        }
    }
    return insights;
}
function analyzeUpcomingPTO(context) {
    const insights = [];
    // Find users with PTO who have allocations
    for (const user of context.users) {
        if (user.pto_dates.length === 0)
            continue;
        if (user.allocations.length === 0)
            continue;
        const totalPlannedHours = user.allocations.reduce((sum, a) => sum + a.hours, 0);
        if (totalPlannedHours > 0) {
            insights.push({
                type: 'coverage_gap',
                severity: 'warning',
                title: `${user.name} has PTO but ${totalPlannedHours}h planned`,
                description: `PTO: ${user.pto_dates.join(', ')}. Coverage may be needed.`,
                affected_entities: {
                    users: [{ id: user.id, name: user.name }],
                },
                data: {
                    pto_dates: user.pto_dates,
                    planned_hours: totalPlannedHours,
                    projects: user.allocations.map(a => a.project_name),
                },
            });
        }
    }
    return insights;
}
function analyzeCoverageGaps(context) {
    // More sophisticated analysis could go here
    // e.g., projects with no designer, deadlines approaching, etc.
    return [];
}
