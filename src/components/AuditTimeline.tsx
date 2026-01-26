/**
 * AuditTimeline Component
 * Displays a timeline of audit entries (changes, approvals, etc.)
 */

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Tooltip,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Add as CreateIcon,
  Edit as UpdateIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Schedule as TimeIcon,
} from '@mui/icons-material';
import { UserAvatar } from './shared/UserAvatar';
import { AuditEntry, FullAuditEntry, getFieldDelta } from '../hooks/useAuditTrail';

// =============================================================================
// Types
// =============================================================================

interface AuditTimelineProps {
  entries: (AuditEntry | FullAuditEntry)[];
  showEntityType?: boolean;
  maxItems?: number;
  compact?: boolean;
}

interface TimelineEntryProps {
  entry: AuditEntry | FullAuditEntry;
  showEntityType?: boolean;
  compact?: boolean;
  isLast?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function getActionColor(action: string): string {
  switch (action) {
    case 'create':
      return '#80FF9C'; // green
    case 'update':
      return '#FF8731'; // blue
    case 'delete':
      return '#FF6B6B'; // red
    default:
      return '#6B7280'; // gray
  }
}

function getActionIcon(action: string): React.ReactNode {
  switch (action) {
    case 'create':
      return <CreateIcon fontSize="small" />;
    case 'update':
      return <UpdateIcon fontSize="small" />;
    case 'delete':
      return <DeleteIcon fontSize="small" />;
    default:
      return <TimeIcon fontSize="small" />;
  }
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'create':
      return 'Created';
    case 'update':
      return 'Updated';
    case 'delete':
      return 'Deleted';
    default:
      return action;
  }
}

function formatTimestamp(timestamp: string): { date: string; time: string; relative: string } {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let relative: string;
  if (diffMins < 1) {
    relative = 'just now';
  } else if (diffMins < 60) {
    relative = `${diffMins}m ago`;
  } else if (diffHours < 24) {
    relative = `${diffHours}h ago`;
  } else if (diffDays < 7) {
    relative = `${diffDays}d ago`;
  } else {
    relative = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return {
    date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    relative,
  };
}

function getEntityTypeLabel(entityType: string): string {
  switch (entityType) {
    case 'projects':
      return 'Project';
    case 'allocations':
      return 'Allocation';
    case 'time_entries':
      return 'Time Entry';
    case 'time_confirmations':
      return 'Timesheet';
    default:
      return entityType;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// =============================================================================
// Change Details Component
// =============================================================================

interface ChangeDetailsProps {
  changes: AuditEntry['changes'];
}

const ChangeDetails: React.FC<ChangeDetailsProps> = ({ changes }) => {
  const oldData = changes.old || {};
  const newData = changes.new || {};

  // Find changed fields
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const changedFields: Array<{ field: string; old: any; new: any }> = [];

  allKeys.forEach((key) => {
    // Skip internal fields
    if (['id', 'created_at', 'updated_at', 'org_id'].includes(key)) return;

    const oldVal = oldData[key];
    const newVal = newData[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changedFields.push({ field: key, old: oldVal, new: newVal });
    }
  });

  if (changedFields.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: '#6B7280', fontStyle: 'italic' }}>
        No detailed changes available
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {changedFields.map(({ field, old: oldVal, new: newVal }) => {
        const fieldLabel = field
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

        // Format values for display
        const formatValue = (val: any): string => {
          if (val === null || val === undefined) return '—';
          if (typeof val === 'boolean') return val ? 'Yes' : 'No';
          if (typeof val === 'number') return val.toLocaleString();
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        };

        // Check if it's a numeric change for delta display
        const isNumeric = typeof oldVal === 'number' || typeof newVal === 'number';
        const delta = isNumeric ? (Number(newVal) || 0) - (Number(oldVal) || 0) : null;

        return (
          <Box key={field} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              variant="caption"
              sx={{ color: '#9CA3AF', minWidth: 100, fontWeight: 500 }}
            >
              {fieldLabel}:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#FF6B6B',
                textDecoration: oldVal !== undefined ? 'line-through' : 'none',
                opacity: oldVal !== undefined ? 0.7 : 0,
              }}
            >
              {formatValue(oldVal)}
            </Typography>
            {oldVal !== undefined && newVal !== undefined && (
              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                →
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: '#80FF9C', fontWeight: 500 }}>
              {formatValue(newVal)}
            </Typography>
            {delta !== null && delta !== 0 && (
              <Chip
                label={delta > 0 ? `+${delta}` : delta}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: delta > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: delta > 0 ? '#80FF9C' : '#FF6B6B',
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

// =============================================================================
// Timeline Entry Component
// =============================================================================

const TimelineEntry: React.FC<TimelineEntryProps> = ({
  entry,
  showEntityType = false,
  compact = false,
  isLast = false,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const { date, time, relative } = formatTimestamp(entry.timestamp);
  const actionColor = getActionColor(entry.action);
  const hasChanges = entry.changes && (entry.changes.old || entry.changes.new);
  const isFullEntry = 'entityType' in entry;

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* Timeline connector */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 40,
        }}
      >
        {/* Icon circle */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: `${actionColor}20`,
            color: actionColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${actionColor}`,
            flexShrink: 0,
          }}
        >
          {getActionIcon(entry.action)}
        </Box>
        {/* Connector line */}
        {!isLast && (
          <Box
            sx={{
              width: 2,
              flex: 1,
              bgcolor: '#374151',
              minHeight: compact ? 20 : 40,
            }}
          />
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, pb: compact ? 2 : 3 }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            {/* Action label and entity type */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={getActionLabel(entry.action)}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  bgcolor: `${actionColor}20`,
                  color: actionColor,
                }}
              />
              {showEntityType && isFullEntry && (
                <Chip
                  label={getEntityTypeLabel((entry as FullAuditEntry).entityType)}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    borderColor: '#374151',
                    color: '#9CA3AF',
                  }}
                />
              )}
            </Box>

            {/* Summary */}
            <Typography
              variant="body2"
              sx={{ color: '#E5E7EB', mt: 0.5, fontWeight: 500 }}
            >
              {entry.summary}
            </Typography>
          </Box>

          {/* Timestamp */}
          <Tooltip title={`${date} at ${time}`}>
            <Typography
              variant="caption"
              sx={{ color: '#6B7280', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {relative}
            </Typography>
          </Tooltip>
        </Box>

        {/* User info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <UserAvatar
            name={entry.changedBy}
            size="xs"
          />
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
            {entry.changedBy}
          </Typography>
          {entry.changedByEmail && (
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              ({entry.changedByEmail})
            </Typography>
          )}
        </Box>

        {/* Expandable change details */}
        {hasChanges && !compact && (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mt: 1,
                cursor: 'pointer',
                color: '#60A5FA',
                '&:hover': { color: '#93C5FD' },
              }}
              onClick={() => setExpanded(!expanded)}
            >
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {expanded ? 'Hide details' : 'Show details'}
              </Typography>
              <IconButton size="small" sx={{ color: 'inherit', p: 0.5 }}>
                {expanded ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
              </IconButton>
            </Box>
            <Collapse in={expanded}>
              <Box
                sx={{
                  mt: 1,
                  p: 1.5,
                  bgcolor: '#1A1917',
                  borderRadius: 1,
                  border: '1px solid #374151',
                }}
              >
                <ChangeDetails changes={entry.changes} />
              </Box>
            </Collapse>
          </>
        )}
      </Box>
    </Box>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  entries,
  showEntityType = false,
  maxItems,
  compact = false,
}) => {
  const displayedEntries = maxItems ? entries.slice(0, maxItems) : entries;
  const hasMore = maxItems && entries.length > maxItems;

  if (entries.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <TimeIcon sx={{ fontSize: 48, color: '#4B5563', mb: 1 }} />
        <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
          No history available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {displayedEntries.map((entry, index) => (
        <TimelineEntry
          key={entry.id}
          entry={entry}
          showEntityType={showEntityType}
          compact={compact}
          isLast={index === displayedEntries.length - 1 && !hasMore}
        />
      ))}
      {hasMore && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: '#9CA3AF', fontWeight: 600 }}>
              +{entries.length - maxItems!}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#6B7280' }}>
            {entries.length - maxItems!} more changes
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AuditTimeline;
