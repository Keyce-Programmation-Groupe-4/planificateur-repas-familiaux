"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  RadioGroup, // Added
  FormControlLabel, // Added
  Radio, // Added
  FormLabel, // Added
  Tooltip, // Added
} from "@mui/material";
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
  Public as PublicIcon, // Added
  FamilyRestroom as FamilyIcon, // Added
  InfoOutlined as InfoIcon, // Added
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { db, storage } from "../firebaseConfig";
import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  query,
  getDocs,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import AddNewUnitDialog from "../components/ShoppingList/AddNewUnitDialog";
import InputAdornment from "@mui/material/InputAdornment";
import Switch from "@mui/material/Switch"
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
];

export default function RecipeFormPage() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const theme = useTheme();

  const isEditMode = Boolean(recipeId);
  // Allow modification if user is Admin (as per previous logic)
  const canModify = userData?.familyRole === "Admin"; 

  // Redirect if user cannot modify (assuming only Admins can create/edit)
  useEffect(() => {
    if (userData && !canModify && !isEditMode) { // Allow viewing if edit mode, but redirect on create
        console.warn("User is not admin, redirecting from recipe creation.");
        navigate("/recipes");
    } else if (userData && !canModify && isEditMode) {
        // In edit mode, non-admins might view but not save (handled by disabling save button)
        console.log("Non-admin viewing recipe.");
    }
  }, [userData, canModify, isEditMode, navigate]);

  // Form State
  const [recipeName, setRecipeName] = useState("");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [tags, setTags] = useState([]);
  const [instructions, setInstructions] = useState("");
  const [ingredientsList, setIngredientsList] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);
  const [visibility, setVisibility] = useState("public"); // <-- NOUVEAU: État pour la visibilité

  // Ingredient Management State
  const [allIngredients, setAllIngredients] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [ingredientQuantity, setIngredientQuantity] = useState("");
  const [ingredientUnit, setIngredientUnit] = useState("");
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // New Ingredient Dialog State
  const [newIngredientDialogOpen, setNewIngredientDialogOpen] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientSynonyms, setNewIngredientSynonyms] = useState([]);
  const [newIngredientCategory, setNewIngredientCategory] = useState(
    ingredientCategories[0]
  );
  const [newIngredientFirstUnit, setNewIngredientFirstUnit] = useState("");
  const [newIngredientIsStandard, setNewIngredientIsStandard] = useState(true);
  const [newIngredientPrice, setNewIngredientPrice] = useState("");
  const [savingNewIngredient, setSavingNewIngredient] = useState(false);

  // Add New Unit Dialog State
  const [addNewUnitDialogOpen, setAddNewUnitDialogOpen] = useState(false);
  const [savingNewUnit, setSavingNewUnit] = useState(false);

  // General State
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch existing ingredients
  const fetchAllIngredients = useCallback(async () => {
    setLoadingIngredients(true);
    try {
      const ingredientsRef = collection(db, "ingredients");
      const q = query(ingredientsRef);
      const querySnapshot = await getDocs(q);
      const fetchedIngredients = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllIngredients(
        fetchedIngredients.sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (err) {
      console.error("Error fetching all ingredients:", err);
      setFormError("Erreur lors du chargement des ingrédients existants.");
    } finally {
      setLoadingIngredients(false);
    }
  }, []);

  // Fetch existing recipe data
  useEffect(() => {
    const fetchRecipeData = async () => {
      if (!isEditMode || !userData?.familyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setFormError("");
      try {
        const recipeDocRef = doc(db, "recipes", recipeId);
        const docSnap = await getDoc(recipeDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Check if user is admin OR if the recipe belongs to their family (for viewing)
          if (canModify || data.familyId === userData.familyId) {
              setRecipeName(data.name || "");
              setDescription(data.description || "");
              setPrepTime(data.prepTime || "");
              setCookTime(data.cookTime || "");
              setServings(data.servings || "");
              setTags(data.tags || []);
              setInstructions(data.instructions || "");
              setIngredientsList(data.ingredientsList || []);
              setExistingPhotoUrl(data.photoUrl || null);
              setPhotoPreview(data.photoUrl || null);
              setVisibility(data.visibility || "public"); // <-- NOUVEAU: Charger la visibilité existante
          } else {
              setFormError("Accès non autorisé à cette recette.");
              navigate("/recipes");
          }
        } else {
          setFormError("Recette non trouvée.");
          navigate("/recipes");
        }
      } catch (err) {
        console.error("Error fetching recipe for edit:", err);
        setFormError("Erreur lors du chargement de la recette.");
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode && userData) {
      fetchRecipeData();
    }
    fetchAllIngredients();
  }, [isEditMode, recipeId, userData, navigate, fetchAllIngredients, canModify]);

  // Handle Ingredient Selection Change
  const handleSelectedIngredientChange = (event, newValue) => {
    setSelectedIngredient(newValue);
    setFormError("");
    if (newValue && newValue.units && typeof newValue.units === "object") {
      const units = Object.keys(newValue.units);
      setAvailableUnits(units);
      const standardUnit =
        units.find((u) => newValue.units[u]?.isStandard) || units[0] || "";
      setIngredientUnit(standardUnit);
    } else {
      setAvailableUnits([]);
      setIngredientUnit("");
    }
  };

  // Ingredient List Management
  const handleAddIngredientToList = () => {
    setFormError("");
    if (!selectedIngredient || !ingredientQuantity || !ingredientUnit) {
      setFormError(
        "Veuillez sélectionner un ingrédient, spécifier une quantité et une unité valide."
      );
      return;
    }
    if (
      ingredientsList.some((item) => item.ingredientId === selectedIngredient.id)
    ) {
      setFormError("Cet ingrédient est déjà dans la liste.");
      return;
    }
    if (!availableUnits.includes(ingredientUnit)) {
      setFormError(
        `L\'unité \'${ingredientUnit}\' n\'est pas définie pour \'${selectedIngredient.name}\'. Ajoutez-la si nécessaire.`
      );
      return;
    }
    const quantityValue = Number.parseFloat(ingredientQuantity);
    if (isNaN(quantityValue) || quantityValue <= 0) {
      setFormError("La quantité doit être un nombre positif.");
      return;
    }

    setIngredientsList((prevList) => [
      ...prevList,
      {
        ingredientId: selectedIngredient.id,
        ingredientName: selectedIngredient.name,
        quantity: quantityValue,
        unit: ingredientUnit,
      },
    ]);
    setSelectedIngredient(null);
    setIngredientQuantity("");
    setIngredientUnit("");
    setAvailableUnits([]);
  };

  const handleRemoveIngredientFromList = (ingredientIdToRemove) => {
    setIngredientsList((prevList) =>
      prevList.filter((item) => item.ingredientId !== ingredientIdToRemove)
    );
  };

  // New Ingredient Dialog
  const handleOpenNewIngredientDialog = () => {
    setNewIngredientDialogOpen(true);
    setNewIngredientName("");
    setNewIngredientSynonyms([]);
    setNewIngredientCategory(ingredientCategories[0]);
    setNewIngredientFirstUnit("");
    setNewIngredientIsStandard(true);
    setNewIngredientPrice("");
    setError("");
  };

  const handleCloseNewIngredientDialog = () => {
    setNewIngredientDialogOpen(false);
  };

  const handleSaveNewIngredient = async () => {
    setError("");
    if (!newIngredientName.trim() || !newIngredientFirstUnit.trim()) {
      setError("Le nom et la première unité sont requis.");
      return;
    }
    const priceValue = newIngredientPrice
      ? Number.parseFloat(newIngredientPrice)
      : null;
    if (newIngredientPrice && (isNaN(priceValue) || priceValue < 0)) {
      setError("Le prix doit être un nombre positif.");
      return;
    }

    setSavingNewIngredient(true);
    try {
      const ingredientsRef = collection(db, "ingredients");
      const newUnitsObject = {
        [newIngredientFirstUnit.trim()]: {
          isStandard: newIngredientIsStandard,
          ...(priceValue !== null && {
            standardPrice: priceValue,
            priceSource: "user_input",
            lastPriceUpdate: serverTimestamp(),
          }),
        },
      };
      const newIngredientData = {
        name: newIngredientName.trim(),
        synonyms: newIngredientSynonyms.map((s) => s.trim()).filter(Boolean),
        category: newIngredientCategory,
        units: newUnitsObject,
        familyId: userData?.familyId || null, // Keep familyId for potential future use
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(ingredientsRef, newIngredientData);
      const newIngredientForList = { id: docRef.id, ...newIngredientData };
      setAllIngredients((prev) =>
        [...prev, newIngredientForList].sort((a, b) => a.name.localeCompare(b.name))
      );
      handleSelectedIngredientChange(null, newIngredientForList);
      handleCloseNewIngredientDialog();
    } catch (err) {
      console.error("Error saving new ingredient:", err);
      setError("Erreur lors de la sauvegarde.");
    } finally {
      setSavingNewIngredient(false);
    }
  };

  // Add New Unit Dialog
  const handleOpenAddNewUnitDialog = () => {
    if (!selectedIngredient) return;
    setAddNewUnitDialogOpen(true);
    setError("");
  };

  const handleCloseAddNewUnitDialog = () => {
    setAddNewUnitDialogOpen(false);
  };

  const handleSaveNewUnit = async (newUnitName, newUnitData) => {
    if (!selectedIngredient) return;
    setError("");
    setSavingNewUnit(true);
    try {
      const ingredientRef = doc(db, "ingredients", selectedIngredient.id);
      const updatePayload = {
        [`units.${newUnitName}`]: {
          ...newUnitData,
          ...(newUnitData.standardPrice !== undefined && {
            lastPriceUpdate: serverTimestamp(),
          }),
        },
        updatedAt: serverTimestamp(),
      };

      await updateDoc(ingredientRef, updatePayload);
      console.log(
        `Unit '${newUnitName}' added to ingredient ${selectedIngredient.id}`
      );

      const updatedIngredient = JSON.parse(JSON.stringify(selectedIngredient));
      if (!updatedIngredient.units) {
        updatedIngredient.units = {};
      }
      updatedIngredient.units[newUnitName] = newUnitData;

      setAllIngredients((prev) =>
        prev.map((ing) =>
          ing.id === selectedIngredient.id ? updatedIngredient : ing
        )
      );
      handleSelectedIngredientChange(null, updatedIngredient);
      setIngredientUnit(newUnitName);

      handleCloseAddNewUnitDialog();
    } catch (err) {
      console.error("Error adding new unit:", err);
      setError("Erreur lors de l\'ajout de l\'unité.");
    } finally {
      setSavingNewUnit(false);
    }
  };

  // Photo Handling
  const handlePhotoChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setFormError("Le fichier image est trop volumineux (max 5MB).");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setFormError("Veuillez sélectionner un fichier image.");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setFormError("");
    }
  };

  const uploadPhoto = (targetRecipeId) => {
    return new Promise((resolve, reject) => {
      if (!photoFile) {
        resolve(existingPhotoUrl);
        return;
      }
      if (!userData?.familyId) {
        reject(new Error("User family ID not found."));
        return;
      }
      const fileExtension = photoFile.name.split(".").pop();
      const storagePath = `recipes/${userData.familyId}/${targetRecipeId}/photo.${fileExtension}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, photoFile);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          console.log("Upload is " + progress + "% done");
        },
        (error) => {
          console.error("Upload failed:", error);
          setFormError("Erreur lors de l\'upload de la photo.");
          reject(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref)
            .then((downloadURL) => {
              console.log("File available at", downloadURL);
              resolve(downloadURL);
            })
            .catch(reject);
        }
      );
    });
  };

  // Form Submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!recipeName.trim() || !instructions.trim() || ingredientsList.length === 0) {
      setFormError(
        "Le nom, les instructions et au moins un ingrédient sont requis."
      );
      return;
    }
    if (!userData?.familyId) {
      setFormError("ID de famille manquant. Impossible de sauvegarder.");
      return;
    }
    if (!canModify) {
        setFormError("Vous n'avez pas les droits pour modifier cette recette.");
        return;
    }

    setSaving(true);
    setUploadProgress(0);

    const recipeData = {
      name: recipeName.trim(),
      description: description.trim(),
      prepTime: Number.parseInt(prepTime) || 0,
      cookTime: Number.parseInt(cookTime) || 0,
      servings: Number.parseInt(servings) || 0,
      tags: tags,
      instructions: instructions.trim(),
      ingredientsList: ingredientsList,
      familyId: userData.familyId, // <-- NOUVEAU: Toujours enregistrer familyId
      visibility: visibility, // <-- NOUVEAU: Enregistrer la visibilité
    };

    try {
      let finalRecipeId = recipeId;
      let finalPhotoUrl = existingPhotoUrl;

      if (isEditMode) {
        const recipeDocRef = doc(db, "recipes", recipeId);
        recipeData.updatedAt = serverTimestamp();
        recipeData.updatedBy = currentUser.uid;

        if (photoFile) {
          finalPhotoUrl = await uploadPhoto(recipeId);
        } else if (!photoPreview && existingPhotoUrl) {
          try {
            const photoRef = ref(storage, existingPhotoUrl);
            await deleteObject(photoRef);
            finalPhotoUrl = null;
          } catch (deleteError) {
            console.warn("Could not delete previous photo:", deleteError);
          }
        }
        recipeData.photoUrl = finalPhotoUrl;

        await updateDoc(recipeDocRef, recipeData);
        console.log("Recipe updated successfully");
      } else {
        recipeData.createdAt = serverTimestamp();
        recipeData.createdBy = currentUser.uid;

        const recipesRef = collection(db, "recipes");
        const docRef = await addDoc(recipesRef, recipeData);
        finalRecipeId = docRef.id;
        console.log("Recipe created with ID: ", finalRecipeId);

        if (photoFile) {
          finalPhotoUrl = await uploadPhoto(finalRecipeId);
          const recipeDocRef = doc(db, "recipes", finalRecipeId);
          await updateDoc(recipeDocRef, { photoUrl: finalPhotoUrl });
        }
      }
      navigate(`/recipes/${finalRecipeId}`);
    } catch (err) {
      console.error("Error saving recipe:", err);
      setFormError("Erreur lors de la sauvegarde de la recette.");
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.background.paper,
            0.9
          )} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            {isEditMode ? "Modifier la Recette" : "Créer une Nouvelle Recette"}
          </Typography>
        </Box>

        {formError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
            {formError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={4}>
            {/* Left Column: Basic Info & Photo */}
            <Grid item xs={12} md={4}>
              <Stack spacing={3}>
                <TextField
                  label="Nom de la recette"
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
                      <InputAdornment position="start">
                        <DescriptionIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  disabled={!canModify}
                />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Préparation (min)"
                      type="number"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AccessTimeIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      disabled={!canModify}
                    />
                  </Grid>
                  <Grid item xs={6}>
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
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Nombre de portions"
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocalDiningIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  disabled={!canModify}
                />

                {/* --- NOUVEAU: Sélecteur de Visibilité --- */}
                <FormControl component="fieldset" disabled={!canModify}>
                  <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                      label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PublicIcon fontSize="inherit" /> Public</Box>}
                    />
                    <FormControlLabel
                      value="family"
                      control={<Radio size="small" />}
                      label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><FamilyIcon fontSize="inherit" /> Famille</Box>}
                      disabled={!userData?.familyId} // Disable if user has no family
                    />
                  </RadioGroup>
                </FormControl>
                {/* --- Fin Sélecteur de Visibilité --- */}

                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={tags}
                  onChange={(event, newValue) => {
                    setTags(newValue);
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        sx={{ borderRadius: 2 }}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="Tags (optionnel)"
                      placeholder="Ex: Végétarien, Rapide..."
                    />
                  )}
                  disabled={!canModify}
                />

                <Box sx={{ textAlign: "center" }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<PhotoCameraIcon />}
                    disabled={!canModify}
                  >
                    {photoPreview ? "Changer la Photo" : "Ajouter une Photo"}
                    <input type="file" hidden accept="image/*" onChange={handlePhotoChange} />
                  </Button>
                  {photoPreview && (
                    <Box sx={{ mt: 2, position: "relative" }}>
                      <img
                        src={photoPreview}
                        alt="Aperçu recette"
                        style={{ width: "100%", height: "auto", borderRadius: "8px" }}
                      />
                      {canModify && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                            setExistingPhotoUrl(null); // Ensure existing URL is cleared too
                          }}
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            backgroundColor: alpha(theme.palette.common.black, 0.5),
                            color: theme.palette.common.white,
                            "&:hover": {
                              backgroundColor: alpha(theme.palette.common.black, 0.7),
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  )}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 1 }} />
                  )}
                </Box>
              </Stack>
            </Grid>

            {/* Right Column: Ingredients & Instructions */}
            <Grid item xs={12} md={8}>
              <Stack spacing={3}>
                {/* Ingredient Input Section */}
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
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
                        renderOption={(props, option) => (
                            <li {...props} key={option.id}>
                                {option.name}
                                {option.synonyms && option.synonyms.length > 0 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                        ({option.synonyms.join(', ')})
                                    </Typography>
                                )}
                            </li>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Rechercher ou créer ingrédient"
                            variant="outlined"
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {loadingIngredients ? (
                                    <CircularProgress color="inherit" size={20} />
                                  ) : null}
                                  {params.InputProps.endAdornment}
                                </>),
                            }}
                          />
                        )}
                        noOptionsText={
                            <Button onClick={handleOpenNewIngredientDialog} size="small">
                                Créer un nouvel ingrédient
                            </Button>
                        }
                        disabled={!canModify}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        label="Quantité"
                        type="number"
                        value={ingredientQuantity}
                        onChange={(e) => setIngredientQuantity(e.target.value)}
                        fullWidth
                        disabled={!selectedIngredient || !canModify}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <FormControl fullWidth disabled={!selectedIngredient || !canModify}>
                        <InputLabel id="unit-select-label">Unité</InputLabel>
                        <Select
                          labelId="unit-select-label"
                          value={ingredientUnit}
                          label="Unité"
                          onChange={(e) => setIngredientUnit(e.target.value)}
                        >
                          {availableUnits.map((unit) => (
                            <MenuItem key={unit} value={unit}>
                              {unit}
                            </MenuItem>
                          ))}
                          {selectedIngredient && (
                            <MenuItem value="__add_new__" onClick={handleOpenAddNewUnitDialog}>
                              <AddCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                              Ajouter unité...
                            </MenuItem>
                          )}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={1} sx={{ textAlign: "right" }}>
                      <IconButton
                        color="primary"
                        onClick={handleAddIngredientToList}
                        disabled={!selectedIngredient || !canModify}
                      >
                        <AddIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Ingredient List */}
                {ingredientsList.length > 0 && (
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <List dense>
                      {ingredientsList.map((item) => (
                        <ListItem key={item.ingredientId}>
                          <ListItemText
                            primary={item.ingredientName}
                            secondary={`${item.quantity} ${item.unit}`}
                          />
                          {canModify && (
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                aria-label="delete"
                                onClick={() =>
                                  handleRemoveIngredientFromList(item.ingredientId)
                                }
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}

                {/* Instructions */}
                <TextField
                  label="Instructions de préparation"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  required
                  multiline
                  rows={10}
                  fullWidth
                  disabled={!canModify}
                />
              </Stack>
            </Grid>
          </Grid>

          {/* Save Button */}
          <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={saving || loading || !canModify}
              sx={{ borderRadius: 3, px: 5, py: 1.5 }}
            >
              {saving ? (
                <CircularProgress size={24} color="inherit" />
              ) : isEditMode ? (
                "Mettre à jour la recette"
              ) : (
                "Créer la recette"
              )}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* New Ingredient Dialog */}
      <Dialog open={newIngredientDialogOpen} onClose={handleCloseNewIngredientDialog}>
        <DialogTitle>Créer un Nouvel Ingrédient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              margin="dense"
              label="Nom principal"
              type="text"
              fullWidth
              value={newIngredientName}
              onChange={(e) => setNewIngredientName(e.target.value)}
              required
            />
            <Autocomplete
                multiple freeSolo options={[]} 
                value={newIngredientSynonyms}
                onChange={(event, newValue) => setNewIngredientSynonyms(newValue)}
                renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option} {...getTagProps({ index })} sx={{ borderRadius: 2 }} />)) }
                renderInput={(params) => (<TextField {...params} variant="outlined" label="Synonymes (optionnel)" placeholder="Ex: Bissap..." InputProps={{ ...params.InputProps, startAdornment: (<InputAdornment position="start"><TranslateIcon color="action" /></InputAdornment>), }} />) }
            />
            <FormControl fullWidth required>
              <InputLabel id="new-category-select-label">Catégorie</InputLabel>
              <Select
                labelId="new-category-select-label"
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
              label="Première Unité (ex: kg, g, L, ml, pièce)"
              type="text"
              fullWidth
              value={newIngredientFirstUnit}
              onChange={(e) => setNewIngredientFirstUnit(e.target.value)}
              required
            />
            <FormControlLabel
              control={<Switch checked={newIngredientIsStandard} onChange={(e) => setNewIngredientIsStandard(e.target.checked)} />}
              label="Cette unité est-elle l'unité standard ?"
            />
            <TextField
              margin="dense"
              label="Prix Standard pour cette unité (FCFA, optionnel)"
              type="number"
              fullWidth
              value={newIngredientPrice}
              onChange={(e) => setNewIngredientPrice(e.target.value)}
              InputProps={{ endAdornment: <InputAdornment position="end">FCFA</InputAdornment> }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewIngredientDialog} disabled={savingNewIngredient}>
            Annuler
          </Button>
          <Button onClick={handleSaveNewIngredient} disabled={savingNewIngredient}>
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
          isSaving={savingNewUnit}
        />
      )}
    </Container>
  );
}
