/**
 * Time Tracker Widget - Floating edge widget for live time tracking
 *
 * This widget sits on the right edge of the screen and expands on hover.
 * Users can select a project and start/stop a timer.
 *
 * Updated to use the backend API for persistent timer state.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Paper,
  Chip,
  InputLabel,
  CircularProgress,
  Collapse,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Timer,
  PlayArrow,
  Stop,
  Close,
  AccessTime,
  Add,
  Schedule,
} from '@mui/icons-material';
import { useTimer } from '../hooks/useTimer';
import { useProjects } from '../hooks/useProjects';
import ManualTimeEntry from './ManualTimeEntry';

const WIDGET_COLLAPSED_WIDTH = 48;
const WIDGET_EXPANDED_WIDTH = 320;

export const TimeTrackerWidget: React.FC<{ userId?: string; orgId?: string }> = ({
  userId,
  orgId,
}) => {
  // Use our new timer hook
  const {
    currentTimer,
    todaySummary,
    isRunning,
    elapsedFormatted,
    elapsedSeconds,
    loading,
    error,
    startTimer,
    stopTimer,
  } = useTimer({ userId, enabled: !!userId });

  // Get projects
  const { projects } = useProjects({ isActive: true });

  // Local state
  const [expanded, setExpanded] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep expanded if timer is running
  useEffect(() => {
    if (isRunning) {
      setExpanded(true);
    }
  }, [isRunning]);

  // Update selected project when timer changes
  useEffect(() => {
    if (currentTimer?.project_id) {
      setSelectedProjectId(currentTimer.project_id);
    }
  }, [currentTimer?.project_id]);

  // Keyboard shortcut: Cmd+Shift+T to toggle timer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 't') {
        e.preventDefault();
        if (isRunning) {
          handleStopTimer();
        } else if (selectedProjectId) {
          handleStartTimer();
        } else {
          // Expand widget if no project selected
          setExpanded(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, selectedProjectId]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setExpanded(true);
  };

  const handleMouseLeave = () => {
    // Don't collapse if there's an active session
    if (isRunning) return;

    hoverTimeoutRef.current = setTimeout(() => {
      setExpanded(false);
    }, 300);
  };

  const handleStartTimer = async () => {
    if (!selectedProjectId) {
      setSnackbar({ open: true, message: 'Select a project first', severity: 'error' });
      return;
    }

    const result = await startTimer(selectedProjectId, undefined, notes || undefined);
    if (result.success) {
      setNotes('');
      const projectName = projects.find((p) => p.id === selectedProjectId)?.name || 'project';
      setSnackbar({ open: true, message: `Timer started on ${projectName}`, severity: 'success' });
    } else {
      setSnackbar({ open: true, message: result.error || 'Failed to start', severity: 'error' });
    }
  };

  const handleStopTimer = async () => {
    const result = await stopTimer(notes || undefined);
    if (result.success) {
      setNotes('');
      const duration = result.duration?.formatted || '';
      setSnackbar({ open: true, message: `Logged ${duration}`, severity: 'success' });
    } else {
      setSnackbar({ open: true, message: result.error || 'Failed to stop', severity: 'error' });
    }
  };

  const handleClose = () => {
    setExpanded(false);
  };

  // Get current project info
  const currentProject = isRunning
    ? projects.find((p) => p.id === currentTimer?.project_id)
    : projects.find((p) => p.id === selectedProjectId);

  return (
    <>
      <Box
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1300,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Collapsed state - just the tab */}
        <Collapse in={!expanded} orientation="horizontal">
          <Box
            sx={{
              width: WIDGET_COLLAPSED_WIDTH,
              height: 120,
              bgcolor: isRunning ? '#FF8731' : '#2A2520',
              borderRadius: '8px 0 0 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '-2px 0 8px rgba(0,0,0,0.3)',
              border: '1px solid',
              borderColor: isRunning ? '#FF8731' : '#374151',
              borderRight: 'none',
            }}
          >
            <Timer sx={{ color: isRunning ? '#1A1917' : '#9CA3AF', fontSize: 28 }} />
            {isRunning && (
              <Typography
                variant="caption"
                sx={{
                  color: '#1A1917',
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  mt: 1,
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  transform: 'rotate(180deg)',
                }}
              >
                {elapsedFormatted}
              </Typography>
            )}
          </Box>
        </Collapse>

        {/* Expanded state */}
        <Collapse in={expanded} orientation="horizontal">
          <Paper
            elevation={8}
            sx={{
              width: WIDGET_EXPANDED_WIDTH,
              bgcolor: '#2A2520',
              borderRadius: '8px 0 0 8px',
              border: '1px solid #374151',
              borderRight: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                bgcolor: isRunning ? '#FF8731' : '#374151',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timer sx={{ color: isRunning ? '#1A1917' : '#E5E7EB' }} />
                <Typography
                  variant="subtitle2"
                  sx={{ color: isRunning ? '#1A1917' : '#E5E7EB', fontWeight: 600 }}
                >
                  Time Tracker
                </Typography>
              </Box>
              {!isRunning && (
                <IconButton size="small" onClick={handleClose} sx={{ color: '#9CA3AF' }}>
                  <Close fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Content */}
            <Box sx={{ p: 2 }}>
              {isRunning ? (
                // Active session view
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Currently tracking
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#E5E7EB', mb: 1 }}>
                    {currentProject?.name || 'Unknown project'}
                  </Typography>

                  {/* Timer display */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#1A1917',
                      borderRadius: 2,
                      py: 2,
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: '#FF8731',
                        mr: 1.5,
                        animation: 'pulse 1.5s ease-in-out infinite',
                        '@keyframes pulse': {
                          '0%, 100%': { opacity: 1 },
                          '50%': { opacity: 0.3 },
                        },
                      }}
                    />
                    <Typography
                      variant="h4"
                      sx={{
                        color: '#FF8731',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    >
                      {elapsedFormatted}
                    </Typography>
                  </Box>

                  {/* Notes field */}
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Add notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        color: '#E5E7EB',
                        '& fieldset': { borderColor: '#374151' },
                        '&:hover fieldset': { borderColor: '#6B7280' },
                        '&.Mui-focused fieldset': { borderColor: '#FF8731' },
                      },
                    }}
                  />

                  {/* Stop button */}
                  <Box
                    onClick={handleStopTimer}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      bgcolor: '#EF4444',
                      color: 'white',
                      py: 1.5,
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#DC2626',
                      },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <>
                        <Stop />
                        <Typography variant="button">Stop & Log Time</Typography>
                      </>
                    )}
                  </Box>
                </Box>
              ) : (
                // Project selection view
                <Box>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: '#9CA3AF' }}>Select Project</InputLabel>
                    <Select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      label="Select Project"
                      sx={{
                        color: '#E5E7EB',
                        '.MuiOutlinedInput-notchedOutline': {
                          borderColor: '#374151',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6B7280',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#FF8731',
                        },
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            bgcolor: '#2A2520',
                            border: '1px solid #374151',
                            maxHeight: 300,
                          },
                        },
                      }}
                    >
                      {projects.map((project) => (
                        <MenuItem
                          key={project.id}
                          value={project.id}
                          sx={{
                            color: '#E5E7EB',
                            '&:hover': { bgcolor: '#374151' },
                            '&.Mui-selected': { bgcolor: '#374151' },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: project.color || '#FF8731',
                              }}
                            />
                            <Box>
                              <Typography variant="body2">{project.name}</Typography>
                              {project.client && (
                                <Typography variant="caption" color="text.secondary">
                                  {(project.client as any)?.name}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Start button */}
                  <Box
                    onClick={selectedProjectId ? handleStartTimer : undefined}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      bgcolor: selectedProjectId ? '#10B981' : '#374151',
                      color: selectedProjectId ? 'white' : '#6B7280',
                      py: 1.5,
                      borderRadius: 1,
                      cursor: selectedProjectId ? 'pointer' : 'not-allowed',
                      mb: 2,
                      '&:hover': {
                        bgcolor: selectedProjectId ? '#059669' : '#374151',
                      },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <>
                        <PlayArrow />
                        <Typography variant="button">Start Timer</Typography>
                      </>
                    )}
                  </Box>

                  {/* Manual entry button */}
                  <Box
                    onClick={() => setShowManualEntry(true)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      color: '#9CA3AF',
                      py: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: '1px dashed #374151',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.05)',
                        borderColor: '#6B7280',
                      },
                    }}
                  >
                    <Add fontSize="small" />
                    <Typography variant="caption">Log time manually</Typography>
                  </Box>

                  {/* Today's summary */}
                  {todaySummary && todaySummary.totals.grandTotalMinutes > 0 && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #374151' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Schedule sx={{ fontSize: 16, color: '#9CA3AF' }} />
                        <Typography variant="caption" color="text.secondary">
                          Today: {todaySummary.totals.grandTotalFormatted}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {todaySummary.byProject.slice(0, 3).map((p) => (
                          <Chip
                            key={p.id}
                            label={`${p.name.slice(0, 12)}${p.name.length > 12 ? '...' : ''}: ${p.totalFormatted}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: 'transparent',
                              border: '1px solid',
                              borderColor: '#374151',
                              color: '#9CA3AF',
                              borderLeft: '3px solid',
                              borderLeftColor: p.color || '#FF8731',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Slack commands hint */}
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #374151' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Slack: <code style={{ color: '#9CA3AF' }}>/start-timer</code>{' '}
                      <code style={{ color: '#9CA3AF' }}>/stop-timer</code>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Shortcut: <kbd style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: '#374151',
                        fontSize: '0.65rem',
                      }}>⌘⇧T</kbd>
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Collapse>
      </Box>

      {/* Manual Entry Modal */}
      <ManualTimeEntry
        open={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        projects={projects}
        defaultProjectId={selectedProjectId}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
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
};

export default TimeTrackerWidget;
