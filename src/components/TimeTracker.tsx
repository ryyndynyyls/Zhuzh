/**
 * TimeTracker Component - Main Timer UI
 *
 * A bottom bar or floating widget for tracking time.
 * Shows:
 * - Current timer status (running/stopped)
 * - Project selector (from user's allocations)
 * - Start/stop controls
 * - Today's total
 * - Manual entry button
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
  Chip,
  Paper,
  Collapse,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Timer,
  Add,
  ExpandMore,
  ExpandLess,
  Schedule,
  Close,
} from '@mui/icons-material';
import { useTimer, formatDuration } from '../hooks/useTimer';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../contexts/AuthContext';
import ManualTimeEntry from './ManualTimeEntry';

interface TimeTrackerProps {
  position?: 'bottom' | 'floating';
}

export default function TimeTracker({ position = 'bottom' }: TimeTrackerProps) {
  const { user } = useAuth();
  const { projects } = useProjects({ isActive: true });

  const {
    currentTimer,
    todaySummary,
    isRunning,
    elapsedFormatted,
    loading,
    error,
    startTimer,
    stopTimer,
  } = useTimer({ userId: user?.id, enabled: true });

  // Local state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [expanded, setExpanded] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [notes, setNotes] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Update selected project when timer changes
  useEffect(() => {
    if (currentTimer?.project_id) {
      setSelectedProjectId(currentTimer.project_id);
    }
  }, [currentTimer?.project_id]);

  // Handle start timer
  const handleStart = async () => {
    if (!selectedProjectId) {
      setSnackbar({ open: true, message: 'Select a project first', severity: 'error' });
      return;
    }

    const result = await startTimer(selectedProjectId, undefined, notes || undefined);
    if (result.success) {
      setNotes('');
      setSnackbar({ open: true, message: `Timer started`, severity: 'success' });
    } else {
      setSnackbar({ open: true, message: result.error || 'Failed to start', severity: 'error' });
    }
  };

  // Handle stop timer
  const handleStop = async () => {
    const result = await stopTimer(notes || undefined);
    if (result.success) {
      setNotes('');
      const duration = result.duration?.formatted || '';
      setSnackbar({ open: true, message: `Logged ${duration}`, severity: 'success' });
    } else {
      setSnackbar({ open: true, message: result.error || 'Failed to stop', severity: 'error' });
    }
  };

  // Get the current project
  const currentProject = isRunning
    ? projects.find((p) => p.id === currentTimer?.project_id)
    : projects.find((p) => p.id === selectedProjectId);

  // Bottom bar style
  const bottomBarSx = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    bgcolor: 'background.paper',
    borderTop: '1px solid',
    borderColor: 'divider',
    zIndex: 1200,
    px: 2,
    py: 1,
  };

  // Floating widget style
  const floatingSx = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 4,
    zIndex: 1200,
    minWidth: 300,
  };

  return (
    <>
      <Paper sx={position === 'bottom' ? bottomBarSx : floatingSx} elevation={position === 'floating' ? 8 : 0}>
        {/* Main Timer Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {/* Play/Stop Button */}
          {isRunning ? (
            <Tooltip title="Stop timer">
              <IconButton
                onClick={handleStop}
                disabled={loading}
                sx={{
                  bgcolor: 'error.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'error.dark' },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : <Stop />}
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Start timer">
              <IconButton
                onClick={handleStart}
                disabled={loading || !selectedProjectId}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : <PlayArrow />}
              </IconButton>
            </Tooltip>
          )}

          {/* Project Selector */}
          <FormControl size="small" sx={{ minWidth: 200, flex: '1 1 auto', maxWidth: 350 }}>
            <Select
              value={isRunning ? currentTimer?.project_id : selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={isRunning}
              displayEmpty
              sx={{
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                },
              }}
            >
              <MenuItem value="" disabled>
                <Typography color="text.secondary">Select project...</Typography>
              </MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: project.color || '#FF8731',
                      mr: 1,
                      flexShrink: 0,
                    }}
                  />
                  <Typography noWrap>{project.name}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Timer Display */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 100,
            }}
          >
            {isRunning && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'warning.main',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                  },
                }}
              />
            )}
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 600,
                color: isRunning ? 'warning.main' : 'text.secondary',
              }}
            >
              {elapsedFormatted}
            </Typography>
          </Box>

          {/* Today's Total */}
          {todaySummary && (
            <Chip
              icon={<Schedule sx={{ fontSize: 16 }} />}
              label={`Today: ${todaySummary.totals.grandTotalFormatted}`}
              size="small"
              variant="outlined"
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            />
          )}

          {/* Manual Entry Button */}
          <Tooltip title="Log time manually">
            <IconButton onClick={() => setShowManualEntry(true)} size="small">
              <Add />
            </IconButton>
          </Tooltip>

          {/* Expand/Collapse */}
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        {/* Expanded Section */}
        <Collapse in={expanded}>
          <Box sx={{ pt: 2, pb: 1 }}>
            {/* Notes Field */}
            <TextField
              size="small"
              fullWidth
              placeholder="Add notes (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mb: 2 }}
            />

            {/* Today's Breakdown */}
            {todaySummary && todaySummary.byProject.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Today's breakdown
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                  {todaySummary.byProject.map((p) => (
                    <Chip
                      key={p.id}
                      size="small"
                      label={`${p.name}: ${p.totalFormatted}`}
                      sx={{
                        borderLeft: '3px solid',
                        borderLeftColor: p.color || '#FF8731',
                        borderRadius: 1,
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Keyboard Shortcut Hint */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Keyboard shortcut: <kbd style={{
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>Cmd+Shift+T</kbd> to start/stop
            </Typography>
          </Box>
        </Collapse>
      </Paper>

      {/* Manual Entry Modal */}
      <ManualTimeEntry
        open={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        projects={projects}
      />

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: position === 'bottom' ? 8 : 0 }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
