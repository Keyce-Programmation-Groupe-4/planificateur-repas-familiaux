// src/pages/RecipeFormPage.jsx
// --- IMPORTS --- 
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
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
  Fab,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Link, // Use Link for adding new unit
  Divider, // Added for visual separation
  Stack // Added for layout
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; // Icon for adding unit
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebaseConfig';
import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  query,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

// Import the new dialogs
import AddNewUnitDialog from '../components/ShoppingList/AddNewUnitDialog'; // Corrected path if needed

const ingredientCategories = ['Fruits', 'Légumes', 'Viandes', 'Poissons', 'Produits laitiers', 'Épicerie Salée', 'Épicerie Sucrée', 'Boulangerie', 'Boissons', 'Surgelés', 'Autre'];

export default function RecipeFormPage() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  const isEditMode = Boolean(recipeId);

  // --- Form State --- 
  const [recipeName, setRecipeName] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [tags, setTags] = useState([]);
  const [instructions, setInstructions] = useState('');
  const [ingredientsList, setIngredientsList] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);

  // --- Ingredient Management State --- 
  const [allIngredients, setAllIngredients] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('');
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // --- New Ingredient Dialog State --- 
  const [newIngredientDialogOpen, setNewIngredientDialogOpen] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientCategory, setNewIngredientCategory] = useState(ingredientCategories[0]);
  const [newIngredientFirstUnit, setNewIngredientFirstUnit] = useState('');
  const [newIngredientIsStandard, setNewIngredientIsStandard] = useState(true);
  const [newIngredientPrice, setNewIngredientPrice] = useState('');
  const [savingNewIngredient, setSavingNewIngredient] = useState(false);

  // --- Add New Unit Dialog State --- 
  const [addNewUnitDialogOpen, setAddNewUnitDialogOpen] = useState(false);
  const [savingNewUnit, setSavingNewUnit] = useState(false);
  // No need for specific data state, selectedIngredient holds the target

  // --- General State --- 
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(''); // General error for dialogs
  const [formError, setFormError] = useState(''); // Specific error for the main form
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- Fetch existing ingredients --- 
  const fetchAllIngredients = useCallback(async () => {
    setLoadingIngredients(true);
    try {
      const ingredientsRef = collection(db, 'ingredients');
      const q = query(ingredientsRef); // Could add orderBy('name')
      const querySnapshot = await getDocs(q);
      const fetchedIngredients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllIngredients(fetchedIngredients.sort((a, b) => a.name.localeCompare(b.name))); // Sort fetched ingredients
    } catch (err) {
      console.error("Error fetching all ingredients:", err);
      setFormError('Erreur lors du chargement des ingrédients existants.');
    } finally {
      setLoadingIngredients(false);
    }
  }, []);

  // --- Fetch existing recipe data --- 
  useEffect(() => {
    const fetchRecipeData = async () => {
      if (!isEditMode || !userData?.familyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setFormError('');
      try {
        const recipeDocRef = doc(db, 'recipes', recipeId);
        const docSnap = await getDoc(recipeDocRef);
        if (docSnap.exists() && docSnap.data().familyId === userData.familyId) {
          const data = docSnap.data();
          setRecipeName(data.name || '');
          setDescription(data.description || '');
          setPrepTime(data.prepTime || '');
          setCookTime(data.cookTime || '');
          setServings(data.servings || '');
          setTags(data.tags || []);
          setInstructions(data.instructions || '');
          setIngredientsList(data.ingredientsList || []);
          setExistingPhotoUrl(data.photoUrl || null);
          setPhotoPreview(data.photoUrl || null);
        } else {
          setFormError('Recette non trouvée ou accès non autorisé.');
          navigate('/recipes');
        }
      } catch (err) {
        console.error("Error fetching recipe for edit:", err);
        setFormError('Erreur lors du chargement de la recette.');
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode && userData) {
      fetchRecipeData();
    }
    fetchAllIngredients();

  }, [isEditMode, recipeId, userData, navigate, fetchAllIngredients]);

  // --- Handle Ingredient Selection Change --- 
  const handleSelectedIngredientChange = (event, newValue) => {
    setSelectedIngredient(newValue);
    setFormError(''); // Clear form error on change
    if (newValue && newValue.units && typeof newValue.units === 'object') {
      const units = Object.keys(newValue.units);
      setAvailableUnits(units);
      // Try to find the standard unit, otherwise default to the first available or empty
      const standardUnit = units.find(u => newValue.units[u]?.isStandard) || units[0] || '';
      setIngredientUnit(standardUnit);
    } else {
      setAvailableUnits([]);
      setIngredientUnit('');
    }
  };

  // --- Ingredient List Management --- 
  const handleAddIngredientToList = () => {
    setFormError(''); // Clear previous errors
    if (!selectedIngredient || !ingredientQuantity || !ingredientUnit) {
      setFormError('Veuillez sélectionner un ingrédient, spécifier une quantité et une unité valide.');
      return;
    }
    if (ingredientsList.some(item => item.ingredientId === selectedIngredient.id)) {
        setFormError('Cet ingrédient est déjà dans la liste.');
        return;
    }
    if (!availableUnits.includes(ingredientUnit)) {
        setFormError(`L'unité '${ingredientUnit}' n'est pas définie pour '${selectedIngredient.name}'. Ajoutez-la si nécessaire.`);
        return;
    }
    const quantityValue = parseFloat(ingredientQuantity);
    if (isNaN(quantityValue) || quantityValue <= 0) {
        setFormError('La quantité doit être un nombre positif.');
        return;
    }

    setIngredientsList(prevList => [
      ...prevList,
      {
        ingredientId: selectedIngredient.id,
        ingredientName: selectedIngredient.name,
        quantity: quantityValue,
        unit: ingredientUnit,
      },
    ]);
    // Reset fields
    setSelectedIngredient(null);
    setIngredientQuantity('');
    setIngredientUnit('');
    setAvailableUnits([]);
  };

  const handleRemoveIngredientFromList = (ingredientIdToRemove) => {
    setIngredientsList(prevList => prevList.filter(item => item.ingredientId !== ingredientIdToRemove));
  };

  // --- New Ingredient Dialog --- 
  const handleOpenNewIngredientDialog = () => {
    setNewIngredientDialogOpen(true);
    setNewIngredientName('');
    setNewIngredientCategory(ingredientCategories[0]);
    setNewIngredientFirstUnit('');
    setNewIngredientIsStandard(true);
    setNewIngredientPrice('');
    setError(''); // Clear dialog-specific error
  };

  const handleCloseNewIngredientDialog = () => {
    setNewIngredientDialogOpen(false);
  };

  const handleSaveNewIngredient = async () => {
    setError(''); // Clear previous dialog errors
    if (!newIngredientName.trim() || !newIngredientFirstUnit.trim()) {
      setError('Le nom et la première unité sont requis.');
      return;
    }
    const priceValue = newIngredientPrice ? parseFloat(newIngredientPrice) : null;
    if (newIngredientPrice && (isNaN(priceValue) || priceValue < 0)) {
        setError('Le prix doit être un nombre positif.');
        return;
    }

    setSavingNewIngredient(true);
    try {
      const ingredientsRef = collection(db, 'ingredients');
      // Ensure units is always an object, even if empty initially
      const newUnitsObject = {
        [newIngredientFirstUnit.trim()]: {
          isStandard: newIngredientIsStandard,
          ...(priceValue !== null && { standardPrice: priceValue, priceSource: 'user_input', lastPriceUpdate: serverTimestamp() })
          // conversionFactor is implicitly 1 for the standard unit
        }
      };
      const newIngredientData = {
        name: newIngredientName.trim(),
        category: newIngredientCategory,
        units: newUnitsObject,
        familyId: userData?.familyId || null, // Ensure familyId is stored
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(ingredientsRef, newIngredientData);
      const newIngredientForList = { id: docRef.id, ...newIngredientData };
      // Update local state immediately
      setAllIngredients(prev => [...prev, newIngredientForList].sort((a, b) => a.name.localeCompare(b.name)));
      handleSelectedIngredientChange(null, newIngredientForList); // Auto-select
      handleCloseNewIngredientDialog();
    } catch (err) {
      console.error("Error saving new ingredient:", err);
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setSavingNewIngredient(false);
    }
  };

  // --- Add New Unit Dialog --- 
  const handleOpenAddNewUnitDialog = () => {
    if (!selectedIngredient) return; // Should not happen if button is disabled
    setAddNewUnitDialogOpen(true);
    setError(''); // Clear dialog-specific error
  };

  const handleCloseAddNewUnitDialog = () => {
    setAddNewUnitDialogOpen(false);
  };

  // Function to save the new unit to the selected ingredient
  const handleSaveNewUnit = async (newUnitName, newUnitData) => {
    if (!selectedIngredient) return;
    setError(''); // Clear previous dialog errors
    setSavingNewUnit(true);
    try {
      const ingredientRef = doc(db, 'ingredients', selectedIngredient.id);
      const updatePayload = {
        // Use dot notation to update a specific field within the map
        [`units.${newUnitName}`]: {
          ...newUnitData,
          // Add timestamp if price was included
          ...(newUnitData.standardPrice !== undefined && { lastPriceUpdate: serverTimestamp() })
        },
        'updatedAt': serverTimestamp() // Update the main doc timestamp
      };

      await updateDoc(ingredientRef, updatePayload);
      console.log(`Unit '${newUnitName}' added to ingredient ${selectedIngredient.id}`);

      // --- Update local state --- 
      // Create a deep copy to avoid mutation issues
      const updatedIngredient = JSON.parse(JSON.stringify(selectedIngredient));
      // Ensure units object exists
      if (!updatedIngredient.units) {
          updatedIngredient.units = {};
      }
      updatedIngredient.units[newUnitName] = newUnitData;

      // Update the ingredient in the main list
      setAllIngredients(prev => prev.map(ing => ing.id === selectedIngredient.id ? updatedIngredient : ing));
      // Reselect the ingredient to update available units and potentially select the new unit
      handleSelectedIngredientChange(null, updatedIngredient);
      setIngredientUnit(newUnitName); // Select the newly added unit

      handleCloseAddNewUnitDialog();
    } catch (err) {
      console.error("Error adding new unit:", err);
      setError('Erreur lors de l\'ajout de l\'unité.'); // Show error in the dialog
    } finally {
      setSavingNewUnit(false);
    }
  };

  // --- Photo Handling --- 
  const handlePhotoChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Basic validation
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setFormError('Le fichier image est trop volumineux (max 5MB).');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setFormError('Veuillez sélectionner un fichier image.');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setFormError(''); // Clear error on valid selection
    }
  };

  // Uploads photo and returns download URL
  const uploadPhoto = (targetRecipeId) => {
    return new Promise((resolve, reject) => {
      if (!photoFile) {
        resolve(existingPhotoUrl); // Return existing URL if no new file
        return;
      }
      if (!userData?.familyId) {
        reject(new Error("User family ID not found."));
        return;
      }
      const fileExtension = photoFile.name.split('.').pop();
      const storagePath = `recipes/${userData.familyId}/${targetRecipeId}/photo.${fileExtension}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, photoFile);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          console.error("Upload failed:", error);
          setFormError('Erreur lors de l\'upload de la photo.');
          reject(error);
        },
        () => {
          // Upload completed successfully, now get the download URL
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log('File available at', downloadURL);
            resolve(downloadURL);
          }).catch(reject);
        }
      );
    });
  };

  // --- Form Submission --- 
  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(''); // Clear previous errors
    if (!recipeName.trim() || !instructions.trim() || ingredientsList.length === 0) {
      setFormError('Le nom, les instructions et au moins un ingrédient sont requis.');
      return;
    }
    if (!userData?.familyId) {
        setFormError('ID de famille manquant. Impossible de sauvegarder.');
        return;
    }

    setSaving(true);
    setUploadProgress(0);

    const recipeData = {
      name: recipeName.trim(),
      description: description.trim(),
      prepTime: parseInt(prepTime) || 0,
      cookTime: parseInt(cookTime) || 0,
      servings: parseInt(servings) || 0,
      tags: tags,
      instructions: instructions.trim(),
      ingredientsList: ingredientsList, // Array of { ingredientId, ingredientName, quantity, unit }
      familyId: userData.familyId,
      // photoUrl will be added after potential upload
    };

    try {
      let finalRecipeId = recipeId;
      let finalPhotoUrl = existingPhotoUrl;

      if (isEditMode) {
        // --- Update Existing Recipe --- 
        const recipeDocRef = doc(db, 'recipes', recipeId);
        recipeData.updatedAt = serverTimestamp();
        recipeData.updatedBy = currentUser.uid;

        // Handle photo upload/update
        if (photoFile) {
          finalPhotoUrl = await uploadPhoto(recipeId);
        } else if (!photoPreview && existingPhotoUrl) {
          // If preview is cleared and there was an existing photo, delete it
          try {
            const photoRef = ref(storage, existingPhotoUrl);
            await deleteObject(photoRef);
            finalPhotoUrl = null;
          } catch (deleteError) {
            console.warn("Could not delete previous photo:", deleteError);
            // Continue saving recipe data even if photo deletion fails
          }
        }
        recipeData.photoUrl = finalPhotoUrl;

        await updateDoc(recipeDocRef, recipeData);
        console.log("Recipe updated successfully");

      } else {
        // --- Create New Recipe --- 
        recipeData.createdAt = serverTimestamp();
        recipeData.createdBy = currentUser.uid;

        const recipesRef = collection(db, 'recipes');
        // Add recipe data first (without photoUrl)
        const docRef = await addDoc(recipesRef, recipeData);
        finalRecipeId = docRef.id;
        console.log("Recipe created with ID: ", finalRecipeId);

        // Upload photo if present and update the doc with the URL
        if (photoFile) {
          finalPhotoUrl = await uploadPhoto(finalRecipeId);
          await updateDoc(doc(db, 'recipes', finalRecipeId), { photoUrl: finalPhotoUrl });
          console.log("Photo URL added to new recipe");
        }
      }

      // Navigate to the recipe detail page after successful save
      navigate(`/recipes/${finalRecipeId}`);

    } catch (err) {
      console.error("Error saving recipe:", err);
      setFormError('Une erreur est survenue lors de la sauvegarde de la recette.');
      setSaving(false); // Ensure saving state is reset on error
    }
    // No finally block for setSaving(false) because navigation happens on success
  };

  // --- Render --- 
  if (loading && isEditMode) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  // --- Start of JSX --- 
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isEditMode ? 'Modifier la Recette' : 'Ajouter une Recette'}
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={4}>
            {/* --- Left Column: Basic Info & Photo --- */} 
            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                <TextField
                  label="Nom de la recette"
                  variant="filled"
                  fullWidth
                  required
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  disabled={saving}
                />
                <TextField
                  label="Description courte"
                  variant="filled"
                  fullWidth
                  multiline
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={saving}
                />
                <Grid container spacing={2}>
                  <Grid item xs={6}><TextField label="Préparation (min)" variant="filled" type="number" fullWidth value={prepTime} onChange={(e) => setPrepTime(e.target.value)} disabled={saving} /></Grid>
                  <Grid item xs={6}><TextField label="Cuisson (min)" variant="filled" type="number" fullWidth value={cookTime} onChange={(e) => setCookTime(e.target.value)} disabled={saving} /></Grid>
                  <Grid item xs={6}><TextField label="Portions" variant="filled" type="number" fullWidth value={servings} onChange={(e) => setServings(e.target.value)} disabled={saving} /></Grid>
                </Grid>
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={tags}
                  onChange={(event, newValue) => setTags(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip variant="outlined" label={option} {...getTagProps({ index })} disabled={saving} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="filled"
                      label="Tags (ex: Végétarien, Rapide)"
                      placeholder="Ajouter des tags"
                      disabled={saving}
                    />
                  )}
                />
                {/* --- Photo Upload --- */} 
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle1" gutterBottom>Photo</Typography>
                  <Box
                    sx={{
                      width: '100%',
                      height: 200,
                      border: `2px dashed ${photoPreview ? 'transparent' : 'grey.400'}`, // Hide border if preview exists
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1,
                      position: 'relative',
                      overflow: 'hidden', // Ensure image fits
                      backgroundColor: 'grey.100'
                    }}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <PhotoCamera sx={{ fontSize: 40, color: 'grey.500' }} />
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Button variant="outlined" component="label" disabled={saving} size="small">
                      Choisir Fichier
                      <input type="file" hidden accept="image/*" onChange={handlePhotoChange} />
                    </Button>
                    {photoPreview && (
                        <Button variant="outlined" color="error" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} disabled={saving} size="small">
                            Supprimer
                        </Button>
                    )}
                  </Stack>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <Box sx={{ width: '100%', mt: 1 }}>
                      <LinearProgress variant="determinate" value={uploadProgress} />
                    </Box>
                  )}
                </Box>
              </Stack>
            </Grid>

            {/* --- Right Column: Ingredients & Instructions --- */} 
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                {/* --- Ingredient Adding Section --- */} 
                <Box>
                  <Typography variant="h6" gutterBottom>Ingrédients</Typography>
                  <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={12} sm={6} md={5}>
                      <Autocomplete
                        options={allIngredients}
                        getOptionLabel={(option) => option.name || ''}
                        value={selectedIngredient}
                        onChange={handleSelectedIngredientChange}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        loading={loadingIngredients}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Choisir un ingrédient"
                            variant="filled"
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <React.Fragment>
                                  {loadingIngredients ? <CircularProgress color="inherit" size={20} /> : null}
                                  {params.InputProps.endAdornment}
                                </React.Fragment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                      <TextField
                        label="Qté"
                        variant="filled"
                        type="number"
                        fullWidth
                        value={ingredientQuantity}
                        onChange={(e) => setIngredientQuantity(e.target.value)}
                        disabled={!selectedIngredient || saving}
                        inputProps={{ step: "any" }}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3} md={3}>
                      <FormControl variant="filled" fullWidth disabled={!selectedIngredient || saving}>
                        <InputLabel id="ingredient-unit-label">Unité</InputLabel>
                        <Select
                          labelId="ingredient-unit-label"
                          value={ingredientUnit}
                          onChange={(e) => setIngredientUnit(e.target.value)}
                          label="Unité"
                        >
                          {availableUnits.map((unit) => (
                            <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={12} md={2} sx={{ textAlign: { xs: 'right', md: 'left' } }}>
                      <Button
                        variant="contained"
                        onClick={handleAddIngredientToList}
                        disabled={!selectedIngredient || !ingredientQuantity || !ingredientUnit || saving}
                        startIcon={<AddIcon />}
                        sx={{ height: '56px' }} // Match filled textfield height
                      >
                        Ajouter
                      </Button>
                    </Grid>
                  </Grid>
                  {/* --- Add New Ingredient / Add New Unit Links --- */} 
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Link component="button" variant="body2" onClick={handleOpenNewIngredientDialog} disabled={saving}>
                      + Créer un nouvel ingrédient
                    </Link>
                    {selectedIngredient && (
                      <Link component="button" variant="body2" onClick={handleOpenAddNewUnitDialog} disabled={saving || !selectedIngredient}>
                        + Ajouter une unité pour "{selectedIngredient.name}"
                      </Link>
                    )}
                  </Box>
                </Box>

                {/* --- Ingredient List Display --- */} 
                <Box>
                  <Typography variant="subtitle1" gutterBottom>Liste des ingrédients ajoutés :</Typography>
                  {ingredientsList.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Aucun ingrédient ajouté.</Typography>
                  ) : (
                    <List dense>
                      {ingredientsList.map((item) => (
                        <ListItem key={item.ingredientId} divider>
                          <ListItemText primary={item.ingredientName} secondary={`${item.quantity} ${item.unit}`} />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveIngredientFromList(item.ingredientId)} disabled={saving}>
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>

                {/* --- Instructions --- */} 
                <Box>
                  <Typography variant="h6" gutterBottom>Instructions</Typography>
                  <TextField
                    label="Étapes de préparation"
                    variant="filled"
                    fullWidth
                    multiline
                    rows={8}
                    required
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    disabled={saving}
                  />
                </Box>
              </Stack>
            </Grid>
          </Grid>

          {/* --- Form Error and Actions --- */} 
          {formError && <Alert severity="error" sx={{ mt: 3 }}>{formError}</Alert>}

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate(-1)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" variant="contained" disabled={saving || loadingIngredients}>
              {saving ? <CircularProgress size={24} /> : (isEditMode ? 'Enregistrer Modifications' : 'Créer Recette')}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* --- New Ingredient Dialog --- */} 
      <Dialog open={newIngredientDialogOpen} onClose={handleCloseNewIngredientDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Créer un Nouvel Ingrédient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="Nom de l'ingrédient"
              fullWidth
              variant="standard"
              value={newIngredientName}
              onChange={(e) => setNewIngredientName(e.target.value)}
            />
            <FormControl fullWidth variant="standard">
              <InputLabel id="new-ingredient-category-label">Catégorie</InputLabel>
              <Select
                labelId="new-ingredient-category-label"
                value={newIngredientCategory}
                onChange={(e) => setNewIngredientCategory(e.target.value)}
                label="Catégorie"
              >
                {ingredientCategories.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Première Unité (ex: g, ml, pièce)"
              fullWidth
              variant="standard"
              value={newIngredientFirstUnit}
              onChange={(e) => setNewIngredientFirstUnit(e.target.value)}
              helperText="Cette unité sera l'unité standard par défaut."
            />
            {/* <FormControlLabel control={<Checkbox checked={newIngredientIsStandard} onChange={(e) => setNewIngredientIsStandard(e.target.checked)} />} label="Est l'unité standard" /> */}
            {/* Standard unit is always true for the first one */} 
            <TextField
              label="Prix Optionnel (pour 1 unité)"
              fullWidth
              variant="standard"
              type="number"
              value={newIngredientPrice}
              onChange={(e) => setNewIngredientPrice(e.target.value)}
              inputProps={{ step: "0.01" }}
              helperText="Laissez vide si inconnu."
            />
            {error && <Alert severity="error" variant="outlined">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewIngredientDialog} disabled={savingNewIngredient}>Annuler</Button>
          <Button onClick={handleSaveNewIngredient} disabled={savingNewIngredient}>
            {savingNewIngredient ? <CircularProgress size={24} /> : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Add New Unit Dialog --- */} 
      {selectedIngredient && (
        <AddNewUnitDialog
          open={addNewUnitDialogOpen}
          onClose={handleCloseAddNewUnitDialog}
          onSave={handleSaveNewUnit} // Pass the save handler
          ingredientName={selectedIngredient.name}
          existingUnits={selectedIngredient.units || {}} // Pass existing units
          isLoading={savingNewUnit} // Pass loading state
          error={error} // Pass error state
        />
      )}

    </Container>
  );
}

