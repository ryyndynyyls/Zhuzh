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
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Stack,
  Chip,
  LinearProgress,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { ZhuzhSectionLoader } from '../ZhuzhPageLoader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface RoleSummary {
  role_id: number;
  role_name: string;
  discipline: string;
  total_budgeted_hours: number;
  total_allocated_hours: number;
  total_logged_hours: number;
  project_count: number;
  headcount: number;
}

interface RoleDetail {
  role_id: number;
  role_name: string;
  discipline: string;
  project_id: number;
  project_name: string;
  phase_id: number;
  phase_name: string;
  budgeted_hours: number;
  allocated_hours: number;
  logged_hours: number;
  remaining_hours: number;
  headcount: number;
}

interface RolesSummaryResponse {
  success: boolean;
  data: RoleSummary[];
  meta: {
    total_roles: number;
  };
}

interface RoleDetailResponse {
  success: boolean;
  data: RoleDetail[];
  meta: {
    role_id: number;
    role_name: string;
    discipline: string;
    total_budgeted_hours: number;
    total_logged_hours: number;
    burn_rate: number;
    total_headcount: number;
    project_count: number;
  };
}

type SortField = 'role_name' | 'discipline' | 'total_budgeted_hours' | 'total_logged_hours' | 'project_count' | 'headcount';
type SortOrder = 'asc' | 'desc';

export const RoleSummaryReport: React.FC = () => {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [meta, setMeta] = useState<RolesSummaryResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>('discipline');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');

  const [expandedRole, setExpandedRole] = useState<number | null>(null);
  const [roleDetails, setRoleDetails] = useState<RoleDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/reports/roles`);
      const result: RolesSummaryResponse = await response.json();

      if (result.success) {
        setRoles(result.data);
        setMeta(result.meta);
      } else {
        setError('Failed to load roles data');
      }
    } catch (err) {
      setError('Network error while loading roles data');
      console.error('Error fetching roles summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleDetails = async (roleId: number) => {
    setDetailsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/reports/role/${roleId}`);
      const result: RoleDetailResponse = await response.json();

      if (result.success) {
        setRoleDetails(result.data);
      }
    } catch (err) {
      console.error('Error fetching role details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleExpandRole = async (roleId: number) => {
    if (expandedRole === roleId) {
      setExpandedRole(null);
      setRoleDetails([]);
    } else {
      setExpandedRole(roleId);
      await fetchRoleDetails(roleId);
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedAndFilteredRoles = useMemo(() => {
    let filtered = roles;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        role =>
          role.role_name.toLowerCase().includes(term) ||
          role.discipline.toLowerCase().includes(term)
      );
    }

    if (disciplineFilter !== 'all') {
      filtered = filtered.filter(role => role.discipline === disciplineFilter);
    }

    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [roles, searchTerm, disciplineFilter, sortField, sortOrder]);

  const disciplines = useMemo(() => {
    return [...new Set(roles.map(r => r.discipline))].sort();
  }, [roles]);

  const getBurnRateColor = (budgeted: number, logged: number): string => {
    if (budgeted === 0) return '#9e9e9e';
    const rate = (logged / budgeted) * 100;
    if (rate > 100) return '#f44336';
    if (rate > 85) return '#ff9800';
    if (rate > 50) return '#2196f3';
    return '#4caf50';
  };

  const formatHours = (hours: number): string => {
    return hours.toLocaleString('en-US', { maximumFractionDigits: 1 });
  };

  const getDisciplineColor = (discipline: string): string => {
    const colors: Record<string, string> = {
      'Design': '#9c27b0',
      'Engineering': '#2196f3',
      'Development': '#2196f3',
      'Product': '#ff9800',
      'Marketing': '#e91e63',
      'QA': '#00bcd4',
      'Management': '#607d8b',
      'General': '#9e9e9e'
    };
    return colors[discipline] || '#9e9e9e';
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <IconButton size="small" onClick={fetchRoles} sx={{ ml: 1 }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Role & Discipline Summary
        </Typography>

        <Tooltip title="Refresh data">
          <IconButton onClick={fetchRoles} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary Stats */}
      {meta && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Total Roles</Typography>
            <Typography variant="h4">{meta.total_roles}</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Disciplines</Typography>
            <Typography variant="h4">{disciplines.length}</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Total Budgeted Hours</Typography>
            <Typography variant="h4">
              {formatHours(roles.reduce((sum, r) => sum + r.total_budgeted_hours, 0))}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Total Logged Hours</Typography>
            <Typography variant="h4">
              {formatHours(roles.reduce((sum, r) => sum + r.total_logged_hours, 0))}
            </Typography>
          </Paper>
        </Stack>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <SearchIcon color="action" />

          <TextField
            size="small"
            label="Search roles"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Discipline</InputLabel>
            <Select
              value={disciplineFilter}
              label="Discipline"
              onChange={(e) => setDisciplineFilter(e.target.value)}
            >
              <MenuItem value="all">All Disciplines</MenuItem>
              {disciplines.map(disc => (
                <MenuItem key={disc} value={disc}>{disc}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Data Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40}></TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'role_name'}
                  direction={sortField === 'role_name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('role_name')}
                >
                  Role
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'discipline'}
                  direction={sortField === 'discipline' ? sortOrder : 'asc'}
                  onClick={() => handleSort('discipline')}
                >
                  Discipline
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'total_budgeted_hours'}
                  direction={sortField === 'total_budgeted_hours' ? sortOrder : 'asc'}
                  onClick={() => handleSort('total_budgeted_hours')}
                >
                  Budgeted
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'total_logged_hours'}
                  direction={sortField === 'total_logged_hours' ? sortOrder : 'asc'}
                  onClick={() => handleSort('total_logged_hours')}
                >
                  Logged
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ minWidth: 180 }}>Burn Rate</TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'project_count'}
                  direction={sortField === 'project_count' ? sortOrder : 'asc'}
                  onClick={() => handleSort('project_count')}
                >
                  Projects
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'headcount'}
                  direction={sortField === 'headcount' ? sortOrder : 'asc'}
                  onClick={() => handleSort('headcount')}
                >
                  Headcount
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <ZhuzhSectionLoader minHeight={200} message="Loading roles..." />
                </TableCell>
              </TableRow>
            ) : sortedAndFilteredRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No roles found matching your criteria
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredRoles.map((role) => {
                const isExpanded = expandedRole === role.role_id;
                const burnRate = role.total_budgeted_hours > 0
                  ? (role.total_logged_hours / role.total_budgeted_hours) * 100
                  : 0;
                const burnColor = getBurnRateColor(role.total_budgeted_hours, role.total_logged_hours);

                return (
                  <React.Fragment key={role.role_id}>
                    <TableRow
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleExpandRole(role.role_id)}
                    >
                      <TableCell>
                        <IconButton size="small">
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <WorkIcon fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight={500}>
                            {role.role_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={role.discipline}
                          size="small"
                          sx={{
                            bgcolor: getDisciplineColor(role.discipline),
                            color: 'white'
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatHours(role.total_budgeted_hours)}h
                      </TableCell>
                      <TableCell align="right">
                        {formatHours(role.total_logged_hours)}h
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(burnRate, 100)}
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
                            {burnRate.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={role.project_count}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={role.headcount}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details */}
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 4, bgcolor: 'grey.50' }}>
                            {detailsLoading ? (
                              <Skeleton variant="rectangular" height={100} />
                            ) : roleDetails.length === 0 ? (
                              <Typography color="text.secondary">
                                No project assignments found for this role
                              </Typography>
                            ) : (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Project</TableCell>
                                    <TableCell>Phase</TableCell>
                                    <TableCell align="right">Budgeted</TableCell>
                                    <TableCell align="right">Allocated</TableCell>
                                    <TableCell align="right">Logged</TableCell>
                                    <TableCell align="right">Remaining</TableCell>
                                    <TableCell align="center">People</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {roleDetails.map((detail, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{detail.project_name}</TableCell>
                                      <TableCell>{detail.phase_name}</TableCell>
                                      <TableCell align="right">
                                        {formatHours(detail.budgeted_hours)}h
                                      </TableCell>
                                      <TableCell align="right">
                                        {formatHours(detail.allocated_hours)}h
                                      </TableCell>
                                      <TableCell align="right">
                                        {formatHours(detail.logged_hours)}h
                                      </TableCell>
                                      <TableCell align="right">
                                        {formatHours(detail.remaining_hours)}h
                                      </TableCell>
                                      <TableCell align="center">{detail.headcount}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default RoleSummaryReport;
