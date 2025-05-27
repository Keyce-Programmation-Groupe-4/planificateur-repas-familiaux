"use client";

import { useState, useEffect, useMemo } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Fab,
  TextField,
  Alert,
  Skeleton,
  useTheme,
  alpha,
  Fade,
  Zoom,
  InputAdornment,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  Checkbox,
  FormControlLabel,
  Badge,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Restaurant as RestaurantIcon,
  AccessTime as AccessTimeIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  LocalDining as LocalDiningIcon,
  Public as PublicIcon,
  FamilyRestroom as FamilyIcon,
  CloudDownload as ExportIcon,
  CloudUpload as ImportIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Merge as MergeIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Delete as DeleteIcon, // Ajoutez cette ligne
} from "@mui/icons-material";
import Papa from "papaparse";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  writeBatch,
  doc,
  updateDoc,
} from "firebase/firestore";
import { exportRecipesToCSV, parseRecipesFromCSV } from "../utils/csvUtils";

// Helper to render skeletons
const renderSkeletons = (theme) => (
  <Grid container spacing={3}>
    {[...Array(6)].map((_, index) => (
      <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
        <Fade in timeout={300 + index * 100}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              height: "100%",
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(
                theme.palette.primary.main,
                0.02
              )} 100%)`,
            }}
          >
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: "16px 16px 0 0" }} />
            <CardContent sx={{ p: 3 }}>
              <Skeleton variant="text" sx={{ fontSize: "1.25rem", mb: 1 }} />
              <Skeleton variant="text" width="80%" sx={{ mb: 2 }} />
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Skeleton variant="rounded" width={60} height={24} />
                <Skeleton variant="rounded" width={80} height={24} />
              </Stack>
              <Stack direction="row" spacing={0.5}>
                <Skeleton variant="rounded" width={50} height={20} />
                <Skeleton variant="rounded" width={60} height={20} />
              </Stack>
            </CardContent>
            <CardActions sx={{ p: 3, pt: 0 }}>
              <Skeleton variant="rounded" width={90} height={36} />
              <Skeleton variant="rounded" width={90} height={36} />
            </CardActions>
          </Card>
        </Fade>
      </Grid>
    ))}
  </Grid>
);

export default function RecipesListPage() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [allFamilyRecipes, setAllFamilyRecipes] = useState([]);
  const [allPublicRecipes, setAllPublicRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("family");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importError, setImportError] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState([]);

  const canModify = userData?.familyRole === "Admin" || userData?.familyRole === "SecondaryAdmin";
  const familyId = userData?.familyId;

  useEffect(() => {
    const fetchRecipes = async () => {
      if (!familyId) {
        setLoading(false);
        setAllFamilyRecipes([]);
        setAllPublicRecipes([]);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const recipesRef = collection(db, "recipes");
        const familyQuery = query(
          recipesRef,
          where("familyId", "==", familyId),
          orderBy("createdAt", "desc")
        );
        const publicQuery = query(
          recipesRef,
          where("visibility", "==", "public"),
          orderBy("createdAt", "desc")
        );

        const [familySnapshot, publicSnapshot] = await Promise.all([
          getDocs(familyQuery),
          getDocs(publicQuery),
        ]);

        const fetchedFamilyRecipes = familySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          likes: doc.data().likes || [],
        }));
        const fetchedPublicRecipes = publicSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          likes: doc.data().likes || [],
        }));

        setAllFamilyRecipes(fetchedFamilyRecipes);
        setAllPublicRecipes(fetchedPublicRecipes);
      } catch (err) {
        console.error("Error fetching recipes:", err);
        setError("Erreur lors de la récupération des recettes.");
      } finally {
        setLoading(false);
      }
    };

    if (userData) {
      fetchRecipes();
    }
  }, [userData, familyId]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSelectedRecipes([]);
    setSelectionMode(false);
  };

  const filteredRecipes = useMemo(() => {
    const sourceList = activeTab === "family" ? allFamilyRecipes : allPublicRecipes;
    if (!searchTerm) {
      return sourceList;
    }
    return sourceList.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recipe.tags &&
          recipe.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [activeTab, allFamilyRecipes, allPublicRecipes, searchTerm]);

  const clearSearch = () => {
    setSearchTerm("");
  };

  const handleExport = () => {
    try {
      const recipesToExport = activeTab === "family" ? allFamilyRecipes : allPublicRecipes;
      exportRecipesToCSV(recipesToExport, `recipes_${activeTab}_${new Date().toISOString()}.csv`);
      setSuccess(`Recettes ${activeTab === "family" ? "familiales" : "publiques"} exportées avec succès !`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error exporting recipes:", err);
      setError("Erreur lors de l'exportation des recettes.");
    }
  };

  const handleOpenImportDialog = () => {
    setImportDialogOpen(true);
    setImportError("");
    setImportFile(null);
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    setImportError("");
    setImportFile(null);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "text/csv") {
      setImportFile(file);
      setImportError("");
    } else {
      setImportError("Veuillez sélectionner un fichier CSV valide.");
      setImportFile(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportError("Aucun fichier sélectionné.");
      return;
    }

    setLoading(true);
    setImportError("");
    try {
      const recipes = await parseRecipesFromCSV(importFile);
      if (recipes.length === 0) {
        setImportError("Aucune recette valide trouvée dans le fichier CSV.");
        setLoading(false);
        return;
      }

      const batch = writeBatch(db);
      const recipesRef = collection(db, "recipes");

      recipes.forEach((recipe) => {
        const newRecipe = {
          ...recipe,
          familyId,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.uid,
          visibility: recipe.visibility || "family",
          likes: [],
        };
        const docRef = doc(recipesRef);
        batch.set(docRef, newRecipe);
      });

      await batch.commit();
      setSuccess(`${recipes.length} recette(s) importée(s) avec succès !`);
      setTimeout(() => setSuccess(""), 3000);
      handleCloseImportDialog();

      const familyQuery = query(
        recipesRef,
        where("familyId", "==", familyId),
        orderBy("createdAt", "desc")
      );
      const familySnapshot = await getDocs(familyQuery);
      setAllFamilyRecipes(familySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), likes: doc.data().likes || [] })));
    } catch (err) {
      console.error("Error importing recipes:", err);
      setImportError("Erreur lors de l'importation des recettes : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (recipeId, currentLikes) => {
    if (!currentUser) {
      setError("Vous devez être connecté pour liker une recette.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const recipeRef = doc(db, "recipes", recipeId);
      const isLiked = currentLikes.includes(currentUser.uid);
      const updatedLikes = isLiked
        ? currentLikes.filter((uid) => uid !== currentUser.uid)
        : [...currentLikes, currentUser.uid];

      await updateDoc(recipeRef, { likes: updatedLikes });

      const updateRecipes = (recipes) =>
        recipes.map((recipe) =>
          recipe.id === recipeId ? { ...recipe, likes: updatedLikes } : recipe
        );
      setAllFamilyRecipes(updateRecipes(allFamilyRecipes));
      setAllPublicRecipes(updateRecipes(allPublicRecipes));
    } catch (err) {
      console.error("Error updating likes:", err);
      setError("Erreur lors de la mise à jour du like.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const toggleSelectionMode = () => {
    const newSelectionMode = !selectionMode;
    setSelectionMode(newSelectionMode);
    setSelectedRecipes([]);
    console.log("Selection mode toggled to:", newSelectionMode);
  };

  const handleRecipeSelect = (recipeId) => {
    setSelectedRecipes((prev) => {
      const newSelection = prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId];
      console.log("Selected recipes:", newSelection);
      return newSelection;
    });
  };

  const handleAggregateRecipes = () => {
    if (selectedRecipes.length < 2) {
      setError("Veuillez sélectionner au moins deux recettes pour les agréger.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    navigate("/recipes/aggregate", { state: { selectedRecipeIds: selectedRecipes } });
  };

  const handleBulkDelete = async () => {
  if (selectedRecipes.length === 0) {
    setError("Veuillez sélectionner au moins une recette à supprimer.");
    setTimeout(() => setError(""), 3000);
    return;
  }

  if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedRecipes.length} recette(s) ? Cette action est irréversible.`)) {
    return;
  }

  setLoading(true);
  setError("");
  try {
    const batch = writeBatch(db);
    const recipesRef = collection(db, "recipes");

    selectedRecipes.forEach((recipeId) => {
      const docRef = doc(recipesRef, recipeId);
      batch.delete(docRef);
    });

    await batch.commit();

    // Mettre à jour les listes locales
    setAllFamilyRecipes(allFamilyRecipes.filter((recipe) => !selectedRecipes.includes(recipe.id)));
    setAllPublicRecipes(allPublicRecipes.filter((recipe) => !selectedRecipes.includes(recipe.id)));
    setSelectedRecipes([]);
    setSelectionMode(false);

    setSuccess(`${selectedRecipes.length} recette(s) supprimée(s) avec succès !`);
    setTimeout(() => setSuccess(""), 3000);
  } catch (err) {
    console.error("Error deleting recipes:", err);
    setError("Erreur lors de la suppression des recettes : " + err.message);
    setTimeout(() => setError(""), 3000);
  } finally {
    setLoading(false);
  }
};

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(
          theme.palette.primary.main,
          0.03
        )} 100%)`,
        minHeight: "calc(100vh - 64px)",
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        <Fade in timeout={600}>
          <Box sx={{ mb: 4, textAlign: "center" }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <RestaurantIcon
                sx={{ fontSize: "3rem", color: theme.palette.primary.main }}
              />
              Bibliothèque de Recettes
              <LocalDiningIcon
                sx={{ fontSize: "3rem", color: theme.palette.secondary.main }}
              />
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: "auto" }}>
              {canModify
                ? "Explorez, créez et partagez vos secrets culinaires en famille"
                : "Découvrez les trésors culinaires publics et familiaux"}
            </Typography>
          </Box>
        </Fade>

        {success && (
          <Fade in>
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3, 
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              {success}
            </Alert>
          </Fade>
        )}

        {error && (
          <Fade in>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              }}
            >
              {error}
            </Alert>
          </Fade>
        )}

        {!loading && !familyId && (
          <Fade in>
            <Alert
              severity="info"
              sx={{
                mb: 3,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.info.main,
                  0.1
                )} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
            >
              Vous devez faire partie d'une famille pour pouvoir voir ou créer des recettes.
            </Alert>
          </Fade>
        )}

        {familyId && (
          <Paper
            elevation={0}
            sx={{
              mb: 4,
              borderRadius: 4,
              overflow: "hidden",
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(
                theme.palette.primary.main,
                0.01
              )} 100%)`,
              backdropFilter: "blur(10px)",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
              aria-label="Recipe visibility tabs"
              sx={{ 
                borderBottom: 1, 
                borderColor: "divider",
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "1rem",
                  py: 2,
                },
              }}
            >
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <FamilyIcon />
                    Ma Famille
                    <Badge 
                      badgeContent={allFamilyRecipes.length} 
                      color="primary" 
                      sx={{ ml: 1 }}
                    />
                  </Box>
                }
                value="family"
              />
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PublicIcon />
                    Publiques
                    <Badge 
                      badgeContent={allPublicRecipes.length} 
                      color="secondary" 
                      sx={{ ml: 1 }}
                    />
                  </Box>
                }
                value="public"
              />
            </Tabs>
            
            <Box sx={{ p: 3 }}>
              <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems="center">
                <TextField
                  fullWidth
                  placeholder={`Rechercher dans les recettes ${activeTab === "family" ? "familiales" : "publiques"}...`}
                  variant="outlined"
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton onClick={clearSearch} edge="end" size="small">
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 3 },
                  }}
                />
                
                {canModify && (
                  <Stack direction={isMobile ? "column" : "row"} spacing={1} sx={{ minWidth: isMobile ? "100%" : "auto" }}>
                    <Button
                      variant="outlined"
                      startIcon={<ExportIcon />}
                      onClick={handleExport}
                      sx={{ 
                        textTransform: "none", 
                        borderRadius: 3, 
                        minWidth: 120,
                        background: alpha(theme.palette.background.paper, 0.8),
                      }}
                    >
                      Exporter
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ImportIcon />}
                      onClick={handleOpenImportDialog}
                      sx={{ 
                        textTransform: "none", 
                        borderRadius: 3, 
                        minWidth: 120,
                        background: alpha(theme.palette.background.paper, 0.8),
                      }}
                    >
                      Importer
                    </Button>
                    <Button
                      variant={selectionMode ? "contained" : "outlined"}
                      startIcon={selectionMode ? <CheckCircleIcon /> : <MergeIcon />}
                      onClick={toggleSelectionMode}
                      sx={{ 
                        textTransform: "none", 
                        borderRadius: 3, 
                        minWidth: 160,
                        background: selectionMode ? undefined : alpha(theme.palette.background.paper, 0.8),
                      }}
                    >
                      {selectionMode ? "Annuler" : "Sélectionner"}
                    </Button>
                    {selectionMode && (
                      <>
                        <Button
                          variant="contained"
                          startIcon={<MergeIcon />}
                          onClick={handleAggregateRecipes}
                          disabled={selectedRecipes.length < 2}
                          sx={{ 
                            textTransform: "none", 
                            borderRadius: 3, 
                            minWidth: 140,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                          }}
                        >
                          Agréger ({selectedRecipes.length})
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={handleBulkDelete}
                          disabled={selectedRecipes.length === 0}
                          sx={{ 
                            textTransform: "none", 
                            borderRadius: 3, 
                            minWidth: 140,
                            background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                          }}
                        >
                          Supprimer ({selectedRecipes.length})
                        </Button>
                      </>
                    )}
                  </Stack>
                )}
              </Stack>
            </Box>
          </Paper>
        )}

        <Dialog open={importDialogOpen} onClose={handleCloseImportDialog} fullScreen={isMobile}>
          <DialogTitle sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: "white" }}>
            Importer des Recettes
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sélectionnez un fichier CSV contenant des recettes. Les colonnes attendues sont : name, description, prepTime, servings, ingredients, instructions, tags, visibility, photoUrl.
            </Typography>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ 
                marginBottom: "16px",
                padding: "12px",
                border: `2px dashed ${theme.palette.divider}`,
                borderRadius: "8px",
                width: "100%",
                background: alpha(theme.palette.background.paper, 0.5),
              }}
            />
            {importError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {importError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseImportDialog} sx={{ borderRadius: 2 }}>
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              variant="contained"
              disabled={!importFile || loading}
              sx={{ borderRadius: 2 }}
            >
              Importer
            </Button>
          </DialogActions>
        </Dialog>

        {!loading && familyId && (
          <Fade in timeout={1000}>
            <Box sx={{ mb: 4, textAlign: "center" }}>
              <Stack
                direction="row"
                spacing={2}
                justifyContent="center"
                sx={{ flexWrap: "wrap", gap: 2 }}
              >
                <Chip
                  icon={<RestaurantIcon />}
                  label={`${filteredRecipes.length} recette${filteredRecipes.length !== 1 ? "s" : ""} ${activeTab === "family" ? "familiale" : "publique"}${filteredRecipes.length !== 1 ? "s" : ""}`}
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    borderRadius: 3,
                    px: 1,
                  }}
                />
                {searchTerm && (
                  <Chip
                    icon={<FilterListIcon />}
                    label={`Recherche: "${searchTerm}"`}
                    onDelete={clearSearch}
                    sx={{
                      backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                      color: theme.palette.secondary.main,
                      fontWeight: 600,
                      borderRadius: 3,
                      px: 1,
                    }}
                  />
                )}
                {selectionMode && (
                  <Chip
                    icon={<MergeIcon />}
                    label={`${selectedRecipes.length} recette(s) sélectionnée(s)`}
                    sx={{
                      backgroundColor: alpha(theme.palette.info.main, 0.1),
                      color: theme.palette.info.main,
                      fontWeight: 600,
                      borderRadius: 3,
                      px: 1,
                    }}
                  />
                )}
              </Stack>
            </Box>
          </Fade>
        )}

        {loading
          ? renderSkeletons(theme)
          : familyId && (
              <Grid container spacing={3}>
                {filteredRecipes.length > 0 ? (
                  filteredRecipes.map((recipe, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={recipe.id}>
                      <Zoom in timeout={400 + index * 100}>
                        <Card
                          elevation={0}
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                            borderRadius: 4,
                            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(
                              theme.palette.primary.main,
                              0.02
                            )} 100%)`,
                            border: selectedRecipes.includes(recipe.id) 
                              ? `2px solid ${theme.palette.primary.main}`
                              : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            position: "relative",
                            "&:hover": {
                              transform: selectionMode ? "none" : "translateY(-8px)",
                              boxShadow: selectionMode
                                ? "none"
                                : `0 20px 60px ${alpha(theme.palette.primary.main, 0.15)}`,
                              border: `2px solid ${alpha(
                                theme.palette.primary.main,
                                selectionMode ? 1 : 0.3
                              )}`,
                            },
                            ...(selectedRecipes.includes(recipe.id) && {
                              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
                            }),
                          }}
                        >
                          {/* Selection Checkbox - Fixed positioning and visibility */}
                          {selectionMode && (
                            <Box
                              sx={{
                                position: "absolute",
                                top: 12,
                                left: 12,
                                zIndex: 10,
                                background: theme.palette.background.paper,
                                borderRadius: "50%",
                                boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`,
                                p: 0.5,
                              }}
                            >
                              <Checkbox
                                checked={selectedRecipes.includes(recipe.id)}
                                onChange={() => handleRecipeSelect(recipe.id)}
                                icon={<RadioButtonUncheckedIcon />}
                                checkedIcon={<CheckCircleIcon />}
                                sx={{
                                  color: theme.palette.primary.main,
                                  "&.Mui-checked": {
                                    color: theme.palette.primary.main,
                                  },
                                }}
                              />
                            </Box>
                          )}

                          <Box sx={{ position: "relative", overflow: "hidden" }}>
                            <CardMedia
                              component="img"
                              height="200"
                              image={
                                recipe.photoUrl ||
                                "/placeholder.svg?height=200&width=300"
                              }
                              alt={recipe.name}
                              sx={{
                                objectFit: "cover",
                                width: "100%",
                                transition: "transform 0.3s ease",
                                "&:hover": selectionMode ? {} : { transform: "scale(1.05)" },
                              }}
                            />
                            <Box
                              sx={{
                                position: "absolute",
                                top: 12,
                                right: 12,
                                display: "flex",
                                gap: 1,
                                alignItems: "center",
                                flexDirection: "column",
                              }}
                            >
                              <Tooltip
                                title={
                                  recipe.visibility === "family"
                                    ? "Recette Familiale"
                                    : "Recette Publique"
                                }
                              >
                                <Chip
                                  icon={
                                    recipe.visibility === "family" ? (
                                      <FamilyIcon />
                                    ) : (
                                      <PublicIcon />
                                    )
                                  }
                                  size="small"
                                  sx={{
                                    backgroundColor: alpha(
                                      theme.palette.background.paper,
                                      0.95
                                    ),
                                    backdropFilter: "blur(8px)",
                                    fontSize: "0.75rem",
                                    color:
                                      recipe.visibility === "family"
                                        ? theme.palette.secondary.main
                                        : theme.palette.info.main,
                                    border: `1px solid ${alpha(
                                      recipe.visibility === "family"
                                        ? theme.palette.secondary.main
                                        : theme.palette.info.main,
                                      0.2
                                    )}`,
                                  }}
                                />
                              </Tooltip>
                              <Stack direction="row" spacing={0.5}>
                                {recipe.prepTime && (
                                  <Chip
                                    icon={<AccessTimeIcon />}
                                    label={`${recipe.prepTime}min`}
                                    size="small"
                                    sx={{
                                      backgroundColor: alpha(
                                        theme.palette.background.paper,
                                        0.95
                                      ),
                                      backdropFilter: "blur(8px)",
                                      fontSize: "0.7rem",
                                      height: 24,
                                    }}
                                  />
                                )}
                                {recipe.servings && (
                                  <Chip
                                    icon={<GroupIcon />}
                                    label={recipe.servings}
                                    size="small"
                                    sx={{
                                      backgroundColor: alpha(
                                        theme.palette.background.paper,
                                        0.95
                                      ),
                                      backdropFilter: "blur(8px)",
                                      fontSize: "0.7rem",
                                      height: 24,
                                    }}
                                  />
                                )}
                              </Stack>
                            </Box>
                          </Box>

                          <CardContent sx={{ flexGrow: 1, p: 3 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                              <Typography
                                variant="h6"
                                component="div"
                                sx={{
                                  fontWeight: 600,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                  mr: 1,
                                }}
                              >
                                {recipe.name}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleLike(recipe.id, recipe.likes)}
                                disabled={!currentUser || selectionMode}
                                sx={{ 
                                  ml: 1,
                                  transition: "all 0.2s ease",
                                  "&:hover": {
                                    transform: "scale(1.1)",
                                  },
                                }}
                              >
                                {recipe.likes.includes(currentUser?.uid) ? (
                                  <FavoriteIcon sx={{ color: theme.palette.error.main, fontSize: "1.2rem" }} />
                                ) : (
                                  <FavoriteBorderIcon sx={{ fontSize: "1.2rem" }} />
                                )}
                              </IconButton>
                            </Box>
                            
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mb: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                minHeight: "2.5em",
                                lineHeight: 1.25,
                              }}
                            >
                              {recipe.description ||
                                recipe.tags?.join(", ") ||
                                "Aucune description disponible"}
                            </Typography>
                            
                            {recipe.tags && recipe.tags.length > 0 && (
                              <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{ flexWrap: "wrap", gap: 0.5, mb: 2 }}
                              >
                                {recipe.tags.slice(0, 3).map((tag, tagIndex) => (
                                  <Chip
                                    key={tagIndex}
                                    label={tag}
                                    size="small"
                                    sx={{
                                      backgroundColor: alpha(
                                        theme.palette.secondary.main,
                                        0.1
                                      ),
                                      color: theme.palette.secondary.main,
                                      fontSize: "0.7rem",
                                      height: "20px",
                                      border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                                    }}
                                  />
                                ))}
                                {recipe.tags.length > 3 && (
                                  <Chip
                                    label={`+${recipe.tags.length - 3}`}
                                    size="small"
                                    sx={{
                                      backgroundColor: alpha(
                                        theme.palette.text.secondary,
                                        0.1
                                      ),
                                      color: theme.palette.text.secondary,
                                      fontSize: "0.7rem",
                                      height: "20px",
                                    }}
                                  />
                                )}
                              </Stack>
                            )}
                            
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {recipe.likes.length} {recipe.likes.length === 1 ? "like" : "likes"}
                              </Typography>
                            </Box>
                          </CardContent>

                          <Divider sx={{ mx: 2 }} />

                          <CardActions sx={{ p: 3, pt: 2 }}>
                            <Button
                              size="small"
                              component={RouterLink}
                              to={`/recipes/${recipe.id}`}
                              startIcon={<VisibilityIcon />}
                              sx={{
                                borderRadius: 3,
                                textTransform: "none",
                                fontWeight: 500,
                                flex: 1,
                                background: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                "&:hover": {
                                  background: alpha(theme.palette.primary.main, 0.2),
                                },
                              }}
                              disabled={selectionMode}
                            >
                              Voir
                            </Button>
                            {canModify && recipe.familyId === familyId && (
                              <Button
                                size="small"
                                component={RouterLink}
                                to={`/recipes/${recipe.id}/edit`}
                                startIcon={<EditIcon />}
                                sx={{
                                  borderRadius: 3,
                                  textTransform: "none",
                                  fontWeight: 500,
                                  flex: 1,
                                  ml: 1,
                                  background: alpha(theme.palette.secondary.main, 0.1),
                                  color: theme.palette.secondary.main,
                                  "&:hover": {
                                    background: alpha(theme.palette.secondary.main, 0.2),
                                  },
                                }}
                                disabled={selectionMode}
                              >
                                Modifier
                              </Button>
                            )}
                          </CardActions>
                        </Card>
                      </Zoom>
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Fade in>
                      <Paper
                        sx={{
                          p: 6,
                          textAlign: "center",
                          borderRadius: 4,
                          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        }}
                      >
                        <RestaurantIcon 
                          sx={{ 
                            fontSize: "4rem", 
                            color: theme.palette.text.secondary, 
                            mb: 2,
                            opacity: 0.5,
                          }} 
                        />
                        <Typography
                          variant="h5"
                          color="text.secondary"
                          sx={{ mb: 2, fontWeight: 500 }}
                        >
                          {`Aucune recette ${activeTab === "family" ? "familiale" : "publique"} trouvée`}
                          {searchTerm && ` pour "${searchTerm}"`}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                          {searchTerm 
                            ? "Essayez de modifier votre recherche ou explorez d'autres catégories."
                            : `Commencez par ${activeTab === "family" ? "créer votre première recette familiale" : "explorer les recettes publiques"}.`
                          }
                        </Typography>
                        {canModify && activeTab === "family" && !searchTerm && (
                          <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate("/recipes/new")}
                            sx={{
                              borderRadius: 3,
                              px: 4,
                              py: 1.5,
                              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            }}
                          >
                            Créer ma première recette
                          </Button>
                        )}
                      </Paper>
                    </Fade>
                  </Grid>
                )}
              </Grid>
            )}

        {canModify && familyId && !selectionMode && (
          <Zoom in timeout={1200}>
            <Fab
              color="primary"
              aria-label="add recipe"
              sx={{
                position: "fixed",
                bottom: theme.spacing(4),
                right: theme.spacing(4),
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
                "&:hover": {
                  transform: "scale(1.1)",
                  boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.4)}`,
                },
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onClick={() => navigate("/recipes/new")}
            >
              <AddIcon />
            </Fab>
          </Zoom>
        )}
      </Container>
    </Box>
  );
}
