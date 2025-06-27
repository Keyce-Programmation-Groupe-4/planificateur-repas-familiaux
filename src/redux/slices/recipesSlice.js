import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../../firebaseConfig'; // Ajuster le chemin
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { parseRecipesFromCSV } from '../../utils/csvUtils'; // Ajuster le chemin

// Thunk pour récupérer les recettes familiales et publiques
export const fetchRecipes = createAsyncThunk(
  'recipes/fetchRecipes',
  async (familyId, { rejectWithValue }) => {
    if (!familyId) {
      return rejectWithValue('Family ID is required to fetch recipes.');
    }
    try {
      const recipesRef = collection(db, 'recipes');
      const familyQuery = query(
        recipesRef,
        where('familyId', '==', familyId),
        orderBy('createdAt', 'desc')
      );
      const publicQuery = query(
        recipesRef,
        where('visibility', '==', 'public'),
        orderBy('createdAt', 'desc')
      );

      const [familySnapshot, publicSnapshot] = await Promise.all([
        getDocs(familyQuery),
        getDocs(publicQuery),
      ]);

      const familyRecipes = familySnapshot.docs.map((d) => ({ id: d.id, ...d.data(), likes: d.data().likes || [] }));
      const publicRecipes = publicSnapshot.docs.map((d) => ({ id: d.id, ...d.data(), likes: d.data().likes || [] }));

      return { familyRecipes, publicRecipes };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Thunk pour liker/unliker une recette
export const likeRecipe = createAsyncThunk(
  'recipes/likeRecipe',
  async ({ recipeId, currentLikes, userId }, { rejectWithValue }) => {
    if (!userId) {
      return rejectWithValue('User ID is required to like a recipe.');
    }
    try {
      const recipeRef = doc(db, 'recipes', recipeId);
      const isLiked = currentLikes.includes(userId);
      const updatedLikes = isLiked
        ? currentLikes.filter((uid) => uid !== userId)
        : [...currentLikes, userId];

      await updateDoc(recipeRef, { likes: updatedLikes });
      return { recipeId, likes: updatedLikes };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Thunk pour importer des recettes depuis un CSV
export const importRecipesCSV = createAsyncThunk(
  'recipes/importRecipesCSV',
  async ({ file, familyId, userId }, { rejectWithValue }) => {
    if (!file || !familyId || !userId) {
      return rejectWithValue('File, Family ID, and User ID are required for import.');
    }
    try {
      const recipesToImport = await parseRecipesFromCSV(file);
      if (recipesToImport.length === 0) {
        return rejectWithValue('No valid recipes found in the CSV file.');
      }

      const batch = writeBatch(db);
      const recipesRef = collection(db, 'recipes');

      recipesToImport.forEach((recipe) => {
        const newRecipeData = {
          ...recipe,
          familyId,
          createdAt: serverTimestamp(), // Utiliser serverTimestamp pour la date de création
          createdBy: userId,
          visibility: recipe.visibility || 'family', // Valeur par défaut si non spécifié
          likes: [],
        };
        const newDocRef = doc(recipesRef); // Firestore génère l'ID
        batch.set(newDocRef, newRecipeData);
      });

      await batch.commit();
      // Pour rafraîchir la liste après import, on pourrait re-fetch ou ajouter manuellement
      // Pour l'instant, on retourne le nombre de recettes importées
      return { count: recipesToImport.length };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
// Thunk pour supprimer des recettes en masse
export const bulkDeleteRecipes = createAsyncThunk(
  'recipes/bulkDeleteRecipes',
  async (recipeIds, { rejectWithValue }) => {
    if (!recipeIds || recipeIds.length === 0) {
      return rejectWithValue('No recipe IDs provided for deletion.');
    }
    try {
      const batch = writeBatch(db);
      recipeIds.forEach(recipeId => {
        const recipeRef = doc(db, 'recipes', recipeId);
        batch.delete(recipeRef);
      });
      await batch.commit();
      return recipeIds; // Retourne les IDs des recettes supprimées pour mise à jour de l'état
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);


const initialState = {
  familyRecipes: [],
  publicRecipes: [],
  loading: false,
  error: null,
  searchTerm: '',
  activeTab: 'family', // 'family' or 'public'
  selectedRecipes: [], // IDs des recettes sélectionnées
  importing: false,
  importError: null,
};

const recipesSlice = createSlice({
  name: 'recipes',
  initialState,
  reducers: {
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
      state.selectedRecipes = []; // Réinitialiser la sélection lors du changement d'onglet
    },
    toggleRecipeSelection: (state, action) => {
      const recipeId = action.payload;
      if (state.selectedRecipes.includes(recipeId)) {
        state.selectedRecipes = state.selectedRecipes.filter(id => id !== recipeId);
      } else {
        state.selectedRecipes.push(recipeId);
      }
    },
    clearSelectedRecipes: (state) => {
      state.selectedRecipes = [];
    },
    setRecipesLoading: (state, action) => {
      state.loading = action.payload;
    },
    clearRecipesError: (state) => {
      state.error = null;
    },
    clearImportError: (state) => {
      state.importError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchRecipes
      .addCase(fetchRecipes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecipes.fulfilled, (state, action) => {
        state.loading = false;
        state.familyRecipes = action.payload.familyRecipes;
        state.publicRecipes = action.payload.publicRecipes;
      })
      .addCase(fetchRecipes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // likeRecipe
      .addCase(likeRecipe.fulfilled, (state, action) => {
        const { recipeId, likes } = action.payload;
        const updateLikes = (recipe) => recipe.id === recipeId ? { ...recipe, likes } : recipe;
        state.familyRecipes = state.familyRecipes.map(updateLikes);
        state.publicRecipes = state.publicRecipes.map(updateLikes);
      })
      .addCase(likeRecipe.rejected, (state, action) => {
        // Gérer l'erreur de like si nécessaire, par exemple afficher une notification
        state.error = `Failed to update like: ${action.payload}`;
      })
      // importRecipesCSV
      .addCase(importRecipesCSV.pending, (state) => {
        state.importing = true;
        state.importError = null;
      })
      .addCase(importRecipesCSV.fulfilled, (state, action) => {
        state.importing = false;
        // Idéalement, on re-fetch les recettes ici ou on ajoute les nouvelles recettes à l'état.
        // Pour l'instant, on peut juste logger ou afficher un message de succès.
        // Le composant devra probablement dispatcher fetchRecipes après un import réussi.
        console.log(`${action.payload.count} recipes imported. Consider re-fetching.`);
      })
      .addCase(importRecipesCSV.rejected, (state, action) => {
        state.importing = false;
        state.importError = action.payload;
      })
      // bulkDeleteRecipes
      .addCase(bulkDeleteRecipes.pending, (state) => {
        state.loading = true; // Ou un autre indicateur de chargement pour la suppression
      })
      .addCase(bulkDeleteRecipes.fulfilled, (state, action) => {
        const deletedIds = action.payload;
        state.familyRecipes = state.familyRecipes.filter(r => !deletedIds.includes(r.id));
        state.publicRecipes = state.publicRecipes.filter(r => !deletedIds.includes(r.id));
        state.selectedRecipes = state.selectedRecipes.filter(id => !deletedIds.includes(id));
        state.loading = false;
      })
      .addCase(bulkDeleteRecipes.rejected, (state, action) => {
        state.loading = false;
        state.error = `Failed to delete recipes: ${action.payload}`;
      });
  },
});

export const {
  setSearchTerm,
  setActiveTab,
  toggleRecipeSelection,
  clearSelectedRecipes,
  setRecipesLoading,
  clearRecipesError,
  clearImportError,
} = recipesSlice.actions;

export default recipesSlice.reducer;
