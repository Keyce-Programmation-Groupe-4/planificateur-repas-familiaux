"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
  useTheme,
  alpha,
  AppBar,
  Toolbar,
  Divider,
  LinearProgress,
  Skeleton,
  Tooltip,
  Snackbar, // Added Snackbar
  Stack,
} from "@mui/material"
import {
  LocalShipping as DeliveryIcon, // Nouvel icône pour la livraison
  PlaylistAddCheck,
  DeleteSweep,
  Inventory2 as InventoryIcon, // Icon for stock related info
  InfoOutlined as InfoIcon, // Icon for info tooltips
  Sync as SyncIcon, // Icon for refresh button
  MoreVert,
  PictureAsPdf,
} from "@mui/icons-material"
import { useAuth } from "../contexts/AuthContext"
import { db } from "../firebaseConfig"
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import "jspdf-autotable"
import PriceInputDialog from "../components/ShoppingList/PriceInputDialog"
import ShoppingListCategory from "../components/ShoppingList/ShoppingListCategory"
import { convertToStandardUnit, formatQuantityUnit, findStandardUnit } from "../utils/unitConverter" // Assuming findStandardUnit exists

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
  const { currentUser, userData, loading: authLoading } = useAuth()
  const familyId = userData?.familyId

  const [targetWeekStart, setTargetWeekStart] = useState(getStartOfWeek(new Date()))
  const targetWeekId = getWeekId(targetWeekStart)

  const [shoppingListDoc, setShoppingListDoc] = useState(null)
  const [shoppingListItems, setShoppingListItems] = useState({}) // Holds the items grouped by category for UI
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUpdatingStock, setIsUpdatingStock] = useState(false) // State for stock update process
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState("")

  const [anchorEl, setAnchorEl] = useState(null)
  const menuOpen = Boolean(anchorEl)

  const [priceDialogOpen, setPriceDialogOpen] = useState(false)
  const [priceDialogData, setPriceDialogData] = useState({ ingredientId: null, ingredientName: "", unit: "" })

  const [weekOptions, setWeekOptions] = useState([])
  const [weeklyPlanData, setWeeklyPlanData] = useState(null)
  const [setSuccess, setSetSuccess] = useState(null)

  // --- Data Fetching and List Generation/Refresh Logic ---
  const generateOrRefreshShoppingList = useCallback(
    async (isRefresh = false) => {
      if (!familyId) {
        if (!authLoading) setIsLoading(false)
        console.warn("Waiting for familyId...")
        return
      }

      setIsGenerating(true)
      setError(null)
      setSuccessMessage("")
      console.log(
        `${isRefresh ? "Refreshing" : "Generating"} shopping list for family ${familyId}, week: ${targetWeekId}`,
      )

      try {
        // 1. Get Weekly Plan
        const planDocRef = doc(db, "families", familyId, "weeklyPlans", targetWeekId)
        const planDocSnap = await getDoc(planDocRef)
        if (!planDocSnap.exists()) {
          throw new Error(`Aucun planning trouvé pour la semaine ${targetWeekId}.`)
        }
        const planData = planDocSnap.data()

        // 2. Extract Unique Recipe IDs
        const recipeIds = new Set()
        Object.values(planData.days).forEach((day) => {
          Object.values(day).forEach((recipeId) => {
            if (recipeId) recipeIds.add(recipeId)
          })
        })
        if (recipeIds.size === 0) {
          throw new Error("Le planning ne contient aucune recette.")
        }

        // 3. Fetch Recipe Details
        const recipePromises = Array.from(recipeIds).map((id) => getDoc(doc(db, "recipes", id)))
        const recipeDocs = await Promise.all(recipePromises)
        const recipesData = recipeDocs.filter((doc) => doc.exists()).map((doc) => ({ id: doc.id, ...doc.data() }))

        // 4. Create Raw Ingredient List (Gross Requirements)
        const rawIngredientItems = []
        recipesData.forEach((recipe) => {
          if (recipe.ingredientsList && Array.isArray(recipe.ingredientsList)) {
            recipe.ingredientsList.forEach((item) => {
              if (item.ingredientId && item.quantity && item.unit) {
                rawIngredientItems.push({ ...item })
              } else {
                console.warn(`Invalid ingredient in recipe ${recipe.id}:`, item)
              }
            })
          }
        })
        if (rawIngredientItems.length === 0) {
          throw new Error("Aucun ingrédient valide trouvé dans les recettes.")
        }

        // 5. Fetch Unique Ingredient Details
        const uniqueIngredientIds = new Set(rawIngredientItems.map((item) => item.ingredientId))
        const ingredientPromises = Array.from(uniqueIngredientIds).map((id) => getDoc(doc(db, "ingredients", id)))
        const ingredientDocs = await Promise.all(ingredientPromises)
        const ingredientDetailsMap = {}
        ingredientDocs.forEach((doc) => {
          if (doc.exists()) {
            ingredientDetailsMap[doc.id] = { id: doc.id, ...doc.data() }
          }
        })

        // 6. Fetch Current Stock
        const stockItemsRef = collection(db, "families", familyId, "stockItems")
        const stockSnapshot = await getDocs(stockItemsRef)
        const stockItemsMap = {} // Key: ingredientId, Value: { quantity, unit }
        stockSnapshot.forEach((doc) => {
          stockItemsMap[doc.id] = doc.data()
        })
        console.log("Current stock fetched:", stockItemsMap)

        // 7. Aggregate, Convert, Calculate Net Quantity and Costs
        const aggregatedList = {} // Key: ingredientId
        rawIngredientItems.forEach((item) => {
          const details = ingredientDetailsMap[item.ingredientId]
          if (!details || !details.units) {
            console.warn(`Details/units missing for ingredient ${item.ingredientId}`)
            return // Skip this ingredient if details are missing
          }

          const ingredientId = item.ingredientId
          const grossQuantity = item.quantity
          const requiredUnit = item.unit

          // Aggregate gross quantities first (handling potential different units for the same ingredient)
          if (!aggregatedList[ingredientId]) {
            aggregatedList[ingredientId] = {
              ingredientId: ingredientId,
              name: details.name || "Inconnu",
              category: details.category || "Autre",
              unitsData: details.units,
              grossQuantities: {}, // Stores { unit: totalGrossQuantity }
              stockInfo: stockItemsMap[ingredientId] || {
                quantity: 0,
                unit: findStandardUnit(details.units) || requiredUnit,
              }, // Default to 0 stock
              netQuantities: {}, // Stores { unit: netQuantity }
              costs: {}, // Stores { unit: { theoretical, actual, needsPriceInput, priceSource } }
            }
          }
          if (!aggregatedList[ingredientId].grossQuantities[requiredUnit]) {
            aggregatedList[ingredientId].grossQuantities[requiredUnit] = 0
          }
          aggregatedList[ingredientId].grossQuantities[requiredUnit] += grossQuantity
        })

        // Now, for each aggregated ingredient, calculate net quantity and costs
        Object.values(aggregatedList).forEach((aggItem) => {
          const details = ingredientDetailsMap[aggItem.ingredientId]
          const stockInfo = aggItem.stockInfo
          let totalGrossInStandard = 0
          let totalStockInStandard = 0
          const standardUnit = findStandardUnit(details.units)

          if (!standardUnit) {
            console.warn(`No standard unit found for ${aggItem.name}, calculations might be inaccurate.`)
            // Handle this case: maybe skip stock deduction or use a default logic?
          }

          // Convert all gross quantities to standard unit
          Object.entries(aggItem.grossQuantities).forEach(([unit, quantity]) => {
            if (unit === standardUnit) {
              totalGrossInStandard += quantity
            } else {
              const conversion = convertToStandardUnit(quantity, unit, details.units)
              if (conversion && conversion.standardUnit === standardUnit) {
                totalGrossInStandard += conversion.standardQuantity
              } else {
                console.warn(
                  `Cannot convert gross quantity ${quantity} ${unit} to standard unit ${standardUnit} for ${aggItem.name}`,
                )
                // Decide how to handle: add as separate item? ignore? For now, we might ignore conversion errors.
              }
            }
          })

          // Convert stock quantity to standard unit
          if (stockInfo.quantity > 0 && standardUnit) {
            if (stockInfo.unit === standardUnit) {
              totalStockInStandard = stockInfo.quantity
            } else {
              const conversion = convertToStandardUnit(stockInfo.quantity, stockInfo.unit, details.units)
              if (conversion && conversion.standardUnit === standardUnit) {
                totalStockInStandard = conversion.standardQuantity
              } else {
                console.warn(
                  `Cannot convert stock quantity ${stockInfo.quantity} ${stockInfo.unit} to standard unit ${standardUnit} for ${aggItem.name}`,
                )
              }
            }
          }

          aggItem.totalGrossInStandard = totalGrossInStandard
          aggItem.totalStockInStandard = totalStockInStandard
          aggItem.standardUnit = standardUnit

          // Calculate Net Quantity in standard unit
          const netQuantityInStandard = Math.max(0, totalGrossInStandard - totalStockInStandard)
          aggItem.netQuantityInStandard = netQuantityInStandard

          // Calculate Costs (using standard unit price if available)
          let pricePerStandardUnit = null
          let priceSource = null
          let needsInput = true
          if (
            standardUnit &&
            details.units[standardUnit] &&
            typeof details.units[standardUnit].standardPrice === "number"
          ) {
            pricePerStandardUnit = details.units[standardUnit].standardPrice
            priceSource = details.units[standardUnit].priceSource || "unknown"
            needsInput = false
          } else {
            // If standard unit price is missing, mark as needs input
            needsInput = true
          }

          aggItem.costs = {
            theoretical: pricePerStandardUnit !== null ? totalGrossInStandard * pricePerStandardUnit : null,
            actual: pricePerStandardUnit !== null ? netQuantityInStandard * pricePerStandardUnit : null,
            needsPriceInput: needsInput,
            priceSource: priceSource,
            pricePerStandardUnit: pricePerStandardUnit,
          }
        })

        // 8. Prepare Firestore Document Data
        const listItemsForFirestore = []
        let totalTheoreticalCost = 0
        let totalActualCost = 0

        Object.values(aggregatedList).forEach((aggItem) => {
          // Only add items that need to be bought (net quantity > 0)
          if (aggItem.netQuantityInStandard > 0) {
            const itemData = {
              itemId: `${aggItem.ingredientId}_${aggItem.standardUnit || "unit"}`, // Use standard unit in ID
              ingredientId: aggItem.ingredientId,
              name: aggItem.name,
              category: aggItem.category,
              // Store quantities in standard unit for consistency
              grossQuantity: aggItem.totalGrossInStandard,
              stockQuantity: aggItem.totalStockInStandard,
              netQuantity: aggItem.netQuantityInStandard,
              unit: aggItem.standardUnit || "unité", // Use standard unit
              // Costs
              theoreticalItemCost: aggItem.costs.theoretical,
              actualItemCost: aggItem.costs.actual,
              needsPriceInput: aggItem.costs.needsPriceInput,
              priceSource: aggItem.costs.priceSource,
              // Status
              isChecked: false, // Default to not checked
            }
            listItemsForFirestore.push(itemData)

            if (typeof itemData.theoreticalItemCost === "number") {
              totalTheoreticalCost += itemData.theoreticalItemCost
            }
            if (typeof itemData.actualItemCost === "number") {
              totalActualCost += itemData.actualItemCost
            }
          } else {
            // Optionally, still calculate theoretical cost for items fully in stock
            if (typeof aggItem.costs.theoretical === "number") {
              totalTheoreticalCost += aggItem.costs.theoretical
            }
          }
        })

        const shoppingListDocData = {
          weekId: targetWeekId,
          familyId: familyId,
          createdAt: isRefresh ? shoppingListDoc?.createdAt || serverTimestamp() : serverTimestamp(), // Keep original creation date on refresh
          lastGeneratedAt: serverTimestamp(),
          status: "active", // or 'refreshed'
          totalTheoreticalCost: totalTheoreticalCost,
          totalActualCost: totalActualCost,
          items: listItemsForFirestore,
        }

        // 9. Save to Firestore
        const listDocRef = doc(db, "families", familyId, "shoppingLists", targetWeekId)
        await setDoc(listDocRef, shoppingListDocData, { merge: true }) // Use setDoc with merge for upsert

        console.log("Shopping list saved/updated successfully:", shoppingListDocData)
        setShoppingListDoc(shoppingListDocData) // Update local state with the full document
        setSuccessMessage(isRefresh ? "Liste actualisée avec succès !" : "Liste de courses générée avec succès !")
        setTimeout(() => setSuccessMessage(""), 3000)
      } catch (err) {
        console.error(`Error ${isRefresh ? "refreshing" : "generating"} shopping list: `, err)
        setError(err.message || `Erreur lors de ${isRefresh ? "l'actualisation" : "la génération"} de la liste.`)
      } finally {
        setIsGenerating(false)
        setIsLoading(false) // Also set main loading to false
      }
    },
    [familyId, targetWeekId, authLoading, shoppingListDoc],
  ) // Added shoppingListDoc dependency for refresh

  // --- Fetch Existing List on Load ---
  useEffect(() => {
    const fetchExistingList = async () => {
      if (!familyId) {
        if (!authLoading) setIsLoading(false)
        return
      }
      setIsLoading(true)
      setError(null)
      const listDocRef = doc(db, "families", familyId, "shoppingLists", targetWeekId)
      try {
        const docSnap = await getDoc(listDocRef)
        if (docSnap.exists()) {
          console.log("Existing shopping list found for", targetWeekId)
          setShoppingListDoc(docSnap.data())
        } else {
          console.log("No existing shopping list for", targetWeekId, ". Need to generate.")
          setShoppingListDoc(null) // Explicitly set to null if not found
          // Optionally trigger generation automatically if no list exists?
          // generateOrRefreshShoppingList(false);
        }
      } catch (err) {
        console.error("Error fetching existing shopping list:", err)
        setError("Erreur lors du chargement de la liste existante.")
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading) {
      fetchExistingList()
    }
  }, [familyId, targetWeekId, authLoading])

  // --- UI Event Handlers ---
  const handleMenuClick = (event) => setAnchorEl(event.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)
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
    setSetSuccess(null)

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

      setSetSuccess("Liste de courses générée avec succès!")
      //fetchShoppingList()
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
        // FUTURE_ROBUSTNESS: Stock updates should ideally be atomic or handled by a backend function to prevent race conditions if multiple users manage stock.
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
      const itemDetails = Object.values(shoppingListItems || {}).find((i) => i.ingredientId === ingredientId)
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

  // --- Fonction pour demander une livraison ---
  const handleRequestDelivery = () => {
    handleMenuClose()
    if (!shoppingListDoc || !shoppingListDoc.items || shoppingListDoc.items.length === 0) {
      setError("Veuillez d'abord générer une liste de courses avec des articles.")
      return
    }

    // Stocker l'ID de la liste de courses dans sessionStorage pour y accéder dans la page de demande
    sessionStorage.setItem("currentShoppingListId", targetWeekId)
    navigate("/delivery/request")
  }

  // --- Total Cost Calculation ---
  const { totalActualCostToPay, totalTheoreticalCostValue } = useMemo(() => {
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

  // --- Export PDF Handler ---
  const handleExportPdf = () => {
    handleMenuClose()
    console.log("Exporting PDF with data:", shoppingListItems)

    if (!shoppingListItems || Object.keys(shoppingListItems).length === 0) {
      alert("La liste de courses est vide, impossible d'exporter.")
      return
    }

    const content = []

    // Title and date
    content.push({ text: "Liste de Courses", style: "header", alignment: "center" })
    content.push({
      text: `Semaine du ${targetWeekStart.toLocaleDateString("fr-FR")}`,
      style: "subheader",
      alignment: "center",
      margin: [0, 0, 0, 10],
    })

    // Costs Summary
    content.push({
      columns: [
        { text: `Coût Réel à Payer: ${formatCurrency(totalActualCostToPay)}`, style: "costSummary" },
        {
          text: `Coût Théorique (sans stock): ${formatCurrency(totalTheoreticalCostValue)}`,
          style: "costSummary",
          alignment: "right",
        },
      ],
      margin: [0, 0, 0, 15],
    })

    // Items by category
    Object.entries(shoppingListItems).forEach(([category, items]) => {
      content.push({ text: category, style: "categoryHeader", margin: [0, 10, 0, 5] })

      const categoryItemsContent = items.map((item) => {
        const quantityText = formatQuantityUnit(item.netQuantity, item.unit) // Display net quantity
        const costText =
          item.actualItemCost !== null ? formatCurrency(item.actualItemCost) : item.needsPriceInput ? "(Prix?!)" : ""
        const itemStyle = item.isChecked ? { decoration: "lineThrough", color: "grey" } : {}

        return [
          {
            text: item.isChecked ? { text: "✓", bold: true, color: "green" } : { text: "☐" },
            style: ["checkbox", itemStyle],
          }, // Checkbox column
          { text: item.name, style: ["itemText", itemStyle] },
          { text: quantityText, style: ["itemText", itemStyle], alignment: "right" },
          { text: costText, style: ["itemText", itemStyle], alignment: "right" },
        ]
      })

      content.push({
        layout: "lightHorizontalLines", // optional
        table: {
          headerRows: 0,
          widths: ["auto", "*", "auto", "auto"], // Widths for checkbox, name, quantity, cost
          body: categoryItemsContent,
        },
        // Remove borders
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
          vLineWidth: (i, node) => 0,
          hLineColor: (i, node) => "#dddddd",
          paddingLeft: (i, node) => (i === 0 ? 0 : 8), // Padding for checkbox
          paddingRight: (i, node) => 8,
          paddingTop: (i, node) => 4,
          paddingBottom: (i, node) => 4,
        },
      })
    })

    const docDefinition = {
      content: content,
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        subheader: { fontSize: 14, margin: [0, 0, 0, 10], color: "gray" },
        categoryHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5], color: theme.palette.primary.main },
        itemText: { fontSize: 10 },
        costSummary: { fontSize: 12, bold: true, margin: [0, 5, 0, 5] },
        checkbox: { fontSize: 12, margin: [0, 0, 5, 0] },
      },
      defaultStyle: {
        // font: 'Roboto' // Ensure you have Roboto font configured if needed
      },
    }

    try {
      pdfMake.createPdf(docDefinition).download(`liste_courses_${targetWeekId}.pdf`)
    } catch (e) {
      console.error("Error creating PDF:", e)
      alert("Une erreur est survenue lors de la création du PDF.")
    }
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
  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={60} sx={{ mt: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2, borderRadius: 2 }} />
      </Container>
    )
  }

  return (
    <Box sx={{ pb: 10 }}>
      {" "}
      {/* Add padding bottom for FAB */}
      {/* App Bar for Title and Actions */}
      <AppBar
        position="sticky"
        color="default"
        elevation={1}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Toolbar>
          <InventoryIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              Liste de Courses
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Semaine du {targetWeekStart.toLocaleDateString("fr-FR")}
            </Typography>
          </Box>
          <Tooltip title="Actualiser la liste avec le stock actuel">
            <span>
              {" "}
              {/* Span needed for disabled button tooltip */}
              <IconButton onClick={handleRefresh} disabled={isGenerating || isUpdatingStock}>
                {isGenerating ? <CircularProgress size={24} /> : <SyncIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <IconButton
            aria-label="more"
            aria-controls="long-menu"
            aria-haspopup="true"
            onClick={handleMenuClick}
            disabled={isGenerating || isUpdatingStock}
          >
            <MoreVert />
          </IconButton>
          <Menu id="long-menu" anchorEl={anchorEl} keepMounted open={menuOpen} onClose={handleMenuClose}>
            <MenuItem onClick={handleUncheckAll}>
              <ListItemIcon>
                <PlaylistAddCheck fontSize="small" />
              </ListItemIcon>
              <ListItemText>Tout décocher</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleClearChecked}>
              <ListItemIcon>
                <DeleteSweep fontSize="small" />
              </ListItemIcon>
              <ListItemText>Supprimer les articles cochés</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleExportPdf}>
              <ListItemIcon>
                <PictureAsPdf fontSize="small" />
              </ListItemIcon>
              <ListItemText>Exporter en PDF</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={handleRequestDelivery}
              disabled={!shoppingListDoc || !shoppingListDoc.items || shoppingListDoc.items.length === 0}
            >
              <ListItemIcon>
                <DeliveryIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Se faire livrer</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
        {/* Progress indicator for stock updates */}
        {isUpdatingStock && (
          <LinearProgress color="secondary" sx={{ position: "absolute", bottom: 0, left: 0, width: "100%" }} />
        )}
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Snackbar
            open={!!successMessage}
            autoHideDuration={3000}
            onClose={() => setSuccessMessage("")}
            message={successMessage}
          />
        )}

        {Object.keys(shoppingListItems).length === 0 && !isGenerating && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              textAlign: "center",
              borderRadius: 4,
              background: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <Typography color="text.secondary">
              Votre liste de courses est vide pour cette semaine.
              {shoppingListDoc === null && " Cliquez sur Actualiser pour la générer si un planning existe."}
            </Typography>
          </Paper>
        )}

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
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
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
            </Tooltip>
          </Paper>
        )}

        {/* Bouton de livraison principal - affiché seulement s'il y a des articles */}
        {Object.keys(shoppingListItems).length > 0 && (
          <Box sx={{ mb: 3, textAlign: "center" }}>
            <Button
              variant="contained"
              startIcon={<DeliveryIcon />}
              onClick={handleRequestDelivery}
              disabled={
                isGenerating ||
                isUpdatingStock ||
                !shoppingListDoc ||
                !shoppingListDoc.items ||
                shoppingListDoc.items.length === 0
              }
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: "1rem",
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
          </Box>
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

        {/* Price Input Dialog */}
        <PriceInputDialog
          open={priceDialogOpen}
          onClose={handleClosePriceDialog}
          onSave={handleSavePrice}
          ingredientName={priceDialogData.ingredientName}
          unit={priceDialogData.unit}
          ingredientId={priceDialogData.ingredientId}
        />
      </Container>
    </Box>
  )
}

export default ShoppingListPage
