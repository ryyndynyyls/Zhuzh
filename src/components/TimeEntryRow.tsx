import React from 'react';
import {
  TableRow,
  TableCell,
  TextField,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import {
  Notes as NotesIcon,
} from '@mui/icons-material';

interface TimeEntryRowProps {
  entry: {
    id: string;
    projectName: string;
    projectColor: string;
    phase?: string;
    plannedHours: number;
    actualHours: number;
    notes?: string;
  };
  isEditable: boolean;
  onActualHoursChange: (id: string, hours: number) => void;
  onNotesClick?: (id: string) => void;
}

const TimeEntryRow: React.FC<TimeEntryRowProps> = ({
  entry,
  isEditable,
  onActualHoursChange,
  onNotesClick,
}) => {
  const variance = entry.actualHours - entry.plannedHours;
  const variancePercent = entry.plannedHours > 0
    ? Math.abs(variance / entry.plannedHours) * 100
    : entry.actualHours > 0 ? 100 : 0;

  // Variance color: red for over (bad), green for under (good), gray for match
  const getVarianceColor = (): string => {
    if (variance === 0) return '#6B7280'; // gray - on target
    if (variance > 0) return '#EF4444'; // red - over budget
    return '#10B981'; // green - under budget
  };

  const getVarianceText = (): string => {
    if (variance === 0) return '-';
    const sign = variance > 0 ? '+' : '';
    return `${sign}${variance}`;
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    onActualHoursChange(entry.id, Math.max(0, value));
  };

  return (
    <TableRow
      sx={{
        '&:hover': {
          backgroundColor: 'rgba(75, 85, 99, 0.2)',
        },
        '& td': {
          borderBottom: '1px solid #374151',
        },
      }}
    >
      {/* Project name with color dot */}
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: entry.projectColor,
              flexShrink: 0,
            }}
          />
          <Box>
            <Typography
              variant="body2"
              sx={{ color: '#F3F4F6', fontWeight: 500 }}
            >
              {entry.projectName}
            </Typography>
            {entry.phase && (
              <Typography
                variant="caption"
                sx={{ color: '#9CA3AF' }}
              >
                {entry.phase}
              </Typography>
            )}
          </Box>
        </Box>
      </TableCell>

      {/* Planned hours (read-only) */}
      <TableCell align="right">
        <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
          {entry.plannedHours} hrs
        </Typography>
      </TableCell>

      {/* Actual hours (editable when isEditable) */}
      <TableCell align="right">
        {isEditable ? (
          <TextField
            type="number"
            size="small"
            value={entry.actualHours}
            onChange={handleHoursChange}
            inputProps={{
              min: 0,
              step: 0.5,
              style: { textAlign: 'right', width: 60 },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#2A2520',
                color: '#F3F4F6',
                '& fieldset': { borderColor: '#374151' },
                '&:hover fieldset': { borderColor: '#4B5563' },
                '&.Mui-focused fieldset': { borderColor: '#FF8731' },
              },
              '& .MuiOutlinedInput-input': {
                py: 0.5,
                px: 1,
              },
            }}
          />
        ) : (
          <Typography variant="body2" sx={{ color: '#F3F4F6' }}>
            {entry.actualHours} hrs
          </Typography>
        )}
      </TableCell>

      {/* Variance column */}
      <TableCell align="right">
        <Typography
          variant="body2"
          sx={{
            color: getVarianceColor(),
            fontWeight: variance !== 0 ? 500 : 400,
          }}
        >
          {getVarianceText()}
          {variance !== 0 && (
            <Box
              component="span"
              sx={{
                ml: 0.5,
                fontSize: '0.75rem',
              }}
            >
              {variance > 0 ? '\u2191' : '\u2193'}
            </Box>
          )}
        </Typography>
      </TableCell>

      {/* Notes icon */}
      <TableCell align="center">
        {entry.notes ? (
          <IconButton
            size="small"
            onClick={() => onNotesClick?.(entry.id)}
            sx={{
              color: '#9CA3AF',
              '&:hover': {
                backgroundColor: 'rgba(75, 85, 99, 0.3)',
                color: '#F3F4F6',
              },
            }}
          >
            <NotesIcon fontSize="small" />
          </IconButton>
        ) : (
          <Box sx={{ width: 28, height: 28 }} /> // Placeholder for alignment
        )}
      </TableCell>
    </TableRow>
  );
};

export default TimeEntryRow;
