import React, { useState, useEffect, useCallback, useContext } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { Box, Grid, CircularProgress, Typography, Alert } from '@mui/material';
import { doc, getDoc, setDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { startOfWeek, addDays, subDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { db } from '../../firebaseConfig'; // Adjust path as needed
import { AuthContext } from '../../context/AuthContext'; // Adjust path as needed
import WeekNavigator from './WeekNavigator';
import DayColumn from './DayColumn';
import RecipeListPanel from './RecipeListPanel';

// Helper function to get the week ID (e.g., YYYY-Www)
const getWeekId = (date) => {
  return format(date, 'yyyy-"W"II', { locale: fr, weekStartsOn: 1 }); // ISO week number
};

const WeeklyPlannerPage = () => {
  const { currentUser, familyId } = useContext(AuthContext); // Get user and family info
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [error, setError] = useState(null);

  const daysOfWeek = [
    { key: 'monday', name: 'Lundi' },
    { key: 'tuesday', name: 'Mardi' },
    { key: 'wednesday', name: 'Mercredi' },
    { key: 'thursday', name: 'Jeudi' },
    { key: 'friday', name: 'Vendredi' },
    { key: 'saturday', name: 'Samedi' },
    { key: 'sunday', name: 'Dimanche' },
  ];

  // Function to fetch or create a weekly plan
  const fetchWeeklyPlan = useCallback(async (weekStartDate) => {
    if (!familyId) return;
    setLoadingPlan(true);
    setError(null);
    const weekId = getWeekId(weekStartDate);
    const planRef = doc(db, 'families', familyId, 'weeklyPlans', weekId);

    try {
      const docSnap = await getDoc(planRef);
      if (docSnap.exists()) {
        setWeeklyPlan(docSnap.data());
      } else {
        // Create a new empty plan structure if it doesn't exist
        const newPlan = {
          familyId: familyId,
          startDate: Timestamp.fromDate(weekStartDate),
          endDate: Timestamp.fromDate(addDays(weekStartDate, 6)),
          createdAt: Timestamp.now(),
          lastUpdatedAt: Timestamp.now(),
          days: daysOfWeek.reduce((acc, day) => {
            acc[day.key] = { breakfast: null, lunch: null, dinner: null };
            return acc;
          }, {}),
        };
        await setDoc(planRef, newPlan); // Save the new empty plan
        setWeeklyPlan(newPlan);
      }
    } catch (err) {
      console.error("Error fetching/creating weekly plan:", err);
      setError("Erreur lors du chargement du planning de la semaine.");
      setWeeklyPlan(null); // Reset plan on error
    }
    setLoadingPlan(false);
  }, [familyId]);

  // Function to fetch recipes
  const fetchRecipes = useCallback(async () => {
    if (!currentUser) return; // Or use familyId if recipes are family-specific
    setLoadingRecipes(true);
    try {
      // Assuming recipes are stored in a top-level 'recipes' collection
      // and linked via 'createdByUserId' or 'familyId'. Adjust query as needed.
      // Example: Fetch recipes created by the current user
      const q = query(collection(db, 'recipes'), where('createdByUserId', '==', currentUser.uid));
      // OR: Fetch recipes belonging to the family (if familyId is stored on recipes)
      // const q = query(collection(db, 'recipes'), where('familyId', '==', familyId));

      const querySnapshot = await getDocs(q);
      const recipesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecipes(recipesData);
    } catch (err) {
      console.error("Error fetching recipes:", err);
      setError("Erreur lors du chargement des recettes.");
    }
    setLoadingRecipes(false);
  }, [currentUser, familyId]); // Add familyId if used in query

  // Initial data fetch
  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  useEffect(() => {
    fetchWeeklyPlan(currentWeekStart);
  }, [currentWeekStart, fetchWeeklyPlan]);

  // --- Drag and Drop Logic ---
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a valid droppable area
    if (!destination) {
      return;
    }

    // Dropped in the same place
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceDroppableId = source.droppableId;
    const destinationDroppableId = destination.droppableId;
    const recipeId = draggableId;

    const updatedPlan = JSON.parse(JSON.stringify(weeklyPlan)); // Deep copy

    // Find the recipe object from the list
    const draggedRecipe = recipes.find(r => r.id === recipeId);
    if (!draggedRecipe) {
        console.error("Dragged recipe not found in list!");
        return;
    }
    const recipeDataForPlan = { recipeId: draggedRecipe.id, name: draggedRecipe.name, photoURL: draggedRecipe.photoURL || null }; // Store essential info

    // --- Logic --- 
    // 1. Dragging from Recipe List to a Meal Slot
    if (sourceDroppableId === 'recipeList' && destinationDroppableId !== 'recipeList') {
      const [dayKey, mealType] = destinationDroppableId.split('-'); // e.g., "monday-lunch"
      if (updatedPlan.days[dayKey]) {
        updatedPlan.days[dayKey][mealType] = recipeDataForPlan;
      }
    }
    // 2. Moving from one Meal Slot to another Meal Slot
    else if (sourceDroppableId !== 'recipeList' && destinationDroppableId !== 'recipeList') {
      const [sourceDayKey, sourceMealType] = sourceDroppableId.split('-');
      const [destDayKey, destMealType] = destinationDroppableId.split('-');

      // Get the recipe being moved (it should already be in the source slot)
      const movingRecipe = updatedPlan.days[sourceDayKey]?.[sourceMealType];
      
      if (movingRecipe) {
          // Clear the source slot
          updatedPlan.days[sourceDayKey][sourceMealType] = null;
          // Place in the destination slot
          if (updatedPlan.days[destDayKey]) {
              updatedPlan.days[destDayKey][destMealType] = movingRecipe;
          }
      } else {
          console.warn("Recipe not found in source slot during move");
          // If somehow source is empty, maybe treat as adding from list?
          // This case might indicate a state inconsistency.
          if (updatedPlan.days[destDayKey]) {
             updatedPlan.days[destDayKey][destMealType] = recipeDataForPlan; // Fallback: add the recipe found via draggableId
          }
      }
    }
    // 3. Dragging from a Meal Slot back to the Recipe List (or a designated trash area - not implemented here)
    // This effectively removes the recipe from the plan.
    else if (sourceDroppableId !== 'recipeList' && destinationDroppableId === 'recipeList') {
        const [sourceDayKey, sourceMealType] = sourceDroppableId.split('-');
        if (updatedPlan.days[sourceDayKey]) {
            updatedPlan.days[sourceDayKey][sourceMealType] = null;
        }
    }
    // (Add case for dragging to trash if needed)

    // Update state locally immediately for responsiveness
    updatedPlan.lastUpdatedAt = Timestamp.now();
    setWeeklyPlan(updatedPlan);

    // Save the updated plan to Firestore
    try {
      const weekId = getWeekId(currentWeekStart);
      const planRef = doc(db, 'families', familyId, 'weeklyPlans', weekId);
      await setDoc(planRef, updatedPlan, { merge: true }); // Use merge to be safe, though overwriting might be fine if state is source of truth
    } catch (err) {
      console.error("Error saving updated plan:", err);
      setError("Erreur lors de la sauvegarde des modifications du planning.");
      // Optionally revert state or notify user
      fetchWeeklyPlan(currentWeekStart); // Refetch to revert to last saved state
    }
  };

  // --- Navigation --- 
  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => subDays(prev, 7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
  };

  // --- Render Logic --- 
  if (!currentUser || !familyId) {
    return <Alert severity="warning">Veuillez vous connecter et rejoindre ou créer une famille pour accéder au planning.</Alert>;
  }

  if (loadingRecipes || loadingPlan) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box sx={{ p: 2 }}>
        <WeekNavigator
          currentWeekStart={currentWeekStart}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
        />

        <Grid container spacing={2}>
          {/* Recipe List Panel */} 
          <Grid item xs={12} md={3}>
            <RecipeListPanel recipes={recipes} />
          </Grid>

          {/* Weekly Planner Grid */} 
          <Grid item xs={12} md={9}>
            <Grid container spacing={1} sx={{ height: '100%' }}>
              {daysOfWeek.map(day => (
                <Grid item xs={12} sm={6} md key={day.key} sx={{ minWidth: '150px' /* Ensure columns don't get too narrow */ }}>
                  <DayColumn
                    dayName={day.name}
                    dayKey={day.key}
                    meals={weeklyPlan?.days?.[day.key] || { breakfast: null, lunch: null, dinner: null }} // Provide default empty meals
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </DragDropContext>
  );
};

export default WeeklyPlannerPage;

