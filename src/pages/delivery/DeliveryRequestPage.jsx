"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  useTheme,
  alpha,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material"
import { LocalShipping, AccessTime, LocationOn, Person, ArrowBack } from "@mui/icons-material"
import { useAuth } from "../../contexts/AuthContext"
import { db } from "../../firebaseConfig"
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"

// Composant pour la sélection d'un bayam selam
import VendorSelection from "../../components/delivery/VendorSelection"

function DeliveryRequestPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { currentUser, userData } = useAuth()
  const familyId = userData?.familyId

  const [activeStep, setActiveStep] = useState(0)
  const [shoppingList, setShoppingList] = useState(null)
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [deliveryInstructions, setDeliveryInstructions] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [deliveryTime, setDeliveryTime] = useState("")
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [availableVendors, setAvailableVendors] = useState([])
  const [shoppingListCategories, setShoppingListCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // New state variables
  const [currentInitialItemTotalCost, setCurrentInitialItemTotalCost] = useState(0);
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState(0);
  const [currentInitialTotalEstimatedCost, setCurrentInitialTotalEstimatedCost] = useState(0);
  const [currentRequestedItems, setCurrentRequestedItems] = useState([]);


  // Récupérer l'ID de la liste de courses depuis sessionStorage
  const shoppingListId = sessionStorage.getItem("currentShoppingListId")

  useEffect(() => {
    const fetchShoppingList = async () => {
      if (!familyId || !shoppingListId) {
        setIsLoading(false)
        setError("Informations manquantes pour charger la liste de courses.")
        return
      }

      try {
        const listDocRef = doc(db, "families", familyId, "shoppingLists", shoppingListId)
        const docSnap = await getDoc(listDocRef)
        let currentShoppingList = null
        if (docSnap.exists()) {
          currentShoppingList = docSnap.data();
          if (!currentShoppingList.items || currentShoppingList.items.length === 0) {
            setError("Votre liste de courses est vide ou ne contient aucun article. Veuillez ajouter des articles avant de demander une livraison.");
            setIsLoading(false); // Stop loading as this is a critical issue for proceeding
            setShoppingList(null); // Clear any potentially incomplete list
            return; // Stop further execution in fetchShoppingList
          }
          setShoppingList(currentShoppingList);
          const categories = new Set(currentShoppingList.items.map(item => item.category).filter(Boolean));
          setShoppingListCategories(Array.from(categories));
        } else {
          setError("Liste de courses introuvable. Impossible de continuer.");
          setIsLoading(false);
          return;
        }

        // Charger les vendeurs disponibles
        const vendorsRef = collection(db, "vendors")
        const vendorsQuery = query(vendorsRef, where("isActive", "==", true))
        const vendorsSnapshot = await getDocs(vendorsQuery)

        const vendors = []
        vendorsSnapshot.forEach((doc) => {
          vendors.push({ id: doc.id, ...doc.data() })
        })

        // Sort vendors after fetching them and after categories are set
        // This will be re-run if shoppingListCategories changes, but vendors is stable after first fetch.
        // Consider moving sorting to a point where both are definitely available.
        // For now, let's assume categories are derived before this runs or it's handled by useEffect dependency.
        // Actually, it's better to sort them right here or call a function that uses the state.

        // Directly use the categories derived from currentShoppingList if available, otherwise from state.
        const categoriesForSort = currentShoppingList && currentShoppingList.items
          ? Array.from(new Set(currentShoppingList.items.map(item => item.category).filter(Boolean)))
          : shoppingListCategories;

        const sortedVendors = sortVendorsBySpecialtyMatch(vendors, categoriesForSort);
        setAvailableVendors(sortedVendors)

        // Vérifier si un vendeur a été pré-sélectionné
        const preSelectedVendorId = sessionStorage.getItem("selectedVendorId")
        if (preSelectedVendorId && vendors.length > 0) {
          const preSelectedVendor = vendors.find((v) => v.id === preSelectedVendorId)
          if (preSelectedVendor) {
            setSelectedVendor(preSelectedVendor)
            setActiveStep(2) // Aller directement à l'étape de confirmation
          }
          sessionStorage.removeItem("selectedVendorId") // Nettoyer
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err)
        setError("Erreur lors du chargement des données. Veuillez réessayer.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchShoppingList()
  // Add shoppingListCategories to dependency array if sorting relies on its state update,
  // but it's safer to pass categories directly to sortVendorsBySpecialtyMatch if possible.
  // For now, this setup implies fetchShoppingList completes fully, including category extraction and sorting.
  }, [familyId, shoppingListId])

  // useEffect for calculating costs and requested items
  useEffect(() => {
    let calculatedInitialItemTotalCost = 0;
    let calculatedRequestedItems = [];

    if (shoppingList) {
      if (typeof shoppingList.totalTheoreticalCost === 'number') {
        calculatedInitialItemTotalCost = shoppingList.totalTheoreticalCost;
      } else {
        console.warn("DeliveryRequestPage: shoppingList.totalTheoreticalCost is not a number or not present. InitialItemTotalCost might be inaccurate if relying on fallback item reduction without per-unit prices.");
        // Fallback if totalTheoreticalCost isn't available - this might lead to 0 if items don't have 'price' or 'quantity' in the expected way for per-unit calculation
        if (shoppingList.items) {
          calculatedInitialItemTotalCost = shoppingList.items.reduce(
            (total, item) => total + ((item.price || 0) * (item.quantity || 0)), // This old fallback might be irrelevant if items don't have 'price' and 'quantity' for per-unit.
            0
          );
          // If the goal is to sum theoreticalItemCost from items as a fallback:
          // calculatedInitialItemTotalCost = shoppingList.items.reduce((total, item) => total + (item.theoreticalItemCost || 0), 0);
          // For now, stick to the user's expectation that totalTheoreticalCost is the source. If it's missing, the warning is key.
        }
      }

      if (shoppingList.items) {
        calculatedRequestedItems = shoppingList.items.map(item => ({
          itemId: item.itemId, // Already correct based on typical structure
          name: item.name,
          quantity: item.netQuantity || 0, // Use netQuantity
          unit: item.unit,
          originalEstimatedPrice: item.theoreticalItemCost || 0, // Use theoreticalItemCost for the line
        }));
      }
    }

    setCurrentInitialItemTotalCost(calculatedInitialItemTotalCost);
    setCurrentRequestedItems(calculatedRequestedItems);

    const calculatedDeliveryFee = selectedVendor?.baseFee || 0;
    setCurrentDeliveryFee(calculatedDeliveryFee);

    // Ensure this uses the potentially updated calculatedInitialItemTotalCost
    setCurrentInitialTotalEstimatedCost(calculatedInitialItemTotalCost + calculatedDeliveryFee);
  }, [shoppingList, selectedVendor]);


  const sortVendorsBySpecialtyMatch = (vendors, categories) => {
    if (!categories || categories.length === 0) {
      // No categories to match, so just sort by rating or name as a default
      return vendors.sort((a, b) => (b.rating || 0) - (a.rating || 0) || a.name.localeCompare(b.name));
    }

    return vendors
      .map(vendor => {
        let matchScore = 0;
        if (vendor.specialties && Array.isArray(vendor.specialties)) {
          categories.forEach(category => {
            if (vendor.specialties.includes(category)) {
              matchScore++;
            }
          });
        }
        return { ...vendor, matchScore, isRecommendedMatch: matchScore > 0 };
      })
      .sort((a, b) => {
        // Primary sort: matchScore descending
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        // Secondary sort: rating descending
        if ((b.rating || 0) !== (a.rating || 0)) {
          return (b.rating || 0) - (a.rating || 0);
        }
        // Tertiary sort: name ascending
        return a.name.localeCompare(b.name);
      });
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor)
  }

  const handleSubmit = async () => {
    if (!familyId || !shoppingListId || !selectedVendor) {
      setError("Informations manquantes pour créer la demande de livraison.")
      return
    }

    setIsLoading(true)
    setError(null)
    // FUTURE_ROBUSTNESS: Implement transactional write if shopping list status needs update upon delivery request creation.
    try {
      if (!shoppingList || !shoppingList.items || shoppingList.items.length === 0) {
        setError("Impossible de créer une demande de livraison avec une liste de courses vide.");
        setIsLoading(false);
        return;
      }
      // Créer la demande de livraison
      const deliveryRequest = {
        familyId,
        shoppingListId,
        vendorId: selectedVendor.id,
        requestedByUserId: currentUser?.uid, // Added requestedByUserId
        status: "pending_vendor_confirmation",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deliveryAddress,
        deliveryInstructions,
        requestedDate: deliveryDate,
        requestedTime: deliveryTime,
        initialItemTotalCost: currentInitialItemTotalCost, // Use new state variable
        deliveryFee: currentDeliveryFee, // Use new state variable
        initialTotalEstimatedCost: currentInitialTotalEstimatedCost, // Use new state variable
        requestedItems: currentRequestedItems, // Use new state variable
        statusHistory: [
          {
            status: "pending_vendor_confirmation",
            timestamp: new Date(),
            changedBy: "user", // Assuming the user creates the request
            userId: currentUser?.uid // Added userId
          }
        ],
      }

      const deliveryRef = await addDoc(collection(db, "deliveryRequests"), deliveryRequest)
      console.log("Demande de livraison créée avec ID:", deliveryRef.id)

      // NOTIFICATION POINT
      console.log(`NOTIFICATION_POINT: New delivery request created. Notify vendor ${selectedVendor.id} and user ${currentUser.uid}. Order ID: ${deliveryRef.id}`);
      alert("Placeholder: Vendor would be notified of your new request.");

      const newDeliveryId = deliveryRef.id; // Capture the ID here
      setSuccess(true)
      // Rediriger vers la page de suivi après 2 secondes
      setTimeout(() => {
        navigate(`/delivery/tracking/${newDeliveryId}`); // Use the new variable
      }, 2000)
    } catch (err) {
      console.error("Erreur détaillée lors de la création de la demande:", err);
      let userErrorMessage = "Une erreur s'est produite lors de la création de votre demande de livraison. Veuillez réessayer.";
      if (err.code === 'permission-denied') {
        userErrorMessage = "Erreur de permission. Veuillez vérifier que vous êtes bien connecté et que vous avez les droits nécessaires.";
      } else if (err.message.includes('network')) {
        userErrorMessage = "Erreur de réseau. Veuillez vérifier votre connexion internet et réessayer.";
      }
      setError(userErrorMessage);
    } finally {
      setIsLoading(false)
    }
  }

  const steps = ["Informations de livraison", "Sélection du vendeur", "Confirmation"]

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement des informations...</Typography>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate("/shopping-list")}>
          Retour à la liste de courses
        </Button>
      </Container>
    )
  }

  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          Votre demande de livraison a été créée avec succès! Redirection en cours...
        </Alert>
        <CircularProgress size={24} sx={{ display: "block", mx: "auto", mt: 2 }} />
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <LocalShipping sx={{ mr: 2, color: theme.palette.secondary.main }} />
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Demande de livraison
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Informations de livraison
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Adresse de livraison"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                  variant="outlined"
                  InputProps={{
                    startAdornment: <LocationOn sx={{ mr: 1, color: "text.secondary" }} />,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date souhaitée"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Heure souhaitée"
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  required
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: <AccessTime sx={{ mr: 1, color: "text.secondary" }} />,
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Instructions spéciales (optionnel)"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  multiline
                  rows={3}
                  variant="outlined"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button onClick={() => navigate("/shopping-list")} sx={{ mr: 1 }}>
                Annuler
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!deliveryAddress || !deliveryDate || !deliveryTime}
              >
                Suivant
              </Button>
            </Box>
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Sélection du vendeur
            </Typography>

            {availableVendors.length === 0 ? (
              <Alert severity="info">Aucun vendeur disponible pour le moment. Veuillez réessayer plus tard.</Alert>
            ) : (
              <VendorSelection vendors={availableVendors} onSelect={handleVendorSelect} selected={selectedVendor} />
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
              <Button onClick={handleBack}>Retour</Button>
              <Button variant="contained" onClick={handleNext} disabled={!selectedVendor}>
                Suivant
              </Button>
            </Box>
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Confirmation de la demande
            </Typography>

            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Adresse de livraison
                  </Typography>
                  <Typography>{deliveryAddress}</Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Date et heure
                  </Typography>
                  <Typography>
                    {deliveryDate} à {deliveryTime}
                  </Typography>
                </Box>

                {deliveryInstructions && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Instructions
                    </Typography>
                    <Typography>{deliveryInstructions}</Typography>
                  </Box>
                )}

                <Divider />

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Vendeur sélectionné
                  </Typography>
                  <Typography sx={{ display: "flex", alignItems: "center" }}>
                    <Person sx={{ mr: 1, fontSize: 20 }} />
                    {selectedVendor?.name || "Non sélectionné"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Frais de livraison
                  </Typography>
                  <Typography>
                    {currentDeliveryFee.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Coût estimé des courses
                  </Typography>
                  <Typography>
                    {currentInitialItemTotalCost.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "XAF",
                    })}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Total estimé
                  </Typography>
                  <Typography variant="h6" sx={{ color: theme.palette.primary.main }}>
                    {currentInitialTotalEstimatedCost.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "XAF",
                    })}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
              <Button onClick={handleBack}>Retour</Button>
              <Button variant="contained" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? <CircularProgress size={24} /> : "Confirmer la demande"}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  )
}

export default DeliveryRequestPage
