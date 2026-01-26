/**
 * CompanyDashboard.tsx
 * High-level overview dashboard for leadership (Levi's view)
 * Shows project portfolio health, team utilization, and budget status
 */

import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  AvatarGroup,
  LinearProgress,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { UserAvatar } from './shared/UserAvatar';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import type { UserRole, Project, User } from '../types/database';

// Props interface
export interface CompanyDashboardProps {
  userRole: UserRole;
  projects?: DashboardProject[];
  stats?: {
    totalProjects: number;
    onTrack: number;
    atRisk: number;
    overBudget: number;
    totalBudgetHours: number;
    totalBurnedHours: number;
    avgUtilization?: number;
  };
  onProjectClick?: (projectId: string) => void;
  onViewBudgetDashboard?: () => void;
  hideHeader?: boolean; // Hide header and summary cards when embedded
}

// Health status type
type HealthStatus = 'on-track' | 'at-risk' | 'over-budget';

// Extended project type for dashboard display
interface DashboardProject extends Project {
  clientName: string;
  burnedHours: number;
  burnRate: number;
  health: HealthStatus;
  teamMembers: Pick<User, 'id' | 'name' | 'avatar_url' | 'discipline'>[];
}

// Color mappings
const HEALTH_COLORS: Record<HealthStatus, string> = {
  'on-track': '#80FF9C',
  'at-risk': '#FFF845',
  'over-budget': '#FF6B6B',
};

const HEALTH_LABELS: Record<HealthStatus, string> = {
  'on-track': 'On Track',
  'at-risk': 'At Risk',
  'over-budget': 'Over Budget',
};

// Helper to get initials from name
const getInitials = (name: string): string => {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

// Helper to generate consistent avatar color from name
const getAvatarColor = (name: string): string => {
  const colors = ['#4285F4', '#80FF9C', '#8B5CF6', '#F97316', '#EC4899', '#06B6D4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Main Component
export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  userRole,
  projects: propProjects,
  stats: propStats,
  onProjectClick,
  onViewBudgetDashboard,
  hideHeader = false,
}) => {
  const projects = propProjects || [];

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (propStats) {
      const avgUtilization = propStats.avgUtilization ?? (
        propStats.totalBudgetHours > 0
          ? Math.round((propStats.totalBurnedHours / propStats.totalBudgetHours) * 100)
          : 0
      );
      return {
        totalProjects: propStats.totalProjects,
        atRiskCount: propStats.atRisk + propStats.overBudget,
        avgUtilization,
      };
    }
    const activeProjects = projects.filter((p) => p.is_active);
    const atRiskProjects = activeProjects.filter(
      (p) => p.health === 'at-risk' || p.health === 'over-budget'
    );
    const avgUtilization = activeProjects.length > 0
      ? activeProjects.reduce((sum, p) => sum + Math.min(p.burnRate, 100), 0) / activeProjects.length
      : 0;
    return {
      totalProjects: activeProjects.length,
      atRiskCount: atRiskProjects.length,
      avgUtilization: Math.round(avgUtilization),
    };
  }, [projects, propStats]);

  // DataGrid columns definition
  const columns: GridColDef[] = [
    {
      field: 'priority',
      headerName: '#',
      width: 60,
      renderCell: (params: GridRenderCellParams<DashboardProject>) => (
        <Typography sx={{ color: '#9CA3AF', fontWeight: 600, fontSize: '0.875rem' }}>
          #{params.row.priority}
        </Typography>
      ),
    },
    {
      field: 'name',
      headerName: 'Project',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams<DashboardProject>) => (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: 1,
            cursor: onProjectClick ? 'pointer' : 'default',
          }}
          onClick={() => onProjectClick?.(params.row.id)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: params.row.color || '#6B7280',
              }}
            />
            <Typography
              sx={{
                color: '#F3F4F6',
                fontWeight: 600,
                fontSize: '0.875rem',
                '&:hover': onProjectClick ? { color: '#60A5FA' } : {},
              }}
            >
              {params.row.name}
            </Typography>
          </Box>
          <Typography sx={{ color: '#9CA3AF', fontSize: '0.75rem', ml: 2 }}>
            {params.row.clientName}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'budget_hours',
      headerName: 'Budget',
      width: 100,
      renderCell: (params: GridRenderCellParams<DashboardProject>) => (
        <Typography sx={{ color: '#D1D5DB', fontSize: '0.875rem' }}>
          {params.row.budget_hours} hrs
        </Typography>
      ),
    },
    {
      field: 'burnRate',
      headerName: 'Burn Rate',
      width: 180,
      renderCell: (params: GridRenderCellParams<DashboardProject>) => {
        const burnRate = params.row.burnRate;
        const isOver = burnRate > 100;
        const displayRate = Math.min(burnRate, 100);
        const color = isOver ? '#FF6B6B' : burnRate >= 80 ? '#FFF845' : '#80FF9C';

        return (
          <Box sx={{ width: '100%', pr: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                {Math.round(params.row.burnedHours * 100) / 100} / {params.row.budget_hours} hrs
              </Typography>
              <Typography sx={{ color, fontSize: '0.75rem', fontWeight: 600 }}>
                {burnRate}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={displayRate}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: '#374151',
                '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 3 },
              }}
            />
          </Box>
        );
      },
    },
    {
      field: 'health',
      headerName: 'Health',
      width: 120,
      renderCell: (params: GridRenderCellParams<DashboardProject>) => {
        const health = params.row.health;
        const color = HEALTH_COLORS[health];
        const label = HEALTH_LABELS[health];
        return (
          <Chip
            label={label}
            size="small"
            sx={{
              backgroundColor: `${color}20`,
              color,
              fontWeight: 600,
              fontSize: '0.75rem',
              border: `1px solid ${color}40`,
            }}
          />
        );
      },
    },
    {
      field: 'teamMembers',
      headerName: 'Team',
      width: 140,
      sortable: false,
      renderCell: (params: GridRenderCellParams<DashboardProject>) => {
        const members = params.row.teamMembers;
        const displayMembers = members.slice(0, 3);
        const extraCount = members.length - 3;
        return (
          <AvatarGroup
            max={4}
            sx={{
              '& .MuiAvatar-root': {
                width: 28,
                height: 28,
                fontSize: '0.75rem',
                border: '2px solid #2A2520',
              },
            }}
          >
            {displayMembers.map((member) => (
              <Tooltip key={member.id} title={member.name} arrow>
                <Box>
                  <UserAvatar
                    name={member.name}
                    avatarUrl={member.avatar_url}
                    discipline={member.discipline}
                    size="sm"
                  />
                </Box>
              </Tooltip>
            ))}
            {extraCount > 0 && (
              <Avatar sx={{ backgroundColor: '#4B5563', color: '#D1D5DB' }}>
                +{extraCount}
              </Avatar>
            )}
          </AvatarGroup>
        );
      },
    },
  ];

  // If hideHeader, just render the projects table
  if (hideHeader) {
    return (
      <Card
        sx={{
          backgroundColor: '#2A2520',
          border: '1px solid #374151',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #374151' }}>
            <Typography variant="h6" sx={{ color: '#F3F4F6', fontWeight: 600 }}>
              Active Projects
            </Typography>
          </Box>
          <DataGrid
            rows={projects}
            columns={columns}
            initialState={{
              sorting: { sortModel: [{ field: 'priority', sort: 'asc' }] },
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
            autoHeight
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#374151',
                color: '#D1D5DB',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              },
              '& .MuiDataGrid-columnHeader': { '&:focus': { outline: 'none' } },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #374151',
                '&:focus': { outline: 'none' },
              },
              '& .MuiDataGrid-row': { '&:hover': { backgroundColor: '#374151' } },
              '& .MuiDataGrid-footerContainer': {
                backgroundColor: '#374151',
                borderTop: '1px solid #374151',
              },
              '& .MuiTablePagination-root': { color: '#9CA3AF' },
              '& .MuiTablePagination-selectIcon': { color: '#9CA3AF' },
              '& .MuiIconButton-root': { color: '#9CA3AF' },
              '& .MuiDataGrid-sortIcon': { color: '#9CA3AF' },
              '& .MuiDataGrid-menuIconButton': { color: '#9CA3AF' },
            }}
          />
        </CardContent>
      </Card>
    );
  }

  // Full dashboard with header and summary cards
  return (
    <Box sx={{ backgroundColor: '#1A1917', minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#F3F4F6', fontWeight: 700 }}>
            Company Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
            Portfolio overview for leadership
          </Typography>
        </Box>
        {onViewBudgetDashboard && (userRole === 'pm' || userRole === 'admin') && (
          <Button
            variant="contained"
            onClick={onViewBudgetDashboard}
            sx={{
              backgroundColor: '#FF8731',
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { backgroundColor: '#E5751C' },
            }}
          >
            View Budget Dashboard
          </Button>
        )}
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <Card sx={{ backgroundColor: '#2A2520', border: '1px solid #374151', borderRadius: 3, flex: 1, minWidth: 200 }}>
          <CardContent>
            <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 1, fontWeight: 500 }}>
              Total Active Projects
            </Typography>
            <Typography variant="h4" sx={{ color: '#F3F4F6', fontWeight: 700 }}>
              {summaryStats.totalProjects}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mt: 1 }}>
              Currently in progress
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ backgroundColor: '#2A2520', border: '1px solid #374151', borderRadius: 3, flex: 1, minWidth: 200 }}>
          <CardContent>
            <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 1, fontWeight: 500 }}>
              Projects At Risk
            </Typography>
            <Typography variant="h4" sx={{ color: '#F3F4F6', fontWeight: 700 }}>
              {summaryStats.atRiskCount}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mt: 1 }}>
              Requiring attention
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ backgroundColor: '#2A2520', border: '1px solid #374151', borderRadius: 3, flex: 1, minWidth: 200 }}>
          <CardContent>
            <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 1, fontWeight: 500 }}>
              Average Team Utilization
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={56}
                  thickness={4}
                  sx={{ color: '#374151', position: 'absolute' }}
                />
                <CircularProgress
                  variant="determinate"
                  value={summaryStats.avgUtilization}
                  size={56}
                  thickness={4}
                  sx={{
                    color: summaryStats.avgUtilization >= 80 ? '#80FF9C' :
                           summaryStats.avgUtilization >= 60 ? '#FFF845' : '#FF6B6B',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#F3F4F6', fontWeight: 600 }}>
                    {summaryStats.avgUtilization}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                Team capacity in use
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Projects DataGrid */}
      <Card sx={{ backgroundColor: '#2A2520', border: '1px solid #374151', borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #374151' }}>
            <Typography variant="h6" sx={{ color: '#F3F4F6', fontWeight: 600 }}>
              Active Projects
            </Typography>
          </Box>
          <DataGrid
            rows={projects}
            columns={columns}
            initialState={{
              sorting: { sortModel: [{ field: 'priority', sort: 'asc' }] },
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
            autoHeight
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#374151',
                color: '#D1D5DB',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              },
              '& .MuiDataGrid-columnHeader': { '&:focus': { outline: 'none' } },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #374151',
                '&:focus': { outline: 'none' },
              },
              '& .MuiDataGrid-row': { '&:hover': { backgroundColor: '#374151' } },
              '& .MuiDataGrid-footerContainer': {
                backgroundColor: '#374151',
                borderTop: '1px solid #374151',
              },
              '& .MuiTablePagination-root': { color: '#9CA3AF' },
              '& .MuiTablePagination-selectIcon': { color: '#9CA3AF' },
              '& .MuiIconButton-root': { color: '#9CA3AF' },
              '& .MuiDataGrid-sortIcon': { color: '#9CA3AF' },
              '& .MuiDataGrid-menuIconButton': { color: '#9CA3AF' },
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default CompanyDashboard;
