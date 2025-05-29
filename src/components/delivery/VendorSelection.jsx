"use client"
import { Grid, Typography, Box, useTheme } from "@mui/material"
import VendorCard from "./VendorCard"

function VendorSelection({ vendors, onSelect, selected }) {
  const theme = useTheme()

  if (vendors.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography color="text.secondary">
          Aucun vendeur disponible pour le moment. Veuillez réessayer plus tard.
        </Typography>
      </Box>
    )
  }

  return (
    <Grid container spacing={2}>
      {vendors.map((vendor) => (
        <Grid item xs={12} sm={6} key={vendor.id}>
          <VendorCard vendor={vendor} onClick={onSelect} selected={selected && selected.id === vendor.id} />
        </Grid>
      ))}
    </Grid>
  )
}

export default VendorSelection
