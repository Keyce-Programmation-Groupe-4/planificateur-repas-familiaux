"use client"
import { Grid, Typography, Box, useTheme, CircularProgress, Alert } from "@mui/material"
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useState } from 'react';
import VendorCard from "./VendorCard"

const mapContainerStyle = {
  width: '100%',
  height: '400px', // Adjust as needed
  marginBottom: '20px', // Space below the map
};

const defaultCenter = {
  lat: 5.3454, // Example: Abidjan latitude
  lng: -4.0242  // Example: Abidjan longitude
};

const libraries = ['places']; // Define libraries here, 'places' might not be strictly needed but good for consistency

function VendorSelection({ vendors, onSelect, selected, userLatitude, userLongitude }) {
  const theme = useTheme()
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [activeMarker, setActiveMarker] = useState(null); // Stores vendor id

  const handleInfoWindowClose = () => {
    setActiveMarker(null);
  };

  const handleMarkerClick = (vendorId) => {
    setActiveMarker(vendorId);
  };


  if (vendors.length === 0 && !isLoaded && !loadError) { // Still show loading if vendors are also loading elsewhere
     return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <CircularProgress />
        <Typography color="text.secondary" sx={{mt:1}}>Chargement des vendeurs et de la carte...</Typography>
      </Box>
    )
  }

  if (vendors.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography color="text.secondary">
          Aucun vendeur disponible pour le moment. Veuillez réessayer plus tard.
        </Typography>
      </Box>
    )
  }


  return (
    <Box>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Impossible de charger la carte Google Maps. Les fonctionnalités de localisation peuvent être limitées.
        </Alert>
      )}
      {!isLoaded && !loadError && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: mapContainerStyle.height, mb: mapContainerStyle.marginBottom }}>
          <CircularProgress />
          <Typography sx={{ml: 2}}>Chargement de la carte...</Typography>
        </Box>
      )}
      {isLoaded && !loadError && (
        <Box sx={{ ...mapContainerStyle, borderRadius: 2, overflow: 'hidden', boxShadow: theme.shadows[1] }}>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={defaultCenter}
            zoom={11} // Adjusted zoom
          >
            {vendors.map((vendor) => {
              if (vendor.address && typeof vendor.address.lat === 'number' && typeof vendor.address.lng === 'number') {
                return (
                  <Marker
                    key={vendor.id}
                    position={{ lat: vendor.address.lat, lng: vendor.address.lng }}
                    onClick={() => handleMarkerClick(vendor.id)}
                    title={vendor.name}
                  >
                    {activeMarker === vendor.id && (
                      <InfoWindow onCloseClick={handleInfoWindowClose}>
                        <div>
                          <Typography variant="subtitle2" component="div" sx={{fontWeight: 'bold', mb: 0.5}}>{vendor.name}</Typography>
                          <Typography variant="caption">{vendor.address.formattedAddress || 'Adresse non disponible'}</Typography>
                          {/* Optional: Add more info like vendor type or rating */}
                        </div>
                      </InfoWindow>
                    )}
                  </Marker>
                );
              }
              return null;
            })}
          </GoogleMap>
        </Box>
      )}

      <Grid container spacing={2}>
        {vendors.map((vendor) => (
          <Grid item xs={12} sm={6} md={4} key={vendor.id}> {/* Adjusted grid for potentially more cards */}
            <VendorCard
              vendor={vendor}
              onClick={onSelect}
              selected={selected && selected.id === vendor.id}
              userLatitude={userLatitude}
              userLongitude={userLongitude}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default VendorSelection
