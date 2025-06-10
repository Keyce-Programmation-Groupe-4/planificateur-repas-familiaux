"use client"

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { isValid } from "date-fns";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// --- Firebase Imports ---
import { db, functions } from "../../firebaseConfig";
import { httpsCallable } from "firebase/functions";
import { triggerSendNotification } from "../../utils/notificationUtils";
import { getCurrentUserFCMToken } from "../../utils/authUtils";
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
  orderBy,
} from "firebase/firestore";

// --- Context Import ---
import { useAuth } from "../../contexts/AuthContext";

// --- Components ---
import WeekNavigator from "../../components/planner/WeekNavigator";
import DayColumn from "../../components/planner/DayColumn";
import RecipeSelectionModal from "../../components/planner/RecipeSelectionModal";
import AllergyAlertModal from "../../components/planner/AllergyAlertModal";

// --- Utils ---
import { checkAllergies } from "../../utils/allergyUtils";

// --- pdfMake Configuration ---
pdfMake.vfs = pdfFonts.vfs;

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
  return `${year}-W${String(weekNumber).padStart(2, "0")}`;
};

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

const isTimestampLike = (value) => {
  return value && typeof value === "object" && value.hasOwnProperty("seconds") && value.hasOwnProperty("nanoseconds");
};

function WeeklyPlannerPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser, userData, loading: authLoading } = useAuth();
  const familyId = userData?.familyId;
  const isFamilyAdmin = userData?.familyRole === "Admin";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [weeklyPlanData, setWeeklyPlanData] = useState(null);
  const [availableRecipesForPlanning, setAvailableRecipesForPlanning] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [notificationResult, setNotificationResult] = useState({ open: false, message: "", severity: "info" });
  const [modalOpen, setModalOpen] = useState(false);
  const [targetSlotInfo, setTargetSlotInfo] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [randomPlanningDialogOpen, setRandomPlanningDialogOpen] = useState(false);
  const [clearPlanningDialogOpen, setClearPlanningDialogOpen] = useState(false);
  const [allergyAlerts, setAllergyAlerts] = useState([]);
  const [allergyModalOpen, setAllergyModalOpen] = useState(false);
  const [allergyCheckResult, setAllergyCheckResult] = useState(null);
  const [isCheckingAllergies, setIsCheckingAllergies] = useState(false);

  const menuOpen = Boolean(anchorEl);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isLoading && !isSaving && !isNotifying) {
        handleNextWeek();
      }
    },
    onSwipedRight: () => {
      if (!isLoading && !isSaving && !isNotifying) {
        handlePreviousWeek();
      }
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
    delta: 10,
  });

  const weekId = getWeekId(currentWeekStart);

  const performAllergyCheck = useCallback(async () => {
    if (!familyId || !weeklyPlanData || !availableRecipesForPlanning.length) {
      return;
    }

    try {
      const result = await checkAllergies(familyId, weeklyPlanData, availableRecipesForPlanning);
      setAllergyCheckResult(result);
      setAllergyAlerts(result.alerts || []);
      if (result.hasAllergies && result.alerts.length > 0) {
        setAllergyModalOpen(true);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des allergies:", error);
    }
  }, [familyId, weeklyPlanData, availableRecipesForPlanning]);

  const handleCheckAllergies = async () => {
    handleMenuClose();
    if (!familyId || !weeklyPlanData || isCheckingAllergies) {
      return;
    }

    setIsCheckingAllergies(true);
    try {
      const result = await checkAllergies(familyId, weeklyPlanData, availableRecipesForPlanning);
      setAllergyCheckResult(result);
      setAllergyAlerts(result.alerts || []);
      setAllergyModalOpen(true);
    } catch (error) {
      console.error("Erreur lors de la vérification des allergies:", error);
      setNotificationResult({
        open: true,
        message: "Erreur lors de la vérification des allergies.",
        severity: "error"
      });
    } finally {
      setIsCheckingAllergies(false);
    }
  };

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
      setAvailableRecipesForPlanning([]);

      console.log(`Fetching data for family ${familyId}, week: ${weekId}`);

      try {
        const recipesRef = collection(db, "recipes");
        const familyRecipesQuery = query(recipesRef, where("familyId", "==", familyId), orderBy("createdAt", "desc"));
        const publicRecipesQuery = query(recipesRef, where("visibility", "==", "public"), orderBy("createdAt", "desc"));

        const [familySnapshot, publicSnapshot] = await Promise.all([
          getDocs(familyRecipesQuery),
          getDocs(publicRecipesQuery),
        ]);

        const familyRecipes = familySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isFamilyRecipe: true,
        }));
        const publicRecipes = publicSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isFamilyRecipe: false,
        }));

        const combinedRecipesMap = new Map();
        familyRecipes.forEach((recipe) => combinedRecipesMap.set(recipe.id, recipe));
        publicRecipes.forEach((recipe) => {
          if (!combinedRecipesMap.has(recipe.id)) {
            combinedRecipesMap.set(recipe.id, recipe);
          }
        });

        const combinedRecipes = Array.from(combinedRecipesMap.values()).sort((a, b) => {
          if (a.isFamilyRecipe && !b.isFamilyRecipe) return -1;
          if (!a.isFamilyRecipe && b.isFamilyRecipe) return 1;
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
        });

        setAvailableRecipesForPlanning(combinedRecipes);
        console.log(`Fetched and combined ${combinedRecipes.length} recipes for planning.`);

        const planDocRef = doc(db, "families", familyId, "weeklyPlans", weekId);
        const planDocSnap = await getDoc(planDocRef);

        if (planDocSnap.exists()) {
          console.log(`Plan found for ${weekId}.`);
          setWeeklyPlanData(planDocSnap.data());
        } else {
          console.log(`No plan found for ${weekId}, using local default.`);
          setWeeklyPlanData(createDefaultPlan(familyId, currentWeekStart, false));
        }
      } catch (err) {
        console.error("Error fetching data: ", err);
        setError("Erreur lors du chargement des données. Veuillez rafraîchir la page.");
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [weekId, familyId, authLoading]);

  useEffect(() => {
    if (weeklyPlanData && availableRecipesForPlanning.length > 0 && familyId) {
      const timeoutId = setTimeout(() => {
        performAllergyCheck();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [performAllergyCheck]);

  const createDefaultPlan = (currentFamilyId, weekStartDate, useServerTimestamps = true) => {
    const startDate = getStartOfWeek(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

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
    };

    if (useServerTimestamps) {
      plan.createdAt = serverTimestamp();
      plan.lastUpdatedAt = serverTimestamp();
    } else {
      plan.isLocal = true;
    }

    return plan;
  };

  const savePlan = useCallback(
    async (planDataToSave, isCreating = false) => {
      if (!familyId || !planDataToSave) return;

      setIsSaving(true);
      setError(null);
      console.log(`Saving plan for week: ${weekId}. Creating: ${isCreating}`);

      const planDocRef = doc(db, "families", familyId, "weeklyPlans", weekId);
      const dataForFirestore = JSON.parse(JSON.stringify(planDataToSave));

      try {
        if (
          dataForFirestore.startDate &&
          !isTimestampLike(dataForFirestore.startDate) &&
          !(dataForFirestore.startDate instanceof Timestamp)
        ) {
          const jsStartDate = new Date(dataForFirestore.startDate);
          if (!isValid(jsStartDate)) throw new Error(`Invalid startDate value: ${dataForFirestore.startDate}`);
          dataForFirestore.startDate = Timestamp.fromDate(jsStartDate);
          console.log("Converted startDate to Timestamp");
        } else if (!dataForFirestore.startDate && isCreating) {
          const calculatedStartDate = getStartOfWeek(currentWeekStart);
          if (!isValid(calculatedStartDate)) throw new Error(`Could not calculate valid start date for week: ${weekId}`);
          dataForFirestore.startDate = Timestamp.fromDate(calculatedStartDate);
          console.log("Calculated and set startDate for creation");
        } else if (isTimestampLike(dataForFirestore.startDate)) {
          dataForFirestore.startDate = new Timestamp(
            dataForFirestore.startDate.seconds,
            dataForFirestore.startDate.nanoseconds,
          );
          console.log("Ensured startDate is Timestamp instance");
        }

        if (
          dataForFirestore.endDate &&
          !isTimestampLike(dataForFirestore.endDate) &&
          !(dataForFirestore.endDate instanceof Timestamp)
        ) {
          const jsEndDate = new Date(dataForFirestore.endDate);
          if (!isValid(jsEndDate)) throw new Error(`Invalid endDate value: ${dataForFirestore.endDate}`);
          dataForFirestore.endDate = Timestamp.fromDate(jsEndDate);
          console.log("Converted endDate to Timestamp");
        } else if (!dataForFirestore.endDate && isCreating) {
          let baseStartDateForCalc;
          if (dataForFirestore.startDate instanceof Timestamp) {
            baseStartDateForCalc = dataForFirestore.startDate.toDate();
          } else {
            throw new Error("Cannot calculate endDate without a valid startDate.");
          }
          if (!isValid(baseStartDateForCalc)) throw new Error("Cannot calculate endDate because startDate is invalid.");
          const calculatedEndDate = new Date(baseStartDateForCalc);
          calculatedEndDate.setDate(baseStartDateForCalc.getDate() + 6);
          if (!isValid(calculatedEndDate)) throw new Error(`Could not calculate valid end date for week: ${weekId}`);
          dataForFirestore.endDate = Timestamp.fromDate(calculatedEndDate);
          console.log("Calculated and set endDate for creation");
        } else if (isTimestampLike(dataForFirestore.endDate)) {
          dataForFirestore.endDate = new Timestamp(
            dataForFirestore.endDate.seconds,
            dataForFirestore.endDate.nanoseconds,
          );
          console.log("Ensured endDate is Timestamp instance");
        }
      } catch (dateError) {
        console.error("Error processing dates before saving:", dateError);
        setError(`Erreur interne lors de la préparation des dates : ${dateError.message}`);
        setIsSaving(false);
        return;
      }

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
        setWeeklyPlanData(planDataToSave);

        setShowSuccess(true);
        const fcmTokenSuccess = await getCurrentUserFCMToken();
        if (fcmTokenSuccess) {
          triggerSendNotification(
            fcmTokenSuccess,
            "Planning Sauvegardé",
            `Votre planning de repas pour la semaine ${weekId} a été sauvegardé.`
          );
        }
        setTimeout(() => setShowSuccess(false), 2000);
        setTimeout(() => {
          performAllergyCheck();
        }, 500);
      } catch (err) {
        console.error("Error saving plan to Firestore: ", err);
        const errorMsg = `La sauvegarde du planning pour la semaine ${weekId} a échoué: ${err.message}`;
        setError(errorMsg);
        const fcmTokenFailure = await getCurrentUserFCMToken();
        if (fcmTokenFailure) {
          triggerSendNotification(
            fcmTokenFailure,
            "Échec Sauvegarde Planning",
            errorMsg
          );
        }
      } finally {
        setIsSaving(false);
      }
    },
    [familyId, weekId, currentWeekStart, performAllergyCheck],
  );

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleRefresh = () => {
    handleMenuClose();
    window.location.reload();
  };

  const handleUncheckAll = () => {
    handleMenuClose();
    setRandomPlanningDialogOpen(true);
  };

  const handleClearChecked = () => {
    handleMenuClose();
    setClearPlanningDialogOpen(true);
  };

  const handleExportPdf = () => {
    handleMenuClose();
    console.log("Exporting planning PDF with data:", weeklyPlanData);

    if (!weeklyPlanData || !weeklyPlanData.days) {
      alert("Le planning est vide, impossible d'exporter.");
      return;
    }

    const content = [];
    content.push({ text: "Planning de Repas Familial", style: "header", alignment: "center" });
    content.push({
      text: `Semaine du ${currentWeekStart.toLocaleDateString("fr-FR")}`,
      style: "subheader",
      alignment: "center",
      margin: [0, 0, 0, 20],
    });

    orderedDays.forEach((dayKey) => {
      const dayName = dayNames[dayKey];
      const dayMeals = weeklyPlanData.days[dayKey];
      content.push({ text: dayName, style: "dayHeader", margin: [0, 15, 0, 5] });
      const dayContent = [];
      const breakfast = dayMeals.breakfast
        ? availableRecipesForPlanning.find((r) => r.id === dayMeals.breakfast)?.name || "Recette inconnue"
        : "Aucun repas planifié";
      dayContent.push(["Petit-déjeuner", breakfast]);
      const lunch = dayMeals.lunch
        ? availableRecipesForPlanning.find((r) => r.id === dayMeals.lunch)?.name || "Recette inconnue"
        : "Aucun repas planifié";
      dayContent.push(["Déjeuner", lunch]);
      const dinner = dayMeals.dinner
        ? availableRecipesForPlanning.find((r) => r.id === dayMeals.dinner)?.name || "Recette inconnue"
        : "Aucun repas planifié";
      dayContent.push(["Dîner", dinner]);
      content.push({
        layout: "lightHorizontalLines",
        table: { headerRows: 0, widths: ["30%", "*"], body: dayContent },
        margin: [0, 0, 0, 10],
      });
    });

    const usedRecipes = new Set();
    Object.values(weeklyPlanData.days).forEach((day) => {
      Object.values(day).forEach((recipeId) => {
        if (recipeId) {
          const recipe = availableRecipesForPlanning.find((r) => r.id === recipeId);
          if (recipe) usedRecipes.add(recipe.name);
        }
      });
    });

    if (usedRecipes.size > 0) {
      content.push({ text: "Recettes utilisées cette semaine", style: "sectionHeader", margin: [0, 20, 0, 10] });
      content.push({ ul: Array.from(usedRecipes).sort(), margin: [0, 0, 0, 10] });
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
      const pdfFileName = `planning_repas_${weekId}.pdf`;
      pdfMake.createPdf(docDefinition).download(pdfFileName);
      console.log(`PDF "${pdfFileName}" generated and download initiated.`);
    } catch (error) {
      console.error("Error generating PDF: ", error);
      alert("Une erreur est survenue lors de la génération du PDF.");
    }
  };

  const handleNotifyFamily = async () => {
    handleMenuClose();
    if (!isFamilyAdmin || !familyId || isNotifying || isLoading || isSaving) {
      console.warn("Cannot notify family: not admin, no familyId, or already processing.");
      return;
    }

    setIsNotifying(true);
    setNotificationResult({ open: false, message: "", severity: "info" });
    console.log(`Notifying family ${familyId} about plan for week ${weekId}...`);

    try {
      const notifyFunction = httpsCallable(functions, "notifyFamilyPlanReady");
      const result = await notifyFunction({ familyId: familyId, weekId: weekId });
      console.log("Cloud function result:", result.data);
      const successMsg = result.data.message || "Notifications envoyées !";
      setNotificationResult({ open: true, message: successMsg, severity: "success" });
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Notification Famille Envoyée",
          `La notification au sujet du planning de la semaine ${weekId} a été envoyée.`
        );
      }
    } catch (error) {
      console.error("Error calling notifyFamilyPlanReady function:", error);
      const errorMsg = error.message || "Erreur lors de l'envoi des notifications.";
      setNotificationResult({ open: true, message: errorMsg, severity: "error" });
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Échec Notification Famille",
          `Erreur envoi notification pour planning ${weekId}: ${errorMsg}`
        );
      }
    } finally {
      setIsNotifying(false);
    }
  };

  const handlePrint = () => {
    handleMenuClose();
    alert("Imprimer - Non implémenté");
  };

  const handleShare = () => {
    handleMenuClose();
    alert("Partager - Non implémenté");
  };

  const handleGoToToday = () => {
    if (isLoading || isSaving || isNotifying) return;
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  const handleNextWeek = () => {
    if (isLoading || isSaving || isNotifying) return;
    setCurrentWeekStart((prevDate) => {
      const nextWeek = new Date(prevDate);
      nextWeek.setDate(prevDate.getDate() + 7);
      return nextWeek;
    });
  };

  const handlePreviousWeek = () => {
    if (isLoading || isSaving || isNotifying) return;
    setCurrentWeekStart((prevDate) => {
      const prevWeek = new Date(prevDate);
      prevWeek.setDate(prevDate.getDate() - 7);
      return prevWeek;
    });
  };

  const handleOpenModal = useCallback((day, mealType) => {
    console.log(`Opening modal for: ${day} - ${mealType}`);
    setTargetSlotInfo({ day, mealType });
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setTargetSlotInfo(null);
  }, []);

  const handleRecipeSelected = useCallback(
    (recipeId, day, mealType) => {
      if (!weeklyPlanData || isSaving || isNotifying) return;

      const currentPlan = weeklyPlanData;
      const isNewPlan = !!currentPlan.isLocal;
      const updatedPlan = JSON.parse(JSON.stringify(currentPlan));

      if (updatedPlan.days[day]) {
        updatedPlan.days[day][mealType] = recipeId;
        delete updatedPlan.isLocal;
        setWeeklyPlanData(updatedPlan);
        savePlan(updatedPlan, isNewPlan);
      } else {
        console.error(`Day ${day} not found in plan data!`);
      }

      handleCloseModal();
    },
    [weeklyPlanData, savePlan, handleCloseModal, isSaving, isNotifying],
  );

  const handleDeleteRecipeFromSlot = useCallback(
    (day, mealType) => {
      if (!weeklyPlanData || isSaving || isNotifying) return;

      const isLocalPlan = !!weeklyPlanData.isLocal;
      const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData));

      if (updatedPlan.days[day] && updatedPlan.days[day][mealType] !== null) {
        updatedPlan.days[day][mealType] = null;
        setWeeklyPlanData(updatedPlan);
        if (!isLocalPlan) {
          savePlan(updatedPlan, false);
        }
      } else {
        console.warn(`No recipe to delete in ${day} - ${mealType}`);
      }
    },
    [weeklyPlanData, savePlan, isSaving, isNotifying],
  );

  const onDragEnd = useCallback(
    (result) => {
      const { source, destination, draggableId } = result;
      if (!destination || !weeklyPlanData || isSaving || isNotifying || destination.droppableId === source.droppableId) return;

      const isLocalPlan = !!weeklyPlanData.isLocal;
      const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData));
      const [sourceDay, sourceMealType] = source.droppableId.split("-");
      const [destDay, destMealType] = destination.droppableId.split("-");
      const recipeIdBeingDragged = draggableId;
      const recipeAtDestination = updatedPlan.days[destDay]?.[destMealType];

      if (updatedPlan.days[destDay]) {
        updatedPlan.days[destDay][destMealType] = recipeIdBeingDragged;
      }
      if (updatedPlan.days[sourceDay]) {
        updatedPlan.days[sourceDay][sourceMealType] = recipeAtDestination !== undefined ? recipeAtDestination : null;
      }

      setWeeklyPlanData(updatedPlan);
      if (!isLocalPlan) {
        savePlan(updatedPlan, false);
      }
    },
    [weeklyPlanData, savePlan, isSaving, isNotifying],
  );

  const handleGoToShoppingList = () => {
    navigate(`/shopping-list?week=${weekId}`);
  };

  const handleRandomPlanning = (type) => {
    setRandomPlanningDialogOpen(false);
    if (!weeklyPlanData || isSaving || isNotifying) return;

    const filteredRecipes = type === "family"
      ? availableRecipesForPlanning.filter((r) => r.isFamilyRecipe)
      : availableRecipesForPlanning.filter((r) => r.visibility === "public");

    if (filteredRecipes.length === 0) {
      setError(`Aucune recette ${type === "family" ? "familiale" : "publique"} disponible.`);
      return;
    }

    const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData));
    orderedDays.forEach((day) => {
      ["breakfast", "lunch", "dinner"].forEach((mealType) => {
        const randomRecipe = filteredRecipes[Math.floor(Math.random() * filteredRecipes.length)];
        updatedPlan.days[day][mealType] = randomRecipe.id;
      });
    });

    setWeeklyPlanData(updatedPlan);
    savePlan(updatedPlan, false);
  };

  const handleClearPlanning = () => {
    setClearPlanningDialogOpen(false);
    if (!weeklyPlanData || isSaving || isNotifying) return;

    const updatedPlan = JSON.parse(JSON.stringify(weeklyPlanData));
    orderedDays.forEach((day) => {
      ["breakfast", "lunch", "dinner"].forEach((mealType) => {
        updatedPlan.days[day][mealType] = null;
      });
    });

    setWeeklyPlanData(updatedPlan);
    savePlan(updatedPlan, false);
  };

  const renderSkeletons = () => (
    <Grid container spacing={{ xs: 1, sm: 2, md: 3 }} justifyContent="center">
      {orderedDays.map((day, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={day}>
          <Fade in timeout={300 + index * 100}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2, md: 3 },
                borderRadius: 4,
                border: `1px solid ${theme.palette.divider}`,
                height: "100%",
                minHeight: { xs: "300px", sm: "400px", md: "450px" },
                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
              }}
            >
              <Skeleton
                variant="text"
                width="60%"
                sx={{
                  mb: { xs: 2, sm: 3 },
                  mx: "auto",
                  height: { xs: "2rem", sm: "2.5rem" },
                  borderRadius: 2,
                }}
              />
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

  const combinedLoading = authLoading || isLoading;
  const totalRecipes = availableRecipesForPlanning.length;
  const plannedMeals = weeklyPlanData
    ? Object.values(weeklyPlanData.days || {}).reduce(
        (count, day) => count + Object.values(day).filter((meal) => meal !== null).length,
        0,
      )
    : 0;

  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <ButtonCircularProgress />
      </Box>
    );
  }

  if (!familyId && !authLoading) {
    return (
      <Container maxWidth="sm" sx={{ textAlign: "center", mt: { xs: 4, sm: 6, md: 8 } }}>
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
          Vous devez rejoindre ou créer une famille pour utiliser le planificateur.
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate("/family")}
          sx={{
            borderRadius: 3,
            px: { xs: 2, sm: 3 },
            py: 1,
            fontSize: { xs: "0.875rem", sm: "1rem" },
          }}
        >
          Gérer ma Famille
        </Button>
      </Container>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box
        {...swipeHandlers}
        sx={{
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 1, sm: 2, md: 3 },
          background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
          minHeight: "100vh",
          position: "relative",
          overflowX: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 8,
            left: "50%",
            transform: "translateX(-50%)",
            width: "50px",
            height: "4px",
            background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.3)} 0%, ${alpha(theme.palette.secondary.main, 0.3)} 100%)`,
            borderRadius: "2px",
            display: { xs: "block", sm: "none" },
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: { xs: "150px", sm: "200px", md: "300px" },
            height: { xs: "150px", sm: "200px", md: "300px" },
            background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 70%)`,
            borderRadius: "50%",
            zIndex: 0,
            pointerEvents: "none",
            display: { xs: "none", sm: "block" },
          }}
        />
        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1 }}>
          {allergyCheckResult && allergyCheckResult.hasAllergies && (
            <Alert 
              severity="warning" 
              sx={{ mb: 3 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => setAllergyModalOpen(true)}
                  startIcon={<WarningIcon />}
                >
                  Voir les détails
                </Button>
              }
            >
              <Typography variant="body2">
                {allergyCheckResult.message}
              </Typography>
            </Alert>
          )}
          <Fade in timeout={600}>
            <Box sx={{ textAlign: "center", mb: { xs: 2, sm: 3, md: 4 } }}>
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
                  fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem", lg: "3rem" },
                }}
              >
                Planificateur de Repas
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{
                  fontWeight: 400,
                  maxWidth: { xs: "90%", sm: "600px" },
                  mx: "auto",
                  fontSize: { xs: "0.875rem", sm: "1rem", md: "1.125rem" },
                }}
              >
                Organisez vos repas de la semaine avec élégance
              </Typography>
            </Box>
          </Fade>
          <Zoom in timeout={800}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2, md: 3 },
                borderRadius: 4,
                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                backdropFilter: "blur(10px)",
                mb: { xs: 2, sm: 3 },
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 1, sm: 2, md: 3 }}
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 1, sm: 2 }}
                  alignItems="center"
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  <Chip
                    icon={<AutoAwesomeIcon />}
                    label={`${totalRecipes} recettes`}
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      "& .MuiChip-icon": { color: theme.palette.primary.main },
                    }}
                  />
                  <Chip
                    label={`${plannedMeals}/21 repas planifiés`}
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  />
                </Stack>
                <WeekNavigator
                  currentWeekStart={currentWeekStart}
                  onPreviousWeek={handlePreviousWeek}
                  onNextWeek={handleNextWeek}
                  onGoToToday={handleGoToToday}
                  isLoading={combinedLoading || isSaving || isNotifying}
                />
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 1, sm: 2 }}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  <Tooltip title="Vérifier les allergies">
                    <IconButton
                      onClick={handleCheckAllergies}
                      disabled={isCheckingAllergies || combinedLoading || isSaving || isNotifying}
                      sx={{
                        backgroundColor: allergyCheckResult?.hasAllergies ? "#FFF3E0" : alpha(theme.palette.primary.main, 0.1),
                        color: allergyCheckResult?.hasAllergies ? "#E65100" : "inherit",
                        "&:hover": {
                          backgroundColor: allergyCheckResult?.hasAllergies ? "#FFE0B2" : alpha(theme.palette.primary.main, 0.2),
                          transform: "scale(1.05)",
                        },
                        transition: "all 0.2s ease",
                        p: { xs: 0.5, sm: 1 },
                      }}
                    >
                      {isCheckingAllergies ? <ButtonCircularProgress size={24} /> : <WarningIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Aller à aujourd'hui">
                    <IconButton
                      onClick={handleGoToToday}
                      disabled={combinedLoading || isSaving || isNotifying}
                      sx={{
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.primary.main, 0.2),
                          transform: "scale(1.05)",
                        },
                        transition: "all 0.2s ease",
                        p: { xs: 0.5, sm: 1 },
                      }}
                    >
                      <TodayIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Options">
                    <IconButton
                      onClick={handleMenuClick}
                      disabled={combinedLoading || isSaving || isNotifying}
                      sx={{
                        backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.secondary.main, 0.2),
                          transform: "scale(1.05)",
                        },
                        transition: "all 0.2s ease",
                        p: { xs: 0.5, sm: 1 },
                      }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="contained"
                    startIcon={<ShoppingCartIcon />}
                    onClick={handleGoToShoppingList}
                    disabled={combinedLoading || isSaving || isNotifying || !weeklyPlanData || weeklyPlanData.isLocal}
                    sx={{
                      borderRadius: 3,
                      px: { xs: 2, sm: 3 },
                      py: { xs: 0.5, sm: 1 },
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                      },
                      transition: "all 0.3s ease",
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    Liste de Courses
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Zoom>
          {(combinedLoading || isSaving || isNotifying) && (
            <Fade in>
              <Box sx={{ mb: { xs: 1, sm: 2, md: 3 } }}>
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
          {showSuccess && (
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
          )}
          {error && (
            <Fade in>
              <Alert
                severity="error"
                sx={{
                  mb: { xs: 1, sm: 2, md: 3 },
                  borderRadius: 3,
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  "& .MuiAlert-icon": { fontSize: { xs: "1rem", sm: "1.5rem" } },
                }}
              >
                {error}
              </Alert>
            </Fade>
          )}
          {combinedLoading ? (
            renderSkeletons()
          ) : weeklyPlanData ? (
            <Fade in timeout={1000}>
              <Grid container spacing={{ xs: 1, sm: 2, md: 3, lg: 3 }} justifyContent="center">
                {orderedDays.map((dayKey, index) => (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={4}
                    lg={3}
                    xl={2}
                    key={dayKey}
                    sx={{ minWidth: { xs: "280px", sm: "300px" } }}
                  >
                    <Zoom in timeout={400 + index * 100}>
                      <Box>
                        <DayColumn
                          dayKey={dayKey}
                          dayName={dayNames[dayKey]}
                          date={
                            new Date(
                              currentWeekStart.getFullYear(),
                              currentWeekStart.getMonth(),
                              currentWeekStart.getDate() + orderedDays.indexOf(dayKey),
                            )
                          }
                          meals={weeklyPlanData.days[dayKey]}
                          recipes={availableRecipesForPlanning.reduce((acc, recipe) => {
                            acc[recipe.id] = recipe;
                            return acc;
                          }, {})}
                          onOpenModal={handleOpenModal}
                          onDeleteRecipe={handleDeleteRecipeFromSlot}
                          currentDate={new Date()}
                          weekStartDate={currentWeekStart}
                        />
                      </Box>
                    </Zoom>
                  </Grid>
                ))}
              </Grid>
            </Fade>
          ) : (
            !error && (
              <Fade in>
                <Box sx={{ textAlign: "center", mt: { xs: 4, sm: 6, md: 8 } }}>
                  <Typography
                    variant="h5"
                    color="text.secondary"
                    sx={{ mb: 2, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
                  >
                    Aucun planning trouvé pour cette semaine
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                  >
                    Commencez à planifier vos repas en ajoutant des recettes
                  </Typography>
                </Box>
              </Fade>
            )
          )}
          <Menu
            id="options-menu"
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                minWidth: "200px",
                borderRadius: 3,
                boxShadow: `0 4px 20px ${alpha(theme.palette.grey[500], 0.2)}`,
              },
            }}
          >
            <MenuItem onClick={handleCheckAllergies} disabled={isCheckingAllergies || combinedLoading || isSaving || isNotifying}>
              <ListItemIcon>
                <WarningIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Vérifier les allergies</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleExportPdf} disabled={combinedLoading || !weeklyPlanData || isNotifying}>
              <ListItemIcon>
                <PictureAsPdf fontSize="small" />
              </ListItemIcon>
              <ListItemText>Exporter en PDF</ListItemText>
            </MenuItem>
            {isFamilyAdmin && (
              <MenuItem onClick={handleNotifyFamily} disabled={combinedLoading || isSaving || isNotifying || !weeklyPlanData}>
                <ListItemIcon>
                  {isNotifying ? <ButtonCircularProgress size={16} /> : <NotifyIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>{isNotifying ? "Envoi en cours..." : "Notifier la Famille"}</ListItemText>
              </MenuItem>
            )}
            <Divider />
            <MenuItem onClick={handleUncheckAll} disabled={combinedLoading || !weeklyPlanData || isNotifying}>
              <ListItemIcon>
                <PlaylistAddCheck fontSize="small" />
              </ListItemIcon>
              <ListItemText>Planning aléatoire</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleClearChecked} disabled={combinedLoading || !weeklyPlanData || isNotifying}>
              <ListItemIcon>
                <DeleteSweep fontSize="small" />
              </ListItemIcon>
              <ListItemText>Réinitialiser le planning</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handlePrint} disabled>
              <ListItemIcon>
                <Print fontSize="small" />
              </ListItemIcon>
              <ListItemText>Imprimer</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleShare} disabled>
              <ListItemIcon>
                <Share fontSize="small" />
              </ListItemIcon>
              <ListItemText>Partager</ListItemText>
            </MenuItem>
          </Menu>
          <RecipeSelectionModal
            open={modalOpen}
            onClose={handleCloseModal}
            onRecipeSelect={handleRecipeSelected}
            availableRecipes={availableRecipesForPlanning}
            targetSlotInfo={targetSlotInfo}
            currentUserData={userData}
          />
          <AllergyAlertModal
            open={allergyModalOpen}
            onClose={() => setAllergyModalOpen(false)}
            alerts={allergyAlerts}
            message={allergyCheckResult?.message || ""}
          />
          <Snackbar
            open={notificationResult.open}
            autoHideDuration={6000}
            onClose={(event, reason) => {
              if (reason === "clickaway") return;
              setNotificationResult({ ...notificationResult, open: false });
            }}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={() => setNotificationResult({ ...notificationResult, open: false })}
              severity={notificationResult.severity}
              sx={{ width: "100%", borderRadius: 3, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
            >
              {notificationResult.message}
            </Alert>
          </Snackbar>
          <Dialog open={randomPlanningDialogOpen} onClose={() => setRandomPlanningDialogOpen(false)} fullScreen={isMobile}>
            <DialogTitle>Choisir le type de recettes</DialogTitle>
            <DialogContent>
              <Typography>Veuillez choisir le type de recettes pour le planning aléatoire :</Typography>
            </DialogContent>
            <DialogActions>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: "100%" }}>
                <Button fullWidth={isMobile} onClick={() => handleRandomPlanning("family")}>Recettes familiales</Button>
                <Button fullWidth={isMobile} onClick={() => handleRandomPlanning("public")}>Recettes publiques</Button>
                <Button fullWidth={isMobile} onClick={() => setRandomPlanningDialogOpen(false)}>Annuler</Button>
              </Stack>
            </DialogActions>
          </Dialog>
          <Dialog open={clearPlanningDialogOpen} onClose={() => setClearPlanningDialogOpen(false)} fullScreen={isMobile}>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogContent>
              <Typography>Êtes-vous sûr de vouloir réinitialiser tout le planning de la semaine ?</Typography>
            </DialogContent>
            <DialogActions>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: "100%" }}>
                <Button fullWidth={isMobile} onClick={() => setClearPlanningDialogOpen(false)}>Annuler</Button>
                <Button fullWidth={isMobile} onClick={handleClearPlanning} color="error">Confirmer</Button>
              </Stack>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </DragDropContext>
  );
}

export default WeeklyPlannerPage;