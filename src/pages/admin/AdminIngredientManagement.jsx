"use client"

import { useState, useEffect } from "react"
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  DialogContentText,
  Alert,
  Chip,
  useTheme,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Snackbar,
  Alert as MuiAlert, // Renaming Alert to MuiAlert to avoid conflict with Snackbar's Alert
  Box,
  IconButton, // Added
  Menu, // Added
  MenuItem, // Added
  alpha, // Added alpha
  Fade, // Added Fade
} from "@mui/material"
import {
  AddCircleOutline as AddIcon,
  LocalGroceryStore as IngredientIcon,
  MoreVert as MoreVertIcon, // Added
  Edit as EditIcon, // Added
  Delete as DeleteIcon, // Added
} from "@mui/icons-material"
import { db } from "../../firebaseConfig"
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"
import AdminLayout from "../../components/AdminLayout.jsx" // Added AdminLayout
import { triggerSendNotification } from '../../utils/notificationUtils';
import { getCurrentUserFCMToken } from '../../utils/authUtils';

const initialIngredientState = {
  name: "",
  category: "",
  unit: "",
};

function AdminIngredientManagement() {
  const theme = useTheme()
  const [ingredients, setIngredients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentIngredient, setCurrentIngredient] = useState(initialIngredientState)
  const [isEditing, setIsEditing] = useState(false)

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })

  // Menu state for row actions
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedIngredient, setSelectedIngredient] = useState(null);


  // Confirmation Dialog state (for delete)
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  // Using selectedIngredient for delete target, so no separate deleteTargetId needed if selectedIngredient is set before opening confirm dialog.


  const fetchIngredients = async () => {
    setIsLoading(true)
    setError("")
    try {
      const ingredientsQuery = query(collection(db, "ingredients"), orderBy("name"))
      const ingredientsSnapshot = await getDocs(ingredientsQuery)

      if (ingredientsSnapshot.empty) {
        setIngredients([])
      } else {
        const ingredientsData = ingredientsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setIngredients(ingredientsData)
      }
    } catch (err) {
      console.error("Erreur lors du chargement des ingrédients:", err)
      if (err.code === "failed-precondition" && err.message.includes("indexes")) {
           setError("Erreur d'index Firestore. Veuillez créer l'index requis. Consultez la console.")
      } else {
          setError("Erreur lors du chargement des ingrédients.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchIngredients()
  }, [])

  const handleOpenDialog = (ingredient = null) => {
    if (ingredient) {
      setCurrentIngredient({ id: ingredient.id, name: ingredient.name, category: ingredient.category || '', unit: ingredient.unit || '' });
      setIsEditing(true);
    } else {
      setCurrentIngredient(initialIngredientState);
      setIsEditing(false);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentIngredient(initialIngredientState); // Reset form
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setCurrentIngredient({ ...currentIngredient, [name]: value });
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSubmitIngredient = async () => {
    if (!currentIngredient.name.trim()) {
      showSnackbar("Le nom de l'ingrédient est requis.", "error");
      return;
    }
    setActionLoading(true);
    try {
      if (isEditing) {
        if (!currentIngredient.id) {
          showSnackbar("Erreur: ID de l'ingrédient manquant pour la mise à jour.", "error");
          setActionLoading(false);
          return;
        }
        const ingredientRef = doc(db, "ingredients", currentIngredient.id);
        await updateDoc(ingredientRef, {
          name: currentIngredient.name.trim(),
          category: currentIngredient.category.trim() || null,
          unit: currentIngredient.unit.trim() || null,
        });
        showSnackbar("Ingrédient mis à jour avec succès!", "success");
        const fcmToken = await getCurrentUserFCMToken();
        if (fcmToken) {
          triggerSendNotification(
            fcmToken,
            "Ingrédient Mis à Jour",
            `L'ingrédient "${currentIngredient.name}" a été mis à jour.`
          );
        }
      } else {
        await addDoc(collection(db, "ingredients"), {
          name: currentIngredient.name.trim(),
          category: currentIngredient.category.trim() || null,
          unit: currentIngredient.unit.trim() || null,
        });
        showSnackbar("Ingrédient ajouté avec succès!", "success");
        const fcmToken = await getCurrentUserFCMToken();
        if (fcmToken) {
          triggerSendNotification(
            fcmToken,
            "Ingrédient Ajouté",
            `L'ingrédient "${currentIngredient.name}" a été ajouté.`
          );
        }
      }
      handleCloseDialog();
      fetchIngredients(); // Refresh list
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de l'ingrédient:", err);
      showSnackbar("Erreur lors de la sauvegarde de l'ingrédient.", "error");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          `Échec de la ${isEditing ? "Mise à Jour" : "Création"}`,
          `Erreur en sauvegardant l'ingrédient "${currentIngredient.name}": ${err.message}`
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleMenuOpen = (event, ingredient) => {
    setAnchorEl(event.currentTarget);
    setSelectedIngredient(ingredient);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedIngredient(null);
  };

  const handleEdit = () => {
    if (selectedIngredient) {
      handleOpenDialog(selectedIngredient);
    }
    handleMenuClose();
  };

  const handleOpenConfirmDeleteDialog = () => {
    if (!selectedIngredient) return;
    setConfirmDeleteDialogOpen(true);
    handleMenuClose(); // Close menu when dialog opens
  };

  const handleCloseConfirmDeleteDialog = () => {
    setConfirmDeleteDialogOpen(false);
    // setSelectedIngredient(null); // Keep selectedIngredient for handleDelete if needed, or clear if not
  };

  const handleDeleteIngredient = async () => {
    if (!selectedIngredient || !selectedIngredient.id) {
        showSnackbar("Erreur: Impossible de supprimer l'ingrédient sélectionné.", "error");
        handleCloseConfirmDeleteDialog();
        setSelectedIngredient(null); // Clear it
        return;
    }
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, "ingredients", selectedIngredient.id));
      showSnackbar("Ingrédient supprimé avec succès!", "success");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Ingrédient Supprimé",
          `L'ingrédient "${selectedIngredient.name}" a été supprimé.`
        );
      }
      fetchIngredients(); // Refresh list
    } catch (err) {
      console.error("Erreur lors de la suppression de l'ingrédient:", err);
      showSnackbar("Erreur lors de la suppression de l'ingrédient.", "error");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Échec de la Suppression",
          `Erreur en supprimant l'ingrédient "${selectedIngredient.name}": ${err.message}`
        );
      }
    } finally {
      setActionLoading(false);
      handleCloseConfirmDeleteDialog();
      setSelectedIngredient(null); // Clear selected ingredient after operation
    }
  };


  if (isLoading || actionLoading) { // Combined loading state for initial load and actions
    return (
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, textAlign: "center" }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>
            {actionLoading ? "Traitement en cours..." : "Chargement des ingrédients..."}
          </Typography>
        </Container>
      </AdminLayout>
    )
  }

  if (error && !isLoading) { // Show error only if not initial loading
    return (
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
          <MuiAlert severity="error">{error}</MuiAlert> {/* Use MuiAlert here */}
        </Container>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <Fade in={true} timeout={600}>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
            <IngredientIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: "2.5rem" }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Gestion des Ingrédients
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Ajouter Ingrédient
        </Button>
      </Box>

      {ingredients.length === 0 && !isLoading && !actionLoading ? (
        <Typography sx={{ textAlign: "center", mt: 4 }}>
          Aucun ingrédient trouvé.
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="ingredients table">
            <TableHead sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Nom de l'Ingrédient</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Catégorie</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Unité de Mesure</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ingredients.map((ingredient) => (
                <TableRow
                  key={ingredient.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 }, '&:hover': { backgroundColor: theme.palette.action.hover } }}
                >
                  <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                    {ingredient.name || "N/A"}
                  </TableCell>
                  <TableCell>
                    {ingredient.category ? (
                        <Chip label={ingredient.category} size="small" variant="outlined"/>
                    ) : (
                        <Typography variant="caption" color="textSecondary">N/A</Typography>
                    )}
                    </TableCell>
                  <TableCell>{ingredient.unit || <Typography variant="caption" color="textSecondary">N/A</Typography>}</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <IconButton onClick={(event) => handleMenuOpen(event, ingredient)}>
                        <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Ingredient Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{isEditing ? "Modifier l'Ingrédient" : "Ajouter un Nouvel Ingrédient"}</DialogTitle>
        <DialogContent sx={{pt:1}}> {/* Add padding top if DialogTitle is too close */}
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Nom de l'ingrédient"
            type="text"
            fullWidth
            variant="outlined"
            value={currentIngredient.name}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="category"
            label="Catégorie (ex: Légume, Fruit, Épice)"
            type="text"
            fullWidth
            variant="outlined"
            value={currentIngredient.category}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="unit"
            label="Unité de mesure (ex: kg, g, L, ml, pcs)"
            type="text"
            fullWidth
            variant="outlined"
            value={currentIngredient.unit}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions sx={{p:3}}>
          <Button onClick={handleCloseDialog} color="secondary">Annuler</Button>
          <Button onClick={handleSubmitIngredient} variant="contained" color="primary" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={24} /> : (isEditing ? "Sauvegarder" : "Ajouter")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
          <MuiAlert
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              severity={snackbar.severity}
              elevation={6}
              variant="filled"
              sx={{ width: '100%' }}
          >
              {snackbar.message}
          </MuiAlert>
      </Snackbar>

      {/* Action Menu for table rows */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
            <EditIcon sx={{mr:1}} fontSize="small" /> Modifier
        </MenuItem>
        <MenuItem onClick={handleOpenConfirmDeleteDialog} sx={{color: 'error.main'}}>
            <DeleteIcon sx={{mr:1}} fontSize="small" /> Supprimer
        </MenuItem>
      </Menu>

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={confirmDeleteDialogOpen}
        onClose={handleCloseConfirmDeleteDialog}
      >
        <DialogTitle>Confirmer la Suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer l'ingrédient "{selectedIngredient?.name}"? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDeleteDialog}>Annuler</Button>
          <Button onClick={handleDeleteIngredient} color="error" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={24} /> : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>

      </Container>
    </Fade>
    </AdminLayout>
  )
}

export default AdminIngredientManagement
