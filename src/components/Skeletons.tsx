/**
 * Skeleton Components
 * Loading placeholders that match actual UI shapes
 *
 * Components:
 * - CardSkeleton: Dashboard metrics, budget cards
 * - ListItemSkeleton: Approval queue, team list
 * - TableSkeleton: Data tables
 * - DashboardSkeleton: Full dashboard page
 * - PageSkeleton: Generic page layout
 */

import React from 'react';
import { Box, Skeleton as MuiSkeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { colors, spacing, radii } from '../styles/tokens';

// Card skeleton (for dashboard metrics, budget cards, etc.)
export function CardSkeleton({ height = 120 }: { height?: number }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        bgcolor: isDark ? colors.dark.bg.secondary : colors.light.bg.secondary,
        borderRadius: radii.lg,
        border: `1px solid ${isDark ? colors.dark.border.subtle : colors.light.border.subtle}`,
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[3],
        p: spacing[3],
        bgcolor: isDark ? colors.dark.bg.secondary : colors.light.bg.secondary,
        borderRadius: radii.md,
        mb: spacing[2],
        border: `1px solid ${isDark ? colors.dark.border.subtle : colors.light.border.subtle}`,
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box>
      {Array.from({ length: rows }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            gap: spacing[4],
            py: spacing[3],
            borderBottom: `1px solid ${isDark ? colors.dark.border.subtle : colors.light.border.subtle}`,
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

// Budget page skeleton
export function BudgetSkeleton() {
  return (
    <Box sx={{ p: spacing[6] }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <MuiSkeleton variant="text" width={200} height={32} />
        <MuiSkeleton variant="rounded" width={120} height={36} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: spacing[4] }}>
        <CardSkeleton height={180} />
        <CardSkeleton height={180} />
        <CardSkeleton height={180} />
        <CardSkeleton height={180} />
        <CardSkeleton height={180} />
        <CardSkeleton height={180} />
      </Box>
    </Box>
  );
}

// Approvals page skeleton
export function ApprovalsSkeleton() {
  return (
    <Box sx={{ p: spacing[6] }}>
      <MuiSkeleton variant="text" width={250} height={32} sx={{ mb: 4 }} />
      <ListItemSkeleton />
      <ListItemSkeleton />
      <ListItemSkeleton />
      <ListItemSkeleton />
      <ListItemSkeleton />
    </Box>
  );
}

// Team page skeleton
export function TeamSkeleton() {
  return (
    <Box sx={{ p: spacing[6] }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <MuiSkeleton variant="text" width={150} height={32} />
        <MuiSkeleton variant="rounded" width={200} height={40} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing[4] }}>
        <ListItemSkeleton />
        <ListItemSkeleton />
        <ListItemSkeleton />
        <ListItemSkeleton />
        <ListItemSkeleton />
        <ListItemSkeleton />
      </Box>
    </Box>
  );
}

// Generic page skeleton
export function PageSkeleton() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ p: spacing[6] }}>
      <MuiSkeleton variant="text" width={300} height={40} sx={{ mb: 4 }} />
      <Box
        sx={{
          bgcolor: isDark ? colors.dark.bg.secondary : colors.light.bg.secondary,
          borderRadius: radii.lg,
          p: spacing[5],
          mb: 4,
        }}
      >
        <MuiSkeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
        <MuiSkeleton variant="text" width="60%" height={20} sx={{ mb: 2 }} />
        <MuiSkeleton variant="text" width="70%" height={20} />
      </Box>
      <TableSkeleton rows={3} />
    </Box>
  );
}

export default {
  CardSkeleton,
  ListItemSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  BudgetSkeleton,
  ApprovalsSkeleton,
  TeamSkeleton,
  PageSkeleton,
};
