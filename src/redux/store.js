import { configureStore } from '@reduxjs/toolkit';
// Importer les reducers ici au fur et à mesure de leur création
import authReducer from './slices/authSlice'; // Importé !
import recipesReducer from './slices/recipesSlice'; // Importé !
import plannerReducer from './slices/plannerSlice'; // Importé !
import shoppingListReducer from './slices/shoppingListSlice'; // Importé !
import notificationsReducer from './slices/notificationsSlice'; // Importé !

const store = configureStore({
  reducer: {
    auth: authReducer, // Ajouté !
    recipes: recipesReducer, // Ajouté !
    planner: plannerReducer, // Ajouté !
    shoppingList: shoppingListReducer, // Ajouté !
    notifications: notificationsReducer, // Ajouté !
    // Ajouter d'autres reducers ici
  },
  // Options de middleware supplémentaires peuvent être ajoutées ici si nécessaire
  // devTools: process.env.NODE_ENV !== 'production', // Activé par défaut en dev, désactivé en prod
});

export default store;
