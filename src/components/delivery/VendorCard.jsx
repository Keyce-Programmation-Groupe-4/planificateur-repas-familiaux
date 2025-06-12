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
  Tooltip, // Added for tooltip on recommendation
} from "@mui/material"
import { LocalShipping, Star, Category, Recommend as RecommendIcon, Room as RoomIcon } from "@mui/icons-material" // Added RecommendIcon and RoomIcon for distance
import TravelExploreIcon from '@mui/icons-material/TravelExplore'; // Kept for now, might switch to RoomIcon

function VendorCard({ vendor, onClick, selected = false, isRecommendedMatch = false, distanceToUser }) { // Changed props
  const theme = useTheme()

  // Distance is now passed as a prop: distanceToUser

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
            <Box sx={{ flexGrow: 1 }}> {/* Allow text to take space */}
              <Typography variant="h6" component="div" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
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
            {isRecommendedMatch && (
              <Tooltip title="Ce vendeur correspond bien à votre liste!" arrow>
                <Chip
                  icon={<RecommendIcon />}
                  label="Recommandé"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ ml: 1, alignSelf: 'flex-start', borderRadius: '8px', fontSize: '0.7rem' }}
                />
              </Tooltip>
            )}
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

          {distanceToUser !== null && typeof distanceToUser === 'number' && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5, color: 'text.secondary', justifyContent: 'flex-start' }}>
              <RoomIcon sx={{ fontSize: '1.1rem', mr: 0.5, color: theme.palette.info.main }} />
              <Typography variant="body2" sx={{ color: theme.palette.info.dark }}>
                ~{distanceToUser.toFixed(1)} km
              </Typography>
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default VendorCard
