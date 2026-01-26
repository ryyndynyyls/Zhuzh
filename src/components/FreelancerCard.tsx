/**
 * FreelancerCard - Playing card style freelancer display
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Collapse,
  Divider,
  Button,
} from '@mui/material';
import {
  Email as EmailIcon,
  Language as WebsiteIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  ArrowUpward as ActivateIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  AttachMoney as RateIcon,
  Work as ProjectIcon,
} from '@mui/icons-material';
import { User } from '../types/database';

interface FreelancerProject {
  id: string;
  name: string;
  clientName: string | null;
  color: string | null;
  totalPlannedHours: number;
  totalActualHours: number;
  firstWeek: string;
  lastWeek: string;
}

interface FreelancerCardProps {
  freelancer: User;
  onActivate?: (userId: string) => Promise<void>;
  onFetchProjects?: (userId: string) => Promise<FreelancerProject[]>;
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Generate a consistent color from a string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
  ];
  return colors[Math.abs(hash) % colors.length];
}

// Format date range
function formatDateRange(firstWeek: string, lastWeek: string): string {
  const first = new Date(firstWeek + 'T00:00:00');
  const last = new Date(lastWeek + 'T00:00:00');
  
  const formatMonth = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  
  if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) {
    return formatMonth(first);
  }
  return `${formatMonth(first)} - ${formatMonth(last)}`;
}

export function FreelancerCard({ freelancer, onActivate, onFetchProjects }: FreelancerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [projects, setProjects] = useState<FreelancerProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [activating, setActivating] = useState(false);

  const cardColor = stringToColor(freelancer.name);
  
  // Fetch projects when expanded
  useEffect(() => {
    if (expanded && projects.length === 0 && onFetchProjects) {
      setLoadingProjects(true);
      onFetchProjects(freelancer.id)
        .then(setProjects)
        .finally(() => setLoadingProjects(false));
    }
  }, [expanded, freelancer.id, onFetchProjects, projects.length]);

  const handleActivate = async () => {
    if (!onActivate) return;
    setActivating(true);
    try {
      await onActivate(freelancer.id);
    } finally {
      setActivating(false);
    }
  };

  // Build Gmail compose URL
  const gmailUrl = freelancer.contact_email || freelancer.email
    ? `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(freelancer.contact_email || freelancer.email)}&su=${encodeURIComponent(`Reaching out from Use All Five`)}`
    : null;

  return (
    <Box
      sx={{
        width: 280,
        backgroundColor: '#1E1D1B',
        borderRadius: 3,
        border: '2px solid',
        borderColor: cardColor,
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${cardColor}33`,
        },
      }}
    >
      {/* Card Header - Colored band */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${cardColor} 0%, ${cardColor}99 100%)`,
          p: 2,
          position: 'relative',
        }}
      >
        {/* Avatar / Initials */}
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#1E1D1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid white',
            mb: 1,
          }}
        >
          <Typography variant="h6" sx={{ color: cardColor, fontWeight: 700 }}>
            {getInitials(freelancer.name)}
          </Typography>
        </Box>

        {/* Name & Title */}
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
          {freelancer.name}
        </Typography>
        {freelancer.job_title && (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
            {freelancer.job_title}
          </Typography>
        )}
      </Box>

      {/* Card Body */}
      <Box sx={{ p: 2 }}>
        {/* Quick Info Row */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {freelancer.discipline && (
            <Chip 
              label={freelancer.discipline} 
              size="small" 
              sx={{ 
                backgroundColor: `${cardColor}22`,
                color: cardColor,
                fontWeight: 600,
                fontSize: '0.7rem',
              }} 
            />
          )}
          {freelancer.location && (
            <Chip 
              icon={<LocationIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />}
              label={freelancer.location} 
              size="small" 
              sx={{ 
                backgroundColor: '#2A2520',
                color: '#9CA3AF',
                fontSize: '0.7rem',
              }} 
            />
          )}
          {freelancer.hourly_rate && (
            <Chip 
              icon={<RateIcon sx={{ fontSize: 14, color: '#80FF9C' }} />}
              label={`$${freelancer.hourly_rate}/hr`} 
              size="small" 
              sx={{ 
                backgroundColor: '#80FF9C22',
                color: '#80FF9C',
                fontSize: '0.7rem',
              }} 
            />
          )}
        </Box>

        {/* Specialty Notes */}
        {freelancer.specialty_notes && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#9CA3AF', 
              fontSize: '0.8rem',
              lineHeight: 1.4,
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {freelancer.specialty_notes}
          </Typography>
        )}

        {/* Contact Actions */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {gmailUrl && (
            <Tooltip title="Send Email">
              <IconButton
                size="small"
                component="a"
                href={gmailUrl}
                target="_blank"
                sx={{ 
                  color: '#9CA3AF',
                  '&:hover': { color: cardColor, backgroundColor: `${cardColor}22` },
                }}
              >
                <EmailIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {freelancer.website && (
            <Tooltip title="View Website">
              <IconButton
                size="small"
                component="a"
                href={freelancer.website.startsWith('http') ? freelancer.website : `https://${freelancer.website}`}
                target="_blank"
                sx={{ 
                  color: '#9CA3AF',
                  '&:hover': { color: cardColor, backgroundColor: `${cardColor}22` },
                }}
              >
                <WebsiteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {freelancer.phone && (
            <Tooltip title={freelancer.phone}>
              <IconButton
                size="small"
                component="a"
                href={`tel:${freelancer.phone}`}
                sx={{ 
                  color: '#9CA3AF',
                  '&:hover': { color: cardColor, backgroundColor: `${cardColor}22` },
                }}
              >
                <PhoneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Divider sx={{ borderColor: '#374151', mb: 2 }} />

        {/* Past Projects (Expandable) */}
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            '&:hover': { color: cardColor },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ProjectIcon sx={{ fontSize: 16, color: '#6B7280' }} />
            <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 500 }}>
              Past Projects
            </Typography>
          </Box>
          {expanded ? (
            <CollapseIcon sx={{ color: '#6B7280', fontSize: 20 }} />
          ) : (
            <ExpandIcon sx={{ color: '#6B7280', fontSize: 20 }} />
          )}
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            {loadingProjects ? (
              <Typography variant="body2" sx={{ color: '#6B7280', fontStyle: 'italic' }}>
                Loading projects...
              </Typography>
            ) : projects.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#6B7280', fontStyle: 'italic' }}>
                No project history in system
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {projects.slice(0, 5).map(project => (
                  <Box
                    key={project.id}
                    sx={{
                      p: 1.5,
                      backgroundColor: '#2A2520',
                      borderRadius: 1,
                      borderLeft: `3px solid ${project.color || '#6B7280'}`,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#F3F4F6', fontWeight: 500 }}>
                      {project.name}
                    </Typography>
                    {project.clientName && (
                      <Typography variant="caption" sx={{ color: '#6B7280' }}>
                        {project.clientName}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                        {project.totalActualHours || project.totalPlannedHours} hrs
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6B7280' }}>
                        {formatDateRange(project.firstWeek, project.lastWeek)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
                {projects.length > 5 && (
                  <Typography variant="caption" sx={{ color: '#6B7280', textAlign: 'center' }}>
                    +{projects.length - 5} more projects
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Card Footer - Action */}
      <Box sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ActivateIcon />}
          onClick={handleActivate}
          disabled={activating}
          sx={{
            borderColor: cardColor,
            color: cardColor,
            '&:hover': {
              borderColor: cardColor,
              backgroundColor: `${cardColor}22`,
            },
          }}
        >
          {activating ? 'Moving...' : 'Move to Active Roster'}
        </Button>
      </Box>
    </Box>
  );
}
