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
} from "@mui/material"
import {
  Group as GroupIcon,
  AdminPanelSettings as AdminIcon,
  Email as EmailIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Family as FamilyIcon,
  Send as SendIcon,
} from "@mui/icons-material"
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
} from "firebase/firestore"

export default function FamilyPage() {
  const theme = useTheme()
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

  const hasFamily = userData?.familyId
  const isFamilyAdmin = hasFamily && userData?.uid === familyData?.adminUid

  // Fetch Family Data
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

  // Fetch Invitations
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

  // Create Family Logic
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

  // Send Invitation Logic
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
      await addDoc(invitationsRef, {
        familyId: familyData.id,
        familyName: familyData.familyName,
        inviterUid: currentUser.uid,
        inviterName: userData.displayName,
        recipientEmail: inviteEmail.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      })
      setSuccessMessage(`Invitation envoyée à ${inviteEmail} !`)
      setInviteEmail("")
    } catch (err) {
      console.error("Error sending invitation:", err)
      setError(err.message || "Erreur lors de l'envoi de l'invitation.")
    } finally {
      setIsSendingInvite(false)
    }
  }

  // Accept Invitation Logic
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

  // Decline Invitation Logic
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

  const isLoading = authLoading || loadingFamily || loadingInvitations

  const handleCloseSnackbar = () => {
    setSuccessMessage("")
    setError("")
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
        {/* Header */}
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

        {/* Loading */}
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

        {/* Error Alert */}
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
            {/* Invitations Section */}
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

            {/* Family Info or Create Section */}
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
                    {/* Family Header */}
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                          fontSize: "1.5rem",
                        }}
                      >
                        <FamilyIcon sx={{ fontSize: "2rem" }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
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

                    {/* Members List */}
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
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar
                                  src={member.photoURL}
                                  sx={{
                                    background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 100%)`,
                                  }}
                                >
                                  {member.displayName?.charAt(0) || member.email?.charAt(0).toUpperCase()}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {member.displayName || "Utilisateur"}
                                  </Typography>
                                }
                                secondary={member.email}
                              />
                              {member.uid === familyData.adminUid && (
                                <Chip
                                  icon={<AdminIcon />}
                                  label="Admin"
                                  size="small"
                                  sx={{
                                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                                    color: theme.palette.error.main,
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                            </ListItem>
                          </Fade>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Chargement des membres...
                      </Typography>
                    )}

                    {/* Send Invitation Form (Admin only) */}
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
              // Create Family Section
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
                        width: 120,
                        height: 120,
                        mx: "auto",
                        mb: 3,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        fontSize: "3rem",
                      }}
                    >
                      <GroupIcon sx={{ fontSize: "4rem" }} />
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

        {/* Create Family Dialog */}
        <Dialog
          open={createFamilyDialogOpen}
          onClose={handleCloseCreateFamilyDialog}
          maxWidth="sm"
          fullWidth
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
                  width: 56,
                  height: 56,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                }}
              >
                <FamilyIcon sx={{ fontSize: "1.5rem" }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
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

        {/* Snackbar for Success/Error Messages */}
        <Snackbar
          open={!!successMessage || (!!error && !createFamilyDialogOpen)}
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
