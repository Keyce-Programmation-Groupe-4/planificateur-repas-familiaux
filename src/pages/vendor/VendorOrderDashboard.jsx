"use client"

import React, { useState, useEffect, useMemo } from "react"; 
import { useNavigate } from "react-router-dom";
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
  FormControlLabel,
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
  Tabs,     
  Tab,      
  Snackbar, 
  Alert as MuiAlert, 
  FormControl, 
  InputLabel,  
  Select,      
  MenuItem,    
  InputAdornment, 
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
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
  PlayCircleOutline as StartIcon,       
  LocalShippingOutlined as OutForDeliveryIcon, 
  TaskAltOutlined as DeliveredIcon,      
  HourglassTopOutlined as PendingIcon,
  Autorenew as InProgressIcon,
  Visibility as VisibilityIcon, 
  Search as SearchIcon, 
  ListAlt as ListAltIcon, 
} from "@mui/icons-material";
import { db } from "../../firebaseConfig";
import { DELIVERY_STATUSES, getDeliveryStatusByKey } from "../../config/deliveryStatuses"; 
import OrderDetailsModal from '../../components/vendor/OrderDetailsModal'; 
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { triggerSendNotification } from '../../utils/notificationUtils';
import { getCurrentUserFCMToken } from '../../utils/authUtils';

function VendorOrderDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [itemChanges, setItemChanges] = useState({});
  const [overallNotes, setOverallNotes] = useState({});
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [currentRequestToReject, setCurrentRequestToReject] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleOpenDetailsModal = (order) => {
    setSelectedOrderDetails(order);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setSelectedOrderDetails(null);
    setIsDetailsModalOpen(false);
  };

  const vendorId = userData?.uid;
  const vendorType = userData?.vendorProfile?.vendorType;

  const fetchRequests = async () => {
    if (!vendorId) {
      setIsLoading(false);
      setError("Profil vendeur non trouvé ou utilisateur non connecté.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const q = query(
        collection(db, "deliveryRequests"),
        where("vendorId", "==", vendorId),
        where("status", "in", [
          DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key,
          DELIVERY_STATUSES.CONFIRMED.key,
          DELIVERY_STATUSES.SHOPPING.key,
          DELIVERY_STATUSES.OUT_FOR_DELIVERY.key,
          DELIVERY_STATUSES.DELIVERED.key 
        ])
      );
      const querySnapshot = await getDocs(q);
      const fetchedRequests = [];
      for (const dRequestDoc of querySnapshot.docs) {
        const requestData = dRequestDoc.data();
        let itemsToDisplay = [];

        if (requestData.status === DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key) {
          itemsToDisplay = requestData.requestedItems || [];
        } else if ([
            DELIVERY_STATUSES.CONFIRMED.key,
            DELIVERY_STATUSES.SHOPPING.key,
            DELIVERY_STATUSES.OUT_FOR_DELIVERY.key
          ].includes(requestData.status)) {
          itemsToDisplay = requestData.vendorConfirmedItems || [];
        }
        fetchedRequests.push({ id: dRequestDoc.id, ...requestData, items: itemsToDisplay });
      }
      setRequests(fetchedRequests);
    } catch (err) {
      console.error("Erreur détaillée lors du chargement des demandes pour le dashboard vendeur:", err);
      setError("Impossible de charger les commandes pour le moment. Veuillez vérifier votre connexion et réessayer. Si le problème persiste, contactez le support.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) { 
        fetchRequests();
    }
  }, [vendorId]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleToggleExpand = (requestId) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId);
    if (expandedRequest !== requestId) {
      const request = requests.find(r => r.id === requestId);
      if (request && !itemChanges[requestId]) {
        const initialChanges = {};
        (request.requestedItems || []).forEach(item => {
          initialChanges[item.itemId || item.name] = {
            available: true,
            pricePerUnit: '',
            note: ""
          };
        });
        setItemChanges(prev => ({ ...prev, [requestId]: initialChanges }));
        setOverallNotes(prev => ({ ...prev, [requestId]: "" }));
      }
    }
  };

  const handleItemChange = (requestId, itemId, field, value) => {
    setItemChanges(prev => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        [itemId]: {
          ...(prev[requestId]?.[itemId] || {}), 
          [field]: value
        }
      }
    }));
  };

  const handleOverallNoteChange = (requestId, value) => {
    setOverallNotes(prev => ({ ...prev, [requestId]: value }));
  };

  const handleOpenRejectDialog = (request) => {
    setCurrentRequestToReject(request);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleCloseRejectDialog = () => {
    setRejectDialogOpen(false);
    setCurrentRequestToReject(null);
  };

  const handleConfirmOrder = async (request) => {
    setActionLoading(prevState => ({ ...prevState, [request.id]: true }));
    setError("");
    const currentItemChanges = itemChanges[request.id] || {};
    const itemsToProcess = Array.isArray(request.requestedItems) ? request.requestedItems : [];
    
    const confirmedItems = itemsToProcess.map(item => {
        const itemKey = item.itemId || item.name;
        const changes = currentItemChanges[itemKey];

        const vendorPricePerUnit = Number(changes?.pricePerUnit || 0);
        const vendorConfirmedQuantity = Number(item.quantity || 0);
        const calculatedVendorLinePrice = vendorPricePerUnit * vendorConfirmedQuantity;

        return {
          itemId: item.itemId,
          name: item.name,
          quantity: vendorConfirmedQuantity,
          unit: item.unit || '',
          originalEstimatedPrice: Number(item.originalEstimatedPrice || 0),
          vendorPrice: calculatedVendorLinePrice,
          availabilityStatus: changes?.available ? 'available' : 'unavailable',
          vendorItemNote: changes?.note || "",
        };
      });

    const vendorItemTotalCost = confirmedItems.reduce((sum, currentItem) => {
      if (currentItem.availabilityStatus === 'available' || currentItem.availabilityStatus === 'substituted_by_vendor') {
        return sum + Number(currentItem.vendorPrice || 0);
      }
      return sum;
    }, 0);

    const deliveryFee = Number(request.deliveryFee) || 0;
    const vendorProposedTotalCost = vendorItemTotalCost + deliveryFee;

    if (confirmedItems.filter(item => item.availabilityStatus === 'available' || item.availabilityStatus === 'substituted_by_vendor').length === 0 && itemsToProcess.length > 0) {
      console.warn(`Vendor is confirming an order (${request.id}) where all items are marked as unavailable. This will result in a zero item cost order.`);
    }

    const updateData = {
      status: DELIVERY_STATUSES.PENDING_USER_ACCEPTANCE.key,
      vendorConfirmedItems: confirmedItems,
      vendorItemTotalCost: vendorItemTotalCost,
      vendorProposedTotalCost: vendorProposedTotalCost,
      vendorOverallNote: overallNotes[request.id] || "",
      statusHistory: [
        ...(request.statusHistory || []),
        {
          status: DELIVERY_STATUSES.PENDING_USER_ACCEPTANCE.key,
          timestamp: new Date(),
          changedBy: "vendor",
          userId: currentUser?.uid
        }
      ],
      updatedAt: serverTimestamp(),
    };

    console.log("Data for updateDoc (handleConfirmOrder):", JSON.parse(JSON.stringify(updateData)));

    try {
      const requestRef = doc(db, "deliveryRequests", request.id);
      await updateDoc(requestRef, updateData);
      fetchRequests();
      showSnackbar("Commande confirmée et envoyée à l'utilisateur.", "success");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Commande Confirmée",
          `La commande #${request.id.substring(0,8)} a été confirmée et envoyée à l'utilisateur.`
        );
      }
      console.log(`NOTIFICATION_POINT: Vendor confirmed/adjusted order. Notify user ${request.familyId}. Order ID: ${request.id}`);
    } catch (err) {
      console.error("Detailed error during order confirmation:", err, "Payload:", JSON.parse(JSON.stringify(updateData)));
      const userMessage = `Erreur lors de la confirmation de la commande ${request.id.substring(0,4)}. Veuillez réessayer.`;
      setError(userMessage);
      showSnackbar(userMessage, "error");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Échec Confirmation Commande",
          `Erreur lors de la confirmation de la commande #${request.id.substring(0,8)}: ${err.message}`
        );
      }
    } finally {
      setActionLoading(prevState => ({ ...prevState, [request.id]: false }));
    }
  };

  const handleRejectOrder = async () => {
    if (!currentRequestToReject) return;
    setActionLoading(prevState => ({ ...prevState, [currentRequestToReject.id]: true }));
    setError("");

    try {
      const requestRef = doc(db, "deliveryRequests", currentRequestToReject.id);
      await updateDoc(requestRef, {
        status: DELIVERY_STATUSES.CANCELLED_BY_VENDOR.key,
        vendorRejectionReason: rejectionReason.trim() || "Non spécifiée",
        statusHistory: [
          ...(currentRequestToReject.statusHistory || []),
          {
            status: DELIVERY_STATUSES.CANCELLED_BY_VENDOR.key,
            timestamp: new Date(),
            changedBy: "vendor",
            userId: currentUser?.uid
          }
        ],
        updatedAt: serverTimestamp(),
      });
      fetchRequests();
      handleCloseRejectDialog();
      showSnackbar("Commande rejetée.", "info");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Commande Rejetée",
          `La commande #${currentRequestToReject.id.substring(0,8)} a été rejetée.`
        );
      }
      console.log(`NOTIFICATION_POINT: Vendor rejected order. Notify user ${currentRequestToReject.familyId}. Order ID: ${currentRequestToReject.id}`);
    } catch (err) {
      console.error("Erreur détaillée lors du rejet de la commande par le vendeur:", err);
      const userMessage = `Erreur lors du rejet de la commande ${currentRequestToReject.id.substring(0,4)}. Veuillez réessayer.`;
      setError(userMessage);
      showSnackbar(userMessage, "error");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Échec Rejet Commande",
          `Erreur lors du rejet de la commande #${currentRequestToReject.id.substring(0,8)}: ${err.message}`
        );
      }
    } finally {
      setActionLoading(prevState => ({ ...prevState, [currentRequestToReject.id]: false }));
    }
  };

  const handleUpdateOrderStatus = async (requestId, currentStatusKey, newStatusKey) => {
    setActionLoading(prevState => ({ ...prevState, [requestId]: true }));
    setError("");
    try {
      const requestRef = doc(db, "deliveryRequests", requestId);
      await updateDoc(requestRef, {
        status: newStatusKey,
        statusHistory: [
          ...(requests.find(r => r.id === requestId)?.statusHistory || []),
          {
            status: newStatusKey,
            timestamp: new Date(),
            changedBy: "vendor",
            userId: currentUser?.uid
          }
        ],
        updatedAt: serverTimestamp(),
      });
      fetchRequests();
      const statusLabel = getDeliveryStatusByKey(newStatusKey)?.label || newStatusKey.replace("_", " ").toUpperCase();
      showSnackbar(`Statut de la commande mis à jour à: ${statusLabel}`, "success");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Statut Commande Mis à Jour",
          `Le statut de la commande #${requestId.substring(0,8)} est maintenant: ${statusLabel}.`
        );
      }
      const updatedRequest = requests.find(r => r.id === requestId);
      if (updatedRequest) {
        console.log(`NOTIFICATION_POINT: Order status updated to ${newStatusKey}. Notify user ${updatedRequest.familyId}. Order ID: ${requestId}`);
      }
    } catch (err) {
      console.error(`Erreur détaillée lors de la mise à jour du statut (${newStatusKey}) pour la commande ${requestId}:`, err);
      const statusLabel = getDeliveryStatusByKey(newStatusKey)?.label || newStatusKey.replace("_"," ");
      const userMessage = `Erreur lors du passage de la commande ${requestId.substring(0,4)} au statut ${statusLabel}. Veuillez réessayer.`;
      setError(userMessage);
      showSnackbar(userMessage, "error");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Échec Mise à Jour Statut",
          `Erreur mise à jour statut commande #${requestId.substring(0,8)} vers ${statusLabel}: ${err.message}`
        );
      }
    } finally {
      setActionLoading(prevState => ({ ...prevState, [requestId]: false }));
    }
  };

  const pendingConfirmationRequests = requests.filter(r => r.status === DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key);
  const activeOrders = requests.filter(r => [
      DELIVERY_STATUSES.CONFIRMED.key,
      DELIVERY_STATUSES.SHOPPING.key,
      DELIVERY_STATUSES.OUT_FOR_DELIVERY.key
    ].includes(r.status));
  
  const sortedAndFilteredPendingConfirmationRequests = useMemo(() => { 
      const filtered = pendingConfirmationRequests.filter(request => {
          if (!searchQuery.trim()) return true;
          const lowerSearchQuery = searchQuery.toLowerCase();
          return (
              request.id.toLowerCase().includes(lowerSearchQuery) ||
              (request.deliveryAddress && request.deliveryAddress.toLowerCase().includes(lowerSearchQuery))
          );
      });
      return [...filtered].sort((a, b) => {
          const dateA = a.createdAt?.toDate() || new Date(0);
          const dateB = b.createdAt?.toDate() || new Date(0);
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
  }, [pendingConfirmationRequests, sortOrder, searchQuery]);

  const sortedAndFilteredActiveOrders = useMemo(() => { 
      const filtered = activeOrders.filter(request => {
          if (!searchQuery.trim()) return true;
          const lowerSearchQuery = searchQuery.toLowerCase();
          return (
              request.id.toLowerCase().includes(lowerSearchQuery) ||
              (request.deliveryAddress && request.deliveryAddress.toLowerCase().includes(lowerSearchQuery))
          );
      });
      return [...filtered].sort((a, b) => {
          const dateA = a.createdAt?.toDate() || new Date(0);
          const dateB = b.createdAt?.toDate() || new Date(0);
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
  }, [activeOrders, sortOrder, searchQuery]);

  const analyticsData = useMemo(() => {
    if (!requests || requests.length === 0) {
      return {
        pendingActionsCount: 0,
        activeOrdersCount: 0,
        totalDeliveredCount: 0,
      };
    }
    const pendingActionsCount = requests.filter(
      (r) => r.status === DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key
    ).length;
    const activeOrdersCount = requests.filter((r) =>
      [
        DELIVERY_STATUSES.CONFIRMED.key,
        DELIVERY_STATUSES.SHOPPING.key,
        DELIVERY_STATUSES.OUT_FOR_DELIVERY.key,
      ].includes(r.status)
    ).length;
    const totalDeliveredCount = requests.filter(
      (r) => r.status === DELIVERY_STATUSES.DELIVERED.key
    ).length;
    return {
      pendingActionsCount,
      activeOrdersCount,
      totalDeliveredCount,
    };
  }, [requests]);

  if (isLoading && requests.length === 0) { 
    return (
      <Container sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography>Chargement des commandes...</Typography>
      </Container>
    );
  }

  if (error && requests.length === 0) { 
    return (
      <Container sx={{ py: 4 }}>
        <MuiAlert severity="error">{error}</MuiAlert>
      </Container>
    );
  }

  const getStatusChip = (statusKey) => {
    const statusObj = getDeliveryStatusByKey(statusKey);
    if (statusObj) {
      let icon = null;
      if (statusKey === DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key) icon = <PendingIcon/>;
      else if (statusKey === DELIVERY_STATUSES.CONFIRMED.key) icon = <CheckCircleOutlineIcon/>;
      else if (statusKey === DELIVERY_STATUSES.SHOPPING.key) icon = <InProgressIcon/>;
      else if (statusKey === DELIVERY_STATUSES.OUT_FOR_DELIVERY.key) icon = <OutForDeliveryIcon/>;
      else if (statusKey === DELIVERY_STATUSES.DELIVERED.key) icon = <DeliveredIcon/>; 
      return <Chip icon={icon} label={statusObj.adminLabel || statusObj.label} color={statusObj.color || 'default'} size="small"/>;
    }
    return <Chip label={statusKey} size="small"/>;
  };

  const renderActionButtonsForActiveOrder = (order) => {
    const currentActionLoading = actionLoading[order.id] || false;
    const currentStatusKey = order.status;

    if (currentStatusKey === DELIVERY_STATUSES.CONFIRMED.key) {
      return <Button variant="contained" size="small" startIcon={<StartIcon />} onClick={() => handleUpdateOrderStatus(order.id, currentStatusKey, DELIVERY_STATUSES.SHOPPING.key)} disabled={currentActionLoading}>{currentActionLoading ? <CircularProgress size={20}/> : "Commencer les achats"}</Button>;
    } else if (currentStatusKey === DELIVERY_STATUSES.SHOPPING.key) {
      return <Button variant="contained" size="small" startIcon={<OutForDeliveryIcon />} onClick={() => handleUpdateOrderStatus(order.id, currentStatusKey, DELIVERY_STATUSES.OUT_FOR_DELIVERY.key)} disabled={currentActionLoading}>{currentActionLoading ? <CircularProgress size={20}/> : "Marquer comme En Livraison"}</Button>;
    } else if (currentStatusKey === DELIVERY_STATUSES.OUT_FOR_DELIVERY.key) {
      return <Button variant="contained" size="small" startIcon={<DeliveredIcon />} onClick={() => handleUpdateOrderStatus(order.id, currentStatusKey, DELIVERY_STATUSES.DELIVERED.key)} disabled={currentActionLoading}>{currentActionLoading ? <CircularProgress size={20}/> : "Marquer comme Livrée"}</Button>;
    }
    return null;
  };

  const renderPendingConfirmationRequests = () => {
    if (isMobile) {
      return sortedAndFilteredPendingConfirmationRequests.map((request) => (
        <Card key={request.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{request.id.substring(0,8) + "..."}</Typography>
            <Typography variant="body2" color="text.secondary">
              {request.createdAt?.toDate().toLocaleDateString('fr-FR')} {request.createdAt?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {request.deliveryAddress}
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircleOutlineIcon />}
              onClick={() => handleConfirmOrder(request)}
              disabled={actionLoading[request.id]}
            >
              {actionLoading[request.id] ? <CircularProgress size={20}/> : "Confirmer/Ajuster"}
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<CancelOutlinedIcon />}
              onClick={() => handleOpenRejectDialog(request)}
              disabled={actionLoading[request.id]}
            >
              Rejeter
            </Button>
            <IconButton onClick={() => handleToggleExpand(request.id)} size="small">
              {expandedRequest === request.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </CardActions>
          <Collapse in={expandedRequest === request.id} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">Ajuster les articles</Typography>
            </Box>
          </Collapse>
        </Card>
      ));
    } else {
      return (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`}}>
          <Table>
            <TableHead sx={{backgroundColor: alpha(theme.palette.warning.light, 0.1)}}>
              <TableRow>
                <TableCell sx={{fontWeight: 'bold'}}>ID Demande</TableCell>
                <TableCell sx={{fontWeight: 'bold'}}>Date Création</TableCell>
                <TableCell sx={{fontWeight: 'bold'}}>Adresse</TableCell>
                <TableCell sx={{fontWeight: 'bold', textAlign: 'center'}}>Actions Initiales</TableCell>
                <TableCell sx={{fontWeight: 'bold', textAlign: 'center'}}>Détails Articles</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedAndFilteredPendingConfirmationRequests.map((request) => (
                <React.Fragment key={request.id}>
                  <TableRow hover selected={expandedRequest === request.id}>
                    <TableCell>
                      <Chip label={request.id.substring(0,8) + "..."} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{request.createdAt?.toDate().toLocaleDateString('fr-FR')} {request.createdAt?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>{request.deliveryAddress}</TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckCircleOutlineIcon />}
                        onClick={() => handleConfirmOrder(request)}
                        disabled={actionLoading[request.id]}
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
                        disabled={actionLoading[request.id]}
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
                                <Typography variant="body2">{(Number(request.deliveryFee) || 0).toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}</Typography>
                            </Grid>
                          </Grid>
                          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 'medium' }}>Articles Demandés:</Typography>
                          {Array.isArray(request.requestedItems) && request.requestedItems.map((item, index) => {
                            const itemKey = item.itemId || item.name;
                            const currentItemState = itemChanges[request.id]?.[itemKey] || { available: true, pricePerUnit: '', note: "" };
                            return (
                            <Paper key={item.itemId || index} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={4}>
                                  <Typography variant="body1" sx={{fontWeight:'medium'}}>{item.name}</Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {item.quantity} {item.unit || 'unité(s)'} - Prix estimé famille (total ligne): {(Number(item.originalEstimatedPrice) || 0).toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={!!currentItemState.available}
                                        onChange={(e) => handleItemChange(request.id, itemKey, 'available', e.target.checked)}
                                        size="small"
                                      />
                                    }
                                    label="Dispo?"
                                  />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                  <TextField
                                    label="Votre Prix/Unité"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={currentItemState.pricePerUnit === undefined ? '' : currentItemState.pricePerUnit}
                                    onChange={(e) => handleItemChange(request.id, itemKey, 'pricePerUnit', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    disabled={!currentItemState.available || (vendorType === 'storefront')}
                                    InputProps={{
                                      inputProps: { min: 0, step: "any" },
                                      startAdornment: <InputAdornment position="start">XAF</InputAdornment>,
                                    }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                  <TextField
                                    label="Note article"
                                    type="text"
                                    size="small"
                                    fullWidth
                                    value={currentItemState.note || ""}
                                    onChange={(e) => handleItemChange(request.id, itemKey, 'note', e.target.value)}
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
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }
  };

  const renderActiveOrders = () => {
    if (isMobile) {
      return sortedAndFilteredActiveOrders.map((order) => (
        <Card key={order.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{order.id.substring(0,8) + "..."}</Typography>
            <Typography variant="body2" color="text.secondary">
              {order.createdAt?.toDate().toLocaleDateString('fr-FR')} {order.createdAt?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.deliveryAddress}
            </Typography>
            {getStatusChip(order.status)}
          </CardContent>
          <CardActions>
            {renderActionButtonsForActiveOrder(order)}
            <IconButton onClick={() => handleOpenDetailsModal(order)} size="small" color="info">
              <VisibilityIcon />
            </IconButton>
          </CardActions>
        </Card>
      ));
    } else {
      return (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`}}>
          <Table>
            <TableHead sx={{backgroundColor: alpha(theme.palette.success.light, 0.1)}}>
              <TableRow>
                <TableCell sx={{fontWeight: 'bold'}}>ID Commande</TableCell>
                <TableCell sx={{fontWeight: 'bold'}}>Date Création</TableCell>
                <TableCell sx={{fontWeight: 'bold'}}>Client (Adresse)</TableCell>
                <TableCell sx={{fontWeight: 'bold'}}>Statut Actuel</TableCell>
                <TableCell sx={{fontWeight: 'bold', textAlign: 'center'}}>Prochaine Action</TableCell>
                <TableCell sx={{fontWeight: 'bold', textAlign: 'center'}}>Détails</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedAndFilteredActiveOrders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell><Chip label={order.id.substring(0,8) + "..."} size="small" variant="outlined" color="primary"/></TableCell>
                  <TableCell>{order.createdAt?.toDate().toLocaleDateString('fr-FR')} {order.createdAt?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell>{order.deliveryAddress}</TableCell>
                  <TableCell>{getStatusChip(order.status)}</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {renderActionButtonsForActiveOrder(order)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <IconButton onClick={() => handleOpenDetailsModal(order)} size="small" color="info">
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <ShoppingBasketIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: isMobile ? "2rem" : "2.5rem" }} />
        <Typography variant={isMobile ? "h5" : "h4"} component="h1" sx={{ fontWeight: 600 }}>
          Gestion des Commandes
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? "h6" : "h5"} component="h2" gutterBottom sx={{ fontWeight: 'medium' }}>
          Aperçu Rapide
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', borderRadius: 2 }}>
              <ListAltIcon sx={{ fontSize: isMobile ? 30 : 40, color: theme.palette.warning.main, mr: 2 }} />
              <Box>
                <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold' }}>
                  {analyticsData.pendingActionsCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Action(s) Requise(s)
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', borderRadius: 2 }}>
              <InProgressIcon sx={{ fontSize: isMobile ? 30 : 40, color: theme.palette.info.main, mr: 2 }} />
              <Box>
                <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold' }}>
                  {analyticsData.activeOrdersCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Commande(s) Active(s)
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', borderRadius: 2 }}>
              <DeliveredIcon sx={{ fontSize: isMobile ? 30 : 40, color: theme.palette.success.main, mr: 2 }} />
              <Box>
                <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold' }}>
                  {analyticsData.totalDeliveredCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Commande(s) Terminée(s) (Total)
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          label="Rechercher (ID Commande, Adresse)"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1, minWidth: '300px', maxWidth: '500px' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="sort-order-label">Trier par date</InputLabel>
          <Select
            labelId="sort-order-label"
            id="sort-order-select"
            value={sortOrder}
            label="Trier par date"
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <MenuItem value="desc">Date: Plus récent d'abord</MenuItem>
            <MenuItem value="asc">Date: Plus ancien d'abord</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb:3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="Order tabs">
          <Tab label={`Action Requise (${sortedAndFilteredPendingConfirmationRequests.length})`} />
          <Tab label={`Commandes Actives (${sortedAndFilteredActiveOrders.length})`} />
        </Tabs>
      </Box>

      {currentTab === 0 && renderPendingConfirmationRequests()}

      {currentTab === 1 && renderActiveOrders()}

      <Dialog open={rejectDialogOpen} onClose={handleCloseRejectDialog} fullWidth maxWidth="sm">
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

      <OrderDetailsModal 
        open={isDetailsModalOpen} 
        onClose={handleCloseDetailsModal} 
        order={selectedOrderDetails} 
      />
    </Container>
  );
}

export default VendorOrderDashboard;