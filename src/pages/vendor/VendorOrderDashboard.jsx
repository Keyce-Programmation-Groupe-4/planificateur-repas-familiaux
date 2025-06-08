"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Checkbox,
  IconButton,
  Collapse,
  useTheme,
  alpha,
  Grid,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Tabs,     // For separating order types
  Tab,      // For separating order types
  Snackbar, // For feedback
  Alert as MuiAlert, // Renaming Alert to avoid conflict with Snackbar's Alert
} from "@mui/material"
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  CancelOutlined as CancelOutlinedIcon,
  ShoppingBasket as ShoppingBasketIcon,
  Receipt as ReceiptIcon,
  PersonPinCircle as PersonPinCircleIcon,
  CalendarToday as CalendarTodayIcon,
  Notes as NotesIcon,
  PlayCircleOutline as StartIcon,       // For "Start Shopping"
  LocalShippingOutlined as OutForDeliveryIcon, // For "Mark as Out for Delivery"
  TaskAltOutlined as DeliveredIcon,      // For "Mark as Delivered"
  HourglassTopOutlined as PendingIcon,
  Autorenew as InProgressIcon,
} from "@mui/icons-material"
import { db } from "../../firebaseConfig"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { useAuth } from "../../contexts/AuthContext" // Assuming AuthContext provides vendor info

// Placeholder for vendor data - replace with actual context/data fetching
// const currentVendor = {
//   id: "vendor123", // Replace with actual logged-in vendor ID
//   vendorType: "individual_shopper", // or "storefront"
//   name: "Test Vendor"
// };

function VendorOrderDashboard() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { currentUser, userData } = useAuth() // Use AuthContext

  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedRequest, setExpandedRequest] = useState(null) // For pending confirmation items
  const [actionLoading, setActionLoading] = useState({}) // Tracks loading state for individual order actions { [requestId]: boolean }

  // States for item-level changes (for pending_vendor_confirmation)
  const [itemChanges, setItemChanges] = useState({})
  const [overallNotes, setOverallNotes] = useState({})
  const [rejectionReason, setRejectionReason] = useState("")
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [currentRequestToReject, setCurrentRequestToReject] = useState(null)

  // Tab state for different order categories
  const [currentTab, setCurrentTab] = useState(0) // 0 for Pending Confirmation, 1 for Active Orders

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })

  const vendorId = userData?.uid
  const vendorType = userData?.vendorProfile?.vendorType

  const fetchRequests = async () => {
    if (!vendorId) {
      setIsLoading(false)
      setError("Profil vendeur non trouvé ou utilisateur non connecté.")
      return
    }
    setIsLoading(true)
    setError("")
    // FUTURE_ROBUSTNESS: Implement a more comprehensive vendor rating and reliability tracking system.
    try {
      const q = query(
        collection(db, "deliveryRequests"),
        where("vendorId", "==", vendorId),
        // Fetching a broader range of statuses
        where("status", "in", ["pending_vendor_confirmation", "confirmed", "shopping", "out_for_delivery"])
      )
      const querySnapshot = await getDocs(q)
      const fetchedRequests = []
      for (const dRequestDoc of querySnapshot.docs) {
        const requestData = dRequestDoc.data()
        let itemsToDisplay = []

        if (requestData.status === "pending_vendor_confirmation") {
          // For pending_vendor_confirmation, items are from the original shopping list
          // These are used by the vendor to make adjustments.
          itemsToDisplay = requestData.items || [] // This 'items' field should be populated from shopping list initially
          if (!itemsToDisplay || itemsToDisplay.length === 0) {
            // Fallback to fetch from shoppingList if not embedded (older structure or direct creation)
            const shoppingListRef = doc(db, "families", requestData.familyId, "shoppingLists", requestData.shoppingListId)
            const shoppingListSnap = await getDoc(shoppingListRef)
            if (shoppingListSnap.exists()) {
              itemsToDisplay = shoppingListSnap.data().items || []
            }
          }
        } else if (["confirmed", "shopping", "out_for_delivery"].includes(requestData.status)) {
          // For active orders (confirmed by user, shopping, out_for_delivery),
          // items displayed should be from vendorConfirmedItems.
          // These items reflect what the user agreed to, including prices.
          itemsToDisplay = requestData.vendorConfirmedItems || []
          // We need to ensure the structure of vendorConfirmedItems matches what the UI expects for 'items'.
          // For example, if the UI expects item.price, but vendorConfirmedItems has item.confirmedPrice.
          // The current `handleConfirmOrder` already creates `vendorConfirmedItems` with properties like:
          // itemId, name, quantity, unit, originalPrice, confirmedPrice, vendorNote, available.
          // Let's ensure the rest of the component (especially the display parts for active orders)
          // can handle this structure or adapt it.
          // For the "Active Orders" tab, item details are not directly displayed in the main table,
          // but if an expandable section or modal were added, this would be crucial.
          // For now, populating `items` with `vendorConfirmedItems` is the main step.
        }
        // Add the processed items array as 'items' to the request object
        fetchedRequests.push({ id: dRequestDoc.id, ...requestData, items: itemsToDisplay })
      }
      setRequests(fetchedRequests.sort((a,b) => (a.createdAt?.toDate() > b.createdAt?.toDate() ? -1 : 1)))
    } catch (err) {
      console.error("Erreur détaillée lors du chargement des demandes pour le dashboard vendeur:", err);
      setError("Impossible de charger les commandes pour le moment. Veuillez vérifier votre connexion et réessayer. Si le problème persiste, contactez le support.");
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [vendorId])

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleToggleExpand = (requestId) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId)
    if (expandedRequest !== requestId) {
      // Initialize item changes for the newly expanded request
      const request = requests.find(r => r.id === requestId);
      if (request && !itemChanges[requestId]) {
        const initialChanges = {};
        request.items.forEach(item => {
          initialChanges[item.id || item.name] = { // Assuming item has id or unique name
            available: true, // Default to available
            price: item.price, // Default to original price
            note: ""
          };
        });
        setItemChanges(prev => ({ ...prev, [requestId]: initialChanges }));
        setOverallNotes(prev => ({ ...prev, [requestId]: "" }));
      }
    }
  }

  const handleItemChange = (requestId, itemId, field, value) => {
    setItemChanges(prev => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        [itemId]: {
          ...prev[requestId][itemId],
          [field]: value
        }
      }
    }))
  }

  const handleOverallNoteChange = (requestId, value) => {
    setOverallNotes(prev => ({ ...prev, [requestId]: value }));
  }

  const handleOpenRejectDialog = (request) => {
    setCurrentRequestToReject(request);
    setRejectionReason(""); // Reset reason
    setRejectDialogOpen(true);
  };

  const handleCloseRejectDialog = () => {
    setRejectDialogOpen(false);
    setCurrentRequestToReject(null);
  };

  const handleConfirmOrder = async (request) => {
    setActionLoading(prevState => ({ ...prevState, [request.id]: true }));
    setError("") // Clear previous errors
    const currentItemChanges = itemChanges[request.id] || {}
    // Ensure request.items is an array before calling filter/map
    const itemsToProcess = Array.isArray(request.items) ? request.items : [];
    const confirmedItems = itemsToProcess
      .filter(item => currentItemChanges[item.id || item.name]?.available)
      .map(item => {
        const changes = currentItemChanges[item.id || item.name]
        return {
          itemId: item.id || item.name, // Ensure this ID is consistent and unique
          name: item.name,
          quantity: item.quantity,
          unit: item.unit || '',
          originalPrice: item.price,
          confirmedPrice: changes?.price !== undefined ? Number(changes.price) : Number(item.price),
          vendorNote: changes?.note || "",
          available: true,
        }
      })

    if (confirmedItems.length === 0) {
      setError("Vous devez confirmer au moins un article pour confirmer la commande.")
      setIsLoading(false)
      return
    }

    const finalOrderCost = confirmedItems.reduce((sum, item) => sum + (item.confirmedPrice * item.quantity), 0) + (request.deliveryFee || 0)

    try {
      const requestRef = doc(db, "deliveryRequests", request.id)
      await updateDoc(requestRef, {
        status: "pending_user_acceptance",
        vendorConfirmedItems: confirmedItems,
        finalOrderCost: finalOrderCost,
        vendorOverallNote: overallNotes[request.id] || "",
        statusHistory: [
          ...(request.statusHistory || []),
          { status: "pending_user_acceptance", timestamp: serverTimestamp(), changedBy: "vendor" }
        ],
        updatedAt: serverTimestamp(),
      })
      // setRequests(prev => prev.filter(r => r.id !== request.id)) // Optimistically remove or refetch
      fetchRequests(); // Refetch to get updated list
      showSnackbar("Commande confirmée et envoyée à l'utilisateur.", "success");
      // NOTIFICATION POINT
      console.log(`NOTIFICATION_POINT: Vendor confirmed/adjusted order. Notify user ${request.familyId}. Order ID: ${request.id}`);
    } catch (err) {
      console.error("Erreur détaillée lors de la confirmation de la commande par le vendeur:", err);
      const userMessage = `Erreur lors de la confirmation de la commande ${request.id.substring(0,4)}. Veuillez réessayer.`;
      setError(userMessage); // Display error in main error alert
      showSnackbar(userMessage, "error"); // Also show in snackbar for immediate feedback
    } finally {
      setActionLoading(prevState => ({ ...prevState, [request.id]: false }));
    }
  }

  const handleRejectOrder = async () => {
    if (!currentRequestToReject) return;
    setActionLoading(prevState => ({ ...prevState, [currentRequestToReject.id]: true }));
    setError("")

    try {
      const requestRef = doc(db, "deliveryRequests", currentRequestToReject.id);
      await updateDoc(requestRef, {
        status: "cancelled_by_vendor",
        vendorRejectionReason: rejectionReason.trim() || "Non spécifiée",
        statusHistory: [
          ...(currentRequestToReject.statusHistory || []),
          { status: "cancelled_by_vendor", timestamp: serverTimestamp(), changedBy: "vendor" }
        ],
        updatedAt: serverTimestamp(),
      });
      // setRequests(prev => prev.filter(r => r.id !== currentRequestToReject.id));
      fetchRequests(); // Refetch
      handleCloseRejectDialog();
      showSnackbar("Commande rejetée.", "info");
      // NOTIFICATION POINT
      console.log(`NOTIFICATION_POINT: Vendor rejected order. Notify user ${currentRequestToReject.familyId}. Order ID: ${currentRequestToReject.id}`);
    } catch (err) {
      console.error("Erreur détaillée lors du rejet de la commande par le vendeur:", err);
      const userMessage = `Erreur lors du rejet de la commande ${currentRequestToReject.id.substring(0,4)}. Veuillez réessayer.`;
      setError(userMessage);
      showSnackbar(userMessage, "error");
    } finally {
      setActionLoading(prevState => ({ ...prevState, [currentRequestToReject.id]: false }));
    }
  };

  const handleUpdateOrderStatus = async (requestId, currentStatus, newStatus) => {
    setActionLoading(prevState => ({ ...prevState, [requestId]: true }));
    setError("");
    try {
      const requestRef = doc(db, "deliveryRequests", requestId);
      await updateDoc(requestRef, {
        status: newStatus,
        statusHistory: [
          ...(requests.find(r => r.id === requestId)?.statusHistory || []),
          { status: newStatus, timestamp: serverTimestamp(), changedBy: "vendor" }
        ],
        updatedAt: serverTimestamp(),
      });
      fetchRequests(); // Refetch to update lists
      showSnackbar(`Statut de la commande mis à jour à: ${newStatus.replace("_", " ").toUpperCase()}`, "success");
      // NOTIFICATION POINT
      const updatedRequest = requests.find(r => r.id === requestId); // Need to get familyId from the request
      if (updatedRequest) {
        console.log(`NOTIFICATION_POINT: Order status updated to ${newStatus}. Notify user ${updatedRequest.familyId}. Order ID: ${requestId}`);
      }
      // FUTURE_ROBUSTNESS: Consider adding a 'failed_delivery' or 'disputed' status and flow.
    } catch (err) {
      console.error(`Erreur détaillée lors de la mise à jour du statut (${newStatus}) pour la commande ${requestId}:`, err);
      const userMessage = `Erreur lors du passage de la commande ${requestId.substring(0,4)} au statut ${newStatus.replace("_"," ")}. Veuillez réessayer.`;
      setError(userMessage);
      showSnackbar(userMessage, "error");
    } finally {
      setActionLoading(prevState => ({ ...prevState, [requestId]: false }));
    }
  };

  const pendingConfirmationRequests = requests.filter(r => r.status === "pending_vendor_confirmation");
  const activeOrders = requests.filter(r => ["confirmed", "shopping", "out_for_delivery"].includes(r.status));


  if (isLoading) { // Simplified initial loading
    return (
      <Container sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography>Chargement des commandes...</Typography>
      </Container>
    )
  }

  if (error) { // Display general errors here
    return (
      <Container sx={{ py: 4 }}>
        <MuiAlert severity="error">{error}</MuiAlert> {/* Changed Alert to MuiAlert */}
      </Container>
    )
  }

  const getStatusChip = (status) => {
    switch(status) {
      case "pending_vendor_confirmation": return <Chip icon={<PendingIcon/>} label="Action requise" color="warning" size="small"/>;
      case "confirmed": return <Chip icon={<CheckCircleOutlineIcon/>} label="Confirmée par client" color="info" size="small"/>;
      case "shopping": return <Chip icon={<InProgressIcon/>} label="Achats en cours" color="secondary" size="small"/>;
      case "out_for_delivery": return <Chip icon={<LocalShippingOutlined/>} label="En livraison" color="primary" size="small"/>;
      default: return <Chip label={status} size="small"/>;
    }
  }

  const renderActionButtonsForActiveOrder = (order) => {
    const currentActionLoading = actionLoading[order.id] || false;
    switch(order.status) {
      case "confirmed":
        return <Button variant="contained" size="small" startIcon={<StartIcon />} onClick={() => handleUpdateOrderStatus(order.id, order.status, "shopping")} disabled={currentActionLoading}>{currentActionLoading ? <CircularProgress size={20}/> : "Commencer les achats"}</Button>;
      case "shopping":
        return <Button variant="contained" size="small" startIcon={<OutForDeliveryIcon />} onClick={() => handleUpdateOrderStatus(order.id, order.status, "out_for_delivery")} disabled={currentActionLoading}>{currentActionLoading ? <CircularProgress size={20}/> : "Marquer comme En Livraison"}</Button>;
      case "out_for_delivery":
        return <Button variant="contained" size="small" startIcon={<DeliveredIcon />} onClick={() => handleUpdateOrderStatus(order.id, order.status, "delivered")} disabled={currentActionLoading}>{currentActionLoading ? <CircularProgress size={20}/> : "Marquer comme Livrée"}</Button>;
      default:
        return null;
    }
  }


  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <ShoppingBasketIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: "2.5rem" }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Gestion des Commandes
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb:3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="Order tabs">
          <Tab label={`Action Requise (${pendingConfirmationRequests.length})`} />
          <Tab label={`Commandes Actives (${activeOrders.length})`} />
        </Tabs>
      </Box>

      {/* Tab for Pending Vendor Confirmation */}
      {currentTab === 0 && (
        <>
          {isLoading && pendingConfirmationRequests.length === 0 && <CircularProgress sx={{display:'block', margin:'auto'}}/>}
          {!isLoading && pendingConfirmationRequests.length === 0 && (
            <Paper elevation={0} sx={{ p: 3, textAlign: "center", border: `1px dashed ${theme.palette.divider}` }}>
              <Typography variant="h6" color="text.secondary">Aucune commande en attente de votre confirmation initiale.</Typography>
            </Paper>
          )}
          {pendingConfirmationRequests.length > 0 && (
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`}}>
              <Table>
                <TableHead sx={{backgroundColor: alpha(theme.palette.warning.light, 0.1)}}>
                  <TableRow>
                    <TableCell sx={{fontWeight: 'bold'}}>ID Demande</TableCell>
                    <TableCell sx={{fontWeight: 'bold'}}>Date demandée</TableCell>
                    <TableCell sx={{fontWeight: 'bold'}}>Adresse</TableCell>
                    <TableCell sx={{fontWeight: 'bold', textAlign: 'center'}}>Actions Initiales</TableCell>
                    <TableCell sx={{fontWeight: 'bold', textAlign: 'center'}}>Détails Articles</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingConfirmationRequests.map((request) => (
                    <>
                      <TableRow key={request.id} hover selected={expandedRequest === request.id}>
                        <TableCell>
                          <Chip label={request.id.substring(0,8) + "..."} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{request.requestedDate} à {request.requestedTime}</TableCell>
                        <TableCell>{request.deliveryAddress}</TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircleOutlineIcon />}
                            onClick={() => handleConfirmOrder(request)}
                            disabled={actionLoading[request.id]} // Use actionLoading map
                            sx={{mr: 1}}
                          >
                            {actionLoading[request.id] ? <CircularProgress size={20}/> : "Confirmer/Ajuster"}
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<CancelOutlinedIcon />}
                            onClick={() => handleOpenRejectDialog(request)}
                            disabled={actionLoading[request.id]} // Use actionLoading map
                          >
                            Rejeter
                          </Button>
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <IconButton onClick={() => handleToggleExpand(request.id)} size="small">
                            {expandedRequest === request.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={5} sx={{ p: 0, borderBottom: expandedRequest === request.id ? '1px solid ' + theme.palette.divider : 'none' }}>
                          <Collapse in={expandedRequest === request.id} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 3, backgroundColor: alpha(theme.palette.grey[50], 0.5) }}>
                              <Typography variant="h6" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center', mb:2 }}>
                                <ReceiptIcon sx={{mr:1, color: theme.palette.secondary.main}}/> Ajuster les articles pour Commande #{request.id.substring(0,8)}
                              </Typography>

                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" gutterBottom sx={{fontWeight: 'medium'}}>Informations Client:</Typography>
                                    <Typography variant="body2"><PersonPinCircleIcon fontSize="small" sx={{verticalAlign: 'middle', mr:0.5}}/> {request.deliveryAddress}</Typography>
                                    <Typography variant="body2"><CalendarTodayIcon fontSize="small" sx={{verticalAlign: 'middle', mr:0.5}}/> {request.requestedDate} à {request.requestedTime}</Typography>
                                    {request.deliveryInstructions && <Typography variant="body2" sx={{mt:1}}><em>Instructions: {request.deliveryInstructions}</em></Typography>}
                                </Grid>
                                 <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" gutterBottom sx={{fontWeight: 'medium'}}>Frais de livraison (initiaux):</Typography>
                                    <Typography variant="body2">{request.deliveryFee?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}</Typography>
                                </Grid>
                              </Grid>

                              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 'medium' }}>Articles Demandés:</Typography>
                              {Array.isArray(request.items) && request.items.map((item, index) => { // Check if items is an array
                                const itemId = item.id || item.name;
                                const currentItemState = itemChanges[request.id]?.[itemId] || { available: true, price: item.price, note: "" };
                                return (
                                <Paper key={index} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                                  <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} sm={4}>
                                      <Typography variant="body1" sx={{fontWeight:'medium'}}>{item.name}</Typography>
                                      <Typography variant="caption" color="textSecondary">{item.quantity} {item.unit || 'unité(s)'} - Prix initial: {item.price?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                      <FormControlLabel
                                        control={
                                          <Checkbox
                                            checked={currentItemState.available}
                                            onChange={(e) => handleItemChange(request.id, itemId, 'available', e.target.checked)}
                                            size="small"
                                          />
                                        }
                                        label="Dispo?"
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                      <TextField
                                        label="Prix final/unité"
                                        type="number"
                                        size="small"
                                        fullWidth
                                        value={currentItemState.price}
                                        onChange={(e) => handleItemChange(request.id, itemId, 'price', parseFloat(e.target.value))}
                                        disabled={!currentItemState.available || (vendorType === 'storefront' /* && !item.allowPriceAdjustment - add this if such field exists */)}
                                        InputProps={{
                                          inputProps: { min: 0 }
                                        }}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                      <TextField
                                        label="Note article"
                                        type="text"
                                        size="small"
                                        fullWidth
                                        value={currentItemState.note}
                                        onChange={(e) => handleItemChange(request.id, itemId, 'note', e.target.value)}
                                        disabled={!currentItemState.available}
                                      />
                                    </Grid>
                                  </Grid>
                                </Paper>
                              )})}

                              <TextField
                                fullWidth
                                label="Note globale pour la commande (optionnel)"
                                multiline
                                rows={2}
                                value={overallNotes[request.id] || ""}
                                onChange={(e) => handleOverallNoteChange(request.id, e.target.value)}
                                sx={{ mt: 2 }}
                                variant="outlined"
                              />
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Tab for Active Orders */}
      {currentTab === 1 && (
        <>
          {isLoading && activeOrders.length === 0 && <CircularProgress sx={{display:'block', margin:'auto'}}/>}
          {!isLoading && activeOrders.length === 0 && (
            <Paper elevation={0} sx={{ p: 3, textAlign: "center", border: `1px dashed ${theme.palette.divider}` }}>
              <Typography variant="h6" color="text.secondary">Aucune commande active pour le moment.</Typography>
            </Paper>
          )}
          {activeOrders.length > 0 && (
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`}}>
              <Table>
                <TableHead sx={{backgroundColor: alpha(theme.palette.success.light, 0.1)}}>
                  <TableRow>
                    <TableCell sx={{fontWeight: 'bold'}}>ID Commande</TableCell>
                    <TableCell sx={{fontWeight: 'bold'}}>Date</TableCell>
                    <TableCell sx={{fontWeight: 'bold'}}>Client (Adresse)</TableCell>
                    <TableCell sx={{fontWeight: 'bold'}}>Statut Actuel</TableCell>
                    <TableCell sx={{fontWeight: 'bold', textAlign: 'center'}}>Prochaine Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell><Chip label={order.id.substring(0,8) + "..."} size="small" variant="outlined" color="primary"/></TableCell>
                      <TableCell>{order.requestedDate} à {order.requestedTime}</TableCell>
                      <TableCell>{order.deliveryAddress}</TableCell> {/* Consider fetching client name if available */}
                      <TableCell>{getStatusChip(order.status)}</TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        {renderActionButtonsForActiveOrder(order)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}


      {/* Rejection Dialog (remains the same) */}
      <Dialog open={rejectDialogOpen} onClose={handleCloseRejectDialog}>
        <DialogTitle>Rejeter la Commande Initiale</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Veuillez fournir une raison pour le rejet de cette commande (optionnel).
            Cela sera communiqué à l'utilisateur. La commande sera annulée.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="rejectionReason"
            label="Raison du rejet"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="standard"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRejectDialog} disabled={actionLoading[currentRequestToReject?.id]}>Annuler</Button>
          <Button onClick={handleRejectOrder} color="error" disabled={actionLoading[currentRequestToReject?.id]}>
            {actionLoading[currentRequestToReject?.id] ? <CircularProgress size={24} /> : "Rejeter la Commande"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({...snackbar, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert onClose={() => setSnackbar({...snackbar, open: false})} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

    </Container>
  )
}

export default VendorOrderDashboard
                      >
                        Rejeter
                      </Button>
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      <IconButton onClick={() => handleToggleExpand(request.id)}>
                        {expandedRequest === request.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} sx={{ p: 0, borderBottom: expandedRequest === request.id ? '1px solid ' + theme.palette.divider : 'none' }}>
                      <Collapse in={expandedRequest === request.id} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 3, backgroundColor: alpha(theme.palette.grey[50], 0.5) }}>
                          <Typography variant="h6" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center', mb:2 }}>
                            <ReceiptIcon sx={{mr:1, color: theme.palette.secondary.main}}/> Détails de la Commande #{request.id.substring(0,8)}
                          </Typography>

                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle1" gutterBottom sx={{fontWeight: 'medium'}}>Informations Client:</Typography>
                                <Typography variant="body2"><PersonPinCircleIcon fontSize="small" sx={{verticalAlign: 'middle', mr:0.5}}/> {request.deliveryAddress}</Typography>
                                <Typography variant="body2"><CalendarTodayIcon fontSize="small" sx={{verticalAlign: 'middle', mr:0.5}}/> {request.requestedDate} à {request.requestedTime}</Typography>
                                {request.deliveryInstructions && <Typography variant="body2" sx={{mt:1}}><em>Instructions: {request.deliveryInstructions}</em></Typography>}
                            </Grid>
                             <Grid item xs={12} md={6}>
                                <Typography variant="subtitle1" gutterBottom sx={{fontWeight: 'medium'}}>Frais de livraison:</Typography>
                                <Typography variant="body2">{request.deliveryFee?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}</Typography>
                            </Grid>
                          </Grid>

                          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 'medium' }}>Articles Demandés:</Typography>
                          {request.items && request.items.map((item, index) => {
                            const itemId = item.id || item.name; // Use unique ID
                            const currentItemState = itemChanges[request.id]?.[itemId] || { available: true, price: item.price, note: "" };
                            return (
                            <Paper key={index} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={4}>
                                  <Typography variant="body1" sx={{fontWeight:'medium'}}>{item.name}</Typography>
                                  <Typography variant="caption" color="textSecondary">{item.quantity} {item.unit || 'unité(s)'} - Prix initial: {item.price?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={currentItemState.available}
                                        onChange={(e) => handleItemChange(request.id, itemId, 'available', e.target.checked)}
                                        size="small"
                                      />
                                    }
                                    label="Dispo?"
                                  />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                  <TextField
                                    label="Prix final/unité"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={currentItemState.price}
                                    onChange={(e) => handleItemChange(request.id, itemId, 'price', parseFloat(e.target.value))}
                                    disabled={!currentItemState.available || (vendorType === 'storefront' && !item.allowPriceAdjustment)} // Example logic for storefront
                                    InputProps={{
                                      inputProps: { min: 0 }
                                    }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                  <TextField
                                    label="Note (optionnel)"
                                    type="text"
                                    size="small"
                                    fullWidth
                                    value={currentItemState.note}
                                    onChange={(e) => handleItemChange(request.id, itemId, 'note', e.target.value)}
                                    disabled={!currentItemState.available}
                                  />
                                </Grid>
                              </Grid>
                            </Paper>
                          )})}

                          <TextField
                            fullWidth
                            label="Note globale pour la commande (optionnel)"
                            multiline
                            rows={2}
                            value={overallNotes[request.id] || ""}
                            onChange={(e) => handleOverallNoteChange(request.id, e.target.value)}
                            sx={{ mt: 2 }}
                            variant="outlined"
                          />
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onClose={handleCloseRejectDialog}>
        <DialogTitle>Rejeter la Commande</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Veuillez fournir une raison pour le rejet de cette commande (optionnel).
            Cela sera communiqué à l'utilisateur.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="rejectionReason"
            label="Raison du rejet"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="standard"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRejectDialog}>Annuler</Button>
          <Button onClick={handleRejectOrder} color="error" disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : "Rejeter la Commande"}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  )
}

export default VendorOrderDashboard
