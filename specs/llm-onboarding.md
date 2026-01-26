# ResourceFlow: LLM-Powered Onboarding

## Philosophy

Every agency has developed their own way of tracking time, managing budgets, and resourcing projects. These workflows evolved over years and are deeply embedded in how teams operate.

**The wrong approach:** Force agencies to learn "the ResourceFlow way" and abandon their existing mental models.

**The right approach:** Ask agencies how they currently work, then configure ResourceFlow to match their patterns as closely as possible.

LLM-powered onboarding does this by:
1. **Asking open-ended questions** — Admins describe their workflow in their own words
2. **Accepting visual evidence** — Screenshots show exactly how things look today
3. **Analyzing existing artifacts** — Links to current tools, templates, reports
4. **Generating configuration** — LLM translates human descriptions into system settings
5. **Confirming understanding** — Show admins what we learned before going live

The result: ResourceFlow feels familiar from day one.

---

## Onboarding Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ADMIN ONBOARDING FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 1          Step 2          Step 3          Step 4          Step 5 │
│  ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐  │
│  │Company│  →   │ Time │   →   │Budget│   →   │Calendar│  →  │Review│  │
│  │Basics │       │Track │       │& Proj│       │& Sched │      │Config│  │
│  └──────┘       └──────┘       └──────┘       └──────┘       └──────┘  │
│      │              │              │              │              │       │
│      ▼              ▼              ▼              ▼              ▼       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      LLM ANALYSIS ENGINE                         │  │
│  │  • Processes text descriptions                                   │  │
│  │  • Analyzes screenshots (vision)                                 │  │
│  │  • Extracts patterns from linked docs                            │  │
│  │  • Generates clarifying questions                                │  │
│  │  • Outputs structured configuration                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│                          ┌──────────────────┐                          │
│                          │  org_config.json │                          │
│                          │  • Roles & perms │                          │
│                          │  • Time settings │                          │
│                          │  • Budget rules  │                          │
│                          │  • Calendar cfg  │                          │
│                          │  • Notifications │                          │
│                          │  • Terminology   │                          │
│                          └──────────────────┘                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Company Basics

**Goal:** Understand team structure, roles, and vocabulary.

### What We Ask

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Let's get to know your team                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tell us about your company:                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ We're Use All Five, a ~30 person creative agency. We do UX/UI   │   │
│  │ design, development, and strategy work for tech clients.        │   │
│  │                                                                  │   │
│  │ Team structure:                                                  │   │
│  │ - Producers manage projects and client relationships            │   │
│  │ - Designers handle UX research, UI design, prototyping          │   │
│  │ - Developers do frontend and backend implementation             │   │
│  │ - We have a few people who do both design and dev               │   │
│  │                                                                  │   │
│  │ Levi is CEO, Michelle is Managing Director (handles             │   │
│  │ approvals and finance), and we have 2-3 producers who           │   │
│  │ manage resourcing.                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  What do you call the different roles at your company?                  │
│  (We'll use your terminology throughout ResourceFlow)                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Producers (project managers)                                   │   │
│  │ • Designers (UX, UI, motion)                                     │   │
│  │ • Developers (frontend, backend, fullstack)                      │   │
│  │ • Strategists (rare, usually staffed per-project)               │   │
│  │ • Leadership (CEO, Managing Director)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  🔎 Optional: Link to your team page, org chart, or staff directory    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ https://useallfive.com/team                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                        [Continue →]                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### What We Learn

| Input | Configuration Generated |
|-------|------------------------|
| Team size (~30) | Default capacity settings, notification batching |
| Role types | `roles` table pre-populated, role-based permissions |
| Org structure | Permission levels (who sees what, who approves) |
| Terminology | UI labels customized ("Producers" not "Project Managers") |
| Team page link | Pre-populate user names, scrape role assignments |

### LLM Processing

```javascript
const companyAnalysis = await llm.analyze({
  type: 'company_structure',
  inputs: {
    description: adminDescription,
    teamPageUrl: linkedUrl
  },
  output: {
    roles: [
      { name: 'Producer', permission_level: 'pm', can_allocate: true },
      { name: 'Designer', permission_level: 'employee', can_allocate: false },
      // ...
    ],
    org_hierarchy: {
      leadership: ['CEO', 'Managing Director'],
      management: ['Producer'],
      individual_contributors: ['Designer', 'Developer', 'Strategist']
    },
    terminology: {
      project_manager: 'Producer',
      timesheet: 'time confirmation', // if they use specific terms
      // ...
    },
    team_size_bucket: 'small', // <50, affects defaults
    users_to_prepopulate: [...] // from team page
  }
});
```

---

## Step 2: Time Tracking

**Goal:** Understand current time tracking workflow and pain points.

### What We Ask

```
┌─────────────────────────────────────────────────────────────────────────┐
│  How do you track time today?                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Describe your current time tracking process:                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ We use Smartsheet and 10000ft. People are supposed to fill in   │   │
│  │ hours daily but most do it Friday afternoon or Monday morning.  │   │
│  │ It's split between billable client work and internal stuff.     │   │
│  │                                                                  │   │
│  │ The biggest problem is people forget, or they enter 8 hours     │   │
│  │ to one project when they actually worked on 3. Michelle ends    │   │
│  │ up chasing people down every Monday.                            │   │
│  │                                                                  │   │
│  │ We'd love something where they just confirm what was planned    │   │
│  │ unless something changed. Most weeks, people do what was        │   │
│  │ scheduled.                                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  📸 Optional: Screenshot of your current timesheet or tracking tool    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    [Drop image here]                             │   │
│  │                         or                                       │   │
│  │                   [Browse files...]                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                        [Continue →]                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Screenshot Analysis (Vision)

If admin uploads a screenshot of their current timesheet:

```javascript
const timesheetAnalysis = await llm.analyzeImage({
  image: uploadedScreenshot,
  prompt: `Analyze this timesheet/time tracking interface and extract:
    1. What columns/fields are shown (project, task, hours, notes, etc.)
    2. How time is broken down (daily, weekly, by project)
    3. Any categories visible (billable, non-billable, internal)
    4. What approval/status indicators exist
    5. Any patterns in how people fill it out
    
    Output as JSON configuration suggestions.`
});

// Example output:
{
  "fields_detected": ["project", "task", "hours", "billable_flag", "notes"],
  "time_granularity": "daily",
  "categories": ["billable", "non-billable"],
  "suggested_config": {
    "require_task_breakdown": true,
    "track_billable_separately": true,
    "include_notes_field": true,
    "granularity": "weekly_summary" // they want simpler
  }
}
```

### What We Learn

| Input | Configuration Generated |
|-------|------------------------|
| "confirm what was planned" | Enable confirmation-first flow |
| "forget to fill in" | Aggressive reminder schedule |
| "8 hours to one project" | Flag when actual = one project 100% |
| "Friday afternoon or Monday" | Friday deadline, Monday grace period |
| Screenshot analysis | Match existing fields they're used to |

---

## Step 3: Budgets & Projects

**Goal:** Understand how budgets are set, tracked, and reported.

### What We Ask

```
┌─────────────────────────────────────────────────────────────────────────┐
│  How do you manage project budgets?                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tell us about your budgeting process:                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Projects have an overall hour budget set during scoping. Some   │   │
│  │ are broken into phases (Discovery, Design, Development). We     │   │
│  │ bill clients hourly, typically $175-250/hr depending on role.   │   │
│  │                                                                  │   │
│  │ Internal projects don't have budgets but we still track time    │   │
│  │ for capacity planning.                                           │   │
│  │                                                                  │   │
│  │ We want to know early if a project is trending over budget,     │   │
│  │ not after it's already blown. 75% burn is when we want a flag.  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  🔎 Optional: Link to a sample project budget or SOW                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ https://docs.google.com/spreadsheets/d/abc123...                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                        [Continue →]                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Document Analysis

If admin links a Google Sheet or doc:

```javascript
const budgetDocAnalysis = await llm.analyzeDocument({
  url: linkedSpreadsheet,
  type: 'budget_template',
  extract: [
    'budget_structure', // flat vs phases
    'rate_structure',   // blended vs role-based
    'categories',       // how they categorize work
    'formulas',         // how they calculate burn
    'alert_thresholds'  // any conditional formatting
  ]
});

// Example output:
{
  "budget_structure": "phased",
  "phases_detected": ["Discovery", "Design", "Development", "QA"],
  "rate_structure": "role_based",
  "rates": {
    "Designer": 200,
    "Developer": 225,
    "Producer": 175
  },
  "thresholds": {
    "warning": 0.75,
    "critical": 0.90
  },
  "categories": ["Client Billable", "Internal", "New Business"]
}
```

### What We Learn

| Input | Configuration Generated |
|-------|------------------------|
| Phased projects | Enable phase-level budgets |
| Role-based rates | Store rates per role, not flat |
| 75% warning | Set `budget_warning_threshold: 0.75` |
| Internal projects | Allow projects with `is_billable: false` |
| Rate ranges | Default rate picker shows $175-250 |

---

## Step 4: Calendar & Scheduling

**Goal:** Understand PTO patterns, work schedules, and calendar conventions.

*See separate Calendar Integration Spec for full details.*

### What We Ask

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Tell us about your team's schedule                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  How does your team handle time off and scheduling?                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ We use Google Calendar. PTO is usually marked as "OOO" or       │   │
│  │ "Vacation" as all-day events. We have every other Friday off    │   │
│  │ (9/80 schedule) - those show as "Friday Off" events.            │   │
│  │                                                                  │   │
│  │ We have a shared "Office Calendar" with company holidays.       │   │
│  │ Some people put WFH on their calendar but they're still         │   │
│  │ working those days.                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  What's your standard work week?                                        │
│                                                                         │
│  Hours per week: [40 ▼]    Start day: [Monday ▼]                       │
│                                                                         │
│  ☑️ Every other Friday off (9/80 schedule)                              │
│  ☐ Summer Fridays (half days)                                           │
│  ☐ Flexible hours (no set schedule)                                     │
│                                                                         │
│                                        [Continue →]                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### What We Learn

| Input | Configuration Generated |
|-------|------------------------|
| Google Calendar | Set up Google OAuth flow |
| "OOO" or "Vacation" | PTO detection patterns |
| 9/80 schedule | Alternating Friday detection |
| WFH ≠ PTO | Exclude WFH from availability reduction |
| Office Calendar | Add to holiday detection sources |

---

## Step 5: Review & Confirm

**Goal:** Show admins what we learned and let them correct mistakes.

### What We Show

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Here's what we learned about Use All Five                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✅ Team Structure                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • 30 team members                                                │   │
│  │ • 5 roles: Producer, Designer, Developer, Strategist, Leadership│   │
│  │ • Producers manage resourcing and allocations                    │   │
│  │ • Michelle (Managing Director) approves timesheets               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                         [Edit]          │
│                                                                         │
│  ✅ Time Tracking                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Confirmation-based (planned → confirm or adjust)              │   │
│  │ • Weekly submission, Friday deadline                             │   │
│  │ • Grace period until Monday 10am                                 │   │
│  │ • Flag when someone submits exactly what was planned             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                         [Edit]          │
│                                                                         │
│  ✅ Budgets                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Phase-based budgets (Discovery, Design, Development, QA)      │   │
│  │ • Role-based rates ($175-250/hr)                                │   │
│  │ • Warning at 75% burn, critical at 90%                          │   │
│  │ • Internal projects tracked but not budgeted                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                         [Edit]          │
│                                                                         │
│  ✅ Calendar & Scheduling                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Google Calendar integration ready                              │   │
│  │ • PTO detected via: "OOO", "Vacation", "PTO" events             │   │
│  │ • 9/80 schedule: every other Friday off                          │   │
│  │ • WFH events ignored (still working)                            │   │
│  │ • Holidays from "Office Calendar"                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                         [Edit]          │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  🤔 We have a few questions:                                            │
│                                                                         │
│  1. Should internal projects still require time confirmation?           │
│     ○ Yes, track all time    ● Just billable projects                  │
│                                                                         │
│  2. Who should see company-wide utilization?                            │
│     ☑️ Leadership    ☑️ Producers    ☐ Everyone                        │
│                                                                         │
│                                                                         │
│                        [← Back]              [Looks Good! Launch →]     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Edit Mode

When admin clicks "Edit" on any section:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Edit: Time Tracking                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Submission mode:                                                       │
│  ● Confirmation-based (compare planned vs actual)                       │
│  ○ Open entry (enter time from scratch)                                 │
│  ○ Timer-based (optional timers, summarize weekly)                     │
│                                                                         │
│  Deadline:                                                              │
│  Day: [Friday ▼]  Time: [5:00 PM ▼]                                    │
│                                                                         │
│  Grace period:                                                          │
│  Allow late submissions until: [Monday ▼] [10:00 AM ▼]                 │
│                                                                         │
│  Flags & Alerts:                                                        │
│  ☑️ Flag "rubber stamp" (actual exactly matches planned)               │
│  ☑️ Highlight >20% variance                                            │
│  ☐ Require notes for variance                                          │
│                                                                         │
│                             [Cancel]              [Save]                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Generated Configuration

### Final Output: `org_config.json`

```json
{
  "org_id": "useallfive",
  "org_name": "Use All Five",
  
  "team": {
    "size": 30,
    "roles": [
      { "name": "Producer", "level": "pm", "can_allocate": true, "can_approve": false },
      { "name": "Designer", "level": "ic", "can_allocate": false, "can_approve": false },
      { "name": "Developer", "level": "ic", "can_allocate": false, "can_approve": false },
      { "name": "Strategist", "level": "ic", "can_allocate": false, "can_approve": false },
      { "name": "Leadership", "level": "admin", "can_allocate": true, "can_approve": true }
    ],
    "approvers": ["Managing Director"],
    "visibility": {
      "company_utilization": ["Leadership", "Producer"]
    }
  },
  
  "time_tracking": {
    "mode": "confirmation",
    "submission": {
      "deadline_day": "friday",
      "deadline_time": "17:00",
      "grace_period_until": { "day": "monday", "time": "10:00" },
      "reminder_schedule": ["friday_15:00", "friday_17:00", "monday_09:00"]
    },
    "flags": {
      "rubber_stamp_warning": true,
      "variance_threshold": 0.20,
      "require_notes_for_variance": false
    },
    "internal_projects": {
      "require_confirmation": false
    }
  },
  
  "budgets": {
    "structure": "phased",
    "default_phases": ["Discovery", "Design", "Development", "QA"],
    "rates": {
      "type": "role_based",
      "defaults": {
        "Producer": 175,
        "Designer": 200,
        "Developer": 225,
        "Strategist": 200
      }
    },
    "alerts": {
      "warning_threshold": 0.75,
      "critical_threshold": 0.90
    },
    "categories": ["Client Billable", "Internal", "New Business"]
  },
  
  "calendar": {
    "provider": "google",
    "pto_detection": {
      "patterns": ["OOO", "Vacation", "PTO", "Out of Office"],
      "all_day_events": true,
      "exclude_patterns": ["WFH", "Work From Home"]
    },
    "recurring_schedules": [
      {
        "name": "9/80 Fridays",
        "type": "alternating_day_off",
        "day": "friday",
        "detection_pattern": "Friday Off"
      }
    ],
    "holiday_sources": ["Office Calendar"]
  },
  
  "terminology": {
    "project_manager": "Producer",
    "timesheet": "time confirmation",
    "submission": "confirmation"
  },
  
  "created_at": "2024-01-15T10:30:00Z",
  "created_by": "admin@useallfive.com",
  "onboarding_version": "1.0"
}
```

---

## Admin Settings (Post-Onboarding)

After onboarding, admins can adjust settings via a standard settings page:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚙️ Settings                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Team] [Time Tracking] [Budgets] [Calendar] [Notifications]           │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Time Tracking                                                          │
│                                                                         │
│  Submission deadline         [Friday ▼] at [5:00 PM ▼]                 │
│  Grace period                [Until Monday 10am ▼]                      │
│  Approval cycle              [Weekly ▼]                                 │
│                                                                         │
│  Reminders                                                              │
│  ☑️ Friday 3pm — First reminder                                         │
│  ☑️ Friday 5pm — Second reminder (if not submitted)                    │
│  ☑️ Monday 9am — Final reminder (escalate to manager)                  │
│                                                                         │
│  Detection                                                              │
│  ☑️ Flag "rubber-stamp" when actual = planned exactly                  │
│  ☑️ Highlight significant variance (>20%)                              │
│                                                                         │
│  [Save Changes]                                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Re-Onboarding

If an agency's workflow changes significantly:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Update Your Workflow                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Has something changed about how your team works?                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ We switched from every-other-Friday off to summer Fridays       │   │
│  │ (half days May-August). Also, we now have a shared "PTO"        │   │
│  │ calendar instead of using the Out of Office toggle.             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [Update Configuration]                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

LLM re-analyzes and updates only the affected config sections.

---

## Privacy & Data Handling

### What We Store

| Data | Purpose | Retention |
|------|---------|-----------|
| Free-form descriptions | Re-analysis if needed | Permanent (org setting) |
| Screenshots | LLM analysis, support debugging | 90 days, then deleted |
| Linked documents | One-time analysis | URLs stored, not content |
| Generated config | Drives app behavior | Permanent, versioned |

### What We Don't Do

- ❌ Share onboarding data between orgs
- ❌ Use org data to train models
- ❌ Store screenshots permanently
- ❌ Access linked documents beyond initial analysis

---

## Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Onboarding completion | >90% | Admins finish the flow |
| Time to complete | <10 min | Not burdensome |
| Config accuracy | >85% | Minimal post-launch edits |
| First-week adoption | >70% employees active | Config matches reality |
| Support tickets (config) | <2 per org | Got it right first time |

---

## Implementation Phases

### Phase 1: Core Onboarding
- [ ] Step 1: Company basics (text only)
- [ ] Step 2: Time tracking (text + screenshots)
- [ ] Step 3: Budgets (text + link analysis)
- [ ] Step 5: Review & confirm
- [ ] Basic config generation
- [ ] Settings page for adjustments

### Phase 2: Calendar Integration
- [ ] Step 4: Calendar conventions (text + screenshots)
- [ ] LLM vision analysis of calendar screenshots
- [ ] Recurring schedule detection
- [ ] Smart notification timing

### Phase 3: Advanced
- [ ] Spreadsheet/doc deep analysis
- [ ] Team page scraping for user pre-population
- [ ] Config refinement from usage patterns
- [ ] Multi-admin onboarding (different perspectives)

---

## Summary

LLM-powered onboarding transforms ResourceFlow from "learn our system" to "we learned your system."

**For admins:** Describe how you work today → ResourceFlow configures itself.

**For employees:** Day one feels familiar → higher adoption.

**For ResourceFlow:** Better data quality → trustworthy insights.

The key insight: **Humans are good at describing workflows. LLMs are good at turning descriptions into structured configuration. Combine them.**

---

*Last updated: January 7, 2026*
*Author: ResourceFlow Workshop (Ryan + Claude)*