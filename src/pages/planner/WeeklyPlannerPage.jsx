import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Container, Box, Grid, CircularProgress, Alert, Typography, Skeleton, LinearProgress, Paper, useTheme, Stack } from '@mui/material';
import { DragDropContext } from '@hello-pangea/dnd';
import { isValid } from 'date-fns'; // Import isValid

// --- Firebase Imports --- 
import { db } from '../../firebaseConfig';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp // Import Timestamp class itself for type checking
} from 'firebase/firestore';

// --- Context Import --- 
import { useAuth } from '../../contexts/AuthContext';

// Import the actual components
import WeekNavigator from '../../components/planner/WeekNavigator';
import DayColumn from '../../components/planner/DayColumn';
import RecipeSelectionModal from '../../components/planner/RecipeSelectionModal';

// --- Helper Functions --- 
const getStartOfWeek = (date) => {
  const dateCopy = new Date(date);
  const day = dateCopy.getDay();
  const diff = dateCopy.getDate() - day + (day === 0 ? -6 : 1);
  dateCopy.setHours(0, 0, 0, 0);
  return new Date(dateCopy.setDate(diff));
};

const getWeekId = (date) => {
  const startDate = getStartOfWeek(date);
  const year = startDate.getFullYear();
  const thursday = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const weekNumber = Math.ceil(1 + (thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};
// --- End Helper Functions ---

// --- Define the correct order of days --- 
const orderedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// --- Helper to check for Firestore Timestamp-like structure --- 
const isTimestampLike = (value) => {
    return value && typeof value === 'object' && value.hasOwnProperty('seconds') && value.hasOwnProperty('nanoseconds');
};

function WeeklyPlannerPage() {
  const theme = useTheme();
  const { currentUser, userData, loading: authLoading } = useAuth(); // Destructure authLoading
  const familyId = userData?.familyId;

  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [weeklyPlanData, setWeeklyPlanData] = useState(null);
  const [recipes, setRecipes] = useState({});
  const [isLoading, setIsLoading] = useState(true); // Internal loading for fetch operations
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [targetSlotInfo, setTargetSlotInfo] = useState(null);

  const weekId = getWeekId(currentWeekStart);

  // --- Data Fetching --- 
  useEffect(() => {
    const fetchData = async () => {
      if (!familyId) {
        if (!authLoading) {
            setIsLoading(false); 
        }
        console.warn("Waiting for familyId...");
        return;
      }

      setIsLoading(true);
      setError(null);
      setWeeklyPlanData(null);
      console.log(`Fetching data for family ${familyId}, week: ${weekId}`);

      try {
        // Fetch Recipes
        const recipesQuery = query(collection(db, 'recipes'), where('familyId', '==', familyId));
        const recipesSnapshot = await getDocs(recipesQuery);
        const fetchedRecipes = {};
        recipesSnapshot.forEach(doc => {
          fetchedRecipes[doc.id] = { id: doc.id, ...doc.data() };
        });
        setRecipes(fetchedRecipes);
        console.log(`Fetched ${Object.keys(fetchedRecipes).length} recipes.`);

        // Fetch Weekly Plan
        const planDocRef = doc(db, 'families', familyId, 'weeklyPlans', weekId);
        const planDocSnap = await getDoc(planDocRef);

        if (planDocSnap.exists()) {
          console.log(`Plan found for ${weekId}.`);
          setWeeklyPlanData(planDocSnap.data());
        } else {
          console.log(`No plan found for ${weekId}, using local default.`);
          setWeeklyPlanData(createDefaultPlan(familyId, currentWeekStart, false)); // Use local structure until first save
        }
      } catch (err) {
        console.error("Error fetching data: ", err);
        setError('Erreur lors du chargement des données. Veuillez rafraîchir la page.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
        fetchData();
    }

  }, [weekId, familyId, authLoading]); // Depend on authLoading

  // --- Function to create default plan structure --- 
  const createDefaultPlan = (currentFamilyId, weekStartDate, useServerTimestamps = true) => {
      const startDate = getStartOfWeek(weekStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
      const plan = {
        familyId: currentFamilyId,
        // Use Firestore Timestamps only when preparing for save
        startDate: useServerTimestamps ? Timestamp.fromDate(startDate) : startDate.toISOString(), 
        endDate: useServerTimestamps ? Timestamp.fromDate(endDate) : endDate.toISOString(),
        days: {
          monday: { breakfast: null, lunch: null, dinner: null },
          tuesday: { breakfast: null, lunch: null, dinner: null },
          wednesday: { breakfast: null, lunch: null, dinner: null },
          thursday: { breakfast: null, lunch: null, dinner: null },
          friday: { breakfast: null, lunch: null, dinner: null },
          saturday: { breakfast: null, lunch: null, dinner: null },
          sunday: { breakfast: null, lunch: null, dinner: null },
        }
      };
      if (useServerTimestamps) {
          plan.createdAt = serverTimestamp();
          plan.lastUpdatedAt = serverTimestamp();
      } else {
          plan.isLocal = true; 
      }
      return plan;
  };

  // --- Plan Saving Logic (FINAL DATE TYPE CHECK CORRECTION) --- 
  const savePlan = useCallback(async (planDataToSave, isCreating = false) => {
    if (!familyId || !planDataToSave) return;
    setIsSaving(true);
    setError(null);
    console.log(`Saving plan for week: ${weekId}. Creating: ${isCreating}`);

    const planDocRef = doc(db, 'families', familyId, 'weeklyPlans', weekId);
    
    let dataForFirestore = JSON.parse(JSON.stringify(planDataToSave));

    // --- Validate and Convert Dates --- 
    try {
        // --- startDate --- 
        if (dataForFirestore.startDate && !isTimestampLike(dataForFirestore.startDate) && !(dataForFirestore.startDate instanceof Timestamp)) {
            // If it's not Timestamp-like and not an instance of Timestamp, try converting from JS Date/ISO string
            const jsStartDate = new Date(dataForFirestore.startDate);
            if (!isValid(jsStartDate)) {
                throw new Error(`Invalid startDate value: ${dataForFirestore.startDate}`);
            }
            dataForFirestore.startDate = Timestamp.fromDate(jsStartDate);
            console.log("Converted startDate to Timestamp");
        } else if (!dataForFirestore.startDate && isCreating) {
            // If creating and startDate is missing, calculate it
            const calculatedStartDate = getStartOfWeek(currentWeekStart);
            if (!isValid(calculatedStartDate)) {
                 throw new Error(`Could not calculate valid start date for week: ${weekId}`);
            }
            dataForFirestore.startDate = Timestamp.fromDate(calculatedStartDate);
            console.log("Calculated and set startDate for creation");
        } else if (isTimestampLike(dataForFirestore.startDate)) {
            // If it's already Timestamp-like (from JSON parse), ensure it's a proper Timestamp instance for Firestore
            // This might not be strictly necessary if Firestore handles {seconds, nanos} objects, but safer
            dataForFirestore.startDate = new Timestamp(dataForFirestore.startDate.seconds, dataForFirestore.startDate.nanoseconds);
            console.log("Ensured startDate is Timestamp instance");
        } // If it's already a Timestamp instance, do nothing

        // --- endDate --- 
        if (dataForFirestore.endDate && !isTimestampLike(dataForFirestore.endDate) && !(dataForFirestore.endDate instanceof Timestamp)) {
            // If it's not Timestamp-like and not an instance of Timestamp, try converting from JS Date/ISO string
            const jsEndDate = new Date(dataForFirestore.endDate);
            if (!isValid(jsEndDate)) {
                throw new Error(`Invalid endDate value: ${dataForFirestore.endDate}`);
            }
            dataForFirestore.endDate = Timestamp.fromDate(jsEndDate);
            console.log("Converted endDate to Timestamp");
        } else if (!dataForFirestore.endDate && isCreating) {
            // If creating and endDate is missing, calculate it
            let baseStartDateForCalc;
            // Use the potentially converted/validated startDate
            if (dataForFirestore.startDate instanceof Timestamp) {
                baseStartDateForCalc = dataForFirestore.startDate.toDate();
            } else {
                 // Should not happen if startDate logic above is correct, but handle defensively
                 throw new Error('Cannot calculate endDate without a valid startDate.');
            }

            if (!isValid(baseStartDateForCalc)) {
                 throw new Error('Cannot calculate endDate because startDate is invalid.');
            }

            const calculatedEndDate = new Date(baseStartDateForCalc);
            calculatedEndDate.setDate(baseStartDateForCalc.getDate() + 6);
             if (!isValid(calculatedEndDate)) {
                 throw new Error(`Could not calculate valid end date for week: ${weekId}`);
            }
            dataForFirestore.endDate = Timestamp.fromDate(calculatedEndDate);
            console.log("Calculated and set endDate for creation");
        } else if (isTimestampLike(dataForFirestore.endDate)) {
            // If it's already Timestamp-like (from JSON parse), ensure it's a proper Timestamp instance
            dataForFirestore.endDate = new Timestamp(dataForFirestore.endDate.seconds, dataForFirestore.endDate.nanoseconds);
            console.log("Ensured endDate is Timestamp instance");
        } // If it's already a Timestamp instance, do nothing

    } catch (dateError) {
        console.error("Error processing dates before saving:", dateError);
        setError(`Erreur interne lors de la préparation des dates : ${dateError.message}`);
        setIsSaving(false);
        return; // Abort save
    }
    // --- End Date Validation/Conversion --- 

    dataForFirestore.lastUpdatedAt = serverTimestamp();
    if (isCreating) {
        dataForFirestore.createdAt = serverTimestamp();
        dataForFirestore.familyId = familyId; 
    }
    
    delete dataForFirestore.isLocal;

    try {
      console.log("Attempting to save data:", dataForFirestore);
      await setDoc(planDocRef, dataForFirestore, { merge: !isCreating }); 
      console.log("Plan saved successfully to Firestore.");
      // Update local state optimistically AFTER successful save
      // Use the original planDataToSave to keep JS Dates if they were used locally
      setWeeklyPlanData(planDataToSave); 
    } catch (err) {
      console.error("Error saving plan to Firestore: ", err);
      setError('La sauvegarde a échoué. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }

  }, [familyId, weekId, currentWeekStart]);

  // --- Event Handlers (Remain the same) --- 
  const handleGoToToday = () => {
      if (isLoading || isSaving) return;
      setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  const handleNextWeek = () => {
    if (isLoading || isSaving) return;
    setCurrentWeekStart(prevDate => {
      const nextWeek = new Date(prevDate);
      nextWeek.setDate(prevDate.getDate() + 7);
      return nextWeek;
    });
  };

  const handlePreviousWeek = () => {
    if (isLoading || isSaving) return;
    setCurrentWeekStart(prevDate => {
      const prevWeek = new Date(prevDate);
      prevWeek.setDate(prevDate.getDate() - 7);
      return prevWeek;
    });
  };

  const handleOpenModal = useCallback((day, mealType) => {
    setTargetSlotInfo({ day, mealType });
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setTargetSlotInfo(null);
  }, []);

  const handleRecipeSelected = useCallback((recipeId, day, mealType) => {
    if (!weeklyPlanData || isSaving) return;

    let currentPlan = weeklyPlanData;
    let isNewPlan = !!currentPlan.isLocal; 
    
    const updatedPlan = JSON.parse(JSON.stringify(currentPlan));
    
    if (updatedPlan.days[day]) {
      updatedPlan.days[day][mealType] = recipeId;
      delete updatedPlan.isLocal;
      setWeeklyPlanData(updatedPlan); // Optimistic UI update
      savePlan(updatedPlan, isNewPlan); // Pass isCreating flag
    } else {
        console.error(`Day ${day} not found in plan data!`);
    }
    handleCloseModal();
  }, [weeklyPlanData, savePlan, handleCloseModal, isSaving, familyId, currentWeekStart]);

  const handleDeleteRecipeFromSlot = useCallback((day, mealType) => {
    if (!weeklyPlanData || isSaving) return;
    
    const isLocalPlan = !!weeklyPlanData.isLocal;

    const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData));
    if (updatedPlan.days[day] && updatedPlan.days[day][mealType] !== null) {
      updatedPlan.days[day][mealType] = null;
      setWeeklyPlanData(updatedPlan); // Optimistic UI update
      if (!isLocalPlan) {
          savePlan(updatedPlan, false); // It's an update
      }
    } else {
        console.warn(`No recipe to delete in ${day} - ${mealType}`);
    }
  }, [weeklyPlanData, savePlan, isSaving]);

  // --- Drag and Drop Handler (Remains the same) --- 
  const onDragEnd = useCallback((result) => {
    const { source, destination, draggableId } = result;

    if (!destination || !weeklyPlanData || isSaving) {
      return; 
    }
    if (destination.droppableId === source.droppableId) {
      return; 
    }

    const isLocalPlan = !!weeklyPlanData.isLocal;

    const [sourceDay, sourceMealType] = source.droppableId.split('-');
    const [destDay, destMealType] = destination.droppableId.split('-');
    const recipeIdBeingDragged = draggableId;

    const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData));
    const recipeAtDestination = updatedPlan.days[destDay]?.[destMealType];

    // Perform the swap
    if (updatedPlan.days[destDay]) {
        updatedPlan.days[destDay][destMealType] = recipeIdBeingDragged;
    }
    if (updatedPlan.days[sourceDay]) {
        updatedPlan.days[sourceDay][sourceMealType] = recipeAtDestination !== undefined ? recipeAtDestination : null;
    }

    setWeeklyPlanData(updatedPlan); // Optimistic UI update
    if (!isLocalPlan) {
        savePlan(updatedPlan, false); // It's an update
    }

  }, [weeklyPlanData, savePlan, isSaving]);

  // --- Rendering Logic (Remains the same) --- 
  const renderSkeletons = () => (
    <Grid container spacing={{ xs: 2, md: 3 }}> 
      {orderedDays.map((day) => ( // Use orderedDays for skeletons too
        <Grid item xs={12} sm={6} md={4} lg={12/7} key={day}> 
          <Paper elevation={0} sx={{ p: 2, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
            <Skeleton variant="text" width="50%" sx={{ mb: 2.5, mx: 'auto', height: '2rem' }} />
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3 }}/>
              <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3 }}/>
              <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3 }}/>
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );

  const combinedLoading = authLoading || isLoading;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box 
        sx={{ 
            py: { xs: 2, md: 4 }, 
            px: { xs: 1, sm: 2, md: 3 }, 
            height: 'calc(100vh - 64px)', // Adjust based on actual AppBar height
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: theme.palette.background.default, 
            gap: 2 
        }}
      > 
        
        <WeekNavigator 
          currentWeekStart={currentWeekStart}
          onNextWeek={handleNextWeek}
          onPreviousWeek={handlePreviousWeek}
          onGoToToday={handleGoToToday}
        />

        {/* Loading/Saving Indicators and Errors */} 
        <Box sx={{ height: '4px', mb: 1 }}> 
            {isSaving && <LinearProgress color="secondary" sx={{ height: '4px' }} />} 
        </Box>
        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1, flexShrink: 0 }}>{error}</Alert>}

        {/* Main Content Area */} 
        <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', px: 0.5 }}>
            {combinedLoading ? (
                renderSkeletons()
            ) : !familyId ? (
                <Alert severity="warning" sx={{ m: 2 }}>Veuillez créer ou rejoindre une famille pour utiliser le planificateur.</Alert>
            ) : weeklyPlanData ? (
                <Grid container spacing={{ xs: 2, md: 3 }}> 
                {/* Iterate using the fixed order */} 
                {orderedDays.map((dayKey) => (
                    weeklyPlanData.days[dayKey] && (
                        <Grid item xs={12} sm={6} md={4} lg={12/7} key={dayKey} sx={{ display: 'flex' }}> 
                        <DayColumn 
                            dayName={dayKey.charAt(0).toUpperCase() + dayKey.slice(1)} 
                            dayKey={dayKey} 
                            meals={weeklyPlanData.days[dayKey]}
                            recipes={recipes} 
                            onOpenModal={handleOpenModal}
                            onDeleteRecipe={handleDeleteRecipeFromSlot}
                            currentDate={new Date()} // Pass current date for highlighting today
                            weekStartDate={currentWeekStart}
                        />
                        </Grid>
                    )
                ))}
                </Grid>
            ) : (
                !error && <Typography sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>Aucune donnée de planning disponible pour cette semaine.</Typography> 
            )}
        </Box>

        {/* Modal */} 
        <RecipeSelectionModal 
          open={modalOpen}
          onClose={handleCloseModal}
          onRecipeSelect={handleRecipeSelected}
          targetSlotInfo={targetSlotInfo}
          availableRecipes={Object.values(recipes)} 
        />
      </Box>
    </DragDropContext>
  );
}

export default WeeklyPlannerPage;

