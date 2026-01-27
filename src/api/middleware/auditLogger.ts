import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
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
        const resourceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        logAudit(req, {
          action,
          resourceType,
          resourceId,
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
