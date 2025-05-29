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
  Stack,
  Fab,
} from "@mui/material"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import AddIcon from "@mui/icons-material/Add"
import CalendarIcon from "@mui/icons-material/CalendarMonth"
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart"
import GroupIcon from "@mui/icons-material/Group"
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings"
import ChatIcon from "@mui/icons-material/Chat"
import { useAuth } from "../contexts/AuthContext"
import { db } from "../firebaseConfig"
import { collection, query, where, getDocs } from "firebase/firestore"
import { fr } from "date-fns/locale"
import Chatbot from "./Chatbot"
import { useMediaQuery } from "@mui/material"

const MEAL_CATEGORIES = [
  { value: "breakfast", label: "Petit-déjeuner" },
  { value: "lunch", label: "Déjeuner" },
  { value: "dinner", label: "Dîner" },
]

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
  const [chatOpen, setChatOpen] = useState(false)
  const [stats, setStats] = useState({
    familyRecipes: 0,
    publicRecipes: 0,
    weeklyPlans: 0,
    topCategory: "Aucune",
  })
  const [loadingStats, setLoadingStats] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleChatToggle = () => {
    setChatOpen(!chatOpen)
  }

  // Récupérer les statistiques
  const fetchStats = async () => {
    if (!userData?.familyId) return

    setLoadingStats(true)
    setError("")

    try {
      // Nombre de recettes familiales
      const familyRecipesQuery = query(
        collection(db, "recipes"),
        where("familyId", "==", userData.familyId)
      )
      const familyRecipesSnapshot = await getDocs(familyRecipesQuery)
      const familyRecipesCount = familyRecipesSnapshot.size

      // Nombre de recettes publiques
      const publicRecipesQuery = query(
        collection(db, "recipes"),
        where("isPublic", "==", true)
      )
      const publicRecipesSnapshot = await getDocs(publicRecipesQuery)
      const publicRecipesCount = publicRecipesSnapshot.size

      // Nombre de plans hebdomadaires
      const weeklyPlansQuery = query(
        collection(db, "families", userData.familyId, "weeklyPlans")
      )
      const weeklyPlansSnapshot = await getDocs(weeklyPlansQuery)
      const weeklyPlansCount = weeklyPlansSnapshot.size

      // Catégorie la plus planifiée
      let categoryCounts = { breakfast: 0, lunch: 0, dinner: 0 }
      weeklyPlansSnapshot.forEach((doc) => {
        const plan = doc.data()
        Object.values(plan.days || {}).forEach((day) => {
          if (day.breakfast) categoryCounts.breakfast++
          if (day.lunch) categoryCounts.lunch++
          if (day.dinner) categoryCounts.dinner++
        })
      })
      const topCategory = Object.entries(categoryCounts).reduce(
        (max, [category, count]) => (count > max.count ? { category, count } : max),
        { category: "Aucune", count: 0 }
      ).category

      setStats({
        familyRecipes: familyRecipesCount,
        publicRecipes: publicRecipesCount,
        weeklyPlans: weeklyPlansCount,
        topCategory: MEAL_CATEGORIES.find((cat) => cat.value === topCategory)?.label || "Aucune",
      })
      setSuccess("Statistiques chargées avec succès !")
    } catch (err) {
      console.error("Error fetching stats:", err)
      setError("Erreur lors de la récupération des statistiques.")
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    if (currentUser && userData?.familyId) {
      fetchStats()
    }
  }, [currentUser, userData])

  const LandingPage = () => (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
        minHeight: "100vh",
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 8 }}>
          <Typography
            variant="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.5rem" },
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
            }}
          >
            Planifiez vos repas en famille facilement
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
            Organisez vos repas, gérez vos recettes et simplifiez vos courses avec notre application intuitive.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              href="/signup"
              sx={{
                py: 2,
                px: 4,
                borderRadius: 3,
                fontSize: "1.1rem",
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
                py: 2,
                px: 4,
                borderRadius: 3,
                fontSize: "1.1rem",
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
              }}
            >
              Se connecter
            </Button>
          </Stack>
        </Box>

        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" align="center" sx={{ mb: 4, fontWeight: 700 }}>
            Fonctionnalités clés
          </Typography>
          <Grid container spacing={4}>
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
                    minHeight: 300,
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        height: 200,
                        overflow: "hidden",
                        borderRadius: 8,
                        marginBottom: 16,
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
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mb: 8, textAlign: "center" }}>
          <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
            Ils nous font confiance
          </Typography>
          <Grid container spacing={4} justifyContent="center">
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
                    p: 3,
                  }}
                >
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    "{testimonial.quote}"
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    - {testimonial.name}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ textAlign: "center", mb: 8 }}>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
            Prêt à simplifier votre vie ?
          </Typography>
          <Button
            variant="contained"
            size="large"
            href="/signup"
            sx={{
              py: 2,
              px: 4,
              borderRadius: 3,
              fontSize: "1.1rem",
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
                      backgroundColor: alpha(action.color, 0.05),
                    },
                  }}
                  onClick={() => window.location.href = action.path}
                >
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {action.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
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
                        Statistiques Familiales
                      </Typography>
                      {loadingStats ? (
                        <CircularProgress size={40} sx={{ display: "block", mx: "auto" }} />
                      ) : (
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Card
                              elevation={0}
                              sx={{
                                borderRadius: 3,
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                p: 2,
                                textAlign: "center",
                              }}
                            >
                              <Typography variant="h6" color="primary">
                                {stats.familyRecipes}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Recettes Familiales
                              </Typography>
                            </Card>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Card
                              elevation={0}
                              sx={{
                                borderRadius: 3,
                                border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                                p: 2,
                                textAlign: "center",
                              }}
                            >
                              <Typography variant="h6" color="secondary">
                                {stats.publicRecipes}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Recettes Publiques
                              </Typography>
                            </Card>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Card
                              elevation={0}
                              sx={{
                                borderRadius: 3,
                                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                                p: 2,
                                textAlign: "center",
                              }}
                            >
                              <Typography variant="h6" color="success.main">
                                {stats.weeklyPlans}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Plans Hebdomadaires
                              </Typography>
                            </Card>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Card
                              elevation={0}
                              sx={{
                                borderRadius: 3,
                                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                                p: 2,
                                textAlign: "center",
                              }}
                            >
                              <Typography variant="h6" color="warning.main">
                                {stats.topCategory}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Catégorie Préférée
                              </Typography>
                            </Card>
                          </Grid>
                        </Grid>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <QuickActions />
                </Grid>
              </Grid>

              <Box sx={{ position: "fixed", bottom: 16, right: 16 }}>
                <Fab color="primary" onClick={handleChatToggle}>
                  <ChatIcon />
                </Fab>
              </Box>
            </Box>
          </Fade>
        </Container>
      </Box>
    )
  }

  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <CircularProgress size={60} />
      </Box>
    )
  }

  return (
    <ErrorBoundary>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
        {currentUser ? <Dashboard /> : <LandingPage />}
        <Chatbot open={chatOpen} onClose={handleChatToggle} />
      </LocalizationProvider>
    </ErrorBoundary>
  )
}