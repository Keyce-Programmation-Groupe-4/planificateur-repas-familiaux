"use client"

import { useState, useEffect } from "react"
import {
  Typography,
  Container,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Stack,
  useTheme,
  alpha,
  Fade,
  Zoom,
  LinearProgress,
} from "@mui/material"
import {
  Restaurant as RestaurantIcon,
  CalendarMonth as CalendarIcon,
  Group as GroupIcon,
  Add as AddIcon,
  ShoppingCart as ShoppingCartIcon,
  ArrowForward as ArrowForwardIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Dashboard as DashboardIcon,
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material"
import StarsIcon from '@mui/icons-material/Stars';
import { Link as RouterLink, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { db } from "../firebaseConfig"
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore"
import { format, isToday, isTomorrow } from "date-fns"
import { fr } from "date-fns/locale"

// Landing Page pour utilisateurs non connectés
function LandingPage() {
  const theme = useTheme()
  const navigate = useNavigate()

  const features = [
    {
      icon: <CalendarIcon />,
      title: "Planification Intelligente",
      description: "Organisez vos repas de la semaine avec une interface intuitive et moderne",
      color: theme.palette.primary.main,
    },
    {
      icon: <RestaurantIcon />,
      title: "Gestion des Recettes",
      description: "Stockez, organisez et partagez vos recettes favorites avec votre famille",
      color: theme.palette.secondary.main,
    },
    {
      icon: <ShoppingCartIcon />,
      title: "Liste de Courses Automatique",
      description: "Générez automatiquement votre liste de courses basée sur vos repas planifiés",
      color: theme.palette.success.main,
    },
    {
      icon: <GroupIcon />,
      title: "Collaboration Familiale",
      description: "Partagez la planification avec tous les membres de votre famille",
      color: theme.palette.warning.main,
    },
  ]

  const benefits = [
    "Économisez du temps et de l'argent",
    "Réduisez le gaspillage alimentaire",
    "Mangez plus sainement",
    "Simplifiez vos courses",
    "Partagez en famille",
  ]

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
        minHeight: "calc(100vh - 64px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative Elements */}
      <Box
        sx={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
          borderRadius: "50%",
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.08)} 0%, transparent 70%)`,
          borderRadius: "50%",
          zIndex: 0,
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, py: 8 }}>
        {/* Hero Section */}
        <Fade in timeout={800}>
          <Box sx={{ textAlign: "center", mb: 10 }}>
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
                letterSpacing: "-2px",
              }}
            >
              L'Avenir de la
              <br />
              Planification Culinaire
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{
                mb: 4,
                maxWidth: "600px",
                mx: "auto",
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              Révolutionnez votre façon de planifier, cuisiner et partager vos repas avec une technologie de pointe
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={3} justifyContent="center" sx={{ mb: 6 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<PlayArrowIcon />}
                onClick={() => navigate("/signup")}
                sx={{
                  py: 2,
                  px: 4,
                  borderRadius: 4,
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.5)}`,
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Commencer Gratuitement
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<ArrowForwardIcon />}
                onClick={() => navigate("/login")}
                sx={{
                  py: 2,
                  px: 4,
                  borderRadius: 4,
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  borderWidth: 2,
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  "&:hover": {
                    borderWidth: 2,
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Se Connecter
              </Button>
            </Stack>

            {/* Benefits Pills */}
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ flexWrap: "wrap", gap: 2 }}>
              {benefits.map((benefit, index) => (
                <Zoom in timeout={1000 + index * 100} key={benefit}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={benefit}
                    sx={{
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                      fontWeight: 500,
                      borderRadius: 3,
                      "& .MuiChip-icon": {
                        color: theme.palette.success.main,
                      },
                    }}
                  />
                </Zoom>
              ))}
            </Stack>
          </Box>
        </Fade>

        {/* Features Section */}
        <Box sx={{ mb: 10 }}>
          <Typography
            variant="h3"
            align="center"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: theme.palette.text.primary,
            }}
          >
            Fonctionnalités Révolutionnaires
          </Typography>
          <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: "600px", mx: "auto" }}>
            Découvrez comment Meal Planner 2025 transforme votre expérience culinaire
          </Typography>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={feature.title}>
                <Zoom in timeout={1200 + index * 150}>
                  <Card
                    elevation={0}
                    sx={{
                      height: "100%",
                      borderRadius: 6,
                      background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(feature.color, 0.02)} 100%)`,
                      border: `1px solid ${alpha(feature.color, 0.1)}`,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-8px)",
                        boxShadow: `0 20px 60px ${alpha(feature.color, 0.2)}`,
                        border: `1px solid ${alpha(feature.color, 0.3)}`,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 4, textAlign: "center" }}>
                      <Avatar
                        sx={{
                          width: 80,
                          height: 80,
                          background: `linear-gradient(135deg, ${feature.color} 0%, ${alpha(feature.color, 0.8)} 100%)`,
                          mb: 3,
                          mx: "auto",
                          fontSize: "2rem",
                        }}
                      >
                        {feature.icon}
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Zoom>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CTA Section */}
        <Fade in timeout={2000}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 6,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              color: "white",
              textAlign: "center",
              p: 6,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: alpha(theme.palette.common.white, 0.1),
                borderRadius: "50%",
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              Prêt à Révolutionner Vos Repas ?
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              Rejoignez des milliers de familles qui ont déjà transformé leur cuisine
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<StarsIconIcon />}
              onClick={() => navigate("/signup")}
              sx={{
                py: 2,
                px: 4,
                borderRadius: 4,
                fontSize: "1.1rem",
                fontWeight: 600,
                backgroundColor: theme.palette.common.white,
                color: theme.palette.primary.main,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.common.white, 0.9),
                  transform: "scale(1.05)",
                },
                transition: "all 0.3s ease",
              }}
            >
              Commencer Maintenant
            </Button>
          </Card>
        </Fade>
      </Container>
    </Box>
  )
}

// Dashboard pour utilisateurs connectés
function UserDashboard() {
  const { userData } = useAuth()
  const theme = useTheme()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalRecipes: 0,
    plannedMeals: 0,
    familyMembers: 0,
    loading: true,
  })
  const [recentRecipes, setRecentRecipes] = useState([])
  const [upcomingMeals, setUpcomingMeals] = useState([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userData?.familyId) return

      try {
        // Fetch recipes count
        const recipesQuery = query(collection(db, "recipes"), where("familyId", "==", userData.familyId))
        const recipesSnapshot = await getDocs(recipesQuery)

        // Fetch recent recipes
        const recentRecipesQuery = query(
          collection(db, "recipes"),
          where("familyId", "==", userData.familyId),
          orderBy("createdAt", "desc"),
          limit(3),
        )
        const recentRecipesSnapshot = await getDocs(recentRecipesQuery)
        const recentRecipesData = recentRecipesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Fetch family members count
        const familyMembersQuery = query(collection(db, "users"), where("familyId", "==", userData.familyId))
        const familyMembersSnapshot = await getDocs(familyMembersQuery)

        setStats({
          totalRecipes: recipesSnapshot.size,
          plannedMeals: 0, // TODO: Calculate from weekly plans
          familyMembers: familyMembersSnapshot.size,
          loading: false,
        })
        setRecentRecipes(recentRecipesData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setStats((prev) => ({ ...prev, loading: false }))
      }
    }

    fetchDashboardData()
  }, [userData?.familyId])

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
      icon: userData?.familyRole === "Admin" ? <AdminIcon /> : <GroupIcon />,
      color: userData?.familyRole === "Admin" ? theme.palette.error.main : theme.palette.warning.main,
      path: "/family",
    },
  ]

  const formatDate = (timestamp) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000)
    if (isToday(date)) return "Aujourd'hui"
    if (isTomorrow(date)) return "Demain"
    return format(date, "d MMM", { locale: fr })
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Fade in timeout={600}>
        <Box>
          {/* Welcome Header */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 1,
              }}
            >
              Bonjour, {userData?.displayName || "Chef"} ! 👋
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Prêt à planifier de délicieux repas aujourd'hui ?
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {/* Stats Cards */}
            <Grid item xs={12}>
              <Grid container spacing={3}>
                {[
                  {
                    label: "Recettes",
                    value: stats.totalRecipes,
                    icon: <RestaurantIcon />,
                    color: theme.palette.primary.main,
                  },
                  {
                    label: "Repas Planifiés",
                    value: stats.plannedMeals,
                    icon: <CalendarIcon />,
                    color: theme.palette.secondary.main,
                  },
                  {
                    label: "Membres Famille",
                    value: stats.familyMembers,
                    icon: <GroupIcon />,
                    color: theme.palette.success.main,
                  },
                  {
                    label: "Rôle",
                    value: userData?.familyRole || "Membre",
                    icon: <DashboardIcon />,
                    color: theme.palette.warning.main,
                  },
                ].map((stat, index) => (
                  <Grid item xs={6} sm={3} key={stat.label}>
                    <Zoom in timeout={800 + index * 100}>
                      <Card
                        elevation={0}
                        sx={{
                          borderRadius: 4,
                          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(stat.color, 0.02)} 100%)`,
                          border: `1px solid ${alpha(stat.color, 0.1)}`,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: `0 12px 40px ${alpha(stat.color, 0.15)}`,
                          },
                        }}
                      >
                        <CardContent sx={{ p: 3, textAlign: "center" }}>
                          <Avatar
                            sx={{
                              width: 48,
                              height: 48,
                              background: `linear-gradient(135deg, ${stat.color} 0%, ${alpha(stat.color, 0.8)} 100%)`,
                              mb: 2,
                              mx: "auto",
                            }}
                          >
                            {stat.icon}
                          </Avatar>
                          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {stats.loading ? <LinearProgress sx={{ width: 40, mx: "auto" }} /> : stat.value}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {stat.label}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Zoom>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Quick Actions */}
            <Grid item xs={12} md={8}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Actions Rapides
              </Typography>
              <Grid container spacing={3}>
                {quickActions.map((action, index) => (
                  <Grid item xs={12} sm={6} key={action.title}>
                    <Zoom in timeout={1000 + index * 100}>
                      <Card
                        component={RouterLink}
                        to={action.path}
                        elevation={0}
                        sx={{
                          borderRadius: 4,
                          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(action.color, 0.02)} 100%)`,
                          border: `1px solid ${alpha(action.color, 0.1)}`,
                          textDecoration: "none",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: `0 12px 40px ${alpha(action.color, 0.2)}`,
                            border: `1px solid ${alpha(action.color, 0.3)}`,
                          },
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar
                              sx={{
                                width: 56,
                                height: 56,
                                background: `linear-gradient(135deg, ${action.color} 0%, ${alpha(action.color, 0.8)} 100%)`,
                              }}
                            >
                              {action.icon}
                            </Avatar>
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {action.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {action.description}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Zoom>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Recent Activity */}
            <Grid item xs={12} md={4}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Activité Récente
              </Typography>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 4,
                  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  height: "fit-content",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  {recentRecipes.length > 0 ? (
                    <Stack spacing={2}>
                      {recentRecipes.map((recipe, index) => (
                        <Fade in timeout={1200 + index * 100} key={recipe.id}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: 3,
                              backgroundColor: alpha(theme.palette.primary.main, 0.05),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                            }}
                          >
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar
                                src={recipe.photoURL}
                                sx={{
                                  width: 40,
                                  height: 40,
                                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                }}
                              >
                                <RestaurantIcon />
                              </Avatar>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {recipe.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(recipe.createdAt)}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        </Fade>
                      ))}
                      <Button
                        component={RouterLink}
                        to="/recipes"
                        variant="outlined"
                        fullWidth
                        sx={{ borderRadius: 3, mt: 2 }}
                      >
                        Voir Toutes les Recettes
                      </Button>
                    </Stack>
                  ) : (
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <RestaurantIcon sx={{ fontSize: "3rem", color: theme.palette.text.disabled, mb: 2 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Aucune recette récente
                      </Typography>
                      <Button
                        component={RouterLink}
                        to="/recipes"
                        variant="contained"
                        startIcon={<AddIcon />}
                        sx={{ borderRadius: 3 }}
                      >
                        Ajouter une Recette
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Fade>
    </Container>
  )
}

// Composant principal
export default function HomePage() {
  const { currentUser } = useAuth()

  return currentUser ? <UserDashboard /> : <LandingPage />
}
