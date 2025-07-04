"use client"

import { useState, useEffect, useCallback } from "react" // Added useEffect, useCallback
import { useNavigate } from "react-router-dom"
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  Autocomplete,
} from "@react-google-maps/api" // Added Google Maps imports
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Stack,
  Divider,
  Avatar,
} from "@mui/material"
import {
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Store as StoreIcon,
  CheckCircle as CheckCircleIcon,
  LockOutlined as LockIcon, // For password fields
  EmailOutlined as EmailIcon, // For email field
  LocationOn as LocationOnIcon, // For map/address section
} from "@mui/icons-material"
import { db, app } from "../../firebaseConfig" // Assuming 'app' is exported for getAuth
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore" // Keep addDoc for now, but setDoc is preferred with UID

const SPECIALTIES = [
  "Légumes",
  "Fruits",
  "Viandes",
  "Poissons",
  "Épices",
  "Céréales",
  "Légumineuses",
  "Produits laitiers",
  "Boulangerie",
  "Autre",
]

const DELIVERY_ZONES = [
  "Akwa",
  "Bonamoussadi",
  "Bonapriso",
  "Deido",
  "Makepe",
  "New Bell",
  "Bali",
  "Logpom",
  "Kotto",
  "Autre",
]

function VendorSignupPage() {
  const theme = useTheme()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    description: "",
    specialties: [],
    deliveryZones: [],
    baseFee: "",
    availability: "",
    vendorType: "",
    password: "", // Added password
    confirmPassword: "", // Added confirmPassword
    formattedAddress: "",
    latitude: "", // Keep as string for input, parse on submit
    longitude: "", // Keep as string for input, parse on submit
    serviceRadius: "", // Keep as string for input, parse on submit
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Google Maps States
  const [mapLibraries] = useState(["places"])
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: mapLibraries,
  })
  const [mapCenter, setMapCenter] = useState({ lat: 5.3454, lng: -4.0242 }) // Default to Abidjan
  const [markerPosition, setMarkerPosition] = useState(null)
  const [autocompleteInstance, setAutocompleteInstance] = useState(null)
  const [mapRef, setMapRef] = useState(null)

  const handleInputChange = (field) => (event) => {
    const { value } = event.target;
    setFormData((prev) => {
      const newState = { ...prev, [field]: value };
      // If user types in formattedAddress manually, clear coordinates
      if (field === "formattedAddress" && (prev.latitude || prev.longitude)) {
        newState.latitude = "";
        newState.longitude = "";
        setMarkerPosition(null);
        // Optionally, provide feedback that map pin needs re-verification
        setError("L'adresse manuelle a désynchronisé le marqueur. Veuillez rechercher à nouveau ou cliquer sur la carte.");
      } else if (field !== "formattedAddress") {
        setError(""); // Clear error if changing other fields
      }
      return newState;
    });
  };


  const handleMultiSelectChange = (field) => (event) => {
    const value = typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("") // Clear previous errors at the start of submission
    setIsSubmitting(true)

    // Validation
    const { name, phone, email, password, confirmPassword, specialties, deliveryZones, vendorType, baseFee: baseFeeStr, formattedAddress, latitude, longitude, serviceRadius: serviceRadiusStr } = formData;

    if (!name.trim() || !phone.trim() || !email.trim() || !password || !confirmPassword || !vendorType) {
      setError("Veuillez remplir tous les champs obligatoires (*) y compris email et mot de passe.");
      setIsSubmitting(false);
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Veuillez entrer une adresse e-mail valide.");
        setIsSubmitting(false);
        return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit comporter au moins 6 caractères.");
      setIsSubmitting(false);
      return;
    }
    if (specialties.length === 0) {
      setError("Veuillez sélectionner au moins une spécialité.");
      setIsSubmitting(false);
      return;
    }
    if (deliveryZones.length === 0) {
      setError("Veuillez sélectionner au moins une zone de livraison.");
      setIsSubmitting(false);
      return;
    }
    const baseFee = Number.parseFloat(baseFeeStr);
    if (isNaN(baseFee) || baseFee < 0) {
      setError("Veuillez entrer des frais de livraison valides.");
      setIsSubmitting(false);
      return;
    }

    let serviceRadiusNum = null;
    if (serviceRadiusStr.trim() !== "") {
      serviceRadiusNum = parseFloat(serviceRadiusStr);
      if (isNaN(serviceRadiusNum) || serviceRadiusNum < 0) {
        setError("Le rayon de service doit être un nombre positif.");
        setIsSubmitting(false);
        return;
      }
    }

    const auth = getAuth(app);

    try {
      // Step 1: Create Firebase Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Step 2: Create Firestore Vendor Document
      const vendorData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(), // Store email for reference
        // uid: userId, // Not strictly necessary in the document body if ID is UID
        description: formData.description.trim() || null,
        specialties: specialties,
        deliveryZones: deliveryZones,
        baseFee: baseFee,
        availability: formData.availability.trim() || "Non spécifiée",
        vendorType: vendorType,
        address: {
          formattedAddress: formattedAddress.trim() || '',
          lat: latitude ? parseFloat(latitude) : null, // Directly use, as it's now number or empty string
          lng: longitude ? parseFloat(longitude) : null,
        },
        serviceRadius: serviceRadiusNum, // Already parsed or null
        isActive: false,
        isApproved: false,
        rating: 0,
        totalRatings: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "vendors", userId), vendorData);

      setSuccess(true);
      // No automatic redirect, user should see success message and wait for approval.
      // setTimeout(() => {
      //   navigate("/login"); // Or some other appropriate page
      // }, 3000);

    } catch (err) {
      console.error("Erreur lors de l'inscription du vendeur:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Cette adresse e-mail est déjà utilisée. Veuillez utiliser une autre adresse ou vous connecter.");
      } else if (err.code === 'auth/weak-password') {
        setError("Le mot de passe est trop faible. Il doit comporter au moins 6 caractères.");
      } else {
        setError("Erreur lors de l'inscription. Veuillez réessayer. Détail: " + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: "center" }}>
        <Paper
          elevation={3} // Changed elevation for consistency
          sx={{
            p: {xs:3, sm:6}, // Responsive padding
            borderRadius: 3, // Match main form's borderRadius
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
          }}
        >
          <Avatar
            sx={{
              width: 80,
              height: 80,
              mx: "auto",
              mb: 3,
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: theme.palette.success.dark }}>
            Inscription Réussie !
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Votre profil de vendeur a été créé avec succès. Votre compte est maintenant en attente d'approbation par un administrateur. Vous serez notifié une fois approuvé.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/login")} sx={{mt:2}}>
            Aller à la page de connexion
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm" sx={{ py: { xs: 3, md: 6 } }}> {/* Changed maxWidth to sm for typical auth form width */}
      <Paper
        elevation={6} // Increased elevation for a more distinct card look
        sx={{
          p: { xs: 2, sm: 3, md: 4 }, // Responsive padding
          borderRadius: 3, // Slightly more rounded corners
          mt: 3,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{
              width: 72, // Slightly adjusted size
              height: 72,
              mb: 2, // Margin bottom for spacing
              bgcolor: 'secondary.main', // Use theme color
              // background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            }}
          >
            <StoreIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 700, textAlign: 'center' }}> {/* Changed to h1 for semantic main title */}
            Devenir Partenaire
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
            Rejoignez notre réseau de vendeurs et servez votre communauté.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}> {/* Standardized border radius */}
            {error}
          </Alert>
        )}
        {loadError && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            La carte Google Maps n'a pas pu se charger. La sélection d'adresse pourrait être limitée.
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}> {/* Added noValidate for HTML5 validation disable */}
          <Grid container spacing={2}> {/* Reduced default spacing slightly */}

            {/* Section: Informations Personnelles et Compte */}
            <Grid item xs={12}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', mt:1 }}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                Informations Personnelles et Compte
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                variant="outlined" // Ensure outlined
                fullWidth
                required
                label="Nom complet"
                value={formData.name}
                onChange={handleInputChange("name")}
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: <PersonIcon sx={{ mr: 0.5, fontSize:'1.2rem', color: "text.secondary" }} />,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                variant="outlined"
                fullWidth
                required
                label="Numéro de téléphone"
                value={formData.phone}
                onChange={handleInputChange("phone")}
                placeholder="+237 6XX XXX XXX"
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                variant="outlined"
                fullWidth
                required
                label="Email de connexion"
                type="email"
                value={formData.email}
                onChange={handleInputChange("email")}
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: <EmailIcon sx={{ mr: 0.5, fontSize:'1.2rem', color: "text.secondary" }} />,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl variant="outlined" fullWidth required> {/* Ensure outlined */}
                <InputLabel id="vendor-type-label">Type de vendeur</InputLabel>
                <Select
                  labelId="vendor-type-label"
                  value={formData.vendorType}
                  onChange={handleInputChange("vendorType")}
                  label="Type de vendeur"
                  disabled={isSubmitting}
                >
                  <MenuItem value="individual_shopper">Vendeur individuel / Shopper personnel</MenuItem>
                  <MenuItem value="storefront">Magasin / Boutique établie</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                variant="outlined"
                fullWidth
                required
                label="Mot de passe"
                type="password"
                value={formData.password}
                onChange={handleInputChange("password")}
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: <LockIcon sx={{ mr: 0.5, fontSize:'1.2rem', color: "text.secondary" }} />,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                variant="outlined"
                fullWidth
                required
                label="Confirmer le mot de passe"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange("confirmPassword")}
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: <LockIcon sx={{ mr: 0.5, fontSize:'1.2rem', color: "text.secondary" }} />,
                }}
              />
            </Grid>

            {/* Section: Détails de l'Activité */}
            <Grid item xs={12} sx={{mt:2}}> {/* Add margin top for section spacing */}
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                <StoreIcon sx={{ mr: 1, color: 'primary.main' }} />
                Détails de l'Activité
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                label="Description de votre activité (optionnel)"
                multiline
                rows={3}
                value={formData.description}
                onChange={handleInputChange("description")}
                placeholder="Décrivez brièvement votre activité, vos produits, votre expérience..."
                disabled={isSubmitting}
              />
            </Grid>

            {/* Map and Address Section */}
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                <LocationOnIcon sx={{ mr: 0.5, fontSize: '1.1rem' }} />
                Adresse de l'Entreprise
              </Typography>
              {!isLoaded && !loadError && <CircularProgress size={24} />}
              {isLoaded && (
                <Autocomplete
                  onLoad={(ac) => setAutocompleteInstance(ac)}
                  onPlaceChanged={() => {
                    if (autocompleteInstance) {
                      const place = autocompleteInstance.getPlace();
                      if (place && place.geometry && place.geometry.location) {
                        setFormData(prev => ({
                          ...prev,
                          formattedAddress: place.formatted_address || prev.formattedAddress,
                          latitude: place.geometry.location.lat(),
                          longitude: place.geometry.location.lng(),
                        }));
                        setMapCenter(place.geometry.location.toJSON());
                        setMarkerPosition(place.geometry.location.toJSON());
                        setError(""); // Clear address error
                      } else {
                        // If place is not valid, but user selected something, maybe clear lat/lng
                        setFormData(prev => ({ ...prev, latitude: "", longitude: ""}));
                        setMarkerPosition(null);
                         setError("Adresse non reconnue par Google Maps. Veuillez réessayer ou placer le marqueur manuellement.");
                      }
                    }
                  }}
                  options={{ types: ["address"] /*, componentRestrictions: { country: "CI" } */ }}
                >
                  <TextField
                    variant="outlined"
                    fullWidth
                    label="Rechercher votre adresse..."
                    value={formData.formattedAddress}
                    onChange={handleInputChange("formattedAddress")}
                    disabled={isSubmitting || !isLoaded}
                    placeholder="Commencez à taper votre adresse..."
                    sx={{ mb: 1.5 }}
                  />
                </Autocomplete>
              )}
            </Grid>

            {isLoaded && (
              <Grid item xs={12}>
                <Box sx={{ height: "300px", width: "100%", mb: 1.5, borderRadius: 1, overflow:'hidden', border: `1px solid ${theme.palette.divider}` }}>
                  <GoogleMap
                    mapContainerStyle={{ height: "100%", width: "100%" }}
                    center={mapCenter}
                    zoom={markerPosition ? 15 : 10}
                    onLoad={(map) => setMapRef(map)}
                    onClick={(e) => {
                      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                      setMarkerPosition(newPos);
                      setFormData(prev => ({ ...prev, latitude: newPos.lat, longitude: newPos.lng }));
                      // Note: formattedAddress does not update on map click
                      setError("L'adresse textuelle ne se met pas à jour par clic sur la carte. Utilisez la recherche pour cela.");
                    }}
                  >
                    {markerPosition && (
                      <Marker
                        position={markerPosition}
                        draggable={true}
                        onDragEnd={(e) => {
                          const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                          setMarkerPosition(newPos);
                          setFormData(prev => ({ ...prev, latitude: newPos.lat, longitude: newPos.lng }));
                           setError("L'adresse textuelle ne se met pas à jour en déplaçant le marqueur. Utilisez la recherche pour cela.");
                        }}
                      />
                    )}
                  </GoogleMap>
                </Box>
                 <Typography variant="caption" color="text.secondary">
                    Si l'adresse recherchée n'est pas exacte, cliquez sur la carte ou déplacez le marqueur pour ajuster la position.
                </Typography>
              </Grid>
            )}
            {/* End Map and Address Section */}

            <Grid item xs={12} sm={6}> {/* Service Radius moved to its own line for clarity if map takes full width */}
              <TextField
                variant="outlined"
                fullWidth
                label="Rayon de Service (km)"
                type="number" // Allows numeric keyboard on mobile, but validation handles non-numeric
                value={formData.serviceRadius}
                onChange={handleInputChange("serviceRadius")}
                placeholder="Ex: 5"
                InputProps={{ inputProps: { min: 0 } }}
                disabled={isSubmitting}
              />
            </Grid>


            <Grid item xs={12} sm={6}>
              <FormControl variant="outlined" fullWidth required>
                <InputLabel id="specialties-label">Spécialités *</InputLabel>
                <Select
                  labelId="specialties-label"
                  multiple
                  value={formData.specialties}
                  onChange={handleMultiSelectChange("specialties")}
                  input={<OutlinedInput label="Spécialités *" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" sx={{borderRadius: '8px'}}/>
                      ))}
                    </Box>
                  )}
                  disabled={isSubmitting}
                >
                  {SPECIALTIES.map((specialty) => (
                    <MenuItem key={specialty} value={specialty}>
                      {specialty}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl variant="outlined" fullWidth required>
                <InputLabel id="delivery-zones-label">Zones de livraison *</InputLabel>
                <Select
                  labelId="delivery-zones-label"
                  multiple
                  value={formData.deliveryZones}
                  onChange={handleMultiSelectChange("deliveryZones")}
                  input={<OutlinedInput label="Zones de livraison *" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" color="secondary" sx={{borderRadius: '8px'}} />
                      ))}
                    </Box>
                  )}
                  disabled={isSubmitting}
                >
                  {DELIVERY_ZONES.map((zone) => (
                    <MenuItem key={zone} value={zone}>
                      {zone}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                variant="outlined"
                fullWidth
                required
                label="Frais de livraison (FCFA)"
                type="number"
                value={formData.baseFee}
                onChange={handleInputChange("baseFee")}
                InputProps={{
                  startAdornment: <MoneyIcon sx={{ mr: 0.5, fontSize:'1.2rem', color: "text.secondary" }} />,
                }}
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                variant="outlined"
                fullWidth
                label="Disponibilité (Ex: Lu-Sa, 8h-18h)"
                value={formData.availability}
                onChange={handleInputChange("availability")}
                placeholder="Ex: Lundi - Samedi, 8h - 18h"
                disabled={isSubmitting}
              />
            </Grid>

            {/* Boutons d'action */}
            <Grid item xs={12} sx={{ mt: 2 }}> {/* Add margin top for button spacing */}
              <Stack direction={{xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end"> {/* Align buttons to the right */}
                <Button
                  variant="outlined"
                  color="secondary" // Use theme color
                  onClick={() => navigate("/")} // Navigate to home or a relevant public page
                  disabled={isSubmitting}
                  sx={{ minWidth: {xs: '100%', sm: 120} }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary" // Use theme color
                  disabled={isSubmitting}
                  sx={{
                    minWidth: {xs: '100%', sm: 180}, // Make submit button wider
                    // background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    // "&:hover": {
                    //   transform: "translateY(-2px)",
                    //   boxShadow: theme.shadows[4], // Use theme shadows
                    // },
                    // transition: "all 0.2s ease-in-out",
                  }}
                >
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Créer mon compte vendeur"}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  )
}

export default VendorSignupPage
