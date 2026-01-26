import rateLimit from 'express-rate-limit';

// Global: 100 requests per 15 minutes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth: 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

// Voice: 30 per minute (Gemini calls are slow)
export const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Voice rate limit reached. Please wait.' },
});
