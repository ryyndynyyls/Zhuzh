# Manual Steps for Ryan

Things to do when you get back from this autonomous session.

---

## ✅ Nothing Required Immediately

All code changes have been made and saved. The Slack flows should work without any configuration changes.

---

## 🧪 Testing Steps

### 1. Test Friday DM Flow

```bash
# Terminal 1: Start the Slack bot
cd ~/Claude-Projects-MCP/ResourceFlow && npm run slack:dev
```

Then in Slack:
```
/dm-test friday
```

**Expected behavior:**
1. You receive a DM with your allocations for the current week
2. Two buttons: "✓ Looks Good" and "Adjust Hours"
3. Clicking "Looks Good" should submit your timesheet and confirm via DM
4. Clicking "Adjust Hours" should open a modal with editable hour fields

### 2. Test Monday DM Flow

```
/dm-test monday
```

**Expected behavior:**
1. You receive a "Your week has been scheduled" DM
2. Three buttons: "✓ Looks Good", "View Details", "⚠ Flag Issue"
3. "Looks Good" sends a friendly acknowledgment
4. "View Details" opens a modal with project descriptions
5. "Flag Issue" opens a modal to notify your PM

### 3. Test Web Timesheet

```bash
# Start web app
npm run dev
```

Open: http://localhost:3000/timesheet

**Expected behavior:**
1. See your allocations for the current week
2. Edit actual hours
3. Add unplanned work
4. Submit → Goes to approval queue

---

## 🐛 If Something Doesn't Work

### "Command not found" for /dm-test
- The Slack app needs the `/dm-test` command registered
- Go to api.slack.com → Your app → Slash Commands → Add command `/dm-test`

### Buttons don't respond
- Check the Slack bot terminal for errors
- Verify the bot is running: `npm run slack:dev`
- Check that `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_APP_TOKEN` are set in `.env.local`

### "No allocations for this week"
- You need allocations in the database for the current week
- Check Supabase: `SELECT * FROM allocations WHERE week_start = '2026-01-13'`
- Or use the Resource Calendar to add some allocations

---

## 📊 Cowork Handoff

I created `docs/COWORK_TASK_UTILIZATION.md` for the 0% utilization bug.

To delegate to Cowork:
1. Copy the contents of that file
2. Start a new Cowork session
3. Paste the task description

Or debug it yourself — the file has all the diagnostic steps.

---

## 🎉 What Got Done

1. **Fixed Friday DM** — Buttons now work (action ID mismatch fixed)
2. **Fixed Monday DM** — Added all three button handlers
3. **Fixed buildWeekTable** — Was returning Block[] instead of string
4. **Web Timesheet** — Already built and working
5. **Session Status** — Updated with all changes

The core "Confirm Your Week" flow is now wired end-to-end:
- Friday 3pm: Bot DMs employee
- Employee clicks "Looks Good" or "Adjust Hours"
- If adjust: Modal opens, employee edits and submits
- Manager gets notified
- Approval queue shows pending timesheets

---

## Questions?

Just ask in the next chat! I can pick up where we left off.
