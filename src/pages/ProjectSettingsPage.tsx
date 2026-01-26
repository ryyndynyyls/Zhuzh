/**
 * ProjectSettingsPage
 * Full settings page for editing project details and phases
 * Route: /projects/:projectId/settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Snackbar,
  Divider,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  InputAdornment,
  Skeleton,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ArrowBack,
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator,
  Circle as CircleIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  SubdirectoryArrowRight,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  LayersOutlined,
} from '@mui/icons-material';
import { useProjectSettings } from '../hooks/useProjectSettings';
import { useAuth } from '../contexts/AuthContext';
import SubProjectsSection from '../components/SubProjectsSection';
import { EmptyState } from '../components/EmptyState';
import { GlowCard } from '../components/design-system';
import type { ProjectPhase, PhaseStatus } from '../types/database';
import { colors, spacing, radii, typography, transitions } from '../styles/tokens';
import { getStaggeredStyle, hoverLift } from '../styles/animations';
import { safeCelebrate } from '../utils/celebrations';

// Project colors palette
const PROJECT_COLORS = [
  '#4285F4', // Blue
  '#EA4335', // Red
  '#FBBC04', // Yellow
  '#34A853', // Green
  '#FF6D01', // Orange
  '#46BDC6', // Teal
  '#7B1FA2', // Purple
  '#C2185B', // Pink
  '#00ACC1', // Cyan
  '#8D6E63', // Brown
];

const STATUS_OPTIONS: { value: PhaseStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: '#6B7280' },
  { value: 'active', label: 'Active', color: '#34A853' },
  { value: 'complete', label: 'Complete', color: '#4285F4' },
];

interface PhaseCardProps {
  phase: ProjectPhase;
  onUpdate: (id: string, updates: Partial<ProjectPhase>) => void;
  onDelete: (id: string) => void;
  saving: boolean;
}

const PhaseCard: React.FC<PhaseCardProps> = ({ phase, onUpdate, onDelete, saving }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [localName, setLocalName] = useState(phase.name);
  const [localBudget, setLocalBudget] = useState(phase.budget_hours?.toString() || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Debounced save for name
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localName !== phase.name && localName.trim()) {
        onUpdate(phase.id, { name: localName.trim() });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localName, phase.id, phase.name, onUpdate]);

  // Debounced save for budget
  useEffect(() => {
    const timer = setTimeout(() => {
      const budgetNum = parseFloat(localBudget) || 0;
      if (budgetNum !== phase.budget_hours) {
        onUpdate(phase.id, { budget_hours: budgetNum });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localBudget, phase.id, phase.budget_hours, onUpdate]);

  const handleStatusChange = (status: PhaseStatus) => {
    onUpdate(phase.id, { status });
  };

  return (
    <Paper
      sx={{
        p: 2,
        mb: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        backgroundColor: isDark ? colors.dark.bg.tertiary : colors.light.bg.tertiary,
        border: `1px solid ${isDark ? colors.dark.border.subtle : colors.light.border.subtle}`,
        borderRadius: radii.md,
        transition: transitions.fast,
        '&:hover': {
          borderColor: isDark ? colors.dark.border.default : colors.light.border.default,
          backgroundColor: isDark ? colors.dark.bg.hover : colors.light.bg.hover,
        },
      }}
    >
      {/* Drag handle (visual only for now) */}
      <Tooltip title="Drag to reorder">
        <DragIndicator sx={{ color: 'text.disabled', cursor: 'grab' }} />
      </Tooltip>

      {/* Phase name */}
      <TextField
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        variant="standard"
        placeholder="Phase name"
        sx={{ flex: 1, minWidth: 150 }}
        InputProps={{
          disableUnderline: true,
          sx: { fontWeight: 500 },
        }}
      />

      {/* Budget hours */}
      <TextField
        value={localBudget}
        onChange={(e) => setLocalBudget(e.target.value)}
        variant="outlined"
        size="small"
        type="number"
        placeholder="0"
        sx={{
          width: 100,
          '& input': {
            fontFamily: typography.fontFamily.mono,
            fontWeight: typography.fontWeight.medium,
          },
        }}
        InputProps={{
          endAdornment: <InputAdornment position="end">h</InputAdornment>,
        }}
      />

      {/* Status */}
      <FormControl size="small" sx={{ minWidth: 110 }}>
        <Select
          value={phase.status || 'pending'}
          onChange={(e) => handleStatusChange(e.target.value as PhaseStatus)}
          sx={{
            '& .MuiSelect-select': {
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            },
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: opt.color,
                  }}
                />
                {opt.label}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Delete */}
      <Tooltip title="Delete phase">
        <IconButton
          onClick={() => setConfirmDelete(true)}
          size="small"
          sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete Phase?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{phase.name}"? This will not delete any time entries 
            associated with this phase, but they will become unassigned.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            onClick={() => {
              onDelete(phase.id);
              setConfirmDelete(false);
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default function ProjectSettingsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    project,
    phases,
    loading,
    saving,
    error,
    updateProject,
    addPhase,
    updatePhase,
    deletePhase,
  } = useProjectSettings(projectId);

  // Local form state
  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localBudget, setLocalBudget] = useState('');
  const [localRate, setLocalRate] = useState('');
  const [localColor, setLocalColor] = useState('#4285F4');
  const [localBillable, setLocalBillable] = useState(true);

  // Toast state
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // Initialize form when project loads
  useEffect(() => {
    if (project) {
      setLocalName(project.name || '');
      setLocalDescription(project.description || '');
      setLocalBudget(project.budget_hours?.toString() || '');
      setLocalRate(project.hourly_rate?.toString() || '');
      setLocalColor(project.color || '#4285F4');
      setLocalBillable(project.is_billable ?? true);
    }
  }, [project]);

  // Debounced project updates
  const debouncedUpdate = useCallback(
    async (field: string, value: any) => {
      const success = await updateProject({ [field]: value });
      if (success) {
        setToast({ message: 'Saved', severity: 'success' });
      }
    },
    [updateProject]
  );

  // Auto-save handlers
  useEffect(() => {
    if (!project || localName === project.name) return;
    const timer = setTimeout(() => {
      if (localName.trim()) {
        debouncedUpdate('name', localName.trim());
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localName, project, debouncedUpdate]);

  useEffect(() => {
    if (!project || localDescription === (project.description || '')) return;
    const timer = setTimeout(() => {
      debouncedUpdate('description', localDescription || null);
    }, 500);
    return () => clearTimeout(timer);
  }, [localDescription, project, debouncedUpdate]);

  useEffect(() => {
    if (!project) return;
    const budgetNum = parseFloat(localBudget) || 0;
    if (budgetNum === project.budget_hours) return;
    const timer = setTimeout(() => {
      debouncedUpdate('budget_hours', budgetNum);
    }, 500);
    return () => clearTimeout(timer);
  }, [localBudget, project, debouncedUpdate]);

  useEffect(() => {
    if (!project) return;
    const rateNum = parseFloat(localRate) || null;
    if (rateNum === project.hourly_rate) return;
    const timer = setTimeout(() => {
      debouncedUpdate('hourly_rate', rateNum);
    }, 500);
    return () => clearTimeout(timer);
  }, [localRate, project, debouncedUpdate]);

  const handleColorChange = async (color: string) => {
    setLocalColor(color);
    await debouncedUpdate('color', color);
  };

  const handleBillableChange = async (billable: boolean) => {
    setLocalBillable(billable);
    await debouncedUpdate('is_billable', billable);
  };

  const handleAddPhase = async () => {
    const newPhase = await addPhase({
      name: 'New Phase',
      budget_hours: 0,
      status: 'pending',
    });
    if (newPhase) {
      setToast({ message: 'Phase added', severity: 'success' });
    }
  };

  const handleUpdatePhase = async (phaseId: string, updates: Partial<ProjectPhase>) => {
    const success = await updatePhase(phaseId, updates);
    if (success) {
      setToast({ message: 'Saved', severity: 'success' });
    }
  };

  const handleDeletePhase = async (phaseId: string) => {
    const success = await deletePhase(phaseId);
    if (success) {
      setToast({ message: 'Phase deleted', severity: 'success' });
    }
  };

  // Calculate phase budget total
  const totalPhaseBudget = phases.reduce((sum, p) => sum + (p.budget_hours || 0), 0);
  const projectBudget = parseFloat(localBudget) || 0;
  const budgetMismatch = projectBudget > 0 && totalPhaseBudget !== projectBudget;

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 3, borderRadius: 2 }} />
      </Container>
    );
  }

  if (!project) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Project not found</Alert>
        <Button onClick={() => navigate('/budget')} sx={{ mt: 2 }}>
          Back to Budget
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Gradient Hero Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${localColor} 0%, ${localColor}99 100%)`,
          p: 3,
          mb: 3,
          borderRadius: 3,
          position: 'relative',
        }}
      >
        {/* Back button */}
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            color: 'rgba(255,255,255,0.8)',
            '&:hover': { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)' },
          }}
        >
          <ArrowBack />
        </IconButton>

        {/* Saving indicator */}
        {saving && (
          <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            <CircularProgress size={20} sx={{ color: 'rgba(255,255,255,0.8)' }} />
          </Box>
        )}

        {/* Project indicator */}
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: '#1E1D1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid white',
            mb: 1.5,
            ml: 5, // Offset for back button
          }}
        >
          <SettingsIcon sx={{ color: localColor, fontSize: 24 }} />
        </Box>

        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, ml: 5 }}>
          Project Settings
        </Typography>

        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.5, ml: 5 }}>
          {project?.name}
        </Typography>
      </Box>

      {/* Sub-project indicator */}
      {project.parentProject && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 3,
            ml: 7, // Align with title (past back button)
            color: 'text.secondary',
          }}
        >
          <SubdirectoryArrowRight sx={{ fontSize: 18, transform: 'scaleX(-1)' }} />
          <Typography variant="body2">
            Sub-project of{' '}
            <Box
              component="span"
              onClick={() => navigate(`/projects/${project.parentProject!.id}/settings`)}
              sx={{
                color: 'primary.main',
                cursor: 'pointer',
                fontWeight: 500,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {project.parentProject.name}
            </Box>
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Project Details */}
      <GlowCard
        glowColor={localColor}
        intensity="subtle"
        animated={false}
        header={{ icon: <SettingsIcon />, title: 'Project Details' }}
        sx={{ mb: 3 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Name */}
          <TextField
            label="Project Name"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            fullWidth
            required
          />

          {/* Description */}
          <TextField
            label="Description"
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Brief project description..."
          />

          {/* Budget & Rate row */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Total Budget"
              value={localBudget}
              onChange={(e) => setLocalBudget(e.target.value)}
              type="number"
              sx={{ flex: 1 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">hours</InputAdornment>,
              }}
            />
            <TextField
              label="Hourly Rate"
              value={localRate}
              onChange={(e) => setLocalRate(e.target.value)}
              type="number"
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Box>

          {/* Billable toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={localBillable}
                onChange={(e) => handleBillableChange(e.target.checked)}
                color="primary"
              />
            }
            label="Billable project"
          />

          {/* Color picker */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Project Color
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {PROJECT_COLORS.map((color) => (
                <IconButton
                  key={color}
                  onClick={() => handleColorChange(color)}
                  sx={{
                    p: 0.5,
                    border: localColor === color ? '2px solid' : '2px solid transparent',
                    borderColor: localColor === color ? 'primary.main' : 'transparent',
                    borderRadius: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      backgroundColor: color,
                    }}
                  />
                </IconButton>
              ))}
            </Box>
          </Box>

          {/* Client info (read-only for now) */}
          {project.client && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Client
              </Typography>
              <Typography variant="body1">{project.client.name}</Typography>
            </Box>
          )}
        </Box>
      </GlowCard>

      {/* Phases Section */}
      <GlowCard
        glowColor={localColor}
        intensity="subtle"
        animated={false}
        header={{ icon: <LayersOutlined />, title: 'Phases' }}
        sx={{ mb: 3 }}
      >
        {/* Add Phase Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddPhase}
            variant="outlined"
            size="small"
            sx={{
              borderColor: colors.brand.orange,
              color: colors.brand.orange,
              '&:hover': {
                borderColor: colors.brand.orange,
                backgroundColor: 'rgba(255, 135, 49, 0.08)',
              },
            }}
          >
            Add Phase
          </Button>
        </Box>

        {/* Budget mismatch warning */}
        {budgetMismatch && (
          <Alert 
            severity="warning" 
            icon={<WarningIcon />}
            sx={{ mb: 2 }}
          >
            Phase budgets ({totalPhaseBudget}h) don't match project budget ({projectBudget}h)
          </Alert>
        )}

        {/* Phase list */}
        {phases.length === 0 ? (
          <EmptyState
            icon={<LayersOutlined />}
            title="No phases yet"
            description="Break this project into phases to track budgets more granularly."
            actionLabel="Add First Phase"
            onAction={handleAddPhase}
          />
        ) : (
          <>
            {/* Header row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1,
                color: isDark ? colors.dark.text.tertiary : colors.light.text.tertiary,
                fontSize: typography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: typography.letterSpacing.wider,
                fontWeight: typography.fontWeight.medium,
              }}
            >
              <Box sx={{ width: 24 }} /> {/* Drag handle space */}
              <Box sx={{ flex: 1 }}>Name</Box>
              <Box sx={{ width: 100, textAlign: 'center' }}>Budget</Box>
              <Box sx={{ width: 110, textAlign: 'center' }}>Status</Box>
              <Box sx={{ width: 40 }} /> {/* Delete space */}
            </Box>

            {phases.map((phase) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                onUpdate={handleUpdatePhase}
                onDelete={handleDeletePhase}
                saving={saving}
              />
            ))}

            {/* Total */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.5,
                mt: 1,
                borderTop: `1px solid ${isDark ? colors.dark.border.subtle : colors.light.border.subtle}`,
              }}
            >
              <Box sx={{ width: 24 }} />
              <Box sx={{ flex: 1, fontWeight: typography.fontWeight.semibold }}>Total</Box>
              <Box
                sx={{
                  width: 100,
                  textAlign: 'center',
                  fontWeight: typography.fontWeight.semibold,
                  fontFamily: typography.fontFamily.mono,
                  color: budgetMismatch ? (isDark ? colors.dark.warning.text : colors.light.warning.text) : (isDark ? colors.dark.text.primary : colors.light.text.primary),
                }}
              >
                {totalPhaseBudget}h
              </Box>
              <Box sx={{ width: 110 }} />
              <Box sx={{ width: 40 }} />
            </Box>
          </>
        )}
      </GlowCard>

      {/* Budget Summary Card */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: isDark ? colors.dark.bg.secondary : colors.light.bg.secondary,
          border: `1px solid ${isDark ? colors.dark.border.subtle : colors.light.border.subtle}`,
          borderRadius: radii.lg,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AssessmentIcon sx={{ color: isDark ? colors.dark.text.secondary : colors.light.text.secondary, fontSize: 20 }} />
          <Typography variant="h6">Budget Summary</Typography>
        </Box>
        <Divider sx={{ mb: 3, borderColor: isDark ? colors.dark.border.subtle : colors.light.border.subtle }} />

        {(() => {
          const budget = parseFloat(localBudget) || 0;
          const actual = project?.totalActual || 0;
          const remaining = budget - actual;
          const burnPercent = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;
          const isOverBudget = actual > budget && budget > 0;
          const isAtRisk = burnPercent >= 80 && !isOverBudget;

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Metrics Row */}
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {/* Budget */}
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? colors.dark.text.tertiary : colors.light.text.tertiary,
                      textTransform: 'uppercase',
                      letterSpacing: typography.letterSpacing.wider,
                      fontSize: typography.fontSize.xs,
                    }}
                  >
                    Total Budget
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontFamily: typography.fontFamily.mono,
                      fontWeight: typography.fontWeight.semibold,
                      color: isDark ? colors.dark.text.primary : colors.light.text.primary,
                    }}
                  >
                    {budget > 0 ? `${budget}h` : '—'}
                  </Typography>
                </Box>

                {/* Actual */}
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? colors.dark.text.tertiary : colors.light.text.tertiary,
                      textTransform: 'uppercase',
                      letterSpacing: typography.letterSpacing.wider,
                      fontSize: typography.fontSize.xs,
                    }}
                  >
                    Hours Used
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontFamily: typography.fontFamily.mono,
                      fontWeight: typography.fontWeight.semibold,
                      color: isOverBudget
                        ? (isDark ? colors.dark.error.text : colors.light.error.text)
                        : isAtRisk
                        ? (isDark ? colors.dark.warning.text : colors.light.warning.text)
                        : (isDark ? colors.dark.text.primary : colors.light.text.primary),
                    }}
                  >
                    {actual.toFixed(1)}h
                  </Typography>
                </Box>

                {/* Remaining */}
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? colors.dark.text.tertiary : colors.light.text.tertiary,
                      textTransform: 'uppercase',
                      letterSpacing: typography.letterSpacing.wider,
                      fontSize: typography.fontSize.xs,
                    }}
                  >
                    Remaining
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontFamily: typography.fontFamily.mono,
                        fontWeight: typography.fontWeight.semibold,
                        color: isOverBudget
                          ? (isDark ? colors.dark.error.text : colors.light.error.text)
                          : remaining > 0
                          ? (isDark ? colors.dark.success.text : colors.light.success.text)
                          : (isDark ? colors.dark.text.primary : colors.light.text.primary),
                      }}
                    >
                      {budget > 0 ? `${remaining.toFixed(1)}h` : '—'}
                    </Typography>
                    {isOverBudget && (
                      <TrendingDownIcon sx={{ color: isDark ? colors.dark.error.text : colors.light.error.text, fontSize: 18 }} />
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Progress Bar */}
              {budget > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: isDark ? colors.dark.text.secondary : colors.light.text.secondary }}>
                      Budget consumed
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: typography.fontFamily.mono,
                        color: isOverBudget
                          ? (isDark ? colors.dark.error.text : colors.light.error.text)
                          : isAtRisk
                          ? (isDark ? colors.dark.warning.text : colors.light.warning.text)
                          : (isDark ? colors.dark.success.text : colors.light.success.text),
                        fontWeight: typography.fontWeight.semibold,
                      }}
                    >
                      {burnPercent.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={burnPercent}
                    sx={{
                      height: 8,
                      borderRadius: radii.full,
                      backgroundColor: isDark ? colors.dark.bg.tertiary : colors.light.bg.tertiary,
                      '& .MuiLinearProgress-bar': {
                        borderRadius: radii.full,
                        backgroundColor: isOverBudget
                          ? (isDark ? colors.dark.error.text : colors.light.error.text)
                          : isAtRisk
                          ? (isDark ? colors.dark.warning.text : colors.light.warning.text)
                          : (isDark ? colors.dark.success.text : colors.light.success.text),
                      },
                    }}
                  />
                </Box>
              )}

              {/* Status Indicator */}
              {budget > 0 && (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: radii.md,
                    backgroundColor: isOverBudget
                      ? (isDark ? colors.dark.error.bg : colors.light.error.bg)
                      : isAtRisk
                      ? (isDark ? colors.dark.warning.bg : colors.light.warning.bg)
                      : (isDark ? colors.dark.success.bg : colors.light.success.bg),
                    border: `1px solid ${
                      isOverBudget
                        ? (isDark ? colors.dark.error.border : colors.light.error.border)
                        : isAtRisk
                        ? (isDark ? colors.dark.warning.border : colors.light.warning.border)
                        : (isDark ? colors.dark.success.border : colors.light.success.border)
                    }`,
                    alignSelf: 'flex-start',
                  }}
                >
                  {isOverBudget ? (
                    <TrendingDownIcon sx={{ fontSize: 16, color: isDark ? colors.dark.error.text : colors.light.error.text }} />
                  ) : (
                    <TrendingUpIcon
                      sx={{ fontSize: 16, color: isAtRisk ? (isDark ? colors.dark.warning.text : colors.light.warning.text) : (isDark ? colors.dark.success.text : colors.light.success.text) }}
                    />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: typography.fontWeight.medium,
                      color: isOverBudget
                        ? (isDark ? colors.dark.error.text : colors.light.error.text)
                        : isAtRisk
                        ? (isDark ? colors.dark.warning.text : colors.light.warning.text)
                        : (isDark ? colors.dark.success.text : colors.light.success.text),
                    }}
                  >
                    {isOverBudget ? 'Over budget' : isAtRisk ? 'At risk' : 'On track'}
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })()}
      </Paper>

      {/* Sub-Projects Section */}
      {projectId && project?.org_id && (
        <SubProjectsSection projectId={projectId} orgId={project.org_id} />
      )}

      {/* Danger Zone */}
      <Paper
        sx={{
          p: 3,
          backgroundColor: isDark ? colors.dark.error.bg : colors.light.error.bg,
          border: `1px solid ${isDark ? colors.dark.error.border : colors.light.error.border}`,
          borderRadius: radii.lg,
        }}
      >
        <Typography variant="h6" sx={{ color: isDark ? colors.dark.error.text : colors.light.error.text }} gutterBottom>
          Danger Zone
        </Typography>
        <Divider sx={{ my: 2, borderColor: isDark ? colors.dark.error.border : colors.light.error.border }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body1" fontWeight={typography.fontWeight.medium}>
              Archive Project
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? colors.dark.text.secondary : colors.light.text.secondary }}>
              Hide this project from active views. Can be restored from Admin → Archives.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            sx={{
              borderColor: isDark ? colors.dark.error.text : colors.light.error.text,
              color: isDark ? colors.dark.error.text : colors.light.error.text,
              '&:hover': {
                borderColor: isDark ? colors.dark.error.text : colors.light.error.text,
                backgroundColor: 'rgba(255, 107, 107, 0.12)',
              },
            }}
            onClick={async () => {
              try {
                const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
                const res = await fetch(`${API_BASE}/api/projects/${projectId}/archive`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reason: 'Archived from project settings' }),
                });
                if (res.ok) {
                  safeCelebrate('small'); // Sparkle on archive
                  setToast({ message: 'Project archived', severity: 'success' });
                  setTimeout(() => navigate('/budget'), 1500);
                } else {
                  throw new Error('Failed to archive');
                }
              } catch (err) {
                setToast({ message: 'Failed to archive project', severity: 'error' });
              }
            }}
          >
            Archive
          </Button>
        </Box>
      </Paper>

      {/* Toast notifications */}
      <Snackbar
        open={!!toast}
        autoHideDuration={2000}
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
