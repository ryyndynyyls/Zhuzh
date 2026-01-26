/**
 * Zhuzh Sparkle Component
 * 
 * Animated sparkle for loading states, success feedback, and hover effects.
 * Uses the keyframe animations from brand/tokens/animations.css
 */

import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';

interface ZhuzhSparkleProps {
  /** Size of the sparkle in pixels */
  size?: number;
  /** Color override (defaults to brand orange #FF8731) */
  color?: string;
  /** Animation variant */
  variant?: 'loading' | 'success' | 'hover' | 'static';
  /** Additional MUI sx props */
  sx?: SxProps<Theme>;
}

// The sparkle SVG path (4-point star)
const SPARKLE_PATH = "M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z";

export function ZhuzhSparkle({ 
  size = 24, 
  color = '#FF8731', 
  variant = 'static',
  sx 
}: ZhuzhSparkleProps) {
  const getClassName = () => {
    switch (variant) {
      case 'loading':
        return 'zhuzh-loading-sparkle';
      case 'hover':
        return 'zhuzh-hover-sparkle';
      default:
        return '';
    }
  };

  return (
    <Box
      component="svg"
      className={getClassName()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      sx={{
        fill: color,
        flexShrink: 0,
        ...sx,
      }}
    >
      <path d={SPARKLE_PATH} fill="currentColor" />
    </Box>
  );
}

/**
 * Loading spinner with Zhuzh sparkle
 */
interface ZhuzhLoaderProps {
  /** Optional loading text */
  text?: string;
  /** Size of the sparkle */
  size?: number;
}

export function ZhuzhLoader({ text, size = 24 }: ZhuzhLoaderProps) {
  return (
    <Box className="zhuzh-loading" sx={{ gap: 1 }}>
      <ZhuzhSparkle size={size} variant="loading" />
      {text && (
        <Box component="span" sx={{ color: 'text.secondary', fontSize: 14 }}>
          {text}
        </Box>
      )}
    </Box>
  );
}

/**
 * Success animation - sparkle burst effect
 */
interface ZhuzhSuccessProps {
  /** Show the success animation */
  show: boolean;
  /** Called when animation completes */
  onComplete?: () => void;
}

export function ZhuzhSuccess({ show, onComplete }: ZhuzhSuccessProps) {
  React.useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        pointerEvents: 'none',
        animation: 'zhuzh-success-burst 600ms ease forwards',
        '@keyframes zhuzh-success-burst': {
          '0%': {
            transform: 'translate(-50%, -50%) scale(0)',
            opacity: 0,
          },
          '40%': {
            transform: 'translate(-50%, -50%) scale(1.5)',
            opacity: 1,
          },
          '100%': {
            transform: 'translate(-50%, -50%) scale(2)',
            opacity: 0,
          },
        },
      }}
    >
      <ZhuzhSparkle size={48} color="#80FF9C" />
    </Box>
  );
}

/**
 * Wrapper that adds hover sparkle to children
 */
interface ZhuzhHoverableProps {
  children: React.ReactNode;
  /** Position of the sparkle */
  sparklePosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Sparkle color */
  sparkleColor?: string;
}

export function ZhuzhHoverable({ 
  children, 
  sparklePosition = 'top-right',
  sparkleColor = '#FFF845'
}: ZhuzhHoverableProps) {
  const positionStyles = {
    'top-right': { top: -4, right: -4 },
    'top-left': { top: -4, left: -4 },
    'bottom-right': { bottom: -4, right: -4 },
    'bottom-left': { bottom: -4, left: -4 },
  };

  return (
    <Box className="zhuzh-hoverable" sx={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      <ZhuzhSparkle 
        size={12} 
        color={sparkleColor}
        variant="hover"
        sx={{
          position: 'absolute',
          ...positionStyles[sparklePosition],
        }}
      />
    </Box>
  );
}

export default ZhuzhSparkle;
