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
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Stack,
  Avatar,
  Fade,
} from "@mui/material"
import {
  AdminPanelSettings as AdminIcon,
  People as PeopleIcon,
  Store as StoreIcon,
  LocalShipping as DeliveryIcon,
} from "@mui/icons-material"
import { db } from "../../firebaseConfig"
import { collection, getDocs } from "firebase/firestore"
import AdminLayout from "../../components/AdminLayout.jsx"

function AdminDashboard() {
  const theme = useTheme()
  const [vendors, setVendors] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    setError("")
    try {
      const vendorsSnapshot = await getDocs(collection(db, "vendors"))
      const vendorsData = vendorsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setVendors(vendorsData)

      const deliveriesSnapshot = await getDocs(collection(db, "deliveryRequests"))
      const deliveriesData = deliveriesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setDeliveries(deliveriesData.slice(0, 10))
    } catch (err) {
      console.error("Erreur lors du chargement des données du tableau de bord:", err)
      setError("Erreur lors du chargement des données du tableau de bord.")
    } finally {
      setIsLoading(false)
    }
  }

  const stats = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter((v) => v.isActive).length,
    pendingVendors: vendors.filter((v) => !v.isApproved).length,
    totalDeliveries: deliveries.length,
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement du tableau de bord...</Typography>
      </Container>
    )
  }

  return (
    <AdminLayout>
      <Fade in={true} timeout={600}>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
          <Box sx={{ mb: { xs: 2, sm: 4 } }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 600,
                mb: 1,
                display: "flex",
                alignItems: "center",
                fontSize: { xs: "1.5rem", sm: "2.125rem" }, // Responsive font size
              }}
            >
              <AdminIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: { xs: "2rem", sm: "2.5rem" } }} />
              Tableau de bord Admin
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
              Vue d'ensemble et statistiques clés.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
              {error}
            </Alert>
          )}

          {/* Statistiques avec grille responsive */}
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }}>
                    <Avatar sx={{ bgcolor: theme.palette.primary.main, width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
                      <StoreIcon fontSize="large" />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: "1.5rem", sm: "2rem" } }}>
                        {stats.totalVendors}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        Vendeurs Enregistrés
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }}>
                    <Avatar sx={{ bgcolor: theme.palette.success.main, width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
                      <PeopleIcon fontSize="large" />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: "1.5rem", sm: "2rem" } }}>
                        {stats.activeVendors}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        Vendeurs Actifs
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }}>
                    <Avatar sx={{ bgcolor: theme.palette.warning.main, width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
                      <StoreIcon fontSize="large" />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: "1.5rem", sm: "2rem" } }}>
                        {stats.pendingVendors}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        Vendeurs en Attente
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }}>
                    <Avatar sx={{ bgcolor: theme.palette.info.main, width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
                      <DeliveryIcon fontSize="large" />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: "1.5rem", sm: "2rem" } }}>
                        {stats.totalDeliveries}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        Livraisons Récentes
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
            Autres Informations
          </Typography>
          <Paper sx={{ p: 3, borderRadius: theme.shape.borderRadius * 2 }}>
            <Typography color="text.secondary" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
              D'autres modules et visualisations de données seront ajoutés ici.
            </Typography>
          </Paper>
        </Container>
      </Fade>
    </AdminLayout>
  )
}

export default AdminDashboard