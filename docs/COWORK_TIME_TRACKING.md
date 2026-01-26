# Cowork Task: Time Tracking Feature (Optional)

**Created:** 2026-01-22
**Estimated time:** 4-6 hours
**Why Cowork:** Multi-file implementation across web app, Slack bot, API, and database

---

## Context

Zhuzh is built on **confirmation over tracking** — employees confirm pre-planned allocations on Fridays rather than manually logging hours throughout the day. However, some teams want the *option* to track actual hours in real-time for more granular billing or personal productivity insights.

This feature is **opt-in** via Preferences. When enabled, users can track time via:
1. Web app timer UI
2. Slack `/zhuzh` slash command

Time tracked feeds into the Friday confirmation flow, pre-populating actual hours.

---

## Research Summary

### Industry Patterns (Harvest, Toggl, Clockify)

**Slash Commands:**
| Tool | Start | Stop | Log Manual | Check Status |
|------|-------|------|------------|--------------|
| Harvest | `/harvest start [notes]` | `/harvest stop` | `/harvest log 2h [notes]` | `/harvest status` |
| Toggl | `/toggl start` | `/toggl stop` | `/toggl track 2h` | `/toggl timesheet` |
| Clockify | Timer via browser | Timer via browser | Manual entry | Dashboard |

**Key UX Insights:**
- Start/stop should be **one tap/command** — no friction
- Auto-link to current project when in project channel (Toggl does this)
- Timer state should persist across sessions/devices
- Manual entry equally important as timer (people forget)
- Show running timer in UI constantly (favicon, status bar)
- Idle detection helps but can feel invasive — make optional
- "Quick log" for after-the-fact entry more used than real-time timer

### Zhuzh Philosophy Alignment

We're NOT building surveillance. Key principles:
- **Optional** — team/user can disable entirely
- **Trust-based** — no screenshots, no keystroke logging
- **Feeds confirmation** — data pre-populates Friday DM, not replaces it
- **Project-aware** — knows your allocations, suggests projects
- **Minimal friction** — one click/command to start

---

## Feature Specification

### 1. Settings Toggle

**Location:** Settings → Preferences
**Default:** OFF

```
┌─────────────────────────────────────────────────────┐
│ Time Tracking                                        │
│                                                      │
│ ○ Confirmation only (default)                       │
│   Confirm planned hours on Fridays                  │
│                                                      │
│ ● Track time throughout the week                    │
│   Log hours as you work, pre-fills Friday DM        │
│                                                      │
│ When enabled:                                        │
│ ☑ Show timer in web app                             │
│ ☑ Enable /zhuzh Slack commands                      │
│ ☐ Daily summary in Slack (6pm)                      │
└─────────────────────────────────────────────────────┘
```

### 2. Web App Timer UI

**Location:** Persistent bottom bar OR floating widget (user preference)

**States:**

**Idle State:**
```
┌──────────────────────────────────────────────────────────┐
│ ▶  Start tracking   │ Google Cloud Next 2026 ▾ │ 0:00   │
└──────────────────────────────────────────────────────────┘
```

**Running State:**
```
┌──────────────────────────────────────────────────────────┐
│ ⏸  │ Google Cloud Next 2026          │ 1:23:45 │ ⏹ Stop │
└──────────────────────────────────────────────────────────┘
         ↑ Pulsing orange dot                      ↑ Saves entry
```

**Features:**
- Project dropdown auto-populated from current week's allocations
- Running timer shows in browser tab: "⏱ 1:23 — Zhuzh"
- Keyboard shortcut: `Cmd+Shift+T` to start/stop
- Clicking anywhere on the bar expands to show:
  - Notes field
  - Phase selector (if project has phases)
  - "Log past time" link for manual entry

**Manual Entry Modal:**
```
┌─────────────────────────────────────────────────────────┐
│ Log Time                                            ✕   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Project    [Google Cloud Next 2026        ▾]           │
│ Phase      [Development                    ▾]           │
│ Hours      [  2  ] h  [ 30 ] m                         │
│ Date       [Today, Jan 22            ▾]                │
│ Notes      [Working on keynote slides     ]            │
│                                                         │
│                              [Cancel]  [Log Time]       │
└─────────────────────────────────────────────────────────┘
```

### 3. Slack Commands

**Primary command:** `/zhuzh`

| Command | Action | Response |
|---------|--------|----------|
| `/zhuzh start` | Start timer, shows project picker modal | "⏱ Timer started on [project]" |
| `/zhuzh start [project]` | Start timer on named project | "⏱ Timer started on Google Cloud Next" |
| `/zhuzh stop` | Stop current timer | "✓ Logged 1h 23m to Google Cloud Next" |
| `/zhuzh log 2h [project]` | Quick manual entry | "✓ Logged 2h to Google Cloud Next" |
| `/zhuzh log 2.5h Newark Arts` | Manual with project | "✓ Logged 2h 30m to Newark Arts" |
| `/zhuzh status` | Show today's tracked time | Summary card with breakdown |
| `/zhuzh week` | Show week's tracked time | Weekly summary |

**Smart Features:**
- If in a project-linked channel, auto-suggest that project
- Fuzzy match project names ("gcn" → "Google Cloud Next 2026")
- `/zhuzh start` with no args opens modal picker

**Response Examples:**

Start:
```
⏱ Timer started
━━━━━━━━━━━━━━━━
Google Cloud Next 2026
Started at 2:30 PM

[Stop Timer]  [Switch Project]
```

Stop:
```
✓ Time logged
━━━━━━━━━━━━━━━━
Google Cloud Next 2026
Duration: 1h 23m

Today's total: 5h 45m
[View Timesheet]  [Log More]
```

Status:
```
📊 Today's Time — Jan 22
━━━━━━━━━━━━━━━━━━━━━━
🔵 Google Cloud Next    3h 15m
🟢 Newark Arts          1h 30m
🟣 Brooklyn Rail        0h 45m
━━━━━━━━━━━━━━━━━━━━━━
Total                   5h 30m

⏱ Currently tracking: Google Cloud Next (0:12:34)
```

### 4. Friday DM Integration

When time tracking is enabled, Friday DM changes:

**Before (confirmation only):**
```
Your allocations for this week:
• Google Cloud Next: 20h planned
• Newark Arts: 15h planned

Did you work these hours? [Confirm] [Adjust]
```

**After (with tracking):**
```
Your week — Jan 13-17
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    Planned  Tracked
🔵 Google Cloud Next   20h     18.5h
🟢 Newark Arts         15h     16h
🟣 Brooklyn Rail        5h      4h
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total                  40h     38.5h

[Confirm Tracked Hours]  [Adjust]
```

The "Confirm Tracked Hours" uses tracked time as actuals. "Adjust" lets them modify.

---

## Database Schema

### New Table: `time_entries_live`

```sql
CREATE TABLE time_entries_live (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  phase_id UUID REFERENCES project_phases(id),
  
  -- Timer or manual
  entry_type TEXT NOT NULL CHECK (entry_type IN ('timer', 'manual')),
  
  -- For timer entries
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  
  -- Calculated/entered duration in minutes
  duration_minutes INTEGER NOT NULL,
  
  -- For manual entries, which date it applies to
  entry_date DATE NOT NULL,
  
  notes TEXT,
  
  -- Track if this was included in a confirmation
  confirmation_id UUID REFERENCES time_confirmations(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching user's entries for a week
CREATE INDEX idx_time_entries_live_user_date 
  ON time_entries_live(user_id, entry_date);

-- Currently running timer (only one per user)
CREATE UNIQUE INDEX idx_one_running_timer 
  ON time_entries_live(user_id) 
  WHERE stopped_at IS NULL;
```

### User Settings

Add to `users` table or `user_settings`:

```sql
ALTER TABLE users ADD COLUMN time_tracking_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN time_tracking_daily_summary BOOLEAN DEFAULT FALSE;
```

---

## API Endpoints

### Timer Operations

```
POST   /api/timer/start      { projectId, phaseId?, notes? }
POST   /api/timer/stop       { notes? }
GET    /api/timer/current    → { running: bool, entry?: {...} }
DELETE /api/timer/discard    → Discard running timer without saving
```

### Manual Entry

```
POST   /api/time-entries     { projectId, phaseId?, durationMinutes, entryDate, notes? }
GET    /api/time-entries     ?userId=&startDate=&endDate=
PATCH  /api/time-entries/:id { durationMinutes?, notes? }
DELETE /api/time-entries/:id
```

### Summaries

```
GET /api/time-entries/summary/today   → { entries: [...], total: 320 }
GET /api/time-entries/summary/week    → { byProject: {...}, total: 2100 }
```

---

## Subtasks

### Subtask 1: Database Migration
**File:** `sql/014_time_tracking.sql`
- Create `time_entries_live` table
- Add user settings columns
- Add RLS policies

### Subtask 2: API Routes (Can parallel with 1)
**File:** `src/api/routes/timer.ts`
- Timer start/stop/current/discard endpoints
- Manual entry CRUD
- Summary endpoints

### Subtask 3: Settings UI (Can parallel with 1, 2)
**File:** `src/pages/SettingsPage.tsx`
- Add Time Tracking section
- Toggle for enable/disable
- Sub-options for daily summary

### Subtask 4: Web Timer Component
**Files:**
- `src/components/TimeTracker.tsx` — Main timer bar
- `src/components/ManualTimeEntry.tsx` — Manual entry modal
- `src/hooks/useTimer.ts` — Timer state management

### Subtask 5: Integrate Timer into App Layout
**File:** `src/App.tsx` or layout component
- Conditionally render timer bar based on user setting
- Global keyboard shortcut listener

### Subtask 6: Slack Commands (Depends on 2)
**File:** `src/slack/commands/timer.ts`
- Register `/zhuzh` command variations
- Modal for project selection
- Response formatting

### Subtask 7: Friday DM Enhancement (Depends on 2)
**File:** `src/slack/jobs/fridayReminder.ts`
- Modify to pull tracked time when enabled
- New message format with planned vs tracked comparison

### Subtask 8: Testing & Polish
- Test timer persistence across page reloads
- Test Slack command edge cases
- Verify Friday DM integration

---

## Verification

```bash
# 1. Check database migration
psql -c "SELECT * FROM time_entries_live LIMIT 1;"

# 2. Test API
curl http://localhost:3002/api/timer/start -d '{"projectId":"..."}'
curl http://localhost:3002/api/timer/current
curl http://localhost:3002/api/timer/stop

# 3. Test Slack
# In Slack: /zhuzh start
# In Slack: /zhuzh stop
# In Slack: /zhuzh status

# 4. Test Settings toggle
# Go to Settings → enable time tracking → verify timer appears
```

---

## Success Criteria

- [ ] Time tracking toggle in Settings (default OFF)
- [ ] Timer bar appears when enabled
- [ ] Can start/stop timer from web app
- [ ] Timer state persists across page reloads
- [ ] Can manually log time entries
- [ ] `/zhuzh start` works in Slack
- [ ] `/zhuzh stop` works in Slack
- [ ] `/zhuzh log 2h [project]` works
- [ ] `/zhuzh status` shows today's summary
- [ ] Friday DM shows tracked vs planned when enabled
- [ ] Entries link to confirmations after Friday approval

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md` with completion
2. Add to `docs/live-sync-doc.md`:
   - Decision: Time tracking is optional, off by default
   - Decision: Tracked time pre-fills Friday confirmation, doesn't replace it

---

*This feature maintains Zhuzh's trust-based philosophy while giving teams who want it the ability to track time in real-time.*
