# ResourceFlow Manual Setup Guide

Everything Cowork built is ready — this guide covers the manual configuration to get it running.

---

## 1. Environment Variables

Create `.env.local` in the project root:

```env
# Supabase (from your Supabase project settings)
NEXT_PUBLIC_SUPABASE_URL=https://ovyppexeqwwaghwddtip.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Slack (from api.slack.com/apps)
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 2. Slack App Configuration

### 2.1 Create the App (if not done)
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name: `ResourceFlow`
4. Workspace: Use All Five

### 2.2 Bot Token Scopes
Go to **OAuth & Permissions** → **Bot Token Scopes** and add:

| Scope | Purpose |
|-------|---------|
| `chat:write` | Send DMs and messages |
| `commands` | Slash commands |
| `users:read` | Get user info |
| `users:read.email` | Match users to database |
| `im:write` | Open DM channels |
| `im:history` | Read DM history (for context) |

### 2.3 Slash Commands
Go to **Slash Commands** and create:

| Command | Request URL | Description |
|---------|-------------|-------------|
| `/week` | `https://your-app.vercel.app/api/slack/commands` | Confirm your week |
| `/pending` | `https://your-app.vercel.app/api/slack/commands` | View pending approvals |
| `/budget` | `https://your-app.vercel.app/api/slack/commands` | Check project budget |

*Note: Update URLs after Vercel deployment*

### 2.4 Interactivity & Shortcuts
Go to **Interactivity & Shortcuts**:
- Toggle **On**
- Request URL: `https://your-app.vercel.app/api/slack/interactions`

### 2.5 Event Subscriptions (Optional for DMs)
Go to **Event Subscriptions**:
- Toggle **On**
- Request URL: `https://your-app.vercel.app/api/slack/events`
- Subscribe to bot events:
  - `message.im` (DM messages)
  - `app_home_opened` (if building home tab)

### 2.6 Install to Workspace
1. Go to **Install App**
2. Click **Install to Workspace**
3. Copy the **Bot User OAuth Token** → `SLACK_BOT_TOKEN`

### 2.7 App-Level Token (for Socket Mode dev)
Go to **Basic Information** → **App-Level Tokens**:
1. Click **Generate Token and Scopes**
2. Name: `socket-mode`
3. Add scope: `connections:write`
4. Copy token → `SLACK_APP_TOKEN`

Also copy **Signing Secret** → `SLACK_SIGNING_SECRET`

---

## 3. Local Development

### 3.1 Install Dependencies
```bash
cd /Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow
npm install
```

### 3.2 Run the Web App
```bash
npm run dev
```
Opens at http://localhost:3000

### 3.3 Run the Slack Bot (Socket Mode)
```bash
npm run slack
```
This connects to Slack via WebSocket for local development.

---

## 4. Vercel Deployment

### 4.1 Connect Repository
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import the repository
4. Framework: Vite
5. Build command: `npm run build`
6. Output directory: `dist`

### 4.2 Environment Variables
Add all `.env.local` variables to Vercel:
- Project Settings → Environment Variables
- Add each key/value pair

### 4.3 Update Slack URLs
After deployment, update slash command URLs to your Vercel domain:
- `https://resourceflow-xyz.vercel.app/api/slack/commands`

---

## 5. Verification Checklist

### Web App
- [ ] Can load http://localhost:3000
- [ ] Dashboard shows projects from Supabase
- [ ] Budget cards display correctly
- [ ] Can navigate between pages

### Slack Bot
- [ ] `/week` opens confirmation modal
- [ ] `/pending` shows pending approvals (for PMs)
- [ ] `/budget [project]` shows budget status
- [ ] Buttons in DMs work (Looks Good, Adjust)

### Data Flow
- [ ] Submitting confirmation creates record in Supabase
- [ ] Approval updates confirmation status
- [ ] Budget dashboard reflects time entries

---

## 6. Troubleshooting

### "Invalid Slack signature"
- Check `SLACK_SIGNING_SECRET` is correct
- Ensure request URL matches exactly

### "Supabase connection failed"
- Verify `NEXT_PUBLIC_SUPABASE_URL` format
- Check RLS policies aren't blocking queries
- For testing, temporarily disable RLS

### "Module not found"
```bash
npm install
```

### Slack commands not responding
- Check Vercel function logs
- Verify slash command URLs are correct
- Test with Socket Mode locally first

---

## Quick Reference

| Service | Dashboard |
|---------|-----------|
| Supabase | https://supabase.com/dashboard/project/ovyppexeqwwaghwddtip |
| Slack App | https://api.slack.com/apps |
| Vercel | https://vercel.com/dashboard |

| Local URL | Purpose |
|-----------|---------|
| http://localhost:3000 | Web app |
| Slack Socket Mode | Bot (no URL needed) |

