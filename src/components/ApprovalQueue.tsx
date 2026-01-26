/**
 * ApprovalQueue Component
 * Manager view for reviewing submitted timesheets
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Checkbox,
  FormControlLabel,
  Chip,
  InputAdornment,
} from '@mui/material';
import { ApprovalsSkeleton } from './Skeletons';
import { ErrorState } from './ErrorState';
import {
  CheckCircle as ApprovedIcon,
  Schedule as PendingIcon,
  Flag as FlaggedIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckBox as SelectAllIcon,
  CheckCircleOutline,
} from '@mui/icons-material';
import { EmptyState } from './EmptyState';
import { ApprovalCard, ApprovalCardProps } from './ApprovalCard';
import { getStaggeredStyle } from '../styles/animations';
import { safeCelebrate } from '../utils/celebrations';

// Types for approval queue
export interface ApprovalEntry {
  id: string;
  employee: { id: string; name: string; avatar?: string };
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
}

export interface ApprovalQueueProps {
  approvals: ApprovalEntry[];
  employees: Array<{ id: string; name: string }>;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onBulkApprove: (ids: string[]) => void;
  onViewDetails?: (id: string) => void;
  onViewHistory?: (id: string) => void;
  approvedTodayCount?: number;
  loading?: boolean;
  error?: Error | null;
  refetch?: () => void;
}

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, bgColor }) => (
  <Card
    sx={{
      backgroundColor: '#2A2520',
      borderRadius: 3,
      border: '1px solid #374151',
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#9CA3AF', fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ color: '#F3F4F6', fontWeight: 700, mt: 0.5 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
            flexShrink: 0,
            '& .MuiSvgIcon-root': {
              fontSize: 24,
            },
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  approvals,
  employees,
  onApprove,
  onReject,
  onBulkApprove,
  onViewDetails,
  onViewHistory,
  approvedTodayCount = 0,
  loading = false,
  error = null,
  refetch,
}) => {
  // Filter state
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [flaggedOnly, setFlaggedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Computed stats
  const stats = useMemo(() => {
    const pending = approvals.length;
    const flagged = approvals.filter(
      (a) => a.hasVarianceWarning || a.hasRubberStampWarning
    ).length;
    return { pending, flagged, approvedToday: approvedTodayCount };
  }, [approvals, approvedTodayCount]);

  // Filtered approvals
  const filteredApprovals = useMemo(() => {
    return approvals.filter((approval) => {
      // Employee filter
      if (selectedEmployee !== 'all' && approval.employee.id !== selectedEmployee) {
        return false;
      }

      // Date range filter
      if (dateRangeStart) {
        const weekStart = new Date(approval.weekStart);
        const filterStart = new Date(dateRangeStart);
        if (weekStart < filterStart) return false;
      }
      if (dateRangeEnd) {
        const weekStart = new Date(approval.weekStart);
        const filterEnd = new Date(dateRangeEnd);
        if (weekStart > filterEnd) return false;
      }

      // Flagged only filter
      if (flaggedOnly && !approval.hasVarianceWarning && !approval.hasRubberStampWarning) {
        return false;
      }

      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = approval.employee.name.toLowerCase().includes(query);
        const matchesProject = approval.entries.some((e) =>
          e.projectName.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesProject) return false;
      }

      return true;
    });
  }, [approvals, selectedEmployee, dateRangeStart, dateRangeEnd, flaggedOnly, searchQuery]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredApprovals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredApprovals.map((a) => a.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkApprove = () => {
    const approvedCount = selectedIds.size;
    onBulkApprove(Array.from(selectedIds));
    setSelectedIds(new Set());
    safeCelebrate('success'); // Confetti on approval

    // Check if all items are now approved (inbox zero)
    const remaining = approvals.length - approvedCount;
    if (remaining === 0) {
      safeCelebrate('big'); // Big celebration for inbox zero!
    }
  };

  const handleApprove = (id: string) => {
    onApprove(id);
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    safeCelebrate('success'); // Confetti on approval

    // Check if this was the last item (inbox zero)
    if (approvals.length === 1) {
      safeCelebrate('big'); // Big celebration for inbox zero!
    }
  };

  const handleReject = (id: string, reason?: string) => {
    onReject(id, reason);
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const clearFilters = () => {
    setSelectedEmployee('all');
    setDateRangeStart('');
    setDateRangeEnd('');
    setFlaggedOnly(false);
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedEmployee !== 'all' || dateRangeStart || dateRangeEnd || flaggedOnly || searchQuery;

  // Handle error state
  if (error) {
    return <ErrorState type="generic" onRetry={() => refetch?.()} />;
  }

  // Handle loading state
  if (loading) {
    return <ApprovalsSkeleton />;
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#1A1917', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#F3F4F6', fontWeight: 700 }}>
          Approval Queue
        </Typography>
        <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 0.5 }}>
          Review and approve submitted timesheets
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatsCard
            title="Pending Approvals"
            value={stats.pending}
            icon={<PendingIcon />}
            color="#FF8731"
            bgColor="rgba(255, 135, 49, 0.15)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatsCard
            title="Approved Today"
            value={stats.approvedToday}
            icon={<ApprovedIcon />}
            color="#80FF9C"
            bgColor="rgba(128, 255, 156, 0.15)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatsCard
            title="Flagged"
            value={stats.flagged}
            icon={<FlaggedIcon />}
            color="#FFF845"
            bgColor="rgba(255, 248, 69, 0.15)"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Card
        sx={{
          backgroundColor: '#2A2520',
          borderRadius: 3,
          border: '1px solid #374151',
          mb: 3,
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterIcon sx={{ color: '#9CA3AF' }} />
            <Typography variant="subtitle2" sx={{ color: '#F3F4F6', fontWeight: 600 }}>
              Filters
            </Typography>
            {hasActiveFilters && (
              <Chip
                label="Clear All"
                size="small"
                onClick={clearFilters}
                sx={{
                  ml: 'auto',
                  backgroundColor: '#374151',
                  color: '#D1D5DB',
                  '&:hover': { backgroundColor: '#4B5563' },
                }}
              />
            )}
          </Box>

          <Grid container spacing={2} alignItems="flex-end">
            {/* Search */}
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#6B7280', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1A1917',
                    color: '#F3F4F6',
                    overflow: 'hidden',
                    '& fieldset': { borderColor: '#374151' },
                    '&:hover fieldset': { borderColor: '#4B5563' },
                    '&.Mui-focused fieldset': { borderColor: '#FF8731' },
                    '& input': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  },
                }}
              />
            </Grid>

            {/* Employee Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <Select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  displayEmpty
                  sx={{
                    backgroundColor: '#1A1917',
                    color: '#F3F4F6',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4B5563' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF8731' },
                    '& .MuiSvgIcon-root': { color: '#9CA3AF' },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: '#2A2520',
                        border: '1px solid #374151',
                        '& .MuiMenuItem-root': {
                          color: '#F3F4F6',
                          '&:hover': { backgroundColor: '#374151' },
                          '&.Mui-selected': { backgroundColor: '#FF8731' },
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="all">All Employees</MenuItem>
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date Range Start */}
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                placeholder="From"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: !dateRangeStart ? (
                    <InputAdornment position="start">
                      <Typography variant="caption" sx={{ color: '#6B7280' }}>From</Typography>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1A1917',
                    color: '#F3F4F6',
                    '& fieldset': { borderColor: '#374151' },
                    '&:hover fieldset': { borderColor: '#4B5563' },
                    '&.Mui-focused fieldset': { borderColor: '#FF8731' },
                  },
                }}
              />
            </Grid>

            {/* Date Range End */}
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                placeholder="To"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: !dateRangeEnd ? (
                    <InputAdornment position="start">
                      <Typography variant="caption" sx={{ color: '#6B7280' }}>To</Typography>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1A1917',
                    color: '#F3F4F6',
                    '& fieldset': { borderColor: '#374151' },
                    '&:hover fieldset': { borderColor: '#4B5563' },
                    '&.Mui-focused fieldset': { borderColor: '#FF8731' },
                  },
                }}
              />
            </Grid>

            {/* Flagged Only */}
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={flaggedOnly}
                    onChange={(e) => setFlaggedOnly(e.target.checked)}
                    sx={{
                      color: '#6B7280',
                      '&.Mui-checked': { color: '#F97316' },
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: '#D1D5DB' }}>
                    Flagged Only
                  </Typography>
                }
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {filteredApprovals.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedIds.size === filteredApprovals.length && filteredApprovals.length > 0}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < filteredApprovals.length}
                  onChange={handleSelectAll}
                  sx={{
                    color: '#6B7280',
                    '&.Mui-checked': { color: '#FF8731' },
                    '&.MuiCheckbox-indeterminate': { color: '#FF8731' },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: '#D1D5DB' }}>
                  Select All ({filteredApprovals.length})
                </Typography>
              }
            />
            {selectedIds.size > 0 && (
              <Chip
                label={`${selectedIds.size} selected`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 135, 49, 0.15)',
                  color: '#FF8731',
                }}
              />
            )}
          </Box>

          {selectedIds.size > 0 && (
            <Button
              variant="contained"
              startIcon={<SelectAllIcon />}
              onClick={handleBulkApprove}
              sx={{
                backgroundColor: '#80FF9C',
                color: '#1A1917',
                fontWeight: 600,
                '&:hover': { backgroundColor: '#6BE085' },
              }}
            >
              Approve Selected ({selectedIds.size})
            </Button>
          )}
        </Box>
      )}

      {/* Approval Cards List - Constrained width */}
      {!approvals || approvals.length === 0 ? (
        <EmptyState
          icon={<CheckCircleOutline />}
          title="All caught up!"
          description="No timesheets waiting for approval. Your team's hours are confirmed."
        />
      ) : filteredApprovals.length === 0 ? (
        <Card
          sx={{
            backgroundColor: '#2A2520',
            borderRadius: 3,
            border: '1px solid #374151',
            maxWidth: 800,
          }}
        >
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <PendingIcon sx={{ fontSize: 64, color: '#4B5563', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#9CA3AF' }}>
              No matching approvals found
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mt: 1 }}>
              Try adjusting your filters to see more results
            </Typography>
            <Button
              onClick={clearFilters}
              sx={{ mt: 2, color: '#60A5FA' }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 900 }}>
          {filteredApprovals.map((approval, index) => (
            <Box key={approval.id} sx={getStaggeredStyle(Math.min(index, 10))}>
              <ApprovalCard
                approval={approval}
                selected={selectedIds.has(approval.id)}
                onSelect={handleSelect}
                onApprove={handleApprove}
                onReject={handleReject}
                onViewDetails={onViewDetails}
                onViewHistory={onViewHistory}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ApprovalQueue;
