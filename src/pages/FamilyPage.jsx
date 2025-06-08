"use client"

import { useState, useEffect } from "react"
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
  ListItemAvatar,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Snackbar,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Stack,
  Avatar,
  Chip,
  Card,
  CardContent,
  InputAdornment,
  LinearProgress,
  useMediaQuery,
} from "@mui/material"
import {
  Group as GroupIcon,
  AdminPanelSettings as AdminIcon,
  Email as EmailIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Send as SendIcon,
  ArrowUpward as PromoteIcon,
  ArrowDownward as DemoteIcon,
  RemoveCircle as RemoveIcon,
  ExitToApp as ExitIcon,
  Edit as EditIcon, // Added EditIcon
} from "@mui/icons-material"
import { default as FamilyIcon } from '@mui/icons-material/Groups'
import { useAuth } from "../contexts/AuthContext"
import { db } from "../firebaseConfig"
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
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore"

export default function FamilyPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const { currentUser, userData, loading: authLoading } = useAuth()
  const [familyData, setFamilyData] = useState(null)
  const [membersData, setMembersData] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loadingFamily, setLoadingFamily] = useState(true)
  const [loadingInvitations, setLoadingInvitations] = useState(true)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [createFamilyDialogOpen, setCreateFamilyDialogOpen] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState("")
  const [isCreatingFamily, setIsCreatingFamily] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [isProcessingInvite, setIsProcessingInvite] = useState(null)
  const [isProcessingAction, setIsProcessingAction] = useState(null)
  const [leaveFamilyDialogOpen, setLeaveFamilyDialogOpen] = useState(false)

  // State for dietary restrictions editing
  const [editRestrictionsDialogOpen, setEditRestrictionsDialogOpen] = useState(false)
  const [currentRestrictions, setCurrentRestrictions] = useState([])
  const [newRestrictionInput, setNewRestrictionInput] = useState("")

  const hasFamily = userData?.familyId
  const isFamilyAdmin = hasFamily && userData?.uid === familyData?.adminUid

  useEffect(() => {
    let isMounted = true
    const fetchFamilyData = async () => {
      if (hasFamily) {
        setLoadingFamily(true)
        try {
          const familyDocRef = doc(db, "families", userData.familyId)
          const familySnap = await getDoc(familyDocRef)

          if (isMounted) {
            if (familySnap.exists()) {
              const fetchedFamilyData = { id: familySnap.id, ...familySnap.data() }
              setFamilyData(fetchedFamilyData)
              if (fetchedFamilyData.memberUids && fetchedFamilyData.memberUids.length > 0) {
                const memberPromises = fetchedFamilyData.memberUids.map((uid) => getDoc(doc(db, "users", uid)))
                const memberDocs = await Promise.all(memberPromises)
                const members = memberDocs
                  .map((docSnap) => (docSnap.exists() ? { uid: docSnap.id, ...docSnap.data() } : null))
                  .filter(Boolean)
                setMembersData(members)
              }
            } else {
              setError("Données de la famille introuvables.")
            }
            setLoadingFamily(false)
          }
        } catch (err) {
          console.error("Error fetching family data:", err)
          if (isMounted) {
            setError("Erreur lors de la récupération des données de la famille.")
            setLoadingFamily(false)
          }
        }
      } else {
        if (isMounted) setLoadingFamily(false)
      }
    }

    if (!authLoading && userData) {
      fetchFamilyData()
    }
    return () => {
      isMounted = false
    }
  }, [userData, hasFamily, authLoading])

  useEffect(() => {
    let isMounted = true
    const fetchInvitations = async () => {
      if (currentUser) {
        setLoadingInvitations(true)
        try {
          const invitationsRef = collection(db, "invitations")
          const q = query(
            invitationsRef,
            where("recipientEmail", "==", currentUser.email),
            where("status", "==", "pending"),
          )
          const querySnapshot = await getDocs(q)
          if (isMounted) {
            const fetchedInvitations = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            setInvitations(fetchedInvitations)
            setLoadingInvitations(false)
          }
        } catch (err) {
          console.error("Error fetching invitations:", err)
          if (isMounted) {
            setError("Erreur lors de la récupération des invitations.")
            setLoadingInvitations(false)
          }
        }
      } else {
        if (isMounted) setLoadingInvitations(false)
      }
    }

    if (!authLoading && currentUser) {
      fetchInvitations()
    }
    return () => {
      isMounted = false
    }
  }, [currentUser, authLoading])

  const handleOpenCreateFamilyDialog = () => {
    setNewFamilyName("")
    setError("")
    setCreateFamilyDialogOpen(true)
  }

  const handleCloseCreateFamilyDialog = () => {
    setCreateFamilyDialogOpen(false)
  }

  const handleCreateFamilySubmit = async () => {
    if (!newFamilyName.trim()) {
      setError("Le nom de la famille ne peut pas être vide.")
      return
    }
    if (!currentUser) {
      setError("Utilisateur non connecté.")
      return
    }
    setIsCreatingFamily(true)
    setError("")
    try {
      const batch = writeBatch(db)
      const newFamilyRef = doc(collection(db, "families"))
      const newFamilyData = {
        familyName: newFamilyName.trim(),
        adminUid: currentUser.uid,
        memberUids: [currentUser.uid],
        createdAt: serverTimestamp(),
      }
      batch.set(newFamilyRef, newFamilyData)
      const userDocRef = doc(db, "users", currentUser.uid)
      batch.update(userDocRef, {
        familyId: newFamilyRef.id,
        familyRole: "Admin",
        updatedAt: serverTimestamp(),
      })
      await batch.commit()
      setCreateFamilyDialogOpen(false)
      setSuccessMessage("Famille créée avec succès !")
    } catch (err) {
      console.error("Error creating family:", err)
      setError("Erreur lors de la création de la famille.")
    } finally {
      setIsCreatingFamily(false)
    }
  }

  const handleSendInvitation = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      setError("Veuillez entrer l'email de la personne à inviter.")
      return
    }
    if (!isFamilyAdmin || !familyData) {
      setError("Seul l'admin peut envoyer des invitations.")
      return
    }
    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
      setError("Format d'email invalide.")
      return
    }
    if (inviteEmail === currentUser.email) {
      setError("Vous ne pouvez pas vous inviter vous-même.")
      return
    }
    setIsSendingInvite(true)
    setError("")
    setSuccessMessage("")
    try {
      const invitationsRef = collection(db, "invitations")
      const q = query(
        invitationsRef,
        where("familyId", "==", familyData.id),
        where("recipientEmail", "==", inviteEmail),
        where("status", "==", "pending"),
      )
      const existingInviteSnap = await getDocs(q)
      if (!existingInviteSnap.empty) {
        throw new Error("Une invitation est déjà en attente pour cet email.")
      }
      const batch = writeBatch(db)
      const newInvitationRef = doc(collection(db, "invitations"))
      batch.set(newInvitationRef, {
        familyId: familyData.id,
        familyName: familyData.familyName,
        inviterUid: currentUser.uid,
        inviterName: userData.displayName,
        recipientEmail: inviteEmail.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      })
      const mailRef = doc(collection(db, "mail"))
      batch.set(mailRef, {
        to: [inviteEmail.trim()],
        message: {
          subject: `Invitation à rejoindre la famille ${familyData.familyName} !`,
          html: `Bonjour,<br><br>${userData.displayName} vous invite à rejoindre la famille <strong>${familyData.familyName}</strong> sur notre application de planification de repas.<br><br>Connectez-vous à l'application pour accepter l'invitation.<br><br>À bientôt !`,
        },
      })
      await batch.commit()
      setSuccessMessage(`Invitation envoyée à ${inviteEmail} ! Un email de notification a également été envoyé.`)
      setInviteEmail("")
    } catch (err) {
      console.error("Error sending invitation:", err)
      setError(err.message || "Erreur lors de l'envoi de l'invitation.")
    } finally {
      setIsSendingInvite(false)
    }
  }

  const handleAcceptInvitation = async (invitation) => {
    if (!currentUser || userData?.familyId) {
      setError("Vous ne pouvez pas accepter d'invitation si vous êtes déjà dans une famille ou non connecté.")
      return
    }
    setIsProcessingInvite(invitation.id)
    setError("")
    setSuccessMessage("")
    try {
      const batch = writeBatch(db)
      const invitationRef = doc(db, "invitations", invitation.id)
      batch.update(invitationRef, {
        status: "accepted",
        updatedAt: serverTimestamp(),
      })
      const userDocRef = doc(db, "users", currentUser.uid)
      batch.update(userDocRef, {
        familyId: invitation.familyId,
        familyRole: "Member",
        updatedAt: serverTimestamp(),
      })
      const familyDocRef = doc(db, "families", invitation.familyId)
      batch.update(familyDocRef, {
        memberUids: arrayUnion(currentUser.uid),
      })
      await batch.commit()
      setSuccessMessage(`Vous avez rejoint la famille ${invitation.familyName} !`)
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id))
    } catch (err) {
      console.error("Error accepting invitation:", err)
      setError("Erreur lors de l'acceptation de l'invitation.")
    } finally {
      setIsProcessingInvite(null)
    }
  }

  const handleDeclineInvitation = async (invitationId) => {
    setIsProcessingInvite(invitationId)
    setError("")
    setSuccessMessage("")
    try {
      const invitationRef = doc(db, "invitations", invitationId)
      await updateDoc(invitationRef, {
        status: "declined",
        updatedAt: serverTimestamp(),
      })
      setSuccessMessage("Invitation refusée.")
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))
    } catch (err) {
      console.error("Error declining invitation:", err)
      setError("Erreur lors du refus de l'invitation.")
    } finally {
      setIsProcessingInvite(null)
    }
  }

  const promoteToSecondaryAdmin = async (memberUid) => {
    setIsProcessingAction(memberUid)
    setError("")
    setSuccessMessage("")
    try {
      const userDocRef = doc(db, "users", memberUid)
      await updateDoc(userDocRef, {
        familyRole: "SecondaryAdmin",
        updatedAt: serverTimestamp(),
      })
      setMembersData((prev) =>
        prev.map((m) => (m.uid === memberUid ? { ...m, familyRole: "SecondaryAdmin" } : m))
      )
      setSuccessMessage("Membre promu au rôle d'admin secondaire.")
    } catch (err) {
      console.error("Error promoting member:", err)
      setError("Erreur lors de la promotion du membre.")
    } finally {
      setIsProcessingAction(null)
    }
  }

  const demoteToMember = async (memberUid) => {
    setIsProcessingAction(memberUid)
    setError("")
    setSuccessMessage("")
    try {
      const userDocRef = doc(db, "users", memberUid)
      await updateDoc(userDocRef, {
        familyRole: "Member",
        updatedAt: serverTimestamp(),
      })
      setMembersData((prev) =>
        prev.map((m) => (m.uid === memberUid ? { ...m, familyRole: "Member" } : m))
      )
      setSuccessMessage("Rôle d'admin secondaire retiré.")
    } catch (err) {
      console.error("Error demoting member:", err)
      setError("Erreur lors du retrait du rôle d'admin secondaire.")
    } finally {
      setIsProcessingAction(null)
    }
  }

  const removeMember = async (memberUid) => {
    if (memberUid === currentUser.uid) {
      setError("Vous ne pouvez pas vous retirer vous-même de la famille.")
      return
    }
    setIsProcessingAction(memberUid)
    setError("")
    setSuccessMessage("")
    try {
      const batch = writeBatch(db)
      const familyDocRef = doc(db, "families", familyData.id)
      batch.update(familyDocRef, {
        memberUids: arrayRemove(memberUid),
      })
      const userDocRef = doc(db, "users", memberUid)
      batch.update(userDocRef, {
        familyId: null,
        familyRole: null,
        updatedAt: serverTimestamp(),
      })
      await batch.commit()
      setMembersData((prev) => prev.filter((member) => member.uid !== memberUid))
      setSuccessMessage("Membre retiré de la famille.")
    } catch (err) {
      console.error("Error removing member:", err)
      setError("Erreur lors du retrait du membre.")
    } finally {
      setIsProcessingAction(null)
    }
  }

  const handleLeaveFamily = async () => {
    if (!hasFamily || isFamilyAdmin) {
      setError("Seul un membre non-admin peut quitter la famille.")
      return
    }
    setIsProcessingAction(currentUser.uid)
    setError("")
    setSuccessMessage("")
    try {
      const batch = writeBatch(db)
      const familyDocRef = doc(db, "families", userData.familyId)
      batch.update(familyDocRef, {
        memberUids: arrayRemove(currentUser.uid),
      })
      const userDocRef = doc(db, "users", currentUser.uid)
      batch.update(userDocRef, {
        familyId: null,
        familyRole: null,
        updatedAt: serverTimestamp(),
      })
      await batch.commit()
      setSuccessMessage("Vous avez quitté la famille avec succès.")
      setFamilyData(null)
      setMembersData([])
    } catch (err) {
      console.error("Error leaving family:", err)
      setError("Erreur lors de la tentative de quitter la famille.")
    } finally {
      setIsProcessingAction(null)
      setLeaveFamilyDialogOpen(false)
    }
  }

  const isLoading = authLoading || loadingFamily || loadingInvitations

  const handleCloseSnackbar = () => {
    setSuccessMessage("")
    setError("")
  }

  const handleOpenEditRestrictionsDialog = () => {
    // Ensure userData and its dietaryRestrictions are current from AuthContext for the logged-in user
    setCurrentRestrictions(userData?.dietaryRestrictions ? [...userData.dietaryRestrictions] : [])
    setNewRestrictionInput("")
    setError("") // Clear previous errors from other dialogs
    setEditRestrictionsDialogOpen(true)
  }

  const handleCloseEditRestrictionsDialog = () => {
    setEditRestrictionsDialogOpen(false)
    setNewRestrictionInput("") // Clear input on close
    // setError("") // Might clear errors too soon if needed for a snackbar
  }

  const handleAddRestriction = () => {
    const trimmedInput = newRestrictionInput.trim()
    if (trimmedInput && !currentRestrictions.includes(trimmedInput)) {
      setCurrentRestrictions([...currentRestrictions, trimmedInput])
      setNewRestrictionInput("")
      setError("") // Clear error if restriction was added successfully
    } else if (currentRestrictions.includes(trimmedInput)) {
      setError("Cette restriction existe déjà.") // Specific error for duplicate
    } else if (!trimmedInput) {
      setError("La restriction ne peut pas être vide.")
    }
  }

  const handleDeleteRestriction = (restrictionToDelete) => {
    setCurrentRestrictions(currentRestrictions.filter((r) => r !== restrictionToDelete))
  }

  const handleSaveRestrictions = async () => {
    if (!currentUser) {
      setError("Utilisateur non authentifié.")
      return
    }
    // Using a more specific processing key in case other actions use member UIDs
    const processingKey = `${currentUser.uid}_dietaryRestrictions`;
    setIsProcessingAction(processingKey)
    setError("")
    setSuccessMessage("")
    try {
      const userDocRef = doc(db, "users", currentUser.uid)
      await updateDoc(userDocRef, {
        dietaryRestrictions: currentRestrictions,
        updatedAt: serverTimestamp(),
      })
      setSuccessMessage("Besoins alimentaires mis à jour avec succès !")
      // AuthContext's onSnapshot for userData should pick this up.
      // If membersData state also holds a copy of currentUser's data, it might need manual update here
      // or a refetch, but membersData is typically for *other* members.
      // For the current user, we rely on AuthContext's `userData`.
      setEditRestrictionsDialogOpen(false)
    } catch (err) {
      console.error("Error updating dietary restrictions:", err)
      setError("Erreur lors de la mise à jour des besoins alimentaires.")
    } finally {
      setIsProcessingAction(null) // Reset with the specific key or just null if it's generic
    }
  }

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
        minHeight: "calc(100vh - 64px)",
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Fade in timeout={600}>
          <Box sx={{ mb: 4, textAlign: "center" }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 1,
              }}
            >
              Ma Famille
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Gérez votre groupe familial et partagez vos repas
            </Typography>
          </Box>
        </Fade>

        {isLoading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress
              sx={{
                borderRadius: 2,
                height: 6,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                "& .MuiLinearProgress-bar": {
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                },
              }}
            />
          </Box>
        )}

        {error && !createFamilyDialogOpen && (
          <Fade in>
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              }}
            >
              {error}
            </Alert>
          </Fade>
        )}

        {!isLoading && (
          <Stack spacing={4}>
            {invitations.length > 0 && (
              <Zoom in timeout={800}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 6,
                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.warning.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Typography
                      variant="h5"
                      sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1, fontWeight: 600 }}
                    >
                      <EmailIcon color="warning" />
                      Invitations en attente
                    </Typography>
                    <Stack spacing={2}>
                      {invitations.map((inv, index) => (
                        <Fade in timeout={400 + index * 100} key={inv.id}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 3,
                              borderRadius: 4,
                              background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.warning.main, 0.02)} 100%)`,
                              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                            }}
                          >
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="body1" sx={{ mb: 1 }}>
                                  <strong>{inv.inviterName || "Un membre"}</strong> vous invite à rejoindre la famille{" "}
                                  <strong>{inv.familyName || "inconnue"}</strong>
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1}>
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<CheckIcon />}
                                  onClick={() => handleAcceptInvitation(inv)}
                                  disabled={!!isProcessingInvite || !!userData?.familyId}
                                  sx={{
                                    borderRadius: 3,
                                    background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                                  }}
                                >
                                  {isProcessingInvite === inv.id ? <CircularProgress size={18} /> : "Accepter"}
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<ClearIcon />}
                                  onClick={() => handleDeclineInvitation(inv.id)}
                                  disabled={!!isProcessingInvite}
                                  sx={{ borderRadius: 3 }}
                                >
                                  {isProcessingInvite === inv.id ? <CircularProgress size={18} /> : "Refuser"}
                                </Button>
                              </Stack>
                            </Stack>
                          </Paper>
                        </Fade>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Zoom>
            )}

            {hasFamily && familyData ? (
              <Zoom in timeout={1000}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 6,
                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                      <Avatar
                        sx={{
                          width: isMobile ? 48 : 64,
                          height: isMobile ? 48 : 64,
                          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                          fontSize: isMobile ? "1rem" : "1.5rem",
                        }}
                      >
                        <FamilyIcon sx={{ fontSize: isMobile ? "1.5rem" : "2rem" }} />
                      </Avatar>
                      <Box>
                        <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 700, mb: 0.5 }}>
                          {familyData.familyName}
                        </Typography>
                        <Chip
                          label={`${membersData.length} membre${membersData.length !== 1 ? "s" : ""}`}
                          sx={{
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </Stack>

                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                      Membres de la famille
                    </Typography>
                    {membersData.length > 0 ? (
                      <List disablePadding>
                        {membersData.map((member, index) => (
                          <Fade in timeout={600 + index * 100} key={member.uid}>
                            <ListItem
                              sx={{
                                borderRadius: 3,
                                mb: 1,
                                background: alpha(theme.palette.primary.main, 0.02),
                                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                alignItems: "center",
                                flexDirection: isMobile ? "column" : "row",
                                gap: 2,
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar
                                  src={member.photoURL}
                                  sx={{
                                    width: isMobile ? 40 : 56,
                                    height: isMobile ? 40 : 56,
                                    background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 100%)`,
                                  }}
                                >
                                  {member.displayName?.charAt(0) || member.email?.charAt(0).toUpperCase()}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={member.displayName || "Utilisateur"}
                                secondary={member.email}
                                primaryTypographyProps={{ fontWeight: 600 }}
                                secondary={
                                  <>
                                    {member.email}
                                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      {(member.dietaryRestrictions || []).map((restriction, index) => (
                                        <Chip key={index} label={restriction} size="small" variant="outlined" />
                                      ))}
                                      {(member.dietaryRestrictions?.length === 0 || !member.dietaryRestrictions) && (
                                        <Typography variant="caption" color="textSecondary" sx={{width: '100%'}}>
                                          {currentUser?.uid === member.uid ? "Aucune restriction ajoutée." : "Pas de besoins spécifiques."}
                                        </Typography>
                                      )}
                                    </Box>
                                  </>
                                }
                              />
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: 1, ml: isMobile ? 0 : 'auto', mt: isMobile ? 1 : 0 }}>
                                <Chip
                                  label={member.familyRole || "Membre"}
                                  size="small"
                                color={
                                  member.familyRole === "Admin"
                                    ? "error"
                                    : member.familyRole === "SecondaryAdmin"
                                    ? "warning"
                                    : "default"
                                }
                              />
                              <Stack direction={isMobile ? "column" : "row"} spacing={1} sx={{ mt: isMobile ? 2 : 0 }}>
                                {isFamilyAdmin && member.uid !== currentUser.uid && (
                                  <>
                                    {member.familyRole === "Member" && (
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => promoteToSecondaryAdmin(member.uid)}
                                        disabled={isProcessingAction === member.uid}
                                        startIcon={<PromoteIcon />}
                                      >
                                        Promouvoir
                                      </Button>
                                    )}
                                    {member.familyRole === "SecondaryAdmin" && (
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => demoteToMember(member.uid)}
                                        disabled={isProcessingAction === member.uid}
                                        startIcon={<DemoteIcon />}
                                      >
                                        Rétrograder
                                      </Button>
                                    )}
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      size="small"
                                      onClick={() => removeMember(member.uid)}
                                      disabled={isProcessingAction === member.uid}
                                      startIcon={<RemoveIcon />}
                                    >
                                      Retirer
                                    </Button>
                                  </>
                                )}
                                {!isFamilyAdmin && member.uid === currentUser.uid && (
                                  <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    onClick={() => setLeaveFamilyDialogOpen(true)}
                                    disabled={isProcessingAction === member.uid}
                                    startIcon={<ExitIcon />}
                                  >
                                    Quitter
                                  </Button>
                                )}
                                {currentUser && member.uid === currentUser.uid && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<EditIcon />}
                                    onClick={() => handleOpenEditRestrictionsDialog()} // Placeholder, will be defined in next chunk
                                    sx={{ width: isMobile ? '100%' : 'auto' }}
                                  >
                                    Mes Besoins Alimentaires
                                  </Button>
                                )}
                              </Stack>
                              </Box> {/* End of flex column for chip and buttons */}
                            </ListItem>
                          </Fade>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Chargement des membres...
                      </Typography>
                    )}

                    {isFamilyAdmin && (
                      <Box sx={{ mt: 4 }}>
                        <Divider sx={{ mb: 3 }} />
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                          Inviter un nouveau membre
                        </Typography>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 3,
                            borderRadius: 4,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
                            border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                          }}
                        >
                          <Box component="form" onSubmit={handleSendInvitation}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                              <TextField
                                fullWidth
                                label="Email de l'invité"
                                variant="outlined"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                disabled={isSendingInvite}
                                required
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <EmailIcon color="action" />
                                    </InputAdornment>
                                  ),
                                }}
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: 3,
                                    backgroundColor: theme.palette.background.paper,
                                  },
                                }}
                              />
                              <Button
                                type="submit"
                                variant="contained"
                                disabled={isSendingInvite || !inviteEmail.trim()}
                                startIcon={isSendingInvite ? <CircularProgress size={20} /> : <SendIcon />}
                                sx={{
                                  borderRadius: 3,
                                  px: 3,
                                  background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Envoyer
                              </Button>
                            </Stack>
                          </Box>
                        </Paper>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Zoom>
            ) : (
              <Zoom in timeout={1000}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 6,
                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    textAlign: "center",
                  }}
                >
                  <CardContent sx={{ p: 6 }}>
                    <Avatar
                      sx={{
                        width: isMobile ? 80 : 120,
                        height: isMobile ? 80 : 120,
                        mx: "auto",
                        mb: 3,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        fontSize: isMobile ? "2rem" : "3rem",
                      }}
                    >
                      <GroupIcon sx={{ fontSize: isMobile ? "2.5rem" : "4rem" }} />
                    </Avatar>
                    {!userData?.familyId && invitations.length === 0 && (
                      <>
                        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                          Créez votre famille
                        </Typography>
                        <Typography
                          variant="body1"
                          color="text.secondary"
                          sx={{ mb: 4, maxWidth: "400px", mx: "auto" }}
                        >
                          Vous n'appartenez actuellement à aucune famille. Créez votre groupe familial pour commencer à
                          partager vos recettes et planifier vos repas ensemble.
                        </Typography>
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<AddIcon />}
                          onClick={handleOpenCreateFamilyDialog}
                          sx={{
                            borderRadius: 4,
                            px: 4,
                            py: 1.5,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
                            "&:hover": {
                              transform: "translateY(-2px)",
                              boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.4)}`,
                            },
                            transition: "all 0.3s ease",
                          }}
                        >
                          Créer une famille
                        </Button>
                      </>
                    )}
                    {!userData?.familyId && invitations.length > 0 && (
                      <>
                        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                          En attente d'invitation
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Vous avez des invitations en attente ci-dessus. Acceptez une invitation pour rejoindre une
                          famille ou créez votre propre groupe familial.
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Zoom>
            )}
          </Stack>
        )}

        <Dialog
          open={createFamilyDialogOpen}
          onClose={handleCloseCreateFamilyDialog}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              borderRadius: 6,
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
              backdropFilter: "blur(20px)",
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.2)}`,
            },
          }}
          BackdropProps={{
            sx: {
              backgroundColor: alpha(theme.palette.common.black, 0.7),
              backdropFilter: "blur(8px)",
            },
          }}
        >
          <DialogTitle
            sx={{
              pb: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  width: isMobile ? 40 : 56,
                  height: isMobile ? 40 : 56,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                }}
              >
                <FamilyIcon sx={{ fontSize: isMobile ? "1.2rem" : "1.5rem" }} />
              </Avatar>
              <Box>
                <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 700 }}>
                  Créer une nouvelle famille
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Donnez un nom à votre groupe familial
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>

          <DialogContent sx={{ p: 4 }}>
            <DialogContentText sx={{ mb: 3 }}>
              Entrez le nom que vous souhaitez donner à votre groupe familial. Vous pourrez ensuite inviter d'autres
              membres à vous rejoindre.
            </DialogContentText>
            {error && createFamilyDialogOpen && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                }}
              >
                {error}
              </Alert>
            )}
            <TextField
              autoFocus
              fullWidth
              id="familyName"
              label="Nom de la famille"
              placeholder="ex: Famille Dupont, Les Gourmets..."
              variant="outlined"
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              disabled={isCreatingFamily}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <GroupIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.primary.main,
                    borderWidth: "2px",
                  },
                },
              }}
            />
          </DialogContent>

          <DialogActions
            sx={{
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              gap: 2,
            }}
          >
            <Button
              onClick={handleCloseCreateFamilyDialog}
              disabled={isCreatingFamily}
              variant="outlined"
              sx={{
                borderRadius: 3,
                px: 3,
                borderColor: alpha(theme.palette.primary.main, 0.3),
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateFamilySubmit}
              variant="contained"
              disabled={isCreatingFamily || !newFamilyName.trim()}
              startIcon={isCreatingFamily ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
              sx={{
                borderRadius: 3,
                px: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                },
                "&:disabled": {
                  background: alpha(theme.palette.action.disabled, 0.12),
                },
                transition: "all 0.3s ease",
              }}
            >
              {isCreatingFamily ? "Création..." : "Créer"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={leaveFamilyDialogOpen}
          onClose={() => setLeaveFamilyDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              borderRadius: 6,
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
              backdropFilter: "blur(20px)",
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.2)}`,
            },
          }}
          BackdropProps={{
            sx: {
              backgroundColor: alpha(theme.palette.common.black, 0.7),
              backdropFilter: "blur(8px)",
            },
          }}
        >
          <DialogTitle
            sx={{
              pb: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            Quitter la famille
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <DialogContentText sx={{ mb: 3 }}>
              Êtes-vous sûr de vouloir quitter la famille <strong>{familyData?.familyName}</strong> ? 
              Cette action est irréversible et vous devrez être invité à nouveau pour rejoindre.
            </DialogContentText>
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                }}
              >
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              gap: 2,
            }}
          >
            <Button
              onClick={() => setLeaveFamilyDialogOpen(false)}
              disabled={isProcessingAction}
              variant="outlined"
              sx={{
                borderRadius: 3,
                px: 3,
                borderColor: alpha(theme.palette.primary.main, 0.3),
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleLeaveFamily}
              variant="contained"
              color="error"
              disabled={isProcessingAction}
              startIcon={isProcessingAction ? <CircularProgress size={20} color="inherit" /> : <ExitIcon />}
              sx={{
                borderRadius: 3,
                px: 3,
                boxShadow: `0 4px 20px ${alpha(theme.palette.error.main, 0.3)}`,
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: `0 6px 25px ${alpha(theme.palette.error.main, 0.4)}`,
                },
                transition: "all 0.3s ease",
              }}
            >
              Quitter
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dietary Restrictions Dialog */}
        <Dialog
          open={editRestrictionsDialogOpen}
          onClose={handleCloseEditRestrictionsDialog}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              borderRadius: isMobile ? 0 : 6, // Full screen on mobile means no border radius needed at the dialog level
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            },
          }}
          BackdropProps={{ // Added for consistency with other dialogs
            sx: {
              backgroundColor: alpha(theme.palette.common.black, 0.7),
              backdropFilter: "blur(8px)",
            },
          }}
        >
          <DialogTitle
            sx={{
              pb: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`}}>
                <EditIcon sx={{color: theme.palette.primary.contrastText}}/>
              </Avatar>
              <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 700 }}>
                Modifier mes Besoins Alimentaires
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ p: isMobile ? 2 : 3, mt: 2 }}>
            {error && editRestrictionsDialogOpen && ( // Show error only if this dialog is open
               <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Listez ici vos allergies, intolérances, ou régimes spécifiques (ex: Végétarien, Sans gluten, Allergie aux noix).
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Ajouter une restriction"
                variant="outlined"
                value={newRestrictionInput}
                onChange={(e) => { setNewRestrictionInput(e.target.value); setError(""); }} // Clear error on input change
                onKeyPress={(e) => { if (e.key === 'Enter') { handleAddRestriction(); e.preventDefault(); } }}
                disabled={isProcessingAction === `${currentUser?.uid}_dietaryRestrictions`}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
              <Button
                onClick={handleAddRestriction}
                variant="contained"
                disabled={isProcessingAction === `${currentUser?.uid}_dietaryRestrictions` || !newRestrictionInput.trim()}
                sx={{ borderRadius: 3, px:3, whiteSpace: 'nowrap' }}
              >
                Ajouter
              </Button>
            </Stack>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2, p: currentRestrictions.length > 0 ? 1 : 0,  minHeight: currentRestrictions.length > 0 ? 'auto' : '40px', alignItems: 'center', justifyContent: currentRestrictions.length === 0 ? 'center' : 'flex-start', backgroundColor: currentRestrictions.length > 0 ? alpha(theme.palette.primary.main, 0.05) : 'transparent', borderRadius: 2 }}>
              {currentRestrictions.map((restriction, index) => (
                <Fade in timeout={300} key={index}>
                  <Chip
                    label={restriction}
                    onDelete={() => handleDeleteRestriction(restriction)}
                    disabled={isProcessingAction === `${currentUser?.uid}_dietaryRestrictions`}
                    color="primary"
                    sx={{ fontWeight: 500 }}
                  />
                </Fade>
              ))}
              {currentRestrictions.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Aucune restriction pour le moment.
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              p: isMobile ? 2 : 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              gap: 2,
            }}
          >
            <Button
              onClick={handleCloseEditRestrictionsDialog}
              disabled={isProcessingAction === `${currentUser?.uid}_dietaryRestrictions`}
              variant="outlined"
              sx={{ borderRadius: 3, px: 3 }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveRestrictions}
              variant="contained"
              color="primary"
              disabled={isProcessingAction === `${currentUser?.uid}_dietaryRestrictions` || currentRestrictions.length === (userData?.dietaryRestrictions || []).length && currentRestrictions.every(val => (userData?.dietaryRestrictions || []).includes(val))}
              startIcon={isProcessingAction === `${currentUser?.uid}_dietaryRestrictions` ? <CircularProgress size={20} color="inherit" /> : <CheckIcon />}
              sx={{ borderRadius: 3, px: 3 }}
            >
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={!!successMessage || (!!error && !createFamilyDialogOpen && !leaveFamilyDialogOpen && !editRestrictionsDialogOpen)}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={successMessage ? "success" : "error"}
            sx={{
              width: "100%",
              borderRadius: 3,
              background: successMessage
                ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.9)} 0%, ${theme.palette.success.dark} 100%)`
                : `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.9)} 0%, ${theme.palette.error.dark} 100%)`,
              color: "white",
              "& .MuiAlert-icon": {
                color: "white",
              },
            }}
            variant="filled"
          >
            {successMessage || error}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  )
}
