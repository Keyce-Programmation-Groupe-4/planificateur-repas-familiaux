"use client"

import { useState, useEffect, useRef, Component, useCallback } from "react"
import {
  Typography,
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Fade,
  Stack,
  Fab,
  TextField,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  Tooltip,
  Zoom,
  Chip,
  Snackbar,
} from "@mui/material"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import AddIcon from "@mui/icons-material/Add"
import CalendarIcon from "@mui/icons-material/CalendarMonth"
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf"
import SaveIcon from "@mui/icons-material/Save"
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart"
import GroupIcon from "@mui/icons-material/Group"
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings"
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close'
import { useAuth } from "../contexts/AuthContext"
import { db } from "../firebaseConfig"
import { collection, query, where, getDocs, doc, getDoc, setDoc, Timestamp, orderBy, serverTimestamp } from "firebase/firestore"
import { format, eachDayOfInterval, getDay, startOfWeek, endOfWeek, isValid, differenceInYears, addWeeks, startOfDay } from "date-fns"
import { fr } from "date-fns/locale"
import { generateRandomPlan } from "../utils/plannerUtils"
import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import Chatbot from "./Chatbot"

pdfMake.vfs = pdfFonts.vfs

const MEAL_CATEGORIES = [
  { value: "breakfast", label: "Petit-déjeuner" },
  { value: "lunch", label: "Déjeuner" },
  { value: "dinner", label: "Dîner" },
]

const orderedDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
const dayNames = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

// Fonction pour vérifier si un objet ressemble à un Timestamp
const isTimestampLike = (value) => {
  return value && typeof value === "object" && value.hasOwnProperty("seconds") && value.hasOwnProperty("nanoseconds");
};

// Fonction pour obtenir l'ID de la semaine
const getWeekId = (date) => {
  const startDate = startOfWeek(date, { weekStartsOn: 1 });
  const year = startDate.getFullYear();
  const thursday = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const weekNumber = Math.ceil(1 + (thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${String(weekNumber).padStart(2, "0")}`;
};

// Fonction pour obtenir toutes les semaines entre deux dates
const getWeeksBetween = (start, end) => {
  const weeks = [];
  let current = startOfWeek(start, { weekStartsOn: 1 });
  const endWeek = startOfWeek(end, { weekStartsOn: 1 });
  while (current <= endWeek) {
    weeks.push(current);
    current = addWeeks(current, 1);
  }
  return weeks;
};

class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught in ErrorBoundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          Une erreur est survenue. Veuillez réessayer. ({this.state.error?.message})
        </Alert>
      )
    }
    return this.props.children
  }
}

export default function HomePage() {
  const { currentUser, userData, loading: authLoading } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

  // --- State pour les données de la famille ---
  const [familyData, setFamilyData] = useState(null)
  const [familyMembers, setFamilyMembers] = useState([])
  const [loadingFamily, setLoadingFamily] = useState(false)

  // --- State pour le chatbot ---
  const [chatOpen, setChatOpen] = useState(false)

  // --- Récupération des données de la famille ---
  useEffect(() => {
    const fetchFamilyData = async () => {
      if (!userData?.familyId || loadingFamily) return;
      
      setLoadingFamily(true);
      try {
        const familyDocRef = doc(db, "families", userData.familyId);
        const familySnap = await getDoc(familyDocRef);
        
        if (familySnap.exists()) {
          const fetchedFamilyData = { id: familySnap.id, ...familySnap.data() };
          setFamilyData(fetchedFamilyData);
          
          if (fetchedFamilyData.memberUids && fetchedFamilyData.memberUids.length > 0) {
            const memberPromises = fetchedFamilyData.memberUids.map((uid) => 
              getDoc(doc(db, "users", uid))
            );
            const memberDocs = await Promise.all(memberPromises);
            const members = memberDocs
              .map((docSnap) => (docSnap.exists() ? { uid: docSnap.id, ...docSnap.data() } : null))
              .filter(Boolean);
            setFamilyMembers(members);
          }
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des données de la famille:", err);
      } finally {
        setLoadingFamily(false);
      }
    };
    
    if (userData?.familyId && !authLoading) {
      fetchFamilyData();
    }
  }, [userData, authLoading]);

  const LandingPage = () => (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
        minHeight: "100vh",
        py: { xs: 4, sm: 8 },
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: { xs: 4, sm: 8 } }}>
          <Typography
            variant="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "2rem", sm: "3rem", md: "4rem" },
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: { xs: 1, sm: 2 },
            }}
          >
            Planifiez vos repas en famille facilement
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: { xs: 2, sm: 4 }, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
            Organisez vos repas, gérez vos recettes et simplifiez vos courses avec notre application intuitive.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              href="/signup"
              sx={{
                py: { xs: 1.5, sm: 2 },
                px: { xs: 3, sm: 4 },
                borderRadius: 3,
                fontSize: { xs: "0.9rem", sm: "1.1rem" },
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              }}
            >
              S'inscrire
            </Button>
            <Button
              variant="outlined"
              size="large"
              href="/login"
              sx={{
                py: { xs: 1.5, sm: 2 },
                px: { xs: 3, sm: 4 },
                borderRadius: 3,
                fontSize: { xs: "0.9rem", sm: "1.1rem" },
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
              }}
            >
              Se connecter
            </Button>
          </Stack>
        </Box>

        <Box sx={{ mb: { xs: 4, sm: 8 } }}>
          <Typography variant="h4" align="center" sx={{ mb: { xs: 2, sm: 4 }, fontWeight: 700, fontSize: { xs: "1.5rem", sm: "2rem" } }}>
            Fonctionnalités clés
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 4 }}>
            {[
              {
                title: "Planification hebdomadaire",
                description: "Organisez vos repas pour la semaine en quelques clics.",
                image: "/planning-repas.png",
              },
              {
                title: "Gestion des recettes",
                description: "Créez, modifiez et partagez vos recettes familiales.",
                image: "/gestion-recettes.png",
              },
              {
                title: "Liste de courses automatique",
                description: "Générez votre liste de courses en un clic.",
                image: "/marche.png",
              },
              {
                title: "Collaboration familiale",
                description: "Partagez et collaborez avec les membres de votre famille.",
                image: "/colab-famille.png",
              },
            ].map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    textAlign: "center",
                    height: "100%",
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        height: { xs: 150, sm: 200 },
                        overflow: "hidden",
                        borderRadius: 8,
                        marginBottom: { xs: 1, sm: 2 },
                      }}
                    >
                      <img
                        src={feature.image}
                        alt={feature.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mb: { xs: 4, sm: 8 }, textAlign: "center" }}>
          <Typography variant="h4" sx={{ mb: { xs: 2, sm: 4 }, fontWeight: 700, fontSize: { xs: "1.5rem", sm: "2rem" } }}>
            Ils nous font confiance
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 4 }} justifyContent="center">
            {[
              { name: "Famille Dupont", quote: "Une application indispensable pour notre organisation familiale !" },
              { name: "Marie L.", quote: "Facile à utiliser et très pratique pour gérer les repas." },
              { name: "Jean P.", quote: "La liste de courses automatique est un vrai gain de temps." },
            ].map((testimonial, index) => (
              <Grid item xs={12} sm={4} key={index}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                    p: { xs: 2, sm: 3 },
                  }}
                >
                  <Typography variant="body1" sx={{ mb: 2, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                    "{testimonial.quote}"
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                    - {testimonial.name}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ textAlign: "center", mb: { xs: 4, sm: 8 } }}>
          <Typography variant="h4" sx={{ mb: { xs: 1, sm: 2 }, fontWeight: 700, fontSize: { xs: "1.5rem", sm: "2rem" } }}>
            Prêt à simplifier votre vie ?
          </Typography>
          <Button
            variant="contained"
            size="large"
            href="/signup"
            sx={{
              py: { xs: 1.5, sm: 2 },
              px: { xs: 3, sm: 4 },
              borderRadius: 3,
              fontSize: { xs: "0.9rem", sm: "1.1rem" },
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            }}
          >
            Commencer maintenant
          </Button>
        </Box>
      </Container>
    </Box>
  )

  const Dashboard = () => {
    const [startDate, setStartDate] = useState(null)
    const [endDate, setEndDate] = useState(null)
    const [selectedCategories, setSelectedCategories] = useState(["breakfast", "lunch", "dinner"])
    const [loadingGenerator, setLoadingGenerator] = useState(false)
    const [generatorError, setGeneratorError] = useState("")
    const [generatorSuccess, setGeneratorSuccess] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [generatedPlan, setGeneratedPlan] = useState([])
    const [availableRecipes, setAvailableRecipes] = useState([])
    const [randomPlanningDialogOpen, setRandomPlanningDialogOpen] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
      const fetchRecipes = async () => {
        if (!userData?.familyId) return;
        
        try {
          setLoadingGenerator(true);
          
          const recipesRef = collection(db, "recipes");
          const familyRecipesQuery = query(
            recipesRef, 
            where("familyId", "==", userData.familyId),
            orderBy("createdAt", "desc")
          );
          const publicRecipesQuery = query(
            recipesRef, 
            where("visibility", "==", "public"),
            orderBy("createdAt", "desc")
          );
          
          const [familySnapshot, publicSnapshot] = await Promise.all([
            getDocs(familyRecipesQuery),
            getDocs(publicRecipesQuery)
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
          
          setAvailableRecipes(combinedRecipes);
          console.log(`Récupération de ${combinedRecipes.length} recettes pour la planification.`);
          
        } catch (error) {
          console.error("Erreur lors de la récupération des recettes:", error);
          setGeneratorError("Erreur lors de la récupération des recettes. Veuillez réessayer.");
        } finally {
          setLoadingGenerator(false);
        }
      };
      
      fetchRecipes();
    }, [userData?.familyId]);

    const generateMealPlan = () => {
      if (!startDate || !endDate || selectedCategories.length === 0) {
        setGeneratorError("Veuillez sélectionner les dates et au moins une catégorie de repas.")
        return
      }

      if (startDate > endDate) {
        setGeneratorError("La date de début doit être antérieure à la date de fin.")
        return
      }

      setLoadingGenerator(true)
      setGeneratorError("")
      setGeneratorSuccess("")

      try {
        if (availableRecipes.length === 0) {
          setGeneratorError("Aucune recette disponible pour générer un planning.")
          setLoadingGenerator(false)
          return
        }

        const weeks = getWeeksBetween(startDate, endDate);
        const plan = [];

        weeks.forEach((weekStart) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

          days.forEach((day) => {
            selectedCategories.forEach((category) => {
              const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)]
              plan.push({
                date: day,
                category,
                recipeId: randomRecipe.id,
                recipeName: randomRecipe.name,
                recipeImage: randomRecipe.imageUrl || null,
                weekId: getWeekId(day),
              })
            })
          })
        })

        setGeneratedPlan(plan)
        setDialogOpen(true)
        setGeneratorSuccess("Planning généré avec succès pour toutes les semaines sélectionnées !")
      } catch (error) {
        console.error("Error generating meal plan:", error)
        setGeneratorError("Une erreur est survenue lors de la génération du planning.")
      } finally {
        setLoadingGenerator(false)
      }
    }

    const handleRandomPlanning = (type) => {
      setRandomPlanningDialogOpen(false);
      setLoadingGenerator(true);
      setGeneratorError("");
      setGeneratorSuccess("");

      try {
        if (!startDate || !endDate || selectedCategories.length === 0) {
          setGeneratorError("Veuillez sélectionner les dates et au moins une catégorie de repas.");
          setLoadingGenerator(false);
          return;
        }

        const filteredRecipes = type === "family"
          ? availableRecipes.filter((r) => r.isFamilyRecipe)
          : availableRecipes.filter((r) => r.visibility === "public");

        if (filteredRecipes.length === 0) {
          setGeneratorError(`Aucune recette ${type === "family" ? "familiale" : "publique"} disponible.`);
          setLoadingGenerator(false);
          return;
        }

        const weeks = getWeeksBetween(startDate, endDate);
        const plan = [];

        weeks.forEach((weekStart) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

          days.forEach((day) => {
            selectedCategories.forEach((category) => {
              const randomRecipe = filteredRecipes[Math.floor(Math.random() * filteredRecipes.length)];
              plan.push({
                date: day,
                category,
                recipeId: randomRecipe.id,
                recipeName: randomRecipe.name,
                recipeImage: randomRecipe.imageUrl || null,
                weekId: getWeekId(day),
              })
            })
          })
        });

        setGeneratedPlan(plan);
        setDialogOpen(true);
        setGeneratorSuccess("Planning généré avec succès pour toutes les semaines sélectionnées !");
      } catch (error) {
        console.error("Erreur lors de la génération du planning aléatoire:", error);
        setGeneratorError("Une erreur est survenue lors de la génération du planning.");
      } finally {
        setLoadingGenerator(false);
      }
    };

    const exportToPDF = () => {
      if (!generatedPlan || generatedPlan.length === 0) {
        setGeneratorError("Aucun planning à exporter.")
        return
      }

      const content = []
      content.push({ text: "Planning de Repas Familial", style: "header", alignment: "center" })
      content.push({
        text: `Période du ${format(startDate, "d MMMM yyyy", { locale: fr })} au ${format(endDate, "d MMMM yyyy", { locale: fr })}`,
        style: "subheader",
        alignment: "center",
        margin: [0, 0, 0, 20],
      })

      const weeks = getWeeksBetween(startDate, endDate);
      weeks.forEach((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekId = getWeekId(weekStart);
        content.push({ text: `Semaine ${weekId}`, style: "weekHeader", margin: [0, 20, 0, 10] });

        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        days.forEach((day) => {
          const dayName = format(day, "EEEE d MMMM", { locale: fr });
          const dayMeals = generatedPlan.filter((item) => format(item.date, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"));
          
          content.push({ text: dayName, style: "dayHeader", margin: [0, 15, 0, 5] });
          
          const dayContent = [];
          selectedCategories.forEach((category) => {
            const meal = dayMeals.find((m) => m.category === category);
            const recipeName = meal ? meal.recipeName : "Aucun repas planifié";
            dayContent.push([MEAL_CATEGORIES.find((cat) => cat.value === category)?.label, recipeName]);
          });
          
          content.push({
            layout: "lightHorizontalLines",
            table: { headerRows: 0, widths: ["30%", "*"], body: dayContent },
            margin: [0, 0, 0, 10],
          });
        });
      });

      const usedRecipes = new Set();
      generatedPlan.forEach((item) => {
        if (item.recipeName) {
          usedRecipes.add(item.recipeName);
        }
      });

      if (usedRecipes.size > 0) {
        content.push({ text: "Recettes utilisées", style: "sectionHeader", margin: [0, 20, 0, 10] });
        content.push({ ul: Array.from(usedRecipes).sort(), margin: [0, 0, 0, 10] });
      }

      const docDefinition = {
        content,
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 5] },
          subheader: { fontSize: 14, color: "gray", italics: true },
          weekHeader: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
          dayHeader: { fontSize: 14, bold: true, color: theme.palette.primary.main, margin: [0, 15, 0, 5] },
          sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
        },
        defaultStyle: {
          fontSize: 10,
        },
      };

      try {
        const pdfFileName = `planning_repas_${format(startDate, "yyyy-MM-dd")}_to_${format(endDate, "yyyy-MM-dd")}.pdf`;
        pdfMake.createPdf(docDefinition).download(pdfFileName);
        setGeneratorSuccess("PDF généré avec succès !");
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } catch (error) {
        console.error("Error generating PDF: ", error);
        setGeneratorError("Erreur lors de la génération du PDF.");
      }
    };

    const addToWeeklyPlanner = async () => {
      if (!userData?.familyId) {
        setGeneratorError("Vous devez faire partie d'une famille pour ajouter au planning hebdomadaire.");
        return;
      }
      
      setIsSaving(true);
      setLoadingGenerator(true);
      
      try {
        const weeks = getWeeksBetween(startDate, endDate);
        const planPromises = weeks.map(async (weekStart) => {
          const weekId = getWeekId(weekStart);
          const planDocRef = doc(db, "families", userData.familyId, "weeklyPlans", weekId);
          
          const planData = {
            familyId: userData.familyId,
            startDate: Timestamp.fromDate(startOfWeek(weekStart, { weekStartsOn: 1 })),
            endDate: Timestamp.fromDate(endOfWeek(weekStart, { weekStartsOn: 1 })),
            days: orderedDays.reduce((acc, day) => {
              acc[day] = { breakfast: null, lunch: null, dinner: null };
              return acc;
            }, {}),
            createdAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp(),
          };
          
          const weekMeals = generatedPlan.filter((item) => item.weekId === weekId);
          weekMeals.forEach((item) => {
            const date = new Date(item.date);
            let dayIndex = getDay(date);
            dayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
            const dayKey = orderedDays[dayIndex];
            
            if (planData.days[dayKey] && selectedCategories.includes(item.category)) {
              planData.days[dayKey][item.category] = item.recipeId;
            }
          });
          
          console.log(`Données à sauvegarder pour la semaine ${weekId}:`, planData);
          await setDoc(planDocRef, planData, { merge: true });
        });
        
        await Promise.all(planPromises);
        
        setGeneratorSuccess("Planning ajouté au WeeklyPlanner pour toutes les semaines sélectionnées !");
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        setDialogOpen(false);
      } catch (err) {
        console.error("Error adding to weekly planner:", err);
        setGeneratorError("Erreur lors de l'ajout au planning hebdomadaire.");
      } finally {
        setIsSaving(false);
        setLoadingGenerator(false);
      }
    };

    const QuickActions = () => {
      const quickActions = [
        {
          title: "Planifier la Semaine",
          description: "Organisez vos repas",
          icon: <CalendarIcon />,
          color: theme.palette.primary.main,
          path: "/planner",
        },
        {
          title: "Ajouter une Recette",
          description: "Nouvelle création",
          icon: <AddIcon />,
          color: theme.palette.secondary.main,
          path: "/recipes",
        },
        {
          title: "Liste de Courses",
          description: "Préparez vos achats",
          icon: <ShoppingCartIcon />,
          color: theme.palette.success.main,
          path: "/shopping-list",
        },
        {
          title: userData?.familyRole === "Admin" ? "Gérer la Famille" : "Ma Famille",
          description: userData?.familyRole === "Admin" ? "Administration" : "Voir les membres",
          icon: userData?.familyRole === "Admin" ? <AdminPanelSettingsIcon /> : <GroupIcon />,
          color: userData?.familyRole === "Admin" ? theme.palette.error.main : theme.palette.warning.main,
          path: "/family",
        },
      ]

      return (
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            height: "100%",
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontWeight: 600,
                fontSize: { xs: "1rem", sm: "1.25rem" },
              }}
            >
              Actions Rapides
            </Typography>
            <Stack spacing={2}>
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  startIcon={action.icon}
                  fullWidth
                  sx={{
                    borderRadius: 3,
                    py: 1.5,
                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                    borderColor: alpha(action.color, 0.5),
                    color: action.color,
                    textAlign: "left",
                    justifyContent: "flex-start",
                    "&:hover": {
                      backgroundColor: alpha(action.color, 0.1),
                      borderColor: action.color,
                    },
                  }}
                  onClick={() => window.location.href = action.path}
                >
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                      {action.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {action.description}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )
    }

    const handleChatToggle = () => {
      setChatOpen(!chatOpen)
    }

    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          py: { xs: 2, sm: 4 },
        }}
      >
        <Container maxWidth="xl">
          <Fade in timeout={600} mountOnEnter unmountOnExit>
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  mb: { xs: 2, sm: 4 },
                  textAlign: "center",
                  fontSize: { xs: "1.5rem", sm: "2rem", md: "3rem" },
                }}
              >
                Bienvenue, {userData?.displayName || "Utilisateur"}
              </Typography>

              {generatorError && (
                <Alert
                  severity="error"
                  sx={{ mb: 3, borderRadius: 4 }}
                  onClose={() => setGeneratorError("")}
                >
                  {generatorError}
                </Alert>
              )}
              {generatorSuccess && (
                <Alert
                  severity="success"
                  sx={{ mb: 3, borderRadius: 4 }}
                  onClose={() => setGeneratorSuccess("")}
                >
                  {generatorSuccess}
                </Alert>
              )}
              
              <Snackbar
                open={showSuccess}
                autoHideDuration={2000}
                onClose={() => setShowSuccess(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              >
                <Alert severity="success" sx={{ width: '100%', borderRadius: 2 }}>
                  Opération réussie !
                </Alert>
              </Snackbar>

              <Grid container spacing={3} alignItems="stretch">
                <Grid item xs={12} md={8}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 4,
                      background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                      border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      height: "100%",
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Typography
                        variant="h5"
                        sx={{
                          mb: 3,
                          fontWeight: 600,
                          fontSize: { xs: "1.25rem", sm: "1.5rem" },
                        }}
                      >
                        Générer un Planning de Repas Aléatoire
                      </Typography>
                      
                      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                          icon={<AutoAwesomeIcon />}
                          label={`${availableRecipes.length} recettes disponibles`}
                          variant="outlined"
                          sx={{
                            borderRadius: 3,
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            "& .MuiChip-icon": { color: theme.palette.primary.main },
                          }}
                        />
                        <Chip
                          label={`${availableRecipes.filter(r => r.isFamilyRecipe).length} recettes familiales`}
                          variant="outlined"
                          sx={{
                            borderRadius: 3,
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          }}
                        />
                        <Chip
                          label={`${availableRecipes.filter(r => r.visibility === "public").length} recettes publiques`}
                          variant="outlined"
                          sx={{
                            borderRadius: 3,
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          }}
                        />
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                            <DatePicker
                              label="Date de début"
                              value={startDate}
                              onChange={(newValue) => setStartDate(newValue)}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  sx: { "& .MuiOutlinedInput-root": { borderRadius: 3 } },
                                },
                              }}
                              minDate={new Date()}
                            />
                          </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                            <DatePicker
                              label="Date de fin"
                              value={endDate}
                              onChange={(newValue) => setEndDate(newValue)}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  sx: { "& .MuiOutlinedInput-root": { borderRadius: 3 } },
                                },
                              }}
                              minDate={startDate || new Date()}
                            />
                          </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12}>
                          <FormControl fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}>
                            <InputLabel id="meal-categories-label">Catégories de repas</InputLabel>
                            <Select
                              labelId="meal-categories-label"
                              multiple
                              value={selectedCategories}
                              onChange={(e) => setSelectedCategories(e.target.value)}
                              label="Catégories de repas"
                              renderValue={(selected) =>
                                selected
                                  .map((value) => MEAL_CATEGORIES.find((cat) => cat.value === value)?.label)
                                  .join(", ")
                              }
                            >
                              {MEAL_CATEGORIES.map((category) => (
                                <MenuItem key={category.value} value={category.value}>
                                  {category.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            variant="contained"
                            startIcon={<AutoAwesomeIcon />}
                            onClick={() => setRandomPlanningDialogOpen(true)}
                            disabled={loadingGenerator || isSaving || availableRecipes.length === 0}
                            fullWidth
                            sx={{
                              borderRadius: 3,
                              py: 1.5,
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                              background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                              boxShadow: `0 4px 20px ${alpha(theme.palette.secondary.main, 0.3)}`,
                              "&:hover": {
                                transform: "translateY(-2px)",
                                boxShadow: `0 6px 25px ${alpha(theme.palette.secondary.main, 0.4)}`,
                              },
                              transition: "all 0.3s ease",
                            }}
                          >
                            {loadingGenerator ? <CircularProgress size={20} color="inherit" /> : "Générer un Planning Aléatoire"}
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <QuickActions />
                </Grid>
              </Grid>

              <Fab
                color="primary"
                onClick={handleChatToggle}
                sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1300 }}
              >
                {chatOpen ? <CloseIcon /> : <ChatIcon />}
              </Fab>

              <Chatbot
                userData={userData}
                familyData={familyData}
                familyMembers={familyMembers}
                isOpen={chatOpen}
                onClose={handleChatToggle}
              />

              <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                fullScreen={isMobile}
              >
                <DialogTitle>Planning Généré</DialogTitle>
                <DialogContent>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Votre planning aléatoire a été généré avec succès pour toutes les semaines sélectionnées. Que souhaitez-vous faire ?
                  </Typography>
                  <Stack spacing={2}>
                    <Button
                      variant="outlined"
                      startIcon={<PictureAsPdfIcon />}
                      onClick={exportToPDF}
                      disabled={loadingGenerator || isSaving}
                      fullWidth
                      sx={{ borderRadius: 3, py: 1.5 }}
                    >
                      Exporter en PDF
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={addToWeeklyPlanner}
                      disabled={loadingGenerator || isSaving || !userData?.familyId}
                      fullWidth
                      sx={{ borderRadius: 3, py: 1.5 }}
                    >
                      {isSaving ? <CircularProgress size={20} color="inherit" /> : "Ajouter au Planning Hebdomadaire"}
                    </Button>
                  </Stack>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setDialogOpen(false)} disabled={loadingGenerator || isSaving}>
                    Fermer
                  </Button>
                </DialogActions>
              </Dialog>
              
              <Dialog
                open={randomPlanningDialogOpen}
                onClose={() => setRandomPlanningDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                fullScreen={isMobile}
              >
                <DialogTitle>Type de Planning Aléatoire</DialogTitle>
                <DialogContent>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Choisissez le type de recettes à utiliser pour votre planning aléatoire :
                  </Typography>
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => handleRandomPlanning("family")}
                      disabled={loadingGenerator || availableRecipes.filter(r => r.isFamilyRecipe).length === 0}
                      fullWidth
                      sx={{ borderRadius: 3, py: 1.5 }}
                    >
                      Recettes Familiales Uniquement
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => handleRandomPlanning("public")}
                      disabled={loadingGenerator || availableRecipes.filter(r => r.visibility === "public").length === 0}
                      fullWidth
                      sx={{ borderRadius: 3, py: 1.5 }}
                    >
                      Recettes Publiques Uniquement
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={generateMealPlan}
                      disabled={loadingGenerator || availableRecipes.length === 0}
                      fullWidth
                      sx={{ borderRadius: 3, py: 1.5 }}
                    >
                      Toutes les Recettes
                    </Button>
                  </Stack>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setRandomPlanningDialogOpen(false)} disabled={loadingGenerator}>
                    Annuler
                  </Button>
                </DialogActions>
              </Dialog>
            </Box>
          </Fade>
        </Container>
      </Box>
    )
  }

  return (
    <ErrorBoundary>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
        {authLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
            }}
          >
            <CircularProgress />
          </Box>
        ) : currentUser ? (
          <Dashboard />
        ) : (
          <LandingPage />
        )}
      </LocalizationProvider>
    </ErrorBoundary>
  )
}