# Cowork Task: Deluxe Polish (Error States, Skeletons, Celebrations)

**Created:** 2026-01-22
**Estimated time:** 2-2.5 hours total (parallelizable to ~45 min)
**Why Cowork:** Three independent workstreams, pattern-based, can run simultaneously

---

## Context

We're implementing the "deluxe" motion tier. The animation utilities exist in `src/styles/animations.ts`, but three things are missing:

1. **Error states** — What users see when things fail
2. **Skeleton loading** — Placeholder UI while data loads
3. **Success celebrations** — Delightful feedback on key actions (approvals, etc.)

**Key files:**
- `src/styles/tokens.ts` — Design tokens
- `src/styles/animations.ts` — Animation utilities (shimmer, pulse exist)
- `src/theme.ts` — MUI overrides

---

## Subtasks (Run All 3 in Parallel)

### Subtask 1: Error States
**Time:** 45 min

Create a reusable error component and apply to key pages.

**File:** `src/components/ErrorState.tsx`

```tsx
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline, RefreshOutlined, WifiOffOutlined } from '@mui/icons-material';
import { colors, spacing, typography } from '../styles/tokens';
import { pageFadeIn } from '../styles/animations';

interface ErrorStateProps {
  type?: 'generic' | 'network' | 'notFound' | 'permission';
  title?: string;
  message?: string;
  onRetry?: () => void;
}

const errorContent = {
  generic: {
    icon: ErrorOutline,
    title: 'Something went wrong',
    message: 'We hit an unexpected error. Try again or contact support if it persists.',
  },
  network: {
    icon: WifiOffOutlined,
    title: 'Connection issue',
    message: 'Check your internet connection and try again.',
  },
  notFound: {
    icon: ErrorOutline,
    title: 'Not found',
    message: "We couldn't find what you're looking for. It may have been moved or deleted.",
  },
  permission: {
    icon: ErrorOutline,
    title: 'Access denied',
    message: "You don't have permission to view this. Contact your admin if this seems wrong.",
  },
};

export function ErrorState({ type = 'generic', title, message, onRetry }: ErrorStateProps) {
  const content = errorContent[type];
  const Icon = content.icon;
  
  return (
    <Box
      sx={{
        ...pageFadeIn,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: spacing[12],
        px: spacing[4],
        maxWidth: 400,
        mx: 'auto',
      }}
    >
      <Box sx={{ 
        mb: spacing[4], 
        color: colors.dark.error.text,
        fontSize: 48,
      }}>
        <Icon fontSize="inherit" />
      </Box>
      
      <Typography variant="h6" sx={{ color: colors.dark.text.primary, mb: spacing[2] }}>
        {title || content.title}
      </Typography>
      
      <Typography variant="body2" sx={{ color: colors.dark.text.secondary, mb: spacing[5] }}>
        {message || content.message}
      </Typography>
      
      {onRetry && (
        <Button 
          variant="outlined" 
          startIcon={<RefreshOutlined />}
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </Box>
  );
}
```

**Apply to these pages** (wrap data fetching in try/catch, show ErrorState on failure):
- `DashboardPage.tsx`
- `BudgetPage.tsx`
- `ApprovalsPage.tsx`
- `TeamPage.tsx`

**Pattern:**
```tsx
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  try {
    setError(null);
    // ... fetch
  } catch (err) {
    setError('generic');
  }
};

if (error) {
  return <ErrorState type={error} onRetry={fetchData} />;
}
```

---

### Subtask 2: Skeleton Loading Components
**Time:** 45 min

Create skeleton components that match the actual UI shapes.

**File:** `src/components/Skeleton.tsx`

```tsx
import { Box, Skeleton as MuiSkeleton } from '@mui/material';
import { colors, spacing, radii } from '../styles/tokens';

// Card skeleton (for dashboard metrics, budget cards, etc.)
export function CardSkeleton({ height = 120 }: { height?: number }) {
  return (
    <Box
      sx={{
        bgcolor: colors.dark.bg.secondary,
        borderRadius: radii.lg,
        border: `1px solid ${colors.dark.border.subtle}`,
        p: spacing[5],
        height,
      }}
    >
      <MuiSkeleton variant="text" width="40%" height={16} sx={{ mb: 2 }} />
      <MuiSkeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
      <MuiSkeleton variant="text" width="30%" height={14} />
    </Box>
  );
}

// List item skeleton (for approval queue, team list, etc.)
export function ListItemSkeleton() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[3],
        p: spacing[3],
        bgcolor: colors.dark.bg.secondary,
        borderRadius: radii.md,
        mb: spacing[2],
      }}
    >
      <MuiSkeleton variant="circular" width={40} height={40} />
      <Box sx={{ flex: 1 }}>
        <MuiSkeleton variant="text" width="50%" height={18} />
        <MuiSkeleton variant="text" width="30%" height={14} />
      </Box>
      <MuiSkeleton variant="rounded" width={80} height={28} />
    </Box>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            gap: spacing[4],
            py: spacing[3],
            borderBottom: `1px solid ${colors.dark.border.subtle}`,
          }}
        >
          <MuiSkeleton variant="text" width="25%" />
          <MuiSkeleton variant="text" width="20%" />
          <MuiSkeleton variant="text" width="15%" />
          <MuiSkeleton variant="text" width="20%" />
          <MuiSkeleton variant="text" width="10%" />
        </Box>
      ))}
    </Box>
  );
}

// Dashboard skeleton (full page)
export function DashboardSkeleton() {
  return (
    <Box sx={{ p: spacing[6] }}>
      <MuiSkeleton variant="text" width={200} height={32} sx={{ mb: 4 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing[4], mb: 6 }}>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </Box>
      <TableSkeleton rows={5} />
    </Box>
  );
}
```

**Apply to pages** — Show skeleton while `loading` is true:
- `DashboardPage.tsx` → `<DashboardSkeleton />`
- `BudgetPage.tsx` → Grid of `<CardSkeleton />`
- `ApprovalsPage.tsx` → Multiple `<ListItemSkeleton />`
- `TeamPage.tsx` → Multiple `<ListItemSkeleton />`

**Pattern:**
```tsx
if (loading) {
  return <DashboardSkeleton />;
}
```

---

### Subtask 3: Success Celebrations
**Time:** 45 min

Add delightful feedback on key actions.

**1. Install canvas-confetti** (lightweight, 3kb):
```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

**2. Create celebration utility:**

**File:** `src/utils/celebrations.ts`

```tsx
import confetti from 'canvas-confetti';
import { brand } from '../styles/tokens';

// Confetti burst for big wins (approval completed, etc.)
export function celebrateSuccess() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: [brand.orange, brand.lime, brand.yellow, brand.cream],
  });
}

// Subtle sparkle for smaller wins
export function celebrateSmall() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
    colors: [brand.orange, brand.lime],
    scalar: 0.8,
  });
}

// Side cannons for extra celebration
export function celebrateBig() {
  const end = Date.now() + 500;
  const colors = [brand.orange, brand.lime, brand.yellow];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}
```

**3. Apply celebrations to these actions:**

| Action | Location | Celebration |
|--------|----------|-------------|
| Approve timesheet | `ApprovalsPage.tsx` or `ApprovalQueue.tsx` | `celebrateSuccess()` |
| Submit timesheet | `TimesheetPage.tsx` | `celebrateSmall()` |
| Complete all approvals (inbox zero) | `ApprovalsPage.tsx` | `celebrateBig()` |
| Archive project | `ProjectSettingsPage.tsx` | `celebrateSmall()` |

**Pattern:**
```tsx
import { celebrateSuccess } from '../utils/celebrations';

const handleApprove = async () => {
  await approveTimesheet(id);
  celebrateSuccess(); // 🎉
  // ... rest of logic
};
```

**4. Add success toast styling:**

Ensure success toasts/snackbars use the success colors from tokens:
```tsx
sx={{
  bgcolor: colors.dark.success.bg,
  border: `1px solid ${colors.dark.success.border}`,
  color: colors.dark.success.text,
}}
```

---

## Verification

```bash
cd ~/Claude-Projects-MCP/ResourceFlow && npm run dev
```

**Error states:**
1. Temporarily break an API call (wrong URL)
2. Verify error state renders with retry button
3. Click retry, verify it attempts to reload

**Skeletons:**
1. Add artificial delay to data fetch (`await new Promise(r => setTimeout(r, 2000))`)
2. Verify skeleton shows during load
3. Remove delay

**Celebrations:**
1. Go to Approvals page
2. Approve a timesheet
3. Verify confetti fires
4. If all approved, verify big celebration

---

## Success Criteria

- [ ] `ErrorState` component created
- [ ] Error states applied to 4+ pages
- [ ] Retry button works
- [ ] `Skeleton` components created (Card, ListItem, Table, Dashboard)
- [ ] Skeletons applied to 4+ pages
- [ ] `canvas-confetti` installed
- [ ] `celebrations.ts` utility created
- [ ] Confetti fires on approval
- [ ] Small celebration on timesheet submit
- [ ] Big celebration on inbox zero
- [ ] No TypeScript errors

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md`
2. Note which pages got error/skeleton treatment
3. List celebration trigger points
