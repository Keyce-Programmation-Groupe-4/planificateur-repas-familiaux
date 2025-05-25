"use client"

import { useState, useEffect } from "react"
import { Link as RouterLink, useNavigate } from "react-router-dom"
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Fab,
  TextField,
  CircularProgress,
  Alert,
  Skeleton,
  useTheme,
  alpha,
  Fade,
  Zoom,
  InputAdornment,
  Chip,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/material"
import {
  Add as AddIcon,
  Search as SearchIcon,
  Restaurant as RestaurantIcon,
  AccessTime as AccessTimeIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material"
import { useAuth } from "../contexts/AuthContext"
import { db } from "../firebaseConfig"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"

export default function RecipesListPage() {
  const { currentUser, userData } = useAuth()
  const navigate = useNavigate()
  const theme = useTheme()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  // Check if user can modify recipes (only Admins)
  const canModify = userData?.familyRole === "Admin"

  useEffect(() => {
    const fetchRecipes = async () => {
      if (!userData?.familyId) {
        setLoading(false)
        setRecipes([])
        return
      }

      setLoading(true)
      setError("")
      try {
        const recipesRef = collection(db, "recipes")
        const q = query(recipesRef, where("familyId", "==", userData.familyId), orderBy("createdAt", "desc"))

        const querySnapshot = await getDocs(q)
        const fetchedRecipes = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setRecipes(fetchedRecipes)
      } catch (err) {
        console.error("Error fetching recipes:", err)
        setError("Erreur lors de la récupération des recettes.")
      } finally {
        setLoading(false)
      }
    }

    if (userData) {
      fetchRecipes()
    }
  }, [userData])

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (recipe.tags && recipe.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  )

  const clearSearch = () => {
    setSearchTerm("")
  }

  const renderSkeletons = () => (
    <Grid container spacing={3}>
      {[...Array(6)].map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Fade in timeout={300 + index * 100}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                height: "100%",
              }}
            >
              <Skeleton variant="rectangular" height={200} />
              <CardContent>
                <Skeleton variant="text" sx={{ fontSize: "1.25rem", mb: 1 }} />
                <Skeleton variant="text" width="80%" />
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Skeleton variant="rounded" width={60} height={24} />
                  <Skeleton variant="rounded" width={80} height={24} />
                </Stack>
              </CardContent>
              <CardActions sx={{ p: 2 }}>
                <Skeleton variant="rounded" width={80} height={32} />
                <Skeleton variant="rounded" width={80} height={32} />
              </CardActions>
            </Card>
          </Fade>
        </Grid>
      ))}
    </Grid>
  )

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
        minHeight: "calc(100vh - 64px)",
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Fade in timeout={600}>
          <Box sx={{ mb: 4, textAlign: "center" }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 1,
              }}
            >
              Mes Recettes
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {canModify ? "Gérez votre collection de recettes" : "Découvrez les recettes de votre famille"}
            </Typography>
          </Box>
        </Fade>

        {/* No Family Alert */}
        {!loading && !userData?.familyId && (
          <Fade in>
            <Alert
              severity="info"
              sx={{
                mb: 3,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
            >
              Vous devez faire partie d'une famille pour pouvoir voir les recettes.
            </Alert>
          </Fade>
        )}

        {/* Search Bar */}
        {userData?.familyId && (
          <Zoom in timeout={800}>
            <Box sx={{ mb: 4, maxWidth: "600px", mx: "auto" }}>
              <TextField
                fullWidth
                placeholder="Rechercher une recette ou un tag..."
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton onClick={clearSearch} edge="end">
                        <ClearIcon />
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
          </Zoom>
        )}

        {/* Error Alert */}
        {error && (
          <Fade in>
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
              {error}
            </Alert>
          </Fade>
        )}

        {/* Stats Bar */}
        {!loading && userData?.familyId && (
          <Fade in timeout={1000}>
            <Box sx={{ mb: 4, textAlign: "center" }}>
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ flexWrap: "wrap", gap: 2 }}>
                <Chip
                  icon={<RestaurantIcon />}
                  label={`${filteredRecipes.length} recette${filteredRecipes.length !== 1 ? "s" : ""}`}
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    borderRadius: 3,
                  }}
                />
                {searchTerm && (
                  <Chip
                    icon={<FilterListIcon />}
                    label={`Recherche: "${searchTerm}"`}
                    onDelete={clearSearch}
                    sx={{
                      backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                      color: theme.palette.secondary.main,
                      fontWeight: 600,
                      borderRadius: 3,
                    }}
                  />
                )}
              </Stack>
            </Box>
          </Fade>
        )}

        {/* Recipes Grid */}
        {loading ? (
          renderSkeletons()
        ) : (
          <Grid container spacing={3}>
            {filteredRecipes.length > 0 ? (
              filteredRecipes.map((recipe, index) => (
                <Grid item xs={12} sm={6} md={4} key={recipe.id}>
                  <Zoom in timeout={400 + index * 100}>
                    <Card
                      elevation={0}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        borderRadius: 4,
                        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                          transform: "translateY(-8px)",
                          boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.15)}`,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                        },
                      }}
                    >
                      <Box sx={{ position: "relative", overflow: "hidden" }}>
                        <CardMedia
                          component="img"
                          height="200"
                          image={recipe.photoUrl || "/placeholder.svg?height=200&width=300"}
                          alt={recipe.name}
                          sx={{
                            objectFit: "cover",
                            transition: "transform 0.3s ease",
                            "&:hover": {
                              transform: "scale(1.05)",
                            },
                          }}
                        />
                        {/* Recipe Stats Overlay */}
                        <Box
                          sx={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            display: "flex",
                            gap: 1,
                          }}
                        >
                          {recipe.prepTime && (
                            <Chip
                              icon={<AccessTimeIcon />}
                              label={`${recipe.prepTime}min`}
                              size="small"
                              sx={{
                                backgroundColor: alpha(theme.palette.background.paper, 0.9),
                                backdropFilter: "blur(4px)",
                                fontSize: "0.75rem",
                              }}
                            />
                          )}
                          {recipe.servings && (
                            <Chip
                              icon={<GroupIcon />}
                              label={recipe.servings}
                              size="small"
                              sx={{
                                backgroundColor: alpha(theme.palette.background.paper, 0.9),
                                backdropFilter: "blur(4px)",
                                fontSize: "0.75rem",
                              }}
                            />
                          )}
                        </Box>
                      </Box>

                      <CardContent sx={{ flexGrow: 1, p: 3 }}>
                        <Typography
                          variant="h6"
                          component="div"
                          sx={{
                            fontWeight: 600,
                            mb: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {recipe.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            minHeight: "2.5em",
                          }}
                        >
                          {recipe.description ||
                            recipe.tags?.join(", ") ||
                            "Aucune description disponible"}
                        </Typography>
                        {recipe.tags && recipe.tags.length > 0 && (
                          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                            {recipe.tags.slice(0, 3).map((tag, tagIndex) => (
                              <Chip
                                key={tagIndex}
                                label={tag}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                                  color: theme.palette.secondary.main,
                                  fontSize: "0.7rem",
                                  height: "20px",
                                }}
                              />
                            ))}
                            {recipe.tags.length > 3 && (
                              <Chip
                                label={`+${recipe.tags.length - 3}`}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(theme.palette.text.secondary, 0.1),
                                  color: theme.palette.text.secondary,
                                  fontSize: "0.7rem",
                                  height: "20px",
                                }}
                              />
                            )}
                          </Stack>
                        )}
                      </CardContent>

                      <CardActions sx={{ p: 3, pt: 0 }}>
                        <Button
                          size="small"
                          component={RouterLink}
                          to={`/recipes/${recipe.id}`}
                          startIcon={<VisibilityIcon />}
                          sx={{
                            borderRadius: 3,
                            textTransform: "none",
                            fontWeight: 500,
                          }}
                        >
                          Voir Détails
                        </Button>
                        {canModify && (
                          <Button
                            size="small"
                            component={RouterLink}
                            to={`/recipes/${recipe.id}/edit`}
                            startIcon={<EditIcon />}
                            variant="outlined"
                            sx={{
                              borderRadius: 3,
                              textTransform: "none",
                              fontWeight: 500,
                              borderColor: alpha(theme.palette.primary.main, 0.3),
                              "&:hover": {
                                borderColor: theme.palette.primary.main,
                                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                              },
                            }}
                          >
                            Modifier
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  </Zoom>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                {userData?.familyId && (
                  <Fade in>
                    <Box sx={{ textAlign: "center", py: 8 }}>
                      <Avatar
                        sx={{
                          width: 120,
                          height: 120,
                          mx: "auto",
                          mb: 3,
                          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                          fontSize: "3rem",
                        }}
                      >
                        <RestaurantIcon sx={{ fontSize: "3rem", color: theme.palette.text.disabled }} />
                      </Avatar>
                      <Typography variant="h5" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                        {searchTerm
                          ? "Aucune recette trouvée"
                          : canModify
                          ? "Aucune recette créée"
                          : "Aucune recette disponible"}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        {searchTerm
                          ? `Aucune recette ne correspond à "${searchTerm}"`
                          : canModify
                          ? "Commencez par créer votre première recette !"
                          : "Votre famille n'a pas encore ajouté de recettes"}
                      </Typography>
                      {canModify && !searchTerm && (
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<AddIcon />}
                          component={RouterLink}
                          to="/recipes/new"
                          sx={{
                            borderRadius: 4,
                            px: 4,
                            py: 1.5,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
                            "&:hover": {
                              transform: "translateY(-2px)",
                              boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.4)}`,
                            },
                            transition: "all 0.3s ease",
                          }}
                        >
                          Créer ma première recette
                        </Button>
                      )}
                    </Box>
                  </Fade>
                )}
              </Grid>
            )}
          </Grid>
        )}

        {/* Floating Action Button - Only for Admins */}
        {userData?.familyId && canModify && filteredRecipes.length > 0 && (
          <Tooltip title="Ajouter une nouvelle recette" arrow>
            <Fab
              color="primary"
              aria-label="add recipe"
              component={RouterLink}
              to="/recipes/new"
              sx={{
                position: "fixed",
                bottom: 32,
                right: 32,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                "&:hover": {
                  transform: "scale(1.1)",
                  boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.5)}`,
                },
                transition: "all 0.3s ease",
              }}
            >
              <AddIcon />
            </Fab>
          </Tooltip>
        )}

        {/* Permission Notice for Members */}
        {userData?.familyId && !canModify && (
          <Fade in>
            <Box
              sx={{
                position: "fixed",
                bottom: 32,
                right: 32,
                maxWidth: 300,
              }}
            >
              <Alert
                severity="info"
                sx={{
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  backdropFilter: "blur(10px)",
                }}
              >
                <Typography variant="caption">
                  Seuls les administrateurs peuvent créer et modifier des recettes.
                </Typography>
              </Alert>
            </Box>
          </Fade>
        )}
      </Container>
    </Box>
  )
}
