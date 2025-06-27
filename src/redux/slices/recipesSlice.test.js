import recipesReducer, {
  fetchRecipes,
  likeRecipe,
  importRecipesCSV,
  bulkDeleteRecipes,
  setSearchTerm,
  setActiveTab,
  initialState,
} from './recipesSlice';
import { configureStore } from '@reduxjs/toolkit';
import { db } from '../../firebaseConfig'; // Pour simuler les appels Firestore
import { getDocs, updateDoc, writeBatch, collection, query, where, orderBy, doc } from 'firebase/firestore';
import { parseRecipesFromCSV } from '../../utils/csvUtils';

// Simuler les modules Firebase et utils
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(),
  })),
  doc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => ({ type: 'timestamp' })), // Simuler un timestamp
}));

jest.mock('../../utils/csvUtils', () => ({
  parseRecipesFromCSV: jest.fn(),
}));

describe('recipes slice', () => {
  it('should return the initial state', () => {
    expect(recipesReducer(undefined, { type: undefined })).toEqual(initialState);
  });

  it('should handle setSearchTerm', () => {
    const previousState = initialState;
    const newState = recipesReducer(previousState, setSearchTerm('test search'));
    expect(newState.searchTerm).toEqual('test search');
  });

  it('should handle setActiveTab', () => {
    const previousState = initialState;
    const newState = recipesReducer(previousState, setActiveTab('public'));
    expect(newState.activeTab).toEqual('public');
    expect(newState.selectedRecipes).toEqual([]); // Doit réinitialiser la sélection
  });

  describe('fetchRecipes thunk', () => {
    let store;

    beforeEach(() => {
      store = configureStore({ reducer: { recipes: recipesReducer } });
      getDocs.mockReset(); // Réinitialiser les mocks pour getDocs
    });

    it('should handle successful fetchRecipes', async () => {
      const mockFamilyRecipes = [{ id: 'fam1', name: 'Family Recipe', familyId: 'family123', likes: [] }];
      const mockPublicRecipes = [{ id: 'pub1', name: 'Public Recipe', visibility: 'public', likes: [] }];

      // Simuler deux appels à getDocs (un pour family, un pour public)
      getDocs
        .mockResolvedValueOnce({ docs: mockFamilyRecipes.map(r => ({ id: r.id, data: () => r })) }) // Family
        .mockResolvedValueOnce({ docs: mockPublicRecipes.map(r => ({ id: r.id, data: () => r })) }); // Public

      await store.dispatch(fetchRecipes('family123'));
      const state = store.getState().recipes;

      expect(state.loading).toBe(false);
      // Vérifier que les isFamilyRecipe sont bien ajoutés/préservés
      expect(state.familyRecipes[0]).toMatchObject({ id: 'fam1', isFamilyRecipe: true });
      expect(state.publicRecipes[0]).toMatchObject({ id: 'pub1', isFamilyRecipe: false });
      expect(state.error).toBeNull();
    });

    it('should handle rejected fetchRecipes', async () => {
        getDocs.mockRejectedValue(new Error('Fetch error'));
        await store.dispatch(fetchRecipes('family123'));
        const state = store.getState().recipes;
        expect(state.loading).toBe(false);
        expect(state.error).toEqual('Fetch error');
    });
  });

  // TODO: Ajouter des tests pour likeRecipe
  // 1. Simuler updateDoc avec succès et vérifier que les likes sont mis à jour dans l'état.
  // 2. Simuler updateDoc avec échec et vérifier que l'erreur est gérée.

  // TODO: Ajouter des tests pour importRecipesCSV
  // 1. Simuler parseRecipesFromCSV retournant des recettes.
  // 2. Simuler writeBatch et commit avec succès.
  // 3. Vérifier que l'état importing est géré.
  // 4. (Optionnel) Vérifier que fetchRecipes est appelé si c'est la logique.

  // TODO: Ajouter des tests pour bulkDeleteRecipes
  // 1. Simuler writeBatch et commit avec succès.
  // 2. Vérifier que les recettes sont supprimées de l'état et que selectedRecipes est vidé.
});
