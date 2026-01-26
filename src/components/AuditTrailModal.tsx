/**
 * AuditTrailModal Component
 * Modal dialog for viewing the full audit history of an entity
 */

import React from 'react';
import { glowBorderStyles, GLOW_COLORS } from './design-system';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Add as CreateIcon,
  Edit as UpdateIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuditTrail, useProjectAuditTrail, EntityType } from '../hooks/useAuditTrail';
import { AuditTimeline } from './AuditTimeline';

// =============================================================================
// Types
// =============================================================================

interface AuditTrailModalProps {
  open: boolean;
  onClose: () => void;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
}

interface ProjectAuditTrailModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
}

// =============================================================================
// Stats Summary Component
// =============================================================================

interface StatsSummaryProps {
  stats: {
    totalChanges: number;
    creates: number;
    updates: number;
    deletes: number;
    uniqueContributors: number;
    lastChange: string | null;
  };
}

const StatsSummary: React.FC<StatsSummaryProps> = ({ stats }) => {
  const formatLastChange = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        p: 2,
        bgcolor: '#1A1917',
        borderRadius: 2,
        border: '1px solid #374151',
      }}
    >
      <Box sx={{ textAlign: 'center', minWidth: 70 }}>
        <Typography variant="h5" sx={{ color: '#F3F4F6', fontWeight: 700 }}>
          {stats.totalChanges}
        </Typography>
        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
          Total Changes
        </Typography>
      </Box>
      <Divider orientation="vertical" flexItem sx={{ borderColor: '#374151' }} />
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Chip
          icon={<CreateIcon sx={{ fontSize: 14 }} />}
          label={stats.creates}
          size="small"
          sx={{
            bgcolor: 'rgba(16, 185, 129, 0.15)',
            color: '#80FF9C',
            '& .MuiChip-icon': { color: '#80FF9C' },
          }}
        />
        <Chip
          icon={<UpdateIcon sx={{ fontSize: 14 }} />}
          label={stats.updates}
          size="small"
          sx={{
            bgcolor: 'rgba(59, 130, 246, 0.15)',
            color: '#FF8731',
            '& .MuiChip-icon': { color: '#FF8731' },
          }}
        />
        <Chip
          icon={<DeleteIcon sx={{ fontSize: 14 }} />}
          label={stats.deletes}
          size="small"
          sx={{
            bgcolor: 'rgba(239, 68, 68, 0.15)',
            color: '#FF6B6B',
            '& .MuiChip-icon': { color: '#FF6B6B' },
          }}
        />
      </Box>
      <Divider orientation="vertical" flexItem sx={{ borderColor: '#374151' }} />
      <Box sx={{ textAlign: 'center', minWidth: 80 }}>
        <Typography variant="h6" sx={{ color: '#F3F4F6', fontWeight: 600 }}>
          {stats.uniqueContributors}
        </Typography>
        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
          Contributors
        </Typography>
      </Box>
      <Divider orientation="vertical" flexItem sx={{ borderColor: '#374151' }} />
      <Box sx={{ textAlign: 'center', minWidth: 80 }}>
        <Typography variant="body2" sx={{ color: '#F3F4F6', fontWeight: 500 }}>
          {formatLastChange(stats.lastChange)}
        </Typography>
        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
          Last Change
        </Typography>
      </Box>
    </Box>
  );
};

// =============================================================================
// Entity Audit Trail Modal
// =============================================================================

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  open,
  onClose,
  entityType,
  entityId,
  entityName,
}) => {
  const { entries, stats, loading, error, refetch } = useAuditTrail(
    open ? entityType : null,
    open ? entityId : null
  );

  const getEntityTypeLabel = (type: EntityType): string => {
    switch (type) {
      case 'projects':
        return 'Project';
      case 'allocations':
        return 'Allocation';
      case 'time_entries':
        return 'Time Entry';
      case 'time_confirmations':
        return 'Timesheet';
      default:
        return type;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          ...glowBorderStyles(GLOW_COLORS.info, {
            intensity: 'subtle',
            animated: false,
          }),
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <HistoryIcon sx={{ color: '#FF8731' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="span">
            {entityName || getEntityTypeLabel(entityType)} History
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF' }}>
            {getEntityTypeLabel(entityType)} audit trail
          </Typography>
        </Box>
        <IconButton size="small" onClick={refetch} sx={{ color: '#9CA3AF' }}>
          <RefreshIcon />
        </IconButton>
        <IconButton size="small" onClick={onClose} sx={{ color: '#9CA3AF' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: '#374151' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#FF8731' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#FCA5A5' }}>
            {error.message}
          </Alert>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <StatsSummary stats={stats} />
            </Box>
            <AuditTimeline entries={entries} />
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #374151', p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#9CA3AF' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =============================================================================
// Project Audit Trail Modal (with tabs for different entity types)
// =============================================================================

export const ProjectAuditTrailModal: React.FC<ProjectAuditTrailModalProps> = ({
  open,
  onClose,
  projectId,
  projectName,
}) => {
  const [tab, setTab] = React.useState(0);
  const { project, entries, entriesByDate, counts, loading, error, refetch } = useProjectAuditTrail(
    open ? projectId : null
  );

  // Filter entries by type based on tab
  const filteredEntries = React.useMemo(() => {
    if (tab === 0) return entries; // All
    const typeMap: Record<number, string> = {
      1: 'projects',
      2: 'allocations',
      3: 'time_entries',
    };
    return entries.filter((e) => e.entityType === typeMap[tab]);
  }, [entries, tab]);

  const stats = React.useMemo(() => ({
    totalChanges: entries.length,
    creates: entries.filter((e) => e.action === 'create').length,
    updates: entries.filter((e) => e.action === 'update').length,
    deletes: entries.filter((e) => e.action === 'delete').length,
    uniqueContributors: new Set(entries.map((e) => e.changedBy)).size,
    lastChange: entries.length > 0 ? entries[0].timestamp : null,
  }), [entries]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          ...glowBorderStyles(GLOW_COLORS.info, {
            intensity: 'subtle',
            animated: false,
          }),
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <HistoryIcon sx={{ color: '#FF8731' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="span">
            {projectName || project?.name || 'Project'} History
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF' }}>
            Complete project audit trail
          </Typography>
        </Box>
        <IconButton size="small" onClick={refetch} sx={{ color: '#9CA3AF' }}>
          <RefreshIcon />
        </IconButton>
        <IconButton size="small" onClick={onClose} sx={{ color: '#9CA3AF' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: '#374151', p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#FF8731' }} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#FCA5A5' }}>
              {error.message}
            </Alert>
          </Box>
        ) : (
          <>
            {/* Stats Summary */}
            <Box sx={{ p: 2, borderBottom: '1px solid #374151' }}>
              <StatsSummary stats={stats} />
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: '1px solid #374151' }}>
              <Tabs
                value={tab}
                onChange={(_, newValue) => setTab(newValue)}
                sx={{
                  '& .MuiTab-root': {
                    color: '#9CA3AF',
                    '&.Mui-selected': { color: '#FF8731' },
                  },
                  '& .MuiTabs-indicator': { bgcolor: '#FF8731' },
                }}
              >
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      All
                      <Chip label={entries.length} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#374151', color: '#D1D5DB' }} />
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Project
                      <Chip label={counts.projectChanges} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#374151', color: '#D1D5DB' }} />
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Allocations
                      <Chip label={counts.allocationChanges} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#374151', color: '#D1D5DB' }} />
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Time Entries
                      <Chip label={counts.entryChanges} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#374151', color: '#D1D5DB' }} />
                    </Box>
                  }
                />
              </Tabs>
            </Box>

            {/* Timeline */}
            <Box sx={{ p: 2, maxHeight: 400, overflowY: 'auto' }}>
              <AuditTimeline entries={filteredEntries} showEntityType={tab === 0} />
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #374151', p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#9CA3AF' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuditTrailModal;
