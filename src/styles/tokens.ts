/**
 * Zhuzh Design Tokens
 * 
 * Typography: Plus Jakarta Sans + JetBrains Mono
 * Style: Linear-inspired, professional creative agency
 */

// =============================================================================
// BRAND COLORS
// =============================================================================

export const brand = {
  orange: '#FF8731',
  yellow: '#FFF845',
  lime: '#80FF9C',
  cream: '#F7F6E6',
  dark: '#33332F',
} as const;

// =============================================================================
// COLOR SYSTEM
// =============================================================================

export const colors = {
  brand,
  
  dark: {
    bg: {
      primary: '#0F0F0E',
      secondary: '#161614',
      tertiary: '#1D1D1A',
      elevated: '#242420',
      hover: '#2A2A25',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      default: 'rgba(255, 255, 255, 0.10)',
      strong: 'rgba(255, 255, 255, 0.16)',
      focus: brand.orange,
    },
    text: {
      primary: '#F5F5F3',
      secondary: '#A1A19A',
      tertiary: '#6B6B63',
      disabled: '#4A4A44',
      inverse: brand.dark,
    },
    success: {
      bg: 'rgba(128, 255, 156, 0.12)',
      border: 'rgba(128, 255, 156, 0.24)',
      text: '#80FF9C',
    },
    warning: {
      bg: 'rgba(255, 248, 69, 0.12)',
      border: 'rgba(255, 248, 69, 0.24)',
      text: '#FFF845',
    },
    error: {
      bg: 'rgba(255, 107, 107, 0.12)',
      border: 'rgba(255, 107, 107, 0.24)',
      text: '#FF6B6B',
    },
    info: {
      bg: 'rgba(135, 206, 235, 0.12)',
      border: 'rgba(135, 206, 235, 0.24)',
      text: '#87CEEB',
    },
  },

  light: {
    bg: {
      primary: '#FAFAF8',
      secondary: '#FFFFFF',
      tertiary: '#F5F5F2',
      elevated: '#FFFFFF',
      hover: '#F0F0EC',
    },
    border: {
      subtle: 'rgba(51, 51, 47, 0.06)',
      default: 'rgba(51, 51, 47, 0.12)',
      strong: 'rgba(51, 51, 47, 0.20)',
      focus: brand.orange,
    },
    text: {
      primary: '#1A1917',
      secondary: '#6B6B63',
      tertiary: '#9A9A92',
      disabled: '#BDBDB3',
      inverse: '#F5F5F3',
    },
    success: {
      bg: 'rgba(46, 204, 94, 0.10)',
      border: 'rgba(46, 204, 94, 0.24)',
      text: '#1B8A3E',
    },
    warning: {
      bg: 'rgba(255, 193, 7, 0.12)',
      border: 'rgba(255, 193, 7, 0.24)',
      text: '#B86E00',
    },
    error: {
      bg: 'rgba(220, 53, 69, 0.10)',
      border: 'rgba(220, 53, 69, 0.24)',
      text: '#DC3545',
    },
    info: {
      bg: 'rgba(13, 110, 253, 0.10)',
      border: 'rgba(13, 110, 253, 0.24)',
      text: '#0D6EFD',
    },
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  fontFamily: {
    sans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  },
  
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  fontSize: {
    xs: '0.694rem',
    sm: '0.833rem',
    base: '1rem',
    md: '1.2rem',
    lg: '1.44rem',
    xl: '1.728rem',
    '2xl': '2.074rem',
    '3xl': '2.488rem',
    '4xl': '2.986rem',
  },

  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  letterSpacing: {
    tighter: '-0.03em',
    tight: '-0.015em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const radii = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  light: {
    none: 'none',
    xs: '0 1px 2px rgba(51, 51, 47, 0.05)',
    sm: '0 1px 3px rgba(51, 51, 47, 0.08), 0 1px 2px rgba(51, 51, 47, 0.04)',
    md: '0 4px 6px rgba(51, 51, 47, 0.08), 0 2px 4px rgba(51, 51, 47, 0.04)',
    lg: '0 10px 15px rgba(51, 51, 47, 0.08), 0 4px 6px rgba(51, 51, 47, 0.04)',
    xl: '0 20px 25px rgba(51, 51, 47, 0.10), 0 8px 10px rgba(51, 51, 47, 0.04)',
  },
  dark: {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.4)',
    sm: '0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
    md: '0 4px 8px rgba(0, 0, 0, 0.35), 0 2px 4px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 20px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 40px rgba(0, 0, 0, 0.5), 0 8px 16px rgba(0, 0, 0, 0.25)',
  },
  glow: {
    orange: '0 0 20px rgba(255, 135, 49, 0.3)',
    lime: '0 0 20px rgba(128, 255, 156, 0.3)',
    yellow: '0 0 20px rgba(255, 248, 69, 0.3)',
  },
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

export const transitions = {
  duration: {
    instant: '50ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },

  default: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  fast: '100ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 100,
  sticky: 200,
  drawer: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const tokens = {
  brand,
  colors,
  typography,
  spacing,
  radii,
  shadows,
  transitions,
  zIndex,
  breakpoints,
} as const;

export default tokens;
