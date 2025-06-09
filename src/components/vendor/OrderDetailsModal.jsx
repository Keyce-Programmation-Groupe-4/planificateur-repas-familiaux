"use client";

import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, Grid, List, ListItem, ListItemText, Divider, Paper, Chip
} from '@mui/material';
import { ReceiptLong as ReceiptLongIcon, PersonPinCircle as PersonPinCircleIcon, CalendarToday as CalendarTodayIcon, Notes as NotesIcon, ShoppingCart as ShoppingCartIcon } from '@mui/icons-material';
import { getDeliveryStatusByKey } from '../../config/deliveryStatuses'; // Assuming this path is correct

function OrderDetailsModal({ open, onClose, order }) {
  if (!order) return null;

  const statusInfo = getDeliveryStatusByKey(order.status);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'primary.contrastText', pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ReceiptLongIcon sx={{ mr: 1.5, fontSize: '2rem' }} />
          Détails de la Commande : #{order.id?.substring(0, 8)}...
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <Grid container spacing={3}>
          {/* Customer and Delivery Info */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonPinCircleIcon sx={{ mr: 1, color: 'text.secondary' }} /> Informations Client & Livraison
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body1"><strong>Adresse :</strong> {order.deliveryAddress}</Typography>
              <Typography variant="body1"><strong>Date demandée :</strong> {order.requestedDate} à {order.requestedTime}</Typography>
              {order.deliveryInstructions && (
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  <strong>Instructions :</strong> {order.deliveryInstructions}
                </Typography>
              )}
              {order.vendorOverallNote && (
                 <Typography variant="body2" sx={{ mt: 1, color: 'secondary.main' }}>
                  <strong>Votre note globale :</strong> {order.vendorOverallNote}
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Order Summary */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ShoppingCartIcon sx={{ mr: 1, color: 'text.secondary' }} /> Sommaire de la Commande
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body1"><strong>Statut :</strong> <Chip label={statusInfo?.label || order.status} color={statusInfo?.color || 'default'} size="small" /></Typography>
              <Typography variant="body1"><strong>Frais de livraison :</strong> {order.deliveryFee?.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' })}</Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>
                <strong>Coût Total Final :</strong> {order.finalOrderCost?.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' })}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Items List */}
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <NotesIcon sx={{ mr: 1, color: 'text.secondary' }} /> Articles Confirmés
        </Typography>
        {Array.isArray(order.vendorConfirmedItems) && order.vendorConfirmedItems.length > 0 ? (
          <List disablePadding>
            {order.vendorConfirmedItems.map((item, index) => (
              <Paper key={item.itemId || index} elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, p: 2, mb: 1.5, borderRadius: 2 }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={12} sm={5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>{item.name}</Typography>
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <Typography color="text.secondary">{item.quantity} {item.unit || 'unité(s)'}</Typography>
                  </Grid>
                  <Grid item xs={8} sm={3} sx={{ textAlign: {sm: 'right'} }}>
                    <Typography sx={{ fontWeight: 'medium' }}>
                      {item.confirmedPrice?.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' })} / unité
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={2} sx={{ textAlign: {sm: 'right'} }}>
                     <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                       {(item.quantity * item.confirmedPrice)?.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' })}
                     </Typography>
                  </Grid>
                  {item.vendorNote && (
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'secondary.dark' }}>
                        Note du vendeur : {item.vendorNote}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Aucun article confirmé trouvé pour cette commande.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
        <Button onClick={onClose} variant="outlined">Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}

export default OrderDetailsModal;
