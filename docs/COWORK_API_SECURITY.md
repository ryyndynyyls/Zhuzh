# Cowork Task: API Security Middleware

**Created:** 2026-01-22
**Estimated time:** 45 min
**Why Cowork:** Multiple files to create/modify, can parallelize middleware setup

---

## Context

We need to add security middleware to the Express API server before the internal pilot. The database security (RLS) is being handled separately. This task focuses on the API layer.

**Key files:**
- `src/api/server.ts` — Main Express app (~90 lines after refactor)
- `src/api/routes/*.ts` — Route files that need validation

**Packages to install first:**
```bash
npm install helmet cors express-rate-limit zod
```

---

## Subtasks

### Subtask 1: Create Rate Limiting Middleware
**File:** `src/api/middleware/rateLimiter.ts`

```typescript
import rateLimit from 'express-rate-limit';

// Global: 100 requests per 15 minutes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth: 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

// Voice: 30 per minute (Gemini calls are slow)
export const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Voice rate limit reached. Please wait.' },
});
```

### Subtask 2: Create Audit Logger Middleware
**File:** `src/api/middleware/auditLogger.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const userId = (req as any).user?.id;
    const orgId = (req as any).user?.org_id || req.query.orgId;
    
    if (!orgId) return; // Can't log without org context
    
    await supabaseAdmin.from('security_audit_log').insert({
      user_id: userId,
      user_email: (req as any).user?.email,
      user_role: (req as any).user?.role,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      org_id: orgId,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      old_values: entry.oldValues,
      new_values: entry.newValues,
      metadata: entry.metadata,
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}

// Middleware for automatic route logging
export function auditMiddleware(resourceType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = (body: any) => {
      // Log after response is ready
      const action = methodToAction(req.method);
      if (action) {
        logAudit(req, {
          action,
          resourceType,
          resourceId: req.params.id,
          newValues: req.method !== 'GET' ? req.body : undefined,
        });
      }
      return originalJson(body);
    };
    
    next();
  };
}

function methodToAction(method: string): AuditEntry['action'] | null {
  switch (method) {
    case 'GET': return 'read';
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return null;
  }
}
```

### Subtask 3: Create Zod Validation Schemas
**File:** `src/api/schemas/index.ts`

```typescript
import { z } from 'zod';

// Common validators
const uuid = z.string().uuid();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Allocation schemas
export const CreateAllocationSchema = z.object({
  user_id: uuid,
  project_id: uuid,
  phase_id: uuid.optional().nullable(),
  hours: z.number().min(0).max(168),
  week_start: dateString,
  is_billable: z.boolean().default(true),
  notes: z.string().max(500).optional().nullable(),
});

export const UpdateAllocationSchema = CreateAllocationSchema.partial();

// Project schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  client_id: uuid.optional().nullable(),
  status: z.enum(['active', 'archived', 'on_hold']).default('active'),
  budget_hours: z.number().min(0).optional().nullable(),
  start_date: dateString.optional().nullable(),
  end_date: dateString.optional().nullable(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

// Time entry schemas
export const CreateTimeEntrySchema = z.object({
  project_id: uuid,
  phase_id: uuid.optional().nullable(),
  hours: z.number().min(0).max(24),
  date: dateString,
  notes: z.string().max(1000).optional().nullable(),
  is_billable: z.boolean().default(true),
});

// Voice command schema
export const VoiceCommandSchema = z.object({
  text: z.string().min(1).max(1000),
  context: z.record(z.unknown()).optional(),
});

// Validation helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
```

### Subtask 4: Update server.ts with Security Middleware
**File:** `src/api/server.ts`

Add these imports and middleware (near top, after existing imports):

```typescript
import helmet from 'helmet';
import cors from 'cors';
import { globalLimiter, authLimiter, voiceLimiter } from './middleware/rateLimiter';

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://zhuzh.app', 'https://app.zhuzh.app']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/voice', voiceLimiter);
```

### Subtask 5: Add Validation to Voice Route
**File:** `src/api/routes/voice.ts`

Add validation to the main process endpoint:

```typescript
import { VoiceCommandSchema, validate } from '../schemas';

// In the POST /process handler, add at the start:
const validation = validate(VoiceCommandSchema, req.body);
if (!validation.success) {
  return res.status(400).json({ 
    error: 'Invalid request',
    details: validation.errors.issues 
  });
}
const { text, context } = validation.data;
```

### Subtask 6: Create middleware index file
**File:** `src/api/middleware/index.ts`

```typescript
export { globalLimiter, authLimiter, voiceLimiter } from './rateLimiter';
export { logAudit, auditMiddleware } from './auditLogger';
```

---

## Verification

After completion, test:

```bash
# 1. Server starts without errors
npm run api:dev

# 2. Rate limiting works (run 6+ times quickly)
for i in {1..10}; do curl -s http://localhost:3002/api/health; done

# 3. CORS headers present
curl -I http://localhost:3002/api/health

# 4. Helmet headers present (check for X-Content-Type-Options, etc)
curl -I http://localhost:3002/api/health
```

---

## Success Criteria

- [ ] `npm install helmet cors express-rate-limit zod` completed
- [ ] `src/api/middleware/rateLimiter.ts` created
- [ ] `src/api/middleware/auditLogger.ts` created
- [ ] `src/api/middleware/index.ts` created
- [ ] `src/api/schemas/index.ts` created
- [ ] `src/api/server.ts` updated with helmet, cors, rate limiting
- [ ] `src/api/routes/voice.ts` has input validation
- [ ] Server starts without errors
- [ ] No TypeScript errors

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md`:
   - Add "API Security Middleware — COMPLETE" to completed section
   - Remove security items from tech debt

2. Note in `docs/live-sync-doc.md`:
   - "API rate limiting: 100 req/15min global, 5/15min auth, 30/min voice"
