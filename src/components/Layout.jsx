// src/components/Layout.jsx
import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

export default function Layout({ children }) {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error("Failed to log out:", error);
      // Handle logout error (e.g., show a notification)
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={0} sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <Toolbar>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}>
            Mon Planificateur Repas
          </Typography>
          {currentUser ? (
            <>
              <Button color="inherit" component={RouterLink} to="/">Accueil</Button>
              {/* NEW: Link to Planner Page */}
              <Button color="inherit" component={RouterLink} to="/planner">Planificateur</Button>
              <Button color="inherit" component={RouterLink} to="/recipes">Mes Recettes</Button>
              <Button color="inherit" component={RouterLink} to="/family">Ma Famille</Button>
              <Button color="inherit" component={RouterLink} to="/profile">Profil</Button>
              <Button color="inherit" onClick={handleLogout}>Déconnexion</Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">Connexion</Button>
              <Button color="inherit" component={RouterLink} to="/signup">Inscription</Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ flexGrow: 1, py: 3 /* Add padding top/bottom */ }}>
        {children} {/* This is where the routed page component will be rendered */}
      </Container>
      <Box component="footer" sx={{ py: 2, textAlign: 'center', mt: 'auto', backgroundColor: 'background.paper', borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Mon Planificateur Repas
        </Typography>
      </Box>
    </Box>
  );
}

