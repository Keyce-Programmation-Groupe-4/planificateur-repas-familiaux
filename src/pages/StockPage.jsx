"use client"

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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
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
  Checkbox,
  useTheme,
  alpha,
  Stack,
  LinearProgress,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Inventory2 as InventoryIcon, // Icon for stock
  AddCircleOutline as AddCircleOutlineIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
  WarningAmber as WarningIcon,
  CheckCircleOutline as CheckCircleIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  Translate as TranslateIcon,
} from '@mui/icons-material';

// --- Firebase Imports --- 
import { db } from '../firebaseConfig';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  addDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

// --- Context Import --- 
import { useAuth } from '../contexts/AuthContext';

// --- Component Imports --- 
// We might need to refactor the New Ingredient Dialog from RecipeFormPage later
// import NewIngredientDialog from '../components/Stock/NewIngredientDialog'; 

// --- Utility Import --- 
import { formatQuantityUnit } from '../utils/unitConverter'; // Assuming this exists and works

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
function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
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
  { id: 'ingredientName', numeric: false, disablePadding: false, label: 'Ingrédient' },
  { id: 'quantity', numeric: true, disablePadding: false, label: 'Quantité en Stock' },
  { id: 'unit', numeric: false, disablePadding: false, label: 'Unité' },
  { id: 'category', numeric: false, disablePadding: false, label: 'Catégorie' }, // Added category
  { id: 'lastUpdated', numeric: false, disablePadding: false, label: 'Dernière MàJ' },
  { id: 'actions', numeric: false, disablePadding: false, label: 'Actions' },
];

function EnhancedTableHead(props) {
  const { order, sortField, onRequestSort } = props;
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
            sortDirection={sortField === headCell.id ? order : false}
          >
            <TableSortLabel
              active={sortField === headCell.id}
              direction={sortField === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {sortField === headCell.id ? (
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

export default function StockPage() {
  const theme = useTheme();
  const { currentUser, userData, loading: authLoading } = useAuth();
  const familyId = userData?.familyId;

  const [stockItems, setStockItems] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]); // To search and add new stock
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Table State
  const [order, setOrder] = useState('asc');
  const [sortField, setSortField] = useState('ingredientName');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); // For filtering

  // Add/Edit Stock Item State
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState(null); // Holds the item being edited
  const [selectedIngredientToAdd, setSelectedIngredientToAdd] = useState(null);
  const [addQuantity, setAddQuantity] = useState('');
  const [addUnit, setAddUnit] = useState('');
  const [availableUnitsForAdd, setAvailableUnitsForAdd] = useState([]);
  const [isSavingStock, setIsSavingStock] = useState(false);

  // New Ingredient Dialog State (Simplified for now, needs refactoring)
  const [newIngredientDialogOpen, setNewIngredientDialogOpen] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientSynonyms, setNewIngredientSynonyms] = useState([]);
  const [newIngredientCategory, setNewIngredientCategory] = useState(ingredientCategories[0]);
  const [newIngredientFirstUnit, setNewIngredientFirstUnit] = useState('');
  const [savingNewIngredient, setSavingNewIngredient] = useState(false);

  // Fetch All Ingredients (for adding stock)
  const fetchAllIngredients = useCallback(async () => {
    if (!loadingIngredients) setLoadingIngredients(true);
    setError('');
    try {
      const ingredientsRef = collection(db, 'ingredients');
      const q = query(ingredientsRef);
      const querySnapshot = await getDocs(q);
      const fetchedIngredients = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAllIngredients(fetchedIngredients.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Error fetching all ingredients:', err);
      setError('Erreur lors du chargement des ingrédients disponibles.');
    } finally {
      setLoadingIngredients(false);
    }
  }, []);

  // Fetch Stock Items (Real-time)
  useEffect(() => {
    if (!familyId) {
      if (!authLoading) setLoadingStock(false);
      return;
    }

    setLoadingStock(true);
    setError('');
    const stockRef = collection(db, 'families', familyId, 'stockItems');
    const q = query(stockRef, orderBy('ingredientName', 'asc')); // Default sort

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const items = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setStockItems(items);
        setLoadingStock(false);
      },
      (err) => {
        console.error('Error fetching stock items:', err);
        setError('Erreur lors de la récupération du stock.');
        setLoadingStock(false);
      }
    );

    // Fetch ingredients needed for adding stock
    fetchAllIngredients();

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [familyId, authLoading, fetchAllIngredients]);

  // --- Filtering and Sorting Logic --- 
  const handleRequestSort = (event, property) => {
    const isAsc = sortField === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setSortField(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredStockItems = useMemo(() => {
    return stockItems.filter(item => {
      const nameMatch = item.ingredientName?.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = !selectedCategory || item.category === selectedCategory;
      // TODO: Add synonym search if needed here, requires fetching ingredient details
      return nameMatch && categoryMatch;
    });
  }, [stockItems, searchTerm, selectedCategory]);

  const sortedAndPaginatedItems = useMemo(() => {
    return stableSort(filteredStockItems, getComparator(order, sortField)).slice(
      page * rowsPerPage, page * rowsPerPage + rowsPerPage,
    );
  }, [filteredStockItems, order, sortField, page, rowsPerPage]);

  // --- Add/Edit Stock Dialog Logic --- 
  const handleOpenAddStockDialog = (itemToEdit = null) => {
    setError('');
    setEditingStockItem(itemToEdit);
    if (itemToEdit) {
      // Find the full ingredient details to pre-fill
      const ingredientDetail = allIngredients.find(ing => ing.id === itemToEdit.id);
      setSelectedIngredientToAdd(ingredientDetail || { id: itemToEdit.id, name: itemToEdit.ingredientName }); // Fallback if details not found
      setAddQuantity(itemToEdit.quantity);
      setAddUnit(itemToEdit.unit);
      // Populate available units based on the ingredient details
      if (ingredientDetail && ingredientDetail.units) {
        setAvailableUnitsForAdd(Object.keys(ingredientDetail.units));
      } else {
        setAvailableUnitsForAdd([itemToEdit.unit]); // Only show the current unit if details missing
      }
    } else {
      setSelectedIngredientToAdd(null);
      setAddQuantity('');
      setAddUnit('');
      setAvailableUnitsForAdd([]);
    }
    setAddStockDialogOpen(true);
  };

  const handleCloseAddStockDialog = () => {
    setAddStockDialogOpen(false);
    setIsSavingStock(false);
  };

  const handleSelectedIngredientForAddChange = (event, newValue) => {
    setSelectedIngredientToAdd(newValue);
    setError('');
    if (newValue && newValue.units && typeof newValue.units === 'object') {
      const units = Object.keys(newValue.units);
      setAvailableUnitsForAdd(units);
      // Try to find a default/standard unit, or fallback to the first one
      const standardUnit = units.find(u => newValue.units[u]?.isStandard) || units[0] || '';
      setAddUnit(standardUnit);
    } else {
      setAvailableUnitsForAdd([]);
      setAddUnit('');
    }
  };

  const handleSaveStockItem = async () => {
    setError('');
    if (!selectedIngredientToAdd || !addQuantity || !addUnit) {
      setError('Veuillez sélectionner un ingrédient, une quantité et une unité.');
      return;
    }
    const quantityValue = Number.parseFloat(addQuantity);
    if (isNaN(quantityValue) || quantityValue < 0) { // Allow 0 quantity to remove item effectively
      setError('La quantité doit être un nombre positif ou zéro.');
      return;
    }
    if (!availableUnitsForAdd.includes(addUnit)) {
      setError(`L'unité '${addUnit}' n'est pas valide pour cet ingrédient.`);
      // TODO: Offer to add the unit?
      return;
    }
    if (!familyId) {
        setError('ID de famille non trouvé.');
        return;
    }

    setIsSavingStock(true);
    const stockItemRef = doc(db, 'families', familyId, 'stockItems', selectedIngredientToAdd.id);

    try {
      const ingredientDetails = allIngredients.find(ing => ing.id === selectedIngredientToAdd.id);
      const stockData = {
        ingredientName: selectedIngredientToAdd.name,
        quantity: quantityValue,
        unit: addUnit,
        category: ingredientDetails?.category || 'Autre', // Get category from details
        lastUpdated: serverTimestamp(),
      };

      if (quantityValue === 0) {
        // If quantity is 0, delete the stock item instead of setting quantity to 0
        await deleteDoc(stockItemRef);
        setSuccessMessage(`${selectedIngredientToAdd.name} retiré du stock.`);
      } else {
        // Use setDoc with merge:true which acts as upsert (create or update)
        await setDoc(stockItemRef, stockData, { merge: true });
        setSuccessMessage(`${selectedIngredientToAdd.name} mis à jour dans le stock.`);
      }
      
      handleCloseAddStockDialog();
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err) {
      console.error('Error saving stock item:', err);
      setError('Erreur lors de la sauvegarde de l\'article en stock.');
      setIsSavingStock(false); // Keep dialog open on error
    }
  };

  // --- Delete Stock Item Logic --- 
  const handleDeleteStockItem = async (itemId, itemName) => {
    if (!familyId) return;
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer '${itemName}' de votre stock ?`)) {
      return;
    }
    setError('');
    setSuccessMessage('');
    try {
      const stockItemRef = doc(db, 'families', familyId, 'stockItems', itemId);
      await deleteDoc(stockItemRef);
      setSuccessMessage(`${itemName} supprimé du stock.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting stock item:', err);
      setError('Erreur lors de la suppression de l\'article.');
    }
  };

  // --- New Ingredient Creation Logic (Placeholder - Needs Refactoring) ---
  const handleOpenNewIngredientDialog = () => {
    // Reset fields
    setNewIngredientName('');
    setNewIngredientSynonyms([]);
    setNewIngredientCategory(ingredientCategories[0]);
    setNewIngredientFirstUnit('');
    setSavingNewIngredient(false);
    setError(''); // Clear specific dialog error
    setNewIngredientDialogOpen(true);
  };

  const handleCloseNewIngredientDialog = () => {
    setNewIngredientDialogOpen(false);
  };

  const handleSaveNewIngredient = async () => {
    // Basic validation
    if (!newIngredientName.trim() || !newIngredientFirstUnit.trim()) {
      setError('Le nom et la première unité sont requis.'); // Set error within dialog
      return;
    }
    setError('');
    setSavingNewIngredient(true);

    try {
      const ingredientsRef = collection(db, 'ingredients');
      const newIngredientData = {
        name: newIngredientName.trim(),
        synonyms: newIngredientSynonyms.map(s => s.trim()).filter(Boolean),
        category: newIngredientCategory,
        units: {
          [newIngredientFirstUnit.trim()]: { isStandard: true } // Simplified for now
        },
        // Decide if ingredients are global or family-specific
        // familyId: familyId || null, 
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(ingredientsRef, newIngredientData);
      const newIngredientForList = { id: docRef.id, ...newIngredientData };
      
      // Add to local state and select it for the stock dialog
      setAllIngredients((prev) => [...prev, newIngredientForList].sort((a, b) => a.name.localeCompare(b.name)));
      handleSelectedIngredientForAddChange(null, newIngredientForList); // Auto-select the new ingredient
      
      handleCloseNewIngredientDialog();
      setSuccessMessage(`Ingrédient '${newIngredientForList.name}' créé.`);
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err) {
      console.error('Error saving new ingredient:', err);
      setError('Erreur lors de la sauvegarde du nouvel ingrédient.'); // Set error within dialog
    } finally {
      setSavingNewIngredient(false);
    }
  };

  // --- Autocomplete filter options (includes synonyms) --- 
  const filterIngredientOptions = (options, { inputValue }) => {
    const lowerCaseInput = inputValue.toLowerCase().trim();
    if (!lowerCaseInput) {
      return options; // Show all if no input
    }
    return options.filter(option => {
      const nameMatch = option.name.toLowerCase().includes(lowerCaseInput);
      const synonymMatch = option.synonyms && Array.isArray(option.synonyms) 
        ? option.synonyms.some(syn => syn.toLowerCase().includes(lowerCaseInput))
        : false;
      return nameMatch || synonymMatch;
    });
  };

  const isLoading = authLoading || loadingStock || loadingIngredients;

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.success.main, 0.03)} 100%)`,
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
                  background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.primary.main} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                Mon Stock
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Gérez les ingrédients disponibles dans votre cuisine
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenAddStockDialog()}
              disabled={isLoading}
              sx={{ borderRadius: 3, px: 3, py: 1.5, background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)` }}
            >
              Ajouter au Stock
            </Button>
          </Box>
        </Fade>

        {/* Loading Indicator */}
        {isLoading && (
            <Box sx={{ mb: 3 }}>
              <LinearProgress color="success" sx={{ borderRadius: 2, height: 6 }} />
            </Box>
        )}

        {/* Error Alert */}
        {error && (
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
                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`,
                border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
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
                  placeholder="Rechercher dans le stock..."
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
                    orderBy={sortField}
                    onRequestSort={handleRequestSort}
                  />
                  <TableBody>
                    {sortedAndPaginatedItems.map((item, index) => {
                      const labelId = `enhanced-table-checkbox-${index}`;
                      const lastUpdatedDate = item.lastUpdated?.toDate ? item.lastUpdated.toDate().toLocaleDateString('fr-FR') : 'N/A';

                      return (
                        <TableRow
                          hover
                          role="checkbox"
                          tabIndex={-1}
                          key={item.id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell component="th" id={labelId} scope="row">
                            {item.ingredientName}
                          </TableCell>
                          <TableCell align="right">{formatQuantityUnit(item.quantity, item.unit)}</TableCell>
                          <TableCell align="left">{item.unit}</TableCell>
                          <TableCell align="left">{item.category || 'N/A'}</TableCell>
                          <TableCell align="left">{lastUpdatedDate}</TableCell>
                          <TableCell align="left">
                            <Tooltip title="Modifier">
                              <IconButton size="small" onClick={() => handleOpenAddStockDialog(item)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer">
                              <IconButton size="small" onClick={() => handleDeleteStockItem(item.id, item.ingredientName)} color="error">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredStockItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={headCells.length} align="center">
                          Votre stock est vide ou aucun article ne correspond à votre recherche.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredStockItems.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Articles par page:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
              />
            </Paper>
          </Zoom>
        )}

        {/* Add/Edit Stock Dialog */}
        <Dialog open={addStockDialogOpen} onClose={handleCloseAddStockDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{editingStockItem ? 'Modifier l\'article en stock' : 'Ajouter un article au stock'}</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Autocomplete
                options={allIngredients}
                getOptionLabel={(option) => option.name || ''}
                value={selectedIngredientToAdd}
                onChange={handleSelectedIngredientForAddChange}
                loading={loadingIngredients}
                disabled={!!editingStockItem || isSavingStock} // Disable if editing (ingredient shouldn't change)
                filterOptions={filterIngredientOptions} 
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Choisir un ingrédient"
                    variant="outlined"
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingIngredients ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <ListItemText 
                      primary={option.name}
                      secondary={option.synonyms && option.synonyms.length > 0 ? option.synonyms.join(', ') : null}
                    />
                  </li>
                )}
                ListboxComponent={List}
                // --- Handling ingredient not found --- 
                noOptionsText={
                  <Button onClick={handleOpenNewIngredientDialog} size="small">
                    Ingrédient non trouvé ? Créer...
                  </Button>
                }
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Quantité"
                    type="number"
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(e.target.value)}
                    variant="outlined"
                    fullWidth
                    required
                    disabled={!selectedIngredientToAdd || isSavingStock}
                    inputProps={{ min: 0 }} // Allow 0 for deletion
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth variant="outlined" required disabled={!selectedIngredientToAdd || isSavingStock}>
                    <InputLabel id="add-unit-select-label">Unité</InputLabel>
                    <Select
                      labelId="add-unit-select-label"
                      value={addUnit}
                      onChange={(e) => setAddUnit(e.target.value)}
                      label="Unité"
                    >
                      {availableUnitsForAdd.map((unit) => (
                        <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                      ))}
                      {/* Option to add a new unit? Could be complex here */}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              {/* Optional fields like location, threshold could be added here */}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseAddStockDialog} disabled={isSavingStock}>Annuler</Button>
            <Button onClick={handleSaveStockItem} variant="contained" disabled={isSavingStock || !selectedIngredientToAdd}>
              {isSavingStock ? <CircularProgress size={20} /> : (editingStockItem ? 'Mettre à jour' : 'Ajouter au stock')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* New Ingredient Dialog (Placeholder - Needs Refactoring/Import) */}
        <Dialog open={newIngredientDialogOpen} onClose={handleCloseNewIngredientDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Créer un nouvel ingrédient</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>} 
              <TextField autoFocus margin="dense" label="Nom principal" type="text" fullWidth value={newIngredientName} onChange={(e) => setNewIngredientName(e.target.value)} required />
              <Autocomplete
                multiple freeSolo options={[]} value={newIngredientSynonyms}
                onChange={(event, newValue) => { setNewIngredientSynonyms(newValue); }}
                renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option} {...getTagProps({ index })} sx={{ borderRadius: 2 }} />)) }
                renderInput={(params) => (<TextField {...params} variant="outlined" label="Synonymes (optionnel)" placeholder="Ex: Bissap..." InputProps={{ ...params.InputProps, startAdornment: (<InputAdornment position="start"><TranslateIcon color="action" /></InputAdornment>), }} />) }
              />
              <FormControl fullWidth required>
                <InputLabel id="new-cat-label">Catégorie</InputLabel>
                <Select labelId="new-cat-label" value={newIngredientCategory} label="Catégorie" onChange={(e) => setNewIngredientCategory(e.target.value)}>
                  {ingredientCategories.map((cat) => (<MenuItem key={cat} value={cat}>{cat}</MenuItem>))}
                </Select>
              </FormControl>
              <TextField margin="dense" label="Première unité (ex: g, ml)" type="text" fullWidth value={newIngredientFirstUnit} onChange={(e) => setNewIngredientFirstUnit(e.target.value)} required />
              {/* Add isStandard switch, price etc. if needed, mirroring RecipeFormPage */}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseNewIngredientDialog} disabled={savingNewIngredient}>Annuler</Button>
            <Button onClick={handleSaveNewIngredient} variant="contained" disabled={savingNewIngredient}>
              {savingNewIngredient ? <CircularProgress size={20} /> : "Sauvegarder Ingrédient"}
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}
