"use client"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Stack,
  useTheme,
  alpha,
  Fade,
  LinearProgress,
  Card,
  CardContent,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Tooltip,
  Divider,
  Chip,
  Avatar,
} from "@mui/material"
import InputAdornment from "@mui/material/InputAdornment";

import {
  ArrowBack as ArrowBackIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  Restaurant as RestaurantIcon,
  AccessTime as AccessTimeIcon,
  LocalDining as LocalDiningIcon,
  Public as PublicIcon,
  FamilyRestroom as FamilyIcon,
  InfoOutlined as InfoIcon,
  Merge as MergeIcon,
  Kitchen as KitchenIcon,
  MenuBook as MenuBookIcon,
  Timer as TimerIcon,
  Group as GroupIcon,
} from "@mui/icons-material"
import { useAuth } from "../contexts/AuthContext"
import { db, storage } from "../firebaseConfig"
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc } from "firebase/firestore"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"

export default function AggregateRecipesPage() {
  const { state } = useLocation()
  const { selectedRecipeIds } = state || {}
  const navigate = useNavigate()
  const { currentUser, userData } = useAuth()
  const theme = useTheme()
  const canModify = userData?.familyRole === "Admin" || userData?.familyRole === "SecondaryAdmin"
  const familyId = userData?.familyId

  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [recipeName, setRecipeName] = useState("")
  const [description, setDescription] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [cookTime, setCookTime] = useState("")
  const [servings, setServings] = useState("")
  const [visibility, setVisibility] = useState("family")
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [portionAdjustments, setPortionAdjustments] = useState({})

  useEffect(() => {
    const fetchRecipes = async () => {
      if (!selectedRecipeIds || selectedRecipeIds.length < 2 || !familyId) {
        setError("Sélection non valide ou accès non autorisé.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError("")
      try {
        const fetchedRecipes = []
        for (const id of selectedRecipeIds) {
          const recipeDocRef = doc(db, "recipes", id)
          const docSnap = await getDoc(recipeDocRef)
          if (docSnap.exists()) {
            const recipeData = { id: docSnap.id, ...docSnap.data() }
            if (recipeData.familyId === familyId || recipeData.visibility === "public") {
              fetchedRecipes.push(recipeData)
            }
          }
        }

        if (fetchedRecipes.length !== selectedRecipeIds.length) {
          setError("Certaines recettes ne sont pas accessibles.")
          setRecipes([])
          setLoading(false)
          return
        }

        setRecipes(fetchedRecipes)
        // Initialize portion adjustments
        setPortionAdjustments(
          fetchedRecipes.reduce(
            (acc, recipe) => ({
              ...acc,
              [recipe.id]: 1,
            }),
            {},
          ),
        )
        // Pre-fill form with aggregated data
        setRecipeName(`Menu combiné: ${fetchedRecipes.map((r) => r.name).join(", ")}`)
        setDescription(
          fetchedRecipes
            .map((r) => r.description || "")
            .filter(Boolean)
            .join("; "),
        )
        setPrepTime(Math.max(...fetchedRecipes.map((r) => Number.parseInt(r.prepTime) || 0)).toString())
        setCookTime(Math.max(...fetchedRecipes.map((r) => Number.parseInt(r.cookTime) || 0)).toString())
        setServings(Math.max(...fetchedRecipes.map((r) => Number.parseInt(r.servings) || 0)).toString())
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
  }, [selectedRecipeIds, userData, familyId])

  const aggregateIngredients = () => {
    const aggregated = {}
    recipes.forEach((recipe) => {
      const multiplier = Number.parseFloat(portionAdjustments[recipe.id]) || 1
      ;(recipe.ingredientsList || []).forEach((item) => {
        if (!item.ingredientId || !item.quantity || !item.unit) return
        const key = `${item.ingredientId}_${item.unit}`
        if (!aggregated[key]) {
          aggregated[key] = {
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            unit: item.unit,
            quantity: 0,
          }
        }
        aggregated[key].quantity += item.quantity * multiplier
      })
    })
    return Object.values(aggregated).map((item) => ({
      ...item,
      quantity: Number.parseFloat(item.quantity.toFixed(2)),
    }))
  }

  const aggregateInstructions = () => {
    return recipes
      .map((recipe) => {
        const multiplier = Number.parseFloat(portionAdjustments[recipe.id]) || 1
        let instructions =
          typeof recipe.instructions === "string"
            ? recipe.instructions
            : Array.isArray(recipe.instructions)
              ? recipe.instructions.join("\n")
              : ""
        if (multiplier !== 1) {
          instructions = `[Ajusté à ${multiplier}x portions]\n${instructions}`
        }
        return `### ${recipe.name}\n${instructions}`
      })
      .join("\n\n")
  }

  const handlePhotoChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        setError("Le fichier image est trop volumineux (max 5MB).")
        return
      }
      if (!file.type.startsWith("image/")) {
        setError("Veuillez sélectionner un fichier image.")
        return
      }
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
      setError("")
    }
  }

  const uploadPhoto = (recipeId) => {
    return new Promise((resolve, reject) => {
      if (!photoFile) {
        resolve(null)
        return
      }
      const fileExtension = photoFile.name.split(".").pop()
      const storagePath = `recipes/${familyId}/${recipeId}/photo.${fileExtension}`
      const storageRef = ref(storage, storagePath)
      const uploadTask = uploadBytesResumable(storageRef, photoFile)

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setUploadProgress(progress)
        },
        (error) => {
          setError("Erreur lors de l'upload de la photo.")
          reject(error)
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref)
            .then((downloadURL) => {
              resolve(downloadURL)
            })
            .catch(reject)
        },
      )
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canModify) {
      setError("Vous n'avez pas les droits pour créer une recette.")
      return
    }
    if (!recipeName.trim() || !aggregateInstructions().trim() || aggregateIngredients().length === 0) {
      setError("Le nom, les instructions et au moins un ingrédient sont requis.")
      return
    }

    setSaving(true)
    setError("")
    try {
      const recipeData = {
        name: recipeName.trim(),
        description: description.trim(),
        prepTime: Number.parseInt(prepTime) || 0,
        cookTime: Number.parseInt(cookTime) || 0,
        servings: Number.parseInt(servings) || 0,
        tags: Array.from(new Set(recipes.flatMap((r) => r.tags || []))),
        instructions: aggregateInstructions(),
        ingredientsList: aggregateIngredients(),
        familyId,
        visibility,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        likes: [],
      }

      const recipesRef = collection(db, "recipes")
      const docRef = await addDoc(recipesRef, recipeData)
      const finalRecipeId = docRef.id

      if (photoFile) {
        const photoUrl = await uploadPhoto(finalRecipeId)
        await updateDoc(doc(db, "recipes", finalRecipeId), { photoUrl })
      }

      navigate(`/recipes/${finalRecipeId}`)
    } catch (err) {
      console.error("Error saving aggregated recipe:", err)
      setError("Erreur lors de la sauvegarde de la recette agrégée.")
    } finally {
      setSaving(false)
      setUploadProgress(0)
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(
            theme.palette.primary.main,
            0.03,
          )} 100%)`,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper
          sx={{
            p: 6,
            borderRadius: 4,
            textAlign: "center",
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Chargement des recettes...
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (error && !recipes.length) {
    return (
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(
            theme.palette.primary.main,
            0.03,
          )} 100%)`,
          minHeight: "100vh",
          py: 4,
        }}
      >
        <Container maxWidth="lg">
          <Fade in>
            <Paper
              sx={{
                p: 6,
                borderRadius: 4,
                textAlign: "center",
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.error.main, 0.03)} 100%)`,
                border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
              }}
            >
              <MergeIcon sx={{ fontSize: "4rem", color: theme.palette.error.main, mb: 2, opacity: 0.7 }} />
              <Typography variant="h4" color="error" sx={{ mb: 2, fontWeight: 600 }}>
                {error || "Aucune recette sélectionnée."}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Veuillez retourner à la liste des recettes et sélectionner au moins deux recettes à agréger.
              </Typography>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/recipes")}
                variant="contained"
                size="large"
                sx={{
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                }}
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
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(
          theme.palette.primary.main,
          0.03,
        )} 100%)`,
        minHeight: "100vh",
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: "white",
              p: 4,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <IconButton
                onClick={() => navigate("/recipes")}
                sx={{
                  mr: 2,
                  color: "white",
                  background: alpha(theme.palette.common.white, 0.1),
                  "&:hover": {
                    background: alpha(theme.palette.common.white, 0.2),
                  },
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              <MergeIcon sx={{ fontSize: "2rem", mr: 2 }} />
              <Box>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Agréger des Recettes
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Combinez {recipes.length} recettes en une seule recette unifiée
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 4 }}>
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 4,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={4}>
                {/* Left Column - Form */}
                <Grid item xs={12} lg={5}>
                  <Stack spacing={4}>
                    <Card
                      elevation={0}
                      sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 3 }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 3 }}
                        >
                          <RestaurantIcon color="primary" />
                          Informations de la Recette
                        </Typography>

                        <Stack spacing={3}>
                          <TextField
                            label="Nom de la recette agrégée"
                            value={recipeName}
                            onChange={(e) => setRecipeName(e.target.value)}
                            required
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <RestaurantIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                            disabled={!canModify}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                          />

                          <TextField
                            label="Description courte"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            multiline
                            rows={3}
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                                  <LocalDiningIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                            disabled={!canModify}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                          />

                          <Grid container spacing={2}>
                            <Grid item xs={4}>
                              <TextField
                                label="Préparation (min)"
                                type="number"
                                value={prepTime}
                                onChange={(e) => setPrepTime(e.target.value)}
                                fullWidth
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <TimerIcon color="action" />
                                    </InputAdornment>
                                  ),
                                }}
                                disabled={!canModify}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                              />
                            </Grid>
                            <Grid item xs={4}>
                              <TextField
                                label="Cuisson (min)"
                                type="number"
                                value={cookTime}
                                onChange={(e) => setCookTime(e.target.value)}
                                fullWidth
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <AccessTimeIcon color="action" />
                                    </InputAdornment>
                                  ),
                                }}
                                disabled={!canModify}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                              />
                            </Grid>
                            <Grid item xs={4}>
                              <TextField
                                label="Portions"
                                type="number"
                                value={servings}
                                onChange={(e) => setServings(e.target.value)}
                                fullWidth
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <GroupIcon color="action" />
                                    </InputAdornment>
                                  ),
                                }}
                                disabled={!canModify}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                              />
                            </Grid>
                          </Grid>

                          <FormControl component="fieldset" disabled={!canModify}>
                            <FormLabel
                              component="legend"
                              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}
                            >
                              Visibilité
                              <Tooltip title="Public: Visible par tous. Famille: Visible uniquement par les membres de votre famille.">
                                <InfoIcon fontSize="small" color="action" />
                              </Tooltip>
                            </FormLabel>
                            <RadioGroup
                              row
                              aria-label="visibility"
                              name="visibility"
                              value={visibility}
                              onChange={(e) => setVisibility(e.target.value)}
                            >
                              <FormControlLabel
                                value="public"
                                control={<Radio size="small" />}
                                label={
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <PublicIcon fontSize="inherit" /> Public
                                  </Box>
                                }
                              />
                              <FormControlLabel
                                value="family"
                                control={<Radio size="small" />}
                                label={
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <FamilyIcon fontSize="inherit" /> Famille
                                  </Box>
                                }
                                disabled={!familyId}
                              />
                            </RadioGroup>
                          </FormControl>
                        </Stack>
                      </CardContent>
                    </Card>

                    {/* Photo Upload Section */}
                    <Card
                      elevation={0}
                      sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 3 }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 3 }}
                        >
                          <PhotoCameraIcon color="primary" />
                          Photo de la Recette
                        </Typography>

                        <Box sx={{ textAlign: "center" }}>
                          <Button
                            variant="outlined"
                            component="label"
                            startIcon={<PhotoCameraIcon />}
                            disabled={!canModify}
                            sx={{
                              borderRadius: 3,
                              mb: 2,
                              borderStyle: "dashed",
                              borderWidth: 2,
                              py: 1.5,
                              px: 3,
                            }}
                          >
                            {photoPreview ? "Changer la Photo" : "Ajouter une Photo"}
                            <input type="file" hidden accept="image/*" onChange={handlePhotoChange} />
                          </Button>

                          {photoPreview && (
                            <Box sx={{ position: "relative", display: "inline-block" }}>
                              <img
                                src={photoPreview || "/placeholder.svg"}
                                alt="Aperçu recette"
                                style={{
                                  width: "100%",
                                  maxWidth: "300px",
                                  height: "auto",
                                  borderRadius: "12px",
                                  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
                                }}
                              />
                              {canModify && (
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setPhotoFile(null)
                                    setPhotoPreview(null)
                                  }}
                                  sx={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    backgroundColor: alpha(theme.palette.error.main, 0.8),
                                    color: theme.palette.common.white,
                                    "&:hover": {
                                      backgroundColor: alpha(theme.palette.error.main, 0.9),
                                    },
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          )}

                          {uploadProgress > 0 && uploadProgress < 100 && (
                            <Box sx={{ mt: 2 }}>
                              <LinearProgress
                                variant="determinate"
                                value={uploadProgress}
                                sx={{
                                  borderRadius: 2,
                                  height: 8,
                                }}
                              />
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Upload en cours... {Math.round(uploadProgress)}%
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Stack>
                </Grid>

                {/* Right Column - Recipe Details */}
                <Grid item xs={12} lg={7}>
                  <Stack spacing={4}>
                    {/* Selected Recipes */}
                    <Card
                      elevation={0}
                      sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 3 }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 3 }}
                        >
                          <MergeIcon color="primary" />
                          Recettes Sélectionnées ({recipes.length})
                        </Typography>

                        <Stack spacing={2}>
                          {recipes.map((recipe) => (
                            <Paper
                              key={recipe.id}
                              elevation={0}
                              sx={{
                                p: 3,
                                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                                borderRadius: 3,
                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
                              }}
                            >
                              <Box
                                sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                  <Avatar
                                    src={recipe.photoUrl}
                                    sx={{
                                      width: 48,
                                      height: 48,
                                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                    }}
                                  >
                                    <RestaurantIcon />
                                  </Avatar>
                                  <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                      {recipe.name}
                                    </Typography>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 0.5 }}>
                                      <Chip
                                        icon={<AccessTimeIcon />}
                                        label={`${recipe.prepTime || 0}min`}
                                        size="small"
                                        variant="outlined"
                                      />
                                      <Chip
                                        icon={<GroupIcon />}
                                        label={`${recipe.servings || 0} portions`}
                                        size="small"
                                        variant="outlined"
                                      />
                                    </Box>
                                  </Box>
                                </Box>

                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                                    Multiplicateur:
                                  </Typography>
                                  <TextField
                                    type="number"
                                    value={portionAdjustments[recipe.id] || 1}
                                    onChange={(e) =>
                                      setPortionAdjustments((prev) => ({
                                        ...prev,
                                        [recipe.id]: e.target.value,
                                      }))
                                    }
                                    inputProps={{ min: 0.1, step: 0.1 }}
                                    size="small"
                                    sx={{
                                      width: 80,
                                      "& .MuiOutlinedInput-root": { borderRadius: 2 },
                                    }}
                                    disabled={!canModify}
                                  />
                                </Box>
                              </Box>
                            </Paper>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>

                    {/* Aggregated Ingredients */}
                    <Card
                      elevation={0}
                      sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 3 }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 3 }}
                        >
                          <KitchenIcon color="primary" />
                          Ingrédients Agrégés ({aggregateIngredients().length})
                        </Typography>

                        <Box sx={{ maxHeight: 300, overflow: "auto" }}>
                          <Stack spacing={1}>
                            {aggregateIngredients().map((item, index) => (
                              <Box
                                key={index}
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  py: 1.5,
                                  px: 2,
                                  borderRadius: 2,
                                  background: index % 2 === 0 ? alpha(theme.palette.primary.main, 0.02) : "transparent",
                                }}
                              >
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {item.ingredientName}
                                </Typography>
                                <Chip
                                  label={`${item.quantity} ${item.unit}`}
                                  size="small"
                                  sx={{
                                    backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                                    color: theme.palette.secondary.main,
                                    fontWeight: 600,
                                  }}
                                />
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      </CardContent>
                    </Card>

                    {/* Aggregated Instructions */}
                    <Card
                      elevation={0}
                      sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 3 }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 3 }}
                        >
                          <MenuBookIcon color="primary" />
                          Instructions Agrégées
                        </Typography>

                        <Paper
                          elevation={0}
                          sx={{
                            p: 3,
                            maxHeight: 400,
                            overflow: "auto",
                            background: alpha(theme.palette.background.default, 0.5),
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            borderRadius: 2,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.6,
                              fontFamily: "monospace",
                            }}
                          >
                            {aggregateInstructions()}
                          </Typography>
                        </Paper>
                      </CardContent>
                    </Card>
                  </Stack>
                </Grid>
              </Grid>

              {/* Submit Button */}
              <Divider sx={{ my: 4 }} />
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/recipes")}
                  sx={{ borderRadius: 3, px: 4, py: 1.5 }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={saving || !canModify}
                  sx={{
                    borderRadius: 3,
                    px: 5,
                    py: 1.5,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
                    "&:hover": {
                      boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.4)}`,
                    },
                  }}
                >
                  {saving ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <CircularProgress size={20} color="inherit" />
                      Création en cours...
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <MergeIcon />
                      Créer la Recette Agrégée
                    </Box>
                  )}
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}
