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
  const { currentUser } = useAuth();

  const [orderDetails, setOrderDetails] = useState(null);
  const [initialItems, setInitialItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vendorName, setVendorName] = useState('Loading...');
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Helper function to combine initial and vendor-confirmed items
  const getCombinedItems = () => {
    if (!orderDetails) return [];

    const combined = new Map();
    const vendorItems = orderDetails.vendorConfirmedItems || [];

    // Process initial items
    initialItems.forEach(item => {
      combined.set(item.name.toLowerCase(), {
        name: item.name,
        originalQty: item.quantity,
        originalUnit: item.unit,
        // originalPrice: item.price, // Assuming initial items don't have price, or it needs to be calculated/fetched
        confirmedQty: '-',
        confirmedPrice: '-',
        vendorNote: '-',
        availability: 'N/A',
      });
    });

    // Process vendor-confirmed items and update/add to combined list
    vendorItems.forEach(vItem => {
      const key = vItem.name.toLowerCase();
      const existing = combined.get(key);
      if (existing) {
        combined.set(key, {
          ...existing,
          confirmedQty: vItem.quantity !== undefined ? vItem.quantity : (vItem.unavailable ? 0 : existing.originalQty),
          confirmedPrice: vItem.price !== undefined ? vItem.price : '-',
          vendorNote: vItem.notes || '-',
          availability: vItem.unavailable ? 'Unavailable' : (vItem.substituted ? `Substituted (was ${existing.name})` : 'Available'),
          name: vItem.substituted ? vItem.name : existing.name, // Use vendor name if substituted
        });
      } else {
        // Item added by vendor (e.g. substitution not matched by name)
        combined.set(key, {
          name: vItem.name,
          originalQty: '-',
          originalUnit: '-',
          confirmedQty: vItem.quantity !== undefined ? vItem.quantity : (vItem.unavailable ? 0 : '-'),
          confirmedPrice: vItem.price !== undefined ? vItem.price : '-',
          vendorNote: vItem.notes || '-',
          availability: vItem.unavailable ? 'Unavailable' : (vItem.substituted ? 'Substituted' : 'New Item'),
        });
      }
    });
    return Array.from(combined.values());
  };


  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!currentUser) {
        setError("You must be logged in to view this page.");
        setLoading(false);
        return;
      }

      // Initial loading set here, subsequent loading for actions will be separate
      setLoading(true);
      setError('');
      try {
        const orderRef = doc(db, 'deliveryRequests', orderId);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
          const orderData = orderSnap.data();
          console.log(orderData);
          console.log(currentUser);
          // if (orderData.userId !== currentUser.uid) {
          //   setError("You are not authorized to view this order.");
          //   setOrderDetails(null);
          // } else 
          if (orderData.status !== 'pending_user_acceptance') {
            // Allow viewing details even if not in pending_user_acceptance, but disable actions later
            setOrderDetails({ id: orderSnap.id, ...orderData });
            setError(`This order is not awaiting your review (status: ${orderData.status.replace(/_/g, ' ')}). Actions will be disabled.`);
            // Fetch vendor and item details anyway for viewing
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
            if (orderData.familyId && orderData.shoppingListId) {
              const listDocRef = doc(db, 'families', orderData.familyId, 'shoppingLists', orderData.shoppingListId);
              const listSnap = await getDoc(listDocRef);
              if (listSnap.exists()) setInitialItems(listSnap.data().items || []);
              else console.warn("Original shopping list not found for non-actionable order.");
            }

          } else {
            const fullOrderDetails = { id: orderSnap.id, ...orderData };
            setOrderDetails(fullOrderDetails);

            // Fetch vendor details
            if (fullOrderDetails.vendorId) {
              const vendorRef = doc(db, 'vendors', fullOrderDetails.vendorId);
              const vendorSnap = await getDoc(vendorRef);
              if (vendorSnap.exists()) {
                setVendorName(vendorSnap.data().name || 'Unnamed Vendor');
              } else {
                setVendorName('Vendor not found');
              }
            } else {
              setVendorName('Vendor ID not specified');
            }

            // Fetch initial shopping list items
            if (fullOrderDetails.familyId && fullOrderDetails.shoppingListId) {
              try {
                const listDocRef = doc(db, 'families', fullOrderDetails.familyId, 'shoppingLists', fullOrderDetails.shoppingListId);
                const listSnap = await getDoc(listDocRef);
                if (listSnap.exists()) {
                  setInitialItems(listSnap.data().items || []);
                } else {
                  console.warn("Original shopping list not found.");
                  setInitialItems([]); // Or handle as an error for the user
                }
              } catch (listError) {
                console.error("Error fetching initial shopping list:", listError);
                // setError("Could not load original shopping list items."); // Optional: depends on how critical this is
                setInitialItems([]);
              }
            } else {
              console.warn("Missing familyId or shoppingListId in order details.");
              setInitialItems([]);
            }
          }
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
  }, [orderId, currentUser, navigate]); // Removed initialItems from here, it's fetched inside

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
        status: newStatus,
        finalAgreedCost: orderDetails.vendorFinalCost,
        statusHistory: [...(orderDetails.statusHistory || []), newStatusHistoryEntry],
        updatedAt: serverTimestamp(),
      });

      setOrderDetails(prev => ({ ...prev, status: newStatus, finalAgreedCost: prev.vendorFinalCost }));
      alert('Commande acceptée et confirmée ! Vous allez être redirigé vers le suivi.');
      // NOTIFICATION POINT
      console.log(`NOTIFICATION_POINT: User accepted order adjustments. Notify vendor ${orderDetails.vendorId}. Order ID: ${orderId}`);
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
          Delivery Address: {orderDetails.deliveryAddress?.fullAddress || 'Not specified'}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>
          Original Estimated Cost: ${orderDetails.originalEstimatedCost?.toFixed(2) || 'N/A'}
        </Typography>
        <Typography variant="body1" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>
          Vendor's Final Proposed Cost: ${orderDetails.vendorFinalCost?.toFixed(2) || 'N/A'}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          Item Comparison
        </Typography>
        {/* Placeholder for Items Table */}
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Name</TableCell>
                <TableCell align="right">Original Qty</TableCell>
                <TableCell align="right">Confirmed Qty</TableCell>
                <TableCell align="right">Original Price</TableCell>
                <TableCell align="right">Confirmed Price</TableCell>
                <TableCell>Vendor Note</TableCell>
                <TableCell>Availability</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getCombinedItems().length > 0 ? (
                getCombinedItems().map((item, index) => (
                  <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row">
                      {item.name}
                      {item.originalUnit && <Typography variant="caption" sx={{ ml: 0.5 }}>({item.originalUnit})</Typography>}
                    </TableCell>
                    <TableCell align="right">{item.originalQty}</TableCell>
                    <TableCell align="right">
                      {item.confirmedQty}
                      {item.availability === 'Unavailable' && <Chip label="Unavailable" size="small" color="error" sx={{ ml: 1 }} />}
                      {item.availability === 'Substituted' && <Chip label="Substituted" size="small" color="warning" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell align="right">
                      {/* Assuming no individual original prices for now */}
                      N/A
                    </TableCell>
                    <TableCell align="right">
                      {typeof item.confirmedPrice === 'number' ? `$${item.confirmedPrice.toFixed(2)}` : item.confirmedPrice}
                    </TableCell>
                    <TableCell>{item.vendorNote}</TableCell>
                    <TableCell>
                      {item.availability === 'Available' && <Chip label="Available" size="small" color="success" />}
                      {/* Other statuses handled inline with quantity or as separate chips */}
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
