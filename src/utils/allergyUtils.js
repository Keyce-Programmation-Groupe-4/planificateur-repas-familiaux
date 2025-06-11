// src/utils/allergyUtils.js
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Checks for allergies in a given meal plan for a specific family.
 *
 * @param {string} familyId - The ID of the family.
 * @param {object} planData - The weekly meal plan data.
 * @param {Array<object>} availableRecipes - Array of all available recipe objects, including their ingredients.
 * @returns {Promise<object>} An object containing allergy information:
 *                            { hasAllergies: boolean, alerts: Array<object>, message: string }
 *                            Each alert object: { meal: string, day: string, recipeName: string, memberName: string, allergy: string, severity: string }
 */
export const checkAllergies = async (familyId, planData, availableRecipes) => {
  let hasAllergies = false;
  const alerts = [];
  let message = "";

  if (!familyId || !planData || !planData.days || !availableRecipes) {
    console.error("Invalid parameters for allergy check.");
    return { hasAllergies: false, alerts: [], message: "Données invalides pour la vérification des allergies." };
  }

  try {
    // 1. Fetch family document to get memberUids
    const familyDocRef = doc(db, "families", familyId);
    const familyDocSnap = await getDoc(familyDocRef);

    if (!familyDocSnap.exists()) {
      console.error(`Family document with ID ${familyId} not found.`);
      return { hasAllergies: false, alerts: [], message: "Données de la famille introuvables pour la vérification des allergies." };
    }
    const familyData = familyDocSnap.data();
    const memberUids = familyData.memberUids || [];

    if (memberUids.length === 0) {
      // No members, so no allergies to check against.
      return { hasAllergies: false, alerts: [], message: "Aucun membre trouvé dans la famille pour vérifier les allergies." };
    }

    // 2. Fetch each user document based on memberUids
    const memberPromises = memberUids.map(uid => getDoc(doc(db, "users", uid)));
    const memberDocsSnap = await Promise.all(memberPromises);

    const familyMembers = memberDocsSnap.map(docSnap => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        return {
          id: docSnap.id, // User's UID
          name: userData.displayName || userData.personalInfo?.firstName || "Membre inconnu",
          // Assuming dietaryRestrictions array stores allergy strings directly
          allergies: userData.dietaryPreferences?.allergies || userData.dietaryRestrictions || [],
          // Assuming allergySeveritiesMap is { "allergenName": "severityLevel" }
          allergySeveritiesMap: userData.dietaryPreferences?.allergySeverities || userData.allergySeveritiesMap || {}
        };
      }
      return null;
    }).filter(member => member !== null && member.allergies && member.allergies.length > 0);

    if (familyMembers.length === 0) {
      // No members with allergies found.
      return { hasAllergies: false, alerts: [], message: "Aucun membre avec des allergies spécifiées trouvé." };
    }

    const days = Object.keys(planData.days);

    for (const day of days) {
      const meals = planData.days[day];
      if (!meals) continue;

      for (const mealType of Object.keys(meals)) { // breakfast, lunch, dinner
        const recipeId = meals[mealType];
        if (!recipeId) continue;

        const recipe = availableRecipes.find(r => r.id === recipeId);
        if (!recipe || !recipe.ingredientsList || recipe.ingredientsList.length === 0) {
          continue;
        }

        familyMembers.forEach(member => {
          member.allergies.forEach(allergy => {
            // Check if any ingredient name contains the allergy string.
            // This is a simple substring check. More sophisticated matching might be needed.
            const offendingIngredients = recipe.ingredientsList.filter(ingredient =>
              ingredient && ingredient.ingredientName && typeof ingredient.ingredientName === 'string' &&
              ingredient.ingredientName.toLowerCase().includes(allergy.toLowerCase())
            );

            if (offendingIngredients.length > 0) {
              hasAllergies = true;
              const severity = (member.allergySeveritiesMap && member.allergySeveritiesMap[allergy.toLowerCase()]) || "modérée";
              alerts.push({
                day: day, // Keep original key for now, format later if needed by UI
                mealType: mealType,
                recipeName: recipe.name,
                memberName: member.name,
                allergy: allergy,
                severity: severity,
                ingredients: offendingIngredients
              });
            }
          });
        });
      }
    }

    if (hasAllergies) {
      const uniqueAlerts = alerts.reduce((acc, current) => {
        const x = acc.find(item =>
            item.recipeName === current.recipeName &&
            item.memberName === current.memberName &&
            item.allergy === current.allergy &&
            item.day === current.day && // Ensure day is part of uniqueness
            item.meal === current.meal  // Ensure meal is part of uniqueness
        );
        if (!x) {
            return acc.concat([current]);
        } else {
            return acc;
        }
      }, []);

      message = `Attention ! ${uniqueAlerts.length} conflit(s) d'allergie(s) détecté(s) dans le planning.`;
      return { hasAllergies: true, alerts: uniqueAlerts, message };
    } else {
      message = "Aucun conflit d'allergie détecté dans le planning.";
      return { hasAllergies: false, alerts: [], message };
    }

  } catch (error) {
    console.error("Erreur lors de la vérification des allergies :", error);
    return { hasAllergies: false, alerts: [], message: `Erreur lors de la vérification des allergies: ${error.message}` };
  }
};


// Helper functions (potentially for UI display of alerts)
export const formatDayName = (dayKey) => {
  const dayNames = {
    monday: "Lundi",
    tuesday: "Mardi",
    wednesday: "Mercredi",
    thursday: "Jeudi",
    friday: "Vendredi",
    saturday: "Samedi",
    sunday: "Dimanche",
  };
  return dayNames[dayKey.toLowerCase()] || dayKey;
};

export const formatMealType = (mealKey) => {
  const mealNames = {
    breakfast: "Petit-déjeuner",
    lunch: "Déjeuner",
    dinner: "Dîner",
  };
  return mealNames[mealKey.toLowerCase()] || mealKey;
};

export const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case "sévère":
    case "severe":
      return "red";
    case "modérée":
    case "moderate":
      return "orange";
    case "faible":
    case "low":
      return "green";
    default:
      return "grey";
  }
};
