
"use client"

import { useState, useEffect, Component } from "react"
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  Stack,
} from "@mui/material"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import AddIcon from "@mui/icons-material/Add"
import CalendarIcon from "@mui/icons-material/CalendarMonth"
import RestaurantIcon from "@mui/icons-material/Restaurant"
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf"
import SaveIcon from "@mui/icons-material/Save"
import { useAuth } from "../contexts/AuthContext"
import { db } from "../firebaseConfig"
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore"
import { format, differenceInDays, eachDayOfInterval } from "date-fns"
import { fr } from "date-fns/locale"

// Meal categories
const MEAL_CATEGORIES = [
  { value: "breakfast", label: "Petit-déjeuner" },
  { value: "lunch", label: "Déjeuner" },
  { value: "dinner", label: "Dîner" },
]

// Error Boundary Component
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
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"))

  // Form states for meal planner
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [selectedCategories, setSelectedCategories] = useState(["breakfast", "lunch", "dinner"])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState([])

  // Fetch recipes for planning
  const fetchRecipes = async () => {
    try {
      let recipes = []
      // Fetch family recipes
      if (userData?.familyId) {
        const familyRecipesQuery = query(
          collection(db, "recipes"),
          where("familyId", "==", userData.familyId)
        )
        const familyRecipesSnapshot = await getDocs(familyRecipesQuery)
        recipes = familyRecipesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      }

      // Fetch public recipes if no family recipes
      if (recipes.length === 0) {
        const publicRecipesQuery = query(
          collection(db, "recipes"),
          where("isPublic", "==", true)
        )
        const publicRecipesSnapshot = await getDocs(publicRecipesQuery)
        recipes = publicRecipesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      }

      return recipes
    } catch (err) {
      console.error("Error fetching recipes:", err)
      setError("Erreur lors de la récupération des recettes.")
      return []
    }
  }

  // Generate random meal plan
  const generateMealPlan = async () => {
    if (!startDate || !endDate || selectedCategories.length === 0) {
      setError("Veuillez sélectionner une période et au moins une catégorie de repas.")
      return
    }

    if (endDate < startDate) {
      setError("La date de fin doit être postérieure à la date de début.")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const recipes = await fetchRecipes()
      if (recipes.length === 0) {
        setError("Aucune recette disponible pour générer un planning.")
        setLoading(false)
        return
      }

      const days = eachDayOfInterval({ start: startDate, end: endDate })
      const plan = []

      days.forEach((day) => {
        selectedCategories.forEach((category) => {
          const categoryRecipes = recipes.filter((recipe) => recipe.category === category)
          if (categoryRecipes.length > 0) {
            const randomRecipe = categoryRecipes[Math.floor(Math.random() * categoryRecipes.length)]
            plan.push({
              date: day,
              category,
              recipeId: randomRecipe.id,
              recipeName: randomRecipe.name || "Recette sans nom",
            })
          }
        })
      })

      setGeneratedPlan(plan)
      setDialogOpen(true)
      setSuccess("Planning généré avec succès !")
    } catch (err) {
      console.error("Error generating meal plan:", err)
      setError("Erreur lors de la génération du planning.")
    } finally {
      setLoading(false)
    }
  }

  // Export to PDF (LaTeX)
  const exportToPDF = async () => {
    setLoading(true)
    try {
      const latexContent = `
\\documentclass[a4paper,12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[french]{babel}
\\usepackage{geometry}
\\geometry{margin=1in}
\\usepackage{longtable}
\\usepackage{booktabs}
\\usepackage{noto}

\\title{Planning de Repas}
\\author{}
\\date{}

\\begin{document}

\\maketitle

\\section*{Planning de Repas du ${startDate ? format(startDate, "d MMMM yyyy", { locale: fr }) : ""} au ${
        endDate ? format(endDate, "d MMMM yyyy", { locale: fr }) : ""
      }}

\\begin{longtable}{p{3cm}p{4cm}p{8cm}}
\\toprule
\\textbf{Date} & \\textbf{Catégorie} & \\textbf{Recette} \\\\
\\midrule
${generatedPlan
  .map(
    (item) =>
      `${format(item.date, "d MMMM yyyy", { locale: fr })} & ${
        MEAL_CATEGORIES.find((cat) => cat.value === item.category)?.label || item.category
      } & ${item.recipeName.replace(/[&%#]/g, "\\$&")} \\\\`
  )
  .join("\n")}
\\bottomrule
\\end{longtable}

\\end{document}
      `

      // Simulate PDF generation (requires backend)
      console.log("LaTeX content for PDF:", latexContent)
      setSuccess("PDF généré avec succès ! (Simulation)")
      setDialogOpen(false)
    } catch (err) {
      console.error("Error exporting to PDF:", err)
      setError("Erreur lors de l'exportation en PDF.")
    } finally {
      setLoading(false)
    }
  }

  // Add to WeeklyPlannerPage
  const addToWeeklyPlanner = async () => {
    setLoading(true)
    try {
      for (const item of generatedPlan) {
        await addDoc(collection(db, "weeklyPlans"), {
          familyId: userData?.familyId || null,
          userId: currentUser?.uid,
          date: Timestamp.fromDate(item.date),
          category: item.category,
          recipeId: item.recipeId,
          recipeName: item.recipeName,
          createdAt: Timestamp.now(),
        })
      }
      setSuccess("Planning ajouté au WeeklyPlanner avec succès !")
      setDialogOpen(false)
    } catch (err) {
      console.error("Error adding to weekly planner:", err)
      setError("Erreur lors de l'ajout au planning.")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <CircularProgress size={60} />
      </Box>
    )
  }

  const QuickActions = () => (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
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
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            fullWidth
            sx={{
              borderRadius: 3,
              py: 1.5,
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
            }}
          >
            Ajouter une Recette
          </Button>
          <Button
            variant="outlined"
            startIcon={<CalendarIcon />}
            fullWidth
            sx={{
              borderRadius: 3,
              py: 1.5,
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
            }}
          >
            Voir le Planning
          </Button>
          <Button
            variant="outlined"
            startIcon={<RestaurantIcon />}
            fullWidth
            sx={{
              borderRadius: 3,
              py: 1.5,
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
            }}
          >
            Explorer les Recettes
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )

  return (
    <ErrorBoundary>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
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
                    mb: 4,
                    textAlign: "center",
                    fontSize: { xs: "2rem", sm: "3rem" },
                  }}
                >
                  Bienvenue, {userData?.displayName || "Utilisateur"}
                </Typography>

                {error && (
                  <Alert
                    severity="error"
                    sx={{ mb: 3, borderRadius: 4 }}
                    onClose={() => setError("")}
                  >
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert
                    severity="success"
                    sx={{ mb: 3, borderRadius: 4 }}
                    onClose={() => setSuccess("")}
                  >
                    {success}
                  </Alert>
                )}

                <Grid container spacing={3} alignItems="stretch">
                  <Grid item xs={12} md={8}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 4,
                        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
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
                          Générer un Planning de Repas
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
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
                          </Grid>
                          <Grid item xs={12} sm={6}>
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
                                    .map(
                                      (value) =>
                                        MEAL_CATEGORIES.find((cat) => cat.value === value)?.label || value
                                    )
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
                              startIcon={<CalendarIcon />}
                              onClick={generateMealPlan}
                              disabled={loading}
                              fullWidth
                              sx={{
                                borderRadius: 3,
                                py: 1.5,
                                fontSize: { xs: "0.9rem", sm: "1rem" },
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                              }}
                            >
                              {loading ? <CircularProgress size={20} color="inherit" /> : "Générer le Planning"}
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

                <Dialog
                  open={dialogOpen}
                  onClose={() => setDialogOpen(false)}
                  maxWidth="sm"
                  fullWidth
                  TransitionProps={{
                    onEnter: (node) => {
                      if (node && typeof node.scrollTop !== "undefined") {
                        node.scrollTop = 0
                      }
                    },
                  }}
                >
                  <DialogTitle>Que voulez-vous faire avec votre planning ?</DialogTitle>
                  <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      Votre planning a été généré avec succès. Choisissez une option ci-dessous :
                    </Typography>
                    <Stack spacing={2}>
                      <Button
                        variant="outlined"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={exportToPDF}
                        disabled={loading}
                        fullWidth
                        sx={{ borderRadius: 3, py: 1.5 }}
                      >
                        Exporter en PDF
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={addToWeeklyPlanner}
                        disabled={loading}
                        fullWidth
                        sx={{
                          borderRadius: 3,
                          py: 1.5,
                          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        }}
                      >
                        Ajouter au Planning
                      </Button>
                    </Stack>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: 3 }}>
                      Annuler
                    </Button>
                  </DialogActions>
                </Dialog>
              </Box>
            </Fade>
          </Container>
        </Box>
      </LocalizationProvider>
    </ErrorBoundary>
  )
}
