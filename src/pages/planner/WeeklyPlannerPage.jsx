"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  Container,
  Box,
  Grid,
  Alert,
  Typography,
  Skeleton,
  LinearProgress,
  Paper,
  useTheme,
  Stack,
  Button,
  Tooltip,
  Fade,
  Zoom,
  Chip,
  IconButton,
  alpha,
  Snackbar,
  CircularProgress as ButtonCircularProgress, // Renamed to avoid conflict
} from "@mui/material"
import { DragDropContext } from "@hello-pangea/dnd"
import { isValid } from "date-fns"
import {
  ShoppingCart as ShoppingCartIcon,
  Today as TodayIcon,
  AutoAwesome as AutoAwesomeIcon,
  NotificationsActive as NotifyIcon, // Icon for notification button
} from "@mui/icons-material"

// --- Firebase Imports ---
import { db, functions } from "../../firebaseConfig" // Import functions
import { httpsCallable } from "firebase/functions" // Import httpsCallable
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  orderBy, // Added for sorting
  limit, // Added for potential performance optimization
} from "firebase/firestore"

// --- Context Import ---
import { useAuth } from "../../contexts/AuthContext"

// Import the actual components
import WeekNavigator from "../../components/planner/WeekNavigator"
import DayColumn from "../../components/planner/DayColumn"
import RecipeSelectionModal from "../../components/planner/RecipeSelectionModal"

// Ajouter après les imports existants
import { useSwipeable } from "react-swipeable"

// --- Helper Functions ---
const getStartOfWeek = (date) => {
  const dateCopy = new Date(date)
  const day = dateCopy.getDay()
  const diff = dateCopy.getDate() - day + (day === 0 ? -6 : 1)
  dateCopy.setHours(0, 0, 0, 0)
  return new Date(dateCopy.setDate(diff))
}

const getWeekId = (date) => {
  const startDate = getStartOfWeek(date)
  const year = startDate.getFullYear()
  const thursday = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 3)
  const firstThursday = new Date(thursday.getFullYear(), 0, 4)
  const weekNumber = Math.ceil(1 + (thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000))
  return `${year}-W${String(weekNumber).padStart(2, "0")}`
}

const orderedDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
const dayNames = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
}

const isTimestampLike = (value) => {
  return value && typeof value === "object" && value.hasOwnProperty("seconds") && value.hasOwnProperty("nanoseconds")
}

function WeeklyPlannerPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { currentUser, userData, loading: authLoading } = useAuth()
  const familyId = userData?.familyId
  const isFamilyAdmin = userData?.familyRole === "Admin"

  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()))
  const [weeklyPlanData, setWeeklyPlanData] = useState(null)
  // State to hold all recipes available for planning (family + public)
  const [availableRecipesForPlanning, setAvailableRecipesForPlanning] = useState([]) 
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isNotifying, setIsNotifying] = useState(false) // State for notification loading
  const [notificationResult, setNotificationResult] = useState({ open: false, message: "", severity: "info" })

  const [modalOpen, setModalOpen] = useState(false)
  const [targetSlotInfo, setTargetSlotInfo] = useState(null)

  // Dans le composant WeeklyPlannerPage, ajouter après les états existants :
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isLoading && !isSaving) {
        handleNextWeek()
      }
    },
    onSwipedRight: () => {
      if (!isLoading && !isSaving) {
        handlePreviousWeek()
      }
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  })

  const weekId = getWeekId(currentWeekStart)

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      if (!familyId) {
        if (!authLoading) {
          setIsLoading(false)
        }
        console.warn("Waiting for familyId...")
        return
      }
      setIsLoading(true)
      setError(null)
      setWeeklyPlanData(null)
      setAvailableRecipesForPlanning([]) // Reset recipes on week change

      console.log(`Fetching data for family ${familyId}, week: ${weekId}`)

      try {
        // Fetch recipes available for planning
        const recipesRef = collection(db, "recipes")
        
        // Query 1: Get all recipes belonging to the user's family (sorted by creation date)
        const familyRecipesQuery = query(
            recipesRef, 
            where("familyId", "==", familyId), 
            orderBy("createdAt", "desc")
        );
        
        // Query 2: Get all public recipes NOT belonging to the user's family (sorted by creation date)
        // Note: Firestore doesn't support != directly in compound queries easily.
        // We fetch all public recipes and filter client-side, or fetch all and categorize.
        // Let's fetch all public and categorize.
        const publicRecipesQuery = query(
            recipesRef, 
            where("visibility", "==", "public"), 
            orderBy("createdAt", "desc")
            // limit(100) // Consider limiting public recipes for performance
        );

        const [familySnapshot, publicSnapshot] = await Promise.all([
            getDocs(familyRecipesQuery),
            getDocs(publicRecipesQuery)
        ]);

        const familyRecipes = familySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isFamilyRecipe: true }));
        const publicRecipes = publicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isFamilyRecipe: doc.data().familyId === familyId }));

        // Combine and prioritize: Family recipes first, then external public recipes
        // Remove duplicates (public recipes from the family might appear in both lists)
        const combinedRecipesMap = new Map();
        familyRecipes.forEach(recipe => combinedRecipesMap.set(recipe.id, recipe));
        // Add public recipes only if they are not already in the map (i.e., not from the family)
        publicRecipes.forEach(recipe => {
            if (!combinedRecipesMap.has(recipe.id)) {
                combinedRecipesMap.set(recipe.id, recipe); // isFamilyRecipe will be false here
            }
        });

        const combinedRecipes = Array.from(combinedRecipesMap.values());
        
        // Sort: Family recipes first, then external public, both sorted by creation date (desc)
        combinedRecipes.sort((a, b) => {
            if (a.isFamilyRecipe && !b.isFamilyRecipe) return -1; // a (family) comes before b (public)
            if (!a.isFamilyRecipe && b.isFamilyRecipe) return 1;  // b (family) comes before a (public)
            // If both are family or both are public, sort by creation date (newest first)
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA; 
        });

        setAvailableRecipesForPlanning(combinedRecipes);
        console.log(`Fetched and combined ${combinedRecipes.length} recipes for planning.`);

        // Fetch the weekly plan
        const planDocRef = doc(db, "families", familyId, "weeklyPlans", weekId)
        const planDocSnap = await getDoc(planDocRef)

        if (planDocSnap.exists()) {
          console.log(`Plan found for ${weekId}.`)
          setWeeklyPlanData(planDocSnap.data())
        } else {
          console.log(`No plan found for ${weekId}, using local default.`)
          setWeeklyPlanData(createDefaultPlan(familyId, currentWeekStart, false))
        }
      } catch (err) {
        console.error("Error fetching data: ", err)
        setError("Erreur lors du chargement des données. Veuillez rafraîchir la page.")
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading) {
      fetchData()
    }
  }, [weekId, familyId, authLoading]) // Rerun when week or family changes

  // --- Function to create default plan structure ---
  const createDefaultPlan = (currentFamilyId, weekStartDate, useServerTimestamps = true) => {
    const startDate = getStartOfWeek(weekStartDate)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)

    const plan = {
      familyId: currentFamilyId,
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
      },
    }

    if (useServerTimestamps) {
      plan.createdAt = serverTimestamp()
      plan.lastUpdatedAt = serverTimestamp()
    } else {
      plan.isLocal = true
    }

    return plan
  }

  // --- Plan Saving Logic ---
  const savePlan = useCallback(
    async (planDataToSave, isCreating = false) => {
      if (!familyId || !planDataToSave) return

      setIsSaving(true)
      setError(null)
      console.log(`Saving plan for week: ${weekId}. Creating: ${isCreating}`)

      const planDocRef = doc(db, "families", familyId, "weeklyPlans", weekId)
      const dataForFirestore = JSON.parse(JSON.stringify(planDataToSave))

      try {
        if (
          dataForFirestore.startDate &&
          !isTimestampLike(dataForFirestore.startDate) &&
          !(dataForFirestore.startDate instanceof Timestamp)
        ) {
          const jsStartDate = new Date(dataForFirestore.startDate)
          if (!isValid(jsStartDate)) throw new Error(`Invalid startDate value: ${dataForFirestore.startDate}`)
          dataForFirestore.startDate = Timestamp.fromDate(jsStartDate)
          console.log("Converted startDate to Timestamp")
        } else if (!dataForFirestore.startDate && isCreating) {
          const calculatedStartDate = getStartOfWeek(currentWeekStart)
          if (!isValid(calculatedStartDate)) throw new Error(`Could not calculate valid start date for week: ${weekId}`)
          dataForFirestore.startDate = Timestamp.fromDate(calculatedStartDate)
          console.log("Calculated and set startDate for creation")
        } else if (isTimestampLike(dataForFirestore.startDate)) {
          dataForFirestore.startDate = new Timestamp(
            dataForFirestore.startDate.seconds,
            dataForFirestore.startDate.nanoseconds,
          )
          console.log("Ensured startDate is Timestamp instance")
        }

        if (
          dataForFirestore.endDate &&
          !isTimestampLike(dataForFirestore.endDate) &&
          !(dataForFirestore.endDate instanceof Timestamp)
        ) {
          const jsEndDate = new Date(dataForFirestore.endDate)
          if (!isValid(jsEndDate)) throw new Error(`Invalid endDate value: ${dataForFirestore.endDate}`)
          dataForFirestore.endDate = Timestamp.fromDate(jsEndDate)
          console.log("Converted endDate to Timestamp")
        } else if (!dataForFirestore.endDate && isCreating) {
          let baseStartDateForCalc
          if (dataForFirestore.startDate instanceof Timestamp) {
            baseStartDateForCalc = dataForFirestore.startDate.toDate()
          } else {
            throw new Error("Cannot calculate endDate without a valid startDate.")
          }
          if (!isValid(baseStartDateForCalc)) throw new Error("Cannot calculate endDate because startDate is invalid.")
          const calculatedEndDate = new Date(baseStartDateForCalc)
          calculatedEndDate.setDate(baseStartDateForCalc.getDate() + 6)
          if (!isValid(calculatedEndDate)) throw new Error(`Could not calculate valid end date for week: ${weekId}`)
          dataForFirestore.endDate = Timestamp.fromDate(calculatedEndDate)
          console.log("Calculated and set endDate for creation")
        } else if (isTimestampLike(dataForFirestore.endDate)) {
          dataForFirestore.endDate = new Timestamp(
            dataForFirestore.endDate.seconds,
            dataForFirestore.endDate.nanoseconds,
          )
          console.log("Ensured endDate is Timestamp instance")
        }
      } catch (dateError) {
        console.error("Error processing dates before saving:", dateError)
        setError(`Erreur interne lors de la préparation des dates : ${dateError.message}`)
        setIsSaving(false)
        return
      }

      dataForFirestore.lastUpdatedAt = serverTimestamp()
      if (isCreating) {
        dataForFirestore.createdAt = serverTimestamp()
        dataForFirestore.familyId = familyId
      }
      delete dataForFirestore.isLocal

      try {
        console.log("Attempting to save data:", dataForFirestore)
        await setDoc(planDocRef, dataForFirestore, { merge: !isCreating })
        console.log("Plan saved successfully to Firestore.")
        setWeeklyPlanData(planDataToSave)

        // Show success feedback
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      } catch (err) {
        console.error("Error saving plan to Firestore: ", err)
        setError("La sauvegarde a échoué. Veuillez réessayer.")
      } finally {
        setIsSaving(false)
      }
    },
    [familyId, weekId, currentWeekStart],
  )

  // --- Event Handlers ---
  const handleGoToToday = () => {
    if (isLoading || isSaving || isNotifying) return
    setCurrentWeekStart(getStartOfWeek(new Date()))
  }

  const handleNextWeek = () => {
    if (isLoading || isSaving || isNotifying) return
    setCurrentWeekStart((prevDate) => {
      const nextWeek = new Date(prevDate)
      nextWeek.setDate(prevDate.getDate() + 7)
      return nextWeek
    })
  }

  const handlePreviousWeek = () => {
    if (isLoading || isSaving || isNotifying) return
    setCurrentWeekStart((prevDate) => {
      const prevWeek = new Date(prevDate)
      prevWeek.setDate(prevDate.getDate() - 7)
      return prevWeek
    })
  }

  const handleOpenModal = useCallback((day, mealType) => {
    console.log(`Opening modal for: ${day} - ${mealType}`)
    setTargetSlotInfo({ day, mealType })
    setModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
    setTargetSlotInfo(null)
  }, [])

  const handleRecipeSelected = useCallback(
    (recipeId, day, mealType) => {
      if (!weeklyPlanData || isSaving || isNotifying) return

      const currentPlan = weeklyPlanData
      const isNewPlan = !!currentPlan.isLocal
      const updatedPlan = JSON.parse(JSON.stringify(currentPlan))

      if (updatedPlan.days[day]) {
        updatedPlan.days[day][mealType] = recipeId
        delete updatedPlan.isLocal
        setWeeklyPlanData(updatedPlan)
        savePlan(updatedPlan, isNewPlan)
      } else {
        console.error(`Day ${day} not found in plan data!`)
      }

      handleCloseModal()
    },
    [weeklyPlanData, savePlan, handleCloseModal, isSaving, familyId, currentWeekStart, isNotifying],
  )

  const handleDeleteRecipeFromSlot = useCallback(
    (day, mealType) => {
      if (!weeklyPlanData || isSaving || isNotifying) return

      const isLocalPlan = !!weeklyPlanData.isLocal
      const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData))

      if (updatedPlan.days[day] && updatedPlan.days[day][mealType] !== null) {
        updatedPlan.days[day][mealType] = null
        setWeeklyPlanData(updatedPlan)
        if (!isLocalPlan) {
          savePlan(updatedPlan, false)
        }
      } else {
        console.warn(`No recipe to delete in ${day} - ${mealType}`)
      }
    },
    [weeklyPlanData, savePlan, isSaving, isNotifying],
  )

  // --- Drag and Drop Handler ---
  const onDragEnd = useCallback(
    (result) => {
      const { source, destination, draggableId } = result
      if (!destination || !weeklyPlanData || isSaving || isNotifying || destination.droppableId === source.droppableId) return

      const isLocalPlan = !!weeklyPlanData.isLocal
      const [sourceDay, sourceMealType] = source.droppableId.split("-")
      const [destDay, destMealType] = destination.droppableId.split("-")
      const recipeIdBeingDragged = draggableId
      const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData))
      const recipeAtDestination = updatedPlan.days[destDay]?.[destMealType]

      // Find the full recipe object being dragged from the available recipes
      const draggedRecipeData = availableRecipesForPlanning.find(r => r.id === recipeIdBeingDragged);

      if (updatedPlan.days[destDay]) {
        updatedPlan.days[destDay][destMealType] = recipeIdBeingDragged
      }
      if (updatedPlan.days[sourceDay]) {
        updatedPlan.days[sourceDay][sourceMealType] = recipeAtDestination !== undefined ? recipeAtDestination : null
      }

      setWeeklyPlanData(updatedPlan)
      if (!isLocalPlan) {
        savePlan(updatedPlan, false)
      }
    },
    [weeklyPlanData, savePlan, isSaving, isNotifying, availableRecipesForPlanning], // Added availableRecipesForPlanning dependency
  )

  // --- Navigate to Shopping List ---
  const handleGoToShoppingList = () => {
    navigate(`/shopping-list?week=${weekId}`)
  }

  // --- Notify Family Handler ---
  const handleNotifyFamily = async () => {
    if (!isFamilyAdmin || !familyId || isNotifying || isLoading || isSaving) {
      console.warn("Cannot notify family: not admin, no familyId, or already processing.")
      return
    }

    setIsNotifying(true)
    setNotificationResult({ open: false, message: "", severity: "info" })
    console.log(`Notifying family ${familyId} about plan for week ${weekId}...`)

    try {
      const notifyFunction = httpsCallable(functions, "notifyFamilyPlanReady")
      const result = await notifyFunction({ familyId: familyId, weekId: weekId })
      console.log("Cloud function result:", result.data)
      setNotificationResult({ open: true, message: result.data.message || "Notifications envoyées !", severity: "success" })
    } catch (error) {
      console.error("Error calling notifyFamilyPlanReady function:", error)
      setNotificationResult({ open: true, message: error.message || "Erreur lors de l'envoi des notifications.", severity: "error" })
    } finally {
      setIsNotifying(false)
    }
  }

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotificationResult({ ...notificationResult, open: false });
  };

  // --- Render Logic ---
  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 64px)" }}>
        <ButtonCircularProgress />
      </Box>
    )
  }

  if (!familyId && !authLoading) {
    return (
      <Container maxWidth="sm" sx={{ textAlign: "center", mt: 8 }}>
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          Vous devez rejoindre ou créer une famille pour utiliser le planificateur.
        </Alert>
        <Button variant="contained" onClick={() => navigate("/family")}>
          Gérer ma Famille
        </Button>
      </Container>
    )
  }

  return (
    <Box sx={{ position: "relative", overflowX: "hidden" }} {...swipeHandlers}>
      {(isLoading || isSaving) && (
        <LinearProgress
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            zIndex: 1201,
          }}
        />
      )}
      <Container maxWidth={false} sx={{ px: { xs: 1, sm: 2, md: 3 }, py: 3 }}>
        <WeekNavigator
          currentWeekStart={currentWeekStart}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
          onGoToToday={handleGoToToday}
          isLoading={isLoading || isSaving || isNotifying}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <Grid container spacing={{ xs: 1, sm: 2 }} columns={{ xs: 1, sm: 2, md: 7 }}>
            {orderedDays.map((day) => (
              <Grid item xs={1} key={day}>
                <DayColumn
                  day={day}
                  dayName={dayNames[day]}
                  meals={weeklyPlanData?.days?.[day]}
                  recipes={availableRecipesForPlanning.reduce((acc, recipe) => { // Pass all recipes
                      acc[recipe.id] = recipe;
                      return acc;
                  }, {})} 
                  onOpenModal={handleOpenModal}
                  onDeleteRecipe={handleDeleteRecipeFromSlot}
                  isLoading={isLoading}
                />
              </Grid>
            ))}
          </Grid>
        </DragDropContext>

        {/* Action Buttons */}
        <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            justifyContent="center" 
            sx={{ mt: 4 }}
        >
          <Button
            variant="contained"
            startIcon={<ShoppingCartIcon />}
            onClick={handleGoToShoppingList}
            disabled={isLoading || isSaving || isNotifying}
            sx={{ borderRadius: 3, px: 3 }}
          >
            Voir la Liste de Courses
          </Button>
          {isFamilyAdmin && (
            <Tooltip title="Envoyer une notification à la famille quand le planning est prêt">
              <Button
                variant="outlined"
                startIcon={isNotifying ? <ButtonCircularProgress size={20} color="inherit" /> : <NotifyIcon />}
                onClick={handleNotifyFamily}
                disabled={isLoading || isSaving || isNotifying}
                sx={{ borderRadius: 3, px: 3 }}
              >
                {isNotifying ? "Envoi en cours..." : "Notifier la Famille"}
              </Button>
            </Tooltip>
          )}
        </Stack>

        {/* Recipe Selection Modal */}
        <RecipeSelectionModal
          open={modalOpen}
          onClose={handleCloseModal}
          onRecipeSelect={handleRecipeSelected}
          targetSlotInfo={targetSlotInfo}
          // Pass the combined & sorted list to the modal
          availableRecipes={availableRecipesForPlanning} 
        />

        {/* Success Snackbar */}
        <Snackbar
          open={showSuccess}
          autoHideDuration={2000}
          onClose={() => setShowSuccess(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={() => setShowSuccess(false)} severity="success" sx={{ width: "100%", borderRadius: 3 }}>
            Planning sauvegardé !
          </Alert>
        </Snackbar>
        
        {/* Notification Result Snackbar */}
        <Snackbar
          open={notificationResult.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={handleCloseSnackbar} severity={notificationResult.severity} sx={{ width: "100%", borderRadius: 3 }}>
            {notificationResult.message}
          </Alert>
        </Snackbar>

      </Container>
    </Box>
  )
}

export default WeeklyPlannerPage

