"use client"
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Avatar,
  Chip,
  Rating,
  useTheme,
  alpha,
} from "@mui/material"
import { LocalShipping, Star, Category } from "@mui/icons-material"

function VendorCard({ vendor, onClick, selected = false }) {
  const theme = useTheme()

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${selected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.1)}`,
        background: selected
          ? alpha(theme.palette.primary.main, 0.05)
          : `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
        transition: "all 0.3s ease",
        transform: selected ? "scale(1.02)" : "scale(1)",
        height: "100%",
      }}
    >
      <CardActionArea onClick={() => onClick && onClick(vendor)} sx={{ borderRadius: 3, p: 1, height: "100%" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Avatar
              src={vendor.photoURL}
              alt={vendor.name}
              sx={{
                width: 56,
                height: 56,
                mr: 2,
                border: `2px solid ${selected ? theme.palette.primary.main : "transparent"}`,
              }}
            >
              {vendor.name?.charAt(0) || "V"}
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                {vendor.name}
              </Typography>
              <Rating
                value={vendor.rating || 0}
                readOnly
                precision={0.5}
                size="small"
                emptyIcon={<Star style={{ opacity: 0.55 }} fontSize="inherit" />}
              />
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {vendor.specialties?.map((specialty, index) => (
              <Chip
                key={index}
                label={specialty}
                size="small"
                icon={<Category fontSize="small" />}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.text.primary,
                  borderRadius: 2,
                }}
              />
            ))}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <LocalShipping sx={{ mr: 0.5, fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {vendor.deliveryZones?.join(", ") || "Zone non spécifiée"}
              </Typography>
            </Box>

            <Chip
              label={`${vendor.baseFee?.toLocaleString("fr-FR", { style: "currency", currency: "XAF" })} de frais`}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.secondary.main, 0.1),
                color: theme.palette.text.primary,
                borderRadius: 2,
              }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default VendorCard
