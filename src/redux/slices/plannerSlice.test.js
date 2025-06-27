import plannerReducer, {
  fetchWeeklyPlanAndRecipes,
  saveWeeklyPlan,
  checkAllergiesInPlan,
  notifyFamilyPlanReady,
  setCurrentWeek,
  updateRecipeInSlotLocally,
  initialState,
} from './plannerSlice';
import { configureStore } from '@reduxjs/toolkit';
import { db, functions } from '../../firebaseConfig'; // Pour simuler
import { getDoc, setDoc, getDocs, collection, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { checkAllergies as checkAllergiesUtil } from '../../utils/allergyUtils';
import { getStartOfWeek as getStartOfWeekUtil, getWeekId as calculateWeekIdUtil } from '../../utils/plannerUtils';

// Simuler les modules Firebase et utils
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn((db, path, id) => ({ path: `${path}/${id}` })), // Simuler doc pour retourner un chemin simple
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => ({ type: 'timestamp' })),
  Timestamp: {
    fromDate: jest.fn(date => ({
        toDate: () => date,
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: (date.getTime() % 1000) * 1e6,
    })),
  }
}));

jest.mock('firebase/functions', () => ({
  ...jest.requireActual('firebase/functions'),
  httpsCallable: jest.fn(),
}));

jest.mock('../../utils/allergyUtils', () => ({
  checkAllergies: jest.fn(),
}));

jest.mock('../../utils/plannerUtils', () => ({
    getStartOfWeek: jest.fn(date => { // simple mock, might need to be more robust
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
        d.setHours(0,0,0,0);
        return d;
    }),
    getWeekId: jest.fn(date => { // simple mock
        const d = new Date(date);
        const year = d.getFullYear();
        const week = Math.ceil(( ( (d - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
        return `${year}-W${String(week).padStart(2, '0')}`;
    }),
}));


describe('planner slice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        planner: plannerReducer,
        // Supposons que recipesSlice existe et est nécessaire pour availableRecipesForPlanning
        recipes: (state = { familyRecipes: [], publicRecipes: [] }) => state,
      },
    });
    // Réinitialiser tous les mocks Firebase avant chaque test
    getDoc.mockReset();
    setDoc.mockReset();
    getDocs.mockReset();
    httpsCallable.mockReset();
    checkAllergiesUtil.mockReset();
    getStartOfWeekUtil.mockImplementation(date => {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
        d.setHours(0,0,0,0);
        return d;
    });
    calculateWeekIdUtil.mockImplementation(date => {
        const d = new Date(date);
        const year = d.getFullYear();
        const week = Math.ceil(( ( (d - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
        return `${year}-W${String(week).padStart(2, '0')}`;
    });
  });

  it('should return the initial state', () => {
    expect(plannerReducer(undefined, { type: undefined })).toEqual(initialState);
  });

  it('should handle setCurrentWeek', () => {
    const testDate = new Date(2023, 0, 16); // Un lundi
    const expectedWeekId = calculateWeekIdUtil(testDate);
    const expectedStartDateISO = getStartOfWeekUtil(testDate).toISOString();

    const action = setCurrentWeek(testDate.toISOString());
    const newState = plannerReducer(initialState, action);

    expect(newState.currentWeekStart).toEqual(expectedStartDateISO);
    expect(newState.weekId).toEqual(expectedWeekId);
    expect(newState.weeklyPlanData).toBeNull();
    expect(newState.loading).toBe(true);
  });

  it('should handle updateRecipeInSlotLocally', () => {
    const previousState = {
      ...initialState,
      weeklyPlanData: {
        days: { monday: { breakfast: null, lunch: 'oldRecipe', dinner: null } },
        isLocal: false, // Simuler un plan existant
      },
    };
    const action = updateRecipeInSlotLocally({ day: 'monday', mealType: 'lunch', recipeId: 'newRecipe' });
    const newState = plannerReducer(previousState, action);
    expect(newState.weeklyPlanData.days.monday.lunch).toEqual('newRecipe');
    expect(newState.weeklyPlanData.isModified).toBe(true); // Doit marquer comme modifié
  });

  describe('fetchWeeklyPlanAndRecipes thunk', () => {
    it('should handle successful fetch when plan exists', async () => {
        const mockPlanData = {
            startDate: Timestamp.fromDate(new Date()),
            endDate: Timestamp.fromDate(new Date()),
            days: { monday: { breakfast: 'recipe1' } }
        };
        getDoc.mockResolvedValue({ exists: () => true, data: () => mockPlanData });
        getDocs.mockResolvedValue({ docs: [] }); // Simuler la récupération des recettes (vide pour simplifier)

        await store.dispatch(fetchWeeklyPlanAndRecipes({ familyId: 'fam1', weekId: '2023-W03', currentWeekStartDate: new Date().toISOString() }));
        const state = store.getState().planner;

        expect(state.loading).toBe(false);
        expect(state.weeklyPlanData.days.monday.breakfast).toEqual('recipe1');
        // Les dates doivent être des chaînes ISO dans le state Redux
        expect(typeof state.weeklyPlanData.startDate).toBe('string');
    });

    it('should create a default local plan if none exists on Firestore', async () => {
        getDoc.mockResolvedValue({ exists: () => false }); // Simuler l'absence de plan
        getDocs.mockResolvedValue({ docs: [] }); // Recettes vides

        const currentStartDate = new Date().toISOString();
        await store.dispatch(fetchWeeklyPlanAndRecipes({ familyId: 'fam1', weekId: '2023-W04', currentWeekStartDate: currentStartDate }));
        const state = store.getState().planner;

        expect(state.loading).toBe(false);
        expect(state.weeklyPlanData).not.toBeNull();
        expect(state.weeklyPlanData.isLocal).toBe(true);
        expect(state.weeklyPlanData.familyId).toEqual('fam1');
        expect(Object.keys(state.weeklyPlanData.days).length).toEqual(7); // Vérifier que tous les jours sont là
    });
  });

  // TODO: Tests pour saveWeeklyPlan (succès, échec, création vs mise à jour)
  // TODO: Tests pour checkAllergiesInPlan (avec et sans allergies)
  // TODO: Tests pour notifyFamilyPlanReady (succès, échec)
});
