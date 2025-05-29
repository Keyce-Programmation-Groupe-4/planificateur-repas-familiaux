"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Card,
  CardContent,
  Rating,
} from "@mui/material"
import { ArrowBack, Phone, Email, LocationOn, Star, LocalShipping, Schedule, Person } from "@mui/icons-material"
import { useAuth } from "../../contexts/AuthContext"
import { db } from "../../firebaseConfig"
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"

function VendorProfilePage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { vendorId } = useParams()
  const { currentUser, userData } = useAuth()

  const [vendor, setVendor] = useState(null)
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!vendorId) {
      setError("ID du vendeur manquant.")
      setIsLoading(false)
      return
    }

    fetchVendorData()
  }, [vendorId])

  const fetchVendorData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Charger les données du vendeur
      const vendorRef = doc(db, "vendors", vendorId)
      const vendorSnap = await getDoc(vendorRef)

      if (!vendorSnap.exists()) {
        setError("Vendeur introuvable.")
        setIsLoading(false)
        return
      }

      setVendor({ id: vendorSnap.id, ...vendorSnap.data() })

      // Charger les avis récents
      const reviewsRef = collection(db, "vendorRatings")
      const reviewsQuery = query(reviewsRef, where("vendorId", "==", vendorId), orderBy("createdAt", "desc"), limit(10))

      const reviewsSnap = await getDocs(reviewsQuery)
      const reviewsData = []
      reviewsSnap.forEach((doc) => {
        reviewsData.push({ id: doc.id, ...doc.data() })
      })

      setReviews(reviewsData)
    } catch (err) {
      console.error("Erreur lors du chargement du vendeur:", err)
      setError("Erreur lors du chargement des données du vendeur.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestDelivery = () => {
    // Stocker l'ID du vendeur sélectionné et rediriger vers la demande de livraison
    sessionStorage.setItem("selectedVendorId", vendorId)
    navigate("/delivery/request")
  }

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement du profil du vendeur...</Typography>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate("/vendors")}>
          Retour aux vendeurs
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* En-tête avec bouton retour */}
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate("/vendors")} sx={{ mb: 2 }}>
          Retour aux vendeurs
        </Button>
      </Box>

      {/* Profil principal */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 3,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              src={vendor?.photoURL}
              sx={{
                width: 100,
                height: 100,
                border: `3px solid ${theme.palette.primary.main}`,
              }}
            >
              <Person sx={{ fontSize: 50 }} />
            </Avatar>
          </Grid>

          <Grid item xs>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
              {vendor?.name}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Rating value={vendor?.rating || 0} readOnly precision={0.1} />
              <Typography variant="body2" sx={{ ml: 1 }}>
                {vendor?.rating?.toFixed(1) || "0.0"} ({vendor?.totalRatings || 0} avis)
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
              {vendor?.specialties?.map((specialty) => (
                <Chip key={specialty} label={specialty} size="small" color="primary" variant="outlined" />
              ))}
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={<LocalShipping />}
              onClick={handleRequestDelivery}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                boxShadow: `0 4px 20px ${alpha(theme.palette.secondary.main, 0.3)}`,
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: `0 6px 25px ${alpha(theme.palette.secondary.main, 0.4)}`,
                },
                transition: "all 0.3s ease",
              }}
            >
              Demander une livraison
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Informations détaillées */}
      <Grid container spacing={3}>
        {/* Contact et disponibilité */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              height: "100%",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Contact & Disponibilité
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Phone sx={{ mr: 2, color: "text.secondary" }} />
              <Typography>{vendor?.phone}</Typography>
            </Box>

            {vendor?.email && (
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Email sx={{ mr: 2, color: "text.secondary" }} />
                <Typography>{vendor.email}</Typography>
              </Box>
            )}

            <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
              <Schedule sx={{ mr: 2, color: "text.secondary", mt: 0.5 }} />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Disponibilité
                </Typography>
                <Typography>{vendor?.availability || "Non spécifiée"}</Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "flex-start" }}>
              <LocalShipping sx={{ mr: 2, color: "text.secondary", mt: 0.5 }} />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Frais de livraison
                </Typography>
                <Typography sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                  {vendor?.baseFee?.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "XAF",
                  }) || "Non défini"}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Zones de livraison */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              height: "100%",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Zones de livraison
            </Typography>

            <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
              <LocationOn sx={{ mr: 2, color: "text.secondary", mt: 0.5 }} />
              <Box sx={{ flex: 1 }}>
                {vendor?.deliveryZones?.length > 0 ? (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {vendor.deliveryZones.map((zone) => (
                      <Chip key={zone} label={zone} size="small" variant="outlined" color="secondary" />
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary">Zones non spécifiées</Typography>
                )}
              </Box>
            </Box>

            {vendor?.description && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Description
                </Typography>
                <Typography variant="body2">{vendor.description}</Typography>
              </>
            )}
          </Paper>
        </Grid>

        {/* Avis récents */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Avis récents ({reviews.length})
            </Typography>

            {reviews.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Star sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
                <Typography color="text.secondary">Aucun avis pour le moment</Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {reviews.map((review) => (
                  <Card
                    key={review.id}
                    elevation={0}
                    sx={{
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      borderRadius: 2,
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Rating value={review.rating} readOnly size="small" />
                        <Typography variant="body2" sx={{ ml: 1, color: "text.secondary" }}>
                          {review.createdAt?.toDate?.()?.toLocaleDateString() || "Date inconnue"}
                        </Typography>
                      </Box>
                      {review.comment && <Typography variant="body2">{review.comment}</Typography>}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}

export default VendorProfilePage
