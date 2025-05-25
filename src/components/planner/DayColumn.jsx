import React from 'react';
import { 
  Paper, 
  Typography, 
  Stack, 
  Box, 
  useTheme, 
  Skeleton, 
  alpha,
  Fade,
  Zoom
} from '@mui/material';
import MealSlot from './MealSlot';
import { isSameDay, isValid } from 'date-fns';

function DayColumn({ 
    dayName, 
    dayKey, 
    meals, 
    recipes, 
    onOpenModal, 
    onDeleteRecipe, 
    currentDate,
    weekStartDate 
}) {
  const theme = useTheme();

  // Calculate the date for this column
  let columnDate = null;
  let isToday = false;
  
  if (weekStartDate && isValid(new Date(weekStartDate))) { 
      const startDate = new Date(weekStartDate);
      const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(dayKey);
      columnDate = new Date(startDate);
      if (dayIndex !== -1) {
          columnDate.setDate(startDate.getDate() + dayIndex);
      }
      if (isValid(columnDate) && currentDate && isValid(currentDate)) {
          isToday = isSameDay(columnDate, currentDate);
      }
  } else {
      console.warn(`Invalid or missing weekStartDate for DayColumn ${dayKey}`);
  }

  // Helper to get recipe data
  const getRecipeData = (recipeId) => {
    return recipes && recipeId ? recipes[recipeId] : null;
  };

  if (!meals) {
    return (
      <Fade in timeout={300}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 2, md: 3 }, 
            borderRadius: 6, 
            border: `1px solid ${theme.palette.divider}`, 
            height: '100%',
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`
          }}
        >
          <Skeleton 
            variant="text" 
            width="60%" 
            sx={{ 
              mb: 3, 
              mx: 'auto', 
              height: '2.5rem',
              borderRadius: 2
            }} 
          />
          <Stack spacing={2.5}>
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 4 }}/>
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 4 }}/>
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 4 }}/>
          </Stack>
        </Paper>
      </Fade>
    );
  }

  return (
    <Zoom in timeout={400}>
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 2, sm: 2.5, md: 3 },
          borderRadius: 6,
          border: isToday 
            ? `2px solid ${theme.palette.primary.main}` 
            : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: isToday 
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
            : `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: isToday 
              ? `0 8px 30px ${alpha(theme.palette.primary.main, 0.25)}`
              : `0 8px 25px ${alpha(theme.palette.grey[500], 0.15)}`,
            border: isToday 
              ? `2px solid ${theme.palette.primary.main}` 
              : `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
          }
        }}
      >
        {/* Decorative element for today */}
        {isToday && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '60px',
              height: '60px',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              borderRadius: '0 0 0 60px',
              opacity: 0.1,
              zIndex: 0
            }}
          />
        )}
        
        {/* Day Header */}
        <Box sx={{ position: 'relative', zIndex: 1, mb: 2.5 }}>
          <Typography 
            variant="h6" 
            align="center" 
            sx={{ 
              fontWeight: isToday ? 700 : 500,
              color: isToday ? theme.palette.primary.main : 'text.primary',
              fontSize: { xs: '1rem', sm: '1.1rem' },
              mb: 0.5,
              userSelect: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {dayName}
          </Typography>
          
          {isToday && (
            <Box
              sx={{
                width: '40px',
                height: '3px',
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                borderRadius: '2px',
                mx: 'auto'
              }}
            />
          )}
        </Box>
        
        {/* Meal Slots */}
        <Stack spacing={2.5} sx={{ flexGrow: 1, position: 'relative', zIndex: 1 }}>
          <MealSlot
            day={dayKey}
            mealType="breakfast"
            mealTypeName="Petit-déjeuner"
            recipeId={meals.breakfast}
            recipeData={getRecipeData(meals.breakfast)} 
            onOpenModal={onOpenModal}
            onDeleteRecipe={onDeleteRecipe}
            droppableId={`${dayKey}-breakfast`} 
            index={0}
          />
          <MealSlot
            day={dayKey}
            mealType="lunch"
            mealTypeName="Déjeuner"
            recipeId={meals.lunch}
            recipeData={getRecipeData(meals.lunch)}
            onOpenModal={onOpenModal}
            onDeleteRecipe={onDeleteRecipe}
            droppableId={`${dayKey}-lunch`}
            index={1}
          />
          <MealSlot
            day={dayKey}
            mealType="dinner"
            mealTypeName="Dîner"
            recipeId={meals.dinner}
            recipeData={getRecipeData(meals.dinner)}
            onOpenModal={onOpenModal}
            onDeleteRecipe={onDeleteRecipe}
            droppableId={`${dayKey}-dinner`}
            index={2}
          />
        </Stack>
      </Paper>
    </Zoom>
  );
}

export default DayColumn;
