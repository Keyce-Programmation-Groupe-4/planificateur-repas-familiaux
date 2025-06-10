// src/chatbotActions.js

/**
 * This module provides functions for the chatbot to interact with the application's
 * core functionalities, such as family management, meal planning, and shopping list generation.
 * It directly interfaces with Firestore and encapsulates business logic.
 */

import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  Timestamp,
  orderBy,
  runTransaction
} from "firebase/firestore";
import { db } from "./firebaseConfig.js";

// Import pdfMake
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

// Attempt to import unit conversion utilities
// Assuming these are the key functions needed based on ShoppingListPage
import {
  formatQuantityUnit,
  findStandardUnit,
  convertToStandardUnit,
  getUnitConversionRate,
  UNITS // Assuming base units are defined here
} from "../utils/UnitConverter.js";



/**
 * Adds a new family member by sending an invitation email.
 * (Implementation from previous steps - keeping it for completeness)
 */
export const addFamilyMemberByEmail = async (
  currentUserData,
  userFamilyData,
  recipientEmail
) => {
  // ... (previous implementation)
  // 1. Permission Check
  if (currentUserData.uid !== userFamilyData.adminUid) {
    return {
      success: false,
      error: "Action réservée à l'administrateur de la famille.",
    };
  }

  // 2. Input Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    return { success: false, error: "Format d'email invalide." };
  }

  if (
    currentUserData.email &&
    recipientEmail.toLowerCase() === currentUserData.email.toLowerCase()
  ) {
    return {
      success: false,
      error: "Vous ne pouvez pas vous inviter vous-même.",
    };
  }

  try {
    // 3. Check for Existing Pending Invitation
    const invitationsRef = collection(db, "invitations");
    const q = query(
      invitationsRef,
      where("familyId", "==", userFamilyData.id),
      where("recipientEmail", "==", recipientEmail.trim().toLowerCase()),
      where("status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return {
        success: false,
        error:
          "Une invitation est déjà en attente pour cet email pour cette famille.",
      };
    }

    // 4. Firestore Batch Write
    const batch = writeBatch(db);

    // Create invitation document
    const invitationRef = doc(collection(db, "invitations"));
    batch.set(invitationRef, {
      familyId: userFamilyData.id,
      familyName: userFamilyData.familyName,
      inviterUid: currentUserData.uid,
      inviterName: currentUserData.displayName,
      recipientEmail: recipientEmail.trim().toLowerCase(),
      status: "pending",
      createdAt: serverTimestamp(),
    });

    // Create mail document for Firebase Extension
    const mailRef = doc(collection(db, "mail"));
    batch.set(mailRef, {
      to: [recipientEmail.trim()],
      message: {
        subject: `Invitation à rejoindre la famille ${userFamilyData.familyName} !`,
        html: `Bonjour,<br><br>${currentUserData.displayName} vous invite à rejoindre la famille <strong>${userFamilyData.familyName}</strong> sur notre application de planification de repas.<br><br>Connectez-vous à l'application pour accepter l'invitation.<br><br>À bientôt !`,
      },
    });

    await batch.commit();

    // 5. Return Success
    return {
      success: true,
      message: `Invitation envoyée à ${recipientEmail.trim()} !`,
    };
  } catch (error) {
    console.error("Error sending invitation:", error);
    return {
      success: false,
      error: error.message || "Erreur lors de l'envoi de l'invitation.",
    };
  }
};

/**
 * Helper function to get the start of the week (Monday) from a weekIdString (e.g., "2023-W42").
 * (Implementation from previous steps)
 */
const getStartOfWeekFromString = (weekIdString) => {
  const [year, weekNumberStr] = weekIdString.split("-W");
  const weekNumber = parseInt(weekNumberStr, 10);
  const janFirst = new Date(parseInt(year, 10), 0, 1);
  const daysToMonday = (8 - janFirst.getDay() + 7) % 7; // Days to get to the first Monday
  const firstMondayOfYear = new Date(janFirst);
  firstMondayOfYear.setDate(janFirst.getDate() + daysToMonday);

  const targetMonday = new Date(firstMondayOfYear);
  targetMonday.setDate(firstMondayOfYear.getDate() + (weekNumber - 1) * 7);
  targetMonday.setHours(0, 0, 0, 0); // Set to midnight
  return targetMonday;
};

/**
 * Generates a weekly meal plan for a given family and week.
 * (Implementation from previous steps - keeping it for completeness)
 */
export const generateWeeklyMealPlan = async (
  userFamilyId,
  weekIdString,
  planType
) => {
  // ... (previous implementation)
  try {
    // 1. Fetch Recipes
    let availableRecipes = [];
    const recipesRef = collection(db, "recipes");

    if (planType === "family" || planType === "all") {
      const familyQuery = query(recipesRef, where("familyId", "==", userFamilyId));
      const familySnapshot = await getDocs(familyQuery);
      familySnapshot.forEach((doc) =>
        availableRecipes.push({ id: doc.id, ...doc.data() })
      );
    }

    if (planType === "public" || planType === "all") {
      const publicQuery = query(recipesRef, where("visibility", "==", "public"));
      const publicSnapshot = await getDocs(publicQuery);
      publicSnapshot.forEach((doc) => {
        // Avoid duplicates if 'all' and recipe is already added from family
        if (!availableRecipes.find(r => r.id === doc.id)) {
          availableRecipes.push({ id: doc.id, ...doc.data() });
        }
      });
    }

    if (availableRecipes.length === 0) {
      return {
        success: false,
        error: "Aucune recette disponible pour le type de planning demandé.",
      };
    }

    // 2. Fetch or Create Plan Document
    const planDocRef = doc(db, "families", userFamilyId, "weeklyPlans", weekIdString);
    const planDocSnap = await getDoc(planDocRef);
    let planData;

    const startDate = getStartOfWeekFromString(weekIdString);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999); // End of Sunday

    if (planDocSnap.exists()) {
      planData = planDocSnap.data();
    } else {
      planData = {
        familyId: userFamilyId,
        weekId: weekIdString, // Store weekId for easier querying if needed
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        days: {
          monday: { breakfast: null, lunch: null, dinner: null },
          tuesday: { breakfast: null, lunch: null, dinner: null },
          wednesday: { breakfast: null, lunch: null, dinner: null },
          thursday: { breakfast: null, lunch: null, dinner: null },
          friday: { breakfast: null, lunch: null, dinner: null },
          saturday: { breakfast: null, lunch: null, dinner: null },
          sunday: { breakfast: null, lunch: null, dinner: null },
        },
        createdAt: serverTimestamp(),
      };
    }

    // 3. Populate Plan
    const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const mealSlots = ["breakfast", "lunch", "dinner"];

    daysOfWeek.forEach((day) => {
      mealSlots.forEach((slot) => {
        if (availableRecipes.length > 0) {
          const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
          planData.days[day][slot] = randomRecipe.id; // Store recipe ID
        } else {
          planData.days[day][slot] = null;
        }
      });
    });

    planData.lastUpdatedAt = serverTimestamp();

    // 4. Save Plan
    await setDoc(planDocRef, planData, { merge: true });

    // 5. Return Success
    return {
      success: true,
      message: "Planning hebdomadaire généré avec succès !",
    };
  } catch (error) {
    console.error("Error generating weekly meal plan:", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la génération du planning.",
    };
  }
};


/**
 * Exports a weekly meal plan to PDF.
 * (Implementation from previous steps - keeping it for completeness)
 */
export const exportWeeklyPlanToPdf = async (userFamilyId, weekIdString) => {
  // ... (previous implementation)
  try {
    // 1. Fetch Weekly Plan
    const planDocRef = doc(db, "families", userFamilyId, "weeklyPlans", weekIdString);
    const planDocSnap = await getDoc(planDocRef);

    if (!planDocSnap.exists()) {
      return { success: false, error: "Aucun planning trouvé pour cette semaine." };
    }
    const weeklyPlan = planDocSnap.data();

    // 2. Fetch All Available Recipes
    const availableRecipesMap = new Map();
    const recipesRef = collection(db, "recipes");

    // Family recipes
    const familyQuery = query(recipesRef, where("familyId", "==", userFamilyId));
    const familySnapshot = await getDocs(familyQuery);
    familySnapshot.forEach((doc) => {
      if (!availableRecipesMap.has(doc.id)) {
        availableRecipesMap.set(doc.id, { id: doc.id, ...doc.data() });
      }
    });

    // Public recipes
    const publicQuery = query(recipesRef, where("visibility", "==", "public"));
    const publicSnapshot = await getDocs(publicQuery);
    publicSnapshot.forEach((doc) => {
      if (!availableRecipesMap.has(doc.id)) {
        availableRecipesMap.set(doc.id, { id: doc.id, ...doc.data() });
      }
    });

    const getRecipeNameById = (recipeId) => {
      if (!recipeId) return "Aucun repas planifié";
      const recipe = availableRecipesMap.get(recipeId);
      return recipe ? recipe.name : "Recette inconnue";
    };

    // 3. Replicate PDF Generation Logic
    const orderedDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const dayNames = {
      monday: "Lundi",
      tuesday: "Mardi",
      wednesday: "Mercredi",
      thursday: "Jeudi",
      friday: "Vendredi",
      saturday: "Samedi",
      sunday: "Dimanche",
    };

    const weekStartDate = getStartOfWeekFromString(weekIdString);
    const formattedDate = `${weekStartDate.getDate().toString().padStart(2, '0')}/${(weekStartDate.getMonth() + 1).toString().padStart(2, '0')}/${weekStartDate.getFullYear()}`;

    const content = [
      { text: "Planning de Repas Familial", style: "header", alignment: "center" },
      { text: `Semaine du ${formattedDate}`, style: "subheader", alignment: "center", margin: [0, 0, 0, 20] },
    ];

    const usedRecipeIds = new Set();

    orderedDays.forEach((dayKey) => {
      const dayPlan = weeklyPlan.days[dayKey];
      content.push({ text: dayNames[dayKey], style: "dayHeader", margin: [0, 10, 0, 5] });

      const dayTableBody = [
        [
          { text: "Petit-déjeuner", style: "mealType" },
          { text: getRecipeNameById(dayPlan.breakfast), style: "mealName" },
        ],
        [
          { text: "Déjeuner", style: "mealType" },
          { text: getRecipeNameById(dayPlan.lunch), style: "mealName" },
        ],
        [
          { text: "Dîner", style: "mealType" },
          { text: getRecipeNameById(dayPlan.dinner), style: "mealName" },
        ],
      ];

      if(dayPlan.breakfast) usedRecipeIds.add(dayPlan.breakfast);
      if(dayPlan.lunch) usedRecipeIds.add(dayPlan.lunch);
      if(dayPlan.dinner) usedRecipeIds.add(dayPlan.dinner);

      content.push({
        table: {
          widths: ["*", "75%"],
          body: dayTableBody,
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 10],
      });
    });

    if (usedRecipeIds.size > 0) {
        content.push({ text: "Recettes utilisées cette semaine:", style: "subheader", margin: [0, 20, 0, 5] });
        const recipeList = {
            ul: Array.from(usedRecipeIds).map(id => getRecipeNameById(id)).filter(name => name !== "Aucun repas planifié" && name !== "Recette inconnue")
        };
        content.push(recipeList);
    }


    const docDefinition = {
      content: content,
      styles: {
        header: { fontSize: 22, bold: true, alignment: "center", margin: [0,0,0,10] },
        subheader: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
        dayHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
        mealType: { bold: true },
        mealName: {},
      },
      defaultStyle: { font: "Roboto" }
    };

    pdfMake.createPdf(docDefinition).download(`planning_repas_${weekIdString}.pdf`);

    return {
      success: true,
      message: "Le téléchargement du PDF du planning devrait commencer.",
    };

  } catch (error) {
    console.error("Error exporting weekly plan to PDF:", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la génération du PDF du planning.",
    };
  }
};


/**
 * Internal helper to generate or refresh shopping list data.
 * This replicates much of the logic from ShoppingListPage.
 */
const generateOrRefreshShoppingListLogic = async (familyId, weekId) => {
  try {
    // 1. Fetch the weekly plan
    const planDocRef = doc(db, "families", familyId, "weeklyPlans", weekId);
    const planDocSnap = await getDoc(planDocRef);
    if (!planDocSnap.exists()) {
      return { error: "Aucun planning trouvé pour cette semaine." };
    }
    const weeklyPlan = planDocSnap.data();

    // 2. Extract unique recipe IDs
    const recipeIds = new Set();
    Object.values(weeklyPlan.days).forEach(day => {
      Object.values(day).forEach(recipeId => {
        if (recipeId) recipeIds.add(recipeId);
      });
    });

    if (recipeIds.size === 0) {
      return { error: "Aucune recette dans le planning pour cette semaine." };
    }

    // 3. Fetch details for these recipes
    const recipes = [];
    for (const recipeId of Array.from(recipeIds)) {
      const recipeDocRef = doc(db, "recipes", recipeId);
      const recipeDocSnap = await getDoc(recipeDocRef);
      if (recipeDocSnap.exists()) {
        recipes.push({ id: recipeDocSnap.id, ...recipeDocSnap.data() });
      } else {
        console.warn(`Recipe with ID ${recipeId} not found, skipping for shopping list.`);
      }
    }

    if (recipes.length === 0) {
        return { error: "Détails des recettes introuvables." };
    }

    // 4. Create a raw ingredient list from recipes
    let rawIngredientsList = [];
    recipes.forEach(recipe => {
      if (recipe.ingredients) {
        rawIngredientsList = rawIngredientsList.concat(
          recipe.ingredients.map(ing => ({ ...ing, recipeId: recipe.id, recipeName: recipe.name }))
        );
      }
    });

    if (rawIngredientsList.length === 0) {
      return { error: "Aucun ingrédient trouvé dans les recettes planifiées." };
    }

    // 5. Fetch details for all unique ingredients
    const uniqueIngredientIds = new Set(rawIngredientsList.map(ing => ing.ingredientId));
    const ingredientDetailsMap = new Map();
    for (const ingredientId of Array.from(uniqueIngredientIds)) {
        const ingDocRef = doc(db, "ingredients", ingredientId);
        const ingDocSnap = await getDoc(ingDocRef);
        if (ingDocSnap.exists()) {
            ingredientDetailsMap.set(ingredientId, { id: ingDocSnap.id, ...ingDocSnap.data() });
        } else {
            console.warn(`Ingredient with ID ${ingredientId} not found.`);
            ingredientDetailsMap.set(ingredientId, { id: ingredientId, name: "Ingrédient inconnu", category: "Divers", unit: "unité" });
        }
    }

    // 6. Fetch current stock for the family
    const stockItemsMap = new Map();
    const stockCollectionRef = collection(db, "families", familyId, "stockItems");
    const stockSnapshot = await getDocs(stockCollectionRef);
    stockSnapshot.forEach(docSnap => {
      const stockItem = { id: docSnap.id, ...docSnap.data() };
      stockItemsMap.set(stockItem.ingredientId, stockItem);
    });

    // 7. Aggregate Ingredients
    const aggregatedIngredients = {};
    let totalTheoreticalCost = 0;
    let totalActualCost = 0;

    rawIngredientsList.forEach(rawIng => {
        const detail = ingredientDetailsMap.get(rawIng.ingredientId);
        if (!detail) return;

        const standardUnit = findStandardUnit(rawIng.unit, detail.unit || rawIng.unit);
        const grossQuantityInStandardUnit = convertToStandardUnit(rawIng.quantity, rawIng.unit, standardUnit, detail.conversionFactors || {});

        if (isNaN(grossQuantityInStandardUnit)) {
            console.error(`Could not convert ${rawIng.quantity} ${rawIng.unit} to ${standardUnit} for ${detail.name}`);
            return;
        }

        if (!aggregatedIngredients[detail.id]) {
            aggregatedIngredients[detail.id] = {
                ingredientId: detail.id,
                name: detail.name,
                category: detail.category || "Divers",
                grossQuantity: 0,
                stockQuantity: 0,
                netQuantity: 0,
                unit: standardUnit,
                pricePerUnit: detail.standardPrice || detail.price || 0,
                priceUnit: detail.standardUnit || detail.unit || standardUnit,
                needsPriceInput: !(detail.standardPrice || detail.price),
                priceSource: detail.standardPrice ? 'standard' : (detail.price ? 'custom' : 'none'),
                isChecked: false,
            };
        }
        aggregatedIngredients[detail.id].grossQuantity += grossQuantityInStandardUnit;
    });

    const shoppingListItems = [];
    for (const ingId in aggregatedIngredients) {
        const aggItem = aggregatedIngredients[ingId];
        const stockItem = stockItemsMap.get(ingId);
        let stockQuantityInStandardUnit = 0;

        if (stockItem && stockItem.quantity > 0) {
            stockQuantityInStandardUnit = convertToStandardUnit(stockItem.quantity, stockItem.unit, aggItem.unit, ingredientDetailsMap.get(ingId).conversionFactors || {});
             if (isNaN(stockQuantityInStandardUnit)) {
                console.error(`Could not convert stock ${stockItem.quantity} ${stockItem.unit} to ${aggItem.unit} for ${aggItem.name}`);
                stockQuantityInStandardUnit = 0;
            }
        }
        aggItem.stockQuantity = stockQuantityInStandardUnit;
        aggItem.netQuantity = Math.max(0, aggItem.grossQuantity - aggItem.stockQuantity);

        let itemTheoreticalCost = 0;
        let itemActualCost = 0;

        if (aggItem.pricePerUnit > 0 && aggItem.priceUnit) {
            const priceConversionFactor = getUnitConversionRate(aggItem.priceUnit, aggItem.unit, ingredientDetailsMap.get(ingId).conversionFactors || {});
            if (priceConversionFactor !== null && priceConversionFactor !== 0) {
                const priceInAggUnit = aggItem.pricePerUnit / priceConversionFactor;
                itemTheoreticalCost = aggItem.grossQuantity * priceInAggUnit;
                itemActualCost = aggItem.netQuantity * priceInAggUnit;
            } else if (aggItem.priceUnit === aggItem.unit) {
                 itemTheoreticalCost = aggItem.grossQuantity * aggItem.pricePerUnit;
                 itemActualCost = aggItem.netQuantity * aggItem.pricePerUnit;
            } else {
                console.warn(`Cannot convert price unit ${aggItem.priceUnit} to ${aggItem.unit} for ${aggItem.name}. Cost will be 0.`);
                aggItem.needsPriceInput = true;
            }
        } else {
            aggItem.needsPriceInput = true;
        }

        aggItem.theoreticalItemCost = parseFloat(itemTheoreticalCost.toFixed(2));
        aggItem.actualItemCost = parseFloat(itemActualCost.toFixed(2));

        totalTheoreticalCost += aggItem.theoreticalItemCost;
        totalActualCost += aggItem.actualItemCost;

        if (aggItem.netQuantity > 0) {
             shoppingListItems.push({
                itemId: ingId,
                ingredientId: aggItem.ingredientId,
                name: aggItem.name,
                category: aggItem.category,
                grossQuantity: parseFloat(aggItem.grossQuantity.toFixed(3)),
                stockQuantity: parseFloat(aggItem.stockQuantity.toFixed(3)),
                netQuantity: parseFloat(aggItem.netQuantity.toFixed(3)),
                unit: aggItem.unit,
                theoreticalItemCost: aggItem.theoreticalItemCost,
                actualItemCost: aggItem.actualItemCost,
                needsPriceInput: aggItem.needsPriceInput,
                priceSource: aggItem.priceSource,
                isChecked: false,
            });
        }
    }

    const shoppingListDocData = {
      weekId: weekId,
      familyId: familyId,
      createdAt: Timestamp.now(),
      lastGeneratedAt: Timestamp.now(),
      totalTheoreticalCost: parseFloat(totalTheoreticalCost.toFixed(2)),
      totalActualCost: parseFloat(totalActualCost.toFixed(2)),
      items: shoppingListItems.sort((a, b) => { // Sort by category then name
        const categoryCompare = a.category.localeCompare(b.category);
        if (categoryCompare !== 0) return categoryCompare;
        return a.name.localeCompare(b.name);
      }),
    };

    const shoppingListDocRef = doc(db, "families", familyId, "shoppingLists", weekId);
    await setDoc(shoppingListDocRef, shoppingListDocData, { merge: true });

    return shoppingListDocData;

  } catch (error) {
    console.error("Error in generateOrRefreshShoppingListLogic:", error);
    return { error: error.message || "Erreur interne lors de la génération des données de la liste." };
  }
};


/**
 * Exports a shopping list for a given week to PDF.
 */
export const exportShoppingListToPdf = async (userFamilyId, weekIdString) => {
  try {
    // 1. Generate or Refresh Shopping List Data
    const shoppingListDocumentResult = await generateOrRefreshShoppingListLogic(userFamilyId, weekIdString);

    if (shoppingListDocumentResult.error || !shoppingListDocumentResult.items) {
      return {
        success: false,
        error: shoppingListDocumentResult.error || "Impossible de générer les données de la liste de courses pour le PDF."
      };
    }
    const shoppingListDocument = shoppingListDocumentResult;

    // 2. Replicate PDF Generation Logic
    const weekStartDate = getStartOfWeekFromString(weekIdString);
    const formattedDate = `${weekStartDate.getDate().toString().padStart(2, '0')}/${(weekStartDate.getMonth() + 1).toString().padStart(2, '0')}/${weekStartDate.getFullYear()}`;

    const content = [
      { text: "Liste de Courses", style: "header", alignment: "center" },
      { text: `Semaine du ${formattedDate}`, style: "subheader", alignment: "center", margin: [0, 0, 0, 20] },
    ];

    const itemsByCategory = {};
    shoppingListDocument.items.forEach(item => {
      if (item.netQuantity <= 0) return;
      const category = item.category || "Divers";
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      itemsByCategory[category].push(item);
    });

    // Sort categories alphabetically
    const sortedCategories = Object.keys(itemsByCategory).sort();


    sortedCategories.forEach(category => {
      content.push({ text: category, style: "categoryHeader", margin: [0, 10, 0, 5] });
      const categoryItems = itemsByCategory[category].map(item => {
        const quantityStr = formatQuantityUnit(item.netQuantity, item.unit);
        const costStr = item.actualItemCost > 0 ? `${item.actualItemCost.toFixed(2)}€` : (item.needsPriceInput ? "(prix?)" : "");
        return [
          { text: item.isChecked ? "☒" : "☐", style: "checkbox" },
          { text: item.name, style: "itemName" },
          { text: quantityStr, style: "itemQuantity" },
          { text: costStr, style: "itemCost", alignment: "right" },
        ];
      });
      content.push({
        table: {
          widths: ["auto", "*", "auto", "auto"],
          body: categoryItems,
        },
        layout: "noBorders",
        margin: [10, 0, 0, 5],
      });
    });

    content.push({
        text: `Total à Payer Estimé: ${shoppingListDocument.totalActualCost.toFixed(2)}€`,
        style: "totalCost",
        alignment: "right",
        margin: [0, 20, 0, 5]
    });
    content.push({
        text: `(Coût Théorique Total: ${shoppingListDocument.totalTheoreticalCost.toFixed(2)}€)`,
        style: "totalCostSub",
        alignment: "right",
        margin: [0, 0, 0, 20]
    });


    const docDefinition = {
      content: content,
      styles: {
        header: { fontSize: 22, bold: true, alignment: "center", margin: [0,0,0,10] },
        subheader: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
        categoryHeader: { fontSize: 14, bold: true, background: '#eeeeee', margin: [0, 10, 0, 5] },
        checkbox: { fontSize: 12, margin: [0, 2, 5, 0] },
        itemName: { fontSize: 10 },
        itemQuantity: { fontSize: 10, color: 'gray' },
        itemCost: { fontSize: 10 },
        totalCost: { fontSize: 14, bold: true, margin: [0,10,0,0]},
        totalCostSub: { fontSize: 10, italics: true, color: 'gray'},
      },
      defaultStyle: { font: "Roboto" }
    };

    // 3. Trigger PDF Download
    pdfMake.createPdf(docDefinition).download(`liste_courses_${weekIdString}.pdf`);

    return {
      success: true,
      message: "Le téléchargement du PDF de la liste de courses devrait commencer.",
    };

  } catch (error) {
    console.error("Error exporting shopping list to PDF:", error);
    if (error.error) return { success: false, error: error.error };
    return {
      success: false,
      error: error.message || "Erreur lors de la génération du PDF de la liste de courses.",
    };
  }
};


// Placeholder for future functions
// export const exampleAction = async (params) => { ... }
