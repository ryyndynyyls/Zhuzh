/**
 * Who's Out Component - Compact Week View
 * Shows team PTO/holiday visibility for the full week (Mon-Fri)
 */

import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ZhuzhInlineLoader } from './ZhuzhPageLoader';
import {
  BeachAccess,
  ChevronLeft,
  ChevronRight,
  Cached,
  CloudSync,
  Business,
} from '@mui/icons-material';
import { useWhosOut, PtoType, WhosOutEntry } from '../hooks/useWhosOut';

interface WhosOutProps {
  orgId: string;
}

// Total employees in org (for detecting office-wide closures)
const TOTAL_EMPLOYEES = 25;
const OFFICE_CLOSURE_THRESHOLD = 0.7;

// Get type color - improved contrast for ADA
function getTypeColor(type: PtoType): string {
  switch (type) {
    case 'pto': return '#A78BFA'; // Lighter purple for better contrast
    case 'holiday': return '#FB923C'; // Brighter orange (orange-400)
    case 'partial_pto': return '#FDE047'; // Brighter yellow (yellow-300)
    case 'friday_off': return '#5EEAD4'; // Brighter teal
    default: return '#9CA3AF';
  }
}

// Detect if this is an office-wide closure
function detectOfficeClosure(users: WhosOutEntry[]): { isClosure: boolean; holidayName: string | null } {
  const holidayUsers = users.filter(u => u.type === 'holiday');
  
  if (holidayUsers.length >= TOTAL_EMPLOYEES * OFFICE_CLOSURE_THRESHOLD) {
    const summaries = holidayUsers.map(u => u.summary);
    const counts = summaries.reduce((acc, s) => {
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topSummary = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (topSummary && topSummary[1] >= holidayUsers.length * 0.8) {
      let holidayName = topSummary[0]
        .replace(/^(Off\s*[-–:]\s*)/i, '')
        .replace(/^(Holiday\s*[-–:]\s*)/i, '')
        .replace(/^(UA5\s*Office\s*Closed\s*[-–:]\s*)/i, '')
        .trim();
      return { isClosure: true, holidayName };
    }
  }
  
  return { isClosure: false, holidayName: null };
}

// Day names
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function WhosOut({ orgId }: WhosOutProps) {
  const {
    days,
    loading,
    error,
    weekLabel,
    weekStart,
    goToPrevWeek,
    goToNextWeek,
    refresh,
    triggerSync,
  } = useWhosOut({ orgId });

  // Format empty state message nicely
  const getEmptyMessage = (): string => {
    if (weekLabel === 'This Week') return "Everyone's in this week ✨";
    if (weekLabel === 'Next Week') return "Everyone's in next week ✨";
    if (weekLabel === 'Last Week') return "Everyone was in last week ✨";
    // For other weeks, format nicely with full month and ordinal
    const day = weekStart.getDate();
    const ordinal = day === 1 || day === 21 || day === 31 ? 'st' 
                  : day === 2 || day === 22 ? 'nd'
                  : day === 3 || day === 23 ? 'rd' : 'th';
    const month = weekStart.toLocaleDateString('en-US', { month: 'long' });
    return `Everyone's in the week of ${month} ${day}${ordinal} ✨`;
  };

  // Format date as day number
  const formatDayNum = (dateStr: string): string => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.getDate().toString();
  };

  // Get today's date string
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter to weekdays (Mon-Fri)
  const weekdays = days.slice(0, 5); // API returns Mon-Sun, we take Mon-Fri

  // Check if any day has data
  const hasAnyData = weekdays.some(d => d.users.length > 0);

  return (
    <Paper sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <BeachAccess sx={{ color: 'primary.main', mr: 1, flexShrink: 0 }} />
        <Typography variant="h6" sx={{ flex: 1, whiteSpace: 'nowrap' }}>
          Who's Out
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={refresh} disabled={loading}>
              <Cached fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sync Calendars">
            <IconButton size="small" onClick={triggerSync} disabled={loading}>
              <CloudSync fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Week navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 2 }}>
        <IconButton size="small" onClick={goToPrevWeek}>
          <ChevronLeft fontSize="small" />
        </IconButton>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80, textAlign: 'center' }}>
          {weekLabel}
        </Typography>
        <IconButton size="small" onClick={goToNextWeek}>
          <ChevronRight fontSize="small" />
        </IconButton>
      </Box>

      {loading ? (
        <ZhuzhInlineLoader size={24} />
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : !hasAnyData ? (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {getEmptyMessage()}
          </Typography>
        </Box>
      ) : (
        /* Week Grid - Compact view */
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {weekdays.map((day, i) => {
            const isToday = day.date === todayStr;
            const isPast = day.date < todayStr;
            const closure = detectOfficeClosure(day.users);
            const individualUsers = closure.isClosure 
              ? day.users.filter(u => u.type !== 'holiday')
              : day.users;

            return (
              <Box
                key={day.date}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 0.75,
                  borderRadius: 1,
                  bgcolor: isToday ? 'rgba(255,135,49,0.1)' : 'transparent',
                  border: isToday ? '1px solid rgba(255,135,49,0.3)' : '1px solid transparent',
                  opacity: isPast ? 0.6 : 1,
                }}
              >
                {/* Day header */}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: isToday ? '#FB923C' : 'text.secondary',
                    fontWeight: isToday ? 600 : 400,
                    fontSize: '0.65rem',
                  }}
                >
                  {DAY_NAMES[i]}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: isToday ? '#FB923C' : 'text.primary',
                    fontWeight: isToday ? 600 : 500,
                    mb: 0.5,
                  }}
                >
                  {formatDayNum(day.date)}
                </Typography>

                {/* Content */}
                {day.users.length === 0 ? (
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>
                    –
                  </Typography>
                ) : closure.isClosure ? (
                  /* Office closed - icon only, text on hover */
                  <Tooltip 
                    title={closure.holidayName || 'Office Closed'} 
                    arrow
                    placement="top"
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        bgcolor: '#FB923C', // Brighter orange
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          boxShadow: '0 0 12px rgba(251, 146, 60, 0.5)',
                        },
                      }}
                    >
                      <Business sx={{ fontSize: 18, color: '#1E1D1B' }} />
                    </Box>
                  </Tooltip>
                ) : (
                  /* Individual users - stacked dots */
                  <Tooltip 
                    title={
                      <Box>
                        {individualUsers.map((u, j) => (
                          <Box key={j} sx={{ fontSize: '0.75rem' }}>
                            {u.userName.split(' ')[0]} - {u.type === 'partial_pto' ? 'Half Day' : 'Out'}
                          </Box>
                        ))}
                      </Box>
                    }
                    arrow
                    placement="top"
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      gap: 0.25,
                      cursor: 'pointer',
                    }}>
                      {/* Show up to 3 dots, then +N */}
                      {individualUsers.slice(0, 3).map((u, j) => (
                        <Box
                          key={j}
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: getTypeColor(u.type),
                          }}
                        />
                      ))}
                      {individualUsers.length > 3 && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary', 
                            fontSize: '0.55rem',
                            lineHeight: 1,
                          }}
                        >
                          +{individualUsers.length - 3}
                        </Typography>
                      )}
                      {individualUsers.length <= 3 && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary', 
                            fontSize: '0.55rem',
                            lineHeight: 1,
                          }}
                        >
                          {individualUsers.length}
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Legend */}
      {hasAnyData && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 1.5, 
          mt: 1.5, 
          pt: 1.5, 
          borderTop: '1px solid',
          borderColor: 'divider',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#A78BFA' }} />
            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>PTO</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#FDE047' }} />
            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>Half</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: '#FB923C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Business sx={{ fontSize: 6, color: '#1E1D1B' }} />
            </Box>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>Closed</Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
