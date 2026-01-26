import React from 'react';
import { Box, Typography } from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';

interface VarianceDisplayProps {
  planned: number;
  actual: number;
  showHours?: boolean;
  showArrow?: boolean;
  size?: 'small' | 'medium';
}

/**
 * Variance Display Component
 * 
 * Color coding (budget context):
 * - RED for positive variance (over budget) - bad
 * - GREEN for negative variance (under budget) - good
 * - GRAY for zero variance (on target) - neutral
 */
export const VarianceDisplay: React.FC<VarianceDisplayProps> = ({
  planned,
  actual,
  showHours = true,
  showArrow = true,
  size = 'medium',
}) => {
  const variance = actual - planned;
  const suffix = showHours ? '' : '';
  const fontSize = size === 'small' ? '0.75rem' : 'inherit';
  const iconSize = size === 'small' ? 12 : 16;

  // Determine color based on variance
  // In budget context: over = bad (red), under = good (green)
  const getColor = (): string => {
    if (variance === 0) return '#6B7280'; // gray - on target
    if (variance > 0) return '#EF4444'; // red - over budget (bad)
    return '#10B981'; // green - under budget (good)
  };

  // Format the variance display
  const formatVariance = (): string => {
    if (variance === 0) return '–';
    const absVariance = Math.abs(variance);
    return showHours ? `${absVariance}` : `${absVariance}`;
  };

  const color = getColor();

  if (variance === 0) {
    return (
      <Typography
        component="span"
        sx={{
          color,
          fontWeight: 500,
          fontSize,
        }}
      >
        –
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        color,
      }}
    >
      {variance > 0 && (
        <>
          <Typography component="span" sx={{ fontWeight: 500, fontSize }}>
            +{formatVariance()}
          </Typography>
          {showArrow && <ArrowUpward sx={{ fontSize: iconSize }} />}
        </>
      )}
      {variance < 0 && (
        <>
          <Typography component="span" sx={{ fontWeight: 500, fontSize }}>
            -{formatVariance()}
          </Typography>
          {showArrow && <ArrowDownward sx={{ fontSize: iconSize }} />}
        </>
      )}
    </Box>
  );
};

export default VarianceDisplay;
