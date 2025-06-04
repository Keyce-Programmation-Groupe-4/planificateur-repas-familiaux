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
  Avatar,
  useTheme,
  Link,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Snackbar, // Added for feedback
} from "@mui/material"
import {
  RestaurantMenu as RestaurantMenuIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom" // Added for navigation
import { db } from "../../firebaseConfig"
import { collection, getDocs, orderBy, query, doc, deleteDoc } from "firebase/firestore" // Added doc, deleteDoc
import { format } from "date-fns" // For formatting dates

function AdminRecipeManagement() {
  const theme = useTheme()
  const navigate = useNavigate() // Hook for navigation
  const [recipes, setRecipes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState(false) // For delete operation

  // State for Menu, Dialog, Snackbar
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [dialogConfig, setDialogConfig] = useState({ title: "", message: "", action: null })
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })

  const fetchRecipes = async () => {
    setIsLoading(true)
    setError("")
    try {
      const recipesQuery = query(collection(db, "recipes"), orderBy("createdAt", "desc"))
      const recipesSnapshot = await getDocs(recipesQuery)
      const recipesData = recipesSnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? format(data.createdAt.toDate(), "dd/MM/yyyy HH:mm") : "Date inconnue",
        }
      })
      setRecipes(recipesData)
    } catch (err) {
      console.error("Erreur lors du chargement des recettes:", err)
      setError("Erreur lors du chargement des recettes. Vérifiez la console pour plus de détails.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecipes()
  }, [])

  const handleMenuClick = (event, recipe) => {
    setAnchorEl(event.currentTarget)
    setSelectedRecipe(recipe)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedRecipe(null)
  }

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity })
  }

  const handleOpenConfirmDialog = (recipe) => {
    setDialogConfig({
      title: "Confirmer la suppression",
      message: `Êtes-vous sûr de vouloir supprimer la recette "${recipe.name}" ? Cette action est irréversible.`,
      action: "deleteRecipe",
    })
    setSelectedRecipe(recipe) // Ensure selectedRecipe is set for dialog
    setConfirmDialogOpen(true)
    handleMenuClose()
  }

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false)
    setSelectedRecipe(null)
  }

  const handleDeleteRecipe = async () => {
    if (!selectedRecipe) return

    setActionLoading(true)
    handleCloseConfirmDialog()

    try {
      const recipeRef = doc(db, "recipes", selectedRecipe.id)
      await deleteDoc(recipeRef)
      showSnackbar(`Recette "${selectedRecipe.name}" supprimée avec succès.`, "success")
      fetchRecipes() // Refresh data
    } catch (err) {
      console.error("Erreur lors de la suppression de la recette:", err)
      showSnackbar("Erreur lors de la suppression de la recette.", "error")
    } finally {
      setActionLoading(false)
      setSelectedRecipe(null)
    }
  }

  const handleConfirmAction = async () => {
    if (!selectedRecipe || !dialogConfig.action) return;

    if (dialogConfig.action === "deleteRecipe") {
      await handleDeleteRecipe();
    }
  };

  const handleViewDetails = (recipeId) => {
    navigate(`/recipes/${recipeId}`);
    handleMenuClose();
  }

  const handleEditRecipe = (recipeId) => {
    navigate(`/recipes/${recipeId}/edit`);
    handleMenuClose();
  }


  if (isLoading || actionLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          {actionLoading ? "Traitement en cours..." : "Chargement des recettes..."}
        </Typography>
      </Container>
    )
  }

  if (error && !isLoading) { // Show error only if not initial loading
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}> {/* Using xl for potentially wider table */}
      <Box sx={{ mb: 4, display: "flex", alignItems: "center" }}>
        <RestaurantMenuIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: "2.5rem" }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Gestion des Recettes
        </Typography>
      </Box>

      {recipes.length === 0 && !isLoading && !actionLoading ? (
        <Typography sx={{ textAlign: "center", mt: 4 }}>Aucune recette trouvée.</Typography>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Table sx={{ minWidth: 900 }} aria-label="recipes table">
            <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", width: "5%" }}>Image</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "30%" }}>Nom de la Recette</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "15%" }}>Créateur (ID)</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "15%" }}>Date de Création</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "15%" }}>Visibilité</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "10%" }}>Source</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "10%", textAlign: "center" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recipes.map((recipe) => (
                <TableRow
                  key={recipe.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 }, '&:hover': { backgroundColor: theme.palette.action.hover } }}
                >
                  <TableCell>
                    <Avatar
                      src={recipe.imageUrl || undefined}
                      alt={recipe.name}
                      variant="rounded"
                      sx={{ width: 56, height: 56, bgcolor: recipe.imageUrl ? 'transparent' : theme.palette.grey[300] }}
                    >
                      {!recipe.imageUrl && <RestaurantMenuIcon fontSize="small" />}
                    </Avatar>
                  </TableCell>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                    {recipe.name || "Sans nom"}
                  </TableCell>
                  <TableCell>{recipe.createdBy || "Inconnu"}</TableCell>
                  <TableCell>{recipe.createdAt}</TableCell>
                  <TableCell>
                    {recipe.isPublic !== undefined ? (
                       <Chip
                        label={recipe.isPublic ? "Publique" : "Privée"}
                        color={recipe.isPublic ? "success" : "default"}
                        size="small"
                        variant="outlined"
                      />
                    ) : recipe.visibility ? ( // Fallback for older 'visibility' field
                      <Chip
                        label={recipe.visibility}
                        color={recipe.visibility === "public" ? "success" : "default"}
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      <Chip label="N/D" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {recipe.sourceUrl ? (
                      <Link href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" sx={{fontSize: '0.8rem'}}>
                        Voir Source
                      </Link>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <IconButton
                      aria-label="actions"
                      onClick={(event) => handleMenuClick(event, recipe)}
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
        PaperProps={{ elevation: 1, sx: { boxShadow: theme.shadows[2], mt: 0.5 } }}
      >
        <MenuItem onClick={() => handleViewDetails(selectedRecipe.id)}>
          <VisibilityIcon sx={{ mr: 1 }} fontSize="small" />
          Voir Détails
        </MenuItem>
        <MenuItem onClick={() => handleEditRecipe(selectedRecipe.id)}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Modifier
        </MenuItem>
        <MenuItem onClick={() => handleOpenConfirmDialog(selectedRecipe)} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Supprimer
        </MenuItem>
      </Menu>

      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
      >
        <DialogTitle>{dialogConfig.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogConfig.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog}>Annuler</Button>
          <Button onClick={handleConfirmAction} color="error" autoFocus disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={24} /> : "Confirmer la Suppression"}
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
  )
}

export default AdminRecipeManagement
