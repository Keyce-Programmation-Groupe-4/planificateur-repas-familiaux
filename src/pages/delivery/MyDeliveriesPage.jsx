"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Container,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Grid,
} from "@mui/material"
import { LocalShipping, History, Cancel } from "@mui/icons-material"
import { useAuth } from "../../contexts/AuthContext"
import { db } from "../../firebaseConfig"
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore" // Added updateDoc, serverTimestamp
import DeliveryStatusCard from "../../components/delivery/DeliveryStatusCard"
import { DELIVERY_STATUSES } from "../../config/deliveryStatuses" // Added import
import { triggerSendNotification } from '../../../utils/notificationUtils';
import { getCurrentUserFCMToken } from '../../../utils/authUtils';

function MyDeliveriesPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { currentUser, userData } = useAuth()
  const familyId = userData?.familyId

  const [activeTab, setActiveTab] = useState(0)
  const [deliveries, setDeliveries] = useState([])
  const [vendors, setVendors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!familyId) {
      setError("Informations de famille manquantes.")
      setIsLoading(false)
      return
    }

    const deliveriesRef = collection(db, "deliveryRequests")
    const q = query(deliveriesRef, where("familyId", "==", familyId), orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        const deliveriesData = []
        const vendorIds = new Set()

        querySnapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() }
          deliveriesData.push(data)
          if (data.vendorId) {
            vendorIds.add(data.vendorId)
          }
        })

        setDeliveries(deliveriesData)

        // Charger les données des vendeurs
        const vendorsData = {}
        for (const vendorId of vendorIds) {
          try {
            const vendorRef = doc(db, "vendors", vendorId)
            const vendorSnap = await getDoc(vendorRef)
            if (vendorSnap.exists()) {
              vendorsData[vendorId] = vendorSnap.data()
            }
          } catch (err) {
            console.error(`Erreur lors du chargement du vendeur ${vendorId}:`, err)
          }
        }

        setVendors(vendorsData)
        setIsLoading(false)
      },
      (err) => {
        console.error("Erreur lors de l'écoute des livraisons:", err)
        setError("Erreur lors du chargement des livraisons.")
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [familyId])

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  const handleTrackDelivery = (deliveryId) => {
    navigate(`/delivery/tracking/${deliveryId}`)
  }

  const handleCancelDelivery = async (deliveryId) => {
    const deliveryToCancel = deliveries.find(d => d.id === deliveryId);
    if (!deliveryToCancel) {
      setError("Livraison non trouvée.");
      return;
    }

    // Check if the delivery can be cancelled by the user
    const cancellableStatuses = [
      DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key,
      DELIVERY_STATUSES.PENDING_USER_ACCEPTANCE.key,
      // Add other statuses if user can cancel at more stages, e.g., CONFIRMED before SHOPPING
    ];

    if (!cancellableStatuses.includes(deliveryToCancel.status)) {
      setError(`Vous ne pouvez pas annuler une livraison avec le statut: ${getDeliveryStatusByKey(deliveryToCancel.status)?.label || deliveryToCancel.status}.`);
      // Optionally use a snackbar here too for better UX
      // showSnackbar(`Annulation non permise pour le statut: ${getDeliveryStatusByKey(deliveryToCancel.status)?.label || deliveryToCancel.status}.`, "warning");
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir annuler la livraison #${deliveryId.substring(0,8)} ?`)) {
      return;
    }

    setIsLoading(true); // Use main isLoading or a specific one for this action
    setError('');
    try {
      const deliveryRef = doc(db, "deliveryRequests", deliveryId);
      await updateDoc(deliveryRef, {
        status: DELIVERY_STATUSES.CANCELLED_BY_USER.key,
        updatedAt: serverTimestamp(),
        statusHistory: [
          ...(deliveryToCancel.statusHistory || []),
          {
            status: DELIVERY_STATUSES.CANCELLED_BY_USER.key,
            timestamp: serverTimestamp(),
            changedBy: "user",
            userId: currentUser?.uid,
            reason: "Annulation par l'utilisateur depuis la page 'Mes Livraisons'",
          },
        ],
      });

      // No need to call fetchDeliveries() due to onSnapshot listener, it will update automatically.
      // setDeliveries(prev => prev.map(d => d.id === deliveryId ? {...d, status: DELIVERY_STATUSES.CANCELLED_BY_USER.key} : d)); // Optimistic update

      const successMsg = `Livraison #${deliveryId.substring(0,8)} annulée avec succès.`;
      // Replace alert with Snackbar if available, or use a state for success message
      alert(successMsg); // Placeholder, ideally use Snackbar
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Livraison Annulée",
          successMsg
        );
      }
      // NOTIFICATION_POINT: Notify vendor if needed
      if (deliveryToCancel.vendorId) {
        console.log(`NOTIFICATION_POINT: User cancelled delivery. Notify vendor ${deliveryToCancel.vendorId}. Delivery ID: ${deliveryId}`);
      }

    } catch (err) {
      console.error("Erreur lors de l'annulation de la livraison:", err);
      const errorMsg = `Échec de l'annulation de la livraison #${deliveryId.substring(0,8)}. ${err.message}`;
      setError(errorMsg); // Show error on page
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Échec de l'Annulation",
          errorMsg
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  const getFilteredDeliveries = () => {
    const activeStatuses = [
      DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key,
      DELIVERY_STATUSES.PENDING_USER_ACCEPTANCE.key,
      DELIVERY_STATUSES.CONFIRMED.key,
      DELIVERY_STATUSES.SHOPPING.key,
      DELIVERY_STATUSES.OUT_FOR_DELIVERY.key,
    ];
    const completedStatuses = [DELIVERY_STATUSES.DELIVERED.key];
    const cancelledStatuses = [
      DELIVERY_STATUSES.CANCELLED_BY_USER.key,
      DELIVERY_STATUSES.CANCELLED_BY_VENDOR.key,
      DELIVERY_STATUSES.CANCELLED.key,
    ];

    switch (activeTab) {
      case 0: // Actives
        return deliveries.filter((d) => activeStatuses.includes(d.status));
      case 1: // Terminées
        return deliveries.filter((d) => completedStatuses.includes(d.status));
      case 2: // Annulées
        return deliveries.filter((d) => cancelledStatuses.includes(d.status));
      default:
        return deliveries;
    }
  }

  const filteredDeliveries = getFilteredDeliveries() // Call it once

  // Calculate counts for tabs based on the same logic
  const activeCount = deliveries.filter(d =>
    [
      DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key,
      DELIVERY_STATUSES.PENDING_USER_ACCEPTANCE.key,
      DELIVERY_STATUSES.CONFIRMED.key,
      DELIVERY_STATUSES.SHOPPING.key,
      DELIVERY_STATUSES.OUT_FOR_DELIVERY.key,
    ].includes(d.status)
  ).length;

  const completedCount = deliveries.filter(d =>
    d.status === DELIVERY_STATUSES.DELIVERED.key
  ).length;

  const cancelledCount = deliveries.filter(d =>
    [
      DELIVERY_STATUSES.CANCELLED_BY_USER.key,
      DELIVERY_STATUSES.CANCELLED_BY_VENDOR.key,
      DELIVERY_STATUSES.CANCELLED.key,
    ].includes(d.status)
  ).length;


  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement de vos livraisons...</Typography>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: "bold", display: "flex", alignItems: "center" }}
        >
          <LocalShipping sx={{ mr: 1 }} />
          Mes Livraisons
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Suivez toutes vos demandes de livraison et leur statut.
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          overflow: "hidden",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
            },
          }}
        >
          <Tab
            icon={<LocalShipping />}
            label={`Actives (${activeCount})`}
            iconPosition="start"
          />
          <Tab
            icon={<History />}
            label={`Terminées (${completedCount})`}
            iconPosition="start"
          />
          <Tab
            icon={<Cancel />}
            label={`Annulées (${cancelledCount})`}
            iconPosition="start"
          />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {filteredDeliveries.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <LocalShipping sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {activeTab === 0 && "Aucune livraison active"}
                {activeTab === 1 && "Aucune livraison terminée"}
                {activeTab === 2 && "Aucune livraison annulée"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeTab === 0 && "Vos livraisons en cours apparaîtront ici."}
                {activeTab === 1 && "Vos livraisons terminées apparaîtront ici."}
                {activeTab === 2 && "Vos livraisons annulées apparaîtront ici."}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredDeliveries.map((delivery) => (
                <Grid item xs={12} md={6} lg={4} key={delivery.id}>
                  <DeliveryStatusCard
                    delivery={delivery}
                    vendor={vendors[delivery.vendorId]}
                    onTrack={() => handleTrackDelivery(delivery.id)}
                    onCancel={() => handleCancelDelivery(delivery.id)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Paper>
    </Container>
  )
}

export default MyDeliveriesPage
