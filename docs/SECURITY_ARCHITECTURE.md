# Zhuzh Security Architecture
## Making the App Ironclad Without Breaking Functionality

**Created:** 2026-01-22
**Status:** Research Complete — Ready for Implementation
**Priority:** 🔴 CRITICAL (Before pilot launch)

---

## Executive Summary

This document outlines a comprehensive security strategy for Zhuzh that builds trust with clients by protecting their sensitive business data (resource allocations, budgets, employee hours, client info) without adding friction to the user experience.

**Core Philosophy:** Security should be invisible to users but provide ironclad protection. Defense in depth at every layer.

---

## 🎯 Security Layers Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                            │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Frontend Security                                  │
│  • Input validation, XSS prevention, secure storage          │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: API Security                                       │
│  • Rate limiting, authentication, audit logging              │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Database Security (RLS)                            │
│  • Row-level security, multi-tenant isolation                │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Infrastructure Security                            │
│  • Encryption at rest, secure secrets, network isolation     │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Database Security: Row Level Security (RLS)

### Current State
✅ **RLS policies are DEFINED** in `sql/012_fix_rls_policies.sql`
⚠️ **RLS is DISABLED** on some tables (noted as tech debt)

### Why This Matters
RLS is your **last line of defense**. Even if someone bypasses your API or leaks a token, they can only access rows they're authorized to see. This is the most critical security control for multi-tenant SaaS.

> "83% of exposed Supabase databases involve RLS misconfigurations" — CVE-2025-48757 Report

### 🔴 Action Required: Re-enable RLS

```sql
-- Run this verification query first:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Then ensure RLS is enabled on ALL tables:
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries_live ENABLE ROW LEVEL SECURITY;  -- NEW: Live time tracking
ALTER TABLE pto_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
```

### Add RLS to `time_entries_live`
This table was added for live time tracking and needs policies:

```sql
-- Enable RLS
ALTER TABLE time_entries_live ENABLE ROW LEVEL SECURITY;

-- Users see their own entries
CREATE POLICY time_entries_live_select ON time_entries_live
    FOR SELECT
    USING (user_id = get_current_user_id());

-- Users insert their own entries
CREATE POLICY time_entries_live_insert ON time_entries_live
    FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- Users update their own entries
CREATE POLICY time_entries_live_update ON time_entries_live
    FOR UPDATE
    USING (user_id = get_current_user_id());

-- Users or pm/admin can delete entries
CREATE POLICY time_entries_live_delete ON time_entries_live
    FOR DELETE
    USING (
        user_id = get_current_user_id()
        OR get_current_user_role() IN ('pm', 'admin')
    );
```

### Performance Optimization for RLS
Add indexes on columns used in RLS policies:

```sql
-- These indexes can provide 100x+ improvement on large tables
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_allocations_project_id ON allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_time_confirmations_user_id ON time_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_live_user_id ON time_entries_live(user_id);
```

### Optimize RLS Helper Functions
Wrap functions in SELECT for query optimizer caching:

```sql
-- Current (works but suboptimal):
CREATE OR REPLACE FUNCTION get_current_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE email = auth.email() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Optimized (enables initPlan caching):
CREATE OR REPLACE FUNCTION get_current_user_org_id()
RETURNS UUID AS $$
  SELECT (SELECT org_id FROM users WHERE email = auth.email() LIMIT 1);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

---

## 2. API Security

### 2.1 Rate Limiting
Protect against brute force, DoS attacks, and API abuse.

**Install:**
```bash
npm install express-rate-limit
```

**Implementation:**
```typescript
// src/api/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

// Global rate limit: 100 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for auth endpoints: 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Voice API limit: 30 requests per minute (Gemini can be slow)
export const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Voice command rate limit reached. Please wait a moment.' },
});
```

**Apply in server.ts:**
```typescript
import { globalLimiter, authLimiter, voiceLimiter } from './middleware/rateLimiter';

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/voice', voiceLimiter);
```

### 2.2 Input Validation with Zod
Never trust user input. Validate everything.

**Install:**
```bash
npm install zod
```

**Example schemas:**
```typescript
// src/api/schemas/allocation.ts
import { z } from 'zod';

export const CreateAllocationSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  project_id: z.string().uuid('Invalid project ID'),
  phase_id: z.string().uuid('Invalid phase ID').optional(),
  hours: z.number()
    .min(0, 'Hours cannot be negative')
    .max(168, 'Cannot exceed 168 hours per week'),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  is_billable: z.boolean().default(true),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const UpdateAllocationSchema = CreateAllocationSchema.partial();
```

**Use in routes:**
```typescript
router.post('/allocations', async (req, res) => {
  const result = CreateAllocationSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: result.error.issues 
    });
  }
  
  // Safe to use result.data
  const allocation = await createAllocation(result.data);
  res.json(allocation);
});
```

### 2.3 Security Headers with Helmet

**Install:**
```bash
npm install helmet
```

**Apply:**
```typescript
import helmet from 'helmet';

app.use(helmet());
```

This automatically adds:
- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- And more...

### 2.4 CORS Configuration
Restrict which domains can access your API:

```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://zhuzh.app', 'https://app.zhuzh.app']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
```

---

## 3. Audit Logging

### Why Audit Logs?
- **Compliance**: GDPR requires knowing who accessed what data
- **Security**: Detect suspicious activity
- **Debugging**: Track down issues in production
- **Trust**: Show clients you take security seriously

### 3.1 Enhanced Audit Table

```sql
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  user_id UUID REFERENCES users(id),
  user_email TEXT,
  user_role TEXT,
  
  -- What
  action TEXT NOT NULL,  -- 'create', 'read', 'update', 'delete', 'login', 'export'
  resource_type TEXT NOT NULL,  -- 'allocation', 'project', 'user', etc.
  resource_id UUID,
  
  -- Context
  org_id UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  
  -- Details
  old_values JSONB,  -- For updates/deletes
  new_values JSONB,  -- For creates/updates
  metadata JSONB,    -- Additional context
  
  -- When
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Org-scoped read access
CREATE POLICY audit_select ON security_audit_log
    FOR SELECT
    USING (org_id = get_current_user_org_id());

-- Anyone in org can insert (for tracking their own actions)
CREATE POLICY audit_insert ON security_audit_log
    FOR INSERT
    WITH CHECK (org_id = get_current_user_org_id());

-- Index for common queries
CREATE INDEX idx_audit_org_created ON security_audit_log(org_id, created_at DESC);
CREATE INDEX idx_audit_user_created ON security_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON security_audit_log(resource_type, resource_id);
```

### 3.2 Audit Logging Middleware

```typescript
// src/api/middleware/auditLogger.ts
import { Request } from 'express';
import { supabaseAdmin } from '../lib/supabase';

interface AuditEntry {
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'export';
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function logAudit(req: Request, entry: AuditEntry) {
  try {
    await supabaseAdmin.from('security_audit_log').insert({
      user_id: req.user?.id,
      user_email: req.user?.email,
      user_role: req.user?.role,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      org_id: req.user?.org_id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      old_values: entry.oldValues,
      new_values: entry.newValues,
      metadata: entry.metadata,
    });
  } catch (error) {
    // Don't let audit failures break the app, but log them
    console.error('Audit logging failed:', error);
  }
}
```

### 3.3 What to Audit
**High Priority (audit immediately):**
- All login attempts (success and failure)
- User creation/deletion
- Role changes
- Data exports
- Approval actions
- Allocation changes

**Medium Priority (audit after pilot):**
- Project creation/archiving
- Budget changes
- Voice command usage
- Report generation

---

## 4. Multi-Tenant Isolation

### Architecture
Zhuzh uses **shared database with org_id discrimination** — the most cost-effective approach for SaaS, but requires careful implementation.

### Critical Rules

1. **Every tenant table MUST have `org_id`**
2. **Every query MUST be filtered by RLS**
3. **Service role operations MUST manually verify org access**
4. **Never expose service role key to clients**

### Cross-Tenant Prevention in Service Operations

```typescript
// ALWAYS verify org context when using service role
async function getProjectWithServiceRole(
  projectId: string, 
  requestingOrgId: string
) {
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  
  // CRITICAL: Verify the project belongs to the requesting org
  if (!project || project.org_id !== requestingOrgId) {
    throw new Error('Access denied: project not found or unauthorized');
  }
  
  return project;
}
```

### Test Cross-Tenant Isolation
Add tests that verify isolation:

```typescript
// tests/security/tenant-isolation.test.ts
describe('Tenant Isolation', () => {
  it('should not allow access to other org projects', async () => {
    const org1Project = await createProject({ org_id: 'org-1' });
    
    // Try to access from org-2 context
    const result = await supabase
      .from('projects')
      .select('*')
      .eq('id', org1Project.id)
      .single();
    
    expect(result.data).toBeNull(); // Should not return data
  });
});
```

---

## 5. Authentication & Session Security

### Supabase Auth Configuration
- ✅ Email/password authentication
- ✅ OAuth (Google for calendar integration)
- ✅ JWT-based sessions

### Recommended Settings (Supabase Dashboard)

```
JWT Expiry: 3600 (1 hour)
Refresh Token Rotation: Enabled
Refresh Token Reuse Interval: 10 seconds
Password Min Length: 8
Password Requires: uppercase, lowercase, number
```

### Session Security Best Practices

```typescript
// On the client, handle token refresh properly
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    // Update stored session
  }
  if (event === 'SIGNED_OUT') {
    // Clear any cached data
    clearLocalCache();
  }
});
```

---

## 6. Secrets Management

### Environment Variables Structure

```bash
# .env.example (NEVER commit actual .env)

# Supabase - Public (safe for client)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Supabase - Private (server only, NEVER expose)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...

# Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Gemini
GEMINI_API_KEY=...
```

### Key Rotation Schedule
| Secret | Rotation Frequency | How |
|--------|-------------------|-----|
| Slack tokens | Quarterly | Regenerate in Slack dashboard |
| Google OAuth | Annually | Rotate in Cloud Console |
| Gemini API key | If exposed | Regenerate immediately |
| Supabase service key | If exposed | Regenerate in dashboard |

---

## 7. Compliance Readiness

### SOC 2 Trust Services Criteria Alignment

| Criteria | Status | Notes |
|----------|--------|-------|
| **Security** (required) | 🟡 In Progress | RLS, auth, audit logging |
| Availability | 🟢 Good | Supabase/Vercel handle this |
| Processing Integrity | 🟡 Partial | Need input validation |
| Confidentiality | 🟡 Partial | Need encryption at rest |
| Privacy | 🟡 Partial | Need data export/deletion |

### GDPR/CCPA Readiness

**Data Subject Rights to Implement:**

```typescript
// Data export endpoint
router.get('/user/data-export', async (req, res) => {
  const userId = req.user.id;
  
  // Gather all user data
  const userData = {
    profile: await getUserProfile(userId),
    allocations: await getUserAllocations(userId),
    timeEntries: await getUserTimeEntries(userId),
    confirmations: await getUserConfirmations(userId),
  };
  
  // Log the export
  await logAudit(req, {
    action: 'export',
    resourceType: 'user_data',
    resourceId: userId,
  });
  
  res.setHeader('Content-Disposition', `attachment; filename="zhuzh-data-${userId}.json"`);
  res.json(userData);
});

// Data deletion endpoint
router.delete('/user/data', async (req, res) => {
  const userId = req.user.id;
  
  // Soft delete - mark for deletion
  await supabase.from('users').update({
    deletion_requested_at: new Date().toISOString(),
    status: 'pending_deletion',
  }).eq('id', userId);
  
  await logAudit(req, {
    action: 'delete',
    resourceType: 'user',
    resourceId: userId,
    metadata: { type: 'deletion_request' },
  });
  
  res.json({ message: 'Deletion scheduled. Data will be removed within 30 days.' });
});
```

---

## 8. Security Monitoring & Alerting

### Anomaly Detection Queries

```sql
-- Failed login attempts (potential brute force)
SELECT user_email, COUNT(*) as failures
FROM security_audit_log
WHERE action = 'login' 
AND metadata->>'success' = 'false'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_email
HAVING COUNT(*) > 5;

-- Unusual data access patterns (potential exfiltration)
SELECT user_email, resource_type, COUNT(*) as access_count
FROM security_audit_log
WHERE action IN ('read', 'export')
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_email, resource_type
HAVING COUNT(*) > 100;

-- Admin actions (should be rare)
SELECT *
FROM security_audit_log
WHERE user_role = 'admin'
AND action IN ('delete', 'update')
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Alert Thresholds
Set up monitoring for:
- > 5 failed logins from same IP in 15 minutes
- > 100 API calls from same user in 1 minute
- Any data export requests
- Role changes
- Bulk deletions

---

## 9. Implementation Checklist

### 🔴 Critical (Before Pilot)
- [ ] Re-enable RLS on ALL tables
- [ ] Add RLS policies to `time_entries_live`
- [ ] Add performance indexes for RLS queries
- [ ] Implement rate limiting on API
- [ ] Add input validation with Zod
- [ ] Create `security_audit_log` table
- [ ] Add audit logging to critical operations
- [ ] Configure CORS for production
- [ ] Add Helmet security headers

### 🟡 High Priority (During Pilot)
- [ ] Implement data export endpoint
- [ ] Add failed login tracking
- [ ] Set up basic monitoring queries
- [ ] Document incident response process
- [ ] Create privacy policy page

### 🟢 Post-Pilot (Before Multi-Tenant)
- [ ] Implement data deletion endpoint
- [ ] Add comprehensive audit logging
- [ ] Set up automated alerting
- [ ] Conduct security review
- [ ] Consider SOC 2 Type 1 assessment

---

## 10. Quick Reference: Security Packages

```bash
# Essential security packages
npm install helmet cors express-rate-limit zod

# For later (monitoring)
npm install @sentry/node winston
```

---

## Summary

**The foundation is solid.** You have:
- ✅ Supabase Auth for authentication
- ✅ RLS policies defined (need to enable them)
- ✅ Multi-tenant architecture with org_id
- ✅ Role-based access control

**Critical gaps to fix:**
1. **RLS disabled** — Enable immediately
2. **No rate limiting** — Add before pilot
3. **No audit logging** — Add for compliance
4. **No input validation** — Add for security

**The message for clients:**
> "Zhuzh uses defense-in-depth security: database-level access controls isolate your data from other organizations, all actions are audit-logged, and we follow industry best practices for SaaS security. Your resource data, budgets, and team information are protected at every layer."

---

*Security isn't a feature — it's a foundation. Build it right, and you'll never regret it.*
