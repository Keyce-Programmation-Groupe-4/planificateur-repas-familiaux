// Utilitaire pour vérifier les allergies alimentaires
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Vérifie si des membres de la famille ont des allergies aux ingrédients des recettes planifiées
 * @param {string} familyId - ID de la famille
 * @param {Object} weeklyPlanData - Données du planning hebdomadaire
 * @param {Array} availableRecipes - Liste des recettes disponibles
 * @returns {Promise<Object>} Résultat de la vérification des allergies
 */
export const checkAllergies = async (familyId, weeklyPlanData, availableRecipes) => {
  try {
    // Récupérer les membres de la famille avec leurs allergies
    const familyMembersRef = collection(db, "families", familyId, "members");
    const membersSnapshot = await getDocs(familyMembersRef);
    
    const familyMembers = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filtrer les membres qui ont des allergies
    const membersWithAllergies = familyMembers.filter(member => 
      member.allergies && member.allergies.length > 0
    );

    if (membersWithAllergies.length === 0) {
      return {
        hasAllergies: false,
        alerts: [],
        message: "Aucune allergie détectée dans la famille."
      };
    }

    const alerts = [];
    const recipeAllergyMap = new Map();

    // Parcourir tous les jours et repas du planning
    Object.entries(weeklyPlanData.days || {}).forEach(([day, meals]) => {
      Object.entries(meals).forEach(([mealType, recipeId]) => {
        if (recipeId) {
          const recipe = availableRecipes.find(r => r.id === recipeId);
          if (recipe && recipe.ingredients) {
            // Vérifier chaque membre avec allergies
            membersWithAllergies.forEach(member => {
              member.allergies.forEach(allergy => {
                // Vérifier si l'allergène est présent dans les ingrédients
                const hasAllergen = recipe.ingredients.some(ingredient => 
                  ingredient.name.toLowerCase().includes(allergy.toLowerCase()) ||
                  allergy.toLowerCase().includes(ingredient.name.toLowerCase())
                );

                if (hasAllergen) {
                  const alertKey = `${day}-${mealType}-${recipeId}-${member.id}-${allergy}`;
                  if (!recipeAllergyMap.has(alertKey)) {
                    alerts.push({
                      day,
                      mealType,
                      recipeName: recipe.name,
                      recipeId,
                      memberName: member.name,
                      memberId: member.id,
                      allergen: allergy,
                      ingredients: recipe.ingredients.filter(ing => 
                        ing.name.toLowerCase().includes(allergy.toLowerCase()) ||
                        allergy.toLowerCase().includes(ing.name.toLowerCase())
                      ),
                      severity: member.allergySeverity?.[allergy] || "modérée"
                    });
                    recipeAllergyMap.set(alertKey, true);
                  }
                }
              });
            });
          }
        }
      });
    });

    return {
      hasAllergies: alerts.length > 0,
      alerts,
      message: alerts.length > 0 
        ? `${alerts.length} alerte(s) d'allergie détectée(s) dans le planning.`
        : "Aucune allergie détectée dans le planning de la semaine."
    };

  } catch (error) {
    console.error("Erreur lors de la vérification des allergies:", error);
    return {
      hasAllergies: false,
      alerts: [],
      message: "Erreur lors de la vérification des allergies.",
      error: error.message
    };
  }
};

/**
 * Formate le nom du jour en français
 * @param {string} dayKey - Clé du jour (monday, tuesday, etc.)
 * @returns {string} Nom du jour en français
 */
export const formatDayName = (dayKey) => {
  const dayNames = {
    monday: "Lundi",
    tuesday: "Mardi", 
    wednesday: "Mercredi",
    thursday: "Jeudi",
    friday: "Vendredi",
    saturday: "Samedi",
    sunday: "Dimanche"
  };
  return dayNames[dayKey] || dayKey;
};

/**
 * Formate le type de repas en français
 * @param {string} mealType - Type de repas (breakfast, lunch, dinner)
 * @returns {string} Type de repas en français
 */
export const formatMealType = (mealType) => {
  const mealTypes = {
    breakfast: "Petit-déjeuner",
    lunch: "Déjeuner",
    dinner: "Dîner"
  };
  return mealTypes[mealType] || mealType;
};

/**
 * Obtient la couleur de sévérité pour l'affichage
 * @param {string} severity - Niveau de sévérité
 * @returns {string} Couleur correspondante
 */
export const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case "légère":
      return "#FFA726"; // Orange
    case "modérée":
      return "#FF7043"; // Orange foncé
    case "sévère":
      return "#F44336"; // Rouge
    case "critique":
      return "#D32F2F"; // Rouge foncé
    default:
      return "#FF7043"; // Orange foncé par défaut
  }
};

