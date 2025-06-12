"use client"

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, storage } from "../../firebaseConfig"; // Ensure storage is imported
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Storage methods
import {
  Container, Paper, Typography, Box, CircularProgress, Grid, Chip,
  List, ListItem, ListItemIcon, ListItemText, Divider, Avatar, Alert,
  Button, TextField, Select, MenuItem, FormControl, InputLabel, OutlinedInput, Stack
} from "@mui/material";
import {
  Storefront, Email, Phone, LocationOn, Category, CheckCircle, ToggleOn,
  Info, EuroSymbol, AccessTime, Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon,
  PhotoCamera, // Added for image upload
  TrackChanges as TrackChangesIcon // For service radius
} from "@mui/icons-material";
import { useTheme } from '@mui/material/styles';
import { GoogleMap, Marker, useJsApiLoader, Autocomplete } from "@react-google-maps/api"; // Added
import { useCallback } from "react"; // Added

// Constants (can be moved to a config file later)
const DELIVERY_ZONES = [
  "Cocody Angré", "Cocody Riviera", "Cocody Deux Plateaux", "Cocody Centre",
  "Plateau", "Treichville", "Marcory", "Koumassi", "Port-Bouët", "Abobo",
  "Yopougon", "Songon", "Bingerville", "Autre (préciser)"
];

const VENDOR_TYPES_OPTIONS = [
  { value: "individual_shopper", label: "Vendeur individuel / Shopper personnel" },
  { value: "storefront", label: "Magasin / Boutique établie" },
];


function VendorProfilePage() {
  const { currentUser, userData, loading } = useAuth();
  const theme = useTheme();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);

  // Google Maps States
  const [mapLibraries] = useState(["places"]);
  const { isLoaded: isMapApiLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: mapLibraries,
  });
  const [mapCenter, setMapCenter] = useState({ lat: 5.3454, lng: -4.0242 }); // Default to Abidjan
  const [markerPosition, setMarkerPosition] = useState(null);
  const [autocompleteInstance, setAutocompleteInstance] = useState(null);
  const [mapRef, setMapRef] = useState(null);


  // Effect to initialize formData, profileImagePreview, and map states
  useEffect(() => {
    if (userData) {
      setProfileImagePreview(userData.photoURL || null);
      if (editMode) {
        const initialLat = userData.address?.lat || null;
        const initialLng = userData.address?.lng || null;
        setFormData({
          name: userData.name || '',
          phone: userData.phone || '',
          description: userData.description || '',
          deliveryZones: userData.deliveryZones || [],
          baseFee: userData.baseFee === null || userData.baseFee === undefined ? '' : String(userData.baseFee),
          availability: userData.availability || '',
          vendorType: userData.vendorType || '',
          formattedAddress: userData.address?.formattedAddress || '',
          latitude: initialLat,
          longitude: initialLng,
          serviceRadius: userData.serviceRadius === null || userData.serviceRadius === undefined ? '' : String(userData.serviceRadius),
        });

        if (initialLat && initialLng) {
          const position = { lat: initialLat, lng: initialLng };
          setMapCenter(position);
          setMarkerPosition(position);
        } else {
          // Default map center if no address, or keep previous if desired (e.g. general city)
           setMapCenter({ lat: 5.3454, lng: -4.0242 }); // Abidjan
           setMarkerPosition(null);
        }
        setProfileImageFile(null);
        setFormError('');
      }
    }
    if (!editMode) {
      setFormError('');
      setProfileImageFile(null);
      if (userData) {
        setProfileImagePreview(userData.photoURL || null);
      }
      // Optionally reset map states when exiting edit mode if they shouldn't persist
      // setMarkerPosition(null);
      // setMapCenter({ lat: 5.3454, lng: -4.0242 });
    }
  }, [userData, editMode]);


  const handleEditToggle = () => {
    setEditMode(!editMode);
     if (!editMode && userData?.address?.lat && userData?.address?.lng) {
      const currentPos = { lat: userData.address.lat, lng: userData.address.lng };
      setMapCenter(currentPos);
      setMarkerPosition(currentPos);
    } else if (!editMode) {
       setMapCenter({ lat: 5.3454, lng: -4.0242 }); // Default if no initial address
       setMarkerPosition(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newState = { ...prev, [name]: value };
      if (name === "formattedAddress" && (prev.latitude || prev.longitude)) {
        newState.latitude = null;
        newState.longitude = null;
        setMarkerPosition(null);
        // Consider setting formError to guide user
        setFormError("L'adresse manuelle a désynchronisé le marqueur. Veuillez rechercher à nouveau ou cliquer/déplacer le marqueur sur la carte pour confirmer la position exacte.");
      } else if (name !== "formattedAddress" && formError.includes("L'adresse manuelle a désynchronisé")) {
        // Clear specific error if user interacts with other fields
        setFormError("");
      }
      return newState;
    });
  };

  const handleMultiSelectChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: typeof value === 'string' ? value.split(',') : value,
    }));
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) {
      setFormError("Utilisateur non authentifié.");
      return;
    }
    setIsSaving(true);
    setFormError('');

    if (!formData.name.trim()) {
      setFormError("Le nom du vendeur ne peut pas être vide.");
      setIsSaving(false);
      return;
    }
    if (formData.baseFee && (isNaN(parseFloat(formData.baseFee)) || parseFloat(formData.baseFee) < 0)) {
      setFormError("Les frais de base doivent être un nombre positif.");
      setIsSaving(false);
      return;
    }

    try {
      let newPhotoURL = userData?.photoURL || null;

      if (profileImageFile) {
        const imageFileName = `profile_${currentUser.uid}_${Date.now()}${profileImageFile.name.substring(profileImageFile.name.lastIndexOf('.'))}`;
        const imageStorageRef = ref(storage, `vendor_profile_pictures/${currentUser.uid}/${imageFileName}`);

        try {
          const uploadTaskSnapshot = await uploadBytesResumable(imageStorageRef, profileImageFile);
          newPhotoURL = await getDownloadURL(uploadTaskSnapshot.ref);
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          setFormError("Erreur lors du téléchargement de l'image. Les autres modifications n'ont pas été sauvegardées.");
          setIsSaving(false);
          return;
        }
      }

      const dataToSave = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        description: formData.description.trim(),
        deliveryZones: formData.deliveryZones || [],
        baseFee: formData.baseFee === '' ? null : parseFloat(formData.baseFee),
        availability: formData.availability.trim(),
        vendorType: formData.vendorType,
        photoURL: newPhotoURL,
        address: {
          formattedAddress: formData.formattedAddress ? formData.formattedAddress.trim() : '',
          lat: formData.latitude === '' || formData.latitude === null ? null : parseFloat(formData.latitude),
          lng: formData.longitude === '' || formData.longitude === null ? null : parseFloat(formData.longitude),
        },
        serviceRadius: formData.serviceRadius === '' || formData.serviceRadius === null ? null : parseFloat(formData.serviceRadius),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "vendors", currentUser.uid), dataToSave);

      setProfileImageFile(null); // Clear file state
      // profileImagePreview will be updated by useEffect when userData changes via AuthContext
      setIsSaving(false);
      setEditMode(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      setFormError(`Erreur lors de l'enregistrement: ${err.message}`);
      setIsSaving(false);
    }
  };


  if (loading && !userData) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!userData || !userData.isVendor) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">
          Profil vendeur non trouvé ou vous n'êtes pas autorisé à voir cette page.
        </Alert>
      </Container>
    );
  }

  const getVendorTypeLabel = (type) => VENDOR_TYPES_OPTIONS.find(t => t.value === type)?.label || type || "Non spécifié";
  const statusColor = (status) => status ? theme.palette.success.main : theme.palette.error.main;
  const statusText = (status) => status ? "Oui" : "Non";

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1, flexGrow: 1 }}>
            <Avatar
              src={editMode ? profileImagePreview : userData.photoURL || undefined}
              sx={{ width: 80, height: 80, mr: 2, bgcolor: 'primary.main' }}
            >
              {!(editMode ? profileImagePreview : userData.photoURL) && <Storefront sx={{ fontSize: 40 }} />}
            </Avatar>
            <Box sx={{flexGrow: 1}}>
              {editMode ? (
                <TextField
                  label="Nom du Vendeur"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  variant="outlined"
                  fullWidth
                  sx={{ mb: 1 }}
                  disabled={isSaving}
                />
              ) : (
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {userData.name || "Profil Vendeur"}
                </Typography>
              )}
              <Chip
                icon={userData.isApproved && userData.isActive ? <CheckCircle /> : <Info />}
                label={userData.isApproved && userData.isActive ? "Compte Actif et Approuvé" : "Compte en attente/inactif"}
                color={userData.isApproved && userData.isActive ? "success" : "warning"}
                size="small"
              />
            </Box>
          </Box>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexShrink: 0 }}>
            {editMode ? (
              <>
                <Button variant="contained" onClick={handleSaveProfile} startIcon={<SaveIcon />} disabled={isSaving}>
                  {isSaving ? <CircularProgress size={24} color="inherit"/> : "Enregistrer"}
                </Button>
                <Button variant="outlined" onClick={handleEditToggle} startIcon={<CancelIcon />} disabled={isSaving}>
                  Annuler
                </Button>
              </>
            ) : (
              <Button variant="contained" onClick={handleEditToggle} startIcon={<EditIcon />}>
                Modifier le Profil
              </Button>
            )}
          </Stack>
        </Box>

        {formError && <Alert severity="error" sx={{ mb: 2, width:'100%' }}>{formError}</Alert>}

        <Divider sx={{ my: 2 }} />

        {editMode && (
          <Grid item xs={12} sx={{ textAlign: 'center', mb: 3 }}>
            <Avatar
              src={profileImagePreview || undefined}
              sx={{ width: 120, height: 120, margin: 'auto', mb: 1, border: `2px solid ${theme.palette.divider}` }}
            >
              {!profileImagePreview && <Storefront sx={{ fontSize: 60 }} />}
            </Avatar>
            <Button variant="outlined" component="label" size="small" startIcon={<PhotoCamera />} disabled={isSaving}>
              Changer la photo
              <input type="file" hidden accept="image/*" onChange={handleImageFileChange} />
            </Button>
          </Grid>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: `2px solid ${theme.palette.primary.light}`, pb: 1, mb:2 }}>
              Informations Générales
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><Email /></ListItemIcon>
                <ListItemText primary="Email (non modifiable)" secondary={userData.email} />
              </ListItem>
              <ListItem>
                <ListItemIcon><Phone /></ListItemIcon>
                {editMode ? (
                  <TextField label="Téléphone" name="phone" value={formData.phone || ''} onChange={handleInputChange} fullWidth size="small" disabled={isSaving}/>
                ) : (
                  <ListItemText primary="Téléphone" secondary={userData.phone || "Non spécifié"} />
                )}
              </ListItem>
              <ListItem>
                <ListItemIcon><Storefront /></ListItemIcon>
                {editMode ? (
                  <FormControl fullWidth size="small" disabled={isSaving}>
                    <InputLabel id="vendor-type-label">Type de vendeur</InputLabel>
                    <Select labelId="vendor-type-label" name="vendorType" value={formData.vendorType || ''} onChange={handleInputChange} label="Type de vendeur">
                      {VENDOR_TYPES_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                ) : (
                  <ListItemText primary="Type de vendeur" secondary={getVendorTypeLabel(userData.vendorType)} />
                )}
              </ListItem>
              <ListItem sx={{display:'block'}}>
                <Box sx={{display:'flex', alignItems:'center', mb: editMode ? 1:0}}>
                    <ListItemIcon><Info /></ListItemIcon>
                    <Typography variant="body2" color="text.secondary" sx={{fontWeight:'medium', display: !editMode ? 'block' : 'none'}}>Description</Typography>
                </Box>
                {editMode ? (
                  <TextField label="Description" name="description" value={formData.description || ''} onChange={handleInputChange} fullWidth multiline rows={3} size="small" disabled={isSaving}/>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{pl:5, display: userData.description ? 'block' : 'none'}}>{userData.description || "Non spécifié"}</Typography>
                )}
              </ListItem>
            </List>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: `2px solid ${theme.palette.primary.light}`, pb: 1, mb:2 }}>
              Détails de l'Activité
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><EuroSymbol /></ListItemIcon>
                {editMode ? (
                  <TextField label="Frais de livraison de base (FCFA)" name="baseFee" type="number" value={formData.baseFee || ''} onChange={handleInputChange} fullWidth size="small" InputProps={{ inputProps: { min: 0 } }} disabled={isSaving}/>
                ) : (
                  <ListItemText primary="Frais de livraison de base" secondary={`${userData.baseFee?.toLocaleString('fr-FR') || 'N/A'} FCFA`} />
                )}
              </ListItem>
              <ListItem>
                <ListItemIcon><AccessTime /></ListItemIcon>
                {editMode ? (
                   <TextField label="Disponibilité (ex: Lun-Ven, 9h-18h)" name="availability" value={formData.availability || ''} onChange={handleInputChange} fullWidth size="small" disabled={isSaving}/>
                ) : (
                  <ListItemText primary="Disponibilité" secondary={userData.availability || "Non spécifiée"} />
                )}
              </ListItem>
               <ListItem>
                <ListItemIcon><CheckCircle /></ListItemIcon>
                <ListItemText primary="Approuvé par l'admin" secondary={statusText(userData.isApproved)} secondaryTypographyProps={{ style: { color: statusColor(userData.isApproved), fontWeight: 'bold' } }}/>
              </ListItem>
              <ListItem>
                <ListItemIcon><ToggleOn /></ListItemIcon>
                <ListItemText primary="Compte Actif" secondary={statusText(userData.isActive)} secondaryTypographyProps={{ style: { color: statusColor(userData.isActive), fontWeight: 'bold' } }}/>
              </ListItem>
              {/* Display Location and Service Radius in View Mode */}
              {!editMode && (
                <>
                  <ListItem>
                    <ListItemIcon><LocationOn /></ListItemIcon>
                    <ListItemText primary="Adresse" secondary={userData.address?.formattedAddress || "Non spécifiée"} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><TrackChangesIcon /></ListItemIcon>
                    <ListItemText primary="Rayon de Service" secondary={userData.serviceRadius ? `${userData.serviceRadius} km` : "Non spécifié"} />
                  </ListItem>
                </>
              )}
            </List>
          </Grid>

          {/* Location and Service Radius Inputs in Edit Mode */}
          {editMode && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: `2px solid ${theme.palette.primary.light}`, pb: 1, mt:2, mb:2 }}>
                Localisation et Rayon de Service
              </Typography>
              <Grid container spacing={2}>
                {/* Map and Address Section */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mt:1, mb:1 }}>
                    <LocationOn sx={{ mr: 0.5, fontSize: '1.1rem' }} />
                    Adresse de l'Entreprise
                  </Typography>
                  {mapLoadError && (
                    <Alert severity="warning" sx={{ mb: 1.5 }}>
                      La carte Google Maps n'a pas pu se charger. La sélection d'adresse via la carte est indisponible. Vous pouvez toujours entrer l'adresse manuellement.
                    </Alert>
                  )}
                  {!isMapApiLoaded && !mapLoadError && <CircularProgress size={24} sx={{mb:1}}/>}
                  {isMapApiLoaded && (
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
                            const newPos = place.geometry.location.toJSON();
                            setMapCenter(newPos);
                            setMarkerPosition(newPos);
                            setFormError(""); // Clear address error
                          } else {
                            setFormData(prev => ({ ...prev, latitude: null, longitude: null }));
                            setMarkerPosition(null);
                            setFormError("Adresse non reconnue. Veuillez réessayer ou placer/déplacer le marqueur sur la carte.");
                          }
                        }
                      }}
                      options={{ types: ["address"] }}
                    >
                      <TextField
                        label="Rechercher l'adresse..."
                        name="formattedAddress" // Ensure name is set for handleInputChange
                        value={formData.formattedAddress || ''}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        disabled={isSaving || !isMapApiLoaded}
                        sx={{ mb: 1.5 }}
                        placeholder="Commencez à taper pour rechercher..."
                      />
                    </Autocomplete>
                  )}
                </Grid>

                {isMapApiLoaded && (
                  <Grid item xs={12}>
                    <Box sx={{ height: "300px", width: "100%", mb: 1, borderRadius: 1, overflow:'hidden', border: `1px solid ${theme.palette.divider}` }}>
                      <GoogleMap
                        mapContainerStyle={{ height: "100%", width: "100%" }}
                        center={mapCenter}
                        zoom={markerPosition ? 16 : 10}
                        onLoad={(map) => setMapRef(map)}
                        onClick={(e) => {
                           if(isSaving) return;
                          const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                          setMarkerPosition(newPos);
                          setFormData(prev => ({ ...prev, latitude: newPos.lat, longitude: newPos.lng }));
                          setFormError("L'adresse textuelle ne se met pas à jour par clic. Utilisez la recherche ou ajustez manuellement si besoin.");
                        }}
                      >
                        {markerPosition && (
                          <Marker
                            position={markerPosition}
                            draggable={!isSaving}
                            onDragEnd={(e) => {
                              if(isSaving) return;
                              const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                              setMarkerPosition(newPos);
                              setFormData(prev => ({ ...prev, latitude: newPos.lat, longitude: newPos.lng }));
                              setFormError("L'adresse textuelle ne se met pas à jour par déplacement du marqueur. Ajustez manuellement si besoin.");
                            }}
                          />
                        )}
                      </GoogleMap>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{display:'block', textAlign:'center'}}>
                        Recherchez, cliquez sur la carte, ou déplacez le marqueur pour définir la position exacte.
                    </Typography>
                  </Grid>
                )}
                 {/* End Map and Address Section */}
                <Grid item xs={12}> {/* Service Radius on its own line for better layout */}
                  <TextField
                    label="Rayon de Service (km)"
                    name="serviceRadius"
                    type="number"
                    value={formData.serviceRadius === null ? '' : formData.serviceRadius}
                    onChange={handleInputChange}
                    fullWidth
                    size="small"
                    InputProps={{ inputProps: { min: 0 } }}
                    disabled={isSaving}
                  />
                </Grid>
              </Grid>
            </Grid>
          )}

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: `2px solid ${theme.palette.primary.light}`, pb: 1, mt:2, mb:2 }}>
              Spécialités (non modifiable ici)
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {userData.specialties && userData.specialties.length > 0 ? userData.specialties.map((spec, index) => (
                <Chip key={index} label={spec} color="secondary" icon={<Category />} />
              )) : <Typography variant="body2">Aucune spécialité spécifiée.</Typography>}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: `2px solid ${theme.palette.primary.light}`, pb: 1, mt:2, mb:2 }}>
              Zones de Livraison
            </Typography>
            {editMode ? (
              <FormControl fullWidth size="small" disabled={isSaving}>
                <InputLabel id="delivery-zones-label">Zones de livraison</InputLabel>
                <Select
                  labelId="delivery-zones-label"
                  multiple
                  name="deliveryZones"
                  value={formData.deliveryZones || []}
                  onChange={handleMultiSelectChange}
                  input={<OutlinedInput label="Zones de livraison" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => <Chip key={value} label={value} size="small"/>)}
                    </Box>
                  )}
                >
                  {DELIVERY_ZONES.map((zone) => <MenuItem key={zone} value={zone}>{zone}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {userData.deliveryZones && userData.deliveryZones.length > 0 ? userData.deliveryZones.map((zone, index) => (
                  <Chip key={index} label={zone} color="info" icon={<LocationOn />} />
                )) : <Typography variant="body2">Aucune zone de livraison spécifiée.</Typography>}
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}

export default VendorProfilePage;
