/**
 * GlowBorder - Design System Component
 * 
 * Creates a premium "glowing border" effect around modals and cards.
 * The glow color is derived from the entity being displayed:
 * 
 * DESIGN SYSTEM RULES:
 * ────────────────────
 * • Projects     → project.color (user-selected from palette)
 * • Team Members → discipline color, or generated from name
 * • Clients      → client.color (if set), or generated from name  
 * • Voice/AI     → Zhuzh green (#80FF9C)
 * • Alerts       → Severity color (red/yellow/green)
 * • Generic      → Neutral (#4B5563)
 * 
 * ANIMATION:
 * ──────────
 * The glow subtly "breathes" - pulsing between 30% and 60% opacity
 * over 3 seconds. This creates a living, premium feel without being
 * distracting.
 * 
 * USAGE:
 * ──────
 * Wrap any Dialog's PaperProps.sx with glowBorderStyles(color)
 * Or use the <GlowModal> component directly
 */

import { keyframes, SxProps, Theme } from '@mui/material/styles';

// The breathing animation - subtle opacity pulse on the glow
export const glowBreathing = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px 2px var(--glow-color-30),
                0 0 40px 4px var(--glow-color-15),
                inset 0 0 20px 2px var(--glow-color-05);
  }
  50% {
    box-shadow: 0 0 25px 4px var(--glow-color-50),
                0 0 50px 8px var(--glow-color-25),
                inset 0 0 25px 4px var(--glow-color-10);
  }
`;

// More subtle version for less prominent elements
export const glowBreathingSubtle = keyframes`
  0%, 100% {
    box-shadow: 0 0 15px 1px var(--glow-color-20),
                0 0 30px 2px var(--glow-color-10);
  }
  50% {
    box-shadow: 0 0 20px 2px var(--glow-color-35),
                0 0 40px 4px var(--glow-color-15);
  }
`;

// Color-shimmer animation for the border itself
export const borderShimmer = keyframes`
  0%, 100% {
    border-color: var(--glow-color);
  }
  50% {
    border-color: var(--glow-color-bright);
  }
`;

/**
 * Generates CSS custom properties for a given color
 * These are used by the keyframe animations
 */
function colorToCustomProperties(color: string): Record<string, string> {
  return {
    '--glow-color': color,
    '--glow-color-bright': adjustBrightness(color, 1.2),
    '--glow-color-50': `${color}80`, // 50% opacity
    '--glow-color-35': `${color}59`, // 35% opacity
    '--glow-color-30': `${color}4D`, // 30% opacity
    '--glow-color-25': `${color}40`, // 25% opacity
    '--glow-color-20': `${color}33`, // 20% opacity
    '--glow-color-15': `${color}26`, // 15% opacity
    '--glow-color-10': `${color}1A`, // 10% opacity
    '--glow-color-05': `${color}0D`, // 5% opacity
  };
}

/**
 * Adjusts brightness of a hex color
 */
function adjustBrightness(hex: string, factor: number): string {
  // Remove # if present
  const color = hex.replace('#', '');
  
  // Parse RGB
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  
  // Adjust and clamp
  const newR = Math.min(255, Math.round(r * factor));
  const newG = Math.min(255, Math.round(g * factor));
  const newB = Math.min(255, Math.round(b * factor));
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Main function to generate glow border styles for Dialog PaperProps
 * 
 * @param color - The accent color for this entity
 * @param options - Configuration options
 * @returns SxProps to spread into PaperProps.sx
 */
export function glowBorderStyles(
  color: string,
  options: {
    intensity?: 'subtle' | 'normal' | 'strong';
    animated?: boolean;
    borderWidth?: number;
    borderRadius?: number;
  } = {}
): SxProps<Theme> {
  const {
    intensity = 'normal',
    animated = true,
    borderWidth = 2,
    borderRadius = 3,
  } = options;

  const animationName = intensity === 'subtle' ? glowBreathingSubtle : glowBreathing;
  const animationDuration = intensity === 'strong' ? '2s' : '3s';

  return {
    ...colorToCustomProperties(color),
    bgcolor: '#1E1D1B',
    borderRadius,
    border: `${borderWidth}px solid ${color}`,
    overflow: 'hidden',
    ...(animated && {
      animation: `${animationName} ${animationDuration} ease-in-out infinite, ${borderShimmer} 4s ease-in-out infinite`,
    }),
    // Static glow for non-animated or as base
    boxShadow: `0 0 20px 2px ${color}4D, 0 0 40px 4px ${color}26`,
  };
}

/**
 * Simpler version - just the border color, no glow animation
 * Use for smaller elements like cards, chips, etc.
 */
export function accentBorderStyles(
  color: string,
  borderWidth: number = 2
): SxProps<Theme> {
  return {
    border: `${borderWidth}px solid ${color}`,
    borderRadius: 2,
  };
}

/**
 * Gradient header styles for entity detail modals
 * Creates a gradient fill using the accent color with proper text styling
 */
export function gradientHeaderStyles(
  color: string,
  options: {
    padding?: number;
    minHeight?: number;
  } = {}
): SxProps<Theme> {
  const { padding = 2.5, minHeight } = options;

  return {
    background: `linear-gradient(135deg, ${color} 0%, ${color}99 50%, ${color}77 100%)`,
    p: padding,
    position: 'relative',
    ...(minHeight && { minHeight }),
    // Text on gradient should be white by default
    '& .MuiTypography-root': {
      color: 'white',
    },
  };
}

/**
 * Icon button styles for use on gradient headers
 * Semi-transparent white that brightens on hover
 */
export function headerIconButtonStyles(
  position: 'close' | 'action' = 'close',
  darkText: boolean = false
): SxProps<Theme> {
  const baseColor = darkText ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
  const hoverColor = darkText ? '#000' : '#fff';
  const hoverBg = darkText ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.2)';

  return {
    position: 'absolute',
    top: 8,
    right: position === 'close' ? 8 : 40,
    color: baseColor,
    '&:hover': {
      color: hoverColor,
      bgcolor: hoverBg,
    },
  };
}

/**
 * Left accent bar (like allocation rows)
 */
export function leftAccentStyles(color: string, width: number = 3): SxProps<Theme> {
  return {
    borderLeft: `${width}px solid ${color}`,
    borderRadius: 1,
  };
}

// ═══════════════════════════════════════════════════════════
// DESIGN SYSTEM COLOR CONSTANTS
// ═══════════════════════════════════════════════════════════

export const GLOW_COLORS = {
  // Entity types
  zhuzh: '#80FF9C',      // AI/Voice - the signature Zhuzh green
  success: '#80FF9C',    // Success states
  warning: '#FFF845',    // Warning states
  error: '#FF6B6B',      // Error/critical states
  info: '#45B7D1',       // Informational
  neutral: '#4B5563',    // Generic/default
  
  // Discipline colors (for team members without explicit colors)
  designer: '#4ECDC4',
  developer: '#45B7D1',
  producer: '#F7DC6F',
  strategy: '#BB8FCE',
  
  // Project palette (the 10 colors users can choose)
  projectPalette: [
    '#4285F4', // Blue
    '#FF6B6B', // Red/Coral
    '#F7DC6F', // Yellow
    '#80FF9C', // Green
    '#FF8A65', // Orange
    '#45B7D1', // Cyan
    '#BB8FCE', // Purple
    '#F48FB1', // Pink
    '#00CED1', // Teal
    '#9E9E9E', // Gray
  ],
} as const;

/**
 * Get the appropriate glow color for an entity type
 */
export function getEntityGlowColor(
  entityType: 'project' | 'user' | 'client' | 'voice' | 'alert',
  entityColor?: string | null,
  fallback?: string
): string {
  // If explicit color provided, use it
  if (entityColor) return entityColor;
  
  // Entity-specific defaults
  switch (entityType) {
    case 'voice':
      return GLOW_COLORS.zhuzh;
    case 'alert':
      return GLOW_COLORS.warning;
    default:
      return fallback || GLOW_COLORS.neutral;
  }
}
