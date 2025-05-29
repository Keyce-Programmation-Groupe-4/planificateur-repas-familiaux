"use client"

import { useState, useEffect } from "react"
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Stack,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material"
import {
  AdminPanelSettings as AdminIcon,
  People as PeopleIcon,
  Store as StoreIcon,
  LocalShipping as DeliveryIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
} from "@mui/icons-material"
import { db } from "../../firebaseConfig"
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"

function AdminDashboard() {
  const theme = useTheme()
  const [vendors, setVendors] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, vendor: null })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    setError("")

    try {
      // Fetch vendors
      const vendorsSnapshot = await getDocs(collection(db, "vendors"))
      const vendorsData = vendorsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setVendors(vendorsData)

      // Fetch recent deliveries
      const deliveriesSnapshot = await getDocs(collection(db, "deliveryRequests"))
      const deliveriesData = deliveriesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setDeliveries(deliveriesData.slice(0, 10)) // Last 10 deliveries
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err)
      setError("Erreur lors du chargement des données.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMenuClick = (event, vendor) => {
    setAnchorEl(event.currentTarget)
    setSelectedVendor(vendor)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedVendor(null)
  }

  const handleVendorAction = async (action, vendor) => {
    setConfirmDialog({ open: false, action: null, vendor: null })
    handleMenuClose()

    try {
      const vendorRef = doc(db, "vendors", vendor.id)

      switch (action) {
        case "approve":
          await updateDoc(vendorRef, { isApproved: true, isActive: true })
          break
        case "reject":
          await updateDoc(vendorRef, { isApproved: false, isActive: false })
          break
        case "activate":
          await updateDoc(vendorRef, { isActive: true })
          break
        case "deactivate":
          await updateDoc(vendorRef, { isActive: false })
          break
        case "delete":
          await deleteDoc(vendorRef)
          break
      }

      fetchData() // Refresh data
    } catch (err) {
      console.error("Erreur lors de l'action sur le vendeur:", err)
      setError("Erreur lors de l'action sur le vendeur.")
    }
  }

  const openConfirmDialog = (action, vendor) => {
    setConfirmDialog({ open: true, action, vendor })
    handleMenuClose()
  }

  const stats = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter((v) => v.isActive).length,
    pendingVendors: vendors.filter((v) => !v.isApproved).length,
    totalDeliveries: deliveries.length,
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement du tableau de bord...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1, display: "flex", alignItems: "center" }}>
          <AdminIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
          Tableau de bord Admin
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gérez les vendeurs et surveillez les livraisons
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <StoreIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stats.totalVendors}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vendeurs total
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                  <PeopleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stats.activeVendors}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vendeurs actifs
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                  <StoreIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stats.pendingVendors}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    En attente
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                  <DeliveryIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stats.totalDeliveries}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Livraisons
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Liste des vendeurs */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          Gestion des vendeurs
        </Typography>

        <Grid container spacing={2}>
          {vendors.map((vendor) => (
            <Grid item xs={12} sm={6} md={4} key={vendor.id}>
              <Card
                elevation={0}
                sx={{
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  borderRadius: 3,
                  position: "relative",
                }}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {vendor.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {vendor.phone}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <Chip
                          label={vendor.isActive ? "Actif" : "Inactif"}
                          color={vendor.isActive ? "success" : "default"}
                          size="small"
                        />
                        <Chip
                          label={vendor.isApproved ? "Approuvé" : "En attente"}
                          color={vendor.isApproved ? "primary" : "warning"}
                          size="small"
                        />
                      </Stack>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {vendor.baseFee?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })}
                      </Typography>
                    </Box>
                    <IconButton onClick={(e) => handleMenuClick(e, vendor)}>
                      <MoreVertIcon />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Menu contextuel */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {selectedVendor && !selectedVendor.isApproved && (
          <MenuItem onClick={() => openConfirmDialog("approve", selectedVendor)}>
            <ApproveIcon sx={{ mr: 1 }} />
            Approuver
          </MenuItem>
        )}
        {selectedVendor && selectedVendor.isApproved && (
          <MenuItem onClick={() => openConfirmDialog("reject", selectedVendor)}>
            <RejectIcon sx={{ mr: 1 }} />
            Rejeter
          </MenuItem>
        )}
        {selectedVendor && selectedVendor.isActive ? (
          <MenuItem onClick={() => openConfirmDialog("deactivate", selectedVendor)}>
            <RejectIcon sx={{ mr: 1 }} />
            Désactiver
          </MenuItem>
        ) : (
          <MenuItem onClick={() => openConfirmDialog("activate", selectedVendor)}>
            <ApproveIcon sx={{ mr: 1 }} />
            Activer
          </MenuItem>
        )}
        <MenuItem onClick={() => openConfirmDialog("delete", selectedVendor)}>
          <RejectIcon sx={{ mr: 1 }} />
          Supprimer
        </MenuItem>
      </Menu>

      {/* Dialog de confirmation */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null, vendor: null })}>
        <DialogTitle>Confirmer l'action</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir {confirmDialog.action} le vendeur "{confirmDialog.vendor?.name}" ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null, vendor: null })}>Annuler</Button>
          <Button
            onClick={() => handleVendorAction(confirmDialog.action, confirmDialog.vendor)}
            color="primary"
            variant="contained"
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default AdminDashboard
