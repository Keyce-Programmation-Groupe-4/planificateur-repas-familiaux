// src/pages/RecipesListPage.jsx
import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Skeleton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function RecipesListPage() {
  const { currentUser, userData } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRecipes = async () => {
      if (!userData?.familyId) {
        //setError('Vous devez faire partie d\une famille pour voir les recettes.');
        setLoading(false);
        setRecipes([]); // Ensure recipes are empty if no familyId
        return;
      }

      setLoading(true);
      setError('');
      try {
        const recipesRef = collection(db, 'recipes');
        const q = query(recipesRef,
                        where('familyId', '==', userData.familyId),
                        orderBy('createdAt', 'desc')); // Order by creation date, newest first

        const querySnapshot = await getDocs(q);
        const fetchedRecipes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecipes(fetchedRecipes);

      } catch (err) {
        console.error("Error fetching recipes:", err);
        setError('Erreur lors de la récupération des recettes.');
      } finally {
        setLoading(false);
      }
    };

    if (userData) { // Fetch only when userData is available
        fetchRecipes();
    }

  }, [userData]); // Re-fetch if userData changes (e.g., user joins/creates family)

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Mes Recettes
      </Typography>

      {/* Display message if user has no family */} 
      {!loading && !userData?.familyId && (
          <Alert severity="info">Vous devez faire partie d'une famille pour pouvoir créer et voir des recettes.</Alert>
      )}

      {/* Search Bar - Only show if user has a family */} 
      {userData?.familyId && (
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Rechercher une recette..."
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        // --- Loading Skeletons --- 
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <Skeleton variant="rectangular" height={140} />
                <CardContent>
                  <Skeleton variant="text" sx={{ fontSize: '1.25rem' }} />
                  <Skeleton variant="text" />
                </CardContent>
                <CardActions>
                  <Skeleton variant="rounded" width={80} height={30} sx={{ mr: 1 }} />
                  <Skeleton variant="rounded" width={80} height={30} />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        // --- Recipe Grid --- 
        <Grid container spacing={3}>
          {filteredRecipes.length > 0 ? (
            filteredRecipes.map((recipe) => (
              <Grid item xs={12} sm={6} md={4} key={recipe.id}>
                <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <CardMedia
                    component="img"
                    height="140"
                    image={recipe.photoUrl || '/placeholder-image.jpg'} // Use a placeholder if no photo
                    alt={recipe.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="div">
                      {recipe.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {/* Display tags or short description here if available */}
                      {recipe.tags?.join(', ') || recipe.description?.substring(0, 100) + (recipe.description?.length > 100 ? '...' : '')}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    {/* TODO: Update links when detail/edit pages are created */}
                    <Button size="small" component={RouterLink} to={`/recipes/${recipe.id}`}>Voir Détails</Button>
                    <Button size="small" component={RouterLink} to={`/recipes/${recipe.id}/edit`}>Modifier</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          ) : (
            // --- Message when no recipes found --- 
            <Grid item xs={12}>
              {userData?.familyId && (
                  <Typography sx={{ textAlign: 'center', mt: 4 }}>
                    {searchTerm ? 'Aucune recette trouvée correspondant à votre recherche.' : 'Aucune recette ajoutée pour le moment. Cliquez sur le bouton + pour en créer une !'}
                  </Typography>
              )}
            </Grid>
          )}
        </Grid>
      )}

      {/* Floating Action Button - Only show if user has a family */} 
      {userData?.familyId && (
          <Fab
            color="primary"
            aria-label="add recipe"
            sx={{
              position: 'fixed',
              bottom: 32,
              right: 32,
            }}
            component={RouterLink}
            to="/recipes/new" // Link to the recipe creation page
          >
            <AddIcon />
          </Fab>
      )}

    </Container>
  );
}

// src/pages/RecipesListPage.jsx