# ResourceFlow Research Brief
## Market Landscape & Design Principles for a Slack-First Resourcing Tool

*Prepared for the Use All Five Vibecoding Workshop*
*Team: Levi (CEO), Ryan (Conceptual Director), Michelle (Managing Director), Maleno (Producer), Kara (Producer)*

> **Last updated:** January 8, 2026 — Post Jam Sesh  
> **Status:** Active  
> **Maintained by:** Claude

---

## Executive Summary

The timekeeping software market in December 2025 is crowded but underserves creative agencies. Most tools focus on surveillance-style time capture, when what agencies actually need is **confirmation of planned work**—a fundamentally different mental model.

Use All Five's opportunity: Build a Slack-native "planned vs. actual" system that treats resourcing as the primary activity and time confirmation as a lightweight weekly check-in. This approach is simpler to build, easier to adopt, and more aligned with how creative agencies actually operate.

**Key insight from research:** The tools winning loyalty prioritize one-click capture, trust-based design, and integration with existing workflows over comprehensive feature sets. A "Looks Good ✓" button that handles 70% of weeks is worth more than a sophisticated timer that nobody uses.

**Validated by team:** Kara confirms employees only engage with time tools 1-2x per week. The confirmation model matches reality.

**Jam Sesh validation:** Maleno said of the prototype: "You could totally sell someone on a product like this." The team is aligned on the core approach.

---

## What We Learned from the Team

Before building, we interviewed each domain owner. Their feedback shapes everything.

### The Trust Equation (from Levi)

Levi, as CEO, defined what makes resourcing data trustworthy:

**Trust = Accuracy + Adoption + Auditability**

| Factor | What He Said |
|--------|--------------|
| Accuracy | "Works with actual behavior (weekly updates), still gives reliable picture" |
| Adoption | "If the team hates using it, the data will be garbage" |
| Auditability | "I need to drill down: 'over budget because 40 extra hours on QA in week 3'" |

**What makes him doubt current data:**
- Allocations that don't match reality
- Stale entries from forgotten updates
- No plan vs. actual reconciliation
- "Done" projects still showing active

**Key metrics:** Budget burn vs. % complete, team utilization, at-risk projects.

**Decisions this unlocks:** Pricing with confidence, staffing based on data, client conversations with receipts, project triage before blowups.

### The Big Picture Problems

| Problem | Who Said It | Impact |
|---------|-------------|--------|
| "No visibility into company-wide priorities" | Maleno | Can't plan when you don't know what else is happening |
| "Hard to see the bigger picture" | Kara, Maleno | Need company-wide view, not just per-project |
| "Find out about overwhelm too late" | Maleno | Proactive alerts needed before burnout |
| "People just confirm estimated hours" | Michelle | Rubber-stamping undermines data trust |
| "External tool = easy to forget" | Kara | Slack-native is critical |
| "Things get lost in Slack channels" | Kara | Use DMs, not channel posts |
| "Mass resource changes are painful" | Michelle | Bulk editing + natural language essential |
| "10000ft is slow with hidden buttons" | Maleno | One-page, no-hunting design |
| "Can't quickly see what a project is about" | Michelle, Maleno | Project snippets needed |

### What They Actually Want

**Levi (CEO):**
- Audit trail with drill-down capability
- Budget burn vs. % complete at a glance
- At-risk project flagging
- Data he can trust for client billing

**Maleno (Resource Planning):**
- Plans at project level, then week-by-week sprints
- Needs priority projects scheduled first, then availability
- Wants PTO/holidays visible (keeps getting surprised)
- Ideal: Thursday finalization → Monday clarity
- Proactive flagging: let people say "not enough hours"
- Quick project context without drilling in

**Michelle (Approvals):**
- Approves fast when she trusts the person or recognizes the work
- Digs deeper when actual = planned exactly (rubber-stamp signal)
- Likes Smartsheet's budget dashboard breakdowns (phase, role, person)
- Wants real-time alerts, not monthly reports
- Needs ability to combine/manipulate phase data
- Mass resource changes via natural language

**Kara (Employee Experience):**
- People forget because it's "not a natural part of workflow"
- Surprise work: client calls, last-minute requests, tasks taking longer
- Inbox = to-do list for her; email reminders might work better
- Wants scope broken down: hours per week per teammate, not just total
- Custom reports for things like mid-month budget pulls

**Ryan (Calendar Integration Idea):**
- Google Calendar integration for smart notification timing
- Account for every-other-Friday off, PTO, half-days
- Send confirmations at strategic times, not rigid Friday 3pm
- PTOverlap detection — alert when similar roles are both out

---

## Voice Interface Research (from Jam Sesh)

During the Jam Sesh, Ryan asked the team about using voice for mass resource changes:

| Person | Would Use Voice? | Preferred Mode |
|--------|------------------|----------------|
| **Michelle** | Yes | Directive: "Move Sam to Cindy on Agent Challenge" |
| **Maleno** | Maybe | Questions: "Give me a suggestion for how to cover this" |
| **Kara** | No | Prefers typing |

**Key insight from Maleno:**
> "I wouldn't say like do this, do that. I would ask it questions like give me a suggestion... then it's doing the math for me."

**Implications:**
1. Start with text-based natural language commands (Phase 1)
2. Add voice as optional enhancement (Phase 2/3)
3. Support both **directive mode** ("do X") and **suggestion mode** ("help me with Y")
4. Don't force voice on people who prefer typing

---

## Feature Discovery: Workload Risk

During the Jam Sesh, Kara mentioned a feature she discovered in 10,000ft:

> "There was a cool thing that I never saw before called workload risk... I think we hadn't seen it before because we weren't putting future stuff in."

**What it does:** Shows risk level when you've scheduled people far enough in advance.

**Our takeaway:** Worth investigating for ResourceFlow. Calendar integration enables this naturally—we can predict workload risk based on allocations + PTO + meeting load.

---

## The Competitive Landscape (2025)

### What's Out There

| Tool | Annual Cost (30 users) | Strength | Weakness |
|------|------------------------|----------|----------|
| **Smartsheet + 10000ft** | ~$6,000-8,000 | Budget tracking, resourcing views | Time tracking UX is clunky, no Slack-native experience |
| **Float** | ~$4,500 | Best-in-class resource scheduling, new AI/MCP integrations | No time confirmation—planning only |
| **Harvest** | ~$4,000 | Simple timers, invoicing integration | Weak resourcing, feels like surveillance |
| **Toggl Track** | ~$6,500 | Flexible tracking, good reports | Separate product for planning (Toggl Plan) |
| **Clockify** | Free-$1,500 | Generous free tier | **No native Slack app**, screenshot monitoring feels invasive |

### The Gap We're Filling

No existing tool combines:
1. **Slack-native confirmation** (not just timer start/stop)
2. **Resourcing as the primary data** (allocations drive everything)
3. **Trust-based design** (confirm what was planned, not track every minute)
4. **Company-wide visibility** (see all projects + priorities at once)
5. **Proactive issue surfacing** (flag problems before burnout)
6. **Project context at a glance** (snippets/tooltips)
7. **Natural language resource management** (text/voice commands)
8. **Calendar-aware intelligence** (PTOverlap, smart timing)

---

## Why "Confirm Your Week" Beats Time Tracking

### The Traditional Model (What Most Tools Do)
```
Employee starts timer → Works → Stops timer → Repeat all day
Friday: Review entries, fix mistakes, submit
Manager: Review every line item, approve
```
**Problems:** Requires constant discipline, easy to forget, feels like surveillance, creates administrative burden.

### The ResourceFlow Model
```
PM allocates resources for the week (finalize by Thursday)
Monday: Employee sees their week, can flag issues immediately
Friday: Employee confirms or adjusts a few numbers
Manager: Approve with one click, review anomalies only
```
**Advantages:** Low friction, pre-filled data, only track exceptions, trust-based.

### Team Validation

- **Kara confirms:** People only engage 1-2x per week anyway
- **Maleno confirms:** Already thinks in weekly sprints
- **Michelle confirms:** Budget dashboard is valuable—Smartsheet gets it mostly right
- **All agree:** Company-wide visibility is missing from current tools

---

## Design Principles for ResourceFlow

Based on team feedback and market research:

### 1. Trust = Accuracy + Adoption + Auditability
Levi's formula. If the team hates using it, the data is garbage. If you can't drill down, you can't trust the numbers.

### 2. One Page, No Hunting
Maleno: "10000ft has too many hidden buttons. It's slow. It's not intuitive." Everything visible, no nested menus.

### 3. Company-Wide View First
Both Kara and Maleno want to see the big picture—all projects, all priorities, all people. Not siloed by project.

### 4. Proactive, Not Reactive
Maleno: "We find out when someone feels stressed or productivity drops—we're already late." Surface risks early with flagging and capacity alerts.

### 5. Trust Signals
Michelle approves fast when she trusts the data. Flag rubber-stamping (actual = planned) so she knows what to review.

### 6. Meet People Where They Are
Kara: "It's not a natural part of workflow—an external tool." Slack DMs, not channel posts. Consider email for inbox-as-to-do-list people. Calendar-aware timing.

### 7. Thursday → Monday Rhythm
Maleno: "Decisions finalized by Thursday. Monday, everyone knows their week." Build this cadence into the product.

### 8. Beautiful Enough to Trust
Material Design polish signals "this is a real product." Janky UI undermines confidence in the data.

### 9. Quick Context, Not Drilling
Project snippets on hover. Users shouldn't need to navigate away to understand what a project is about.

### 10. LLM-Assisted, Not LLM-Dependent
Use AI to reduce friction (natural language commands, smart suggestions), but ensure core functionality works without it.

---

## UI/UX Patterns That Drive Adoption

### From Research: What Actually Works

**1. Pre-filled > Blank Slate**
Tools with pre-filled data (from calendar, allocations, or past entries) have significantly higher completion rates than blank timesheets. *Validated: Our confirmation model does this.*

**2. Weekly Views > Daily Entry**
Creative work doesn't fit neat daily buckets. Weekly confirmation with project totals matches how people actually think about their time. *Validated: Maleno thinks in weekly sprints.*

**3. Visual Memory Aids**
Timeline views showing gaps between entries help people remember forgotten work. Color-coded projects provide instant recognition.

**4. Gentle Reminders > Punitive Alerts**
Friendly Friday DMs work. "You haven't submitted in 3 days" warnings feel like surveillance.

**5. One-Click Approvals**
Managers should spend <15 minutes/week on approvals. Bulk approve for clean submissions; drill in only for anomalies. *Michelle: "I approve instantly when I trust the person."*

**6. Context on Hover**
Project snippets let users understand context without losing their place. Reduces cognitive load and unnecessary navigation.

**7. Natural Language Input**
Instead of clicking through menus to move resources, type what you want: "Move Sam to Cindy on Agent Challenge." Reduces friction for common bulk operations.

### Material UI Component Mapping

| Pattern | MUI Component | Usage |
|---------|---------------|-------|
| Project list with hours | **DataGrid** with editable cells | Timesheet entry |
| Budget progress | **LinearProgress** with labels | Dashboard cards |
| Status indicators | **Chip** with color variants | Approved/Pending/Rejected |
| Allocation blocks | **Card** with drag handles | Resource calendar |
| Quick actions | **SpeedDial** or **Fab** | Add time, flag issue |
| Approval queue | **List** with **Checkbox** | Batch operations |
| Phase breakdowns | **Tabs** | Budget dashboard views |
| Project context | **Tooltip** | Project snippets |
| Natural language input | **TextField** with autocomplete | Mass changes |

---

## Slack Integration: What Works

### Existing Slack Time Apps (Limited)

| App | What It Does | Limitation |
|-----|--------------|------------|
| **Harvest** | `/harvest start`, status checks, reminders | Timer-focused, no confirmation flow |
| **Toggl** | Start/stop timers, natural language queries | Still in beta, no batch operations |
| **Clockify** | **No native app** — requires Zapier workarounds | Major gap for market leader |

### What ResourceFlow Does Better

**Key insight from Kara:** Things get lost in Slack *channels*. Use DMs.

**The Friday DM:**
```
📅 Time to confirm your week!

Here's what was planned for Dec 16–20:
┌─────────────────────────────────────────┐
│ Google Cloud UX          24 hrs        │
│ Patina                   12 hrs        │
│ Internal/Admin            4 hrs        │
├─────────────────────────────────────────┤
│ Total                    40 hrs        │
└─────────────────────────────────────────┘

[Looks Good ✓]  [Adjust Hours]  [Flag Issue]
```

**The key UX decisions:**
1. **DM, not channel** — Kara's feedback: things get lost
2. **Pre-filled with planned data** — Employee doesn't start from zero
3. **"Looks Good" as the default path** — One tap for 70% of weeks
4. **"Flag Issue" option** — Proactive communication (Maleno's request)
5. **Notes for context** — "Client calls ran long" explains variance
6. **Smart timing** — Send early if employee has Friday off (Phase 2)

---

## Calendar Integration Insights

From Jam Sesh discussion and `calendar-integration.md`:

### PTOverlap Detection

**The Problem:** Two senior developers both take the same week off. Nobody notices until Monday when work isn't getting done.

**The Solution:** Google Calendar integration detects when similar roles have overlapping PTO—weeks in advance.

**Kara's reaction to this idea:** Immediate interest. She currently manually checks calendars before resourcing.

### Smart Notification Timing

**The Problem:** Friday 3pm confirmation goes to someone who left Thursday for a long weekend.

**The Solution:** Check calendar, send earlier if employee will be out.

**Michelle's caution:** Don't over-rely on calendar for standing meetings that get cancelled. Use it as a signal, not gospel.

---

## What This Means for the Workshop

### Build Order (Recommended)

1. **Database schema in Firestore** — Projects, users, allocations, confirmations
2. **Budget dashboard (web)** — Prove the data model works, give Michelle something to see
3. **Project snippets** — Quick context on hover
4. **Friday confirmation (Slack)** — The core employee experience, Kara's domain
5. **Approval flow (Slack + web)** — Close the loop, Michelle's domain
6. **Resource calendar (web)** — PM allocation view, Maleno's domain
7. **Calendar integration** — Smart timing, PTOverlap (Ryan's domain)

### What to Skip (For Now)

- Real-time timers (Phase 2)
- Email notifications (Phase 2)
- Voice interface (Phase 2/3)
- LLM-powered project creation (Phase 2)
- Calendar sync (Phase 3)
- AI-assisted anomaly detection (Phase 3)
- Mobile app (Slack mobile works fine)

### Success Looks Like

By end of workshop, you should be able to:
1. Create a project with a budget in the web app
2. Allocate someone to that project for a week
3. Trigger a Friday confirmation DM in Slack
4. Confirm hours with one click
5. See the budget burn update on the dashboard

That's the complete loop. Everything else is polish.

---

## Appendix: Key Sources

- Float resource management research (2025)
- Toggl Track and Harvest user reviews (G2, Capterra)
- Clockify limitations analysis
- Slack Block Kit documentation
- Material UI v5 component library
- **Use All Five team interviews** (Levi, Michelle, Maleno, Kara)
- **Ryan's product vision** (calendar integration, command center workflow)
- **Jam Sesh transcript** (January 7, 2026)

---

## Appendix: Jam Sesh Key Quotes

**Maleno on the prototype:**
> "You could totally sell someone on a product like this."

**Michelle on mass changes:**
> "Can you tell resource flow that instead of Sam, we're going to have Cindy on agent challenge moving forward and then it just completely moves all of his time from agent challenge to her?"

**Maleno on voice:**
> "I wouldn't say like do this, do that. I would ask it questions like give me a suggestion... then it's doing the math for me."

**Kara on DMs:**
> "A DM would be better than a channel post. There's so many messages happening that people don't see them."

**Michelle on employee budget visibility:**
> "Maybe it's hours that employees see and the four of us and Levi see budget." (Team agreed)

---

## 📦 Archive

<details>
<summary>v2 — January 7, 2026 (Pre Jam Sesh)</summary>

Key differences from current:
- Did not include Voice Interface Research section
- Did not include Feature Discovery: Workload Risk section
- Did not include Calendar Integration Insights section
- Did not include Jam Sesh Key Quotes appendix
- Did not have project snippets in gap analysis
- Did not have natural language resource management in gap analysis
- Did not have calendar-aware intelligence in gap analysis
- Missing design principles 9-10 (Quick Context, LLM-Assisted)

</details>

---

*This research brief is a living document. Claude updates it during workshop sessions.*
