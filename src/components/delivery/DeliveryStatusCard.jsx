"use client"
import { Card, CardContent, Typography, Box, Chip, Divider, useTheme, alpha, Button } from "@mui/material"
import { LocalShipping, AccessTime, CheckCircle, Cancel, LocationOn } from "@mui/icons-material"

function DeliveryStatusCard({ delivery, vendor, onTrack, onCancel }) {
  const theme = useTheme()

  const getStatusChip = (status) => {
    switch (status) {
      case "pending":
        return <Chip label="En attente" color="warning" size="small" icon={<AccessTime fontSize="small" />} />
      case "accepted":
        return <Chip label="Acceptée" color="info" size="small" />
      case "shopping":
        return <Chip label="Achats en cours" color="info" size="small" />
      case "delivering":
        return <Chip label="En livraison" color="primary" size="small" />
      case "delivered":
        return <Chip label="Livrée" color="success" size="small" icon={<CheckCircle fontSize="small" />} />
      case "cancelled":
        return <Chip label="Annulée" color="error" size="small" icon={<Cancel fontSize="small" />} />
      default:
        return <Chip label={status} size="small" />
    }
  }

  const formatDate = (dateString, timeString) => {
    if (!dateString) return "Date non spécifiée"
    return `${dateString} à ${timeString || ""}`
  }

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <LocalShipping sx={{ mr: 1, color: theme.palette.secondary.main }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              Livraison
            </Typography>
          </Box>
          {getStatusChip(delivery.status)}
        </Box>

        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
          <LocationOn sx={{ mr: 1, color: "text.secondary", mt: 0.5 }} />
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Adresse
            </Typography>
            <Typography>{delivery.deliveryAddress}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
          <AccessTime sx={{ mr: 1, color: "text.secondary", mt: 0.5 }} />
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Date et heure demandées
            </Typography>
            <Typography>{formatDate(delivery.requestedDate, delivery.requestedTime)}</Typography>
          </Box>
        </Box>

        {vendor && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              Vendeur
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box sx={{ mr: 2 }}>
                <Typography variant="body1">{vendor.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {vendor.phone}
                </Typography>
              </Box>
            </Box>
          </>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Total
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
            {((delivery.totalCost || 0) + (delivery.deliveryFee || 0)).toLocaleString("fr-FR", {
              style: "currency",
              currency: "XAF",
            })}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
          {delivery.status === "pending" && (
            <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button variant="contained" onClick={onTrack} sx={{ ml: "auto" }}>
            Suivre
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

export default DeliveryStatusCard
