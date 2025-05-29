"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Autocomplete,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Toolbar,
  Tooltip,
  useTheme,
  alpha,
  Stack,
  LinearProgress,
  Fade,
  Zoom,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Category as CategoryIcon, // Icon for ingredients
  InfoOutlined as InfoIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Translate as TranslateIcon,
  WarningAmber as WarningIcon,
  CheckCircleOutline as CheckCircleIcon,
  Scale as ScaleIcon, // Icon for units
} from '@mui/icons-material';

// --- Firebase Imports --- 
import { db } from '../firebaseConfig';
import {
  collection,
  query,
  orderBy as firebaseOrderBy, // Rename Firebase orderBy on import
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  writeBatch,
  Timestamp,
  where, // Needed for checking usage before delete
  limit, // Needed for checking usage before delete
  getDoc // Needed for checking usage before delete
} from 'firebase/firestore';

// --- Context Import --- 
import { useAuth } from '../contexts/AuthContext';

// --- Utility Import --- 
// import { formatQuantityUnit } from '../utils/unitConverter'; // Might not be needed here

const ingredientCategories = [
  "Fruits",
  "Légumes",
  "Viandes",
  "Poissons",
  "Produits laitiers",
  "Épicerie Salée",
  "Épicerie Sucrée",
  "Boulangerie",
  "Boissons",
  "Surgelés",
  "Autre",
];

// Helper function for sorting
function descendingComparator(a, b, sortField) { // Renamed parameter
  // Handle nested properties like units count or last updated potentially
  let valA = a[sortField];
  let valB = b[sortField];

  if (sortField === 'unitsCount') {
      valA = a.units ? Object.keys(a.units).length : 0;
      valB = b.units ? Object.keys(b.units).length : 0;
  } else if (sortField === 'updatedAt' || sortField === 'createdAt') {
      valA = a[sortField]?.toDate ? a[sortField].toDate().getTime() : 0;
      valB = b[sortField]?.toDate ? b[sortField].toDate().getTime() : 0;
  }

  if (valB < valA) return -1;
  if (valB > valA) return 1;
  return 0;
}

function getComparator(order, sortField) { // Renamed parameter
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, sortField)
    : (a, b) => -descendingComparator(a, b, sortField);
}

// Stable sort utility
function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

// Table Header Configuration
const headCells = [
  { id: 'name', numeric: false, disablePadding: false, label: 'Nom Principal' },
  { id: 'category', numeric: false, disablePadding: false, label: 'Catégorie' },
  { id: 'synonyms', numeric: false, disablePadding: false, label: 'Synonymes' },
  { id: 'unitsCount', numeric: true, disablePadding: false, label: 'Nb Unités' }, // Calculated field
  { id: 'updatedAt', numeric: false, disablePadding: false, label: 'Dernière MàJ' },
  { id: 'actions', numeric: false, disablePadding: false, label: 'Actions' },
];

function EnhancedTableHead(props) {
  const { order, sortField, onRequestSort } = props; // Renamed prop
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={sortField === headCell.id ? order : false} // Use sortField
          >
            <TableSortLabel
              active={sortField === headCell.id} // Use sortField
              direction={sortField === headCell.id ? order : 'asc'} // Use sortField
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {sortField === headCell.id ? ( // Use sortField
                <Box component="span" sx={{ position: 'absolute', top: -4, right: -20 }}>
                  {order === 'desc' ? ' (desc)' : ' (asc)'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

// --- Unit Management Component within Dialog --- 
function UnitEditor({ units, onUnitsChange }) {
    const theme = useTheme(); // Added theme for alpha
    const [unitList, setUnitList] = useState(() => Object.entries(units || {}).map(([name, data]) => ({ name, ...data })));
    const [newUnitName, setNewUnitName] = useState('');
    const [newUnitConversion, setNewUnitConversion] = useState('');
    const [newUnitPrice, setNewUnitPrice] = useState('');
    const [newUnitIsStandard, setNewUnitIsStandard] = useState(false);

    useEffect(() => {
      // Convert internal state back to Firestore format when changed
      const newUnitsData = {};
      unitList.forEach(unit => {
          const unitData = {
              isStandard: unit.isStandard || false,
          };
          // Only include conversionFactor if it's a valid number
          if (unit.conversionFactor !== undefined && unit.conversionFactor !== '' && !isNaN(Number(unit.conversionFactor))) {
              unitData.conversionFactor = Number(unit.conversionFactor);
          }
          // Only include standardPrice if it's a valid number
          if (unit.standardPrice !== undefined && unit.standardPrice !== '' && !isNaN(Number(unit.standardPrice))) {
              unitData.standardPrice = Number(unit.standardPrice);
          }
          // Include priceSource and lastPriceUpdate only if standardPrice is provided
          if (unitData.standardPrice !== undefined) {
              unitData.priceSource = unit.priceSource || 'user_input';
              unitData.lastPriceUpdate = unit.lastPriceUpdate || serverTimestamp();
          }
          newUnitsData[unit.name] = unitData;
      });
      onUnitsChange(newUnitsData);
    }, [unitList, onUnitsChange]);

    const handleUnitChange = (index, field, value) => {
        const updatedList = [...unitList];
        updatedList[index] = { ...updatedList[index], [field]: value };

        // Ensure only one standard unit
        if (field === 'isStandard' && value === true) {
            updatedList.forEach((unit, i) => {
                if (i !== index) unit.isStandard = false;
            });
        }
        setUnitList(updatedList);
    };

    const handleAddUnit = () => {
        if (!newUnitName.trim() || unitList.some(u => u.name === newUnitName.trim())) {
            alert("Nom d'unité invalide ou déjà existant.");
            return;
        }
        // Ensure only one standard unit if the new one is standard
        let currentList = [...unitList];
        if (newUnitIsStandard) {
            currentList = currentList.map(u => ({ ...u, isStandard: false }));
        }

        const newUnit = {
            name: newUnitName.trim(),
            isStandard: newUnitIsStandard,
        };
        // Only include conversionFactor if valid
        if (newUnitConversion !== '' && !isNaN(Number(newUnitConversion))) {
            newUnit.conversionFactor = Number(newUnitConversion);
        }
        // Only include standardPrice and related fields if valid
        if (newUnitPrice !== '' && !isNaN(Number(newUnitPrice))) {
            newUnit.standardPrice = Number(newUnitPrice);
            newUnit.priceSource = 'user_input';
            newUnit.lastPriceUpdate = serverTimestamp();
        }

        setUnitList([...currentList, newUnit]);
        // Reset new unit form
        setNewUnitName('');
        setNewUnitConversion('');
        setNewUnitPrice('');
        setNewUnitIsStandard(false);
    };

    const handleRemoveUnit = (indexToRemove) => {
        const unitToRemove = unitList[indexToRemove];
        if (unitToRemove.isStandard && unitList.length > 1) {
            alert("Impossible de supprimer l'unité standard s'il existe d'autres unités. Définissez une autre unité comme standard d'abord.");
            return;
        }
        setUnitList(unitList.filter((_, index) => index !== indexToRemove));
    };

    return (
        <Box sx={{ mt: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 2, p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>Gestion des Unités</Typography>
            {unitList.map((unit, index) => (
                <Paper key={index} elevation={0} sx={{ p: 2, mb: 1, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                            <TextField label="Nom Unité" value={unit.name} disabled size="small" fullWidth />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                label="Facteur Conv. (vers std)"
                                type="number"
                                value={unit.conversionFactor || ''}
                                onChange={(e) => handleUnitChange(index, 'conversionFactor', e.target.value)}
                                size="small" fullWidth
                                disabled={unit.isStandard}
                                helperText={unit.isStandard ? "Unité Standard" : "Ex: 1000 si g -> kg"}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                label="Prix Standard (FCFA)"
                                type="number"
                                value={unit.standardPrice || ''}
                                onChange={(e) => handleUnitChange(index, 'standardPrice', e.target.value)}
                                size="small" fullWidth
                                InputProps={{ endAdornment: <InputAdornment position="end">FCFA</InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={8} sm={2}>
                            <FormControlLabel
                                control={<Switch checked={unit.isStandard || false} onChange={(e) => handleUnitChange(index, 'isStandard', e.target.checked)} size="small" />}
                                label="Standard?"
                                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
                            />
                        </Grid>
                        <Grid item xs={4} sm={1} sx={{ textAlign: 'right' }}>
                            <Tooltip title="Supprimer cette unité">
                                <span> {/* Span needed for disabled button tooltip */} 
                                    <IconButton size="small" onClick={() => handleRemoveUnit(index)} disabled={unit.isStandard && unitList.length <= 1}>
                                        <DeleteIcon fontSize="small" color="error" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Grid>
                    </Grid>
                </Paper>
            ))}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Ajouter une nouvelle unité</Typography>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                    <TextField label="Nom Unité" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} size="small" fullWidth />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <TextField label="Facteur Conv." type="number" value={newUnitConversion} onChange={(e) => setNewUnitConversion(e.target.value)} size="small" fullWidth disabled={newUnitIsStandard} />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <TextField label="Prix Standard" type="number" value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)} size="small" fullWidth InputProps={{ endAdornment: <InputAdornment position="end">FCFA</InputAdornment> }} />
                </Grid>
                <Grid item xs={8} sm={2}>
                    <FormControlLabel control={<Switch checked={newUnitIsStandard} onChange={(e) => setNewUnitIsStandard(e.target.checked)} size="small" />} label="Standard?" sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }} />
                </Grid>
                <Grid item xs={4} sm={1} sx={{ textAlign: 'right' }}>
                    <Button onClick={handleAddUnit} size="small" variant="outlined" startIcon={<AddIcon />}>Ajouter</Button>
                </Grid>
            </Grid>
        </Box>
    );
}
// --- End Unit Management Component --- 

export default function IngredientsPage() {
  const theme = useTheme();
  const { currentUser, userData, loading: authLoading } = useAuth();
  const familyId = userData?.familyId; // Assuming ingredients might be family-specific or global

  const [allIngredients, setAllIngredients] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Table State
  const [order, setOrder] = useState('asc');
  const [sortField, setSortField] = useState('name'); // Renamed state variable
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); // For filtering

  // Add/Edit Ingredient Dialog State
  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null); // Holds the ingredient being edited
  const [ingredientFormData, setIngredientFormData] = useState({ // State for form fields
      name: '',
      synonyms: [],
      category: '',
      units: {},
  });
  const [isSavingIngredient, setIsSavingIngredient] = useState(false);

  // Delete Confirmation Dialog State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [usageInfo, setUsageInfo] = useState({ inRecipes: false, inStock: false });

  // Fetch All Ingredients (Real-time)
  useEffect(() => {
    setLoadingIngredients(true);
    setError('');
    // Query ingredients - adjust if they can be global vs family-specific
    const ingredientsRef = collection(db, 'ingredients');
    // Example: Add filter if ingredients are family-specific
    // const q = query(ingredientsRef, where('familyId', '==', familyId), firebaseOrderBy('name', 'asc'));
    const q = query(ingredientsRef, firebaseOrderBy('name', 'asc')); // Use renamed firebaseOrderBy

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const items = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setAllIngredients(items);
        setLoadingIngredients(false);
      },
      (err) => {
        console.error('Error fetching ingredients:', err);
        setError('Erreur lors de la récupération des ingrédients.');
        setLoadingIngredients(false);
      }
    );

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [familyId]); // Add familyId if filtering by it

  // --- Filtering and Sorting Logic --- 
  const handleRequestSort = (event, property) => {
    const isAsc = sortField === property && order === 'asc'; // Use sortField
    setOrder(isAsc ? 'desc' : 'asc');
    setSortField(property); // Use setSortField
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredIngredients = useMemo(() => {
    return allIngredients.filter(item => {
      const nameMatch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const synonymMatch = item.synonyms?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      const categoryMatch = !selectedCategory || item.category === selectedCategory;
      return (nameMatch || synonymMatch) && categoryMatch;
    });
  }, [allIngredients, searchTerm, selectedCategory]);

  const sortedAndPaginatedItems = useMemo(() => {
    return stableSort(filteredIngredients, getComparator(order, sortField)).slice( // Use sortField
      page * rowsPerPage, page * rowsPerPage + rowsPerPage,
    );
  }, [filteredIngredients, order, sortField, page, rowsPerPage]); // Use sortField

  // --- Add/Edit Ingredient Dialog Logic --- 
  const handleOpenIngredientDialog = (ingredientToEdit = null) => {
    setError('');
    setEditingIngredient(ingredientToEdit);
    if (ingredientToEdit) {
      setIngredientFormData({
        name: ingredientToEdit.name || '',
        synonyms: ingredientToEdit.synonyms || [],
        category: ingredientToEdit.category || '',
        units: ingredientToEdit.units || {},
      });
    } else {
      // Reset form for new ingredient
      setIngredientFormData({
        name: '',
        synonyms: [],
        category: ingredientCategories[0], // Default category
        units: {}, // Start with empty units
      });
    }
    setIngredientDialogOpen(true);
  };

  const handleCloseIngredientDialog = () => {
    setIngredientDialogOpen(false);
    setIsSavingIngredient(false);
  };

  const handleFormInputChange = (event) => {
    const { name, value } = event.target;
    setIngredientFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSynonymsChange = (event, newValue) => {
    setIngredientFormData(prev => ({ ...prev, synonyms: newValue }));
  };

  const handleUnitsChange = useCallback((newUnitsData) => {
    setIngredientFormData(prev => ({ ...prev, units: newUnitsData }));
  }, []);

  const handleSaveIngredient = async () => {
    setError('');
    // Basic Validation
    if (!ingredientFormData.name.trim()) {
      setError('Le nom principal est requis.');
      return;
    }
    if (!ingredientFormData.category) {
      setError('La catégorie est requise.');
      return;
    }
    if (Object.keys(ingredientFormData.units).length === 0) {
        setError('Au moins une unité doit être définie.');
        return;
    }
    const hasStandardUnit = Object.values(ingredientFormData.units).some(u => u.isStandard);
    if (!hasStandardUnit) {
        setError('Une unité doit être marquée comme standard.');
        return;
    }

    setIsSavingIngredient(true);

    const dataToSave = {
      name: ingredientFormData.name.trim(),
      synonyms: ingredientFormData.synonyms.map(s => s.trim()).filter(Boolean),
      category: ingredientFormData.category,
      units: ingredientFormData.units,
      updatedAt: serverTimestamp(),
      // familyId: familyId || null, // Add if ingredients are family-specific
    };

    try {
      if (editingIngredient) {
        // Update existing ingredient
        const ingredientRef = doc(db, 'ingredients', editingIngredient.id);
        dataToSave.updatedBy = currentUser.uid;
        await updateDoc(ingredientRef, dataToSave);
        setSuccessMessage(`Ingrédient '${dataToSave.name}' mis à jour.`);
      } else {
        // Add new ingredient
        dataToSave.createdAt = serverTimestamp();
        dataToSave.createdBy = currentUser.uid;
        const docRef = await addDoc(collection(db, 'ingredients'), dataToSave);
        setSuccessMessage(`Ingrédient '${dataToSave.name}' créé avec succès.`);
      }
      handleCloseIngredientDialog();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error saving ingredient:', err);
      setError('Erreur lors de la sauvegarde de l\'ingrédient.');
      setIsSavingIngredient(false); // Keep dialog open on error
    }
  };

  // --- Delete Ingredient Logic --- 
  const handleOpenDeleteConfirm = async (ingredient) => {
    setIngredientToDelete(ingredient);
    setDeleteConfirmOpen(true);
    setIsCheckingUsage(true);
    setUsageInfo({ inRecipes: false, inStock: false }); // Reset usage info
    setError('');

    try {
        // Check usage in recipes
        // This query might be inefficient or require specific indexing in Firestore
        // Consider a more robust check, maybe using Cloud Functions or denormalization
        const recipesQuery = query(
            collection(db, 'recipes'), 
            where('ingredientsList', 'array-contains', { ingredientId: ingredient.id }), // Requires exact match, might fail if other fields differ
            limit(1)
        );
        // Fallback: Query all recipes and check client-side (less efficient)
        // const allRecipesQuery = query(collection(db, 'recipes'));
        // const allRecipesSnap = await getDocs(allRecipesQuery);
        // const usedInRecipes = allRecipesSnap.docs.some(doc => 
        //     doc.data().ingredientsList?.some(item => item.ingredientId === ingredient.id)
        // );
        const recipesSnap = await getDocs(recipesQuery);
        const usedInRecipes = !recipesSnap.empty; // Simplified check, review Firestore query needs

        // Check usage in stock (assuming stock is family-specific)
        let usedInStock = false;
        if (familyId) {
            const stockRef = doc(db, 'families', familyId, 'stockItems', ingredient.id);
            const stockSnap = await getDoc(stockRef);
            usedInStock = stockSnap.exists();
        }

        setUsageInfo({ inRecipes: usedInRecipes, inStock: usedInStock });

    } catch (err) {
        console.error("Error checking ingredient usage:", err);
        setError("Erreur lors de la vérification de l'utilisation de l'ingrédient.");
    } finally {
        setIsCheckingUsage(false);
    }
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setIngredientToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!ingredientToDelete) return;
    if (usageInfo.inRecipes || usageInfo.inStock) {
        setError("Impossible de supprimer : l'ingrédient est utilisé dans des recettes ou dans le stock.");
        return;
    }

    setIsSavingIngredient(true); // Reuse saving state for delete operation
    setError('');
    setSuccessMessage('');

    try {
      const ingredientRef = doc(db, 'ingredients', ingredientToDelete.id);
      await deleteDoc(ingredientRef);
      setSuccessMessage(`Ingrédient '${ingredientToDelete.name}' supprimé.`);
      handleCloseDeleteConfirm();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting ingredient:', err);
      setError('Erreur lors de la suppression de l\'ingrédient.');
    } finally {
      setIsSavingIngredient(false);
    }
  };

  const isLoading = authLoading || loadingIngredients;

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.info.main, 0.03)} 100%)`,
        minHeight: 'calc(100vh - 64px)', // Adjust based on your AppBar height
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Fade in timeout={600}>
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                Gestion des Ingrédients
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Ajoutez, modifiez ou supprimez les ingrédients disponibles
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenIngredientDialog()}
              disabled={isLoading}
              sx={{ borderRadius: 3, px: 3, py: 1.5, background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)` }}
            >
              Nouvel Ingrédient
            </Button>
          </Box>
        </Fade>

        {/* Loading Indicator */}
        {isLoading && (
            <Box sx={{ mb: 3 }}>
              <LinearProgress color="info" sx={{ borderRadius: 2, height: 6 }} />
            </Box>
        )}

        {/* Error Alert */}
        {error && !ingredientDialogOpen && !deleteConfirmOpen && (
          <Fade in>
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert>
          </Fade>
        )}
        {/* Success Message */}
        {successMessage && (
          <Fade in>
            <Alert severity="success" sx={{ mb: 3, borderRadius: 3 }}>{successMessage}</Alert>
          </Fade>
        )}

        {!isLoading && (
          <Zoom in timeout={800}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 6,
                overflow: 'hidden', // Important for TableContainer border radius
                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
                border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
              }}
            >
              {/* Toolbar with Search and Filter */}
              <Toolbar
                sx={{
                  pl: { sm: 2 },
                  pr: { xs: 1, sm: 1 },
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <TextField
                  variant="outlined"
                  size="small"
                  placeholder="Rechercher un ingrédient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ 
                    flexGrow: 1, 
                    mr: 2, 
                    '& .MuiOutlinedInput-root': { borderRadius: 3 }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                  <InputLabel id="category-filter-label">Catégorie</InputLabel>
                  <Select
                    labelId="category-filter-label"
                    value={selectedCategory}
                    label="Catégorie"
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <MenuItem value=""><em>Toutes</em></MenuItem>
                    {ingredientCategories.map((cat) => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {/* Add more filters if needed */}
              </Toolbar>

              <TableContainer>
                <Table aria-labelledby="tableTitle" size={'medium'}>
                  <EnhancedTableHead
                    order={order}
                    sortField={sortField} // Pass sortField
                    onRequestSort={handleRequestSort}
                  />
                  <TableBody>
                    {sortedAndPaginatedItems.map((item, index) => {
                      const labelId = `ingredients-table-item-${index}`;
                      const lastUpdatedDate = item.updatedAt?.toDate ? item.updatedAt.toDate().toLocaleDateString('fr-FR') : 'N/A';
                      const unitsCount = item.units ? Object.keys(item.units).length : 0;
                      const synonymsText = item.synonyms?.join(', ') || '-';

                      return (
                        <TableRow
                          hover
                          role="row"
                          tabIndex={-1}
                          key={item.id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell component="th" id={labelId} scope="row">
                            {item.name}
                          </TableCell>
                          <TableCell align="left">{item.category || 'N/A'}</TableCell>
                          <TableCell align="left">
                            <Tooltip title={synonymsText} placement="top-start">
                                <Typography noWrap variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {synonymsText}
                                </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">{unitsCount}</TableCell>
                          <TableCell align="left">{lastUpdatedDate}</TableCell>
                          <TableCell align="left">
                            <Tooltip title="Modifier">
                              <IconButton size="small" onClick={() => handleOpenIngredientDialog(item)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer">
                              <IconButton size="small" onClick={() => handleOpenDeleteConfirm(item)} color="error">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredIngredients.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={headCells.length} align="center">
                          Aucun ingrédient trouvé.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredIngredients.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Ingrédients par page:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
              />
            </Paper>
          </Zoom>
        )}

        {/* Add/Edit Ingredient Dialog */}
        <Dialog 
            open={ingredientDialogOpen} 
            onClose={handleCloseIngredientDialog} 
            maxWidth="md" // Make dialog wider for unit editor
            fullWidth
        >
          <DialogTitle>{editingIngredient ? 'Modifier l\'ingrédient' : 'Créer un nouvel ingrédient'}</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>} 
              <TextField 
                autoFocus 
                margin="dense" 
                label="Nom principal" 
                name="name" 
                type="text" 
                fullWidth 
                value={ingredientFormData.name}
                onChange={handleFormInputChange} 
                required 
              />
              <Autocomplete
                multiple freeSolo options={[]} 
                value={ingredientFormData.synonyms}
                onChange={handleSynonymsChange}
                renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option} {...getTagProps({ index })} sx={{ borderRadius: 2 }} />)) }
                renderInput={(params) => (<TextField {...params} variant="outlined" label="Synonymes (optionnel)" placeholder="Ex: Bissap..." InputProps={{ ...params.InputProps, startAdornment: (<InputAdornment position="start"><TranslateIcon color="action" /></InputAdornment>), }} />) }
              />
              <FormControl fullWidth required>
                <InputLabel id="category-select-label">Catégorie</InputLabel>
                <Select 
                    labelId="category-select-label" 
                    name="category" 
                    value={ingredientFormData.category}
                    label="Catégorie" 
                    onChange={handleFormInputChange}
                >
                  {ingredientCategories.map((cat) => (<MenuItem key={cat} value={cat}>{cat}</MenuItem>))}
                </Select>
              </FormControl>
              
              {/* Unit Editor Component */}
              <UnitEditor 
                units={ingredientFormData.units} 
                onUnitsChange={handleUnitsChange} 
              />

            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseIngredientDialog} disabled={isSavingIngredient}>Annuler</Button>
            <Button onClick={handleSaveIngredient} variant="contained" disabled={isSavingIngredient}>
              {isSavingIngredient ? <CircularProgress size={20} /> : (editingIngredient ? 'Mettre à jour' : 'Sauvegarder')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm} maxWidth="sm">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon color="error" sx={{ mr: 1 }} /> Confirmation de Suppression
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ mb: 2 }}>
                    Êtes-vous sûr de vouloir supprimer l'ingrédient "<strong>{ingredientToDelete?.name}</strong>" ?
                </Typography>
                {isCheckingUsage ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2">Vérification de l'utilisation...</Typography>
                    </Box>
                ) : (
                    <Box>
                        {usageInfo.inRecipes && (
                            <Alert severity="warning" icon={<InfoIcon />} sx={{ mb: 1 }}>Utilisé dans au moins une recette.</Alert>
                        )}
                        {usageInfo.inStock && (
                            <Alert severity="warning" icon={<InfoIcon />} sx={{ mb: 1 }}>Présent dans le stock familial.</Alert>
                        )}
                        {(usageInfo.inRecipes || usageInfo.inStock) && (
                            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                La suppression est impossible tant que l'ingrédient est utilisé.
                            </Typography>
                        )}
                        {!(usageInfo.inRecipes || usageInfo.inStock) && (
                             <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 1 }}>Cet ingrédient ne semble pas être utilisé actuellement.</Alert>
                        )}
                    </Box>
                )}
                 {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleCloseDeleteConfirm} disabled={isSavingIngredient}>Annuler</Button>
                <Button 
                    onClick={handleConfirmDelete} 
                    variant="contained" 
                    color="error" 
                    disabled={isSavingIngredient || isCheckingUsage || usageInfo.inRecipes || usageInfo.inStock}
                    startIcon={isSavingIngredient ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
                >
                    Supprimer Définitivement
                </Button>
            </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}
