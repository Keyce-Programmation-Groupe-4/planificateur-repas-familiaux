"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  TextField,
  useTheme,
  alpha,
} from "@mui/material"
import {
  ShoppingCart as ShoppingCartIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PictureAsPdfIcon,
  LocalShipping as DeliveryIcon, // Nouvel icône pour la livraison
} from "@mui/icons-material"
import { useAuth } from "../contexts/AuthContext"
import { db } from "../firebaseConfig"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import PriceInputDialog from "../components/ShoppingList/PriceInputDialog"
import ShoppingListCategory from "../components/ShoppingList/ShoppingListCategory"

// --- PDFMake Import ---
import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
pdfMake.vfs = pdfFonts.vfs

// --- Helper Functions ---
const getStartOfWeek = (date) => {
  const dateCopy = new Date(date)
  const day = dateCopy.getDay()
  const diff = dateCopy.getDate() - day + (day === 0 ? -6 : 1)
  dateCopy.setHours(0, 0, 0, 0)
  return new Date(dateCopy.setDate(diff))
}

const getWeekId = (date) => {
  const startDate = getStartOfWeek(date)
  const year = startDate.getFullYear()
  const thursday = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 3)
  const firstThursday = new Date(thursday.getFullYear(), 0, 4)
  const weekNumber = Math.ceil(1 + (thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000))
  return `${year}-W${String(weekNumber).padStart(2, "0")}`
}

const formatCurrency = (value) => {
  if (typeof value !== "number") {
    return "N/A" // Return N/A if cost cannot be calculated
  }
  return value.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })
}
// --- End Helper Functions ---

function ShoppingListPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { currentUser, userData } = useAuth()
  const familyId = userData?.familyId

  const [shoppingListDoc, setShoppingListDoc] = useState(null)
  const [weeklyPlanData, setWeeklyPlanData] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [targetWeekId, setTargetWeekId] = useState("")
  const [weekOptions, setWeekOptions] = useState([])
  const [anchorEl, setAnchorEl] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isNotifying, setIsNotifying] = useState(false)
  const [priceDialogOpen, setPriceDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [newUnitDialogOpen, setNewUnitDialogOpen] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [newItemCategory, setNewItemCategory] = useState("")
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false)
  const [categories, setCategories] = useState([])
  const [combinedLoading, setCombinedLoading] = useState(true)

  // État pour le dialogue de demande de livraison
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)

  const [shoppingListItems, setShoppingListItems] = useState({}) // Holds the items grouped by category for UI
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStock, setIsUpdatingStock] = useState(false) // State for stock update process
  const [successMessage, setSuccessMessage] = useState("")

  const [priceDialogData, setPriceDialogData] = useState({ ingredientId: null, ingredientName: "", unit: "" })

  const fetchWeeklyPlans = useCallback(async () => {
    if (!familyId) return

    try {
      const weeklyPlansRef = collection(db, "families", familyId, "weeklyPlans")
      const q = query(weeklyPlansRef, orderBy("startDate", "desc"))
      const querySnapshot = await getDocs(q)

      const options = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (!data.isLocal) {
          options.push({
            id: doc.id,
            label: `${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()}`,
            data: data,
          })
        }
      })

      setWeekOptions(options)
      if (options.length > 0) {
        setTargetWeekId(options[0].id)
        setWeeklyPlanData(options[0].data)
      }
    } catch (err) {
      console.error("Error fetching weekly plans:", err)
      setError("Erreur lors du chargement des plans hebdomadaires.")
    }
  }, [familyId])

  const fetchCategories = useCallback(async () => {
    if (!familyId) return

    try {
      const categoriesRef = collection(db, "families", familyId, "categories")
      const querySnapshot = await getDocs(categoriesRef)

      const fetchedCategories = []
      querySnapshot.forEach((doc) => {
        fetchedCategories.push({ id: doc.id, ...doc.data() })
      })

      setCategories(fetchedCategories)
    } catch (err) {
      console.error("Error fetching categories:", err)
    }
  }, [familyId])

  const fetchShoppingList = useCallback(async () => {
    if (!familyId || !targetWeekId) {
      setCombinedLoading(false)
      return
    }

    try {
      const shoppingListRef = doc(db, "families", familyId, "shoppingLists", targetWeekId)
      const docSnap = await getDoc(shoppingListRef)

      if (docSnap.exists()) {
        setShoppingListDoc(docSnap.data())
      } else {
        setShoppingListDoc(null)
      }
    } catch (err) {
      console.error("Error fetching shopping list:", err)
      setError("Erreur lors du chargement de la liste de courses.")
    } finally {
      setCombinedLoading(false)
      setIsLoading(false)
    }
  }, [familyId, targetWeekId])

  useEffect(() => {
    setCombinedLoading(true)
    fetchWeeklyPlans()
    fetchCategories()
  }, [fetchWeeklyPlans, fetchCategories])

  useEffect(() => {
    if (targetWeekId) {
      fetchShoppingList()
    }
  }, [targetWeekId, fetchShoppingList])

  // --- UI Event Handlers ---
  const handleMenuClick = (event) => setAnchorEl(event.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)
  const generateOrRefreshShoppingList = (isRefresh) => {
    // Placeholder function for generating or refreshing the shopping list
    console.log(`Generating or refreshing shopping list. isRefresh: ${isRefresh}`)
  }
  const handleRefresh = () => {
    handleMenuClose()
    generateOrRefreshShoppingList(true)
  } // Call with isRefresh = true

  const handleWeekChange = (event) => {
    const selectedWeekId = event.target.value
    setTargetWeekId(selectedWeekId)
    const selectedWeek = weekOptions.find((option) => option.id === selectedWeekId)
    if (selectedWeek) {
      setWeeklyPlanData(selectedWeek.data)
    }
  }

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleGenerateList = async () => {
    if (!familyId || !targetWeekId || !weeklyPlanData) {
      setError("Veuillez sélectionner une semaine valide.")
      return
    }

    setIsGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      // Logique de génération de la liste de courses
      // ...

      // Exemple simplifié
      const shoppingListRef = doc(db, "families", familyId, "shoppingLists", targetWeekId)
      await setDoc(shoppingListRef, {
        weekId: targetWeekId,
        generatedAt: serverTimestamp(),
        items: [], // Exemple simplifié
        totalTheoreticalCost: 0,
        totalActualCost: 0,
      })

      setSuccess("Liste de courses générée avec succès!")
      fetchShoppingList()
    } catch (err) {
      console.error("Error generating shopping list:", err)
      setError("Erreur lors de la génération de la liste de courses.")
    } finally {
      setIsGenerating(false)
    }
  }

  // --- Toggle Check and Update Stock ---
  const handleToggleCheck = useCallback(
    async (itemId, currentCheckedStatus) => {
      if (!familyId || !shoppingListDoc) return

      const newCheckedStatus = !currentCheckedStatus
      const itemIndex = shoppingListDoc.items.findIndex((item) => item.itemId === itemId)
      if (itemIndex === -1) return

      const updatedItems = [...shoppingListDoc.items]
      const itemToUpdate = { ...updatedItems[itemIndex], isChecked: newCheckedStatus }
      updatedItems[itemIndex] = itemToUpdate

      // Optimistically update UI state first
      setShoppingListDoc((prevDoc) => ({ ...prevDoc, items: updatedItems }))

      // Prepare Firestore update
      const listDocRef = doc(db, "families", familyId, "shoppingLists", targetWeekId)
      const updatePayload = { items: updatedItems }

      // Prepare stock update only if checking the item (adding to stock)
      let stockUpdatePromise = Promise.resolve()
      if (newCheckedStatus) {
        // Only update stock when checking item ON
        console.log(`Item ${itemToUpdate.name} checked. Preparing stock update.`)
        // *** Using Cloud Function is recommended here for atomicity ***
        // For now, implement client-side update (less robust)
        setIsUpdatingStock(true) // Show indicator
        const stockItemRef = doc(db, "families", familyId, "stockItems", itemToUpdate.ingredientId)
        const stockUpdateData = {
          ingredientName: itemToUpdate.name, // Ensure name is present
          category: itemToUpdate.category, // Ensure category is present
          unit: itemToUpdate.unit, // The unit in which it was bought (standard unit)
          lastUpdated: serverTimestamp(),
        }

        stockUpdatePromise = getDoc(stockItemRef)
          .then((stockSnap) => {
            const currentStockQuantity = stockSnap.exists() ? stockSnap.data().quantity || 0 : 0
            // Ensure units match before adding - should match as we use standard unit
            if (stockSnap.exists() && stockSnap.data().unit !== itemToUpdate.unit) {
              console.warn(
                `Stock unit (${stockSnap.data().unit}) differs from list unit (${itemToUpdate.unit}) for ${itemToUpdate.name}. Cannot update stock automatically.`,
              )
              // Maybe show an error to the user?
              return Promise.reject(new Error("Unit mismatch"))
            }
            stockUpdateData.quantity = currentStockQuantity + itemToUpdate.netQuantity
            return setDoc(stockItemRef, stockUpdateData, { merge: true })
          })
          .finally(() => setIsUpdatingStock(false))
      }

      try {
        // Update the shopping list document
        await updateDoc(listDocRef, updatePayload)
        console.log(`Item ${itemId} status updated to ${newCheckedStatus}`)

        // Wait for the stock update (if any) to complete
        await stockUpdatePromise
        if (newCheckedStatus) {
          console.log(`Stock updated for ${itemToUpdate.name}`)
          setSuccessMessage(`Stock mis à jour pour ${itemToUpdate.name}.`)
          setTimeout(() => setSuccessMessage(""), 2000)
        }
      } catch (err) {
        console.error("Error updating item status or stock:", err)
        setError("Erreur lors de la mise à jour de l'article ou du stock.")
        // Revert optimistic UI update on error?
        setShoppingListDoc((prevDoc) => {
          const revertedItems = [...prevDoc.items]
          const revertIndex = revertedItems.findIndex((item) => item.itemId === itemId)
          if (revertIndex !== -1) {
            revertedItems[revertIndex] = { ...revertedItems[revertIndex], isChecked: currentCheckedStatus }
          }
          return { ...prevDoc, items: revertedItems }
        })
      }
    },
    [familyId, shoppingListDoc, targetWeekId],
  )

  const handleUncheckAll = async () => {
    handleMenuClose()
    if (!familyId || !shoppingListDoc || !shoppingListDoc.items) return

    const updatedItems = shoppingListDoc.items.map((item) => ({ ...item, isChecked: false }))

    // Optimistically update UI
    setShoppingListDoc((prevDoc) => ({ ...prevDoc, items: updatedItems }))

    const listDocRef = doc(db, "families", familyId, "shoppingLists", targetWeekId)
    try {
      await updateDoc(listDocRef, { items: updatedItems })
      console.log("All items unchecked.")
    } catch (err) {
      console.error("Error unchecking all items:", err)
      setError("Erreur lors de la désélection de tous les articles.")
      // Revert UI?
      setShoppingListDoc(shoppingListDoc) // Revert to original doc state
    }
  }

  const handleClearChecked = async () => {
    handleMenuClose()
    if (!familyId || !shoppingListDoc || !shoppingListDoc.items) return

    const remainingItems = shoppingListDoc.items.filter((item) => !item.isChecked)

    // Optimistically update UI
    setShoppingListDoc((prevDoc) => ({ ...prevDoc, items: remainingItems }))

    const listDocRef = doc(db, "families", familyId, "shoppingLists", targetWeekId)
    try {
      await updateDoc(listDocRef, { items: remainingItems })
      console.log("Checked items cleared.")
    } catch (err) {
      console.error("Error clearing checked items:", err)
      setError("Erreur lors de la suppression des articles cochés.")
      // Revert UI?
      setShoppingListDoc(shoppingListDoc) // Revert to original doc state
    }
  }

  // --- Price Input Handling ---
  const handleOpenPriceDialog = useCallback(
    (ingredientId, ingredientName, unit) => {
      // We need the standard unit price, so we pass the standard unit
      const itemDetails = Object.values(shoppingListItems).find((i) => i.ingredientId === ingredientId)
      const standardUnit = itemDetails?.unit
      if (!standardUnit) {
        alert("Impossible de déterminer l'unité standard pour cet ingrédient.")
        return
      }
      setPriceDialogData({ ingredientId, ingredientName, unit: standardUnit }) // Use standard unit
      setPriceDialogOpen(true)
    },
    [shoppingListItems],
  ) // Depends on aggregatedList which is now part of generate function state

  const handleClosePriceDialog = () => {
    setPriceDialogOpen(false)
  }

  const handleSavePrice = async (ingredientId, unit, price) => {
    // This should save the price for the STANDARD unit
    if (typeof price !== "number" || price < 0) {
      alert("Veuillez entrer un prix valide.")
      return
    }
    console.log(`Saving standard price for ${ingredientId}, unit ${unit}: ${price}`)
    const ingredientRef = doc(db, "ingredients", ingredientId)
    try {
      await updateDoc(ingredientRef, {
        [`units.${unit}.standardPrice`]: price,
        [`units.${unit}.priceSource`]: "user_input",
        [`units.${unit}.lastPriceUpdate`]: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      console.log("Standard price updated successfully in Firestore.")
      handleClosePriceDialog()
      generateOrRefreshShoppingList(true) // Re-generate/refresh list to reflect new price/cost
    } catch (error) {
      console.error("Error updating standard price in Firestore: ", error)
      alert("Erreur lors de la sauvegarde du prix standard.")
    }
  }

  // --- Total Cost Calculation ---
  const { totalActualCostToPay, totalTheoreticalCostValue } = React.useMemo(() => {
    let actual = 0
    const theoretical = shoppingListDoc?.totalTheoreticalCost || 0 // Get theoretical from doc if available

    // Recalculate actual cost to pay based on current checked status
    if (shoppingListDoc && shoppingListDoc.items) {
      shoppingListDoc.items.forEach((item) => {
        if (!item.isChecked && typeof item.actualItemCost === "number") {
          actual += item.actualItemCost
        }
      })
    }

    return { totalActualCostToPay: actual, totalTheoreticalCostValue: theoretical }
  }, [shoppingListDoc])

  const handleExportPdf = () => {
    if (!shoppingListDoc) return

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text("Liste de courses", 14, 22)
    doc.setFontSize(11)
    doc.text(
      `Semaine du ${new Date(weeklyPlanData.startDate).toLocaleDateString()} au ${new Date(weeklyPlanData.endDate).toLocaleDateString()}`,
      14,
      30,
    )

    // Logique d'export PDF
    // ...

    doc.save(`liste_courses_${targetWeekId}.pdf`)
  }

  // Fonction pour ouvrir le dialogue de demande de livraison
  const handleRequestDelivery = () => {
    if (!shoppingListDoc) {
      setError("Veuillez d'abord générer une liste de courses.")
      return
    }

    // Stocker l'ID de la liste de courses dans sessionStorage pour y accéder dans la page de demande
    sessionStorage.setItem("currentShoppingListId", targetWeekId)
    navigate("/delivery/request")
  }

  // --- Process Firestore Doc into UI State ---
  useEffect(() => {
    if (shoppingListDoc && shoppingListDoc.items) {
      const finalGroupedList = {}
      shoppingListDoc.items.forEach((item) => {
        const category = item.category || "Autre"
        if (!finalGroupedList[category]) {
          finalGroupedList[category] = []
        }
        finalGroupedList[category].push(item)
      })

      // Sort categories and items within categories
      const sortedFinalList = {}
      Object.keys(finalGroupedList)
        .sort()
        .forEach((category) => {
          sortedFinalList[category] = finalGroupedList[category].sort((a, b) => a.name.localeCompare(b.name))
        })
      setShoppingListItems(sortedFinalList)
    } else {
      setShoppingListItems({}) // Clear UI list if doc is null or has no items
    }
  }, [shoppingListDoc])

  // --- Render Logic ---
  if (combinedLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: "bold", display: "flex", alignItems: "center" }}
        >
          <ShoppingCartIcon sx={{ mr: 1 }} />
          Liste de Courses
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Générez et gérez votre liste de courses basée sur votre planification de repas.
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            mb: 2,
            gap: 2,
          }}
        >
          <TextField
            select
            label="Semaine"
            value={targetWeekId}
            onChange={handleWeekChange}
            variant="outlined"
            fullWidth
            sx={{ flexGrow: 1 }}
            disabled={combinedLoading || isGenerating}
          >
            {weekOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleGenerateList}
              disabled={combinedLoading || isSaving || isNotifying || !weeklyPlanData || weeklyPlanData.isLocal}
              sx={{
                borderRadius: 3,
                px: { xs: 2, sm: 3 },
                py: { xs: 0.5, sm: 1 },
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              {isGenerating ? <CircularProgress size={24} /> : "Générer"}
            </Button>

            <IconButton
              aria-label="more"
              aria-controls="long-menu"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              disabled={combinedLoading || isGenerating || isSaving || isNotifying || !shoppingListDoc}
            >
              <MoreVertIcon />
            </IconButton>

            <Menu id="long-menu" anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={handleExportPdf}>
                <ListItemIcon>
                  <PictureAsPdfIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Exporter en PDF</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleRequestDelivery} disabled={!shoppingListDoc || isGenerating}>
                <ListItemIcon>
                  <DeliveryIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Se faire livrer</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Bouton de livraison principal */}
        <Button
          variant="contained"
          startIcon={<DeliveryIcon />}
          onClick={handleRequestDelivery}
          disabled={combinedLoading || isSaving || isNotifying || !weeklyPlanData || !shoppingListDoc}
          sx={{
            borderRadius: 3,
            ml: 1,
            px: { xs: 2, sm: 3 },
            py: { xs: 0.5, sm: 1 },
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
            boxShadow: `0 4px 20px ${alpha(theme.palette.secondary.main, 0.3)}`,
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: `0 6px 25px ${alpha(theme.palette.secondary.main, 0.4)}`,
            },
            transition: "all 0.3s ease",
          }}
        >
          Se faire livrer
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

        {combinedLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        ) : !shoppingListDoc ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Aucune liste de courses générée pour cette semaine. Cliquez sur "Générer" pour créer une liste basée sur
            votre planification.
          </Alert>
        ) : (
          <Box sx={{ mt: 3 }}>
            {/* Contenu de la liste de courses */}
            {/* Costs Summary */}
            {Object.keys(shoppingListItems).length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: 4,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                {/*<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Coût Réel à Payer:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.success.dark }}>
                      {formatCurrency(totalActualCostToPay)}
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="body2" color="text.secondary">
                      Coût Théorique (sans stock):
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {formatCurrency(totalTheoreticalCostValue)}
                    </Typography>
                  </Box>
                </Stack>
                <Tooltip title="Le coût réel est basé sur les articles non cochés et déduit le stock. Le coût théorique est basé sur tous les ingrédients des recettes planifiées, sans déduire le stock.">
                  <IconButton size="small" sx={{ position: "absolute", top: 8, right: 8 }}>
                    <InfoIcon fontSize="small" color="action" />
                  </IconButton>
                </Tooltip>*/}
              </Paper>
            )}

            {/* List Items */}
            <List sx={{ p: 0 }}>
              {Object.entries(shoppingListItems).map(([category, items]) => (
                <ShoppingListCategory
                  key={category}
                  category={category}
                  items={items}
                  onToggleCheck={handleToggleCheck}
                  onPriceInputClick={handleOpenPriceDialog}
                />
              ))}
            </List>

            {/* Add Item Manually FAB? - Maybe later */}
            {/* <Fab color="primary" aria-label="add" sx={{ position: 'fixed', bottom: 16, right: 16 }}>
              <AddIcon />
            </Fab> */}

            {/* Price Input Dialog */}
            <PriceInputDialog
              open={priceDialogOpen}
              onClose={handleClosePriceDialog}
              onSave={handleSavePrice}
              ingredientName={priceDialogData.ingredientName}
              unit={priceDialogData.unit}
              ingredientId={priceDialogData.ingredientId}
            />
          </Box>
        )}
      </Paper>
    </Container>
  )
}

export default ShoppingListPage
