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
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText, // Added for consistency
  DialogActions,
  Button,
  Snackbar,
  useTheme,
  alpha,
  FormControl, // Added
  InputLabel,  // Added
  Select,      // Added
  MenuItem,    // Added
} from "@mui/material"
import {
  Storefront as StoreIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  ToggleOn as ActivateIcon,
  ToggleOff as DeactivateIcon,
  Delete as DeleteIcon,
  AddCircleOutline as AddIcon, // Added
  Edit as EditIcon, // Added
} from "@mui/icons-material"
import { db } from "../../firebaseConfig"
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore" // Added addDoc
import AdminLayout from "../../components/AdminLayout.jsx" // Added AdminLayout

const initialVendorFormState = {
  name: "",
  phone: "",
  baseFee: "",
  // isApproved and isActive will be managed by separate actions
  vendorType: "",
};

function AdminVendorManagement() {
  const theme = useTheme()
  const [vendors, setVendors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("") // For general page errors
  const [actionError, setActionError] = useState("") // For specific action errors
  const [actionLoading, setActionLoading] = useState(false) // For specific action loading

  // Menu and Dialog states
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedVendor, setSelectedVendor] = useState(null) // For actions menu
  const [confirmActionDialog, setConfirmActionDialog] = useState({ open: false, title: "", message: "", action: null, vendor: null }) // Renamed for clarity
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })

  // Form Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [currentVendorForm, setCurrentVendorForm] = useState(initialVendorFormState);
  const [isEditingVendor, setIsEditingVendor] = useState(false);


  const fetchVendors = async () => {
    setIsLoading(true)
    setError("")
    try {
      const vendorsSnapshot = await getDocs(collection(db, "vendors"))
      const vendorsData = vendorsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setVendors(vendorsData)
    } catch (err) {
      console.error("Erreur lors du chargement des vendeurs:", err)
      setError("Erreur lors du chargement des vendeurs. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
  }, [])

  const handleMenuClick = (event, vendor) => {
    setAnchorEl(event.currentTarget)
    setSelectedVendor(vendor)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    // Keep selectedVendor until dialog is closed or action is done
  }

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const openConfirmDialog = (action, vendorToConfirm) => {
    let dialogDetails = { title: "Confirmer l'action", message: "Êtes-vous sûr?" };
    switch (action) {
      case "approve":
        dialogDetails = { title: "Approuver le Vendeur", message: `Êtes-vous sûr de vouloir approuver ${vendorToConfirm.name}?` };
        break;
      case "reject":
        dialogDetails = { title: "Rejeter le Vendeur", message: `Êtes-vous sûr de vouloir rejeter ${vendorToConfirm.name}? Cela le marquera comme inactif.` };
        break;
      case "activate":
        dialogDetails = { title: "Activer le Vendeur", message: `Êtes-vous sûr de vouloir activer ${vendorToConfirm.name}?` };
        break;
      case "deactivate":
        dialogDetails = { title: "Désactiver le Vendeur", message: `Êtes-vous sûr de vouloir désactiver ${vendorToConfirm.name}?` };
        break;
      case "delete":
        dialogDetails = { title: "Supprimer le Vendeur", message: `Êtes-vous sûr de vouloir supprimer ${vendorToConfirm.name}? Cette action est irréversible.` };
        break;
      default:
        break;
    }
    setConfirmActionDialog({ open: true, ...dialogDetails, action, vendor: vendorToConfirm });
    handleMenuClose(); // Close menu when dialog opens
  }

  const handleCloseConfirmActionDialog = () => {
    setConfirmActionDialog({ open: false, title: "", message: "", action: null, vendor: null });
    setSelectedVendor(null);
  }

  const handleConfirmVendorAction = async () => { // Renamed from handleVendorAction
    if (!confirmActionDialog.vendor || !confirmActionDialog.action) return;

    const vendor = confirmActionDialog.vendor;
    const action = confirmActionDialog.action;

    setActionLoading(true);
    setActionError(""); // Clear previous action errors

    try {
      const vendorRef = doc(db, "vendors", vendor.id);
      let successMessage = "";

      switch (action) {
        case "approve":
          await updateDoc(vendorRef, { isApproved: true, isActive: true });
          successMessage = `Vendeur ${vendor.name} approuvé et activé.`;
          break;
        case "reject":
          await updateDoc(vendorRef, { isApproved: false, isActive: false });
          successMessage = `Vendeur ${vendor.name} rejeté et désactivé.`;
          break;
        case "activate":
          await updateDoc(vendorRef, { isActive: true });
          successMessage = `Vendeur ${vendor.name} activé.`;
          break;
        case "deactivate":
          await updateDoc(vendorRef, { isActive: false });
          successMessage = `Vendeur ${vendor.name} désactivé.`;
          break;
        case "delete":
          await deleteDoc(vendorRef);
          successMessage = `Vendeur ${vendor.name} supprimé.`;
          break;
        default:
          throw new Error("Action inconnue.");
      }
      showSnackbar(successMessage, "success");
      fetchVendors();
    } catch (err) {
      console.error(`Erreur lors de l'action '${action}' sur le vendeur:`, err);
      // setActionError might not be useful if snackbar shows error
      showSnackbar(`Erreur lors de l'action sur le vendeur: ${err.message}`, "error");
    } finally {
      setActionLoading(false);
      handleCloseConfirmActionDialog();
    }
  };

  // --- Form Dialog Functions ---
  const handleOpenFormDialog = (vendorToEdit = null) => {
    if (vendorToEdit) {
      setCurrentVendorForm({
        id: vendorToEdit.id,
        name: vendorToEdit.name,
        phone: vendorToEdit.phone,
        baseFee: vendorToEdit.baseFee || "",
        vendorType: vendorToEdit.vendorType || "" // Populate vendorType
      });
      setIsEditingVendor(true);
    } else {
      setCurrentVendorForm(initialVendorFormState);
      setIsEditingVendor(false);
    }
    setFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setFormDialogOpen(false);
    // setCurrentVendorForm(initialVendorFormState); // Reset form if needed, or on open
  };

  const handleFormInputChange = (event) => {
    const { name, value } = event.target;
    setCurrentVendorForm({ ...currentVendorForm, [name]: value });
  };

  const handleSubmitVendorForm = async () => {
    const { name, phone, baseFee, vendorType } = currentVendorForm; // Added vendorType
    if (!name.trim() || !phone.trim() || !baseFee || !vendorType) { // Added vendorType validation
      showSnackbar("Veuillez remplir tous les champs requis (Nom, Téléphone, Frais de base, Type de vendeur).", "error");
      return;
    }
    const fee = parseFloat(baseFee);
    if (isNaN(fee) || fee < 0) {
        showSnackbar("Les frais de base doivent être un nombre positif.", "error");
        return;
    }

    setActionLoading(true);
    try {
      if (isEditingVendor) {
        if (!currentVendorForm.id) {
          showSnackbar("Erreur: ID du vendeur manquant pour la mise à jour.", "error");
          setActionLoading(false);
          return;
        }
        const vendorRef = doc(db, "vendors", currentVendorForm.id);
        await updateDoc(vendorRef, {
          name: name.trim(),
          phone: phone.trim(),
          baseFee: fee,
          vendorType: vendorType, // Added vendorType
          // isApproved and isActive are managed by separate actions
        });
        showSnackbar("Vendeur mis à jour avec succès!", "success");
      } else {
        // Add new vendor
        await addDoc(collection(db, "vendors"), {
          name: name.trim(),
          phone: phone.trim(),
          baseFee: fee,
          vendorType: vendorType, // Added vendorType
          isApproved: false, // Default for new vendors
          isActive: false,   // Default for new vendors
          createdAt: new Date(), // Optional: timestamp
        });
        showSnackbar("Nouveau vendeur ajouté avec succès!", "success");
      }
      handleCloseFormDialog();
      fetchVendors(); // Refresh list
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du vendeur:", err);
      showSnackbar("Erreur lors de la sauvegarde du vendeur.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, textAlign: "center" }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Chargement des vendeurs...</Typography>
        </Container>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
          <StoreIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: "2.5rem" }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Gestion des Vendeurs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenFormDialog()}
        >
          Ajouter Vendeur
        </Button>
      </Box>

      {/* {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>} */} {/* Snackbar handles errors now */}

      {vendors.length === 0 && !isLoading && !actionLoading ? (
        <Typography>Aucun vendeur trouvé.</Typography>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Table sx={{ minWidth: 750 }} aria-label="vendors table">
            <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Nom</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Téléphone</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Type de Vendeur</TableCell> {/* Added */}
                <TableCell sx={{ fontWeight: "bold" }}>Frais de base</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Approbation</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Activité</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{vendor.name}</TableCell>
                  <TableCell>{vendor.phone}</TableCell>
                  <TableCell> {/* Added for vendorType */}
                    {vendor.vendorType === "individual_shopper" ? "Individuel" : vendor.vendorType === "storefront" ? "Magasin" : "N/A"}
                  </TableCell>
                  <TableCell>
                    {vendor.baseFee?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" }) || "N/A"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={vendor.isApproved ? "Approuvé" : "En attente"}
                      color={vendor.isApproved ? "success" : "warning"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={vendor.isActive ? "Actif" : "Inactif"}
                      color={vendor.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <IconButton onClick={(e) => handleMenuClick(e, vendor)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ elevation: 1, sx: { boxShadow: theme.shadows[2] } }}
      >
        <MenuItem onClick={() => handleOpenFormDialog(selectedVendor)}>
            <EditIcon sx={{mr:1}} fontSize="small" /> Modifier
        </MenuItem>
        {selectedVendor && !selectedVendor.isApproved && (
          <MenuItem onClick={() => openConfirmDialog("approve", selectedVendor)}>
            <ApproveIcon sx={{ mr: 1 }} fontSize="small" /> Approuver
          </MenuItem>
        )}
        {selectedVendor && selectedVendor.isApproved && (
          <MenuItem onClick={() => openConfirmDialog("reject", selectedVendor)}>
            <RejectIcon sx={{ mr: 1 }} fontSize="small" /> Rejeter
          </MenuItem>
        )}
        {selectedVendor && selectedVendor.isActive && (
          <MenuItem onClick={() => openConfirmDialog("deactivate", selectedVendor)}>
            <DeactivateIcon sx={{ mr: 1 }} fontSize="small" /> Désactiver
          </MenuItem>
        )}
        {selectedVendor && !selectedVendor.isActive && selectedVendor.isApproved && (
          <MenuItem onClick={() => openConfirmDialog("activate", selectedVendor)}>
            <ActivateIcon sx={{ mr: 1 }} fontSize="small" /> Activer
          </MenuItem>
        )}
         <MenuItem onClick={() => openConfirmDialog("delete", selectedVendor)} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" /> Supprimer
        </MenuItem>
      </Menu>

      {/* Confirmation Dialog for Actions (Approve, Reject, Activate, Deactivate, Delete) */}
      <Dialog
        open={confirmActionDialog.open}
        onClose={handleCloseConfirmActionDialog}
      >
        <DialogTitle>{confirmActionDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmActionDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmActionDialog}>Annuler</Button>
          <Button onClick={handleConfirmVendorAction} color="primary" autoFocus disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={24} /> : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Vendor Form Dialog */}
      <Dialog open={formDialogOpen} onClose={handleCloseFormDialog} fullWidth maxWidth="sm">
        <DialogTitle>{isEditingVendor ? "Modifier le Vendeur" : "Ajouter un Nouveau Vendeur"}</DialogTitle>
        <DialogContent sx={{pt:1}}>
            {/* Added FormControl and Select for vendorType */}
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }} required>
                <InputLabel id="vendor-type-dialog-label">Type de vendeur</InputLabel>
                <Select
                    labelId="vendor-type-dialog-label"
                    name="vendorType"
                    value={currentVendorForm.vendorType}
                    onChange={handleFormInputChange}
                    label="Type de vendeur"
                >
                    <MenuItem value="individual_shopper">Vendeur individuel / Shopper personnel</MenuItem>
                    <MenuItem value="storefront">Magasin / Boutique établie</MenuItem>
                </Select>
            </FormControl>
            <TextField
                autoFocus
                margin="dense"
                name="name"
                label="Nom du Vendeur"
                type="text"
                fullWidth
                variant="outlined"
                value={currentVendorForm.name}
                onChange={handleFormInputChange}
                required
                sx={{ mb: 2 }}
            />
            <TextField
                margin="dense"
                name="phone"
                label="Téléphone"
                type="tel"
                fullWidth
                variant="outlined"
                value={currentVendorForm.phone}
                onChange={handleFormInputChange}
                required
                sx={{ mb: 2 }}
            />
            <TextField
                margin="dense"
                name="baseFee"
                label="Frais de base (XAF)"
                type="number"
                fullWidth
                variant="outlined"
                value={currentVendorForm.baseFee}
                onChange={handleFormInputChange}
                required
                InputProps={{ inputProps: { min: 0 } }}
                sx={{ mb: 2 }} // Added margin bottom for spacing
            />
        </DialogContent>
        <DialogActions sx={{p:3}}>
            <Button onClick={handleCloseFormDialog} color="secondary">Annuler</Button>
            <Button onClick={handleSubmitVendorForm} variant="contained" color="primary" disabled={actionLoading}>
                {actionLoading ? <CircularProgress size={24} /> : (isEditingVendor ? "Sauvegarder" : "Ajouter")}
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
    </AdminLayout>
  )
}

export default AdminVendorManagement
