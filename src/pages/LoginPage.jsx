"use client"

import { useState } from "react"
import { useNavigate, Link as RouterLink, useLocation } from "react-router-dom"
import { auth, db } from "../firebaseConfig"
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
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
  Grid,
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
  LockOutlined as LockOutlinedIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Google as GoogleIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Login as LoginIcon,
} from "@mui/icons-material"
import CinematiqueLottie from "../components/CinematiqueLottie";

export default function LoginPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || "/"
  const [showAnimation, setShowAnimation] = useState(true)

  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // UI state
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleAnimationEnd = () => {
    setShowAnimation(false)
  }

  const createUserDocumentIfNeeded = async (user) => {
    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
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
      })
    }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !password.trim()) {
      return setError("Veuillez remplir tous les champs.")
    }

    setLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      await createUserDocumentIfNeeded(user)

      // Vendor redirection logic
      const vendorDocRef = doc(db, "vendors", user.uid)
      const vendorDocSnap = await getDoc(vendorDocRef)

      if (vendorDocSnap.exists()) {
        const vendorData = vendorDocSnap.data()
        if (vendorData.isApproved === true && vendorData.isActive === true) {
          navigate("/vendor/dashboard", { replace: true })
          setLoading(false)
          return
        } else {
          navigate("/vendor/pending-approval", { replace: true })
          setLoading(false)
          return
        }
      }

      navigate(from, { replace: true })
    } catch (err) {
      console.error("Login Error:", err)
      if (err.code === "auth/user-not-found") {
        setError("Aucun compte trouvé avec cette adresse email.")
      } else if (err.code === "auth/wrong-password") {
        setError("Mot de passe incorrect.")
      } else if (err.code === "auth/invalid-email") {
        setError("Adresse email invalide.")
      } else if (err.code === "auth/too-many-requests") {
        setError("Trop de tentatives. Veuillez réessayer plus tard.")
      } else {
        setError("Échec de la connexion. Vérifiez vos identifiants.")
      }
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError("")
    setGoogleLoading(true)
    const provider = new GoogleAuthProvider()

    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      await createUserDocumentIfNeeded(user)

      // Vendor redirection logic
      const vendorDocRef = doc(db, "vendors", user.uid)
      const vendorDocSnap = await getDoc(vendorDocRef)

      if (vendorDocSnap.exists()) {
        const vendorData = vendorDocSnap.data()
        if (vendorData.isApproved === true && vendorData.isActive === true) {
          navigate("/vendor/dashboard", { replace: true })
          setGoogleLoading(false)
          return
        } else {
          navigate("/vendor/pending-approval", { replace: true })
          setGoogleLoading(false)
          return
        }
      }

      navigate(from, { replace: true })
    } catch (err) {
      console.error("Google Login Error:", err)
      if (err.code === "auth/popup-closed-by-user") {
        setError("Connexion annulée.")
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setError("Un compte existe déjà avec cette adresse email.")
      } else {
        setError("Échec de la connexion avec Google.")
      }
      setGoogleLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <>
      {showAnimation && <CinematiqueLottie onEnd={handleAnimationEnd} duration={3500} />}
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
        <Box
          sx={{
            position: "absolute",
            top: -100,
            left: -100,
            width: 400,
            height: 400,
            background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 70%)`,
            borderRadius: "50%",
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -150,
            right: -150,
            width: 500,
            height: 500,
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`,
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
                      background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 100%)`,
                      fontSize: "2rem",
                    }}
                  >
                    <LockOutlinedIcon sx={{ fontSize: "2rem" }} />
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
                  Bon retour !
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Connectez-vous à votre compte
                </Typography>
              </Box>

              <Box sx={{ p: 4 }}>
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

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleLogin}
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

                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Divider sx={{ flexGrow: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                    ou
                  </Typography>
                  <Divider sx={{ flexGrow: 1 }} />
                </Box>

                <Box component="form" onSubmit={handleEmailLogin} noValidate>
                  <Stack spacing={3}>
                    <TextField
                      required
                      fullWidth
                      id="email"
                      label="Adresse Email"
                      name="email"
                      autoComplete="email"
                      autoFocus
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
                      label="Mot de passe"
                      type={showPassword ? "text" : "password"}
                      id="password"
                      autoComplete="current-password"
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

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={loading || googleLoading}
                      startIcon={loading ? null : <LoginIcon />}
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
                      {loading ? <CircularProgress size={24} color="inherit" /> : "Se connecter"}
                    </Button>
                  </Stack>
                </Box>

                <Grid container sx={{ mt: 4 }}>
                  <Grid item xs>
                    <Typography variant="body2" color="text.secondary">
                      Mot de passe oublié ?
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Link
                      component={RouterLink}
                      to="/signup"
                      sx={{
                        color: theme.palette.primary.main,
                        textDecoration: "none",
                        fontWeight: 600,
                        "&:hover": {
                          textDecoration: "underline",
                        },
                      }}
                    >
                      Pas encore de compte ? Inscrivez-vous
                    </Link>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Fade>
        </Container>
      </Box>
    </>
  )
}