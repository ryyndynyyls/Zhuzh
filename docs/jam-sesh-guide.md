# 🎸 ResourceFlow Jam Sesh — Workshop 1 Guide

> **Last updated:** January 8, 2026  
> **Status:** ✅ COMPLETED  
> **Maintained by:** Claude

**Date:** January 7, 2026  
**Duration:** ~48 minutes (completed)  
**Team:** Ryan (facilitator), Michelle, Maleno, Kara  

---

## 🎯 Session Outcomes

### What We Accomplished
- ✅ Prototype walkthrough (web app + Slack mockups)
- ✅ Pain points discussion and validation
- ✅ Feature clarifications and new ideas surfaced
- ✅ Key decisions locked
- ⏸️ Feature voting → deferred to async (Google Sheet)
- ⏸️ Technical decisions → deferred to Workshop 2

### New Features Surfaced

| Feature | Source | Priority Signal |
|---------|--------|-----------------|
| **PTOverlap Detection** | Ryan | High — Calendar integration to detect when similar roles are both out |
| **LLM-Powered Project Creation** | Ryan | Core vision — Free-form describe project → auto-creates structure |
| **Project Snippets/Tooltips** | Michelle + Maleno | High value — Quick project context without drilling in |
| **Mass Resource Changes** | Michelle | Big pain point — "Move Sam to Cindy on Agent Challenge" via text/voice |
| **Custom Reports** | Kara | Mid priority — Like 10,000ft's custom report builder |
| **Workload Risk Feature** | Kara | Worth exploring — Discovered in 10,000ft |

### Decisions LOCKED ✅

| Decision | Details | Source |
|----------|---------|--------|
| **Employee Budget Visibility** | Employees see hours/%; Management sees dollars | Team consensus |
| **DMs not Channels** | All notifications via Slack DM, not channel posts | Kara confirmed |
| **Burnout Detection** | Deprioritized — too nuanced for MVP | Michelle, Ryan |
| **Voice Interface** | Phase 2/3 — start with text, voice later | Team consensus |

---

## 🚀 What We Built (30-Second Version)

**ResourceFlow** is a Slack-first tool that replaces Smartsheet + 10000ft.

The core idea is simple:
1. **Producers plan the week** → Allocate people to projects
2. **Employees confirm on Friday** → "Looks good" or adjust hours via Slack DM
3. **Managers approve** → One-click approval with smart flagging
4. **Everyone sees budget health** → Real-time dashboard

It's a **"planned vs. actual" confirmation system** — not surveillance time tracking.

---

## 👥 Your Domains

| Person | Domain | You Own... |
|--------|--------|------------|
| **Michelle** | Approvals & Reporting | Manager dashboards, approval flows, budget views, what triggers "dig deeper" |
| **Maleno** | Resource Planning | Allocation UX, capacity planning, the PM workflow, over-allocation warnings |
| **Kara** | Employee Experience | Friday confirmation, handling surprise work, making submission painless |
| **Ryan** | Facilitator | Keeps the session moving, prompts Claude, integrates decisions |

**When we build features in your domain, you have final say.** Speak up!

---

## 💡 What We Learned (Team Input + Jam Sesh)

### Levi's Trust Equation
> **Trust = Accuracy + Adoption + Auditability**
> "If the team hates using it, the data will be garbage."

He needs:
- Budget burn vs. % complete at a glance
- Audit trail: "40 extra hours on QA in week 3" — not just "over budget"
- At-risk project flagging

### The Big Pain Points

| Problem | Who Said It | Our Solution | Status |
|---------|-------------|--------------|--------|
| No visibility into company-wide priorities | Maleno | All-projects dashboard | ✅ In prototype |
| Can't see the bigger picture | Kara, Maleno | Company-wide view first | ✅ In prototype |
| Find out about overwhelm too late | Maleno | Proactive alerts + PTOverlap | 📜 Phase 2 |
| People just confirm estimated hours | Michelle | Rubber-stamp detection 🔍 | ✅ In prototype |
| External tool = easy to forget | Kara | Slack-native (DMs!) | ✅ In prototype |
| Things get lost in Slack channels | Kara | Use DMs, not channel posts | ✅ Locked |
| Mass resource changes are painful | Michelle | Natural language commands | 📜 Phase 2 |
| 10000ft UI is slow and hidden | Maleno | One page, no hunting | ✅ In prototype |
| Can't quickly see what a project is about | Michelle, Maleno | Project snippets/tooltips | 📜 Phase 1-2 |

### Feature Requests From Team

1. **Hours per week per teammate by phase** — Scope broken down (Kara) ✅
2. **Priority-based scheduling** — High-priority projects first (Maleno) ✅
3. **PTO/holiday visibility** — Stop getting surprised (Maleno) 📜
4. **Proactive flagging** — "I don't have enough hours" button (Maleno) ✅
5. **Thursday finalization → Monday clarity** — Rhythm (Maleno) ✅
6. **Real-time alerts** — Not monthly reports (Michelle) ✅
7. **Phase/role/person breakdowns** — Keep from current tool (Michelle) ✅
8. **Combine phase data** — Manipulate figures in dashboard (Michelle) 📜
9. **Audit trail with drill-down** — Know *why* something's over (Levi) ✅
10. **Calendar-aware notifications** — Send at the right time (Ryan) 📜
11. **PTOverlap detection** — Alert when similar roles are both out (Ryan) 📜 NEW
12. **Project snippets/tooltips** — Quick context on hover (Michelle, Maleno) 📜 NEW
13. **Mass resource changes via text** — Natural language commands (Michelle) 📜 NEW
14. **Custom reports** — Saved report configurations (Kara) 📜 NEW

### What's Validated ✅

- ✅ Weekly confirmation model works (Kara: people only engage 1-2x/week anyway)
- ✅ Slack DM approach is right (but DM, not channel!)
- ✅ Budget dashboard is valuable (Michelle: Smartsheet gets it mostly right)
- ✅ Weekly sprint mentality (Maleno already thinks this way)
- ✅ **Prototype design is solid** (Maleno: "You could totally sell someone on this")

---

## 🎯 Jam Sesh Agenda (COMPLETED)

| Time | What We Did | Outcome |
|------|-------------|---------|
| **0:00** | Kickoff — What we're building and why | ✅ |
| **0:05** | Prototype walkthrough — Web app demo | ✅ Validated |
| **0:15** | Prototype walkthrough — Slack mockups | ✅ Validated |
| **0:25** | Pain points discussion | ✅ New features surfaced |
| **0:35** | Feature clarifications | ✅ Decisions locked |
| **0:45** | Next steps — Feature voting, Workshop 2 | ✅ Deferred to async |

---

## 📊 Feature Voting

**Link:** [Priority Sheet](https://docs.google.com/spreadsheets/d/1fqGPctbG2UlDXdA6VIMn_Eja-S9cvEhm6q4iok7FamY/edit)

Score each feature **1-5**:
- **5** = Must have for launch
- **4** = Really want it
- **3** = Nice to have
- **2** = Can wait
- **1** = Not important

Scores averaged and sorted to determine Phase 1 vs Phase 2.

---

## 🖥️ The Prototypes (Reviewed)

### Web App Demo
Ryan walked through:
- Manager overview dashboard (pipeline, burn, at-risk projects)
- Timesheets pending approval (with rubber-stamp detection)
- Projects by priority with budget dashboard
- Team utilization (overallocated, at capacity, available)
- Resource calendar (week/month/day views)
- Employee view (hours, NOT dollars)

**Feedback:**
- Maleno: "Kind of nailed it"
- Michelle: "Love this already"
- Kara: Requested custom reports feature
- All: Employees should see hours, not dollars

### Slack Mockups
Ryan walked through:
- Monday DM — "Your week has been scheduled"
- Friday DM — "Time to confirm your week"
- Confirm modal with editable hours
- Add unplanned work with quick tags
- Manager approval notification
- `/budget` command for quick queries

**Feedback:**
- Kara: DMs are better than channels (things get lost)
- All: Smart timing based on calendar would be great

---

## 🧠 Key Insights from Discussion

### On Voice Interface

| Person | Would Use? | How? |
|--------|------------|------|
| Michelle | Yes | Directive: "Move Sam to Cindy on Agent Challenge" |
| Maleno | Maybe | Questions: "Give me a suggestion" |
| Kara | No | Prefers typing |

**Decision:** Start with text, add voice in Phase 2/3

### On Employee Budget Visibility

**Michelle:** "Maybe it's hours that employees see and the four of us and Levi see budget."

**Team:** Agreed. Employees see hours/percentages, management sees dollars.

**Decision:** LOCKED ✅

### On Burnout Detection

**Ryan:** Could flag when someone's been on high-stress projects for extended time.

**Michelle:** "Sometimes there's nothing we can do" — don't want false promise.

**Decision:** Deprioritized for later phases.

---

## 🗓️ What's Next

### Immediate (This Week)
- [x] Complete feature voting in Google Sheet
- [x] Ryan averages scores, determines Phase 1 vs Phase 2
- [ ] Ryan shares prototype files for team to explore

### Before Workshop 2 (~2 weeks)
- [ ] Finalize Phase 1 feature list
- [ ] Assign vibe coding tasks to each person
- [ ] Ryan creates setup guide for Google AI Studio
- [ ] Prepare Firestore database schema

### Workshop 2 (Distributed Vibecoding)
Each person builds their assigned feature:

| Person | Feature | Domain |
|--------|---------|--------|
| **Ryan** | Calendar Integration / PTOverlap | Core infrastructure |
| **Maleno** | Resource Calendar / Gantt | Resource Planning |
| **Kara** | Time Confirmation UI | Employee Experience |
| **Michelle** | Budget Dashboard / Approvals | Approvals & Reporting |

---

## 📋 Technical Decisions (Deferred to Workshop 2)

| Decision | Options | Notes |
|----------|---------|-------|
| **Database** | Firestore vs Supabase | CTO recommended Firestore |
| **Frontend** | React + MUI | Already decided ✅ |
| **Hosting** | GCP vs Vercel | Depends on database choice |
| **Auth** | Slack OAuth vs Google OAuth | Slack OAuth = seamless for employees |
| **LLM** | Gemini | For onboarding, project creation, mass changes |

---

## 🎨 Design Principles (From Team Feedback)

1. **Trust = Accuracy + Adoption + Auditability** — Levi's formula
2. **One page, no hunting** — Maleno hates hidden buttons
3. **Company-wide view first** — Kara & Maleno want the big picture
4. **Proactive, not reactive** — Surface problems before burnout
5. **Trust signals** — Flag rubber-stamping so Michelle can trust the data
6. **Meet people where they are** — Slack DMs, not external tools
7. **Thursday → Monday rhythm** — Lock decisions Thursday, clarity by Monday
8. **Beautiful enough to trust** — Janky UI undermines confidence
9. **Quick context, not drilling** — Project snippets on hover
10. **LLM-assisted, not LLM-dependent** — Smart features that degrade gracefully

---

## ✅ Success Criteria

### Workshop 1 (COMPLETED) ✅
- [x] Prioritized feature list (Phase 1 vs Phase 2) — In progress (async voting)
- [x] Key decisions locked (employee budget view, DMs, voice timing)
- [x] Workshop 2 assignments drafted
- [x] Design principles refined
- [x] Everyone understands what we're building

### Workshop 2 (UPCOMING)
- [ ] Create a project with a budget
- [ ] Allocate someone to that project
- [ ] Trigger a Friday confirmation DM
- [ ] Confirm hours with one click
- [ ] See budget burn update on dashboard

**That's the complete loop.** Everything else is polish.

---

## 🔗 Quick Links

| Resource | Link |
|----------|------|
| Live Sync Doc | [Google Doc](https://docs.google.com/document/d/1EvTExGIvdSWNo8cxjXIOqAR_D0BjQcvJFKHv7PoIjGc/edit) |
| Priority Sheet | [Google Sheet](https://docs.google.com/spreadsheets/d/1fqGPctbG2UlDXdA6VIMn_Eja-S9cvEhm6q4iok7FamY/edit) |
| Slack Channel | #resourceflow-workshop |

---

## 💬 Memorable Quotes from Jam Sesh

**Maleno on the prototype:**
> "You could totally sell someone on a product like this."

**Michelle on mass changes:**
> "Can you tell resource flow that instead of Sam, we're going to have Cindy on agent challenge moving forward and then it just completely moves all of his time from agent challenge to her?"

**Maleno on voice:**
> "I wouldn't say like do this, do that. I would ask it questions like give me a suggestion... then it's doing the math for me."

**Kara on DMs:**
> "A DM would be better than a channel post. There's so many messages happening that people don't see them."

**Ryan at the end:**
> "I'm going to go make some chicken."

---

## 📦 Archive

<details>
<summary>v1 — January 7, 2026 (Pre Jam Sesh)</summary>

This was the preparation guide before the Jam Sesh was held. Key differences:
- Status was "READY FOR WORKSHOP" instead of "COMPLETED"
- Did not include Session Outcomes section
- Did not include New Features Surfaced table
- Did not include Locked Decisions table
- Agenda showed planned times, not completed outcomes
- Did not include Prototype Feedback sections
- Did not include Key Insights from Discussion section
- Did not include Memorable Quotes section
- Design principles were 1-8, not 1-10

</details>

---

*This guide was updated with Jam Sesh outcomes. Keep it as reference for Workshop 2.*
