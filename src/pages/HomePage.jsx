// src/pages/HomePage.jsx
import React from 'react';
import { Typography, Container, Paper, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const { currentUser, userData } = useAuth();

  return (
    <Container maxWidth="lg">
      <Paper sx={{ padding: 3, marginTop: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Bienvenue, {userData?.displayName || currentUser?.email} !
        </Typography>
        <Typography variant="body1">
          Ceci est votre tableau de bord. D'ici, vous pourrez bientôt accéder à la planification des repas, gérer vos recettes et votre liste de courses.
        </Typography>
        {/* Placeholder content - will be expanded later */}
        <Box sx={{ marginTop: 4 }}>
          <Typography variant="h6">Prochaines étapes :</Typography>
          <ul>
            <li>Consulter/Modifier votre profil (via le lien "Profil" en haut)</li>
            <li>Gérer votre famille (via le lien "Ma Famille" en haut)</li>
            <li>Ajouter des recettes (Module 2)</li>
            <li>Planifier les repas (Module 3)</li>
          </ul>
        </Box>
        {userData ? (
          <Box sx={{ marginTop: 2, padding: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption">Infos utilisateur chargées:</Typography>
            <pre style={{ fontSize: '0.8em', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(userData, null, 2)}
            </pre>
          </Box>
        ) : (
          <Typography variant="caption">Chargement des données utilisateur...</Typography>
        )}
      </Paper>
    </Container>
  );
}

