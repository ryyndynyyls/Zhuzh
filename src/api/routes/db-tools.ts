/**
 * DB Tools Routes - Development introspection tools
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// Whitelist of allowed tables
const ALLOWED_TABLES = [
  'organizations', 'users', 'clients', 'projects', 'project_phases',
  'allocations', 'time_confirmations', 'time_entries', 'pto_entries',
  'audit_log', 'org_calendar_config'
];

/**
 * List all tables in the public schema
 * GET /api/db/tables
 */
router.get('/tables', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_table_info');

    if (error) {
      // Fallback: query information_schema directly
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables' as any)
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (tablesError) {
        // If that fails too, use raw query via REST
        return res.status(500).json({
          error: 'Could not fetch tables. Try running the SQL function setup.',
          hint: 'Add the get_table_info function to your database'
        });
      }

      return res.json({ tables: tables?.map(t => t.table_name) || [] });
    }

    res.json({ tables: data });
  } catch (err) {
    console.error('Failed to list tables:', err);
    res.status(500).json({ error: 'Failed to list tables' });
  }
});

/**
 * Get schema for a specific table
 * GET /api/db/schema/:table
 */
router.get('/schema/:table', async (req, res) => {
  const { table } = req.params;

  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({
      error: 'Table not in allowed list',
      allowedTables: ALLOWED_TABLES
    });
  }

  try {
    // Get column info using a safe query
    const { data, error } = await supabase.rpc('get_column_info', {
      p_table_name: table
    });

    if (error) {
      // Fallback: try to get a single row and infer schema
      const { data: sample, error: sampleError } = await supabase
        .from(table as any)
        .select('*')
        .limit(1);

      if (sampleError) {
        return res.status(500).json({ error: 'Could not fetch schema' });
      }

      const inferredSchema = sample && sample[0]
        ? Object.keys(sample[0]).map(col => ({
            column_name: col,
            data_type: typeof sample[0][col],
            sample_value: sample[0][col]
          }))
        : [];

      return res.json({
        table,
        columns: inferredSchema,
        note: 'Schema inferred from sample data'
      });
    }

    res.json({ table, columns: data });
  } catch (err) {
    console.error('Failed to get schema:', err);
    res.status(500).json({ error: 'Failed to get schema' });
  }
});

/**
 * Run a read-only SQL query (SELECT only)
 * POST /api/db/query
 * Body: { sql: string }
 *
 * ⚠️ Development only - validates query is SELECT
 */
router.post('/query', async (req, res) => {
  const { sql } = req.body;

  if (!sql) {
    return res.status(400).json({ error: 'sql is required' });
  }

  // Security: Only allow SELECT queries
  const normalizedSql = sql.trim().toLowerCase();
  if (!normalizedSql.startsWith('select')) {
    return res.status(403).json({
      error: 'Only SELECT queries are allowed',
      hint: 'This endpoint is read-only for safety'
    });
  }

  // Block dangerous patterns
  const dangerousPatterns = [
    /;\s*(drop|delete|update|insert|alter|create|truncate)/i,
    /--/,
    /\/\*/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sql)) {
      return res.status(403).json({
        error: 'Query contains blocked patterns',
        hint: 'No comments or multiple statements allowed'
      });
    }
  }

  try {
    // Execute via Supabase's raw SQL (requires service role)
    const { data, error } = await supabase.rpc('exec_read_query', {
      query_text: sql
    });

    if (error) {
      // If RPC doesn't exist, return helpful error
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        return res.status(500).json({
          error: 'exec_read_query function not found',
          hint: 'Run the SQL setup to create helper functions',
          setup_sql: `
CREATE OR REPLACE FUNCTION exec_read_query(query_text text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  result json;
BEGIN
  IF NOT (lower(trim(query_text)) LIKE 'select%') THEN
    RAISE EXCEPTION 'Only SELECT queries allowed';
  END IF;
  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$;
          `
        });
      }
      return res.status(500).json({ error: error.message });
    }

    res.json({ data, rowCount: Array.isArray(data) ? data.length : 0 });
  } catch (err: any) {
    console.error('Query execution error:', err);
    res.status(500).json({ error: err.message || 'Query failed' });
  }
});

/**
 * Quick summary of database contents
 * GET /api/db/summary
 */
router.get('/summary', async (req, res) => {
  try {
    const summary: Record<string, any> = {};

    // Count records in key tables
    const tablesToCount = [
      'organizations', 'users', 'clients', 'projects', 'project_phases',
      'allocations', 'time_confirmations', 'time_entries'
    ];

    for (const table of tablesToCount) {
      const { count, error } = await supabase
        .from(table as any)
        .select('*', { count: 'exact', head: true });

      summary[table] = error ? 'error' : count;
    }

    // Get some useful stats
    const { data: pendingApprovals } = await supabase
      .from('time_confirmations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'submitted');

    const { data: activeProjects } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    res.json({
      tableCounts: summary,
      stats: {
        pendingApprovals: pendingApprovals,
        activeProjects: activeProjects,
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to get summary:', err);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

/**
 * Get sample data from a table
 * GET /api/db/sample/:table?limit=5
 */
router.get('/sample/:table', async (req, res) => {
  const { table } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: 'Table not allowed', allowedTables: ALLOWED_TABLES });
  }

  try {
    const { data, error } = await supabase
      .from(table as any)
      .select('*')
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ table, data, count: data?.length || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
