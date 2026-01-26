/**
 * Discipline Colors
 * Consistent colors for team disciplines across the app
 */

export const DISCIPLINE_COLORS: Record<string, string> = {
  // Core disciplines
  'Designer': '#4ECDC4',      // Teal
  'Developer': '#9B8BF4',     // Purple/Lavender
  'ProStrat': '#F4D03F',      // Gold/Yellow
  
  // Variations that might appear in data
  'Design': '#4ECDC4',
  'Development': '#9B8BF4',
  'Engineering': '#9B8BF4',
  'Strategy': '#F4D03F',
  'Production': '#F4D03F',
  'Producer': '#F4D03F',
  
  // Fallback
  'Other': '#9CA3AF',
};

// Order for display (grouped sections)
export const DISCIPLINE_ORDER = ['Designer', 'Developer', 'ProStrat', 'Other'];

/**
 * Get color for a discipline with fallback
 */
export function getDisciplineColor(discipline: string | null | undefined): string {
  if (!discipline) return DISCIPLINE_COLORS['Other'];
  
  // Try exact match first
  if (DISCIPLINE_COLORS[discipline]) {
    return DISCIPLINE_COLORS[discipline];
  }
  
  // Try case-insensitive partial match
  const lowerDisc = discipline.toLowerCase();
  if (lowerDisc.includes('design')) return DISCIPLINE_COLORS['Designer'];
  if (lowerDisc.includes('develop') || lowerDisc.includes('engineer')) return DISCIPLINE_COLORS['Developer'];
  if (lowerDisc.includes('strat') || lowerDisc.includes('produc')) return DISCIPLINE_COLORS['ProStrat'];
  
  return DISCIPLINE_COLORS['Other'];
}

/**
 * Normalize discipline name for grouping
 */
export function normalizeDiscipline(discipline: string | null | undefined): string {
  if (!discipline) return 'Other';
  
  const lowerDisc = discipline.toLowerCase();
  if (lowerDisc.includes('design')) return 'Designer';
  if (lowerDisc.includes('develop') || lowerDisc.includes('engineer')) return 'Developer';
  if (lowerDisc.includes('strat') || lowerDisc.includes('produc')) return 'ProStrat';
  
  return 'Other';
}
