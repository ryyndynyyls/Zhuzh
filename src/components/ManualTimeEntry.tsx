/**
 * ManualTimeEntry Component - Modal for logging time manually
 *
 * Allows users to log time for past work without using the timer.
 * Useful for:
 * - Forgot to start timer
 * - Meetings/calls
 * - After-the-fact logging
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { Close, Schedule } from '@mui/icons-material';
import { useTimer } from '../hooks/useTimer';
import { useAuth } from '../contexts/AuthContext';
import { glowBorderStyles, GLOW_COLORS } from './design-system';

interface Project {
  id: string;
  name: string;
  color: string | null;
  phases?: Array<{ id: string; name: string }>;
}

interface ManualTimeEntryProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  defaultProjectId?: string;
}

export default function ManualTimeEntry({
  open,
  onClose,
  projects,
  defaultProjectId,
}: ManualTimeEntryProps) {
  const { user } = useAuth();
  const { logTime, loading } = useTimer({ userId: user?.id, enabled: true });

  // Form state
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [phaseId, setPhaseId] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get phases for selected project
  const selectedProject = projects.find((p) => p.id === projectId);
  const phases = selectedProject?.phases || [];

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setProjectId(defaultProjectId || '');
      setPhaseId('');
      setHours('');
      setMinutes('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError(null);
    }
  }, [open, defaultProjectId]);

  // Handle submit
  const handleSubmit = async () => {
    setError(null);

    // Validate
    if (!projectId) {
      setError('Please select a project');
      return;
    }

    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const totalMinutes = h * 60 + m;

    if (totalMinutes <= 0) {
      setError('Please enter a valid duration');
      return;
    }

    if (totalMinutes > 24 * 60) {
      setError('Duration cannot exceed 24 hours');
      return;
    }

    // Submit
    const result = await logTime(projectId, totalMinutes, {
      phaseId: phaseId || undefined,
      entryDate: date,
      notes: notes || undefined,
    });

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to log time');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          ...glowBorderStyles(GLOW_COLORS.zhuzh, {
            intensity: 'subtle',
            animated: false,
          }),
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Schedule color="primary" />
          Log Time
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {/* Project Selector */}
          <FormControl fullWidth>
            <InputLabel>Project *</InputLabel>
            <Select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setPhaseId(''); // Reset phase when project changes
              }}
              label="Project *"
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: project.color || '#FF8731',
                      }}
                    />
                    {project.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Phase Selector (if project has phases) */}
          {phases.length > 0 && (
            <FormControl fullWidth>
              <InputLabel>Phase</InputLabel>
              <Select
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
                label="Phase"
              >
                <MenuItem value="">
                  <em>No phase</em>
                </MenuItem>
                {phases.map((phase) => (
                  <MenuItem key={phase.id} value={phase.id}>
                    {phase.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Duration */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Duration *
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ min: 0, max: 24 }}
              />
              <Typography color="text.secondary">hours</Typography>
              <TextField
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ min: 0, max: 59 }}
              />
              <Typography color="text.secondary">minutes</Typography>
            </Box>
          </Box>

          {/* Date */}
          <TextField
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          {/* Notes */}
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            placeholder="What did you work on?"
            fullWidth
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !projectId}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          Log Time
        </Button>
      </DialogActions>
    </Dialog>
  );
}
