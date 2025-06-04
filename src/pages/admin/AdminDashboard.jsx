"use client"

import { useState, useEffect } from "react"
import {
  Container,
  Box,
  Typography,
  Paper, // Keep for other potential dashboard elements
  Grid,
  Card,
  CardContent,
  // Button, // Removed if not used by other elements
  // Chip, // Removed if not used by other elements
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Stack,
  Avatar,
  // IconButton, // Removed as vendor actions are gone
  // Menu, // Removed
  // MenuItem, // Removed
  // Dialog, // Removed
  // DialogTitle, // Removed
  // DialogContent, // Removed
  // DialogActions, // Removed
  // Drawer, // Removed: Handled by AdminLayout
  // List, // Removed: Handled by AdminLayout
  // ListItem, // Removed: Handled by AdminLayout
  // ListItemButton, // Removed: Handled by AdminLayout
  // ListItemIcon, // Removed: Handled by AdminLayout
  // ListItemText, // Removed: Handled by AdminLayout
  // Toolbar, // Removed: Handled by AdminLayout or not needed
} from "@mui/material"
import {
  AdminPanelSettings as AdminIcon,
  People as PeopleIcon,
  Store as StoreIcon, // Still used for Stats
  LocalShipping as DeliveryIcon,
  // MoreVert as MoreVertIcon, // Removed
  // CheckCircle as ApproveIcon, // Removed
  // Cancel as RejectIcon, // Removed
  // Dashboard as DashboardIcon, // Removed: Handled by AdminLayout
  // ListAlt as ListAltIcon, // Removed: Handled by AdminLayout
  // Group as GroupIcon,
  // Fastfood as FastfoodIcon,
} from "@mui/icons-material"
// import { Link as RouterLink } from "react-router-dom" // Removed: Handled by AdminLayout if Link was only for Drawer
import { db } from "../../firebaseConfig"
import { collection, getDocs } from "firebase/firestore" // Removed doc, updateDoc, deleteDoc
import AdminLayout from "../../components/AdminLayout.jsx" // Added AdminLayout import

function AdminDashboard() {
  const theme = useTheme()
  // const drawerWidth = 240 // Removed: Handled by AdminLayout

  const [vendors, setVendors] = useState([]) // Still needed for stats
  const [deliveries, setDeliveries] = useState([]) // Assuming this is for a "Recent Deliveries" stat or similar
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  // Removed state related to vendor actions menu and dialog:
  // const [anchorEl, setAnchorEl] = useState(null)
  // const [selectedVendor, setSelectedVendor] = useState(null)
  // const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, vendor: null })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    setError("")
    try {
      // Fetch vendors for statistics
      const vendorsSnapshot = await getDocs(collection(db, "vendors"))
      const vendorsData = vendorsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setVendors(vendorsData)

      // Fetch recent deliveries (example, if dashboard shows this)
      const deliveriesSnapshot = await getDocs(collection(db, "deliveryRequests")) // Or your actual deliveries collection
      const deliveriesData = deliveriesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setDeliveries(deliveriesData.slice(0, 10)) // Example: last 10 deliveries for a summary
    } catch (err) {
      console.error("Erreur lors du chargement des données du tableau de bord:", err)
      setError("Erreur lors du chargement des données du tableau de bord.")
    } finally {
      setIsLoading(false)
    }
  }

  // Removed handleMenuClick, handleMenuClose, handleVendorAction, openConfirmDialog

  const stats = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter((v) => v.isActive).length,
    pendingVendors: vendors.filter((v) => !v.isApproved).length,
    // Assuming deliveries state is used for a stat like "Recent Deliveries Count"
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

  // const drawerItems = [...] // Removed: Handled by AdminLayout

  return (
    <AdminLayout>
      {/* Original Container content starts here, adjusted for new layout */}
      {/* The main Box wrapper and Toolbar spacer are removed, AdminLayout handles structure */}
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}> {/* Adjusted padding */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1, display: "flex", alignItems: "center" }}>
            <AdminIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
              Tableau de bord Admin
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Vue d'ensemble et statistiques clés.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
              {error}
            </Alert>
          )}

          {/* Statistiques */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Total Vendors Stat Card */}
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
                        Vendeurs Enregistrés
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Active Vendors Stat Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                      <PeopleIcon /> {/* Changed to PeopleIcon for variety from StoreIcon */}
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        {stats.activeVendors}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vendeurs Actifs
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Pending Vendors Stat Card */}
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
                        Vendeurs en Attente
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Deliveries Stat Card - Example */}
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
                        Livraisons Récentes
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Placeholder for other dashboard elements like recent activities, charts, etc. */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Autres Informations
          </Typography>
          <Paper elevation={0} sx={{ p:3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 2}}>
            <Typography color="text.secondary">
              D'autres modules et visualisations de données seront ajoutés ici.
            </Typography>
          </Paper>

          {/* Vendor list and related menu/dialogs are REMOVED from here */}

        </Container>
    </AdminLayout>
  )
}

export default AdminDashboard
