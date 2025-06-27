"use client"

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  CircularProgress,
  Alert,
  List,
  // ListItemText, // No longer directly used for menu items
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText, // Re-added for MenuItems
  useTheme,
  alpha,
  AppBar,
  Toolbar,
  Divider,
  LinearProgress,
  Skeleton,
  Tooltip,
  Snackbar,
  Stack,
} from "@mui/material";
import {
  LocalShipping as DeliveryIcon,
  PlaylistAddCheck,
  DeleteSweep,
  Inventory2 as InventoryIcon,
  InfoOutlined as InfoIcon,
  Sync as SyncIcon,
  MoreVert,
  PictureAsPdf,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
// import { db } from "../firebaseConfig"; // Firestore interactions handled by thunks
// import { collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
// import "jspdf-autotable"; // Handled by pdfMake if needed, or direct table generation
import PriceInputDialog from "../components/ShoppingList/PriceInputDialog";
import { triggerSendNotification } from '../utils/notificationUtils';
import { getCurrentUserFCMToken } from '../utils/authUtils';
import ShoppingListCategory from "../components/ShoppingList/ShoppingListCategory";
import { formatQuantityUnit } from "../utils/UnitConverter.js"; // findStandardUnit, convertToStandardUnit handled in slice

import {
  fetchOrGenerateShoppingList,
  generateShoppingListForWeek,
  toggleShoppingListItem,
  updateIngredientPrice,
  uncheckAllShoppingListItems,
  clearCheckedShoppingListItems,
  setShoppingListTargetWeek,
  openPriceDialog as openStorePriceDialog,
  closePriceDialog as closeStorePriceDialog,
  clearShoppingListError,
  clearShoppingListSuccessMessage,
} from "../redux/slices/shoppingListSlice";
import { getWeekId as calculateWeekId, getStartOfWeekDate, weekIdToDateString } from '../utils/plannerUtils';


// --- PDFMake Import ---
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

const formatCurrency = (value) => {
  if (typeof value !== "number" || isNaN(value)) { // Added NaN check
    return "N/A";
  }
  return value.toLocaleString("fr-FR", { style: "currency", currency: "XAF" });
};
// --- End Helper Functions ---

function ShoppingListPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser, userData, loading: authLoading } = useAuth();
  const familyId = userData?.familyId;

  const [searchParams, setSearchParams] = useSearchParams(); // For setting weekId in URL

  const {
    targetWeekId, // From Redux
    shoppingListDoc,
    loading, // General loading from Redux
    generating, // Specific generation loading
    updatingStock, // Stock update loading
    error: shoppingListError, // Renamed
    successMessage: shoppingListSuccessMessage, // Renamed
    priceDialogOpen: storePriceDialogOpen,
    priceDialogData: storePriceDialogData,
  } = useSelector((state) => state.shoppingList);

  // Local UI state
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const [localShoppingListItems, setLocalShoppingListItems] = useState({}); // For UI grouping

  // Effect to initialize or update targetWeekId from URL param
  useEffect(() => {
    const weekParam = searchParams.get('week');
    const newTargetWeekId = weekParam || calculateWeekId(new Date());
    if (newTargetWeekId !== targetWeekId) {
      dispatch(setShoppingListTargetWeek(newTargetWeekId));
    }
  }, [searchParams, dispatch, targetWeekId]);

  // Effect to fetch or generate list when targetWeekId or familyId changes
  useEffect(() => {
    if (familyId && targetWeekId && !authLoading) {
      dispatch(fetchOrGenerateShoppingList({ familyId, targetWeekId, generateIfNeeded: !shoppingListDoc }));
    }
     return () => {
      dispatch(clearShoppingListError());
      dispatch(clearShoppingListSuccessMessage());
    };
  }, [dispatch, familyId, targetWeekId, authLoading, shoppingListDoc]);


  // --- UI Event Handlers ---
  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleRefreshList = () => {
    handleMenuClose();
    if (familyId && targetWeekId) {
      // Force regeneration by setting generateIfNeeded to true, or a specific refresh thunk
      dispatch(generateShoppingListForWeek({ familyId, targetWeekId }));
    }
  };

  const handleToggleItemCheck = useCallback((itemId, currentCheckedStatus, itemDetails) => {
    if (!familyId || !targetWeekId) return;
    dispatch(toggleShoppingListItem({
      familyId,
      targetWeekId,
      itemId,
      isChecked: !currentCheckedStatus,
      itemDetails // Pass necessary details for stock update
    }));
  }, [dispatch, familyId, targetWeekId]);

  const handleUncheckAllItems = () => {
    handleMenuClose();
    if (familyId && targetWeekId) {
      dispatch(uncheckAllShoppingListItems({ familyId, targetWeekId }));
    }
  };

  const handleClearCheckedItems = () => {
    handleMenuClose();
     if (familyId && targetWeekId) {
      dispatch(clearCheckedShoppingListItems({ familyId, targetWeekId }));
    }
  };

  const handleOpenPriceDialog = useCallback((ingredientId, ingredientName, unit) => {
    dispatch(openStorePriceDialog({ ingredientId, ingredientName, unit }));
  }, [dispatch]);

  const handleClosePriceDialog = () => {
    dispatch(closeStorePriceDialog());
  };

  const handleSavePrice = async (ingredientId, unit, price) => {
    try {
        await dispatch(updateIngredientPrice({ ingredientId, unit, price })).unwrap();
        // Optionally, re-fetch or re-generate the list to update costs
        if (familyId && targetWeekId) {
            dispatch(generateShoppingListForWeek({ familyId, targetWeekId }));
        }
        const fcmToken = await getCurrentUserFCMToken();
        if (fcmToken && storePriceDialogData) { // Check if storePriceDialogData is not null
            triggerSendNotification(fcmToken, "Prix Enregistré", `Le prix pour '${storePriceDialogData.ingredientName}' (${unit}) a été sauvegardé.`);
        }
        handleClosePriceDialog(); // Close dialog on success
    } catch (err) {
        // Error is handled by the slice and will be in shoppingListError
        console.error("Failed to save price:", err);
         const fcmToken = await getCurrentUserFCMToken();
        if (fcmToken && storePriceDialogData) {
             triggerSendNotification(fcmToken, "Erreur Prix", `Échec sauvegarde du prix pour '${storePriceDialogData.ingredientName}'.`);
        }
    }
  };

  const handleRequestDelivery = () => {
    handleMenuClose();
    if (!shoppingListDoc || !shoppingListDoc.items || shoppingListDoc.items.length === 0) {
      dispatch(clearShoppingListError()); // Clear previous before setting new
      // Manually set an error in local state if not covered by slice, or dispatch an action
      // For now, alert is fine for such a direct user action validation.
      alert("Veuillez d'abord générer une liste de courses avec des articles.");
      return;
    }
    sessionStorage.setItem("currentShoppingListId", targetWeekId);
    navigate("/delivery/request");
  };

  const { totalActualCostToPay, totalTheoreticalCostValue } = useMemo(() => {
    let actual = 0;
    const theoretical = shoppingListDoc?.totalTheoreticalCost || 0;
    if (shoppingListDoc && shoppingListDoc.items) {
      shoppingListDoc.items.forEach(item => {
        if (!item.isChecked && typeof item.actualItemCost === "number") {
          actual += item.actualItemCost;
        }
      });
    }
    return { totalActualCostToPay: actual, totalTheoreticalCostValue: theoretical };
  }, [shoppingListDoc]);

  const handleExportPdf = () => {
    handleMenuClose();
    if (!localShoppingListItems || Object.keys(localShoppingListItems).length === 0) {
      alert("La liste de courses est vide, impossible d'exporter.");
      return;
    }
    const content = [];
    content.push({ text: "Liste de Courses", style: "header", alignment: "center" });
    const targetWeekStartDate = weekIdToDateString(targetWeekId); // Use util
    content.push({ text: `Semaine du ${targetWeekStartDate}`, style: "subheader", alignment: "center", margin: [0, 0, 0, 10] });
    content.push({ columns: [ { text: `Coût Réel à Payer: ${formatCurrency(totalActualCostToPay)}`, style: "costSummary" }, { text: `Coût Théorique (sans stock): ${formatCurrency(totalTheoreticalCostValue)}`, style: "costSummary", alignment: "right" } ], margin: [0, 0, 0, 15] });

    Object.entries(localShoppingListItems).forEach(([category, items]) => {
      content.push({ text: category, style: "categoryHeader", margin: [0, 10, 0, 5] });
      const categoryItemsContent = items.map(item => {
        const quantityText = formatQuantityUnit(item.netQuantity, item.unit);
        const costText = item.actualItemCost !== null ? formatCurrency(item.actualItemCost) : item.needsPriceInput ? "(Prix?!)" : "";
        const itemStyle = item.isChecked ? { decoration: "lineThrough", color: "grey" } : {};
        return [ { text: item.isChecked ? "✓" : "☐", style: ["checkbox", itemStyle] }, { text: item.name, style: ["itemText", itemStyle] }, { text: quantityText, style: ["itemText", itemStyle], alignment: "right" }, { text: costText, style: ["itemText", itemStyle], alignment: "right" }];
      });
      content.push({ table: { headerRows: 0, widths: ["auto", "*", "auto", "auto"], body: categoryItemsContent }, layout: { hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.5), vLineWidth: () => 0, hLineColor: () => "#dddddd", paddingLeft: (i) => (i === 0 ? 0 : 8), paddingRight: () => 8, paddingTop: () => 4, paddingBottom: () => 4 } });
    });

    const docDefinition = { content, styles: { header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] }, subheader: { fontSize: 14, margin: [0, 0, 0, 10], color: "gray" }, categoryHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5], color: theme.palette.primary.main }, itemText: { fontSize: 10 }, costSummary: { fontSize: 12, bold: true, margin: [0, 5, 0, 5] }, checkbox: { fontSize: 12, margin: [0, 0, 5, 0] } } };
    try {
      pdfMake.createPdf(docDefinition).download(`liste_courses_${targetWeekId}.pdf`);
    } catch (e) {
      console.error("Error creating PDF:", e);
      alert("Une erreur est survenue lors de la création du PDF.");
    }
  };

  // Process shoppingListDoc from Redux into localShoppingListItems for UI grouping
  useEffect(() => {
    if (shoppingListDoc && shoppingListDoc.items) {
      const grouped = {};
      shoppingListDoc.items.forEach(item => {
        const category = item.category || "Autre";
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(item);
      });
      Object.keys(grouped).forEach(category => {
        grouped[category].sort((a, b) => a.name.localeCompare(b.name));
      });
      setLocalShoppingListItems(grouped);
    } else {
      setLocalShoppingListItems({});
    }
  }, [shoppingListDoc]);


  // --- Render Logic ---
  // Use loading from Redux store for initial page load skeleton
  if (loading && !shoppingListDoc && !authLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={60} sx={{ mt: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2, borderRadius: 2 }} />
      </Container>
    );
  }

  const currentTargetWeekStartDate = weekIdToDateString(targetWeekId); // Use util for display

  return (
    <Box sx={{ pb: 10 }}> {/* Add padding bottom for FAB */}
      <AppBar position="sticky" color="default" elevation={1} sx={{ background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Toolbar>
          <InventoryIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>Liste de Courses</Typography>
            <Typography variant="body2" color="text.secondary">Semaine du {currentTargetWeekStartDate}</Typography>
          </Box>
          <Tooltip title="Actualiser la liste (regénérer avec le stock actuel)">
            <span> {/* Span for disabled button tooltip */}
              <IconButton onClick={handleRefreshList} disabled={generating || updatingStock}>
                {generating ? <CircularProgress size={24} /> : <SyncIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <IconButton aria-label="more" aria-controls="long-menu" aria-haspopup="true" onClick={handleMenuClick} disabled={generating || updatingStock}> <MoreVert /> </IconButton>
          <Menu id="long-menu" anchorEl={anchorEl} keepMounted open={menuOpen} onClose={handleMenuClose}>
            <MenuItem onClick={handleUncheckAllItems} disabled={!shoppingListDoc || generating || updatingStock}><ListItemIcon><PlaylistAddCheck fontSize="small" /></ListItemIcon><ListItemText>Tout décocher</ListItemText></MenuItem>
            <MenuItem onClick={handleClearCheckedItems} disabled={!shoppingListDoc || generating || updatingStock}><ListItemIcon><DeleteSweep fontSize="small" /></ListItemIcon><ListItemText>Supprimer les articles cochés</ListItemText></MenuItem>
            <Divider />
            <MenuItem onClick={handleExportPdf} disabled={!shoppingListDoc || generating || updatingStock}><ListItemIcon><PictureAsPdf fontSize="small" /></ListItemIcon><ListItemText>Exporter en PDF</ListItemText></MenuItem>
            <MenuItem onClick={handleRequestDelivery} disabled={!shoppingListDoc || !shoppingListDoc.items || shoppingListDoc.items.length === 0 || generating || updatingStock}><ListItemIcon><DeliveryIcon fontSize="small" /></ListItemIcon><ListItemText>Se faire livrer</ListItemText></MenuItem>
          </Menu>
        </Toolbar>
        {(generating || updatingStock) && ( <LinearProgress color={generating? "primary" : "secondary"} sx={{ position: "absolute", bottom: 0, left: 0, width: "100%" }} /> )}
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 3 }}>
        {shoppingListError && ( <Alert severity="error" onClose={() => dispatch(clearShoppingListError())} sx={{ mb: 2, borderRadius: 3 }}>{typeof shoppingListError === 'object' ? JSON.stringify(shoppingListError) : shoppingListError}</Alert> )}
        {shoppingListSuccessMessage && ( <Snackbar open={!!shoppingListSuccessMessage} autoHideDuration={3000} onClose={() => dispatch(clearShoppingListSuccessMessage())} message={shoppingListSuccessMessage}/> )}

        {Object.keys(localShoppingListItems).length === 0 && !generating && !loading && (
          <Paper elevation={0} sx={{ p: 3, textAlign: "center", borderRadius: 4, background: alpha(theme.palette.info.main, 0.05), border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
            <Typography color="text.secondary">Votre liste de courses est vide pour cette semaine. {shoppingListDoc === null && "Cliquez sur Actualiser pour la générer si un planning existe."}</Typography>
          </Paper>
        )}

        {Object.keys(localShoppingListItems).length > 0 && (
          <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 4, background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Box><Typography variant="body2" color="text.secondary">Coût Réel à Payer:</Typography><Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.success.dark }}>{formatCurrency(totalActualCostToPay)}</Typography></Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: "right" }}><Typography variant="body2" color="text.secondary">Coût Théorique (sans stock):</Typography><Typography variant="h6" sx={{ fontWeight: 600 }}>{formatCurrency(totalTheoreticalCostValue)}</Typography></Box>
            </Stack>
            <Tooltip title="Le coût réel est basé sur les articles non cochés et déduit le stock. Le coût théorique est basé sur tous les ingrédients des recettes planifiées, sans déduire le stock."><IconButton size="small" sx={{ position: "absolute", top: 8, right: 8 }}><InfoIcon fontSize="small" color="action" /></IconButton></Tooltip>
          </Paper>
        )}

        {Object.keys(localShoppingListItems).length > 0 && (
          <Box sx={{ mb: 3, textAlign: "center" }}>
            <Button variant="contained" startIcon={<DeliveryIcon />} onClick={handleRequestDelivery} disabled={generating || updatingStock || !shoppingListDoc || !shoppingListDoc.items || shoppingListDoc.items.length === 0} sx={{ borderRadius: 3, px: 4, py: 1.5, fontSize: "1rem", background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`, boxShadow: `0 4px 20px ${alpha(theme.palette.secondary.main, 0.3)}`, "&:hover": { transform: "translateY(-2px)", boxShadow: `0 6px 25px ${alpha(theme.palette.secondary.main, 0.4)}` }, transition: "all 0.3s ease" }}>Se faire livrer</Button>
          </Box>
        )}

        <List sx={{ p: 0 }}>
          {Object.entries(localShoppingListItems).map(([category, items]) => (
            <ShoppingListCategory
              key={category}
              categoryName={category} // Corrected prop name
              items={items}
              onToggleCheck={(itemId, currentCheckedStatus) => { // Pass full item for details
                  const itemDetails = items.find(i => i.itemId === itemId);
                  handleToggleItemCheck(itemId, currentCheckedStatus, itemDetails);
              }}
              onOpenPriceDialog={handleOpenPriceDialog} // Corrected prop name
            />
          ))}
        </List>

        <PriceInputDialog
          open={storePriceDialogOpen}
          onClose={handleClosePriceDialog}
          onSave={handleSavePrice}
          ingredientName={storePriceDialogData?.ingredientName || ""}
          unit={storePriceDialogData?.unit || ""}
          ingredientId={storePriceDialogData?.ingredientId || null}
        />
      </Container>
    </Box>
  );
}

export default ShoppingListPage;
