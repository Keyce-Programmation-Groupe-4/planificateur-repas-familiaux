"use client"

import React from "react"

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
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Tooltip,
  useTheme,
  alpha,
  Fade,
  Avatar,
  Stack,
  InputAdornment,
  Chip,
} from "@mui/material"
import { Add, Scale, Euro, Star, Save, Cancel, InfoOutlined as InfoOutlinedIcon } from "@mui/icons-material"

function AddNewUnitDialog({ open, onClose, onSave, ingredientName, existingUnits, isLoading, error }) {
  const theme = useTheme()
  const [newUnitName, setNewUnitName] = useState("")
  const [conversionFactor, setConversionFactor] = useState("")
  const [isStandard, setIsStandard] = useState(false)
  const [price, setPrice] = useState("")
  const [localError, setLocalError] = useState("")

  const standardUnitInfo = React.useMemo(() => {
    if (!existingUnits) return null
    for (const unitKey in existingUnits) {
      if (existingUnits[unitKey]?.isStandard) {
        return { key: unitKey, data: existingUnits[unitKey] }
      }
    }
    return null
  }, [existingUnits])

  useEffect(() => {
    if (open) {
      setNewUnitName("")
      setConversionFactor("")
      setIsStandard(!standardUnitInfo)
      setPrice("")
      setLocalError("")
    }
  }, [open, standardUnitInfo])

  const validateInput = () => {
    if (!newUnitName.trim()) {
      return "Le nom de la nouvelle unité est requis."
    }
    if (existingUnits && existingUnits[newUnitName.trim()]) {
      return `L'unité '${newUnitName.trim()}' existe déjà pour cet ingrédient.`
    }
    if (standardUnitInfo && !isStandard && !conversionFactor.trim()) {
      return `Un facteur de conversion par rapport à l'unité standard (${standardUnitInfo.key}) est requis.`
    }
    if (conversionFactor) {
      const factor = Number.parseFloat(conversionFactor)
      if (isNaN(factor) || factor <= 0) {
        return "Le facteur de conversion doit être un nombre positif."
      }
    }
    if (price) {
      const priceValue = Number.parseFloat(price)
      if (isNaN(priceValue) || priceValue < 0) {
        return "Si un prix est fourni, il doit être un nombre positif."
      }
    }
    if (isStandard && standardUnitInfo) {
      return `Une unité standard (${standardUnitInfo.key}) existe déjà. Vous ne pouvez pas en ajouter une autre.`
    }
    return ""
  }

  const handleSave = () => {
    const validationError = validateInput()
    if (validationError) {
      setLocalError(validationError)
      return
    }

    const unitData = {
      isStandard: isStandard,
      ...(conversionFactor && { conversionFactor: Number.parseFloat(conversionFactor) }),
      ...(price && { standardPrice: Number.parseFloat(price) }),
      ...(price && { priceSource: "user_input" }),
    }

    onSave(newUnitName.trim(), unitData)
  }

  const handleCancel = () => {
    onClose()
  }

  const displayError = error || localError

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
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
              background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
            }}
          >
            <Scale sx={{ fontSize: "1.5rem" }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              Ajouter une Unité
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pour "{ingredientName}"
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Fade in={open} timeout={600}>
          <Box>
            {/* Error Alert */}
            {displayError && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                }}
              >
                {displayError}
              </Alert>
            )}

            {/* Standard Unit Info */}
            {standardUnitInfo && (
              <Box
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  mb: 3,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Chip
                    icon={<Star />}
                    label="Unité Standard"
                    sx={{
                      backgroundColor: alpha(theme.palette.warning.main, 0.1),
                      color: theme.palette.warning.main,
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    <strong>{standardUnitInfo.key}</strong> est l'unité de référence
                  </Typography>
                </Stack>
              </Box>
            )}

            <Stack spacing={3}>
              {/* Unit Name */}
              <TextField
                autoFocus
                required
                fullWidth
                id="newUnitName"
                label="Nom de la nouvelle unité"
                placeholder="ex: tasse, botte, sachet"
                variant="outlined"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Add color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.primary.main,
                      borderWidth: "2px",
                    },
                  },
                }}
              />

              {/* Conversion Factor */}
              {standardUnitInfo && (
                <TextField
                  required={!isStandard}
                  fullWidth
                  id="conversionFactor"
                  label={`Facteur de conversion (${newUnitName || "nouvelle unité"} → ${standardUnitInfo.key})`}
                  placeholder={`Ex: Si 1 ${standardUnitInfo.key} = 1000 ${newUnitName || "unités"}, entrez 1000`}
                  type="number"
                  variant="outlined"
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(e.target.value)}
                  disabled={isLoading || isStandard}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Scale color="action" />
                      </InputAdornment>
                    ),
                    inputProps: { min: 0, step: "any" },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: theme.palette.primary.main,
                        borderWidth: "2px",
                      },
                    },
                  }}
                />
              )}

              {/* Price */}
              <TextField
                fullWidth
                id="unitPrice"
                label={`Prix optionnel (FCFA / ${newUnitName || "unité"})`}
                placeholder="Laissez vide si inconnu"
                type="number"
                variant="outlined"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Euro color="action" />
                    </InputAdornment>
                  ),
                  inputProps: { min: 0, step: "0.01" },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.primary.main,
                      borderWidth: "2px",
                    },
                  },
                }}
              />

              {/* Standard Unit Checkbox */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  background: alpha(theme.palette.background.default, 0.5),
                  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                }}
              >
                <Tooltip
                  title={
                    standardUnitInfo
                      ? "Une unité standard existe déjà."
                      : "Cochez si c'est l'unité de base pour les conversions (ex: kg, L)."
                  }
                  arrow
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isStandard}
                        onChange={(e) => setIsStandard(e.target.checked)}
                        disabled={isLoading || !!standardUnitInfo}
                        sx={{
                          "&.Mui-checked": {
                            color: theme.palette.warning.main,
                          },
                        }}
                      />
                    }
                    label={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" fontWeight={500}>
                          Marquer comme unité standard
                        </Typography>
                        <InfoOutlinedIcon fontSize="small" color="action" />
                      </Stack>
                    }
                  />
                </Tooltip>
              </Box>
            </Stack>
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
          disabled={isLoading}
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
          disabled={isLoading || !newUnitName.trim() || (standardUnitInfo && !isStandard && !conversionFactor.trim())}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Save />}
          sx={{
            borderRadius: 3,
            px: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
            },
            "&:disabled": {
              background: alpha(theme.palette.action.disabled, 0.12),
            },
            transition: "all 0.3s ease",
          }}
        >
          {isLoading ? "Sauvegarde..." : "Ajouter Unité"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddNewUnitDialog
