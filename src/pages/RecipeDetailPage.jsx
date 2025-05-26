"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom"
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Stack,
  Avatar,
  Divider,
  Card,
  CardContent,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as AccessTimeIcon,
  Restaurant as RestaurantIcon,
  LocalDining as LocalDiningIcon,
  Description as DescriptionIcon,
  ArrowBack as ArrowBackIcon,
  Group as GroupIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon,
  Fastfood as FastfoodIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  WhatsApp as WhatsAppIcon,
} from "@mui/icons-material"
import { useAuth } from "../contexts/AuthContext"
import { db, storage } from "../firebaseConfig"
import { doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore"
import { ref, deleteObject } from "firebase/storage"
import ReactMarkdown from "react-markdown"

export default function RecipeDetailPage() {
  const { recipeId } = useParams()
  const { currentUser, userData } = useAuth()
  const navigate = useNavigate()
  const theme = useTheme()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Check if user can modify recipes (only Admins)
  const canModify = userData?.familyRole === "Admin"

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!recipeId || !userData?.familyId) {
        setError("Recette non trouvée ou accès non autorisé.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError("")
      try {
        const recipeDocRef = doc(db, "recipes", recipeId)
        const docSnap = await getDoc(recipeDocRef)

        if (docSnap.exists()) {
          const fetchedRecipe = { id: docSnap.id, ...docSnap.data(), likes: docSnap.data().likes || [] }
          if (fetchedRecipe.familyId === userData.familyId || fetchedRecipe.visibility === "public") {
            setRecipe(fetchedRecipe)
          } else {
            setError("Accès non autorisé à cette recette.")
            setRecipe(null)
          }
        } else {
          setError("Recette non trouvée.")
          setRecipe(null)
        }
      } catch (err) {
        console.error("Error fetching recipe details:", err)
        setError("Erreur lors de la récupération de la recette.")
      } finally {
        setLoading(false)
      }
    }

    if (userData) {
      fetchRecipe()
    }
  }, [recipeId, userData])

  const handleOpenConfirmDelete = () => {
    setConfirmDeleteDialogOpen(true)
  }

  const handleCloseConfirmDelete = () => {
    setConfirmDeleteDialogOpen(false)
  }

  const handleDeleteRecipe = async () => {
    if (!recipe) return
    setIsDeleting(true)
    setError("")
    try {
      await deleteDoc(doc(db, "recipes", recipe.id))

      if (recipe.photoUrl) {
        try {
          const photoPath = `recipes/${recipe.familyId}/${recipe.id}/photo.jpg`
          const photoRef = ref(storage, photoPath)
          await deleteObject(photoRef)
          console.log("Recipe photo deleted from Storage.")
        } catch (storageError) {
          console.warn("Could not delete recipe photo from Storage:", storageError)
        }
      }

      navigate("/recipes")
    } catch (err) {
      console.error("Error deleting recipe:", err)
      setError("Erreur lors de la suppression de la recette.")
      setIsDeleting(false)
      handleCloseConfirmDelete()
    }
  }

  const handleLike = async () => {
    if (!currentUser) {
      setError("Vous devez être connecté pour liker une recette.")
      setTimeout(() => setError(""), 3000)
      return
    }

    try {
      const recipeRef = doc(db, "recipes", recipeId)
      const isLiked = recipe.likes.includes(currentUser.uid)
      const updatedLikes = isLiked
        ? recipe.likes.filter((uid) => uid !== currentUser.uid)
        : [...recipe.likes, currentUser.uid]

      await updateDoc(recipeRef, { likes: updatedLikes })
      setRecipe((prev) => ({ ...prev, likes: updatedLikes }))
    } catch (err) {
      console.error("Error updating likes:", err)
      setError("Erreur lors de la mise à jour du like.")
      setTimeout(() => setError(""), 3000)
    }
  }

  const handleShareWhatsApp = () => {
    const recipeUrl = `${window.location.origin}/recipes/${recipeId}`
    const message = `Découvrez la recette "${recipe.name}" : ${recipeUrl}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  // Convert instructions array to Markdown string if needed
  const formatInstructions = (instructions) => {
    if (typeof instructions === "string") {
      return instructions
    }
    if (Array.isArray(instructions)) {
      return instructions.map((step) => `- ${step}`).join("\n")
    }
    return "Aucune instruction fournie."
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
          background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
        }}
      >
        <CircularProgress size={60} thickness={4} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
          minHeight: "calc(100vh - 64px)",
          py: 4,
        }}
      >
        <Container maxWidth="md">
          <Fade in>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 4,
                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.error.main, 0.02)} 100%)`,
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                textAlign: "center",
              }}
            >
              <WarningIcon sx={{ fontSize: "4rem", color: theme.palette.error.main, mb: 2 }} />
              <Typography variant="h5" color="error" sx={{ mb: 2, fontWeight: 600 }}>
                Erreur
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {error}
              </Typography>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/recipes")}
                variant="contained"
                sx={{ borderRadius: 3 }}
              >
                Retour à la liste
              </Button>
            </Paper>
          </Fade>
        </Container>
      </Box>
    )
  }

  if (!recipe) {
    return (
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
          minHeight: "calc(100vh - 64px)",
          py: 4,
        }}
      >
        <Container maxWidth="md">
          <Fade in>
            <Paper sx={{ p: 4, borderRadius: 4, textAlign: "center" }}>
              <Typography variant="h5" sx={{ mb: 2 }}>
                Recette introuvable
              </Typography>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/recipes")}
                variant="contained"
                sx={{ borderRadius: 3 }}
              >
                Retour à la liste
              </Button>
            </Paper>
          </Fade>
        </Container>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
        minHeight: "calc(100vh - 64px)",
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Fade in timeout={600}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 6,
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: 4,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate("/recipes")}
                  sx={{
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 500,
                  }}
                >
                  Retour à la liste
                </Button>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconButton
                      aria-label="liker"
                      onClick={handleLike}
                      disabled={!currentUser}
                      sx={{
                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                        color: theme.palette.error.main,
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.error.main, 0.2),
                        },
                      }}
                    >
                      {recipe.likes.includes(currentUser?.uid) ? (
                        <FavoriteIcon />
                      ) : (
                        <FavoriteBorderIcon />
                      )}
                    </IconButton>
                    <Typography variant="body2" color="text.secondary">
                      {recipe.likes.length} {recipe.likes.length === 1 ? "like" : "likes"}
                    </Typography>
                  </Box>
                  <IconButton
                    aria-label="partager sur WhatsApp"
                    onClick={handleShareWhatsApp}
                    sx={{
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                      "&:hover": {
                        backgroundColor: alpha(theme.palette.success.main, 0.2),
                      },
                    }}
                  >
                    <WhatsAppIcon />
                  </IconButton>
                  {canModify && (
                    <>
                      <IconButton
                        aria-label="modifier"
                        component={RouterLink}
                        to={`/recipes/${recipe.id}/edit`}
                        sx={{
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          "&:hover": {
                            backgroundColor: alpha(theme.palette.primary.main, 0.2),
                            transform: "scale(1.05)",
                          },
                          transition: "all 0.2s ease",
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        aria-label="supprimer"
                        onClick={handleOpenConfirmDelete}
                        sx={{
                          backgroundColor: alpha(theme.palette.error.main, 0.1),
                          color: theme.palette.error.main,
                          "&:hover": {
                            backgroundColor: alpha(theme.palette.error.main, 0.2),
                            transform: "scale(1.05)",
                          },
                          transition: "all 0.2s ease",
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                  {!canModify && (
                    <Chip
                      icon={<VisibilityIcon />}
                      label="Lecture seule"
                      size="small"
                      sx={{
                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                        color: theme.palette.info.main,
                        fontWeight: 500,
                      }}
                    />
                  )}
                </Stack>
              </Stack>

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
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <FastfoodIcon sx={{ color: theme.palette.primary.main }} />
                {recipe.name}
              </Typography>
              {recipe.description && (
                <Typography variant="h6" color="text.secondary" sx={{ fontStyle: "italic" }}>
                  {recipe.description}
                </Typography>
              )}
            </Box>

            <Box sx={{ p: 4 }}>
              {/* Image and Quick Info */}
              <Grid container spacing={4} sx={{ mb: 4 }}>
                <Grid item xs={12} md={5}>
                  <Zoom in timeout={800}>
                    <Box
                      sx={{
                        position: "relative",
                        borderRadius: 4,
                        overflow: "hidden",
                        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                      }}
                    >
                      <Box
                        component="img"
                        sx={{
                          width: "100%",
                          height: 300,
                          objectFit: "cover",
                        }}
                        alt={recipe.name}
                        src={recipe.photoUrl || "/placeholder.svg?height=300&width=400"}
                      />
                      {/* Stats Overlay */}
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: `linear-gradient(transparent, ${alpha(theme.palette.common.black, 0.7)})`,
                          p: 2,
                          color: "white",
                        }}
                      >
                        <Stack direction="row" spacing={2}>
                          {recipe.prepTime && (
                            <Chip
                              icon={<AccessTimeIcon />}
                              label={`${recipe.prepTime} min`}
                              size="small"
                              sx={{
                                backgroundColor: alpha(theme.palette.background.paper, 0.9),
                                color: theme.palette.text.primary,
                              }}
                            />
                          )}
                          {recipe.servings && (
                            <Chip
                              icon={<GroupIcon />}
                              label={`${recipe.servings} portions`}
                              size="small"
                              sx={{
                                backgroundColor: alpha(theme.palette.background.paper, 0.9),
                                color: theme.palette.text.primary,
                              }}
                            />
                          )}
                        </Stack>
                      </Box>
                    </Box>
                  </Zoom>
                </Grid>
                <Grid item xs={12} md={7}>
                  <Stack spacing={3}>
                    {/* Time Info */}
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                          <AccessTimeIcon color="primary" />
                          Temps de préparation
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: "center" }}>
                              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                                {recipe.prepTime || "?"}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                min de préparation
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: "center" }}>
                              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
                                {recipe.cookTime || "?"}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                min de cuisson
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>

                    {/* Servings */}
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`,
                        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                      }}
                    >
                      <CardContent sx={{ p: 3, textAlign: "center" }}>
                        <RestaurantIcon sx={{ fontSize: "2rem", color: theme.palette.success.main, mb: 1 }} />
                        <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                          {recipe.servings || "?"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {recipe.servings > 1 ? "portions" : "portion"}
                        </Typography>
                      </CardContent>
                    </Card>

                    {/* Tags */}
                    {recipe.tags && recipe.tags.length > 0 && (
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Tags
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                          {recipe.tags.map((tag, index) => (
                            <Chip
                              key={index}
                              label={tag}
                              sx={{
                                backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                                color: theme.palette.secondary.main,
                                fontWeight: 500,
                                borderRadius: 2,
                              }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              {/* Ingredients */}
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1, fontWeight: 600 }}
                >
                  <LocalDiningIcon color="primary" />
                  Ingrédients ({recipe.ingredients?.length || 0})
                </Typography>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                  }}
                >
                  <List disablePadding>
                    {recipe.ingredients?.map((item, index) => (
                      <ListItem
                        key={index}
                        divider={index < recipe.ingredients.length - 1}
                        sx={{
                          backgroundColor: index % 2 === 0 ? "transparent" : alpha(theme.palette.primary.main, 0.02),
                        }}
                      >
                        <ListItemText primary={item} />
                      </ListItem>
                    ))}
                  </List>
                </Card>
              </Box>

              <Divider sx={{ my: 4 }} />

              {/* Instructions */}
              <Box>
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1, fontWeight: 600 }}
                >
                  <DescriptionIcon color="primary" />
                  Instructions de préparation
                </Typography>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box
                      sx={{
                        "& p": { mb: 2, lineHeight: 1.7 },
                        "& ol": { pl: 3, "& li": { mb: 1 } },
                        "& ul": { pl: 3, "& li": { mb: 1 } },
                        "& h1, & h2, & h3": { mt: 3, mb: 2, fontWeight: 600 },
                        fontSize: "1.1rem",
                      }}
                    >
                      <ReactMarkdown>{formatInstructions(recipe.instructions)}</ReactMarkdown>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Paper>
        </Fade>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={confirmDeleteDialogOpen}
          onClose={handleCloseConfirmDelete}
          PaperProps={{
            sx: {
              borderRadius: 4,
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.error.main, 0.02)} 100%)`,
            },
          }}
        >
          <DialogTitle>
            <Typography variant="h6" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
              <DeleteIcon color="error" />
              Confirmer la suppression
            </Typography>
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: "1rem", lineHeight: 1.6 }}>
              Êtes-vous sûr de vouloir supprimer définitivement la recette <strong>"{recipe?.name}"</strong> ? Cette
              action est irréversible.
            </DialogContentText>
            {error && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseConfirmDelete} disabled={isDeleting} sx={{ borderRadius: 3 }}>
              Annuler
            </Button>
            <Button
              onClick={handleDeleteRecipe}
              color="error"
              variant="contained"
              disabled={isDeleting}
              sx={{
                borderRadius: 3,
                background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
              }}
            >
              {isDeleting ? <CircularProgress size={24} color="inherit" /> : "Supprimer définitivement"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  )
}