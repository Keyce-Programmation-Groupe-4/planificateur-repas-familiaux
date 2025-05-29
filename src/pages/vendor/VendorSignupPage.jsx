"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Stack,
  Divider,
  Avatar,
} from "@mui/material"
import {
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Store as StoreIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material"
import { db } from "../../firebaseConfig"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

const SPECIALTIES = [
  "Légumes",
  "Fruits",
  "Viandes",
  "Poissons",
  "Épices",
  "Céréales",
  "Légumineuses",
  "Produits laitiers",
  "Boulangerie",
  "Autre",
]

const DELIVERY_ZONES = [
  "Akwa",
  "Bonamoussadi",
  "Bonapriso",
  "Deido",
  "Makepe",
  "New Bell",
  "Bali",
  "Logpom",
  "Kotto",
  "Autre",
]

function VendorSignupPage() {
  const theme = useTheme()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    description: "",
    specialties: [],
    deliveryZones: [],
    baseFee: "",
    availability: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleInputChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }))
  }

  const handleMultiSelectChange = (field) => (event) => {
    const value = typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    // Validation
    if (!formData.name.trim()) {
      setError("Le nom est requis.")
      setIsSubmitting(false)
      return
    }

    if (!formData.phone.trim()) {
      setError("Le numéro de téléphone est requis.")
      setIsSubmitting(false)
      return
    }

    if (formData.specialties.length === 0) {
      setError("Veuillez sélectionner au moins une spécialité.")
      setIsSubmitting(false)
      return
    }

    if (formData.deliveryZones.length === 0) {
      setError("Veuillez sélectionner au moins une zone de livraison.")
      setIsSubmitting(false)
      return
    }

    const baseFee = Number.parseFloat(formData.baseFee)
    if (isNaN(baseFee) || baseFee < 0) {
      setError("Veuillez entrer des frais de livraison valides.")
      setIsSubmitting(false)
      return
    }

    try {
      const vendorData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        description: formData.description.trim() || null,
        specialties: formData.specialties,
        deliveryZones: formData.deliveryZones,
        baseFee: baseFee,
        availability: formData.availability.trim() || "Non spécifiée",
        // Status et ratings
        isActive: true, // Actif par défaut (peut être changé en false pour approbation)
        isApproved: true, // Approuvé par défaut (peut être changé en false pour validation admin)
        rating: 0,
        totalRatings: 0,
        // Métadonnées
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await addDoc(collection(db, "vendors"), vendorData)

      setSuccess(true)
      setTimeout(() => {
        navigate("/vendors")
      }, 2000)
    } catch (err) {
      console.error("Erreur lors de l'inscription du vendeur:", err)
      setError("Erreur lors de l'inscription. Veuillez réessayer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: "center" }}>
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
          }}
        >
          <Avatar
            sx={{
              width: 80,
              height: 80,
              mx: "auto",
              mb: 3,
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: theme.palette.success.dark }}>
            Inscription réussie !
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Votre profil de vendeur a été créé avec succès. Vous allez être redirigé vers la liste des vendeurs.
          </Typography>
          <CircularProgress color="success" />
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Avatar
          sx={{
            width: 80,
            height: 80,
            mx: "auto",
            mb: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          }}
        >
          <StoreIcon sx={{ fontSize: 40 }} />
        </Avatar>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
          Devenir Bayam Selam Partenaire
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Rejoignez notre réseau de vendeurs et livrez vos produits frais directement aux familles
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Informations personnelles */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: "flex", alignItems: "center" }}>
                <PersonIcon sx={{ mr: 1 }} />
                Informations personnelles
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nom complet *"
                value={formData.name}
                onChange={handleInputChange("name")}
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Numéro de téléphone *"
                value={formData.phone}
                onChange={handleInputChange("phone")}
                placeholder="+237 6XX XXX XXX"
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email (optionnel)"
                type="email"
                value={formData.email}
                onChange={handleInputChange("email")}
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description de votre activité"
                multiline
                rows={3}
                value={formData.description}
                onChange={handleInputChange("description")}
                placeholder="Décrivez brièvement votre activité, vos produits, votre expérience..."
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            {/* Spécialités et zones */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: "flex", alignItems: "center" }}>
                <StoreIcon sx={{ mr: 1 }} />
                Spécialités et zones de service
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Spécialités *</InputLabel>
                <Select
                  multiple
                  value={formData.specialties}
                  onChange={handleMultiSelectChange("specialties")}
                  input={<OutlinedInput label="Spécialités *" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  disabled={isSubmitting}
                >
                  {SPECIALTIES.map((specialty) => (
                    <MenuItem key={specialty} value={specialty}>
                      {specialty}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Zones de livraison *</InputLabel>
                <Select
                  multiple
                  value={formData.deliveryZones}
                  onChange={handleMultiSelectChange("deliveryZones")}
                  input={<OutlinedInput label="Zones de livraison *" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" color="secondary" />
                      ))}
                    </Box>
                  )}
                  disabled={isSubmitting}
                >
                  {DELIVERY_ZONES.map((zone) => (
                    <MenuItem key={zone} value={zone}>
                      {zone}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Frais de livraison (FCFA) *"
                type="number"
                value={formData.baseFee}
                onChange={handleInputChange("baseFee")}
                InputProps={{
                  startAdornment: <MoneyIcon sx={{ mr: 1, color: "text.secondary" }} />,
                }}
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Disponibilité"
                value={formData.availability}
                onChange={handleInputChange("availability")}
                placeholder="Ex: Lundi - Samedi, 8h - 18h"
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            {/* Boutons d'action */}
            <Grid item xs={12}>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="outlined"
                  onClick={() => navigate("/vendors")}
                  disabled={isSubmitting}
                  sx={{ minWidth: 120 }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{
                    minWidth: 120,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "S'inscrire"}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  )
}

export default VendorSignupPage
