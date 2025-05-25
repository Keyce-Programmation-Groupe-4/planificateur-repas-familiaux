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
} from "@mui/material"
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Group as GroupIcon,
  AdminPanelSettings as AdminIcon,
  Restaurant as RestaurantIcon,
  Warning as WarningIcon,
  ThumbDown as DislikeIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material"
import { useAuth } from "../contexts/AuthContext"
import { db } from "../firebaseConfig"
import { updateProfile } from "firebase/auth"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

// Predefined options for dietary preferences
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

export default function ProfilePage() {
  const { currentUser, userData, loading: authLoading } = useAuth()
  const theme = useTheme()

  // Form states
  const [displayName, setDisplayName] = useState("")
  const [selectedDiet, setSelectedDiet] = useState("")
  const [allergies, setAllergies] = useState([])
  const [dislikes, setDislikes] = useState([])

  // UI states
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Initialize form data when userData is loaded
  useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || "")
      setSelectedDiet(userData.dietaryPreferences?.diet || "")
      setAllergies(userData.dietaryPreferences?.allergies || [])
      setDislikes(userData.dietaryPreferences?.dislikes || [])
    }
  }, [userData])

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
      // Update Firebase Auth profile
      await updateProfile(currentUser, { displayName: displayName })

      // Update Firestore document
      const userDocRef = doc(db, "users", currentUser.uid)
      await updateDoc(userDocRef, {
        displayName: displayName,
        dietaryPreferences: {
          diet: selectedDiet,
          allergies: allergies,
          dislikes: dislikes,
        },
        updatedAt: serverTimestamp(),
      })

      setSuccess("Profil mis à jour avec succès !")
      setIsEditing(false)
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      console.error("Profile Update Error:", err)
      setError("Échec de la mise à jour du profil.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form to original values
    if (userData) {
      setDisplayName(userData.displayName || "")
      setSelectedDiet(userData.dietaryPreferences?.diet || "")
      setAllergies(userData.dietaryPreferences?.allergies || [])
      setDislikes(userData.dietaryPreferences?.dislikes || [])
    }
    setIsEditing(false)
    setError("")
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "Non disponible"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000)
    return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr })
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case "Admin":
        return <AdminIcon />
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
          Impossible de charger les données du profil.
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Fade in timeout={600}>
        <Box>
          {/* Header */}
          <Box sx={{ mb: 4, textAlign: "center" }}>
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
              }}
            >
              Mon Profil
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Gérez vos informations personnelles et préférences alimentaires
            </Typography>
          </Box>

          {/* Alerts */}
          {error && (
            <Fade in>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                {error}
              </Alert>
            </Fade>
          )}
          {success && (
            <Fade in>
              <Alert severity="success" sx={{ mb: 3, borderRadius: 3 }}>
                {success}
              </Alert>
            </Fade>
          )}

          {/* Loading Progress */}
          {loading && (
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
          )}

          <Grid container spacing={4}>
            {/* Profile Card - Sidebar */}
            <Grid item xs={12} md={4}>
              <Zoom in timeout={800}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 6,
                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    height: "fit-content",
                    position: { md: "sticky" },
                    top: 24,
                  }}
                >
                  <CardContent sx={{ p: 4, textAlign: "center" }}>
                    {/* Avatar */}
                    <Box sx={{ position: "relative", display: "inline-block", mb: 3 }}>
                      <Avatar
                        src={userData.photoURL}
                        sx={{
                          width: 120,
                          height: 120,
                          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                          fontSize: "3rem",
                          fontWeight: 700,
                          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
                        }}
                      >
                        {userData.displayName?.charAt(0) || userData.email?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Tooltip title="Changer la photo de profil">
                        <IconButton
                          sx={{
                            position: "absolute",
                            bottom: 0,
                            right: 0,
                            backgroundColor: theme.palette.primary.main,
                            color: "white",
                            width: 40,
                            height: 40,
                            "&:hover": {
                              backgroundColor: theme.palette.primary.dark,
                              transform: "scale(1.1)",
                            },
                            transition: "all 0.2s ease",
                          }}
                          disabled={uploadingPhoto}
                        >
                          {uploadingPhoto ? <CircularProgress size={20} color="inherit" /> : <PhotoCameraIcon />}
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* User Info */}
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                      {userData.displayName || "Utilisateur"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {userData.email}
                    </Typography>

                    {/* Role Chip */}
                    <Chip
                      icon={getRoleIcon(userData.familyRole)}
                      label={userData.familyRole || "Membre"}
                      sx={{
                        backgroundColor: alpha(getRoleColor(userData.familyRole), 0.1),
                        color: getRoleColor(userData.familyRole),
                        fontWeight: 600,
                        borderRadius: 3,
                        mb: 3,
                      }}
                    />

                    {/* Account Info */}
                    <Divider sx={{ my: 3 }} />
                    <Stack spacing={2}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <GroupIcon color="action" fontSize="small" />
                        <Typography variant="body2" color="text.secondary">
                          ID Famille: {userData.familyId}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CalendarIcon color="action" fontSize="small" />
                        <Typography variant="body2" color="text.secondary">
                          Membre depuis: {formatDate(userData.createdAt)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>

            {/* Main Content - Form */}
            <Grid item xs={12} md={8}>
              <Zoom in timeout={1000}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 6,
                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    {/* Form Header */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Informations personnelles
                      </Typography>
                      {!isEditing ? (
                        <Button
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => setIsEditing(true)}
                          sx={{
                            borderRadius: 3,
                            borderColor: alpha(theme.palette.primary.main, 0.3),
                            "&:hover": {
                              borderColor: theme.palette.primary.main,
                              backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            },
                          }}
                        >
                          Modifier
                        </Button>
                      ) : (
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={handleCancel}
                            disabled={loading}
                            sx={{ borderRadius: 3 }}
                          >
                            Annuler
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleProfileUpdate}
                            disabled={loading}
                            sx={{
                              borderRadius: 3,
                              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            }}
                          >
                            {loading ? <CircularProgress size={20} color="inherit" /> : "Sauvegarder"}
                          </Button>
                        </Stack>
                      )}
                    </Box>

                    <Box component="form" onSubmit={handleProfileUpdate}>
                      <Stack spacing={4}>
                        {/* Basic Info Section */}
                        <Box>
                          <Typography variant="h6" sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                            <PersonIcon color="primary" />
                            Informations de base
                          </Typography>

                          <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Nom d'affichage"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                disabled={!isEditing || loading}
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: 3,
                                  },
                                }}
                              />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Adresse Email"
                                value={userData.email}
                                disabled
                                InputProps={{
                                  startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
                                }}
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: 3,
                                  },
                                }}
                              />
                            </Grid>
                          </Grid>
                        </Box>

                        {/* Dietary Preferences Section */}
                        <Box>
                          <Typography variant="h6" sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                            <RestaurantIcon color="primary" />
                            Préférences alimentaires
                          </Typography>

                          <Stack spacing={3}>
                            <FormControl fullWidth disabled={!isEditing || loading}>
                              <InputLabel>Régime alimentaire</InputLabel>
                              <Select
                                value={selectedDiet}
                                label="Régime alimentaire"
                                onChange={(e) => setSelectedDiet(e.target.value)}
                                sx={{ borderRadius: 3 }}
                              >
                                {DIET_OPTIONS.map((option) => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>

                            <Grid container spacing={3}>
                              <Grid item xs={12} sm={6}>
                                <Autocomplete
                                  multiple
                                  options={COMMON_ALLERGIES}
                                  value={allergies}
                                  onChange={(event, newValue) => setAllergies(newValue)}
                                  disabled={!isEditing || loading}
                                  renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                      <Chip
                                        {...getTagProps({ index })}
                                        key={option}
                                        label={option}
                                        icon={<WarningIcon />}
                                        color="error"
                                        variant="outlined"
                                        sx={{ borderRadius: 2 }}
                                      />
                                    ))
                                  }
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Allergies"
                                      placeholder="Sélectionnez vos allergies"
                                      sx={{
                                        "& .MuiOutlinedInput-root": {
                                          borderRadius: 3,
                                        },
                                      }}
                                    />
                                  )}
                                />
                              </Grid>

                              <Grid item xs={12} sm={6}>
                                <Autocomplete
                                  multiple
                                  options={COMMON_DISLIKES}
                                  value={dislikes}
                                  onChange={(event, newValue) => setDislikes(newValue)}
                                  disabled={!isEditing || loading}
                                  renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                      <Chip
                                        {...getTagProps({ index })}
                                        key={option}
                                        label={option}
                                        icon={<DislikeIcon />}
                                        color="warning"
                                        variant="outlined"
                                        sx={{ borderRadius: 2 }}
                                      />
                                    ))
                                  }
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Aliments non appréciés"
                                      placeholder="Sélectionnez ce que vous n'aimez pas"
                                      sx={{
                                        "& .MuiOutlinedInput-root": {
                                          borderRadius: 3,
                                        },
                                      }}
                                    />
                                  )}
                                />
                              </Grid>
                            </Grid>
                          </Stack>
                        </Box>

                        {/* Summary Section - Only when not editing */}
                        {!isEditing && (
                          <Box>
                            <Divider sx={{ mb: 3 }} />
                            <Typography variant="h6" sx={{ mb: 3 }}>
                              Résumé des préférences
                            </Typography>
                            <Stack spacing={3}>
                              {selectedDiet && (
                                <Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Régime:
                                  </Typography>
                                  <Chip
                                    label={DIET_OPTIONS.find((d) => d.value === selectedDiet)?.label}
                                    color="primary"
                                    sx={{ borderRadius: 2 }}
                                  />
                                </Box>
                              )}
                              {allergies.length > 0 && (
                                <Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Allergies:
                                  </Typography>
                                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                                    {allergies.map((allergy) => (
                                      <Chip
                                        key={allergy}
                                        label={allergy}
                                        icon={<WarningIcon />}
                                        color="error"
                                        size="small"
                                        sx={{ borderRadius: 2 }}
                                      />
                                    ))}
                                  </Stack>
                                </Box>
                              )}
                              {dislikes.length > 0 && (
                                <Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    N'aime pas:
                                  </Typography>
                                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                                    {dislikes.map((dislike) => (
                                      <Chip
                                        key={dislike}
                                        label={dislike}
                                        icon={<DislikeIcon />}
                                        color="warning"
                                        size="small"
                                        sx={{ borderRadius: 2 }}
                                      />
                                    ))}
                                  </Stack>
                                </Box>
                              )}
                            </Stack>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>
          </Grid>
        </Box>
      </Fade>
    </Container>
  )
}
