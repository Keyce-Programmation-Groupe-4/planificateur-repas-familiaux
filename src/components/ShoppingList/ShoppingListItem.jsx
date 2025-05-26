"use client"

import {
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Tooltip,
  useTheme,
  alpha,
  Typography,
  Box,
  Chip,
  Fade,
  Avatar,
} from "@mui/material"
import { PriceCheck } from "@mui/icons-material"
import { formatQuantityUnit } from "../../utils/unitConverter"

// Helper to format currency
const formatCurrency = (value) => {
  if (typeof value !== 'number') {
    return '';
  }
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' });
};


function ShoppingListItem({ item, onToggleCheck, onOpenPriceDialog }) {
  const theme = useTheme()
  const { itemId, ingredientId, name, quantity, unit, checked, cost, needsPriceInput, priceSource } = item

  const labelId = `checkbox-list-label-${itemId}`

  const handleToggle = () => {
    onToggleCheck(!checked)
  }

  const handlePriceInputClick = (e) => {
    e.stopPropagation()
    if (onOpenPriceDialog) {
      onOpenPriceDialog(ingredientId, name, unit)
    }
  }

  return (
    <Fade in timeout={300}>
      <ListItem
        disablePadding
        sx={{
          mb: 1,
          borderRadius: 4,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          background: checked
            ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.success.main, 0.04)} 100%)`
            : `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          border: `1px solid ${checked ? alpha(theme.palette.success.main, 0.2) : alpha(theme.palette.divider, 0.5)}`,
          backdropFilter: "blur(10px)",
          "&:hover": {
            transform: checked ? "none" : "translateX(4px)",
            boxShadow: checked
              ? `0 4px 20px ${alpha(theme.palette.success.main, 0.15)}`
              : `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
            border: `1px solid ${checked ? alpha(theme.palette.success.main, 0.3) : alpha(theme.palette.primary.main, 0.3)}`,
          },
          display: "flex",
          alignItems: "center",
          p: 2,
          cursor: "pointer",
        }}
        onClick={handleToggle}
      >
        {/* Custom Checkbox with Avatar */}
        <ListItemIcon sx={{ minWidth: "auto", mr: 2 }}>
          <Box sx={{ position: "relative" }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                background: checked
                  ? `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
                  : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                border: `2px solid ${checked ? theme.palette.success.main : alpha(theme.palette.primary.main, 0.3)}`,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "scale(1.1)",
                },
              }}
            >
              <Checkbox
                edge="start"
                checked={checked}
                onChange={handleToggle}
                tabIndex={-1}
                disableRipple
                inputProps={{ "aria-labelledby": labelId }}
                sx={{
                  color: "transparent",
                  "&.Mui-checked": {
                    color: "white",
                  },
                  "& .MuiSvgIcon-root": {
                    fontSize: "1.2rem",
                  },
                }}
              />
            </Avatar>
          </Box>
        </ListItemIcon>

        {/* Item Content */}
        <ListItemText
          id={labelId}
          primary={
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                textDecoration: checked ? "line-through" : "none",
                color: checked ? theme.palette.text.disabled : theme.palette.text.primary,
                transition: "all 0.3s ease",
              }}
            >
              {name}
            </Typography>
          }
          secondary={
            <Typography
              variant="body2"
              sx={{
                color: checked ? theme.palette.text.disabled : theme.palette.text.secondary,
                textDecoration: checked ? "line-through" : "none",
                fontWeight: 500,
                mt: 0.5,
              }}
            >
              {formatQuantityUnit(quantity, unit)}
            </Typography>
          }
          sx={{ flexGrow: 1, mr: 2 }}
        />

        {/* Price Section */}
        <Box sx={{ textAlign: "right", minWidth: "100px" }}>
          {cost !== null && (
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: checked ? theme.palette.text.disabled : theme.palette.success.main,
                transition: "all 0.3s ease",
              }}
            >
              {formatCurrency(cost)}
            </Typography>
          )}
          {cost === null && needsPriceInput && (
            <Tooltip title={`Prix pour 1 ${unit} manquant`} arrow>
              <Chip
                icon={<PriceCheck />}
                label="Ajouter prix"
                size="small"
                onClick={handlePriceInputClick}
                clickable
                sx={{
                  background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                  color: theme.palette.warning.main,
                  fontWeight: 600,
                  borderRadius: 3,
                  "&:hover": {
                    background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.2)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`,
                    transform: "scale(1.05)",
                    boxShadow: `0 4px 15px ${alpha(theme.palette.warning.main, 0.3)}`,
                  },
                  transition: "all 0.2s ease",
                }}
              />
            </Tooltip>
          )}
        </Box>
      </ListItem>
    </Fade>
  )
}

export default ShoppingListItem
