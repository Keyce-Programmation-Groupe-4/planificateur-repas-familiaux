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
  Badge,
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
  Info as InfoIcon,
} from "@mui/icons-material";
import { DragDropContext } from "@hello-pangea/dnd";
import { useSwipeable } from "react-swipeable";
import { isValid } from "date-fns";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// --- Firebase Imports ---
import { db, functions } from "../../firebaseConfig";
import { httpsCallable } from "firebase/functions";
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

const mealTypeNames = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
};

const isTimestampLike = (obj) => {
  return obj && typeof obj === "object" && "seconds" in obj && "nanoseconds" in obj;
};

// --- Nouvelle fonction pour vérifier les allergènes ---
const checkForAllergens = (recipe, familyMembers) => {
  if (!recipe || !recipe.ingredients || !familyMembers || familyMembers.length === 0) {
    return { hasAllergens: false, allergicMembers: [] };
  }

  const recipeIngredients = recipe.ingredients.map(ing => ing.name.toLowerCase());
  const allergicMembers = [];

  familyMembers.forEach(member => {
    if (member.dietaryPreferences?.allergies && member.dietaryPreferences.allergies.length > 0) {
      const memberAllergies = member.dietaryPreferences.allergies.map(allergy => allergy.toLowerCase());
      
      // Vérifier si un des ingrédients de la recette correspond à une allergie du membre
      const allergenFound = recipeIngredients.some(ingredient => 
        memberAllergies.some(allergy => 
          ingredient.includes(allergy) || allergy.includes(ingredient)
        )
      );
      
      if (allergenFound) {
        allergicMembers.push({
          name: member.displayName || member.personalInfo?.firstName || "Membre",
          allergies: member.dietaryPreferences.allergies
        });
      }
    }
  });

  return {
    hasAllergens: allergicMembers.length > 0,
    allergicMembers
  };
};

export default function WeeklyPlannerPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser, userData, loading: authLoading } = useAuth();
  const familyId = userData?.familyId;
  const isFamilyAdmin = userData?.familyRole === "Admin";

  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const weekId = getWeekId(currentWeekStart);

  const [weeklyPlanData, setWeeklyPlanData] = useState(null);
  const [availableRecipesForPlanning, setAvailableRecipesForPlanning] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [targetSlotInfo, setTargetSlotInfo] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const [randomPlanningDialogOpen, setRandomPlanningDialogOpen] = useState(false);
  const [clearPlanningDialogOpen, setClearPlanningDialogOpen] = useState(false);
  const [notificationResult, setNotificationResult] = useState({ open: false, message: "", severity: "info" });
  
  // --- Nouvel état pour les membres de la famille ---
  const [familyMembers, setFamilyMembers] = useState([]);
  
  // --- Nouvel état pour les alertes d'allergènes ---
  const [allergenAlerts, setAllergenAlerts] = useState({});
  
  // --- Nouvel état pour le dialogue d'information sur les allergènes ---
  const [allergenInfoDialog, setAllergenInfoDialog] = useState({
    open: false,
    recipe: null,
    allergicMembers: []
  });

  // --- Swipe Handlers ---
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNextWeek(),
    onSwipedRight: () => handlePreviousWeek(),
    preventDefaultTouchmoveEvent: true,
    trackMouse: false,
  });

  // --- Data Fetching ---
  useEffect(() => {
    if (authLoading || !familyId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching data for week: ${weekId}`);

      try {
        // Récupérer les recettes familiales
        const familyRecipesRef = collection(db, "recipes");
        const familyRecipesQuery = query(familyRecipesRef, where("familyId", "==", familyId));
        const familyRecipesSnap = await getDocs(familyRecipesQuery);
        const familyRecipes = familyRecipesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isFamilyRecipe: true,
        }));
        console.log(`Fetched ${familyRecipes.length} family recipes.`);

        // Récupérer les recettes publiques
        const publicRecipesRef = collection(db, "recipes");
        const publicRecipesQuery = query(publicRecipesRef, where("visibility", "==", "public"));
        const publicRecipesSnap = await getDocs(publicRecipesQuery);
        const publicRecipes = publicRecipesSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data(), isFamilyRecipe: false }))
          .filter((recipe) => recipe.familyId !== familyId); // Exclure les recettes déjà dans la famille
        console.log(`Fetched ${publicRecipes.length} public recipes.`);

        // Combiner et trier les recettes
        const combinedRecipes = [...familyRecipes, ...publicRecipes].sort((a, b) => {
          if (a.isFamilyRecipe && !b.isFamilyRecipe) return -1;
          if (!a.isFamilyRecipe && b.isFamilyRecipe) return 1;
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
        });

        setAvailableRecipesForPlanning(combinedRecipes);
        console.log(`Fetched and combined ${combinedRecipes.length} recipes for planning.`);

        // Récupérer les membres de la famille
        const familyDocRef = doc(db, "families", familyId);
        const familySnap = await getDoc(familyDocRef);
        
        if (familySnap.exists()) {
          const fetchedFamilyData = familySnap.data();
          if (fetchedFamilyData.memberUids && fetchedFamilyData.memberUids.length > 0) {
            const memberPromises = fetchedFamilyData.memberUids.map((uid) => getDoc(doc(db, "users", uid)));
            const memberDocs = await Promise.all(memberPromises);
            const members = memberDocs
              .map((docSnap) => (docSnap.exists() ? { uid: docSnap.id, ...docSnap.data() } : null))
              .filter(Boolean);
            setFamilyMembers(members);
            console.log(`Fetched ${members.length} family members.`);
          }
        }

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

  // --- Effet pour vérifier les allergènes dans le planning ---
  useEffect(() => {
    if (!weeklyPlanData || !weeklyPlanData.days || !familyMembers.length || !availableRecipesForPlanning.length) {
      return;
    }

    const alerts = {};

    // Parcourir tous les jours et repas du planning
    Object.entries(weeklyPlanData.days).forEach(([day, meals]) => {
      Object.entries(meals).forEach(([mealType, recipeId]) => {
        if (recipeId) {
          const recipe = availableRecipesForPlanning.find(r => r.id === recipeId);
          if (recipe) {
            const allergenCheck = checkForAllergens(recipe, familyMembers);
            if (allergenCheck.hasAllergens) {
              alerts[`${day}-${mealType}`] = allergenCheck;
            }
          }
        }
      });
    });

    setAllergenAlerts(alerts);
    console.log("Allergen alerts updated:", alerts);
  }, [weeklyPlanData, familyMembers, availableRecipesForPlanning]);

  // --- Function to create default plan structure ---
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

  // --- Plan Saving Logic ---
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
        setTimeout(() => setShowSuccess(false), 2000);
      } catch (err) {
        console.error("Error saving plan to Firestore: ", err);
        setError("La sauvegarde a échoué. Veuillez réessayer.");
      } finally {
        setIsSaving(false);
      }
    },
    [familyId, weekId, currentWeekStart],
  );

  // --- Menu Handlers ---
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

    // Ajouter une section pour les alertes d'allergènes
    const allergenWarnings = [];
    
    orderedDays.forEach((dayKey) => {
      const dayName = dayNames[dayKey];
      const dayMeals = weeklyPlanData.days[dayKey];
      content.push({ text: dayName, style: "dayHeader", margin: [0, 15, 0, 5] });
      const dayContent = [];
      
      // Petit-déjeuner
      const breakfast = dayMeals.breakfast
        ? availableRecipesForPlanning.find((r) => r.id === dayMeals.breakfast)?.name || "Recette inconnue"
        : "Aucun repas planifié";
      
      // Vérifier les allergènes pour le petit-déjeuner
      let breakfastText = breakfast;
      if (allergenAlerts[`${dayKey}-breakfast`]) {
        breakfastText = `${breakfast} ⚠️`;
        const recipe = availableRecipesForPlanning.find((r) => r.id === dayMeals.breakfast);
        const alert = allergenAlerts[`${dayKey}-breakfast`];
        allergenWarnings.push({
          day: dayName,
          meal: "Petit-déjeuner",
          recipe: recipe?.name || "Recette inconnue",
          members: alert.allergicMembers.map(m => `${m.name} (${m.allergies.join(', ')})`).join(', ')
        });
      }
      dayContent.push(["Petit-déjeuner", breakfastText]);
      
      // Déjeuner
      const lunch = dayMeals.lunch
        ? availableRecipesForPlanning.find((r) => r.id === dayMeals.lunch)?.name || "Recette inconnue"
        : "Aucun repas planifié";
      
      // Vérifier les allergènes pour le déjeuner
      let lunchText = lunch;
      if (allergenAlerts[`${dayKey}-lunch`]) {
        lunchText = `${lunch} ⚠️`;
        const recipe = availableRecipesForPlanning.find((r) => r.id === dayMeals.lunch);
        const alert = allergenAlerts[`${dayKey}-lunch`];
        allergenWarnings.push({
          day: dayName,
          meal: "Déjeuner",
          recipe: recipe?.name || "Recette inconnue",
          members: alert.allergicMembers.map(m => `${m.name} (${m.allergies.join(', ')})`).join(', ')
        });
      }
      dayContent.push(["Déjeuner", lunchText]);
      
      // Dîner
      const dinner = dayMeals.dinner
        ? availableRecipesForPlanning.find((r) => r.id === dayMeals.dinner)?.name || "Recette inconnue"
        : "Aucun repas planifié";
      
      // Vérifier les allergènes pour le dîner
      let dinnerText = dinner;
      if (allergenAlerts[`${dayKey}-dinner`]) {
        dinnerText = `${dinner} ⚠️`;
        const recipe = availableRecipesForPlanning.find((r) => r.id === dayMeals.dinner);
        const alert = allergenAlerts[`${dayKey}-dinner`];
        allergenWarnings.push({
          day: dayName,
          meal: "Dîner",
          recipe: recipe?.name || "Recette inconnue",
          members: alert.allergicMembers.map(m => `${m.name} (${m.allergies.join(', ')})`).join(', ')
        });
      }
      dayContent.push(["Dîner", dinnerText]);
      
      content.push({
        layout: "lightHorizontalLines",
        table: { headerRows: 0, widths: ["30%", "*"], body: dayContent },
        margin: [0, 0, 0, 10],
      });
    });

    // Ajouter la section des alertes d'allergènes si nécessaire
    if (allergenWarnings.length > 0) {
      content.push({ text: "⚠️ Alertes d'allergènes", style: "warningHeader", margin: [0, 20, 0, 10] });
      
      const warningTableBody = [
        [{ text: "Jour", style: "tableHeader" }, { text: "Repas", style: "tableHeader" }, 
         { text: "Recette", style: "tableHeader" }, { text: "Membres concernés", style: "tableHeader" }]
      ];
      
      allergenWarnings.forEach(warning => {
        warningTableBody.push([warning.day, warning.meal, warning.recipe, warning.members]);
      });
      
      content.push({
        layout: "lightHorizontalLines",
        table: { 
          headerRows: 1, 
          widths: ["15%", "20%", "25%", "40%"], 
          body: warningTableBody 
        },
        margin: [0, 0, 0, 20],
      });
    }

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
        warningHeader: { fontSize: 14, bold: true, color: "red", margin: [0, 15, 0, 5] },
        tableHeader: { fontSize: 11, bold: true, color: theme.palette.primary.main }
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
      setNotificationResult({ open: true, message: result.data.message || "Notifications envoyées !", severity: "success" });
    } catch (error) {
      console.error("Error calling notifyFamilyPlanReady function:", error);
      setNotificationResult({ open: true, message: error.message || "Erreur lors de l'envoi des notifications.", severity: "error" });
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

  // --- Event Handlers ---
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

  // --- Drag and Drop Handler ---
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

  // --- Navigate to Shopping List ---
  const handleGoToShoppingList = () => {
    navigate(`/shopping-list?week=${weekId}`);
  };
  
  // --- Gestionnaire pour ouvrir le dialogue d'information sur les allergènes ---
  const handleOpenAllergenInfo = (day, mealType) => {
    const alertKey = `${day}-${mealType}`;
    if (allergenAlerts[alertKey]) {
      const recipeId = weeklyPlanData.days[day][mealType];
      const recipe = availableRecipesForPlanning.find(r => r.id === recipeId);
      
      setAllergenInfoDialog({
        open: true,
        recipe,
        allergicMembers: allergenAlerts[alertKey].allergicMembers
      });
    }
  };
  
  // --- Gestionnaire pour fermer le dialogue d'information sur les allergènes ---
  const handleCloseAllergenInfo = () => {
    setAllergenInfoDialog({
      open: false,
      recipe: null,
      allergicMembers: []
    });
  };

  // --- Random Planning Generation ---
  const handleGenerateRandomPlanning = async () => {
    if (!familyId || isLoading || isSaving || isNotifying) return;

    setRandomPlanningDialogOpen(false);
    setIsSaving(true);
    setError(null);

    try {
      // Créer un nouveau plan vide
      const newPlan = createDefaultPlan(familyId, currentWeekStart, false);

      // Filtrer les recettes disponibles (uniquement familiales ou toutes)
      const eligibleRecipes = availableRecipesForPlanning.filter((recipe) => recipe.isFamilyRecipe);

      if (eligibleRecipes.length === 0) {
        throw new Error("Aucune recette disponible pour générer un planning aléatoire.");
      }

      // Pour chaque jour et type de repas, assigner une recette aléatoire
      orderedDays.forEach((day) => {
        ["breakfast", "lunch", "dinner"].forEach((mealType) => {
          // 70% de chance d'assigner une recette
          if (Math.random() < 0.7) {
            const randomIndex = Math.floor(Math.random() * eligibleRecipes.length);
            newPlan.days[day][mealType] = eligibleRecipes[randomIndex].id;
          }
        });
      });

      // Sauvegarder le nouveau plan
      await savePlan(newPlan, true);
      setWeeklyPlanData(newPlan);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error("Error generating random planning:", err);
      setError(`Erreur lors de la génération du planning aléatoire: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Clear Planning ---
  const handleClearPlanning = async () => {
    if (!familyId || isLoading || isSaving || isNotifying) return;

    setClearPlanningDialogOpen(false);
    setIsSaving(true);
    setError(null);

    try {
      // Créer un nouveau plan vide
      const newPlan = createDefaultPlan(familyId, currentWeekStart, false);
      
      // Sauvegarder le nouveau plan
      await savePlan(newPlan, true);
      setWeeklyPlanData(newPlan);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error("Error clearing planning:", err);
      setError(`Erreur lors de la réinitialisation du planning: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render ---
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }} {...swipeHandlers}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
          Planning Hebdomadaire
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Générer liste de courses">
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<ShoppingCartIcon />}
                onClick={handleGoToShoppingList}
                disabled={isLoading || isSaving || isNotifying}
              >
                Liste de courses
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Plus d'options">
            <IconButton
              onClick={handleMenuClick}
              color="primary"
              disabled={isLoading || isSaving || isNotifying}
            >
              <MoreVert />
            </IconButton>
          </Tooltip>
        </Stack>
        <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
          <MenuItem onClick={handleRefresh}>
            <ListItemIcon>
              <AutoAwesomeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Rafraîchir</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleUncheckAll}>
            <ListItemIcon>
              <PlaylistAddCheck fontSize="small" />
            </ListItemIcon>
            <ListItemText>Générer planning aléatoire</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleClearChecked}>
            <ListItemIcon>
              <DeleteSweep fontSize="small" />
            </ListItemIcon>
            <ListItemText>Réinitialiser planning</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleExportPdf}>
            <ListItemIcon>
              <PictureAsPdf fontSize="small" />
            </ListItemIcon>
            <ListItemText>Exporter en PDF</ListItemText>
          </MenuItem>
          <MenuItem onClick={handlePrint}>
            <ListItemIcon>
              <Print fontSize="small" />
            </ListItemIcon>
            <ListItemText>Imprimer</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleShare}>
            <ListItemIcon>
              <Share fontSize="small" />
            </ListItemIcon>
            <ListItemText>Partager</ListItemText>
          </MenuItem>
          {isFamilyAdmin && (
            <MenuItem onClick={handleNotifyFamily} disabled={isNotifying}>
              <ListItemIcon>
                {isNotifying ? <ButtonCircularProgress size={20} /> : <NotifyIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText>Notifier la famille</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <WeekNavigator
        currentWeekStart={currentWeekStart}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onGoToToday={handleGoToToday}
        disabled={isLoading || isSaving || isNotifying}
      />

      {isLoading ? (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {orderedDays.map((day) => (
              <Grid item xs={12} sm={6} md={4} lg={true} key={day}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    height: "100%",
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    <Skeleton width="60%" />
                  </Typography>
                  <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 1 }} />
                  <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 1 }} />
                  <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Grid container spacing={2}>
            {orderedDays.map((day) => (
              <Grid item xs={12} sm={6} md={4} lg={true} key={day}>
                <DayColumn
                  day={day}
                  dayName={dayNames[day]}
                  meals={weeklyPlanData?.days[day] || { breakfast: null, lunch: null, dinner: null }}
                  recipes={availableRecipesForPlanning}
                  onOpenModal={handleOpenModal}
                  onDeleteRecipe={handleDeleteRecipeFromSlot}
                  disabled={isSaving || isNotifying}
                  allergenAlerts={allergenAlerts}
                  onOpenAllergenInfo={handleOpenAllergenInfo}
                />
              </Grid>
            ))}
          </Grid>
        </DragDropContext>
      )}

      <RecipeSelectionModal
        open={modalOpen}
        onClose={handleCloseModal}
        recipes={availableRecipesForPlanning}
        onRecipeSelected={handleRecipeSelected}
        targetSlotInfo={targetSlotInfo}
        dayNames={dayNames}
        mealTypeNames={mealTypeNames}
      />

      <Dialog open={randomPlanningDialogOpen} onClose={() => setRandomPlanningDialogOpen(false)}>
        <DialogTitle>Générer un planning aléatoire</DialogTitle>
        <DialogContent>
          <DialogContent>
            <Typography>
              Voulez-vous générer un planning aléatoire pour cette semaine ? Cela remplacera votre planning actuel.
            </Typography>
          </DialogContent>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRandomPlanningDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleGenerateRandomPlanning}
            variant="contained"
            color="primary"
            disabled={isSaving}
            startIcon={isSaving ? <ButtonCircularProgress size={20} /> : <AutoAwesomeIcon />}
          >
            Générer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={clearPlanningDialogOpen} onClose={() => setClearPlanningDialogOpen(false)}>
        <DialogTitle>Réinitialiser le planning</DialogTitle>
        <DialogContent>
          <DialogContent>
            <Typography>
              Voulez-vous réinitialiser le planning de cette semaine ? Tous les repas seront supprimés.
            </Typography>
          </DialogContent>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearPlanningDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleClearPlanning}
            variant="contained"
            color="error"
            disabled={isSaving}
            startIcon={isSaving ? <ButtonCircularProgress size={20} /> : <DeleteSweep />}
          >
            Réinitialiser
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogue d'information sur les allergènes */}
      <Dialog 
        open={allergenInfoDialog.open} 
        onClose={handleCloseAllergenInfo}
        maxWidth="md"
      >
        <DialogTitle sx={{ bgcolor: theme.palette.error.light, color: theme.palette.error.contrastText }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningIcon color="inherit" />
            <Typography variant="h6">Alerte Allergène</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {allergenInfoDialog.recipe?.name || "Recette"}
            </Typography>
            
            <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
              Cette recette contient des ingrédients auxquels certains membres de la famille sont allergiques :
            </Typography>
            
            <Box sx={{ mt: 2, mb: 2 }}>
              {allergenInfoDialog.allergicMembers.map((member, index) => (
                <Paper 
                  key={index} 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    mb: 1, 
                    bgcolor: alpha(theme.palette.error.light, 0.1),
                    border: `1px solid ${theme.palette.error.light}`,
                    borderRadius: 2
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>{member.name}</strong> est allergique à :
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {member.allergies.map((allergy, i) => (
                      <Chip 
                        key={i} 
                        label={allergy} 
                        color="error" 
                        size="small" 
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              Ingrédients de la recette :
            </Typography>
            <Box sx={{ mt: 1 }}>
              {allergenInfoDialog.recipe?.ingredients?.map((ingredient, index) => (
                <Chip 
                  key={index} 
                  label={`${ingredient.name} (${ingredient.quantity} ${ingredient.unit})`} 
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAllergenInfo} color="primary">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        message="Planning sauvegardé avec succès !"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      <Snackbar
        open={notificationResult.open}
        autoHideDuration={4000}
        onClose={() => setNotificationResult({ ...notificationResult, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={notificationResult.severity} sx={{ width: "100%" }}>
          {notificationResult.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
