import React from 'react';
import { Paper, Typography, Stack, Box, useTheme, Skeleton, alpha } from '@mui/material';
import MealSlot from './MealSlot'; // Import the actual MealSlot component
import { isSameDay, isValid } from 'date-fns'; // Import isValid

function DayColumn({ 
    dayName, 
    dayKey, 
    meals, 
    recipes, 
    onOpenModal, 
    onDeleteRecipe, 
    currentDate, // Pass current date to check if it's today
    weekStartDate // Pass week start date to calculate the actual date of this column
}) {
  const theme = useTheme();

  // --- Safely calculate the date for this column --- 
  let columnDate = null;
  let isToday = false;
  // Check if weekStartDate is a valid Date object before using it
  if (weekStartDate && isValid(new Date(weekStartDate))) { 
      const startDate = new Date(weekStartDate);
      const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(dayKey);
      columnDate = new Date(startDate);
      if (dayIndex !== -1) {
          columnDate.setDate(startDate.getDate() + dayIndex);
      }
      // Check if it's today only if columnDate is valid
      if (isValid(columnDate) && currentDate && isValid(currentDate)) {
          isToday = isSameDay(columnDate, currentDate);
      }
  } else {
      console.warn(`Invalid or missing weekStartDate for DayColumn ${dayKey}`);
  }
  // --- End Date Calculation --- 

  // Helper to get recipe data from the main recipe map
  const getRecipeData = (recipeId) => {
    return recipes && recipeId ? recipes[recipeId] : null;
  };

  if (!meals) {
    // Render skeleton if meals data is not yet available for this day
    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
            <Skeleton variant="text" width="50%" sx={{ mb: 2.5, mx: 'auto', height: '2rem' }} />
            <Stack spacing={2}>
                <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3 }}/>
                <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3 }}/>
                <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3 }}/>
            </Stack>
        </Paper>
    );
  }

  return (
    <Paper 
      elevation={0} // Use border instead of elevation for a flatter design
      sx={{ 
        p: { xs: 1, sm: 1.5, md: 2 }, // Responsive padding
        borderRadius: theme.shape.borderRadius * 4, // e.g., 16px
        border: `1px solid ${isToday ? theme.palette.primary.main : theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%', 
        backgroundColor: isToday ? alpha(theme.palette.primary.main, 0.05) : theme.palette.background.paper, // Subtle highlight for today
        transition: 'border-color 0.3s ease, background-color 0.3s ease',
        boxShadow: isToday ? `0 0 12px ${alpha(theme.palette.primary.main, 0.2)}` : 'none', // Subtle glow for today
      }}
    >
      <Typography 
        variant="subtitle1" // Consider responsive typography if needed
        align="center" 
        gutterBottom 
        sx={{ 
          fontWeight: isToday ? 'bold' : 'medium',
          color: isToday ? theme.palette.primary.main : 'text.primary',
          pb: 1.5,
          userSelect: 'none' // Prevent text selection
        }}
      >
        {dayName}
      </Typography>
      
      {/* Use Stack for consistent spacing */} 
      <Stack spacing={{ xs: 1.5, md: 2 }} sx={{ flexGrow: 1 }}>
        <MealSlot
          day={dayKey}
          mealType="breakfast"
          mealTypeName="Petit-déjeuner" // Pass name for accessibility
          recipeId={meals.breakfast}
          recipeData={getRecipeData(meals.breakfast)} 
          onOpenModal={onOpenModal}
          onDeleteRecipe={onDeleteRecipe}
          droppableId={`${dayKey}-breakfast`} 
          index={0} // Index for DND Draggable
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
  );
}

export default DayColumn;

