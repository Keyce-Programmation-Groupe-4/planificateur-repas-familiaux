"use client"
import { Card, CardContent, Typography, Box, Chip, Divider, useTheme, alpha, Button } from "@mui/material"
import { LocalShipping, AccessTime, CheckCircle, Cancel, LocationOn } from "@mui/icons-material"
import { getDeliveryStatusByKey, DELIVERY_STATUSES } from "../../config/deliveryStatuses" // Added import

function DeliveryStatusCard({ delivery, vendor, onTrack, onCancel }) {
  const theme = useTheme()

  const getStatusChip = (statusKey) => {
    const statusConfig = getDeliveryStatusByKey(statusKey);
    let icon = null;
    // Optionally add icons based on statusConfig or statusKey if desired
    if (statusKey === DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key) icon = <AccessTime fontSize="small" />;
    else if (statusKey === DELIVERY_STATUSES.DELIVERED.key) icon = <CheckCircle fontSize="small" />;
    else if (statusKey && statusKey.startsWith("cancelled")) icon = <Cancel fontSize="small" />;


    if (statusConfig) {
      return <Chip label={statusConfig.userLabel || statusConfig.label} color={statusConfig.color} size="small" icon={icon} />;
    }
    // Fallback for unknown statuses
    return <Chip label={statusKey || "Inconnu"} size="small" />;
  }

  const formatDate = (dateString, timeString) => {
    if (!dateString) return "Date non spécifiée"
    return `${dateString} à ${timeString || ""}`
  }

  let displayedTotalValue = 0;
  let totalLabel = "Total"; // Default label

  if (delivery) { // Ensure delivery object exists
    switch (delivery.status) {
      case DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key:
        displayedTotalValue = delivery.initialTotalEstimatedCost || 0;
        totalLabel = "Total Estimé";
        break;
      case DELIVERY_STATUSES.PENDING_USER_ACCEPTANCE.key:
        displayedTotalValue = delivery.vendorProposedTotalCost || 0;
        totalLabel = "Total Proposé";
        break;
      case DELIVERY_STATUSES.CONFIRMED.key:
      case DELIVERY_STATUSES.SHOPPING.key:
      case DELIVERY_STATUSES.OUT_FOR_DELIVERY.key:
      case DELIVERY_STATUSES.DELIVERED.key:
        displayedTotalValue = delivery.finalAgreedTotalCost || 0;
        // Fallback logic for completed orders if finalAgreedTotalCost is somehow missing
        if (!displayedTotalValue && delivery.vendorProposedTotalCost) {
          displayedTotalValue = delivery.vendorProposedTotalCost;
        } else if (!displayedTotalValue && delivery.initialTotalEstimatedCost) {
           displayedTotalValue = delivery.initialTotalEstimatedCost;
        }
        totalLabel = "Total Final";
        break;
      default: // For cancelled states or other unhandled states
        // Attempt to show the most relevant known cost, or the initial estimate
        if (delivery.finalAgreedTotalCost) {
          displayedTotalValue = delivery.finalAgreedTotalCost;
          totalLabel = "Total Final";
        } else if (delivery.vendorProposedTotalCost) {
          displayedTotalValue = delivery.vendorProposedTotalCost;
          totalLabel = "Total Proposé";
        } else if (delivery.initialTotalEstimatedCost) {
          displayedTotalValue = delivery.initialTotalEstimatedCost;
          totalLabel = "Total Estimé";
        } else {
          // Fallback if no cost fields are present (should be rare)
          displayedTotalValue = delivery.deliveryFee || 0; // At least show delivery fee if nothing else
          totalLabel = "Frais Livraison";
          // If even deliveryFee is not there, it will show 0 with "Frais Livraison" or "Total"
          // Consider if a more specific "N/A" or "Inconnu" is better if all costs are zero/undefined
        }
        // If the status implies cancellation, perhaps a specific label or no cost shown?
        // For now, the above logic will show the latest known cost or initial.
        if (delivery.status && delivery.status.toLowerCase().includes('cancelled')) {
            totalLabel = `Total (Annulé)`;
        }
        break;
    }
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
            {totalLabel}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
            {(displayedTotalValue || 0).toLocaleString("fr-FR", {
              style: "currency",
              currency: "XAF",
            })}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
          {/* Show cancel if status is PENDING_VENDOR_CONFIRMATION or PENDING_USER_ACCEPTANCE (user can reject/cancel) */}
          {(delivery.status === DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key ||
            delivery.status === DELIVERY_STATUSES.PENDING_USER_ACCEPTANCE.key) &&
            onCancel && ( // Ensure onCancel is provided
            <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={onCancel}>
              Annuler / Rejeter
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
