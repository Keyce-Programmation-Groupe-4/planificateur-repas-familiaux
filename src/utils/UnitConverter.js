// /home/ubuntu/meal_planner/app-react/src/utils/unitConverter.js

/**
 * Tente de convertir une quantité d'une unité donnée vers l'unité standard
 * définie pour cet ingrédient (ex: convertir des grammes en kilogrammes).
 *
 * @param {number} quantity La quantité à convertir.
 * @param {string} unit L'unité de la quantité fournie (ex: "g", "ml", "piece").
 * @param {object} ingredientUnitsData L'objet "units" provenant du document ingrédient Firestore.
 *                                    Ex: { kg: {isStandard: true, ...}, g: {conversionFactor: 1000, ...} }
 * @returns {{standardQuantity: number, standardUnit: string} | null} Un objet contenant la quantité convertie
 *          et l'unité standard correspondante, ou null si la conversion est impossible
 *          (unité inconnue, pas de facteur de conversion, pas d'unité standard définie).
 */
export function convertToStandardUnit(quantity, unit, ingredientUnitsData) {
  if (!ingredientUnitsData || typeof ingredientUnitsData !== 'object' || !unit || typeof quantity !== 'number') {
    console.error("convertToStandardUnit: Invalid input data.", { quantity, unit, ingredientUnitsData });
    return null;
  }

  const unitData = ingredientUnitsData[unit];

  if (!unitData) {
    console.warn(`convertToStandardUnit: Unit '${unit}' not found in ingredient data.`);
    return null; // Unité source inconnue pour cet ingrédient
  }

  // Si l'unité fournie est déjà l'unité standard pour cet ingrédient
  if (unitData.isStandard) {
    return { standardQuantity: quantity, standardUnit: unit };
  }

  // Trouver l'unité standard correspondante (même type de mesure, ex: poids, volume)
  // On suppose pour l'instant qu'il n'y a qu'une seule unité standard par ingrédient
  // Une logique plus complexe pourrait être nécessaire si un ingrédient a un standard poids ET volume
  let standardUnitKey = null;
  let standardUnitData = null;
  for (const key in ingredientUnitsData) {
    if (ingredientUnitsData[key].isStandard) {
      standardUnitKey = key;
      standardUnitData = ingredientUnitsData[key];
      break;
    }
  }

  if (!standardUnitKey || !standardUnitData) {
    console.warn(`convertToStandardUnit: No standard unit defined for this ingredient.`);
    return null; // Pas d'unité standard définie
  }

  // Vérifier si l'unité source a un facteur de conversion vers l'unité standard
  if (typeof unitData.conversionFactor === 'number' && unitData.conversionFactor > 0) {
    const convertedQuantity = quantity / unitData.conversionFactor;
    return { standardQuantity: convertedQuantity, standardUnit: standardUnitKey };
  } else {
    // Pas de facteur de conversion défini pour cette unité (ex: "piece")
    console.log(`convertToStandardUnit: Unit '${unit}' is not directly convertible to '${standardUnitKey}'.`);
    return null;
  }
}

/**
 * Formate une quantité et une unité pour l'affichage.
 * Gère les pluriels simples pour les unités courantes.
 *
 * @param {number} quantity La quantité.
 * @param {string} unit L'unité.
 * @returns {string} La chaîne formatée (ex: "5 kg", "1 g", "10 pièces").
 */
export function formatQuantityUnit(quantity, unit) {
    if (typeof quantity !== 'number' || !unit) {
        return '';
    }

    // Gestion simple du pluriel pour certaines unités
    let displayUnit = unit;
    if (quantity > 1) {
        if (unit === 'piece') displayUnit = 'pièces';
        // Ajouter d'autres règles de pluriel si nécessaire (ex: 'boite' -> 'boites')
    }

    // Formatage du nombre (peut être amélioré avec toLocaleString)
    const formattedQuantity = Number.isInteger(quantity) ? quantity : quantity.toFixed(2).replace(/\.00$/, '');

    return `${formattedQuantity} ${displayUnit}`;
}

