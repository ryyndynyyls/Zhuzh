# Cowork Phase 5: Integration & App Wiring

## CRITICAL: Write Files Directly

**DO NOT just generate content and ask what to do. WRITE ALL FILES DIRECTLY TO DISK.**

---

## Working Directory
`/Users/ryyndynyyls/Claude-Projects-MCP/ResourceFlow/`

## Context Files (Read First)
1. `src/components/` — All React components from Phase 3
2. `src/api/` — API routes from Phase 2
3. `src/types/database.ts` — TypeScript interfaces
4. `COWORK_STATUS.md` — Update this as you work!

---

## Task 5A: Data Fetching Hooks

**WRITE TO:** `src/hooks/`

Create React hooks that connect components to API routes.

### `useProjects.ts`
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    // Fetch from Supabase
  }

  return { projects, loading, error, refetch: fetchProjects };
}
```

### `useAllocations.ts`
- `useAllocations(weekStart, userId?)`
- Fetch allocations for a specific week
- Optional user filter

### `useConfirmations.ts`
- `useConfirmation(userId, weekStart)` — single confirmation
- `usePendingApprovals()` — for approval queue

### `useBudgetDashboard.ts`
- Fetch all projects with budget stats
- Use the `project_budget_summary` view

### `useTeamUtilization.ts`
- `useTeamUtilization(weekStart)`
- Use the `user_weekly_utilization` view

### `useCurrentUser.ts`
- Get current user from Supabase auth
- Include role for permission checks

---

## Task 5B: App Entry Point & Routing

**WRITE TO:** `src/App.tsx`

Main app with routing:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import { AppShell } from './components/AppShell';
import { BudgetDashboard } from './components/BudgetDashboard';
import { ApprovalQueue } from './components/ApprovalQueue';
import { ConfirmModal } from './components/ConfirmModal';
import { CompanyDashboard } from './components/CompanyDashboard';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<CompanyDashboard />} />
            <Route path="/budget" element={<BudgetDashboard />} />
            <Route path="/approvals" element={<ApprovalQueue />} />
            <Route path="/timesheet" element={<ConfirmModal />} />
            <Route path="/timesheet/:weekStart" element={<ConfirmModal />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

**Also write:** `src/main.tsx`
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Also write:** `src/index.html`
Basic HTML template for the app.

---

## Task 5C: Auth Context & Protected Routes

**WRITE TO:** `src/contexts/AuthContext.tsx`

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types/database';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }) {
  // Supabase auth state
  // Listen for auth changes
}

export function useAuth() {
  return useContext(AuthContext);
}
```

**Also write:** `src/components/ProtectedRoute.tsx`
```typescript
// Redirect to login if not authenticated
// Check role for admin-only routes
```

---

## Task 5D: Wire Components to Data

Update components to use hooks. Create wrapper versions if needed.

**WRITE TO:** `src/pages/`

### `src/pages/DashboardPage.tsx`
```typescript
import { CompanyDashboard } from '../components/CompanyDashboard';
import { useBudgetDashboard } from '../hooks/useBudgetDashboard';
import { useCurrentUser } from '../hooks/useCurrentUser';

export function DashboardPage() {
  const { user } = useCurrentUser();
  const { projects, loading } = useBudgetDashboard();

  if (loading) return <Loading />;

  return <CompanyDashboard projects={projects} userRole={user.role} />;
}
```

### `src/pages/BudgetPage.tsx`
Wire BudgetDashboard to real data.

### `src/pages/ApprovalsPage.tsx`
Wire ApprovalQueue to pending confirmations.

### `src/pages/TimesheetPage.tsx`
Wire ConfirmModal to user's allocations and confirmation.

---

## Task 5E: API Integration Layer

**WRITE TO:** `src/lib/api.ts`

Centralized API functions:

```typescript
import { supabase } from './supabase';

// Projects
export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*, client:clients(name), phases:project_phases(*)');
  if (error) throw error;
  return data;
}

export async function getProjectBudgetSummary() {
  const { data, error } = await supabase
    .from('project_budget_summary')
    .select('*');
  if (error) throw error;
  return data;
}

// Allocations
export async function getAllocations(weekStart: string, userId?: string) {
  let query = supabase
    .from('allocations')
    .select('*, project:projects(name, color), phase:project_phases(name)')
    .eq('week_start', weekStart);
  
  if (userId) query = query.eq('user_id', userId);
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Confirmations
export async function getConfirmation(userId: string, weekStart: string) {
  const { data, error } = await supabase
    .from('time_confirmations')
    .select('*, entries:time_entries(*)')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

export async function submitConfirmation(confirmation: any, entries: any[]) {
  // Create confirmation
  // Create entries
  // Return result
}

export async function getPendingApprovals() {
  const { data, error } = await supabase
    .from('time_confirmations')
    .select('*, user:users(name, email), entries:time_entries(*, project:projects(name))')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function approveConfirmation(id: string, approverId: string) {
  const { error } = await supabase
    .from('time_confirmations')
    .update({ 
      status: 'approved', 
      approved_by: approverId, 
      approved_at: new Date().toISOString() 
    })
    .eq('id', id);
  if (error) throw error;
}

export async function rejectConfirmation(id: string, reason: string) {
  const { error } = await supabase
    .from('time_confirmations')
    .update({ 
      status: 'rejected', 
      rejection_reason: reason 
    })
    .eq('id', id);
  if (error) throw error;
}
```

---

## Task 5F: Build Configuration

**WRITE TO:** Project root files

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
```

### `tsconfig.json` (update if needed)
Ensure paths and settings are correct.

### `.env.example`
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_APP_TOKEN=
```

### `package.json` scripts (update)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "slack": "ts-node src/slack/app.ts"
  }
}
```

---

## Status Updates

Update `COWORK_STATUS.md` as you work.

---

## Completion Checklist

```bash
ls -la src/hooks/*.ts
ls -la src/pages/*.tsx
ls -la src/contexts/*.tsx
ls -la src/lib/api.ts
ls -la src/App.tsx
ls -la src/main.tsx
ls -la vite.config.ts
```

**Expected files:**
- [ ] `src/hooks/useProjects.ts`
- [ ] `src/hooks/useAllocations.ts`
- [ ] `src/hooks/useConfirmations.ts`
- [ ] `src/hooks/useBudgetDashboard.ts`
- [ ] `src/hooks/useTeamUtilization.ts`
- [ ] `src/hooks/useCurrentUser.ts`
- [ ] `src/contexts/AuthContext.tsx`
- [ ] `src/components/ProtectedRoute.tsx`
- [ ] `src/pages/DashboardPage.tsx`
- [ ] `src/pages/BudgetPage.tsx`
- [ ] `src/pages/ApprovalsPage.tsx`
- [ ] `src/pages/TimesheetPage.tsx`
- [ ] `src/lib/api.ts`
- [ ] `src/App.tsx`
- [ ] `src/main.tsx`
- [ ] `index.html`
- [ ] `vite.config.ts`
- [ ] `.env.example`

Update `COWORK_STATUS.md` and `COWORK_TASKS.md` when done.

---

## DO NOT:
- ❌ Ask "would you like me to write this?"
- ❌ Generate content without saving it
- ❌ Mark tasks complete without verifying files exist

## DO:
- ✅ Write files directly to disk
- ✅ Verify files exist after writing
- ✅ Update status files as you go
- ✅ Complete all tasks autonomously
