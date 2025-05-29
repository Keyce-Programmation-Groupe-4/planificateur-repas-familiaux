"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  useTheme,
  alpha,
  TextField,
} from "@mui/material"
import { LocalShipping, ArrowBack, CheckCircle } from "@mui/icons-material"
import { useAuth } from "../../contexts/AuthContext"
import { db } from "../../firebaseConfig"
import { doc, getDoc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"

function DeliveryTrackingPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { deliveryId } = useParams()
  const { currentUser, userData } = useAuth()
  const familyId = userData?.familyId

  const [deliveryData, setDeliveryData] = useState(null)
  const [vendorData, setVendorData] = useState(null)
  const [shoppingList, setShoppingList] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)

  useEffect(() => {
    if (!deliveryId) {
      setError("ID de livraison manquant.")
      setIsLoading(false)
      return
    }

    const deliveryRef = doc(db, "deliveryRequests", deliveryId)

    // Utiliser onSnapshot pour obtenir des mises à jour en temps réel
    const unsubscribe = onSnapshot(
      deliveryRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          setDeliveryData(data)

          // Vérifier que l'utilisateur a accès à cette livraison
          if (data.familyId !== familyId) {
            setError("Vous n'avez pas accès à cette livraison.")
            setIsLoading(false)
            return
          }

          try {
            // Charger les données du vendeur
            if (data.vendorId) {
              const vendorRef = doc(db, "vendors", data.vendorId)
              const vendorSnap = await getDoc(vendorRef)
              if (vendorSnap.exists()) {
                setVendorData(vendorSnap.data())
              }
            }

            // Charger la liste de courses
            if (data.shoppingListId) {
              const listRef = doc(db, "families", data.familyId, "shoppingLists", data.shoppingListId)
              const listSnap = await getDoc(listRef)
              if (listSnap.exists()) {
                setShoppingList(listSnap.data())
              }
            }

            setIsLoading(false)
          } catch (err) {
            console.error("Erreur lors du chargement des données associées:", err)
            setError("Erreur lors du chargement des données associées.")
            setIsLoading(false)
          }
        } else {
          setError("Livraison introuvable.")
          setIsLoading(false)
        }
      },
      (err) => {
        console.error("Erreur lors de l'écoute des mises à jour:", err)
        setError("Erreur lors de l'écoute des mises à jour.")
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [deliveryId, familyId])

  const getStepFromStatus = (status) => {
    switch (status) {
      case "pending":
        return 0
      case "accepted":
        return 1
      case "shopping":
        return 2
      case "delivering":
        return 3
      case "delivered":
        return 4
      case "cancelled":
        return -1
      default:
        return 0
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "En attente"
      case "accepted":
        return "Acceptée"
      case "shopping":
        return "Achats en cours"
      case "delivering":
        return "En livraison"
      case "delivered":
        return "Livrée"
      case "cancelled":
        return "Annulée"
      default:
        return status
    }
  }

  const handleCancelDelivery = async () => {
    if (!deliveryId || !deliveryData) return

    if (deliveryData.status !== "pending") {
      alert("Vous ne pouvez annuler que les livraisons en attente.")
      return
    }

    try {
      const deliveryRef = doc(db, "deliveryRequests", deliveryId)
      await updateDoc(deliveryRef, {
        status: "cancelled",
        statusHistory: [
          ...(deliveryData.statusHistory || []),
          {
            status: "cancelled",
            timestamp: serverTimestamp(),
            by: "customer",
          },
        ],
      })

      // La mise à jour sera reflétée via onSnapshot
    } catch (err) {
      console.error("Erreur lors de l'annulation:", err)
      alert("Erreur lors de l'annulation de la livraison.")
    }
  }

  const handleOpenRatingDialog = () => {
    if (deliveryData.status !== "delivered") {
      alert("Vous ne pouvez noter que les livraisons terminées.")
      return
    }
    setRatingDialogOpen(true)
  }

  const handleSubmitRating = async () => {
    if (!deliveryId || !deliveryData || !vendorData || rating === 0) return

    setIsSubmittingRating(true)

    try {
      // Ajouter l'évaluation
      const ratingData = {
        deliveryId,
        vendorId: deliveryData.vendorId,
        familyId: deliveryData.familyId,
        rating,
        comment,
        createdAt: serverTimestamp(),
      }

      await addDoc(collection(db, "vendorRatings"), ratingData)

      // Mettre à jour la livraison
      const deliveryRef = doc(db, "deliveryRequests", deliveryId)
      await updateDoc(deliveryRef, {
        hasRating: true,
        ratingValue: rating,
      })

      setRatingDialogOpen(false)
      alert("Merci pour votre évaluation !")
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'évaluation:", err)
      alert("Erreur lors de l'envoi de l'évaluation.")
    } finally {
      setIsSubmittingRating(false)
    }
  }

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement des informations de livraison...</Typography>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate("/deliveries")}>
          Retour à mes livraisons
        </Button>
      </Container>
    )
  }

  const activeStep = getStepFromStatus(deliveryData?.status)
  const isCancelled = deliveryData?.status === "cancelled"
  const isDelivered = deliveryData?.status === "delivered"

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <LocalShipping sx={{ mr: 2, color: theme.palette.secondary.main }} />
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Suivi de livraison
          </Typography>

          {isCancelled && <Chip label="Annulée" color="error" size="small" sx={{ ml: 2, borderRadius: 2 }} />}

          {isDelivered && (
            <Chip label="Livrée" color="success" icon={<CheckCircle />} size="small" sx={{ ml: 2, borderRadius: 2 }} />
          )}
        </Box>

        {!isCancelled && (
          <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }}>
            <Step>
              <StepLabel>Demande en attente</StepLabel>
              <StepContent>
                <Typography>Votre demande est en attente d'acceptation par un vendeur.</Typography>
              </StepContent>
            </Step>
            <Step>
              <StepLabel>Demande acceptée</StepLabel>
              <StepContent>
                <Typography>Un vendeur a accepté votre demande et se prépare à faire vos courses.</Typography>
              </StepContent>
            </Step>
            <Step>
              <StepLabel>Achats en cours</StepLabel>
              <StepContent>
                <Typography>Le vendeur est en train d'acheter vos produits au marché.</Typography>
              </StepContent>
            </Step>
            <Step>
              <StepLabel>En livraison</StepLabel>
              <StepContent>
                <Typography>Le vendeur est en route pour vous livrer vos courses.</Typography>
              </StepContent>
            </Step>
            <Step>
              <StepLabel>Livraison terminée</StepLabel>
              <StepContent>
                <Typography>Vos courses ont été livrées avec succès !</Typography>
              </StepContent>
            </Step>
          </Stepper>
        )}

        {/* Informations détaillées */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Détails de la livraison
          </Typography>

          <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Statut actuel
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{getStatusLabel(deliveryData?.status)}</Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Adresse de livraison
              </Typography>
              <Typography sx={{ textAlign: "right", maxWidth: "60%" }}>{deliveryData?.deliveryAddress}</Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Date et heure demandées
              </Typography>
              <Typography>
                {deliveryData?.requestedDate} à {deliveryData?.requestedTime}
              </Typography>
            </Box>

            {deliveryData?.deliveryInstructions && (
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Instructions
                </Typography>
                <Typography sx={{ textAlign: "right", maxWidth: "60%" }}>
                  {deliveryData.deliveryInstructions}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Informations vendeur */}
          {vendorData && (
            <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Votre vendeur
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Box sx={{ mr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {vendorData.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {vendorData.phone}
                  </Typography>
                </Box>
              </Box>

              {vendorData.rating && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    Note:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {vendorData.rating}/5 ({vendorData.totalRatings || 0} avis)
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          {/* Coûts */}
          <Paper sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Récapitulatif des coûts
            </Typography>

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="body2">Coût des courses</Typography>
              <Typography variant="body2">
                {(deliveryData?.totalCost || 0).toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "XAF",
                })}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="body2">Frais de livraison</Typography>
              <Typography variant="body2">
                {(deliveryData?.deliveryFee || 0).toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "XAF",
                })}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Total
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                {((deliveryData?.totalCost || 0) + (deliveryData?.deliveryFee || 0)).toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "XAF",
                })}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Actions */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate("/deliveries")} variant="outlined">
            Retour à mes livraisons
          </Button>

          {deliveryData?.status === "pending" && (
            <Button variant="outlined" color="error" onClick={handleCancelDelivery}>
              Annuler la livraison
            </Button>
          )}

          {isDelivered && !deliveryData?.hasRating && (
            <Button variant="contained" onClick={handleOpenRatingDialog}>
              Noter le vendeur
            </Button>
          )}
        </Box>
      </Paper>

      {/* Dialog pour noter le vendeur */}
      {ratingDialogOpen && (
        <Paper
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            p: 3,
            zIndex: 1300,
            minWidth: 300,
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Noter votre vendeur
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Note (1-5 étoiles)
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant={rating >= star ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setRating(star)}
                  sx={{ minWidth: 40 }}
                >
                  ★
                </Button>
              ))}
            </Box>
          </Box>

          <TextField
            fullWidth
            label="Commentaire (optionnel)"
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button onClick={() => setRatingDialogOpen(false)}>Annuler</Button>
            <Button variant="contained" onClick={handleSubmitRating} disabled={rating === 0 || isSubmittingRating}>
              {isSubmittingRating ? <CircularProgress size={20} /> : "Envoyer"}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Overlay pour le dialog */}
      {ratingDialogOpen && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0,0,0,0.5)",
            zIndex: 1200,
          }}
          onClick={() => setRatingDialogOpen(false)}
        />
      )}
    </Container>
  )
}

export default DeliveryTrackingPage
