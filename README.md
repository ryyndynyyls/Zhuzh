# Zhuzh

**Slack-First Timekeeping & Resource Management for Creative Teams**

> Confirmation over tracking. Trust over surveillance.

---

## What Is This?

Zhuzh is a resource management tool built for creative agencies (8-50 people). It replaces expensive tools like Harvest, 10,000ft, SmartSheet, and Float with a simpler approach:

1. **Producers plan allocations** via web interface
2. **Employees confirm hours** via Friday Slack DM
3. **Managers approve** with one click
4. **Budgets update** in real-time

No timers. No surveillance. Just confirm what was planned, or note what changed.

---

## Production URLs

| Service | URL |
|---------|-----|
| Web App | https://zhuzh-production.up.railway.app |
| API | https://zhuzh-api-production.up.railway.app |
| Slack Bot | https://zhuzh-slack-integration-production.up.railway.app |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite + Material UI |
| Backend | Supabase (Postgres + Auth + RLS) |
| API | Express.js |
| Slack | Bolt SDK |
| Hosting | Railway |
| AI | Google Gemini (calendar config, voice commands) |

---

## Local Development

```bash
# Install dependencies
npm install

# Start all services (3 terminals)
npm run dev        # Web app (port 3000)
npm run api:dev    # API server (port 3002)
npm run slack:dev  # Slack bot (port 3001)
```

Required environment variables in `.env.local`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `SLACK_SIGNING_SECRET`

---

## Project Structure

```
├── src/
│   ├── api/           # Express API server
│   ├── slack/         # Slack bot (Bolt SDK)
│   ├── pages/         # React pages
│   ├── components/    # React components
│   └── hooks/         # Custom React hooks
├── docs/
│   ├── SESSION_STATUS.md    # Current development status
│   └── live-sync-doc.md     # Locked product decisions
├── specs/
│   ├── product-spec.md      # Product specification
│   └── calendar-integration.md
├── sql/               # Database migrations
└── brand/             # Logo and design assets
```

---

## Status

**Phase 1: Complete** — All core features shipped, Railway deployment working.

**Current Phase: Internal Pilot** — Testing with Use All Five team before marketing to other agencies.

See `docs/SESSION_STATUS.md` for current development status.

---

## Team

Built by [Use All Five](https://useallfive.com), a creative agency in Los Angeles.

| Role | Person |
|------|--------|
| Product & Development | Ryan Daniels |
| Managing Director | Michelle |
| CEO | Levi |

---

*Last updated: January 27, 2026*
