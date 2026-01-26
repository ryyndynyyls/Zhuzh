# Zhuzh Security Overview

**For Developers** | Last Updated: January 22, 2026

---

## TL;DR

Zhuzh uses defense-in-depth security:

1. **Database (RLS)** — Row Level Security isolates tenant data
2. **API (Middleware)** — Rate limiting, validation, audit logging
3. **Infrastructure** — Supabase + Vercel handle encryption, secrets, network

---

## Database Security: Row Level Security (RLS)

Every table has RLS enabled. Users can only see/modify data from their own organization.

### How It Works

```sql
-- Example: Users can only see projects in their org
CREATE POLICY projects_org_isolation ON projects
    FOR ALL
    USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
```

### Tables Protected (12 total)

| Table | Access Pattern |
|-------|----------------|
| `organizations` | Own org only |
| `users` | Same org members |
| `clients` | Org-scoped |
| `projects` | Org-scoped |
| `project_phases` | Via project org |
| `allocations` | Via project org |
| `time_confirmations` | Own + PM/admin sees all in org |
| `time_entries` | Via confirmation |
| `time_entries_live` | Own + PM/admin sees all in org |
| `pto_entries` | Own + visible to org for planning |
| `audit_log` | Org-scoped, read-only |
| `security_audit_log` | Org-scoped, read-only |

### Service Role Bypass

When using `SUPABASE_SERVICE_ROLE_KEY` (server-side only), RLS is bypassed. **Always manually verify org access:**

```typescript
// ✅ CORRECT: Verify org context
const project = await supabaseAdmin.from('projects').select('*').eq('id', projectId).single();
if (project.org_id !== requestingOrgId) {
  throw new Error('Access denied');
}

// ❌ WRONG: Trusting the request blindly
const project = await supabaseAdmin.from('projects').select('*').eq('id', projectId).single();
return project; // Could leak cross-tenant data!
```

---

## API Security

### Rate Limiting

Protects against brute force and DoS attacks.

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/*` (global) | 100 requests | 15 minutes |
| `/api/auth/*` | 5 requests | 15 minutes |
| `/api/voice/*` | 30 requests | 1 minute |

**Location:** `src/api/middleware/rateLimiter.ts`

### Security Headers (Helmet)

Automatically adds:
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection`

### CORS

Restricts which domains can call the API.

```typescript
// Production: Only our domains
origin: ['https://zhuzh.app', 'https://app.zhuzh.app']

// Development: Local ports
origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
```

### Input Validation (Zod)

All API inputs are validated before processing.

**Location:** `src/api/schemas/index.ts`

```typescript
// Example: Allocation validation
const CreateAllocationSchema = z.object({
  user_id: z.string().uuid(),
  project_id: z.string().uuid(),
  hours: z.number().min(0).max(168),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // ...
});
```

### Audit Logging

All API actions are logged to `security_audit_log` for compliance and debugging.

**Location:** `src/api/middleware/auditLogger.ts`

```typescript
// Logged fields
{
  user_id, user_email, user_role,  // Who
  action, resource_type, resource_id,  // What
  org_id, ip_address, user_agent,  // Context
  old_values, new_values, metadata,  // Details
  created_at  // When
}
```

---

## Authentication

Handled by **Supabase Auth**:
- Email/password login
- Google OAuth (for calendar integration)
- JWT tokens with 1-hour expiry
- Refresh token rotation enabled

### Roles

| Role | Sees Hours | Sees Budgets | Approves | Manages |
|------|------------|--------------|----------|---------|
| `employee` | ✅ Own | ❌ | ❌ | ❌ |
| `pm` | ✅ All | ✅ | ✅ | Projects |
| `admin` | ✅ All | ✅ | ✅ | Everything |

---

## Secrets Management

### Environment Variables

```bash
# Client-safe (VITE_ prefix exposes to browser)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Server-only (NEVER expose)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Bypasses RLS!
SLACK_BOT_TOKEN=xoxb-...
GOOGLE_CLIENT_SECRET=...
GEMINI_API_KEY=...
```

### Rules

1. **Never commit `.env`** — use `.env.example` as template
2. **Never log secrets** — mask in error messages
3. **Never expose service role key** — server-side only
4. **Rotate if exposed** — regenerate immediately in respective dashboards

---

## Quick Security Checklist

When adding new features:

- [ ] New table? Add RLS policies
- [ ] New endpoint? Add rate limiting if sensitive
- [ ] User input? Validate with Zod
- [ ] Sensitive action? Log to audit
- [ ] Cross-tenant query? Verify org_id manually
- [ ] New secret? Add to `.env.example`, never commit real value

---

## Files Reference

| File | Purpose |
|------|---------|
| `sql/SECURITY_FIX_RUN_NOW.sql` | RLS setup SQL |
| `src/api/middleware/rateLimiter.ts` | Rate limiting |
| `src/api/middleware/auditLogger.ts` | Audit logging |
| `src/api/schemas/index.ts` | Zod validation schemas |
| `docs/SECURITY_ARCHITECTURE.md` | Full security deep-dive |

---

## Questions?

Check `docs/SECURITY_ARCHITECTURE.md` for the full deep-dive including:
- Compliance readiness (SOC 2, GDPR)
- Anomaly detection queries
- Data export/deletion endpoints
- Incident response guidelines
