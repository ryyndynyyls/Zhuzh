/**
 * TeamPage - Active Roster + Bullpen Management
 * Employees see read-only directory, Admins/PMs can manage bullpen
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Collapse,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Groups as TeamIcon,
  PersonOff as BullpenIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Search as SearchIcon,
  Add as AddIcon,
  ArrowDownward as DeactivateIcon,
  PeopleOutlined,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useBullpen } from '../hooks/useBullpen';
import { FreelancerCard } from '../components/FreelancerCard';
import { EmptyState } from '../components/EmptyState';
import { TeamSkeleton } from '../components/Skeletons';
import { ErrorState } from '../components/ErrorState';
import { TeamMemberModal } from '../components/TeamMemberModal';
import { UserAvatar } from '../components/shared/UserAvatar';
import { User } from '../types/database';
import { DISCIPLINE_ORDER, normalizeDiscipline, getDisciplineColor } from '../utils/disciplineColors';
import { getStaggeredStyle } from '../styles/animations';

// Group users by discipline (normalized)
function groupByDiscipline(users: User[]): Record<string, User[]> {
  return users.reduce((acc, user) => {
    const discipline = normalizeDiscipline(user.discipline);
    if (!acc[discipline]) acc[discipline] = [];
    acc[discipline].push(user);
    return acc;
  }, {} as Record<string, User[]>);
}

interface AddFreelancerDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: any) => Promise<void>;
}

function AddFreelancerDialog({ open, onClose, onAdd }: AddFreelancerDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [location, setLocation] = useState('');
  const [rate, setRate] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        email: email.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        discipline: discipline.trim() || undefined,
        location: location.trim() || undefined,
        hourly_rate: rate ? parseFloat(rate) : undefined,
        specialty_notes: notes.trim() || undefined,
        website: website.trim() || undefined,
        contact_email: email.trim() || undefined,
      });
      // Reset form
      setName('');
      setEmail('');
      setJobTitle('');
      setDiscipline('');
      setLocation('');
      setRate('');
      setNotes('');
      setWebsite('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ backgroundColor: '#1E1D1B', color: '#F3F4F6' }}>
        Add to Bullpen
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: '#1E1D1B', pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            fullWidth
            size="small"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Job Title"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Discipline"
              value={discipline}
              onChange={e => setDiscipline(e.target.value)}
              placeholder="Designer, Developer..."
              fullWidth
              size="small"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              fullWidth
              size="small"
            />
            <TextField
              label="Hourly Rate"
              value={rate}
              onChange={e => setRate(e.target.value)}
              type="number"
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              fullWidth
              size="small"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Location"
              value={location}
              onChange={e => setLocation(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Website"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              fullWidth
              size="small"
            />
          </Box>
          <TextField
            label="Specialty Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            multiline
            rows={3}
            fullWidth
            size="small"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: '#1E1D1B', p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#9CA3AF' }}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!name.trim() || saving}
          sx={{ backgroundColor: '#80FF9C', color: '#1E1D1B' }}
        >
          {saving ? 'Adding...' : 'Add to Bullpen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function TeamPage() {
  const { user } = useAuth();
  const {
    bullpen,
    roster,
    activeFreelancers,
    loading,
    error,
    fetchProjects,
    activateFreelancer,
    deactivateUser,
    addFreelancer,
    refresh,
  } = useBullpen(user?.org_id);

  const [bullpenExpanded, setBullpenExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  // Profile modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const userRole = (user?.role as 'employee' | 'pm' | 'admin') || 'employee';
  const isAdmin = userRole === 'admin' || userRole === 'pm';

  // Handle clicking on a team member
  const handleMemberClick = (memberId: string) => {
    setSelectedUserId(memberId);
    setProfileModalOpen(true);
  };

  // Filter roster by search (includes name, job_title, discipline, and nicknames)
  const filteredRoster = roster.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.discipline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nicknames?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter bullpen by search (includes name, job_title, discipline, and nicknames)
  const filteredBullpen = bullpen.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.discipline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nicknames?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group roster by discipline
  const rosterByDiscipline = groupByDiscipline(filteredRoster);

  if (loading) {
    return <TeamSkeleton />;
  }

  if (error) {
    return <ErrorState type="generic" onRetry={() => refresh()} />;
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#1A1917', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#F3F4F6', fontWeight: 700 }}>
            Team
          </Typography>
          <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
            {roster.length} active{isAdmin && ` · ${bullpen.length} in bullpen`}
          </Typography>
        </Box>
        <TextField
          placeholder="Search team..."
          size="small"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: '#6B7280', mr: 1 }} />,
          }}
          sx={{
            width: 250,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#2A2520',
            },
          }}
        />
      </Box>

      {/* Active Roster */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TeamIcon sx={{ color: '#80FF9C' }} />
          <Typography variant="h6" sx={{ color: '#F3F4F6', fontWeight: 600 }}>
            Active Roster
          </Typography>
          <Chip 
            label={`${filteredRoster.length} members`} 
            size="small" 
            sx={{ backgroundColor: '#80FF9C22', color: '#80FF9C' }} 
          />
          {activeFreelancers.length > 0 && (
            <Chip 
              label={`${activeFreelancers.length} freelancers active`} 
              size="small" 
              sx={{ backgroundColor: '#FFF84522', color: '#FFF845' }} 
            />
          )}
        </Box>

        {/* Roster by Discipline */}
        {filteredRoster.length === 0 ? (
          <EmptyState
            icon={<PeopleOutlined />}
            title="No team members"
            description="Team members will appear here once they're added to the system."
          />
        ) : DISCIPLINE_ORDER.filter(disc => rosterByDiscipline[disc]?.length > 0).map((discipline) => (
          <Box key={discipline} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: '#9CA3AF', mb: 1.5, fontWeight: 600 }}>
              {discipline} ({rosterByDiscipline[discipline].length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {rosterByDiscipline[discipline].map((member, index) => (
                <Box
                  key={member.id}
                  onClick={() => handleMemberClick(member.id)}
                  sx={{
                    ...getStaggeredStyle(Math.min(index, 10), 'fadeInUp', { staggerDelay: 30 }),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    backgroundColor: '#2A2520',
                    borderRadius: 2,
                    border: '1px solid #374151',
                    minWidth: 220,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: getDisciplineColor(member.discipline),
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    },
                  }}
                >
                  <UserAvatar
                    name={member.name}
                    avatarUrl={member.avatar_url}
                    discipline={member.discipline}
                    size="md"
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#F3F4F6', 
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {member.name}
                      {member.is_freelance && (
                        <Chip 
                          label="FL" 
                          size="small" 
                          sx={{ 
                            ml: 1, 
                            height: 16, 
                            fontSize: '0.6rem',
                            backgroundColor: '#FFF84522', 
                            color: '#FFF845' 
                          }} 
                        />
                      )}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      {member.job_title || member.role}
                    </Typography>
                  </Box>
                  {isAdmin && member.is_freelance && (
                    <Tooltip title="Move to Bullpen">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deactivateUser(member.id);
                        }}
                        sx={{ color: '#6B7280', '&:hover': { color: '#FF6B6B' } }}
                      >
                        <DeactivateIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Bullpen Toggle - Only for Admins/PMs */}
      {isAdmin && (
        <>
          <Box
            onClick={() => setBullpenExpanded(!bullpenExpanded)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              backgroundColor: '#2A2520',
              borderRadius: 2,
              border: '1px solid #374151',
              cursor: 'pointer',
              mb: 2,
              '&:hover': {
                borderColor: '#4ECDC4',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BullpenIcon sx={{ color: '#4ECDC4' }} />
              <Typography variant="h6" sx={{ color: '#F3F4F6', fontWeight: 600 }}>
                Explore Bullpen
              </Typography>
              <Chip 
                label={`${bullpen.length} freelancers`} 
                size="small" 
                sx={{ backgroundColor: '#4ECDC422', color: '#4ECDC4' }} 
              />
            </Box>
            {bullpenExpanded ? (
              <CollapseIcon sx={{ color: '#6B7280' }} />
            ) : (
              <ExpandIcon sx={{ color: '#6B7280' }} />
            )}
          </Box>

          {/* Bullpen Content */}
          <Collapse in={bullpenExpanded}>
            <Box sx={{ pl: 2 }}>
              {/* Add Freelancer Button */}
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialogOpen(true)}
                  sx={{
                    borderColor: '#4ECDC4',
                    color: '#4ECDC4',
                    '&:hover': {
                      borderColor: '#4ECDC4',
                      backgroundColor: '#4ECDC422',
                    },
                  }}
                >
                  Add to Bullpen
                </Button>
              </Box>

              {/* Freelancer Cards */}
              {filteredBullpen.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#6B7280', fontStyle: 'italic', p: 2 }}>
                  {searchTerm ? 'No freelancers match your search' : 'No freelancers in the bullpen yet'}
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {filteredBullpen.map(freelancer => (
                    <FreelancerCard
                      key={freelancer.id}
                      freelancer={freelancer}
                      onActivate={activateFreelancer}
                      onFetchProjects={fetchProjects}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Collapse>

          {/* Add Freelancer Dialog */}
          <AddFreelancerDialog
            open={addDialogOpen}
            onClose={() => setAddDialogOpen(false)}
            onAdd={addFreelancer}
          />
        </>
      )}

      {/* Team Member Profile Modal */}
      {selectedUserId && user && (
        <TeamMemberModal
          open={profileModalOpen}
          onClose={() => {
            setProfileModalOpen(false);
            setSelectedUserId(null);
          }}
          userId={selectedUserId}
          currentUserId={user.id}
          currentUserRole={userRole}
          onUpdate={refresh}
        />
      )}
    </Box>
  );
}
