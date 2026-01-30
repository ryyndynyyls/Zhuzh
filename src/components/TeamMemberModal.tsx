/**
 * TeamMemberModal - Playing Card Style Profile View
 * Beautiful gradient header with contact info, allocations, and past projects
 * Includes avatar upload functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Chip,
  Collapse,
  Divider,
  Button,
  TextField,
  Tooltip,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Language as WebsiteIcon,
  LocationOn as LocationIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Work as ProjectIcon,
  ArrowDownward as DeactivateIcon,
  ArrowUpward as ActivateIcon,
  CameraAlt as CameraIcon,
} from '@mui/icons-material';
import { User, UserUpdate } from '../types/database';
import { supabase } from '../lib/supabase';
import { ZhuzhCardLoader } from './ZhuzhPageLoader';
import { getDisciplineColor } from '../utils/disciplineColors';
import { glowBorderStyles } from './design-system';

interface TeamMemberModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentUserId: string;
  currentUserRole: 'employee' | 'pm' | 'admin';
  onUpdate?: () => void;
}

interface AllocationSummary {
  projectName: string;
  projectColor: string;
  hours: number;
}

interface PastProject {
  id: string;
  name: string;
  color: string | null;
  totalHours: number;
  firstWeek: string;
  lastWeek: string;
}

// Generate consistent color from string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
    '#FF8A65', '#A5D6A7', '#90CAF9', '#F48FB1',
  ];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function formatDateRange(firstWeek: string, lastWeek: string): string {
  const first = new Date(firstWeek + 'T00:00:00');
  const last = new Date(lastWeek + 'T00:00:00');
  const formatMonth = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) {
    return formatMonth(first);
  }
  return `${formatMonth(first)} - ${formatMonth(last)}`;
}

export function TeamMemberModal({
  open,
  onClose,
  userId,
  currentUserId,
  currentUserRole,
  onUpdate,
}: TeamMemberModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [allocations, setAllocations] = useState<AllocationSummary[]>([]);
  const [pastProjects, setPastProjects] = useState<PastProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editForm, setEditForm] = useState({
    job_title: '',
    location: '',
    contact_email: '',
    website: '',
    specialty_notes: '',
    hourly_rate: '',
    nicknames: '',
  });

  const isOwnProfile = userId === currentUserId;
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'pm';
  const canEdit = isOwnProfile || isAdmin;
  const showHourlyRate = isAdmin && user?.is_freelance;

  // Card color based on discipline or name
  const cardColor = user ? (getDisciplineColor(user.discipline) || stringToColor(user.name)) : '#FF6B6B';

  // Fetch user data
  useEffect(() => {
    if (!open || !userId) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      setPastProjects([]);
      setProjectsExpanded(false);

      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError) throw userError;
        setUser(userData);

        setEditForm({
          job_title: userData.job_title || '',
          location: userData.location || '',
          contact_email: userData.contact_email || userData.email || '',
          website: userData.website || '',
          specialty_notes: userData.specialty_notes || '',
          hourly_rate: userData.hourly_rate?.toString() || '',
          nicknames: userData.nicknames || '',
        });

        // Fetch current week allocations
        const weekStart = getCurrentWeekStart();
        const { data: allocData, error: allocError } = await supabase
          .from('allocations')
          .select(`
            planned_hours,
            project:projects(name, color)
          `)
          .eq('user_id', userId)
          .eq('week_start', weekStart);

        if (allocError) throw allocError;

        const projectMap = new Map<string, AllocationSummary>();
        allocData?.forEach((alloc: any) => {
          const name = alloc.project?.name || 'Unknown';
          const color = alloc.project?.color || '#6B7280';
          if (projectMap.has(name)) {
            projectMap.get(name)!.hours += alloc.planned_hours;
          } else {
            projectMap.set(name, { projectName: name, projectColor: color, hours: alloc.planned_hours });
          }
        });

        setAllocations(Array.from(projectMap.values()));
      } catch (err) {
        console.error('Failed to fetch team member:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, userId]);

  // Fetch past projects when expanded
  useEffect(() => {
    if (!projectsExpanded || pastProjects.length > 0 || !user) return;

    async function fetchPastProjects() {
      setLoadingProjects(true);
      try {
        const weekStart = getCurrentWeekStart();
        const { data, error } = await supabase
          .from('allocations')
          .select(`
            planned_hours,
            actual_hours,
            week_start,
            project:projects(id, name, color)
          `)
          .eq('user_id', userId)
          .lt('week_start', weekStart)
          .order('week_start', { ascending: false });

        if (error) throw error;

        const projectMap = new Map<string, PastProject>();
        data?.forEach((alloc: any) => {
          if (!alloc.project) return;
          const id = alloc.project.id;
          const hours = alloc.actual_hours || alloc.planned_hours;
          
          if (projectMap.has(id)) {
            const existing = projectMap.get(id)!;
            existing.totalHours += hours;
            if (alloc.week_start < existing.firstWeek) existing.firstWeek = alloc.week_start;
            if (alloc.week_start > existing.lastWeek) existing.lastWeek = alloc.week_start;
          } else {
            projectMap.set(id, {
              id,
              name: alloc.project.name,
              color: alloc.project.color,
              totalHours: hours,
              firstWeek: alloc.week_start,
              lastWeek: alloc.week_start,
            });
          }
        });

        setPastProjects(Array.from(projectMap.values()).slice(0, 10));
      } catch (err) {
        console.error('Failed to fetch past projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    }

    fetchPastProjects();
  }, [projectsExpanded, pastProjects.length, user, userId]);

  // Handle avatar upload
  const handleAvatarClick = () => {
    if (canEdit && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, WebP, or AVIF image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    setError(null);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        // If bucket doesn't exist, provide helpful error
        if (uploadError.message.includes('bucket')) {
          throw new Error('Avatar storage not configured. Please create an "avatars" bucket in Supabase Storage.');
        }
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      // Update user record
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setUser({ ...user, avatar_url: avatarUrl });
      onUpdate?.();
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      const updates: UserUpdate = {
        job_title: editForm.job_title || null,
        location: editForm.location || null,
        contact_email: editForm.contact_email || null,
        website: editForm.website || null,
      };

      if (isOwnProfile || isAdmin) {
        updates.nicknames = editForm.nicknames || null;
      }

      if (isAdmin) {
        updates.specialty_notes = editForm.specialty_notes || null;
        if (user.is_freelance) {
          updates.hourly_rate = editForm.hourly_rate ? parseFloat(editForm.hourly_rate) : null;
        }
      }

      // If specialty_notes changed, call API to parse resource_config
      const notesChanged = editForm.specialty_notes !== (user.specialty_notes || '');
      if (isAdmin && notesChanged && editForm.specialty_notes) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
          const response = await fetch(`${apiUrl}/api/team/parse-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              specialty_notes: editForm.specialty_notes,
              userId: userId
            })
          });
          
          if (response.ok) {
            const { data: resourceConfig } = await response.json();
            console.log('[TeamMemberModal] Parsed resource config:', resourceConfig);
            // The API already updates the user record, so we don't need to update again
          } else {
            console.warn('[TeamMemberModal] Failed to parse resource config');
          }
        } catch (parseErr) {
          console.warn('[TeamMemberModal] Resource config parse error:', parseErr);
          // Don't block save if parsing fails
        }
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (updateError) throw updateError;

      setUser({ ...user, ...updates });
      setEditing(false);
      onUpdate?.();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setEditForm({
        job_title: user.job_title || '',
        location: user.location || '',
        contact_email: user.contact_email || user.email || '',
        website: user.website || '',
        specialty_notes: user.specialty_notes || '',
        hourly_rate: user.hourly_rate?.toString() || '',
        nicknames: user.nicknames || '',
      });
    }
    setEditing(false);
  };

  const totalHours = allocations.reduce((sum, a) => sum + a.hours, 0);
  const utilization = Math.round((totalHours / 40) * 100);

  // Gmail compose URL
  const gmailUrl = user?.contact_email || user?.email
    ? `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(user.contact_email || user.email)}`
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          // Use design system glow effect
          ...glowBorderStyles(cardColor, { intensity: 'normal', animated: !loading }),
          maxHeight: '90vh',
        },
      }}
    >
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        style={{ display: 'none' }}
        onChange={handleAvatarUpload}
      />

      {loading ? (
        <ZhuzhCardLoader message="Loading profile..." />
      ) : error && !user ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
          <Button onClick={onClose} sx={{ mt: 2 }}>Close</Button>
        </Box>
      ) : user ? (
        <>
          {/* Gradient Header */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${cardColor} 0%, ${cardColor}99 100%)`,
              p: 2.5,
              position: 'relative',
            }}
          >
            {/* Close button */}
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: 'rgba(255,255,255,0.8)',
                '&:hover': { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            {/* Edit button */}
            {canEdit && !editing && (
              <IconButton
                onClick={() => setEditing(true)}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 40,
                  color: 'rgba(255,255,255,0.8)',
                  '&:hover': { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)' },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}

            {/* Avatar with upload capability */}
            <Box
              onClick={handleAvatarClick}
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: user.avatar_url ? 'transparent' : '#1E1D1B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid white',
                mb: 1.5,
                cursor: canEdit ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s',
                '&:hover': canEdit ? {
                  transform: 'scale(1.05)',
                  '& .avatar-overlay': {
                    opacity: 1,
                  },
                } : {},
              }}
            >
              {uploadingAvatar ? (
                <CircularProgress size={24} sx={{ color: cardColor }} />
              ) : user.avatar_url ? (
                <Box
                  component="img"
                  src={user.avatar_url}
                  alt={user.name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Typography variant="h5" sx={{ color: cardColor, fontWeight: 700 }}>
                  {getInitials(user.name)}
                </Typography>
              )}
              
              {/* Hover overlay for upload */}
              {canEdit && (
                <Box
                  className="avatar-overlay"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <CameraIcon sx={{ color: 'white', fontSize: 24 }} />
                </Box>
              )}
            </Box>

            {/* Name */}
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
              {user.name}
            </Typography>

            {/* Title */}
            {editing ? (
              <TextField
                value={editForm.job_title}
                onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                placeholder="Job Title"
                size="small"
                fullWidth
                sx={{
                  mt: 1,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  },
                  '& input': { color: 'white' },
                }}
              />
            ) : (
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.5 }}>
                {user.job_title || user.role}
              </Typography>
            )}
          </Box>

          {/* Body */}
          <Box sx={{ p: 2.5, maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
            {/* Error message */}
            {error && (
              <Typography color="error" variant="caption" sx={{ display: 'block', mb: 2 }}>
                {error}
              </Typography>
            )}

            {/* Chips Row */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
              {user.discipline && (
                <Chip
                  label={user.discipline}
                  size="small"
                  sx={{
                    bgcolor: `${cardColor}22`,
                    color: cardColor,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                />
              )}
              {(editing ? editForm.location : user.location) && (
                editing ? (
                  <TextField
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="Location"
                    size="small"
                    sx={{ width: 150 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LocationIcon sx={{ fontSize: 16, color: '#6B7280' }} /></InputAdornment>,
                    }}
                  />
                ) : (
                  <Chip
                    icon={<LocationIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />}
                    label={user.location}
                    size="small"
                    sx={{
                      bgcolor: '#2A2520',
                      color: '#9CA3AF',
                      fontSize: '0.75rem',
                    }}
                  />
                )
              )}
              {user.is_freelance && (
                <Chip
                  label="Freelance"
                  size="small"
                  sx={{
                    bgcolor: '#FFF84522',
                    color: '#FFF845',
                    fontSize: '0.75rem',
                  }}
                />
              )}
              {showHourlyRate && user.hourly_rate && !editing && (
                <Chip
                  label={`$${user.hourly_rate}/hr`}
                  size="small"
                  sx={{
                    bgcolor: '#80FF9C22',
                    color: '#80FF9C',
                    fontSize: '0.75rem',
                  }}
                />
              )}
            </Box>

            {/* Contact Icons */}
            {!editing && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
                {gmailUrl && (
                  <Tooltip title="Send Email">
                    <IconButton
                      size="small"
                      component="a"
                      href={gmailUrl}
                      target="_blank"
                      sx={{
                        color: '#9CA3AF',
                        '&:hover': { color: cardColor, bgcolor: `${cardColor}22` },
                      }}
                    >
                      <EmailIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {user.website && (
                  <Tooltip title="View Website">
                    <IconButton
                      size="small"
                      component="a"
                      href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                      target="_blank"
                      sx={{
                        color: '#9CA3AF',
                        '&:hover': { color: cardColor, bgcolor: `${cardColor}22` },
                      }}
                    >
                      <WebsiteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}

            {/* Edit Form Fields */}
            {editing && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}>
                <TextField
                  value={editForm.contact_email}
                  onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                  placeholder="Email"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><EmailIcon sx={{ fontSize: 16, color: '#6B7280' }} /></InputAdornment>,
                  }}
                />
                <TextField
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  placeholder="Website"
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><WebsiteIcon sx={{ fontSize: 16, color: '#6B7280' }} /></InputAdornment>,
                  }}
                />
                {!user.location && (
                  <TextField
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="Location"
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LocationIcon sx={{ fontSize: 16, color: '#6B7280' }} /></InputAdornment>,
                    }}
                  />
                )}
                <TextField
                  value={editForm.nicknames}
                  onChange={(e) => setEditForm({ ...editForm, nicknames: e.target.value })}
                  placeholder="Nicknames (for search)"
                  size="small"
                  helperText="e.g., Fred, Freddy, Rick"
                />
                {isAdmin && (
                  <TextField
                    value={editForm.specialty_notes}
                    onChange={(e) => setEditForm({ ...editForm, specialty_notes: e.target.value })}
                    placeholder="Specialty notes"
                    size="small"
                    multiline
                    rows={2}
                  />
                )}
                {showHourlyRate && (
                  <TextField
                    value={editForm.hourly_rate}
                    onChange={(e) => setEditForm({ ...editForm, hourly_rate: e.target.value })}
                    placeholder="Hourly rate"
                    size="small"
                    type="number"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                )}
              </Box>
            )}

            {/* Specialty Notes (view mode) */}
            {!editing && user.specialty_notes && (
              <Typography
                variant="body2"
                sx={{
                  color: '#9CA3AF',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  mb: 2.5,
                  fontStyle: 'italic',
                }}
              >
                "{user.specialty_notes}"
              </Typography>
            )}

            <Divider sx={{ borderColor: '#374151', mb: 2.5 }} />

            {/* This Week - Current Allocations */}
            {allocations.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ color: '#9CA3AF', fontWeight: 600 }}>
                    This Week
                  </Typography>
                  <Chip
                    label={`${utilization}%`}
                    size="small"
                    sx={{
                      bgcolor: utilization > 100 ? '#FF6B6B22' : utilization >= 80 ? '#80FF9C22' : '#FFF84522',
                      color: utilization > 100 ? '#FF6B6B' : utilization >= 80 ? '#80FF9C' : '#FFF845',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {allocations.map((alloc, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        bgcolor: '#2A2520',
                        borderRadius: 1,
                        borderLeft: `3px solid ${alloc.projectColor}`,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: '#E5E7EB' }}>
                        {alloc.projectName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 500 }}>
                        {alloc.hours}h
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <Divider sx={{ borderColor: '#374151', mb: 2 }} />

            {/* Past Projects (Expandable) */}
            <Box
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                py: 0.5,
                '&:hover': { '& .MuiTypography-root': { color: cardColor } },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ProjectIcon sx={{ fontSize: 18, color: '#6B7280' }} />
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 500, transition: 'color 0.2s' }}>
                  Past Projects
                </Typography>
              </Box>
              {projectsExpanded ? (
                <CollapseIcon sx={{ color: '#6B7280', fontSize: 20 }} />
              ) : (
                <ExpandIcon sx={{ color: '#6B7280', fontSize: 20 }} />
              )}
            </Box>

            <Collapse in={projectsExpanded}>
              <Box sx={{ mt: 1.5 }}>
                {loadingProjects ? (
                  <Typography variant="body2" sx={{ color: '#6B7280', fontStyle: 'italic', p: 1 }}>
                    Loading projects...
                  </Typography>
                ) : pastProjects.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#6B7280', fontStyle: 'italic', p: 1 }}>
                    No project history yet
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {pastProjects.map(project => (
                      <Box
                        key={project.id}
                        sx={{
                          p: 1.5,
                          bgcolor: '#2A2520',
                          borderRadius: 1,
                          borderLeft: `3px solid ${project.color || '#6B7280'}`,
                        }}
                      >
                        <Typography variant="body2" sx={{ color: '#F3F4F6', fontWeight: 500 }}>
                          {project.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                            {project.totalHours}h
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6B7280' }}>
                            {formatDateRange(project.firstWeek, project.lastWeek)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Collapse>
          </Box>

          {/* Footer Actions */}
          <Box sx={{ p: 2, borderTop: '1px solid #374151' }}>
            {editing ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={saving}
                  sx={{ borderColor: '#374151', color: '#9CA3AF' }}
                >
                  Cancel
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{ bgcolor: '#80FF9C', color: '#1E1D1B', '&:hover': { bgcolor: '#6BE088' } }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            ) : isAdmin && user.is_freelance && !user.is_active ? (
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ActivateIcon />}
                sx={{
                  borderColor: cardColor,
                  color: cardColor,
                  '&:hover': { borderColor: cardColor, bgcolor: `${cardColor}22` },
                }}
              >
                Move to Active Roster
              </Button>
            ) : isAdmin && user.is_freelance ? (
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DeactivateIcon />}
                sx={{
                  borderColor: '#6B7280',
                  color: '#6B7280',
                  '&:hover': { borderColor: '#FF6B6B', color: '#FF6B6B', bgcolor: '#FF6B6B22' },
                }}
              >
                Move to Bullpen
              </Button>
            ) : null}
          </Box>
        </>
      ) : null}
    </Dialog>
  );
}

export default TeamMemberModal;
