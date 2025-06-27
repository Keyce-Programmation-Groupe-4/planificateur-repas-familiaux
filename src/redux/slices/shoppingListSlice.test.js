import shoppingListReducer, {
  fetchOrGenerateShoppingList,
  generateShoppingListForWeek,
  toggleShoppingListItem,
  updateIngredientPrice,
  uncheckAllShoppingListItems,
  clearCheckedShoppingListItems,
  setShoppingListTargetWeek,
  openPriceDialog,
  closePriceDialog,
  initialState,
} from './shoppingListSlice';
import { configureStore } from '@reduxjs/toolkit';
import { db } from '../../firebaseConfig';
import { getDoc, setDoc, updateDoc, getDocs, collection, query, where, serverTimestamp, Timestamp, doc } from 'firebase/firestore';
import { getWeekId as calculateWeekIdUtil } from '../../utils/plannerUtils';

// Simuler Firebase
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn((db, path, id) => ({ path: `${path}/${id}` })),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => 'mockTimestamp'),
   Timestamp: {
    fromDate: jest.fn(date => ({
        toDate: () => date,
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: (date.getTime() % 1000) * 1e6,
    })),
  }
}));

jest.mock('../../utils/plannerUtils', () => ({
  ...jest.requireActual('../../utils/plannerUtils'), // Importer les vraies fonctions si certaines sont utilisées directement
  getWeekId: jest.fn(date => {
    const d = new Date(date);
    const year = d.getFullYear();
    const week = Math.ceil(( ( (d - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }),
}));


describe('shoppingList slice', () => {
  let store;

  beforeEach(() => {
    // Recréer le store avant chaque test pour l'isolation
    store = configureStore({
      reducer: {
        shoppingList: shoppingListReducer,
        // Simuler d'autres slices si nécessaire pour les dépendances (ex: recipes pour generateShoppingListForWeek)
        recipes: (state = { familyRecipes: [], publicRecipes: [] }) => state,
      },
    });
    // Réinitialiser les mocks
    getDoc.mockReset();
    setDoc.mockReset();
    updateDoc.mockReset();
    getDocs.mockReset();
    calculateWeekIdUtil.mockImplementation(date => { // Assurer que le mock est bien en place
        const d = new Date(date);
        const year = d.getFullYear();
        const week = Math.ceil(( ( (d - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
        return `${year}-W${String(week).padStart(2, '0')}`;
    });
  });

  it('should return the initial state', () => {
    expect(shoppingListReducer(undefined, { type: undefined })).toEqual(initialState);
  });

  it('should handle setShoppingListTargetWeek', () => {
    const newWeekId = '2023-W10';
    const action = setShoppingListTargetWeek(newWeekId);
    const newState = shoppingListReducer(initialState, action);
    expect(newState.targetWeekId).toEqual(newWeekId);
    expect(newState.shoppingListDoc).toBeNull();
    expect(newState.loading).toBe(true);
  });

  it('should handle openPriceDialog and closePriceDialog', () => {
    const dialogData = { ingredientId: 'ing1', ingredientName: 'Tomate', unit: 'kg' };
    let state = shoppingListReducer(initialState, openPriceDialog(dialogData));
    expect(state.priceDialogOpen).toBe(true);
    expect(state.priceDialogData).toEqual(dialogData);

    state = shoppingListReducer(state, closePriceDialog());
    expect(state.priceDialogOpen).toBe(false);
    expect(state.priceDialogData).toBeNull();
  });

  describe('fetchOrGenerateShoppingList thunk', () => {
    it('should fetch existing list', async () => {
      const mockListData = { weekId: '2023-W05', items: [{ name: 'Pain' }], createdAt: Timestamp.fromDate(new Date()) };
      getDoc.mockResolvedValue({ exists: () => true, data: () => mockListData });

      await store.dispatch(fetchOrGenerateShoppingList({ familyId: 'fam1', targetWeekId: '2023-W05' }));
      const state = store.getState().shoppingList;
      expect(state.loading).toBe(false);
      expect(state.shoppingListDoc.items[0].name).toEqual('Pain');
      expect(typeof state.shoppingListDoc.createdAt).toBe('string'); // Doit être ISO string
    });

    it('should indicate generation if list does not exist and generateIfNeeded is true', async () => {
      getDoc.mockResolvedValue({ exists: () => false });
      // Simuler que generateShoppingListForWeek met à jour l'état (pas besoin de mock ici car on vérifie le retour de fetchOrGenerate)
      // Pour ce test, on se concentre sur le fait que fetchOrGenerate identifie le besoin de générer.
      // Le test réel de la génération est dans generateShoppingListForWeek.

      // Simuler un état initial où generateShoppingListForWeek aurait déjà mis à jour le store
      const mockGeneratedList = { weekId: '2023-W05', items: [{name: "Item généré"}]};
      store = configureStore({
          reducer: { shoppingList: shoppingListReducer },
          preloadedState: { shoppingList: { ...initialState, shoppingListDoc: mockGeneratedList } }
      });


      const actionResult = await store.dispatch(fetchOrGenerateShoppingList({ familyId: 'fam1', targetWeekId: '2023-W05', generateIfNeeded: true }));

      expect(actionResult.payload.status).toEqual('generated');
      // L'état du store aurait été mis à jour par le dispatch interne de generateShoppingListForWeek
      // Ici, on vérifie que le thunk retourne la bonne indication.
    });
  });

  // TODO: Tests plus détaillés pour generateShoppingListForWeek (mock des recettes, stock, ingrédients)
  // TODO: Tests pour toggleShoppingListItem (avec et sans mise à jour du stock)
  // TODO: Tests pour updateIngredientPrice
  // TODO: Tests pour uncheckAllShoppingListItems et clearCheckedShoppingListItems
});
