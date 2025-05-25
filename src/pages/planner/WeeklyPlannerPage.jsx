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
} from "@mui/material"
import { DragDropContext } from "@hello-pangea/dnd"
import { isValid } from "date-fns"
import {
  ShoppingCart as ShoppingCartIcon,
  Today as TodayIcon,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material"

// --- Firebase Imports ---
import { db } from "../../firebaseConfig"
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp, Timestamp } from "firebase/firestore"

// --- Context Import ---
import { useAuth } from "../../contexts/AuthContext"

// Import the actual components
import WeekNavigator from "../../components/planner/WeekNavigator"
import DayColumn from "../../components/planner/DayColumn"
import RecipeSelectionModal from "../../components/planner/RecipeSelectionModal"

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

  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()))
  const [weeklyPlanData, setWeeklyPlanData] = useState(null)
  const [recipes, setRecipes] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [targetSlotInfo, setTargetSlotInfo] = useState(null)

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

      console.log(`Fetching data for family ${familyId}, week: ${weekId}`)

      try {
        const recipesQuery = query(collection(db, "recipes"), where("familyId", "==", familyId))
        const recipesSnapshot = await getDocs(recipesQuery)
        const fetchedRecipes = {}
        recipesSnapshot.forEach((doc) => {
          fetchedRecipes[doc.id] = { id: doc.id, ...doc.data() }
        })
        setRecipes(fetchedRecipes)
        console.log(`Fetched ${Object.keys(fetchedRecipes).length} recipes.`)

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
  }, [weekId, familyId, authLoading])

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
    if (isLoading || isSaving) return
    setCurrentWeekStart(getStartOfWeek(new Date()))
  }

  const handleNextWeek = () => {
    if (isLoading || isSaving) return
    setCurrentWeekStart((prevDate) => {
      const nextWeek = new Date(prevDate)
      nextWeek.setDate(prevDate.getDate() + 7)
      return nextWeek
    })
  }

  const handlePreviousWeek = () => {
    if (isLoading || isSaving) return
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
      if (!weeklyPlanData || isSaving) return

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
    [weeklyPlanData, savePlan, handleCloseModal, isSaving, familyId, currentWeekStart],
  )

  const handleDeleteRecipeFromSlot = useCallback(
    (day, mealType) => {
      if (!weeklyPlanData || isSaving) return

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
    [weeklyPlanData, savePlan, isSaving],
  )

  // --- Drag and Drop Handler ---
  const onDragEnd = useCallback(
    (result) => {
      const { source, destination, draggableId } = result
      if (!destination || !weeklyPlanData || isSaving || destination.droppableId === source.droppableId) return

      const isLocalPlan = !!weeklyPlanData.isLocal
      const [sourceDay, sourceMealType] = source.droppableId.split("-")
      const [destDay, destMealType] = destination.droppableId.split("-")
      const recipeIdBeingDragged = draggableId
      const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData))
      const recipeAtDestination = updatedPlan.days[destDay]?.[destMealType]

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
    [weeklyPlanData, savePlan, isSaving],
  )

  // --- Navigate to Shopping List ---
  const handleGoToShoppingList = () => {
    navigate(`/shopping-list?week=${weekId}`)
  }

  // --- Enhanced Skeleton Rendering ---
  const renderSkeletons = () => (
    <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} justifyContent="center">
      {orderedDays.map((day, index) => (
        <Grid item xs={12} sm={6} md={4} key={day}>
          <Fade in timeout={300 + index * 100}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 6,
                border: `1px solid ${theme.palette.divider}`,
                height: "100%",
                minHeight: "450px",
                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
              }}
            >
              <Skeleton
                variant="text"
                width="60%"
                sx={{
                  mb: 3,
                  mx: "auto",
                  height: "2.5rem",
                  borderRadius: 2,
                }}
              />
              <Stack spacing={2.5}>
                <Skeleton variant="rounded" height={120} sx={{ borderRadius: 4 }} />
                <Skeleton variant="rounded" height={120} sx={{ borderRadius: 4 }} />
                <Skeleton variant="rounded" height={120} sx={{ borderRadius: 4 }} />
              </Stack>
            </Paper>
          </Fade>
        </Grid>
      ))}
    </Grid>
  )

  const combinedLoading = authLoading || isLoading
  const totalRecipes = Object.keys(recipes).length
  const plannedMeals = weeklyPlanData
    ? Object.values(weeklyPlanData.days || {}).reduce(
        (count, day) => count + Object.values(day).filter((meal) => meal !== null).length,
        0,
      )
    : 0

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box
        sx={{
          py: { xs: 3, md: 5 },
          px: { xs: 2, sm: 3, md: 4 },
          background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
          minHeight: "calc(100vh - 64px)",
          position: "relative",
        }}
      >
        {/* Decorative Background Elements */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "300px",
            height: "300px",
            background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 70%)`,
            borderRadius: "50%",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />

        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1 }}>
          {/* Enhanced Header */}
          <Box sx={{ mb: { xs: 3, md: 5 } }}>
            {/* Title Section */}
            <Fade in timeout={600}>
              <Box sx={{ textAlign: "center", mb: 4 }}>
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    mb: 1,
                    fontSize: { xs: "2rem", md: "3rem" },
                  }}
                >
                  Planificateur de Repas
                </Typography>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{
                    fontWeight: 400,
                    maxWidth: "600px",
                    mx: "auto",
                  }}
                >
                  Organisez vos repas de la semaine avec élégance
                </Typography>
              </Box>
            </Fade>

            {/* Stats and Navigation Row */}
            <Zoom in timeout={800}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 6,
                  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  backdropFilter: "blur(10px)",
                  mb: 3,
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={3}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  {/* Stats */}
                  <Stack direction="row" spacing={3}>
                    <Chip
                      icon={<AutoAwesomeIcon />}
                      label={`${totalRecipes} recettes`}
                      variant="outlined"
                      sx={{
                        borderRadius: 3,
                        "& .MuiChip-icon": { color: theme.palette.primary.main },
                      }}
                    />
                    <Chip label={`${plannedMeals}/21 repas planifiés`} variant="outlined" sx={{ borderRadius: 3 }} />
                  </Stack>

                  {/* Navigation */}
                  <WeekNavigator
                    currentWeekStart={currentWeekStart}
                    onPreviousWeek={handlePreviousWeek}
                    onNextWeek={handleNextWeek}
                    onGoToToday={handleGoToToday}
                    isLoading={combinedLoading || isSaving}
                  />

                  {/* Action Buttons */}
                  <Stack direction="row" spacing={2}>
                    <Tooltip title="Aller à aujourd'hui">
                      <IconButton
                        onClick={handleGoToToday}
                        disabled={combinedLoading || isSaving}
                        sx={{
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          "&:hover": {
                            backgroundColor: alpha(theme.palette.primary.main, 0.2),
                            transform: "scale(1.05)",
                          },
                          transition: "all 0.2s ease",
                        }}
                      >
                        <TodayIcon />
                      </IconButton>
                    </Tooltip>

                    <Button
                      variant="contained"
                      startIcon={<ShoppingCartIcon />}
                      onClick={handleGoToShoppingList}
                      disabled={combinedLoading || isSaving || !weeklyPlanData || weeklyPlanData.isLocal}
                      sx={{
                        borderRadius: 3,
                        px: 3,
                        py: 1.5,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                        },
                        transition: "all 0.3s ease",
                      }}
                    >
                      Liste de Courses
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Zoom>
          </Box>

          {/* Loading/Saving Indicator */}
          {(combinedLoading || isSaving) && (
            <Fade in>
              <Box sx={{ mb: 3 }}>
                <LinearProgress
                  sx={{
                    borderRadius: 2,
                    height: 6,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    "& .MuiLinearProgress-bar": {
                      background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    },
                  }}
                />
              </Box>
            </Fade>
          )}

          {/* Success Feedback */}
          {showSuccess && (
            <Fade in>
              <Alert
                severity="success"
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  "& .MuiAlert-icon": {
                    fontSize: "1.5rem",
                  },
                }}
              >
                Planning sauvegardé avec succès !
              </Alert>
            </Fade>
          )}

          {/* Error Display */}
          {error && (
            <Fade in>
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  "& .MuiAlert-icon": {
                    fontSize: "1.5rem",
                  },
                }}
              >
                {error}
              </Alert>
            </Fade>
          )}

          {/* Main Planner Grid - Simplifié et Centré */}
          {combinedLoading ? (
            renderSkeletons()
          ) : weeklyPlanData ? (
            <Fade in timeout={1000}>
              <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} justifyContent="center">
                {orderedDays.map((dayKey, index) => {
                  const dayName = dayNames[dayKey]
                  return (
                    <Grid
                      item
                      xs={12} // 1 colonne sur mobile
                      sm={6}  // 2 colonnes sur petit tablet
                      md={4}  // 3 colonnes sur tablet et desktop
                      key={dayKey}
                    >
                      <Zoom in timeout={400 + index * 100}>
                        <Box>
                          <DayColumn
                            dayKey={dayKey}
                            dayName={dayName}
                            date={
                              new Date(
                                currentWeekStart.getFullYear(),
                                currentWeekStart.getMonth(),
                                currentWeekStart.getDate() + orderedDays.indexOf(dayKey),
                              )
                            }
                            meals={weeklyPlanData.days[dayKey]}
                            recipes={recipes}
                            onOpenModal={handleOpenModal}
                            onDeleteRecipe={handleDeleteRecipeFromSlot}
                            currentDate={new Date()}
                            weekStartDate={currentWeekStart}
                          />
                        </Box>
                      </Zoom>
                    </Grid>
                  )
                })}
              </Grid>
            </Fade>
          ) : (
            !error && (
              <Fade in>
                <Box sx={{ textAlign: "center", mt: 8 }}>
                  <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
                    Aucun planning trouvé pour cette semaine
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Commencez à planifier vos repas en ajoutant des recettes
                  </Typography>
                </Box>
              </Fade>
            )
          )}
        </Container>

        {/* Recipe Selection Modal */}
        <RecipeSelectionModal
          open={modalOpen}
          onClose={handleCloseModal}
          onRecipeSelect={handleRecipeSelected}
          availableRecipes={Object.values(recipes)}
          targetSlotInfo={targetSlotInfo}
        />
      </Box>
    </DragDropContext>
  )
}

export default WeeklyPlannerPage
