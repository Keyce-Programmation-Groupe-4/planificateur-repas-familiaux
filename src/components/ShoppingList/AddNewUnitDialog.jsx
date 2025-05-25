import React, { useState, useEffect } from 'react';
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
  Tooltip
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

function AddNewUnitDialog({ 
  open, 
  onClose, 
  onSave, 
  ingredientName, 
  existingUnits, // Pass existing units to check for duplicates and find standard unit
  isLoading 
}) {
  const [newUnitName, setNewUnitName] = useState('');
  const [conversionFactor, setConversionFactor] = useState('');
  const [isStandard, setIsStandard] = useState(false); // Can only be true if no other standard unit exists
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const standardUnitInfo = React.useMemo(() => {
    if (!existingUnits) return null;
    for (const unitKey in existingUnits) {
      if (existingUnits[unitKey]?.isStandard) {
        return { key: unitKey, data: existingUnits[unitKey] };
      }
    }
    return null;
  }, [existingUnits]);

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setNewUnitName('');
      setConversionFactor('');
      // Cannot add another standard unit if one already exists
      setIsStandard(!standardUnitInfo);
      setPrice('');
      setError('');
    }
  }, [open, standardUnitInfo]);

  const validateInput = () => {
    if (!newUnitName.trim()) {
      return 'Le nom de la nouvelle unité est requis.';
    }
    if (existingUnits && existingUnits[newUnitName.trim()]) {
        return `L'unité '${newUnitName.trim()}' existe déjà pour cet ingrédient.`;
    }
    if (standardUnitInfo && !isStandard && !conversionFactor.trim()) {
        return `Un facteur de conversion par rapport à l'unité standard (${standardUnitInfo.key}) est requis.`;
    }
    if (conversionFactor) {
        const factor = parseFloat(conversionFactor);
        if (isNaN(factor) || factor <= 0) {
            return 'Le facteur de conversion doit être un nombre positif.';
        }
    }
    if (price) {
        const priceValue = parseFloat(price);
        if (isNaN(priceValue) || priceValue < 0) {
            return 'Si un prix est fourni, il doit être un nombre positif.';
        }
    }
    if (isStandard && standardUnitInfo) {
        // This case should be prevented by disabling the checkbox, but double-check
        return `Une unité standard (${standardUnitInfo.key}) existe déjà. Vous ne pouvez pas en ajouter une autre.`;
    }
    return ''; // No error
  };

  const handleSave = () => {
    const validationError = validateInput();
    if (validationError) {
      setError(validationError);
      return;
    }

    const unitData = {
      isStandard: isStandard,
      ...(conversionFactor && { conversionFactor: parseFloat(conversionFactor) }),
      ...(price && { standardPrice: parseFloat(price) }),
      ...(price && { priceSource: 'user_input' }),
      // lastPriceUpdate will be set server-side if price is added
    };

    onSave(newUnitName.trim(), unitData);
  };

  const handleCancel = () => {
    onClose();
  };

  const conversionLabel = standardUnitInfo
    ? `Facteur de conversion (Combien de '${newUnitName || 'nouvelle unité'}' = 1 ${standardUnitInfo.key} ?)`
    : 'Facteur de conversion (non applicable sans unité standard)';

  const conversionHelperText = standardUnitInfo
    ? `Ex: Si 1 ${standardUnitInfo.key} = 1000 ${newUnitName || 'nouvelle unité'}, entrez 1000`
    : 'Définissez une unité standard pour activer la conversion.';

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Ajouter une Unité pour "{ingredientName}"</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          required
          margin="dense"
          id="newUnitName"
          label="Nom de la nouvelle unité (ex: tasse, botte)"
          type="text"
          fullWidth
          variant="outlined"
          value={newUnitName}
          onChange={(e) => setNewUnitName(e.target.value)}
          disabled={isLoading}
        />
        {/* Only show conversion factor if a standard unit exists and the new one is NOT standard */}
        {standardUnitInfo && (
             <TextField
                required={!isStandard} // Required only if not standard
                margin="dense"
                id="conversionFactor"
                label={conversionLabel}
                type="number"
                fullWidth
                variant="outlined"
                value={conversionFactor}
                onChange={(e) => setConversionFactor(e.target.value)}
                disabled={isLoading || isStandard} // Disable if standard or loading
                helperText={conversionHelperText}
                InputProps={{ inputProps: { min: 0 } }}
                sx={{ mt: 2 }}
            />
        )}
        <TextField
          margin="dense"
          id="unitPrice"
          label={`Prix Optionnel (€ / ${newUnitName || 'unité'})`}
          type="number"
          fullWidth
          variant="outlined"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={isLoading}
          helperText="Laissez vide si inconnu."
          InputProps={{ inputProps: { min: 0 } }}
          sx={{ mt: 2 }}
        />
        <Tooltip title={standardUnitInfo ? "Une unité standard existe déjà." : "Cochez si c'est l'unité de base pour les conversions (ex: kg, L)."}>
          <span> {/* Tooltip requires a span wrapper when child is disabled */} 
            <FormControlLabel
              control={
                <Checkbox 
                  checked={isStandard} 
                  onChange={(e) => setIsStandard(e.target.checked)} 
                  disabled={isLoading || !!standardUnitInfo} // Disable if standard exists or loading
                />
              }
              label="Marquer comme unité standard"
              sx={{ mt: 1, display: 'block' }}
            />
          </span>
        </Tooltip>

      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel} disabled={isLoading}>Annuler</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={isLoading || !newUnitName.trim() || (standardUnitInfo && !isStandard && !conversionFactor.trim())}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Sauvegarde...' : 'Ajouter Unité'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddNewUnitDialog;

