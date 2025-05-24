// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { Typography, Container, Paper, Box, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../firebaseConfig';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function ProfilePage() {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initialize the displayName field when userData is loaded
  useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || '');
    }
  }, [userData]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentUser) {
      return setError('Utilisateur non trouvé.');
    }

    if (displayName.trim() === '') {
        return setError('Le nom d\affichage ne peut pas être vide.');
    }

    // Check if the name is actually changed
    if (displayName === userData?.displayName) {
        return; // No changes to save
    }

    setLoading(true);

    try {
      // 1. Update Firebase Auth profile
      await updateProfile(currentUser, { displayName: displayName });

      // 2. Update Firestore document
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        displayName: displayName,
        updatedAt: serverTimestamp()
      });

      // Note: The AuthContext will automatically pick up the Firestore change
      // if it re-fetches user data on auth state change or via a refresh mechanism.
      // For immediate UI update, we might need to manually update the context state or trigger a refresh.
      // For now, we rely on potential context refresh or page reload.

      setSuccess('Profil mis à jour avec succès !');
      // Optionally clear success message after a few seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error("Profile Update Error:", err);
      setError('Échec de la mise à jour du profil.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <CircularProgress />
        </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper sx={{ padding: 3, marginTop: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Mon Profil
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {userData ? (
          <Box component="form" onSubmit={handleProfileUpdate} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="displayName"
              label="Nom d'affichage"
              name="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              fullWidth
              id="email"
              label="Adresse Email"
              name="email"
              value={userData.email}
              disabled // Email is not editable here
              sx={{ mb: 2 }}
            />
             <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ID Famille : {userData.familyId || 'Non définie'}
             </Typography>

            {/* Placeholder for dietary preferences - Add later */}
            {/* <Typography variant="h6" sx={{ mt: 3 }}>Préférences Alimentaires</Typography>
            <Typography variant="body2">Section à implémenter...</Typography> */}

            <Button
              type="submit"
              variant="contained"
              disabled={loading || displayName === userData?.displayName} // Disable if no change or loading
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Mettre à jour le profil'}
            </Button>
          </Box>
        ) : (
          <Typography>Chargement des informations...</Typography>
        )}
      </Paper>
    </Container>
  );
}

