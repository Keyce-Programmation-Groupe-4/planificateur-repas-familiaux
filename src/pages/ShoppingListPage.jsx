
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  Fab,
  LinearProgress,
  Paper,
  Stack,
  Skeleton,
  Tooltip
} from '@mui/material';
import {
  MoreVert,
  Refresh,
  PlaylistAddCheck,
  DeleteSweep,
  Add as AddIcon,
  Print,
  Share,
  PictureAsPdf // Icône pour l'export PDF
} from '@mui/icons-material';

// --- Firebase Imports --- 
import { db } from '../firebaseConfig';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  Timestamp,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

// --- Context Import --- 
import { useAuth } from '../contexts/AuthContext';

// --- Component Imports --- 
import ShoppingListCategory from '../components/ShoppingList/ShoppingListCategory';
import PriceInputDialog from '../components/ShoppingList/PriceInputDialog';

// --- Utility Import --- 
import { convertToStandardUnit, formatQuantityUnit } from '../utils/unitConverter';

// --- PDFMake Import --- 
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.vfs;


// --- Helper Functions --- 
const getStartOfWeek = (date) => {
  const dateCopy = new Date(date);
  const day = dateCopy.getDay();
  const diff = dateCopy.getDate() - day + (day === 0 ? -6 : 1);
  dateCopy.setHours(0, 0, 0, 0);
  return new Date(dateCopy.setDate(diff));
};

const getWeekId = (date) => {
  const startDate = getStartOfWeek(date);
  const year = startDate.getFullYear();
  const thursday = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const weekNumber = Math.ceil(1 + (thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

const formatCurrency = (value) => {
  if (typeof value !== "number") {
    return ""
  }
  // Modification ici : 'XFA' remplacé par 'XAF'
  return value.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })
}
// --- End Helper Functions ---

function ShoppingListPage() {
  const theme = useTheme();
  const { currentUser, userData, loading: authLoading } = useAuth();
  const familyId = userData?.familyId;

  const [targetWeekStart, setTargetWeekStart] = useState(getStartOfWeek(new Date()));
  const targetWeekId = getWeekId(targetWeekStart);

  const [shoppingListData, setShoppingListData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [priceDialogData, setPriceDialogData] = useState({ ingredientId: null, ingredientName: '', unit: '' });

  // --- Data Fetching and Aggregation Logic --- 
  const generateShoppingList = useCallback(async () => {
    if (!familyId) {
      if (!authLoading) setIsLoading(false);
      console.warn("Waiting for familyId...");
      return;
    }

    setIsLoading(true);
    setError(null);
    setShoppingListData({});
    console.log(`Generating shopping list for family ${familyId}, week: ${targetWeekId}`);

    try {
      // 1. Get Weekly Plan
      const planDocRef = doc(db, 'families', familyId, 'weeklyPlans', targetWeekId);
      const planDocSnap = await getDoc(planDocRef);
      if (!planDocSnap.exists()) {
        console.log(`No plan found for ${targetWeekId}.`);
        setIsLoading(false);
        return;
      }
      const planData = planDocSnap.data();

      // 2. Extract Unique Recipe IDs
      const recipeIds = new Set();
      Object.values(planData.days).forEach(day => {
        Object.values(day).forEach(recipeId => {
          if (recipeId) recipeIds.add(recipeId);
        });
      });
      if (recipeIds.size === 0) {
        console.log("Plan has no recipes.");
        setIsLoading(false);
        return;
      }

      // 3. Fetch Recipe Details
      const recipePromises = Array.from(recipeIds).map(id => getDoc(doc(db, 'recipes', id)));
      const recipeDocs = await Promise.all(recipePromises);
      const recipesData = recipeDocs.filter(doc => doc.exists()).map(doc => ({ id: doc.id, ...doc.data() }));

      // 4. Create Raw Ingredient List
      const rawIngredientItems = [];
      recipesData.forEach(recipe => {
        if (recipe.ingredientsList && Array.isArray(recipe.ingredientsList)) {
          recipe.ingredientsList.forEach(item => {
            if (item.ingredientId && item.quantity && item.unit) {
              rawIngredientItems.push({ ...item });
            } else {
              console.warn(`Invalid ingredient in recipe ${recipe.id}:`, item);
            }
          });
        }
      });
      if (rawIngredientItems.length === 0) {
        console.log("No valid ingredients found.");
        setIsLoading(false);
        return;
      }

      // 5. Fetch Unique Ingredient Details
      const uniqueIngredientIds = new Set(rawIngredientItems.map(item => item.ingredientId));
      const ingredientPromises = Array.from(uniqueIngredientIds).map(id => getDoc(doc(db, 'ingredients', id)));
      const ingredientDocs = await Promise.all(ingredientPromises);
      const ingredientDetailsMap = {};
      ingredientDocs.forEach(doc => {
        if (doc.exists()) {
          ingredientDetailsMap[doc.id] = { id: doc.id, ...doc.data() };
        }
      });

      // 6. Aggregate, Convert to Standard Unit, Calculate Costs
      const aggregatedList = {}; // Key: ingredientId
      rawIngredientItems.forEach(item => {
        const details = ingredientDetailsMap[item.ingredientId];
        if (!details || !details.units) {
          console.warn(`Details/units missing for ingredient ${item.ingredientId}`);
          return;
        }

        const ingredientId = item.ingredientId;
        const quantity = item.quantity;
        const unit = item.unit;

        const conversionResult = convertToStandardUnit(quantity, unit, details.units);

        if (!conversionResult) {
          if (!aggregatedList[ingredientId]) {
            aggregatedList[ingredientId] = {
              ingredientId: ingredientId,
              name: details.name || 'Inconnu',
              category: details.category || 'Autres',
              unitsData: details.units,
              aggregatedQuantities: {}
            };
          }
          if (!aggregatedList[ingredientId].aggregatedQuantities[unit]) {
            aggregatedList[ingredientId].aggregatedQuantities[unit] = { totalQuantity: 0, cost: null, needsPriceInput: false, priceSource: null };
          }
          aggregatedList[ingredientId].aggregatedQuantities[unit].totalQuantity += quantity;
        } else {
          const { standardQuantity, standardUnit } = conversionResult;
          if (!aggregatedList[ingredientId]) {
            aggregatedList[ingredientId] = {
              ingredientId: ingredientId,
              name: details.name || 'Inconnu',
              category: details.category || 'Autres',
              unitsData: details.units,
              aggregatedQuantities: {}
            };
          }
          if (!aggregatedList[ingredientId].aggregatedQuantities[standardUnit]) {
            aggregatedList[ingredientId].aggregatedQuantities[standardUnit] = { totalQuantity: 0, cost: null, needsPriceInput: false, priceSource: null };
          }
          aggregatedList[ingredientId].aggregatedQuantities[standardUnit].totalQuantity += standardQuantity;
        }
      });

      // Calculate costs after aggregation
      Object.values(aggregatedList).forEach(aggItem => {
        Object.keys(aggItem.aggregatedQuantities).forEach(unitKey => {
          const q = aggItem.aggregatedQuantities[unitKey];
          const unitData = aggItem.unitsData[unitKey];
          let price = null;
          let source = null;
          let needsInput = true;

          if (unitData && typeof unitData.standardPrice === 'number') {
            price = unitData.standardPrice;
            source = unitData.priceSource || 'unknown';
            needsInput = false;
          } else {
            let standardUnitKey = null;
            let standardUnitData = null;
            for (const key in aggItem.unitsData) {
              if (aggItem.unitsData[key].isStandard) {
                standardUnitKey = key;
                standardUnitData = aggItem.unitsData[key];
                break;
              }
            }
            if (unitKey === standardUnitKey && price === null) {
                needsInput = true;
            } 
            else if (unitKey !== standardUnitKey && (!standardUnitData || typeof standardUnitData.standardPrice !== 'number')) {
                needsInput = true;
            } 
            else if (unitKey !== standardUnitKey && standardUnitData && typeof standardUnitData.standardPrice === 'number' && unitData && typeof unitData.conversionFactor === 'number') {
                price = standardUnitData.standardPrice / unitData.conversionFactor;
                source = 'calculated';
                needsInput = false;
            } else {
                needsInput = true;
            }
          }

          if (price !== null) {
            q.cost = q.totalQuantity * price;
            q.priceSource = source;
            q.needsPriceInput = false;
          } else {
            q.cost = null;
            q.needsPriceInput = needsInput;
            q.priceSource = null;
          }
        });
      });

      // 7. Transform to Final UI Structure (Grouped by Category)
      const finalGroupedList = {};
      Object.values(aggregatedList).forEach(aggItem => {
        const category = aggItem.category;
        if (!finalGroupedList[category]) {
          finalGroupedList[category] = [];
        }
        Object.keys(aggItem.aggregatedQuantities).forEach(unitKey => {
          const q = aggItem.aggregatedQuantities[unitKey];
          finalGroupedList[category].push({
            itemId: `${aggItem.ingredientId}_${unitKey}`,
            ingredientId: aggItem.ingredientId,
            name: aggItem.name,
            quantity: q.totalQuantity,
            unit: unitKey,
            checked: false,
            cost: q.cost,
            needsPriceInput: q.needsPriceInput,
            priceSource: q.priceSource
          });
        });
      });

      // Sort categories and items within categories
      const sortedFinalList = {};
      Object.keys(finalGroupedList).sort().forEach(category => {
        sortedFinalList[category] = finalGroupedList[category].sort((a, b) => a.name.localeCompare(b.name));
      });

      setShoppingListData(sortedFinalList);
      console.log("Shopping list generated:", sortedFinalList);

    } catch (err) {
      console.error("Error generating shopping list: ", err);
      setError('Erreur lors de la génération de la liste.');
    } finally {
      setIsLoading(false);
    }
  }, [familyId, targetWeekId, authLoading]);

  // --- Initial Fetch --- 
  useEffect(() => {
    if (!authLoading && familyId) {
      generateShoppingList();
    }
  }, [authLoading, familyId, generateShoppingList]);

  // --- UI Event Handlers --- 
  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleRefresh = () => { handleMenuClose(); generateShoppingList(); };

  const handleToggleCheck = useCallback((category, itemId, checked) => {
    setShoppingListData(prevData => {
      const newData = { ...prevData };
      if (!newData[category]) return prevData;
      const itemIndex = newData[category].findIndex(item => item.itemId === itemId);
      if (itemIndex === -1) return prevData;
      const updatedCategoryItems = [...newData[category]];
      updatedCategoryItems[itemIndex] = { ...updatedCategoryItems[itemIndex], checked: checked };
      newData[category] = updatedCategoryItems;
      return newData;
    });
  }, []);

  const handleUncheckAll = () => {
    handleMenuClose();
    setShoppingListData(prevData => {
      const newData = {};
      Object.keys(prevData).forEach(category => {
        newData[category] = prevData[category].map(item => ({ ...item, checked: false }));
      });
      return newData;
    });
  };

  const handleClearChecked = () => {
    handleMenuClose();
    setShoppingListData(prevData => {
      const newData = {};
      Object.keys(prevData).forEach(category => {
        const remainingItems = prevData[category].filter(item => !item.checked);
        if (remainingItems.length > 0) newData[category] = remainingItems;
      });
      return newData;
    });
  };

  // --- Price Input Handling --- 
  const handleOpenPriceDialog = useCallback((ingredientId, ingredientName, unit) => {
    setPriceDialogData({ ingredientId, ingredientName, unit });
    setPriceDialogOpen(true);
  }, []);

  const handleClosePriceDialog = () => {
    setPriceDialogOpen(false);
  };

  const handleSavePrice = async (ingredientId, unit, price) => {
    if (typeof price !== 'number' || price < 0) {
      alert("Veuillez entrer un prix valide.");
      return;
    }
    console.log(`Saving price for ${ingredientId}, unit ${unit}: ${price}`);
    const ingredientRef = doc(db, 'ingredients', ingredientId);
    try {
      await updateDoc(ingredientRef, {
        [`units.${unit}.standardPrice`]: price,
        [`units.${unit}.priceSource`]: 'user_input',
        [`units.${unit}.lastPriceUpdate`]: serverTimestamp(),
        'updatedAt': serverTimestamp()
      });
      console.log("Price updated successfully in Firestore.");
      handleClosePriceDialog();
      generateShoppingList(); // Re-generate list to reflect new price/cost
    } catch (error) {
      console.error("Error updating price in Firestore: ", error);
      alert("Erreur lors de la sauvegarde du prix.");
    }
  };

  // --- Total Cost Calculation --- 
  const totalCost = useMemo(() => {
    let total = 0;
    Object.values(shoppingListData).forEach(categoryItems => {
      categoryItems.forEach(item => {
        // Coût total estimé basé sur les items NON cochés
        if (!item.checked && typeof item.cost === 'number') {
          total += item.cost;
        }
      });
    });
    return total;
  }, [shoppingListData]);

  // --- Export PDF Handler --- 
  const handleExportPdf = () => {
    handleMenuClose();
    console.log("Exporting PDF with data:", shoppingListData);

    if (!shoppingListData || Object.keys(shoppingListData).length === 0) {
      alert("La liste de courses est vide, impossible d'exporter.");
      return;
    }

    const content = [];

    // Titre et date
    content.push({ text: 'Liste de Courses', style: 'header', alignment: 'center' });
    content.push({ text: `Semaine du ${targetWeekStart.toLocaleDateString('fr-FR')}`, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] });

    // Items par catégorie
    Object.entries(shoppingListData).forEach(([category, items]) => {
      content.push({ text: category, style: 'categoryHeader', margin: [0, 10, 0, 5] });
      
      const categoryItemsContent = items.map(item => {
        const quantityText = formatQuantityUnit(item.quantity, item.unit);
        const costText = item.cost !== null ? formatCurrency(item.cost) : (item.needsPriceInput ? '(Prix manquant)' : '');
        const itemStyle = item.checked ? { decoration: 'lineThrough', color: 'grey' } : {};
        
        return [
          { text: item.name, style: ['itemText', itemStyle] },
          { text: quantityText, style: ['itemText', itemStyle], alignment: 'right' },
          { text: costText, style: ['itemText', itemStyle], alignment: 'right' }
        ];
      });

      content.push({
        layout: 'lightHorizontalLines', // optional
        table: {
          headerRows: 0,
          widths: ['*', 'auto', 'auto'], // Nom prend l'espace, Quantité et Coût s'adaptent
          body: categoryItemsContent
        },
        margin: [0, 0, 0, 15] // Marge après chaque table de catégorie
      });
    });

    // Coût total estimé (des items non cochés)
    content.push({ text: `Total estimé (non cochés): ${formatCurrency(totalCost)}`, style: 'totalCost', alignment: 'right', margin: [0, 20, 0, 0] });

    const docDefinition = {
      content: content,
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 5]
        },
        subheader: {
          fontSize: 14,
          color: 'gray',
          italics: true
        },
        categoryHeader: {
          fontSize: 14,
          bold: true,
          color: theme.palette.primary.main, // Utilise la couleur primaire du thème MUI
          margin: [0, 10, 0, 5]
        },
        itemText: {
          fontSize: 10,
          margin: [0, 2, 0, 2] // Ajoute un peu d'espace vertical entre les items
        },
        totalCost: {
            fontSize: 12,
            bold: true,
            margin: [0, 10, 0, 0]
        }
      },
      defaultStyle: {
        // font: 'Roboto' // Si vous avez chargé une police spécifique
      }
    };

    try {
      const pdfFileName = `liste_courses_${targetWeekId}.pdf`;
      pdfMake.createPdf(docDefinition).download(pdfFileName);
      console.log(`PDF "${pdfFileName}" generated and download initiated.`);
    } catch (error) {
        console.error("Error generating PDF: ", error);
        alert("Une erreur est survenue lors de la génération du PDF.");
    }
  };

  // Placeholder actions (Keep for now)
  const handlePrint = () => { handleMenuClose(); alert('Imprimer - Non implémenté'); };
  const handleShare = () => { handleMenuClose(); alert('Partager - Non implémenté'); };

  // --- Rendering Logic --- 
  const renderSkeletons = () => (
    <Stack spacing={3} sx={{ p: 2 }}>
      {[1, 2, 3].map((cat) => (
        <Paper key={cat} elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Skeleton variant="text" width="30%" height={30} sx={{ mb: 2 }} />
          <Stack spacing={1.5}>
            {[1, 2, 3, 4].map((item) => (
              <Box key={item} sx={{ display: 'flex', alignItems: 'center' }}>
                <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1.5 }} />
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="20%" height={20} sx={{ ml: 'auto' }} />
              </Box>
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );

  const hasItems = useMemo(() => Object.keys(shoppingListData).length > 0, [shoppingListData]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: theme.palette.background.paper }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Liste de Courses
          </Typography>
          {hasItems && (
            <Typography variant="subtitle1" sx={{ mr: 2, fontWeight: 'medium' }}>
              Total: {formatCurrency(totalCost)}
            </Typography>
          )}
          <Tooltip title="Rafraîchir la liste">
            <IconButton color="inherit" onClick={handleRefresh} disabled={isLoading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Options">
            <IconButton color="inherit" id="options-button" onClick={handleMenuClick} disabled={isLoading || !hasItems}>
              <MoreVert />
            </IconButton>
          </Tooltip>
          <Menu id="options-menu" anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
            {/* --- Option Export PDF --- */}
            <MenuItem onClick={handleExportPdf} disabled={isLoading || !hasItems}>
              <ListItemIcon><PictureAsPdf fontSize="small" /></ListItemIcon>
              <ListItemText>Exporter en PDF</ListItemText>
            </MenuItem>
            <Divider />
            {/* --- Options existantes --- */}
            <MenuItem onClick={handleUncheckAll} disabled={isLoading || !hasItems}><ListItemIcon><PlaylistAddCheck fontSize="small" /></ListItemIcon><ListItemText>Décocher tout</ListItemText></MenuItem>
            <MenuItem onClick={handleClearChecked} disabled={isLoading || !hasItems}><ListItemIcon><DeleteSweep fontSize="small" /></ListItemIcon><ListItemText>Supprimer les cochés</ListItemText></MenuItem>
            <Divider />
            {/* --- Placeholders conservés --- */}
            <MenuItem onClick={handlePrint} disabled><ListItemIcon><Print fontSize="small" /></ListItemIcon><ListItemText>Imprimer</ListItemText></MenuItem>
            <MenuItem onClick={handleShare} disabled><ListItemIcon><Share fontSize="small" /></ListItemIcon><ListItemText>Partager</ListItemText></MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {isLoading && <LinearProgress />}

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 1, sm: 2 } }}>
        {isLoading ? (
          renderSkeletons()
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : !hasItems ? (
          <Typography sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
            Votre liste de courses est vide. Ajoutez des recettes au planning de la semaine !
          </Typography>
        ) : (
          <List sx={{ width: '100%' }}>
            {Object.entries(shoppingListData).map(([category, items]) => (
              <ShoppingListCategory
                key={category}
                category={category}
                items={items}
                onToggleCheck={handleToggleCheck}
                onOpenPriceDialog={handleOpenPriceDialog}
              />
            ))}
          </List>
        )}
      </Box>

      {/* Price Input Dialog */} 
      <PriceInputDialog
        open={priceDialogOpen}
        onClose={handleClosePriceDialog}
        onSave={handleSavePrice}
        ingredientId={priceDialogData.ingredientId}
        ingredientName={priceDialogData.ingredientName}
        unit={priceDialogData.unit}
      />

    </Box>
  );
}

export default ShoppingListPage;

