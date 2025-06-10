/**
 * Constantes des unités de base pour les conversions.
 * Définit les unités standardisées et leurs facteurs de conversion par rapport à une unité de référence.
 */
export const UNITS = {
  // Masse
  kg: { name: 'kilogramme', type: 'mass', isStandard: true, conversionFactor: 1 },
  g: { name: 'gramme', type: 'mass', conversionFactor: 1000 }, // 1 kg = 1000 g
  mg: { name: 'milligramme', type: 'mass', conversionFactor: 1000000 }, // 1 kg = 1,000,000 mg
  lb: { name: 'livre', type: 'mass', conversionFactor: 2.20462 }, // 1 kg ≈ 2.20462 lb

  // Volume
  l: { name: 'litre', type: 'volume', isStandard: true, conversionFactor: 1 },
  ml: { name: 'millilitre', type: 'volume', conversionFactor: 1000 }, // 1 l = 1000 ml
  cl: { name: 'centilitre', type: 'volume', conversionFactor: 100 }, // 1 l = 100 cl
  dl: { name: 'décilitre', type: 'volume', conversionFactor: 10 }, // 1 l = 10 dl

  // Quantité
  piece: { name: 'pièce', type: 'quantity', isStandard: true, conversionFactor: 1 },
  pack: { name: 'paquet', type: 'quantity', conversionFactor: null }, // Non convertible directement
  box: { name: 'boîte', type: 'quantity', conversionFactor: null }, // Non convertible directement
};

/**
 * Tente de convertir une quantité d'une unité donnée vers l'unité standard
 * définie pour cet ingrédient (ex: convertir des grammes en kilogrammes).
 *
 * @param {number} quantity La quantité à convertir.
 * @param {string} unit L'unité de la quantité fournie (ex: "g", "ml", "piece").
 * @param {string} standardUnit L'unité standard cible.
 * @param {object} conversionFactors Facteurs de conversion spécifiques à l'ingrédient.
 * @returns {number | null} La quantité convertie ou null si la conversion est impossible.
 */
export function convertToStandardUnit(quantity, unit, standardUnit, conversionFactors = {}) {
  if (!quantity || typeof quantity !== 'number' || !unit || !standardUnit) {
    console.error('convertToStandardUnit: Invalid input data.', { quantity, unit, standardUnit, conversionFactors });
    return null;
  }

  // Si l'unité source est la même que l'unité standard
  if (unit === standardUnit) {
    return quantity;
  }

  // Vérifier si un facteur de conversion spécifique à l'ingrédient existe
  const specificConversion = conversionFactors[unit];
  if (specificConversion && typeof specificConversion.conversionFactor === 'number' && specificConversion.conversionFactor > 0) {
    return quantity / specificConversion.conversionFactor;
  }

  // Utiliser les conversions standard définies dans UNITS
  const sourceUnit = UNITS[unit];
  const targetUnit = UNITS[standardUnit];

  if (!sourceUnit || !targetUnit) {
    console.warn(`convertToStandardUnit: Unit '${unit}' or '${standardUnit}' not found in UNITS.`);
    return null;
  }

  if (sourceUnit.type !== targetUnit.type) {
    console.warn(`convertToStandardUnit: Cannot convert between different types (${sourceUnit.type} to ${targetUnit.type}).`);
    return null;
  }

  if (sourceUnit.conversionFactor && targetUnit.conversionFactor) {
    return (quantity * targetUnit.conversionFactor) / sourceUnit.conversionFactor;
  }

  console.warn(`convertToStandardUnit: No valid conversion factor for '${unit}' to '${standardUnit}'.`);
  return null;
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

  let displayUnit = unit;
  if (quantity > 1 || quantity === 0) {
    if (unit === 'piece') displayUnit = 'pièces';
    if (unit === 'box') displayUnit = 'boîtes';
    if (unit === 'pack') displayUnit = 'paquets';
  } else if (quantity === 1) {
    if (unit === 'pièces') displayUnit = 'pièce';
    if (unit === 'boîtes') displayUnit = 'boîte';
    if (unit === 'paquets') displayUnit = 'paquet';
  }

  const formattedQuantity = Number.isInteger(quantity) ? quantity : quantity.toFixed(2).replace(/\.00$/, '');
  return `${formattedQuantity} ${displayUnit}`;
}

/**
 * Trouve l'unité standard pour un ingrédient donné.
 *
 * @param {object} ingredientUnitsData Les données des unités de l'ingrédient.
 * @returns {string | null} La clé de l'unité standard ou null si non trouvée.
 */
export function findStandardUnit(ingredientUnitsData) {
  if (!ingredientUnitsData || typeof ingredientUnitsData !== 'object') {
    return null;
  }
  for (const unitKey in ingredientUnitsData) {
    if (ingredientUnitsData[unitKey]?.isStandard === true) {
      return unitKey;
    }
  }
  console.warn('findStandardUnit: No standard unit found in', ingredientUnitsData);
  return null;
}

/**
 * Obtient le taux de conversion entre deux unités.
 *
 * @param {string} fromUnit L'unité source.
 * @param {string} toUnit L'unité cible.
 * @param {object} conversionFactors Facteurs de conversion spécifiques à l'ingrédient.
 * @returns {number | null} Le taux de conversion ou null si la conversion est impossible.
 */
export function getUnitConversionRate(fromUnit, toUnit, conversionFactors = {}) {
  if (!fromUnit || !toUnit) {
    console.error('getUnitConversionRate: Invalid units provided.', { fromUnit, toUnit });
    return null;
  }

  if (fromUnit === toUnit) {
    return 1;
  }

  // Vérifier les facteurs de conversion spécifiques à l'ingrédient
  const specificConversion = conversionFactors[fromUnit];
  if (specificConversion && typeof specificConversion.conversionFactor === 'number' && specificConversion.conversionFactor > 0) {
    return 1 / specificConversion.conversionFactor;
  }

  // Utiliser les conversions standard définies dans UNITS
  const sourceUnit = UNITS[fromUnit];
  const targetUnit = UNITS[toUnit];

  if (!sourceUnit || !targetUnit) {
    console.warn(`getUnitConversionRate: Unit '${fromUnit}' or '${toUnit}' not found in UNITS.`);
    return null;
  }

  if (sourceUnit.type !== targetUnit.type) {
    console.warn(`getUnitConversionRate: Cannot convert between different types (${sourceUnit.type} to ${targetUnit.type}).`);
    return null;
  }

  if (sourceUnit.conversionFactor && targetUnit.conversionFactor) {
    return targetUnit.conversionFactor / sourceUnit.conversionFactor;
  }

  console.warn(`getUnitConversionRate: No valid conversion factor for '${fromUnit}' to '${toUnit}'.`);
  return null;
}