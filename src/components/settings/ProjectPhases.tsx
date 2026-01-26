/**
 * ProjectPhases — Sortable list of phases with add/edit/delete
 * Uses @dnd-kit for drag-and-drop reordering
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  Skeleton,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PhaseCard } from './PhaseCard';
import type { ProjectPhase } from '../../types/database';

interface ProjectPhasesProps {
  projectId: string;
  phases: ProjectPhase[];
  loading?: boolean;
  onAddPhase: (name: string, budgetHours: number) => Promise<void>;
  onUpdatePhase: (phaseId: string, updates: Partial<ProjectPhase>) => Promise<void>;
  onDeletePhase: (phaseId: string) => Promise<void>;
  onReorderPhases: (phaseIds: string[]) => Promise<void>;
  phaseActuals?: Record<string, number>; // phaseId -> actual hours
}

export const ProjectPhases: React.FC<ProjectPhasesProps> = ({
  projectId,
  phases,
  loading,
  onAddPhase,
  onUpdatePhase,
  onDeletePhase,
  onReorderPhases,
  phaseActuals = {},
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseBudget, setNewPhaseBudget] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [localPhases, setLocalPhases] = useState<ProjectPhase[]>(phases);

  // Sync local state when props change
  useEffect(() => {
    setLocalPhases(phases);
  }, [phases]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localPhases.findIndex((p) => p.id === active.id);
      const newIndex = localPhases.findIndex((p) => p.id === over.id);

      const reordered = arrayMove(localPhases, oldIndex, newIndex);
      setLocalPhases(reordered);

      // Persist to server
      const phaseIds = reordered.map((p) => p.id);
      try {
        await onReorderPhases(phaseIds);
      } catch (err) {
        // Revert on error
        setLocalPhases(phases);
        setError('Failed to reorder phases');
      }
    }
  }, [localPhases, onReorderPhases, phases]);

  const handleAddPhase = async () => {
    if (!newPhaseName.trim()) {
      setError('Phase name is required');
      return;
    }

    setError(null);
    try {
      await onAddPhase(newPhaseName.trim(), parseFloat(newPhaseBudget) || 0);
      setNewPhaseName('');
      setNewPhaseBudget('');
      setIsAdding(false);
    } catch (err) {
      setError('Failed to add phase');
    }
  };

  const handleDuplicate = async (phase: ProjectPhase) => {
    try {
      await onAddPhase(`${phase.name} (copy)`, phase.budget_hours || 0);
    } catch (err) {
      setError('Failed to duplicate phase');
    }
  };

  // Calculate totals
  const totalBudget = localPhases.reduce((sum, p) => sum + (p.budget_hours || 0), 0);
  const totalActual = Object.values(phaseActuals).reduce((sum: number, h: number) => sum + h, 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={64}
            sx={{ bgcolor: '#374151' }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#F3F4F6' }}>
          Phases
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            Total: <strong style={{ color: '#F3F4F6' }}>{totalBudget}h</strong>
            {totalActual > 0 && (
              <> ({totalActual.toFixed(1)}h used)</>
            )}
          </Typography>
          {!isAdding && (
            <Button
              startIcon={<Add />}
              onClick={() => setIsAdding(true)}
              size="small"
              sx={{
                color: '#FF8731',
                '&:hover': { backgroundColor: 'rgba(255, 135, 49, 0.1)' },
              }}
            >
              Add Phase
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Add Phase Form */}
      {isAdding && (
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            p: 2,
            mb: 2,
            backgroundColor: 'rgba(255, 135, 49, 0.1)',
            borderRadius: 2,
            border: '1px dashed #FF8731',
          }}
        >
          <TextField
            placeholder="Phase name"
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            size="small"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddPhase();
              if (e.key === 'Escape') setIsAdding(false);
            }}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                color: '#F3F4F6',
                '& fieldset': { borderColor: '#4B5563' },
                '&:hover fieldset': { borderColor: '#6B7280' },
                '&.Mui-focused fieldset': { borderColor: '#FF8731' },
              },
              '& .MuiInputBase-input::placeholder': {
                color: '#6B7280',
                opacity: 1,
              },
            }}
          />
          <TextField
            placeholder="Hours"
            value={newPhaseBudget}
            onChange={(e) => setNewPhaseBudget(e.target.value)}
            type="number"
            size="small"
            inputProps={{ min: 0 }}
            sx={{
              width: 100,
              '& .MuiOutlinedInput-root': {
                color: '#F3F4F6',
                '& fieldset': { borderColor: '#4B5563' },
                '&:hover fieldset': { borderColor: '#6B7280' },
                '&.Mui-focused fieldset': { borderColor: '#FF8731' },
              },
              '& .MuiInputBase-input::placeholder': {
                color: '#6B7280',
                opacity: 1,
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleAddPhase}
            sx={{ backgroundColor: '#FF8731', '&:hover': { backgroundColor: '#E67620' } }}
          >
            Add
          </Button>
          <Button
            onClick={() => setIsAdding(false)}
            sx={{ color: '#9CA3AF' }}
          >
            Cancel
          </Button>
        </Box>
      )}

      {/* Sortable Phases */}
      {localPhases.length === 0 ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            backgroundColor: '#2A2520',
            borderRadius: 2,
            border: '1px dashed #374151',
          }}
        >
          <Typography sx={{ color: '#6B7280', mb: 1 }}>
            No phases yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#4B5563' }}>
            Add phases to break down your project budget
          </Typography>
        </Box>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localPhases.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {localPhases.map((phase) => (
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  actualHours={phaseActuals[phase.id]}
                  onUpdate={onUpdatePhase}
                  onDelete={onDeletePhase}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      )}
    </Box>
  );
};

export default ProjectPhases;
