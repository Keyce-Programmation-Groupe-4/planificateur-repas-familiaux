import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig'; // Ajuster le chemin si nécessaire
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

// Thunk pour gérer les changements d'état d'authentification et la récupération des données utilisateur
export const handleAuthStateChange = createAsyncThunk(
  'auth/handleAuthStateChange',
  async (_, { dispatch, rejectWithValue }) => {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (user) => {
          if (user) {
            // Utilisateur connecté
            dispatch(setUserLoading()); // Indiquer que le chargement des données utilisateur commence
            // Essayer de récupérer les données du vendeur
            const vendorDocRef = doc(db, 'vendors', user.uid);
            const vendorDocSnap = await getDoc(vendorDocRef);

            if (vendorDocSnap.exists()) {
              const vendorData = vendorDocSnap.data();
              resolve({
                currentUser: { uid: user.uid, email: user.email },
                userData: {
                  ...vendorData,
                  uid: user.uid,
                  email: user.email,
                  isVendor: true,
                  vendorId: user.uid,
                  isApproved: vendorData.isApproved === true,
                  isActive: vendorData.isActive === true,
                },
              });
            } else {
              // Si pas vendeur, essayer de récupérer les données de l'utilisateur normal
              const userDocRef = doc(db, 'users', user.uid);
              const userDocSnap = await getDoc(userDocRef);

              if (userDocSnap.exists()) {
                resolve({
                  currentUser: { uid: user.uid, email: user.email },
                  userData: {
                    ...userDocSnap.data(),
                    uid: user.uid,
                    email: user.email,
                    dietaryRestrictions: userDocSnap.data()?.dietaryRestrictions || [],
                    isVendor: false,
                  },
                });
              } else {
                // Aucun document spécifique, utiliser les informations de base de l'auth
                resolve({
                  currentUser: { uid: user.uid, email: user.email },
                  userData: { uid: user.uid, email: user.email, isVendor: false },
                });
              }
            }
          } else {
            // Utilisateur déconnecté
            resolve({ currentUser: null, userData: null });
          }
        },
        (error) => {
          // Gérer les erreurs de onAuthStateChanged
          console.error("Error in onAuthStateChanged listener:", error);
          reject(rejectWithValue(error.message)); // Utiliser rejectWithValue pour passer l'erreur au reducer
        }
      );
      // Retourner une fonction pour se désabonner du listener lors du nettoyage du thunk (si nécessaire, bien que createAsyncThunk ne gère pas cela directement)
      // Pour une gestion propre du désabonnement, cela devrait être géré en dehors du cycle de vie du thunk, par exemple au niveau du composant racine.
    });
  }
);

// Thunk pour la déconnexion
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await firebaseSignOut(auth);
      return null; // Indique une déconnexion réussie
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  currentUser: null, // { uid, email }
  userData: null,    // Données de Firestore (profil utilisateur ou vendeur)
  loading: true,     // Gère le chargement initial de l'état d'auth
  userLoading: false, // Gère le chargement des données utilisateur après connexion
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Peut être utilisé pour des mises à jour synchrones si nécessaire
    setUserLoading: (state) => {
      state.userLoading = true;
      state.loading = false; // L'état d'auth initial est terminé
    },
    clearAuthError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle Auth State Change
      .addCase(handleAuthStateChange.pending, (state) => {
        // Peut être utilisé si on veut un état de chargement global pour le listener lui-même
        // Pour l'instant, loading gère l'attente initiale, et userLoading les données utilisateur.
        state.loading = true;
      })
      .addCase(handleAuthStateChange.fulfilled, (state, action) => {
        state.currentUser = action.payload.currentUser;
        state.userData = action.payload.userData;
        state.loading = false;
        state.userLoading = false;
        state.error = null;
      })
      .addCase(handleAuthStateChange.rejected, (state, action) => {
        state.currentUser = null;
        state.userData = null;
        state.loading = false;
        state.userLoading = false;
        state.error = action.payload || 'Failed to handle auth state change';
      })
      // Logout User
      .addCase(logoutUser.pending, (state) => {
        state.userLoading = true; // Peut indiquer un processus de déconnexion
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.currentUser = null;
        state.userData = null;
        state.userLoading = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.userLoading = false;
        state.error = action.payload || 'Failed to logout';
      });
  },
});

export const { setUserLoading, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
