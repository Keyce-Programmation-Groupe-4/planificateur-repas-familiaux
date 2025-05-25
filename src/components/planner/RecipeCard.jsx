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
  Tooltip
} from '@mui/material';
import { Close, Restaurant } from '@mui/icons-material';

function RecipeCard({ 
    recipeData, 
    variant = 'compact', // 'compact' (in slot), 'list' (in modal)
    onDeleteClick, 
    onClick, 
    sx = {}, 
}) {
  const theme = useTheme();

  // State to handle image loading errors
  const [imgError, setImgError] = React.useState(false);

  // Reset error state when recipeData changes
  React.useEffect(() => {
    setImgError(false);
  }, [recipeData?.photoURL]);

  const handleImageError = () => {
    setImgError(true);
  };

  if (!recipeData) {
    // Skeleton based on variant
    const isCompact = variant === 'compact';
    const avatarSize = isCompact ? 32 : 56;
    return (
      <Card 
        variant="outlined" 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: isCompact ? 0.5 : 1.5, 
          borderRadius: '12px', 
          width: '100%',
          border: `1px solid ${theme.palette.divider}`,
          ...sx 
        }}
      >
        <Skeleton variant="circular" width={avatarSize} height={avatarSize} sx={{ mr: 1.5 }} />
        <Skeleton variant="text" width="70%" height={20} />
      </Card>
    );
  }

  const { name, photoURL } = recipeData;
  const isCompact = variant === 'compact';
  const avatarSize = isCompact ? 32 : 56;
  const typographyVariant = isCompact ? 'body2' : 'titleMedium'; // Use M3 scale

  // Determine if we should show the image or the fallback icon
  const showImage = photoURL && !imgError;

  return (
    <Card
      onClick={onClick} // Handles click for selection in modal
      aria-label={variant === 'list' ? `Sélectionner la recette ${name}` : `Recette ${name}`}
      role={variant === 'list' ? 'button' : undefined}
      tabIndex={variant === 'list' ? 0 : undefined} // Make selectable cards focusable
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: isCompact ? 0.5 : 1.5, 
        pr: isCompact ? 3 : 1.5, // Ensure space for delete button in compact mode
        borderRadius: '12px',
        width: '100%',
        position: 'relative',
        overflow: 'visible',
        backgroundColor: theme.palette.background.paper,
        variant: 'outlined',
        border: `1px solid ${theme.palette.divider}`,
        transition: 'box-shadow 0.2s ease-in-out, background-color 0.2s ease-in-out, border-color 0.2s ease-in-out',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          boxShadow: onClick ? theme.shadows[3] : 'none',
          backgroundColor: onClick ? theme.palette.action.hover : theme.palette.background.paper,
          borderColor: onClick ? theme.palette.primary.light : theme.palette.divider,
          // Show delete button on hover for compact variant
          ...(isCompact && onDeleteClick && { '& .delete-button': { opacity: 1, transform: 'scale(1)' } }),
        },
        // Focus styles for selectable cards
        ...(variant === 'list' && {
            '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: '2px',
                boxShadow: theme.shadows[3],
                borderColor: theme.palette.primary.main,
            }
        }),
        ...sx,
      }}
    >
      {/* Avatar/Image */} 
      {showImage ? (
        <Avatar
          src={photoURL}
          alt="" // Alt text is handled by the main card label
          aria-hidden="true" // Decorative image
          sx={{ width: avatarSize, height: avatarSize, mr: 1.5 }}
          onError={handleImageError} // Handle image load error
        />
      ) : (
        // Fallback Icon Avatar
        <Avatar 
            aria-hidden="true"
            sx={{ 
                width: avatarSize, 
                height: avatarSize, 
                mr: 1.5, 
                bgcolor: alpha(theme.palette.secondary.main, 0.1), // Use theme color
                color: theme.palette.secondary.main 
            }}
        >
          <Restaurant />
        </Avatar>
      )}

      {/* Recipe Name */} 
      <Box sx={{ flexGrow: 1, overflow: 'hidden', mr: 1 }}>
        <Typography 
            variant={typographyVariant} 
            noWrap 
            title={name} 
            sx={{ fontWeight: isCompact ? 400 : 500 }}
            id={`recipe-card-name-${recipeData.id}`} // ID for aria-labelledby
        >
          {name}
        </Typography>
      </Box>

      {/* Delete Button (Compact Variant Only) */} 
      {isCompact && onDeleteClick && (
        <Tooltip title="Supprimer cette recette du planning">
            <IconButton
                aria-label={`Supprimer la recette ${name}`}
                aria-controls={`recipe-card-name-${recipeData.id}`} // Associates button with the recipe name
                size="small"
                onClick={(e) => { 
                    e.stopPropagation(); // Prevent card click/drag
                    onDeleteClick(); 
                }}
                className="delete-button"
                sx={{
                    position: 'absolute',
                    top: -6, 
                    right: -6,
                    opacity: 0,
                    transform: 'scale(0.8)',
                    transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: theme.shadows[1],
                    color: theme.palette.error.main,
                    '&:hover': {
                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                        transform: 'scale(1.05)',
                    },
                    '&:focus-visible': { // Ensure focus is visible
                        opacity: 1,
                        transform: 'scale(1)',
                        boxShadow: `0 0 0 2px ${alpha(theme.palette.error.main, 0.5)}`,
                    },
                    zIndex: 2 
                }}
            >
                <Close fontSize="inherit" />
            </IconButton>
        </Tooltip>
      )}
    </Card>
  );
}

export default RecipeCard;

