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
} from "firebase/firestore";
import { exportRecipesToCSV, parseRecipesFromCSV } from "../utils/csvUtils";

// Helper to render skeletons
const renderSkeletons = (theme) => (
  <Grid container spacing={3}>
    {[...Array(6)].map((_, index) => (
      <Grid item xs={12} sm={6} md={4} key={index}>
        <Fade in timeout={300 + index * 100}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              height: "100%",
            }}
          >
            <Skeleton variant="rectangular" height={200} />
            <CardContent>
              <Skeleton variant="text" sx={{ fontSize: "1.25rem", mb: 1 }} />
              <Skeleton variant="text" width="80%" />
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Skeleton variant="rounded" width={60} height={24} />
                <Skeleton variant="rounded" width={80} height={24} />
              </Stack>
            </CardContent>
            <CardActions sx={{ p: 2 }}>
              <Skeleton variant="rounded" width={80} height={32} />
              <Skeleton variant="rounded" width={80} height={32} />
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

  const canModify = userData?.familyRole === "Admin";
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
        }));
        const fetchedPublicRecipes = publicSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
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

  // Export recipes to CSV
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

  // Handle import dialog
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
        };
        // Create a new document reference without writing to Firestore
        const docRef = doc(recipesRef);
        batch.set(docRef, newRecipe);
      });

      await batch.commit();
      setSuccess(`${recipes.length} recette(s) importée(s) avec succès !`);
      setTimeout(() => setSuccess(""), 3000);
      handleCloseImportDialog();

      // Refresh recipes
      const familyQuery = query(
        recipesRef,
        where("familyId", "==", familyId),
        orderBy("createdAt", "desc")
      );
      const familySnapshot = await getDocs(familyQuery);
      setAllFamilyRecipes(familySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error importing recipes:", err);
      setImportError("Erreur lors de l'importation des recettes : " + err.message);
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
        {/* Header */}
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
            <Typography variant="h6" color="text.secondary">
              {canModify
                ? "Explorez, créez et partagez vos secrets culinaires"
                : "Découvrez les trésors culinaires publics et familiaux"}
            </Typography>
          </Box>
        </Fade>

        {/* Success Alert */}
        {success && (
          <Fade in>
            <Alert severity="success" sx={{ mb: 3, borderRadius: 3 }}>
              {success}
            </Alert>
          </Fade>
        )}

        {/* No Family Alert */}
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

        {/* Tabs, Search Bar, and Import/Export Buttons */}
        {familyId && (
          <Paper
            elevation={0}
            sx={{
              mb: 4,
              borderRadius: 3,
              overflow: "hidden",
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: theme.palette.background.paper,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
              aria-label="Recipe visibility tabs"
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              <Tab
                label="Ma Famille"
                value="family"
                icon={<FamilyIcon />}
                iconPosition="start"
                sx={{ textTransform: "none", fontWeight: 600 }}
              />
              <Tab
                label="Publiques"
                value="public"
                icon={<PublicIcon />}
                iconPosition="start"
                sx={{ textTransform: "none", fontWeight: 600 }}
              />
            </Tabs>
            <Box sx={{ p: 2, display: "flex", gap: 2, alignItems: "center" }}>
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
                <>
                  <Button
                    variant="outlined"
                    startIcon={<ExportIcon />}
                    onClick={handleExport}
                    sx={{ textTransform: "none", borderRadius: 3 }}
                  >
                    Exporter
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ImportIcon />}
                    onClick={handleOpenImportDialog}
                    sx={{ textTransform: "none", borderRadius: 3 }}
                  >
                    Importer
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        )}

        {/* Import Dialog */}
        <Dialog open={importDialogOpen} onClose={handleCloseImportDialog}>
          <DialogTitle>Importer des Recettes</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sélectionnez un fichier CSV contenant des recettes. Les colonnes attendues sont : name, description, prepTime, servings, ingredients, instructions, tags, visibility, photoUrl.
            </Typography>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ marginBottom: "16px" }}
            />
            {importError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {importError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseImportDialog}>Annuler</Button>
            <Button
              onClick={handleImport}
              variant="contained"
              disabled={!importFile || loading}
            >
              Importer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Error Alert */}
        {error && (
          <Fade in>
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
              {error}
            </Alert>
          </Fade>
        )}

        {/* Stats Bar */}
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
                    }}
                  />
                )}
              </Stack>
            </Box>
          </Fade>
        )}

        {/* Recipes Grid */}
        {loading
          ? renderSkeletons(theme)
          : familyId && (
              <Grid container spacing={3}>
                {filteredRecipes.length > 0 ? (
                  filteredRecipes.map((recipe, index) => (
                    <Grid item xs={12} sm={6} md={4} key={recipe.id}>
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
                            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              transform: "translateY(-8px)",
                              boxShadow: `0 20px 60px ${alpha(
                                theme.palette.primary.main,
                                0.15
                              )}`,
                              border: `1px solid ${alpha(
                                theme.palette.primary.main,
                                0.3
                              )}`,
                            },
                          }}
                        >
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
                                transition: "transform 0.3s ease",
                                "&:hover": {
                                  transform: "scale(1.05)",
                                },
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
                                      0.9
                                    ),
                                    backdropFilter: "blur(4px)",
                                    fontSize: "0.75rem",
                                    color:
                                      recipe.visibility === "family"
                                        ? theme.palette.secondary.main
                                        : theme.palette.info.main,
                                  }}
                                />
                              </Tooltip>
                              {recipe.prepTime && (
                                <Chip
                                  icon={<AccessTimeIcon />}
                                  label={`${recipe.prepTime}min`}
                                  size="small"
                                  sx={{
                                    backgroundColor: alpha(
                                      theme.palette.background.paper,
                                      0.9
                                    ),
                                    backdropFilter: "blur(4px)",
                                    fontSize: "0.75rem",
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
                                      0.9
                                    ),
                                    backdropFilter: "blur(4px)",
                                    fontSize: "0.75rem",
                                  }}
                                />
                              )}
                            </Box>
                          </Box>

                          <CardContent sx={{ flexGrow: 1, p: 3 }}>
                            <Typography
                              variant="h6"
                              component="div"
                              sx={{
                                fontWeight: 600,
                                mb: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {recipe.name}
                            </Typography>
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
                                sx={{ flexWrap: "wrap", gap: 0.5 }}
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
                          </CardContent>

                          <CardActions sx={{ p: 3, pt: 0 }}>
                            <Button
                              size="small"
                              component={RouterLink}
                              to={`/recipes/${recipe.id}`}
                              startIcon={<VisibilityIcon />}
                              sx={{
                                borderRadius: 3,
                                textTransform: "none",
                                fontWeight: 500,
                              }}
                            >
                              Voir Détails
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
                                }}
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
                      <Typography
                        variant="h6"
                        color="text.secondary"
                        align="center"
                        sx={{ mt: 4 }}
                      >
                        {`Aucune recette ${activeTab === "family" ? "familiale" : "publique"} trouvée`}
                        {searchTerm && ` pour "${searchTerm}"`}.
                      </Typography>
                    </Fade>
                  </Grid>
                )}
              </Grid>
            )}

        {/* FAB to Add Recipe */}
        {canModify && familyId && (
          <Zoom in timeout={1200}>
            <Fab
              color="primary"
              aria-label="add recipe"
              sx={{
                position: "fixed",
                bottom: theme.spacing(4),
                right: theme.spacing(4),
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
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
