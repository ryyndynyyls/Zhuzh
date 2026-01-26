/**
 * Advisory Engine
 *
 * Provides strategic recommendations for resource decisions.
 * Evaluates multiple factors and explains reasoning.
 */

import type { ResourceWizardContext, AdvisoryResponse, WizardUser, WizardProject, ActionCall } from './types';

interface AdvisoryRequest {
  action: 'add' | 'move' | 'remove';
  user_id: string;
  project_id: string;
  hours: number;
  week_start: string;
}

export function evaluateAdvisory(
  request: AdvisoryRequest,
  context: ResourceWizardContext
): AdvisoryResponse {
  const factors: AdvisoryResponse['factors_considered'] = [];

  const user = context.users.find(u => u.id === request.user_id);
  const project = context.projects.find(p => p.id === request.project_id);

  if (!user || !project) {
    return {
      recommendation: 'avoid',
      reasoning: ['Could not find the specified user or project.'],
      factors_considered: [],
    };
  }

  // Factor 1: Capacity
  const currentLoad = user.allocations.reduce((sum, a) => sum + a.hours, 0);
  const newLoad = currentLoad + request.hours;
  const capacityUsed = newLoad / user.weekly_capacity;

  factors.push({
    factor: 'User Capacity',
    assessment: capacityUsed > 1 ? 'negative' : capacityUsed > 0.9 ? 'neutral' : 'positive',
    detail: `${user.name} would be at ${Math.round(capacityUsed * 100)}% capacity (${newLoad}h)`,
  });

  // Factor 2: Project Budget
  if (project.budget_hours > 0) {
    const budgetRemaining = project.budget_hours - project.hours_used;
    factors.push({
      factor: 'Project Budget',
      assessment: budgetRemaining < request.hours ? 'negative' : budgetRemaining < request.hours * 2 ? 'neutral' : 'positive',
      detail: `${project.name} has ${budgetRemaining}h budget remaining`,
    });
  }

  // Factor 3: PTO Conflicts
  if (user.pto_dates.length > 0) {
    factors.push({
      factor: 'PTO Conflicts',
      assessment: 'negative',
      detail: `${user.name} has PTO scheduled: ${user.pto_dates.join(', ')}`,
    });
  } else {
    factors.push({
      factor: 'Availability',
      assessment: 'positive',
      detail: `No PTO conflicts for ${user.name}`,
    });
  }

  // Factor 4: Role Match (if we have specialty info)
  if (user.specialty_notes) {
    const isGoodMatch = assessRoleMatch(user, project);
    factors.push({
      factor: 'Skill Match',
      assessment: isGoodMatch ? 'positive' : 'neutral',
      detail: isGoodMatch
        ? `${user.name}'s skills align with this project`
        : `Consider whether ${user.name}'s skills match project needs`,
    });
  }

  // Calculate recommendation
  const negatives = factors.filter(f => f.assessment === 'negative').length;
  const positives = factors.filter(f => f.assessment === 'positive').length;

  let recommendation: AdvisoryResponse['recommendation'];
  let reasoning: string[] = [];

  if (negatives >= 2) {
    recommendation = 'avoid';
    reasoning = [
      'Multiple concerns identified with this allocation.',
      ...factors.filter(f => f.assessment === 'negative').map(f => f.detail),
    ];
  } else if (negatives === 1) {
    recommendation = 'caution';
    reasoning = [
      'This allocation is possible but has some concerns.',
      ...factors.filter(f => f.assessment === 'negative').map(f => `⚠️ ${f.detail}`),
    ];
  } else {
    recommendation = 'proceed';
    reasoning = [
      'This looks like a good allocation.',
      ...factors.filter(f => f.assessment === 'positive').map(f => `✓ ${f.detail}`),
    ];
  }

  // Suggest alternatives if not proceeding
  const alternatives = recommendation !== 'proceed'
    ? findAlternatives(request, context)
    : undefined;

  return {
    recommendation,
    reasoning,
    factors_considered: factors,
    alternative_suggestions: alternatives,
  };
}

function assessRoleMatch(user: WizardUser, project: WizardProject): boolean {
  // Simple heuristic - could be much smarter
  const specialty = user.specialty_notes?.toLowerCase() || '';
  const projectName = project.name.toLowerCase();

  // Very basic matching
  if (specialty.includes('design') && projectName.includes('design')) return true;
  if (specialty.includes('develop') && (projectName.includes('dev') || projectName.includes('build'))) return true;

  return true; // Default to good match if we can't determine
}

function findAlternatives(
  request: AdvisoryRequest,
  context: ResourceWizardContext
): AdvisoryResponse['alternative_suggestions'] {
  // Find users with similar roles who have availability
  const targetUser = context.users.find(u => u.id === request.user_id);
  if (!targetUser) return undefined;

  const alternatives: AdvisoryResponse['alternative_suggestions'] = [];

  for (const user of context.users) {
    if (user.id === request.user_id) continue;
    if (user.role !== targetUser.role) continue;

    const load = user.allocations.reduce((sum, a) => sum + a.hours, 0);
    const available = user.weekly_capacity - load;

    if (available >= request.hours && user.pto_dates.length === 0) {
      alternatives.push({
        description: `Assign to ${user.name} instead (${available}h available)`,
        actions: [{
          tool: 'add_allocation',
          params: {
            user_id: user.id,
            project_id: request.project_id,
            hours: request.hours,
            week_start: request.week_start,
          },
          description: `Add ${request.hours}h for ${user.name}`,
        } as ActionCall],
      });
    }
  }

  return alternatives.length > 0 ? alternatives.slice(0, 3) : undefined;
}

export type { AdvisoryRequest };
