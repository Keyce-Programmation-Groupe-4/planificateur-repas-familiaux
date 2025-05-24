// src/pages/RecipeDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
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
  DialogTitle
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RestaurantIcon from '@mui/icons-material/Restaurant'; // For servings
import LocalDiningIcon from '@mui/icons-material/LocalDining'; // For ingredients
import DescriptionIcon from '@mui/icons-material/Description'; // For instructions
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebaseConfig'; // Assuming storage is exported from firebaseConfig
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import ReactMarkdown from 'react-markdown'; // To render instructions potentially in Markdown

export default function RecipeDetailPage() {
  const { recipeId } = useParams();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!recipeId || !userData?.familyId) {
        setError('Recette non trouvée ou accès non autorisé.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const recipeDocRef = doc(db, 'recipes', recipeId);
        const docSnap = await getDoc(recipeDocRef);

        if (docSnap.exists()) {
          const fetchedRecipe = { id: docSnap.id, ...docSnap.data() };
          // Security check: Ensure the fetched recipe belongs to the user's family
          if (fetchedRecipe.familyId === userData.familyId) {
            setRecipe(fetchedRecipe);
          } else {
            setError('Accès non autorisé à cette recette.');
            setRecipe(null);
          }
        } else {
          setError('Recette non trouvée.');
          setRecipe(null);
        }
      } catch (err) {
        console.error("Error fetching recipe details:", err);
        setError('Erreur lors de la récupération de la recette.');
      } finally {
        setLoading(false);
      }
    };

    if (userData) { // Fetch only when userData is available
        fetchRecipe();
    }

  }, [recipeId, userData]); // Re-fetch if recipeId or userData changes

  const handleOpenConfirmDelete = () => {
    setConfirmDeleteDialogOpen(true);
  };

  const handleCloseConfirmDelete = () => {
    setConfirmDeleteDialogOpen(false);
  };

  const handleDeleteRecipe = async () => {
    if (!recipe) return;
    setIsDeleting(true);
    setError('');
    try {
      // 1. Delete Firestore document
      await deleteDoc(doc(db, 'recipes', recipe.id));

      // 2. Delete associated photo from Storage (if exists)
      if (recipe.photoUrl) {
        try {
          // Assuming photoUrl is the download URL, we need to derive the storage path
          // This is a common pattern, adjust if your storage path is different
          const photoPath = `recipes/${recipe.familyId}/${recipe.id}/photo.jpg`; // Adjust extension if needed
          const photoRef = ref(storage, photoPath);
          await deleteObject(photoRef);
          console.log("Recipe photo deleted from Storage.");
        } catch (storageError) {
          // Log error but continue, maybe the file didn't exist or permissions changed
          console.warn("Could not delete recipe photo from Storage:", storageError);
        }
      }

      // 3. Navigate back to recipes list
      navigate('/recipes');

    } catch (err) {
      console.error("Error deleting recipe:", err);
      setError('Erreur lors de la suppression de la recette.');
      setIsDeleting(false);
      handleCloseConfirmDelete();
    }
    // No finally block for setIsDeleting, as we navigate away on success
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  if (error) {
    return (
        <Container maxWidth="md">
            <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/recipes')} sx={{ mt: 2 }}>
                Retour à la liste
            </Button>
        </Container>
    );
  }

  if (!recipe) {
    // Should be covered by error state, but as a fallback
    return (
        <Container maxWidth="md">
            <Typography sx={{ mt: 3 }}>Recette introuvable.</Typography>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/recipes')} sx={{ mt: 2 }}>
                Retour à la liste
            </Button>
        </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Paper sx={{ padding: { xs: 2, md: 4 }, marginTop: 4 }}>
        {/* Back Button */} 
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/recipes')} sx={{ mb: 2 }}>
          Retour à la liste
        </Button>

        {/* Header with Title and Actions */} 
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ flexGrow: 1, mr: 2 }}>
            {recipe.name}
          </Typography>
          <Box>
            <IconButton aria-label="modifier" component={RouterLink} to={`/recipes/${recipe.id}/edit`} color="primary">
              <EditIcon />
            </IconButton>
            <IconButton aria-label="supprimer" onClick={handleOpenConfirmDelete} color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Image and Quick Info */} 
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={5}>
            <Box
              component="img"
              sx={{
                width: '100%',
                maxHeight: 300,
                objectFit: 'cover',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}
              alt={recipe.name}
              src={recipe.photoUrl || '/placeholder-image.jpg'}
            />
          </Grid>
          <Grid item xs={12} md={7}>
            {recipe.description && (
              <Typography variant="body1" paragraph sx={{ fontStyle: 'italic' }}>
                {recipe.description}
              </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTimeIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Préparation: {recipe.prepTime || '?'} min | Cuisson: {recipe.cookTime || '?'} min
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <RestaurantIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Portions: {recipe.servings || '?'} personnes
              </Typography>
            </Box>
            {recipe.tags && recipe.tags.length > 0 && (
              <Box>
                {recipe.tags.map((tag, index) => (
                  <Chip label={tag} key={index} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                ))}
              </Box>
            )}
          </Grid>
        </Grid>

        {/* Ingredients */} 
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <LocalDiningIcon sx={{ mr: 1 }} /> Ingrédients
          </Typography>
          <List dense>
            {recipe.ingredientsList?.map((item, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={`${item.quantity} ${item.unit}`}
                  secondary={item.ingredientName}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Instructions */} 
        <Box>
          <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <DescriptionIcon sx={{ mr: 1 }} /> Instructions
          </Typography>
          {/* Use ReactMarkdown if instructions can contain Markdown formatting */} 
          <Box sx={{ pl: 2, '& p': { mb: 1.5 }, '& ol': { pl: 3 }, '& ul': { pl: 3 } }}>
             <ReactMarkdown>{recipe.instructions || 'Aucune instruction fournie.'}</ReactMarkdown>
          </Box>
          {/* <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {recipe.instructions || 'Aucune instruction fournie.'}
          </Typography> */} 
        </Box>
      </Paper>

      {/* Delete Confirmation Dialog */} 
      <Dialog
        open={confirmDeleteDialogOpen}
        onClose={handleCloseConfirmDelete}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirmer la suppression
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Êtes-vous sûr de vouloir supprimer définitivement la recette "{recipe?.name}" ? Cette action est irréversible.
          </DialogContentText>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDelete} disabled={isDeleting}>Annuler</Button>
          <Button onClick={handleDeleteRecipe} color="error" autoFocus disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={24} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

