import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  Button,
  IconButton,
  InputAdornment,
  Box,
  CircularProgress,
  Typography,
  useTheme,
  alpha,
  Slide, // Import Slide transition
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import RecipeCard from './RecipeCard'; // Import the actual RecipeCard

// --- Firebase Imports (if fetching recipes here) ---
// import { db } from '../../firebaseConfig';
// import { collection, query, where, getDocs } from 'firebase/firestore';
// import { useAuth } from '../../contexts/AuthContext';

// Transition component for the Dialog
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function RecipeSelectionModal({ open, onClose, onRecipeSelect, targetSlotInfo, availableRecipes = [] }) {
  const theme = useTheme();
  // const { userData } = useAuth(); // Get user data if fetching recipes here
  // const familyId = userData?.familyId;

  const [searchTerm, setSearchTerm] = useState('');
  const [recipesToDisplay, setRecipesToDisplay] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use recipes passed from parent instead of fetching internally
  useEffect(() => {
    if (open) {
        setIsLoading(true); // Simulate loading briefly for better UX
        setError(null);
        // Reset search term when modal opens
        setSearchTerm('');
        // Simulate a short delay before showing recipes
        const timer = setTimeout(() => {
            setRecipesToDisplay(availableRecipes);
            setIsLoading(false);
        }, 150); // Short delay
        return () => clearTimeout(timer);
    } else {
        // Clear recipes when closing to ensure fresh list next time
        setRecipesToDisplay([]);
    }
  }, [open, availableRecipes]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleRecipeClick = (recipe) => {
    if (targetSlotInfo) {
        onRecipeSelect(recipe.id, targetSlotInfo.day, targetSlotInfo.mealType);
    }
    onClose(); // Close modal after selection
  };

  const filteredRecipes = useMemo(() => {
    if (!searchTerm) {
      return recipesToDisplay;
    }
    return recipesToDisplay.filter(recipe =>
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [recipesToDisplay, searchTerm]);

  // Format target slot name for display
  const formatTargetSlot = () => {
      if (!targetSlotInfo) return '';
      const dayName = targetSlotInfo.day?.charAt(0).toUpperCase() + targetSlotInfo.day?.slice(1);
      let mealName = '';
      switch (targetSlotInfo.mealType) {
          case 'breakfast': mealName = 'Petit-déjeuner'; break;
          case 'lunch': mealName = 'Déjeuner'; break;
          case 'dinner': mealName = 'Dîner'; break;
          default: mealName = '';
      }
      return `${dayName} - ${mealName}`;
  }

  return (
    <Dialog
        open={open}
        TransitionComponent={Transition} // Use slide transition
        keepMounted // Keep mounted for smoother transitions
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        aria-labelledby="recipe-selection-dialog-title"
        PaperProps={{
            sx: {
                borderRadius: '16px', // Consistent modern radius
                // Consider adding a subtle background pattern or gradient if desired
                // background: `linear-gradient(145deg, ${theme.palette.background.paper}, ${alpha(theme.palette.grey[100], 0.5)})`,
            }
        }}
    >
      <DialogTitle id="recipe-selection-dialog-title" sx={{ pb: 1 }}>
        Choisir une recette
        {targetSlotInfo && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Pour : {formatTargetSlot()}
            </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, borderTop: `1px solid ${theme.palette.divider}`, borderBottom: `1px solid ${theme.palette.divider}` }}>
        {/* Search Bar Area */} 
        <Box sx={{ p: 2, backgroundColor: alpha(theme.palette.grey[500], 0.05) }}>
            <TextField
                fullWidth
                variant="outlined"
                placeholder="Rechercher une recette..."
                aria-label="Rechercher une recette"
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                    startAdornment: (
                    <InputAdornment position="start">
                        <Search color="action"/>
                    </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                    <InputAdornment position="end">
                        <Tooltip title="Effacer la recherche">
                            <IconButton onClick={clearSearch} edge="end" aria-label="Effacer la recherche">
                                <Clear />
                            </IconButton>
                        </Tooltip>
                    </InputAdornment>
                    ),
                    sx: { 
                        borderRadius: '24px', // Fully rounded search bar
                        backgroundColor: theme.palette.background.paper,
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: theme.palette.primary.main,
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: theme.palette.grey[400],
                        },
                    }
                }}
                />
        </Box>
        
        {/* Recipe List Area */} 
        <Box sx={{ maxHeight: '60vh', overflowY: 'auto', p: 1 }}>
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3, minHeight: '200px' }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Typography color="error" sx={{ p: 2, textAlign: 'center' }}>{error}</Typography>
            ) : (
                <List disablePadding>
                {filteredRecipes.length > 0 ? filteredRecipes.map((recipe) => (
                    <ListItem key={recipe.id} disablePadding sx={{ p: 0.5 }}>
                    <RecipeCard
                        recipeData={recipe}
                        variant="list" // Use the larger variant for the modal list
                        onClick={() => handleRecipeClick(recipe)}
                        sx={{ width: '100%' }}
                    />
                    </ListItem>
                )) : (
                    <Typography sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                        {searchTerm ? 'Aucune recette trouvée pour "' + searchTerm + '".' : 'Aucune recette disponible.'}
                    </Typography>
                )}
                </List>
            )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: '12px 24px' }}>
        <Button onClick={onClose} variant="text" color="inherit">Annuler</Button>
      </DialogActions>
    </Dialog>
  );
}

export default RecipeSelectionModal;

