# Cowork Task: OAuth & Config Fixes

**Created:** 2026-01-27
**Estimated time:** 15 min
**Why Cowork:** Quick config changes, can run in background

---

## Context

Production OAuth is redirecting to `localhost:3000` instead of staying on `zhuzh-production.up.railway.app`. This is a Slack app configuration issue.

## Subtasks

### Subtask 1: Identify current OAuth callback URLs
1. Check `src/api/` for any hardcoded localhost references
2. Check environment variables in Railway dashboard references in code
3. Document what URLs are currently configured

### Subtask 2: Update callback URLs
1. In the codebase, ensure OAuth callback uses `process.env.APP_URL` or similar
2. Document the Slack App Dashboard URL that Ryan needs to update manually:
   - Go to api.slack.com/apps → Zhuzh app → OAuth & Permissions
   - Update Redirect URLs to include `https://zhuzh-production.up.railway.app/auth/callback`

### Subtask 3: Verify environment variables
1. Check that Railway has correct `APP_URL` or equivalent env var
2. List any env vars that need to be added/updated in `docs/SESSION_STATUS.md`

## Verification
```bash
# After Ryan updates Slack app settings:
# 1. Open incognito browser
# 2. Go to https://zhuzh-production.up.railway.app
# 3. Click "Sign in with Slack"
# 4. Should stay on production URL after auth
```

## Success Criteria
- [ ] No hardcoded localhost in OAuth flow
- [ ] Environment variables documented
- [ ] Instructions for Slack app dashboard update provided

## Update After Completion
1. Update `docs/SESSION_STATUS.md` with what was changed
2. Note any manual steps Ryan needs to take in Slack dashboard
