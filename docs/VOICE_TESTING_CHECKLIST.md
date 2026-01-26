# Voice Assistant Testing Checklist

**Date:** January 22, 2026  
**After:** Voice Overhaul (Cowork completed)

---

## Quick Start

```bash
# Terminal 1: Web App
cd ~/Claude-Projects-MCP/ResourceFlow && npm run dev

# Terminal 2: API Server
cd ~/Claude-Projects-MCP/ResourceFlow && npm run api:dev

# Terminal 3 (optional): Slack Bot
cd ~/Claude-Projects-MCP/ResourceFlow && npm run slack:dev
```

**Test URL:** http://localhost:3000 → Click microphone icon or press `Cmd+K`

---

## Test Each Request Category

### 1. Actions ✅
Commands that modify data.

| Test | Expected |
|------|----------|
| "Add 8 hours to Patina for Ryan next week" | Creates allocation, confirms with details |
| "Remove Sarah from Agent Challenge this week" | Deletes allocation, confirms |
| "Move 4 hours from Design to Dev for Alex" | Updates allocation, shows before/after |

### 2. Queries ✅
Commands that fetch data.

| Test | Expected |
|------|----------|
| "Who's on Patina this week?" | Lists team members + hours |
| "What's Ryan working on?" | Shows all current allocations |
| "Show me availability next week" | Lists team capacity |

### 3. Insights 🆕
Proactive analysis (NEW from overhaul).

| Test | Expected |
|------|----------|
| "How's the team looking?" | Summary + flags overallocations, gaps |
| "Any issues I should know about?" | Surfaces warnings: budget, PTO conflicts |
| "Give me an overview of next week" | Synthesized team + project status |

### 4. Advisory 🆕
Decision support (NEW from overhaul).

| Test | Expected |
|------|----------|
| "Should I add Ryan to Agent Challenge?" | Evaluates capacity, budget, recommends proceed/caution/avoid |
| "Can Sarah take on more work?" | Checks current load, PTO, gives recommendation |
| "Is it okay to move Alex off Design?" | Considers coverage, suggests alternatives |

---

## Check New Features

### Classifier Working?
The system should recognize request types automatically. Check console logs for:
```
[Classifier] Category: insight, Confidence: 0.85
```

### Insights Generating?
Look for insight cards in ResponsePanel:
- 🔴 Critical (overallocation >48h)
- 🟡 Warning (budget >80%, PTO conflict)
- 🔵 Info (underutilization, suggestions)

### Personality Active?
Responses should feel warm, not robotic:
- ✅ "Got it! Added 8 hours to Patina for Ryan."
- ❌ "Allocation created successfully. ID: abc123"

---

## Quick Smoke Test (2 min)

1. **Action:** "Add 4 hours to Patina for Ryan tomorrow"
   - [ ] Allocation created
   - [ ] Response is friendly

2. **Query:** "Who's available next week?"
   - [ ] Shows team list
   - [ ] Hours/capacity shown

3. **Insight:** "How's the team looking?"
   - [ ] Gets synthesized response
   - [ ] Flags any issues

4. **Advisory:** "Should I add more work to Ryan?"
   - [ ] Gets recommendation
   - [ ] Shows reasoning

---

## If Something's Broken

### API not responding
```bash
# Check server is running
curl http://localhost:3002/api/health
```

### Voice endpoint errors
```bash
# Test directly
curl -X POST http://localhost:3002/api/voice/process \
  -H "Content-Type: application/json" \
  -d '{"text":"who is available next week"}' \
  "?orgId=YOUR_ORG_ID&userId=YOUR_USER_ID"
```

### Check new files exist
```bash
ls -la src/lib/resource-wizard/
# Should see: classifier.ts, insight-engine.ts, advisory-engine.ts, personality.ts
```

---

## Follow-up Tasks (If Issues Found)

From SESSION_STATUS.md:
- [ ] Wire up InsightCard/AdvisoryPanel rendering in ResponsePanel
- [ ] Add "Fix this" button click handlers
- [ ] Test personality phrase variety

---

Good to go! 🎤
