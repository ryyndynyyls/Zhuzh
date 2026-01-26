import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Stack,
  InputAdornment,
  SelectChangeEvent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { FolderOutlined } from '@mui/icons-material';
import { EmptyState } from './EmptyState';
import { BudgetCard, BudgetCardProject } from './BudgetCard';
import { ErrorState } from './ErrorState';
import { ZhuzhPageLoader } from './ZhuzhPageLoader';
import { useBudgetDashboard, ProjectBudgetSummary } from '../hooks/useBudgetDashboard';
import { useAuth } from '../contexts/AuthContext';
import { getStaggeredStyle } from '../styles/animations';

type HealthFilter = 'all' | 'on-track' | 'at-risk' | 'over-budget';
type StatusFilter = 'all' | 'active' | 'complete' | 'on-hold' | 'planning';

/**
 * Calculate health status based on burn percentage
 */
const getHealthStatus = (burned: number, budget: number): HealthFilter => {
  const percent = budget > 0 ? (burned / budget) * 100 : 0;
  if (percent > 90) return 'over-budget';
  if (percent >= 75) return 'at-risk';
  return 'on-track';
};

/**
 * Get unique clients from projects
 */
const getUniqueClients = (projects: BudgetCardProject[]): string[] => {
  const clients = new Set(projects.map((p) => p.client).filter(Boolean));
  return Array.from(clients).sort();
};

/**
 * Export projects data to CSV
 */
const exportToCSV = (projects: BudgetCardProject[], showDollars: boolean): void => {
  const headers = showDollars
    ? ['Project', 'Client', 'Status', 'Budget ($)', 'Burned ($)', 'Burn %', 'Health']
    : ['Project', 'Client', 'Status', 'Budget (hrs)', 'Burned (hrs)', 'Burn %', 'Health'];

  const rows = projects.map((p) => {
    const burnPercent = p.budgetHours > 0 ? ((p.burnedHours / p.budgetHours) * 100).toFixed(1) : '0';
    const health = getHealthStatus(p.burnedHours, p.budgetHours);

    if (showDollars) {
      return [
        p.name,
        p.client,
        p.status,
        (p.budgetHours * p.hourlyRate).toString(),
        (p.burnedHours * p.hourlyRate).toString(),
        burnPercent,
        health,
      ];
    }

    return [
      p.name,
      p.client,
      p.status,
      p.budgetHours.toString(),
      p.burnedHours.toString(),
      burnPercent,
      health,
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `budget-report-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Map API project to BudgetCardProject format
 */
const mapProjectToCard = (p: ProjectBudgetSummary): BudgetCardProject => ({
  id: p.id,
  name: p.name,
  client: p.clientName || 'No Client',
  color: p.color || '#6B7280',
  budgetHours: p.budgetHours || 0,
  burnedHours: p.totalActual || 0,
  hourlyRate: p.hourlyRate || 0,
  status: p.status || 'active',
});

/**
 * BudgetDashboard Component
 *
 * Main budget view showing all project health at a glance.
 * Features filtering, search, and CSV export capabilities.
 * Role-based display shows hours for employees, dollars for managers.
 */
export const BudgetDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects: apiProjects, loading, error, stats: apiStats, refetch } = useBudgetDashboard(user?.org_id);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');

  const userRole = user?.role || 'employee';
  const showDollars = userRole === 'pm' || userRole === 'admin';

  // Map API projects to card format
  const projects = useMemo(() => apiProjects.map(mapProjectToCard), [apiProjects]);
  const clients = useMemo(() => getUniqueClients(projects), [projects]);

  // Filter projects based on all criteria
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = project.name.toLowerCase().includes(query);
        const matchesClient = project.client.toLowerCase().includes(query);
        if (!matchesName && !matchesClient) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false;
      }

      // Client filter
      if (clientFilter !== 'all' && project.client !== clientFilter) {
        return false;
      }

      // Health filter
      if (healthFilter !== 'all') {
        const health = getHealthStatus(project.burnedHours, project.budgetHours);
        if (health !== healthFilter) return false;
      }

      return true;
    });
  }, [projects, searchQuery, statusFilter, clientFilter, healthFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const onTrack = filteredProjects.filter(
      (p) => getHealthStatus(p.burnedHours, p.budgetHours) === 'on-track'
    ).length;
    const atRisk = filteredProjects.filter(
      (p) => getHealthStatus(p.burnedHours, p.budgetHours) === 'at-risk'
    ).length;
    const overBudget = filteredProjects.filter(
      (p) => getHealthStatus(p.burnedHours, p.budgetHours) === 'over-budget'
    ).length;

    return { onTrack, atRisk, overBudget, total: filteredProjects.length };
  }, [filteredProjects]);

  const handleStatusChange = (event: SelectChangeEvent<StatusFilter>) => {
    setStatusFilter(event.target.value as StatusFilter);
  };

  const handleClientChange = (event: SelectChangeEvent<string>) => {
    setClientFilter(event.target.value);
  };

  const handleHealthChange = (event: SelectChangeEvent<HealthFilter>) => {
    setHealthFilter(event.target.value as HealthFilter);
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/budget/${projectId}`);
  };

  // Loading state
  if (loading) {
    return <ZhuzhPageLoader message="Loading budgets..." />;
  }

  // Error state
  if (error) {
    return <ErrorState type="generic" onRetry={() => refetch()} />;
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="text.primary">
            {showDollars ? 'Budget Dashboard' : 'Project Hours'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {showDollars
              ? `${stats.total} projects | ${stats.onTrack} on track | ${stats.atRisk} at risk | ${stats.overBudget} over budget`
              : `Track hours across ${stats.total} projects`
            }
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          onClick={() => exportToCSV(filteredProjects, showDollars)}
          sx={{
            backgroundColor: '#FF8731',
            '&:hover': {
              backgroundColor: '#E5752B',
            },
          }}
        >
          Export CSV
        </Button>
      </Stack>

      {/* Filters */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        mb={3}
        sx={{
          backgroundColor: '#2A2520',
          p: 2,
          borderRadius: 2,
          border: '1px solid #374151',
        }}
      >
        {/* Search */}
        <TextField
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ minWidth: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#6B7280' }} />
              </InputAdornment>
            ),
          }}
        />

        {/* Status filter */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={handleStatusChange}>
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="planning">Planning</MenuItem>
            <MenuItem value="on-hold">On Hold</MenuItem>
            <MenuItem value="complete">Complete</MenuItem>
          </Select>
        </FormControl>

        {/* Client filter */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Client</InputLabel>
          <Select value={clientFilter} label="Client" onChange={handleClientChange}>
            <MenuItem value="all">All Clients</MenuItem>
            {clients.map((client) => (
              <MenuItem key={client} value={client}>
                {client}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Health filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Health</InputLabel>
          <Select value={healthFilter} label="Health" onChange={handleHealthChange}>
            <MenuItem value="all">All Health</MenuItem>
            <MenuItem value="on-track">On Track</MenuItem>
            <MenuItem value="at-risk">At Risk</MenuItem>
            <MenuItem value="over-budget">Over Budget</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Project Grid */}
      {filteredProjects.length > 0 ? (
        <Grid container spacing={2.5}>
          {filteredProjects.map((project, index) => (
            <Grid
              item
              xs={12}
              sm={6}
              lg={4}
              xl={3}
              key={project.id}
              sx={getStaggeredStyle(Math.min(index, 10))}
            >
              <BudgetCard
                project={project}
                userRole={userRole}
                onClick={() => handleProjectClick(project.id)}
              />
            </Grid>
          ))}
        </Grid>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderOutlined />}
          title="No projects yet"
          description="Create your first project to start tracking budgets and allocations."
          actionLabel="Create Project"
          onAction={() => navigate('/projects/new')}
        />
      ) : (
        <EmptyState
          icon={<FolderOutlined />}
          title="No projects found"
          description="Try adjusting your filters or search query."
        />
      )}
    </Box>
  );
};

export default BudgetDashboard;
