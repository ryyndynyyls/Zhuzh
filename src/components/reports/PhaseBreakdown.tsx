import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Chip,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Stack
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { ZhuzhSectionLoader } from '../ZhuzhPageLoader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface PhaseMetrics {
  phase_id: number;
  phase_name: string;
  project_name: string;
  project_id: number;
  budgeted_hours: number;
  allocated_hours: number;
  logged_hours: number;
  remaining_hours: number;
  burn_rate: number;
  status: 'on_track' | 'at_risk' | 'over_budget' | 'complete';
  start_date: string | null;
  end_date: string | null;
}

interface PhaseReportResponse {
  success: boolean;
  data: PhaseMetrics[];
  meta: {
    total: number;
    by_status: {
      on_track: number;
      at_risk: number;
      over_budget: number;
      complete: number;
    };
  };
}

type SortField = 'project_name' | 'phase_name' | 'budgeted_hours' | 'logged_hours' | 'burn_rate';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'on_track' | 'at_risk' | 'over_budget' | 'complete';

const statusConfig = {
  on_track: {
    label: 'On Track',
    color: 'success' as const,
    icon: <TrendingUpIcon fontSize="small" />
  },
  at_risk: {
    label: 'At Risk',
    color: 'warning' as const,
    icon: <WarningIcon fontSize="small" />
  },
  over_budget: {
    label: 'Over Budget',
    color: 'error' as const,
    icon: <ErrorIcon fontSize="small" />
  },
  complete: {
    label: 'Complete',
    color: 'default' as const,
    icon: <CheckCircleIcon fontSize="small" />
  }
};

export const PhaseBreakdown: React.FC = () => {
  const [data, setData] = useState<PhaseMetrics[]>([]);
  const [meta, setMeta] = useState<PhaseReportResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>('project_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sort_by: sortField,
        sort_order: sortOrder
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`${API_BASE}/api/reports/phases?${params}`);
      const result: PhaseReportResponse = await response.json();

      if (result.success) {
        setData(result.data);
        setMeta(result.meta);
      } else {
        setError('Failed to load phase data');
      }
    } catch (err) {
      setError('Network error while loading phase data');
      console.error('Error fetching phase breakdown:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sortField, sortOrder, statusFilter]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    const term = searchTerm.toLowerCase();
    return data.filter(
      phase =>
        phase.phase_name.toLowerCase().includes(term) ||
        phase.project_name.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  const getBurnRateColor = (rate: number): string => {
    if (rate > 100) return '#f44336';
    if (rate > 85) return '#ff9800';
    if (rate > 50) return '#2196f3';
    return '#4caf50';
  };

  const formatHours = (hours: number): string => {
    return hours.toLocaleString('en-US', { maximumFractionDigits: 1 });
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <IconButton size="small" onClick={fetchData} sx={{ ml: 1 }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Phase Budget Breakdown
        </Typography>

        <Tooltip title="Refresh data">
          <IconButton onClick={fetchData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Status Summary Cards */}
      {meta && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          {Object.entries(meta.by_status).map(([status, count]) => {
            const config = statusConfig[status as keyof typeof statusConfig];
            return (
              <Paper
                key={status}
                sx={{
                  p: 2,
                  flex: 1,
                  cursor: 'pointer',
                  border: statusFilter === status ? 2 : 0,
                  borderColor: 'primary.main'
                }}
                onClick={() => setStatusFilter(status === statusFilter ? 'all' : status as StatusFilter)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    icon={config.icon}
                    label={config.label}
                    color={config.color}
                    size="small"
                  />
                  <Typography variant="h6">{count}</Typography>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FilterListIcon color="action" />

          <TextField
            size="small"
            label="Search phases"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="on_track">On Track</MenuItem>
              <MenuItem value="at_risk">At Risk</MenuItem>
              <MenuItem value="over_budget">Over Budget</MenuItem>
              <MenuItem value="complete">Complete</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Data Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'project_name'}
                  direction={sortField === 'project_name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('project_name')}
                >
                  Project
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'phase_name'}
                  direction={sortField === 'phase_name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('phase_name')}
                >
                  Phase
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'budgeted_hours'}
                  direction={sortField === 'budgeted_hours' ? sortOrder : 'asc'}
                  onClick={() => handleSort('budgeted_hours')}
                >
                  Budgeted
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Allocated</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'logged_hours'}
                  direction={sortField === 'logged_hours' ? sortOrder : 'asc'}
                  onClick={() => handleSort('logged_hours')}
                >
                  Logged
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Remaining</TableCell>
              <TableCell sx={{ minWidth: 180 }}>
                <TableSortLabel
                  active={sortField === 'burn_rate'}
                  direction={sortField === 'burn_rate' ? sortOrder : 'asc'}
                  onClick={() => handleSort('burn_rate')}
                >
                  Burn Rate
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <ZhuzhSectionLoader minHeight={200} message="Loading phases..." />
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No phases found matching your criteria
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((phase) => {
                const config = statusConfig[phase.status];
                const burnColor = getBurnRateColor(phase.burn_rate);

                return (
                  <TableRow
                    key={`${phase.project_id}-${phase.phase_id}`}
                    hover
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      ...(phase.status === 'over_budget' && {
                        bgcolor: 'error.light',
                        '&:hover': { bgcolor: 'error.light' }
                      })
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {phase.project_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{phase.phase_name}</TableCell>
                    <TableCell align="right">
                      {formatHours(phase.budgeted_hours)}h
                    </TableCell>
                    <TableCell align="right">
                      {formatHours(phase.allocated_hours)}h
                    </TableCell>
                    <TableCell align="right">
                      {formatHours(phase.logged_hours)}h
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        color={phase.remaining_hours < 0 ? 'error' : 'inherit'}
                      >
                        {formatHours(phase.remaining_hours)}h
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(phase.burn_rate, 100)}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: burnColor,
                                borderRadius: 4
                              }
                            }}
                          />
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ minWidth: 45, color: burnColor }}
                        >
                          {phase.burn_rate}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={config.icon}
                        label={config.label}
                        color={config.color}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary Footer */}
      {!loading && filteredData.length > 0 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Stack direction="row" spacing={4}>
            <Typography variant="body2" color="text.secondary">
              Total Phases: <strong>{filteredData.length}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Budgeted:{' '}
              <strong>
                {formatHours(filteredData.reduce((sum, p) => sum + p.budgeted_hours, 0))}h
              </strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Logged:{' '}
              <strong>
                {formatHours(filteredData.reduce((sum, p) => sum + p.logged_hours, 0))}h
              </strong>
            </Typography>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default PhaseBreakdown;
