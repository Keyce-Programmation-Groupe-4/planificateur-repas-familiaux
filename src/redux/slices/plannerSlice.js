import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db, functions } from '../../firebaseConfig'; // Ajuster le chemin
import { httpsCallable } from 'firebase/functions';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { checkAllergies as checkAllergiesUtil } from '../../utils/allergyUtils'; // Ajuster le chemin
import { getStartOfWeek, getWeekId as calculateWeekId } from '../../utils/plannerUtils'; // Assurez-vous que ces fonctions existent et sont correctes

// --- Helper: Ensure date is Firestore Timestamp ---
const ensureTimestamp = (date) => {
  if (!date) return null;
  if (date instanceof Timestamp) return date;
  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date);
    if (!isNaN(d.valueOf())) return Timestamp.fromDate(d);
  }
  if (date.seconds !== undefined && date.nanoseconds !== undefined) {
     // Firestore Timestamp-like object (e.g. from JSON)
    return new Timestamp(date.seconds, date.nanoseconds);
  }
  console.warn("Invalid date for Timestamp conversion:", date);
  return null; // or throw error
};

// --- Thunks ---
export const fetchWeeklyPlanAndRecipes = createAsyncThunk(
  'planner/fetchWeeklyPlanAndRecipes',
  async ({ familyId, weekId, currentWeekStartDate }, { rejectWithValue }) => {
    if (!familyId || !weekId) {
      return rejectWithValue('Family ID and Week ID are required.');
    }
    try {
      // Fetch recipes
      const recipesRef = collection(db, 'recipes');
      const familyRecipesQuery = query(recipesRef, where('familyId', '==', familyId), orderBy('createdAt', 'desc'));
      const publicRecipesQuery = query(recipesRef, where('visibility', '==', 'public'), orderBy('createdAt', 'desc'));

      const [familySnapshot, publicSnapshot] = await Promise.all([
        getDocs(familyRecipesQuery),
        getDocs(publicRecipesQuery),
      ]);

      const familyRecipes = familySnapshot.docs.map((d) => ({ id: d.id, ...d.data(), isFamilyRecipe: true, likes: d.data().likes || [] }));
      const publicRecipesData = publicSnapshot.docs.map((d) => ({ id: d.id, ...d.data(), isFamilyRecipe: false, likes: d.data().likes || [] }));

      const combinedRecipesMap = new Map();
      familyRecipes.forEach(recipe => combinedRecipesMap.set(recipe.id, recipe));
      publicRecipesData.forEach(recipe => {
        if (!combinedRecipesMap.has(recipe.id)) {
          combinedRecipesMap.set(recipe.id, recipe);
        }
      });
      const availableRecipes = Array.from(combinedRecipesMap.values()).sort((a, b) => {
        if (a.isFamilyRecipe && !b.isFamilyRecipe) return -1;
        if (!a.isFamilyRecipe && b.isFamilyRecipe) return 1;
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA;
      });

      // Fetch plan
      const planDocRef = doc(db, 'families', familyId, 'weeklyPlans', weekId);
      const planDocSnap = await getDoc(planDocRef);
      let weeklyPlanData;
      if (planDocSnap.exists()) {
        weeklyPlanData = planDocSnap.data();
        // Ensure dates are ISO strings for serializability in Redux state
        if (weeklyPlanData.startDate) weeklyPlanData.startDate = ensureTimestamp(weeklyPlanData.startDate)?.toDate().toISOString();
        if (weeklyPlanData.endDate) weeklyPlanData.endDate = ensureTimestamp(weeklyPlanData.endDate)?.toDate().toISOString();
      } else {
        // Create a default local plan if none exists
        const startDate = getStartOfWeek(new Date(currentWeekStartDate));
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        weeklyPlanData = {
          familyId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days: {
            monday: { breakfast: null, lunch: null, dinner: null },
            tuesday: { breakfast: null, lunch: null, dinner: null },
            wednesday: { breakfast: null, lunch: null, dinner: null },
            thursday: { breakfast: null, lunch: null, dinner: null },
            friday: { breakfast: null, lunch: null, dinner: null },
            saturday: { breakfast: null, lunch: null, dinner: null },
            sunday: { breakfast: null, lunch: null, dinner: null },
          },
          isLocal: true, // Flag to indicate it's not from Firestore yet
        };
      }
      return { weeklyPlanData, availableRecipes };
    } catch (error) {
      console.error("Error in fetchWeeklyPlanAndRecipes:", error);
      return rejectWithValue(error.message);
    }
  }
);

export const saveWeeklyPlan = createAsyncThunk(
  'planner/saveWeeklyPlan',
  async ({ familyId, weekId, planData, isCreatingNewPlan }, { rejectWithValue }) => {
    if (!familyId || !weekId || !planData) {
      return rejectWithValue('Missing data for saving plan.');
    }
    try {
      const planDocRef = doc(db, 'families', familyId, 'weeklyPlans', weekId);
      const dataToSave = { ...planData };

      // Convert ISO strings back to Timestamps for Firestore
      if (dataToSave.startDate) dataToSave.startDate = ensureTimestamp(dataToSave.startDate);
      if (dataToSave.endDate) dataToSave.endDate = ensureTimestamp(dataToSave.endDate);

      dataToSave.lastUpdatedAt = serverTimestamp();
      if (isCreatingNewPlan || dataToSave.isLocal) {
        dataToSave.createdAt = serverTimestamp();
        dataToSave.familyId = familyId; // Ensure familyId is set
      }
      delete dataToSave.isLocal; // Remove local flag before saving

      await setDoc(planDocRef, dataToSave, { merge: !isCreatingNewPlan });

      // Return the saved data, converting Timestamps back to ISO strings for Redux state
      const savedData = { ...dataToSave };
      if (savedData.startDate) savedData.startDate = ensureTimestamp(savedData.startDate)?.toDate().toISOString();
      if (savedData.endDate) savedData.endDate = ensureTimestamp(savedData.endDate)?.toDate().toISOString();
      // Firestore timestamps for createdAt/lastUpdatedAt will be handled by Firestore,
      // they will be Timestamps when read back, so convert them if needed upon read.
      // For now, we don't send them back in the action payload to avoid complex conversion here.
      // The fetch thunk will handle their conversion.
      delete savedData.createdAt;
      delete savedData.lastUpdatedAt;

      return { weekId, planData: savedData };
    } catch (error) {
      console.error("Error in saveWeeklyPlan:", error);
      return rejectWithValue(error.message);
    }
  }
);

export const checkAllergiesInPlan = createAsyncThunk(
  'planner/checkAllergiesInPlan',
  async ({ familyId, weeklyPlanData, recipes }, { rejectWithValue }) => {
    if (!familyId || !weeklyPlanData || !recipes) {
      return rejectWithValue('Missing data for allergy check.');
    }
    try {
      const result = await checkAllergiesUtil(familyId, weeklyPlanData, recipes);
      return result; // { alerts: [], message: "", hasAllergies: bool }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const notifyFamilyPlanReady = createAsyncThunk(
  'planner/notifyFamilyPlanReady',
  async ({ familyId, weekId }, { rejectWithValue }) => {
    if (!familyId || !weekId) {
      return rejectWithValue('Family ID and Week ID are required for notification.');
    }
    try {
      const notifyFunction = httpsCallable(functions, 'notifyFamilyPlanReady');
      const result = await notifyFunction({ familyId, weekId });
      return result.data; // { success: bool, message: string }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  currentWeekStart: getStartOfWeek(new Date()).toISOString(),
  weekId: calculateWeekId(new Date()),
  weeklyPlanData: null, // { startDate, endDate, days: { monday: { breakfast, lunch, dinner }, ... } }
  availableRecipesForPlanning: [], // Array of recipe objects
  loading: false,
  saving: false,
  error: null,
  modalOpen: false,
  targetSlotInfo: null, // { day, mealType }
  allergyAlerts: [],
  allergyModalOpen: false,
  allergyCheckResult: null, // { alerts, message, hasAllergies }
  notificationStatus: {
    loading: false,
    error: null,
    message: null,
  },
};

const plannerSlice = createSlice({
  name: 'planner',
  initialState,
  reducers: {
    setCurrentWeek: (state, action) => {
      const newStartDate = getStartOfWeek(new Date(action.payload));
      state.currentWeekStart = newStartDate.toISOString();
      state.weekId = calculateWeekId(newStartDate);
      state.weeklyPlanData = null; // Reset plan data when week changes, will be fetched by thunk
      state.loading = true; // Indicate loading for the new week's data
    },
    updateRecipeInSlotLocally: (state, action) => {
      const { day, mealType, recipeId } = action.payload;
      if (state.weeklyPlanData && state.weeklyPlanData.days[day]) {
        state.weeklyPlanData.days[day][mealType] = recipeId;
        if(state.weeklyPlanData.isLocal === undefined && state.weeklyPlanData.id) { // if it's a Firestore doc
            state.weeklyPlanData.isModified = true; // Flag that local changes were made
        }
      }
    },
    deleteRecipeFromSlotLocally: (state, action) => {
      const { day, mealType } = action.payload;
      if (state.weeklyPlanData && state.weeklyPlanData.days[day]) {
        state.weeklyPlanData.days[day][mealType] = null;
         if(state.weeklyPlanData.isLocal === undefined && state.weeklyPlanData.id) {
            state.weeklyPlanData.isModified = true;
        }
      }
    },
    openPlannerRecipeModal: (state, action) => {
      state.targetSlotInfo = action.payload; // { day, mealType }
      state.modalOpen = true;
    },
    closePlannerRecipeModal: (state) => {
      state.modalOpen = false;
      state.targetSlotInfo = null;
    },
    openAllergyModal: (state) => {
      state.allergyModalOpen = true;
    },
    closeAllergyModal: (state) => {
      state.allergyModalOpen = false;
    },
    clearPlannerError: (state) => {
      state.error = null;
    },
    clearNotificationStatus: (state) => {
      state.notificationStatus = { loading: false, error: null, message: null };
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchWeeklyPlanAndRecipes
      .addCase(fetchWeeklyPlanAndRecipes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWeeklyPlanAndRecipes.fulfilled, (state, action) => {
        state.loading = false;
        state.weeklyPlanData = action.payload.weeklyPlanData;
        state.availableRecipesForPlanning = action.payload.availableRecipes;
      })
      .addCase(fetchWeeklyPlanAndRecipes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // saveWeeklyPlan
      .addCase(saveWeeklyPlan.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveWeeklyPlan.fulfilled, (state, action) => {
        state.saving = false;
        // Update the plan with the data confirmed from save (especially if timestamps were generated)
        // The payload should return the processed planData
        state.weeklyPlanData = { ...state.weeklyPlanData, ...action.payload.planData, isLocal: false, isModified: false };
      })
      .addCase(saveWeeklyPlan.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      // checkAllergiesInPlan
      .addCase(checkAllergiesInPlan.pending, (state) => {
        state.loading = true; // Or a specific allergy check loading state
      })
      .addCase(checkAllergiesInPlan.fulfilled, (state, action) => {
        state.allergyCheckResult = action.payload;
        state.allergyAlerts = action.payload.alerts || [];
        if (action.payload.hasAllergies && action.payload.alerts.length > 0) {
          state.allergyModalOpen = true;
        }
        state.loading = false;
      })
      .addCase(checkAllergiesInPlan.rejected, (state, action) => {
        state.error = `Allergy check failed: ${action.payload}`;
        state.loading = false;
      })
      // notifyFamilyPlanReady
      .addCase(notifyFamilyPlanReady.pending, (state) => {
        state.notificationStatus.loading = true;
        state.notificationStatus.error = null;
        state.notificationStatus.message = null;
      })
      .addCase(notifyFamilyPlanReady.fulfilled, (state, action) => {
        state.notificationStatus.loading = false;
        state.notificationStatus.message = action.payload.message || "Notification sent!";
      })
      .addCase(notifyFamilyPlanReady.rejected, (state, action) => {
        state.notificationStatus.loading = false;
        state.notificationStatus.error = action.payload;
      });
  },
});

export const {
  setCurrentWeek,
  updateRecipeInSlotLocally,
  deleteRecipeFromSlotLocally,
  openPlannerRecipeModal,
  closePlannerRecipeModal,
  openAllergyModal,
  closeAllergyModal,
  clearPlannerError,
  clearNotificationStatus,
} = plannerSlice.actions;

export default plannerSlice.reducer;
