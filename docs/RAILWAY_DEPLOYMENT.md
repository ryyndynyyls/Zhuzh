# Railway Deployment Guide for Zhuzh

**Last Updated:** January 26, 2026

This guide walks through deploying Zhuzh's 3-service architecture to Railway.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Project: Zhuzh                    │
├─────────────────┬─────────────────┬─────────────────────────┤
│   zhuzh-web     │   zhuzh-api     │     zhuzh-slack         │
│   (Static)      │   (Express)     │     (Bolt SDK)          │
│   Port: 3000    │   Port: 3002    │     Port: 3001          │
├─────────────────┼─────────────────┼─────────────────────────┤
│ Serves React    │ REST API        │ Slack Bot               │
│ built files     │ Voice commands  │ Friday DMs              │
│                 │ Calendar sync   │ Slash commands          │
│                 │ Reports         │ Confirmations           │
└─────────────────┴─────────────────┴─────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Supabase   │
                    │  (External) │
                    └─────────────┘
```

---

## Prerequisites

1. **GitHub repo** — Code pushed to `github.com/ryyndynyyls/Zhuzh`
2. **Railway account** — Sign up at [railway.app](https://railway.app)
3. **Environment variables** — Have your `.env.local` values ready

---

## Step 1: Create Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Click **"Deploy from GitHub repo"**
3. Select `ryyndynyyls/Zhuzh`
4. Railway will create your first service automatically

---

## Step 2: Create Three Services

You need 3 services from the same repo. In your Railway project:

### Service 1: zhuzh-web (Frontend)

1. Click the auto-created service → **Settings**
2. Rename to `zhuzh-web`
3. **Build Command:** `npm run build`
4. **Start Command:** `npx serve dist -s -l 3000`
5. **Watch Paths:** `src/**, index.html, vite.config.ts`

**Environment Variables:**
```
PORT=3000
VITE_SUPABASE_URL=https://ovyppexeqwwaghwddtip.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_URL=https://<zhuzh-api-url>.railway.app
```

### Service 2: zhuzh-api (Express API)

1. Click **"+ New"** → **"GitHub Repo"** → Select same repo
2. Rename to `zhuzh-api`
3. **Build Command:** `npm install`
4. **Start Command:** `npm run api:start`
5. **Watch Paths:** `src/api/**`

**Environment Variables:**
```
PORT=3002
NODE_ENV=production
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
VITE_SUPABASE_URL=https://ovyppexeqwwaghwddtip.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
GEMINI_API_KEY=<your-gemini-key>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://<zhuzh-api-url>.railway.app/api/auth/google/callback
APP_URL=https://<zhuzh-web-url>.railway.app
```

### Service 3: zhuzh-slack (Slack Bot)

1. Click **"+ New"** → **"GitHub Repo"** → Select same repo
2. Rename to `zhuzh-slack`
3. **Build Command:** `npm install`
4. **Start Command:** `npm run slack`
5. **Watch Paths:** `src/slack/**`

**Environment Variables:**
```
PORT=3001
NODE_ENV=production
SLACK_BOT_TOKEN=xoxb-<your-bot-token>
SLACK_SIGNING_SECRET=<your-signing-secret>
SLACK_APP_TOKEN=xapp-<your-app-token>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
VITE_SUPABASE_URL=https://ovyppexeqwwaghwddtip.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## Step 3: Generate Public URLs

For each service:

1. Click the service
2. Go to **Settings** → **Networking**
3. Click **"Generate Domain"**

You'll get URLs like:
- `zhuzh-web-production.up.railway.app`
- `zhuzh-api-production.up.railway.app`
- `zhuzh-slack-production.up.railway.app`

---

## Step 4: Update Environment Variables

Now that you have URLs, update:

1. **zhuzh-web:** Set `VITE_API_URL` to the zhuzh-api URL
2. **zhuzh-api:** Set `GOOGLE_REDIRECT_URI` and `APP_URL` with real URLs

---

## Step 5: Update Slack App Configuration

Go to [api.slack.com/apps](https://api.slack.com/apps) → Your App:

1. **Event Subscriptions** → Request URL:
   ```
   https://<zhuzh-slack-url>.railway.app/slack/events
   ```

2. **Interactivity & Shortcuts** → Request URL:
   ```
   https://<zhuzh-slack-url>.railway.app/slack/events
   ```

3. **Slash Commands** → Update each command's Request URL

---

## Step 6: Deploy

Railway auto-deploys on git push. To trigger manually:

1. Go to each service
2. Click **"Deploy"** → **"Deploy Now"**

Watch the build logs for any errors.

---

## Verification Checklist

- [ ] Web app loads at `https://zhuzh-web-xxx.railway.app`
- [ ] Can log in via Supabase auth
- [ ] API responds at `https://zhuzh-api-xxx.railway.app/api/health`
- [ ] Voice commands work (test in web app)
- [ ] Slack bot responds to `/zhuzh` command
- [ ] Friday DM test works (`/zhuzh dm-test`)

---

## Custom Domain (Optional)

To use `app.zhuzh.io` or similar:

1. Service → Settings → Networking → Custom Domain
2. Add your domain
3. Railway provides DNS records to add
4. Update `VITE_API_URL` and Slack URLs accordingly

---

## Estimated Costs

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| zhuzh-web | Light (static files) | ~$1-2 |
| zhuzh-api | Moderate | ~$3-5 |
| zhuzh-slack | Light (persistent) | ~$2-3 |
| **Total** | | **~$6-10** |

Hobby plan includes $5 credit, so expect **~$1-5 actual cost** for pilot.

---

## Troubleshooting

### "Cannot find module" errors
- Ensure `npm install` runs in build command
- Check that `package.json` has all dependencies (not devDependencies for prod)

### API calls failing
- Verify `VITE_API_URL` is set correctly in zhuzh-web
- Check CORS settings in API server
- Look at API service logs in Railway

### Slack bot not responding
- Verify Socket Mode is enabled in Slack app settings
- Check `SLACK_APP_TOKEN` starts with `xapp-`
- Look at slack service logs in Railway

### Build taking too long
- Railway caches `node_modules` between builds
- First build is slower (~2-3 min), subsequent builds faster

---

## Quick Commands

```bash
# View logs (install Railway CLI first)
railway logs -s zhuzh-web
railway logs -s zhuzh-api
railway logs -s zhuzh-slack

# Trigger redeploy
railway up -s zhuzh-web
```

---

## Environment Variables Reference

### Required for All Services
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

### zhuzh-web Only
```
VITE_API_URL          # URL of zhuzh-api service
```

### zhuzh-api Only
```
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
APP_URL
```

### zhuzh-slack Only
```
SLACK_BOT_TOKEN
SLACK_SIGNING_SECRET
SLACK_APP_TOKEN
SUPABASE_SERVICE_ROLE_KEY
```

---

## Next Steps After Deploy

1. **Test with team** — Have Michelle, Maleno, Kara try it
2. **Monitor costs** — Check Railway dashboard after a week
3. **Custom domain** — Set up `app.zhuzh.io` when ready
4. **Upgrade to Pro** — When launching externally ($20/mo)

---

*Questions? Check Railway docs at [docs.railway.com](https://docs.railway.com)*
