import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeSelectionModal from './RecipeSelectionModal'; // Corrected path
import '@testing-library/jest-dom';

// Mock RecipeCard component
vi.mock('./RecipeCard', () => ({
  default: (props) => <div data-testid={`recipe-card-${props.recipeData.id}`}>{props.recipeData.name}</div>
}));

const mockOnClose = vi.fn();
const mockOnRecipeSelect = vi.fn();

const defaultTargetSlotInfo = { day: 'monday', mealType: 'lunch' };

const renderModal = (availableRecipes, currentUserData, initialSearchTerm = "") => {
  render(
    <RecipeSelectionModal
      open={true}
      onClose={mockOnClose}
      onRecipeSelect={mockOnRecipeSelect}
      availableRecipes={availableRecipes}
      targetSlotInfo={defaultTargetSlotInfo}
      currentUserData={currentUserData}
    />
  );
  if (initialSearchTerm) {
    const searchInput = screen.getByPlaceholderText('Rechercher une recette...');
    fireEvent.change(searchInput, { target: { value: initialSearchTerm } });
  }
};

describe('RecipeSelectionModal Allergen Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseRecipeProps = {
    id: '0', // Will be overridden
    description: 'A tasty dish.',
    prepTime: 30,
    servings: 4,
    ingredients: ['item1', 'item2'],
    instructions: 'Cook it well.',
    tags: ['easy'],
    isFamilyRecipe: true, // Default to family recipe for simplicity unless specified
    // photoURL can be omitted for these tests as RecipeCard is mocked
  };

  const recipesList = [
    { ...baseRecipeProps, id: '1', name: 'Nutty Delight', nutritionalInfo: { calories: 300, allergenInfo: 'Contains nuts, soy' } },
    { ...baseRecipeProps, id: '2', name: 'Apple Pie', nutritionalInfo: { calories: 400, allergenInfo: 'Contains gluten, dairy' } },
    { ...baseRecipeProps, id: '3', name: 'Safe Salad', nutritionalInfo: { calories: 200, allergenInfo: 'Gluten-free, Vegan' } },
    { ...baseRecipeProps, id: '4', name: 'Chicken Stir-fry', nutritionalInfo: { calories: 500, allergenInfo: 'Contains soy' } },
    { ...baseRecipeProps, id: '5', name: 'Plain Rice', nutritionalInfo: { calories: 150, allergenInfo: null } }, // Null allergenInfo
    { ...baseRecipeProps, id: '6', name: 'Water', nutritionalInfo: { calories: 0, allergenInfo: '' } }, // Empty string allergenInfo
    { ...baseRecipeProps, id: '7', name: 'Mystery Meat', nutritionalInfo: { calories: 600 } }, // No allergenInfo field
    { ...baseRecipeProps, id: '8', name: 'Peanut Butter Sandwich', nutritionalInfo: { calories: 450, allergenInfo: 'CONTAINS PEANUTS' } }, // Uppercase
  ];

  it('Test Case 1: No user allergies, no recipe allergen info (effectively)', () => {
    const noAllergenRecipes = [
      { ...baseRecipeProps, id: '5', name: 'Plain Rice', nutritionalInfo: { calories: 150, allergenInfo: null } },
      { ...baseRecipeProps, id: '6', name: 'Water', nutritionalInfo: { calories: 0, allergenInfo: '' } },
      { ...baseRecipeProps, id: '7', name: 'Mystery Meat', nutritionalInfo: { calories: 600 } },
    ];
    const noUserAllergies = { dietaryPreferences: { allergies: [] } };
    renderModal(noAllergenRecipes, noUserAllergies);
    expect(screen.getByText('Plain Rice')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.getByText('Mystery Meat')).toBeInTheDocument();
    expect(screen.queryAllByTestId(/recipe-card-/).length).toBe(3);
  });

  it('Test Case 2: User has allergies, recipes have no specific allergen info to match', () => {
    const recipesWithoutTargetAllergenInfo = [
      { ...baseRecipeProps, id: '3', name: 'Safe Salad', nutritionalInfo: { calories: 200, allergenInfo: 'Gluten-free, Vegan' } },
      { ...baseRecipeProps, id: '5', name: 'Plain Rice', nutritionalInfo: { calories: 150, allergenInfo: null } },
      { ...baseRecipeProps, id: '6', name: 'Water', nutritionalInfo: { calories: 0, allergenInfo: '' } },
    ];
    const userWithNutAllergy = { dietaryPreferences: { allergies: ['nuts'] } };
    renderModal(recipesWithoutTargetAllergenInfo, userWithNutAllergy);
    expect(screen.getByText('Safe Salad')).toBeInTheDocument();
    expect(screen.getByText('Plain Rice')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.queryAllByTestId(/recipe-card-/).length).toBe(3);
  });

  it('Test Case 3: User has no allergies, recipes have allergen info', () => {
    const userWithNoAllergies = { dietaryPreferences: { allergies: [] } };
    renderModal(recipesList, userWithNoAllergies);
    recipesList.forEach(recipe => {
      expect(screen.getByText(recipe.name)).toBeInTheDocument();
    });
    expect(screen.queryAllByTestId(/recipe-card-/).length).toBe(recipesList.length);
  });

  it('Test Case 4: User has allergies, one recipe contains a matching allergen', () => {
    const userWithNutAllergy = { dietaryPreferences: { allergies: ['nuts'] } };
    const testRecipes = [recipesList[0], recipesList[2]]; // Nutty Delight, Safe Salad
    renderModal(testRecipes, userWithNutAllergy);
    expect(screen.queryByText('Nutty Delight')).not.toBeInTheDocument();
    expect(screen.getByText('Safe Salad')).toBeInTheDocument();
  });

  it('Test Case 5: User has multiple allergies, recipes match some or all', () => {
    const userWithMultipleAllergies = { dietaryPreferences: { allergies: ['nuts', 'dairy'] } };
    // Nutty Delight (nuts, soy) - FILTERED (nuts)
    // Apple Pie (gluten, dairy) - FILTERED (dairy)
    // Safe Salad (Gluten-free, Vegan) - DISPLAYED
    // Chicken Stir-fry (soy) - DISPLAYED
    renderModal(recipesList, userWithMultipleAllergies);
    expect(screen.queryByText('Nutty Delight')).not.toBeInTheDocument();
    expect(screen.queryByText('Apple Pie')).not.toBeInTheDocument();
    expect(screen.getByText('Safe Salad')).toBeInTheDocument();
    expect(screen.getByText('Chicken Stir-fry')).toBeInTheDocument();
  });

  it('Test Case 6: Case-insensitive allergen matching', () => {
    const userWithNutAllergyCaps = { dietaryPreferences: { allergies: ['NUTS'] } };
    // Nutty Delight (Contains nuts, soy) - Recipe allergen info is mixed case
    // Peanut Butter Sandwich (CONTAINS PEANUTS) - Recipe allergen info is upper case
    const testRecipes = [recipesList[0], recipesList[7]];
    renderModal(testRecipes, userWithNutAllergyCaps);
    expect(screen.queryByText('Nutty Delight')).not.toBeInTheDocument();
    expect(screen.queryByText('Peanut Butter Sandwich')).not.toBeInTheDocument();
  });

  it('Test Case 7: Search term interaction with allergen filter', () => {
    const userWithNutAllergy = { dietaryPreferences: { allergies: ['nuts'] } };
    // Nutty Delight (nuts, name: "Nutty Delight") -> Filtered by allergy
    // Apple Pie (dairy, name: "Apple Pie") -> Filtered by search term
    // Safe Salad (no nuts, name: "Safe Salad") -> Filtered by search term
    // Peanut Butter Sandwich (nuts, name: "Peanut Butter Sandwich") -> Filtered by allergy & search
    // Chicken Stir-fry (soy, name: "Chicken Stir-fry") -> DISPLAYED by search term, not filtered by allergy "nuts"
    const specificRecipes = [
        recipesList[0], // Nutty Delight
        recipesList[1], // Apple Pie
        recipesList[2], // Safe Salad
        recipesList[7], // Peanut Butter Sandwich
        { ...baseRecipeProps, id: '9', name: 'Stir-fry Chicken Special', nutritionalInfo: { calories: 500, allergenInfo: 'Contains soy' } },
    ];
    renderModal(specificRecipes, userWithNutAllergy, "Stir-fry");

    expect(screen.queryByText('Nutty Delight')).not.toBeInTheDocument();
    expect(screen.queryByText('Apple Pie')).not.toBeInTheDocument();
    expect(screen.queryByText('Safe Salad')).not.toBeInTheDocument();
    expect(screen.queryByText('Peanut Butter Sandwich')).not.toBeInTheDocument();
    expect(screen.getByText('Stir-fry Chicken Special')).toBeInTheDocument();
  });

  it('Test Case 8: Recipe allergenInfo is null, empty, or field missing, with user allergies', () => {
    const userWithNutAllergy = { dietaryPreferences: { allergies: ['nuts'] } };
    const testRecipes = [
      recipesList[4], // Plain Rice (allergenInfo: null)
      recipesList[5], // Water (allergenInfo: '')
      recipesList[6], // Mystery Meat (no allergenInfo field)
    ];
    renderModal(testRecipes, userWithNutAllergy);
    expect(screen.getByText('Plain Rice')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.getByText('Mystery Meat')).toBeInTheDocument();
    expect(screen.queryAllByTestId(/recipe-card-/).length).toBe(3);
  });
});
