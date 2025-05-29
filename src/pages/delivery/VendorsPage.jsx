"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material"
import { Search, Person, Refresh } from "@mui/icons-material"
import { useAuth } from "../../contexts/AuthContext"
import { db } from "../../firebaseConfig"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import VendorCard from "../../components/delivery/VendorCard"

function VendorsPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { currentUser, userData } = useAuth()

  const [vendors, setVendors] = useState([])
  const [filteredVendors, setFilteredVendors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState("")
  const [selectedZone, setSelectedZone] = useState("")
  const [sortBy, setSortBy] = useState("rating")

  // Listes pour les filtres
  const [specialties, setSpecialties] = useState([])
  const [deliveryZones, setDeliveryZones] = useState([])

  useEffect(() => {
    fetchVendors()
  }, [])

  useEffect(() => {
    filterAndSortVendors()
  }, [vendors, searchTerm, selectedSpecialty, selectedZone, sortBy])

  const fetchVendors = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const vendorsRef = collection(db, "vendors")
      const q = query(vendorsRef, where("isActive", "==", true), orderBy("rating", "desc"))
      const querySnapshot = await getDocs(q)

      const vendorsData = []
      const allSpecialties = new Set()
      const allZones = new Set()

      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() }
        vendorsData.push(data)

        // Collecter les spécialités et zones pour les filtres
        if (data.specialties) {
          data.specialties.forEach((specialty) => allSpecialties.add(specialty))
        }
        if (data.deliveryZones) {
          data.deliveryZones.forEach((zone) => allZones.add(zone))
        }
      })

      setVendors(vendorsData)
      setSpecialties(Array.from(allSpecialties).sort())
      setDeliveryZones(Array.from(allZones).sort())
    } catch (err) {
      console.error("Erreur lors du chargement des vendeurs:", err)
      setError("Erreur lors du chargement des vendeurs. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortVendors = () => {
    let filtered = [...vendors]

    // Filtrer par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (vendor) =>
          vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (vendor.specialties && vendor.specialties.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))),
      )
    }

    // Filtrer par spécialité
    if (selectedSpecialty) {
      filtered = filtered.filter((vendor) => vendor.specialties && vendor.specialties.includes(selectedSpecialty))
    }

    // Filtrer par zone de livraison
    if (selectedZone) {
      filtered = filtered.filter((vendor) => vendor.deliveryZones && vendor.deliveryZones.includes(selectedZone))
    }

    // Trier
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return (b.rating || 0) - (a.rating || 0)
        case "name":
          return a.name.localeCompare(b.name)
        case "price":
          return (a.baseFee || 0) - (b.baseFee || 0)
        default:
          return 0
      }
    })

    setFilteredVendors(filtered)
  }

  const handleVendorSelect = (vendor) => {
    navigate(`/vendors/${vendor.id}`)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedSpecialty("")
    setSelectedZone("")
    setSortBy("rating")
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement des vendeurs...</Typography>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button startIcon={<Refresh />} onClick={fetchVendors}>
          Réessayer
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: "bold", display: "flex", alignItems: "center" }}
        >
          <Person sx={{ mr: 1 }} />
          Nos Bayam Selam
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Découvrez nos vendeurs partenaires et choisissez celui qui vous convient le mieux.
        </Typography>
      </Box>

      {/* Filtres et recherche */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Rechercher un vendeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Spécialité</InputLabel>
              <Select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                label="Spécialité"
              >
                <MenuItem value="">Toutes</MenuItem>
                {specialties.map((specialty) => (
                  <MenuItem key={specialty} value={specialty}>
                    {specialty}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Zone</InputLabel>
              <Select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} label="Zone">
                <MenuItem value="">Toutes</MenuItem>
                {deliveryZones.map((zone) => (
                  <MenuItem key={zone} value={zone}>
                    {zone}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Trier par</InputLabel>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Trier par">
                <MenuItem value="rating">Note</MenuItem>
                <MenuItem value="name">Nom</MenuItem>
                <MenuItem value="price">Prix</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" onClick={clearFilters} sx={{ height: 56 }}>
              Effacer
            </Button>
          </Grid>
        </Grid>

        {/* Filtres actifs */}
        {(searchTerm || selectedSpecialty || selectedZone) && (
          <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {searchTerm && <Chip label={`Recherche: ${searchTerm}`} onDelete={() => setSearchTerm("")} size="small" />}
            {selectedSpecialty && (
              <Chip label={`Spécialité: ${selectedSpecialty}`} onDelete={() => setSelectedSpecialty("")} size="small" />
            )}
            {selectedZone && <Chip label={`Zone: ${selectedZone}`} onDelete={() => setSelectedZone("")} size="small" />}
          </Box>
        )}
      </Paper>

      {/* Résultats */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {filteredVendors.length} vendeur{filteredVendors.length > 1 ? "s" : ""} trouvé
          {filteredVendors.length > 1 ? "s" : ""}
        </Typography>
      </Box>

      {filteredVendors.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Person sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucun vendeur trouvé
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Essayez de modifier vos critères de recherche.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredVendors.map((vendor) => (
            <Grid item xs={12} sm={6} md={4} key={vendor.id}>
              <VendorCard vendor={vendor} onClick={() => handleVendorSelect(vendor)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  )
}

export default VendorsPage
