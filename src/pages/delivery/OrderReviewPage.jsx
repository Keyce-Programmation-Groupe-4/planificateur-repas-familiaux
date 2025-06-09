import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
} from '@mui/material';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';

const OrderReviewPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth(); // Added userData

  const [orderDetails, setOrderDetails] = useState(null);
  // const [initialItems, setInitialItems] = useState([]); // To be removed if not needed after getCombinedItems refactor
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vendorName, setVendorName] = useState('Loading...');
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const getCombinedItems = () => {
    if (!orderDetails || !orderDetails.requestedItems) return [];
    const combined = new Map();
    const vendorItems = orderDetails.vendorConfirmedItems || [];

    // Process requested items from the orderDetails object
    (orderDetails.requestedItems || []).forEach(reqItem => {
      combined.set(reqItem.itemId, {
        itemId: reqItem.itemId,
        name: reqItem.name,
        originalQuantity: reqItem.quantity,
        originalUnit: reqItem.unit,
        originalEstimatedPrice: reqItem.originalEstimatedPrice,
        // Initialize vendor fields
        confirmedQuantity: '-',
        vendorPrice: '-',
        vendorItemNote: '-',
        availabilityStatus: 'pending_update', // Default if not in vendorItems
        isSubstituted: false,
      });
    });

    // Update with vendor-confirmed items
    vendorItems.forEach(vItem => {
      if (combined.has(vItem.itemId)) {
        const existing = combined.get(vItem.itemId);
        combined.set(vItem.itemId, {
          ...existing,
          name: vItem.name, // Vendor might change name on substitution
          confirmedQuantity: vItem.quantity,
          vendorPrice: vItem.vendorPrice,
          vendorItemNote: vItem.vendorItemNote || '-',
          availabilityStatus: vItem.availabilityStatus || 'unavailable',
          // Assuming isSubstituted might be a boolean flag on vItem or derived if name changes
          isSubstituted: existing.name.toLowerCase() !== vItem.name.toLowerCase() && vItem.availabilityStatus === 'substituted_by_vendor',
        });
      } else {
        // Item added by vendor (less common, but handle)
        combined.set(vItem.itemId, {
          itemId: vItem.itemId,
          name: vItem.name,
          originalQuantity: '-',
          originalUnit: '-',
          originalEstimatedPrice: '-', // No original estimate if purely vendor added
          confirmedQuantity: vItem.quantity,
          vendorPrice: vItem.vendorPrice,
          vendorItemNote: vItem.vendorItemNote || '-',
          availabilityStatus: vItem.availabilityStatus || 'available',
          isSubstituted: vItem.availabilityStatus === 'substituted_by_vendor',
        });
      }
    });
    return Array.from(combined.values());
  };


  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!currentUser || !userData?.familyId) { // Check for userData.familyId
        setError("You must be logged in and have a family ID to view this page.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const orderRef = doc(db, 'deliveryRequests', orderId);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
          const orderData = orderSnap.data();

          if (orderData.familyId !== userData.familyId) { // Authorization check
            setError("You are not authorized to view this order.");
            setOrderDetails(null);
            setLoading(false);
            return;
          }

          // Set order details first
          setOrderDetails({ id: orderSnap.id, ...orderData });

          if (orderData.status !== 'pending_user_acceptance') {
            setError(`This order is not awaiting your review (status: ${orderData.status.replace(/_/g, ' ')}). Actions will be disabled.`);
          }
          // Fetch vendor details (common for both cases if order exists)
          if (orderData.vendorId) {
            const vendorRef = doc(db, 'vendors', orderData.vendorId);
            const vendorSnap = await getDoc(vendorRef);
            if (vendorSnap.exists()) {
              setVendorName(vendorSnap.data().name || 'Unnamed Vendor');
            } else {
              setVendorName('Vendor not found');
            }
          } else {
            setVendorName('Vendor ID not specified');
          }
          // The initialItems state and its separate fetch can be removed
          // as requestedItems is now part of orderDetails and used by getCombinedItems.
        } else {
          setError('Order not found. It may have been deleted or the ID is incorrect.');
          setOrderDetails(null);
        }
      } catch (err) {
        console.error("Error fetching order details:", err);
        setError('Failed to fetch order details. Please try again later.');
        setOrderDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, currentUser, userData, navigate]); // Added userData to dependencies

  const handleAcceptOrder = async () => {
    if (!orderDetails || orderDetails.status !== 'pending_user_acceptance') {
      setError("This order cannot be accepted at this time.");
      return;
    }
    setAccepting(true);
    setError('');
    // FUTURE_ROBUSTNESS: Integrate payment processing before changing status to 'confirmed' or add a 'pending_payment' status.
    try {
      const orderRef = doc(db, 'deliveryRequests', orderId);
      const newStatus = 'confirmed'; // Updated status
      const newStatusHistoryEntry = {
        status: newStatus,
        timestamp: serverTimestamp(),
        changedBy: 'user',
        userId: currentUser.uid,
      };

      await updateDoc(orderRef, {
        status: 'confirmed', // Directly set to 'confirmed'
        finalAgreedItemTotalCost: orderDetails.vendorItemTotalCost, // New field
        finalAgreedTotalCost: orderDetails.vendorProposedTotalCost, // New field
        statusHistory: [...(orderDetails.statusHistory || []), newStatusHistoryEntry],
        updatedAt: serverTimestamp(),
      });

      setOrderDetails(prev => ({
        ...prev,
        status: 'confirmed',
        finalAgreedItemTotalCost: prev.vendorItemTotalCost,
        finalAgreedTotalCost: prev.vendorProposedTotalCost
      }));
      alert('Commande acceptée et confirmée ! Vous allez être redirigé vers le suivi.');
      // NOTIFICATION POINT
      // console.log(`NOTIFICATION_POINT: User accepted order adjustments. Notify vendor ${orderDetails.vendorId}. Order ID: ${orderId}`); // Keep if needed
      setError('');
      navigate(`/delivery/tracking/${orderId}`);
    } catch (err) {
      console.error("Erreur détaillée lors de l'acceptation de la commande:", err);
      setError("Impossible d'accepter la commande pour le moment. Veuillez réessayer. Si le problème persiste, contactez le support.");
    } finally {
      setAccepting(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!orderDetails || orderDetails.status !== 'pending_user_acceptance') {
      setError("This order cannot be rejected at this time.");
      return;
    }
    setRejecting(true);
    setError('');
    try {
      const orderRef = doc(db, 'deliveryRequests', orderId);
      const newStatus = 'cancelled_by_user'; // Updated status
      const newStatusHistoryEntry = {
        status: newStatus,
        timestamp: serverTimestamp(),
        changedBy: 'user',
        userId: currentUser.uid,
        reason: "User rejected vendor's proposed changes.",
      };
      await updateDoc(orderRef, {
        status: newStatus,
        statusHistory: [...(orderDetails.statusHistory || []), newStatusHistoryEntry],
        updatedAt: serverTimestamp(),
      });

      setOrderDetails(prev => ({ ...prev, status: newStatus }));
      alert('Commande rejetée et annulée. Vous allez être redirigé vers votre liste de livraisons.');
      // NOTIFICATION POINT
      console.log(`NOTIFICATION_POINT: User rejected order adjustments. Notify vendor ${orderDetails.vendorId}. Order ID: ${orderId}`);
      setError('');
      navigate('/deliveries'); // Navigate to a general deliveries list or dashboard
    } catch (err) {
      console.error("Erreur détaillée lors du rejet de la commande:", err);
      setError("Impossible de rejeter la commande pour le moment. Veuillez réessayer. Si le problème persiste, contactez le support.");
    } finally {
      setRejecting(false);
    }
  };

  const canPerformActions = orderDetails && orderDetails.status === 'pending_user_acceptance';

  if (loading && !orderDetails) { // Show main loading indicator only if no details yet
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>
      </Container>
    );
  }

  if (!orderDetails) {
    return (
      <Container>
        <Alert severity="info" sx={{ mt: 3 }}>No order details found. This might be because the order is not ready for review or does not exist.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Review Your Order
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Order ID: {orderId}
        </Typography>
        <Divider sx={{ my: 2 }} />

        {/* Placeholder for Order Details Display */}
        <Typography variant="h6" sx={{ mt: 2 }}>
          Vendor Name: {vendorName}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>
          Delivery Address: {orderDetails.deliveryAddress?.fullAddress || orderDetails.deliveryAddress || 'Not specified'}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>
          Your Total Estimated Cost: {(orderDetails.initialTotalEstimatedCost || 0).toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}
        </Typography>
        <Typography variant="body1" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>
          Vendor's Proposed Total Cost: {(orderDetails.vendorProposedTotalCost || 0).toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          Item Comparison
        </Typography>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Name</TableCell>
                <TableCell align="right">Your Qty</TableCell>
                <TableCell align="right">Vendor Qty</TableCell>
                <TableCell align="right">Votre Est. Ligne</TableCell>
                <TableCell align="right">Prix Vendeur Ligne</TableCell>
                <TableCell>Vendor Note</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getCombinedItems().length > 0 ? (
                getCombinedItems().map((item) => (
                  <TableRow key={item.itemId} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row">
                      {item.name}
                      {item.isSubstituted && <Chip label="Substituted" size="small" color="warning" sx={{ ml: 1 }} />}
                      {item.originalUnit && !item.isSubstituted && <Typography variant="caption" sx={{ ml: 0.5 }}>({item.originalUnit})</Typography>}
                       {item.isSubstituted && item.originalUnit && <Typography variant="caption" sx={{ ml: 0.5 }}>(was {item.originalUnit})</Typography>}
                    </TableCell>
                    <TableCell align="right">{item.originalQuantity}</TableCell>
                    <TableCell align="right">{item.confirmedQuantity}</TableCell>
                    <TableCell align="right">
                      {(Number(item.originalEstimatedPrice) || 0).toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}
                    </TableCell>
                    <TableCell align="right">
                      {typeof item.vendorPrice === 'number'
                        ? (item.vendorPrice).toLocaleString("fr-FR", { style: "currency", currency: "XAF" })
                        : item.vendorPrice}
                    </TableCell>
                    <TableCell>{item.vendorItemNote}</TableCell>
                    <TableCell>
                      {item.availabilityStatus === 'available' && <Chip label="Available" size="small" color="success" />}
                      {item.availabilityStatus === 'unavailable' && <Chip label="Unavailable" size="small" color="error" />}
                      {item.availabilityStatus === 'substituted_by_vendor' && <Chip label="Substituted" size="small" color="warning" />}
                      {item.availabilityStatus === 'pending_update' && <Chip label="Pending" size="small" />}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No item details available for comparison or vendor has not yet updated the order.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Vendor Overall Note */}
        {orderDetails.vendorOverallNote && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6">Vendor's Overall Note:</Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 1, backgroundColor: '#f9f9f9' }}>
              <Typography variant="body2">
                {orderDetails.vendorOverallNote}
              </Typography>
            </Paper>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={2} sx={{ mt: 3 }}>
          <Grid item xs={12} sm={6}>
            <Button
              variant="contained"
              color="success"
              fullWidth
              onClick={handleAcceptOrder}
              disabled={!canPerformActions || accepting || rejecting}
            >
              {accepting ? <CircularProgress size={24} color="inherit" /> : 'Accept Updated Order'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={handleRejectOrder}
              disabled={!canPerformActions || accepting || rejecting}
            >
              {rejecting ? <CircularProgress size={24} color="inherit" /> : 'Reject and Cancel Order'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default OrderReviewPage;
