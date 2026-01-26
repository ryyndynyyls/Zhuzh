# Cowork Task: Premium Modal Design System — Glow + Gradient Headers

**Created:** 2026-01-26
**Estimated time:** 60-90 min
**Why Cowork:** Multi-file refactoring across 8+ components with parallel subtasks

---

## Context

The `TeamMemberModal` has two signature design elements that create a premium, polished feel:

1. **Breathing glow border** — The modal border pulses with the entity's color
2. **Gradient color header** — A full-width colored block at the top that breaks up the dark theme

Currently, most modals only use dark backgrounds. We're expanding BOTH treatments across the app.

**Reference Implementation:** `src/components/TeamMemberModal.tsx`

### Current State

| Component | Glow Border | Gradient Header | Notes |
|-----------|-------------|-----------------|-------|
| `TeamMemberModal.tsx` | ✅ Perfect | ✅ Perfect | THE reference |
| `ProjectDetailModal.tsx` | ⚠️ Subtle | ❌ Missing | Just a colored dot |
| `ProjectSettingsPage.tsx` | ❌ Missing | ❌ Missing | All dark |
| `AuditTrailModal.tsx` | ❌ Missing | ❌ Missing | Plain dark |
| `RejectionDialog.tsx` | ❌ Missing | N/A | Action modal, no header needed |
| `AddUnplannedWorkModal.tsx` | ❌ Missing | ❌ Missing | Could use header |
| `SubProjectsSection.tsx` | ❌ Missing | ❌ Missing | Has dialogs |
| `ManualTimeEntry.tsx` | ❌ Missing | N/A | Action modal |

---

## Design System Rules

### TWO Design Treatments

**1. Glow Border** — Animated border that "breathes" with entity color
- Use on: ALL modals and dialogs
- Implementation: `glowBorderStyles(color, options)` on Dialog PaperProps

**2. Gradient Header** — Colored block at top of modal
- Use on: Entity detail modals (project, team member, client)
- NOT for: Quick action modals (confirm, reject, time entry)
- Implementation: Box with `background: linear-gradient(135deg, ${color} 0%, ${color}99 100%)`

### Color Selection Rules

| Entity Type | Color Source |
|-------------|--------------|
| Projects | `project.color` (user-selected) |
| Team Members | `getDisciplineColor(discipline)` or `stringToColor(name)` |
| Clients | `client.color` or generated |
| Voice/AI | `#80FF9C` (Zhuzh green) |
| Warnings | `#FFF845` (Yellow) |
| Info/Audit | `#45B7D1` (Cyan) |

### Gradient Header Pattern

```tsx
{/* Gradient Header - from TeamMemberModal */}
<Box
  sx={{
    background: `linear-gradient(135deg, ${entityColor} 0%, ${entityColor}99 100%)`,
    p: 2.5,
    position: 'relative',
  }}
>
  {/* Close button - top right */}
  <IconButton
    onClick={onClose}
    size="small"
    sx={{
      position: 'absolute',
      top: 8,
      right: 8,
      color: 'rgba(255,255,255,0.8)',
      '&:hover': { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)' },
    }}
  >
    <CloseIcon fontSize="small" />
  </IconButton>

  {/* Optional: Settings/Edit button - top right, offset */}
  <IconButton
    onClick={onSettings}
    size="small"
    sx={{
      position: 'absolute',
      top: 8,
      right: 40,
      color: 'rgba(255,255,255,0.8)',
      '&:hover': { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)' },
    }}
  >
    <SettingsIcon fontSize="small" />
  </IconButton>

  {/* Entity indicator (avatar for people, colored dot for projects) */}
  <Box
    sx={{
      width: 48,
      height: 48,
      borderRadius: '50%',
      bgcolor: '#1E1D1B',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '3px solid white',
      mb: 1.5,
    }}
  >
    {/* Icon or initials */}
  </Box>

  {/* Title - white on gradient */}
  <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
    {entityName}
  </Typography>

  {/* Subtitle - slightly transparent white */}
  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.5 }}>
    {subtitle}
  </Typography>
</Box>
```

---

## Key Files Reference

**Design System:**
- `src/components/design-system/GlowBorder.ts` — `glowBorderStyles()`, `gradientHeaderStyles()`
- `src/components/design-system/GlowCard.tsx` — `GlowCard` component
- `src/components/design-system/index.ts` — Exports

**Reference Implementation:**
- `src/components/TeamMemberModal.tsx` — THE gold standard

---

## Subtasks

### Subtask 1: Add `gradientHeaderStyles` to Design System

**File:** `src/components/design-system/GlowBorder.ts`

The `gradientHeaderStyles` function already exists but is basic. Enhance it:

```tsx
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
    // Text on gradient should be white
    '& .MuiTypography-root': {
      color: 'white',
    },
  };
}

/**
 * Icon button styles for use on gradient headers
 * Semi-transparent white that brightens on hover
 */
export function headerIconButtonStyles(position: 'close' | 'action' = 'close'): SxProps<Theme> {
  return {
    position: 'absolute',
    top: 8,
    right: position === 'close' ? 8 : 40,
    color: 'rgba(255,255,255,0.8)',
    '&:hover': { 
      color: '#fff', 
      bgcolor: 'rgba(0,0,0,0.2)' 
    },
  };
}
```

Also update the exports in `index.ts`.

---

### Subtask 2: Redesign ProjectDetailModal with Gradient Header

**File:** `src/components/ProjectDetailModal.tsx`

This is the big one. Transform the header from a plain dark title bar to a gradient header block.

**Current structure:**
```tsx
<DialogTitle sx={{ ... }}>
  {/* Dark background, small colored dot, text */}
</DialogTitle>
```

**New structure:**
```tsx
{/* Remove DialogTitle, use custom gradient header */}
<Box
  sx={{
    background: `linear-gradient(135deg, ${projectColor} 0%, ${projectColor}99 100%)`,
    p: 2.5,
    position: 'relative',
  }}
>
  {/* Close button - absolute positioned */}
  <IconButton
    onClick={onClose}
    size="small"
    sx={{
      position: 'absolute',
      top: 8,
      right: 8,
      color: 'rgba(255,255,255,0.8)',
      '&:hover': { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)' },
    }}
  >
    <CloseIcon fontSize="small" />
  </IconButton>

  {/* Settings button */}
  {(userRole === 'pm' || userRole === 'admin') && (
    <IconButton
      onClick={handleOpenSettings}
      size="small"
      sx={{
        position: 'absolute',
        top: 8,
        right: 40,
        color: 'rgba(255,255,255,0.8)',
        '&:hover': { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)' },
      }}
    >
      <SettingsIcon fontSize="small" />
    </IconButton>
  )}

  {/* Project indicator - folder icon or colored circle */}
  <Box
    sx={{
      width: 48,
      height: 48,
      borderRadius: '50%',
      bgcolor: '#1E1D1B',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '3px solid white',
      mb: 1.5,
    }}
  >
    <FolderIcon sx={{ color: projectColor, fontSize: 24 }} />
  </Box>

  {/* Project name */}
  <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
    {project?.name || 'Project'}
  </Typography>

  {/* Client name */}
  {project?.client && (
    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.5 }}>
      {project.client.name}
    </Typography>
  )}

  {/* Health chip - styled for gradient background */}
  <Chip
    label={health.label}
    size="small"
    sx={{
      mt: 1.5,
      bgcolor: 'rgba(255,255,255,0.2)',
      color: 'white',
      fontWeight: 600,
      fontSize: '0.75rem',
      border: `1px solid rgba(255,255,255,0.3)`,
    }}
  />
</Box>
```

Also upgrade the glow border from `intensity: 'subtle'` to `intensity: 'normal'`.

Import `FolderIcon` from `@mui/icons-material/Folder`.

---

### Subtask 3: Redesign ProjectSettingsPage with Gradient Header

**File:** `src/pages/ProjectSettingsPage.tsx`

This is a full page, not a modal. Add a gradient header section at the top of the page.

**Current:** Page starts with a back button and title in plain dark style.

**New:** Add a gradient hero section at the top:

```tsx
{/* Gradient header section */}
<Box
  sx={{
    background: `linear-gradient(135deg, ${projectColor} 0%, ${projectColor}99 100%)`,
    p: 3,
    mb: 3,
    borderRadius: 3,
    position: 'relative',
  }}
>
  {/* Back button */}
  <IconButton
    onClick={() => navigate(-1)}
    sx={{
      position: 'absolute',
      top: 12,
      left: 12,
      color: 'rgba(255,255,255,0.8)',
      '&:hover': { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)' },
    }}
  >
    <ArrowBack />
  </IconButton>

  {/* Project indicator */}
  <Box
    sx={{
      width: 48,
      height: 48,
      borderRadius: '50%',
      bgcolor: '#1E1D1B',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '3px solid white',
      mb: 1.5,
      ml: 5, // Offset for back button
    }}
  >
    <SettingsIcon sx={{ color: projectColor, fontSize: 24 }} />
  </Box>

  <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, ml: 5 }}>
    Project Settings
  </Typography>
  
  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.5, ml: 5 }}>
    {project?.name}
  </Typography>
</Box>

{/* Rest of page content in GlowCard components */}
<GlowCard 
  glowColor={projectColor}
  intensity="subtle"
  header={{ icon: <SettingsIcon />, title: 'Project Details' }}
>
  {/* Form fields */}
</GlowCard>
```

Also wrap the Phases section in a `GlowCard`.

---

### Subtask 4: Add Glow to AuditTrailModal

**File:** `src/components/AuditTrailModal.tsx`

Add glow border (no gradient header needed — this is informational, not entity-focused).

```tsx
import { glowBorderStyles, GLOW_COLORS } from './design-system';

// In Dialog:
PaperProps={{
  sx: {
    ...glowBorderStyles(GLOW_COLORS.info, { 
      intensity: 'subtle',
      animated: false,
    }),
    maxHeight: '85vh',
  },
}}
```

---

### Subtask 5: Add Glow to RejectionDialog

**File:** `src/components/RejectionDialog.tsx`

Add glow border with warning color.

```tsx
import { glowBorderStyles, GLOW_COLORS } from './design-system';

PaperProps={{
  sx: {
    ...glowBorderStyles(GLOW_COLORS.warning, { 
      intensity: 'subtle',
      animated: false,
    }),
  },
}}
```

---

### Subtask 6: Add Glow + Header to AddUnplannedWorkModal

**File:** `src/components/AddUnplannedWorkModal.tsx`

This modal lets users add unplanned work. It deserves both treatments since it's a significant action.

1. Add glow border with Zhuzh green
2. Add a gradient header:

```tsx
<Box
  sx={{
    background: `linear-gradient(135deg, #80FF9C 0%, #80FF9C99 100%)`,
    p: 2,
    position: 'relative',
  }}
>
  <IconButton
    onClick={onClose}
    size="small"
    sx={{
      position: 'absolute',
      top: 8,
      right: 8,
      color: 'rgba(0,0,0,0.6)',
      '&:hover': { color: '#000', bgcolor: 'rgba(0,0,0,0.1)' },
    }}
  >
    <CloseIcon fontSize="small" />
  </IconButton>

  <AddIcon sx={{ fontSize: 32, color: '#1E1D1B', mb: 1 }} />
  
  <Typography variant="h6" sx={{ color: '#1E1D1B', fontWeight: 700 }}>
    Add Unplanned Work
  </Typography>
</Box>
```

Note: For Zhuzh green, text should be dark (#1E1D1B) not white for contrast.

---

### Subtask 7: Add Glow to SubProjectsSection Dialogs

**File:** `src/components/SubProjectsSection.tsx`

Find the dialogs for adding/editing sub-projects and add glow using the parent project's color.

```tsx
import { glowBorderStyles } from './design-system';

// On any Dialog in this file:
PaperProps={{
  sx: {
    ...glowBorderStyles(parentProjectColor || '#4285F4', { 
      intensity: 'subtle',
      animated: false,
    }),
  },
}}
```

---

### Subtask 8: Add Glow to ManualTimeEntry

**File:** `src/components/ManualTimeEntry.tsx`

Add glow border (this is an action modal, no header needed).

```tsx
import { glowBorderStyles, GLOW_COLORS } from './design-system';

PaperProps={{
  sx: {
    ...glowBorderStyles(GLOW_COLORS.zhuzh, { 
      intensity: 'subtle',
      animated: false,
    }),
  },
}}
```

---

### Subtask 9: Update Design System Documentation

**File:** `src/components/design-system/index.ts`

Update the header documentation to include both treatments:

```tsx
/**
 * Design System Components
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
 */
```

Also add exports for `gradientHeaderStyles` and `headerIconButtonStyles`.

---

## Verification

After completing all subtasks, visually verify:

1. **TeamMemberModal** — Reference (should be unchanged)
2. **ProjectDetailModal** — Now has gradient header with project color + normal glow
3. **ProjectSettingsPage** — Has gradient hero section + GlowCard sections
4. **AuditTrailModal** — Has subtle cyan glow border
5. **RejectionDialog** — Has subtle yellow glow border
6. **AddUnplannedWorkModal** — Has gradient header + glow
7. **SubProjectsSection** — Dialogs have glow
8. **ManualTimeEntry** — Has subtle green glow

---

## Success Criteria

- [ ] `GlowBorder.ts` has enhanced `gradientHeaderStyles` and `headerIconButtonStyles`
- [ ] `ProjectDetailModal` has gradient header matching TeamMemberModal style
- [ ] `ProjectSettingsPage` has gradient hero and GlowCard sections
- [ ] `AuditTrailModal` has cyan glow border
- [ ] `RejectionDialog` has yellow glow border
- [ ] `AddUnplannedWorkModal` has green gradient header + glow
- [ ] `SubProjectsSection` dialogs have glow
- [ ] `ManualTimeEntry` has green glow border
- [ ] Design system documentation updated
- [ ] No TypeScript errors
- [ ] Consistent visual language across all modals

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md`:
   - List of files modified
   - Note that premium modal system is now applied consistently

2. Add to `docs/live-sync-doc.md`:
   - Decision: "Premium modal design system with glow borders + gradient headers applied across all modals"
