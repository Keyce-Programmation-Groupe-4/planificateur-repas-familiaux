"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  useTheme,
  alpha,
  Fade,
  Avatar,
  Stack,
  InputAdornment,
} from "@mui/material"
import { PriceCheck, Euro, Save, Cancel } from "@mui/icons-material"

function PriceInputDialog({ open, onClose, ingredientName, unit, onSave }) {
  const theme = useTheme()
  const [price, setPrice] = useState("")
  const [inputError, setInputError] = useState("")

  useEffect(() => {
    if (open) {
      setPrice("")
      setInputError("")
    }
  }, [open, ingredientName, unit])

  const handlePriceChange = (event) => {
    const value = event.target.value
    if (/^\d*\.?\d*$/.test(value)) {
      setPrice(value)
      setInputError("")
    } else {
      setInputError("Veuillez entrer un nombre valide.")
    }
  }

  const handleSave = () => {
    const numericPrice = Number.parseFloat(price)
    if (isNaN(numericPrice) || numericPrice < 0) {
      setInputError("Veuillez entrer un prix positif valide.")
      return
    }
    onSave(numericPrice)
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 6,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          backdropFilter: "blur(20px)",
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.2)}`,
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: alpha(theme.palette.common.black, 0.7),
          backdropFilter: "blur(8px)",
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
            }}
          >
            <PriceCheck sx={{ fontSize: "1.5rem" }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              Ajouter le prix
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Définissez le prix unitaire pour vos calculs
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Fade in={open} timeout={600}>
          <Box>
            <Box
              sx={{
                p: 3,
                borderRadius: 4,
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                mb: 3,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                {ingredientName}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Quel est le prix pour{" "}
                <Box component="span" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                  1 {unit}
                </Box>{" "}
                de cet ingrédient ?
              </Typography>
            </Box>

            <TextField
              autoFocus
              fullWidth
              id="price"
              label="Prix unitaire"
              type="text"
              inputMode="decimal"
              variant="outlined"
              value={price}
              onChange={handlePriceChange}
              error={!!inputError}
              helperText={inputError || "Exemple: 2.50"}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Euro color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" color="text.secondary">
                      / {unit}
                    </Typography>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  backgroundColor: theme.palette.background.paper,
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.primary.main,
                    borderWidth: "2px",
                  },
                },
              }}
            />
          </Box>
        </Fade>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          gap: 2,
        }}
      >
        <Button
          onClick={handleCancel}
          variant="outlined"
          startIcon={<Cancel />}
          sx={{
            borderRadius: 3,
            px: 3,
            borderColor: alpha(theme.palette.primary.main, 0.3),
            "&:hover": {
              borderColor: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
            },
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!price || !!inputError}
          startIcon={<Save />}
          sx={{
            borderRadius: 3,
            px: 3,
            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            boxShadow: `0 4px 20px ${alpha(theme.palette.success.main, 0.3)}`,
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: `0 6px 25px ${alpha(theme.palette.success.main, 0.4)}`,
            },
            "&:disabled": {
              background: alpha(theme.palette.action.disabled, 0.12),
            },
            transition: "all 0.3s ease",
          }}
        >
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PriceInputDialog
