"use client"

import { Container, Typography, Paper, Box, Button } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'; // Using an appropriate icon

function PendingApprovalPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth(); // Assuming logout is available in AuthContext

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out:", error);
      // Handle logout error (e.g., show a notification)
    }
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 6 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <HourglassEmptyIcon sx={{ fontSize: 60, color: "secondary.main", mb: 2 }} />
        <Typography component="h1" variant="h5" sx={{ textAlign: 'center', mb: 2 }}>
          Compte en attente d'approbation
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
          Votre compte vendeur a été créé avec succès et est actuellement en cours de vérification par nos administrateurs.
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
          Vous recevrez une notification par e-mail dès que votre compte sera approuvé. Merci de votre patience.
        </Typography>
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-around', mt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
          >
            Retour à l'accueil
          </Button>
          {currentUser && logout && ( // Conditionally render logout if available
            <Button
              variant="contained"
              color="primary"
              onClick={handleLogout}
            >
              Se déconnecter
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default PendingApprovalPage;
