"use client"

import { useAuth } from "../../contexts/AuthContext";
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Alert
} from "@mui/material";
import {
  Storefront, // Using Storefront as a general vendor icon
  Email,
  Phone,
  LocationOn,
  Category, // For specialties
  CheckCircle, // For isApproved
  ToggleOn, // For isActive
  Info, // For description
  EuroSymbol, // For baseFee (or other currency)
  AccessTime // For availability
} from "@mui/icons-material";
import { useTheme } from '@mui/material/styles';

function VendorProfilePage() {
  const { userData, loading } = useAuth();
  const theme = useTheme();

  if (loading) {
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

  const {
    name,
    email,
    phone,
    description,
    specialties = [],
    deliveryZones = [],
    baseFee,
    availability,
    vendorType,
    isApproved,
    isActive,
    photoURL, // Assuming photoURL might exist, similar to user profiles
    rating,
    totalRatings
  } = userData;

  const getVendorTypeLabel = (type) => {
    if (type === "individual_shopper") return "Vendeur individuel / Shopper personnel";
    if (type === "storefront") return "Magasin / Boutique établie";
    return type || "Non spécifié";
  };

  const statusColor = (status) => status ? theme.palette.success.main : theme.palette.error.main;
  const statusText = (status) => status ? "Oui" : "Non";
  const statusIcon = (status) => status ? <CheckCircle sx={{ color: statusColor(status) }} /> : <Info sx={{ color: statusColor(status) }} />;


  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <Avatar
            src={photoURL || undefined} // Use photoURL if available
            sx={{ width: 80, height: 80, mr: 2, bgcolor: 'primary.main' }}
          >
            {!photoURL && <Storefront sx={{ fontSize: 40 }} />}
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              {name || "Profil Vendeur"}
            </Typography>
            <Chip
              icon={isApproved && isActive ? <CheckCircle /> : <Info />}
              label={isApproved && isActive ? "Compte Actif et Approuvé" : "Compte en attente/inactif"}
              color={isApproved && isActive ? "success" : "warning"}
              size="small"
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: `2px solid ${theme.palette.primary.light}`, pb: 1, mb:2 }}>
              Informations Générales
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><Email /></ListItemIcon>
                <ListItemText primary="Email" secondary={email} />
              </ListItem>
              <ListItem>
                <ListItemIcon><Phone /></ListItemIcon>
                <ListItemText primary="Téléphone" secondary={phone || "Non spécifié"} />
              </ListItem>
              <ListItem>
                <ListItemIcon><Storefront /></ListItemIcon>
                <ListItemText primary="Type de vendeur" secondary={getVendorTypeLabel(vendorType)} />
              </ListItem>
              {description && (
                <ListItem>
                  <ListItemIcon><Info /></ListItemIcon>
                  <ListItemText primary="Description" secondary={description} />
                </ListItem>
              )}
            </List>
          </Grid>

          {/* Right Column */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: `2px solid ${theme.palette.primary.light}`, pb: 1, mb:2 }}>
              Détails de l'Activité
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><EuroSymbol /></ListItemIcon> {/* Consider changing icon based on currency */}
                <ListItemText primary="Frais de livraison de base" secondary={`${baseFee?.toLocaleString('fr-FR') || 'N/A'} FCFA`} />
              </ListItem>
              <ListItem>
                <ListItemIcon><AccessTime /></ListItemIcon>
                <ListItemText primary="Disponibilité" secondary={availability || "Non spécifiée"} />
              </ListItem>
               <ListItem>
                <ListItemIcon><CheckCircle /></ListItemIcon>
                <ListItemText
                  primary="Approuvé par l'admin"
                  secondary={statusText(isApproved)}
                  secondaryTypographyProps={{ style: { color: statusColor(isApproved), fontWeight: 'bold' } }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><ToggleOn /></ListItemIcon>
                <ListItemText
                  primary="Compte Actif"
                  secondary={statusText(isActive)}
                  secondaryTypographyProps={{ style: { color: statusColor(isActive), fontWeight: 'bold' } }}
                />
              </ListItem>
            </List>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: `2px solid ${theme.palette.primary.light}`, pb: 1, mt:2, mb:2 }}>
              Spécialités
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {specialties.length > 0 ? specialties.map((spec, index) => (
                <Chip key={index} label={spec} color="secondary" icon={<Category />} />
              )) : <Typography variant="body2">Aucune spécialité spécifiée.</Typography>}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: `2px solid ${theme.palette.primary.light}`, pb: 1, mt:2, mb:2 }}>
              Zones de Livraison
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {deliveryZones.length > 0 ? deliveryZones.map((zone, index) => (
                <Chip key={index} label={zone} color="info" icon={<LocationOn />} />
              )) : <Typography variant="body2">Aucune zone de livraison spécifiée.</Typography>}
            </Box>
          </Grid>

          {/* Placeholder for future edit button */}
          {/*
          <Grid item xs={12} sx={{mt: 3, textAlign: 'right'}}>
            <Button variant="contained">Modifier le Profil (Bientôt)</Button>
          </Grid>
          */}
        </Grid>
      </Paper>
    </Container>
  );
}

export default VendorProfilePage;
