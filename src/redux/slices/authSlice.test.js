import authReducer, { handleAuthStateChange, logoutUser, initialState } from './authSlice';
import { configureStore } from '@reduxjs/toolkit';
import { auth } from '../../firebaseConfig'; // Pour simuler signOut
import { signOut } from 'firebase/auth';

// Simuler firebase/auth et firebase/firestore
jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'), // importer les fonctions réelles
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  doc: jest.fn(),
  getDoc: jest.fn(),
  // onSnapshot: jest.fn(), // Si onSnapshot est utilisé directement dans les thunks et doit être mocké
}));


describe('auth slice', () => {
  it('should return the initial state', () => {
    expect(authReducer(undefined, { type: undefined })).toEqual(initialState);
  });

  describe('logoutUser thunk', () => {
    let store;

    beforeEach(() => {
      store = configureStore({ reducer: { auth: authReducer } });
      signOut.mockClear(); // Effacer les mocks avant chaque test
    });

    it('should handle successful logout', async () => {
      signOut.mockResolvedValueOnce(); // Simuler une déconnexion réussie

      await store.dispatch(logoutUser());

      const state = store.getState().auth;
      expect(state.currentUser).toBeNull();
      expect(state.userData).toBeNull();
      expect(state.loading).toBe(false); // ou userLoading selon la logique du slice
      expect(state.error).toBeNull();
      expect(signOut).toHaveBeenCalledWith(auth); // Vérifier que signOut de Firebase a été appelé
    });

    it('should handle failed logout', async () => {
      const mockError = { message: 'Logout failed' };
      signOut.mockRejectedValueOnce(mockError); // Simuler une erreur de déconnexion

      await store.dispatch(logoutUser());

      const state = store.getState().auth;
      expect(state.error).toEqual(mockError.message);
      expect(state.currentUser).not.toBeNull(); // Ou vérifier qu'il reste à l'état précédent si c'est la logique
    });
  });

  // TODO: Ajouter des tests pour handleAuthStateChange
  // Cela nécessitera de simuler plus en détail onAuthStateChanged et getDoc.
  // Exemple pour un utilisateur connecté :
  // 1. Mock onAuthStateChanged pour appeler son callback avec un objet utilisateur simulé.
  // 2. Mock getDoc pour retourner des snapshots simulés (vendor, user, ou aucun).
  // 3. Dispatch handleAuthStateChange.
  // 4. Vérifier que state.currentUser et state.userData sont corrects.
  // 5. Vérifier que loading est false.

  // Exemple pour un utilisateur déconnecté :
  // 1. Mock onAuthStateChanged pour appeler son callback avec null.
  // 2. Dispatch handleAuthStateChange.
  // 3. Vérifier que state.currentUser et state.userData sont null.
  // 4. Vérifier que loading est false.
});
