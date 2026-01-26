import React, { useState } from 'react';
import { Box, Alert, Snackbar } from '@mui/material';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { AuditTrailModal } from '../components/AuditTrailModal';
import { usePendingApprovals } from '../hooks/useConfirmations';
import { useAuth } from '../contexts/AuthContext';
import { ZhuzhPageLoader } from '../components/ZhuzhPageLoader';

export function ApprovalsPage() {
  const { user } = useAuth();
  const {
    approvals,
    loading,
    error,
    approveConfirmation,
    rejectConfirmation,
    refetch
  } = usePendingApprovals(user?.org_id || '');

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Audit trail modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [selectedApprovalName, setSelectedApprovalName] = useState<string>('');

  if (loading) {
    return <ZhuzhPageLoader message="Loading approvals..." />;
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          Failed to load approvals: {error.message}
        </Alert>
      </Box>
    );
  }

  const handleApprove = async (id: string) => {
    try {
      await approveConfirmation(id, user!.id);
      setSnackbar({ open: true, message: 'Timesheet approved!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to approve timesheet', severity: 'error' });
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    try {
      await rejectConfirmation(id, reason || '');
      setSnackbar({ open: true, message: 'Timesheet rejected', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to reject timesheet', severity: 'error' });
    }
  };

  const handleBulkApprove = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => approveConfirmation(id, user!.id)));
      setSnackbar({ open: true, message: `${ids.length} timesheets approved!`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to approve some timesheets', severity: 'error' });
    }
  };

  const handleViewHistory = (id: string) => {
    // Find the approval to get the employee name
    const approval = approvals.find(a => a.id === id);
    const employeeName = approval?.user?.name || 'Timesheet';
    const weekStart = approval?.week_start
      ? new Date(approval.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '';

    setSelectedApprovalId(id);
    setSelectedApprovalName(`${employeeName} - Week of ${weekStart}`);
    setAuditModalOpen(true);
  };

  // Transform data for component
  // API now returns pre-calculated warnings (totalPlanned, totalActual, hasVarianceWarning, hasRubberStampWarning)
  const transformedApprovals = approvals.map(a => {
    return {
      id: a.id,
      employee: {
        id: a.user?.id || '',
        name: a.user?.name || 'Unknown',
        avatar: a.user?.avatar_url ?? undefined,
        discipline: a.user?.discipline ?? undefined,
      },
      weekStart: a.week_start,
      submittedAt: a.submitted_at || '',
      entries: a.entries?.map(e => ({
        projectName: e.project?.name || 'Unknown',
        projectColor: e.project?.color || '#6B7280',
        plannedHours: e.planned_hours,
        actualHours: e.actual_hours
      })) || [],
      totalPlanned: a.totalPlanned || 0,
      totalActual: a.totalActual || 0,
      notes: a.notes ?? undefined,
      hasVarianceWarning: a.hasVarianceWarning || false,
      hasRubberStampWarning: a.hasRubberStampWarning || false
    };
  });

  return (
    <>
      <ApprovalQueue
        approvals={transformedApprovals}
        employees={approvals.map(a => ({ id: a.user?.id || '', name: a.user?.name || '' })).filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i)}
        onApprove={handleApprove}
        onReject={handleReject}
        onBulkApprove={handleBulkApprove}
        onViewHistory={handleViewHistory}
      />

      {/* Audit Trail Modal */}
      {selectedApprovalId && (
        <AuditTrailModal
          open={auditModalOpen}
          onClose={() => {
            setAuditModalOpen(false);
            setSelectedApprovalId(null);
          }}
          entityType="time_confirmations"
          entityId={selectedApprovalId}
          entityName={selectedApprovalName}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </>
  );
}
