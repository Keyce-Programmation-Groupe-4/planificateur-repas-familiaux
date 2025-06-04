"use client"

import { useState, useEffect } from "react"
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Snackbar,
  Select,
  FormControl,
  InputLabel,
  Box as MUIBox, // Renamed Box to MUIBox to avoid conflict with our own Box component if any, or just for clarity
} from "@mui/material"
import { LocalShipping as DeliveryIcon, MoreVert as MoreVertIcon, EditNote as EditStatusIcon } from "@mui/icons-material"
import { db } from "../../firebaseConfig"
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore" // Added doc, updateDoc, serverTimestamp
import { format } from "date-fns" // For formatting dates

function AdminDeliveryManagement() {
  const theme = useTheme()
  const [deliveries, setDeliveries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Menu and Dialog states
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState("")
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })

  const deliveryStatuses = ["Pending", "Processing", "Assigned to Vendor", "Out for Delivery", "Delivered", "Cancelled", "Problem"];


  const fetchDeliveries = async () => {
    setIsLoading(true)
    setError("")
    try {
      const deliveriesQuery = query(collection(db, "deliveryRequests"), orderBy("requestDate", "desc"))
      const deliveriesSnapshot = await getDocs(deliveriesQuery)

      const deliveriesData = deliveriesSnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          requestDate: data.requestDate?.toDate ? format(data.requestDate.toDate(), "dd/MM/yyyy HH:mm") : "Date inconnue",
        }
      })
      setDeliveries(deliveriesData)
    } catch (err) {
      console.error("Erreur lors du chargement des livraisons:", err)
      if (err.code === "failed-precondition" && err.message.includes("indexes")) {
           setError("Erreur d'index Firestore. Veuillez créer l'index requis. Consultez la console.")
      } else {
          setError("Erreur lors du chargement des livraisons.")
      }
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => {
    fetchDeliveries()
  }, [])

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
    setSelectedDelivery(null); // Clear after dialog is closed
    setSelectedStatus("");
  };

  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedDelivery || !selectedStatus) {
      showSnackbar("Aucun statut sélectionné ou livraison non valide.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const deliveryRef = doc(db, "deliveryRequests", selectedDelivery.id);
      await updateDoc(deliveryRef, {
        status: selectedStatus,
        lastUpdatedAt: serverTimestamp(), // Update with server-side timestamp
      });
      showSnackbar("Statut de la livraison mis à jour avec succès!", "success");
      fetchDeliveries(); // Refresh list
    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut:", err);
      showSnackbar("Erreur lors de la mise à jour du statut.", "error");
    } finally {
      setActionLoading(false);
      handleCloseStatusUpdateDialog();
    }
  };

  const getStatusChipColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return { color: "warning", variant: "outlined" };
      case "assigned":
        return { color: "info", variant: "outlined" };
      case "out for delivery":
        return { color: "primary", variant: "filled" };
      case "delivered":
        return { color: "success", variant: "filled" };
      case "cancelled":
        return { color: "error", variant: "outlined" };
      default:
        return { color: "default", variant: "outlined" };
    }
  };


  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          {actionLoading ? "Mise à jour en cours..." : "Chargement des livraisons..."}
        </Typography>
      </Container>
    )
  }

  if (error && !isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <MUIBox sx={{ mb: 4, display: "flex", alignItems: "center" }}>
        <DeliveryIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: "2.5rem" }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Gestion des Livraisons
        </Typography>
      </MUIBox>

      {deliveries.length === 0 && !isLoading && !actionLoading ? (
        <Typography sx={{ textAlign: "center", mt: 4 }}>
          Aucune demande de livraison trouvée.
        </Typography>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Table sx={{ minWidth: 900 }} aria-label="deliveries table">
            <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>ID Demande</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Utilisateur (ID)</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Vendeur (ID)</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Date Demande</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Statut</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Prix Total</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deliveries.map((delivery) => {
                const statusStyle = getStatusChipColor(delivery.status);
                return (
                    <TableRow
                    key={delivery.id}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 }, '&:hover': { backgroundColor: theme.palette.action.hover } }}
                    >
                    <TableCell component="th" scope="row" sx={{fontSize: '0.8rem'}}>
                        {delivery.id}
                    </TableCell>
                    <TableCell sx={{fontSize: '0.8rem'}}>{delivery.userId || "N/A"}</TableCell>
                    <TableCell sx={{fontSize: '0.8rem'}}>{delivery.vendorId || "N/A"}</TableCell>
                    <TableCell>{delivery.requestDate}</TableCell>
                    <TableCell>
                        <Chip
                            label={delivery.status || "Inconnu"}
                            color={statusStyle.color}
                            variant={statusStyle.variant}
                            size="small"
                        />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                        {delivery.totalPrice?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" }) || "N/A"}
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                        <IconButton size="small" onClick={(event) => handleMenuClick(event, delivery)}>
                            <MoreVertIcon fontSize="small" />
                        </IconButton>
                    </TableCell>
                    </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleOpenStatusUpdateDialog}>
          <EditStatusIcon sx={{ mr: 1 }} fontSize="small" /> Mettre à jour Statut
        </MenuItem>
        {/* Add other actions like "View Details" here if needed */}
      </Menu>

      <Dialog open={statusUpdateDialogOpen} onClose={handleCloseStatusUpdateDialog} fullWidth maxWidth="xs">
        <DialogTitle>Mettre à jour le Statut de la Livraison</DialogTitle>
        <DialogContent>
          <MUIBox sx={{mt: 1}}>
            <Typography variant="body2" gutterBottom>
                ID Demande: {selectedDelivery?.id}
            </Typography>
            <Typography variant="body2" gutterBottom>
                Statut Actuel: <Chip
                                label={selectedDelivery?.status || "Inconnu"}
                                {...getStatusChipColor(selectedDelivery?.status)}
                                size="small"
                              />
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="status-select-label">Nouveau Statut</InputLabel>
              <Select
                labelId="status-select-label"
                id="status-select"
                value={selectedStatus}
                label="Nouveau Statut"
                onChange={handleStatusChange}
              >
                {deliveryStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </MUIBox>
        </DialogContent>
        <DialogActions sx={{p:3}}>
          <Button onClick={handleCloseStatusUpdateDialog}>Annuler</Button>
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
  )
}

export default AdminDeliveryManagement
