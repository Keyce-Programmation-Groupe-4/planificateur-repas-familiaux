import React from 'react';
import {
  Card,
  Avatar,
  Typography,
  IconButton,
  Box,
  useTheme,
  Skeleton,
  alpha,
  Tooltip,
  Fade
} from '@mui/material';
import { 
  Close, 
  Restaurant,
  Star,
  AccessTime
} from '@mui/icons-material';

function RecipeCard({ 
    recipeData, 
    variant = 'compact',
    onDeleteClick, 
    onClick, 
    sx = {}, 
}) {
  const theme = useTheme();
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [recipeData?.photoURL]);

  const handleImageError = () => {
    setImgError(true);
  };

  if (!recipeData) {
    const isCompact = variant === 'compact';
    const avatarSize = isCompact ? 40 : 64;
    
    return (
      <Card 
        variant="outlined" 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: isCompact ? 1.5 : 2, 
          borderRadius: 4, 
          width: '100%',
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          ...sx 
        }}
      >
        <Skeleton 
          variant="circular" 
          width={avatarSize} 
          height={avatarSize} 
          sx={{ mr: 2 }} 
        />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" width="80%" height={24} sx={{ mb: 0.5 }} />
          {!isCompact && (
            <Skeleton variant="text" width="60%" height={16} />
          )}
        </Box>
      </Card>
    );
  }

  const { name, photoURL, cookingTime, difficulty } = recipeData;
  const isCompact = variant === 'compact';
  const avatarSize = isCompact ? 40 : 64;
  const showImage = photoURL && !imgError;

  return (
    <Card
      onClick={onClick}
      role={variant === 'list' ? 'button' : undefined}
      tabIndex={variant === 'list' ? 0 : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: isCompact ? 1.5 : 2,
        pr: isCompact ? 4 : 2,
        borderRadius: 4,
        width: '100%',
        position: 'relative',
        overflow: 'visible',
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          ...(onClick && {
            boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
            borderColor: alpha(theme.palette.primary.main, 0.3),
            transform: 'translateY(-2px)'
          }),
          ...(isCompact && onDeleteClick && { 
            '& .delete-button': { 
              opacity: 1, 
              transform: 'scale(1)' 
            } 
          }),
        },
        ...(variant === 'list' && {
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: '2px',
            boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.2)}`,
            borderColor: theme.palette.primary.main,
          }
        }),
        ...sx,
      }}
    >
      {/* Recipe Image/Avatar */}
      {showImage ? (
        <Avatar
          src={photoURL}
          alt=""
          sx={{ 
            width: avatarSize, 
            height: avatarSize, 
            mr: 2,
            boxShadow: `0 4px 12px ${alpha(theme.palette.grey[500], 0.2)}`,
            border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
          }}
          onError={handleImageError}
        />
      ) : (
        <Avatar 
          sx={{ 
            width: avatarSize, 
            height: avatarSize, 
            mr: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
            color: theme.palette.primary.main,
            boxShadow: `0 4px 12px ${alpha(theme.palette.grey[500], 0.1)}`
          }}
        >
          <Restaurant />
        </Avatar>
      )}

      {/* Recipe Info */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', mr: 1 }}>
        <Typography 
          variant={isCompact ? 'body1' : 'h6'} 
          noWrap 
          title={name}
          sx={{ 
            fontWeight: isCompact ? 500 : 600,
            mb: isCompact ? 0 : 0.5,
            color: theme.palette.text.primary
          }}
          id={`recipe-card-name-${recipeData.id}`}
        >
          {name}
        </Typography>
        
        {!isCompact && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
            {cookingTime && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime sx={{ fontSize: '0.9rem', color: theme.palette.text.secondary }} />
                <Typography variant="caption" color="text.secondary">
                  {cookingTime} min
                </Typography>
              </Box>
            )}
            {difficulty && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Star sx={{ fontSize: '0.9rem', color: theme.palette.warning.main }} />
                <Typography variant="caption" color="text.secondary">
                  {difficulty}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Delete Button (Compact Only) */}
      {isCompact && onDeleteClick && (
        <Fade in>
          <Tooltip title="Supprimer cette recette" arrow>
            <IconButton
              size="small"
              onClick={(e) => { 
                e.stopPropagation();
                onDeleteClick(); 
              }}
              className="delete-button"
              sx={{
                position: 'absolute',
                top: -8, 
                right: -8,
                opacity: 0,
                transform: 'scale(0.8)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backgroundColor: theme.palette.background.paper,
                border: `2px solid ${theme.palette.error.main}`,
                boxShadow: `0 4px 15px ${alpha(theme.palette.error.main, 0.3)}`,
                color: theme.palette.error.main,
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: theme.palette.error.main,
                  color: theme.palette.error.contrastText,
                  transform: 'scale(1.1)',
                  boxShadow: `0 6px 20px ${alpha(theme.palette.error.main, 0.4)}`
                },
                '&:focus-visible': {
                  opacity: 1,
                  transform: 'scale(1)',
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.error.main, 0.3)}`,
                },
                zIndex: 3
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Tooltip>
        </Fade>
      )}
    </Card>
  );
}

export default RecipeCard;
