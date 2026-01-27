import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  TextField,
  Button,
  Chip,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { ConfirmationStatus } from '../types/database';
import TimeEntryRow from './TimeEntryRow';
import AddUnplannedWorkModal from './AddUnplannedWorkModal';

interface TimeEntryData {
  id: string;
  projectName: string;
  projectColor: string;
  phaseName?: string;
  plannedHours: number;
  actualHours: number;
  notes?: string;
}

interface ProjectData {
  id: string;
  name: string;
  color: string;
  phases?: Array<{ id: string; name: string }>;
}

interface ConfirmModalProps {
  weekStart: Date;
  entries: TimeEntryData[];
  status: ConfirmationStatus;
  notes?: string;
  projects?: ProjectData[]; // All active projects for unplanned work
  onWeekChange: (date: Date) => void;
  onSubmit: (entries: Array<{ id: string; actualHours: number }>, notes?: string) => void;
}

// Status colors
const STATUS_COLORS: Record<ConfirmationStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: '#4B5563', text: '#E5E7EB', label: 'Draft' },
  submitted: { bg: '#FF8731', text: '#FFFFFF', label: 'Submitted' },
  approved: { bg: '#80FF9C', text: '#1A1917', label: 'Approved' },
  rejected: { bg: '#FF6B6B', text: '#FFFFFF', label: 'Rejected' },
};

// Fallback projects if none provided (shouldn't happen in production)
const FALLBACK_PROJECTS: ProjectData[] = [
  { id: 'internal', name: 'Internal/Admin', color: '#6B7280' },
];

const formatWeekRange = (date: Date): string => {
  const start = new Date(date);
  const end = new Date(date);
  end.setDate(end.getDate() + 4);

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', { ...options, year: 'numeric' });

  return `${startStr} - ${endStr}`;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  weekStart,
  entries: initialEntries,
  status,
  notes: initialNotes,
  projects = FALLBACK_PROJECTS,
  onWeekChange,
  onSubmit,
}) => {
  // Use provided projects for unplanned work modal
  const availableProjects = projects.length > 0 ? projects : FALLBACK_PROJECTS;
  // Local state for editing
  const [localEntries, setLocalEntries] = useState<TimeEntryData[]>(initialEntries);
  const [localNotes, setLocalNotes] = useState(initialNotes || '');
  const [unplannedModalOpen, setUnplannedModalOpen] = useState(false);

  // Sync with props when they change (e.g., week navigation)
  useEffect(() => {
    setLocalEntries(initialEntries);
  }, [initialEntries]);

  useEffect(() => {
    setLocalNotes(initialNotes || '');
  }, [initialNotes]);

  const isEditable = status === 'draft' || status === 'rejected';
  const isSubmitted = status === 'submitted' || status === 'approved';

  const handlePrevWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    onWeekChange(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    onWeekChange(newDate);
  };

  const handleActualHoursChange = (id: string, hours: number) => {
    setLocalEntries(prev =>
      prev.map(entry =>
        entry.id === id ? { ...entry, actualHours: hours } : entry
      )
    );
  };

  const handleNotesClick = (id: string) => {
    const entry = localEntries.find(e => e.id === id);
    if (entry?.notes) {
      alert(`Notes: ${entry.notes}`);
    }
  };

  const handleAddUnplannedWork = (data: {
    projectId: string;
    phaseId?: string;
    hours: number;
    description: string;
    tags: string[];
  }) => {
    const project = availableProjects.find(p => p.id === data.projectId);
    if (!project) return;

    const phase = project.phases?.find(p => p.id === data.phaseId);
    const newEntry: TimeEntryData = {
      id: `unplanned-${Date.now()}`,
      projectName: project.name,
      projectColor: project.color,
      phaseName: phase?.name,
      plannedHours: 0,
      actualHours: data.hours,
      notes: `${data.description}${data.tags.length > 0 ? ` [${data.tags.join(', ')}]` : ''}`,
    };

    setLocalEntries(prev => [...prev, newEntry]);
    setUnplannedModalOpen(false);
  };

  const handleSubmit = () => {
    const submitData = localEntries.map(e => ({
      id: e.id,
      actualHours: e.actualHours
    }));
    onSubmit(submitData, localNotes || undefined);
  };

  // Calculate totals
  const totals = useMemo(() => {
    const planned = localEntries.reduce((sum, e) => sum + e.plannedHours, 0);
    const actual = localEntries.reduce((sum, e) => sum + e.actualHours, 0);
    return { planned, actual, variance: actual - planned };
  }, [localEntries]);

  const statusConfig = STATUS_COLORS[status];

  // Empty state
  if (localEntries.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor: '#2A2520',
          border: '1px solid #374151',
          borderRadius: 3,
          maxWidth: 700,
          mx: 'auto',
          my: 4,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Header with week selector */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={handlePrevWeek}
                sx={{ color: '#9CA3AF', '&:hover': { backgroundColor: '#374151' } }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <Typography variant="h6" sx={{ color: '#F3F4F6', fontWeight: 600, minWidth: 180, textAlign: 'center' }}>
                {formatWeekRange(weekStart)}
              </Typography>
              <IconButton
                onClick={handleNextWeek}
                sx={{ color: '#9CA3AF', '&:hover': { backgroundColor: '#374151' } }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>
            <Chip
              label={statusConfig.label}
              sx={{
                backgroundColor: statusConfig.bg,
                color: statusConfig.text,
                fontWeight: 500,
              }}
            />
          </Box>

          <Typography variant="h5" sx={{ color: '#F3F4F6', fontWeight: 600, mb: 1 }}>
            No Allocations This Week
          </Typography>
          <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 3 }}>
            You don't have any planned work for this week. Use the arrows above to navigate to a different week, or add unplanned work below.
          </Typography>

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setUnplannedModalOpen(true)}
            sx={{
              color: '#9CA3AF',
              borderColor: '#374151',
              '&:hover': {
                borderColor: '#4B5563',
                backgroundColor: 'rgba(75, 85, 99, 0.1)',
              },
            }}
          >
            Add Unplanned Work
          </Button>
        </CardContent>

        <AddUnplannedWorkModal
          open={unplannedModalOpen}
          projects={availableProjects}
          onClose={() => setUnplannedModalOpen(false)}
          onAdd={handleAddUnplannedWork}
        />
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: '#2A2520',
        border: '1px solid #374151',
        borderRadius: 3,
        maxWidth: 700,
        mx: 'auto',
        my: 4,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header with week selector and status */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={handlePrevWeek}
              sx={{ color: '#9CA3AF', '&:hover': { backgroundColor: '#374151' } }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6" sx={{ color: '#F3F4F6', fontWeight: 600, minWidth: 180, textAlign: 'center' }}>
              {formatWeekRange(weekStart)}
            </Typography>
            <IconButton
              onClick={handleNextWeek}
              sx={{ color: '#9CA3AF', '&:hover': { backgroundColor: '#374151' } }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
          <Chip
            label={statusConfig.label}
            sx={{
              backgroundColor: statusConfig.bg,
              color: statusConfig.text,
              fontWeight: 500,
            }}
          />
        </Box>

        {/* Title */}
        <Typography variant="h5" sx={{ color: '#F3F4F6', fontWeight: 600, mb: 1 }}>
          Confirm Your Week
        </Typography>
        <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 3 }}>
          Review your planned hours and enter your actual time spent.
        </Typography>

        {/* Time entries table */}
        <TableContainer
          sx={{
            backgroundColor: '#1A1917',
            borderRadius: 2,
            border: '1px solid #374151',
            mb: 2,
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#374151' }}>
                <TableCell sx={{ color: '#D1D5DB', fontWeight: 600, borderBottom: 'none' }}>
                  Project
                </TableCell>
                <TableCell align="right" sx={{ color: '#D1D5DB', fontWeight: 600, borderBottom: 'none' }}>
                  Planned
                </TableCell>
                <TableCell align="right" sx={{ color: '#D1D5DB', fontWeight: 600, borderBottom: 'none' }}>
                  Actual
                </TableCell>
                <TableCell align="right" sx={{ color: '#D1D5DB', fontWeight: 600, borderBottom: 'none' }}>
                  Variance
                </TableCell>
                <TableCell align="center" sx={{ color: '#D1D5DB', fontWeight: 600, borderBottom: 'none', width: 50 }}>
                  Notes
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {localEntries.map(entry => (
                <TimeEntryRow
                  key={entry.id}
                  entry={{
                    ...entry,
                    phase: entry.phaseName, // Map phaseName to phase for TimeEntryRow
                  }}
                  isEditable={isEditable}
                  onActualHoursChange={handleActualHoursChange}
                  onNotesClick={handleNotesClick}
                />
              ))}
            </TableBody>
            <TableFooter>
              <TableRow sx={{ backgroundColor: '#374151' }}>
                <TableCell sx={{ color: '#F3F4F6', fontWeight: 600, borderBottom: 'none' }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ color: '#F3F4F6', fontWeight: 600, borderBottom: 'none' }}>
                  {totals.planned} hrs
                </TableCell>
                <TableCell align="right" sx={{ color: '#F3F4F6', fontWeight: 600, borderBottom: 'none' }}>
                  {totals.actual} hrs
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 600,
                    borderBottom: 'none',
                    color:
                      totals.variance === 0
                        ? '#6B7280' // gray - on target
                        : totals.variance > 0
                        ? '#EF4444' // red - over budget
                        : '#10B981', // green - under budget
                  }}
                >
                  {totals.variance > 0 ? '+' : ''}
                  {totals.variance !== 0 ? `${totals.variance} hrs` : '-'}
                </TableCell>
                <TableCell sx={{ borderBottom: 'none' }} />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>

        {/* Add Unplanned Work button */}
        {isEditable && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setUnplannedModalOpen(true)}
            sx={{
              color: '#9CA3AF',
              borderColor: '#374151',
              mb: 3,
              '&:hover': {
                borderColor: '#4B5563',
                backgroundColor: 'rgba(75, 85, 99, 0.1)',
              },
            }}
          >
            Add Unplanned Work
          </Button>
        )}

        {/* Notes textarea */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ color: '#D1D5DB', mb: 1 }}>
            Notes (optional)
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            placeholder="Add any notes about your week..."
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            disabled={!isEditable}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#1A1917',
                color: '#F3F4F6',
                '& fieldset': { borderColor: '#374151' },
                '&:hover fieldset': { borderColor: '#4B5563' },
                '&.Mui-focused fieldset': { borderColor: '#FF8731' },
                '&.Mui-disabled': {
                  backgroundColor: '#2A2520',
                  '& fieldset': { borderColor: '#374151' },
                },
              },
              '& .MuiOutlinedInput-input::placeholder': {
                color: '#6B7280',
                opacity: 1,
              },
            }}
          />
        </Box>

        {/* Variance warning */}
        {totals.variance !== 0 && (
          <Box
            sx={{
              backgroundColor: totals.variance > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${totals.variance > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              borderRadius: 2,
              p: 1.5,
              mb: 3,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: totals.variance > 0 ? '#FF6B6B' : '#FFF845',
              }}
            >
              {totals.variance > 0
                ? `You logged ${totals.variance} more hours than planned.`
                : `You logged ${Math.abs(totals.variance)} fewer hours than planned.`}
            </Typography>
          </Box>
        )}

        {/* Submit button */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleSubmit}
          disabled={isSubmitted}
          sx={{
            backgroundColor: isSubmitted ? '#4B5563' : '#80FF9C',
            color: isSubmitted ? '#9CA3AF' : '#1A1917',
            py: 1.5,
            fontWeight: 600,
            '&:hover': {
              backgroundColor: isSubmitted ? '#4B5563' : '#6BE085',
            },
            '&.Mui-disabled': {
              backgroundColor: '#4B5563',
              color: '#9CA3AF',
            },
          }}
        >
          {status === 'submitted'
            ? 'Awaiting Approval'
            : status === 'approved'
            ? 'Already Approved'
            : 'Submit Timesheet'}
        </Button>

        {/* Footer note */}
        <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', textAlign: 'center', mt: 2 }}>
          {isEditable
            ? 'Your timesheet will be reviewed by your PM.'
            : 'Contact your PM for any changes.'}
        </Typography>
      </CardContent>

      {/* Add Unplanned Work Modal */}
      <AddUnplannedWorkModal
        open={unplannedModalOpen}
        projects={MOCK_PROJECTS}
        onClose={() => setUnplannedModalOpen(false)}
        onAdd={handleAddUnplannedWork}
      />
    </Card>
  );
};

export default ConfirmModal;
