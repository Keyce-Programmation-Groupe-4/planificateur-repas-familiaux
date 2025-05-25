import React from 'react';
import {
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Typography,
  Box,
  Chip // For price input prompt
} from '@mui/material';
import { PriceCheck, Edit, Delete } from '@mui/icons-material'; // Using PriceCheck for missing price
import { formatQuantityUnit } from '../../utils/unitConverter'; // Assuming formatQuantityUnit is in utils

// Helper to format currency (simple example)
const formatCurrency = (value) => {
  if (typeof value !== 'number') {
    return '';
  }
  // Replace with a more robust currency formatting library if needed
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
};

function ShoppingListItem({ item, onToggleCheck, onOpenPriceDialog }) { // Added onOpenPriceDialog prop
  const theme = useTheme();
  const { itemId, ingredientId, name, quantity, unit, checked, cost, needsPriceInput, priceSource } = item;

  const labelId = `checkbox-list-label-${itemId}`;

  const handleToggle = () => {
    onToggleCheck(!checked);
  };

  const handlePriceInputClick = (e) => {
    e.stopPropagation(); // Prevent toggle check
    if (onOpenPriceDialog) {
      onOpenPriceDialog(ingredientId, name, unit);
    }
  };

  // Placeholder for optional actions
  const handleEdit = (e) => {
    e.stopPropagation();
    alert(`Modifier: ${name} (${quantity} ${unit}) - Non implémenté`);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    alert(`Supprimer: ${name} (${quantity} ${unit}) - Non implémenté`);
  };

  return (
    <ListItem
      key={itemId}
      disablePadding
      sx={{
        mb: 0.5,
        borderRadius: theme.shape.borderRadius,
        transition: 'background-color 0.2s ease-in-out',
        backgroundColor: checked ? alpha(theme.palette.action.disabledBackground, 0.3) : 'transparent',
        '&:hover': {
          backgroundColor: !checked ? alpha(theme.palette.action.hover, 0.04) : undefined,
        },
        display: 'flex',
        alignItems: 'center',
        py: 0.5 // Adjust vertical padding
      }}
    >
      {/* Checkbox */}
      <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, alignSelf: 'flex-start', mt: '6px' }}>
        <Checkbox
          edge="start"
          checked={checked}
          onChange={handleToggle}
          tabIndex={-1}
          disableRipple
          inputProps={{ 'aria-labelledby': labelId }}
          size="small"
        />
      </ListItemIcon>

      {/* Item Name, Quantity, Unit */}
      <ListItemText
        id={labelId}
        primary={name}
        secondary={formatQuantityUnit(quantity, unit)}
        onClick={handleToggle} // Allow clicking text to toggle
        sx={{
          cursor: 'pointer',
          textDecoration: checked ? 'line-through' : 'none',
          color: checked ? 'text.disabled' : 'text.primary',
          flexGrow: 1, // Take available space
          mr: 1, // Margin before cost/price input
          '.MuiListItemText-secondary': {
            color: checked ? 'text.disabled' : 'text.secondary',
            textDecoration: checked ? 'line-through' : 'none',
            fontSize: '0.8rem' // Slightly smaller secondary text
          },
        }}
      />

      {/* Cost or Price Input Prompt */}
      <Box sx={{ textAlign: 'right', minWidth: '80px' }}>
        {cost !== null && (
          <Typography
            variant="body2"
            sx={{ fontWeight: 'medium', color: checked ? 'text.disabled' : 'text.primary' }}
          >
            {formatCurrency(cost)}
          </Typography>
        )}
        {cost === null && needsPriceInput && (
          <Tooltip title={`Prix pour 1 ${unit} manquant`}>
            <Chip
              icon={<PriceCheck fontSize="small" />}
              label="Prix ?"
              size="small"
              onClick={handlePriceInputClick}
              clickable
              variant="outlined"
              color="warning"
              sx={{ cursor: 'pointer' }}
            />
          </Tooltip>
        )}
        {/* Optional: Display priceSource if needed */}
        {/* {priceSource && <Typography variant="caption" color="text.disabled">({priceSource})</Typography>} */}
      </Box>

      {/* Optional Edit/Delete Actions (consider placement) */}
      {/*
      <Box sx={{ ml: 1, display: 'flex', gap: 0.5 }}>
        <Tooltip title="Modifier la quantité">
          <IconButton edge="end" aria-label="modifier" size="small" onClick={handleEdit}>
            <Edit fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Supprimer l'article">
          <IconButton edge="end" aria-label="supprimer" size="small" onClick={handleDelete}>
            <Delete fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Box>
      */}
    </ListItem>
  );
}

export default ShoppingListItem;

