import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Alert, Snackbar, IconButton, Typography } from '@mui/material';
import { ZhuzhSectionLoader } from '../components/ZhuzhPageLoader';
import { EventBusyOutlined, ChevronLeft, ChevronRight } from '@mui/icons-material';
import ConfirmModal from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';
import { useAllocations } from '../hooks/useAllocations';
import { useConfirmation } from '../hooks/useConfirmations';
import { useAuth } from '../contexts/AuthContext';
import { safeCelebrate } from '../utils/celebrations';

// Helper to get current week start (Monday)
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  // If Sunday (0), go back 6 days. Otherwise go back (day - 1) days to get Monday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export function TimesheetPage() {
  const { weekStart: weekStartParam } = useParams<{ weekStart?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Use URL param or default to current week
  const weekStart = weekStartParam || getCurrentWeekStart();

  const { allocations, loading: allocationsLoading, error: allocationsError } = useAllocations({
    weekStart,
    userId: user?.id
  });

  const {
    confirmation,
    loading: confirmationLoading,
    error: confirmationError,
    submitConfirmation
  } = useConfirmation(user?.id, weekStart);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const loading = allocationsLoading || confirmationLoading;
  const error = allocationsError || confirmationError;

  // Transform allocations to entries format
  const entries = useMemo(() => {
    return allocations.map(alloc => {
      // Check if there's a submitted entry for this allocation
      const existingEntry = confirmation?.entries?.find(e => e.allocation_id === alloc.id);

      return {
        id: alloc.id,
        projectName: alloc.project?.name || 'Unknown',
        projectColor: alloc.project?.color || '#6B7280',
        phaseName: alloc.phase?.name,
        plannedHours: alloc.planned_hours,
        actualHours: existingEntry?.actual_hours ?? alloc.planned_hours,
        notes: existingEntry?.notes
      };
    });
  }, [allocations, confirmation]);

  if (loading) {
    return (
      <Box sx={{ p: 3, backgroundColor: '#1A1917', minHeight: '100vh' }}>
        <ZhuzhSectionLoader message="Pulling your timesheet..." minHeight="50vh" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load timesheet: {error.message}
        </Alert>
      </Box>
    );
  }

  const handleWeekChange = (newWeekStart: Date) => {
    navigate(`/timesheet/${newWeekStart.toISOString().split('T')[0]}`);
  };

  const handlePrevWeek = () => {
    const newDate = new Date(weekStart + 'T00:00:00');
    newDate.setDate(newDate.getDate() - 7);
    handleWeekChange(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(weekStart + 'T00:00:00');
    newDate.setDate(newDate.getDate() + 7);
    handleWeekChange(newDate);
  };

  const formatWeekRange = (dateStr: string): string => {
    const start = new Date(dateStr + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 4);

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleDateString('en-US', { ...options, year: 'numeric' });

    return `${startStr} - ${endStr}`;
  };

  if (!allocations || allocations.length === 0) {
    return (
      <Box sx={{ p: 3, backgroundColor: '#1A1917', minHeight: '100vh' }}>
        <Box sx={{ maxWidth: 700, mx: 'auto', my: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 4 }}>
            <IconButton
              onClick={handlePrevWeek}
              sx={{ color: '#9CA3AF', '&:hover': { backgroundColor: '#374151' } }}
            >
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" sx={{ color: '#F3F4F6', fontWeight: 600, minWidth: 180, textAlign: 'center' }}>
              {formatWeekRange(weekStart)}
            </Typography>
            <IconButton
              onClick={handleNextWeek}
              sx={{ color: '#9CA3AF', '&:hover': { backgroundColor: '#374151' } }}
            >
              <ChevronRight />
            </IconButton>
          </Box>
          <EmptyState
            icon={<EventBusyOutlined />}
            title="No hours planned"
            description="You don't have any allocations for this week. If this seems wrong, reach out to your PM."
          />
        </Box>
      </Box>
    );
  }

  const handleSubmit = async (updatedEntries: Array<{ id: string; actualHours: number }>, notes?: string) => {
    try {
      await submitConfirmation(
        updatedEntries.map(e => ({ allocation_id: e.id, actual_hours: e.actualHours })),
        notes
      );
      safeCelebrate('small'); // Sparkle on timesheet submit
      setSnackbar({ open: true, message: 'Timesheet submitted!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to submit timesheet', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#1A1917', minHeight: '100vh' }}>
      <ConfirmModal
        weekStart={new Date(weekStart + 'T00:00:00')}
        entries={entries}
        status={confirmation?.status || 'draft'}
        notes={confirmation?.notes}
        onWeekChange={handleWeekChange}
        onSubmit={handleSubmit}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
