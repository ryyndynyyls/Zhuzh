# ResourceFlow Calendar Integration Spec

## Overview

Calendar integration is essential for accurate resourcing. Without it, ResourceFlow only knows *planned* allocations — not actual availability after meetings, PTO, and holidays.

**Phase 1:** Google Calendar (Use All Five's stack)
**Future:** Multi-provider support (Microsoft 365/Outlook, Apple Calendar, etc.)

---

## The Core Insight: Email as the Bridge

When a user authenticates with Slack OAuth, we capture their **workspace email**. In virtually all cases, this is the same email tied to their work calendar — whether that's Google Workspace, Microsoft 365, or another provider.

This means:
1. **No duplicate logins** — User is already "known" by email
2. **Pre-selected accounts** — OAuth `login_hint` parameter auto-selects their account
3. **One-click authorization** — User just approves calendar scope, no credential entry
4. **Provider-agnostic pattern** — Same flow works for Google, Microsoft, Apple, etc.

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER SIGNS IN                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Slack OAuth                                                   │
│       ↓                                                         │
│   We store: email = "sarah@agency.com"                         │
│       ↓                                                         │
│   Later: "Connect Calendar" button                              │
│       ↓                                                         │
│   OAuth request includes: login_hint=sarah@agency.com           │
│       ↓                                                         │
│   Provider (Google/Microsoft) pre-selects that account          │
│       ↓                                                         │
│   User clicks "Allow" → One click!                              │
│       ↓                                                         │
│   We store calendar tokens → Full integration                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Google Calendar Integration

### Why Google First
- Use All Five uses Google Workspace
- Team can dogfood immediately
- Most common among creative agencies
- Best-documented Calendar API

### Required OAuth Scopes

```
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events.readonly
```

**Note:** Read-only is sufficient. ResourceFlow doesn't create events — it just reads them to understand availability.

### OAuth Flow

**1. User clicks "Connect Google Calendar"**

Location options:
- Settings page in web app
- Slack DM prompt (contextual)
- Team Utilization page banner
- First-run onboarding

**2. Redirect to Google OAuth**

```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=RESOURCEFLOW_CLIENT_ID
  &redirect_uri=https://app.resourceflow.io/auth/google/callback
  &response_type=code
  &scope=https://www.googleapis.com/auth/calendar.readonly
  &access_type=offline          // Get refresh token
  &prompt=consent               // Ensure refresh token on re-auth
  &login_hint=sarah@agency.com  // Pre-select their account
  &state=USER_ID_OR_CSRF_TOKEN
```

**3. User Approves (One Click)**

Google shows:
```
┌─────────────────────────────────────────────┐
│  ResourceFlow wants to:                     │
│                                             │
│  ✓ View your calendars                      │
│  ✓ View events on your calendars            │
│                                             │
│  [Cancel]              [Allow]              │
└─────────────────────────────────────────────┘
```

Account is pre-selected thanks to `login_hint`. User just clicks Allow.

**4. Callback Handling**

```javascript
// /auth/google/callback
const { code, state } = req.query;
const userId = decodeState(state);

// Exchange code for tokens
const { tokens } = await oauth2Client.getToken(code);

// Store tokens
await db.users.update(userId, {
  google_access_token: tokens.access_token,
  google_refresh_token: tokens.refresh_token,
  google_token_expiry: tokens.expiry_date,
  calendar_connected: true,
  calendar_provider: 'google',
  calendar_connected_at: new Date()
});

// Redirect back to app
res.redirect('/settings?calendar=connected');
```

**5. Confirmation**

Web app shows success state. If triggered from Slack, send a DM:

```
✅ Google Calendar connected!

I found these calendars:
• sarah@useallfive.com (primary)
• Design Team
• Company Holidays

I'll use these to:
• Show your real availability in Team Utilization
• Skip confirmation DMs when you're on PTO
• Detect PTOverlap conflicts

[Manage Calendar Settings]
```

### Data We Extract

| Data Point | How We Use It |
|------------|---------------|
| **Events with "OOO" or "PTO"** | Mark user as unavailable, exclude from utilization |
| **All-day events** | Potential PTO or holidays |
| **Recurring meetings** | Factor into weekly available hours |
| **Declined events** | Ignore — user isn't attending |
| **Company holidays** | Auto-detect from shared calendars |

### Availability Calculation

```javascript
function getAvailableHours(userId, weekStart) {
  const baseCapacity = 40; // or user's custom capacity
  
  const events = await getCalendarEvents(userId, weekStart, weekEnd);
  
  let unavailableHours = 0;
  
  for (const event of events) {
    if (isPTO(event) || isOOO(event)) {
      unavailableHours += 8; // Full day
    } else if (isAllDay(event) && !isDeclined(event)) {
      unavailableHours += 8; // Assume full day out
    } else if (isMeeting(event) && !isDeclined(event)) {
      unavailableHours += event.duration; // Meeting time
    }
  }
  
  return baseCapacity - unavailableHours;
}
```

### PTOverlap Detection

```javascript
async function detectPTOverlap(orgId, weeksAhead = 8) {
  const conflicts = [];
  const users = await getOrgUsers(orgId);
  
  // Group users by role
  const byRole = groupBy(users, 'role'); // Designer, Developer, Producer, etc.
  
  for (const [role, roleUsers] of Object.entries(byRole)) {
    for (let week = 0; week < weeksAhead; week++) {
      const weekStart = addWeeks(new Date(), week);
      const usersOnPTO = [];
      
      for (const user of roleUsers) {
        if (user.calendar_connected) {
          const events = await getCalendarEvents(user.id, weekStart, weekEnd);
          if (events.some(e => isPTO(e) || isOOO(e))) {
            usersOnPTO.push(user);
          }
        }
      }
      
      // Alert if >50% of role is out same week
      if (usersOnPTO.length > roleUsers.length * 0.5) {
        conflicts.push({
          week: weekStart,
          role,
          usersOut: usersOnPTO,
          totalInRole: roleUsers.length,
          severity: usersOnPTO.length === roleUsers.length ? 'critical' : 'warning'
        });
      }
    }
  }
  
  return conflicts;
}
```

---

## Smart Notification Timing

### The Problem

Generic "Friday 3pm" reminders don't account for:
- User is OOO Friday (too late)
- User is OOO Monday (can't review rejections)
- User has back-to-back meetings Friday afternoon (bad timing)
- User left early for the weekend

### The Solution: Calendar-Aware Timing

```javascript
async function getOptimalReminderTime(userId, weekEnd) {
  const events = await getCalendarEvents(userId, weekEnd.minus(1, 'day'), weekEnd);
  
  // Check if OOO Friday
  const fridayEvents = events.filter(e => isSameDay(e.start, weekEnd));
  if (fridayEvents.some(e => isPTO(e) || isOOO(e))) {
    // Send Thursday instead
    return findGapOnDay(userId, weekEnd.minus(1, 'day'));
  }
  
  // Find a gap in Friday afternoon
  const fridayAfternoon = { start: '14:00', end: '17:00' };
  const gap = findCalendarGap(fridayEvents, fridayAfternoon);
  
  if (gap && gap.duration >= 15) {
    return gap.start; // Send at start of gap
  }
  
  // Fallback: Friday 3pm regardless
  return weekEnd.set({ hour: 15, minute: 0 });
}
```

### Notification Rules

| Scenario | Action |
|----------|--------|
| Normal Friday | Send at 3pm or first calendar gap after 2pm |
| OOO Friday | Send Thursday afternoon |
| OOO Monday | Send Friday morning (gives time to review rejections) |
| Back-to-back Friday PM | Find gap or send at end of last meeting |
| Week-long PTO | Skip entirely, auto-log PTO hours |

---

## LLM-Powered Calendar Convention Analysis

### The Problem

Every agency has different calendar conventions:
- "OOO" vs "PTO" vs "Vacation" vs "Out"
- All-day events that ARE PTO vs. aren't
- Recurring "WFH" events that mean available, not unavailable
- Alternating Fridays off (9/80 schedules)
- Company-specific shared calendars for holidays

Hard-coding rules doesn't scale. LLMs can understand natural language descriptions and generate detection config.

### The Solution: Onboarding Flow with LLM

**1. Admin describes their calendar conventions:**

```
┌────────────────────────────────────────────────────────────────────────┐
│  📅 Tell us about your calendar conventions                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  How does your team mark time off on calendars?                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ We use "OOO" or "PTO" in event titles for full days off.       │   │
│  │ Some people put their name + "Vacation" for longer trips.      │   │
│  │ Half days are usually "WFH" or "Doctor appt" type events.      │   │
│  │ We have a shared "Office Calendar" with company holidays.      │   │
│  │ Every other Friday is off for most people (9/80 schedule).     │   │
│  │                                                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  [Continue →]                                                          │
└────────────────────────────────────────────────────────────────────────┘
```

**2. LLM analyzes and generates detection config:**

```javascript
// Input to LLM
const prompt = `
You are configuring a time tracking system's calendar integration.

The admin described their calendar conventions as:
"${adminDescription}"

Generate a JSON configuration for detecting:
1. PTO/vacation days (full days off)
2. Partial day events (appointments, WFH that reduces availability)
3. Recurring schedules (like alternating Fridays off)
4. Shared calendars to check for company holidays

Output format:
{
  "pto_detection": {
    "rules": [
      { "type": "event_title_pattern", "pattern": "...", "weight": 0.0-1.0 },
      { "type": "all_day_event", "title_contains": [...], "weight": 0.0-1.0 },
      { "type": "google_ooo_flag", "weight": 1.0 }
    ]
  },
  "partial_day_detection": {
    "rules": [...]
  },
  "recurring_schedules": [
    { "name": "...", "type": "alternating_day_off", "pattern": "..." }
  ],
  "holiday_calendars": ["Office Calendar", ...]
}

Be specific to their described conventions. If something is ambiguous, set weight lower.
`;

const config = await llm.generate(prompt);
```

**3. System asks clarifying questions if confidence is low:**

```
┌────────────────────────────────────────────────────────────────────────┐
│  🤔 A few quick clarifications                                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  You mentioned "every other Friday off" - how do these appear on       │
│  calendars?                                                            │
│                                                                        │
│  ○ They're marked as events (e.g., "Friday Off")                      │
│  ○ They're just understood - no calendar event                         │
│  ○ There's a shared calendar that shows them                          │
│  ○ Each person marks their own                                         │
│                                                                        │
│  What about "WFH" - does that mean reduced availability?               │
│                                                                        │
│  ○ Yes, usually means a lighter day                                    │
│  ○ No, full availability just working remote                           │
│                                                                        │
│  [Save Configuration]                                                   │
└────────────────────────────────────────────────────────────────────────┘
```

**4. Final config stored per organization:**

```json
{
  "org_id": "useallfive",
  "calendar_config": {
    "pto_detection": {
      "rules": [
        { "type": "google_ooo_flag", "weight": 1.0 },
        { "type": "event_title_pattern", "pattern": "(?i)(OOO|PTO|vacation|out of office)", "weight": 0.95 },
        { "type": "event_title_pattern", "pattern": "(?i){name}.*vacation", "weight": 0.9 },
        { "type": "all_day_event", "title_not_contains": ["WFH", "reminder", "birthday"], "weight": 0.7 }
      ]
    },
    "partial_day_detection": {
      "rules": [
        { "type": "event_title_pattern", "pattern": "(?i)(doctor|appt|appointment)", "hours_deducted": 4 },
        { "type": "event_duration", "min_hours": 2, "max_hours": 4, "during_work_hours": true, "hours_deducted": "event_duration" }
      ]
    },
    "recurring_schedules": [
      {
        "name": "9/80 Friday Off",
        "type": "alternating_day_off",
        "day": "friday",
        "detection": {
          "method": "calendar_event",
          "title_pattern": "(?i)friday off"
        },
        "fallback": {
          "method": "assume_alternating",
          "start_date": "2024-01-05"
        }
      }
    ],
    "holiday_calendars": [
      { "name": "Office Calendar", "type": "shared" },
      { "name": "US Holidays", "type": "google_default" }
    ]
  },
  "confidence_score": 0.87,
  "needs_clarification": false,
  "created_at": "2024-01-15T10:30:00Z",
  "created_by": "admin@useallfive.com"
}
```

---

## Admin Dashboard: Calendar Health

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📅 Calendar Integration Status                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Connected: 28 of 32 team members (87%)                                 │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████░░░░ │ 87% connected            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Not connected:                                                         │
│  • Jake M. (invited, not responded)                                     │
│  • Sarah K. (declined - prefers manual)                                │
│  • Tom R. (Google account not on workspace)                            │
│  • Lisa P. (pending approval)                                          │
│                                                                         │
│  [Send Reminder to Unconnected]  [View Connection Issues]               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  📊 Calendar Detection Accuracy                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Last 4 weeks:                                                          │
│  • 47 PTO days detected                                                 │
│  • 3 flagged as incorrect by users                                      │
│  • 94% accuracy                                                         │
│                                                                         │
│  [View Flagged Events]  [Update Calendar Conventions]                   │
└─────────────────────────────────────────────────────────────────────────┘
```

Users can flag incorrect detections → feeds back into LLM for config refinement.

---

### Example Configurations by Agency Type

**Traditional Agency (Microsoft 365)**
```json
{
  "provider": "microsoft",
  "pto_detection": {
    "rules": [
      { "type": "outlook_ooo_autoreply", "weight": 1.0 },
      { "type": "all_day_event", "title_patterns": ["OOO", "PTO", "Vacation"], "weight": 0.9 }
    ]
  },
  "recurring_schedules": []
}
```

**Startup (Google, Flexible)**
```json
{
  "provider": "google",
  "pto_detection": {
    "rules": [
      { "type": "google_ooo_flag", "weight": 1.0 },
      { "type": "event_title_pattern", "pattern": "WFH", "is_pto": false, "weight": 0.5 }
    ]
  },
  "recurring_schedules": [
    { "name": "Summer Fridays", "type": "seasonal_half_day", "months": [6, 7, 8], "day": "friday" }
  ]
}
```

**Use All Five (Google, 9/80 Schedule)**
```json
{
  "provider": "google",
  "pto_detection": {
    "rules": [
      { "type": "google_ooo_flag", "weight": 1.0 },
      { "type": "event_title_pattern", "pattern": "{name} at {location}", "partial_day": true }
    ],
    "calendar_sources": ["primary", "Office Calendar"]
  },
  "recurring_schedules": [
    {
      "name": "Every Other Friday",
      "type": "alternating_day_off",
      "detection": { "method": "calendar_invite", "event_title_contains": "Friday Off" }
    }
  ]
}
```

---

### LLM Backend Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ResourceFlow Backend                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Calendar   │    │    LLM       │    │   Config     │      │
│  │   Sync Job   │───▶│   Analyzer   │───▶│   Store      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                    │               │
│         ▼                   ▼                    ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Raw Events  │    │  Structured  │    │  Detection   │      │
│  │   from API   │    │   Config     │    │   Rules      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                  │               │
│                                                  ▼               │
│                                          ┌──────────────┐       │
│                                          │  Availability │       │
│                                          │  Calculator   │       │
│                                          └──────────────┘       │
│                                                  │               │
│                             ┌────────────────────┼────────┐     │
│                             ▼                    ▼        ▼     │
│                      ┌──────────┐      ┌──────────┐  ┌───────┐ │
│                      │Timesheet │      │PTOverlap │  │ Smart │ │
│                      │ Timing   │      │Detection │  │Notifs │ │
│                      └──────────┘      └──────────┘  └───────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**LLM Usage:**
- **Onboarding:** Analyze admin description → generate config (one-time)
- **Clarification:** Generate follow-up questions if confidence low
- **Refinement:** Re-analyze when user flags incorrect detection
- **Not per-event:** Detection uses the generated config, not LLM per-event (cost/speed)

---

## Privacy & Security Considerations

### What We Access
- ✅ Calendar event times (busy/free)
- ✅ Event titles (for PTO detection)
- ✅ All-day status
- ✅ Response status (accepted/declined)

### What We DON'T Access
- ❌ Event descriptions/notes
- ❌ Attendee lists
- ❌ Attachments
- ❌ Private calendar details

### Data Handling
- Tokens encrypted at rest
- Refresh tokens stored securely
- Calendar data cached, not stored long-term
- Users can disconnect anytime
- Data deleted on disconnect

### Messaging to Users

```
ResourceFlow only sees when you're busy, not what you're doing.
We use this to show accurate availability and detect scheduling conflicts.
You can disconnect your calendar anytime in Settings.
```

---

## Implementation Phases

### Phase 1A: Google Calendar + LLM Convention Analysis (MVP)
- [ ] Google OAuth flow with login_hint
- [ ] Token storage and refresh
- [ ] **Admin onboarding: calendar conventions prompt**
- [ ] **LLM analysis pipeline to generate detection config**
- [ ] **Clarifying questions flow**
- [ ] Basic event fetching
- [ ] Config-driven PTO/OOO detection
- [ ] Team Utilization integration

### Phase 1B: Smart Features
- [ ] Dynamic timesheet timing (send early if OOO Friday/Monday)
- [ ] Every-other-Friday / alternating schedule detection
- [ ] Partial day appointment detection
- [ ] PTOverlap detection and alerts
- [ ] Meeting load in utilization view
- [ ] Smart notification timing based on calendar gaps

### Phase 1C: Feedback & Refinement
- [ ] User flagging of incorrect detections
- [ ] Detection accuracy dashboard for admins
- [ ] LLM re-analysis based on feedback
- [ ] Config versioning and rollback

### Phase 2: Multi-Provider
- [ ] Microsoft 365 OAuth
- [ ] Provider abstraction layer
- [ ] Provider auto-detection by email domain
- [ ] Apple Calendar (lower priority)

### Phase 3: Advanced
- [ ] Workspace admin pre-authorization
- [ ] Bulk calendar connection for teams
- [ ] Calendar analytics (meeting load trends)
- [ ] Integration with project calendars
- [ ] Predictive availability based on patterns

---

## Summary

The key architectural decision: **email is the universal identifier**.

Slack OAuth gives us the email. Calendar OAuth (any provider) uses `login_hint` to pre-select that same account. From the user's perspective, it's one connected system. From our perspective, we're storing two separate tokens but they're linked by email.

This pattern will scale to any calendar provider because the OAuth flow is fundamentally the same — only the endpoints and scopes differ.

---

*Last updated: January 7, 2026*
*Author: ResourceFlow Workshop (Ryan + Claude)*