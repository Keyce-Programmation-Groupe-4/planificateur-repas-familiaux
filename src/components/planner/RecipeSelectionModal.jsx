"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Slide,
  Fade,
  Zoom,
  Chip,
  Stack,
  Divider, // Added for separation
  ListSubheader, // Added for section titles
} from "@mui/material";
import {
  Search,
  Clear,
  Close,
  Restaurant,
  FamilyRestroom as FamilyIcon, // Added
  Public as PublicIcon, // Added
} from "@mui/icons-material";
import RecipeCard from "./RecipeCard"; // Assuming this component exists and displays a recipe

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function RecipeSelectionModal({
  open,
  onClose,
  onRecipeSelect,
  targetSlotInfo,
  // Expecting availableRecipes to be pre-sorted with family recipes first
  // and each recipe having an 'isFamilyRecipe' boolean flag
  availableRecipes = [], 
}) {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Note: Removed local filtering state (selectedFilter) as it wasn't used in the provided code
  // and the primary filtering is now based on family/public structure.

  // Separate recipes into family and public based on the flag
  const { familyRecipes, publicExternalRecipes } = useMemo(() => {
    const family = [];
    const publicExternal = [];
    availableRecipes.forEach(recipe => {
        // Apply search term filtering here before separating
        const nameMatch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
        const tagMatch = recipe.tags && recipe.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (!searchTerm || nameMatch || tagMatch) {
            if (recipe.isFamilyRecipe) {
                family.push(recipe);
            } else {
                publicExternal.push(recipe);
            }
        }
    });
    return { familyRecipes: family, publicExternalRecipes: publicExternal };
  }, [availableRecipes, searchTerm]);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setError(null);
      setSearchTerm("");
      // Simulate loading, actual data comes from props
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 150); // Shorter delay as data is pre-loaded

      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const handleRecipeClick = (recipe) => {
    if (targetSlotInfo) {
      onRecipeSelect(recipe.id, targetSlotInfo.day, targetSlotInfo.mealType);
    }
    onClose();
  };

  const formatTargetSlot = () => {
    if (!targetSlotInfo) return "";
    const dayName =
      targetSlotInfo.day?.charAt(0).toUpperCase() +
      targetSlotInfo.day?.slice(1);
    let mealName = "";
    switch (targetSlotInfo.mealType) {
      case "breakfast":
        mealName = "Petit-déjeuner";
        break;
      case "lunch":
        mealName = "Déjeuner";
        break;
      case "dinner":
        mealName = "Dîner";
        break;
      default:
        mealName = "";
    }
    return `${dayName} - ${mealName}`;
  };

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 6,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(
            theme.palette.primary.main,
            0.02
          )} 100%)`,
          backdropFilter: "blur(20px)",
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.2)}`,
          overflow: "hidden",
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: alpha(theme.palette.common.black, 0.7),
          backdropFilter: "blur(8px)",
        },
      }}
    >
      {/* Enhanced Header */}
      <DialogTitle
        sx={{
          pb: 2,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.05
          )} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
              Choisir une recette
            </Typography>
            {targetSlotInfo && (
              <Chip
                label={formatTargetSlot()}
                size="small"
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  fontWeight: 500,
                }}
              />
            )}
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              backgroundColor: alpha(theme.palette.grey[500], 0.1),
              "&:hover": {
                backgroundColor: alpha(theme.palette.grey[500], 0.2),
                transform: "scale(1.1)",
              },
              transition: "all 0.2s ease",
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Search Section */}
        <Box
          sx={{
            p: 3,
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.background.paper,
              0.8
            )} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          {/* Search Bar */}
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Rechercher une recette..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton onClick={clearSearch} edge="end">
                    <Clear />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: 4,
                backgroundColor: theme.palette.background.paper,
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: theme.palette.primary.main,
                  borderWidth: "2px",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: alpha(theme.palette.primary.main, 0.5),
                },
              },
            }}
          />
        </Box>

        {/* Recipe List */}
        <Box sx={{ maxHeight: "50vh", overflowY: "auto", p: 1 }}>
          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                p: 6,
                flexDirection: "column",
                gap: 2,
              }}
            >
              <CircularProgress size={48} thickness={4} />
              <Typography color="text.secondary">
                Chargement des recettes...
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ textAlign: "center", p: 4 }}>
              <Typography color="error" variant="h6" sx={{ mb: 1 }}>
                Erreur de chargement
              </Typography>
              <Typography color="text.secondary">{error}</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {/* Family Recipes Section */}
              {familyRecipes.length > 0 && (
                <li key="family-section">
                  <ul> {/* Required for ListSubheader */} 
                    <ListSubheader sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.05), borderRadius: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FamilyIcon fontSize="small" color="secondary"/>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.secondary.dark }}>Recettes Familiales</Typography>
                    </ListSubheader>
                    {familyRecipes.map((recipe, index) => (
                      <Zoom in timeout={200 + index * 50} key={`family-${recipe.id}`}>
                        <ListItem disablePadding sx={{ p: 0.5 }}>
                          <RecipeCard
                            recipeData={recipe}
                            variant="list"
                            onClick={() => handleRecipeClick(recipe)}
                            sx={{
                              width: "100%",
                              "&:hover": {
                                transform: "translateX(8px)",
                                boxShadow: `0 8px 25px ${alpha(
                                  theme.palette.primary.main,
                                  0.15
                                )}`,
                              },
                            }}
                          />
                        </ListItem>
                      </Zoom>
                    ))}
                  </ul>
                </li>
              )}

              {/* Public Recipes Section (only if both exist) */}
              {familyRecipes.length > 0 && publicExternalRecipes.length > 0 && (
                  <Divider sx={{ my: 2 }} />
              )}
              
              {publicExternalRecipes.length > 0 && (
                <li key="public-section">
                  <ul>
                    <ListSubheader sx={{ bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PublicIcon fontSize="small" color="info"/>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.info.dark }}>Autres Recettes Publiques</Typography>
                    </ListSubheader>
                    {publicExternalRecipes.map((recipe, index) => (
                      <Zoom in timeout={200 + index * 50} key={`public-${recipe.id}`}>
                        <ListItem disablePadding sx={{ p: 0.5 }}>
                          <RecipeCard
                            recipeData={recipe}
                            variant="list"
                            onClick={() => handleRecipeClick(recipe)}
                            sx={{
                              width: "100%",
                              "&:hover": {
                                transform: "translateX(8px)",
                                boxShadow: `0 8px 25px ${alpha(
                                  theme.palette.primary.main,
                                  0.15
                                )}`,
                              },
                            }}
                          />
                        </ListItem>
                      </Zoom>
                    ))}
                  </ul>
                </li>
              )}

              {/* No Results Message */}
              {familyRecipes.length === 0 && publicExternalRecipes.length === 0 && (
                <Fade in>
                  <Box sx={{ textAlign: "center", p: 6 }}>
                    <Restaurant
                      sx={{
                        fontSize: "4rem",
                        color: theme.palette.text.disabled,
                        mb: 2,
                      }}
                    />
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      {searchTerm
                        ? "Aucune recette trouvée"
                        : "Aucune recette disponible pour la planification"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm
                        ? `Essayez de modifier votre recherche "${searchTerm}"`
                        : "Ajoutez des recettes ou explorez les recettes publiques"}
                    </Typography>
                  </Box>
                </Fade>
              )}
            </List>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.background.paper,
            0.8
          )} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 3,
            px: 3,
            borderColor: alpha(theme.palette.primary.main, 0.3),
            "&:hover": {
              borderColor: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
            },
          }}
        >
          Annuler
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RecipeSelectionModal;
