import React, { useState, useMemo } from 'react';
import { Box, CircularProgress, Typography, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useBudgetDashboard } from '../hooks/useBudgetDashboard';
import { useThisWeekUtilization } from '../hooks/useThisWeekUtilization';
import { useAuth } from '../contexts/AuthContext';
import WhosOut from '../components/WhosOut';
import { CompanyDashboard } from '../components/CompanyDashboard';
import { ProjectDetailModal } from '../components/ProjectDetailModal';
import { ErrorState } from '../components/ErrorState';
import { ZhuzhPageLoader } from '../components/ZhuzhPageLoader';
import { colors, spacing, radii, shadows, typography } from '../styles/tokens';
import { getStaggeredStyle, hoverLift } from '../styles/animations';

export function DashboardPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user, loading: authLoading } = useAuth();
  const { projects, stats, loading, error, refetch } = useBudgetDashboard(user?.org_id);
  
  // Selected project for detail modal
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Get real utilization from allocations
  const {
    utilizationPercent,
    totalAllocatedHours,
    teamSize,
    weekStart,
    loading: utilizationLoading
  } = useThisWeekUtilization({ orgId: user?.org_id || '' });

  // Transform projects to CompanyDashboard format
  const dashboardProjects = useMemo(() => {
    return projects.map((p) => ({
      id: p.id,
      org_id: user?.org_id || '',
      client_id: p.clientId || null,
      name: p.name,
      clientName: p.clientName || 'Unknown',
      description: p.description,
      color: p.color || '#6B7280',
      budget_hours: p.budgetHours || 0,
      burnedHours: p.totalActual,
      burnRate: p.burnPercentage,
      hourly_rate: p.hourlyRate,
      is_billable: p.isBillable,
      is_active: p.status === 'active',
      priority: p.priority,
      status: p.status as 'active' | 'complete' | 'planning' | 'on-hold',
      health: p.health,
      teamMembers: [], // Would need to fetch from allocations
      created_at: '',
      updated_at: '',
      // Additional required Project fields
      aliases: null,
      archive_reason: null,
      archived_at: null,
      legacy_10kft_id: null,
      parent_id: null,
    }));
  }, [projects, user?.org_id]);

  // Show branded loader while loading
  if (authLoading || loading) {
    return <ZhuzhPageLoader message="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorState type="generic" onRetry={() => refetch()} />;
  }

  // Format week start for display
  const weekLabel = weekStart 
    ? new Date(weekStart + 'T00:00:00').toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    : 'This Week';

  // Determine utilization color using semantic tokens
  const getUtilizationColor = (percent: number) => {
    const colorScheme = isDark ? colors.dark : colors.light;
    if (percent >= 80) return colorScheme.success.text; // Green - healthy
    if (percent >= 60) return colorScheme.warning.text; // Yellow - moderate
    return colorScheme.error.text; // Red - low
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700 }}>
          Company Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Portfolio overview for leadership
        </Typography>
      </Box>

      {/* Who's Out + Summary Cards Row */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          mb: 4,
          alignItems: 'flex-start',
        }}
      >
        {/* Who's Out Panel - Fixed width */}
        <Box sx={{ width: 280, flexShrink: 0 }}>
          <WhosOut orgId={user?.org_id || ''} />
        </Box>

        {/* Summary Cards - Fill remaining space */}
        <Box sx={{ flex: 1, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Total Active Projects */}
          <Box
            sx={{
              flex: '1 1 200px',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: radii.lg,
              p: spacing[5],
              ...hoverLift,
              ...getStaggeredStyle(0),
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 1,
                fontWeight: 500,
                fontSize: typography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: typography.letterSpacing.wider,
              }}
            >
              Total Active Projects
            </Typography>
            <Typography
              variant="h4"
              sx={{
                color: 'text.primary',
                fontWeight: 700,
                fontFamily: typography.fontFamily.mono,
                fontSize: typography.fontSize['2xl'],
              }}
            >
              {stats?.totalProjects || dashboardProjects.length}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled', mt: 1 }}>
              Currently in progress
            </Typography>
          </Box>

          {/* Projects At Risk */}
          <Box
            sx={{
              flex: '1 1 200px',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: radii.lg,
              p: spacing[5],
              ...hoverLift,
              ...getStaggeredStyle(1),
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 1,
                fontWeight: 500,
                fontSize: typography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: typography.letterSpacing.wider,
              }}
            >
              Projects At Risk
            </Typography>
            <Typography
              variant="h4"
              sx={{
                color: 'text.primary',
                fontWeight: 700,
                fontFamily: typography.fontFamily.mono,
                fontSize: typography.fontSize['2xl'],
              }}
            >
              {(stats?.atRisk || 0) + (stats?.overBudget || 0)}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled', mt: 1 }}>
              Requiring attention
            </Typography>
          </Box>

          {/* Team Utilization - Now from allocations! */}
          <Tooltip
            title={`${totalAllocatedHours.toLocaleString()} hrs allocated / ${teamSize} people × 40 hrs`}
            arrow
            placement="top"
          >
            <Box
              sx={{
                flex: '1 1 200px',
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                borderRadius: radii.lg,
                p: spacing[5],
                cursor: 'help',
                ...hoverLift,
                ...getStaggeredStyle(2),
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  mb: 1,
                  fontWeight: 500,
                  fontSize: typography.fontSize.xs,
                  textTransform: 'uppercase',
                  letterSpacing: typography.letterSpacing.wider,
                }}
              >
                Team Utilization
                <Typography
                  component="span"
                  sx={{ color: 'text.disabled', fontSize: '0.7rem', ml: 1 }}
                >
                  (Week of {weekLabel})
                </Typography>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={56}
                    thickness={4}
                    sx={{ color: isDark ? colors.dark.border.default : colors.light.border.default, position: 'absolute' }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={Math.min(utilizationPercent, 100)}
                    size={56}
                    thickness={4}
                    sx={{ color: getUtilizationColor(utilizationPercent) }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0, left: 0, bottom: 0, right: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {utilizationLoading ? (
                      <CircularProgress size={16} sx={{ color: 'text.secondary' }} />
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.primary',
                          fontWeight: 600,
                          fontFamily: typography.fontFamily.mono,
                        }}
                      >
                        {utilizationPercent}%
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.disabled',
                      fontFamily: typography.fontFamily.mono,
                    }}
                  >
                    {totalAllocatedHours.toLocaleString()} hrs
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    of {(teamSize * 40).toLocaleString()} capacity
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Tooltip>
        </Box>
      </Box>

      {/* Projects Table */}
      <CompanyDashboard
        projects={dashboardProjects}
        stats={stats}
        userRole={user?.role || 'employee'}
        hideHeader
        onProjectClick={(projectId) => setSelectedProjectId(projectId)}
      />
      
      {/* Project Detail Modal */}
      <ProjectDetailModal
        projectId={selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
        userRole={user?.role || 'employee'}
      />
    </Box>
  );
}
