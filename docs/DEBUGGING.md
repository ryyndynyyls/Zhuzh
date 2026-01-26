# ResourceFlow Debugging Guide

Quick reference for common issues and how to diagnose them.

---

## Quick Debug Commands

### Check if services are running
```bash
# Web app (Vite)
curl -s http://localhost:3000 | head -20

# API server  
curl -s http://localhost:3002/api/db/summary | jq

# Test specific endpoints
curl -s http://localhost:3002/api/db/sample/users | jq '.data[] | {id, name, role, org_id}'
```

### Check logs
```bash
# In the terminal running `npm run dev` - watch for Vite errors
# In the terminal running `npm run api:dev` - watch for API errors

# Browser console (right-click → Inspect → Console)
# Look for emoji-prefixed logs like 🔍 📅 ✅ ❌
```

---

## Common Issues

### "Please log in" when already logged in

**Symptoms:** Sidebar shows user name, but page shows login warning

**Cause:** Auth context hasn't finished loading, or user profile query failed

**Debug steps:**
1. Open browser console
2. Look for `📅 ResourceCalendarPage render:` log
3. Check `user` and `authLoading` values
4. Look for `🔍 Fetching profile` and `✅ Found profile` logs

**Common fixes:**
- Page not waiting for `authLoading` to be false
- User's email doesn't match any row in `users` table
- RLS policy blocking the query

### Data not showing / Empty tables

**Symptoms:** Component renders but no data displayed

**Debug steps:**
1. Check API directly: `curl -s http://localhost:3002/api/db/sample/{table} | jq`
2. Check browser Network tab for failed requests
3. Look for Supabase RLS policy errors in console

**Common fixes:**
- Wrong `org_id` being queried
- RLS policy too restrictive
- Data exists in different org

### Page shows error after code change

**Symptoms:** Vite shows error overlay, or component crashes

**Debug steps:**
1. Check terminal running Vite for compile errors
2. Look for TypeScript errors (missing imports, type mismatches)
3. Try hard refresh: Cmd+Shift+R

---

## Key Files for Debugging

| File | What it controls |
|------|------------------|
| `src/contexts/AuthContext.tsx` | User authentication, session management |
| `src/lib/supabase.ts` | Database client configuration |
| `src/api/server.ts` | API endpoints, database queries |
| `supabase/migrations/*.sql` | Database schema, RLS policies |

---

## Test Users & Data

### Users in database
```
Ryan       - admin  - 9a553e2f-e8e5-4c35-86e9-2066d5d81123
Michelle   - pm     - 22222222-2222-2222-2222-222222222222  
Maleno     - pm     - 33333333-3333-3333-3333-333333333333
Kara       - employee - 44444444-4444-4444-4444-444444444444
Sam        - employee - 55555555-5555-5555-5555-555555555555
Jordan     - employee - 66666666-6666-6666-6666-666666666666
Alex       - employee - 77777777-7777-7777-7777-777777777777
```

### Organizations
```
Use All Five - a1b2c3d4-e5f6-7890-abcd-ef1234567890
Test Org     - 00000000-0000-0000-0000-000000000000
```

### Quick data check
```bash
# See all users and their orgs
curl -s http://localhost:3002/api/db/sample/users | jq '.data[] | {name, org_id, email}'
```

---

## Dev Mode Bypass

If auth is causing issues, you can enable dev mode in `AuthContext.tsx`:

```typescript
const DEV_MODE = true;  // Set to true to bypass auth
```

This uses a mock user (Ryan, admin, org `00000000-...`) without requiring Slack login.

---

## Supabase Dashboard

Direct database access: https://supabase.com/dashboard/project/ovyppexeqwwaghwddtip

- **Table Editor** - Browse/edit data directly
- **SQL Editor** - Run queries
- **Logs** - See API request logs
- **Auth** - See logged in users
