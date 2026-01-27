/**
 * Resource Calendar Component
 * Visual grid showing team allocations by week
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Alert,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import TodayIcon from '@mui/icons-material/Today';
import WarningIcon from '@mui/icons-material/Warning';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import Snackbar from '@mui/material/Snackbar';
import {
  useResourceCalendar,
  CalendarAllocation,
  UserWeekData,
  WeekCell,
  ViewMode,
  navigateByViewMode,
} from '../hooks/useResourceCalendar';
import { ViewToggle } from './ViewToggle';
import { UserAvatar } from './shared/UserAvatar';
import { getDisciplineColor, normalizeDiscipline, DISCIPLINE_ORDER } from '../utils/disciplineColors';

interface ResourceCalendarProps {
  orgId: string;
  currentUserId: string;
  currentUserRole?: 'employee' | 'pm' | 'admin';
  projects: Array<{ id: string; name: string; color: string }>;
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
 * Allocation block within a cell
 * Includes a drag handle on the right edge for extending to future weeks
 */
function AllocationBlock({
  allocation,
  onClick,
  onDragExtendStart,
  isReadOnly = false,
}: {
  allocation: CalendarAllocation;
  onClick?: () => void;
  onDragExtendStart?: (allocation: CalendarAllocation) => void;
  isReadOnly?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

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
          <Typography variant="caption" display="block">{allocation.plannedHours}h planned</Typography>
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
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {allocation.projectName}
        </span>
        <span style={{ opacity: 0.9, marginLeft: 4, flexShrink: 0 }}>
          {allocation.plannedHours}h
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
 * Week cell for a user
 */
function WeekCellComponent({
  cell,
  userId,
  onAddClick,
  onAllocationClick,
  onDragExtendStart,
  isDragTarget,
  isReadOnly,
  viewMode = 'month',
}: {
  cell: WeekCell;
  userId: string;
  onAddClick: () => void;
  onAllocationClick?: (allocation: CalendarAllocation) => void;
  onDragExtendStart?: (allocation: CalendarAllocation) => void;
  isDragTarget?: boolean;
  isReadOnly?: boolean;
  viewMode?: ViewMode;
}) {
  const isCurrent = isCurrentWeek(cell.weekStart, viewMode);

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
      }}
    >
      {/* Allocations */}
      {cell.allocations.map((allocation) => (
        <AllocationBlock
          key={allocation.id}
          allocation={allocation}
          onClick={() => onAllocationClick?.(allocation)}
          onDragExtendStart={onDragExtendStart}
          isReadOnly={isReadOnly}
        />
      ))}
      
      {/* Empty state with add button */}
      {cell.allocations.length === 0 && (
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
      
      {/* Add button for cells with allocations */}
      {cell.allocations.length > 0 && cell.totalHours < 40 && (
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
      
      {/* Total hours */}
      {cell.totalHours > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: cell.isOverAllocated ? 'error.main' : 'text.secondary',
              fontWeight: cell.isOverAllocated ? 600 : 400,
            }}
          >
            {cell.totalHours}h
          </Typography>
          {cell.isOverAllocated && (
            <Tooltip title="Over 40 hours">
              <WarningIcon sx={{ fontSize: 14, color: 'error.main' }} />
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
  dragTargetWeeks?: string[];
  onUserClick?: (userId: string) => void;
  isReadOnly?: boolean;
  viewMode?: ViewMode;
  nameColumnWidth?: number;
}) {
  const { user, weeks: weekCells, averageUtilization } = userData;

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
          <Typography variant="caption" color="text.secondary">
            {Math.round(averageUtilization)}% utilized
          </Typography>
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
          isDragTarget={dragTargetWeeks?.includes(weekStart)}
          isReadOnly={isReadOnly}
          viewMode={viewMode}
        />
      ))}
    </Box>
  );
}

/**
 * Add/Edit Allocation Dialog
 */
function AllocationDialog({
  open,
  onClose,
  onSave,
  allocation,
  userId,
  userName,
  weekStart,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    projectId: string;
    plannedHours: number;
    notes: string;
    isBillable: boolean;
  }) => void;
  allocation?: CalendarAllocation;
  userId: string;
  userName: string;
  weekStart: string;
  projects: Array<{ id: string; name: string; color: string }>;
}) {
  const [projectId, setProjectId] = useState(allocation?.projectId || '');
  const [plannedHours, setPlannedHours] = useState(allocation?.plannedHours || 8);
  const [notes, setNotes] = useState(allocation?.notes || '');
  const [isBillable, setIsBillable] = useState(allocation?.isBillable ?? true);
  
  const handleSave = () => {
    if (!projectId) return;
    onSave({ projectId, plannedHours, notes, isBillable });
    onClose();
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {allocation ? 'Edit Allocation' : 'Add Allocation'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info" icon={false}>
            <Typography variant="body2">
              <strong>{userName}</strong> — Week of {formatWeekLabel(weekStart)}
            </Typography>
          </Alert>
          
          <FormControl fullWidth>
            <InputLabel>Project</InputLabel>
            <Select
              value={projectId}
              label="Project"
              onChange={(e) => setProjectId(e.target.value)}
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: project.color,
                      }}
                    />
                    {project.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="Planned Hours"
            type="number"
            value={plannedHours}
            onChange={(e) => setPlannedHours(Number(e.target.value))}
            inputProps={{ min: 0, max: 80, step: 1 }}
            fullWidth
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
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!projectId}>
          {allocation ? 'Save Changes' : 'Add Allocation'}
        </Button>
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
    weekStart: string;
    allocation?: CalendarAllocation;
  } | null>(null);

  // Calculate weeks to show based on view mode
  const weeksToShow = viewMode === 'month' ? 5 : viewMode === 'day' ? 1 : 6;

  const {
    gridData: rawGridData,
    weeks,
    loading,
    error,
    createAllocation,
    updateAllocation,
    repeatLastWeek,
  } = useResourceCalendar({
    orgId,
    startDate,
    weeksToShow,
    viewMode,
  });

  // Snackbar state for Repeat Last Week feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Drag-to-extend state
  const [dragExtendState, setDragExtendState] = useState<{
    allocation: CalendarAllocation | null;
    startWeek: string;
    targetWeeks: string[];
    userId: string;
  } | null>(null);

  // Handle starting a drag extend operation
  const handleDragExtendStart = useCallback((allocation: CalendarAllocation) => {
    console.log('🎯 Drag extend started for:', allocation.projectName);
    setDragExtendState({
      allocation,
      startWeek: allocation.weekStart,
      targetWeeks: [],
      userId: allocation.userId,
    });

    // Add mouse move and mouse up listeners for the drag operation
    const handleMouseMove = (e: MouseEvent) => {
      // Find which week cell the mouse is over
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const weekCell = elements.find(el => el.getAttribute('data-week-start'));
      if (weekCell) {
        const weekStart = weekCell.getAttribute('data-week-start');
        const targetUserId = weekCell.getAttribute('data-user-id');

        if (weekStart && targetUserId === allocation.userId) {
          // Only allow extending to future weeks for the same user
          if (weekStart > allocation.weekStart) {
            setDragExtendState(prev => {
              if (!prev) return null;

              // Calculate all weeks between start and target
              const allTargetWeeks: string[] = [];
              let currentWeek = new Date(prev.startWeek + 'T00:00:00');
              const targetDate = new Date(weekStart + 'T00:00:00');

              while (currentWeek <= targetDate) {
                const weekStr = currentWeek.toISOString().split('T')[0];
                if (weekStr > prev.startWeek) {
                  allTargetWeeks.push(weekStr);
                }
                currentWeek.setDate(currentWeek.getDate() + 7);
              }

              return { ...prev, targetWeeks: allTargetWeeks };
            });
          }
        }
      }
    };

    const handleMouseUp = async () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Get final state and create allocations
      setDragExtendState(prev => {
        if (!prev || !prev.allocation || prev.targetWeeks.length === 0) {
          return null;
        }

        // Create allocations for each target week
        const createAllocations = async () => {
          try {
            for (const weekStart of prev.targetWeeks) {
              await createAllocation({
                userId: prev.allocation!.userId,
                projectId: prev.allocation!.projectId,
                phaseId: prev.allocation!.phaseId || undefined,
                weekStart,
                plannedHours: prev.allocation!.plannedHours,
                createdBy: currentUserId,
              });
            }
            setSnackbar({
              open: true,
              message: `Extended allocation to ${prev.targetWeeks.length} more week${prev.targetWeeks.length === 1 ? '' : 's'}`,
              severity: 'success',
            });
          } catch (err) {
            console.error('Failed to extend allocation:', err);
            setSnackbar({
              open: true,
              message: 'Failed to extend allocation',
              severity: 'error',
            });
          }
        };

        createAllocations();
        return null;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [createAllocation, currentUserId]);

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
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setStartDate(new Date(today.setDate(diff)));
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
  const handleAddClick = (userId: string, weekStart: string) => {
    const user = gridData.find(u => u.user.id === userId)?.user;
    if (user) {
      setDialogContext({
        userId,
        userName: user.name,
        weekStart,
      });
      setDialogOpen(true);
    }
  };
  
  const handleAllocationClick = (allocation: CalendarAllocation) => {
    const user = gridData.find(u => u.user.id === allocation.userId)?.user;
    if (user) {
      setDialogContext({
        userId: allocation.userId,
        userName: user.name,
        weekStart: allocation.weekStart,
        allocation,
      });
      setDialogOpen(true);
    }
  };
  
  const handleDialogSave = async (data: {
    projectId: string;
    plannedHours: number;
    notes: string;
    isBillable: boolean;
  }) => {
    if (!dialogContext) return;
    
    try {
      if (dialogContext.allocation) {
        // Update existing
        await updateAllocation(dialogContext.allocation.id, {
          projectId: data.projectId,
          plannedHours: data.plannedHours,
          notes: data.notes || null,
          isBillable: data.isBillable,
        });
      } else {
        // Create new
        await createAllocation({
          userId: dialogContext.userId,
          projectId: data.projectId,
          weekStart: dialogContext.weekStart,
          plannedHours: data.plannedHours,
          notes: data.notes,
          isBillable: data.isBillable,
          createdBy: currentUserId,
        });
      }
    } catch (err) {
      console.error('Failed to save allocation:', err);
      // TODO: Show error toast
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
                    const targetWeek = weeks[0];
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
                dragTargetWeeks={
                  dragExtendState?.userId === userData.user.id
                    ? dragExtendState.targetWeeks
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
          allocation={dialogContext.allocation}
          userId={dialogContext.userId}
          userName={dialogContext.userName}
          weekStart={dialogContext.weekStart}
          projects={projects}
        />
      )}

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}

export default ResourceCalendar;
