import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../../firebaseConfig'; // Ajuster
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getWeekId as calculateWeekId, getStartOfWeekDate } from '../../utils/plannerUtils'; // Ajuster
import { convertToStandardUnit, findStandardUnit } from '../../utils/UnitConverter'; // Ajuster

// --- Helper: Ensure date is Firestore Timestamp ---
const ensureTimestamp = (date) => {
  if (!date) return null;
  if (date instanceof Timestamp) return date;
  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date);
    if (!isNaN(d.valueOf())) return Timestamp.fromDate(d);
  }
   if (date.seconds !== undefined && date.nanoseconds !== undefined) {
    return new Timestamp(date.seconds, date.nanoseconds);
  }
  console.warn("Invalid date for Timestamp conversion:", date);
  return null;
};

// --- Thunks ---
export const fetchOrGenerateShoppingList = createAsyncThunk(
  'shoppingList/fetchOrGenerate',
  async ({ familyId, targetWeekId, generateIfNeeded = true }, { rejectWithValue, getState, dispatch }) => {
    if (!familyId || !targetWeekId) {
      return rejectWithValue('Family ID and Target Week ID are required.');
    }

    try {
      const listDocRef = doc(db, 'families', familyId, 'shoppingLists', targetWeekId);
      const listDocSnap = await getDoc(listDocRef);

      if (listDocSnap.exists()) {
        const listData = listDocSnap.data();
        // Convert Timestamps to ISO strings for Redux state
        if (listData.createdAt) listData.createdAt = ensureTimestamp(listData.createdAt)?.toDate().toISOString();
        if (listData.lastGeneratedAt) listData.lastGeneratedAt = ensureTimestamp(listData.lastGeneratedAt)?.toDate().toISOString();
        return { shoppingListDoc: listData, weekId: targetWeekId };
      } else if (generateIfNeeded) {
        // If list doesn't exist and generation is needed, dispatch generation thunk
        // This thunk will then update the state.
        // We return a specific value to indicate generation will occur.
        await dispatch(generateShoppingListForWeek({ familyId, targetWeekId }));
        // After generation, the state will be updated by generateShoppingListForWeek.
        // We don't need to return data here as the other thunk handles it.
        // Or, we could re-fetch, but that's less efficient.
        // For now, let's assume the UI will react to the state change from generateShoppingListForWeek.
        return { shoppingListDoc: getState().shoppingList.shoppingListDoc, weekId: targetWeekId, status: 'generated' };
      } else {
        return { shoppingListDoc: null, weekId: targetWeekId, status: 'not_found' }; // No list and no generation requested
      }
    } catch (error) {
      console.error("Error in fetchOrGenerateShoppingList:", error);
      return rejectWithValue(error.message);
    }
  }
);

export const generateShoppingListForWeek = createAsyncThunk(
  'shoppingList/generateForWeek',
  async ({ familyId, targetWeekId }, { rejectWithValue, getState }) => {
    try {
      // 1. Get Weekly Plan
      const planDocRef = doc(db, 'families', familyId, 'weeklyPlans', targetWeekId);
      const planDocSnap = await getDoc(planDocRef);
      if (!planDocSnap.exists()) throw new Error(`Aucun planning trouvé pour la semaine ${targetWeekId}.`);
      const planData = planDocSnap.data();

      // 2. Extract Unique Recipe IDs
      const recipeIds = new Set();
      Object.values(planData.days).forEach(day => Object.values(day).forEach(recipeId => { if (recipeId) recipeIds.add(recipeId); }));
      if (recipeIds.size === 0) throw new Error("Le planning ne contient aucune recette.");

      // 3. Fetch Recipe Details (assuming recipes are already in a recipes slice or fetched separately)
      // For simplicity, let's assume recipes are available or refetch them if necessary.
      // This part might need to interact with a recipes slice or have recipes passed in.
      // Here, we'll simulate fetching them again if not available.
      let allRecipes = getState().recipes?.familyRecipes.concat(getState().recipes?.publicRecipes || []) || [];
      if (allRecipes.length === 0) { // Basic check, might need more robust logic
        // Simplified recipe fetching - in a real app, this might be an error or trigger another fetch
        const recipesRef = collection(db, "recipes");
        const q = query(recipesRef, where("familyId", "in", [familyId, "public"])); // Example query
        const recipesSnap = await getDocs(q);
        allRecipes = recipesSnap.docs.map(d => ({id: d.id, ...d.data()}));
      }

      const recipesData = allRecipes.filter(r => recipeIds.has(r.id));


      // 4. Create Raw Ingredient List
      const rawIngredientItems = [];
      recipesData.forEach(recipe => {
        if (recipe.ingredientsList && Array.isArray(recipe.ingredientsList)) {
          recipe.ingredientsList.forEach(item => {
            if (item.ingredientId && item.quantity && item.unit) {
              rawIngredientItems.push({ ...item });
            }
          });
        }
      });
      if (rawIngredientItems.length === 0) throw new Error("Aucun ingrédient valide trouvé.");

      // 5. Fetch Unique Ingredient Details
      const uniqueIngredientIds = new Set(rawIngredientItems.map(item => item.ingredientId));
      const ingredientPromises = Array.from(uniqueIngredientIds).map(id => getDoc(doc(db, "ingredients", id)));
      const ingredientDocs = await Promise.all(ingredientPromises);
      const ingredientDetailsMap = ingredientDocs.reduce((acc, d) => {
        if (d.exists()) acc[d.id] = { id: d.id, ...d.data() };
        return acc;
      }, {});

      // 6. Fetch Current Stock
      const stockItemsRef = collection(db, "families", familyId, "stockItems");
      const stockSnapshot = await getDocs(stockItemsRef);
      const stockItemsMap = stockSnapshot.docs.reduce((acc, d) => {
          acc[d.id] = d.data(); // d.id should be ingredientId
          return acc;
      }, {});

      // 7. Aggregate, Convert, Calculate Net Quantity and Costs
      const aggregatedList = {};
      rawIngredientItems.forEach(item => {
        const details = ingredientDetailsMap[item.ingredientId];
        if (!details || !details.units) return;

        const standardUnit = findStandardUnit(details.units) || item.unit;
        let quantityInStandard = item.quantity;
        if (item.unit !== standardUnit) {
            const conversion = convertToStandardUnit(item.quantity, item.unit, details.units);
            if (conversion && conversion.standardUnit === standardUnit) {
                quantityInStandard = conversion.standardQuantity;
            } else {
                 console.warn(`Cannot convert ${item.quantity} ${item.unit} to ${standardUnit} for ${details.name}`);
                 // Fallback: use original quantity and unit if conversion fails, or handle error
            }
        }

        if (!aggregatedList[item.ingredientId]) {
          aggregatedList[item.ingredientId] = {
            ingredientId: item.ingredientId,
            name: details.name,
            category: details.category || 'Autre',
            totalGrossQuantity: 0,
            unit: standardUnit, // Store everything in standard unit
            unitsData: details.units, // For price calculation later
          };
        }
        aggregatedList[item.ingredientId].totalGrossQuantity += quantityInStandard;
      });

      const listItemsForFirestore = [];
      let totalTheoreticalCost = 0;
      let totalActualCost = 0;

      Object.values(aggregatedList).forEach(aggItem => {
        const stockInfo = stockItemsMap[aggItem.ingredientId];
        let stockQuantityInStandard = 0;
        if (stockInfo && stockInfo.quantity > 0) {
            if (stockInfo.unit === aggItem.unit) {
                stockQuantityInStandard = stockInfo.quantity;
            } else {
                 const conversion = convertToStandardUnit(stockInfo.quantity, stockInfo.unit, aggItem.unitsData);
                 if(conversion && conversion.standardUnit === aggItem.unit) {
                    stockQuantityInStandard = conversion.standardQuantity;
                 } else {
                    console.warn(`Stock unit mismatch for ${aggItem.name}`);
                 }
            }
        }

        const netQuantity = Math.max(0, aggItem.totalGrossQuantity - stockQuantityInStandard);

        let pricePerUnit = null;
        let needsPriceInput = true;
        if (aggItem.unitsData[aggItem.unit] && typeof aggItem.unitsData[aggItem.unit].standardPrice === 'number') {
            pricePerUnit = aggItem.unitsData[aggItem.unit].standardPrice;
            needsPriceInput = false;
        }

        const theoreticalItemCost = pricePerUnit !== null ? aggItem.totalGrossQuantity * pricePerUnit : null;
        const actualItemCost = pricePerUnit !== null ? netQuantity * pricePerUnit : null;

        if (netQuantity > 0) {
          listItemsForFirestore.push({
            itemId: `${aggItem.ingredientId}_${aggItem.unit}`,
            ingredientId: aggItem.ingredientId,
            name: aggItem.name,
            category: aggItem.category,
            grossQuantity: aggItem.totalGrossQuantity,
            stockQuantity: stockQuantityInStandard,
            netQuantity: netQuantity,
            unit: aggItem.unit,
            theoreticalItemCost,
            actualItemCost,
            needsPriceInput,
            isChecked: false,
          });
          if (typeof actualItemCost === 'number') totalActualCost += actualItemCost;
        }
        if (typeof theoreticalItemCost === 'number') totalTheoreticalCost += theoreticalItemCost;
      });

      const shoppingListDocData = {
        weekId: targetWeekId,
        familyId: familyId,
        createdAt: serverTimestamp(),
        lastGeneratedAt: serverTimestamp(),
        status: 'active',
        totalTheoreticalCost,
        totalActualCost,
        items: listItemsForFirestore,
      };

      const listDocRef = doc(db, 'families', familyId, 'shoppingLists', targetWeekId);
      await setDoc(listDocRef, shoppingListDocData);

      // Convert Timestamps for Redux state
      const savedData = { ...shoppingListDocData };
      savedData.createdAt = new Date().toISOString(); // Approximate for immediate use
      savedData.lastGeneratedAt = new Date().toISOString();

      return { shoppingListDoc: savedData, weekId: targetWeekId };
    } catch (error) {
      console.error("Error in generateShoppingListForWeek:", error);
      return rejectWithValue(error.message);
    }
  }
);


export const toggleShoppingListItem = createAsyncThunk(
  'shoppingList/toggleItem',
  async ({ familyId, targetWeekId, itemId, isChecked, itemDetails }, { rejectWithValue, getState }) => {
    // itemDetails: { ingredientId, netQuantity, unit, name, category }
    if (!familyId || !targetWeekId || !itemId || itemDetails === undefined) {
      return rejectWithValue('Missing data for toggling item.');
    }
    try {
      const listDocRef = doc(db, 'families', familyId, 'shoppingLists', targetWeekId);
      const currentShoppingList = getState().shoppingList.shoppingListDoc;
      if (!currentShoppingList || !currentShoppingList.items) {
        return rejectWithValue('Shopping list not found in state.');
      }

      const updatedItems = currentShoppingList.items.map(item =>
        item.itemId === itemId ? { ...item, isChecked } : item
      );
      await updateDoc(listDocRef, { items: updatedItems });

      // Update stock if item is being checked (added to pantry)
      if (isChecked && itemDetails.ingredientId && itemDetails.netQuantity > 0) {
        const stockItemRef = doc(db, "families", familyId, "stockItems", itemDetails.ingredientId);
        const stockSnap = await getDoc(stockItemRef);
        let newStockQuantity = itemDetails.netQuantity;
        if (stockSnap.exists()) {
            const currentStock = stockSnap.data();
            // Ensure units match or convert before adding. For simplicity, assuming units match.
            if (currentStock.unit === itemDetails.unit) {
                newStockQuantity += currentStock.quantity;
            } else {
                // Handle unit conversion or throw error if complex
                console.warn(`Stock unit ${currentStock.unit} and item unit ${itemDetails.unit} differ for ${itemDetails.name}. Stock not updated accurately.`);
                 // Potentially skip stock update or convert if possible
            }
        }
        await setDoc(stockItemRef, {
            ingredientName: itemDetails.name,
            category: itemDetails.category,
            quantity: newStockQuantity,
            unit: itemDetails.unit,
            lastUpdated: serverTimestamp(),
        }, { merge: true });
      }
      return { itemId, isChecked };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateIngredientPrice = createAsyncThunk(
  'shoppingList/updateIngredientPrice',
  async ({ ingredientId, unit, price }, { rejectWithValue }) => {
    if (!ingredientId || !unit || typeof price !== 'number') {
      return rejectWithValue('Invalid data for price update.');
    }
    try {
      const ingredientRef = doc(db, 'ingredients', ingredientId);
      await updateDoc(ingredientRef, {
        [`units.${unit}.standardPrice`]: price,
        [`units.${unit}.priceSource`]: 'user_input', // Or some other source indicator
        [`units.${unit}.lastPriceUpdate`]: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { ingredientId, unit, price }; // Return data to potentially update local state if needed
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);


// --- Initial State ---
const initialState = {
  targetWeekId: calculateWeekId(new Date()),
  shoppingListDoc: null, // Holds the full document from Firestore
  // shoppingListItemsByCategory: {}, // Processed for UI, derived from shoppingListDoc
  loading: false, // General loading for fetching list
  generating: false, // Specific for list generation process
  updatingStock: false, // For stock updates during item toggle
  error: null,
  successMessage: null,
  priceDialogOpen: false,
  priceDialogData: null, // { ingredientId, ingredientName, unit }
};

// --- Slice Definition ---
const shoppingListSlice = createSlice({
  name: 'shoppingList',
  initialState,
  reducers: {
    setShoppingListTargetWeek: (state, action) => {
      state.targetWeekId = action.payload;
      state.shoppingListDoc = null; // Reset when week changes
      state.loading = true;
    },
    openPriceDialog: (state, action) => {
      state.priceDialogData = action.payload;
      state.priceDialogOpen = true;
    },
    closePriceDialog: (state) => {
      state.priceDialogOpen = false;
      state.priceDialogData = null;
    },
    clearShoppingListError: (state) => {
      state.error = null;
    },
    clearShoppingListSuccessMessage: (state) => {
      state.successMessage = null;
    },
    _uncheckAllItemsLocally: (state) => { // Internal, to be committed by a thunk
        if (state.shoppingListDoc && state.shoppingListDoc.items) {
            state.shoppingListDoc.items.forEach(item => item.isChecked = false);
        }
    },
    _clearCheckedItemsLocally: (state) => { // Internal
        if (state.shoppingListDoc && state.shoppingListDoc.items) {
            state.shoppingListDoc.items = state.shoppingListDoc.items.filter(item => !item.isChecked);
        }
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchOrGenerateShoppingList
      .addCase(fetchOrGenerateShoppingList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrGenerateShoppingList.fulfilled, (state, action) => {
        state.loading = false;
        state.shoppingListDoc = action.payload.shoppingListDoc;
        if (action.payload.status === 'generated') {
            state.successMessage = "Nouvelle liste générée !";
        } else if (action.payload.status === 'not_found') {
            state.successMessage = "Aucune liste existante, générez-en une.";
        }
      })
      .addCase(fetchOrGenerateShoppingList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // generateShoppingListForWeek
      .addCase(generateShoppingListForWeek.pending, (state) => {
        state.generating = true;
        state.error = null;
      })
      .addCase(generateShoppingListForWeek.fulfilled, (state, action) => {
        state.generating = false;
        state.shoppingListDoc = action.payload.shoppingListDoc;
        state.successMessage = "Liste de courses générée avec succès !";
      })
      .addCase(generateShoppingListForWeek.rejected, (state, action) => {
        state.generating = false;
        state.error = action.payload;
      })
      // toggleShoppingListItem
      .addCase(toggleShoppingListItem.pending, (state) => {
        // Could set a specific item's loading state if granular control is needed
        state.updatingStock = true; // General indicator for now
      })
      .addCase(toggleShoppingListItem.fulfilled, (state, action) => {
        state.updatingStock = false;
        if (state.shoppingListDoc && state.shoppingListDoc.items) {
          const itemIndex = state.shoppingListDoc.items.findIndex(item => item.itemId === action.payload.itemId);
          if (itemIndex !== -1) {
            state.shoppingListDoc.items[itemIndex].isChecked = action.payload.isChecked;
          }
        }
        state.successMessage = `Article ${action.payload.isChecked ? 'coché' : 'décoché'}.`;
      })
      .addCase(toggleShoppingListItem.rejected, (state, action) => {
        state.updatingStock = false;
        state.error = action.payload;
      })
      // updateIngredientPrice
      .addCase(updateIngredientPrice.fulfilled, (state, action) => {
        state.successMessage = "Prix de l'ingrédient mis à jour.";
        // The list will be re-fetched/re-generated by the component to reflect new costs
      })
      .addCase(updateIngredientPrice.rejected, (state, action) => {
        state.error = `Erreur mise à jour prix: ${action.payload}`;
      });
  },
});

// Thunk for unchecking all items
export const uncheckAllShoppingListItems = createAsyncThunk(
  'shoppingList/uncheckAllItems',
  async ({ familyId, targetWeekId }, { dispatch, getState, rejectWithValue }) => {
    const currentList = getState().shoppingList.shoppingListDoc;
    if (!currentList || !currentList.items || currentList.items.length === 0) {
      return rejectWithValue("No items to uncheck or list not loaded.");
    }
    dispatch(shoppingListSlice.actions._uncheckAllItemsLocally());
    const updatedItems = getState().shoppingList.shoppingListDoc.items; // Get locally updated items
    try {
      const listDocRef = doc(db, 'families', familyId, 'shoppingLists', targetWeekId);
      await updateDoc(listDocRef, { items: updatedItems });
      return "Tous les articles ont été décochés.";
    } catch (error) {
      // Optionally revert local state if Firestore update fails
      return rejectWithValue(error.message);
    }
  }
);

// Thunk for clearing checked items
export const clearCheckedShoppingListItems = createAsyncThunk(
  'shoppingList/clearCheckedItems',
  async ({ familyId, targetWeekId }, { dispatch, getState, rejectWithValue }) => {
    const currentList = getState().shoppingList.shoppingListDoc;
     if (!currentList || !currentList.items || currentList.items.length === 0) {
      return rejectWithValue("No items to clear or list not loaded.");
    }
    dispatch(shoppingListSlice.actions._clearCheckedItemsLocally());
    const updatedItems = getState().shoppingList.shoppingListDoc.items;
    try {
      const listDocRef = doc(db, 'families', familyId, 'shoppingLists', targetWeekId);
      await updateDoc(listDocRef, { items: updatedItems });
      return "Les articles cochés ont été supprimés.";
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);


export const {
  setShoppingListTargetWeek,
  openPriceDialog,
  closePriceDialog,
  clearShoppingListError,
  clearShoppingListSuccessMessage,
} = shoppingListSlice.actions;

export default shoppingListSlice.reducer;
