import React from 'react';
import { Box, IconButton, Typography, Stack, useTheme } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale'; // Import French locale

// Helper function to get the end of the week (Sunday)
const getEndOfWeek = (date) => {
  const startDate = getStartOfWeek(date);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return endDate;
};

// Helper function to get the start of the week (Monday) - needed locally
const getStartOfWeek = (date) => {
  const dateCopy = new Date(date);
  const day = dateCopy.getDay();
  const diff = dateCopy.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(dateCopy.setDate(diff));
};

function WeekNavigator({ currentWeekStart, onNextWeek, onPreviousWeek }) {
  const theme = useTheme();
  const startDate = getStartOfWeek(currentWeekStart);
  const endDate = getEndOfWeek(currentWeekStart);

  // Format dates, e.g., "19 Mai - 25 Mai 2025"
  const formattedStartDate = format(startDate, 'd MMMM', { locale: fr });
  const formattedEndDate = format(endDate, 'd MMMM yyyy', { locale: fr });
  const weekDisplay = `${formattedStartDate} - ${formattedEndDate}`;

  return (
    <Box 
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: { xs: 2, md: 3 }, // More margin on larger screens
        p: 1.5,
        // Optional: Add a subtle background or border if needed
        // backgroundColor: theme.palette.background.paper, 
        // borderRadius: theme.shape.borderRadius * 2,
        // borderBottom: `1px solid ${theme.palette.divider}`
      }}
    >
      <IconButton 
        aria-label="Semaine précédente" 
        onClick={onPreviousWeek} 
        sx={{ 
          // Example using M3 tonal style principles
          // backgroundColor: theme.palette.secondary.container, 
          // color: theme.palette.onSecondaryContainer,
          // '&:hover': {
          //   backgroundColor: theme.palette.action.hover,
          // }
        }}
      >
        <ChevronLeft />
      </IconButton>

      <Typography 
        variant="h6" 
        component="h2" // More semantic
        sx={{ 
          textAlign: 'center', 
          fontWeight: 'medium', 
          // Add transition for potential future animations
          transition: 'opacity 0.3s ease-in-out'
        }}
      >
        {weekDisplay}
      </Typography>

      <IconButton 
        aria-label="Semaine suivante" 
        onClick={onNextWeek}
        sx={{ 
          // Similar styling as previous button
        }}
      >
        <ChevronRight />
      </IconButton>

      {/* Optional "Today" button could be added here */}
      {/* 
      <Button variant="text" onClick={onGoToToday} sx={{ ml: 2 }}>
        Aujourd'hui
      </Button> 
      */}
    </Box>
  );
}

export default WeekNavigator;

