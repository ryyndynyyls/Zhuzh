/**
 * ViewToggle Component
 * Reusable Day/Week/Month toggle for calendar views
 */

import React from 'react';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import CalendarViewDayIcon from '@mui/icons-material/CalendarViewDay';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';

export type ViewMode = 'day' | 'week' | 'month';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  disabled?: boolean;
}

export function ViewToggle({ value, onChange, disabled }: ViewToggleProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, newValue) => newValue && onChange(newValue)}
      size="small"
      disabled={disabled}
      sx={{
        bgcolor: 'background.paper',
        '& .MuiToggleButton-root': {
          px: 1.5,
          py: 0.5,
          color: 'text.secondary',
          borderColor: 'divider',
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          },
          '&:hover': {
            bgcolor: 'action.hover',
          },
        },
      }}
    >
      <ToggleButton value="day" aria-label="Day view">
        <CalendarViewDayIcon sx={{ mr: 0.5, fontSize: 18 }} />
        Day
      </ToggleButton>
      <ToggleButton value="week" aria-label="Week view">
        <CalendarViewWeekIcon sx={{ mr: 0.5, fontSize: 18 }} />
        Week
      </ToggleButton>
      <ToggleButton value="month" aria-label="Month view">
        <CalendarViewMonthIcon sx={{ mr: 0.5, fontSize: 18 }} />
        Month
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

export default ViewToggle;
