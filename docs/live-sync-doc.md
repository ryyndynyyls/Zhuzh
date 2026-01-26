# ResourceFlow Workshop — Live Sync Document

> **This doc is the bridge between Slack and Claude.**  
> Pin important messages in #resourceflow-workshop with 📌 and they'll appear here automatically.  
> Claude reads this doc to stay in sync with team decisions.

> **Last updated:** January 8, 2026 (Post Jam Sesh)  
> **Status:** Active  
> **Maintained by:** Claude

---

## How This Works

1. **Discuss in Slack** → #resourceflow-workshop
2. **Pin key decisions** → React with 📌 to any message worth capturing
3. **Zapier syncs it here** → Pinned messages appear in the "Live Feed" section below
4. **Claude reads this doc** → Ryan can say "sync up" and Claude pulls the latest
5. **Decisions get locked** → Move finalized items to the "Decisions" section

---

## 🎯 Strategic Direction (Levi)

*Levi's answers to the pre-workshop questions + any strategic guidance he drops in.*

**What would make you trust this tool for resourcing decisions?**
> Trust = Accuracy + Adoption + Auditability. "If the team hates using it, the data will be garbage."

**What's the #1 thing Smartsheet/10000ft gets wrong?**
> Allocations don't match reality. No easy plan vs. actual reconciliation. Projects "done" but still showing active.

**If this works perfectly, what changes about how we run projects?**
> Pricing with confidence. Client conversations with receipts. Project triage before blowups.

**Additional notes:**
- Key metrics: Budget burn vs. % complete, team utilization, at-risk projects
- Needs drill-down: "40 extra hours on QA in week 3" — not just "over budget"

---

## 📋 Approvals & Reporting (Michelle)

*Michelle's domain: manager dashboards, approval flows, budget views.*

**What's your worst Monday morning with timesheets?**
> When people just rubber-stamp their estimates without actually thinking about what happened.

**When reviewing submissions, what makes you approve instantly vs. dig deeper?**
> Approve fast when I trust the person. Dig deeper when actual = planned exactly (possible rubber-stamping).

**What would you love to see on a budget dashboard?**
> Phase/role/person breakdowns. Real-time alerts, not monthly reports. Ability to combine/manipulate phase data.

**Additional notes (from Jam Sesh):**
- Wants mass resource changes via natural language: "Move Sam to Cindy on Agent Challenge"
- Employees should see hours, management sees dollars
- Project snippets for quick context without drilling in

---

## 📅 Resource Planning (Maleno)

*Maleno's domain: allocation UX, capacity planning, the PM workflow.*

**How far ahead do you typically plan allocations?**
> Project level first, then week-by-week sprints.

**What's the most annoying part of Smartsheet/10000ft right now?**
> "All on 1 page. No scrolling or clicking individual pages." Hidden buttons. Slow UI. Can't see the bigger picture.

**When someone's over-allocated, how do you want to find out?**
> Proactively! Not after burnout. Flag when someone doesn't have enough hours.

**Additional notes (from Jam Sesh):**
- Wants to see project context without drilling in (project snippets)
- Interested in phase dates/Gantt but "maybe not yet" for MVP
- On voice: Would ask questions ("give me a suggestion") not give directives

---

## ✅ Employee Experience (Kara)

*Kara's domain: Friday confirmation, handling surprises, making submission painless.*

**What makes people forget to submit time?**
> "It's not a natural part of workflow—an external tool."

**What "surprise" work happens that's hard to log?**
> Client calls, last-minute requests, tasks taking longer than expected.

**If Friday confirmation took 10 seconds, what would that look like?**
> DM with pre-filled hours, one tap to confirm.

**Additional notes (from Jam Sesh):**
- DMs are much better than channel posts — "things get lost in channels"
- Custom reports would be useful (like 10,000ft's custom report builder)
- Discovered "workload risk" feature in 10,000ft — worth copying
- Wouldn't use voice, prefers typing

---

## 📌 Live Feed from Slack

*Messages pinned with 📌 in #resourceflow-workshop appear here automatically via Zapier.*

| Timestamp | From | Message |
|-----------|------|---------|
| *(auto-populated)* | | |

---

## ✅ Decisions (LOCKED)

*Finalized decisions from Jam Sesh and team discussions.*

### Feature Decisions
- [x] **Employee Budget Visibility:** Employees see hours/percentages; Management sees dollars
- [x] **Notification Method:** Slack DMs, not channel posts (things get lost in channels)
- [x] **Burnout Detection:** Deprioritized — too nuanced, leave for later phases
- [x] **Voice Interface:** Phase 2/3 — start with text-based commands, voice later
- [x] **Confirmation Model:** Weekly "confirm your week" (not daily time entry)
- [x] **Rubber-stamp Detection:** Flag when actual = planned exactly

### UX Decisions
- [x] **One page, no hunting:** All key info visible without nested menus
- [x] **Company-wide view first:** Dashboard shows all projects, not siloed
- [x] **Project snippets:** Quick context on hover (tooltips)
- [x] **Thursday → Monday rhythm:** Finalize allocations Thursday, clarity by Monday

### Technical Decisions (Deferred to Workshop 2)
- [ ] Database: Firestore vs Supabase
- [ ] Hosting: GCP vs Vercel
- [ ] Auth approach finalized

---

## 🚧 Open Questions

*Things we still need to resolve.*

1. **Feature prioritization:** Awaiting team votes on Google Sheet
2. **Phase dates/Gantt:** How important for MVP? Maleno said "maybe not yet"
3. **Custom reports complexity:** How many saved views do we need?
4. **Project snippets content:** Exactly what info to show?
5. **Workshop 2 timing:** Confirm date (~2 weeks out)

---

## 🅿️ Parking Lot (Phase 2+)

*Good ideas we're not building yet.*

### Phase 2
- Voice interface for mass resource changes
- Google Calendar integration + PTOverlap detection
- Smart notification timing based on calendar
- Drag-and-drop resource calendar
- Mass resource changes via natural language
- Custom reports
- Email notification option
- Timer feature

### Phase 3
- LLM-powered project creation (describe project → auto-setup)
- Calendar sync for auto-suggested time from meetings
- AI-assisted anomaly detection
- Invoicing integration
- Historical data for pricing

---

## 🎸 Key Quotes from Jam Sesh

**Maleno on the prototype:**
> "You could totally sell someone on a product like this."

**Michelle on mass changes:**
> "Can you tell resource flow that instead of Sam, we're going to have Cindy on agent challenge moving forward and then it just completely moves all of his time?"

**Maleno on voice:**
> "I wouldn't say do this, do that. I would ask it questions like give me a suggestion... then it's doing the math for me."

**Kara on DMs:**
> "A DM would be better than a channel post. There's so many messages happening that people don't see them."

---

## 📊 Feature Voting Status

**Link:** [Priority Sheet](https://docs.google.com/spreadsheets/d/1fqGPctbG2UlDXdA6VIMn_Eja-S9cvEhm6q4iok7FamY/edit)

| Person | Voted? |
|--------|--------|
| Michelle | ✅ Complete |
| Maleno | ✅ Complete |
| Kara | ✅ Complete |

Scores averaged and phases determined.

---

## 📦 Archive

<details>
<summary>v1 — January 7, 2026 (Pre Jam Sesh Template)</summary>

This was the empty template before team responses were collected. Key differences:
- All team response sections contained placeholder text
- Decisions section was empty with placeholder items
- No Jam Sesh quotes section
- No feature voting status section
- Open questions were blank
- Parking lot was empty

</details>

---

*Last synced by Claude: January 8, 2026*

---

## 🗓️ Calendar Integration (January 14, 2026)

### Technical Decisions Locked
- [x] **OAuth Provider:** Google Calendar API with Internal audience (UA5 workspace only)
- [x] **Token Storage:** User-level tokens in `users` table
- [x] **Org Config:** Gemini-generated detection rules in `org_calendar_config` table
- [x] **Architecture:** Separate API server (port 3002) for OAuth callbacks
- [x] **Scopes:** `calendar.readonly` and `calendar.events.readonly` (read-only)

### Calendar Conventions Discovered
- **PTO:** Orange "Office" calendar, format `[Name] OOO`
- **Holidays:** Green "US Holidays" calendar
- **Alternating Fridays:** `Fridays off [M/DD]` events, detection by invite attendance
- **Partial days:** `[Name] OOO - half day` or `still reachable via slack`

### Next Steps for Calendar
1. Build Gemini config wizard into Settings
2. Display PTO in team views
3. PTOverlap detection
4. Smart notification timing

---

## 🎨 Premium Modal Design System (January 26, 2026)

### Decision: Two signature design treatments applied consistently across all modals

**Treatment 1: Glow Border** — Animated "breathing" border effect
- Use on: ALL modals and dialogs
- Function: `glowBorderStyles(color, options)`

**Treatment 2: Gradient Header** — Colored block at top of modal
- Use on: Entity detail modals (project, team member, client)
- NOT for: Quick action modals (confirm, reject, time entry)
- Function: `gradientHeaderStyles(color, options)`

**Color Selection Rules:**

| Entity Type | Color Source |
|-------------|--------------|
| Projects | `project.color` (user-selected) |
| Team Members | `getDisciplineColor()` or `stringToColor(name)` |
| Voice/AI | `GLOW_COLORS.zhuzh` (#80FF9C) |
| Audit/History | `GLOW_COLORS.info` (#45B7D1) |
| Warnings | `GLOW_COLORS.warning` (#FFF845) |

**Text on Gradients:**
- Most colors → White text
- Zhuzh green / Yellow → Dark text (#1E1D1B) for contrast

**Components Updated:**
- ProjectDetailModal — Glow + gradient header with folder icon
- ProjectSettingsPage — Gradient hero + GlowCards
- AddUnplannedWorkModal — Glow + gradient header (dark text)
- AuditTrailModal, RejectionDialog, SubProjectsSection, ManualTimeEntry — Glow only
