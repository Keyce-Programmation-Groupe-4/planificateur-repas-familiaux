// src/pages/FamilyPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Typography,
  Container,
  Paper,
  Box,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  IconButton,
  Snackbar
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  addDoc,
  serverTimestamp,
  updateDoc, // Needed for accepting/declining invitations
  arrayUnion // Needed for adding member to family (though we won't use it directly here)
} from 'firebase/firestore';

export default function FamilyPage() {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const [familyData, setFamilyData] = useState(null);
  const [membersData, setMembersData] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loadingFamily, setLoadingFamily] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createFamilyDialogOpen, setCreateFamilyDialogOpen] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isProcessingInvite, setIsProcessingInvite] = useState(null); // Store ID of invite being processed

  const hasFamily = userData?.familyId;
  const isFamilyAdmin = hasFamily && userData?.uid === familyData?.adminUid;

  // --- Fetch Family Data (useEffect remains the same) ---
  useEffect(() => {
    let isMounted = true;
    const fetchFamilyData = async () => {
      if (hasFamily) {
        setLoadingFamily(true);
        try {
          const familyDocRef = doc(db, 'families', userData.familyId);
          const familySnap = await getDoc(familyDocRef);

          if (isMounted) {
            if (familySnap.exists()) {
              const fetchedFamilyData = { id: familySnap.id, ...familySnap.data() };
              setFamilyData(fetchedFamilyData);
              if (fetchedFamilyData.memberUids && fetchedFamilyData.memberUids.length > 0) {
                const memberPromises = fetchedFamilyData.memberUids.map(uid => getDoc(doc(db, 'users', uid)));
                const memberDocs = await Promise.all(memberPromises);
                const members = memberDocs.map(docSnap => docSnap.exists() ? { uid: docSnap.id, ...docSnap.data() } : null).filter(Boolean);
                setMembersData(members);
              }
            } else {
              setError('Données de la famille introuvables.');
            }
            setLoadingFamily(false);
          }
        } catch (err) {
          console.error("Error fetching family data:", err);
          if (isMounted) {
            setError('Erreur lors de la récupération des données de la famille.');
            setLoadingFamily(false);
          }
        }
      } else {
         if (isMounted) setLoadingFamily(false);
      }
    };

    if (!authLoading && userData) {
        fetchFamilyData();
    }
    return () => { isMounted = false };
  }, [userData, hasFamily, authLoading]);

  // --- Fetch Invitations (useEffect remains the same) ---
  useEffect(() => {
    let isMounted = true;
    const fetchInvitations = async () => {
      if (currentUser) {
        setLoadingInvitations(true);
        try {
          const invitationsRef = collection(db, 'invitations');
          const q = query(invitationsRef,
                          where('recipientEmail', '==', currentUser.email),
                          where('status', '==', 'pending'));
          const querySnapshot = await getDocs(q);
          if (isMounted) {
            const fetchedInvitations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setInvitations(fetchedInvitations);
            setLoadingInvitations(false);
          }
        } catch (err) {
          console.error("Error fetching invitations:", err);
          if (isMounted) {
            setError('Erreur lors de la récupération des invitations.');
            setLoadingInvitations(false);
          }
        }
      } else {
          if (isMounted) setLoadingInvitations(false);
      }
    };

    if (!authLoading && currentUser) {
        fetchInvitations();
    }
     return () => { isMounted = false };
  }, [currentUser, authLoading]);

  // --- Create Family Logic (remains the same) --- 
  const handleOpenCreateFamilyDialog = () => {
    setNewFamilyName('');
    setError('');
    setCreateFamilyDialogOpen(true);
  };
  const handleCloseCreateFamilyDialog = () => {
    setCreateFamilyDialogOpen(false);
  };
  const handleCreateFamilySubmit = async () => {
    // ... (logic remains the same)
    if (!newFamilyName.trim()) {
      setError('Le nom de la famille ne peut pas être vide.');
      return;
    }
    if (!currentUser) {
      setError('Utilisateur non connecté.');
      return;
    }
    setIsCreatingFamily(true);
    setError('');
    try {
      const batch = writeBatch(db);
      const newFamilyRef = doc(collection(db, 'families'));
      const newFamilyData = {
        familyName: newFamilyName.trim(),
        adminUid: currentUser.uid,
        memberUids: [currentUser.uid],
        createdAt: serverTimestamp()
      };
      batch.set(newFamilyRef, newFamilyData);
      const userDocRef = doc(db, 'users', currentUser.uid);
      batch.update(userDocRef, {
        familyId: newFamilyRef.id,
        familyRole: 'Admin',
        updatedAt: serverTimestamp()
      });
      await batch.commit();
      setCreateFamilyDialogOpen(false);
      setSuccessMessage('Famille créée avec succès !');
      // AuthContext with onSnapshot should handle the UI update
    } catch (err) {
      console.error("Error creating family:", err);
      setError('Erreur lors de la création de la famille.');
    } finally {
      setIsCreatingFamily(false);
    }
  };

  // --- Send Invitation Logic (remains the same) --- 
  const handleSendInvitation = async (e) => {
    // ... (logic remains the same)
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setError('Veuillez entrer l\email de la personne à inviter.');
      return;
    }
    if (!isFamilyAdmin || !familyData) {
      setError('Seul l\admin peut envoyer des invitations.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
        setError('Format d\email invalide.');
        return;
    }
    if (inviteEmail === currentUser.email) {
        setError('Vous ne pouvez pas vous inviter vous-même.');
        return;
    }
    setIsSendingInvite(true);
    setError('');
    setSuccessMessage('');
    try {
      const invitationsRef = collection(db, 'invitations');
      const q = query(invitationsRef,
                      where('familyId', '==', familyData.id),
                      where('recipientEmail', '==', inviteEmail),
                      where('status', '==', 'pending'));
      const existingInviteSnap = await getDocs(q);
      if (!existingInviteSnap.empty) {
        throw new Error('Une invitation est déjà en attente pour cet email.');
      }
      await addDoc(invitationsRef, {
        familyId: familyData.id,
        familyName: familyData.familyName,
        inviterUid: currentUser.uid,
        inviterName: userData.displayName,
        recipientEmail: inviteEmail.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSuccessMessage(`Invitation envoyée à ${inviteEmail} !`);
      setInviteEmail('');
    } catch (err) {
      console.error("Error sending invitation:", err);
      setError(err.message || 'Erreur lors de l\envoi de l\invitation.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  // --- Accept Invitation Logic --- 
  const handleAcceptInvitation = async (invitation) => {
    if (!currentUser || userData?.familyId) {
      setError('Vous ne pouvez pas accepter d\'invitation si vous êtes déjà dans une famille ou non connecté.');
      return;
    }
    setIsProcessingInvite(invitation.id);
    setError('');
    setSuccessMessage('');

    try {
      const batch = writeBatch(db);

      // 1. Update invitation status
      const invitationRef = doc(db, 'invitations', invitation.id);
      batch.update(invitationRef, {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });

      // 2. Update user's profile
      const userDocRef = doc(db, 'users', currentUser.uid);
      batch.update(userDocRef, {
        familyId: invitation.familyId,
        familyRole: 'Member', // Assign 'Member' role
        updatedAt: serverTimestamp()
      });

      // 3. Update family's memberUids list (This part is NOT secure without Cloud Functions)
      // We are OMITTING this step as the user doesn't have permission to write to the family doc.
      // The user will have familyId set, but won't appear in the family list until admin adds them
      // or Cloud Functions are implemented.
      // const familyRef = doc(db, 'families', invitation.familyId);
      // batch.update(familyRef, {
      //   memberUids: arrayUnion(currentUser.uid)
      // });

      await batch.commit();

      setSuccessMessage(`Vous avez rejoint la famille ${invitation.familyName} !`);
      // Remove the accepted invitation from the local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      // AuthContext with onSnapshot should handle the user data update

    } catch (err) {
      console.error("Error accepting invitation:", err);
      setError('Erreur lors de l\'acceptation de l\'invitation.');
    } finally {
      setIsProcessingInvite(null);
    }
  };

  // --- Decline Invitation Logic --- 
  const handleDeclineInvitation = async (invitationId) => {
    setIsProcessingInvite(invitationId);
    setError('');
    setSuccessMessage('');
    try {
      const invitationRef = doc(db, 'invitations', invitationId);
      await updateDoc(invitationRef, {
        status: 'declined',
        updatedAt: serverTimestamp()
      });
      setSuccessMessage('Invitation refusée.');
      // Remove the declined invitation from the local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) {
      console.error("Error declining invitation:", err);
      setError('Erreur lors du refus de l\'invitation.');
    } finally {
      setIsProcessingInvite(null);
    }
  };

  const isLoading = authLoading || loadingFamily || loadingInvitations;

  const handleCloseSnackbar = () => {
    setSuccessMessage('');
    setError('');
  };

  return (
    <Container maxWidth="lg">
      <Paper sx={{ padding: 3, marginTop: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Ma Famille
        </Typography>

        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
        {/* Display general errors outside dialogs */} 
        {error && !createFamilyDialogOpen && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!isLoading && (
          <>
            {/* --- Invitations Section --- */} 
            <Box mb={4}>
              <Typography variant="h6" gutterBottom>Invitations en attente</Typography>
              {invitations.length > 0 ? (
                invitations.map(inv => (
                  <Alert key={inv.id} severity="info" action={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Button
                        color="inherit"
                        size="small"
                        variant="outlined"
                        onClick={() => handleAcceptInvitation(inv)}
                        disabled={!!isProcessingInvite || !!userData?.familyId} // Disable if processing or already in family
                      >
                        {isProcessingInvite === inv.id ? <CircularProgress size={18} /> : 'Accepter'}
                      </Button>
                      <Button
                        color="inherit"
                        size="small"
                        variant="text"
                        onClick={() => handleDeclineInvitation(inv.id)}
                        disabled={!!isProcessingInvite}
                      >
                         {isProcessingInvite === inv.id ? <CircularProgress size={18} /> : 'Refuser'}
                      </Button>
                    </Box>
                  }>
                    Invitation de <strong>{inv.inviterName || 'un membre'}</strong> pour rejoindre la famille <strong>{inv.familyName || 'inconnue'}</strong>.
                  </Alert>
                ))
              ) : (
                <Typography variant="body2">Aucune invitation en attente.</Typography>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* --- Family Info / Create Section --- */} 
            {hasFamily && familyData ? (
              <Box>
                 <Typography variant="h5" gutterBottom>Famille {familyData.familyName}</Typography>
                 <Typography variant="h6">Membres :</Typography>
                 {membersData.length > 0 ? (
                    <List dense>
                    {membersData.map(member => (
                        <ListItem key={member.uid}>
                        <ListItemText primary={member.displayName} secondary={member.email} />
                        {member.uid === familyData.adminUid && <Typography variant="caption" sx={{ ml: 1 }}>(Admin)</Typography>}
                        </ListItem>
                    ))}
                    </List>
                 ) : (
                    <Typography variant="body2" color="text.secondary">Chargement des membres...</Typography>
                 )}
                 
                 {/* --- Send Invitation Form (Admin only) --- */} 
                 {isFamilyAdmin && (
                   <Box component="form" onSubmit={handleSendInvitation} mt={3} border={1} borderColor="grey.300" borderRadius={1} p={2}>
                     <Typography variant="h6" gutterBottom>Inviter un nouveau membre</Typography>
                     <TextField
                       label="Email de l'invité"
                       variant="outlined"
                       size="small"
                       type="email"
                       value={inviteEmail}
                       onChange={(e) => setInviteEmail(e.target.value)}
                       disabled={isSendingInvite}
                       required
                       sx={{ mr: 1, mb: { xs: 1, sm: 0 } }}
                     />
                     <Button type="submit" variant="contained" disabled={isSendingInvite || !inviteEmail.trim()}>
                       {isSendingInvite ? <CircularProgress size={24} /> : 'Envoyer l\'invitation'}
                     </Button>
                   </Box>
                 )}
              </Box>
            ) : (
              // --- Section to Create Family --- 
              <Box>
                {!userData?.familyId && invitations.length === 0 && (
                    <> 
                        <Typography variant="body1" gutterBottom>
                        Vous n'appartenez actuellement à aucune famille.
                        </Typography>
                        <Button variant="contained" onClick={handleOpenCreateFamilyDialog}>
                        Créer une famille
                        </Button>
                    </>
                )}
                {/* Message if user has no family but has pending invites */} 
                {!userData?.familyId && invitations.length > 0 && (
                    <Typography variant="body1" gutterBottom>
                        Vous avez des invitations en attente ci-dessus. Acceptez une invitation pour rejoindre une famille.
                    </Typography>
                )}
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* --- Create Family Dialog (remains the same) --- */} 
      <Dialog open={createFamilyDialogOpen} onClose={handleCloseCreateFamilyDialog}>
         {/* ... Dialog content ... */}
         <DialogTitle>Créer une nouvelle famille</DialogTitle>
         <DialogContent>
           <DialogContentText sx={{ mb: 2 }}>
             Entrez le nom que vous souhaitez donner à votre groupe familial.
           </DialogContentText>
           {error && createFamilyDialogOpen && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>} 
           <TextField
             autoFocus
             margin="dense"
             id="familyName"
             label="Nom de la famille"
             type="text"
             fullWidth
             variant="standard"
             value={newFamilyName}
             onChange={(e) => setNewFamilyName(e.target.value)}
             disabled={isCreatingFamily}
           />
         </DialogContent>
         <DialogActions sx={{ padding: '16px 24px' }}>
           <Button onClick={handleCloseCreateFamilyDialog} disabled={isCreatingFamily}>Annuler</Button>
           <Button onClick={handleCreateFamilySubmit} variant="contained" disabled={isCreatingFamily || !newFamilyName.trim()}>
             {isCreatingFamily ? <CircularProgress size={24} /> : 'Créer'}
           </Button>
         </DialogActions>
      </Dialog>

      {/* --- Snackbar for Success/Error Messages --- */} 
      <Snackbar
        open={!!successMessage || !!error}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {/* Use Alert inside Snackbar for better styling and close button */} 
        <Alert 
            onClose={handleCloseSnackbar} 
            severity={successMessage ? "success" : "error"} 
            sx={{ width: '100%' }} 
            variant="filled"
        >
          {successMessage || error}
        </Alert>
      </Snackbar>

    </Container>
  );
}

