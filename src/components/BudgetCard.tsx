import React from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  LinearProgress,
  Chip,
  Box,
  Stack,
} from '@mui/material';

export interface BudgetCardProject {
  id: string;
  name: string;
  client: string;
  color: string;
  budgetHours: number;
  burnedHours: number;
  hourlyRate: number;
  status: string;
}

export interface BudgetCardProps {
  project: BudgetCardProject;
  userRole: 'employee' | 'pm' | 'admin';
  onClick?: () => void;
}

type HealthStatus = 'on-track' | 'at-risk' | 'over-budget';

/**
 * Calculate burn percentage and determine health status
 */
const calculateHealth = (burned: number, budget: number): { percent: number; status: HealthStatus } => {
  const percent = budget > 0 ? (burned / budget) * 100 : 0;

  if (percent > 90) {
    return { percent, status: 'over-budget' };
  } else if (percent >= 75) {
    return { percent, status: 'at-risk' };
  }
  return { percent, status: 'on-track' };
};

/**
 * Get color based on health status
 */
const getHealthColor = (status: HealthStatus): 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'on-track':
      return 'success';
    case 'at-risk':
      return 'warning';
    case 'over-budget':
      return 'error';
  }
};

/**
 * Get display label for health status
 */
const getHealthLabel = (status: HealthStatus): string => {
  switch (status) {
    case 'on-track':
      return 'On Track';
    case 'at-risk':
      return 'At Risk';
    case 'over-budget':
      return 'Over Budget';
  }
};

/**
 * Format currency for display
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * BudgetCard Component
 *
 * Displays individual project budget status with burn rate visualization.
 * Shows hours for employees, dollars for managers/admins.
 */
export const BudgetCard: React.FC<BudgetCardProps> = ({ project, userRole, onClick }) => {
  const { percent, status } = calculateHealth(project.burnedHours, project.budgetHours);
  const healthColor = getHealthColor(status);
  const healthLabel = getHealthLabel(status);

  // Calculate dollar values
  const budgetDollars = project.budgetHours * project.hourlyRate;
  const burnedDollars = project.burnedHours * project.hourlyRate;

  // Determine what to display based on role
  const showDollars = userRole === 'pm' || userRole === 'admin';

  const budgetDisplay = showDollars
    ? formatCurrency(budgetDollars)
    : `${project.budgetHours} hrs`;

  const burnedDisplay = showDollars
    ? formatCurrency(burnedDollars)
    : `${project.burnedHours} hrs`;

  const cardContent = (
    <CardContent sx={{ p: 2.5 }}>
      {/* Header: Project name and health chip - stacked on narrow cards */}
      <Box sx={{ mb: 1.5 }}>
        {/* Project name row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
          {/* Project color indicator */}
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: project.color,
              flexShrink: 0,
              mt: 0.5,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle1" 
              fontWeight={600} 
              color="text.primary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.name}
            </Typography>
          </Box>
          {/* Health chip - inline on same row */}
          <Chip
            label={healthLabel}
            color={healthColor}
            size="small"
            sx={{
              fontWeight: 500,
              fontSize: '0.7rem',
              height: 22,
              flexShrink: 0,
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        </Box>
        {/* Client name */}
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ ml: 2.25 }}
        >
          {project.client}
        </Typography>
      </Box>

      {/* Progress bar */}
      <Box mt={2} mb={1}>
        <LinearProgress
          variant="determinate"
          value={Math.min(percent, 100)}
          color={healthColor}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: '#374151',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              backgroundColor: status === 'over-budget' ? '#FF6B6B' : 
                              status === 'at-risk' ? '#FFF845' : '#80FF9C',
            },
          }}
        />
      </Box>

      {/* Budget info */}
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center"
        flexWrap="wrap"
        gap={1.5}
        mt={1}
      >
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}
        >
          {burnedDisplay} of {budgetDisplay}
        </Typography>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            whiteSpace: 'nowrap',
            fontSize: '0.85rem',
            color: status === 'on-track'
              ? '#80FF9C'
              : status === 'at-risk'
                ? '#FFF845'
                : '#FF6B6B',
          }}
        >
          {Math.round(percent)}% burned
        </Typography>
      </Stack>

      {/* Status badge */}
      {project.status !== 'active' && (
        <Box mt={1.5}>
          <Chip
            label={project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            size="small"
            variant="outlined"
            sx={{
              borderColor: '#4B5563',
              color: '#9CA3AF',
              fontSize: '0.7rem',
            }}
          />
        </Box>
      )}
    </CardContent>
  );

  if (onClick) {
    return (
      <Card
        sx={{
          height: '100%',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: '#4B5563',
            transform: 'translateY(-2px)',
          },
        }}
      >
        <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
          {cardContent}
        </CardActionArea>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      {cardContent}
    </Card>
  );
};

export default BudgetCard;
