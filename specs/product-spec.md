# ResourceFlow: Slack-First Resourcing & Budget Tracker

## Product Spec for Use All Five (~30 people)

> **Last updated:** January 8, 2026 — Post Jam Sesh  
> **Status:** Active  
> **Maintained by:** Claude (updates automatically during sessions)

---

## Workshop Team & Domains

This spec is being built collaboratively via the `#resourceflow-workshop` Slack channel.

| Person | Role | Domain Ownership |
|--------|------|------------------|
| **Levi** | CEO | Strategic Vision — ensures this serves the business |
| **Ryan** | Conceptual Director | Facilitator — leads the build |
| **Michelle** | Managing Director | Approvals & Reporting — owns the manager experience |
| **Maleno** | Producer | Resource Planning — owns the allocation UX |
| **Kara** | Producer | Employee Experience — owns the confirmation flow |

---

## What We Learned from the Team

Before building, we asked each domain owner about their pain points and wishes. Here's what's driving our decisions:

### 🎯 The Trust Equation (from Levi)

Levi defined what makes him trust resourcing data:

| Trust Factor | What It Means |
|--------------|---------------|
| **Consistent accuracy** | Works with actual behavior (weekly updates), still gives reliable picture |
| **Clear audit trail** | Drill down on variance: "40 extra hours on QA in week 3" |
| **Friction-free input** | "If the team hates using it, the data will be garbage" |

**What makes him doubt current data:**
- Allocations that don't match reality (scheduled but pulled elsewhere)
- Stale entries — people forget to log or update
- No easy plan vs. actual reconciliation
- "Done" projects still showing active resources

**Key metrics he wants at a glance:**
1. Budget burn vs. % complete — "Are we going to make money?"
2. Team utilization — "Do we have capacity?"
3. At-risk projects — "What needs intervention now?"

**Decisions this unlocks:** Pricing new work, staffing, client conversations with receipts, project triage, capacity planning.

### 🔥 Key Pain Points

| Problem | Who Raised It | What This Means for Us |
|---------|---------------|------------------------|
| No visibility into company-wide priorities | Maleno | Build a single view showing all projects + priority levels |
| Can't see the bigger picture | Kara, Maleno | Dashboard shows whole company, not just one project |
| Find out about overwhelm too late | Maleno | Proactive alerts when someone's at capacity risk |
| People just confirm estimated hours | Michelle | Flag when actual = planned exactly (possible rubber-stamping) |
| External tool = easy to forget | Kara | Slack-native is critical—meet people where they are |
| Things get lost in Slack channels | Kara | Use DMs, not channel posts; consider email option |
| Mass resource changes are painful | Michelle | Bulk editing + natural language commands for resource shuffling |
| 10000ft UI is slow and hidden | Maleno | Simple, one-page view. No hunting for buttons |
| Allocations don't match reality | Levi | Need sync between plan and actual |
| Projects "done" but still active | Levi | Project lifecycle management needed |
| Can't quickly see what a project is about | Michelle, Maleno | Project snippets/tooltips for quick context |
| Custom reports are useful | Kara | Custom report builder for saved views |

### 💡 Feature Requests from the Team

1. **Hours per week per teammate by phase** — Scope broken down, not just total budget (Kara)
2. **Priority-based scheduling** — High-priority projects scheduled first, then show remaining availability (Maleno)
3. **PTO/holiday visibility** — Stop getting surprised by time off (Maleno)
4. **Proactive flagging** — Let people say "I don't have enough hours" or "this is mis-scoped" (Maleno)
5. **Thursday finalization → Monday clarity** — Decisions locked by Thursday, everyone knows their week Monday (Maleno)
6. **Real-time alerts** — Slack/email when something's off, not monthly reports (Michelle)
7. **Phase/role/person breakdowns** — Keep this from current tool (Michelle)
8. **Combine phase data** — Manipulate/merge figures in dashboard (Michelle)
9. **Audit trail with drill-down** — "40 extra hours on QA in week 3" not just "over budget" (Levi)
10. **Calendar-aware notifications** — Integrate with Google Calendar to send confirmations at the right time based on PTO, half-days, every-other-Friday patterns (Ryan)
11. **PTOverlap detection** — Alert when similar roles have overlapping PTO (Ryan)
12. **Project snippets/tooltips** — Quick project context without drilling in (Michelle, Maleno)
13. **Mass resource changes via text** — Natural language commands like "move Sam to Cindy on Agent Challenge" (Michelle)
14. **Custom reports** — Save and reuse report configurations (Kara)

### ✅ What's Validated

- **"Confirm your week" model works** — Kara confirms people only engage 1-2x/week anyway
- **Slack DM approach is right** — But make it a DM, not channel post (things get lost)
- **Budget dashboard is valuable** — Michelle says Smartsheet gets this mostly right
- **Weekly sprint mentality** — Maleno already thinks in weeks; aligns with our model
- **Prototype design is on track** — Maleno: "You could totally sell someone on this"

### 🔒 Locked Decisions (from Jam Sesh)

| Decision | Details | Source |
|----------|---------|--------|
| **Employee Budget Visibility** | Employees see hours/percentages; Management sees dollars | Team consensus |
| **DMs not Channels** | All notifications via Slack DM, not channel posts | Kara confirmed |
| **Burnout Detection** | Deprioritized — too nuanced, leave for later phases | Michelle, Ryan |
| **Voice Interface** | Phase 2/3 — start with text-based commands, voice later | Team consensus |

---

## Core Concept

**ResourceFlow is a "planned vs. actual" confirmation system, not a surveillance time tracker.**

The mental model:
- Producers/PMs **plan the week** by allocating people to projects
- Employees **confirm or adjust** what actually happened
- Managers **approve** with one click
- Everyone **sees budget health** in real-time

The goal is accuracy for billing and capacity planning, not squeezing extra minutes out of people.

---

## Design Principles (From Team Feedback)

1. **Trust = Accuracy + Adoption + Auditability** — Levi's formula for believing the data
2. **One page, no hunting** — Maleno hates hidden buttons; everything visible
3. **Company-wide view first** — Both Kara and Maleno want the big picture
4. **Proactive, not reactive** — Surface problems before burnout (Maleno)
5. **Audit trail with drill-down** — "Over budget because of X" not just "over budget" (Levi)
6. **Trust signals** — Flag rubber-stamping so Michelle can trust the data
7. **Meet people where they are** — Slack DMs, not external tools (Kara)
8. **Thursday → Monday rhythm** — Lock decisions Thursday, clarity by Monday (Maleno)
9. **Beautiful enough to trust** — Janky UI undermines confidence in data
10. **LLM-assisted, not LLM-dependent** — Smart features that degrade gracefully

---

## Design System

The web app uses **Material UI (MUI)** for a polished, professional look:

- **DataGrid** for tables, timesheets, and the resource calendar
- **Cards** for project summaries and budget widgets
- **Dialogs & Modals** for forms and confirmations
- **Chips** for status indicators (Approved, Pending, Rejected)
- **LinearProgress** for budget burn visualization
- **Avatars & AvatarGroups** for team member displays
- **Tooltips** for project snippets (quick context on hover)

Color palette can be customized to Use All Five's brand, but start with MUI defaults for speed.

---

## User Roles

| Role | Primary Actions | Where They Work |
|------|-----------------|-----------------|
| **Producer/PM** | Create allocations, view budgets, manage projects | Web app (drag-and-drop calendar) |
| **Employee** | Confirm weekly hours, adjust if needed, add unplanned work | Slack DM (90%) + Web for edits |
| **Admin/Manager** | Approve timesheets, view reports, manage team | Web app + Slack notifications |

### Budget Visibility by Role (LOCKED)

| Role | What They See |
|------|---------------|
| **Employee** | Hours and percentages (e.g., "280 of 400 hrs", "70%") |
| **Producer/PM** | Hours, percentages, AND dollars |
| **Admin/Manager** | Full financial view (hourly rates, revenue, margin) |

---

## The Core Flows

### Flow 1: Resource Allocation (Producer/PM)

**Where:** Web app

**Weekly ritual:** Producer opens the resource calendar and drags team members onto projects for the upcoming week(s). **Goal: finalize by Thursday** so everyone knows their Monday.

**Interface:**
- **Single-page view** — No scrolling through multiple pages (Maleno's request)
- Horizontal timeline (weeks across top)
- Team members as rows
- **Priority projects shown first** — Then remaining availability (Maleno's request)
- **PTO/holidays visible** — No more surprises (Maleno's request)
- Color-coded by project
- Capacity indicator shows over/under allocation
- Click block to set: project, hours, phase, billable/non-billable
- **Project snippets on hover** — Quick context without leaving the view

**Mass Resource Changes (Michelle's request):**

Instead of manually dragging blocks, PMs can use natural language:
- "Move Sam to Cindy on Agent Challenge"
- "Push Brooklyn Rail out by one week"

**Data created:**
```
Allocation {
  employee_id
  project_id
  phase (design, development, etc.)
  week_start_date
  planned_hours
  billable: boolean
  notes (optional)
}
```

### Flow 2: Weekly Confirmation (Employee)

**Where:** Slack DM (not channel — things get lost per Kara), Web (fallback)

**Trigger:** Friday 3pm automated DM (configurable, calendar-aware in Phase 2)

**The "Confirm Your Week" Modal:**

```
┌─────────────────────────────────────────────────┐
│  ✔ Confirm Your Week                            │
│  Dec 16-20, 2024                                │
├─────────────────────────────────────────────────┤
│                                                 │
│  Google Cloud UX              [24 hrs] → [___]  │
│  Patina                       [12 hrs] → [___]  │
│  Internal/Admin               [ 4 hrs] → [___]  │
│                                                 │
│  ─────────────────────────────────────────────  │
│  Total Planned: 40 hrs                          │
│  Your Adjusted Total: 40 hrs                    │
│                                                 │
│  [+ Add Unplanned Work]                         │
│                                                 │
│  Notes (optional):                              │
│  ┌───────────────────────────────────────────┐  │
│  │ Client calls ran long on Tuesday          │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  [Cancel]                    [Submit Week ✓]    │
└─────────────────────────────────────────────────┘
```

**Key UX decisions:**
1. Pre-filled with planned hours (employee doesn't start from zero)
2. Editable fields for actual hours
3. "Add Unplanned Work" for surprise tasks (Kara's input)
4. Optional notes for context
5. One-tap submit when everything matches

### Flow 3: Manager Approval

**Where:** Slack notification + Web dashboard

**Trigger:** Employee submits confirmation

**Slack Notification:**
```
📋 Sarah submitted their timesheet

Week of Dec 16-20:
┌────────────────────────────────────────┐
│ Project          Planned    Actual     │
├────────────────────────────────────────┤
│ Google Cloud UX    24 hrs   28 hrs ⚠️  │
│ Patina             12 hrs   12 hrs     │
│ Internal/Admin      4 hrs    4 hrs     │
├────────────────────────────────────────┤
│ Total              40 hrs   44 hrs     │
└────────────────────────────────────────┘

⚠️ +4 hrs variance on Google Cloud UX
📝 Note: "Client calls ran long on Tuesday"

[Approve ✓]  [Reject & Comment]  [View Details]
```

**Anomaly Detection:**
- **⚠️ Variance warning** when actual differs from planned by >10%
- **🔍 Rubber-stamp warning** when actual = planned exactly (Michelle's insight)
- **Notes surfaced** so manager has context

---

## Database Schema

```
Organizations
  ├── id, name, slack_workspace_id

Users
  ├── id, org_id, email, name, role, slack_user_id
  └── roles: 'employee', 'pm', 'admin'

Clients
  ├── id, org_id, name

Projects
  ├── id, org_id, client_id, name, budget_hours, hourly_rate
  ├── is_billable, is_active, priority
  └── phases[] (design, development, QA, etc.)

Allocations (planned time)
  ├── id, project_id, user_id, phase
  ├── week_start, planned_hours
  └── billable, notes

TimeConfirmations (submitted timesheets)
  ├── id, user_id, week_start
  ├── status (draft/submitted/approved/rejected)
  ├── submitted_at, approved_by, approved_at
  ├── exact_match_flag (for rubber-stamp detection)
  └── has many TimeEntries

TimeEntries (line items)
  ├── id, confirmation_id, project_id, phase
  ├── planned_hours, actual_hours
  └── notes

IssueFlags
  ├── id, user_id, project_id, week_start
  ├── flag_type (hours, scope, overwhelm)
  ├── notes
  └── resolved_at
```

---

## Slack Commands Summary

| Command | Who | What it does |
|---------|-----|--------------|
| `/week` | Employee | Opens "Confirm Your Week" modal |
| `/week last` | Employee | Opens confirmation for previous week |
| `/flag` | Employee | Flag an issue with current week |
| `/budget [project]` | Anyone | Quick budget status |
| `/team` | PM/Admin | Shows team utilization this week |
| `/pending` | Admin | Shows pending approvals |

---

## Notification Schedule

| When | Who | What |
|------|-----|------|
| Monday 9am | Employee | "Your week has been scheduled" (DM) |
| Friday 3pm | Employee | "Time to confirm your week" (DM) |
| Friday 5pm | Employee | Reminder if not submitted (DM) |
| Real-time | Admin | Individual submission notification |
| Real-time | PM | Budget alerts (75%, 90%, projected overrun) |
| Real-time | PM | Issue flags from employees |
| On rejection | Employee | "Your timesheet needs revision" with comments |

---

## Web App Views (Material UI)

### 1. Resource Calendar (Maleno's domain)
- **Single-page view** — No scrolling through sub-pages
- **MUI DataGrid** with custom cell renderers for allocation blocks
- Horizontal scrolling timeline (weeks as columns)
- Team members as rows with **Avatar** components
- **Priority projects shown first** with visual indicator
- **PTO/holidays visible** inline
- Color-coded by project using **Chip** components
- Capacity utilization shown with **LinearProgress**
- Filter toolbar using **Autocomplete** and **DatePicker**
- **Bulk edit mode** for mass changes
- **Project snippets on hover**

### 2. My Timesheet (Kara's domain)
- **DataGrid** with editable cells for hour adjustments
- Weekly view similar to Slack modal
- Status shown with colored **Chips** (Draft, Submitted, Approved)
- Edit past weeks if not yet approved
- **Timeline** component for approval history
- **Flag Issue** button for proactive communication
- **Budget shown in hours/percentages** (not dollars for employees)

### 3. Approval Queue (Michelle's domain)
- **List** or **DataGrid** of pending submissions
- **Alert** components for anomaly highlighting
- **⚠️ Exact-match warning** when actual = planned
- **Checkbox** selection for bulk approve
- **Dialog** for rejection with required comment
- Quick stats in **Card** components at top
- **Bulk edit mode** for mass changes

### 4. Budget Dashboard (Michelle's domain)
- **Card** grid showing all active projects
- **LinearProgress** bars for burn status
- **Tabs for breakdown:** by phase, role, person (Michelle's request)
- **Typography** for projected completion dates
- **Alert** banners for over/under budget
- **Data manipulation** — Combine/merge phase figures
- **Button** to export to CSV
- **Custom reports** — Save and reuse configurations

### 5. Company-Wide View
- All projects at a glance
- Priority ranking visible
- Team utilization heat map
- Who's over-allocated / has capacity
- Issue flags surfaced
- **Project snippets on hover**
- **PTOverlap alerts**

### 6. Reports (Admin view)
- **Tabs** for different report types
- **DataGrid** with sorting and filtering
- **Charts** via Recharts or MUI X Charts
- Utilization, billable breakdown, profitability views
- **Saved reports** for quick access

---

## Technical Considerations

### Frontend Stack
- **React 18** with functional components and hooks
- **Material UI (MUI) v5** for all UI components
- **MUI X DataGrid** for tables and resource calendar
- **Emotion** for any custom styling (comes with MUI)
- **React Router** for navigation

### Slack App Setup
- Slash commands (above)
- Interactive modals (Block Kit)
- Scheduled DMs (not channel posts)
- OAuth for workspace install

### Database
- **Firestore** on GCP (per CTO recommendation for Workshop 2)
- Or Postgres via **Supabase** (alternative)
- Row-level security by organization
- Real-time subscriptions for live updates

### Auth
- Slack OAuth for employees (SSO with workspace)
- Fallback for web-only access

### Hosting
- **GCP** (aligns with CTO's Firestore recommendation)
- Or **Vercel** for quick prototyping

### LLM Integration (Gemini)
- **Onboarding:** Feed screenshots, handbooks → auto-configure ResourceFlow
- **Project creation:** Free-form describe project → auto-create structure
- **Mass changes:** Natural language → resource moves (Phase 1: text, Phase 2: voice)
- **Calendar analysis:** Detect PTO conventions from calendar patterns

See `calendar-integration.md` and `llm-onboarding.md` for details.

---

## MVP Scope for Workshop

**Phase 1: The Core Loop**
1. Admin can create projects with budgets and phases
2. **Project snippets** — Quick context on hover
3. Admin can create allocations (simple form, not drag-drop yet)
4. Employee gets Friday Slack DM
5. Employee confirms via modal
6. Admin approves via Slack
7. Budget dashboard shows burn (hours for employees, dollars for management)
8. **Audit trail** — Drill into variance by week/person/phase (Levi's requirement)
9. **Rubber-stamp detection** — Flag when actual = planned exactly

**Phase 2: Calendar + Polish**
- Google Calendar integration
- **PTOverlap detection**
- Smart notification timing
- Drag-and-drop resource calendar
- Priority-based project ordering
- PTO/holiday visibility
- **Mass resource changes via text**
- **Custom reports**
- Email notification option
- Timer feature for those who want it
- Project lifecycle management (mark "done" properly)

**Phase 3: Nice-to-Have**
- **Voice interface** for mass changes
- **LLM-powered project creation**
- Calendar sync for auto-suggested time from meetings
- Slack channel → project linking
- AI-assisted anomaly detection
- Integration with invoicing tools
- Historical data for pricing future work

---

## Success Metrics

1. **Confirmation rate:** >90% of employees confirm within 24 hrs of Friday prompt
2. **Accuracy:** <10% variance between planned and confirmed hours on average
3. **Admin time saved:** Approval queue cleared in <15 min/week
4. **Budget visibility:** PMs check dashboard at least 1x/week
5. **Proactive flags:** Issues surfaced before burnout
6. **PTOverlap catches:** Scheduling conflicts caught >1 week in advance

---

## Workshop Feedback Loop

Features are posted to `#resourceflow-workshop` for team feedback:

| Reaction | Meaning |
|----------|---------|
| 👍 | This works for me |
| 🤔 | I have questions |
| ✏️ | Needs changes (reply with details) |
| 🎯 | Aligns with vision (Levi's signal) |

Domain owners have "first review" on features in their area:
- **Michelle** reviews approval flows and dashboards
- **Maleno** reviews allocation and planning UX
- **Kara** reviews employee-facing confirmation flows

---

## Appendix: Competitor Pricing Reference

| Tool | 30-person annual cost | Notes |
|------|----------------------|-------|
| Smartsheet + 10000ft | ~$6,000-8,000 | Current state |
| Float | ~$4,500 | Best-in-class resourcing UX |
| Harvest | ~$4,000 | Great time tracking, weak resourcing |
| Toggl + Toggl Plan | ~$6,500 | Separate products |
| **Custom Slack app** | ~$0 + hosting | Your labor, your control |

Building this yourself means: no per-seat fees forever, exactly the workflow you want, and a great teaching tool for the team.

---

## Appendix: Voice Interface Notes (Phase 2/3)

From Jam Sesh discussion:

| Person | Would Use Voice? | How? |
|--------|------------------|------|
| **Michelle** | Yes | Directive commands: "Move Sam to Cindy on Agent Challenge" |
| **Maleno** | Maybe | Questions/suggestions: "Give me a suggestion for how to cover this" |
| **Kara** | No | Prefers typing |

**Conclusion:** Start with text input for natural language commands. Add voice later as optional enhancement.

**Maleno's insight:**
> "I wouldn't say like do this, do that. I would ask it questions like give me a suggestion... then it's doing the math for me."

This suggests the LLM should support both:
1. **Directive mode:** "Move X to Y" → executes action
2. **Suggestion mode:** "How should I handle this?" → recommends approach

---

## 📦 Archive

<details>
<summary>v2 — January 7, 2026 (Pre Jam Sesh)</summary>

Key differences from current:
- Did not include PTOverlap detection
- Did not include project snippets/tooltips
- Did not include mass resource changes via natural language
- Did not include custom reports
- Did not include voice interface notes
- Did not have locked decisions from Jam Sesh
- Did not have Maleno's prototype validation quote

</details>

---

*This is a living document. Claude updates it during workshop sessions.*
