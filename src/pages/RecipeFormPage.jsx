"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Autocomplete,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  useTheme,
  alpha,
  Fade,
  LinearProgress,
} from "@mui/material"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  PhotoCamera as PhotoCameraIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  Restaurant as RestaurantIcon,
  AccessTime as AccessTimeIcon,
  LocalDining as LocalDiningIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material"
import { useAuth } from "../contexts/AuthContext"
import { db, storage } from "../firebaseConfig"
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, query, getDocs } from "firebase/firestore"
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import AddNewUnitDialog from "../components/ShoppingList/AddNewUnitDialog"

const ingredientCategories = [
  "Fruits",
  "Légumes",
  "Viandes",
  "Poissons",
  "Produits laitiers",
  "Épicerie Salée",
  "Épicerie Sucrée",
  "Boulangerie",
  "Boissons",
  "Surgelés",
  "Autre",
]

export default function RecipeFormPage() {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const { currentUser, userData } = useAuth()
  const theme = useTheme()

  const isEditMode = Boolean(recipeId)
  const canModify = userData?.familyRole === "Admin"

  // Redirect if user cannot modify
  useEffect(() => {
    if (userData && !canModify) {
      navigate("/recipes")
    }
  }, [userData, canModify, navigate])

  // Form State
  const [recipeName, setRecipeName] = useState("")
  const [description, setDescription] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [cookTime, setCookTime] = useState("")
  const [servings, setServings] = useState("")
  const [tags, setTags] = useState([])
  const [instructions, setInstructions] = useState("")
  const [ingredientsList, setIngredientsList] = useState([])
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null)

  // Ingredient Management State
  const [allIngredients, setAllIngredients] = useState([])
  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [ingredientQuantity, setIngredientQuantity] = useState("")
  const [ingredientUnit, setIngredientUnit] = useState("")
  const [availableUnits, setAvailableUnits] = useState([])
  const [loadingIngredients, setLoadingIngredients] = useState(false)

  // New Ingredient Dialog State
  const [newIngredientDialogOpen, setNewIngredientDialogOpen] = useState(false)
  const [newIngredientName, setNewIngredientName] = useState("")
  const [newIngredientCategory, setNewIngredientCategory] = useState(ingredientCategories[0])
  const [newIngredientFirstUnit, setNewIngredientFirstUnit] = useState("")
  const [newIngredientIsStandard, setNewIngredientIsStandard] = useState(true)
  const [newIngredientPrice, setNewIngredientPrice] = useState("")
  const [savingNewIngredient, setSavingNewIngredient] = useState(false)

  // Add New Unit Dialog State
  const [addNewUnitDialogOpen, setAddNewUnitDialogOpen] = useState(false)
  const [savingNewUnit, setSavingNewUnit] = useState(false)

  // General State
  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [formError, setFormError] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)

  // Fetch existing ingredients
  const fetchAllIngredients = useCallback(async () => {
    setLoadingIngredients(true)
    try {
      const ingredientsRef = collection(db, "ingredients")
      const q = query(ingredientsRef)
      const querySnapshot = await getDocs(q)
      const fetchedIngredients = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setAllIngredients(fetchedIngredients.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (err) {
      console.error("Error fetching all ingredients:", err)
      setFormError("Erreur lors du chargement des ingrédients existants.")
    } finally {
      setLoadingIngredients(false)
    }
  }, [])

  // Fetch existing recipe data
  useEffect(() => {
    const fetchRecipeData = async () => {
      if (!isEditMode || !userData?.familyId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setFormError("")
      try {
        const recipeDocRef = doc(db, "recipes", recipeId)
        const docSnap = await getDoc(recipeDocRef)
        if (docSnap.exists() && docSnap.data().familyId === userData.familyId) {
          const data = docSnap.data()
          setRecipeName(data.name || "")
          setDescription(data.description || "")
          setPrepTime(data.prepTime || "")
          setCookTime(data.cookTime || "")
          setServings(data.servings || "")
          setTags(data.tags || [])
          setInstructions(data.instructions || "")
          setIngredientsList(data.ingredientsList || [])
          setExistingPhotoUrl(data.photoUrl || null)
          setPhotoPreview(data.photoUrl || null)
        } else {
          setFormError("Recette non trouvée ou accès non autorisé.")
          navigate("/recipes")
        }
      } catch (err) {
        console.error("Error fetching recipe for edit:", err)
        setFormError("Erreur lors du chargement de la recette.")
      } finally {
        setLoading(false)
      }
    }

    if (isEditMode && userData) {
      fetchRecipeData()
    }
    fetchAllIngredients()
  }, [isEditMode, recipeId, userData, navigate, fetchAllIngredients])

  // Handle Ingredient Selection Change
  const handleSelectedIngredientChange = (event, newValue) => {
    setSelectedIngredient(newValue)
    setFormError("")
    if (newValue && newValue.units && typeof newValue.units === "object") {
      const units = Object.keys(newValue.units)
      setAvailableUnits(units)
      const standardUnit = units.find((u) => newValue.units[u]?.isStandard) || units[0] || ""
      setIngredientUnit(standardUnit)
    } else {
      setAvailableUnits([])
      setIngredientUnit("")
    }
  }

  // Ingredient List Management
  const handleAddIngredientToList = () => {
    setFormError("")
    if (!selectedIngredient || !ingredientQuantity || !ingredientUnit) {
      setFormError("Veuillez sélectionner un ingrédient, spécifier une quantité et une unité valide.")
      return
    }
    if (ingredientsList.some((item) => item.ingredientId === selectedIngredient.id)) {
      setFormError("Cet ingrédient est déjà dans la liste.")
      return
    }
    if (!availableUnits.includes(ingredientUnit)) {
      setFormError(
        `L'unité '${ingredientUnit}' n'est pas définie pour '${selectedIngredient.name}'. Ajoutez-la si nécessaire.`,
      )
      return
    }
    const quantityValue = Number.parseFloat(ingredientQuantity)
    if (isNaN(quantityValue) || quantityValue <= 0) {
      setFormError("La quantité doit être un nombre positif.")
      return
    }

    setIngredientsList((prevList) => [
      ...prevList,
      {
        ingredientId: selectedIngredient.id,
        ingredientName: selectedIngredient.name,
        quantity: quantityValue,
        unit: ingredientUnit,
      },
    ])
    setSelectedIngredient(null)
    setIngredientQuantity("")
    setIngredientUnit("")
    setAvailableUnits([])
  }

  const handleRemoveIngredientFromList = (ingredientIdToRemove) => {
    setIngredientsList((prevList) => prevList.filter((item) => item.ingredientId !== ingredientIdToRemove))
  }

  // New Ingredient Dialog
  const handleOpenNewIngredientDialog = () => {
    setNewIngredientDialogOpen(true)
    setNewIngredientName("")
    setNewIngredientCategory(ingredientCategories[0])
    setNewIngredientFirstUnit("")
    setNewIngredientIsStandard(true)
    setNewIngredientPrice("")
    setError("")
  }

  const handleCloseNewIngredientDialog = () => {
    setNewIngredientDialogOpen(false)
  }

  const handleSaveNewIngredient = async () => {
    setError("")
    if (!newIngredientName.trim() || !newIngredientFirstUnit.trim()) {
      setError("Le nom et la première unité sont requis.")
      return
    }
    const priceValue = newIngredientPrice ? Number.parseFloat(newIngredientPrice) : null
    if (newIngredientPrice && (isNaN(priceValue) || priceValue < 0)) {
      setError("Le prix doit être un nombre positif.")
      return
    }

    setSavingNewIngredient(true)
    try {
      const ingredientsRef = collection(db, "ingredients")
      const newUnitsObject = {
        [newIngredientFirstUnit.trim()]: {
          isStandard: newIngredientIsStandard,
          ...(priceValue !== null && {
            standardPrice: priceValue,
            priceSource: "user_input",
            lastPriceUpdate: serverTimestamp(),
          }),
        },
      }
      const newIngredientData = {
        name: newIngredientName.trim(),
        category: newIngredientCategory,
        units: newUnitsObject,
        familyId: userData?.familyId || null,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      const docRef = await addDoc(ingredientsRef, newIngredientData)
      const newIngredientForList = { id: docRef.id, ...newIngredientData }
      setAllIngredients((prev) => [...prev, newIngredientForList].sort((a, b) => a.name.localeCompare(b.name)))
      handleSelectedIngredientChange(null, newIngredientForList)
      handleCloseNewIngredientDialog()
    } catch (err) {
      console.error("Error saving new ingredient:", err)
      setError("Erreur lors de la sauvegarde.")
    } finally {
      setSavingNewIngredient(false)
    }
  }

  // Add New Unit Dialog
  const handleOpenAddNewUnitDialog = () => {
    if (!selectedIngredient) return
    setAddNewUnitDialogOpen(true)
    setError("")
  }

  const handleCloseAddNewUnitDialog = () => {
    setAddNewUnitDialogOpen(false)
  }

  const handleSaveNewUnit = async (newUnitName, newUnitData) => {
    if (!selectedIngredient) return
    setError("")
    setSavingNewUnit(true)
    try {
      const ingredientRef = doc(db, "ingredients", selectedIngredient.id)
      const updatePayload = {
        [`units.${newUnitName}`]: {
          ...newUnitData,
          ...(newUnitData.standardPrice !== undefined && { lastPriceUpdate: serverTimestamp() }),
        },
        updatedAt: serverTimestamp(),
      }

      await updateDoc(ingredientRef, updatePayload)
      console.log(`Unit '${newUnitName}' added to ingredient ${selectedIngredient.id}`)

      const updatedIngredient = JSON.parse(JSON.stringify(selectedIngredient))
      if (!updatedIngredient.units) {
        updatedIngredient.units = {}
      }
      updatedIngredient.units[newUnitName] = newUnitData

      setAllIngredients((prev) => prev.map((ing) => (ing.id === selectedIngredient.id ? updatedIngredient : ing)))
      handleSelectedIngredientChange(null, updatedIngredient)
      setIngredientUnit(newUnitName)

      handleCloseAddNewUnitDialog()
    } catch (err) {
      console.error("Error adding new unit:", err)
      setError("Erreur lors de l'ajout de l'unité.")
    } finally {
      setSavingNewUnit(false)
    }
  }

  // Photo Handling
  const handlePhotoChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        setFormError("Le fichier image est trop volumineux (max 5MB).")
        return
      }
      if (!file.type.startsWith("image/")) {
        setFormError("Veuillez sélectionner un fichier image.")
        return
      }
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
      setFormError("")
    }
  }

  const uploadPhoto = (targetRecipeId) => {
    return new Promise((resolve, reject) => {
      if (!photoFile) {
        resolve(existingPhotoUrl)
        return
      }
      if (!userData?.familyId) {
        reject(new Error("User family ID not found."))
        return
      }
      const fileExtension = photoFile.name.split(".").pop()
      const storagePath = `recipes/${userData.familyId}/${targetRecipeId}/photo.${fileExtension}`
      const storageRef = ref(storage, storagePath)
      const uploadTask = uploadBytesResumable(storageRef, photoFile)

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setUploadProgress(progress)
          console.log("Upload is " + progress + "% done")
        },
        (error) => {
          console.error("Upload failed:", error)
          setFormError("Erreur lors de l'upload de la photo.")
          reject(error)
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref)
            .then((downloadURL) => {
              console.log("File available at", downloadURL)
              resolve(downloadURL)
            })
            .catch(reject)
        },
      )
    })
  }

  // Form Submission
  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError("")
    if (!recipeName.trim() || !instructions.trim() || ingredientsList.length === 0) {
      setFormError("Le nom, les instructions et au moins un ingrédient sont requis.")
      return
    }
    if (!userData?.familyId) {
      setFormError("ID de famille manquant. Impossible de sauvegarder.")
      return
    }

    setSaving(true)
    setUploadProgress(0)

    const recipeData = {
      name: recipeName.trim(),
      description: description.trim(),
      prepTime: Number.parseInt(prepTime) || 0,
      cookTime: Number.parseInt(cookTime) || 0,
      servings: Number.parseInt(servings) || 0,
      tags: tags,
      instructions: instructions.trim(),
      ingredientsList: ingredientsList,
      familyId: userData.familyId,
    }

    try {
      let finalRecipeId = recipeId
      let finalPhotoUrl = existingPhotoUrl

      if (isEditMode) {
        const recipeDocRef = doc(db, "recipes", recipeId)
        recipeData.updatedAt = serverTimestamp()
        recipeData.updatedBy = currentUser.uid

        if (photoFile) {
          finalPhotoUrl = await uploadPhoto(recipeId)
        } else if (!photoPreview && existingPhotoUrl) {
          try {
            const photoRef = ref(storage, existingPhotoUrl)
            await deleteObject(photoRef)
            finalPhotoUrl = null
          } catch (deleteError) {
            console.warn("Could not delete previous photo:", deleteError)
          }
        }
        recipeData.photoUrl = finalPhotoUrl

        await updateDoc(recipeDocRef, recipeData)
        console.log("Recipe updated successfully")
      } else {
        recipeData.createdAt = serverTimestamp()
        recipeData.createdBy = currentUser.uid

        const recipesRef = collection(db, "recipes")
        const docRef = await addDoc(recipesRef, recipeData)
        finalRecipeId = docRef.id
        console.log("Recipe created with ID: ", finalRecipeId)

        if (photoFile) {
          finalPhotoUrl = await uploadPhoto(finalRecipeId)
          await updateDoc(doc(db, "recipes", finalRecipeId), { photoUrl: finalPhotoUrl })
          console.log("Photo URL added to new recipe")
        }
      }

      navigate(`/recipes/${finalRecipeId}`)
    } catch (err) {
      console.error("Error saving recipe:", err)
      setFormError("Une erreur est survenue lors de la sauvegarde de la recette.")
      setSaving(false)
    }
  }

  if (loading && isEditMode) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!canModify) {
    return null // Will redirect
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
              <Stack direction="row" alignItems="center" spacing={2}>
                <IconButton
                  onClick={() => navigate(-1)}
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.2),
                      transform: "scale(1.05)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Box>
                  <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                      fontWeight: 700,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {isEditMode ? "Modifier la Recette" : "Créer une Recette"}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {isEditMode
                      ? "Modifiez les détails de votre recette"
                      : "Ajoutez une nouvelle recette à votre collection"}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Box sx={{ p: 4 }}>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={4}>
                  {/* Left Column: Basic Info & Photo */}
                  <Grid item xs={12} md={5}>
                    <Stack spacing={3}>
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                          <RestaurantIcon color="primary" />
                          Informations de base
                        </Typography>
                        <Stack spacing={3}>
                          <TextField
                            label="Nom de la recette"
                            variant="outlined"
                            fullWidth
                            required
                            value={recipeName}
                            onChange={(e) => setRecipeName(e.target.value)}
                            disabled={saving}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: 3,
                              },
                            }}
                          />
                          <TextField
                            label="Description courte"
                            variant="outlined"
                            fullWidth
                            multiline
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={saving}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: 3,
                              },
                            }}
                          />
                        </Stack>
                      </Box>

                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                          <AccessTimeIcon color="primary" />
                          Temps et portions
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <TextField
                              label="Préparation (min)"
                              variant="outlined"
                              type="number"
                              fullWidth
                              value={prepTime}
                              onChange={(e) => setPrepTime(e.target.value)}
                              disabled={saving}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              label="Cuisson (min)"
                              variant="outlined"
                              type="number"
                              fullWidth
                              value={cookTime}
                              onChange={(e) => setCookTime(e.target.value)}
                              disabled={saving}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              label="Nombre de portions"
                              variant="outlined"
                              type="number"
                              fullWidth
                              value={servings}
                              onChange={(e) => setServings(e.target.value)}
                              disabled={saving}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Grid>
                        </Grid>
                      </Box>

                      <Box>
                        <Autocomplete
                          multiple
                          freeSolo
                          options={[]}
                          value={tags}
                          onChange={(event, newValue) => setTags(newValue)}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                key={index}
                                variant="outlined"
                                label={option}
                                {...getTagProps({ index })}
                                disabled={saving}
                                sx={{ borderRadius: 2 }}
                              />
                            ))
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              label="Tags (ex: Végétarien, Rapide)"
                              placeholder="Ajouter des tags"
                              disabled={saving}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: 3,
                                },
                              }}
                            />
                          )}
                        />
                      </Box>

                      {/* Photo Upload */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                          <PhotoCameraIcon color="primary" />
                          Photo de la recette
                        </Typography>
                        <Box
                          sx={{
                            width: "100%",
                            height: 200,
                            border: `2px dashed ${photoPreview ? "transparent" : alpha(theme.palette.primary.main, 0.3)}`,
                            borderRadius: 3,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mb: 2,
                            position: "relative",
                            overflow: "hidden",
                            backgroundColor: alpha(theme.palette.primary.main, 0.02),
                            transition: "all 0.3s ease",
                            "&:hover": {
                              borderColor: photoPreview ? "transparent" : theme.palette.primary.main,
                            },
                          }}
                        >
                          {photoPreview ? (
                            <img
                              src={photoPreview || "/placeholder.svg"}
                              alt="Aperçu"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <PhotoCameraIcon sx={{ fontSize: 40, color: alpha(theme.palette.primary.main, 0.5) }} />
                          )}
                        </Box>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Button
                            variant="outlined"
                            component="label"
                            disabled={saving}
                            startIcon={<PhotoCameraIcon />}
                            sx={{
                              borderRadius: 3,
                              borderColor: alpha(theme.palette.primary.main, 0.3),
                              "&:hover": {
                                borderColor: theme.palette.primary.main,
                                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                              },
                            }}
                          >
                            Choisir une photo
                            <input type="file" hidden accept="image/*" onChange={handlePhotoChange} />
                          </Button>
                          {photoPreview && (
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={() => {
                                setPhotoFile(null)
                                setPhotoPreview(null)
                              }}
                              disabled={saving}
                              sx={{ borderRadius: 3 }}
                            >
                              Supprimer
                            </Button>
                          )}
                        </Stack>
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <Box sx={{ width: "100%", mt: 2 }}>
                            <LinearProgress
                              variant="determinate"
                              value={uploadProgress}
                              sx={{
                                borderRadius: 2,
                                height: 6,
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                "& .MuiLinearProgress-bar": {
                                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                },
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    </Stack>
                  </Grid>

                  {/* Right Column: Ingredients & Instructions */}
                  <Grid item xs={12} md={7}>
                    <Stack spacing={4}>
                      {/* Ingredient Adding Section */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                          <LocalDiningIcon color="primary" />
                          Ingrédients
                        </Typography>
                        <Grid container spacing={2} alignItems="flex-end">
                          <Grid item xs={12} sm={6} md={5}>
                            <Autocomplete
                              options={allIngredients}
                              getOptionLabel={(option) => option.name || ""}
                              value={selectedIngredient}
                              onChange={handleSelectedIngredientChange}
                              isOptionEqualToValue={(option, value) => option.id === value.id}
                              loading={loadingIngredients}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Choisir un ingrédient"
                                  variant="outlined"
                                  InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                      <>
                                        {loadingIngredients ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                      </>
                                    ),
                                  }}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: 3,
                                    },
                                  }}
                                />
                              )}
                            />
                          </Grid>
                          <Grid item xs={6} sm={3} md={2}>
                            <TextField
                              label="Quantité"
                              variant="outlined"
                              type="number"
                              fullWidth
                              value={ingredientQuantity}
                              onChange={(e) => setIngredientQuantity(e.target.value)}
                              disabled={!selectedIngredient || saving}
                              inputProps={{ step: "any" }}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Grid>
                          <Grid item xs={6} sm={3} md={3}>
                            <FormControl variant="outlined" fullWidth disabled={!selectedIngredient || saving}>
                              <InputLabel>Unité</InputLabel>
                              <Select
                                value={ingredientUnit}
                                onChange={(e) => setIngredientUnit(e.target.value)}
                                label="Unité"
                                sx={{ borderRadius: 3 }}
                              >
                                {availableUnits.map((unit) => (
                                  <MenuItem key={unit} value={unit}>
                                    {unit}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={12} md={2}>
                            <Button
                              variant="contained"
                              onClick={handleAddIngredientToList}
                              disabled={!selectedIngredient || !ingredientQuantity || !ingredientUnit || saving}
                              startIcon={<AddIcon />}
                              fullWidth
                              sx={{
                                height: "56px",
                                borderRadius: 3,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                              }}
                            >
                              Ajouter
                            </Button>
                          </Grid>
                        </Grid>

                        {/* Add New Ingredient / Add New Unit Links */}
                        <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                          <Button
                            variant="text"
                            size="small"
                            onClick={handleOpenNewIngredientDialog}
                            disabled={saving}
                            startIcon={<AddCircleOutlineIcon />}
                            sx={{ textTransform: "none" }}
                          >
                            Créer un nouvel ingrédient
                          </Button>
                          {selectedIngredient && (
                            <Button
                              variant="text"
                              size="small"
                              onClick={handleOpenAddNewUnitDialog}
                              disabled={saving || !selectedIngredient}
                              startIcon={<AddCircleOutlineIcon />}
                              sx={{ textTransform: "none" }}
                            >
                              Ajouter une unité pour "{selectedIngredient.name}"
                            </Button>
                          )}
                        </Box>
                      </Box>

                      {/* Ingredient List Display */}
                      <Box>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                          Liste des ingrédients ({ingredientsList.length})
                        </Typography>
                        {ingredientsList.length === 0 ? (
                          <Box
                            sx={{
                              p: 3,
                              textAlign: "center",
                              backgroundColor: alpha(theme.palette.primary.main, 0.02),
                              borderRadius: 3,
                              border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                            }}
                          >
                            <LocalDiningIcon sx={{ fontSize: "2rem", color: theme.palette.text.disabled, mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                              Aucun ingrédient ajouté
                            </Typography>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                              borderRadius: 3,
                              overflow: "hidden",
                            }}
                          >
                            <List dense disablePadding>
                              {ingredientsList.map((item, index) => (
                                <ListItem
                                  key={item.ingredientId}
                                  divider={index < ingredientsList.length - 1}
                                  sx={{
                                    backgroundColor:
                                      index % 2 === 0 ? "transparent" : alpha(theme.palette.primary.main, 0.02),
                                  }}
                                >
                                  <ListItemText
                                    primary={item.ingredientName}
                                    secondary={`${item.quantity} ${item.unit}`}
                                    primaryTypographyProps={{ fontWeight: 500 }}
                                  />
                                  <ListItemSecondaryAction>
                                    <IconButton
                                      edge="end"
                                      aria-label="delete"
                                      onClick={() => handleRemoveIngredientFromList(item.ingredientId)}
                                      disabled={saving}
                                      sx={{
                                        color: theme.palette.error.main,
                                        "&:hover": {
                                          backgroundColor: alpha(theme.palette.error.main, 0.1),
                                        },
                                      }}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </ListItemSecondaryAction>
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}
                      </Box>

                      {/* Instructions */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                          <DescriptionIcon color="primary" />
                          Instructions de préparation
                        </Typography>
                        <TextField
                          label="Étapes de préparation détaillées"
                          variant="outlined"
                          fullWidth
                          multiline
                          rows={8}
                          required
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          disabled={saving}
                          placeholder="Décrivez étape par étape comment préparer cette recette..."
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 3,
                            },
                          }}
                        />
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>

                {/* Form Error */}
                {formError && (
                  <Fade in>
                    <Alert severity="error" sx={{ mt: 4, borderRadius: 3 }}>
                      {formError}
                    </Alert>
                  </Fade>
                )}

                {/* Form Actions */}
                <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(-1)}
                    disabled={saving}
                    sx={{
                      borderRadius: 3,
                      px: 4,
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      },
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving || loadingIngredients}
                    sx={{
                      borderRadius: 3,
                      px: 4,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    {saving ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : isEditMode ? (
                      "Enregistrer les modifications"
                    ) : (
                      "Créer la recette"
                    )}
                  </Button>
                </Box>
              </form>
            </Box>
          </Paper>
        </Fade>

        {/* New Ingredient Dialog */}
        <Dialog
          open={newIngredientDialogOpen}
          onClose={handleCloseNewIngredientDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            },
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Créer un Nouvel Ingrédient
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              <TextField
                autoFocus
                label="Nom de l'ingrédient"
                fullWidth
                variant="outlined"
                value={newIngredientName}
                onChange={(e) => setNewIngredientName(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                  },
                }}
              />
              <FormControl fullWidth variant="outlined">
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={newIngredientCategory}
                  onChange={(e) => setNewIngredientCategory(e.target.value)}
                  label="Catégorie"
                  sx={{ borderRadius: 3 }}
                >
                  {ingredientCategories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Première Unité (ex: g, ml, pièce)"
                fullWidth
                variant="outlined"
                value={newIngredientFirstUnit}
                onChange={(e) => setNewIngredientFirstUnit(e.target.value)}
                helperText="Cette unité sera l'unité standard par défaut."
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                  },
                }}
              />
              <TextField
                label="Prix Optionnel (pour 1 unité)"
                fullWidth
                variant="outlined"
                type="number"
                value={newIngredientPrice}
                onChange={(e) => setNewIngredientPrice(e.target.value)}
                inputProps={{ step: "0.01" }}
                helperText="Laissez vide si inconnu."
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                  },
                }}
              />
              {error && (
                <Alert severity="error" sx={{ borderRadius: 3 }}>
                  {error}
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseNewIngredientDialog} disabled={savingNewIngredient} sx={{ borderRadius: 3 }}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveNewIngredient}
              disabled={savingNewIngredient}
              variant="contained"
              sx={{
                borderRadius: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              }}
            >
              {savingNewIngredient ? <CircularProgress size={24} color="inherit" /> : "Créer"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add New Unit Dialog */}
        {selectedIngredient && (
          <AddNewUnitDialog
            open={addNewUnitDialogOpen}
            onClose={handleCloseAddNewUnitDialog}
            onSave={handleSaveNewUnit}
            ingredientName={selectedIngredient.name}
            existingUnits={selectedIngredient.units || {}}
            isLoading={savingNewUnit}
            error={error}
          />
        )}
      </Container>
    </Box>
  )
}
