import React from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  useTheme, 
  alpha,
  Fade,
  Tooltip
} from '@mui/material';
import { 
  ChevronLeft, 
  ChevronRight,
  KeyboardArrowLeft,
  KeyboardArrowRight
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Helper functions
const getStartOfWeek = (date) => {
  const dateCopy = new Date(date);
  const day = dateCopy.getDay();
  const diff = dateCopy.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(dateCopy.setDate(diff));
};

const getEndOfWeek = (date) => {
  const startDate = getStartOfWeek(date);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return endDate;
};

function WeekNavigator({ 
  currentWeekStart, 
  onNextWeek, 
  onPreviousWeek, 
  onGoToToday,
  isLoading = false 
}) {
  const theme = useTheme();
  const startDate = getStartOfWeek(currentWeekStart);
  const endDate = getEndOfWeek(currentWeekStart);

  // Enhanced date formatting
  const formattedStartDate = format(startDate, 'd MMMM', { locale: fr });
  const formattedEndDate = format(endDate, 'd MMMM yyyy', { locale: fr });
  const weekDisplay = `${formattedStartDate} - ${formattedEndDate}`;

  // Check if current week is this week
  const today = new Date();
  const thisWeekStart = getStartOfWeek(today);
  const isCurrentWeek = startDate.getTime() === thisWeekStart.getTime();

  return (
    <Fade in timeout={600}>
      <Box 
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2,
          py: 1,
          borderRadius: 6,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
            transform: 'translateY(-1px)'
          }
        }}
      >
        <Tooltip title="Semaine précédente" arrow>
          <IconButton 
            onClick={onPreviousWeek}
            disabled={isLoading}
            size="small"
            sx={{ 
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              width: 40,
              height: 40,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                transform: 'scale(1.1)',
                boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.3)}`
              },
              '&:disabled': {
                backgroundColor: alpha(theme.palette.action.disabled, 0.1),
                color: theme.palette.action.disabled
              },
              transition: 'all 0.2s ease'
            }}
          >
            <KeyboardArrowLeft />
          </IconButton>
        </Tooltip>

        <Box sx={{ textAlign: 'center', minWidth: '200px' }}>
          <Typography 
            variant="h6" 
            component="h2"
            sx={{ 
              fontWeight: 600,
              background: isCurrentWeek 
                ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                : 'inherit',
              backgroundClip: isCurrentWeek ? 'text' : 'unset',
              WebkitBackgroundClip: isCurrentWeek ? 'text' : 'unset',
              WebkitTextFillColor: isCurrentWeek ? 'transparent' : 'inherit',
              fontSize: { xs: '0.9rem', sm: '1.1rem' },
              lineHeight: 1.2,
              transition: 'all 0.3s ease'
            }}
          >
            {weekDisplay}
          </Typography>
          {isCurrentWeek && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.primary.main,
                fontWeight: 500,
                fontSize: '0.75rem'
              }}
            >
              Cette semaine
            </Typography>
          )}
        </Box>

        <Tooltip title="Semaine suivante" arrow>
          <IconButton 
            onClick={onNextWeek}
            disabled={isLoading}
            size="small"
            sx={{ 
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              width: 40,
              height: 40,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                transform: 'scale(1.1)',
                boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.3)}`
              },
              '&:disabled': {
                backgroundColor: alpha(theme.palette.action.disabled, 0.1),
                color: theme.palette.action.disabled
              },
              transition: 'all 0.2s ease'
            }}
          >
            <KeyboardArrowRight />
          </IconButton>
        </Tooltip>
      </Box>
    </Fade>
  );
}

export default WeekNavigator;
