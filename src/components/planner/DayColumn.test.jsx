import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DayColumn from './DayColumn'; // Corrected path
import '@testing-library/jest-dom';

// Mock MealSlot component
vi.mock('./MealSlot', () => ({
  default: (props) => <div data-testid={`meal-slot-${props.mealType}`}>{props.mealTypeName}</div>
}));

const mockOnOpenModal = vi.fn();
const mockOnDeleteRecipe = vi.fn();

const defaultRecipes = {
  recipe1: { id: 'recipe1', name: 'Recipe 1', nutritionalInfo: { calories: 100, protein: 10, carbs: 20, fat: 5 } },
  recipe2: { id: 'recipe2', name: 'Recipe 2', nutritionalInfo: { calories: 200, protein: 20, carbs: 30, fat: 10 } },
  recipe3: { id: 'recipe3', name: 'Recipe 3', nutritionalInfo: { calories: 300, protein: 30, carbs: 40, fat: 15 } },
  recipeNoNutri: { id: 'recipeNoNutri', name: 'Recipe No Nutri' }, // No nutritionalInfo object
  recipePartialNutri: { id: 'recipePartialNutri', name: 'Recipe Partial', nutritionalInfo: { calories: 50, protein: null, carbs: 10, fat: 0 } },
  recipeZeroNutri: { id: 'recipeZeroNutri', name: 'Recipe Zero', nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  recipeTextNutri: { id: 'recipeTextNutri', name: 'Recipe Text Nutri', nutritionalInfo: { calories: "150", protein: "15", carbs: "25", fat: "8" } },
  recipeInvalidTextNutri: { id: 'recipeInvalidTextNutri', name: 'Recipe Invalid Text Nutri', nutritionalInfo: { calories: "abc", protein: "xyz" } },
};

const renderDayColumn = (meals, recipes = defaultRecipes) => {
  // Ensure weekStartDate is a valid Date object for date-fns functions used in DayColumn
  const validWeekStartDate = new Date();
  validWeekStartDate.setDate(validWeekStartDate.getDate() - validWeekStartDate.getDay() + 1); // Start of current week (Monday)

  render(
    <DayColumn
      dayName="Lundi"
      dayKey="monday"
      meals={meals}
      recipes={recipes}
      onOpenModal={mockOnOpenModal}
      onDeleteRecipe={mockOnDeleteRecipe}
      currentDate={new Date()} // Current date for "isToday" logic
      weekStartDate={validWeekStartDate} // Pass a valid date object
    />
  );
};

describe('DayColumn Nutritional Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const summaryTitleRegex = /Résumé Nutri\. \(Jour\)/i;

  it('Test Case 1: All meals present with full nutritional info', () => {
    const meals = { breakfast: 'recipe1', lunch: 'recipe2', dinner: 'recipe3' };
    renderDayColumn(meals);
    expect(screen.getByText(summaryTitleRegex)).toBeInTheDocument();
    expect(screen.getByText(/Calories: 600 kcal/i)).toBeInTheDocument();
    expect(screen.getByText(/Protéines: 60 g/i)).toBeInTheDocument();
    expect(screen.getByText(/Glucides: 90 g/i)).toBeInTheDocument();
    expect(screen.getByText(/Lipides: 30 g/i)).toBeInTheDocument();
  });

  it('Test Case 2: Some meals missing (null)', () => {
    const meals = { breakfast: 'recipe1', lunch: null, dinner: 'recipe3' };
    renderDayColumn(meals);
    expect(screen.getByText(summaryTitleRegex)).toBeInTheDocument();
    expect(screen.getByText(/Calories: 400 kcal/i)).toBeInTheDocument(); // 100 + 300
    expect(screen.getByText(/Protéines: 40 g/i)).toBeInTheDocument();   // 10 + 30
    expect(screen.getByText(/Glucides: 60 g/i)).toBeInTheDocument();    // 20 + 40
    expect(screen.getByText(/Lipides: 20 g/i)).toBeInTheDocument();     // 5 + 15
  });

  it('Test Case 3: A recipe has missing nutritionalInfo object', () => {
    const meals = { breakfast: 'recipe1', lunch: 'recipeNoNutri', dinner: 'recipe3' };
    renderDayColumn(meals);
    expect(screen.getByText(summaryTitleRegex)).toBeInTheDocument();
    expect(screen.getByText(/Calories: 400 kcal/i)).toBeInTheDocument();
    expect(screen.getByText(/Protéines: 40 g/i)).toBeInTheDocument();
    expect(screen.getByText(/Glucides: 60 g/i)).toBeInTheDocument();
    expect(screen.getByText(/Lipides: 20 g/i)).toBeInTheDocument();
  });

  it('Test Case 4: A recipe has nutritionalInfo but some fields are missing (null) or zero', () => {
    const meals = { breakfast: 'recipe1', lunch: 'recipePartialNutri' }; // recipePartialNutri: cal:50, prot:null, carb:10, fat:0
    renderDayColumn(meals);
    expect(screen.getByText(summaryTitleRegex)).toBeInTheDocument();
    expect(screen.getByText(/Calories: 150 kcal/i)).toBeInTheDocument(); // 100 + 50
    expect(screen.getByText(/Protéines: 10 g/i)).toBeInTheDocument();   // 10 + 0 (null)
    expect(screen.getByText(/Glucides: 30 g/i)).toBeInTheDocument();    // 20 + 10
    expect(screen.getByText(/Lipides: 5 g/i)).toBeInTheDocument();      // 5 + 0
  });

  it('Test Case 5: No meals planned', () => {
    const meals = { breakfast: null, lunch: null, dinner: null };
    renderDayColumn(meals);
    expect(screen.queryByText(summaryTitleRegex)).not.toBeInTheDocument();
  });

  it('Test Case 6: Meals planned, but all have zero or no nutritional info', () => {
    const meals = { breakfast: 'recipeZeroNutri', lunch: 'recipeNoNutri' };
    renderDayColumn(meals);
    expect(screen.queryByText(summaryTitleRegex)).not.toBeInTheDocument();
  });

  it('Test Case 7: Values are correctly summed as numbers (including string numbers from data)', () => {
    const meals = { breakfast: 'recipe1', lunch: 'recipeTextNutri' }; // recipeTextNutri: cal:"150", prot:"15", carb:"25", fat:"8"
    renderDayColumn(meals);
    expect(screen.getByText(summaryTitleRegex)).toBeInTheDocument();
    expect(screen.getByText(/Calories: 250 kcal/i)).toBeInTheDocument(); // 100 + 150
    expect(screen.getByText(/Protéines: 25 g/i)).toBeInTheDocument();   // 10 + 15
    expect(screen.getByText(/Glucides: 45 g/i)).toBeInTheDocument();    // 20 + 25
    expect(screen.getByText(/Lipides: 13 g/i)).toBeInTheDocument();      // 5 + 8
  });

  it('should handle nutritional values as invalid text (e.g. "abc") by treating them as 0', () => {
    const meals = { breakfast: 'recipe1', lunch: 'recipeInvalidTextNutri' }; // recipeInvalidTextNutri: cal:"abc", prot:"xyz"
    renderDayColumn(meals);
    expect(screen.getByText(summaryTitleRegex)).toBeInTheDocument();
    expect(screen.getByText(/Calories: 100 kcal/i)).toBeInTheDocument(); // 100 + 0
    expect(screen.getByText(/Protéines: 10 g/i)).toBeInTheDocument();   // 10 + 0
    expect(screen.getByText(/Glucides: 20 g/i)).toBeInTheDocument();    // 20 + 0
    expect(screen.getByText(/Lipides: 5 g/i)).toBeInTheDocument();      // 5 + 0
  });
});
