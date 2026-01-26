# Cowork Task: Design System Polish

**Created:** 2026-01-22
**Estimated time:** 3-4 hours total (parallelizable to ~1 hour)
**Why Cowork:** Multi-file updates, independent subtasks, consistent pattern application

---

## Context

We just completed the design foundation:
- **Typography:** Plus Jakarta Sans + JetBrains Mono (in `index.html`)
- **Design tokens:** `src/styles/tokens.ts` (colors, spacing, shadows, transitions)
- **Animation utilities:** `src/styles/animations.ts` (staggered lists, hover effects)
- **Theme:** `src/theme.ts` (MUI overrides using tokens)

Now we need to apply these consistently across the app. The goal is a **Linear-inspired** aesthetic: clean, minimal, professional with subtle motion.

**Key files to reference:**
- `src/styles/tokens.ts` — All design values
- `src/styles/animations.ts` — Animation helpers
- `src/theme.ts` — MUI component overrides

---

## Design Principles

1. **Use tokens, never hardcode** — Import from `../styles/tokens` or `../styles`
2. **Subtle motion** — Staggered fade-in for lists, hover lift for cards
3. **Consistent spacing** — Use `spacing` tokens (multiples of 4px)
4. **Dark mode first** — Use `colors.dark.*` values
5. **Monospace for data** — Numbers, percentages, hours use `typography.fontFamily.mono`

---

## Subtasks (Run in Parallel)

### Subtask 1: Dashboard Metric Cards
**File:** `src/pages/DashboardPage.tsx`
**Time:** 45 min

Transform the dashboard metric cards to be more impactful:

1. Import tokens and animations:
```tsx
import { colors, spacing, radii, shadows, typography } from '../styles/tokens';
import { getStaggeredStyle, hoverLift } from '../styles/animations';
```

2. Style metric cards with:
   - Background: `colors.dark.bg.secondary`
   - Border: `1px solid ${colors.dark.border.subtle}`
   - Border radius: `radii.lg` (12px)
   - Padding: `spacing[5]` (20px)
   - Hover: Apply `hoverLift` styles
   - Large numbers: Use `typography.fontFamily.mono` and `typography.fontSize['2xl']` or larger
   - Staggered animation: Apply `getStaggeredStyle(index)` to each card

3. Add visual hierarchy:
   - Label: `colors.dark.text.secondary`, `typography.fontSize.xs`, uppercase
   - Value: `colors.dark.text.primary`, large and bold
   - Trend/change indicator: Use semantic colors (success/warning/error from tokens)

4. If there's a grid of cards, wrap in a container and apply staggered delays

### Subtask 2: Sidebar Navigation
**File:** `src/components/AppShell.tsx` (or wherever Sidebar lives)
**Time:** 30 min

Make the sidebar feel more Linear-like:

1. Import tokens:
```tsx
import { colors, spacing, radii, transitions } from '../styles/tokens';
```

2. Sidebar container:
   - Background: `colors.dark.bg.secondary`
   - Border right: `1px solid ${colors.dark.border.subtle}`
   - Width: 240-260px

3. Nav items:
   - Padding: `spacing[2.5]` vertical, `spacing[3]` horizontal
   - Border radius: `radii.md` (8px)
   - Margin: `spacing[1]` between items
   - Transition: `transitions.fast`
   - Hover: Background `colors.dark.bg.hover`
   - Active: Background `rgba(255, 135, 49, 0.12)` (orange tint), text `colors.brand.orange`

4. Section labels (if any):
   - Font: `typography.fontSize.xs`
   - Color: `colors.dark.text.tertiary`
   - Text transform: uppercase
   - Letter spacing: `typography.letterSpacing.wider`
   - Margin top: `spacing[6]`

5. Icons: Size 20px, color inherits from text

### Subtask 3: Staggered List Animations
**Files:** Multiple pages with lists
**Time:** 30 min

Add staggered fade-in animations to these list views:

1. **BudgetPage.tsx** — Project list
2. **ApprovalsPage.tsx** — Approval queue items  
3. **TeamPage.tsx** — Team member cards

For each, apply this pattern:
```tsx
import { getStaggeredStyle } from '../styles/animations';

// In the map function:
{items.map((item, index) => (
  <Card 
    key={item.id}
    sx={{
      ...getStaggeredStyle(index),
      // other styles
    }}
  >
    ...
  </Card>
))}
```

Options for `getStaggeredStyle`:
- Default: `getStaggeredStyle(index)` — fadeInUp, 50ms stagger
- Faster: `getStaggeredStyle(index, 'fadeInUp', { staggerDelay: 30 })`
- Different variant: `getStaggeredStyle(index, 'scaleIn')`

### Subtask 4: Marketing Landing Page
**File:** Create `src/pages/MarketingPage.tsx` + add route
**Time:** 1 hour

Create a simple, compelling landing page for Michelle's MD group outreach (Feb 2nd).

**Hero Section:**
- Headline: "Stop tracking time. Start confirming it."
- Subhead: "Zhuzh is Slack-first resource management built for creative teams."
- CTA: "Join the Pilot" button (links to signup form or mailto)

**Value Props (3 columns):**
1. **Confirmation over tracking** — "Employees confirm pre-planned hours on Friday. No daily timesheets."
2. **Slack-native** — "Lives where your team already works. No new app to adopt."
3. **Trust-based** — "Built by a creative agency, for creative agencies."

**Social Proof:**
- "Currently in pilot at Use All Five"
- Optional: placeholder for testimonials

**Styling:**
- Full viewport hero with gradient background (subtle)
- Use `colors.dark.bg.primary` base
- Accent with `colors.brand.orange` for CTAs
- Typography: Large headline using `typography.fontSize['4xl']`
- Staggered fade-in for value prop cards

**Route:** Add to `src/App.tsx`:
```tsx
<Route path="/welcome" element={<MarketingPage />} />
```

Make it public (no ProtectedRoute wrapper).

---

## Verification

After completion, verify:

```bash
cd ~/Claude-Projects-MCP/ResourceFlow && npm run dev
```

1. **Dashboard** (`/`) — Cards should animate in with stagger, numbers in monospace
2. **Sidebar** — Hover states smooth, active item highlighted
3. **Budget page** (`/budget`) — Project list animates in
4. **Team page** (`/team`) — Member cards animate in
5. **Marketing** (`/welcome`) — Hero displays, responsive

---

## Success Criteria

- [ ] Dashboard cards use design tokens (no hardcoded colors)
- [ ] Dashboard cards animate in with stagger effect
- [ ] Large numbers use monospace font
- [ ] Sidebar has smooth hover/active states
- [ ] Sidebar uses consistent spacing from tokens
- [ ] At least 2 list views have staggered animations
- [ ] Marketing page exists at `/welcome`
- [ ] Marketing page has hero + value props + CTA
- [ ] No TypeScript errors
- [ ] App runs without console errors

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md` with completed items
2. Note any design decisions in `docs/live-sync-doc.md` if significant
3. List any issues encountered

---

## Notes for Cowork

- **Parallel execution:** Subtasks 1-4 are independent, run simultaneously
- **Don't over-engineer:** This is polish, not a rewrite. Minimal changes for maximum impact.
- **Preserve functionality:** Don't break existing features while styling
- **When in doubt:** Reference Linear's UI for inspiration (clean, minimal, monochrome + accent)
