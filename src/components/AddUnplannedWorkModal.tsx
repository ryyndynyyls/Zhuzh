import React, { useState, useMemo } from 'react';
import { glowBorderStyles, GLOW_COLORS } from './design-system';
import {
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Chip,
  Box,
  Typography,
  Autocomplete,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
} from '@mui/icons-material';

interface ProjectOption {
  id: string;
  name: string;
  color: string;
  phases?: Array<{ id: string; name: string }>;
}

interface AddUnplannedWorkModalProps {
  open: boolean;
  projects: ProjectOption[];
  onClose: () => void;
  onAdd: (data: {
    projectId: string;
    phaseId?: string;
    hours: number;
    description: string;
    tags: string[];
  }) => void;
}

// Quick tags for unplanned work categorization
const QUICK_TAGS = [
  { id: 'urgent-fix', label: 'Urgent fix', emoji: '\uD83D\uDD25' },
  { id: 'client-call', label: 'Client call', emoji: '\uD83D\uDCDE' },
  { id: 'tech-debt', label: 'Tech debt', emoji: '\uD83D\uDD27' },
  { id: 'scope-creep', label: 'Scope creep', emoji: '\uD83D\uDCC8' },
];

const AddUnplannedWorkModal: React.FC<AddUnplannedWorkModalProps> = ({
  open,
  projects,
  onClose,
  onAdd,
}) => {
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<{ id: string; name: string } | null>(null);
  const [hours, setHours] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get available phases for selected project
  const availablePhases = useMemo(() => {
    return selectedProject?.phases || [];
  }, [selectedProject]);

  const handleProjectChange = (
    _event: React.SyntheticEvent,
    value: ProjectOption | null
  ) => {
    setSelectedProject(value);
    setSelectedPhase(null); // Reset phase when project changes
  };

  const handlePhaseChange = (
    _event: React.SyntheticEvent,
    value: { id: string; name: string } | null
  ) => {
    setSelectedPhase(value);
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  const handleAdd = () => {
    if (!selectedProject || hours <= 0 || !description.trim()) return;

    const tagLabels = selectedTags.map(
      tagId => QUICK_TAGS.find(t => t.id === tagId)?.label || tagId
    );

    onAdd({
      projectId: selectedProject.id,
      phaseId: selectedPhase?.id,
      hours,
      description: description.trim(),
      tags: tagLabels,
    });

    // Reset form
    handleReset();
  };

  const handleReset = () => {
    setSelectedProject(null);
    setSelectedPhase(null);
    setHours(1);
    setDescription('');
    setSelectedTags([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const isValid = selectedProject && hours > 0 && description.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          ...glowBorderStyles(GLOW_COLORS.zhuzh, {
            intensity: 'subtle',
            animated: false,
          }),
          backgroundColor: '#2A2520',
          borderRadius: 3,
        },
      }}
    >
      {/* Gradient Header - Zhuzh green with dark text for contrast */}
      <Box
        sx={{
          background: `linear-gradient(135deg, #80FF9C 0%, #80FF9C99 100%)`,
          p: 2,
          position: 'relative',
        }}
      >
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'rgba(0,0,0,0.6)',
            '&:hover': { color: '#000', bgcolor: 'rgba(0,0,0,0.1)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: '#1E1D1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white',
            mb: 1,
          }}
        >
          <AddIcon sx={{ color: '#80FF9C', fontSize: 20 }} />
        </Box>

        <Typography variant="h6" sx={{ color: '#1E1D1B', fontWeight: 700 }}>
          Add Unplanned Work
        </Typography>

        <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.7)' }}>
          Log work that wasn't on your original plan
        </Typography>
      </Box>

      <DialogContent sx={{ pt: 2 }}>
        {/* Project dropdown (searchable) */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ color: '#D1D5DB', mb: 1 }}>
            Project *
          </Typography>
          <Autocomplete
            options={projects}
            getOptionLabel={(option) => option.name}
            value={selectedProject}
            onChange={handleProjectChange}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: option.color,
                  }}
                />
                {option.name}
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search projects..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1A1917',
                    color: '#F3F4F6',
                    '& fieldset': { borderColor: '#374151' },
                    '&:hover fieldset': { borderColor: '#4B5563' },
                    '&.Mui-focused fieldset': { borderColor: '#FF8731' },
                  },
                  '& .MuiAutocomplete-popupIndicator': { color: '#9CA3AF' },
                  '& .MuiAutocomplete-clearIndicator': { color: '#9CA3AF' },
                }}
              />
            )}
            sx={{
              '& .MuiAutocomplete-paper': {
                backgroundColor: '#2A2520',
                border: '1px solid #374151',
              },
              '& .MuiAutocomplete-listbox': {
                '& .MuiAutocomplete-option': {
                  color: '#F3F4F6',
                  '&:hover': { backgroundColor: '#374151' },
                  '&[aria-selected="true"]': { backgroundColor: '#FF8731' },
                },
              },
            }}
          />
        </Box>

        {/* Phase dropdown (optional, based on selected project) */}
        {availablePhases.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ color: '#D1D5DB', mb: 1 }}>
              Phase (optional)
            </Typography>
            <Autocomplete
              options={availablePhases}
              getOptionLabel={(option) => option.name}
              value={selectedPhase}
              onChange={handlePhaseChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select phase..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#1A1917',
                      color: '#F3F4F6',
                      '& fieldset': { borderColor: '#374151' },
                      '&:hover fieldset': { borderColor: '#4B5563' },
                      '&.Mui-focused fieldset': { borderColor: '#FF8731' },
                    },
                    '& .MuiAutocomplete-popupIndicator': { color: '#9CA3AF' },
                    '& .MuiAutocomplete-clearIndicator': { color: '#9CA3AF' },
                  }}
                />
              )}
            />
          </Box>
        )}

        {/* Hours input */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ color: '#D1D5DB', mb: 1 }}>
            Hours *
          </Typography>
          <TextField
            type="number"
            value={hours}
            onChange={(e) => setHours(Math.max(0, parseFloat(e.target.value) || 0))}
            inputProps={{ min: 0.5, step: 0.5 }}
            sx={{
              width: 120,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#1A1917',
                color: '#F3F4F6',
                '& fieldset': { borderColor: '#374151' },
                '&:hover fieldset': { borderColor: '#4B5563' },
                '&.Mui-focused fieldset': { borderColor: '#FF8731' },
              },
            }}
          />
        </Box>

        {/* Description textarea */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ color: '#D1D5DB', mb: 1 }}>
            Description *
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            placeholder="What did you work on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#1A1917',
                color: '#F3F4F6',
                '& fieldset': { borderColor: '#374151' },
                '&:hover fieldset': { borderColor: '#4B5563' },
                '&.Mui-focused fieldset': { borderColor: '#FF8731' },
              },
              '& .MuiOutlinedInput-input::placeholder': {
                color: '#6B7280',
                opacity: 1,
              },
            }}
          />
        </Box>

        {/* Quick tags */}
        <Box>
          <Typography variant="body2" sx={{ color: '#D1D5DB', mb: 1.5 }}>
            Quick tags (optional)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {QUICK_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <Chip
                  key={tag.id}
                  label={`${tag.emoji} ${tag.label}`}
                  onClick={() => handleTagToggle(tag.id)}
                  sx={{
                    backgroundColor: isSelected ? '#FF8731' : '#374151',
                    color: isSelected ? '#FFFFFF' : '#D1D5DB',
                    borderRadius: 9999,
                    '&:hover': {
                      backgroundColor: isSelected ? '#2563EB' : '#4B5563',
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          sx={{
            flex: 1,
            backgroundColor: '#4B5563',
            color: '#FFFFFF',
            py: 1,
            '&:hover': {
              backgroundColor: '#6B7280',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleAdd}
          disabled={!isValid}
          sx={{
            flex: 1,
            backgroundColor: isValid ? '#80FF9C' : '#374151',
            color: isValid ? '#1E1D1B' : '#FFFFFF', // Dark text on green for ADA
            py: 1,
            '&:hover': {
              backgroundColor: isValid ? '#6BE088' : '#374151',
            },
            '&.Mui-disabled': {
              backgroundColor: '#374151',
              color: '#6B7280',
            },
          }}
        >
          Add Entry
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddUnplannedWorkModal;
