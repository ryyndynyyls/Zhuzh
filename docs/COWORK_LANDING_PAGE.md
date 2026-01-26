# Cowork Task: Zhuzh Marketing Landing Page

**Created:** January 20, 2026  
**Estimated time:** 2-3 hours  
**Why Cowork:** Standalone creative project, multiple parallel subtasks, no dependencies on main app  
**Target:** Ready for Feb 2 go-to-market meeting

---

## Strategic Context

### The Market Opportunity

The timekeeping software market is crowded but **underserves creative agencies**. Most tools focus on surveillance-style time capture, when what agencies actually need is **confirmation of planned work**.

**The gap we fill — no existing tool combines:**
1. Slack-native confirmation (not just timer start/stop)
2. Resourcing as the primary data (allocations drive everything)
3. Trust-based design (confirm what was planned, not track every minute)
4. Company-wide visibility (see all projects + priorities at once)
5. Proactive issue surfacing (flag problems before burnout)
6. Natural language + voice commands (our differentiator!)

### Competitive Positioning

| Tool | Annual Cost (30 users) | Why They Lose |
|------|------------------------|---------------|
| **Harvest** | ~$4,000 | Timer-focused, feels like surveillance, weak resourcing |
| **10,000ft** | ~$6,000+ | Clunky UX, slow, hidden buttons, no Slack-native |
| **Float** | ~$4,500 | Planning only — no time confirmation |
| **Clockify** | Free-$1,500 | **No native Slack app**, screenshot monitoring = invasive |

**Zhuzh's position:** More affordable, actually Slack-native, trust-based not surveillance-based.

### Target Audience

**Primary:** Creative agency leaders (founders, MDs, ops directors) at 8-50 person teams who are:
- Paying $4,000-8,000/year for tools nobody uses consistently
- Frustrated that time tracking data is unreliable
- Concerned about team morale around "surveillance" tools
- Looking for something that integrates with existing Slack workflows

**Secondary:** Producers and project managers who actually do the resource planning.

### The Core Insight (Use This!)

> **"Time tracking fails because it requires people to remember."**

Traditional model: Start timer → work → stop timer → repeat → forget half the time → garbage data

Zhuzh model: Producer plans the week → Friday DM → "Looks Good ✓" → Done

**70% of weeks, employees just tap one button.** The data is accurate because we pre-fill it.

---

## Brand Identity

**Name:** Zhuzh (pronounced "zhoozh") — means to make something more exciting/stylish

**Tagline options:**
- "Confirmation over tracking"
- "Time tracking that doesn't suck"
- "Your week, confirmed in 30 seconds"

**Philosophy:** Trust over surveillance. Confirmation over tracking.

**Personality:** Warm, confident, slightly playful. Not corporate. Not startup-bro. Respects people's time.

### Visual System

**Logo:** `/brand/logos/zhuzh-wordmark-sparkle.svg`

**Colors:**
| Name | Hex | Usage |
|------|-----|-------|
| Orange | `#FF8731` | Primary, CTAs, energy |
| Yellow | `#FFF845` | Highlights, sparkle accents |
| Lime | `#80FF9C` | Success, approved states |
| Cream | `#F7F6E6` | Light backgrounds, warmth |
| Dark | `#33332F` | Text, grounding |

**Typography:** Inter (Google Fonts) — clean, modern, highly legible

**Visual motif:** 4-point sparkles ✨ (represents "zhuzhing" = adding polish)

**Design tokens:** `/brand/tokens/zhuzh-tokens.css` (import and use these!)

---

## Page Content — Section by Section

### 1. Hero Section

**Primary headline (choose one or riff on these):**
- "Stop tracking time. Start confirming it."
- "Time tracking that respects your team."
- "Friday Slack DM. Confirm. Done."
- "Your team's hours, confirmed in 30 seconds."

**Subheadline:**
"Zhuzh replaces clunky time tracking with a simple Friday check-in. Your team confirms their planned hours in Slack — no timers, no surveillance, no forgotten entries."

**CTA:** "Join the pilot program" → scrolls to signup form

**Visual:** Either:
- Abstract illustration of a Slack message with a "Looks Good ✓" button
- Or a simple mockup of the Friday DM flow
- Sparkle accents around the CTA

**Social proof hint:** "Built by Use All Five for creative teams like yours"

---

### 2. Problem Section: "Time Tracking is Broken"

**Headline:** "Here's why your time data is garbage"

**Three pain points (use icons or simple illustrations):**

**Pain 1: "Nobody remembers to log time"**
> Timers get forgotten. End-of-week entry becomes guesswork. The data you're paying for is fiction.

**Pain 2: "Your tools feel like surveillance"**
> Screenshot monitoring. Idle detection. Your team feels watched, not trusted. Morale suffers.

**Pain 3: "You're paying $4,000-8,000/year for this"**
> Harvest, 10,000ft, Float — expensive tools that still give you unreliable data because the UX fights human nature.

**Transition:** "What if time tracking worked *with* how people actually work?"

---

### 3. Solution Section: "How Zhuzh Works"

**Headline:** "Confirmation over tracking"

**Three steps (visual flow, left-to-right or vertical):**

**Step 1: "Producers plan the week"**
> Your PM allocates people to projects in a visual calendar. By Thursday, everyone knows their Monday.

**Step 2: "Friday Slack DM"**
> Each team member gets a DM with their planned hours pre-filled. Most weeks, they just tap "Looks Good ✓"

Show a mockup of the Slack DM:
```
📅 Time to confirm your week!

┌─────────────────────────────────────────┐
│ Google Cloud UX          24 hrs         │
│ Patina                   12 hrs         │
│ Internal/Admin            4 hrs         │
├─────────────────────────────────────────┤
│ Total                    40 hrs         │
└─────────────────────────────────────────┘

[Looks Good ✓]  [Adjust Hours]  [Add Work]
```

**Step 3: "Budgets update automatically"**
> Leadership sees real-time budget burn. No chasing people. No month-end scramble. Data you can trust.

**Key stat:** "70% of weeks, your team confirms with one tap."

---

### 4. Features Section

**Headline:** "Everything you need. Nothing you don't."

**Feature grid (4-6 cards):**

**🔔 Slack-Native**
> Confirmations happen where your team already works. No new app to forget.

**📊 Budget Visibility**
> Real-time budget burn by project, phase, and person. Know where you stand before it's too late.

**✅ One-Click Approvals**
> Managers approve clean submissions instantly. Only review anomalies.

**🏖️ PTO-Aware**
> Google Calendar integration means no more "Wait, Sam's out this week?" surprises.

**🎤 Voice Commands** ← DIFFERENTIATOR!
> Say "Move Sarah from Project A to Project B" and it happens. Resource planning at the speed of thought.

**🔍 Audit Trail**
> "Over budget because of 40 extra hours on QA in week 3" — not just "over budget."

---

### 5. Trust Section: "Built on Trust, Not Surveillance"

**Headline:** "We believe your team is doing the work"

**Short paragraph:**
> Most time tracking tools assume the worst. Idle detection. Screenshot monitoring. Minute-by-minute surveillance. That's not how creative agencies build great culture.

> Zhuzh assumes your team is doing the work. We just help them confirm it — quickly, painlessly, in a tool they already use. The result? Reliable data without the resentment.

**Quote from research (style as testimonial):**
> "If the team hates using it, the data will be garbage." — Agency CEO

---

### 6. Pilot Program CTA Section

**Headline:** "Join the founding team pilot"

**Body:**
> We're inviting 6 creative agencies to use Zhuzh free for 6 months. You'll help shape the product while getting early access to features that will cost $X/month at launch.

**What you get:**
- 6 months free access
- Direct line to the product team
- Your feedback shapes the roadmap
- Lock in founding-member pricing when you convert

**Form fields:**
- Agency name
- Your name
- Email
- Team size (dropdown: 5-10, 11-25, 26-50, 50+)
- "What's your biggest time tracking pain point?" (optional textarea)

**CTA button:** "Apply for the pilot" (orange, bold)

**Note:** "We'll reach out within 48 hours to schedule a quick intro call."

---

### 7. Footer

**Left side:**
- Zhuzh wordmark (sparkle version)
- "A Use All Five product"

**Right side:**
- Contact (mailto link)
- Privacy Policy (placeholder link)
- Made with ✨ in Los Angeles

---

## Technical Implementation

### Stack

**Option A (Recommended for speed):** Single HTML file with Tailwind CSS
- Fast to build, easy to deploy
- Use Tailwind with brand colors configured
- No build step needed

**Option B:** React + Vite
- More maintainable long-term
- Can share components with main app later
- Slightly more setup

Either way:
- Mobile-first responsive design
- Fast loading (<2s)
- Smooth scroll between sections
- Subtle animations on scroll (fade in)

### Form Handling

**Simplest:** Formspree (free tier, no backend needed)
- Create form at formspree.io
- Point form action to Formspree endpoint
- Submissions go to email

**Alternative:** Supabase insert
- Create `pilot_signups` table
- Simple fetch POST on submit
- We already have Supabase

### Deployment

- Vercel (we already use it)
- Deploy to `zhuzh-landing.vercel.app` for now
- Can point `zhuzh.app` or custom domain later

---

## Subtasks (Parallel-Safe)

### Subtask 1: Project Setup
Create `/marketing/` directory with:
- `index.html` (if going HTML route) or React setup
- Import brand tokens from `/brand/tokens/zhuzh-tokens.css`
- Configure Tailwind with Zhuzh colors if using Tailwind
- Basic responsive container structure

**Output:** Project scaffolding ready

### Subtask 2: Hero Section
- Implement headline, subheadline, CTA from content above
- Add Zhuzh logo
- Background treatment (cream with subtle sparkle accents)
- Responsive: stack on mobile, side-by-side on desktop
- CTA button with hover animation

**Output:** Hero complete and responsive

### Subtask 3: Problem Section
- "Time tracking is broken" with three pain points
- Icons or simple illustrations for each pain
- Empathetic but confident tone
- Smooth transition to solution

**Output:** Problem section complete

### Subtask 4: Solution Section (How It Works)
- Three-step visual flow
- **Create mockup of the Slack DM** — this is crucial!
- Step indicators (1, 2, 3)
- "70% confirm with one tap" callout

**Output:** Solution section with Slack DM mockup

### Subtask 5: Features Grid
- 4-6 feature cards from content above
- Icons for each (can use emoji initially, or simple SVG)
- Highlight voice commands as unique differentiator
- Grid layout: 2 columns on mobile, 3 on desktop

**Output:** Features section complete

### Subtask 6: Trust + CTA Sections
- Trust messaging ("Built on trust, not surveillance")
- Pilot program pitch
- **Working email capture form** — use Formspree or Supabase
- Form validation
- Success state after submission

**Output:** Trust and CTA sections, form working

### Subtask 7: Footer + Polish
- Footer with branding and links
- Smooth scroll navigation
- Subtle scroll animations (fade in on scroll)
- Test all breakpoints (320px, 768px, 1024px, 1440px)
- Performance check (<2s load)

**Output:** Complete, polished page

### Subtask 8: Deploy
- Create `vercel.json` if needed
- Deploy to Vercel
- Test live URL
- Document URL in SESSION_STATUS.md

**Output:** Live at `*.vercel.app`

---

## Copy Bank (Use These!)

### Headlines
- "Stop tracking time. Start confirming it."
- "Time tracking that respects your team."
- "Friday Slack DM. Confirm. Done."
- "Your team's hours, confirmed in 30 seconds."
- "Your week, zhuzhed."

### Taglines
- "Confirmation over tracking."
- "Trust over surveillance."
- "Time tracking that doesn't suck."

### Pain Points
- "Nobody remembers to log time."
- "Your tools feel like surveillance."
- "You're paying $4-8K/year for garbage data."

### Value Props
- "70% of weeks, one tap."
- "Pre-filled, not blank."
- "Data you can actually trust."
- "In Slack, where you already work."

### CTA Text
- "Join the pilot program"
- "Apply for early access"
- "Get Zhuzh for your team"

### Trust Messaging
- "We believe your team is doing the work."
- "Reliable data without the resentment."
- "If the team hates using it, the data will be garbage."

---

## Reference & Inspiration

**Vibe references:**
- Linear.app — clean, confident, developer-approved aesthetic
- Notion.so — friendly, approachable, but professional
- Vercel.com — fast, modern, no fluff

**What to avoid:**
- Generic SaaS template look
- Stock photos of people pointing at screens
- "Revolutionary" / "game-changing" language
- Fear-based messaging about surveillance

---

## Verification

```bash
# Local preview
open /marketing/index.html
# or: cd marketing && npm run dev

# Test form
# Submit test email, verify it arrives

# Test responsive
# Chrome DevTools → 320px, 768px, 1024px, 1440px

# Test performance
# Lighthouse audit → aim for 90+ performance score

# Deploy check
vercel --prod
# Visit live URL, verify everything works
```

---

## Success Criteria

- [ ] Page loads fast (<2s on 3G)
- [ ] Looks great on mobile AND desktop
- [ ] Hero immediately communicates value prop
- [ ] Problem section resonates with agency pain
- [ ] Slack DM mockup is clear and compelling
- [ ] Voice commands highlighted as differentiator
- [ ] Email capture form works
- [ ] Brand colors and typography match tokens
- [ ] Copy is compelling, warm, not corporate
- [ ] Deployed to live Vercel URL
- [ ] Ready to share with Michelle's MD group

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md`:
   - Live URL
   - Form backend choice (Formspree/Supabase)
   - Any copy decisions made
2. Add live link to `docs/live-sync-doc.md`
3. Note any brand decisions that should be permanent

---

## Cowork Prompt for Ryan

Copy this into Claude Desktop → Tasks mode:

```
Read /Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/docs/COWORK_LANDING_PAGE.md and execute all subtasks.

Create the marketing page at /Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/marketing/

Use the brand tokens from /brand/tokens/zhuzh-tokens.css. The logo is at /brand/logos/zhuzh-wordmark-sparkle.svg.

For the form, use Formspree (formspree.io) — it's the fastest path to working email capture.

Start with Subtask 1, then run Subtasks 2-6 in parallel. Finish with Subtask 7 (polish) and Subtask 8 (deploy).

Make it beautiful and make it sell. This needs to convince creative agency leaders to join our pilot program. ✨
```
