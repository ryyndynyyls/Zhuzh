/**
 * Celebration Utilities
 * Delightful feedback for key user actions
 *
 * Uses canvas-confetti (must be installed: npm install canvas-confetti)
 *
 * Usage:
 * - celebrateSuccess() — Confetti burst for big wins (approval completed)
 * - celebrateSmall() — Subtle sparkle for smaller wins (timesheet submit)
 * - celebrateBig() — Side cannons for extra celebration (inbox zero)
 */

import confetti from 'canvas-confetti';
import { brand } from '../styles/tokens';

// Confetti burst for big wins (approval completed, etc.)
export function celebrateSuccess() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: [brand.orange, brand.lime, brand.yellow, brand.cream],
  });
}

// Subtle sparkle for smaller wins (timesheet submit, archive)
export function celebrateSmall() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
    colors: [brand.orange, brand.lime],
    scalar: 0.8,
  });
}

// Side cannons for extra celebration (inbox zero)
export function celebrateBig() {
  const end = Date.now() + 500;
  const celebrationColors = [brand.orange, brand.lime, brand.yellow];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: celebrationColors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: celebrationColors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

// Check if confetti is available (for graceful degradation)
export function isConfettiAvailable(): boolean {
  return typeof confetti === 'function';
}

// Safe celebration wrapper (won't throw if confetti not installed)
export function safeCelebrate(type: 'success' | 'small' | 'big' = 'success') {
  try {
    if (!isConfettiAvailable()) return;

    switch (type) {
      case 'success':
        celebrateSuccess();
        break;
      case 'small':
        celebrateSmall();
        break;
      case 'big':
        celebrateBig();
        break;
    }
  } catch {
    // Silently fail if confetti isn't available
    console.debug('Celebration skipped: canvas-confetti not available');
  }
}
