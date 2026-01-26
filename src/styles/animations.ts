/**
 * Animation Utilities
 */

import { transitions } from './tokens';

// =============================================================================
// KEYFRAMES INJECTION
// =============================================================================

const keyframeStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

/**
 * Inject animation keyframes into document head
 * Call once in App.tsx
 */
export function injectGlobalKeyframes(): void {
  if (typeof document === 'undefined') return;
  
  const styleId = 'zhuzh-animation-keyframes';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = keyframeStyles;
  document.head.appendChild(style);
}

// =============================================================================
// HOVER PRESETS (SxProps compatible)
// =============================================================================

export const hoverLift = {
  transition: transitions.default,
  '&:hover': {
    transform: 'translateY(-2px)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
};

export const hoverScale = {
  transition: transitions.default,
  '&:hover': {
    transform: 'scale(1.05)',
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
};

export const hoverGlow = (color: string) => ({
  transition: transitions.default,
  '&:hover': {
    boxShadow: `0 0 20px ${color}40`,
  },
});

// =============================================================================
// LOADING STATES
// =============================================================================

export const shimmerStyle = {
  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
};

export const pulseStyle = {
  animation: 'pulse 2s ease-in-out infinite',
};

export const spinnerStyle = {
  animation: 'spin 1s linear infinite',
};

// =============================================================================
// PAGE TRANSITIONS
// =============================================================================

export const pageFadeIn = {
  animation: 'fadeIn 300ms ease-out',
};

export const pageSlideUp = {
  animation: 'fadeInUp 300ms ease-out',
};

// =============================================================================
// STAGGERED ANIMATION HELPERS
// =============================================================================

export function getStaggerDelay(index: number, baseDelay = 50, initialDelay = 0): string {
  return `${initialDelay + index * baseDelay}ms`;
}

export function getStaggeredStyle(
  index: number,
  variant: 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'slideInRight' | 'scaleIn' = 'fadeInUp',
  options: { initialDelay?: number; staggerDelay?: number; duration?: number } = {}
) {
  const { initialDelay = 0, staggerDelay = 50, duration = 300 } = options;
  
  return {
    opacity: 0,
    animation: `${variant} ${duration}ms ease-out forwards`,
    animationDelay: `${initialDelay + index * staggerDelay}ms`,
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const animations = {
  injectGlobalKeyframes,
  hoverLift,
  hoverScale,
  hoverGlow,
  shimmerStyle,
  pulseStyle,
  spinnerStyle,
  pageFadeIn,
  pageSlideUp,
  getStaggerDelay,
  getStaggeredStyle,
};

export default animations;
