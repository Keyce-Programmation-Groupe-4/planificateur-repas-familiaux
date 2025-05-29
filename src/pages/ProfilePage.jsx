"use client"

import { useState, useEffect } from "react"
import {
  Typography,
  Container,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Divider,
  Stack,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  LinearProgress,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Drawer,
  useMediaQuery,
} from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import SaveIcon from "@mui/icons-material/Save"
import CancelIcon from "@mui/icons-material/Cancel"
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera"
import PersonIcon from "@mui/icons-material/Person"
import GroupIcon from "@mui/icons-material/Group"
import RestaurantIcon from "@mui/icons-material/Restaurant"
import WarningIcon from "@mui/icons-material/Warning"
import ThumbDownIcon from "@mui/icons-material/ThumbDown"
import NotificationsIcon from "@mui/icons-material/Notifications"
import FavoriteIcon from "@mui/icons-material/Favorite"
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom"
import MenuIcon from "@mui/icons-material/Menu"
import CloseIcon from "@mui/icons-material/Close"
import CalendarIcon from "@mui/icons-material/CalendarMonth"
import CakeIcon from '@mui/icons-material/Cake'
import BarChartIcon from '@mui/icons-material/BarChart'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { useAuth } from "../contexts/AuthContext"
import { db, storage } from "../firebaseConfig"
import { updateProfile } from "firebase/auth"
import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

// Predefined options
const DIET_OPTIONS = [
  { value: "", label: "Aucun régime spécifique" },
  { value: "vegetarian", label: "Végétarien" },
  { value: "vegan", label: "Végétalien" },
  { value: "pescatarian", label: "Pescétarien" },
  { value: "keto", label: "Cétogène" },
  { value: "paleo", label: "Paléo" },
  { value: "mediterranean", label: "Méditerranéen" },
  { value: "low-carb", label: "Faible en glucides" },
  { value: "gluten-free", label: "Sans gluten" },
  { value: "dairy-free", label: "Sans lactose" },
]

const COMMON_ALLERGIES = [
  "Arachides",
  "Fruits à coque",
  "Lait",
  "Œufs",
  "Poisson",
  "Crustacés",
  "Soja",
  "Gluten",
  "Sésame",
  "Moutarde",
  "Céleri",
  "Lupin",
  "Mollusques",
  "Anhydride sulfureux",
]

const COMMON_DISLIKES = [
  "Épinards",
  "Brocolis",
  "Champignons",
  "Olives",
  "Anchois",
  "Fromage bleu",
  "Coriandre",
  "Piment",
  "Ail",
  "Oignon",
  "Tomates",
  "Avocat",
  "Courgettes",
  "Aubergines",
]

const COMMON_FAVORITES = [
  "Poulet rôti",
  "Lasagnes",
  "Pizza",
  "Sushi",
  "Tacos",
  "Curry",
  "Pâtes Carbonara",
  "Salade César",
  "Chocolat",
  "Fraises",
  "Mangue",
  "Riz",
]

const GENDER_OPTIONS = [
  { value: "homme", label: "Homme" },
  { value: "femme", label: "Femme" },
  { value: "autre", label: "Autre" },
  { value: "non-specifie", label: "Non spécifié" },
]

const FAMILY_RELATIONSHIP_OPTIONS = [
  { value: "pere", label: "Père" },
  { value: "mere", label: "Mère" },
  { value: "fils", label: "Fils" },
  { value: "fille", label: "Fille" },
  { value: "autre", label: "Autre" },
]

const NOTIFICATION_FREQUENCY_OPTIONS = [
  { value: "immediate", label: "Immédiate" },
  { value: "daily", label: "Quotidienne" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "never", label: "Jamais" },
]

// Helper function for TabPanel
function TabPanel(props) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index) {
  return {
    id: `profile-tab-${index}`,
    "aria-controls": `profile-tabpanel-${index}`,
  }
}

export default function ProfilePage() {
  const { currentUser, userData, loading: authLoading } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"))
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"))
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Tab state
  const [currentTab, setCurrentTab] = useState(0)

  // Form states
  const [displayName, setDisplayName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [birthDate, setBirthDate] = useState(null)
  const [gender, setGender] = useState("")
  const [familyRelationship, setFamilyRelationship] = useState("")
  const [selectedDiet, setSelectedDiet] = useState("")
  const [allergies, setAllergies] = useState([])
  const [dislikes, setDislikes] = useState([])
  const [favorites, setFavorites] = useState([])
  const [notificationSettings, setNotificationSettings] = useState({
    invitations: true,
    planningReady: true,
    newRecipes: false,
    shoppingListUpdates: true,
    frequency: "daily",
  })

  // UI states
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0)

  useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || "")
      setFirstName(userData.personalInfo?.firstName || "")
      setLastName(userData.personalInfo?.lastName || "")
      setBirthDate(userData.personalInfo?.birthDate?.toDate ? userData.personalInfo.birthDate.toDate() : null)
      setGender(userData.personalInfo?.gender || "")
      setFamilyRelationship(userData.personalInfo?.familyRelationship || "")
      setSelectedDiet(userData.dietaryPreferences?.diet || "")
      setAllergies(userData.dietaryPreferences?.allergies || [])
      setDislikes(userData.dietaryPreferences?.dislikes || [])
      setFavorites(userData.dietaryPreferences?.favorites || [])
      setNotificationSettings({
        invitations: userData.notificationSettings?.invitations ?? true,
        planningReady: userData.notificationSettings?.planningReady ?? true,
        newRecipes: userData.notificationSettings?.newRecipes ?? false,
        shoppingListUpdates: userData.notificationSettings?.shoppingListUpdates ?? true,
        frequency: userData.notificationSettings?.frequency || "daily",
      })
    }
  }, [userData])

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue)
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!currentUser) {
      return setError("Utilisateur non trouvé.")
    }

    if (displayName.trim() === "") {
      return setError("Le nom d'affichage ne peut pas être vide.")
    }

    setLoading(true)

    try {
      if (currentUser.displayName !== displayName) {
        await updateProfile(currentUser, { displayName: displayName })
      }

      const updatedData = {
        displayName: displayName,
        personalInfo: {
          firstName: firstName,
          lastName: lastName,
          birthDate: birthDate ? Timestamp.fromDate(birthDate) : null,
          gender: gender,
          familyRelationship: familyRelationship,
        },
        dietaryPreferences: {
          diet: selectedDiet,
          allergies: allergies,
          dislikes: dislikes,
          favorites: favorites,
        },
        notificationSettings: notificationSettings,
        updatedAt: serverTimestamp(),
      }

      const userDocRef = doc(db, "users", currentUser.uid)
      await updateDoc(userDocRef, updatedData)

      setSuccess("Profil mis à jour avec succès !")
      setIsEditing(false)
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      console.error("Profile Update Error:", err)
      setError("Échec de la mise à jour du profil. Détails: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (userData) {
      setDisplayName(userData.displayName || "")
      setFirstName(userData.personalInfo?.firstName || "")
      setLastName(userData.personalInfo?.lastName || "")
      setBirthDate(userData.personalInfo?.birthDate?.toDate ? userData.personalInfo.birthDate.toDate() : null)
      setGender(userData.personalInfo?.gender || "")
      setFamilyRelationship(userData.personalInfo?.familyRelationship || "")
      setSelectedDiet(userData.dietaryPreferences?.diet || "")
      setAllergies(userData.dietaryPreferences?.allergies || [])
      setDislikes(userData.dietaryPreferences?.dislikes || [])
      setFavorites(userData.dietaryPreferences?.favorites || [])
      setNotificationSettings({
        invitations: userData.notificationSettings?.invitations ?? true,
        planningReady: userData.notificationSettings?.planningReady ?? true,
        newRecipes: userData.notificationSettings?.newRecipes ?? false,
        shoppingListUpdates: userData.notificationSettings?.shoppingListUpdates ?? true,
        frequency: userData.notificationSettings?.frequency || "daily",
      })
    }
    setIsEditing(false)
    setError("")
  }

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0]
    if (!file || !currentUser) {
      setError("Utilisateur non connecté ou fichier non sélectionné.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Le fichier est trop volumineux (max 5MB").toUpperCase()
      return
    }
    if (!file.type.startsWith("image/")) {
      setError("Veuillez sélectionner un fichier image.")
      return
    }

    setError("")
    setSuccess("")
    setUploadingPhoto(true)
    setPhotoUploadProgress(0)

    const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${file.name}`)
    const uploadTask = uploadBytesResumable(storageRef, file)

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        setPhotoUploadProgress(progress)
      },
      (error) => {
        console.error("Photo Upload Error:", error)
        setError("Échec de l'upload de la photo. " + error.code)
        setUploadingPhoto(false)
        setPhotoUploadProgress(0)
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          await updateProfile(currentUser, { photoURL: downloadURL })
          const userDocRef = doc(db, "users", currentUser.uid)
          await updateDoc(userDocRef, {
            photoURL: downloadURL,
            updatedAt: serverTimestamp(),
          })
          setSuccess("Photo de profil mise à jour !")
          setTimeout(() => setSuccess(""), 3000)
        } catch (updateError) {
          console.error("Error updating profile with new photo URL:", updateError)
          setError("Échec de la mise à jour du profil avec la nouvelle photo.")
        } finally {
          setUploadingPhoto(false)
          setPhotoUploadProgress(0)
        }
      }
    )
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "Non disponible"
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000)
      return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr })
    } catch (e) {
      console.error("Error formatting date:", timestamp, e)
      return "Date invalide"
    }
  }

  const formatBirthDate = (date) => {
    if (!date) return "Non spécifiée"
    try {
      return format(date, "d MMMM yyyy", { locale: fr })
    } catch (e) {
      console.error("Error formatting birth date:", date, e)
      return "Date invalide"
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case "Admin":
        return <AdminPanelSettingsIcon />
      case "Member":
        return <PersonIcon />
      default:
        return <GroupIcon />
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case "Admin":
        return theme.palette.error.main
      case "Member":
        return theme.palette.primary.main
      default:
        return theme.palette.text.secondary
    }
  }

  const getStatValue = (stat) => {
    return stat !== undefined && stat !== null ? stat : 0
  }

  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    )
  }

  if (!userData) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          Impossible de charger les données du profil. Veuillez vous reconnecter.
        </Alert>
      </Container>
    )
  }

  const ProfileSidebar = () => (
    <Box
      sx={{
        width: { xs: "100%", sm: "100%", md: 300, lg: 380 },
        height: { md: "calc(100vh - 200px)" },
        position: { md: "sticky" },
        top: { md: 24 },
        overflowY: "auto",
      }}
    >
      <Card
        elevation={0}
        sx={{
          borderRadius: 6,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          height: "100%",
          backdropFilter: "blur(20px)",
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 }, textAlign: "center" }}>
          <Box sx={{ position: "relative", display: "inline-block", mb: 3 }}>
            <Avatar
              src={userData.photoURL}
              sx={{
                width: { xs: 80, sm: 100, md: 120, lg: 140 },
                height: { xs: 80, sm: 100, md: 120, lg: 140 },
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem", lg: "3.5rem" },
                fontWeight: 700,
                boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.3)}`,
                border: `4px solid ${alpha(theme.palette.background.paper, 0.8)}`,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: `0 16px 50px ${alpha(theme.palette.primary.main, 0.4)}`,
                },
              }}
            >
              {userData.displayName?.charAt(0) || userData.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Tooltip title="Changer la photo de profil (max 5MB)">
              <IconButton
                component="label"
                sx={{
                  position: "absolute",
                  bottom: { xs: 2, sm: 4, md: 6, lg: 8 },
                  right: { xs: 2, sm: 4, md: 6, lg: 8 },
                  backgroundColor: theme.palette.primary.main,
                  color: "white",
                  width: { xs: 32, sm: 40, md: 44, lg: 48 },
                  height: { xs: 32, sm: 40, md: 44, lg: 48 },
                  boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.dark,
                    transform: "scale(1.1)",
                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.6)}`,
                  },
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                disabled={uploadingPhoto || loading}
              >
                {uploadingPhoto ? (
                  <CircularProgress size={24} color="inherit" variant="determinate" value={photoUploadProgress} />
                ) : (
                  <PhotoCameraIcon fontSize={isMobile ? "small" : "medium"} />
                )}
                <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
              </IconButton>
            </Tooltip>
          </Box>

          {uploadingPhoto && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={photoUploadProgress}
                sx={{
                  borderRadius: 2,
                  height: 8,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  "& .MuiLinearProgress-bar": {
                    background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Upload en cours... {Math.round(photoUploadProgress)}%
              </Typography>
            </Box>
          )}

          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 1,
              color: theme.palette.text.primary,
              fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
            }}
          >
            {userData.displayName || "Utilisateur"}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 3, fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" } }}
          >
            {userData.email}
          </Typography>

          <Chip
            icon={getRoleIcon(userData.familyRole)}
            label={userData.familyRole || "Membre"}
            sx={{
              backgroundColor: alpha(getRoleColor(userData.familyRole), 0.15),
              color: getRoleColor(userData.familyRole),
              fontWeight: 600,
              borderRadius: 4,
              mb: 4,
              fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" },
              height: { xs: 36, sm: 38, md: 40 },
              "& .MuiChip-icon": {
                fontSize: { xs: "1rem", sm: "1.1rem", md: "1.2rem" },
              },
            }}
          />

          <Divider sx={{ my: 3, borderColor: alpha(theme.palette.primary.main, 0.1) }} />
          <Stack spacing={2} alignItems="flex-start" sx={{ textAlign: "left" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 3,
                  backgroundColor: alpha(theme.palette.info.main, 0.1),
                  color: theme.palette.info.main,
                }}
              >
                <GroupIcon fontSize="small" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", md: "0.85rem" } }}>
                  Famille
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, fontSize: { xs: "0.9rem", md: "1rem" } }}>
                  {userData.familyId ? userData.familyId.substring(0, 8) + "..." : "N/A"}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 3,
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  color: theme.palette.success.main,
                }}
              >
                <CalendarIcon fontSize="small" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", md: "0.85rem" } }}>
                  Membre depuis
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, fontSize: { xs: "0.9rem", md: "1rem" } }}>
                  {formatDate(userData.createdAt)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 3,
                  backgroundColor: alpha(theme.palette.warning.main, 0.1),
                  color: theme.palette.warning.main,
                }}
              >
                <CakeIcon fontSize="small" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", md: "0.85rem" } }}>
                  Naissance
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, fontSize: { xs: "0.9rem", md: "1rem" } }}>
                  {formatBirthDate(birthDate)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 3,
                  backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                  color: theme.palette.secondary.main,
                }}
              >
                <FamilyRestroomIcon fontSize="small" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", md: "0.85rem" } }}>
                  Rôle familial
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, fontSize: { xs: "0.9rem", md: "1rem" } }}>
                  {FAMILY_RELATIONSHIP_OPTIONS.find((opt) => opt.value === userData.personalInfo?.familyRelationship)?.label || "Non défini"}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Box
        sx={{
          minHeight: "100vh",
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          py: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Container maxWidth="xl">
          <Fade in timeout={600}>
            <Box>
              <Box sx={{ mb: 4, textAlign: "center" }}>
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    mb: 2,
                    fontSize: { xs: "2rem", sm: "2.5rem", md: "3.5rem" },
                    letterSpacing: "-0.02em",
                  }}
                >
                  Mon Profil
                </Typography>
                <Typography
                  variant="h5"
                  color="text.secondary"
                  sx={{ fontWeight: 400, fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}
                >
                  Gérez vos informations personnelles et préférences
                </Typography>
              </Box>

              {isMobile && (
                <Box sx={{ mb: 3, display: "flex", justifyContent: "center" }}>
                  <Button
                    variant="outlined"
                    startIcon={<MenuIcon />}
                    onClick={() => setSidebarOpen(true)}
                    sx={{
                      borderRadius: 4,
                      px: 3,
                      py: 1,
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      },
                    }}
                  >
                    Voir le profil
                  </Button>
                </Box>
              )}

              {error && (
                <Fade in>
                  <Alert
                    severity="error"
                    sx={{
                      mb: 3,
                      borderRadius: 4,
                      boxShadow: `0 4px 20px ${alpha(theme.palette.error.main, 0.2)}`,
                    }}
                    onClose={() => setError("")}
                  >
                    {error}
                  </Alert>
                </Fade>
              )}
              {success && (
                <Fade in>
                  <Alert
                    severity="success"
                    sx={{
                      mb: 3,
                      borderRadius: 4,
                      boxShadow: `0 4px 20px ${alpha(theme.palette.success.main, 0.2)}`,
                    }}
                    onClose={() => setSuccess("")}
                  >
                    {success}
                  </Alert>
                </Fade>
              )}

              {loading && (
                <Box sx={{ mb: 3 }}>
                  <LinearProgress
                    sx={{
                      borderRadius: 3,
                      height: 8,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      "& .MuiLinearProgress-bar": {
                        background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                      },
                    }}
                  />
                </Box>
              )}

              <Box
                sx={{
                  display: "flex",
                  gap: { xs: 2, md: 4 },
                  alignItems: "flex-start",
                  flexDirection: { xs: "column", md: "row" },
                }}
              >
                {!isMobile && (
                  <Zoom in timeout={800}>
                    <Box sx={{ flexShrinkZu: 0 }}>
                      <ProfileSidebar />
                    </Box>
                  </Zoom>
                )}

                <Drawer
                  anchor="left"
                  open={sidebarOpen}
                  onClose={() => setSidebarOpen(false)}
                  PaperProps={{
                    sx: {
                      width: "85vw",
                      maxWidth: { xs: 300, sm: 350 },
                      background: "transparent",
                      boxShadow: "none",
                    },
                  }}
                  BackdropProps={{
                    sx: {
                      backgroundColor: alpha(theme.palette.common.black, 0.7),
                      backdropFilter: "blur(8px)",
                    },
                  }}
                >
                  <Box sx={{ p: 2, height: "100%" }}>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                      <IconButton onClick={() => setSidebarOpen(false)}>
                        <CloseIcon />
                      </IconButton>
                    </Box>
                    <ProfileSidebar />
                  </Box>
                </Drawer>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Zoom in timeout={1000}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 6,
                        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        backdropFilter: "blur(20px)",
                        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
                        overflow: "hidden",
                      }}
                    >
                      <CardContent sx={{ p: 0 }}>
                        <Box sx={{ borderBottom: 1, borderColor: "divider", px: { xs: 2, sm: 3, md: 4 }, pt: 3 }}>
                          <Tabs
                            value={currentTab}
                            onChange={handleTabChange}
                            aria-label="Profile sections tabs"
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                              "& .MuiTab-root": {
                                minHeight: { xs: 48, sm: 56, md: 64 },
                                fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" },
                                fontWeight: 500,
                                textTransform: "none",
                                borderRadius: 3,
                                mx: 0.5,
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                "&:hover": {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                },
                                "&.Mui-selected": {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                  color: theme.palette.primary.main,
                                },
                              },
                            }}
                          >
                            <Tab
                              icon={<PersonIcon />}
                              iconPosition="start"
                              label="Infos Personnelles"
                              {...a11yProps(0)}
                            />
                            <Tab icon={<RestaurantIcon />} iconPosition="start" label="Préférences" {...a11yProps(1)} />
                            <Tab
                              icon={<NotificationsIcon />}
                              iconPosition="start"
                              label="Notifications"
                              {...a11yProps(2)}
                            />
                            <Tab icon={<BarChartIcon />} iconPosition="start" label="Statistiques" {...a11yProps(3)} />
                          </Tabs>
                        </Box>

                        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
                            {!isEditing ? (
                              <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => setIsEditing(true)}
                                size="large"
                                sx={{
                                  borderRadius: 4,
                                  px: { xs: 2, md: 3 },
                                  py: 1,
                                  borderColor: alpha(theme.palette.primary.main, 0.3),
                                  fontSize: { xs: "0.85rem", md: "1rem" },
                                  fontWeight: 500,
                                  "&:hover": {
                                    borderColor: theme.palette.primary.main,
                                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                    transform: "translateY(-2px)",
                                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                                  },
                                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                              >
                                Modifier
                              </Button>
                            ) : (
                              <Stack direction="row" spacing={2}>
                                <Button
                                  variant="outlined"
                                  startIcon={<CancelIcon />}
                                  onClick={handleCancel}
                                  disabled={loading}
                                  size="large"
                                  sx={{
                                    borderRadius: 4,
                                    px: { xs: 2, md: 3 },
                                    py: 1,
                                    fontSize: { xs: "0.85rem", md: "1rem" },
                                    fontWeight: 500,
                                  }}
                                >
                                  Annuler
                                </Button>
                                <Button
                                  variant="contained"
                                  startIcon={<SaveIcon />}
                                  onClick={handleProfileUpdate}
                                  disabled={loading}
                                  size="large"
                                  sx={{
                                    borderRadius: 4,
                                    px: { xs: 2, md: 3 },
                                    py: 1,
                                    fontSize: { xs: "0.85rem", md: "1rem" },
                                    fontWeight: 600,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                                    "&:hover": {
                                      transform: "translateY(-2px)",
                                      boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                                    },
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                  }}
                                >
                                  {loading ? <CircularProgress size={20} color="inherit" /> : "Sauvegarder"}
                                </Button>
                              </Stack>
                            )}
                          </Box>

                          <TabPanel value={currentTab} index={0}>
                            <Typography
                              variant="h5"
                              sx={{
                                mb: 3,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                fontWeight: 600,
                                fontSize: { xs: "1.25rem", md: "1.5rem" },
                              }}
                            >
                              <Box
                                sx={{
                                  p: 1,
                                  borderRadius: 3,
                                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                  color: theme.palette.primary.main,
                                }}
                              >
                                <PersonIcon />
                              </Box>
                              Informations de base
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  label="Nom d'affichage"
                                  value={displayName}
                                  onChange={(e) => setDisplayName(e.target.value)}
                                  disabled={!isEditing || loading}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: 4,
                                      fontSize: { xs: "0.9rem", md: "1rem" },
                                    },
                                    "& .MuiInputLabel-root": {
                                      fontSize: { xs: "0.85rem", md: "0.9rem" },
                                    },
                                  }}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  label="Prénom"
                                  value={firstName}
                                  onChange={(e) => setFirstName(e.target.value)}
                                  disabled={!isEditing || loading}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: 4,
                                      fontSize: { xs: "0.9rem", md: "1rem" },
                                    },
                                    "& .MuiInputLabel-root": {
                                      fontSize: { xs: "0.85rem", md: "0.9rem" },
                                    },
                                  }}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  label="Nom"
                                  value={lastName}
                                  onChange={(e) => setLastName(e.target.value)}
                                  disabled={!isEditing || loading}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: 4,
                                      fontSize: { xs: "0.9rem", md: "1rem" },
                                    },
                                    "& .MuiInputLabel-root": {
                                      fontSize: { xs: "0.85rem", md: "0.9rem" },
                                    },
                                  }}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <DatePicker
                                  label="Date de naissance"
                                  value={birthDate}
                                  onChange={(newValue) => setBirthDate(newValue)}
                                  disabled={!isEditing || loading}
                                  slotProps={{
                                    textField: {
                                      fullWidth: true,
                                      sx: {
                                        "& .MuiOutlinedInput-root": {
                                          borderRadius: 4,
                                          fontSize: { xs: "0.9rem", md: "1rem" },
                                        },
                                        "& .MuiInputLabel-root": {
                                          fontSize: { xs: "0.85rem", md: "0.9rem" },
                                        },
                                      },
                                    },
                                  }}
                                  maxDate={new Date()}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <FormControl
                                  fullWidth
                                  disabled={!isEditing || loading}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: 4,
                                      fontSize: { xs: "0.9rem", md: "1rem" },
                                    },
                                    "& .MuiInputLabel-root": {
                                      fontSize: { xs: "0.85rem", md: "0.9rem" },
                                    },
                                  }}
                                >
                                  <InputLabel id="gender-select-label">Genre</InputLabel>
                                  <Select
                                    labelId="gender-select-label"
                                    value={gender}
                                    label="Genre"
                                    onChange={(e) => setGender(e.target.value)}
                                  >
                                    {GENDER_OPTIONS.map((option) => (
                                      <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <FormControl
                                  fullWidth
                                  disabled={!isEditing || loading}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: 4,
                                      fontSize: { xs: "0.9rem", md: "1rem" },
                                    },
                                    "& .MuiInputLabel-root": {
                                      fontSize: { xs: "0.85rem", md: "0.9rem" },
                                    },
                                  }}
                                >
                                  <InputLabel id="family-relationship-select-label">Lien de parenté</InputLabel>
                                  <Select
                                    labelId="family-relationship-select-label"
                                    value={familyRelationship}
                                    label="Lien de parenté"
                                    onChange={(e) => setFamilyRelationship(e.target.value)}
                                  >
                                    {FAMILY_RELATIONSHIP_OPTIONS.map((option) => (
                                      <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                            </Grid>
                          </TabPanel>

                          <TabPanel value={currentTab} index={1}>
                            <Typography
                              variant="h5"
                              sx={{
                                mb: 3,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                fontWeight: 600,
                                fontSize: { xs: "1.25rem", md: "1.5rem" },
                              }}
                            >
                              <Box
                                sx={{
                                  p: 1,
                                  borderRadius: 3,
                                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                  color: theme.palette.primary.main,
                                }}
                              >
                                <RestaurantIcon />
                              </Box>
                              Préférences et restrictions
                            </Typography>
                            <Grid container spacing={3}>
                              <Grid item xs={12} sm={6}>
                                <FormControl
                                  fullWidth
                                  disabled={!isEditing || loading}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: 4,
                                      fontSize: { xs: "0.9rem", md: "1rem" },
                                    },
                                    "& .MuiInputLabel-root": {
                                      fontSize: { xs: "0.85rem", md: "0.9rem" },
                                    },
                                  }}
                                >
                                  <InputLabel id="diet-select-label">Régime principal</InputLabel>
                                  <Select
                                    labelId="diet-select-label"
                                    value={selectedDiet}
                                    label="Régime principal"
                                    onChange={(e) => setSelectedDiet(e.target.value)}
                                  >
                                    {DIET_OPTIONS.map((option) => (
                                      <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12}>
                                <Autocomplete
                                  multiple
                                  freeSolo
                                  options={COMMON_ALLERGIES}
                                  value={allergies}
                                  onChange={(event, newValue) => setAllergies(newValue)}
                                  disabled={!isEditing || loading}
                                  renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                      <Chip
                                        key={option}
                                        variant="outlined"
                                        label={option}
                                        color="error"
                                        icon={<WarningIcon fontSize="small" />}
                                        {...getTagProps({ index })}
                                        sx={{ borderRadius: 3, fontSize: { xs: "0.75rem", md: "0.85rem" } }}
                                      />
                                    ))
                                  }
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      variant="outlined"
                                      label="Allergies"
                                      placeholder="Ajouter une allergie"
                                      sx={{
                                        "& .MuiOutlinedInput-root": {
                                          borderRadius: 4,
                                          fontSize: { xs: "0.9rem", md: "1rem" },
                                        },
                                        "& .MuiInputLabel-root": {
                                          fontSize: { xs: "0.85rem", md: "0.9rem" },
                                        },
                                      }}
                                    />
                                  )}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <Autocomplete
                                  multiple
                                  freeSolo
                                  options={COMMON_DISLIKES}
                                  value={dislikes}
                                  onChange={(event, newValue) => setDislikes(newValue)}
                                  disabled={!isEditing || loading}
                                  renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                      <Chip
                                        key={option}
                                        variant="outlined"
                                        label={option}
                                        color="warning"
                                        icon={<ThumbDownIcon fontSize="small" />}
                                        {...getTagProps({ index })}
                                        sx={{ borderRadius: 3, fontSize: { xs: "0.75rem", md: "0.85rem" } }}
                                      />
                                    ))
                                  }
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      variant="outlined"
                                      label="Ingrédients détestés"
                                      placeholder="Ajouter un ingrédient"
                                      sx={{
                                        "& .MuiOutlinedInput-root": {
                                          borderRadius: 4,
                                          fontSize: { xs: "0.9rem", md: "1rem" },
                                        },
                                        "& .MuiInputLabel-root": {
                                          fontSize: { xs: "0.85rem", md: "0.9rem" },
                                        },
                                      }}
                                    />
                                  )}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <Autocomplete
                                  multiple
                                  freeSolo
                                  options={COMMON_FAVORITES}
                                  value={favorites}
                                  onChange={(event, newValue) => setFavorites(newValue)}
                                  disabled={!isEditing || loading}
                                  renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                      <Chip
                                        key={option}
                                        variant="outlined"
                                        label={option}
                                        color="success"
                                        icon={<FavoriteIcon fontSize="small" />}
                                        {...getTagProps({ index })}
                                        sx={{ borderRadius: 3, fontSize: { xs: "0.75rem", md: "0.85rem" } }}
                                      />
                                    ))
                                  }
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      variant="outlined"
                                      label="Ingrédients / Plats favoris"
                                      placeholder="Ajouter un favori"
                                      sx={{
                                        "& .MuiOutlinedInput-root": {
                                          borderRadius: 4,
                                          fontSize: { xs: "0.9rem", md: "1rem" },
                                        },
                                        "& .MuiInputLabel-root": {
                                          fontSize: { xs: "0.85rem", md: "0.9rem" },
                                        },
                                      }}
                                    />
                                  )}
                                />
                              </Grid>
                            </Grid>
                          </TabPanel>

                          <TabPanel value={currentTab} index={2}>
                            <Typography
                              variant="h5"
                              sx={{
                                mb: 3,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                fontWeight: 600,
                                fontSize: { xs: "1.25rem", md: "1.5rem" },
                              }}
                            >
                              <Box
                                sx={{
                                  p: 1,
                                  borderRadius: 3,
                                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                  color: theme.palette.primary.main,
                                }}
                              >
                                <NotificationsIcon />
                              </Box>
                              Paramètres de notification
                            </Typography>
                            <Stack spacing={2}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={notificationSettings.invitations}
                                    onChange={(e) =>
                                      setNotificationSettings({
                                        ...notificationSettings,
                                        invitations: e.target.checked,
                                      })
                                    }
                                    disabled={!isEditing || loading}
                                    size="medium"
                                  />
                                }
                                label={
                                  <Typography variant="body1" sx={{ fontSize: { xs: "0.9rem", md: "1rem" } }}>
                                    Recevoir les invitations à rejoindre une famille
                                  </Typography>
                                }
                                sx={{ "& .MuiFormControlLabel-label": { ml: 1 } }}
                              />
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={notificationSettings.planningReady}
                                    onChange={(e) =>
                                      setNotificationSettings({
                                        ...notificationSettings,
                                        planningReady: e.target.checked,
                                      })
                                    }
                                    disabled={!isEditing || loading}
                                    size="medium"
                                  />
                                }
                                label={
                                  <Typography variant="body1" sx={{ fontSize: { xs: "0.9rem", md: "1rem" } }}>
                                    Être notifié quand le planning de la semaine est prêt
                                  </Typography>
                                }
                                sx={{ "& .MuiFormControlLabel-label": { ml: 1 } }}
                              />
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={notificationSettings.newRecipes}
                                    onChange={(e) =>
                                      setNotificationSettings({
                                        ...notificationSettings,
                                        newRecipes: e.target.checked,
                                      })
                                    }
                                    disabled={!isEditing || loading}
                                    size="medium"
                                  />
                                }
                                label={
                                  <Typography variant="body1" sx={{ fontSize: { xs: "0.9rem", md: "1rem" } }}>
                                    Recevoir des notifications pour les nouvelles recettes ajoutées
                                  </Typography>
                                }
                                sx={{ "& .MuiFormControlLabel-label": { ml: 1 } }}
                              />
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={notificationSettings.shoppingListUpdates}
                                    onChange={(e) =>
                                      setNotificationSettings({
                                        ...notificationSettings,
                                        shoppingListUpdates: e.target.checked,
                                      })
                                    }
                                    disabled={!isEditing || loading}
                                    size="medium"
                                  />
                                }
                                label={
                                  <Typography variant="body1" sx={{ fontSize: { xs: "0.9rem", md: "1rem" } }}>
                                    Être notifié des mises à jour importantes de la liste de courses
                                  </Typography>
                                }
                                sx={{ "& .MuiFormControlLabel-label": { ml: 1 } }}
                              />
                              <FormControl
                                fullWidth
                                disabled={!isEditing || loading}
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: 4,
                                    fontSize: { xs: "0.9rem", md: "1rem" },
                                  },
                                  "& .MuiInputLabel-root": {
                                    fontSize: { xs: "0.85rem", md: "0.9rem" },
                                  },
                                  mt: 2,
                                }}
                              >
                                <InputLabel id="frequency-select-label">Fréquence des résumés</InputLabel>
                                <Select
                                  labelId="frequency-select-label"
                                  value={notificationSettings.frequency}
                                  label="Fréquence des résumés"
                                  onChange={(e) =>
                                    setNotificationSettings({ ...notificationSettings, frequency: e.target.value })
                                  }
                                >
                                  {NOTIFICATION_FREQUENCY_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                      {option.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Stack>
                          </TabPanel>

                          <TabPanel value={currentTab} index={3}>
                            <Typography
                              variant="h5"
                              sx={{
                                mb: 3,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                fontWeight: 600,
                                fontSize: { xs: "1.25rem", md: "1.5rem" },
                              }}
                            >
                              <Box
                                sx={{
                                  p: 1,
                                  borderRadius: 3,
                                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                  color: theme.palette.primary.main,
                                }}
                              >
                                <BarChartIcon />
                              </Box>
                              Statistiques d'utilisation
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6} md={3}>
                                <Card
                                  elevation={2}
                                  sx={{
                                    borderRadius: 4,
                                    textAlign: "center",
                                    p: 2,
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    "&:hover": {
                                      transform: "translateY(-4px)",
                                      boxShadow: `0 8px 25px ${alpha(theme.palette.info.main, 0.2)}`,
                                    },
                                  }}
                                >
                                  <Typography
                                    variant="h3"
                                    color="info.main"
                                    sx={{ fontWeight: 700, mb: 1, fontSize: { xs: "1.5rem", md: "2rem" } }}
                                  >
                                    {getStatValue(userData.usageStats?.recipesCreated)}
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    color="text.secondary"
                                    sx={{ fontWeight: 500, fontSize: { xs: "0.85rem", md: "1rem" } }}
                                  >
                                    Recettes créées
                                  </Typography>
                                </Card>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <Card
                                  elevation={2}
                                  sx={{
                                    borderRadius: 4,
                                    textAlign: "center",
                                    p: 2,
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.light, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    "&:hover": {
                                      transform: "translateY(-4px)",
                                      boxShadow: `0 8px 25px ${alpha(theme.palette.success.main, 0.2)}`,
                                    },
                                  }}
                                >
                                  <Typography
                                    variant="h3"
                                    color="success.main"
                                    sx={{ fontWeight: 700, mb: 1, fontSize: { xs: "1.5rem", md: "2rem" } }}
                                  >
                                    {getStatValue(userData.usageStats?.mealsPlanned)}
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    color="text.secondary"
                                    sx={{ fontWeight: 500, fontSize: { xs: "0.85rem", md: "1rem" } }}
                                  >
                                    Repas planifiés
                                  </Typography>
                                </Card>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <Card
                                  elevation={2}
                                  sx={{
                                    borderRadius: 4,
                                    textAlign: "center",
                                    p: 2,
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.warning.light, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                                    border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    "&:hover": {
                                      transform: "translateY(-4px)",
                                      boxShadow: `0 8px 25px ${alpha(theme.palette.warning.main, 0.2)}`,
                                    },
                                  }}
                                >
                                  <Typography
                                    variant="h3"
                                    color="warning.main"
                                    sx={{ fontWeight: 700, mb: 1, fontSize: { xs: "1.5rem", md: "2rem" } }}
                                  >
                                    {getStatValue(userData.usageStats?.shoppingListsGenerated)}
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    color="text.secondary"
                                    sx={{ fontWeight: 500, fontSize: { xs: "0.85rem", md: "1rem" } }}
                                  >
                                    Listes générées
                                  </Typography>
                                </Card>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <Card
                                  elevation={2}
                                  sx={{
                                    borderRadius: 4,
                                    textAlign: "center",
                                    p: 2,
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.light, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    "&:hover": {
                                      transform: "translateY(-4px)",
                                      boxShadow: `0 8px 25px ${alpha(theme.palette.secondary.main, 0.2)}`,
                                    },
                                  }}
                                >
                                  <Typography
                                    variant="h3"
                                    color="secondary.main"
                                    sx={{ fontWeight: 700, mb: 1, fontSize: { xs: "1.5rem", md: "2rem" } }}
                                  >
                                    {getStatValue(userData.usageStats?.estimatedSavings?.amount).toLocaleString("fr-FR")}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="secondary.main"
                                    sx={{ fontWeight: 600, mb: 0.5, fontSize: { xs: "0.75rem", md: "0.9rem" } }}
                                  >
                                    {userData.usageStats?.estimatedSavings?.currency || "FCFA"}
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    color="text.secondary"
                                    sx={{ fontWeight: 500, fontSize: { xs: "0.85rem", md: "1rem" } }}
                                  >
                                    Économies estimées
                                  </Typography>
                                </Card>
                              </Grid>
                            </Grid>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ display: "block", mt: 2, fontStyle: "italic", fontSize: { xs: "0.75rem", md: "0.85rem" } }}
                            >
                              💡 Note : Les économies sont une estimation basée sur les prix renseignés et peuvent varier selon les fluctuations du marché.
                            </Typography>
                          </TabPanel>
                        </Box>
                      </CardContent>
                    </Card>
                  </Zoom>
                </Box>
              </Box>
            </Box>
          </Fade>
        </Container>
      </Box>
    </LocalizationProvider>
  )
}
