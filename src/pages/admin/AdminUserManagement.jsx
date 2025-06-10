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
  DialogContentText,
  DialogTitle,
  Button,
  Snackbar,
  Fade, // Added Fade
  alpha, // Added alpha
} from "@mui/material"
import { People as PeopleIcon, MoreVert as MoreVertIcon } from "@mui/icons-material"
import { db } from "../../firebaseConfig" // Assuming firebaseConfig is correctly set up
import { triggerSendNotification } from '../../utils/notificationUtils';
import { getCurrentUserFCMToken } from '../../utils/authUtils';
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import AdminLayout from "../../components/AdminLayout.jsx" // Added AdminLayout

function AdminUserManagement() {
  const theme = useTheme()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [dialogConfig, setDialogConfig] = useState({ title: "", message: "", action: null })
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })
  const [actionLoading, setActionLoading] = useState(false)


  const fetchUsers = async () => {
    setIsLoading(true)
    setError("")
    try {
      const usersSnapshot = await getDocs(collection(db, "users"))
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setUsers(usersData)
    } catch (err) {
      console.error("Erreur lors du chargement des utilisateurs:", err)
      setError("Erreur lors du chargement des utilisateurs. Vérifiez la console pour plus de détails.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleMenuClick = (event, user) => {
    setAnchorEl(event.currentTarget)
    setSelectedUser(user)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedUser(null)
  }

  const handleOpenConfirmDialog = (actionType, user) => {
    setSelectedUser(user) // Ensure selectedUser is set for the dialog
    let title = "Confirmer l'action"
    let message = `Êtes-vous sûr de vouloir continuer ?`

    if (actionType === "toggleStatus") {
      title = user.disabled ? "Activer l'utilisateur" : "Désactiver l'utilisateur"
      message = `Êtes-vous sûr de vouloir ${user.disabled ? "activer" : "désactiver"} l'utilisateur ${
        user.displayName || user.email
      } ?`
    } else if (actionType === "toggleAdmin") {
      title = user.isAdmin ? "Retirer les droits Admin" : "Promouvoir en Admin"
      message = `Êtes-vous sûr de vouloir ${user.isAdmin ? "retirer les droits d'administrateur à" : "promouvoir"} ${
        user.displayName || user.email
      } ${user.isAdmin ? "" : "en administrateur"} ?`
    } else if (actionType === "deleteUser") {
      title = "Supprimer l'utilisateur";
      message = `Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur ${
        user.displayName || user.email
      } ? Cette action est irréversible.`;
    }

    setDialogConfig({ title, message, action: actionType })
    setConfirmDialogOpen(true)
    handleMenuClose()
  }

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false)
    setSelectedUser(null) // Clear selected user when dialog closes
  }

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleToggleAccountStatus = async () => {
    if (!selectedUser) return

    setActionLoading(true)
    handleCloseConfirmDialog() // Close dialog first

    try {
      const userRef = doc(db, "users", selectedUser.id)
      await updateDoc(userRef, {
        disabled: !selectedUser.disabled,
      })
      showSnackbar(
        `Utilisateur ${selectedUser.disabled ? "activé" : "désactivé"} avec succès.`,
        "success"
      )
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Statut Utilisateur Modifié",
          `Le statut de ${selectedUser.displayName || selectedUser.email} a été ${selectedUser.disabled ? "activé" : "désactivé"}.`
        );
      }
      fetchUsers() // Refresh data
    } catch (err) {
      console.error("Erreur lors du changement de statut:", err)
      showSnackbar("Erreur lors du changement de statut.", "error")
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Échec Modification Statut",
          `Erreur lors de la modification du statut de ${selectedUser.displayName || selectedUser.email}: ${err.message}`
        );
      }
    } finally {
      setActionLoading(false)
      setSelectedUser(null) // Clear selected user
    }
  }

  const handleConfirmAction = async () => {
    if (!selectedUser || !dialogConfig.action) return;

    if (dialogConfig.action === "toggleStatus") {
      await handleToggleAccountStatus();
    } else if (dialogConfig.action === "toggleAdmin") {
      await handleToggleAdminRole();
    } else if (dialogConfig.action === "deleteUser") {
      await handleDeleteUser();
    }
    // handleCloseConfirmDialog(); // Already called within specific handlers or should be if not
  };

  const handleToggleAdminRole = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    handleCloseConfirmDialog();

    try {
      const userRef = doc(db, "users", selectedUser.id);
      await updateDoc(userRef, {
        isAdmin: !selectedUser.isAdmin, // Assuming an isAdmin boolean field
        // If using a roles array:
        // roles: selectedUser.isAdmin
        //          ? firebase.firestore.FieldValue.arrayRemove('admin')
        //          : firebase.firestore.FieldValue.arrayUnion('admin')
      });
      showSnackbar(
        `Rôle Admin ${selectedUser.isAdmin ? "retiré de" : "attribué à"} ${selectedUser.displayName || selectedUser.email} avec succès.`,
        "success"
      );
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Rôle Admin Modifié",
          `Le rôle admin pour ${selectedUser.displayName || selectedUser.email} a été ${selectedUser.isAdmin ? "retiré" : "attribué"}.`
        );
      }
      fetchUsers(); // Refresh data
    } catch (err) {
      console.error("Erreur lors du changement de rôle Admin:", err);
      showSnackbar("Erreur lors du changement de rôle Admin.", "error");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Échec Modification Rôle Admin",
          `Erreur lors de la modification du rôle admin pour ${selectedUser.displayName || selectedUser.email}: ${err.message}`
        );
      }
    } finally {
      setActionLoading(false);
      setSelectedUser(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    handleCloseConfirmDialog();

    try {
      await deleteDoc(doc(db, "users", selectedUser.id));
      showSnackbar(
        `Utilisateur ${selectedUser.displayName || selectedUser.email} supprimé avec succès.`,
        "success"
      );
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Utilisateur Supprimé",
          `L'utilisateur ${selectedUser.displayName || selectedUser.email} a été supprimé.`
        );
      }
      fetchUsers(); // Refresh data
    } catch (err) {
      console.error("Erreur lors de la suppression de l'utilisateur:", err);
      showSnackbar("Erreur lors de la suppression de l'utilisateur.", "error");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Échec Suppression Utilisateur",
          `Erreur lors de la suppression de ${selectedUser.displayName || selectedUser.email}: ${err.message}`
        );
      }
    } finally {
      setActionLoading(false);
      setSelectedUser(null);
    }
  };

  if (isLoading || actionLoading) {
    return (
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, textAlign: "center" }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>
            {actionLoading ? "Traitement en cours..." : "Chargement des utilisateurs..."}
          </Typography>
        </Container>
      </AdminLayout>
    )
  }

  if (error && !isLoading) { // Show error only if not initial loading
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
      <Fade in={true} timeout={600}>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
          <Box sx={{ mb: 4, display: "flex", alignItems: "center" }}>
            <PeopleIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: "2.5rem" }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Gestion des Utilisateurs
        </Typography>
      </Box>

      {users.length === 0 && !isLoading && !actionLoading ? (
        <Typography sx={{ textAlign: "center", mt: 4 }}>Aucun utilisateur trouvé.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 750 }} aria-label="simple table"> {/* Increased minWidth for Actions */}
            <TableHead sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>UID</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Nom d'affichage</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Rôles</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Statut</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {user.uid || user.id}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.displayName || "N/A"}</TableCell>
                  <TableCell>
                    {user.isAdmin ? (
                      <Chip label="Admin" color="secondary" size="small" />
                    ) : user.roles && user.roles.length > 0 ? (
                      user.roles.map((role, index) => (
                        <Chip key={index} label={role} size="small" sx={{ mr: 0.5 }} />
                      ))
                    ) : (
                      <Chip label="Utilisateur" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.disabled ? "Désactivé" : "Activé"}
                      color={user.disabled ? "error" : "success"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      aria-label="actions"
                      onClick={(event) => handleMenuClick(event, user)}
                    >
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
        <MenuItem onClick={() => handleOpenConfirmDialog("toggleAdmin", selectedUser)}>
          {selectedUser?.isAdmin ? "Retirer Admin" : "Promouvoir Admin"}
        </MenuItem>
        <MenuItem onClick={() => handleOpenConfirmDialog("toggleStatus", selectedUser)}>
          {selectedUser?.disabled ? "Activer Compte" : "Désactiver Compte"}
        </MenuItem>
        <MenuItem onClick={() => handleOpenConfirmDialog("deleteUser", selectedUser)} sx={{color: "error.main"}}>
          Supprimer Utilisateur
        </MenuItem>
      </Menu>

      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{dialogConfig.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {dialogConfig.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog}>Annuler</Button>
          <Button onClick={handleConfirmAction} color="primary" autoFocus disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={24} /> : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
        >
            {snackbar.message}
        </Alert>
      </Snackbar>

      </Container>
    </Fade>
    </AdminLayout>
  )
}

export default AdminUserManagement
