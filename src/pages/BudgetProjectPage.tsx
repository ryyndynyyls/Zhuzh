/**
 * BudgetProjectPage
 * Detailed budget view for a single project with phase breakdown,
 * weekly burn chart, and team hours.
 * Route: /budget/:projectId
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Snackbar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  Skeleton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Edit as EditIcon,
  Add as AddIcon,
  ExpandMore,
  ExpandLess,
  Person as PersonIcon,
  TrendingUp,
  TrendingDown,
  AccessTime,
  AttachMoney,
  Warning as WarningIcon,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useProjectPhases, ProjectPhase } from '../hooks/useProjectPhases';
import { useProjectDrilldown } from '../hooks/useProjectDrilldown';
import { useAuth } from '../contexts/AuthContext';
import { brand } from '../theme';
import { ZhuzhWheelSpinner } from '../components/ZhuzhPageLoader';

// Status colors
const STATUS_COLORS = {
  'on_track': '#80FF9C',
  'healthy': '#80FF9C',
  'warning': '#FFF845',
  'at_risk': '#FFF845',
  'over_budget': '#FF6B6B',
  'no_budget': '#6B7280',
  'pending': '#6B7280',
  'active': '#34A853',
  'complete': '#4285F4',
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'on_track':
    case 'healthy':
      return 'On Track';
    case 'warning':
    case 'at_risk':
      return 'At Risk';
    case 'over_budget':
      return 'Over Budget';
    default:
      return 'No Budget';
  }
};

const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'on_track':
    case 'healthy':
      return 'success';
    case 'warning':
    case 'at_risk':
      return 'warning';
    case 'over_budget':
      return 'error';
    default:
      return 'default';
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatHours = (hours: number): string => {
  return `${Math.round(hours * 10) / 10}h`;
};

// Edit Project Dialog Component
interface EditProjectDialogProps {
  open: boolean;
  onClose: () => void;
  project: {
    name: string;
    budget_hours: number | null;
    hourly_rate: number | null;
    status: string;
  } | null;
  onSave: (updates: Partial<{ name: string; budget_hours: number; hourly_rate: number; status: string }>) => Promise<void>;
  saving: boolean;
}

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  open,
  onClose,
  project,
  onSave,
  saving,
}) => {
  const [name, setName] = useState('');
  const [budgetHours, setBudgetHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setBudgetHours(project.budget_hours?.toString() || '');
      setHourlyRate(project.hourly_rate?.toString() || '');
      setStatus(project.status || 'active');
    }
  }, [project]);

  const handleSave = async () => {
    await onSave({
      name: name.trim(),
      budget_hours: parseFloat(budgetHours) || 0,
      hourly_rate: parseFloat(hourlyRate) || 0,
      status,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Project</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          <TextField
            label="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Budget Hours"
            value={budgetHours}
            onChange={(e) => setBudgetHours(e.target.value)}
            type="number"
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">hours</InputAdornment>,
            }}
          />
          <TextField
            label="Hourly Rate"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            type="number"
            fullWidth
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="complete">Complete</MenuItem>
              <MenuItem value="on-hold">On Hold</MenuItem>
              <MenuItem value="planning">Planning</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !name.trim()}
          sx={{ backgroundColor: brand.orange }}
        >
          {saving ? <CircularProgress size={20} /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Add/Edit Phase Dialog Component
interface PhaseDialogProps {
  open: boolean;
  onClose: () => void;
  phase?: ProjectPhase | null;
  onSave: (data: { name: string; budget_hours: number; status: string }) => Promise<void>;
  saving: boolean;
  mode: 'add' | 'edit';
}

const PhaseDialog: React.FC<PhaseDialogProps> = ({
  open,
  onClose,
  phase,
  onSave,
  saving,
  mode,
}) => {
  const [name, setName] = useState('');
  const [budgetHours, setBudgetHours] = useState('');
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    if (phase && mode === 'edit') {
      setName(phase.name || '');
      setBudgetHours(phase.budget_hours?.toString() || '');
      setStatus(phase.status || 'pending');
    } else {
      setName('');
      setBudgetHours('');
      setStatus('pending');
    }
  }, [phase, mode, open]);

  const handleSave = async () => {
    await onSave({
      name: name.trim(),
      budget_hours: parseFloat(budgetHours) || 0,
      status,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'add' ? 'Add Phase' : 'Edit Phase'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          <TextField
            label="Phase Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Discovery, Design, Development"
          />
          <TextField
            label="Budget Hours"
            value={budgetHours}
            onChange={(e) => setBudgetHours(e.target.value)}
            type="number"
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">hours</InputAdornment>,
            }}
          />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="complete">Complete</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !name.trim()}
          sx={{ backgroundColor: brand.orange }}
        >
          {saving ? <CircularProgress size={20} /> : mode === 'add' ? 'Add Phase' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Phase Row Component with Expandable Team
interface PhaseRowProps {
  phase: ProjectPhase;
  hourlyRate: number;
  showDollars: boolean;
  onEdit: (phase: ProjectPhase) => void;
}

const PhaseRow: React.FC<PhaseRowProps> = ({ phase, hourlyRate, showDollars, onEdit }) => {
  const [expanded, setExpanded] = useState(false);

  const budgetDisplay = showDollars && hourlyRate > 0
    ? formatCurrency((phase.budget_hours || 0) * hourlyRate)
    : formatHours(phase.budget_hours || 0);

  const spentDisplay = showDollars && hourlyRate > 0
    ? formatCurrency(phase.totalActual * hourlyRate)
    : formatHours(phase.totalActual);

  const remainingDisplay = showDollars && hourlyRate > 0
    ? formatCurrency((phase.remainingHours || 0) * hourlyRate)
    : formatHours(phase.remainingHours || 0);

  return (
    <>
      <TableRow
        sx={{
          '&:hover': { backgroundColor: 'action.hover' },
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: STATUS_COLORS[phase.status] || STATUS_COLORS.pending,
              }}
            />
            <Typography variant="body2" fontWeight={500}>
              {phase.name}
            </Typography>
          </Box>
        </TableCell>
        <TableCell align="right">{budgetDisplay}</TableCell>
        <TableCell align="right">{spentDisplay}</TableCell>
        <TableCell align="right">
          <Typography
            variant="body2"
            sx={{
              color: (phase.remainingHours || 0) < 0 ? 'error.main' : 'text.primary',
            }}
          >
            {remainingDisplay}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(phase.burnPercentage, 100)}
              sx={{
                width: 80,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#374151',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: STATUS_COLORS[phase.budgetStatus] || STATUS_COLORS.no_budget,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {Math.round(phase.burnPercentage)}%
            </Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={getStatusLabel(phase.budgetStatus)}
            size="small"
            color={getStatusColor(phase.budgetStatus)}
            sx={{ fontWeight: 500, fontSize: '0.7rem' }}
          />
        </TableCell>
        <TableCell>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(phase);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>

      {/* Expanded content - Team members (placeholder for future implementation) */}
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 3, backgroundColor: 'action.hover', borderRadius: 1, m: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <PersonIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                Team allocation details coming soon...
              </Typography>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// Weekly Burn Chart Component
interface WeeklyChartProps {
  data: Array<{
    weekStart: string;
    planned: number;
    actual: number;
    variance: number;
  }>;
  loading: boolean;
}

const WeeklyBurnChart: React.FC<WeeklyChartProps> = ({ data, loading }) => {
  if (loading) {
    return <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />;
  }

  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          height: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'action.hover',
          borderRadius: 2,
        }}
      >
        <Typography color="text.secondary">No weekly data available</Typography>
      </Box>
    );
  }

  const chartData = data.map((week) => ({
    week: new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    planned: week.planned,
    actual: week.actual,
    variance: week.variance,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="week" stroke="#9CA3AF" fontSize={12} />
        <YAxis stroke="#9CA3AF" fontSize={12} />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: '#2A2520',
            border: '1px solid #374151',
            borderRadius: 8,
          }}
          labelStyle={{ color: '#F7F6E6' }}
        />
        <Legend />
        <Bar dataKey="planned" fill="#4285F4" name="Planned" radius={[4, 4, 0, 0]} />
        <Bar dataKey="actual" fill="#FF8731" name="Actual" radius={[4, 4, 0, 0]} />
        <ReferenceLine y={0} stroke="#666" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Main Component
export default function BudgetProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data hooks
  const { project, phases, stats, loading: phasesLoading, error: phasesError, refetch: refetchPhases } = useProjectPhases(projectId || null);
  const { data: drilldownData, loading: drilldownLoading, error: drilldownError } = useProjectDrilldown(projectId || null, 8);

  // Dialog states
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [phaseDialogMode, setPhaseDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedPhase, setSelectedPhase] = useState<ProjectPhase | null>(null);
  const [saving, setSaving] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const showDollars = user?.role === 'pm' || user?.role === 'admin';
  const hourlyRate = project?.hourly_rate || 0;

  // Calculate budget status
  const getBudgetStatus = () => {
    if (!project) return 'no_budget';
    const burnPercent = project.burnPercentage || 0;
    if (burnPercent >= 100) return 'over_budget';
    if (burnPercent >= 85) return 'warning';
    if (burnPercent > 0) return 'on_track';
    return 'no_budget';
  };

  const budgetStatus = getBudgetStatus();

  // API handlers (placeholders - would need actual API implementation)
  const handleSaveProject = async (updates: Partial<{ name: string; budget_hours: number; hourly_rate: number; status: string }>) => {
    setSaving(true);
    try {
      // TODO: Implement actual PATCH /api/projects/:id call
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Failed to update project');

      setToast({ message: 'Project updated', severity: 'success' });
      refetchPhases();
    } catch (err) {
      setToast({ message: 'Failed to update project', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhase = async (data: { name: string; budget_hours: number; status: string }) => {
    setSaving(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

      if (phaseDialogMode === 'add') {
        // POST /api/projects/:id/phases
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/phases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to add phase');
        setToast({ message: 'Phase added', severity: 'success' });
      } else {
        // PATCH /api/projects/:id/phases/:phaseId
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/phases/${selectedPhase?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update phase');
        setToast({ message: 'Phase updated', severity: 'success' });
      }

      refetchPhases();
    } catch (err) {
      setToast({ message: phaseDialogMode === 'add' ? 'Failed to add phase' : 'Failed to update phase', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhase = () => {
    setPhaseDialogMode('add');
    setSelectedPhase(null);
    setPhaseDialogOpen(true);
  };

  const handleEditPhase = (phase: ProjectPhase) => {
    setPhaseDialogMode('edit');
    setSelectedPhase(phase);
    setPhaseDialogOpen(true);
  };

  // Loading state - uses 2D wheel spinner
  if (phasesLoading && !project) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ZhuzhWheelSpinner size={48} message="Loading project budget..." py={4} />
      </Container>
    );
  }

  // Error state
  if (phasesError && !project) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {phasesError.message || 'Failed to load project'}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/budget')}
        >
          Back to Budget Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate('/budget')} sx={{ mt: 0.5 }}>
          <ArrowBack />
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
            <Typography variant="h4" fontWeight={600}>
              {project?.name || 'Project'}
            </Typography>
            <Chip
              label={getStatusLabel(budgetStatus)}
              color={getStatusColor(budgetStatus)}
              size="small"
              sx={{ fontWeight: 500 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {/* Client name would come from project data */}
            Project ID: {projectId}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => setEditProjectOpen(true)}
          sx={{ borderColor: '#4B5563', color: 'text.primary' }}
        >
          Edit Project
        </Button>
      </Box>

      {/* Budget Overview Card */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showDollars ? <AttachMoney fontSize="small" /> : <AccessTime fontSize="small" />}
          Budget Overview
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {/* Total Budget */}
          <Box sx={{ flex: 1, minWidth: 150 }}>
            <Typography variant="body2" color="text.secondary">
              Total Budget
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {showDollars && hourlyRate > 0
                ? formatCurrency((project?.budget_hours || 0) * hourlyRate)
                : formatHours(project?.budget_hours || 0)}
            </Typography>
          </Box>

          {/* Total Spent */}
          <Box sx={{ flex: 1, minWidth: 150 }}>
            <Typography variant="body2" color="text.secondary">
              Total Spent
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {showDollars && hourlyRate > 0
                ? formatCurrency((project?.totalActual || 0) * hourlyRate)
                : formatHours(project?.totalActual || 0)}
            </Typography>
          </Box>

          {/* Remaining */}
          <Box sx={{ flex: 1, minWidth: 150 }}>
            <Typography variant="body2" color="text.secondary">
              Remaining
            </Typography>
            <Typography
              variant="h5"
              fontWeight={600}
              sx={{
                color: ((project?.budget_hours || 0) - (project?.totalActual || 0)) < 0
                  ? 'error.main'
                  : 'success.main',
              }}
            >
              {showDollars && hourlyRate > 0
                ? formatCurrency(((project?.budget_hours || 0) - (project?.totalActual || 0)) * hourlyRate)
                : formatHours((project?.budget_hours || 0) - (project?.totalActual || 0))}
            </Typography>
          </Box>

          {/* Burn Rate */}
          <Box sx={{ flex: 1, minWidth: 150 }}>
            <Typography variant="body2" color="text.secondary">
              Burn Rate
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" fontWeight={600}>
                {Math.round(project?.burnPercentage || 0)}%
              </Typography>
              {(project?.burnPercentage || 0) >= 85 ? (
                <TrendingUp sx={{ color: 'error.main' }} />
              ) : (
                <TrendingDown sx={{ color: 'success.main' }} />
              )}
            </Box>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mt: 3 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(project?.burnPercentage || 0, 100)}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: '#374151',
              '& .MuiLinearProgress-bar': {
                backgroundColor: STATUS_COLORS[budgetStatus],
                borderRadius: 6,
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">0%</Typography>
            <Typography variant="caption" color="text.secondary">50%</Typography>
            <Typography variant="caption" color="text.secondary">100%</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Phase Breakdown Table */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Phase Breakdown</Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddPhase}
            variant="outlined"
            size="small"
          >
            Add Phase
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {/* Stats summary */}
        <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
          <Chip
            icon={<CheckCircle sx={{ fontSize: 16 }} />}
            label={`${stats.completedPhases} Complete`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`${stats.activePhases} Active`}
            size="small"
            variant="outlined"
            color="success"
          />
          {stats.phasesAtRisk > 0 && (
            <Chip
              icon={<WarningIcon sx={{ fontSize: 16 }} />}
              label={`${stats.phasesAtRisk} At Risk`}
              size="small"
              variant="outlined"
              color="warning"
            />
          )}
          {stats.phasesOverBudget > 0 && (
            <Chip
              icon={<ErrorIcon sx={{ fontSize: 16 }} />}
              label={`${stats.phasesOverBudget} Over Budget`}
              size="small"
              variant="outlined"
              color="error"
            />
          )}
        </Box>

        {phases.length === 0 ? (
          <Box
            sx={{
              py: 6,
              textAlign: 'center',
              color: 'text.secondary',
              backgroundColor: 'action.hover',
              borderRadius: 2,
            }}
          >
            <Typography variant="body1" gutterBottom>
              No phases yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Break this project into phases for better budget tracking
            </Typography>
            <Button startIcon={<AddIcon />} onClick={handleAddPhase} variant="contained">
              Add First Phase
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Phase</TableCell>
                  <TableCell align="right">Budget</TableCell>
                  <TableCell align="right">Spent</TableCell>
                  <TableCell align="right">Remaining</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {phases.map((phase) => (
                  <PhaseRow
                    key={phase.id}
                    phase={phase}
                    hourlyRate={hourlyRate}
                    showDollars={showDollars}
                    onEdit={handleEditPhase}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Weekly Burn Chart */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Weekly Burn
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <WeeklyBurnChart
          data={drilldownData?.weeks || []}
          loading={drilldownLoading}
        />

        {drilldownData?.biggestVariances && drilldownData.biggestVariances.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Notable Variances
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {drilldownData.biggestVariances.slice(0, 3).map((v, idx) => (
                <Chip
                  key={idx}
                  label={`${new Date(v.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${v.variance > 0 ? '+' : ''}${formatHours(v.variance)}`}
                  size="small"
                  color={v.variance > 0 ? 'error' : 'success'}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Team Hours Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Team Hours
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            color: 'text.secondary',
            backgroundColor: 'action.hover',
            borderRadius: 2,
          }}
        >
          <PersonIcon sx={{ fontSize: 40, opacity: 0.5, mb: 1 }} />
          <Typography variant="body1">
            Team member breakdown coming soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click team members to view their full allocation
          </Typography>
        </Box>
      </Paper>

      {/* Edit Project Dialog */}
      <EditProjectDialog
        open={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        project={project}
        onSave={handleSaveProject}
        saving={saving}
      />

      {/* Add/Edit Phase Dialog */}
      <PhaseDialog
        open={phaseDialogOpen}
        onClose={() => setPhaseDialogOpen(false)}
        phase={selectedPhase}
        onSave={handleSavePhase}
        saving={saving}
        mode={phaseDialogMode}
      />

      {/* Toast notifications */}
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity}
          sx={{ minWidth: 200 }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
