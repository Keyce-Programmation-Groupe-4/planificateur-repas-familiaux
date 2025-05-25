import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box
} from '@mui/material';

function PriceInputDialog({ open, onClose, ingredientName, unit, onSave }) {
  const [price, setPrice] = useState('');
  const [inputError, setInputError] = useState('');

  // Reset price when dialog opens or data changes
  useEffect(() => {
    if (open) {
      setPrice('');
      setInputError('');
    }
  }, [open, ingredientName, unit]);

  const handlePriceChange = (event) => {
    const value = event.target.value;
    // Allow only numbers and a single decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setPrice(value);
      setInputError(''); // Clear error on valid input
    } else {
        setInputError('Veuillez entrer un nombre valide.');
    }
  };

  const handleSave = () => {
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setInputError('Veuillez entrer un prix positif valide.');
      return;
    }
    onSave(numericPrice);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Ajouter le prix</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Quel est le prix pour <Box component="span" sx={{ fontWeight: 'medium' }}>1 {unit}</Box> de <Box component="span" sx={{ fontWeight: 'medium' }}>{ingredientName}</Box> ?
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          id="price"
          label={`Prix (FcFA / ${unit})`}
          type="text" // Use text to allow decimal point during input
          inputMode="decimal" // Hint for mobile keyboards
          fullWidth
          variant="outlined"
          value={price}
          onChange={handlePriceChange}
          error={!!inputError}
          helperText={inputError || 'Exemple: 1.50'}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel}>Annuler</Button>
        <Button onClick={handleSave} variant="contained" disabled={!price || !!inputError}>
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PriceInputDialog;

