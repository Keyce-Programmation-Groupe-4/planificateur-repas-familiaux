"use client"

import React from "react"

import {
  List,
  ListSubheader,
  Collapse,
  Typography,
  Box,
  Paper,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Fade,
  Zoom,
} from "@mui/material"
import { ExpandLess, ExpandMore, Category } from "@mui/icons-material"
import ShoppingListItem from "./ShoppingListItem"

function ShoppingListCategory({ categoryName, items = [], onToggleCheck, onOpenPriceDialog }) {
  const theme = useTheme()
  const [open, setOpen] = React.useState(true)

  const handleToggleOpen = () => {
    setOpen(!open)
  }

  const uncheckedCount = items.filter((item) => !item.checked).length
  const totalCount = items.length
  const completionPercentage = totalCount > 0 ? ((totalCount - uncheckedCount) / totalCount) * 100 : 0

  return (
    <Fade in timeout={400}>
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 6,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          backdropFilter: "blur(20px)",
          overflow: "hidden",
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          },
        }}
      >
        {/* Category Header */}
        <ListSubheader
          component="div"
          onClick={handleToggleOpen}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            py: 2,
            px: 3,
            cursor: "pointer",
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            transition: "all 0.3s ease",
            "&:hover": {
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
            },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <Category />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {categoryName}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={`${uncheckedCount} restant${uncheckedCount !== 1 ? "s" : ""}`}
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                  }}
                />
                <Chip
                  label={`${Math.round(completionPercentage)}% fait`}
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                  }}
                />
              </Stack>
            </Box>
          </Stack>

          <Tooltip title={open ? "Réduire la catégorie" : "Développer la catégorie"} arrow>
            <IconButton
              edge="end"
              size="large"
              sx={{
                backgroundColor: alpha(theme.palette.background.paper, 0.8),
                "&:hover": {
                  backgroundColor: theme.palette.background.paper,
                  transform: "scale(1.1)",
                },
                transition: "all 0.2s ease",
              }}
            >
              {open ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Tooltip>
        </ListSubheader>

        {/* Progress Bar */}
        <Box
          sx={{
            height: 4,
            background: alpha(theme.palette.divider, 0.1),
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              height: "100%",
              width: `${completionPercentage}%`,
              background: `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
              transition: "width 0.5s ease",
            }}
          />
        </Box>

        {/* Items List */}
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List disablePadding sx={{ p: 2 }}>
            {items.map((item, index) => (
              <Zoom in timeout={200 + index * 50} key={`${item.ingredientId}-${item.unit}`}>
                <Box>
                  <ShoppingListItem
                    item={item}
                    onToggleCheck={(checked) => onToggleCheck(categoryName, item.ingredientId, item.unit, checked)}
                    onOpenPriceDialog={onOpenPriceDialog}
                  />
                </Box>
              </Zoom>
            ))}
            {items.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Aucun article dans cette catégorie
                </Typography>
              </Box>
            )}
          </List>
        </Collapse>
      </Paper>
    </Fade>
  )
}

export default ShoppingListCategory
