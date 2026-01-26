/**
 * ErrorState Component
 * Reusable error display for failed data fetches or permission issues
 *
 * Types:
 * - generic: General error with retry
 * - network: Connection/offline issue
 * - notFound: Resource doesn't exist
 * - permission: Access denied
 */

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ErrorOutline, RefreshOutlined, WifiOffOutlined, LockOutlined, SearchOffOutlined } from '@mui/icons-material';
import { colors, spacing, typography } from '../styles/tokens';
import { pageFadeIn } from '../styles/animations';

type ErrorType = 'generic' | 'network' | 'notFound' | 'permission';

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

const errorContent: Record<ErrorType, { icon: typeof ErrorOutline; title: string; message: string }> = {
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
    icon: SearchOffOutlined,
    title: 'Not found',
    message: "We couldn't find what you're looking for. It may have been moved or deleted.",
  },
  permission: {
    icon: LockOutlined,
    title: 'Access denied',
    message: "You don't have permission to view this. Contact your admin if this seems wrong.",
  },
};

export function ErrorState({ type = 'generic', title, message, onRetry }: ErrorStateProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
      <Box
        sx={{
          mb: spacing[4],
          color: isDark ? colors.dark.error.text : colors.light.error.text,
          '& .MuiSvgIcon-root': {
            fontSize: 48,
          },
        }}
      >
        <Icon fontSize="inherit" />
      </Box>

      <Typography
        variant="h6"
        sx={{
          color: isDark ? colors.dark.text.primary : colors.light.text.primary,
          mb: spacing[2],
          fontWeight: typography.fontWeight.semibold,
        }}
      >
        {title || content.title}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: isDark ? colors.dark.text.secondary : colors.light.text.secondary,
          mb: onRetry ? spacing[5] : 0,
          lineHeight: typography.lineHeight.relaxed,
        }}
      >
        {message || content.message}
      </Typography>

      {onRetry && (
        <Button variant="outlined" startIcon={<RefreshOutlined />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </Box>
  );
}

export default ErrorState;
