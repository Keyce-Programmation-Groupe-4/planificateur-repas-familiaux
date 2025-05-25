import React from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  useTheme, 
  alpha, 
  Tooltip,
  Fade,
  Zoom
} from '@mui/material';
import { 
  Add, 
  DragIndicator,
  Restaurant,
  Fastfood,
  LocalDining
} from '@mui/icons-material';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import RecipeCard from './RecipeCard';

// Meal type icons
const getMealIcon = (mealType) => {
  switch (mealType) {
    case 'breakfast': return <Fastfood />;
    case 'lunch': return <Restaurant />;
    case 'dinner': return <LocalDining />;
    default: return <Restaurant />;
  }
};

function MealSlot({ 
    day, 
    mealType, 
    mealTypeName,
    recipeId, 
    recipeData, 
    onOpenModal, 
    onDeleteRecipe, 
    droppableId, 
    index
}) {
  const theme = useTheme();

  const handleAddClick = () => {
    onOpenModal(day, mealType);
  };

  const handleDeleteClick = () => {
    onDeleteRecipe(day, mealType);
  };

  const draggableIndex = typeof index === 'number' ? index : 0;

  return (
    <Droppable droppableId={droppableId} type="RECIPE">
      {(provided, snapshot) => (
        <Box
          ref={provided.innerRef}
          {...provided.droppableProps}
          sx={{
            minHeight: '130px',
            p: 1,
            borderRadius: 4,
            backgroundColor: snapshot.isDraggingOver 
              ? alpha(theme.palette.primary.main, 0.12)
              : alpha(theme.palette.grey[500], 0.04),
            border: `2px dashed ${
              snapshot.isDraggingOver 
                ? theme.palette.primary.main 
                : alpha(theme.palette.divider, 0.6)
            }`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            position: 'relative',
            '&:focus-within': {
              boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.3)}`,
              borderColor: theme.palette.primary.main
            },
            ...(snapshot.isDraggingOver && {
              transform: 'scale(1.02)',
              boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.2)}`
            })
          }}
        >
          {/* Meal Type Label */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(4px)',
              zIndex: 2
            }}
          >
            {React.cloneElement(getMealIcon(mealType), { 
              sx: { fontSize: '0.9rem', color: theme.palette.text.secondary } 
            })}
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '0.7rem',
                fontWeight: 500,
                color: theme.palette.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {mealTypeName}
            </Typography>
          </Box>

          {recipeId ? (
            <Draggable draggableId={recipeId} index={draggableIndex}> 
              {(providedDraggable, snapshotDraggable) => (
                <Box 
                  ref={providedDraggable.innerRef}
                  {...providedDraggable.draggableProps}
                  sx={{ 
                    width: '100%',
                    position: 'relative',
                    outline: 'none',
                    transform: snapshotDraggable.isDragging 
                      ? 'rotate(3deg) scale(1.05)' 
                      : 'none',
                    boxShadow: snapshotDraggable.isDragging 
                      ? `0 10px 30px ${alpha(theme.palette.primary.main, 0.3)}`
                      : 'none',
                    transition: snapshotDraggable.isDragging 
                      ? 'none' 
                      : 'all 0.2s ease',
                    zIndex: snapshotDraggable.isDragging ? 1000 : 1,
                    p: 1
                  }}
                >
                  {/* Drag Handle */}
                  <Tooltip title="Glisser pour déplacer" arrow>
                    <Box 
                      {...providedDraggable.dragHandleProps} 
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        cursor: 'grab',
                        color: theme.palette.text.secondary,
                        opacity: 0.7,
                        zIndex: 3,
                        p: 0.5,
                        borderRadius: 1,
                        backgroundColor: alpha(theme.palette.background.paper, 0.9),
                        backdropFilter: 'blur(4px)',
                        '&:hover': { 
                          opacity: 1,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main
                        },
                        '&:active': {
                          cursor: 'grabbing'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <DragIndicator fontSize="small" />
                    </Box>
                  </Tooltip>

                  <RecipeCard
                    recipeData={recipeData}
                    variant="compact"
                    onDeleteClick={handleDeleteClick}
                    sx={{
                      backgroundColor: snapshotDraggable.isDragging 
                        ? alpha(theme.palette.background.paper, 0.95) 
                        : theme.palette.background.paper,
                      border: snapshotDraggable.isDragging
                        ? `2px solid ${theme.palette.primary.main}`
                        : `1px solid ${alpha(theme.palette.divider, 0.5)}`
                    }}
                  />
                </Box>
              )}
            </Draggable>
          ) : (
            <Fade in timeout={300}>
              <Button
                variant="outlined"
                onClick={handleAddClick}
                startIcon={<Add />}
                sx={{
                  width: 'calc(100% - 16px)',
                  height: '90px',
                  borderStyle: 'dashed',
                  borderWidth: '2px',
                  color: theme.palette.text.secondary,
                  borderColor: 'transparent',
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.5)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main,
                    transform: 'scale(1.02)',
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.2)}`,
                    '& .MuiButton-startIcon': {
                      transform: 'scale(1.2)'
                    }
                  },
                  '&:focus-visible': {
                    borderColor: theme.palette.primary.main,
                    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.3)}`,
                  },
                  '& .MuiButton-startIcon': {
                    transition: 'transform 0.2s ease'
                  }
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Ajouter une recette
                  </Typography>
                </Box>
              </Button>
            </Fade>
          )}
          
          <Box sx={{ display: 'none' }}>{provided.placeholder}</Box>
        </Box>
      )}
    </Droppable>
  );
}

export default MealSlot;
