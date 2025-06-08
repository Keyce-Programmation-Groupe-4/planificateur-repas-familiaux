"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
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
  TextField, // Already here
  Dialog,      // For rejection reason
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  // ListItemIcon, // Not used yet, but good for visual cues
  Divider,
  Grid, // For layout within acceptance section
  Stack, // For button layout
  // IconButton, // If using icon buttons for rating for example
} from "@mui/material"
import {
  LocalShipping,
  ArrowBack,
  CheckCircle,
  HourglassEmpty,
  ThumbUpAlt,
  ThumbDownAlt,
  Info,
  // ErrorOutline, // Alternative icon for errors
  PriceCheck,
  SpeakerNotes,
  ShoppingCartCheckout,
  Cancel,
  AssignmentTurnedIn,
  Storefront,
  ReceiptLong, // New icon for header
} from "@mui/icons-material"
import { useAuth } from "../../contexts/AuthContext"
import { db } from "../../firebaseConfig"
import { doc, getDoc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { DELIVERY_STATUSES, getDeliveryStatusByKey } from "../../config/deliveryStatuses" // Added import

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

  // States for user confirmation flow
  const [userRejectionReason, setUserRejectionReason] = useState("")
  const [rejectConfirmDialogOpen, setRejectConfirmDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false) // For disabling buttons during Firestore updates

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

  const getStepFromStatus = (statusKey) => {
    const statusObj = getDeliveryStatusByKey(statusKey);
    return statusObj ? statusObj.step : 0; // Default to first step if status is unknown or not in active flow
  }

  const getStatusLabel = (statusKey) => {
    const statusObj = getDeliveryStatusByKey(statusKey);
    return statusObj ? (statusObj.userLabel || statusObj.label) : statusKey; // Show raw status key if not mapped
  }

  // Generic function to update delivery status and history
  const updateDeliveryStatus = async (newStatusKey, extraData = {}) => { // newStatusKey is a string like "confirmed"
    if (!deliveryId || !deliveryData) return false;
    setActionLoading(true); // Disable buttons
    setError(null); // Clear previous errors
    try {
      const deliveryRef = doc(db, "deliveryRequests", deliveryId);
      await updateDoc(deliveryRef, {
        status: newStatusKey, // Ensure this is the key string
        statusHistory: [
          ...(deliveryData.statusHistory || []),
          { status: newStatusKey, timestamp: serverTimestamp(), changedBy: "user" }, // Assume 'user' for actions from this page
        ],
        ...extraData, // For things like rejection reasons or final costs
        updatedAt: serverTimestamp(),
      });
      // Data will refresh via onSnapshot, no need to setDeliveryData here
      return true;
    } catch (err) {
      console.error(`Erreur lors de la mise à jour du statut à ${newStatusKey}:`, err);
      setError(`Erreur lors de la mise à jour: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false); // Re-enable buttons
    }
  };

  const handleAcceptConfirmation = async () => {
    await updateDeliveryStatus(DELIVERY_STATUSES.CONFIRMED.key);
  };

  const handleOpenRejectConfirmationDialog = () => {
    setUserRejectionReason(""); // Clear previous reason before opening dialog
    setRejectConfirmDialogOpen(true);
  };

  const handleRejectConfirmation = async () => {
    if (!userRejectionReason.trim()) {
        setError("La raison du rejet est obligatoire.");
        return;
    }
    const success = await updateDeliveryStatus(DELIVERY_STATUSES.CANCELLED_BY_USER.key, {
      userRejectionReason: userRejectionReason.trim(),
    });
    if (success) {
      setRejectConfirmDialogOpen(false); // Close dialog on successful rejection
    }
  };

  const handleCancelDeliveryBeforeVendorConfirmation = async () => {
    if (!deliveryId || !deliveryData) return;

    if (deliveryData.status !== DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key) {
      alert("Vous ne pouvez annuler que les demandes qui n'ont pas encore été traitées par le vendeur.");
      return;
    }
    await updateDeliveryStatus(DELIVERY_STATUSES.CANCELLED_BY_USER.key);
  }


  const handleOpenRatingDialog = () => {
    if (deliveryData.status !== DELIVERY_STATUSES.DELIVERED.key) {
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
  const currentStatusKey = deliveryData?.status;
  const isTerminalStatus = currentStatusKey === DELIVERY_STATUSES.DELIVERED.key ||
                           currentStatusKey === DELIVERY_STATUSES.CANCELLED_BY_USER.key ||
                           currentStatusKey === DELIVERY_STATUSES.CANCELLED_BY_VENDOR.key ||
                           currentStatusKey === DELIVERY_STATUSES.CANCELLED.key;

  const canCancelBeforeVendorAction = currentStatusKey === DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key;

  // Cost related variables
  // Use finalAgreedCost if available (after user acceptance), then vendorFinalCost, then initial.
  let costToDisplay = deliveryData?.initialOrderCost || 0;
  let costLabel = "Coût estimé des courses";
  if (deliveryData?.finalAgreedCost !== undefined) {
    costToDisplay = deliveryData.finalAgreedCost - (deliveryData.deliveryFee || 0);
    costLabel = "Coût final convenu des courses";
  } else if (deliveryData?.vendorFinalCost !== undefined) {
    costToDisplay = deliveryData.vendorFinalCost - (deliveryData.deliveryFee || 0);
    costLabel = "Coût proposé par le vendeur";
  }

  const totalOrderCost = (costToDisplay || 0) + (deliveryData?.deliveryFee || 0);

  const sortedStatusHistory = deliveryData?.statusHistory
    ? [...deliveryData.statusHistory].sort((a, b) => {
        const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return aTime - bTime; // Sorts oldest to newest
      })
    : [];

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Date inconnue";
    // Firestore Timestamps need to be converted to JS Date objects
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("fr-FR", {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 }, // Responsive padding
          borderRadius: 4,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <ReceiptLong sx={{ mr: 2, color: theme.palette.secondary.main, fontSize: '2.5rem' }} />
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Suivi de Commande
          </Typography>

          {currentStatusKey && getDeliveryStatusByKey(currentStatusKey)?.key.startsWith("cancelled") && (
            <Chip label={getStatusLabel(currentStatusKey)} color={getDeliveryStatusByKey(currentStatusKey)?.color || "error"} size="small" sx={{ ml: 2, borderRadius: 2 }} />
          )}
          {currentStatusKey === DELIVERY_STATUSES.DELIVERED.key && (
            <Chip label={DELIVERY_STATUSES.DELIVERED.userLabel} color={DELIVERY_STATUSES.DELIVERED.color} icon={<CheckCircle />} size="small" sx={{ ml: 2, borderRadius: 2 }} />
          )}
           {currentStatusKey === DELIVERY_STATUSES.CONFIRMED.key && (
            <Chip label={DELIVERY_STATUSES.CONFIRMED.userLabel} color={DELIVERY_STATUSES.CONFIRMED.color} icon={<AssignmentTurnedIn />} size="small" sx={{ ml: 2, borderRadius: 2 }} />
          )}
        </Box>

        {/* Stepper: Hide if status is terminal (cancelled or delivered) */}
        {!isTerminalStatus && (
          <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }}>
            <Step>
              <StepLabel icon={<HourglassEmpty />}>{DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.userLabel}</StepLabel>
              <StepContent>
                <Typography>Le vendeur examine votre demande et confirmera la disponibilité et les prix des articles.</Typography>
              </StepContent>
            </Step>
            <Step>
              <StepLabel icon={<PriceCheck />}>{DELIVERY_STATUSES.PENDING_USER_ACCEPTANCE.userLabel}</StepLabel>
              <StepContent>
                <Typography>Le vendeur a mis à jour les articles. Veuillez vérifier les détails ci-dessous et accepter ou rejeter la proposition.</Typography>
              </StepContent>
            </Step>
             <Step>
              <StepLabel icon={<AssignmentTurnedIn />}>{DELIVERY_STATUSES.CONFIRMED.userLabel}</StepLabel>
              <StepContent>
                <Typography>Vous avez accepté la proposition. Le vendeur va commencer à préparer votre commande.</Typography>
              </StepContent>
            </Step>
            <Step>
              <StepLabel icon={<ShoppingCartCheckout />}>{DELIVERY_STATUSES.SHOPPING.userLabel}</StepLabel>
              <StepContent>
                <Typography>Le vendeur est en train d'acheter vos produits.</Typography>
              </StepContent>
            </Step>
            <Step>
              <StepLabel icon={<LocalShipping />}>{DELIVERY_STATUSES.OUT_FOR_DELIVERY.userLabel}</StepLabel>
              <StepContent>
                <Typography>Votre commande est en route.</Typography>
              </StepContent>
            </Step>
            <Step>
              <StepLabel icon={<CheckCircle />}>{DELIVERY_STATUSES.DELIVERED.userLabel}</StepLabel>
              <StepContent>
                <Typography>Vos courses ont été livrées !</Typography>
              </StepContent>
            </Step>
          </Stepper>
        )}

        {/* Section for User Acceptance */}
        {currentStatusKey === DELIVERY_STATUSES.PENDING_USER_ACCEPTANCE.key && (
          <Paper elevation={2} sx={{ p: {xs:2, sm:3}, my:3, borderRadius:3, border: `1px solid ${theme.palette.info.main}`, background: alpha(theme.palette.info.light, 0.05) }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', color: theme.palette.info.dark }}>
              <Info sx={{mr:1}}/> Action Requise
            </Typography>
            <Typography variant="body1" sx={{mb:2}}>
              Le vendeur a mis à jour votre commande avec les prix finaux et la disponibilité des articles.
              Veuillez examiner ces modifications avant de confirmer.
            </Typography>

            {deliveryData.vendorOverallNote && (
                <Alert severity="info" icon={<SpeakerNotes />} sx={{ my: 2, borderRadius: 2, background: alpha(theme.palette.info.main, 0.1) }}>
                    <strong>Note globale du vendeur:</strong> {deliveryData.vendorOverallNote}
                </Alert>
            )}
             <Typography variant="body1" sx={{my:2}}>
              Coût final proposé par le vendeur : <strong>{(deliveryData.vendorFinalCost || 0).toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}</strong>
              {deliveryData.deliveryFee && ` (incluant ${deliveryData.deliveryFee.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })} de frais de livraison)`}.
            </Typography>

            <Button
              component={Link}
              to={`/delivery/review/${deliveryId}`}
              variant="contained"
              color="primary"
              fullWidth
              sx={{ my: 2, py: 1.5, fontWeight: 'bold' }}
            >
              Examiner et Confirmer la Commande
            </Button>
            <Typography variant="caption" display="block" sx={{textAlign: 'center'}}>
              Vous serez redirigé vers une page pour voir la comparaison détaillée des articles.
            </Typography>
          </Paper>
        )}


        {/* Informations détaillées */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Détails de la Commande
          </Typography>

          <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Statut actuel
              </Typography>
              <Typography sx={{ fontWeight: 600, color: getDeliveryStatusByKey(currentStatusKey)?.color ? theme.palette[getDeliveryStatusByKey(currentStatusKey)?.color]?.main || theme.palette.text.primary : theme.palette.text.primary }}>
                {getStatusLabel(currentStatusKey)}
              </Typography>
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
            {deliveryData?.userRejectionReason && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, mt:1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Votre raison d'annulation/rejet:</Typography>
                    <Typography sx={{ textAlign: "right", maxWidth: "60%", color: theme.palette.error.dark, fontStyle:'italic' }}>{deliveryData.userRejectionReason}</Typography>
                </Box>
            )}
            {deliveryData?.vendorRejectionReason && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, mt:1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Raison d'annulation du vendeur:</Typography>
                    <Typography sx={{ textAlign: "right", maxWidth: "60%", color: theme.palette.error.dark, fontStyle:'italic' }}>{deliveryData.vendorRejectionReason}</Typography>
                </Box>
            )}
          </Paper>

          {/* Informations vendeur */}
          {vendorData && (
            <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                <Storefront sx={{mr:1, color: theme.palette.secondary.dark}}/> Votre Vendeur
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{vendorData.name}</Typography>
              <Typography variant="body2" color="text.secondary">{vendorData.phone}</Typography>
              {/* Future: Add vendor rating here more prominently if available */}
            </Paper>
          )}

          {/* Coûts */}
          <Paper sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Récapitulatif des Coûts
            </Typography>

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="body2">{costLabel}</Typography>
              <Typography variant="body2">
                {(costToDisplay || 0).toLocaleString("fr-FR", {
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
                Total à Payer
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                {totalOrderCost.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "XAF",
                })}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-start" sx={{mt:3, flexWrap:"wrap"}}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate(userData?.roles?.includes('vendor') ? "/vendor/dashboard" : "/deliveries")} variant="outlined">
            Retour
          </Button>

          {canCancelBeforeVendorAction && (
            <Button variant="outlined" color="error" startIcon={<Cancel/>} onClick={handleCancelDeliveryBeforeVendorConfirmation} disabled={actionLoading}>
              Annuler la Demande
            </Button>
          )}

          {currentStatusKey === DELIVERY_STATUSES.DELIVERED.key && !deliveryData?.hasRating && (
            <Button variant="contained" onClick={handleOpenRatingDialog}>
              Noter le vendeur
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Status History Section */}
      {sortedStatusHistory.length > 0 && (
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mt: 3, borderRadius: 4, background: alpha(theme.palette.background.default, 0.5), border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Historique des Statuts
          </Typography>
          <List dense>
            {sortedStatusHistory.map((entry, index) => (
              <ListItem key={index} divider={index < sortedStatusHistory.length - 1} sx={{py:1.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                <Box sx={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center'}}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium', textTransform: 'capitalize' }}>
                    {getStatusLabel(entry.status)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTimestamp(entry.timestamp)}
                  </Typography>
                </Box>
                <Box sx={{width: '100%'}}>
                  {entry.changedBy && (
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                      Par: {entry.changedBy === 'user' ? (currentUser?.uid === entry.userId ? 'Vous' : 'Utilisateur') : (entry.changedBy === 'vendor' ? 'Vendeur' : entry.changedBy)}
                    </Typography>
                  )}
                  {entry.status === "cancelled_by_vendor" && deliveryData?.vendorRejectionReason && (
                     <Typography variant="caption" color="error.main" sx={{ fontStyle: 'italic' }}>Raison: {deliveryData.vendorRejectionReason}</Typography>
                  )}
                  {entry.status === "cancelled_by_user" && entry.reason && (
                     <Typography variant="caption" color="error.main" sx={{ fontStyle: 'italic' }}>Raison: {entry.reason}</Typography>
                  )}
                   {entry.status === "user_rejected_changes" && entry.reason && ( // For older entries if this status was used
                     <Typography variant="caption" color="error.main" sx={{ fontStyle: 'italic' }}>Raison: {entry.reason}</Typography>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* User Rejection Confirmation Dialog */}
      <Dialog open={rejectConfirmDialogOpen} onClose={() => {if(!actionLoading) setRejectConfirmDialogOpen(false)}}>
        <DialogTitle>Rejeter la Confirmation du Vendeur</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{mb:2}}>
            Si vous rejetez, la commande sera annulée. Veuillez indiquer la raison de votre rejet.
            Cela aidera le vendeur à comprendre votre décision.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="userRejectionReason"
            label="Raison du rejet (obligatoire)"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={userRejectionReason}
            onChange={(e) => setUserRejectionReason(e.target.value)}
            // Basic error display for empty reason
            error={actionLoading && !userRejectionReason.trim()}
            helperText={actionLoading && !userRejectionReason.trim() ? "La raison est requise pour rejeter." : ""}
          />
        </DialogContent>
        <DialogActions sx={{p: {xs:2, sm:3}}}>
          <Button onClick={() => setRejectConfirmDialogOpen(false)} color="secondary" disabled={actionLoading}>Annuler</Button>
          <Button
            onClick={handleRejectConfirmation}
            color="error"
            variant="contained"
            disabled={actionLoading || !userRejectionReason.trim()} // Disable if no reason or loading
            startIcon={<ThumbDownAlt/>}
          >
            {actionLoading ? <CircularProgress size={24} color="inherit"/> : "Rejeter et Annuler la Commande"}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Rating Dialog (existing) - converted to MUI Dialog for consistency */}
      {ratingDialogOpen && (
         <Dialog open={ratingDialogOpen} onClose={() => setRatingDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Noter votre vendeur</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <IconButton key={star} onClick={() => setRating(star)}
                  sx={{fontSize: '2rem', color: rating >= star ? theme.palette.warning.main : theme.palette.grey[400] }} // Star look
                >
                   ★
                </IconButton>
              ))}
            </Box>
            <TextField
              fullWidth
              label="Commentaire (optionnel)"
              multiline
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              variant="outlined"
            />
          </DialogContent>
          <DialogActions sx={{p: {xs:2, sm:3}}}>
            <Button onClick={() => setRatingDialogOpen(false)}>Annuler</Button>
            <Button variant="contained" onClick={handleSubmitRating} disabled={rating === 0 || isSubmittingRating}>
              {isSubmittingRating ? <CircularProgress size={24} /> : "Envoyer"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  )
}

export default DeliveryTrackingPage
