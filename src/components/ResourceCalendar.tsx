/**
 * Resource Calendar Component
 * Visual grid showing team allocations by week
 *
 * Updated 2026-02-19: Added cascading phase selector in allocation dialog
 * Updated 2026-01-29: Now supports day-level allocations with start_date/end_date
 * - Allocations can span multiple days
 * - Drag-to-extend updates end_date instead of creating new allocations
 * - PTO entries display on their specific days
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import TodayIcon from '@mui/icons-material/Today';
import WarningIcon from '@mui/icons-material/Warning';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import Snackbar from '@mui/material/Snackbar';
import {
  useResourceCalendar,
  CalendarAllocation,
  AllocationGroup,
  UserWeekData,
  WeekCell,
  ViewMode,
  navigateByViewMode,
  PtoData,
} from '../hooks/useResourceCalendar';
import { ViewToggle } from './ViewToggle';
import { UserAvatar } from './shared/UserAvatar';
import { getDisciplineColor, normalizeDiscipline, DISCIPLINE_ORDER } from '../utils/disciplineColors';
import { api } from '../lib/apiClient';

interface ResourceCalendarProps {
  orgId: string;
  currentUserId: string;
  currentUserRole?: 'employee' | 'pm' | 'admin';
  projects: Array<{ id: string; name: string; color: string; priority?: number | null }>;
  onAllocationClick?: (allocation: CalendarAllocation) => void;
  onUserClick?: (userId: string) => void;
  initialViewMode?: ViewMode;
}

// Column widths based on view mode
const COLUMN_WIDTHS = {
  day: { name: 200, cell: 'minmax(300px, 1fr)' },
  week: { name: 180, cell: 'minmax(120px, 1fr)' },
  month: { name: 160, cell: 'minmax(80px, 1fr)' },
};

/**
 * Format column header based on view mode
 */
function formatColumnHeader(dateStr: string, viewMode: ViewMode): string {
  const date = new Date(dateStr + 'T00:00:00');
  if (viewMode === 'day') {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }
  if (viewMode === 'week') {
    // Week view shows day name and date (e.g., "Mon 20")
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  }
  // Month view - show week start date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format week label (e.g., "Jan 13") - kept for backwards compatibility
 */
function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date range for display (e.g., "Jan 13-17" or "Jan 13 - Feb 2")
 */
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  if (start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.getDate()}`;
  }
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/**
 * Get Monday of a given week
 */
function getWeekMonday(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Get Friday of a given week
 */
function getWeekFriday(dateStr: string): string {
  const monday = getWeekMonday(dateStr);
  const date = new Date(monday + 'T00:00:00');
  date.setDate(date.getDate() + 4);
  return date.toISOString().split('T')[0];
}

/**
 * Check if a date/week contains today
 */
function isCurrentWeek(dateStr: string, viewMode: ViewMode = 'month'): boolean {
  const today = new Date();
  const targetDate = new Date(dateStr + 'T00:00:00');

  if (viewMode === 'week' || viewMode === 'day') {
    // In week/day view, check if this specific date is today
    return (
      today.getFullYear() === targetDate.getFullYear() &&
      today.getMonth() === targetDate.getMonth() &&
      today.getDate() === targetDate.getDate()
    );
  }

  // In month view, check if today falls within this week
  const weekEndDate = new Date(targetDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  return today >= targetDate && today <= weekEndDate;
}

/**
 * Calculate number of days between two dates
 */
function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * PTO indicator badge
 */
function PtoBadge({ ptoData }: { ptoData: PtoData }) {
  const typeLabels: Record<string, string> = {
    pto: 'PTO',
    holiday: 'Holiday',
    'half-day': 'Half Day',
    sick: 'Sick',
  };

  const typeColors: Record<string, string> = {
    pto: '#2196F3',
    holiday: '#4CAF50',
    'half-day': '#FF9800',
    sick: '#F44336',
  };

  return (
    <Tooltip title={ptoData.notes || `${typeLabels[ptoData.type]} - ${ptoData.hours}h`}>
      <Chip
        icon={<BeachAccessIcon sx={{ fontSize: 14 }} />}
        label={`${typeLabels[ptoData.type]} ${ptoData.hours}h`}
        size="small"
        sx={{
          bgcolor: typeColors[ptoData.type],
          color: '#fff',
          fontSize: '0.65rem',
          height: 20,
          mb: 0.5,
          '& .MuiChip-icon': {
            color: '#fff',
          },
        }}
      />
    </Tooltip>
  );
}

/**
 * Allocation block within a cell
 * Includes a drag handle on the right edge for extending to future days
 */
function AllocationBlock({
  allocation,
  onClick,
  onDragExtendStart,
  isReadOnly = false,
  showDateRange = false,
  displayHours,
}: {
  allocation: CalendarAllocation;
  onClick?: () => void;
  onDragExtendStart?: (allocation: CalendarAllocation) => void;
  isReadOnly?: boolean;
  showDateRange?: boolean;
  displayHours?: number; // Per-day hours to display instead of total
}) {
  const [isHovered, setIsHovered] = useState(false);
  const daysSpan = daysBetween(allocation.startDate, allocation.endDate);
  
  // Use displayHours if provided (per-day), otherwise fall back to total
  // Round to avoid floating-point display issues (e.g., 7.999999 → 8)
  const rawHours = displayHours !== undefined ? displayHours : allocation.plannedHours;
  const hoursToShow = Math.round(rawHours * 100) / 100;

  const handleDragHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger onClick
    onDragExtendStart?.(allocation);
  };

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2" fontWeight={600}>{allocation.projectName}</Typography>
          {allocation.phaseName && (
            <Typography variant="caption" display="block">{allocation.phaseName}</Typography>
          )}
          <Typography variant="caption" display="block">
            {formatDateRange(allocation.startDate, allocation.endDate)} ({daysSpan} day{daysSpan > 1 ? 's' : ''})
          </Typography>
          <Typography variant="caption" display="block">{hoursToShow % 1 === 0 ? hoursToShow : hoursToShow.toFixed(1)}h planned</Typography>
          {allocation.notes && (
            <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 0.5 }}>
              {allocation.notes}
            </Typography>
          )}
          {!isReadOnly && (
            <Typography variant="caption" display="block" sx={{ color: '#80FF9C', mt: 0.5 }}>
              Drag right edge to extend →
            </Typography>
          )}
        </Box>
      }
      arrow
    >
      <Box
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          bgcolor: allocation.projectColor,
          color: '#fff',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '0.75rem',
          fontWeight: 500,
          cursor: 'pointer',
          mb: 0.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'transform 0.1s, box-shadow 0.1s',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: 2,
          },
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          position: 'relative',
          // Non-billable visual differentiation: muted + dashed left border
          ...(allocation.isBillable === false && {
            opacity: 0.75,
            borderLeft: '3px dashed rgba(255,255,255,0.4)',
          }),
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {allocation.projectName}
          {allocation.isBillable === false && (
            <span style={{ marginLeft: 4, opacity: 0.8, fontSize: '0.65rem' }}>NB</span>
          )}
        </span>
        <span style={{ opacity: 0.9, marginLeft: 4, flexShrink: 0 }}>
          {hoursToShow % 1 === 0 ? hoursToShow : hoursToShow.toFixed(1)}h
        </span>

        {/* Drag handle for extending - visible on hover */}
        {!isReadOnly && isHovered && (
          <Box
            onMouseDown={handleDragHandleMouseDown}
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 12,
              bgcolor: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'ew-resize',
              borderTopRightRadius: 4,
              borderBottomRightRadius: 4,
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.5)',
              },
            }}
          >
            <Box
              sx={{
                width: 2,
                height: 12,
                bgcolor: 'rgba(255,255,255,0.6)',
                borderRadius: 1,
              }}
            />
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}

/**
 * Map day index (0=Sun, 1=Mon, ..., 6=Sat) to work schedule keys
 */
const DAY_TO_SCHEDULE_KEY: Record<number, 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
};

/**
 * Week cell for a user
 */
function WeekCellComponent({
  cell,
  userId,
  onAddClick,
  onAllocationClick,
  onDragExtendStart,
  onClearDay,
  isDragTarget,
  isReadOnly,
  viewMode = 'month',
  workSchedule,
}: {
  cell: WeekCell;
  userId: string;
  onAddClick: () => void;
  onAllocationClick?: (allocation: CalendarAllocation) => void;
  onDragExtendStart?: (allocation: CalendarAllocation) => void;
  onClearDay?: (userId: string, date: string) => void;
  isDragTarget?: boolean;
  isReadOnly?: boolean;
  viewMode?: ViewMode;
  workSchedule?: { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number } | null;
}) {
  const isCurrent = isCurrentWeek(cell.weekStart, viewMode);
  const overThreshold = viewMode === 'week' || viewMode === 'day' ? 8 : 40;

  // Filter out 0h allocations for display
  const filteredAllocations = cell.allocations.filter(a => a.plannedHours > 0);

  // Determine unavailability based on work schedule and PTO
  // Only applies in week/day view (single-day cells)
  const cellDate = new Date(cell.date + 'T00:00:00');
  const dayOfWeek = cellDate.getDay();
  const dayKey = DAY_TO_SCHEDULE_KEY[dayOfWeek];

  // Get available hours for this day (default to 8 for standard schedule)
  const hoursAvailable = workSchedule?.[dayKey] ?? (dayOfWeek === 0 || dayOfWeek === 6 ? 0 : 8);

  // Check for PTO — show stripes for full-day PTO (>= 8h) or any PTO typed as 'pto' or 'holiday'
  const hasPto = cell.ptoEntries && cell.ptoEntries.length > 0;
  const isFullDayPto = hasPto && (
    (cell.ptoHours && cell.ptoHours >= 8) ||
    cell.ptoEntries?.some(p => p.type === 'pto' || p.type === 'holiday')
  );

  // Determine unavailability status (only in week/day view)
  // Show stripes for 0h work schedule days OR full-day PTO/holidays
  const isUnavailable = (viewMode === 'week' || viewMode === 'day') && (hoursAvailable === 0 || isFullDayPto);

  // Diagonal stripe styles for unavailable days (0h only)
  const unavailabilityStyles = isUnavailable ? {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 1,
      background: 'repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255, 255, 255, 0.06) 8px, rgba(255, 255, 255, 0.06) 10px)',
    },
  } : {};

  return (
    <Box
      data-week-start={cell.weekStart}
      data-user-id={userId}
      sx={{
        minHeight: 80,
        p: 1,
        pb: 3, // Extra padding at bottom for hours total
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: isDragTarget ? 'primary.50' : isCurrent ? 'action.hover' : 'transparent',
        position: 'relative',
        transition: 'background-color 0.15s ease',
        '&:hover .add-button': {
          opacity: 1,
        },
        // Visual indicator when this is a drag target
        ...(isDragTarget && {
          outline: '2px dashed',
          outlineColor: 'primary.main',
          outlineOffset: -2,
        }),
        // Diagonal stripes for unavailable/reduced hours days
        ...unavailabilityStyles,
      }}
    >
      {/* PTO entries */}
      {cell.ptoEntries && cell.ptoEntries.map((pto) => (
        <PtoBadge key={pto.id} ptoData={pto} />
      ))}

      {/* Allocations - 0h allocations already filtered via filteredAllocations */}
      {filteredAllocations.map((allocation) => (
        <AllocationBlock
          key={allocation.id}
          allocation={allocation}
          onClick={() => onAllocationClick?.(allocation)}
          onDragExtendStart={onDragExtendStart}
          isReadOnly={isReadOnly}
          showDateRange={viewMode !== 'week'}
        />
      ))}

      {/* Empty state with add button */}
      {filteredAllocations.length === 0 && !cell.ptoEntries && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: 60,
          }}
        >
          <IconButton
            size="small"
            onClick={onAddClick}
            className="add-button"
            sx={{
              opacity: 0,
              transition: 'opacity 0.2s',
              bgcolor: 'action.hover',
              '&:hover': {
                bgcolor: 'action.selected',
              },
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Add button for cells with allocations - always visible regardless of hours */}
      {(filteredAllocations.length > 0 || cell.ptoEntries) && (
        <IconButton
          size="small"
          onClick={onAddClick}
          className="add-button"
          sx={{
            opacity: 0,
            transition: 'opacity 0.2s',
            position: 'absolute',
            bottom: 4,
            right: 4,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      )}

      {/* Total hours + Clear Day button */}
      {cell.totalHours > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            right: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 0.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: cell.isOverAllocated ? 'error.main' : 'text.secondary',
                fontWeight: cell.isOverAllocated ? 600 : 400,
              }}
            >
              {Math.round(cell.totalHours * 100) / 100}h
            </Typography>
            {cell.isOverAllocated && (
              <Tooltip title={`Over ${overThreshold} hours`}>
                <WarningIcon sx={{ fontSize: 14, color: 'error.main' }} />
              </Tooltip>
            )}
          </Box>
          {/* Clear Day button - visible on hover when 2+ allocations */}
          {!isReadOnly && filteredAllocations.length >= 2 && onClearDay && (
            <Tooltip title="Clear all allocations for this day">
              <IconButton
                size="small"
                className="add-button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Clear all ${filteredAllocations.length} allocations for this day?`)) {
                    onClearDay(userId, cell.date);
                  }
                }}
                sx={{
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  p: 0.25,
                  '&:hover': { bgcolor: 'error.light', color: '#fff' },
                }}
              >
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  );
}

/**
 * User row in the calendar
 */
function UserRow({
  userData,
  weeks,
  onAddClick,
  onAllocationClick,
  onDragExtendStart,
  onClearDay,
  dragTargetWeeks,
  onUserClick,
  isReadOnly,
  viewMode = 'week',
  nameColumnWidth = 180,
}: {
  userData: UserWeekData;
  weeks: string[];
  onAddClick: (userId: string, weekStart: string) => void;
  onAllocationClick?: (allocation: CalendarAllocation) => void;
  onDragExtendStart?: (allocation: CalendarAllocation) => void;
  onClearDay?: (userId: string, date: string) => void;
  dragTargetWeeks?: string[];
  onUserClick?: (userId: string) => void;
  isReadOnly?: boolean;
  viewMode?: ViewMode;
  nameColumnWidth?: number;
}) {
  const { user, weeks: weekCells, averageUtilization, maxCapacityHours, totalAllocatedHours } = userData;

  // Utilization color
  const utilizationColor =
    averageUtilization > 100 ? 'error' :
    averageUtilization >= 80 ? 'success' :
    averageUtilization >= 50 ? 'warning' :
    'inherit';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `${nameColumnWidth}px repeat(var(--week-count), ${COLUMN_WIDTHS[viewMode].cell})`,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
      style={{ '--week-count': weeks.length } as React.CSSProperties}
    >
      {/* User info column */}
      <Box
        onClick={() => onUserClick?.(user.id)}
        sx={{
          p: 1.5,
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
          position: 'sticky',
          left: 0,
          zIndex: 1,
          cursor: onUserClick ? 'pointer' : 'default',
          transition: 'background-color 0.2s',
          '&:hover': onUserClick ? {
            bgcolor: 'action.hover',
          } : {},
        }}
      >
        <UserAvatar
          name={user.name}
          avatarUrl={user.avatar_url}
          discipline={user.discipline}
          size="sm"
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={500}
            noWrap
            sx={{
              color: onUserClick ? 'primary.main' : 'text.primary',
              '&:hover': onUserClick ? { textDecoration: 'underline' } : {},
            }}
          >
            {user.name}
          </Typography>
          <Tooltip
            title={
              user.hasCustomSchedule ? (
                <Box>
                  <Typography variant="caption" display="block">
                    Custom schedule: {user.weeklyCapacity}h/week
                  </Typography>
                  {user.workSchedule && (
                    <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                      M:{user.workSchedule.mon} T:{user.workSchedule.tue} W:{user.workSchedule.wed} Th:{user.workSchedule.thu} F:{user.workSchedule.fri}
                    </Typography>
                  )}
                </Box>
              ) : `${Math.round(totalAllocatedHours)}h of ${Math.round(maxCapacityHours)}h capacity`
            }
          >
            <Typography
              variant="caption"
              sx={{
                color: user.hasCustomSchedule ? 'info.main' : 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {Math.round(averageUtilization)}% utilized
              {user.hasCustomSchedule && (
                <Chip
                  label={`${user.weeklyCapacity}h/wk`}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.65rem',
                    bgcolor: 'info.main',
                    color: 'info.contrastText',
                    '& .MuiChip-label': { px: 0.5 },
                  }}
                />
              )}
            </Typography>
          </Tooltip>
        </Box>
      </Box>

      {/* Week cells */}
      {weeks.map((weekStart) => (
        <WeekCellComponent
          key={weekStart}
          cell={weekCells[weekStart]}
          userId={user.id}
          onAddClick={() => !isReadOnly && onAddClick(user.id, weekStart)}
          onAllocationClick={isReadOnly ? undefined : onAllocationClick}
          onDragExtendStart={isReadOnly ? undefined : onDragExtendStart}
          onClearDay={isReadOnly ? undefined : onClearDay}
          isDragTarget={dragTargetWeeks?.includes(weekStart)}
          isReadOnly={isReadOnly}
          viewMode={viewMode}
          workSchedule={user.workSchedule}
        />
      ))}
    </Box>
  );
}

/**
 * Add/Edit Allocation Dialog
 * Updated 2026-01-29: Supports single-day allocations with group editing
 * - New allocation: single day + "expand to week" checkbox
 * - Edit single tile: just edit that day's hours
 * - Edit bar (group): show "Edit All Days" button + individual day tiles
 */
function AllocationDialog({
  open,
  onClose,
  onSave,
  onDelete,
  onUpdateGroup,
  onDeleteGroup,
  allocation,
  allocationGroup,
  userId,
  userName,
  clickedDate,
  projects,
  viewMode = 'week',
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    projectId: string;
    phaseId?: string;
    startDate: string;
    endDate: string;
    plannedHours: number;
    notes: string;
    isBillable: boolean;
    expandToWeek?: boolean;
  }) => void;
  onDelete?: (id: string) => void;
  onUpdateGroup?: (allocationIds: string[], updates: { plannedHours?: number; notes?: string | null }) => void;
  onDeleteGroup?: (allocationIds: string[]) => void;
  allocation?: CalendarAllocation;
  allocationGroup?: AllocationGroup;
  userId: string;
  userName: string;
  clickedDate: string;
  projects: Array<{ id: string; name: string; color: string; priority?: number | null }>;
  viewMode?: ViewMode;
}) {
  const [projectId, setProjectId] = useState(allocation?.projectId || '');
  const [phaseId, setPhaseId] = useState<string>('');
  const [phases, setPhases] = useState<Array<{ id: string; name: string }>>([]);
  const [phasesLoading, setPhasesLoading] = useState(false);
  const [startDate, setStartDate] = useState(allocation?.startDate || clickedDate);
  const [endDate, setEndDate] = useState(allocation?.endDate || clickedDate);
  const [hoursInput, setHoursInput] = useState<string>(allocation ? String(allocation.plannedHours) : '');
  const [notes, setNotes] = useState(allocation?.notes || '');
  const [isBillable, setIsBillable] = useState(allocation?.isBillable ?? true);
  const [useWholeWeek, setUseWholeWeek] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editMode, setEditMode] = useState<'all' | 'single'>('all');
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [groupHoursInput, setGroupHoursInput] = useState<string>(allocationGroup ? String(allocationGroup.hoursPerDay) : '');

  // Derived number values with fallback to 8
  const plannedHours = hoursInput === '' ? 8 : Number(hoursInput);
  const groupHoursPerDay = groupHoursInput === '' ? 8 : Number(groupHoursInput);

  // Fetch phases when project changes
  React.useEffect(() => {
    if (!projectId) {
      setPhases([]);
      setPhaseId('');
      return;
    }
    let cancelled = false;
    setPhasesLoading(true);
    api.get<{ phases: Array<{ id: string; name: string }> }>(`/api/projects/${projectId}/phases`)
      .then(data => {
        if (!cancelled) {
          setPhases(data.phases || []);
          // If editing and allocation has a phaseId, pre-select it
          if (allocation?.phaseId) {
            setPhaseId(allocation.phaseId);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setPhases([]);
      })
      .finally(() => {
        if (!cancelled) setPhasesLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  // Sort projects by priority (lower number = higher priority), then by name
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      // Projects with priority come first, sorted by priority (ascending)
      const aPriority = a.priority ?? 9999;
      const bPriority = b.priority ?? 9999;
      if (aPriority !== bPriority) return aPriority - bPriority;
      // Then sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [projects]);

  // Get selected project object
  const selectedProject = sortedProjects.find(p => p.id === projectId) || null;

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setProjectId(allocation?.projectId || allocationGroup?.projectId || '');
      setPhaseId(allocation?.phaseId || '');
      setStartDate(allocation?.startDate || clickedDate);
      setEndDate(allocation?.endDate || clickedDate);
      setHoursInput(allocation ? String(allocation.plannedHours) : '');
      setNotes(allocation?.notes || allocationGroup?.notes || '');
      setIsBillable(allocation?.isBillable ?? allocationGroup?.isBillable ?? true);
      setUseWholeWeek(false);
      setConfirmDelete(false);
      setEditMode('all');
      setSelectedDayId(null);
      setGroupHoursInput(allocationGroup ? String(allocationGroup.hoursPerDay) : '');
    }
  }, [open, allocation, allocationGroup, clickedDate]);

  // Handle "Allocate for whole week" checkbox
  // Updated: Now creates 5 single-day records at 8h each (not 40h total)
  const handleWholeWeekToggle = (checked: boolean) => {
    setUseWholeWeek(checked);
    if (checked) {
      const monday = getWeekMonday(clickedDate);
      setStartDate(monday);
      setEndDate(monday); // Will expand to week via expandToWeek flag
      setHoursInput('8'); // 8h per day
    } else {
      setStartDate(clickedDate);
      setEndDate(clickedDate);
      setHoursInput('');
    }
  };

  const handleSave = () => {
    if (!projectId) return;
    if (plannedHours <= 0) {
      // If hours are 0 or negative, delete the allocation instead
      if (allocation && onDelete) {
        onDelete(allocation.id);
        onClose();
        return;
      }
      // When editing a single day from a group
      if (selectedDayId && onDelete) {
        onDelete(selectedDayId);
        onClose();
        return;
      }
    }
    onSave({
      projectId,
      phaseId: phaseId || undefined,
      startDate,
      endDate,
      plannedHours,
      notes,
      isBillable,
      expandToWeek: useWholeWeek,
    });
    onClose();
  };

  // Handle saving a single day from a group (updates just that allocation)
  const handleSaveSingleDay = () => {
    if (selectedDayId && onUpdateGroup) {
      if (plannedHours <= 0) {
        // Delete this day's allocation
        if (onDelete) {
          onDelete(selectedDayId);
          onClose();
        }
        return;
      }
      // Update just this one allocation
      onUpdateGroup([selectedDayId], {
        plannedHours,
        notes: notes || null,
      });
      onClose();
    }
  };

  // Handle "Edit All Days" for group
  const handleSaveGroup = () => {
    if (allocationGroup && onUpdateGroup) {
      onUpdateGroup(allocationGroup.allocationIds, {
        plannedHours: groupHoursPerDay,
        notes: notes || null,
      });
      onClose();
    }
  };

  // Handle delete for single allocation
  const handleDelete = () => {
    // Standard single allocation
    if (allocation && onDelete) {
      onDelete(allocation.id);
      onClose();
      return;
    }
    // Single day from a group
    if (selectedDayId && onDelete) {
      onDelete(selectedDayId);
      onClose();
    }
  };

  // Handle delete for entire group
  const handleDeleteGroup = () => {
    if (allocationGroup && onDeleteGroup) {
      onDeleteGroup(allocationGroup.allocationIds);
      onClose();
    }
  };

  // Helper: generate list of dates in a group for day chip display
  const getGroupDates = (): { id: string; date: string; dayName: string }[] => {
    if (!allocationGroup) return [];
    const dates: { id: string; date: string; dayName: string }[] = [];
    const start = new Date(allocationGroup.startDate + 'T00:00:00');
    const end = new Date(allocationGroup.endDate + 'T00:00:00');
    let idIndex = 0;

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = current.toISOString().split('T')[0];
        const dayName = current.toLocaleDateString('en-US', { weekday: 'short' });
        dates.push({
          id: allocationGroup.allocationIds[idIndex] || allocationGroup.id,
          date: dateStr,
          dayName,
        });
        idIndex++;
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const daysSpan = daysBetween(startDate, endDate);
  const isEditingGroup = allocationGroup && allocationGroup.isBar && editMode === 'all';
  const groupDates = getGroupDates();

  // When editing a group (bar) AND in 'all' mode, show the group view
  // When editMode is 'single', fall through to the single allocation edit form
  if (allocationGroup && allocationGroup.isBar && editMode === 'all') {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Allocation Group</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Group summary */}
            <Alert
              severity="info"
              icon={false}
              sx={{ bgcolor: allocationGroup.projectColor + '20' }}
            >
              <Typography variant="body2">
                <strong>{allocationGroup.projectName}</strong>
              </Typography>
              <Typography variant="body2">
                {formatDateRange(allocationGroup.startDate, allocationGroup.endDate)} ({allocationGroup.dayCount} days @ {Math.round(allocationGroup.hoursPerDay * 100) / 100}h/day)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total: {Math.round(allocationGroup.totalHours * 100) / 100}h
              </Typography>
            </Alert>

            {/* Edit All section */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Edit All Days</Typography>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <TextField
                  label="Hours per day"
                  type="number"
                  size="small"
                  value={groupHoursInput}
                  onChange={(e) => setGroupHoursInput(e.target.value)}
                  placeholder="8"
                  inputProps={{ min: 0, max: 24, step: 0.5 }}
                  sx={{ width: 140 }}
                />
                <Button
                  variant="contained"
                  onClick={handleSaveGroup}
                  disabled={groupHoursPerDay === allocationGroup.hoursPerDay}
                >
                  Apply to All Days
                </Button>
              </Stack>
            </Box>

            <Divider />

            {/* Individual day tiles */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Or edit individual days:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {groupDates.map(({ id, date, dayName }) => (
                  <Chip
                    key={id}
                    label={`${dayName} ${Math.round(allocationGroup.hoursPerDay * 100) / 100}h`}
                    onClick={() => {
                      // Find the specific allocation for this day
                      setSelectedDayId(id);
                      setEditMode('single');
                      setStartDate(date);
                      setEndDate(date);
                      setHoursInput(String(allocationGroup.hoursPerDay));
                    }}
                    sx={{
                      bgcolor: allocationGroup.projectColor,
                      color: '#fff',
                      '&:hover': {
                        bgcolor: allocationGroup.projectColor,
                        filter: 'brightness(0.9)',
                      },
                    }}
                  />
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Click a day to edit it individually (will split the bar)
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Box>
            {confirmDelete ? (
              <Stack direction="row" spacing={1}>
                <Button
                  color="error"
                  variant="contained"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteGroup}
                >
                  Delete All {allocationGroup.dayCount} Days
                </Button>
                <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </Stack>
            ) : (
              <Button
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete Group
              </Button>
            )}
          </Box>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Determine if we're editing a single day from a group
  const isEditingSingleDayFromGroup = !!(selectedDayId && allocationGroup);

  // Single allocation edit / new allocation (existing behavior)
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditingSingleDayFromGroup
          ? `Edit Single Day - ${allocationGroup.projectName}`
          : allocation
            ? 'Edit Allocation'
            : 'Add Allocation'
        }
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info" icon={false}>
            <Typography variant="body2">
              <strong>{userName}</strong> — {formatDateRange(startDate, endDate)}
              {daysSpan > 1 && ` (${daysSpan} days)`}
            </Typography>
          </Alert>

          {/* Searchable Project Autocomplete - disabled when editing single day from group */}
          <Autocomplete
            value={selectedProject}
            onChange={(_, newValue) => {
              setProjectId(newValue?.id || '');
              setPhaseId(''); // Reset phase when project changes
            }}
            options={sortedProjects}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            disabled={isEditingSingleDayFromGroup}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Project"
                placeholder="Search projects..."
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: option.color,
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ flex: 1 }}>{option.name}</Typography>
                  {option.priority && option.priority <= 10 && (
                    <Typography variant="caption" color="text.secondary">
                      P{option.priority}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            fullWidth
            autoHighlight
            openOnFocus
          />

          {/* Phase selector - only shows when selected project has phases */}
          {phases.length > 0 && (
            <Autocomplete
              value={phases.find(p => p.id === phaseId) || null}
              onChange={(_, newValue) => setPhaseId(newValue?.id || '')}
              options={phases}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={phasesLoading}
              disabled={isEditingSingleDayFromGroup}
              ListboxProps={{ style: { maxHeight: 200 } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Sub-project / Phase"
                  placeholder="Select phase (optional)..."
                />
              )}
              fullWidth
              autoHighlight
              openOnFocus
            />
          )}

          {/* Date range inputs - only for new allocations */}
          {!allocation && !allocationGroup && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={useWholeWeek}
                  onChange={(e) => handleWholeWeekToggle(e.target.checked)}
                />
              }
              label="Allocate for whole week (Mon-Fri, 8h per day)"
            />
          )}

          {!useWholeWeek && (
            <Stack direction="row" spacing={2}>
              <TextField
                label="Date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setEndDate(e.target.value); // Keep single-day
                }}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          )}

          <TextField
            label="Hours (for this day)"
            type="number"
            value={hoursInput}
            onChange={(e) => setHoursInput(e.target.value)}
            placeholder="8"
            inputProps={{ min: 0, max: 24, step: 0.5 }}
            fullWidth
            helperText={useWholeWeek ? '8h per day × 5 days = 40h total' : undefined}
          />

          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Billable</InputLabel>
            <Select
              value={isBillable ? 'yes' : 'no'}
              label="Billable"
              onChange={(e) => setIsBillable(e.target.value === 'yes')}
            >
              <MenuItem value="yes">Yes - Billable</MenuItem>
              <MenuItem value="no">No - Non-billable</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: (allocation || isEditingSingleDayFromGroup) ? 'space-between' : 'flex-end' }}>
        {/* Delete button - show when editing an allocation or single day from group */}
        {(allocation || isEditingSingleDayFromGroup) && onDelete && (
          <Box>
            {confirmDelete ? (
              <Stack direction="row" spacing={1}>
                <Button
                  color="error"
                  variant="contained"
                  startIcon={<DeleteIcon />}
                  onClick={handleDelete}
                >
                  Confirm Delete
                </Button>
                <Button onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </Stack>
            ) : (
              <Button
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete{isEditingSingleDayFromGroup ? ' This Day' : ''}
              </Button>
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Back to Group button when editing single day from group */}
          {isEditingSingleDayFromGroup && (
            <Button
              onClick={() => {
                setEditMode('all');
                setSelectedDayId(null);
                setConfirmDelete(false);
              }}
            >
              ← Back to Group
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={isEditingSingleDayFromGroup ? handleSaveSingleDay : handleSave}
            variant="contained"
            disabled={!projectId && !isEditingSingleDayFromGroup}
          >
            {isEditingSingleDayFromGroup
              ? 'Save This Day'
              : allocation
                ? 'Save Changes'
                : 'Add Allocation'
            }
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Main Resource Calendar Component
 */
export function ResourceCalendar({
  orgId,
  currentUserId,
  currentUserRole = 'admin',
  projects,
  onAllocationClick,
  onUserClick,
  initialViewMode = 'week',
}: ResourceCalendarProps) {
  const isReadOnly = currentUserRole === 'employee';

  // View mode state - persist to localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resourceCalendar.viewMode');
      if (saved === 'day' || saved === 'week' || saved === 'month') {
        return saved;
      }
    }
    return initialViewMode;
  });

  // Save view mode preference
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('resourceCalendar.viewMode', mode);
    }
  };

  const [startDate, setStartDate] = useState(() => {
    // Start from the beginning of current week
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContext, setDialogContext] = useState<{
    userId: string;
    userName: string;
    clickedDate: string;
    allocation?: CalendarAllocation;
    allocationGroup?: AllocationGroup;
  } | null>(null);

  // Calculate weeks to show based on view mode
  const weeksToShow = viewMode === 'month' ? 5 : viewMode === 'day' ? 1 : 6;

  const {
    gridData: rawGridData,
    weeks,
    loading,
    error,
    allocationGroups,
    createAllocation,
    updateAllocation,
    updateAllocationGroup,
    deleteAllocation,
    deleteAllocationGroup,
    clearDayAllocations,
    extendAllocation,
    repeatLastWeek,
    getGroupsForUser,
  } = useResourceCalendar({
    orgId,
    startDate,
    weeksToShow,
    viewMode,
  });

  // Snackbar state for feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Drag-to-extend state
  const [dragExtendState, setDragExtendState] = useState<{
    allocation: CalendarAllocation | null;
    startDate: string;
    targetDate: string | null;
    userId: string;
  } | null>(null);

  // Handle clearing all allocations for a day
  const handleClearDay = useCallback(async (userId: string, date: string) => {
    try {
      await clearDayAllocations(userId, date);
      setSnackbar({
        open: true,
        message: `Cleared all allocations for ${formatWeekLabel(date)}`,
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to clear day: ${err instanceof Error ? err.message : 'Unknown error'}`,
        severity: 'error',
      });
    }
  }, [clearDayAllocations]);

  // Handle starting a drag extend operation
  const handleDragExtendStart = useCallback((allocation: CalendarAllocation) => {
    console.log('🎯 Drag extend started for:', allocation.projectName);
    setDragExtendState({
      allocation,
      startDate: allocation.startDate,
      targetDate: null,
      userId: allocation.userId,
    });

    // Add mouse move and mouse up listeners for the drag operation
    const handleMouseMove = (e: MouseEvent) => {
      // Find which week cell the mouse is over
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const weekCell = elements.find(el => el.getAttribute('data-week-start'));
      if (weekCell) {
        const cellDate = weekCell.getAttribute('data-week-start');
        const targetUserId = weekCell.getAttribute('data-user-id');

        if (cellDate && targetUserId === allocation.userId) {
          // Only allow extending to dates after the current end date
          if (cellDate > allocation.endDate) {
            setDragExtendState(prev => prev ? { ...prev, targetDate: cellDate } : null);
          } else {
            setDragExtendState(prev => prev ? { ...prev, targetDate: null } : null);
          }
        }
      }
    };

    const handleMouseUp = async () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Get final state and update allocation
      setDragExtendState(prev => {
        if (!prev || !prev.allocation || !prev.targetDate) {
          return null;
        }

        // Update the allocation's end date
        const doExtend = async () => {
          try {
            await extendAllocation(prev.allocation!.id, prev.targetDate!);
            setSnackbar({
              open: true,
              message: `Extended allocation to ${formatWeekLabel(prev.targetDate!)}`,
              severity: 'success',
            });
          } catch (err) {
            console.error('Failed to extend allocation:', err);
            setSnackbar({
              open: true,
              message: `Failed to extend allocation: ${err instanceof Error ? err.message : 'Unknown error'}`,
              severity: 'error',
            });
          }
        };

        doExtend();
        return null;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [extendAllocation]);

  // Calculate drag target dates (all dates from original end to target)
  const dragTargetDates = useMemo(() => {
    if (!dragExtendState?.targetDate || !dragExtendState?.allocation) return [];

    const targets: string[] = [];
    const current = new Date(dragExtendState.allocation.endDate + 'T00:00:00');
    const target = new Date(dragExtendState.targetDate + 'T00:00:00');

    current.setDate(current.getDate() + 1);
    while (current <= target) {
      targets.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return targets;
  }, [dragExtendState]);

  // Group users by discipline, sorted alphabetically within each group
  const groupedByDiscipline = useMemo(() => {
    const groups: Record<string, UserWeekData[]> = {};

    // Sort all users alphabetically first
    const sortedData = [...rawGridData].sort((a, b) =>
      a.user.name.localeCompare(b.user.name)
    );

    // Group by normalized discipline
    sortedData.forEach((userData) => {
      const discipline = normalizeDiscipline(userData.user.discipline);
      if (!groups[discipline]) {
        groups[discipline] = [];
      }
      groups[discipline].push(userData);
    });

    return groups;
  }, [rawGridData]);

  // Flat list for lookups (still needed for dialog handlers)
  const gridData = rawGridData;

  // Navigation - uses navigateByViewMode for correct increments
  const goBack = () => {
    const newDate = navigateByViewMode(startDate, 'prev', viewMode);
    setStartDate(newDate);
  };

  const goForward = () => {
    const newDate = navigateByViewMode(startDate, 'next', viewMode);
    setStartDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    if (viewMode === 'day') {
      // Day view: go to actual today
      setStartDate(today);
    } else {
      // Week/Month view: go to Monday of current week
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      setStartDate(new Date(new Date().setDate(diff)));
    }
  };

  // Get navigation tooltip text based on view mode
  const getNavTooltip = (direction: 'prev' | 'next') => {
    const labels = {
      day: direction === 'prev' ? 'Previous day' : 'Next day',
      week: direction === 'prev' ? 'Previous week' : 'Next week',
      month: direction === 'prev' ? 'Previous month' : 'Next month',
    };
    return labels[viewMode];
  };

  // Get column width based on view mode
  const nameColumnWidth = COLUMN_WIDTHS[viewMode].name;

  // Dialog handlers
  const handleAddClick = (userId: string, clickedDate: string) => {
    const user = gridData.find(u => u.user.id === userId)?.user;
    if (user) {
      setDialogContext({
        userId,
        userName: user.name,
        clickedDate,
      });
      setDialogOpen(true);
    }
  };

  const handleAllocationClick = (allocation: CalendarAllocation) => {
    const user = gridData.find(u => u.user.id === allocation.userId)?.user;
    if (user) {
      // Check if this allocation is part of a multi-day group (bar)
      const group = allocationGroups.find(g =>
        g.allocationIds.includes(allocation.id) && g.isBar
      );

      setDialogContext({
        userId: allocation.userId,
        userName: user.name,
        clickedDate: allocation.startDate,
        allocation: group ? undefined : allocation, // Only pass allocation if not in a group
        allocationGroup: group,
      });
      setDialogOpen(true);
    }
  };

  const handleDialogSave = async (data: {
    projectId: string;
    phaseId?: string;
    startDate: string;
    endDate: string;
    plannedHours: number;
    notes: string;
    isBillable: boolean;
    expandToWeek?: boolean;
  }) => {
    if (!dialogContext) return;

    try {
      if (dialogContext.allocation) {
        // Update existing single allocation
        await updateAllocation(dialogContext.allocation.id, {
          projectId: data.projectId,
          startDate: data.startDate,
          endDate: data.startDate, // Single-day model: start = end
          plannedHours: data.plannedHours,
          notes: data.notes || null,
          isBillable: data.isBillable,
        });
        setSnackbar({
          open: true,
          message: 'Allocation updated',
          severity: 'success',
        });
      } else {
        // Create new allocation(s)
        await createAllocation({
          userId: dialogContext.userId,
          projectId: data.projectId,
          phaseId: data.phaseId,
          startDate: data.startDate,
          endDate: data.startDate, // Single-day model
          plannedHours: data.plannedHours,
          notes: data.notes,
          isBillable: data.isBillable,
          createdBy: currentUserId,
          expandToWeek: data.expandToWeek,
        });
        setSnackbar({
          open: true,
          message: data.expandToWeek ? 'Week allocations added (5 days @ 8h each)' : 'Allocation added',
          severity: 'success',
        });
      }
    } catch (err: any) {
      console.error('Failed to save allocation:', err);

      // Provide user-friendly error messages
      let message = 'Failed to save allocation';
      if (err?.code === '23505' || err?.message?.includes('duplicate') || err?.status === 409) {
        message = 'An allocation already exists for this date';
      } else if (err?.message) {
        message = err.message;
      }

      setSnackbar({
        open: true,
        message,
        severity: 'error',
      });
    }
  };

  if (error) {
    return (
      <Alert severity="error">
        Failed to load resource calendar: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <Typography variant="h5" fontWeight={600}>
          Resource Calendar
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          {/* View Mode Toggle */}
          <ViewToggle value={viewMode} onChange={handleViewModeChange} />

          {/* Navigation */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title={getNavTooltip('prev')}>
              <IconButton onClick={goBack} size="small">
                <ChevronLeftIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Go to today">
              <IconButton onClick={goToToday} size="small">
                <TodayIcon sx={{ color: '#fff' }} />
              </IconButton>
            </Tooltip>

            <Tooltip title={getNavTooltip('next')}>
              <IconButton onClick={goForward} size="small">
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Date range label */}
          <Typography variant="body2" color="text.secondary">
            {weeks.length === 1
              ? formatColumnHeader(weeks[0], viewMode)
              : `${formatWeekLabel(weeks[0])} — ${formatWeekLabel(weeks[weeks.length - 1])}`
            }
          </Typography>

          {/* Repeat Last Week button - only show for week view and managers */}
          {viewMode === 'week' && currentUserRole !== 'employee' && weeks.length > 0 && (
            <Tooltip title="Copy last week's allocations to current view">
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={async () => {
                  try {
                    // Use the first week in view as target
                    const targetWeek = getWeekMonday(weeks[0]);
                    const count = await repeatLastWeek(targetWeek, currentUserId);
                    if (count === 0) {
                      setSnackbar({
                        open: true,
                        message: 'No allocations to copy (previous week empty or all already exist)',
                        severity: 'info',
                      });
                    } else {
                      setSnackbar({
                        open: true,
                        message: `Copied ${count} allocation${count === 1 ? '' : 's'} from last week`,
                        severity: 'success',
                      });
                    }
                  } catch (err) {
                    console.error('Repeat Last Week failed:', err);
                    setSnackbar({
                      open: true,
                      message: 'Failed to copy allocations',
                      severity: 'error',
                    });
                  }
                }}
                sx={{
                  color: 'text.secondary',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                Repeat Last Week
              </Button>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Loading indicator */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Calendar grid */}
      <Paper sx={{ overflow: 'auto' }}>
        {/* Header row */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `${nameColumnWidth}px repeat(var(--week-count), ${COLUMN_WIDTHS[viewMode].cell})`,
            borderBottom: '2px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
            position: 'sticky',
            top: 0,
            zIndex: 2,
          }}
          style={{ '--week-count': weeks.length } as React.CSSProperties}
        >
          <Box
            sx={{
              p: 1.5,
              borderRight: '1px solid',
              borderColor: 'divider',
              fontWeight: 600,
            }}
          >
            Team Member
          </Box>

          {weeks.map((weekStart) => (
            <Box
              key={weekStart}
              sx={{
                p: viewMode === 'month' ? 1 : 1.5,
                borderRight: '1px solid',
                borderColor: 'divider',
                textAlign: 'center',
                bgcolor: isCurrentWeek(weekStart, viewMode) ? 'primary.50' : 'transparent',
              }}
            >
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ fontSize: viewMode === 'month' ? '0.75rem' : undefined }}
              >
                {formatColumnHeader(weekStart, viewMode)}
              </Typography>
              {isCurrentWeek(weekStart, viewMode) && (
                <Chip
                  label={viewMode === 'day' ? 'Today' : viewMode === 'week' ? 'Today' : 'This Week'}
                  size="small"
                  color="primary"
                  sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          ))}
        </Box>

        {/* User rows grouped by discipline */}
        {DISCIPLINE_ORDER.filter(disc => groupedByDiscipline[disc]?.length > 0).map((discipline) => (
          <React.Fragment key={discipline}>
            {/* Discipline header */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `${nameColumnWidth}px 1fr`,
                bgcolor: 'background.default',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{
                  p: 1,
                  pl: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: getDisciplineColor(discipline),
                  }}
                />
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  {discipline} ({groupedByDiscipline[discipline].length})
                </Typography>
              </Box>
              <Box />
            </Box>
            {/* Users in this discipline */}
            {groupedByDiscipline[discipline].map((userData) => (
              <UserRow
                key={userData.user.id}
                userData={userData}
                weeks={weeks}
                onAddClick={handleAddClick}
                onAllocationClick={handleAllocationClick}
                onDragExtendStart={handleDragExtendStart}
                onClearDay={handleClearDay}
                dragTargetWeeks={
                  dragExtendState?.userId === userData.user.id
                    ? dragTargetDates
                    : undefined
                }
                onUserClick={onUserClick}
                isReadOnly={isReadOnly}
                viewMode={viewMode}
                nameColumnWidth={nameColumnWidth}
              />
            ))}
          </React.Fragment>
        ))}

        {/* Empty state */}
        {!loading && gridData.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No team members found. Add users to your organization to start planning.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      {dialogContext && (
        <AllocationDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setDialogContext(null);
          }}
          onSave={handleDialogSave}
          onDelete={async (id: string) => {
            try {
              await deleteAllocation(id);
              setSnackbar({
                open: true,
                message: 'Allocation deleted',
                severity: 'success',
              });
            } catch (err) {
              console.error('Failed to delete allocation:', err);
              setSnackbar({
                open: true,
                message: 'Failed to delete allocation',
                severity: 'error',
              });
            }
          }}
          onUpdateGroup={async (ids: string[], updates: { plannedHours?: number; notes?: string | null }) => {
            try {
              await updateAllocationGroup(ids, updates);
              setSnackbar({
                open: true,
                message: `Updated ${ids.length} allocations`,
                severity: 'success',
              });
            } catch (err) {
              console.error('Failed to update allocation group:', err);
              setSnackbar({
                open: true,
                message: 'Failed to update allocation group',
                severity: 'error',
              });
            }
          }}
          onDeleteGroup={async (ids: string[]) => {
            try {
              await deleteAllocationGroup(ids);
              setSnackbar({
                open: true,
                message: `Deleted ${ids.length} allocations`,
                severity: 'success',
              });
            } catch (err) {
              console.error('Failed to delete allocation group:', err);
              setSnackbar({
                open: true,
                message: 'Failed to delete allocation group',
                severity: 'error',
              });
            }
          }}
          allocation={dialogContext.allocation}
          allocationGroup={dialogContext.allocationGroup}
          userId={dialogContext.userId}
          userName={dialogContext.userName}
          clickedDate={dialogContext.clickedDate}
          projects={projects}
          viewMode={viewMode}
        />
      )}

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ResourceCalendar;
