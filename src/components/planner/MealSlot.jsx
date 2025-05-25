import React from 'react';
import { Box, Button, IconButton, Typography, useTheme, alpha, Tooltip } from '@mui/material';
import { Add, DragIndicator } from '@mui/icons-material';
import { Droppable, Draggable } from '@hello-pangea/dnd'; // Import DND components
import RecipeCard from './RecipeCard';

function MealSlot({ 
    day, 
    mealType, 
    mealTypeName, // e.g., "Petit-déjeuner"
    recipeId, 
    recipeData, 
    onOpenModal, 
    onDeleteRecipe, 
    droppableId, 
    index // The integer index (0, 1, or 2) passed from DayColumn
}) {
  const theme = useTheme();

  const handleAddClick = () => {
    onOpenModal(day, mealType);
  };

  const handleDeleteClick = () => {
    onDeleteRecipe(day, mealType);
  };

  // Ensure index is a valid number for Draggable
  const draggableIndex = typeof index === 'number' ? index : 0;

  return (
    <Droppable droppableId={droppableId} type="RECIPE">
      {(provided, snapshot) => (
        <Box
          ref={provided.innerRef}
          {...provided.droppableProps}
          aria-label={`Créneau pour ${mealTypeName} le ${day}`}
          sx={{
            minHeight: '120px', // Increased height for better drop target
            p: 0.5,
            borderRadius: theme.shape.borderRadius * 2.5, // e.g., 10px
            backgroundColor: snapshot.isDraggingOver 
                ? alpha(theme.palette.primary.main, 0.15) // More visible highlight
                : alpha(theme.palette.grey[500], 0.05), // Subtle background always
            border: `2px dashed ${snapshot.isDraggingOver ? theme.palette.primary.main : theme.palette.divider}`,
            transition: 'background-color 0.2s ease-in-out, border-color 0.2s ease-in-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            outline: 'none', // Remove default outline
            '&:focus-within': {
                 boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.5)}`, // Focus ring for accessibility
            }
          }}
        >
          {recipeId ? (
            // Pass the integer index prop to Draggable
            <Draggable draggableId={recipeId} index={draggableIndex}> 
              {(providedDraggable, snapshotDraggable) => (
                <Box 
                  ref={providedDraggable.innerRef}
                  {...providedDraggable.draggableProps}
                  // {...providedDraggable.dragHandleProps} // We'll use a custom drag handle
                  sx={{ 
                    width: '100%',
                    position: 'relative', // Needed for drag handle positioning
                    outline: 'none', // Remove default outline
                    boxShadow: snapshotDraggable.isDragging ? theme.shadows[6] : 'none',
                    transform: snapshotDraggable.isDragging ? 'rotate(1deg)' : 'none',
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                    p: '2px' // Padding to prevent card touching border
                  }}
                  aria-label={`Recette ${recipeData?.name || 'chargement'}, glissable`}
                >
                  {/* Custom Drag Handle */} 
                  <Box 
                    {...providedDraggable.dragHandleProps} 
                    sx={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        cursor: 'grab',
                        color: theme.palette.text.secondary,
                        opacity: 0.6,
                        zIndex: 1,
                        '&:hover': { opacity: 1 }
                    }}
                    aria-label="Glisser la recette"
                  >
                    <Tooltip title="Glisser pour déplacer">
                        <DragIndicator fontSize="small" />
                    </Tooltip>
                  </Box>
                  <RecipeCard
                    recipeData={recipeData}
                    variant="compact"
                    onDeleteClick={handleDeleteClick}
                    // No onClick needed here
                    sx={{ 
                        // Adjust card style when dragged if needed
                        // backgroundColor: snapshotDraggable.isDragging ? alpha(theme.palette.background.paper, 0.9) : theme.palette.background.paper,
                    }}
                  />
                </Box>
              )}
            </Draggable>
          ) : (
            // Render the "Add" button/area if no recipe
            <Button
              variant="outlined"
              onClick={handleAddClick}
              startIcon={<Add />}
              aria-label={`Ajouter une recette pour ${mealTypeName} le ${day}`}
              sx={{
                width: '90%', // Slightly smaller than the slot
                height: '80px',
                borderStyle: 'dashed',
                color: theme.palette.text.secondary,
                borderColor: 'transparent', // Make border transparent initially
                borderRadius: theme.shape.borderRadius * 2,
                transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  borderColor: theme.palette.primary.light,
                  color: theme.palette.primary.main,
                  borderStyle: 'dashed',
                },
                '&:focus-visible': { // Enhanced focus visibility
                    borderColor: theme.palette.primary.main,
                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.3)}`,
                }
              }}
            >
              Ajouter
            </Button>
          )}
          {/* Droppable placeholder - essential for DND library */} 
          <Box sx={{ display: 'none' }}>{provided.placeholder}</Box>
        </Box>
      )}
    </Droppable>
  );
}

export default MealSlot;

