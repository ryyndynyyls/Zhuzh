/**
 * GlowCard - A Paper wrapper with the entity-colored glow effect
 * 
 * Use this for card-like containers within pages (not modals).
 * For modals, use glowBorderStyles() directly on Dialog PaperProps.
 * 
 * DESIGN SYSTEM USAGE:
 * ────────────────────
 * • Primary card (main content)  → intensity: 'normal', animated: true
 * • Secondary cards              → intensity: 'subtle', animated: false
 * • Hover-only glow              → animated: false (uses CSS :hover)
 */

import React from 'react';
import { Paper, PaperProps, Box, Typography, SxProps, Theme } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';

// Subtle breathing animation for cards (less intense than modals)
const cardGlowBreathing = keyframes`
  0%, 100% {
    box-shadow: 0 0 15px 1px var(--glow-color-20),
                0 0 30px 2px var(--glow-color-10);
  }
  50% {
    box-shadow: 0 0 20px 2px var(--glow-color-30),
                0 0 40px 3px var(--glow-color-15);
  }
`;

// Border shimmer
const borderShimmer = keyframes`
  0%, 100% {
    border-color: var(--glow-color);
  }
  50% {
    border-color: var(--glow-color-bright);
  }
`;

interface GlowCardProps extends Omit<PaperProps, 'elevation'> {
  /** The accent color for the glow effect */
  glowColor: string;
  /** How prominent should the glow be */
  intensity?: 'subtle' | 'normal' | 'strong';
  /** Whether to animate the glow */
  animated?: boolean;
  /** Show header bar with icon and title */
  header?: {
    icon?: React.ReactNode;
    title: string;
  };
  children: React.ReactNode;
}

/**
 * Generates CSS custom properties for the glow color
 */
function colorToCustomProps(color: string): Record<string, string> {
  // Adjust brightness for the "bright" variant
  const brighten = (hex: string, factor: number): string => {
    const c = hex.replace('#', '');
    const r = Math.min(255, Math.round(parseInt(c.slice(0, 2), 16) * factor));
    const g = Math.min(255, Math.round(parseInt(c.slice(2, 4), 16) * factor));
    const b = Math.min(255, Math.round(parseInt(c.slice(4, 6), 16) * factor));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  return {
    '--glow-color': color,
    '--glow-color-bright': brighten(color, 1.2),
    '--glow-color-30': `${color}4D`,
    '--glow-color-20': `${color}33`,
    '--glow-color-15': `${color}26`,
    '--glow-color-10': `${color}1A`,
  };
}

export const GlowCard: React.FC<GlowCardProps> = ({
  glowColor,
  intensity = 'subtle',
  animated = false,
  header,
  children,
  sx,
  ...paperProps
}) => {
  const animationDuration = intensity === 'strong' ? '2s' : '3.5s';
  
  // Border width based on intensity
  const borderWidth = intensity === 'strong' ? 2 : intensity === 'normal' ? 1.5 : 1;

  return (
    <Paper
      elevation={0}
      {...paperProps}
      sx={{
        ...colorToCustomProps(glowColor),
        bgcolor: '#1E1D1B',
        border: `${borderWidth}px solid ${glowColor}`,
        borderRadius: 3,
        overflow: 'hidden',
        // Static glow
        boxShadow: `0 0 15px 1px ${glowColor}20, 0 0 30px 2px ${glowColor}10`,
        // Animated glow if enabled
        ...(animated && {
          animation: `${cardGlowBreathing} ${animationDuration} ease-in-out infinite, ${borderShimmer} 4s ease-in-out infinite`,
        }),
        // Hover effect when not animated
        ...(!animated && {
          transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
          '&:hover': {
            boxShadow: `0 0 20px 2px ${glowColor}30, 0 0 40px 3px ${glowColor}15`,
            borderColor: `var(--glow-color-bright)`,
          },
        }),
        ...sx,
      }}
    >
      {/* Optional header */}
      {header && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 2.5,
            pb: 2,
            borderBottom: `1px solid ${glowColor}22`,
          }}
        >
          {header.icon && (
            <Box sx={{ color: glowColor, display: 'flex', alignItems: 'center' }}>
              {header.icon}
            </Box>
          )}
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {header.title}
          </Typography>
        </Box>
      )}
      
      {/* Content */}
      <Box sx={{ p: header ? 2.5 : 3, pt: header ? 2 : 3 }}>
        {children}
      </Box>
    </Paper>
  );
};

/**
 * Styled Paper with hover-only glow effect
 * Use this for interactive cards that glow on hover
 */
export const HoverGlowPaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'glowColor',
})<{ glowColor: string }>(({ glowColor }) => ({
  backgroundColor: '#1E1D1B',
  border: `1px solid #374151`,
  borderRadius: 12,
  transition: 'all 0.3s ease',
  '&:hover': {
    borderColor: glowColor,
    boxShadow: `0 0 20px 2px ${glowColor}30, 0 0 40px 3px ${glowColor}15`,
  },
}));

export default GlowCard;
