/**
 * ZhuzhPageLoader - Full page loading animation
 * 
 * Animation types:
 * - Y-axis (dreidel): Diamond rotates like a spinning top, edge-on view
 *   Used for: Full page loads, section loads
 * 
 * - Z-axis (2D wheel): Diamond spins flat in plane of screen, all 4 points visible
 *   North → East → South → West with deceleration like a roulette wheel
 *   Used for: Inline loaders, small modules, cards
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

// The sparkle/diamond SVG path (4-point star)
const DIAMOND_PATH = "M12 0C12 8.28427 8.28427 12 0 12C8.28427 12 12 15.7157 12 24C12 15.7157 15.7157 12 24 12C15.7157 12 12 8.28427 12 0Z";

// =============================================================================
// FULL PAGE LOADER (Y-axis spin - dreidel effect)
// =============================================================================

interface ZhuzhPageLoaderProps {
  /** Optional loading message */
  message?: string;
  /** Size of the diamond in pixels */
  size?: number;
  /** Show the loader */
  show?: boolean;
  /** Minimum time to show loader (ms) - allows animation to complete gracefully */
  minDisplayTime?: number;
}

export function ZhuzhPageLoader({ 
  message = 'Loading...', 
  size = 64,
  show = true,
  minDisplayTime = 800,
}: ZhuzhPageLoaderProps) {
  const [visible, setVisible] = useState(show);
  const [fading, setFading] = useState(false);
  const [showStart] = useState(Date.now());

  useEffect(() => {
    if (!show && visible) {
      const elapsed = Date.now() - showStart;
      const remaining = Math.max(0, minDisplayTime - elapsed);
      
      const fadeTimer = setTimeout(() => {
        setFading(true);
        setTimeout(() => setVisible(false), 300);
      }, remaining);

      return () => clearTimeout(fadeTimer);
    } else if (show && !visible) {
      setVisible(true);
      setFading(false);
    }
  }, [show, visible, showStart, minDisplayTime]);

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(15, 15, 14, 0.97)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        gap: 3,
        opacity: fading ? 0 : 1,
        transition: 'opacity 300ms ease-out',
      }}
    >
      <Box sx={{ perspective: '500px', perspectiveOrigin: 'center center' }}>
        <Box
          component="svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          sx={{
            transformStyle: 'preserve-3d',
            animation: 'spinDecelerate 1.8s cubic-bezier(0.12, 0.8, 0.32, 1) infinite',
            filter: 'drop-shadow(0 0 20px rgba(255, 135, 49, 0.4))',
            '@keyframes spinDecelerate': {
              '0%': { transform: 'rotateY(0deg)' },
              '100%': { transform: 'rotateY(720deg)' },
            },
          }}
        >
          <defs>
            <linearGradient id="diamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#FFB380" />
              <stop offset="65%" stopColor="#FF8731" />
              <stop offset="100%" stopColor="#FF6B00" />
            </linearGradient>
          </defs>
          <path d={DIAMOND_PATH} fill="url(#diamondGradient)" />
        </Box>
      </Box>

      {message && (
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontWeight: 500,
            letterSpacing: '0.05em',
            animation: 'fadeInOut 1.8s ease-in-out infinite',
            '@keyframes fadeInOut': {
              '0%, 100%': { opacity: 0.4 },
              '50%': { opacity: 0.8 },
            },
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
}

// =============================================================================
// DREIDEL SPINNER (Y-axis spin - for sections and pages)
// =============================================================================

interface ZhuzhDreidelSpinnerProps {
  /** Size of the spinner in pixels */
  size?: number;
  /** Optional message below spinner */
  message?: string;
  /** Vertical padding */
  py?: number;
}

export function ZhuzhDreidelSpinner({ size = 48, message, py = 4 }: ZhuzhDreidelSpinnerProps) {
  const gradientId = `dreidelGradient-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2.5,
        py,
      }}
    >
      <Box sx={{ perspective: '500px', perspectiveOrigin: 'center center' }}>
        <Box
          component="svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          sx={{
            transformStyle: 'preserve-3d',
            animation: 'dreidelSpin 1.8s cubic-bezier(0.12, 0.8, 0.32, 1) infinite',
            filter: 'drop-shadow(0 0 16px rgba(255, 135, 49, 0.35))',
            '@keyframes dreidelSpin': {
              '0%': { transform: 'rotateY(0deg)' },
              '100%': { transform: 'rotateY(720deg)' },
            },
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#FFB380" />
              <stop offset="65%" stopColor="#FF8731" />
              <stop offset="100%" stopColor="#FF6B00" />
            </linearGradient>
          </defs>
          <path d={DIAMOND_PATH} fill={`url(#${gradientId})`} />
        </Box>
      </Box>

      {message && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontWeight: 500,
            animation: 'textPulse 1.8s ease-in-out infinite',
            '@keyframes textPulse': {
              '0%, 100%': { opacity: 0.5 },
              '50%': { opacity: 0.9 },
            },
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
}

// =============================================================================
// WHEEL SPINNER (Z-axis / 2D spin - roulette wheel style)
// All 4 points visible, spinning N → E → S → W with deceleration
// =============================================================================

interface ZhuzhWheelSpinnerProps {
  /** Size of the spinner in pixels */
  size?: number;
  /** Optional message below spinner */
  message?: string;
  /** Vertical padding */
  py?: number;
}

export function ZhuzhWheelSpinner({ size = 40, message, py = 4 }: ZhuzhWheelSpinnerProps) {
  const gradientId = `wheelGradient-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2.5,
        py,
      }}
    >
      <Box
        component="svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        sx={{
          // 2D rotation in plane of screen (like roulette wheel viewed from front)
          // Fast start, then smooth deceleration with satisfying landing
          animation: 'wheelSpin 3.2s cubic-bezier(0.05, 0.7, 0.1, 1) infinite',
          filter: 'drop-shadow(0 0 12px rgba(255, 135, 49, 0.3))',
          '@keyframes wheelSpin': {
            '0%': { 
              transform: 'rotate(0deg)',
            },
            '100%': { 
              transform: 'rotate(720deg)',
            },
          },
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="30%" stopColor="#FFD4B3" />
            <stop offset="50%" stopColor="#FFB380" />
            <stop offset="70%" stopColor="#FF8731" />
            <stop offset="100%" stopColor="#FF6B00" />
          </linearGradient>
        </defs>
        <path d={DIAMOND_PATH} fill={`url(#${gradientId})`} />
      </Box>

      {message && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontWeight: 500,
            animation: 'textPulse 3.2s ease-in-out infinite',
            '@keyframes textPulse': {
              '0%, 100%': { opacity: 0.5 },
              '50%': { opacity: 0.9 },
            },
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
}

// =============================================================================
// PROGRESS OVERLAY (Smooth left-to-right with mesh gradient)
// =============================================================================

interface ZhuzhProgressOverlayProps {
  /** Whether to show the overlay */
  show?: boolean;
  /** Progress value 0-100 (if undefined, shows indeterminate) */
  progress?: number;
  /** Optional message */
  message?: string;
}

export function ZhuzhProgressOverlay({ show = true, progress, message }: ZhuzhProgressOverlayProps) {
  if (!show) return null;

  const isIndeterminate = progress === undefined;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(26, 25, 23, 0.85)',
        backdropFilter: 'blur(4px)',
        borderRadius: 'inherit',
        zIndex: 10,
        gap: 2,
        animation: 'overlayFadeIn 0.3s ease-out',
        '@keyframes overlayFadeIn': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      }}
    >
      {/* Progress bar container */}
      <Box
        sx={{
          width: '60%',
          maxWidth: 200,
          height: 4,
          bgcolor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Animated progress bar */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: isIndeterminate ? '40%' : `${progress}%`,
            background: 'linear-gradient(90deg, #FFFFFF 0%, #FFD4B3 25%, #FFB380 50%, #FF8731 75%, #FF6B00 100%)',
            borderRadius: 2,
            boxShadow: '0 0 12px rgba(255, 135, 49, 0.5)',
            transition: isIndeterminate ? 'none' : 'width 0.3s ease-out',
            ...(isIndeterminate && {
              animation: 'progressSlide 1.5s ease-in-out infinite',
              '@keyframes progressSlide': {
                '0%': { 
                  left: '-40%',
                  opacity: 0.3,
                },
                '50%': {
                  opacity: 1,
                },
                '100%': { 
                  left: '100%',
                  opacity: 0.3,
                },
              },
            }),
          }}
        />
      </Box>

      {message && (
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontWeight: 500,
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
}

// =============================================================================
// MODULE LOADER (For smaller modules - uses 2D wheel spinner)
// =============================================================================

interface ZhuzhModuleLoaderProps {
  /** Whether to show the loader */
  show?: boolean;
  /** Optional message */
  message?: string;
  /** Spinner size */
  size?: number;
  /** Minimum height of the container */
  minHeight?: number | string;
}

export function ZhuzhModuleLoader({ 
  show = true, 
  message, 
  size = 32,
  minHeight = 120,
}: ZhuzhModuleLoaderProps) {
  if (!show) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(26, 25, 23, 0.9)',
        backdropFilter: 'blur(4px)',
        borderRadius: 'inherit',
        zIndex: 10,
        minHeight,
        animation: 'moduleLoaderIn 0.2s ease-out',
        '@keyframes moduleLoaderIn': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      }}
    >
      <ZhuzhWheelSpinner size={size} message={message} py={2} />
    </Box>
  );
}

// =============================================================================
// INLINE LOADER (Uses 2D wheel spinner for small inline contexts)
// =============================================================================

interface ZhuzhInlineLoaderProps {
  size?: number;
  message?: string;
}

export function ZhuzhInlineLoader({ size = 32, message }: ZhuzhInlineLoaderProps) {
  return <ZhuzhWheelSpinner size={size} message={message} py={4} />;
}

// =============================================================================
// SECTION LOADER (For content areas - uses Y-axis dreidel style)
// =============================================================================

interface ZhuzhSectionLoaderProps {
  /** Height of the section being loaded */
  minHeight?: number | string;
  message?: string;
}

export function ZhuzhSectionLoader({ minHeight = 300, message }: ZhuzhSectionLoaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
      }}
    >
      <ZhuzhDreidelSpinner size={48} message={message} py={4} />
    </Box>
  );
}

// =============================================================================
// CARD/DIALOG LOADER (Uses 2D wheel spinner for modals/cards)
// =============================================================================

interface ZhuzhCardLoaderProps {
  message?: string;
  size?: number;
}

export function ZhuzhCardLoader({ message, size = 36 }: ZhuzhCardLoaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 4,
      }}
    >
      <ZhuzhWheelSpinner size={size} message={message} py={2} />
    </Box>
  );
}

export default ZhuzhPageLoader;
