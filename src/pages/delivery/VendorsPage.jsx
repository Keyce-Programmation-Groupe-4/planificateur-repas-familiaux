"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider as MuiDivider, // Renaming to avoid conflict if another Divider is used
} from "@mui/material"
import LocationOnIcon from "@mui/icons-material/LocationOn"
import { Search, Person, Refresh, MyLocation as MyLocationIcon, EditLocation as EditLocationIcon, GpsFixed, Replay as ReplayIcon, Close as CloseIcon, LocationOff } from "@mui/icons-material" // Added more icons
import { useAuth } from "../../contexts/AuthContext"
import { db } from "../../firebaseConfig"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import VendorCard from "../../components/delivery/VendorCard"
import { calculateDistance } from "../../utils/geolocationUtils" // Import the utility

function VendorsPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { currentUser, userData } = useAuth()

  const [vendors, setVendors] = useState([])
  const [filteredVendors, setFilteredVendors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState("")
  const [selectedZone, setSelectedZone] = useState("")
  const [sortBy, setSortBy] = useState("rating") // Default sort
  const [currentUserLocationInfo, setCurrentUserLocationInfo] = useState({
    address: null, // This will store the default address specifically
    error: null,
    loading: true,
  });
  const [userAddresses, setUserAddresses] = useState([]); // To store all saved addresses
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [activeSearchLocation, setActiveSearchLocation] = useState({ // Actual location used for search
    type: 'default', // 'default', 'saved', 'gps', 'none'
    data: null, // address object or { latitude, longitude, name, formattedAddress } for GPS
    loading: true, // separate loading for active search location, especially for GPS
  });

  // Listes pour les filtres
  const [specialties, setSpecialties] = useState([])
  const [deliveryZones, setDeliveryZones] = useState([])

  useEffect(() => {
    fetchVendors()
  }, [])

  // Effect to fetch user's addresses (default and all saved)
  useEffect(() => {
    const fetchUserAddresses = async () => {
      if (currentUser?.uid && userData) {
        setCurrentUserLocationInfo(prev => ({ ...prev, loading: true }));
        setActiveSearchLocation(prev => ({ ...prev, loading: true }));
        setUserAddresses([]);
        try {
          const addressesRef = collection(db, 'users', currentUser.uid, 'savedAddresses');
          const qAll = query(addressesRef, orderBy('createdAt', 'desc')); // Fetch all, ordered by creation
          const allAddressesSnapshot = await getDocs(qAll);

          const fetchedAddresses = allAddressesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUserAddresses(fetchedAddresses);

          const defaultAddress = fetchedAddresses.find(addr => addr.isDefault === true);

          if (defaultAddress) {
            setCurrentUserLocationInfo({ address: defaultAddress, error: null, loading: false });
            setActiveSearchLocation({ type: 'default', data: defaultAddress, loading: false });
          } else {
            // No default address found
            setCurrentUserLocationInfo({ address: null, error: null, loading: false });
            setActiveSearchLocation({ type: 'none', data: null, loading: false });
          }
        } catch (err) {
          console.error("Error fetching user addresses:", err);
          const errorMsg = "Impossible de récupérer les adresses.";
          setCurrentUserLocationInfo({ address: null, error: errorMsg, loading: false });
          setActiveSearchLocation({ type: 'none', data: null, error: errorMsg, loading: false });
        }
      } else if (!currentUser) {
        setCurrentUserLocationInfo({ address: null, error: null, loading: false });
        setActiveSearchLocation({ type: 'none', data: null, loading: false });
        setUserAddresses([]);
      }
    };

    fetchUserAddresses();
  }, [currentUser, userData]);

  useEffect(() => {
    filterAndSortVendors()
  }, [vendors, searchTerm, selectedSpecialty, selectedZone, sortBy, activeSearchLocation]) // Changed dependency to activeSearchLocation

  const fetchVendors = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const vendorsRef = collection(db, "vendors")
      const q = query(vendorsRef, where("isActive", "==", true), orderBy("rating", "desc"))
      const querySnapshot = await getDocs(q)

      const vendorsData = []
      const allSpecialties = new Set()
      const allZones = new Set()

      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() }
        vendorsData.push(data)

        // Collecter les spécialités et zones pour les filtres
        if (data.specialties) {
          data.specialties.forEach((specialty) => allSpecialties.add(specialty))
        }
        if (data.deliveryZones) {
          data.deliveryZones.forEach((zone) => allZones.add(zone))
        }
      })

      setVendors(vendorsData)
      setSpecialties(Array.from(allSpecialties).sort())
      setDeliveryZones(Array.from(allZones).sort())
    } catch (err) {
      console.error("Erreur lors du chargement des vendeurs:", err)
      setError("Erreur lors du chargement des vendeurs. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortVendors = () => {
    let processedVendors = [...vendors].map(v => ({ ...v, distanceToUser: null }));

    // Calculate distance if an active search location with coordinates is set
    if (activeSearchLocation.data && activeSearchLocation.data.latitude && activeSearchLocation.data.longitude && activeSearchLocation.type !== 'none') {
      const userLat = activeSearchLocation.data.latitude;
      const userLng = activeSearchLocation.data.longitude;

      processedVendors.forEach(vendor => {
        if (vendor.address && vendor.address.lat && vendor.address.lng) {
          vendor.distanceToUser = calculateDistance(userLat, userLng, vendor.address.lat, vendor.address.lng);
        }
      });

      // Proximity Filter: Only filter if a location is actively being used for search
      // Vendors without complete address or service radius are not filtered out by proximity.
      processedVendors = processedVendors.filter(vendor => {
        // If distance is calculated and vendor has a service radius, apply the filter
        if (vendor.distanceToUser !== null && vendor.serviceRadius !== null && vendor.serviceRadius > 0) {
          return vendor.distanceToUser <= vendor.serviceRadius;
        }
        // If distance cannot be calculated for this vendor (e.g. vendor missing lat/lng),
        // or service radius is not set, include the vendor. They won't be sorted effectively by distance if it's null.
        return true;
      });
    }
    // If activeSearchLocation.type === 'none' or data is null, all vendors pass through this stage
    // without distance calculation or proximity filtering.

    // Filter by search term
    if (searchTerm) {
      processedVendors = processedVendors.filter(
        (vendor) =>
          vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (vendor.specialties && vendor.specialties.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))),
      );
    }

    // Filter by specialty
    if (selectedSpecialty) {
      processedVendors = processedVendors.filter((vendor) => vendor.specialties && vendor.specialties.includes(selectedSpecialty));
    }

    // Filter by delivery zone
    if (selectedZone) {
      processedVendors = processedVendors.filter((vendor) => vendor.deliveryZones && vendor.deliveryZones.includes(selectedZone));
    }

    // Sort
    processedVendors.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "name":
          return a.name.localeCompare(b.name);
        case "price":
          return (a.baseFee || Infinity) - (b.baseFee || Infinity); // Handle null/undefined baseFee
        case "distance":
          // Vendors without distance or if user location is not set should go to the end
          const distA = a.distanceToUser !== null ? a.distanceToUser : Infinity;
          const distB = b.distanceToUser !== null ? b.distanceToUser : Infinity;
          return distA - distB;
        default:
          return 0;
      }
    });

    setFilteredVendors(processedVendors);
  };

  const handleVendorSelect = (vendor) => {
    navigate(`/vendors/${vendor.id}`)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedSpecialty("")
    setSelectedZone("")
    setSortBy("rating")
    // Do not reset activeSearchLocation here, user might want to keep it
  }

  const handleSetGpsLocation = () => {
    setIsAddressModalOpen(false);
    if (!navigator.geolocation) {
      setActiveSearchLocation({ type: 'none', data: null, error: "La géolocalisation n'est pas supportée par ce navigateur.", loading: false });
      return;
    }
    setActiveSearchLocation(prev => ({ ...prev, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setActiveSearchLocation({
          type: 'gps',
          data: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            name: 'Position GPS actuelle',
            formattedAddress: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`
          },
          loading: false,
        });
      },
      (error) => {
        let errorMsg = "Impossible d'obtenir la position GPS.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Permission de géolocalisation refusée.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Position GPS non disponible.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Timeout lors de la récupération de la position GPS.";
        }
        setActiveSearchLocation({ type: 'none', data: null, error: errorMsg, loading: false });
      }
    );
  };

  const handleSetSavedAddressLocation = (address) => {
    setActiveSearchLocation({ type: 'saved', data: address, loading: false });
    setIsAddressModalOpen(false);
  };

  const handleSetDefaultAddressLocation = () => {
    if (currentUserLocationInfo.address) {
      setActiveSearchLocation({ type: 'default', data: currentUserLocationInfo.address, loading: false });
    } else {
      // This case should ideally not happen if button is disabled when no default address
      setActiveSearchLocation({ type: 'none', data: null, error: "Aucune adresse par défaut n'est définie.", loading: false });
    }
    setIsAddressModalOpen(false);
  };

  const handleClearLocation = () => {
    setActiveSearchLocation({ type: 'none', data: null, loading: false, error: null });
    setIsAddressModalOpen(false);
  };


  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement des vendeurs...</Typography>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button startIcon={<Refresh />} onClick={fetchVendors}>
          Réessayer
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: "bold", display: "flex", alignItems: "center" }}
        >
          <Person sx={{ mr: 1 }} />
          Nos Bayam Selam
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Découvrez nos vendeurs partenaires et choisissez celui qui vous convient le mieux.
        </Typography>
      </Box>

      {/* Location Information Section */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, display: 'flex', alignItems: 'center', gap: 2 }}>
        <MyLocationIcon color="primary" sx={{ fontSize: '2rem' }} />
        <Box sx={{ flexGrow: 1 }}>
          {activeSearchLocation.loading && <CircularProgress size={20} />}
          {!activeSearchLocation.loading && activeSearchLocation.type === 'none' && (
            <Typography variant="body2" color="text.secondary">
              Recherche à proximité désactivée.
              {currentUser && userAddresses.length === 0 && " Vous n'avez pas d'adresses enregistrées."}
            </Typography>
          )}
          {!activeSearchLocation.loading && activeSearchLocation.data && activeSearchLocation.type !== 'none' && (
            <Typography variant="body2" color="text.secondary">
              Vendeurs proches de : <Typography component="span" sx={{ fontWeight: 'bold' }}>{activeSearchLocation.data.name || "Lieu sélectionné"}</Typography>
              {activeSearchLocation.data.formattedAddress && ` (${activeSearchLocation.data.formattedAddress})`}
            </Typography>
          )}
           {!activeSearchLocation.loading && activeSearchLocation.error && ( // Display error for activeSearchLocation if any (e.g. GPS error)
            <Typography variant="body2" color="error">
              {activeSearchLocation.error}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EditLocationIcon />}
          onClick={() => setIsAddressModalOpen(true)}
          disabled={activeSearchLocation.loading || (!currentUser && userAddresses.length === 0) } // Disable if not logged in and no addresses, or while loading
        >
          Changer de lieu
        </Button>
      </Paper>

      {/* Modal for Changing Location */}
      <Dialog open={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <MyLocationIcon sx={{ mr: 1 }} /> Choisir un lieu pour la recherche
        </DialogTitle>
        <DialogContent dividers>
          <List component="nav" dense>
            {/* Option 1: GPS Location */}
            <ListItemButton onClick={handleSetGpsLocation}>
              <ListItemIcon><GpsFixed /></ListItemIcon>
              <ListItemText primary="Utiliser ma position GPS actuelle" />
            </ListItemButton>
            <MuiDivider sx={{ my: 1 }} />

            {/* Option 2: Default Address */}
            {currentUserLocationInfo.address && (
              <ListItemButton onClick={handleSetDefaultAddressLocation} disabled={!currentUserLocationInfo.address}>
                <ListItemIcon><ReplayIcon /></ListItemIcon>
                <ListItemText primary="Utiliser l'adresse par défaut" secondary={`${currentUserLocationInfo.address.name} - ${currentUserLocationInfo.address.formattedAddress}`} />
              </ListItemButton>
            )}

            {/* Option 3: Saved Addresses */}
            {userAddresses.map((addr) => (
              <ListItemButton key={addr.id} onClick={() => handleSetSavedAddressLocation(addr)}>
                <ListItemIcon><LocationOnIcon /></ListItemIcon>
                <ListItemText primary={addr.name} secondary={addr.formattedAddress} />
              </ListItemButton>
            ))}
            {(userAddresses.length > 0 || currentUserLocationInfo.address) && <MuiDivider sx={{ my: 1 }} />}


            {/* Option 4: Disable Proximity */}
            <ListItemButton onClick={handleClearLocation}>
              <ListItemIcon><LocationOff /></ListItemIcon>
              <ListItemText primary="Ne pas utiliser de lieu spécifique" secondary="Afficher tous les vendeurs" />
            </ListItemButton>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddressModalOpen(false)} startIcon={<CloseIcon />}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Filtres et recherche */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Rechercher un vendeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Spécialité</InputLabel>
              <Select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                label="Spécialité"
              >
                <MenuItem value="">Toutes</MenuItem>
                {specialties.map((specialty) => (
                  <MenuItem key={specialty} value={specialty}>
                    {specialty}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Zone</InputLabel>
              <Select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} label="Zone">
                <MenuItem value="">Toutes</MenuItem>
                {deliveryZones.map((zone) => (
                  <MenuItem key={zone} value={zone}>
                    {zone}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Trier par</InputLabel>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Trier par">
                <MenuItem value="rating">Note</MenuItem>
                <MenuItem value="name">Nom</MenuItem>
                <MenuItem value="price">Prix</MenuItem>
                <MenuItem value="distance" disabled={activeSearchLocation.type === 'none' || !activeSearchLocation.data}>Distance</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" onClick={clearFilters} sx={{ height: 56 }} startIcon={<Refresh />}>
              Effacer
            </Button>
          </Grid>
        </Grid>

        {/* Filtres actifs */}
        {(searchTerm || selectedSpecialty || selectedZone) && (
          <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {searchTerm && <Chip label={`Recherche: ${searchTerm}`} onDelete={() => setSearchTerm("")} size="small" />}
            {selectedSpecialty && (
              <Chip label={`Spécialité: ${selectedSpecialty}`} onDelete={() => setSelectedSpecialty("")} size="small" />
            )}
            {selectedZone && <Chip label={`Zone: ${selectedZone}`} onDelete={() => setSelectedZone("")} size="small" />}
          </Box>
        )}
      </Paper>

      {/* Résultats */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {filteredVendors.length} vendeur{filteredVendors.length > 1 ? "s" : ""} trouvé
          {filteredVendors.length > 1 ? "s" : ""}
        </Typography>
      </Box>

      {filteredVendors.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Person sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} /> {/* Consider changing icon if location is set but no vendors match */}
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucun vendeur trouvé
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {(activeSearchLocation.type !== 'none' && activeSearchLocation.data) && sortBy === 'distance'
              ? "Aucun vendeur ne livre au lieu spécifié ou ne correspond aux autres filtres."
              : "Essayez de modifier vos critères de recherche ou de changer de lieu."}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredVendors.map((vendor) => (
            <Grid item xs={12} sm={6} md={4} key={vendor.id}>
              <VendorCard vendor={vendor} distanceToUser={vendor.distanceToUser} onClick={() => handleVendorSelect(vendor)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  )
}

export default VendorsPage
