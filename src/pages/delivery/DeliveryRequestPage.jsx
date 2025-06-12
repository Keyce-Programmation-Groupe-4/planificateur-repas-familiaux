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
  IconButton, // Added for MyLocation button
  FormControl, // Added for Select
  InputLabel,  // Added for Select
  Select,      // Added for Select
  MenuItem,    // Added for Select
} from "@mui/material"
import { LocalShipping, AccessTime, LocationOn, Person, ArrowBack, MyLocation as MyLocationIcon } from "@mui/icons-material" // Added MyLocationIcon
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { useAuth } from "../../contexts/AuthContext"
import { db } from "../../firebaseConfig"
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy } from "firebase/firestore" // Added onSnapshot, orderBy
import { triggerSendNotification } from '../../utils/notificationUtils';
import { getCurrentUserFCMToken } from '../../utils/authUtils';

// Composant pour la sélection d'un bayam selam
import VendorSelection from "../../components/delivery/VendorSelection"
import { calculateDistance } from "../../utils/geolocationUtils";

const RATE_PER_KM = 100; // Example: 100 CFA per kilometer

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
  const [isFetchingCurrentLocation, setIsFetchingCurrentLocation] = useState(false);

  // State for Saved Addresses
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isLoadingSavedAddresses, setIsLoadingSavedAddresses] = useState(true);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState('');


  // Google Maps API Loader
  const [libraries] = useState(['places']); // Define libraries here
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // New state variables for Autocomplete and coordinates
  const [deliveryLatitude, setDeliveryLatitude] = useState(null);
  const [deliveryLongitude, setDeliveryLongitude] = useState(null);
  const [autocompleteInstance, setAutocompleteInstance] = useState(null);


  // New state variables for costs
  const [currentInitialItemTotalCost, setCurrentInitialItemTotalCost] = useState(0);
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState(0);
  const [currentInitialTotalEstimatedCost, setCurrentInitialTotalEstimatedCost] = useState(0);
  const [currentRequestedItems, setCurrentRequestedItems] = useState([]);


  // Autocomplete Handlers
  const onAutocompleteLoad = (autocomplete) => {
    setAutocompleteInstance(autocomplete);
  };

  const onPlaceChanged = () => {
    if (autocompleteInstance !== null) {
      const place = autocompleteInstance.getPlace();
      if (place && place.formatted_address && place.geometry && place.geometry.location) {
        setDeliveryAddress(place.formatted_address);
        setDeliveryLatitude(place.geometry.location.lat());
        setDeliveryLongitude(place.geometry.location.lng());
        setError(null); // Clear previous address errors
      } else {
        console.log('Place selection error or incomplete data from Autocomplete.');
        // Optionally, set an error message for the user
        // setError("L'adresse sélectionnée n'est pas valide ou complète. Veuillez réessayer.");
        // Clear coordinates if selection is invalid
        setDeliveryLatitude(null);
        setDeliveryLongitude(null);
      }
    } else {
      console.log('Autocomplete is not loaded yet!');
    }
  };

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

  // Fetch Saved Addresses
  useEffect(() => {
    if (currentUser?.uid) {
      setIsLoadingSavedAddresses(true);
      const addressesRef = collection(db, 'users', currentUser.uid, 'savedAddresses');
      const q = query(addressesRef, orderBy('createdAt', 'desc')); // Assuming you want them ordered

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const addresses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSavedAddresses(addresses);
        setIsLoadingSavedAddresses(false);
      }, (err) => {
        console.error("Error fetching saved addresses:", err);
        setError("Impossible de charger les adresses enregistrées."); // Use main error state for simplicity
        setIsLoadingSavedAddresses(false);
      });
      return () => unsubscribe();
    } else {
      setSavedAddresses([]);
      setIsLoadingSavedAddresses(false);
    }
  }, [currentUser]);

  const handleUseMyLocation = async () => {
    setIsFetchingCurrentLocation(true);
    setError(null); // Clear previous errors

    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur.");
      setIsFetchingCurrentLocation(false);
      return;
    }

    if (!isLoaded) {
        setError("L'API Google Maps n'est pas encore chargée. Veuillez patienter.");
        setIsFetchingCurrentLocation(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDeliveryLatitude(latitude);
        setDeliveryLongitude(longitude);

        if (window.google && window.google.maps && window.google.maps.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === 'OK') {
              if (results[0]) {
                setDeliveryAddress(results[0].formatted_address);
              } else {
                setError("Aucune adresse trouvée pour votre position actuelle.");
                setDeliveryAddress(""); // Clear address if not found
              }
            } else {
              setError(`Erreur du géocodeur: ${status}. Essayez de rechercher l'adresse manuellement.`);
              setDeliveryAddress(""); // Clear address on geocoding error
            }
            setIsFetchingCurrentLocation(false);
          });
        } else {
          setError("Service de géocodage non disponible. Les coordonnées ont été définies, veuillez entrer l'adresse manuellement.");
          // Keep lat/lng, user can manually fill address
          setIsFetchingCurrentLocation(false);
        }
      },
      (geoError) => {
        let errorMessage = "Erreur lors de la récupération de la position.";
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            errorMessage = "Permission de géolocalisation refusée. Veuillez l'activer dans les paramètres de votre navigateur.";
            break;
          case geoError.POSITION_UNAVAILABLE:
            errorMessage = "Position actuelle non disponible.";
            break;
          case geoError.TIMEOUT:
            errorMessage = "Timeout lors de la récupération de la position.";
            break;
        }
        setError(errorMessage);
        setIsFetchingCurrentLocation(false);
      }
    );
  };

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

    let dynamicDeliveryFee = selectedVendor?.baseFee || 0;
    if (selectedVendor && selectedVendor.address && selectedVendor.address.lat != null && selectedVendor.address.lng != null &&
        deliveryLatitude != null && deliveryLongitude != null) {
      const distanceInKm = calculateDistance(deliveryLatitude, deliveryLongitude, selectedVendor.address.lat, selectedVendor.address.lng);
      if (distanceInKm !== null) {
        dynamicDeliveryFee += distanceInKm * RATE_PER_KM;
      }
    }

    dynamicDeliveryFee = Math.round(dynamicDeliveryFee); // Round to nearest integer
    setCurrentDeliveryFee(dynamicDeliveryFee);

    // Ensure this uses the potentially updated calculatedInitialItemTotalCost and dynamicDeliveryFee
    setCurrentInitialTotalEstimatedCost(calculatedInitialItemTotalCost + dynamicDeliveryFee);
  }, [shoppingList, selectedVendor, deliveryLatitude, deliveryLongitude]);


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
        deliveryLocation: { // NEW STRUCTURE
          address: deliveryAddress, // The string address
          latitude: deliveryLatitude,
          longitude: deliveryLongitude,
        },
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

      // Send success notification to current user
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Demande de Livraison Soumise",
          `Votre demande de livraison #${newDeliveryId.substring(0, 8)} a été soumise avec succès.`
        );
      }

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
      // Send failure notification to current user
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Échec de la Soumission",
          `Erreur lors de la soumission de votre demande: ${userErrorMessage}` // Use the user-friendly error
        );
      }
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
                {isLoadingSavedAddresses ? (
                  <CircularProgress size={24} sx={{mr:1}} />
                ) : savedAddresses.length > 0 && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="saved-address-select-label">Choisir une adresse enregistrée</InputLabel>
                    <Select
                      labelId="saved-address-select-label"
                      id="saved-address-select"
                      value={selectedSavedAddressId}
                      label="Choisir une adresse enregistrée"
                      onChange={(e) => {
                        const addressId = e.target.value;
                        setSelectedSavedAddressId(addressId);
                        if (addressId) {
                          const selectedAddr = savedAddresses.find(addr => addr.id === addressId);
                          if (selectedAddr) {
                            setDeliveryAddress(selectedAddr.formattedAddress);
                            setDeliveryLatitude(selectedAddr.latitude);
                            setDeliveryLongitude(selectedAddr.longitude);
                            setError(null); // Clear errors
                          }
                        } else { // "Autre" or "Entrer une nouvelle adresse" selected
                          setDeliveryAddress('');
                          setDeliveryLatitude(null);
                          setDeliveryLongitude(null);
                          // Optionally focus the Autocomplete input
                          // document.getElementById('autocomplete-delivery-address')?.focus();
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>--- Entrer une nouvelle adresse ---</em>
                      </MenuItem>
                      {savedAddresses.map((addr) => (
                        <MenuItem key={addr.id} value={addr.id}>
                          {addr.name} - {addr.formattedAddress.substring(0,30)}...
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Grid>

              <Grid item xs={12}>
                {loadError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Erreur de chargement Google Maps: {loadError.message}. Veuillez vérifier votre clé API ou réessayer plus tard.
                  </Alert>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isLoaded && !loadError ? (
                    <Autocomplete
                      id="autocomplete-delivery-address" // Added ID for potential focus
                      onLoad={onAutocompleteLoad}
                      onPlaceChanged={onPlaceChanged}
                      options={{
                        types: ['address'],
                        // Optional: componentRestrictions: { country: 'CI' } // Example for Côte d'Ivoire
                      }}
                      sx={{flexGrow:1}}
                    >
                      <TextField
                        fullWidth
                        label="Adresse de livraison"
                        value={deliveryAddress}
                        onChange={(e) => {
                          setDeliveryAddress(e.target.value);
                          // If user types manually after a selection, clear coordinates
                          if (deliveryLatitude || deliveryLongitude) {
                            setDeliveryLatitude(null);
                            setDeliveryLongitude(null);
                            setSelectedSavedAddressId(''); // Clear saved address selection
                            setError("Veuillez sélectionner une adresse depuis la liste pour une localisation précise ou utiliser le bouton 'Ma Position'.");
                          } else {
                             setError(null); // Clear error if they are just typing
                          }
                        }}
                        required
                        variant="outlined"
                        placeholder="Recherchez et sélectionnez votre adresse..."
                        InputProps={{
                          startAdornment: <LocationOn sx={{ mr: 1, color: "text.secondary" }} />,
                        }}
                      />
                    </Autocomplete>
                  ) : !loadError && (
                    <Box sx={{display:'flex', alignItems:'center', gap:2, flexGrow:1}}>
                       <CircularProgress size={24}/>
                       <Typography>Chargement de la recherche d'adresse...</Typography>
                    </Box>
                  )}
                   {/* Fallback if not loaded and no error yet, or if error prevents Autocomplete */}
                  {!isLoaded && !loadError && (
                      <TextField
                          fullWidth
                          label="Adresse de livraison (Chargement...)"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          required
                          variant="outlined"
                          disabled
                          InputProps={{
                              startAdornment: <LocationOn sx={{ mr: 1, color: "text.secondary" }} />,
                          }}
                          sx={{flexGrow:1}}
                      />
                  )}
                  <Tooltip title="Utiliser ma position actuelle">
                    <span> {/* Span needed for tooltip on disabled button */}
                    <IconButton
                      onClick={handleUseMyLocation}
                      disabled={!isLoaded || isFetchingCurrentLocation}
                      color="primary"
                      aria-label="utiliser ma position actuelle"
                    >
                      {isFetchingCurrentLocation ? <CircularProgress size={24} /> : <MyLocationIcon />}
                    </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                      value={deliveryAddress}
                      onChange={(e) => {
                        setDeliveryAddress(e.target.value);
                        // If user types manually after a selection, clear coordinates
              {/* The rest of the Grid items for date, time, instructions remain unchanged here */}
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
                disabled={!deliveryAddress || !deliveryDate || !deliveryTime || !deliveryLatitude || !deliveryLongitude || !isLoaded}
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
              <VendorSelection
                vendors={availableVendors}
                onSelect={handleVendorSelect}
                selected={selectedVendor}
                userLatitude={deliveryLatitude}
                userLongitude={deliveryLongitude}
              />
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
                  {deliveryLatitude && deliveryLongitude && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      (Lat: {deliveryLatitude.toFixed(5)}, Lng: {deliveryLongitude.toFixed(5)})
                    </Typography>
                  )}
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
