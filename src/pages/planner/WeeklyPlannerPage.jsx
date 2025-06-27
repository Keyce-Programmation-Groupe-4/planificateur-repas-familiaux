"use client";

import { useEffect, useCallback, useState } from "react"; // Added useState for local UI state
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Snackbar,
  CircularProgress as ButtonCircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
} from "@mui/material";
import {
  ShoppingCart as ShoppingCartIcon,
  Today as TodayIcon,
  AutoAwesome as AutoAwesomeIcon,
  MoreVert,
  PlaylistAddCheck,
  DeleteSweep,
  Print,
  Share,
  PictureAsPdf,
  NotificationsActive as NotifyIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { DragDropContext } from "@hello-pangea/dnd";
import { useSwipeable } from "react-swipeable";
// import { isValid } from "date-fns"; // No longer directly used here, date logic in slice/utils
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// --- Redux Imports ---
import {
  fetchWeeklyPlanAndRecipes,
  saveWeeklyPlan,
  checkAllergiesInPlan,
  notifyFamilyPlanReady,
  setCurrentWeek,
  updateRecipeInSlotLocally,
  deleteRecipeFromSlotLocally,
  openPlannerRecipeModal,
  closePlannerRecipeModal,
  openAllergyModal as openStoreAllergyModal, // Renamed to avoid conflict
  closeAllergyModal as closeStoreAllergyModal,
  clearPlannerError,
  clearNotificationStatus,
} from "../../redux/slices/plannerSlice";
import { useAuth } from "../../contexts/AuthContext"; // Still needed for familyId, currentUser, authLoading

// --- Components ---
import WeekNavigator from "../../components/planner/WeekNavigator";
import DayColumn from "../../components/planner/DayColumn";
import RecipeSelectionModal from "../../components/planner/RecipeSelectionModal";
import AllergyAlertModal from "../../components/planner/AllergyAlertModal";

// --- Utils ---
// import { checkAllergies } from "../../utils/allergyUtils"; // Logic moved to thunk
import { triggerSendNotification } from "../../utils/notificationUtils"; // For local notifications
import { getCurrentUserFCMToken } from "../../utils/authUtils";
import { getWeekId as calculateWeekId } from '../../utils/plannerUtils';


// --- pdfMake Configuration ---
pdfMake.vfs = pdfFonts.vfs;

const orderedDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayNames = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

function WeeklyPlannerPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { currentUser, userData, loading: authLoading } = useAuth();
  const familyId = userData?.familyId;
  const isFamilyAdmin = userData?.familyRole === "Admin";

  const {
    currentWeekStart, // ISO String from store
    weekId,
    weeklyPlanData,
    availableRecipesForPlanning,
    loading: plannerLoading,
    saving: plannerSaving,
    error: plannerError,
    modalOpen: recipeModalOpen, // from store
    targetSlotInfo, // from store
    allergyAlerts, // from store
    allergyModalOpen: storeAllergyModalOpen, // from store
    allergyCheckResult, // from store
    notificationStatus,
  } = useSelector((state) => state.planner);

  const recipesFromRecipeSlice = useSelector(state => state.recipes.familyRecipes.concat(state.recipes.publicRecipes));


  // Local UI states
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [localSuccessMessage, setLocalSuccessMessage] = useState("");
  // const [localNotificationResult, setLocalNotificationResult] = useState({ open: false, message: "", severity: "info" });
  const [anchorEl, setAnchorEl] = useState(null);
  const [randomPlanningDialogOpen, setRandomPlanningDialogOpen] = useState(false);
  const [clearPlanningDialogOpen, setClearPlanningDialogOpen] = useState(false);
  // const [isCheckingAllergies, setIsCheckingAllergies] = useState(false); // Handled by plannerLoading or a specific loading state in slice

  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    if (familyId && weekId) {
      dispatch(fetchWeeklyPlanAndRecipes({ familyId, weekId, currentWeekStartDate: currentWeekStart }));
    }
    return () => {
      dispatch(clearPlannerError());
      dispatch(clearNotificationStatus());
    };
  }, [dispatch, familyId, weekId, currentWeekStart]);

  // Perform allergy check when plan data or recipes change
  useEffect(() => {
    if (familyId && weeklyPlanData && availableRecipesForPlanning.length > 0 && !weeklyPlanData.isLocal) {
       // Debounce or delay this call if it's too frequent
      const timer = setTimeout(() => {
        dispatch(checkAllergiesInPlan({ familyId, weeklyPlanData, recipes: availableRecipesForPlanning }));
      }, 1000); // Delay of 1 second
      return () => clearTimeout(timer);
    }
  }, [dispatch, familyId, weeklyPlanData, availableRecipesForPlanning]);


  const handleSaveCurrentPlan = useCallback(async () => {
    if (!familyId || !weeklyPlanData || weeklyPlanData.isLocal) {
      // If it's a local plan, the first save will create it.
      // If no weeklyPlanData, nothing to save.
      if (weeklyPlanData && weeklyPlanData.isLocal) {
         // Fall through to dispatch saveWeeklyPlan
      } else {
        console.warn("Save condition not met or plan is already saved/not modified.");
        return;
      }
    }

    try {
      await dispatch(saveWeeklyPlan({
        familyId,
        weekId,
        planData: weeklyPlanData,
        isCreatingNewPlan: !!weeklyPlanData.isLocal,
      })).unwrap();
      setLocalSuccessMessage("Planning sauvegardé !");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
          triggerSendNotification(fcmToken, "Planning Sauvegardé", `Votre planning pour la semaine ${weekId} a été sauvegardé.`);
      }
      setTimeout(() => setLocalSuccessMessage(""), 2000);
    } catch (err) {
      // Error is in plannerError from store
      console.error("Failed to save plan:", err);
       const fcmToken = await getCurrentUserFCMToken();
        if (fcmToken) {
          triggerSendNotification(fcmToken, "Échec Sauvegarde Planning", `La sauvegarde du planning pour ${weekId} a échoué.`);
        }
    }
  }, [dispatch, familyId, weekId, weeklyPlanData]);


  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!plannerLoading && !plannerSaving && !notificationStatus.loading) {
        handleNextWeek();
      }
    },
    onSwipedRight: () => {
      if (!plannerLoading && !plannerSaving && !notificationStatus.loading) {
        handlePreviousWeek();
      }
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
    delta: 10,
  });

  const handleCheckAllergies = () => {
    handleMenuClose();
    if (familyId && weeklyPlanData && availableRecipesForPlanning.length > 0) {
      dispatch(checkAllergiesInPlan({ familyId, weeklyPlanData, recipes: availableRecipesForPlanning }));
    } else {
      // Handle case where data is not available, perhaps show a message
      dispatch(clearPlannerError()) // Clear previous errors
      // Consider setting a local error message if needed
    }
  };

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleRefresh = () => { // Re-fetch data for current week
    handleMenuClose();
    if (familyId && weekId) {
      dispatch(fetchWeeklyPlanAndRecipes({ familyId, weekId, currentWeekStartDate: currentWeekStart }));
    }
  };

  const handleOpenRandomPlanningDialog = () => {
    handleMenuClose();
    setRandomPlanningDialogOpen(true);
  };

  const handleOpenClearPlanningDialog = () => {
    handleMenuClose();
    setClearPlanningDialogOpen(true);
  };


  const handleExportPdf = () => {
    handleMenuClose();
    if (!weeklyPlanData || !weeklyPlanData.days) {
      alert("Le planning est vide, impossible d'exporter.");
      return;
    }
    const content = [];
    content.push({ text: "Planning de Repas Familial", style: "header", alignment: "center" });
    const currentWeekStartDateObj = new Date(currentWeekStart);
    content.push({
      text: `Semaine du ${currentWeekStartDateObj.toLocaleDateString("fr-FR")}`,
      style: "subheader",
      alignment: "center",
      margin: [0, 0, 0, 20],
    });

    orderedDays.forEach((dayKey) => {
      const dayName = dayNames[dayKey];
      const dayMeals = weeklyPlanData.days[dayKey];
      content.push({ text: dayName, style: "dayHeader", margin: [0, 15, 0, 5] });
      const dayContent = [];
      const breakfast = dayMeals.breakfast ? availableRecipesForPlanning.find(r => r.id === dayMeals.breakfast)?.name || "Recette inconnue" : "Aucun repas planifié";
      dayContent.push(["Petit-déjeuner", breakfast]);
      const lunch = dayMeals.lunch ? availableRecipesForPlanning.find(r => r.id === dayMeals.lunch)?.name || "Recette inconnue" : "Aucun repas planifié";
      dayContent.push(["Déjeuner", lunch]);
      const dinner = dayMeals.dinner ? availableRecipesForPlanning.find(r => r.id === dayMeals.dinner)?.name || "Recette inconnue" : "Aucun repas planifié";
      dayContent.push(["Dîner", dinner]);
      content.push({
        layout: "lightHorizontalLines",
        table: { headerRows: 0, widths: ["30%", "*"], body: dayContent },
        margin: [0, 0, 0, 10],
      });
    });

    const usedRecipeIds = new Set();
    Object.values(weeklyPlanData.days).forEach(day => {
      Object.values(day).forEach(recipeId => {
        if (recipeId) usedRecipeIds.add(recipeId);
      });
    });

    if (usedRecipeIds.size > 0) {
        content.push({ text: "Recettes utilisées cette semaine", style: "sectionHeader", margin: [0, 20, 0, 10] });
        const recipeNames = Array.from(usedRecipeIds).map(id => availableRecipesForPlanning.find(r => r.id === id)?.name || "Recette inconnue").sort();
        content.push({ ul: recipeNames, margin: [0, 0, 0, 10] });
    }

    const docDefinition = {
      content,
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 5] },
        subheader: { fontSize: 14, color: "gray", italics: true },
        dayHeader: { fontSize: 14, bold: true, color: theme.palette.primary.main, margin: [0, 15, 0, 5] },
        sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
      },
    };
    try {
      pdfMake.createPdf(docDefinition).download(`planning_repas_${weekId}.pdf`);
    } catch (error) {
      console.error("Error generating PDF: ", error);
      alert("Une erreur est survenue lors de la génération du PDF.");
    }
  };

  const handleNotifyFamily = async () => {
    handleMenuClose();
    if (!isFamilyAdmin || !familyId || notificationStatus.loading || plannerLoading || plannerSaving) return;
    try {
      await dispatch(notifyFamilyPlanReady({ familyId, weekId })).unwrap();
      // Success message is in notificationStatus.message from store
       const fcmToken = await getCurrentUserFCMToken();
        if (fcmToken) {
          triggerSendNotification(fcmToken, "Notification Famille Envoyée", `La notification pour ${weekId} a été envoyée.`);
        }
    } catch (err) {
      // Error is in notificationStatus.error from store
      console.error("Failed to notify family:", err);
      const fcmToken = await getCurrentUserFCMToken();
        if (fcmToken) {
          triggerSendNotification(fcmToken, "Échec Notification Famille", `Erreur envoi notification pour ${weekId}.`);
        }
    }
  };

  const handlePrint = () => { handleMenuClose(); alert("Imprimer - Non implémenté"); };
  const handleShare = () => { handleMenuClose(); alert("Partager - Non implémenté"); };

  const handleGoToToday = () => {
    if (plannerLoading || plannerSaving || notificationStatus.loading) return;
    dispatch(setCurrentWeek(new Date().toISOString()));
  };

  const handleNextWeek = () => {
    if (plannerLoading || plannerSaving || notificationStatus.loading) return;
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() + 7);
    dispatch(setCurrentWeek(currentDate.toISOString()));
  };

  const handlePreviousWeek = () => {
    if (plannerLoading || plannerSaving || notificationStatus.loading) return;
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() - 7);
    dispatch(setCurrentWeek(currentDate.toISOString()));
  };

  const handleOpenRecipeSelectionModal = useCallback((day, mealType) => {
    dispatch(openPlannerRecipeModal({ day, mealType }));
  }, [dispatch]);

  const handleCloseRecipeSelectionModal = useCallback(() => {
    dispatch(closePlannerRecipeModal());
  }, [dispatch]);

  const handleRecipeSelected = useCallback((recipeId, day, mealType) => {
    dispatch(updateRecipeInSlotLocally({ day, mealType, recipeId }));
    // Auto-save or rely on a save button. For now, let's make it auto-save.
    // The savePlan thunk should be smart enough to know if it's creating or updating.
    // We need to pass the full plan data.
    // A better approach: local updates modify a draft, then a save button commits.
    // For simplicity now, we trigger save after each local update if not a new local plan.
    if (weeklyPlanData && familyId) {
        const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData)); // Deep clone
        if(updatedPlan.days[day]) {
            updatedPlan.days[day][mealType] = recipeId;
        }
        const isNewPlan = !!updatedPlan.isLocal;
        if (isNewPlan) delete updatedPlan.isLocal; // Will be handled by save thunk

         dispatch(saveWeeklyPlan({
            familyId,
            weekId,
            planData: updatedPlan,
            isCreatingNewPlan: isNewPlan,
          })).then(() => {
             setLocalSuccessMessage("Recette ajoutée et planning sauvegardé.");
             setTimeout(() => setLocalSuccessMessage(""), 1500);
          }).catch(err => console.error("Failed to save after recipe selection:", err));
    }
    dispatch(closePlannerRecipeModal());
  }, [dispatch, weeklyPlanData, familyId, weekId]);


  const handleDeleteRecipeFromSlot = useCallback((day, mealType) => {
    dispatch(deleteRecipeFromSlotLocally({ day, mealType }));
     if (weeklyPlanData && familyId && !weeklyPlanData.isLocal) { // Only save if it's not a new local plan
        const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData));
         if(updatedPlan.days[day]) {
            updatedPlan.days[day][mealType] = null;
        }
        dispatch(saveWeeklyPlan({
            familyId,
            weekId,
            planData: updatedPlan,
            isCreatingNewPlan: false,
          })).then(() => {
             setLocalSuccessMessage("Recette supprimée et planning sauvegardé.");
             setTimeout(() => setLocalSuccessMessage(""), 1500);
          }).catch(err => console.error("Failed to save after recipe deletion:", err));
    }
  }, [dispatch, weeklyPlanData, familyId, weekId]);

  const onDragEnd = useCallback((result) => {
    const { source, destination, draggableId } = result;
    if (!destination || !weeklyPlanData || plannerSaving || notificationStatus.loading || destination.droppableId === source.droppableId) return;

    const [sourceDay, sourceMealType] = source.droppableId.split("-");
    const [destDay, destMealType] = destination.droppableId.split("-");

    // Dispatch local updates first
    dispatch(updateRecipeInSlotLocally({ day: destDay, mealType: destMealType, recipeId: draggableId }));
    const recipeAtDestinationOriginal = weeklyPlanData.days[destDay]?.[destMealType];
    dispatch(updateRecipeInSlotLocally({ day: sourceDay, mealType: sourceMealType, recipeId: recipeAtDestinationOriginal }));

    // Then save the entire plan
    // Create a fresh copy of the plan from the store *after* local dispatches if they are synchronous
    // Or, better, the save thunk should get the latest state.
    // For now, construct the updated plan data manually based on the drag result to send to save thunk
    const updatedPlanForSave = JSON.parse(JSON.stringify(weeklyPlanData));
    if (updatedPlanForSave.days[destDay]) {
        updatedPlanForSave.days[destDay][destMealType] = draggableId;
    }
    if (updatedPlanForSave.days[sourceDay]) {
        updatedPlanForSave.days[sourceDay][sourceMealType] = recipeAtDestinationOriginal !== undefined ? recipeAtDestinationOriginal : null;
    }

    const isNewPlan = !!updatedPlanForSave.isLocal;
    if(isNewPlan) delete updatedPlanForSave.isLocal;

    dispatch(saveWeeklyPlan({ familyId, weekId, planData: updatedPlanForSave, isCreatingNewPlan: isNewPlan }))
      .then(() => {
        setLocalSuccessMessage("Glisser-déposer sauvegardé.");
        setTimeout(() => setLocalSuccessMessage(""), 1500);
      })
      .catch(err => console.error("Failed to save after drag and drop:", err));

  }, [dispatch, weeklyPlanData, plannerSaving, notificationStatus.loading, familyId, weekId]);

  const handleGoToShoppingList = () => {
    if(weeklyPlanData && weeklyPlanData.isLocal){
        alert("Veuillez d'abord sauvegarder le planning pour générer une liste de courses.");
        return;
    }
    navigate(`/shopping-list?week=${weekId}`);
  };

  const handleRandomPlanning = (type) => {
    setRandomPlanningDialogOpen(false);
    if (!weeklyPlanData || plannerSaving || notificationStatus.loading) return;

    const sourceRecipes = type === "family"
      ? availableRecipesForPlanning.filter(r => r.isFamilyRecipe)
      : availableRecipesForPlanning.filter(r => r.visibility === "public");

    if (sourceRecipes.length === 0) {
      dispatch(clearPlannerError()); // Clear previous before setting new
      // setErrorState(`Aucune recette ${type === "family" ? "familiale" : "publique"} disponible.`);
      alert(`Aucune recette ${type === "family" ? "familiale" : "publique"} disponible.`);
      return;
    }

    const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData));
    orderedDays.forEach(day => {
      ["breakfast", "lunch", "dinner"].forEach(mealType => {
        const randomRecipe = sourceRecipes[Math.floor(Math.random() * sourceRecipes.length)];
        updatedPlan.days[day][mealType] = randomRecipe.id;
      });
    });
    const isNewPlan = !!updatedPlan.isLocal;
    if(isNewPlan) delete updatedPlan.isLocal;

    dispatch(saveWeeklyPlan({ familyId, weekId, planData: updatedPlan, isCreatingNewPlan: isNewPlan }))
     .then(() => {
        setLocalSuccessMessage("Planning aléatoire généré et sauvegardé.");
        setTimeout(() => setLocalSuccessMessage(""), 1500);
      })
     .catch(err => console.error("Failed to save random plan:", err));
  };

  const handleClearPlanning = () => {
    setClearPlanningDialogOpen(false);
    if (!weeklyPlanData || plannerSaving || notificationStatus.loading) return;

    const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData));
    orderedDays.forEach(day => {
      ["breakfast", "lunch", "dinner"].forEach(mealType => {
        updatedPlan.days[day][mealType] = null;
      });
    });
    const isNewPlan = !!updatedPlan.isLocal;
    if(isNewPlan) delete updatedPlan.isLocal;

    dispatch(saveWeeklyPlan({ familyId, weekId, planData: updatedPlan, isCreatingNewPlan: isNewPlan }))
    .then(() => {
        setLocalSuccessMessage("Planning réinitialisé et sauvegardé.");
        setTimeout(() => setLocalSuccessMessage(""), 1500);
      })
    .catch(err => console.error("Failed to save cleared plan:", err));
  };

  const renderSkeletons = () => (
    <Grid container spacing={{ xs: 1, sm: 2, md: 3 }} justifyContent="center">
      {orderedDays.map((day, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={day}>
          <Fade in timeout={300 + index * 100}>
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, height: "100%", minHeight: { xs: "300px", sm: "400px", md: "450px" }, background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)` }}>
              <Skeleton variant="text" width="60%" sx={{ mb: { xs: 2, sm: 3 }, mx: "auto", height: { xs: "2rem", sm: "2.5rem" }, borderRadius: 2 }} />
              <Stack spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
                <Skeleton variant="rounded" height={{ xs: 80, sm: 100, md: 120 }} sx={{ borderRadius: 4 }} />
                <Skeleton variant="rounded" height={{ xs: 80, sm: 100, md: 120 }} sx={{ borderRadius: 4 }} />
                <Skeleton variant="rounded" height={{ xs: 80, sm: 100, md: 120 }} sx={{ borderRadius: 4 }} />
              </Stack>
            </Paper>
          </Fade>
        </Grid>
      ))}
    </Grid>
  );

  // Consolidate loading states for UI
  const combinedLoading = authLoading || plannerLoading; // Not plannerSaving for general page loading
  const isProcessing = plannerSaving || notificationStatus.loading; // For disabling actions

  const totalRecipesCount = availableRecipesForPlanning.length;
  const plannedMealsCount = weeklyPlanData
    ? Object.values(weeklyPlanData.days || {}).reduce(
        (count, day) => count + Object.values(day).filter(meal => meal !== null).length, 0)
    : 0;

  if (authLoading) { // Initial auth check
    return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><ButtonCircularProgress /></Box>;
  }

  if (!familyId && !authLoading) { // User loaded, but no family
    return (
      <Container maxWidth="sm" sx={{ textAlign: "center", mt: { xs: 4, sm: 6, md: 8 } }}>
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>Vous devez rejoindre ou créer une famille pour utiliser le planificateur.</Alert>
        <Button variant="contained" onClick={() => navigate("/family")} sx={{ borderRadius: 3, px: { xs: 2, sm: 3 }, py: 1, fontSize: { xs: "0.875rem", sm: "1rem" } }}>Gérer ma Famille</Button>
      </Container>
    );
  }

  // Convert currentWeekStart from ISO string to Date object for WeekNavigator
  const currentWeekStartDateObj = new Date(currentWeekStart);


  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box {...swipeHandlers} sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 1, sm: 2, md: 3 }, background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`, minHeight: "100vh", position: "relative", overflowX: "hidden", "&::before": { content: '""', position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: "50px", height: "4px", background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.3)} 0%, ${alpha(theme.palette.secondary.main, 0.3)} 100%)`, borderRadius: "2px", display: { xs: "block", sm: "none" }}}} >
        <Box sx={{ position: "absolute", top: 0, right: 0, width: { xs: "150px", sm: "200px", md: "300px" }, height: { xs: "150px", sm: "200px", md: "300px" }, background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 70%)`, borderRadius: "50%", zIndex: 0, pointerEvents: "none", display: { xs: "none", sm: "block" }}}/>
        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1 }}>
          {allergyCheckResult && allergyCheckResult.hasAllergies && allergyAlerts.length > 0 && (
            <Alert severity="warning" sx={{ mb: 3 }} action={ <Button color="inherit" size="small" onClick={() => dispatch(openStoreAllergyModal())} startIcon={<WarningIcon />}>Voir les détails</Button>}>
              <Typography variant="body2">{allergyCheckResult.message}</Typography>
            </Alert>
          )}
          <Fade in timeout={600}>
            <Box sx={{ textAlign: "center", mb: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 700, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`, backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", mb: 1, fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem", lg: "3rem" } }}>Planificateur de Repas</Typography>
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: { xs: "90%", sm: "600px" }, mx: "auto", fontSize: { xs: "0.875rem", sm: "1rem", md: "1.125rem" } }}>Organisez vos repas de la semaine avec élégance</Typography>
            </Box>
          </Fade>
          <Zoom in timeout={800}>
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: 4, background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`, backdropFilter: "blur(10px)", mb: { xs: 2, sm: 3 } }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2, md: 3 }} alignItems="center" justifyContent="space-between">
                <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }} alignItems="center" sx={{ width: { xs: "100%", sm: "auto" } }}>
                  <Chip icon={<AutoAwesomeIcon />} label={`${totalRecipesCount} recettes`} variant="outlined" sx={{ borderRadius: 3, fontSize: { xs: "0.75rem", sm: "0.875rem" }, "& .MuiChip-icon": { color: theme.palette.primary.main } }}/>
                  <Chip label={`${plannedMealsCount}/21 repas planifiés`} variant="outlined" sx={{ borderRadius: 3, fontSize: { xs: "0.75rem", sm: "0.875rem" }}}/>
                </Stack>
                <WeekNavigator currentWeekStart={currentWeekStartDateObj} onPreviousWeek={handlePreviousWeek} onNextWeek={handleNextWeek} onGoToToday={handleGoToToday} isLoading={isProcessing || combinedLoading} />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }} sx={{ width: { xs: "100%", sm: "auto" } }}>
                  <Tooltip title="Vérifier les allergies">
                    <IconButton onClick={handleCheckAllergies} disabled={plannerLoading || isProcessing || !weeklyPlanData} sx={{ backgroundColor: allergyCheckResult?.hasAllergies ? "#FFF3E0" : alpha(theme.palette.primary.main, 0.1), color: allergyCheckResult?.hasAllergies ? "#E65100" : "inherit", "&:hover": { backgroundColor: allergyCheckResult?.hasAllergies ? "#FFE0B2" : alpha(theme.palette.primary.main, 0.2), transform: "scale(1.05)"}, transition: "all 0.2s ease", p: { xs: 0.5, sm: 1 }}}>
                      {plannerLoading && !isProcessing ? <ButtonCircularProgress size={24} /> : <WarningIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Aller à aujourd'hui">
                    <IconButton onClick={handleGoToToday} disabled={combinedLoading || isProcessing} sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.1), "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.2), transform: "scale(1.05)"}, transition: "all 0.2s ease", p: { xs: 0.5, sm: 1 }}}> <TodayIcon fontSize="small" /> </IconButton>
                  </Tooltip>
                  <Tooltip title="Options">
                    <IconButton onClick={handleMenuClick} disabled={combinedLoading || isProcessing} sx={{ backgroundColor: alpha(theme.palette.secondary.main, 0.1), "&:hover": { backgroundColor: alpha(theme.palette.secondary.main, 0.2), transform: "scale(1.05)"}, transition: "all 0.2s ease", p: { xs: 0.5, sm: 1 }}}> <MoreVert fontSize="small" /> </IconButton>
                  </Tooltip>
                  <Button variant="contained" startIcon={<ShoppingCartIcon />} onClick={handleGoToShoppingList} disabled={combinedLoading || isProcessing || !weeklyPlanData || weeklyPlanData.isLocal} sx={{ borderRadius: 3, px: { xs: 2, sm: 3 }, py: { xs: 0.5, sm: 1 }, fontSize: { xs: "0.75rem", sm: "0.875rem" }, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`, "&:hover": { transform: "translateY(-2px)", boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}` }, transition: "all 0.3s ease", width: { xs: "100%", sm: "auto" } }}>Liste de Courses</Button>
                 {(weeklyPlanData?.isLocal || weeklyPlanData?.isModified) && !plannerSaving && (
                    <Button variant="outlined" color="secondary" onClick={handleSaveCurrentPlan} disabled={plannerSaving}>
                        Sauvegarder Planning
                    </Button>
                 )}
                </Stack>
              </Stack>
            </Paper>
          </Zoom>
          {(combinedLoading || isProcessing) && ( <Fade in><Box sx={{ mb: { xs: 1, sm: 2, md: 3 } }}><LinearProgress sx={{ borderRadius: 2, height: 6, backgroundColor: alpha(theme.palette.primary.main, 0.1), "& .MuiLinearProgress-bar": { background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)` }}}/></Box></Fade> )}
          {localSuccessMessage && ( <Snackbar open={!!localSuccessMessage} autoHideDuration={2000} onClose={() => setLocalSuccessMessage("")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}><Alert onClose={() => setLocalSuccessMessage("")} severity="success" sx={{ width: "100%", borderRadius: 3 }}>{localSuccessMessage}</Alert></Snackbar> )}
          {plannerError && ( <Fade in><Alert severity="error" onClose={() => dispatch(clearPlannerError())} sx={{ mb: { xs: 1, sm: 2, md: 3 }, borderRadius: 3, fontSize: { xs: "0.75rem", sm: "0.875rem" }, "& .MuiAlert-icon": { fontSize: { xs: "1rem", sm: "1.5rem" } } }}>{typeof plannerError === 'object' ? JSON.stringify(plannerError) : plannerError}</Alert></Fade> )}

          {combinedLoading && !weeklyPlanData ? ( renderSkeletons() ) : weeklyPlanData ? (
            <Fade in timeout={1000}>
              <Grid container spacing={{ xs: 1, sm: 2, md: 3, lg: 3 }} justifyContent="center">
                {orderedDays.map((dayKey, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={dayKey} sx={{ minWidth: { xs: "280px", sm: "300px" } }}>
                    <Zoom in timeout={400 + index * 100}>
                      <Box>
                        <DayColumn
                          dayKey={dayKey}
                          dayName={dayNames[dayKey]}
                          date={new Date(currentWeekStartDateObj.getFullYear(), currentWeekStartDateObj.getMonth(), currentWeekStartDateObj.getDate() + orderedDays.indexOf(dayKey))}
                          meals={weeklyPlanData.days[dayKey]}
                          recipes={availableRecipesForPlanning.reduce((acc, recipe) => { acc[recipe.id] = recipe; return acc; }, {})}
                          onOpenModal={handleOpenRecipeSelectionModal}
                          onDeleteRecipe={handleDeleteRecipeFromSlot}
                          currentDate={new Date()} // For highlighting today
                          weekStartDate={currentWeekStartDateObj}
                        />
                      </Box>
                    </Zoom>
                  </Grid>
                ))}
              </Grid>
            </Fade>
          ) : ( !plannerError && <Fade in><Box sx={{ textAlign: "center", mt: { xs: 4, sm: 6, md: 8 } }}><Typography variant="h5" color="text.secondary" sx={{ mb: 2, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>Aucun planning trouvé pour cette semaine</Typography><Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>Commencez à planifier vos repas en ajoutant des recettes</Typography></Box></Fade> )}

          <Menu id="options-menu" anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose} PaperProps={{ sx: { minWidth: "200px", borderRadius: 3, boxShadow: `0 4px 20px ${alpha(theme.palette.grey[500], 0.2)}` }}}>
            <MenuItem onClick={handleCheckAllergies} disabled={plannerLoading || isProcessing || !weeklyPlanData}><ListItemIcon><WarningIcon fontSize="small" /></ListItemIcon><ListItemText>Vérifier les allergies</ListItemText></MenuItem>
            <Divider />
            <MenuItem onClick={handleExportPdf} disabled={combinedLoading || isProcessing || !weeklyPlanData}><ListItemIcon><PictureAsPdf fontSize="small" /></ListItemIcon><ListItemText>Exporter en PDF</ListItemText></MenuItem>
            {isFamilyAdmin && ( <MenuItem onClick={handleNotifyFamily} disabled={combinedLoading || isProcessing || !weeklyPlanData}><ListItemIcon>{notificationStatus.loading ? <ButtonCircularProgress size={16} /> : <NotifyIcon fontSize="small" />}</ListItemIcon><ListItemText>{notificationStatus.loading ? "Envoi en cours..." : "Notifier la Famille"}</ListItemText></MenuItem> )}
            <Divider />
            <MenuItem onClick={handleOpenRandomPlanningDialog} disabled={combinedLoading || isProcessing || !weeklyPlanData}><ListItemIcon><PlaylistAddCheck fontSize="small" /></ListItemIcon><ListItemText>Planning aléatoire</ListItemText></MenuItem>
            <MenuItem onClick={handleOpenClearPlanningDialog} disabled={combinedLoading || isProcessing || !weeklyPlanData}><ListItemIcon><DeleteSweep fontSize="small" /></ListItemIcon><ListItemText>Réinitialiser le planning</ListItemText></MenuItem>
            <Divider />
            <MenuItem onClick={handlePrint} disabled><ListItemIcon><Print fontSize="small" /></ListItemIcon><ListItemText>Imprimer</ListItemText></MenuItem>
            <MenuItem onClick={handleShare} disabled><ListItemIcon><Share fontSize="small" /></ListItemIcon><ListItemText>Partager</ListItemText></MenuItem>
          </Menu>

          <RecipeSelectionModal open={recipeModalOpen} onClose={handleCloseRecipeSelectionModal} onRecipeSelect={handleRecipeSelected} availableRecipes={availableRecipesForPlanning} targetSlotInfo={targetSlotInfo} currentUserData={userData}/>
          <AllergyAlertModal open={storeAllergyModalOpen} onClose={() => dispatch(closeStoreAllergyModal())} alerts={allergyAlerts} message={allergyCheckResult?.message || ""}/>

          {/* Snackbar for general notifications from planner slice (e.g. family notification) */}
          <Snackbar open={!!notificationStatus.message || !!notificationStatus.error} autoHideDuration={6000} onClose={() => dispatch(clearNotificationStatus())} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
            <Alert onClose={() => dispatch(clearNotificationStatus())} severity={notificationStatus.error ? "error" : "success"} sx={{ width: "100%", borderRadius: 3, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
              {notificationStatus.message || notificationStatus.error}
            </Alert>
          </Snackbar>

          <Dialog open={randomPlanningDialogOpen} onClose={() => setRandomPlanningDialogOpen(false)} fullScreen={isMobile}>
            <DialogTitle>Choisir le type de recettes</DialogTitle>
            <DialogContent><Typography>Veuillez choisir le type de recettes pour le planning aléatoire :</Typography></DialogContent>
            <DialogActions><Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: "100%" }}><Button fullWidth={isMobile} onClick={() => handleRandomPlanning("family")}>Recettes familiales</Button><Button fullWidth={isMobile} onClick={() => handleRandomPlanning("public")}>Recettes publiques</Button><Button fullWidth={isMobile} onClick={() => setRandomPlanningDialogOpen(false)}>Annuler</Button></Stack></DialogActions>
          </Dialog>
          <Dialog open={clearPlanningDialogOpen} onClose={() => setClearPlanningDialogOpen(false)} fullScreen={isMobile}>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogContent><Typography>Êtes-vous sûr de vouloir réinitialiser tout le planning de la semaine ?</Typography></DialogContent>
            <DialogActions><Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: "100%" }}><Button fullWidth={isMobile} onClick={() => setClearPlanningDialogOpen(false)}>Annuler</Button><Button fullWidth={isMobile} onClick={handleClearPlanning} color="error">Confirmer</Button></Stack></DialogActions>
          </Dialog>
        </Container>
      </Box>
    </DragDropContext>
  );
}

export default WeeklyPlannerPage;