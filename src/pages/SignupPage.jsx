"use client"

import { useState } from "react"
import { useNavigate, Link as RouterLink } from "react-router-dom"
import { auth, db } from "../firebaseConfig"
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore"
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  CircularProgress,
  Paper,
  Avatar,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Stack,
  Divider,
  InputAdornment,
  IconButton,
} from "@mui/material"
import {
  PersonAddOutlined as PersonAddOutlinedIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Google as GoogleIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Lock as LockIcon,
} from "@mui/icons-material"
import StarsIcon from '@mui/icons-material/Stars';
import { triggerSendNotification } from '../utils/notificationUtils';
import { getCurrentUserFCMToken } from '../utils/authUtils';

export default function SignupPage() {
  const theme = useTheme()
  const navigate = useNavigate()

  // Form state
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // UI state
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const createUserDocument = async (user, additionalData = {}) => {
    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || additionalData.displayName || "",
        photoURL: user.photoURL || null,
        familyId: null,
        familyRole: null,
        dietaryPreferences: {
          allergies: [],
          diet: "",
          dislikes: [],
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...additionalData,
      })
    }
  }

  const handleEmailSignup = async (e) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!displayName.trim()) {
      return setError("Le nom d'affichage est requis.")
    }
    if (password !== confirmPassword) {
      return setError("Les mots de passe ne correspondent pas.")
    }
    if (password.length < 6) {
      return setError("Le mot de passe doit contenir au moins 6 caractères.")
    }

    setLoading(true)
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: displayName.trim() })

      // Create user document in Firestore
      await createUserDocument(user, { displayName: displayName.trim() })

      // Signup Success Notification
      const fcmTokenSuccess = await getCurrentUserFCMToken();
      if (fcmTokenSuccess) {
        triggerSendNotification(
          fcmTokenSuccess,
          "Inscription réussie !",
          `Bienvenue ${displayName.trim()} ! Votre compte a été créé.`
        );
      } else {
        console.warn("Inscription réussie, mais jeton FCM introuvable pour la notification push.");
      }

      // Navigate to home page
      navigate("/")
    } catch (err) {
      console.error("Signup Error:", err)
      if (err.code === "auth/email-already-in-use") {
        setError("Cette adresse email est déjà utilisée.")
      } else if (err.code === "auth/invalid-email") {
        setError("Adresse email invalide.")
      } else if (err.code === "auth/weak-password") {
        setError("Le mot de passe est trop faible.")
      } else {
        setError("Échec de l'inscription. Veuillez réessayer.")
      }

      // Signup Failure Notification
      const fcmTokenFailure = await getCurrentUserFCMToken();
      if (fcmTokenFailure) {
        triggerSendNotification(
          fcmTokenFailure,
          "Tentative d'inscription échouée",
          err.message || "Erreur inconnue" // Send the specific error message
        );
      }
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError("")
    setGoogleLoading(true)
    const provider = new GoogleAuthProvider()

    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Create user document if it doesn't exist
      await createUserDocument(user)

      // Google Signup Success Notification
      const fcmTokenGoogleSuccess = await getCurrentUserFCMToken();
      if (fcmTokenGoogleSuccess) {
        triggerSendNotification(
          fcmTokenGoogleSuccess,
          "Inscription Google réussie !",
          `Bienvenue ${user.displayName || 'Utilisateur'} ! Votre compte a été créé avec Google.`
        );
      } else {
        console.warn("Inscription Google réussie, mais jeton FCM introuvable pour la notification push.");
      }

      navigate("/")
    } catch (err) {
      console.error("Google Signup Error:", err)
      if (err.code === "auth/popup-closed-by-user") {
        setError("Connexion annulée.")
      } else {
        setError("Échec de la connexion avec Google.")
      }

      // Google Signup Failure Notification
      const fcmTokenGoogleFailure = await getCurrentUserFCMToken();
      if (fcmTokenGoogleFailure) {
        triggerSendNotification(
          fcmTokenGoogleFailure,
          "Tentative d'inscription Google échouée",
          err.message || "Erreur inconnue" // Send the specific error message
        );
      }
      setGoogleLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
        display: "flex",
        alignItems: "center",
        py: 4,
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

      <Container component="main" maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Fade in timeout={800}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 6,
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              backdropFilter: "blur(20px)",
              boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.15)}`,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: 4,
                pb: 2,
                textAlign: "center",
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
              }}
            >
              <Zoom in timeout={1000}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    mx: "auto",
                    mb: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    fontSize: "2rem",
                  }}
                >
                  <PersonAddOutlinedIcon sx={{ fontSize: "2rem" }} />
                </Avatar>
              </Zoom>
              <Typography
                variant="h4"
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
                Rejoignez-nous !
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Créez votre compte et commencez à planifier vos repas
              </Typography>
            </Box>

            <Box sx={{ p: 4 }}>
              {/* Error Alert */}
              {error && (
                <Fade in>
                  <Alert
                    severity="error"
                    sx={{
                      mb: 3,
                      borderRadius: 3,
                      background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                      border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                    }}
                  >
                    {error}
                  </Alert>
                </Fade>
              )}

              {/* Google Signup Button */}
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleSignup}
                disabled={loading || googleLoading}
                sx={{
                  mb: 3,
                  py: 1.5,
                  borderRadius: 4,
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  color: theme.palette.text.primary,
                  "&:hover": {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    transform: "translateY(-2px)",
                    boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
                  },
                  transition: "all 0.3s ease",
                }}
              >
                {googleLoading ? <CircularProgress size={24} /> : "Continuer avec Google"}
              </Button>

              {/* Divider */}
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <Divider sx={{ flexGrow: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                  ou
                </Typography>
                <Divider sx={{ flexGrow: 1 }} />
              </Box>

              {/* Email Signup Form */}
              <Box component="form" onSubmit={handleEmailSignup} noValidate>
                <Stack spacing={3}>
                  <TextField
                    required
                    fullWidth
                    id="displayName"
                    label="Nom d'affichage"
                    name="displayName"
                    autoComplete="name"
                    autoFocus
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={loading || googleLoading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: theme.palette.primary.main,
                          borderWidth: "2px",
                        },
                      },
                    }}
                  />

                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="Adresse Email"
                    name="email"
                    autoComplete="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || googleLoading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: theme.palette.primary.main,
                          borderWidth: "2px",
                        },
                      },
                    }}
                  />

                  <TextField
                    required
                    fullWidth
                    name="password"
                    label="Mot de passe (min. 6 caractères)"
                    type={showPassword ? "text" : "password"}
                    id="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || googleLoading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={togglePasswordVisibility}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: theme.palette.primary.main,
                          borderWidth: "2px",
                        },
                      },
                    }}
                  />

                  <TextField
                    required
                    fullWidth
                    name="confirmPassword"
                    label="Confirmer le mot de passe"
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading || googleLoading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle confirm password visibility"
                            onClick={toggleConfirmPasswordVisibility}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: theme.palette.primary.main,
                          borderWidth: "2px",
                        },
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading || googleLoading}
                    startIcon={loading ? null : <StarsIcon />}
                    sx={{
                      py: 1.5,
                      borderRadius: 4,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.5)}`,
                      },
                      "&:disabled": {
                        background: alpha(theme.palette.action.disabled, 0.12),
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Créer mon compte"}
                  </Button>
                </Stack>
              </Box>

              {/* Login Link */}
              <Box sx={{ mt: 4, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Déjà un compte ?{" "}
                  <Link
                    component={RouterLink}
                    to="/login"
                    sx={{
                      color: theme.palette.primary.main,
                      textDecoration: "none",
                      fontWeight: 600,
                      "&:hover": {
                        textDecoration: "underline",
                      },
                    }}
                  >
                    Connectez-vous
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  )
}
