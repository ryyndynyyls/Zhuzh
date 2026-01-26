/**
 * EmptyState Component
 * Reusable empty state display for pages with no data
 *
 * Design principles:
 * - Helpful, not just decorative
 * - Consistent pattern across all pages
 * - Warm, encouraging messaging
 * - Actionable with CTA buttons
 */

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { colors, spacing, typography } from '../styles/tokens';
import { pageFadeIn } from '../styles/animations';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
}: EmptyStateProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
      {icon && (
        <Box
          sx={{
            mb: spacing[4],
            color: isDark ? colors.dark.text.tertiary : colors.light.text.tertiary,
            fontSize: 48,
            '& .MuiSvgIcon-root': {
              fontSize: 48,
            },
          }}
        >
          {icon}
        </Box>
      )}

      <Typography
        variant="h6"
        sx={{
          color: isDark ? colors.dark.text.primary : colors.light.text.primary,
          mb: spacing[2],
          fontWeight: typography.fontWeight.semibold,
        }}
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: isDark ? colors.dark.text.secondary : colors.light.text.secondary,
          mb: actionLabel ? spacing[5] : 0,
          lineHeight: typography.lineHeight.relaxed,
        }}
      >
        {description}
      </Typography>

      {actionLabel && onAction && (
        <Button
          variant="contained"
          color="primary"
          onClick={onAction}
          sx={{ mb: secondaryAction ? spacing[2] : 0 }}
        >
          {actionLabel}
        </Button>
      )}

      {secondaryAction && (
        <Button
          variant="text"
          size="small"
          onClick={secondaryAction.onClick}
          sx={{ color: isDark ? colors.dark.text.secondary : colors.light.text.secondary }}
        >
          {secondaryAction.label}
        </Button>
      )}
    </Box>
  );
}

export default EmptyState;
