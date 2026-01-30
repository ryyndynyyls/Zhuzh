/**
 * ApprovalCard Component
 * Individual approval card for a timesheet submission
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Checkbox,
  Typography,
  Box,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  Search as SearchIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { RejectionDialog } from './RejectionDialog';
import { UserAvatar } from './shared/UserAvatar';

export interface ApprovalCardProps {
  approval: {
    id: string;
    employee: { id: string; name: string; avatar?: string; discipline?: string };
    weekStart: string;
    submittedAt: string;
    entries: Array<{
      projectName: string;
      projectColor: string;
      plannedHours: number;
      actualHours: number;
    }>;
    totalPlanned: number;
    totalActual: number;
    notes?: string;
    hasVarianceWarning: boolean;
    hasRubberStampWarning: boolean;
  };
  selected?: boolean;
  onSelect?: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onViewDetails?: (id: string) => void;
  onViewHistory?: (id: string) => void;
  onNameClick?: (employeeId: string) => void; // Opens profile modal
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  selected = false,
  onSelect,
  onApprove,
  onReject,
  onViewDetails,
  onViewHistory,
  onNameClick,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);

  const {
    id,
    employee,
    weekStart,
    submittedAt,
    entries,
    totalPlanned,
    totalActual,
    notes,
    hasVarianceWarning,
    hasRubberStampWarning,
  } = approval;

  const totalVariance = totalActual - totalPlanned;
  const variancePercent = totalPlanned > 0
    ? Math.abs(((totalActual - totalPlanned) / totalPlanned) * 100).toFixed(1)
    : '0';

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleReject = (reason: string) => {
    onReject(id, reason);
    setRejectionDialogOpen(false);
  };

  return (
    <>
      <Card
        sx={{
          backgroundColor: '#2A2520',
          borderRadius: 3,
          border: selected ? '2px solid #FF8731' : '1px solid #374151',
          transition: 'border-color 0.2s ease',
          '&:hover': {
            borderColor: selected ? '#FF8731' : '#4B5563',
          },
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: '1px solid #374151',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {onSelect && (
                <Checkbox
                  checked={selected}
                  onChange={() => onSelect(id)}
                  sx={{
                    color: '#6B7280',
                    '&.Mui-checked': {
                      color: '#FF8731',
                    },
                  }}
                />
              )}
              <UserAvatar
                name={employee.name}
                avatarUrl={employee.avatar}
                discipline={employee.discipline}
                size="lg"
              />
              <Box>
                <Typography
                  variant="subtitle1"
                  onClick={() => onNameClick?.(employee.id)}
                  sx={{ 
                    color: '#F3F4F6', 
                    fontWeight: 600,
                    cursor: onNameClick ? 'pointer' : 'default',
                    '&:hover': onNameClick ? { 
                      color: '#FF8731',
                      textDecoration: 'underline'
                    } : {}
                  }}
                >
                  {employee.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                  Week of {formatDate(weekStart)} - Submitted {formatTimestamp(submittedAt)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Warning Badges */}
              {hasVarianceWarning && (
                <Chip
                  icon={<WarningIcon sx={{ fontSize: 16 }} />}
                  label="Variance Warning"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(251, 191, 36, 0.15)',
                    color: '#FBBF24',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    '& .MuiChip-icon': {
                      color: '#FBBF24',
                    },
                  }}
                />
              )}
              {hasRubberStampWarning && (
                <Chip
                  icon={<SearchIcon sx={{ fontSize: 16 }} />}
                  label="Rubber-Stamp Warning"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(249, 115, 22, 0.15)',
                    color: '#F97316',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    '& .MuiChip-icon': {
                      color: '#F97316',
                    },
                  }}
                />
              )}

              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{ color: '#9CA3AF' }}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>

          {/* Collapsible Content */}
          <Collapse in={expanded}>
            {/* Time Entries Table */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#374151' }}>
                    <TableCell sx={{ color: '#9CA3AF', fontWeight: 600, borderBottom: 'none' }}>
                      Project
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: '#9CA3AF', fontWeight: 600, borderBottom: 'none' }}
                    >
                      Planned
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: '#9CA3AF', fontWeight: 600, borderBottom: 'none' }}
                    >
                      Actual
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: '#9CA3AF', fontWeight: 600, borderBottom: 'none' }}
                    >
                      Variance
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((entry, index) => {
                    const variance = entry.actualHours - entry.plannedHours;
                    const varianceColor =
                      variance > 0
                        ? '#FF6B6B'
                        : variance < 0
                        ? '#FBBF24'
                        : '#9CA3AF';

                    return (
                      <TableRow
                        key={index}
                        sx={{
                          '&:last-child td': { borderBottom: 'none' },
                          '& td': { borderBottom: '1px solid #374151' },
                        }}
                      >
                        <TableCell sx={{ color: '#F3F4F6' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: entry.projectColor,
                              }}
                            />
                            {entry.projectName}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#9CA3AF' }}>
                          {entry.plannedHours}h
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#F3F4F6' }}>
                          {entry.actualHours}h
                        </TableCell>
                        <TableCell align="right" sx={{ color: varianceColor }}>
                          {variance !== 0 && (
                            <>
                              {variance > 0 ? '+' : ''}
                              {variance}h
                            </>
                          )}
                          {variance === 0 && (
                            <span style={{ color: '#9CA3AF' }}>-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                {/* Totals Footer */}
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#374151' }}>
                    <TableCell sx={{ color: '#F3F4F6', fontWeight: 600, borderBottom: 'none' }}>
                      Total
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: '#9CA3AF', fontWeight: 600, borderBottom: 'none' }}
                    >
                      {totalPlanned}h
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: '#F3F4F6', fontWeight: 600, borderBottom: 'none' }}
                    >
                      {totalActual}h
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color:
                          totalVariance > 0
                            ? '#EF4444' // red - over budget
                            : totalVariance < 0
                            ? '#10B981' // green - under budget
                            : '#6B7280', // gray - on target
                        fontWeight: 600,
                        borderBottom: 'none',
                      }}
                    >
                      {totalVariance !== 0 && (
                        <>
                          {totalVariance > 0 ? '+' : ''}
                          {totalVariance}h ({variancePercent}%)
                        </>
                      )}
                      {totalVariance === 0 && '-'}
                    </TableCell>
                  </TableRow>
                </TableHead>
              </Table>
            </TableContainer>

            {/* Notes Section */}
            {notes && (
              <Box
                sx={{
                  mx: 2,
                  my: 2,
                  p: 2,
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: '#93C5FD', fontWeight: 600, display: 'block', mb: 0.5 }}
                >
                  Employee Notes
                </Typography>
                <Typography variant="body2" sx={{ color: '#BFDBFE' }}>
                  {notes}
                </Typography>
              </Box>
            )}

            {/* Action Buttons */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                p: 2,
                borderTop: '1px solid #374151',
              }}
            >
              <Button
                variant="contained"
                startIcon={<ApproveIcon />}
                onClick={() => onApprove(id)}
                sx={{
                  flex: 1,
                  backgroundColor: '#80FF9C',
                  color: '#1E1D1B', // Dark text for ADA contrast
                  '&:hover': {
                    backgroundColor: '#6BE088',
                  },
                }}
              >
                Approve
              </Button>
              <Button
                variant="contained"
                startIcon={<RejectIcon />}
                onClick={() => setRejectionDialogOpen(true)}
                sx={{
                  flex: 1,
                  backgroundColor: '#DC2626',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#B91C1C',
                  },
                }}
              >
                Reject
              </Button>
              {onViewDetails && (
                <Button
                  variant="outlined"
                  startIcon={<ViewIcon />}
                  onClick={() => onViewDetails(id)}
                  sx={{
                    color: '#D1D5DB',
                    borderColor: '#4B5563',
                    '&:hover': {
                      backgroundColor: '#374151',
                      borderColor: '#6B7280',
                    },
                  }}
                >
                  View Details
                </Button>
              )}
              {onViewHistory && (
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => onViewHistory(id)}
                  sx={{
                    color: '#93C5FD',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderColor: 'rgba(59, 130, 246, 0.5)',
                    },
                  }}
                >
                  History
                </Button>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <RejectionDialog
        open={rejectionDialogOpen}
        employeeName={employee.name}
        onClose={() => setRejectionDialogOpen(false)}
        onReject={handleReject}
      />
    </>
  );
};

export default ApprovalCard;
