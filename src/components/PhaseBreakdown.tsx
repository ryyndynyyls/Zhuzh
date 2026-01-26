/**
 * PhaseBreakdown Component
 * Shows a project's phases with budget breakdown and status
 * Phase Breakdown View - unanimous 5.0 priority
 */

import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Collapse,
  IconButton,
  Divider,
  Skeleton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useProjectPhases, ProjectPhase } from '../hooks/useProjectPhases';

interface PhaseBreakdownProps {
  projectId: string;
  projectName?: string;
  projectColor?: string;
  userRole: 'employee' | 'pm' | 'admin';
  hourlyRate?: number;
  defaultExpanded?: boolean;
}

// Health colors matching the app theme
const getStatusColor = (status: string) => {
  switch (status) {
    case 'over_budget':
      return '#FF6B6B';
    case 'warning':
      return '#FFF845';
    case 'on_track':
    case 'healthy':
      return '#80FF9C';
    default:
      return '#6B7280';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'over_budget':
      return 'Over Budget';
    case 'warning':
      return 'At Risk';
    case 'on_track':
      return 'On Track';
    case 'healthy':
      return 'Healthy';
    case 'no_budget':
      return 'No Budget';
    default:
      return status;
  }
};

const PhaseRow: React.FC<{
  phase: ProjectPhase;
  userRole: string;
  hourlyRate?: number;
}> = ({ phase, userRole, hourlyRate }) => {
  const showDollars = userRole === 'pm' || userRole === 'admin';
  const burnPercent = phase.burnPercentage || 0;
  const statusColor = getStatusColor(phase.budgetStatus);

  // Format values
  const formatHours = (h: number) => h.toFixed(1);
  const formatDollars = (h: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(h * (hourlyRate || 0));

  const budgetDisplay = phase.budget_hours
    ? showDollars && hourlyRate
      ? formatDollars(phase.budget_hours)
      : `${formatHours(phase.budget_hours)}h`
    : '—';

  const actualDisplay = showDollars && hourlyRate
    ? formatDollars(phase.totalActual)
    : `${formatHours(phase.totalActual)}h`;

  const varianceDisplay = phase.variance !== 0
    ? `${phase.variance > 0 ? '+' : ''}${formatHours(phase.variance)}h`
    : '—';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px 80px 80px 100px',
        gap: 2,
        py: 1.5,
        px: 2,
        alignItems: 'center',
        borderBottom: '1px solid #374151',
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.02)',
        },
      }}
    >
      {/* Phase name + status chip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <Chip
          label={phase.status}
          size="small"
          sx={{
            fontSize: '0.65rem',
            height: 20,
            backgroundColor:
              phase.status === 'active' ? 'rgba(128,255,156,0.15)' :
              phase.status === 'complete' ? 'rgba(107,114,128,0.3)' :
              'rgba(255,255,255,0.05)',
            color:
              phase.status === 'active' ? '#80FF9C' :
              phase.status === 'complete' ? '#9CA3AF' :
              '#6B7280',
            textTransform: 'capitalize',
          }}
        />
        <Typography
          sx={{
            color: '#F3F4F6',
            fontWeight: 500,
            fontSize: '0.9rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {phase.name}
        </Typography>
      </Box>

      {/* Budget */}
      <Typography sx={{ color: '#9CA3AF', fontSize: '0.85rem', textAlign: 'right' }}>
        {budgetDisplay}
      </Typography>

      {/* Actual */}
      <Typography sx={{ color: '#F3F4F6', fontSize: '0.85rem', textAlign: 'right', fontWeight: 500 }}>
        {actualDisplay}
      </Typography>

      {/* Variance */}
      <Typography
        sx={{
          fontSize: '0.85rem',
          textAlign: 'right',
          fontWeight: phase.variance !== 0 ? 600 : 400,
          color: phase.variance > 0 ? '#FF6B6B' : phase.variance < 0 ? '#80FF9C' : '#6B7280',
        }}
      >
        {varianceDisplay}
      </Typography>

      {/* Progress */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {phase.budget_hours ? (
          <>
            <LinearProgress
              variant="determinate"
              value={Math.min(burnPercent, 100)}
              sx={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#374151',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: statusColor,
                },
              }}
            />
            <Typography sx={{ color: statusColor, fontSize: '0.75rem', fontWeight: 600, minWidth: 35 }}>
              {Math.round(burnPercent)}%
            </Typography>
          </>
        ) : (
          <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', fontStyle: 'italic' }}>
            No budget
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export const PhaseBreakdown: React.FC<PhaseBreakdownProps> = ({
  projectId,
  projectName,
  projectColor,
  userRole,
  hourlyRate,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const { project, phases, stats, loading, error } = useProjectPhases(projectId);

  if (error) {
    return (
      <Box sx={{ p: 2, color: '#FF6B6B' }}>
        Failed to load phases: {error.message}
      </Box>
    );
  }

  const displayName = projectName || project?.name || 'Project';
  const displayColor = projectColor || '#4285F4';

  return (
    <Box
      sx={{
        backgroundColor: '#2A2520',
        border: '1px solid #374151',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: displayColor,
            }}
          />
          <Typography sx={{ color: '#F3F4F6', fontWeight: 600, fontSize: '1rem' }}>
            {displayName}
          </Typography>
          {loading ? (
            <Skeleton width={60} height={24} sx={{ bgcolor: '#374151' }} />
          ) : (
            <Chip
              label={`${phases.length} phase${phases.length !== 1 ? 's' : ''}`}
              size="small"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: '#9CA3AF',
                fontSize: '0.7rem',
                height: 22,
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!loading && stats.phasesOverBudget > 0 && (
            <Chip
              label={`${stats.phasesOverBudget} over budget`}
              size="small"
              sx={{
                backgroundColor: 'rgba(255,107,107,0.15)',
                color: '#FF6B6B',
                fontSize: '0.7rem',
                height: 22,
              }}
            />
          )}
          {!loading && stats.phasesAtRisk > 0 && (
            <Chip
              label={`${stats.phasesAtRisk} at risk`}
              size="small"
              sx={{
                backgroundColor: 'rgba(255,248,69,0.15)',
                color: '#FFF845',
                fontSize: '0.7rem',
                height: 22,
              }}
            />
          )}
          <IconButton size="small" sx={{ color: '#9CA3AF' }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Phase table */}
      <Collapse in={expanded}>
        <Divider sx={{ borderColor: '#374151' }} />
        
        {/* Table header */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 80px 80px 100px',
            gap: 2,
            py: 1,
            px: 2,
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        >
          <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Phase
          </Typography>
          <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>
            Budget
          </Typography>
          <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>
            Actual
          </Typography>
          <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>
            Variance
          </Typography>
          <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Progress
          </Typography>
        </Box>

        {/* Phase rows */}
        {loading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={50} sx={{ bgcolor: '#374151', mb: 1 }} />
            ))}
          </Box>
        ) : phases.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ color: '#6B7280', fontStyle: 'italic' }}>
              No phases defined for this project
            </Typography>
          </Box>
        ) : (
          phases.map((phase) => (
            <PhaseRow
              key={phase.id}
              phase={phase}
              userRole={userRole}
              hourlyRate={hourlyRate}
            />
          ))
        )}

        {/* Totals row */}
        {!loading && phases.length > 0 && project && (
          <>
            <Divider sx={{ borderColor: '#374151' }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 80px 80px 100px',
                gap: 2,
                py: 1.5,
                px: 2,
                backgroundColor: 'rgba(0,0,0,0.3)',
              }}
            >
              <Typography sx={{ color: '#F3F4F6', fontWeight: 600, fontSize: '0.9rem' }}>
                Total
              </Typography>
              <Typography sx={{ color: '#9CA3AF', fontSize: '0.85rem', textAlign: 'right' }}>
                {project.budget_hours ? `${project.budget_hours}h` : '—'}
              </Typography>
              <Typography sx={{ color: '#F3F4F6', fontSize: '0.85rem', textAlign: 'right', fontWeight: 600 }}>
                {project.totalActual.toFixed(1)}h
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.85rem',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: stats.totalVariance > 0 ? '#EF4444' : stats.totalVariance < 0 ? '#10B981' : '#6B7280',
                }}
              >
                {stats.totalVariance !== 0 ? `${stats.totalVariance > 0 ? '+' : ''}${stats.totalVariance.toFixed(1)}h` : '—'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {project.budget_hours ? (
                  <>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(project.burnPercentage, 100)}
                      sx={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#374151',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          backgroundColor: project.burnPercentage >= 90 ? '#FF6B6B' :
                                          project.burnPercentage >= 75 ? '#FFF845' : '#80FF9C',
                        },
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        minWidth: 35,
                        color: project.burnPercentage >= 90 ? '#FF6B6B' :
                               project.burnPercentage >= 75 ? '#FFF845' : '#80FF9C',
                      }}
                    >
                      {Math.round(project.burnPercentage)}%
                    </Typography>
                  </>
                ) : (
                  <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', fontStyle: 'italic' }}>
                    No budget
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        )}
      </Collapse>
    </Box>
  );
};

export default PhaseBreakdown;
