import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

interface WeekPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
}

/**
 * Get the Monday of the week for a given date
 */
const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the Friday of the week for a given date
 */
const getFriday = (date: Date): Date => {
  const monday = getMonday(date);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return friday;
};

/**
 * Format date as "Jan 13"
 */
const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Format the week range as "Jan 13 - Jan 17, 2026"
 */
const formatWeekRange = (date: Date): string => {
  const monday = getMonday(date);
  const friday = getFriday(date);
  const year = friday.getFullYear();

  const mondayStr = formatShortDate(monday);
  const fridayStr = formatShortDate(friday);

  return `${mondayStr} - ${fridayStr}, ${year}`;
};

export const WeekPicker: React.FC<WeekPickerProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const handlePreviousWeek = () => {
    const monday = getMonday(value);
    const prevMonday = new Date(monday);
    prevMonday.setDate(monday.getDate() - 7);
    onChange(prevMonday);
  };

  const handleNextWeek = () => {
    const monday = getMonday(value);
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    onChange(nextMonday);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <IconButton
        onClick={handlePreviousWeek}
        disabled={disabled}
        size="small"
        sx={{
          color: 'text.secondary',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <ChevronLeft />
      </IconButton>

      <Typography
        variant="body1"
        sx={{
          fontWeight: 500,
          minWidth: 180,
          textAlign: 'center',
          color: disabled ? 'text.disabled' : 'text.primary',
          cursor: disabled ? 'default' : 'pointer',
          '&:hover': disabled
            ? {}
            : {
                color: 'primary.main',
              },
        }}
      >
        {formatWeekRange(value)}
      </Typography>

      <IconButton
        onClick={handleNextWeek}
        disabled={disabled}
        size="small"
        sx={{
          color: 'text.secondary',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <ChevronRight />
      </IconButton>
    </Box>
  );
};
