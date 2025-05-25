import React from 'react';
import {
  List,
  ListItem,
  ListSubheader,
  Collapse,
  Typography,
  Box,
  Paper,
  useTheme,
  alpha,
  IconButton,
  Tooltip
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import ShoppingListItem from './ShoppingListItem'; // We'll create this next

function ShoppingListCategory({ categoryName, items = [], onToggleCheck }) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(true); // Categories default open

  const handleToggleOpen = () => {
    setOpen(!open);
  };

  const uncheckedCount = items.filter(item => !item.checked).length;

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        mb: 2, 
        borderRadius: 3, // Consistent radius
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden' // Ensure content stays within borders
      }}
    >
      <ListSubheader 
        component="div" 
        onClick={handleToggleOpen} 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: alpha(theme.palette.grey[500], 0.08),
          py: 1,
          px: 2,
          cursor: 'pointer',
          borderBottom: `1px solid ${theme.palette.divider}`,
          '&:hover': {
            backgroundColor: alpha(theme.palette.grey[500], 0.12),
          }
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
          {categoryName} 
          {uncheckedCount > 0 && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({uncheckedCount})
            </Typography>
          )}
        </Typography>
        <Tooltip title={open ? "Réduire la catégorie" : "Développer la catégorie"}>
          <IconButton edge="end" size="small" aria-label={open ? "Réduire" : "Développer"}>
            {open ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Tooltip>
      </ListSubheader>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List dense disablePadding sx={{ p: 1 }}>
          {items.map((item, index) => (
            <ShoppingListItem
              key={`${item.ingredientId}-${item.unit}`}
              item={item}
              onToggleCheck={(checked) => onToggleCheck(categoryName, item.ingredientId, item.unit, checked)}
            />
          ))}
        </List>
      </Collapse>
    </Paper>
  );
}

export default ShoppingListCategory;

