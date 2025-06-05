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
  Alert, // Keep this for general page errors if needed, or switch to MuiAlert
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
  Snackbar,
  // Input is not directly used, file input is hidden
  Alert as MuiAlert, // For Snackbar messages
  AlertTitle,
  Grid,
} from "@mui/material"
import {
  RestaurantMenu as RestaurantMenuIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  UploadFile as UploadFileIcon,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { parseRecipesFromCSV } from "../../utils/csvUtils.js"; // Using the utility
import { db } from "../../firebaseConfig"
import { collection, getDocs, orderBy, query, doc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore"
import { format } from "date-fns"
import AdminLayout from "../../components/AdminLayout.jsx" // Added AdminLayout

function AdminRecipeManagement() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState([])
  const [isLoading, setIsLoading] = useState(true) // For initial recipe list load
  const [pageError, setPageError] = useState("") // For errors loading initial recipe list

  // Action loading for individual recipe actions (delete)
  const [actionLoading, setActionLoading] = useState(false)

  // State for Menu, Dialog (delete confirmation), Snackbar
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null) // For menu actions
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [dialogConfig, setDialogConfig] = useState({ title: "", message: "", action: null })
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })

  // State for CSV Upload and Processing
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false); // Covers parsing, validation, and uploading
  // parsedCsvData is not explicitly stored in state anymore if validationResult holds all needed info
  const [validationResult, setValidationResult] = useState(null);

  const fetchRecipes = async () => {
    setIsLoading(true)
    setPageError("")
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
      setPageError("Erreur lors du chargement des recettes. Vérifiez la console pour plus de détails.")
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
    // Keep selectedRecipe for dialogs until they are closed
  }

  const showSnackbar = (message, severity = "success", duration = 6000) => {
    setSnackbar({ open: true, message, severity, duration });
  };

  const handleOpenConfirmDeleteDialog = (recipe) => { // Renamed for clarity
    setDialogConfig({
      title: "Confirmer la suppression",
      message: `Êtes-vous sûr de vouloir supprimer la recette "${recipe.name}" ? Cette action est irréversible.`,
      action: "deleteRecipe",
    })
    setSelectedRecipe(recipe)
    setConfirmDialogOpen(true)
    handleMenuClose()
  }

  const handleCloseConfirmDeleteDialog = () => { // Renamed for clarity
    setConfirmDialogOpen(false)
    setSelectedRecipe(null)
  }

  const handleDeleteRecipe = async () => {
    if (!selectedRecipe) return

    setActionLoading(true) // Use actionLoading for individual recipe delete
    handleCloseConfirmDeleteDialog()

    try {
      const recipeRef = doc(db, "recipes", selectedRecipe.id)
      await deleteDoc(recipeRef)
      showSnackbar(`Recette "${selectedRecipe.name}" supprimée avec succès.`, "success")
      fetchRecipes()
    } catch (err) {
      console.error("Erreur lors de la suppression de la recette:", err)
      showSnackbar("Erreur lors de la suppression de la recette.", "error")
    } finally {
      setActionLoading(false)
      setSelectedRecipe(null)
    }
  }

  const handleConfirmMenuAction = async () => { // Renamed for clarity
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

  // --- CSV Related Functions ---
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setValidationResult(null);
  };

  const isValidUrl = (string) => {
    if (!string || typeof string !== 'string') return true;
    return string.startsWith('http://') || string.startsWith('https://');
  };

  const validateParsedDataForAdminUpload = (dataFromCsvUtil) => {
    const validRecipes = [];
    const invalidRecipes = [];

    dataFromCsvUtil.forEach((recipe, index) => {
      const errors = [];
      // parseRecipesFromCSV already ensures:
      // - name is present
      // - ingredients is an array (or throws/catches parsing error for the row)
      // - instructions is string/array (or throws/catches)
      // - tags is an array
      // - prepTime, servings are numbers or null
      // - photoUrl is string or ""

      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        errors.push("La liste d'ingrédients (colonne 'ingredients' en format JSON) ne peut pas être vide.");
      }
      if (!recipe.instructions || (Array.isArray(recipe.instructions) && recipe.instructions.length === 0) || (typeof recipe.instructions === 'string' && recipe.instructions.trim() === "")) {
        errors.push("Les instructions (colonne 'instructions' en format JSON) ne peuvent pas être vides.");
      }
      if (recipe.photoUrl && !isValidUrl(recipe.photoUrl)) {
        errors.push("'photoUrl' doit être une URL valide si fournie.");
      }
      // Add any other specific business logic for public recipes here.
      // e.g. if category from CSV needs validation:
      // if (recipe.category && !['Plat Principal', 'Dessert', 'Entrée'].includes(recipe.category)) {
      //   errors.push(`Catégorie '${recipe.category}' non valide.`);
      // }

      if (errors.length > 0) {
        invalidRecipes.push({ ...recipe, csvRowNumber: index + 2, errors }); // index + 2 for human-readable row number
      } else {
        validRecipes.push(recipe);
      }
    });

    return {
      validRecipes,
      invalidRecipes,
      statistics: {
        totalRows: dataFromCsvUtil.length, // This is total from utility, might include rows utility itself errored on if it returns them
        validCount: validRecipes.length,
        invalidCount: invalidRecipes.length,
      },
    };
  };

  const handleAnalyzeCsv = async () => {
    if (!selectedFile) {
      showSnackbar("Veuillez d'abord sélectionner un fichier CSV.", "warning");
      return;
    }
    setIsProcessingCsv(true);
    setValidationResult(null);

    try {
      const parsedRecipes = await parseRecipesFromCSV(selectedFile);
      // parseRecipesFromCSV might resolve with an empty array if all rows had errors it caught.
      // Or it might reject if PapaParse itself fails.

      const validationOutput = validateParsedDataForAdminUpload(parsedRecipes);
      setValidationResult(validationOutput);

      if (parsedRecipes.length === 0 && validationOutput.statistics.totalRows === 0 && selectedFile.size > 0) {
          // This means parseRecipesFromCSV itself returned empty, possibly due to universal row errors it handled.
          showSnackbar("Analyse terminée. Aucune recette valide trouvée. Vérifiez le formatage JSON des ingrédients/instructions ou les noms manquants dans le CSV.", "error", 8000);
      } else if (validationOutput.statistics.totalRows === 0) {
          showSnackbar("Le fichier CSV est vide ou ne contient aucune ligne de données pertinente.", "warning");
      } else {
          showSnackbar(`Analyse et validation terminées: ${validationOutput.statistics.validCount} valides, ${validationOutput.statistics.invalidCount} invalides.`, "info");
      }
      // console.log("Résultat de la validation:", validationOutput);
    } catch (error) { // Catches rejections from parseRecipesFromCSV
      console.error("Erreur de parseRecipesFromCSV:", error);
      showSnackbar(`Erreur lors de l'analyse du CSV: ${error.message}`, "error", 8000);
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!validationResult || !validationResult.validRecipes || validationResult.validRecipes.length === 0) {
      showSnackbar("Aucune recette valide à téléverser.", "warning");
      return;
    }

    setIsProcessingCsv(true);
    showSnackbar(`Début du téléversement de ${validationResult.validRecipes.length} recettes...`, "info");

    let recipesUploadedCount = 0;
    const recipesToUpload = [...validationResult.validRecipes];
    const BATCH_SIZE = 490;

    try {
      while (recipesToUpload.length > 0) {
        const currentBatch = writeBatch(db);
        const batchChunk = recipesToUpload.splice(0, BATCH_SIZE);

        for (const recipe of batchChunk) {
          const newRecipeRef = doc(collection(db, "recipes"));
          const recipeData = {
            name: recipe.name,
            description: recipe.description || "",
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            prepTime: recipe.prepTime,
            servings: recipe.servings,
            tags: recipe.tags || [],
            photoUrl: recipe.photoUrl || null,
            category: recipe.category || null, // Assuming 'category' comes from CSV and is on `recipe` object
            // cookTime is not part of parseRecipesFromCSV's defined output, handle if present
            cookTime: recipe.cookTime ? Number(recipe.cookTime) : null, // Example if cookTime was passed through
            isPublic: true,
            familyId: null,
            createdBy: 'admin_csv_import',
            createdAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp(),
          };
          currentBatch.set(newRecipeRef, recipeData);
        }
        await currentBatch.commit();
        recipesUploadedCount += batchChunk.length;
        if (recipesToUpload.length > 0) {
            showSnackbar(`${recipesUploadedCount}/${validationResult.validRecipes.length} recettes téléversées...`, "info", 3000);
        }
      }

      showSnackbar(`Téléversement réussi! ${recipesUploadedCount} recettes ajoutées.`, "success");
      fetchRecipes();

    } catch (error) {
      console.error("Erreur lors du téléversement par lot:", error);
      showSnackbar(`Erreur durant le téléversement: ${error.message}. ${recipesUploadedCount} recettes ont pu être ajoutées.`, "error", 8000);
    } finally {
      setIsProcessingCsv(false);
      setSelectedFile(null);
      setValidationResult(null);
    }
  };


  if (isLoading) { // Only initial page load
    return (
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, textAlign: "center" }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Chargement des recettes...</Typography>
        </Container>
      </AdminLayout>
    )
  }

  if (pageError) {
    return (
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
          <Alert severity="error">{pageError}</Alert>
        </Container>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
          <RestaurantMenuIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: "2.5rem" }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Gestion des Recettes
          </Typography>
        </Box>
      </Box>

      {/* CSV Upload Section */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
          Ajout en Masse de Recettes Publiques via CSV
        </Typography>
        <MuiAlert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Format CSV Requis</AlertTitle>
          Utilisez les en-têtes de colonne suivants. L'ordre est important. Les recettes importées seront publiques.<br/>
          <code>name</code> (Requis) - Nom de la recette.<br/>
          <code>description</code> (Optionnel) - Description de la recette.<br/>
          <code>prepTime</code> (Optionnel) - Temps de préparation en minutes (ex: 30).<br/>
          <code>servings</code> (Optionnel) - Nombre de portions (ex: 4).<br/>
          <code>ingredients</code> (Requis) - Chaîne JSON d'un tableau de chaînes (ex: <code>"[\"2 tasses de farine\", \"1 c. à café de sucre\"]"</code>).<br/>
          <code>instructions</code> (Requis) - Chaîne JSON (soit une simple chaîne, soit un tableau de chaînes pour les étapes. Ex: <code>"Mélanger."</code> ou <code>"[\"Étape 1\", \"Étape 2\"]"</code>).<br/>
          <code>tags</code> (Optionnel) - Chaîne de tags séparés par des points-virgules (ex: "dessert;facile;rapide").<br/>
          <code>visibility</code> (Optionnel) - "public" ou "family" (sera forcé à "public" lors de cet import).<br/>
          <code>photoUrl</code> (Optionnel) - URL directe de l'image de la recette.<br/>
          <strong>Note:</strong> Les champs `cookTime`, `sourceName`, `sourceUrl` du précédent format ne sont pas gérés par l'utilitaire d'import actuel.
        </MuiAlert>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={isProcessingCsv}
            >
              Choisir Fichier CSV
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={handleFileChange}
                key={selectedFile ? selectedFile.name : 'csv-file-input'}
              />
            </Button>
          </Grid>
          {selectedFile && (
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                Fichier sélectionné: {selectedFile.name}
              </Typography>
            </Grid>
          )}
          <Grid item xs>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAnalyzeCsv}
              disabled={!selectedFile || isProcessingCsv}
              sx={{float: 'right'}}
            >
              {isProcessingCsv && !validationResult ? <CircularProgress size={24} color="inherit" /> : "Analyser le Fichier CSV"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Validation Results Section */}
      {validationResult && (
        <Paper elevation={0} sx={{ p: 3, mt: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Résultats de la Validation CSV</Typography>
          <Typography variant="body1">
            Lignes totales du CSV (données): {validationResult.statistics.totalRows} |
            Recettes valides: <Chip label={validationResult.statistics.validCount} color="success" size="small"/> |
            Recettes invalides: <Chip label={validationResult.statistics.invalidCount} color="error" size="small"/>
          </Typography>

          {validationResult.invalidRecipes.length > 0 && (
            <Box sx={{ my: 2 }}>
              <Typography variant="subtitle1" color="error" gutterBottom>Recettes Invalides (premières 10 erreurs):</Typography>
              <TableContainer component={Paper} elevation={0} variant="outlined" sx={{maxHeight: 300, overflowY: 'auto'}}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ligne CSV (approx.)</TableCell>
                      <TableCell>Nom (si disponible)</TableCell>
                      <TableCell>Erreurs</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {validationResult.invalidRecipes.slice(0,10).map((recipe, index) => (
                      <TableRow key={`invalid-${index}`}>
                        <TableCell>{recipe.csvRowNumber || recipe.rowIndex}</TableCell>
                        <TableCell>{recipe.name || "N/A"}</TableCell>
                        <TableCell>
                          {recipe.errors.map((err, i) => <Typography key={i} variant="caption" display="block">- {err}</Typography>)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {validationResult.validRecipes.length > 0 && (
            <Box sx={{ my: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Aperçu des Recettes Valides (premières 5):</Typography>
               <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                      <TableCell>Description (extrait)</TableCell>
                      <TableCell>Ingrédients (nombre)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {validationResult.validRecipes.slice(0,5).map((recipe, index) => (
                      <TableRow key={`valid-${index}`}>
                        <TableCell>{recipe.name}</TableCell>
                        <TableCell>{recipe.description?.substring(0,50) || "N/A"}...</TableCell>
                        <TableCell>{Array.isArray(recipe.ingredients) ? recipe.ingredients.length : "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleConfirmUpload}
                disabled={isProcessingCsv || !validationResult || validationResult.validRecipes.length === 0}
                sx={{mt: 2}}
              >
                {isProcessingCsv && validationResult ? <CircularProgress size={24} color="inherit" sx={{mr:1}} /> : null}
                Confirmer et Téléverser {validationResult?.validRecipes?.length || 0} Recette(s) Valide(s)
              </Button>
            </Box>
          )}
        </Paper>
      )}


      {(isLoading || actionLoading) && !isProcessingCsv && !validationResult ? ( // Show main table loading only if not CSV processing
         <Typography sx={{ textAlign: "center", mt: 4 }}>Chargement des recettes existantes...</Typography>
      ) : recipes.length === 0 && !isLoading && !actionLoading && !validationResult ? (
        <Typography sx={{ textAlign: "center", mt: 4 }}>Aucune recette trouvée.</Typography>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ mt: validationResult ? 3 : 0, border: `1px solid ${theme.palette.divider}` }}>
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
                      src={recipe.imageUrl || recipe.photoUrl || undefined} // Use photoUrl as fallback
                      alt={recipe.name}
                      variant="rounded"
                      sx={{ width: 56, height: 56, bgcolor: (recipe.imageUrl || recipe.photoUrl) ? 'transparent' : theme.palette.grey[300] }}
                    >
                      {!(recipe.imageUrl || recipe.photoUrl) && <RestaurantMenuIcon fontSize="small" />}
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
                    ) : recipe.visibility ? (
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
                      disabled={actionLoading} // Disable menu button during individual recipe actions
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
        <MenuItem onClick={() => handleOpenConfirmDeleteDialog(selectedRecipe)} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Supprimer
        </MenuItem>
      </Menu>

      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDeleteDialog}
      >
        <DialogTitle>{dialogConfig.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogConfig.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDeleteDialog}>Annuler</Button>
          <Button onClick={handleConfirmMenuAction} color="error" autoFocus disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={24} /> : "Confirmer la Suppression"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.duration || 6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <MuiAlert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      </Container>
    </AdminLayout>
  )
}

export default AdminRecipeManagement
