import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

interface HealthIndicatorProps {
  health: 'on-track' | 'at-risk' | 'over-budget';
  showLabel?: boolean;
  size?: 'small' | 'medium';
}

const healthConfig: Record<
  HealthIndicatorProps['health'],
  { label: string; color: string }
> = {
  'on-track': { label: 'On Track', color: '#80FF9C' },
  'at-risk': { label: 'At Risk', color: '#FFF845' },
  'over-budget': { label: 'Over Budget', color: '#FF6B6B' },
};

export const HealthIndicator: React.FC<HealthIndicatorProps> = ({
  health,
  showLabel = false,
  size = 'small',
}) => {
  const config = healthConfig[health];
  const dotSize = size === 'small' ? 8 : 12;

  if (showLabel) {
    return (
      <Chip
        label={config.label}
        size={size}
        sx={{
          backgroundColor: `${config.color}20`,
          color: config.color,
          fontWeight: 500,
          '& .MuiChip-label': {
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          },
        }}
        icon={
          <Box
            sx={{
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              backgroundColor: config.color,
              marginLeft: '8px !important',
            }}
          />
        }
      />
    );
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Box
        sx={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: config.color,
        }}
      />
    </Box>
  );
};
