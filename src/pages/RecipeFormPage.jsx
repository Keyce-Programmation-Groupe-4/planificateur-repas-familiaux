// src/pages/RecipeFormPage.jsx
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
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
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

// Default units - could be fetched or configured elsewhere
const commonUnits = ['g', 'kg', 'ml', 'L', 'c. à soupe', 'c. à café', 'pincée', 'pièce(s)', 'tranche(s)', 'verre(s)'];
const ingredientCategories = ['Fruits', 'Légumes', 'Viandes', 'Poissons', 'Produits laitiers', 'Épicerie Salée', 'Épicerie Sucrée', 'Boulangerie', 'Boissons', 'Surgelés', 'Autre'];

export default function RecipeFormPage() {
  const { recipeId } = useParams(); // Will be undefined for '/new'
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  const isEditMode = Boolean(recipeId);

  // Form State
  const [recipeName, setRecipeName] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [tags, setTags] = useState([]);
  const [instructions, setInstructions] = useState('');
  const [ingredientsList, setIngredientsList] = useState([]); // [{ ingredientId, ingredientName, quantity, unit }, ...]
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);

  // Ingredient Management State
  const [allIngredients, setAllIngredients] = useState([]); // For Autocomplete [{ id, name, ... }, ...]
  const [selectedIngredient, setSelectedIngredient] = useState(null); // From Autocomplete
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState(commonUnits[0]); // Default unit
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // New Ingredient Dialog State
  const [newIngredientDialogOpen, setNewIngredientDialogOpen] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientUnit, setNewIngredientUnit] = useState(commonUnits[0]);
  const [newIngredientCategory, setNewIngredientCategory] = useState(ingredientCategories[0]);
  const [savingNewIngredient, setSavingNewIngredient] = useState(false);

  // General State
  const [loading, setLoading] = useState(isEditMode); // Load existing data if editing
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- Fetch existing ingredients for Autocomplete --- 
  const fetchAllIngredients = useCallback(async () => {
    setLoadingIngredients(true);
    try {
      const ingredientsRef = collection(db, 'ingredients');
      const q = query(ingredientsRef); // Could add orderBy('name') later
      const querySnapshot = await getDocs(q);
      const fetchedIngredients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllIngredients(fetchedIngredients);
    } catch (err) {
      console.error("Error fetching all ingredients:", err);
      setError('Erreur lors du chargement des ingrédients existants.');
    } finally {
      setLoadingIngredients(false);
    }
  }, []);

  // --- Fetch existing recipe data if in Edit Mode --- 
  useEffect(() => {
    const fetchRecipeData = async () => {
      if (!isEditMode || !userData?.familyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
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
          setError('Recette non trouvée ou accès non autorisé.');
          navigate('/recipes'); // Redirect if not found or not authorized
        }
      } catch (err) {
        console.error("Error fetching recipe for edit:", err);
        setError('Erreur lors du chargement de la recette.');
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode && userData) {
      fetchRecipeData();
    }
    // Fetch all ingredients regardless of mode
    fetchAllIngredients();

  }, [isEditMode, recipeId, userData, navigate, fetchAllIngredients]);

  // --- Ingredient List Management --- 

  const handleAddIngredientToList = () => {
    if (!selectedIngredient || !ingredientQuantity || !ingredientUnit) {
      setError('Veuillez sélectionner un ingrédient et spécifier une quantité et une unité.');
      return;
    }
    // Check if ingredient is already in the list
    if (ingredientsList.some(item => item.ingredientId === selectedIngredient.id)) {
        setError('Cet ingrédient est déjà dans la liste.');
        return;
    }

    setIngredientsList(prevList => [
      ...prevList,
      {
        ingredientId: selectedIngredient.id,
        ingredientName: selectedIngredient.name, // Store name for display
        quantity: parseFloat(ingredientQuantity), // Ensure number
        unit: ingredientUnit,
      },
    ]);
    // Reset fields
    setSelectedIngredient(null);
    setIngredientQuantity('');
    setIngredientUnit(commonUnits[0]);
    setError(''); // Clear error
  };

  const handleRemoveIngredientFromList = (ingredientIdToRemove) => {
    setIngredientsList(prevList => prevList.filter(item => item.ingredientId !== ingredientIdToRemove));
  };

  // --- New Ingredient Dialog --- 

  const handleOpenNewIngredientDialog = () => {
    setNewIngredientDialogOpen(true);
  };

  const handleCloseNewIngredientDialog = () => {
    setNewIngredientDialogOpen(false);
    setNewIngredientName('');
    setNewIngredientUnit(commonUnits[0]);
    setNewIngredientCategory(ingredientCategories[0]);
    setError(''); // Clear potential dialog errors
  };

  const handleSaveNewIngredient = async () => {
    if (!newIngredientName.trim()) {
      setError('Le nom du nouvel ingrédient est requis.');
      return;
    }
    setSavingNewIngredient(true);
    setError('');
    try {
      const ingredientsRef = collection(db, 'ingredients');
      const newIngredientData = {
        name: newIngredientName.trim(),
        standardUnit: newIngredientUnit,
        category: newIngredientCategory,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(ingredientsRef, newIngredientData);
      console.log("New ingredient added with ID: ", docRef.id);

      // Add the new ingredient to the Autocomplete list and select it
      const newIngredientForList = { id: docRef.id, ...newIngredientData };
      setAllIngredients(prev => [...prev, newIngredientForList]);
      setSelectedIngredient(newIngredientForList); // Auto-select the newly added ingredient

      handleCloseNewIngredientDialog();
    } catch (err) {
      console.error("Error saving new ingredient:", err);
      setError('Erreur lors de l\enregistrement du nouvel ingrédient.');
    } finally {
      setSavingNewIngredient(false);
    }
  };

  // --- Photo Handling --- 

  const handlePhotoChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Basic validation (optional)
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Le fichier image est trop volumineux (max 5MB).');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Veuillez sélectionner un fichier image.');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError(''); // Clear previous errors
    }
  };

  const uploadPhoto = (targetRecipeId) => {
    return new Promise((resolve, reject) => {
      if (!photoFile) {
        resolve(existingPhotoUrl); // No new photo, return existing URL or null
        return;
      }
      if (!userData?.familyId) {
          reject(new Error("User family ID not found for storage path."));
          return;
      }

      // Construct storage path
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
          setError('Erreur lors du téléversement de la photo.');
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
    if (!recipeName.trim() || !instructions.trim() || ingredientsList.length === 0) {
      setError('Le nom, les instructions et au moins un ingrédient sont requis.');
      return;
    }
    if (!userData?.familyId) {
        setError('Impossible de sauvegarder la recette sans identifiant de famille.');
        return;
    }

    setSaving(true);
    setError('');
    setUploadProgress(0);

    const recipeData = {
      name: recipeName.trim(),
      description: description.trim(),
      prepTime: parseInt(prepTime) || 0,
      cookTime: parseInt(cookTime) || 0,
      servings: parseInt(servings) || 0,
      tags: tags,
      instructions: instructions.trim(),
      ingredientsList: ingredientsList,
      familyId: userData.familyId,
      // Timestamps and creator handled below
    };

    try {
      let finalRecipeId = recipeId;
      let finalPhotoUrl = existingPhotoUrl;

      if (isEditMode) {
        // --- Update Existing Recipe --- 
        const recipeDocRef = doc(db, 'recipes', recipeId);
        recipeData.updatedAt = serverTimestamp();
        recipeData.updatedBy = currentUser.uid;

        // Upload photo if a new one was selected
        if (photoFile) {
            finalPhotoUrl = await uploadPhoto(recipeId);
        }
        recipeData.photoUrl = finalPhotoUrl;

        await updateDoc(recipeDocRef, recipeData);
        console.log("Recipe updated successfully");

      } else {
        // --- Create New Recipe --- 
        recipeData.createdAt = serverTimestamp();
        recipeData.createdBy = currentUser.uid;

        const recipesRef = collection(db, 'recipes');
        const docRef = await addDoc(recipesRef, recipeData);
        finalRecipeId = docRef.id;
        console.log("Recipe created with ID: ", finalRecipeId);

        // Upload photo now that we have the ID
        if (photoFile) {
            finalPhotoUrl = await uploadPhoto(finalRecipeId);
            // Update the recipe doc with the photo URL
            await updateDoc(doc(db, 'recipes', finalRecipeId), { photoUrl: finalPhotoUrl });
        }
      }

      // Navigate to the detail page after save/update
      navigate(`/recipes/${finalRecipeId}`);

    } catch (err) {
      console.error("Error saving recipe:", err);
      setError('Erreur lors de l\enregistrement de la recette.');
      setSaving(false); // Keep form active on error
    }
    // No finally block for setSaving, as we navigate away on success
  };

  // --- Render --- 

  if (loading && isEditMode) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="md">
      <Paper sx={{ padding: { xs: 2, md: 4 }, marginTop: 4, marginBottom: 4 }}>
        {/* Back Button */} 
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(isEditMode ? `/recipes/${recipeId}` : '/recipes')} sx={{ mb: 2 }}>
          {isEditMode ? 'Retour au détail' : 'Retour à la liste'}
        </Button>

        <Typography variant="h4" component="h1" gutterBottom>
          {isEditMode ? 'Modifier la Recette' : 'Ajouter une Recette'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            {/* --- Basic Info --- */} 
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="recipeName"
                label="Nom de la recette"
                name="recipeName"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="description"
                label="Description (courte)"
                name="description"
                multiline
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="prepTime"
                label="Temps Prépa. (min)"
                name="prepTime"
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="cookTime"
                label="Temps Cuisson (min)"
                name="cookTime"
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="servings"
                label="Portions"
                name="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                id="tags-filled"
                options={[]} // Provide suggestions later if needed
                value={tags}
                onChange={(event, newValue) => {
                  setTags(newValue);
                }}
                freeSolo // Allows adding new tags not in options
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} disabled={saving} />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Tags (ex: Végétarien, Rapide)"
                    placeholder="Ajouter des tags..."
                    disabled={saving}
                  />
                )}
                disabled={saving}
              />
            </Grid>

            {/* --- Ingredients Section --- */} 
            <Grid item xs={12}>
              <Typography variant="h6" component="h2" gutterBottom>Ingrédients</Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Autocomplete
                  id="ingredient-select"
                  options={allIngredients}
                  getOptionLabel={(option) => option.name || ''}
                  value={selectedIngredient}
                  onChange={(event, newValue) => {
                    setSelectedIngredient(newValue);
                    // Optionally set default unit if ingredient has one
                    if (newValue?.standardUnit) {
                        setIngredientUnit(newValue.standardUnit);
                    }
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  loading={loadingIngredients}
                  sx={{ width: { xs: '100%', sm: 300 } }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Choisir un ingrédient"
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
                  disabled={saving}
                />
                <TextField
                  label="Qté"
                  type="number"
                  value={ingredientQuantity}
                  onChange={(e) => setIngredientQuantity(e.target.value)}
                  sx={{ width: 80 }}
                  disabled={saving || !selectedIngredient}
                  inputProps={{ step: "0.1" }} // Allow decimals
                />
                <Autocomplete
                    id="unit-select"
                    freeSolo
                    options={commonUnits}
                    value={ingredientUnit}
                    onChange={(event, newValue) => {
                        setIngredientUnit(newValue || '');
                    }}
                    onInputChange={(event, newInputValue) => {
                        // Allow typing custom units
                        setIngredientUnit(newInputValue);
                    }}
                    sx={{ width: 150 }}
                    renderInput={(params) => <TextField {...params} label="Unité" />}
                    disabled={saving || !selectedIngredient}
                />
                <Button
                  variant="contained"
                  onClick={handleAddIngredientToList}
                  disabled={saving || !selectedIngredient || !ingredientQuantity}
                  sx={{ height: '56px' }} // Match TextField height
                >
                  Ajouter
                </Button>
                <Tooltip title="Ingrédient non trouvé ? Ajoutez-le !">
                    <Button
                        variant="outlined"
                        onClick={handleOpenNewIngredientDialog}
                        disabled={saving}
                        sx={{ height: '56px' }} // Match TextField height
                    >
                        <AddIcon />
                    </Button>
                </Tooltip>
              </Box>
              {/* Ingredient List */} 
              <List dense>
                {ingredientsList.map((item) => (
                  <ListItem key={item.ingredientId}>
                    <ListItemText
                      primary={`${item.quantity} ${item.unit} ${item.ingredientName}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveIngredientFromList(item.ingredientId)} disabled={saving}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Grid>

            {/* --- Instructions --- */} 
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="instructions"
                label="Instructions"
                name="instructions"
                multiline
                rows={10}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                disabled={saving}
                placeholder="Entrez les étapes de la recette ici. Vous pouvez utiliser Markdown pour la mise en forme (listes, gras...)."
              />
            </Grid>

            {/* --- Photo Upload --- */} 
            <Grid item xs={12}>
                <Typography variant="h6" component="h2" gutterBottom>Photo</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<PhotoCamera />}
                        disabled={saving}
                    >
                        Choisir une image
                        <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handlePhotoChange}
                        />
                    </Button>
                    {photoPreview && (
                        <Box
                            component="img"
                            sx={{ height: 80, width: 80, objectFit: 'cover', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                            alt="Aperçu"
                            src={photoPreview}
                        />
                    )}
                </Box>
                {uploadProgress > 0 && uploadProgress < 100 && (
                    <Box sx={{ width: '100%', mt: 1 }}>
                        <CircularProgress variant="determinate" value={uploadProgress} />
                    </Box>
                )}
            </Grid>

            {/* --- Submit Button --- */} 
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={saving || loadingIngredients}
                sx={{ mt: 3, mb: 2 }}
              >
                {saving ? <CircularProgress size={24} /> : (isEditMode ? 'Mettre à jour la recette' : 'Enregistrer la recette')}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* --- New Ingredient Dialog --- */} 
      <Dialog open={newIngredientDialogOpen} onClose={handleCloseNewIngredientDialog}>
        <DialogTitle>Ajouter un Nouvel Ingrédient</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            required
            margin="dense"
            id="newIngredientName"
            label="Nom de l'ingrédient"
            type="text"
            fullWidth
            variant="standard"
            value={newIngredientName}
            onChange={(e) => setNewIngredientName(e.target.value)}
            disabled={savingNewIngredient}
          />
          <Autocomplete
              id="new-unit-select"
              freeSolo
              options={commonUnits}
              value={newIngredientUnit}
              onChange={(event, newValue) => {
                  setNewIngredientUnit(newValue || '');
              }}
              onInputChange={(event, newInputValue) => {
                  setNewIngredientUnit(newInputValue);
              }}
              sx={{ mt: 2 }}
              renderInput={(params) => <TextField {...params} label="Unité Standard" variant="standard" />}
              disabled={savingNewIngredient}
          />
          <Autocomplete
              id="new-category-select"
              options={ingredientCategories}
              value={newIngredientCategory}
              onChange={(event, newValue) => {
                  setNewIngredientCategory(newValue || '');
              }}
              sx={{ mt: 2 }}
              renderInput={(params) => <TextField {...params} label="Catégorie" variant="standard" />}
              disabled={savingNewIngredient}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewIngredientDialog} disabled={savingNewIngredient}>Annuler</Button>
          <Button onClick={handleSaveNewIngredient} disabled={savingNewIngredient}>
            {savingNewIngredient ? <CircularProgress size={24} /> : 'Ajouter et Sélectionner'}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}

