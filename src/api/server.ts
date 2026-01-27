/**
 * API Server for Zhuzh
 * Modular Express server with route files
 */

// Load environment FIRST, before any other imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { globalLimiter, authLimiter, voiceLimiter } from './middleware/rateLimiter';

// Route imports
import {
  authRouter,
  calendarRouter,
  approvalsRouter,
  projectsRouter,
  phasesRouter,
  clientsRouter,
  budgetRouter,
  auditRouter,
  dbToolsRouter,
  voiceRouter,
  teamRouter,
  timerRouter,
} from './routes';
import reportsRouter from './reports';
import calendarSyncRouter from './calendar';
import subProjectsRouter from './sub-projects';

const app = express();

// ============================================================
// HEALTH CHECK - First, before any middleware
// ============================================================
app.get('/health', (req, res) => {
  console.log('Health check hit!');
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), service: 'zhuzh-api' });
});

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://zhuzh.app',
      'https://app.zhuzh.app',
      process.env.APP_URL, // Railway web app URL
    ].filter(Boolean) as string[]
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed list or Railway pattern
    if (
      allowedOrigins.includes(origin) ||
      origin.includes('.railway.app') ||
      origin.includes('.up.railway.app')
    ) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/voice', voiceLimiter);

app.use(express.json({ limit: '10mb' })); // For screenshot uploads

// ============================================================
// MOUNT ROUTES
// ============================================================

// Auth (OAuth)
app.use('/api/auth', authRouter);

// Calendar (events, config, team PTO)
app.use('/api/calendar', calendarRouter);

// Calendar sync (extends calendar endpoints)
app.use('/api/calendar', calendarSyncRouter);

// Approvals
app.use('/api/approvals', approvalsRouter);

// Projects
app.use('/api/projects', projectsRouter);

// Phases (separate from project-scoped routes)
app.use('/api/phases', phasesRouter);

// Clients
app.use('/api/clients', clientsRouter);

// Budget dashboard
app.use('/api/budget', budgetRouter);

// Audit trail
app.use('/api/audit', auditRouter);

// DB tools (dev introspection)
app.use('/api/db', dbToolsRouter);

// Reports
app.use('/api/reports', reportsRouter);

// Sub-projects
app.use('/api', subProjectsRouter);

// Voice commands (Resource Wizard)
app.use('/api/voice', voiceRouter);

// Team & Bullpen
app.use('/api/team', teamRouter);

// Live Time Tracking
app.use('/api/timer', timerRouter);

// ============================================================
// ADMIN HELPERS (temp)
// ============================================================

import { supabase } from './lib/supabase';

// TEMP: Fix Ryan's org_id
app.post('/api/admin/fix-ryan-org', async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
      .eq('id', '9a553e2f-e8e5-4c35-86e9-2066d5d81123');

    if (error) throw error;
    res.json({ success: true, message: 'Ryan org_id updated to UA5 org' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================

const healthResponse = () => ({
  status: 'healthy',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  service: 'zhuzh-api',
});

// Root health check (for Railway/load balancers)
app.get('/health', (req, res) => res.json(healthResponse()));

// API-prefixed health check
app.get('/api/health', (req, res) => res.json(healthResponse()));

// ============================================================
// START SERVER
// ============================================================

const PORT = Number(process.env.PORT) || Number(process.env.API_PORT) || 3002;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🗓️  Zhuzh API server running on http://0.0.0.0:${PORT}`);
  console.log(`   Health check: http://0.0.0.0:${PORT}/health`);
});

export default app;
