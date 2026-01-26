/**
 * PhaseCard — Draggable phase with inline editing
 * Used in ProjectPhases for drag-and-drop reordering
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  DragIndicator,
  MoreVert,
  Delete,
  ContentCopy,
} from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ProjectPhase, PhaseStatus } from '../../types/database';

interface PhaseCardProps {
  phase: ProjectPhase;
  actualHours?: number; // For progress calculation
  onUpdate: (phaseId: string, updates: Partial<ProjectPhase>) => Promise<void>;
  onDelete: (phaseId: string) => Promise<void>;
  onDuplicate?: (phase: ProjectPhase) => void;
}

const STATUS_COLORS: Record<PhaseStatus, { bg: string; text: string }> = {
  pending: { bg: 'rgba(107, 114, 128, 0.2)', text: '#9CA3AF' },
  active: { bg: 'rgba(128, 255, 156, 0.2)', text: '#80FF9C' },
  complete: { bg: 'rgba(255, 135, 49, 0.2)', text: '#FF8731' },
};

export const PhaseCard: React.FC<PhaseCardProps> = ({
  phase,
  actualHours = 0,
  onUpdate,
  onDelete,
  onDuplicate,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempName, setTempName] = useState(phase.name);
  const [tempBudget, setTempBudget] = useState(String(phase.budget_hours || 0));
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [saving, setSaving] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const budgetInputRef = useRef<HTMLInputElement>(null);

  // dnd-kit sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingBudget && budgetInputRef.current) {
      budgetInputRef.current.focus();
      budgetInputRef.current.select();
    }
  }, [isEditingBudget]);

  // Sync temp values when phase changes
  useEffect(() => {
    setTempName(phase.name);
    setTempBudget(String(phase.budget_hours || 0));
  }, [phase.name, phase.budget_hours]);

  const handleSaveName = async () => {
    if (tempName.trim() && tempName !== phase.name) {
      setSaving(true);
      await onUpdate(phase.id, { name: tempName.trim() });
      setSaving(false);
    }
    setIsEditingName(false);
  };

  const handleSaveBudget = async () => {
    const newBudget = parseFloat(tempBudget) || 0;
    if (newBudget !== phase.budget_hours) {
      setSaving(true);
      await onUpdate(phase.id, { budget_hours: newBudget });
      setSaving(false);
    }
    setIsEditingBudget(false);
  };

  const handleStatusChange = async (newStatus: PhaseStatus) => {
    setSaving(true);
    await onUpdate(phase.id, { status: newStatus });
    setSaving(false);
    setMenuAnchor(null);
  };

  const handleDelete = async () => {
    setMenuAnchor(null);
    await onDelete(phase.id);
  };

  const progressPercent = phase.budget_hours && phase.budget_hours > 0
    ? Math.min((actualHours / phase.budget_hours) * 100, 100)
    : 0;

  const statusColor = STATUS_COLORS[phase.status];

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        backgroundColor: '#2A2520',
        borderRadius: 2,
        border: '1px solid',
        borderColor: isDragging ? '#FF8731' : '#374151',
        '&:hover': {
          borderColor: '#4B5563',
        },
        transition: 'border-color 0.15s ease',
        opacity: saving ? 0.7 : 1,
      }}
    >
      {/* Drag Handle */}
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          color: '#6B7280',
          display: 'flex',
          '&:hover': { color: '#9CA3AF' },
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <DragIndicator />
      </Box>

      {/* Phase Name */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {isEditingName ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              inputRef={nameInputRef}
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setTempName(phase.name);
                  setIsEditingName(false);
                }
              }}
              onBlur={handleSaveName}
              size="small"
              variant="standard"
              sx={{
                '& .MuiInput-root': { color: '#F3F4F6' },
                '& .MuiInput-underline:before': { borderColor: '#4B5563' },
              }}
            />
          </Box>
        ) : (
          <Typography
            onClick={() => setIsEditingName(true)}
            sx={{
              color: '#F3F4F6',
              fontWeight: 500,
              cursor: 'text',
              '&:hover': { color: '#FF8731' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {phase.name}
          </Typography>
        )}
      </Box>

      {/* Budget Hours */}
      <Box sx={{ width: 80, textAlign: 'right' }}>
        {isEditingBudget ? (
          <TextField
            inputRef={budgetInputRef}
            value={tempBudget}
            onChange={(e) => setTempBudget(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveBudget();
              if (e.key === 'Escape') {
                setTempBudget(String(phase.budget_hours || 0));
                setIsEditingBudget(false);
              }
            }}
            onBlur={handleSaveBudget}
            size="small"
            variant="standard"
            type="number"
            inputProps={{ min: 0, step: 0.5 }}
            sx={{
              width: 60,
              '& .MuiInput-root': { color: '#F3F4F6' },
              '& .MuiInput-input': { textAlign: 'right' },
            }}
          />
        ) : (
          <Tooltip title="Click to edit budget">
            <Typography
              onClick={() => setIsEditingBudget(true)}
              sx={{
                color: '#9CA3AF',
                cursor: 'text',
                '&:hover': { color: '#FF8731' },
              }}
            >
              {phase.budget_hours || 0}h
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* Progress Bar (if has actuals) */}
      {actualHours > 0 && (
        <Box sx={{ width: 60 }}>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: '#374151',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                backgroundColor: progressPercent >= 90 ? '#FF6B6B' : '#80FF9C',
              },
            }}
          />
        </Box>
      )}

      {/* Status Chip */}
      <Chip
        label={phase.status}
        size="small"
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        sx={{
          backgroundColor: statusColor.bg,
          color: statusColor.text,
          fontWeight: 500,
          fontSize: '0.7rem',
          textTransform: 'capitalize',
          cursor: 'pointer',
          '&:hover': { opacity: 0.8 },
        }}
      />

      {/* More Menu */}
      <IconButton
        size="small"
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        sx={{ color: '#6B7280' }}
      >
        <MoreVert fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{
          sx: {
            backgroundColor: '#2A2520',
            border: '1px solid #374151',
          },
        }}
      >
        <MenuItem disabled sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
          Change Status
        </MenuItem>
        {(['pending', 'active', 'complete'] as PhaseStatus[]).map((status) => (
          <MenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            selected={phase.status === status}
            sx={{
              color: STATUS_COLORS[status].text,
              textTransform: 'capitalize',
              pl: 3,
            }}
          >
            {status}
          </MenuItem>
        ))}
        <Box sx={{ borderTop: '1px solid #374151', my: 1 }} />
        {onDuplicate && (
          <MenuItem
            onClick={() => {
              onDuplicate(phase);
              setMenuAnchor(null);
            }}
            sx={{ color: '#9CA3AF' }}
          >
            <ContentCopy fontSize="small" sx={{ mr: 1 }} />
            Duplicate
          </MenuItem>
        )}
        <MenuItem
          onClick={handleDelete}
          sx={{ color: '#FF6B6B' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default PhaseCard;
