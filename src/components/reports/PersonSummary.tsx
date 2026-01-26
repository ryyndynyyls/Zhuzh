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
  Avatar,
  Chip,
  LinearProgress,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { ZhuzhSectionLoader } from '../ZhuzhPageLoader';

interface PersonSummary {
  person_id: number;
  person_name: string;
  email: string;
  department: string;
  is_active: boolean;
  total_allocated_hours: number;
  total_logged_hours: number;
  utilization_percent: number;
  project_count: number;
}

interface PersonDetail {
  person_id: number;
  person_name: string;
  email: string;
  project_id: number;
  project_name: string;
  phase_id: number;
  phase_name: string;
  role_name: string;
  allocated_hours: number;
  logged_hours: number;
  remaining_hours: number;
  utilization_percent: number;
}

interface PeopleSummaryResponse {
  success: boolean;
  data: PersonSummary[];
  meta: {
    total_people: number;
    active_count: number;
  };
}

interface PersonDetailResponse {
  success: boolean;
  data: PersonDetail[];
  meta: {
    person_id: number;
    person_name: string;
    total_allocated_hours: number;
    total_logged_hours: number;
    overall_utilization: number;
    project_count: number;
  };
}

type SortField = 'person_name' | 'department' | 'total_allocated_hours' | 'total_logged_hours' | 'utilization_percent' | 'project_count';
type SortOrder = 'asc' | 'desc';

export const PersonSummaryReport: React.FC = () => {
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [meta, setMeta] = useState<PeopleSummaryResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>('person_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('true');

  const [expandedPerson, setExpandedPerson] = useState<number | null>(null);
  const [personDetails, setPersonDetails] = useState<PersonDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchPeople = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ is_active: activeFilter });
      if (departmentFilter !== 'all') {
        params.append('department', departmentFilter);
      }

      const response = await fetch(`/api/reports/people?${params}`);
      const result: PeopleSummaryResponse = await response.json();

      if (result.success) {
        setPeople(result.data);
        setMeta(result.meta);
      } else {
        setError('Failed to load people data');
      }
    } catch (err) {
      setError('Network error while loading people data');
      console.error('Error fetching people summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonDetails = async (personId: number) => {
    setDetailsLoading(true);

    try {
      const response = await fetch(`/api/reports/person/${personId}`);
      const result: PersonDetailResponse = await response.json();

      if (result.success) {
        setPersonDetails(result.data);
      }
    } catch (err) {
      console.error('Error fetching person details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, [activeFilter, departmentFilter]);

  const handleExpandPerson = async (personId: number) => {
    if (expandedPerson === personId) {
      setExpandedPerson(null);
      setPersonDetails([]);
    } else {
      setExpandedPerson(personId);
      await fetchPersonDetails(personId);
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

  const sortedAndFilteredPeople = useMemo(() => {
    let filtered = people;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        person =>
          person.person_name.toLowerCase().includes(term) ||
          person.email.toLowerCase().includes(term) ||
          person.department.toLowerCase().includes(term)
      );
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
  }, [people, searchTerm, sortField, sortOrder]);

  const departments = useMemo(() => {
    return [...new Set(people.map(p => p.department))].sort();
  }, [people]);

  const getUtilizationColor = (percent: number): string => {
    if (percent > 100) return '#f44336';
    if (percent > 90) return '#ff9800';
    if (percent > 70) return '#4caf50';
    return '#2196f3';
  };

  const formatHours = (hours: number): string => {
    return hours.toLocaleString('en-US', { maximumFractionDigits: 1 });
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <IconButton size="small" onClick={fetchPeople} sx={{ ml: 1 }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Team Hours Summary
        </Typography>

        <Tooltip title="Refresh data">
          <IconButton onClick={fetchPeople} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary Stats */}
      {meta && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Total Team Members</Typography>
            <Typography variant="h4">{meta.total_people}</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Active Members</Typography>
            <Typography variant="h4">{meta.active_count}</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Total Allocated Hours</Typography>
            <Typography variant="h4">
              {formatHours(people.reduce((sum, p) => sum + p.total_allocated_hours, 0))}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Total Logged Hours</Typography>
            <Typography variant="h4">
              {formatHours(people.reduce((sum, p) => sum + p.total_logged_hours, 0))}
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
            label="Search people"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={departmentFilter}
              label="Department"
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <MenuItem value="all">All Departments</MenuItem>
              {departments.map(dept => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={activeFilter}
              label="Status"
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
              <MenuItem value="all">All</MenuItem>
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
                  active={sortField === 'person_name'}
                  direction={sortField === 'person_name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('person_name')}
                >
                  Person
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'department'}
                  direction={sortField === 'department' ? sortOrder : 'asc'}
                  onClick={() => handleSort('department')}
                >
                  Department
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'total_allocated_hours'}
                  direction={sortField === 'total_allocated_hours' ? sortOrder : 'asc'}
                  onClick={() => handleSort('total_allocated_hours')}
                >
                  Allocated
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
              <TableCell sx={{ minWidth: 180 }}>
                <TableSortLabel
                  active={sortField === 'utilization_percent'}
                  direction={sortField === 'utilization_percent' ? sortOrder : 'asc'}
                  onClick={() => handleSort('utilization_percent')}
                >
                  Utilization
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'project_count'}
                  direction={sortField === 'project_count' ? sortOrder : 'asc'}
                  onClick={() => handleSort('project_count')}
                >
                  Projects
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <ZhuzhSectionLoader minHeight={200} message="Loading team..." />
                </TableCell>
              </TableRow>
            ) : sortedAndFilteredPeople.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No team members found matching your criteria
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredPeople.map((person) => {
                const isExpanded = expandedPerson === person.person_id;
                const utilizationColor = getUtilizationColor(person.utilization_percent);

                return (
                  <React.Fragment key={person.person_id}>
                    <TableRow
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleExpandPerson(person.person_id)}
                    >
                      <TableCell>
                        <IconButton size="small">
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            {getInitials(person.person_name)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {person.person_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {person.email}
                            </Typography>
                          </Box>
                          {!person.is_active && (
                            <Chip label="Inactive" size="small" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{person.department}</TableCell>
                      <TableCell align="right">
                        {formatHours(person.total_allocated_hours)}h
                      </TableCell>
                      <TableCell align="right">
                        {formatHours(person.total_logged_hours)}h
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(person.utilization_percent, 100)}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: utilizationColor,
                                  borderRadius: 4
                                }
                              }}
                            />
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ minWidth: 45, color: utilizationColor }}
                          >
                            {person.utilization_percent}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={person.project_count}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details */}
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 4, bgcolor: 'grey.50' }}>
                            {detailsLoading ? (
                              <Skeleton variant="rectangular" height={100} />
                            ) : personDetails.length === 0 ? (
                              <Typography color="text.secondary">
                                No project assignments found
                              </Typography>
                            ) : (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Project</TableCell>
                                    <TableCell>Phase</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell align="right">Allocated</TableCell>
                                    <TableCell align="right">Logged</TableCell>
                                    <TableCell align="right">Remaining</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {personDetails.map((detail, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{detail.project_name}</TableCell>
                                      <TableCell>{detail.phase_name}</TableCell>
                                      <TableCell>{detail.role_name}</TableCell>
                                      <TableCell align="right">
                                        {formatHours(detail.allocated_hours)}h
                                      </TableCell>
                                      <TableCell align="right">
                                        {formatHours(detail.logged_hours)}h
                                      </TableCell>
                                      <TableCell align="right">
                                        {formatHours(detail.remaining_hours)}h
                                      </TableCell>
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

export default PersonSummaryReport;
