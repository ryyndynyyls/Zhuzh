/**
 * ProjectDrillDown Component
 * Week-by-week variance analysis - Levi's "40 extra hours on QA in week 3" view
 * Audit Trail / Drill-Down - 4.25 priority
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Divider,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PersonIcon from '@mui/icons-material/Person';
import FolderIcon from '@mui/icons-material/Folder';
import { useProjectDrilldown, WeekBreakdown } from '../hooks/useProjectDrilldown';
import { ZhuzhWheelSpinner } from './ZhuzhPageLoader';

interface ProjectDrillDownProps {
  projectId: string;
  projectName?: string;
  projectColor?: string;
  userRole: 'employee' | 'pm' | 'admin';
  weeksBack?: number;
  defaultExpanded?: boolean;
}

type BreakdownView = 'phase' | 'user';

// Format week label
const formatWeekLabel = (weekStart: string): string => {
  const date = new Date(weekStart + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Get variance color: red for over (bad), green for under (good)
const getVarianceColor = (variance: number) => {
  if (variance > 0) return '#EF4444'; // red - over budget
  if (variance < 0) return '#10B981'; // green - under budget
  return '#6B7280'; // gray - on target
};

// Week row component
const WeekRow: React.FC<{
  week: WeekBreakdown;
  breakdownView: BreakdownView;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ week, breakdownView, isExpanded, onToggle }) => {
  const varianceColor = getVarianceColor(week.variance);
  const hasBreakdown = breakdownView === 'phase' ? week.byPhase.length > 0 : week.byUser.length > 0;
  const breakdown = breakdownView === 'phase' ? week.byPhase : week.byUser;

  return (
    <Box sx={{ borderBottom: '1px solid #374151' }}>
      {/* Main row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '120px 80px 80px 100px 1fr',
          gap: 2,
          py: 1.5,
          px: 2,
          alignItems: 'center',
          cursor: hasBreakdown ? 'pointer' : 'default',
          '&:hover': hasBreakdown ? { backgroundColor: 'rgba(255,255,255,0.02)' } : {},
        }}
        onClick={hasBreakdown ? onToggle : undefined}
      >
        {/* Week */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {hasBreakdown && (
            <IconButton size="small" sx={{ p: 0, color: '#6B7280' }}>
              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
          <Typography sx={{ color: '#F3F4F6', fontSize: '0.9rem', fontWeight: 500 }}>
            {formatWeekLabel(week.weekStart)}
          </Typography>
        </Box>

        {/* Planned */}
        <Typography sx={{ color: '#9CA3AF', fontSize: '0.85rem', textAlign: 'right' }}>
          {week.planned.toFixed(1)}h
        </Typography>

        {/* Actual */}
        <Typography sx={{ color: '#F3F4F6', fontSize: '0.85rem', textAlign: 'right', fontWeight: 500 }}>
          {week.actual.toFixed(1)}h
        </Typography>

        {/* Variance */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
          {week.variance !== 0 && (
            week.variance > 0 
              ? <TrendingUpIcon sx={{ fontSize: 16, color: varianceColor }} />
              : <TrendingDownIcon sx={{ fontSize: 16, color: varianceColor }} />
          )}
          <Typography
            sx={{
              fontSize: '0.85rem',
              fontWeight: week.variance !== 0 ? 600 : 400,
              color: varianceColor,
            }}
          >
            {week.variance > 0 ? '+' : ''}{week.variance.toFixed(1)}h
          </Typography>
        </Box>

        {/* Visual bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {week.planned > 0 && (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {/* Planned bar (background) */}
              <Box
                sx={{
                  position: 'relative',
                  height: 8,
                  flex: 1,
                  backgroundColor: '#374151',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                {/* Actual bar (overlay) */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${Math.min((week.actual / week.planned) * 100, 150)}%`,
                    backgroundColor: varianceColor,
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
              <Typography sx={{ color: '#6B7280', fontSize: '0.7rem', minWidth: 30 }}>
                {Math.round((week.actual / week.planned) * 100)}%
              </Typography>
            </Box>
          )}
          {week.unplanned > 0 && (
            <Chip
              label={`+${week.unplanned.toFixed(1)}h unplanned`}
              size="small"
              sx={{
                backgroundColor: 'rgba(139,92,246,0.15)',
                color: '#A78BFA',
                fontSize: '0.65rem',
                height: 18,
              }}
            />
          )}
        </Box>
      </Box>

      {/* Breakdown rows */}
      <Collapse in={isExpanded}>
        <Box sx={{ backgroundColor: 'rgba(0,0,0,0.2)', py: 0.5 }}>
          {breakdown
            .filter((item) => item.planned > 0 || item.actual > 0)
            .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
            .map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '120px 80px 80px 100px 1fr',
                  gap: 2,
                  py: 0.75,
                  px: 2,
                  pl: 5,
                  alignItems: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {breakdownView === 'phase' ? (
                    <FolderIcon sx={{ fontSize: 14, color: '#6B7280' }} />
                  ) : (
                    <PersonIcon sx={{ fontSize: 14, color: '#6B7280' }} />
                  )}
                  <Typography
                    sx={{
                      color: '#9CA3AF',
                      fontSize: '0.8rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </Typography>
                </Box>
                <Typography sx={{ color: '#6B7280', fontSize: '0.8rem', textAlign: 'right' }}>
                  {item.planned.toFixed(1)}h
                </Typography>
                <Typography sx={{ color: '#9CA3AF', fontSize: '0.8rem', textAlign: 'right' }}>
                  {item.actual.toFixed(1)}h
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.8rem',
                    textAlign: 'right',
                    color: getVarianceColor(item.variance),
                    fontWeight: item.variance !== 0 ? 500 : 400,
                  }}
                >
                  {item.variance > 0 ? '+' : ''}{item.variance.toFixed(1)}h
                </Typography>
                <Box />
              </Box>
            ))}
        </Box>
      </Collapse>
    </Box>
  );
};

export const ProjectDrillDown: React.FC<ProjectDrillDownProps> = ({
  projectId,
  projectName,
  projectColor,
  userRole,
  weeksBack = 8,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [breakdownView, setBreakdownView] = useState<BreakdownView>('phase');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const { data, loading, error } = useProjectDrilldown(projectId, weeksBack);

  const toggleWeek = (weekStart: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekStart)) {
        next.delete(weekStart);
      } else {
        next.add(weekStart);
      }
      return next;
    });
  };

  if (error) {
    return (
      <Box sx={{ p: 2, color: '#FF6B6B' }}>
        Failed to load drill-down: {error.message}
      </Box>
    );
  }

  const displayName = projectName || data?.project?.name || 'Project';
  const displayColor = projectColor || data?.project?.color || '#4285F4';

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
            {displayName} — Week by Week
          </Typography>
          {loading ? (
            <Skeleton width={80} height={24} sx={{ bgcolor: '#374151' }} />
          ) : data && (
            <Chip
              label={`${data.dateRange.weeksCount} weeks`}
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
          {!loading && data && data.totals.variance !== 0 && (
            <Chip
              icon={data.totals.variance > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={`${data.totals.variance > 0 ? '+' : ''}${data.totals.variance.toFixed(1)}h total variance`}
              size="small"
              sx={{
                backgroundColor: data.totals.variance > 0
                  ? 'rgba(255,107,107,0.15)'
                  : 'rgba(128,255,156,0.15)',
                color: data.totals.variance > 0 ? '#FF6B6B' : '#80FF9C',
                fontSize: '0.7rem',
                height: 24,
                '& .MuiChip-icon': {
                  color: 'inherit',
                  fontSize: 14,
                },
              }}
            />
          )}
          <IconButton size="small" sx={{ color: '#9CA3AF' }} onClick={(e) => e.stopPropagation()}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Divider sx={{ borderColor: '#374151' }} />

        {/* Variance highlights */}
        {!loading && data && data.biggestVariances.length > 0 && (
          <Box sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <Typography sx={{ color: '#9CA3AF', fontSize: '0.75rem', mb: 1, fontWeight: 600 }}>
              🔍 BIGGEST VARIANCES
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {data.biggestVariances.map((v) => (
                <Tooltip
                  key={v.week}
                  title={
                    v.topContributors.length > 0
                      ? `Top: ${v.topContributors.map((c) => `${c.name} (${c.variance > 0 ? '+' : ''}${c.variance.toFixed(1)}h)`).join(', ')}`
                      : ''
                  }
                  arrow
                >
                  <Chip
                    label={`${formatWeekLabel(v.week)}: ${v.variance > 0 ? '+' : ''}${v.variance.toFixed(1)}h`}
                    size="small"
                    onClick={() => {
                      setExpandedWeeks((prev) => new Set([...prev, v.week]));
                    }}
                    sx={{
                      backgroundColor: v.variance > 0
                        ? 'rgba(255,107,107,0.2)'
                        : 'rgba(128,255,156,0.2)',
                      color: v.variance > 0 ? '#FF6B6B' : '#80FF9C',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: v.variance > 0
                          ? 'rgba(255,107,107,0.3)'
                          : 'rgba(128,255,156,0.3)',
                      },
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>
        )}

        {/* View toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1, pr: 2 }}>
          <ToggleButtonGroup
            value={breakdownView}
            exclusive
            onChange={(_, v) => v && setBreakdownView(v)}
            size="small"
          >
            <ToggleButton value="phase" sx={{ px: 1.5, py: 0.5 }}>
              <FolderIcon sx={{ fontSize: 16, mr: 0.5 }} />
              <Typography sx={{ fontSize: '0.75rem' }}>By Phase</Typography>
            </ToggleButton>
            <ToggleButton value="user" sx={{ px: 1.5, py: 0.5 }}>
              <PersonIcon sx={{ fontSize: 16, mr: 0.5 }} />
              <Typography sx={{ fontSize: '0.75rem' }}>By Person</Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Table header */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '120px 80px 80px 100px 1fr',
            gap: 2,
            py: 1,
            px: 2,
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        >
          <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Week
          </Typography>
          <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>
            Planned
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

        {/* Week rows */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <ZhuzhWheelSpinner size={36} message="Loading week data..." py={2} />
          </Box>
        ) : !data || data.weeks.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ color: '#6B7280', fontStyle: 'italic' }}>
              No data for this time period
            </Typography>
          </Box>
        ) : (
          data.weeks.map((week) => (
            <WeekRow
              key={week.weekStart}
              week={week}
              breakdownView={breakdownView}
              isExpanded={expandedWeeks.has(week.weekStart)}
              onToggle={() => toggleWeek(week.weekStart)}
            />
          ))
        )}

        {/* Totals row */}
        {!loading && data && data.weeks.length > 0 && (
          <>
            <Divider sx={{ borderColor: '#374151' }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '120px 80px 80px 100px 1fr',
                gap: 2,
                py: 1.5,
                px: 2,
                backgroundColor: 'rgba(0,0,0,0.4)',
              }}
            >
              <Typography sx={{ color: '#F3F4F6', fontWeight: 600, fontSize: '0.9rem' }}>
                Total
              </Typography>
              <Typography sx={{ color: '#9CA3AF', fontSize: '0.85rem', textAlign: 'right' }}>
                {data.totals.planned.toFixed(1)}h
              </Typography>
              <Typography sx={{ color: '#F3F4F6', fontSize: '0.85rem', textAlign: 'right', fontWeight: 600 }}>
                {data.totals.actual.toFixed(1)}h
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.85rem',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: getVarianceColor(data.totals.variance),
                }}
              >
                {data.totals.variance > 0 ? '+' : ''}{data.totals.variance.toFixed(1)}h
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {data.totals.unplanned > 0 && (
                  <Chip
                    label={`${data.totals.unplanned.toFixed(1)}h unplanned total`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(139,92,246,0.15)',
                      color: '#A78BFA',
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                )}
              </Box>
            </Box>
          </>
        )}
      </Collapse>
    </Box>
  );
};

export default ProjectDrillDown;
