# Zhuzh Asset Generation Brief

## For: Google AI Studio / Gemini

---

## Context

**Zhuzh** (pronounced "zhoozh") is a Slack-first timesheet confirmation app for creative agencies. The core philosophy is "confirmation over tracking" — employees confirm their planned hours at the end of each week rather than logging time throughout the day.

The app is being rebranded from "ResourceFlow" to "Zhuzh" with a warm, playful, professional aesthetic.

---

## Brand System

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Orange | `#FF8731` | Primary, CTAs, active states |
| Yellow | `#FFF845` | Warning, highlights, sparkle accents |
| Lime | `#80FF9C` | Success, approved, positive states |
| Cream | `#F7F6E6` | Light backgrounds |
| Dark | `#33332F` | Text, dark UI elements |

### Visual Motif
- **Sparkles/stars** — represents the "zhuzh" (adding polish/flair)
- 4-point stars preferred over 5-point
- Used sparingly as accents, not overwhelming

### Typography
- **Inter** — Primary typeface
- Clean, modern, highly legible

### Personality
- Warm but professional
- Playful but not childish
- Efficient — respects people's time
- Trustworthy — handles sensitive data (hours, budgets)

---

## Deliverables Needed

### 1. Custom Icon Set (28 icons)

**Style Requirements:**
- Outlined style (not filled)
- 2px stroke weight at 24×24 size
- Rounded line caps and joins (round, not square)
- 2px padding from viewBox edges
- Subtle sparkle/star motif where appropriate (corner flourishes on key icons)
- Pixel-perfect alignment to grid

**Color Variants:**
- Default: `#33332F` (dark gray)
- Active/Selected: `#FF8731` (orange)
- Disabled: `#9E9E93` (muted)

**Icons Needed:**
```
Navigation (6):
- Dashboard (grid/home view)
- Calendar (weekly view)
- Projects (folder or layers)
- Team (multiple people)
- Settings (gear)
- Reports (chart/graph)

Actions (6):
- Add (plus)
- Edit (pencil)
- Delete (trash)
- Submit (send/arrow)
- Approve (checkmark)
- Reject (x mark)

Status (5):
- Pending (clock)
- Approved (check in circle)
- Rejected (x in circle)
- Draft (document outline)
- Conflict/Warning (alert triangle)

Time (3):
- Week (calendar week)
- Day (single day)
- Hours (clock with number)

People (3):
- User (single person)
- Users/Team (multiple people)
- Manager (person with badge/star)

Objects (5):
- Folder
- Client (briefcase or building)
- Budget (dollar or coin)
- PTO (palm tree or plane)
- Holiday (star or gift)
- Meeting (video camera or people talking)
```

**Output Format:**
- Individual SVG files
- 24×24 viewBox
- Clean, optimized paths (no unnecessary groups)
- Named consistently: `icon-{name}.svg`

---

### 2. Sparkle Micro-Animations (3 animations)

**Animation 1: Success Burst**
- Trigger: After successful action (approve, submit, save)
- Duration: 600ms
- Behavior: 2-3 small 4-point sparkles explode outward from center point
- Motion: Scale up + rotate slightly + fade out
- Colors: Mix of orange, yellow, lime
- Easing: Quick burst (ease-out), gentle fade

**Animation 2: Loading Pulse**
- Trigger: While waiting for response
- Duration: 1000ms loop
- Behavior: Single 4-point sparkle gently pulses
- Motion: Scale (0.8 → 1.2 → 0.8) + subtle rotation (0° → 45° → 0°)
- Color: Orange at 80% opacity
- Easing: ease-in-out

**Animation 3: Hover Micro**
- Trigger: On hover of interactive elements
- Duration: 300ms
- Behavior: Tiny sparkle appears at corner, then fades
- Motion: Fade in → hold → fade out
- Color: Yellow
- Scale: Very small (8-12px)
- Easing: ease

**Output Format Options:**
- CSS `@keyframes` with example HTML
- Lottie JSON
- SVG with SMIL animations
- React Spring / Framer Motion code

---

### 3. Illustration Style Guide (Optional/Future)

For empty states, onboarding, and error pages. Lower priority than icons and animations.

**Direction:**
- Simple, geometric shapes
- Limited color palette (brand colors only)
- Friendly characters (if any) should be abstract/minimal
- Sparkle motifs as accents

---

## Technical Constraints

- Icons must work at 24×24, 20×20, and 16×16 sizes
- Animations must be performant (60fps)
- All assets must be accessible (sufficient contrast)
- SVGs should be optimized for web (SVGO)

---

## Reference

**Figma File:** https://www.figma.com/design/ILefAo7J9PB2fy9pdfXy69/✨-Zhuzh-App

**Inspiration:**
- Linear app icons (clean, outlined)
- Notion's subtle animations
- Slack's friendly-but-professional vibe

---

## Questions for AI Studio

Before generating, please advise on:

1. **Best execution approach** — Should icons be generated one-by-one, in batches by category, or all at once?

2. **Tool recommendations** — What's the best way to generate production-ready SVG icons in AI Studio? Code generation? Image generation with vectorization?

3. **Animation format** — Given this will be used in a React/MUI app, what animation format would you recommend? CSS keyframes vs Lottie vs React libraries?

4. **Iteration workflow** — How should we structure feedback loops? Generate all then review? Or review samples first?

5. **Consistency techniques** — How can we ensure visual consistency across 28 icons when generating them?

---

*Let's make something beautiful ✨*
