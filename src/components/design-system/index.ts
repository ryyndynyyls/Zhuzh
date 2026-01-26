/**
 * Design System Components
 *
 * Reusable styling utilities that enforce visual consistency across Zhuzh.
 * Import from here rather than individual files.
 *
 * ═══════════════════════════════════════════════════════════════════
 * PREMIUM MODAL DESIGN SYSTEM
 * ═══════════════════════════════════════════════════════════════════
 *
 * Two signature treatments create Zhuzh's premium feel:
 *
 * 1. GLOW BORDER — Animated border that "breathes" with entity color
 *    Use: ALL modals and dialogs
 *    Function: glowBorderStyles(color, options)
 *
 * 2. GRADIENT HEADER — Colored block at top of modal
 *    Use: Entity detail modals (project, team member, client)
 *    NOT for: Quick action modals (confirm, reject, time entry)
 *    Function: gradientHeaderStyles(color, options)
 *
 * ═══════════════════════════════════════════════════════════════════
 * COLOR SELECTION RULES
 * ═══════════════════════════════════════════════════════════════════
 *
 *   Entity Type        Color Source
 *   ─────────────────  ─────────────────────────────────────────────
 *   Projects           project.color (user picks from palette)
 *   Team Members       getDisciplineColor(discipline) or stringToColor(name)
 *   Clients            client.color or stringToColor(name)
 *   Voice/AI           GLOW_COLORS.zhuzh (#80FF9C)
 *   Audit/History      GLOW_COLORS.info (#45B7D1)
 *   Warnings/Reject    GLOW_COLORS.warning (#FFF845)
 *   Errors/Critical    GLOW_COLORS.error (#FF6B6B)
 *   Generic/Neutral    GLOW_COLORS.neutral (#4B5563)
 *
 * ═══════════════════════════════════════════════════════════════════
 * WHEN TO USE EACH TREATMENT
 * ═══════════════════════════════════════════════════════════════════
 *
 *   Modal Type              Glow Border    Gradient Header
 *   ────────────────────    ───────────    ───────────────
 *   Entity Detail           ✅ normal      ✅ Yes
 *   Entity Settings Page    ✅ subtle      ✅ Yes (hero section)
 *   Action Modal            ✅ subtle      ❌ No
 *   Quick Dialog            ✅ subtle      ❌ No
 *   Critical Alert          ✅ strong      ⚠️ Optional
 *
 * ═══════════════════════════════════════════════════════════════════
 * GRADIENT HEADER TEXT COLORS
 * ═══════════════════════════════════════════════════════════════════
 *
 *   Most colors: White text (#FFFFFF)
 *   Zhuzh green (#80FF9C): Dark text (#1E1D1B) for contrast
 *   Yellow (#FFF845): Dark text (#1E1D1B) for contrast
 *
 * ═══════════════════════════════════════════════════════════════════
 * COMPONENT SELECTION
 * ═══════════════════════════════════════════════════════════════════
 *
 *   - Modals/Dialogs   → glowBorderStyles() on PaperProps.sx
 *   - Gradient Headers → gradientHeaderStyles() + headerIconButtonStyles()
 *   - Page Cards       → <GlowCard> component
 *   - Hover-only       → <HoverGlowPaper> styled component
 *
 * ═══════════════════════════════════════════════════════════════════
 */

// Glow border effects for Dialogs
export {
  glowBorderStyles,
  accentBorderStyles,
  gradientHeaderStyles,
  headerIconButtonStyles,
  leftAccentStyles,
  glowBreathing,
  glowBreathingSubtle,
  borderShimmer,
  GLOW_COLORS,
  getEntityGlowColor,
} from './GlowBorder';

// GlowCard component for Paper elements
export { GlowCard, HoverGlowPaper } from './GlowCard';
