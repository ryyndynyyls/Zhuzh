# Cowork Task: Calendar Sync & Who's Out

## Overview
Build the calendar sync system that:
1. Fetches Google Calendar events for all users
2. Detects PTO, holidays, and "Fridays Off" group membership
3. Populates `user_calendar_events` table
4. Powers the "Who's Out" dashboard widget
5. Enables smart timing for Slack DMs

## Context

### Current State
- Google Calendar OAuth is working (`src/lib/google-calendar.ts`)
- Gemini-based calendar config analysis exists (`src/lib/gemini.ts`)
- `user_calendar_events` table exists but is empty
- "Who's Out" widget exists but shows no data
- Smart timing logic exists but has no calendar data to work with

### UA5's Calendar Patterns (from Gemini analysis)
- **PTO Detection**: Events titled "OOO", "PTO", "Vacation", or all-day events on "PTO" calendar
- **Fridays Off**: Recurring calendar invite "Fridays off [date]" with ~8 attendees (alternating groups)
- **Holidays**: Company-wide calendar events

### Key Files to Reference
- `/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/src/lib/google-calendar.ts` - OAuth & calendar API
- `/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/src/lib/gemini.ts` - Calendar analysis
- `/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/src/lib/smart-timing.ts` - Uses calendar data
- `/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/src/components/WhosOut.tsx` - Dashboard widget

### Database Schema
```sql
-- Already exists
CREATE TABLE user_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type TEXT, -- 'pto', 'holiday', 'friday_off', 'meeting'
  summary TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  calendar_event_id TEXT, -- Google Calendar event ID for dedup
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, calendar_event_id)
);

-- Already exists
CREATE TABLE org_calendar_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  pto_detection JSONB,
  recurring_schedules JSONB,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Tasks

### Task 1: Calendar Sync Service
Create `src/lib/calendar-sync.ts`

```typescript
/**
 * Calendar Sync Service
 * 
 * Fetches calendar events and classifies them as:
 * - pto: User is on PTO/vacation
 * - holiday: Company holiday
 * - friday_off: User is in "Fridays Off" group for that date
 */

// Functions to implement:

// 1. syncUserCalendar(userId: string, startDate: Date, endDate: Date)
//    - Fetch events from Google Calendar API
//    - Classify each event using org's calendar config
//    - Upsert to user_calendar_events table
//    - Return count of synced events

// 2. syncOrgCalendars(orgId: string, startDate: Date, endDate: Date)
//    - Get all users with Google Calendar connected
//    - Call syncUserCalendar for each
//    - Return summary

// 3. detectFridayOffAttendees(orgId: string, friday: Date)
//    - Find "Fridays off" calendar invite for that date
//    - Extract attendee emails
//    - Match to users in database
//    - Create friday_off events for matched users

// 4. classifyEvent(event: CalendarEvent, config: OrgCalendarConfig): EventType
//    - Use org's pto_detection rules
//    - Check title patterns, calendar name, all-day status
//    - Return: 'pto' | 'holiday' | 'friday_off' | 'meeting' | null
```

### Task 2: Sync API Endpoints
Add to `src/api/server.ts` or create `src/api/calendar/index.ts`

```typescript
// POST /api/calendar/sync
// Trigger calendar sync for current user or all users (admin)
// Body: { userId?: string, startDate?: string, endDate?: string }

// GET /api/calendar/whos-out?date=2026-01-16
// Returns users who are out on a specific date
// Response: { date: string, users: [{ id, name, type: 'pto'|'friday_off'|'holiday' }] }

// GET /api/calendar/whos-out/week?weekStart=2026-01-12
// Returns who's out for each day of the week
// Response: { weekStart: string, days: [{ date, users: [...] }] }
```

### Task 3: Who's Out Widget Data Hook
Create `src/hooks/useWhosOut.ts`

```typescript
// Hook that fetches who's out data for the dashboard
// - Fetches current week by default
// - Supports week navigation (prev/next)
// - Groups by day
// - Shows PTO type (vacation, friday off, holiday)
```

### Task 4: Wire Up Who's Out Component
Update `src/components/WhosOut.tsx` to:
- Use the new `useWhosOut` hook
- Show actual data instead of empty state
- Display user avatars/names
- Show type of time off (badge: "PTO", "Friday Off", "Holiday")
- Week navigation working

### Task 5: Scheduled Sync Job
Add to `src/slack/app.ts` or create `src/jobs/calendar-sync.ts`

```typescript
// Run calendar sync daily at 6am
// - Sync next 2 weeks of events for all users
// - Log results
// - Handle errors gracefully (don't fail if one user's sync fails)
```

### Task 6: Manual Sync Trigger
Add Slack command `/sync-calendar` for admins to manually trigger sync

## Environment Variables Needed
Already configured:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Testing

### Test Calendar Sync
```bash
# After implementing, test with:
curl -X POST http://localhost:3002/api/calendar/sync \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2026-01-12", "endDate": "2026-01-19"}'
```

### Test Who's Out
```bash
curl http://localhost:3002/api/calendar/whos-out?date=2026-01-16
# Should return users from "Fridays off 1/16" calendar invite
```

### Verify in Dashboard
1. Open http://localhost:3000
2. "Who's Out" widget should show:
   - Troy (OOO Hawaii) 
   - Andrew, Bret, Jacob, Jennifer, Kara, Michelle, Ryan G, Sam (Fridays Off)

## Files to Create/Modify

### Create:
- `src/lib/calendar-sync.ts` - Core sync logic
- `src/api/calendar/index.ts` - API endpoints  
- `src/hooks/useWhosOut.ts` - React hook

### Modify:
- `src/api/server.ts` - Register calendar router
- `src/components/WhosOut.tsx` - Wire up real data
- `src/slack/app.ts` - Add scheduled sync job

## Success Criteria
1. `/api/calendar/whos-out?date=2026-01-16` returns correct users
2. Dashboard "Who's Out" widget shows real data
3. `/dm-test` shows correct timing based on synced calendar data
4. Sync runs automatically daily

## Reference: Google Calendar Event Structure
```typescript
interface CalendarEvent {
  id: string;
  summary: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  attendees?: Array<{ email: string; responseStatus: string }>;
  organizer?: { email: string };
}
```

## Reference: UA5 Calendar Config (from Gemini)
```json
{
  "pto_detection": {
    "title_patterns": ["OOO", "PTO", "Vacation", "Out of Office"],
    "all_day_events": true,
    "calendar_names": ["PTO", "Time Off"]
  },
  "recurring_schedules": [
    {
      "name": "Fridays Off",
      "type": "alternating_day_off",
      "day_of_week": 5,
      "detection": {
        "method": "calendar_invite",
        "event_title_contains": "Fridays off"
      }
    }
  ]
}
```
