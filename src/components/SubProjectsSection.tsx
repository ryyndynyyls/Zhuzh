/**
 * SubProjectsSection
 * Displays and manages sub-projects for umbrella projects like "Google Cloud Next 2026"
 * Shows budget rollups, burn rates, and allows linking/unlinking sub-projects
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Divider,
  LinearProgress,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Tooltip,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
  OpenInNew as OpenIcon,
  AccountTree as TreeIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { useSubProjects } from '../hooks/useSubProjects';
import { glowBorderStyles } from './design-system';

interface SubProjectsSectionProps {
  projectId: string;
  projectColor?: string;
  orgId?: string; // Not currently used, but passed from parent for future use
}

const STATUS_COLORS: Record<string, string> = {
  healthy: '#34A853',
  on_track: '#4285F4',
  warning: '#FBBC04',
  over_budget: '#EA4335',
  no_budget: '#6B7280',
};

export default function SubProjectsSection({ projectId, projectColor }: SubProjectsSectionProps) {
  const navigate = useNavigate();
  const {
    subProjects,
    rollup,
    availableProjects,
    loading,
    saving,
    error,
    linkSubProject,
    unlinkSubProject,
    createSubProject,
  } = useSubProjects(projectId);

  // Menu state for "Add Sub-Project"
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Dialog states
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [unlinkConfirmId, setUnlinkConfirmId] = useState<string | null>(null);
  
  // Create form state
  const [newName, setNewName] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleAddClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleLinkExisting = () => {
    handleMenuClose();
    setLinkDialogOpen(true);
  };

  const handleCreateNew = () => {
    handleMenuClose();
    setCreateDialogOpen(true);
  };

  const handleLinkProject = async (childId: string) => {
    const success = await linkSubProject(childId);
    if (success) {
      setLinkDialogOpen(false);
    }
  };

  const handleUnlinkProject = async () => {
    if (!unlinkConfirmId) return;
    await unlinkSubProject(unlinkConfirmId);
    setUnlinkConfirmId(null);
  };

  const handleCreateSubProject = async () => {
    if (!newName.trim()) return;
    
    const subProject = await createSubProject({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      budget_hours: parseFloat(newBudget) || 0,
    });
    
    if (subProject) {
      setCreateDialogOpen(false);
      setNewName('');
      setNewBudget('');
      setNewDescription('');
    }
  };

  const formatHours = (hours: number) => {
    if (hours >= 1000) {
      return `${(hours / 1000).toFixed(1)}K`;
    }
    return hours.toFixed(0);
  };

  const formatCurrency = (hours: number, rate: number | null) => {
    if (!rate) return null;
    const amount = hours * rate;
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Skeleton variant="text" width={150} height={32} />
        <Skeleton variant="rectangular" height={100} sx={{ mt: 2, borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={60} sx={{ mt: 1, borderRadius: 1 }} />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TreeIcon fontSize="small" color="action" />
          <Typography variant="h6">
            Sub-Projects
          </Typography>
          {rollup && rollup.childCount > 0 && (
            <Chip 
              label={rollup.childCount} 
              size="small" 
              sx={{ ml: 1 }}
            />
          )}
        </Box>
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddClick}
          variant="outlined"
          size="small"
          disabled={saving}
        >
          Add Sub-Project
        </Button>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleLinkExisting} disabled={availableProjects.length === 0}>
            <LinkIcon fontSize="small" sx={{ mr: 1 }} />
            Link Existing Project
          </MenuItem>
          <MenuItem onClick={handleCreateNew}>
            <AddIcon fontSize="small" sx={{ mr: 1 }} />
            Create New Sub-Project
          </MenuItem>
        </Menu>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Rollup Summary (if has sub-projects) */}
      {rollup && rollup.childCount > 0 && (
        <Box
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: 'action.hover',
            borderRadius: 2,
            display: 'flex',
            gap: 3,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Budget
            </Typography>
            <Typography variant="h6">
              {formatHours(rollup.totalBudgetHours)}h
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Incurred
            </Typography>
            <Typography variant="h6">
              {formatHours(rollup.totalActualHours)}h
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Scheduled
            </Typography>
            <Typography variant="h6">
              {formatHours(rollup.totalPlannedHours)}h
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Overall Burn
            </Typography>
            <Typography 
              variant="h6"
              sx={{ 
                color: rollup.totalBudgetHours > 0 
                  ? (rollup.totalActualHours / rollup.totalBudgetHours) >= 0.9 
                    ? 'warning.main' 
                    : 'text.primary'
                  : 'text.secondary'
              }}
            >
              {rollup.totalBudgetHours > 0 
                ? `${Math.round((rollup.totalActualHours / rollup.totalBudgetHours) * 100)}%`
                : '—'}
            </Typography>
          </Box>
          {(rollup.overBudgetCount > 0 || rollup.atRiskCount > 0) && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {rollup.overBudgetCount > 0 && (
                <Chip 
                  icon={<WarningIcon />}
                  label={`${rollup.overBudgetCount} over budget`}
                  color="error"
                  size="small"
                />
              )}
              {rollup.atRiskCount > 0 && (
                <Chip 
                  icon={<TrendingIcon />}
                  label={`${rollup.atRiskCount} at risk`}
                  color="warning"
                  size="small"
                />
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Sub-Project List */}
      {subProjects.length === 0 ? (
        <Box
          sx={{
            py: 6,
            textAlign: 'center',
            color: 'text.secondary',
            backgroundColor: 'action.hover',
            borderRadius: 2,
          }}
        >
          <TreeIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            No sub-projects yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Break this project into components for individual budget tracking with rollup views
          </Typography>
          <Button 
            startIcon={<AddIcon />} 
            onClick={handleAddClick} 
            variant="contained"
          >
            Add First Sub-Project
          </Button>
        </Box>
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
              color: 'text.secondary',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <Box sx={{ width: 16 }} /> {/* Color dot space */}
            <Box sx={{ flex: 1 }}>Name</Box>
            <Box sx={{ width: 80, textAlign: 'right' }}>Budget</Box>
            <Box sx={{ width: 80, textAlign: 'right' }}>Incurred</Box>
            <Box sx={{ width: 120 }}>Burn</Box>
            <Box sx={{ width: 80 }} /> {/* Actions space */}
          </Box>

          {subProjects.map((sub) => (
            <Box
              key={sub.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                mb: 1,
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover',
                },
              }}
            >
              {/* Color dot */}
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: sub.color || projectColor || '#4285F4',
                  flexShrink: 0,
                }}
              />

              {/* Name */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="body2" 
                  fontWeight={500}
                  sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sub.name}
                </Typography>
                {sub.description && (
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                    }}
                  >
                    {sub.description}
                  </Typography>
                )}
              </Box>

              {/* Budget */}
              <Box sx={{ width: 80, textAlign: 'right' }}>
                <Typography variant="body2">
                  {sub.budgetHours > 0 ? `${formatHours(sub.budgetHours)}h` : '—'}
                </Typography>
              </Box>

              {/* Incurred */}
              <Box sx={{ width: 80, textAlign: 'right' }}>
                <Typography variant="body2">
                  {formatHours(sub.totalActual)}h
                </Typography>
              </Box>

              {/* Burn Progress */}
              <Box sx={{ width: 120 }}>
                {sub.budgetHours > 0 ? (
                  <Tooltip title={`${sub.burnPercentage}% of budget used`}>
                    <Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(sub.burnPercentage, 100)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: STATUS_COLORS[sub.budgetStatus],
                            borderRadius: 4,
                          },
                        }}
                      />
                      <Typography 
                        variant="caption" 
                        sx={{ color: STATUS_COLORS[sub.budgetStatus] }}
                      >
                        {sub.burnPercentage}%
                      </Typography>
                    </Box>
                  </Tooltip>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    No budget
                  </Typography>
                )}
              </Box>

              {/* Actions */}
              <Box sx={{ width: 80, display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                <Tooltip title="Open project settings">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/projects/${sub.id}/settings`)}
                  >
                    <OpenIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Unlink from parent">
                  <IconButton
                    size="small"
                    onClick={() => setUnlinkConfirmId(sub.id)}
                    sx={{ '&:hover': { color: 'error.main' } }}
                  >
                    <UnlinkIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}

          {/* Total row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 2,
              py: 1.5,
              mt: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ width: 16 }} />
            <Box sx={{ flex: 1, fontWeight: 600 }}>Total</Box>
            <Box sx={{ width: 80, textAlign: 'right', fontWeight: 600 }}>
              {rollup ? `${formatHours(rollup.totalBudgetHours)}h` : '—'}
            </Box>
            <Box sx={{ width: 80, textAlign: 'right', fontWeight: 600 }}>
              {rollup ? `${formatHours(rollup.totalActualHours)}h` : '—'}
            </Box>
            <Box sx={{ width: 120 }} />
            <Box sx={{ width: 80 }} />
          </Box>
        </>
      )}

      {/* Link Existing Project Dialog */}
      <Dialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            ...glowBorderStyles(projectColor || '#4285F4', {
              intensity: 'subtle',
              animated: false,
            }),
          },
        }}
      >
        <DialogTitle>Link Existing Project</DialogTitle>
        <DialogContent>
          {availableProjects.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No projects available to link. All projects are either already linked to a parent or are this project.
            </Typography>
          ) : (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select a project to link as a sub-project. Its budget will roll up to this parent project.
              </Typography>
              {availableProjects.map((project) => (
                <Box
                  key={project.id}
                  onClick={() => handleLinkProject(project.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: project.color || '#4285F4',
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {project.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {project.budget_hours}h budget • {project.status}
                    </Typography>
                  </Box>
                  <LinkIcon color="action" />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Create New Sub-Project Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            ...glowBorderStyles(projectColor || '#4285F4', {
              intensity: 'subtle',
              animated: false,
            }),
          },
        }}
      >
        <DialogTitle>Create New Sub-Project</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Sub-Project Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="e.g., AI Design Workshop"
            />
            <TextField
              label="Budget Hours"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              type="number"
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">hours</InputAdornment>,
              }}
            />
            <TextField
              label="Description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Brief description of this workstream..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateSubProject}
            variant="contained"
            disabled={!newName.trim() || saving}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unlink Confirmation Dialog */}
      <Dialog
        open={!!unlinkConfirmId}
        onClose={() => setUnlinkConfirmId(null)}
        PaperProps={{
          sx: {
            ...glowBorderStyles(projectColor || '#4285F4', {
              intensity: 'subtle',
              animated: false,
            }),
          },
        }}
      >
        <DialogTitle>Unlink Sub-Project?</DialogTitle>
        <DialogContent>
          <Typography>
            This will remove the parent-child relationship. The project will still exist but won't 
            roll up to this parent's budget.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlinkConfirmId(null)}>Cancel</Button>
          <Button 
            onClick={handleUnlinkProject}
            color="error"
            variant="contained"
            disabled={saving}
          >
            Unlink
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
