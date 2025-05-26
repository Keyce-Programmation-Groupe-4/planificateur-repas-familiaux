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
  Translate as TranslateIcon, // Icon for synonyms
} from "@mui/icons-material"
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
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
  const [newIngredientSynonyms, setNewIngredientSynonyms] = useState([]) // <-- NOUVEAU : État pour les synonymes
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
        `L\'unité \'${ingredientUnit}\' n\'est pas définie pour \'${selectedIngredient.name}\'. Ajoutez-la si nécessaire.`,
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
    setNewIngredientSynonyms([]) // <-- NOUVEAU : Réinitialiser les synonymes
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
        synonyms: newIngredientSynonyms.map(s => s.trim()).filter(Boolean), // <-- NOUVEAU : Ajouter les synonymes nettoyés
        category: newIngredientCategory,
        units: newUnitsObject,
        familyId: userData?.familyId || null, // Peut être null si l'ingrédient est global ? À clarifier.
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

  // --- Autocomplete filter options --- 
  const filterOptions = (options, { inputValue }) => {
    const lowerCaseInput = inputValue.toLowerCase().trim();
    if (!lowerCaseInput) {
      return options; // Show all if no input
    }
    return options.filter(option => {
      const nameMatch = option.name.toLowerCase().includes(lowerCaseInput);
      const synonymMatch = option.synonyms && Array.isArray(option.synonyms) 
        ? option.synonyms.some(syn => syn.toLowerCase().includes(lowerCaseInput))
        : false;
      return nameMatch || synonymMatch;
    });
  };

  if (loading && isEditMode) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={300} sx={{ mt: 2 }} />
        <Skeleton variant="text" width="80%" height={20} sx={{ mt: 2 }} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Fade in timeout={600}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: 6,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
            <IconButton onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              {isEditMode ? "Modifier la recette" : "Créer une nouvelle recette"}
            </Typography>
          </Stack>

          {formError && (
            <Fade in>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                {formError}
              </Alert>
            </Fade>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={4}>
              {/* Left Column: Basic Info & Photo */}
              <Grid item xs={12} md={5}>
                <Stack spacing={3}>
                  <TextField
                    label="Nom de la recette"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    required
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <RestaurantIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Description courte"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={3}
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DescriptionIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Temps prép. (min)"
                        type="number"
                        value={prepTime}
                        onChange={(e) => setPrepTime(e.target.value)}
                        fullWidth
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AccessTimeIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Temps cuisson (min)"
                        type="number"
                        value={cookTime}
                        onChange={(e) => setCookTime(e.target.value)}
                        fullWidth
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AccessTimeIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </Grid>
                  <TextField
                    label="Nombre de portions"
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocalDiningIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={tags}
                    onChange={(event, newValue) => {
                      setTags(newValue)
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} sx={{ borderRadius: 2 }} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        label="Tags / Mots-clés"
                        placeholder="Ajouter des tags (ex: rapide, végétarien)"
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                      />
                    )}
                  />

                  {/* Photo Upload */}
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Photo de la recette
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<PhotoCameraIcon />}
                      sx={{ borderRadius: 3, mb: 2 }}
                    >
                      Choisir une image
                      <input type="file" hidden accept="image/*" onChange={handlePhotoChange} />
                    </Button>
                    {photoPreview && (
                      <Box
                        component="img"
                        src={photoPreview}
                        alt="Aperçu"
                        sx={{
                          display: "block",
                          width: "100%",
                          maxHeight: "300px",
                          objectFit: "cover",
                          borderRadius: 4,
                          mt: 2,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        }}
                      />
                    )}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 1, borderRadius: 1 }} />
                    )}
                  </Box>
                </Stack>
              </Grid>

              {/* Right Column: Ingredients & Instructions */}
              <Grid item xs={12} md={7}>
                <Stack spacing={3}>
                  {/* Ingredient Selection */}
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Ingrédients
                    </Typography>
                    <Grid container spacing={2} alignItems="flex-end">
                      <Grid item xs={12} sm={5}>
                        <Autocomplete
                          options={allIngredients}
                          getOptionLabel={(option) => option.name || ""}
                          value={selectedIngredient}
                          onChange={handleSelectedIngredientChange}
                          loading={loadingIngredients}
                          filterOptions={filterOptions} // <-- NOUVEAU : Utiliser le filtre personnalisé
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Choisir un ingrédient"
                              variant="outlined"
                              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {loadingIngredients ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                          renderOption={(props, option) => (
                            <li {...props}>
                              <ListItemText 
                                primary={option.name}
                                secondary={option.synonyms && option.synonyms.length > 0 ? option.synonyms.join(', ') : null}
                              />
                            </li>
                          )}
                        />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <TextField
                          label="Qté"
                          type="number"
                          value={ingredientQuantity}
                          onChange={(e) => setIngredientQuantity(e.target.value)}
                          variant="outlined"
                          fullWidth
                          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                          disabled={!selectedIngredient}
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <FormControl fullWidth variant="outlined" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }} disabled={!selectedIngredient}>
                          <InputLabel id="unit-select-label">Unité</InputLabel>
                          <Select
                            labelId="unit-select-label"
                            value={ingredientUnit}
                            onChange={(e) => setIngredientUnit(e.target.value)}
                            label="Unité"
                          >
                            {availableUnits.map((unit) => (
                              <MenuItem key={unit} value={unit}>
                                {unit}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={2} sx={{ textAlign: { xs: "right", sm: "left" } }}>
                        <IconButton
                          color="primary"
                          onClick={handleAddIngredientToList}
                          disabled={!selectedIngredient || !ingredientQuantity || !ingredientUnit}
                        >
                          <AddCircleOutlineIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                    <Button
                      size="small"
                      onClick={handleOpenNewIngredientDialog}
                      sx={{ mt: 1 }}
                    >
                      Ingrédient non trouvé ? Créer
                    </Button>
                    {selectedIngredient && (
                      <Button
                        size="small"
                        onClick={handleOpenAddNewUnitDialog}
                        sx={{ mt: 1, ml: 1 }}
                      >
                        Ajouter une unité à "{selectedIngredient.name}"
                      </Button>
                    )}
                  </Box>

                  {/* Ingredient List */}
                  {ingredientsList.length > 0 && (
                    <List dense>
                      {ingredientsList.map((item) => (
                        <ListItem
                          key={item.ingredientId}
                          secondaryAction={
                            <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveIngredientFromList(item.ingredientId)}>
                              <DeleteIcon />
                            </IconButton>
                          }
                          sx={{ borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}
                        >
                          <ListItemText primary={item.ingredientName} secondary={`${item.quantity} ${item.unit}`} />
                        </ListItem>
                      ))}
                    </List>
                  )}

                  {/* Instructions */}
                  <TextField
                    label="Instructions de préparation"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    multiline
                    rows={10}
                    required
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                  />
                </Stack>
              </Grid>
            </Grid>

            {/* Submit Button */}
            <Box sx={{ mt: 4, textAlign: "right" }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={saving || loading}
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                sx={{
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                }}
              >
                {saving ? "Sauvegarde..." : (isEditMode ? "Mettre à jour la recette" : "Ajouter la recette")}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Fade>

      {/* New Ingredient Dialog */}
      <Dialog open={newIngredientDialogOpen} onClose={handleCloseNewIngredientDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Créer un nouvel ingrédient</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              margin="dense"
              label="Nom principal de l'ingrédient"
              type="text"
              fullWidth
              value={newIngredientName}
              onChange={(e) => setNewIngredientName(e.target.value)}
              required
            />
            {/* --- NOUVEAU CHAMP SYNONYMES --- */}
            <Autocomplete
              multiple
              freeSolo
              options={[]} // Pas d'options prédéfinies, juste de la saisie libre
              value={newIngredientSynonyms}
              onChange={(event, newValue) => {
                setNewIngredientSynonyms(newValue);
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} sx={{ borderRadius: 2 }} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Autres appellations / Synonymes (optionnel)"
                  placeholder="Ex: Bissap, Foléré..."
                  InputProps={{ 
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <TranslateIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
            {/* --- FIN NOUVEAU CHAMP --- */}
            <FormControl fullWidth required>
              <InputLabel id="category-select-label">Catégorie</InputLabel>
              <Select
                labelId="category-select-label"
                value={newIngredientCategory}
                label="Catégorie"
                onChange={(e) => setNewIngredientCategory(e.target.value)}
              >
                {ingredientCategories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Première unité de mesure (ex: g, ml, pièce)"
              type="text"
              fullWidth
              value={newIngredientFirstUnit}
              onChange={(e) => setNewIngredientFirstUnit(e.target.value)}
              required
            />
            <FormControlLabel
              control={<Switch checked={newIngredientIsStandard} onChange={(e) => setNewIngredientIsStandard(e.target.checked)} />}
              label="Cette unité est l'unité standard/de référence ?"
            />
            <TextField
              margin="dense"
              label={`Prix pour 1 ${newIngredientFirstUnit || 'unité'} (optionnel, en FCFA)`}
              type="number"
              fullWidth
              value={newIngredientPrice}
              onChange={(e) => setNewIngredientPrice(e.target.value)}
              InputProps={{
                endAdornment: <InputAdornment position="end">FCFA</InputAdornment>,
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseNewIngredientDialog} disabled={savingNewIngredient}>Annuler</Button>
          <Button onClick={handleSaveNewIngredient} variant="contained" disabled={savingNewIngredient}>
            {savingNewIngredient ? <CircularProgress size={20} /> : "Sauvegarder"}
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
        />
      )}

    </Container>
  )
}

