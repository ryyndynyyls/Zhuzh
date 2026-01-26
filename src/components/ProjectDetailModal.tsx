/**
 * ProjectDetailModal
 * Combined view of Phase Breakdown and Week-by-Week Drill-Down
 * Opens when clicking a project from Budget Dashboard or Company Dashboard
 * 
 * Design: Uses the project's color for a glowing border effect
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Skeleton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import FolderIcon from '@mui/icons-material/Folder';
import { PhaseBreakdown } from './PhaseBreakdown';
import { ProjectDrillDown } from './ProjectDrillDown';
import { useProject } from '../hooks/useProjects';
import { glowBorderStyles, GLOW_COLORS } from './design-system';

interface ProjectDetailModalProps {
  projectId: string | null;
  onClose: () => void;
  userRole: 'employee' | 'pm' | 'admin';
}

type TabValue = 'phases' | 'drilldown';

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  projectId,
  onClose,
  userRole,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>('phases');
  const { project, loading } = useProject(projectId || undefined);

  const handleOpenSettings = () => {
    onClose();
    navigate(`/projects/${projectId}/settings`);
  };

  const open = Boolean(projectId);

  if (!open) return null;

  // Project color for the glow effect
  const projectColor = project?.color || GLOW_COLORS.projectPalette[0];

  // Calculate health status
  const getHealthInfo = () => {
    if (!project?.budget_hours || !project?.totalActual) {
      return { status: 'no-budget', label: 'No Budget', color: '#6B7280' };
    }
    const percent = (project.totalActual / project.budget_hours) * 100;
    if (percent >= 90) return { status: 'over-budget', label: 'Over Budget', color: '#FF6B6B' };
    if (percent >= 75) return { status: 'at-risk', label: 'At Risk', color: '#FFF845' };
    return { status: 'on-track', label: 'On Track', color: '#80FF9C' };
  };

  const health = getHealthInfo();
  const burnPercent = project?.budget_hours 
    ? Math.round((project.totalActual || 0) / project.budget_hours * 100) 
    : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          // Apply the glow border effect with the project's color
          ...glowBorderStyles(projectColor, {
            intensity: 'normal',
            animated: !loading, // Don't animate while loading
          }),
          backgroundImage: 'none',
          minHeight: '70vh',
          maxHeight: '90vh',
        },
      }}
    >
      {/* Gradient Header - matches TeamMemberModal style */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${projectColor} 0%, ${projectColor}99 100%)`,
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

        {/* Settings button */}
        {(userRole === 'pm' || userRole === 'admin') && (
          <IconButton
            onClick={handleOpenSettings}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 40,
              color: 'rgba(255,255,255,0.8)',
              '&:hover': { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)' },
            }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        )}

        {/* Project indicator */}
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: '#1E1D1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid white',
            mb: 1.5,
          }}
        >
          <FolderIcon sx={{ color: projectColor, fontSize: 24 }} />
        </Box>

        {/* Project name */}
        {loading ? (
          <Skeleton width={200} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
        ) : (
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
            {project?.name || 'Project'}
          </Typography>
        )}

        {/* Client name */}
        {!loading && project?.client && (
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.5 }}>
            {project.client.name}
          </Typography>
        )}

        {/* Health chip - styled for gradient background */}
        {!loading && (
          <Chip
            label={health.label}
            size="small"
            sx={{
              mt: 1.5,
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.75rem',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          />
        )}
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {/* Summary bar */}
        {!loading && project && (
          <Box
            sx={{
              display: 'flex',
              gap: 4,
              p: 2,
              backgroundColor: `${projectColor}08`,
              borderBottom: `1px solid ${projectColor}22`,
            }}
          >
            <Box>
              <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase', mb: 0.5 }}>
                Budget
              </Typography>
              <Typography sx={{ color: '#F3F4F6', fontSize: '1.1rem', fontWeight: 600 }}>
                {project.budget_hours ? `${project.budget_hours}h` : '—'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase', mb: 0.5 }}>
                Used
              </Typography>
              <Typography sx={{ color: '#F3F4F6', fontSize: '1.1rem', fontWeight: 600 }}>
                {(project.totalActual || 0).toFixed(1)}h
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase', mb: 0.5 }}>
                Remaining
              </Typography>
              <Typography
                sx={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: project.budget_hours && (project.budget_hours - (project.totalActual || 0)) < 0
                    ? '#FF6B6B'
                    : '#80FF9C',
                }}
              >
                {project.budget_hours 
                  ? `${(project.budget_hours - (project.totalActual || 0)).toFixed(1)}h`
                  : '—'}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              {project.budget_hours && (
                <>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(burnPercent, 100)}
                    sx={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#374151',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        backgroundColor: health.color,
                      },
                    }}
                  />
                  <Typography sx={{ color: health.color, fontWeight: 600, fontSize: '0.9rem' }}>
                    {burnPercent}%
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        )}

        {/* Tabs - styled with project color accent */}
        <Box sx={{ borderBottom: `1px solid ${projectColor}22` }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              px: 2,
              '& .MuiTab-root': {
                color: '#6B7280',
                textTransform: 'none',
                fontWeight: 500,
                '&.Mui-selected': {
                  color: '#F3F4F6',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: projectColor,
              },
            }}
          >
            <Tab label="Phase Breakdown" value="phases" />
            <Tab label="Week by Week" value="drilldown" />
          </Tabs>
        </Box>

        {/* Tab content */}
        <Box sx={{ p: 2 }}>
          {activeTab === 'phases' && projectId && (
            <PhaseBreakdown
              projectId={projectId}
              projectName={project?.name}
              projectColor={project?.color}
              userRole={userRole}
              hourlyRate={project?.hourly_rate || undefined}
              defaultExpanded
            />
          )}
          {activeTab === 'drilldown' && projectId && (
            <ProjectDrillDown
              projectId={projectId}
              projectName={project?.name}
              projectColor={project?.color}
              userRole={userRole}
              weeksBack={12}
              defaultExpanded
            />
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectDetailModal;
