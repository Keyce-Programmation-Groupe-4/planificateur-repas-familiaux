"use client"

import React, { useState, useEffect, useMemo } from "react"
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
} from "@mui/material"
import { Search, Clear, Close, Restaurant } from "@mui/icons-material"
import RecipeCard from "./RecipeCard"

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />
})

function RecipeSelectionModal({ open, onClose, onRecipeSelect, targetSlotInfo, availableRecipes = [] }) {
  const theme = useTheme()
  const [searchTerm, setSearchTerm] = useState("")
  const [recipesToDisplay, setRecipesToDisplay] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedFilter, setSelectedFilter] = useState("all")

  useEffect(() => {
    if (open) {
      setIsLoading(true)
      setError(null)
      setSearchTerm("")
      setSelectedFilter("all")

      const timer = setTimeout(() => {
        setRecipesToDisplay(availableRecipes)
        setIsLoading(false)
      }, 200)

      return () => clearTimeout(timer)
    } else {
      setRecipesToDisplay([])
    }
  }, [open, availableRecipes])

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value)
  }

  const clearSearch = () => {
    setSearchTerm("")
  }

  const handleRecipeClick = (recipe) => {
    if (targetSlotInfo) {
      onRecipeSelect(recipe.id, targetSlotInfo.day, targetSlotInfo.mealType)
    }
    onClose()
  }

  // Filter recipes based on search and category
  const filteredRecipes = useMemo(() => {
    let filtered = recipesToDisplay

    if (searchTerm) {
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (recipe.tags && recipe.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))),
      )
    }

    if (selectedFilter !== "all") {
      filtered = filtered.filter((recipe) => {
        switch (selectedFilter) {
          case "quick":
            return recipe.cookingTime && recipe.cookingTime <= 30
          case "vegetarian":
            return recipe.tags && recipe.tags.includes("végétarien")
          case "favorites":
            return recipe.isFavorite
          default:
            return true
        }
      })
    }

    return filtered
  }, [recipesToDisplay, searchTerm, selectedFilter])

  const formatTargetSlot = () => {
    if (!targetSlotInfo) return ""
    const dayName = targetSlotInfo.day?.charAt(0).toUpperCase() + targetSlotInfo.day?.slice(1)
    let mealName = ""
    switch (targetSlotInfo.mealType) {
      case "breakfast":
        mealName = "Petit-déjeuner"
        break
      case "lunch":
        mealName = "Déjeuner"
        break
      case "dinner":
        mealName = "Dîner"
        break
      default:
        mealName = ""
    }
    return `${dayName} - ${mealName}`
  }

  const filterOptions = [
    { key: "all", label: "Toutes", count: recipesToDisplay.length },
    {
      key: "quick",
      label: "Rapides",
      count: recipesToDisplay.filter((r) => r.cookingTime && r.cookingTime <= 30).length,
    },
    {
      key: "vegetarian",
      label: "Végétarien",
      count: recipesToDisplay.filter((r) => r.tags && r.tags.includes("végétarien")).length,
    },
    { key: "favorites", label: "Favoris", count: recipesToDisplay.filter((r) => r.isFavorite).length },
  ]

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
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
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
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
        {/* Search and Filter Section */}
        <Box
          sx={{
            p: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          {/* Search Bar */}
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Rechercher une recette ou un ingrédient..."
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ mb: 2 }}
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

          {/* Filter Chips */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {filterOptions.map((option) => (
              <Chip
                key={option.key}
                label={`${option.label} (${option.count})`}
                onClick={() => setSelectedFilter(option.key)}
                variant={selectedFilter === option.key ? "filled" : "outlined"}
                sx={{
                  borderRadius: 3,
                  transition: "all 0.2s ease",
                  ...(selectedFilter === option.key && {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    "&:hover": {
                      backgroundColor: theme.palette.primary.dark,
                    },
                  }),
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Recipe List */}
        <Box sx={{ maxHeight: "50vh", overflowY: "auto", p: 2 }}>
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
              <Typography color="text.secondary">Chargement des recettes...</Typography>
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
              {filteredRecipes.length > 0 ? (
                filteredRecipes.map((recipe, index) => (
                  <Zoom in timeout={200 + index * 50} key={recipe.id}>
                    <ListItem disablePadding sx={{ p: 0.5 }}>
                      <RecipeCard
                        recipeData={recipe}
                        variant="list"
                        onClick={() => handleRecipeClick(recipe)}
                        sx={{
                          width: "100%",
                          "&:hover": {
                            transform: "translateX(8px)",
                            boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
                          },
                        }}
                      />
                    </ListItem>
                  </Zoom>
                ))
              ) : (
                <Fade in>
                  <Box sx={{ textAlign: "center", p: 6 }}>
                    <Restaurant
                      sx={{
                        fontSize: "4rem",
                        color: theme.palette.text.disabled,
                        mb: 2,
                      }}
                    />
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      {searchTerm || selectedFilter !== "all" ? "Aucune recette trouvée" : "Aucune recette disponible"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm
                        ? `Essayez de modifier votre recherche "${searchTerm}"`
                        : "Commencez par ajouter des recettes à votre collection"}
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
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
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
  )
}

export default RecipeSelectionModal
