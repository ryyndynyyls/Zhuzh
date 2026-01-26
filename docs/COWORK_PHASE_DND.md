# Cowork Task: Phase Drag-and-Drop Reordering

**Created:** 2026-01-20
**Priority:** Low (nice-to-have polish)
**Estimated Time:** 30-45 minutes

---

## Context

The Project Settings page (`/projects/:projectId/settings`) has a phase management section where users can add, edit, and delete phases. Each phase card has a drag handle icon (`<DragIndicator />`) but **drag-and-drop reordering is not yet functional**.

The `useProjectSettings` hook already has a `reorderPhases(phaseIds: string[])` function that updates the `sort_order` in the database.

---

## Task

Add drag-and-drop functionality to reorder phases in the Project Settings page.

### Files to Modify

1. **`src/pages/ProjectSettingsPage.tsx`** — Add DnD wrapper and handlers

### Recommended Library

Use `@dnd-kit` for smooth drag-and-drop:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Implementation Steps

1. **Install @dnd-kit:**
   ```bash
   cd ~/Claude-Projects-MCP/ResourceFlow && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   ```

2. **Wrap phase list with DndContext:**
   ```tsx
   import {
     DndContext,
     closestCenter,
     KeyboardSensor,
     PointerSensor,
     useSensor,
     useSensors,
   } from '@dnd-kit/core';
   import {
     arrayMove,
     SortableContext,
     sortableKeyboardCoordinates,
     verticalListSortingStrategy,
     useSortable,
   } from '@dnd-kit/sortable';
   import { CSS } from '@dnd-kit/utilities';
   ```

3. **Create SortablePhaseCard wrapper:**
   ```tsx
   const SortablePhaseCard: React.FC<PhaseCardProps & { id: string }> = ({ id, ...props }) => {
     const {
       attributes,
       listeners,
       setNodeRef,
       transform,
       transition,
       isDragging,
     } = useSortable({ id });

     const style = {
       transform: CSS.Transform.toString(transform),
       transition,
       opacity: isDragging ? 0.5 : 1,
     };

     return (
       <div ref={setNodeRef} style={style}>
         <PhaseCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
       </div>
     );
   };
   ```

4. **Update PhaseCard to accept dragHandleProps:**
   ```tsx
   interface PhaseCardProps {
     // ... existing props
     dragHandleProps?: Record<string, any>;
   }

   // In the component:
   <DragIndicator 
     sx={{ color: 'text.disabled', cursor: 'grab' }} 
     {...dragHandleProps}
   />
   ```

5. **Add DndContext to phases section:**
   ```tsx
   const sensors = useSensors(
     useSensor(PointerSensor),
     useSensor(KeyboardSensor, {
       coordinateGetter: sortableKeyboardCoordinates,
     })
   );

   const handleDragEnd = async (event: DragEndEvent) => {
     const { active, over } = event;
     if (over && active.id !== over.id) {
       const oldIndex = phases.findIndex(p => p.id === active.id);
       const newIndex = phases.findIndex(p => p.id === over.id);
       const newOrder = arrayMove(phases, oldIndex, newIndex);
       await reorderPhases(newOrder.map(p => p.id));
     }
   };

   // In JSX:
   <DndContext
     sensors={sensors}
     collisionDetection={closestCenter}
     onDragEnd={handleDragEnd}
   >
     <SortableContext items={phases.map(p => p.id)} strategy={verticalListSortingStrategy}>
       {phases.map((phase) => (
         <SortablePhaseCard key={phase.id} id={phase.id} phase={phase} ... />
       ))}
     </SortableContext>
   </DndContext>
   ```

---

## Verification

1. Start the dev server: `npm run dev`
2. Navigate to any project's settings page
3. Add at least 3 phases
4. Drag phases to reorder them
5. Refresh the page — order should persist
6. Check console for any errors

---

## Notes

- The `reorderPhases` function in `useProjectSettings` already handles the database update
- Optimistic UI update happens automatically (local state reorders, then DB is updated)
- Consider adding a visual indicator when dragging (elevated shadow, etc.)

---

## Files Reference

- Hook with reorder function: `src/hooks/useProjectSettings.ts`
- Settings page: `src/pages/ProjectSettingsPage.tsx`
