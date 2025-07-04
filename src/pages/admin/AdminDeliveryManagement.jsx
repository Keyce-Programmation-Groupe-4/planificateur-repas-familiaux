"use client"

import { useState, useEffect, useCallback } from "react"
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
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  TableSortLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Snackbar,
  Select,
  FormControl,
  InputLabel,
  // Box as MUIBox, // Using Box directly
  alpha, // Added alpha
  Grid, // Added Grid
  List, // Added List
  ListItem, // Added ListItem
  Stack, // Added Stack for status history
  Fade, // Added Fade
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import FilterListIcon from "@mui/icons-material/FilterList"
import { EditNote as EditNoteIcon } from "@mui/icons-material"
import { LocalShipping as DeliveryIcon, MoreVert as MoreVertIcon, EditNote as EditStatusIcon, ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material" // Added Expand icons
import { db } from "../../firebaseConfig"
import { collection, getDocs, query, doc, updateDoc, serverTimestamp, where } from "firebase/firestore" // Added doc, updateDoc, serverTimestamp, where
import { orderBy as firestoreOrderBy } from "firebase/firestore"; // Import orderBy for sorting
import { format } from "date-fns" // For formatting dates
import AdminLayout from "../../components/AdminLayout.jsx" // Added AdminLayout
import { DELIVERY_STATUS_LIST, getDeliveryStatusByKey } from "../../config/deliveryStatuses" // Added import
import { triggerSendNotification } from '../../utils/notificationUtils';
import { getCurrentUserFCMToken } from '../../utils/authUtils';

function AdminDeliveryManagement() {
  const theme = useTheme();
  const [deliveryRequests, setDeliveryRequests] = useState([]);
  // const [allRequests, setAllRequests] = useState([]); // To store all fetched requests before filtering - might not be needed if refetching
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRequestId, setExpandedRequestId] = useState(null);

  // Sorting state
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("createdAt");

  // Filtering state
  const [statusFilter, setStatusFilter] = useState(""); // Empty string for all

  // For fetching vendor names (optional enhancement)
  const [vendorNames, setVendorNames] = useState({});

  const [actionLoading, setActionLoading] = useState(false);

  // Menu and Dialog states (for status update)
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [selectedStatusToUpdate, setSelectedStatusToUpdate] = useState(""); // This will store the status key
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Use DELIVERY_STATUS_LIST to populate dropdowns, ensuring we use the key for value
  // and a human-readable label (adminLabel or label) for display.
  const STATUS_OPTIONS_FOR_SELECT = DELIVERY_STATUS_LIST.map(status => ({
    value: status.key,
    label: status.adminLabel || status.label, // Prefer adminLabel, fallback to general label
  }));


  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    return format(timestamp.toDate(), "dd/MM/yyyy HH:mm");
  }, []);

  const fetchVendorName = useCallback(async (vendorId) => {
    if (!vendorId || vendorNames[vendorId]) return vendorNames[vendorId] || vendorId;
    try {
      const vendorRef = doc(db, "vendors", vendorId);
      const vendorSnap = await getDoc(vendorRef);
      if (vendorSnap.exists()) {
        const name = vendorSnap.data().name;
        setVendorNames(prev => ({ ...prev, [vendorId]: name }));
        return name;
      }
      setVendorNames(prev => ({ ...prev, [vendorId]: vendorId })); // Cache ID if not found to prevent re-fetch
      return vendorId;
    } catch (err) {
      console.error("Error fetching vendor name for ID:", vendorId, err);
      setVendorNames(prev => ({ ...prev, [vendorId]: vendorId })); // Cache ID on error
      return vendorId;
    }
  }, [vendorNames]);


  const fetchDeliveryRequests = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      let q = query(collection(db, "deliveryRequests"));

      if (statusFilter) {
        q = query(q, where("status", "==", statusFilter));
      }

      // Apply sorting using the state variable 'orderBy'
      q = query(q, firestoreOrderBy(orderBy, order));

      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Fetch vendor names in parallel
      // Create a set of unique vendor IDs to fetch
      const uniqueVendorIds = new Set(requestsData.map(req => req.vendorId).filter(Boolean));
      const vendorNamePromises = Array.from(uniqueVendorIds).map(id => fetchVendorName(id));
      await Promise.all(vendorNamePromises); // Ensures vendorNames state is updated

      setDeliveryRequests(requestsData);

    } catch (err) {
      console.error("Erreur lors du chargement des demandes de livraison:", err);
       if (err.code === "failed-precondition" && err.message.includes("index")) {
           setError(`Erreur d'index Firestore pour le tri/filtre (champ: ${orderBy}, statut: ${statusFilter}). Veuillez créer l'index requis via la console Firebase.`);
      } else {
          setError("Erreur lors du chargement des demandes. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, orderBy, order, fetchVendorName]);

  useEffect(() => {
    fetchDeliveryRequests();
  }, [fetchDeliveryRequests]);

  const handleMenuClick = (event, delivery) => {
    setAnchorEl(event.currentTarget);
    setSelectedDelivery(delivery);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Keep selectedDelivery for dialogs
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenStatusUpdateDialog = () => {
    if (!selectedDelivery) return;
    setSelectedStatus(selectedDelivery.status || ""); // Pre-fill with current status
    setStatusUpdateDialogOpen(true);
    handleMenuClose();
  };

  const handleCloseStatusUpdateDialog = () => {
    setStatusUpdateDialogOpen(false);
    setSelectedDelivery(null);
    setSelectedStatusToUpdate("");
  };

  const handleStatusChange = (event) => {
    setSelectedStatusToUpdate(event.target.value);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedDelivery || !selectedStatusToUpdate) { // selectedStatusToUpdate is a key string
      showSnackbar("Aucun statut sélectionné ou livraison non valide.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const deliveryRef = doc(db, "deliveryRequests", selectedDelivery.id);
      await updateDoc(deliveryRef, {
        status: selectedStatusToUpdate, // This is the key string
        updatedAt: serverTimestamp(),
        statusHistory: [
          ...(selectedDelivery.statusHistory || []),
          { status: selectedStatusToUpdate, timestamp: serverTimestamp(), changedBy: "admin" } // Store the key string
        ]
      });
      showSnackbar("Statut de la livraison mis à jour avec succès!", "success");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        const statusLabel = getDeliveryStatusByKey(selectedStatusToUpdate)?.adminLabel || selectedStatusToUpdate;
        triggerSendNotification(
          fcmToken,
          "Statut Livraison Mis à Jour",
          `Statut pour livraison #${selectedDelivery.id.substring(0,6)} changé à '${statusLabel}'.`
        );
      }
      fetchDeliveryRequests(); // Refresh list
    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut:", err);
      showSnackbar("Erreur lors de la mise à jour du statut.", "error");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Échec Mise à Jour Statut",
          `Échec MAJ statut pour livraison #${selectedDelivery.id.substring(0,6)}: ${err.message}`
        );
      }
    } finally {
      setActionLoading(false);
      handleCloseStatusUpdateDialog();
    }
  };

  const getStatusChip = (statusKey) => {
    const statusObj = getDeliveryStatusByKey(statusKey);
    let color = "default";
    let label = statusKey;
    let variant = "filled"; // Default to filled

    if (statusObj) {
      label = statusObj.adminLabel || statusObj.label;
      color = statusObj.color || "default";
      // Determine variant based on status type or a new property in config if needed
      if (statusKey.includes("pending") || statusKey.includes("cancelled") || statusKey === "out_for_delivery") {
        variant = "outlined";
      }
    } else {
      label = statusKey ? statusKey.replace(/_/g, " ") : "Inconnu";
      variant = "outlined";
    }
    return <Chip label={label} color={color} size="small" variant={variant} sx={{textTransform: 'capitalize', minWidth: '100px'}}/>;
  };

  const handleSortRequest = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
    // fetchDeliveryRequests will be called by useEffect due to orderBy/order change
  };

  const handleToggleExpand = (requestId) => {
    setExpandedRequestId(expandedRequestId === requestId ? null : requestId);
  };

  const handleFilterChange = (event) => {
    setStatusFilter(event.target.value);
    // fetchDeliveryRequests will be called by useEffect due to statusFilter change
  };


  if (isLoading && deliveryRequests.length === 0) {
    return (
      <AdminLayout>
        <Container sx={{ py: { xs: 2, sm: 3 }, textAlign: "center" }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Chargement des demandes de livraison...</Typography>
        </Container>
      </AdminLayout>
    );
  }

  // Error display remains, but Alert needs to be MuiAlert if Snackbar uses Alert
  if (error && !isLoading) { // Show general error if not loading and error exists
    return (
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
          <Alert severity="error">{error}</Alert> {/* This should be MuiAlert or ensure no name conflict */}
        </Container>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Fade in={true} timeout={600}>
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600, display:'flex', alignItems:'center' }}>
            <DeliveryIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: "2.5rem" }} />
          Gestion des Demandes de Livraison
        </Typography>
        <IconButton onClick={fetchDeliveryRequests} color="primary" disabled={isLoading}>
            <Tooltip title="Rafraîchir les données">
                <RefreshIcon />
            </Tooltip>
        </IconButton>
      </Box>

      {error && !isLoading && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>} {/* Show specific fetch error here if any, even if table has old data */}

      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="status-filter-label">Filtrer par statut</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            label="Filtrer par statut"
            onChange={handleFilterChange}
            IconComponent={FilterListIcon}
          >
            <MenuItem value=""><em>Tous les statuts</em></MenuItem>
            {STATUS_OPTIONS_FOR_SELECT.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {isLoading && <CircularProgress sx={{display: 'block', margin: 'auto', mb:2}}/>}

      <TableContainer component={Paper}>
        <Table stickyHeader sx={{ minWidth: 900 }}> {/* stickyHeader is good for long tables */}
          <TableHead>
            <TableRow>
              <TableCell sx={{width: '2%', padding: '8px'}}/> {/* Expand icon */}
              <TableCell sortDirection={orderBy === "id" ? order : false} sx={{width: '10%'}}>
                <TableSortLabel active={orderBy === "id"} direction={orderBy === "id" ? order : "asc"} onClick={() => handleSortRequest("id")}>
                  ID Demande
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "familyId" ? order : false} sx={{width: '10%'}}>
                 <TableSortLabel active={orderBy === "familyId"} direction={orderBy === "familyId" ? order : "asc"} onClick={() => handleSortRequest("familyId")}>
                    ID Famille
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "vendorId" ? order : false} sx={{width: '15%'}}>
                <TableSortLabel active={orderBy === "vendorId"} direction={orderBy === "vendorId" ? order : "asc"} onClick={() => handleSortRequest("vendorId")}>
                    Vendeur
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "status" ? order : false} sx={{width: '15%'}}>
                <TableSortLabel active={orderBy === "status"} direction={orderBy === "status" ? order : "asc"} onClick={() => handleSortRequest("status")}>
                    Statut
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "finalOrderCost" ? order : false} sx={{width: '10%', textAlign:'right'}}>
                <TableSortLabel active={orderBy === "finalOrderCost"} direction={orderBy === "finalOrderCost" ? order : "asc"} onClick={() => handleSortRequest("finalOrderCost")}>
                    Coût (Final/Initial)
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "createdAt" ? order : false} sx={{width: '15%'}}>
                <TableSortLabel active={orderBy === "createdAt"} direction={orderBy === "createdAt" ? order : "asc"} onClick={() => handleSortRequest("createdAt")}>
                    Créée le
                </TableSortLabel>
              </TableCell>
               <TableCell sortDirection={orderBy === "updatedAt" ? order : false} sx={{width: '15%'}}>
                <TableSortLabel active={orderBy === "updatedAt"} direction={orderBy === "updatedAt" ? order : "asc"} onClick={() => handleSortRequest("updatedAt")}>
                    Mise à jour le
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{width: '8%', textAlign: 'center'}}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deliveryRequests.map((req) => (
              <>
                <TableRow key={req.id} hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                  <TableCell sx={{padding: '0px 4px'}}>
                    <IconButton aria-label="expand row" size="small" onClick={() => handleToggleExpand(req.id)}>
                      {expandedRequestId === req.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell><Tooltip title={req.id}><Chip label={req.id.substring(0, 6) + "..."} size="small" variant="outlined"/></Tooltip></TableCell>
                  <TableCell>{req.familyId ? req.familyId.substring(0,8) + "..." : "N/A"}</TableCell>
                  <TableCell>
                    <Tooltip title={req.vendorId || "Non assigné"}>
                       <span>{vendorNames[req.vendorId] || (req.vendorId ? req.vendorId.substring(0,8)+"..." : "N/A")}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{getStatusChip(req.status)}</TableCell>
                  <TableCell sx={{textAlign:'right', fontWeight: req.finalOrderCost ? 'bold': 'normal'}}>
                    {(req.finalOrderCost !== undefined ? req.finalOrderCost : req.initialOrderCost)?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}
                  </TableCell>
                  <TableCell>{formatTimestamp(req.createdAt)}</TableCell>
                  <TableCell>{formatTimestamp(req.updatedAt)}</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                        <IconButton size="small" onClick={(event) => handleMenuClick(event, req)} disabled={actionLoading && selectedDelivery?.id === req.id}>
                            {actionLoading && selectedDelivery?.id === req.id ? <CircularProgress size={20}/> : <MoreVertIcon fontSize="small" />}
                        </IconButton>
                    </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}> {/* Adjusted colSpan */}
                    <Collapse in={expandedRequestId === req.id} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 1, p:2, backgroundColor: theme.palette.background.accent, borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom component="div" sx={{borderBottom: `1px solid ${theme.palette.divider}`, pb:1, mb:1}}>
                          Détails de la Demande: <Chip label={req.id} size="small"/>
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom><strong>Infos Livraison:</strong></Typography>
                                <Typography variant="body2"><strong>Adresse:</strong> {req.deliveryAddress || "Non spécifiée"}</Typography>
                                <Typography variant="body2"><strong>Date/Heure Souhaitée:</strong> {req.requestedDate || "N/A"} à {req.requestedTime || "N/A"}</Typography>
                                {req.deliveryInstructions && <Typography variant="body2"><strong>Instructions:</strong> {req.deliveryInstructions}</Typography>}

                                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{mt:1}}><strong>Coûts:</strong></Typography>
                                <Typography variant="body2">Coût Initial Estimé: {req.initialOrderCost?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" }) || "N/A"}</Typography>
                                {req.finalOrderCost !== undefined && <Typography variant="body2">Coût Final Confirmé: {req.finalOrderCost?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}</Typography>}
                                <Typography variant="body2">Frais Livraison: {req.deliveryFee?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" }) || "N/A"}</Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom><strong>Notes & Rejets:</strong></Typography>
                                {req.vendorRejectionReason && <Alert severity="warning" dense sx={{mb:1}}><strong>Raison rejet vendeur:</strong> {req.vendorRejectionReason}</Alert>}
                                {req.userRejectionReason && <Alert severity="warning" dense sx={{mb:1}}><strong>Raison rejet client:</strong> {req.userRejectionReason}</Alert>}
                                {req.vendorOverallNote && <Alert severity="info" dense sx={{mb:1}}><strong>Note globale vendeur:</strong> {req.vendorOverallNote}</Alert>}
                            </Grid>
                        </Grid>

                        {req.vendorConfirmedItems && req.vendorConfirmedItems.length > 0 && (
                          <>
                            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight:'medium' }}>Articles Confirmés par Vendeur:</Typography>
                            <TableContainer component={Paper} sx={{maxHeight: 200, overflowY:'auto'}}>
                                <Table size="small" aria-label="confirmed items" dense>
                                <TableHead sx={{backgroundColor: alpha(theme.palette.primary.main, 0.05)}}>
                                    <TableRow>
                                    <TableCell>Article</TableCell>
                                    <TableCell align="right">Qté</TableCell>
                                    <TableCell align="right">Prix Orig.</TableCell>
                                    <TableCell align="right">Prix Conf.</TableCell>
                                    <TableCell>Note Vendeur</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {req.vendorConfirmedItems.map(item => (
                                    <TableRow key={item.itemId}>
                                        <TableCell component="th" scope="row">{item.name}</TableCell>
                                        <TableCell align="right">{item.quantity} {item.unit}</TableCell>
                                        <TableCell align="right">{item.originalPrice?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}</TableCell>
                                        <TableCell align="right" sx={{fontWeight: item.confirmedPrice !== item.originalPrice ? 'bold' : 'normal', color: item.confirmedPrice > item.originalPrice ? theme.palette.error.main : item.confirmedPrice < item.originalPrice ? theme.palette.success.main : 'inherit'}}>
                                            {item.confirmedPrice?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}
                                        </TableCell>
                                        <TableCell>{item.vendorNote || "-"}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                                </Table>
                            </TableContainer>
                          </>
                        )}

                        {req.statusHistory && req.statusHistory.length > 0 && (
                           <>
                            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight:'medium' }}>Historique des Statuts:</Typography>
                            <Paper sx={{maxHeight: 150, overflowY:'auto', p:1}}>
                                <List dense disablePadding>
                                {req.statusHistory.slice().sort((a,b) => b.timestamp.seconds - a.timestamp.seconds).map((entry, index) => (
                                    <ListItem key={index} disableGutters dense sx={{borderBottom: index !== req.statusHistory.length -1 ? `1px dashed ${theme.palette.divider}`: 'none', pb:0.5, mb:0.5}}>
                                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{width:'100%'}}>
                                        <Chip label={entry.status.replace(/_/g, " ")} size="small" sx={{mr:1, textTransform:'capitalize', fontSize:'0.7rem', height:'auto', minWidth: '120px', textAlign:'center', display:'inline-flex'}} color={getStatusChip(entry.status).props.color || 'default'}/>
                                        <Typography variant="caption" sx={{fontSize:'0.7rem'}}> {formatTimestamp(entry.timestamp)}</Typography>
                                        <Typography variant="caption" sx={{fontSize:'0.7rem', ml:0.5, fontStyle:'italic'}}> (par: {entry.changedBy || 'Système'})</Typography>
                                      </Stack>
                                    </ListItem>
                                ))}
                                </List>
                            </Paper>
                           </>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </>
            ))}
             {deliveryRequests.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', p:3 }}>
                  Aucune demande de livraison ne correspond à vos filtres.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleOpenStatusUpdateDialog}>
          <EditNoteIcon sx={{ mr: 1 }} fontSize="small" /> Mettre à jour Statut {/* Changed Icon */}
        </MenuItem>
      </Menu>

      <Dialog open={statusUpdateDialogOpen} onClose={handleCloseStatusUpdateDialog} fullWidth maxWidth="xs">
        <DialogTitle>Mettre à jour le Statut</DialogTitle>
        <DialogContent>
          <Box sx={{mt: 1}}>
            <Typography variant="body2" gutterBottom>
                ID Demande: <Chip label={selectedDelivery?.id.substring(0,8)+"..."} size="small"/>
            </Typography>
            <Typography variant="body2" gutterBottom sx={{display:'flex', alignItems:'center'}}>
                Statut Actuel: {selectedDelivery ? getStatusChip(selectedDelivery.status) : null}
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="status-select-label">Nouveau Statut</InputLabel>
              <Select
                labelId="status-select-label"
                id="status-select"
                value={selectedStatusToUpdate}
                label="Nouveau Statut"
                onChange={handleStatusChange} // handleStatusChange sets selectedStatusToUpdate (which is a key)
              >
                {STATUS_OPTIONS_FOR_SELECT.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label} {/* Display user-friendly admin label */}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{p:{xs:2, sm:3}}}> {/* Responsive padding */}
          <Button onClick={handleCloseStatusUpdateDialog} disabled={actionLoading}>Annuler</Button>
          <Button onClick={handleConfirmStatusUpdate} variant="contained" disabled={actionLoading || !selectedStatus}>
            {actionLoading ? <CircularProgress size={24} /> : "Sauvegarder"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>

      </Container>
    </Fade>
    </AdminLayout>
  )
}

export default AdminDeliveryManagement
