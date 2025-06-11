import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Typography,
  Box,
  Divider,
  useTheme,
  IconButton,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Restaurant as RestaurantIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { formatDayName, formatMealType, getSeverityColor } from "../../utils/allergyUtils";

/**
 * Composant modal pour afficher les alertes d'allergies
 * @param {Object} props - Props du composant
 * @param {boolean} props.open - État d'ouverture de la modal
 * @param {Function} props.onClose - Fonction de fermeture
 * @param {Array} props.alerts - Liste des alertes d'allergies
 * @param {string} props.message - Message général
 */
const AllergyAlertModal = ({ open, onClose, alerts = [], message = "" }) => {
  const theme = useTheme();

  const groupedAlerts = alerts.reduce((acc, alert) => {
    const key = `${alert.day}-${alert.mealType}`;
    if (!acc[key]) {
      acc[key] = {
        day: alert.day,
        mealType: alert.mealType,
        alerts: []
      };
    }
    acc[key].alerts.push(alert);
    return acc;
  }, {});

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critique":
        return <WarningIcon sx={{ color: "#D32F2F" }} />;
      case "sévère":
        return <WarningIcon sx={{ color: "#F44336" }} />;
      default:
        return <WarningIcon sx={{ color: "#FF7043" }} />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: "80vh"
        }
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: alerts.length > 0 ? "#FFF3E0" : "#E8F5E8",
          color: alerts.length > 0 ? "#E65100" : "#2E7D32",
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningIcon />
          <Typography variant="h6" component="div">
            {alerts.length > 0 ? "Alertes d'Allergies Détectées" : "Vérification des Allergies"}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Alert 
          severity={alerts.length > 0 ? "warning" : "success"}
          sx={{ mb: 3 }}
        >
          <AlertTitle>
            {alerts.length > 0 ? "Attention !" : "Tout va bien !"}
          </AlertTitle>
          {message}
        </Alert>

        {alerts.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary }}>
              Détails des alertes :
            </Typography>
            
            {Object.entries(groupedAlerts).map(([key, group]) => (
              <Box key={key} sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 2,
                    p: 2,
                    backgroundColor: theme.palette.grey[50],
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.grey[200]}`
                  }}
                >
                  <ScheduleIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    {formatDayName(group.day)} - {formatMealType(group.mealType)}
                  </Typography>
                </Box>

                <List dense>
                  {group.alerts.map((alert, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        border: `1px solid ${getSeverityColor(alert.severity)}`,
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor: `${getSeverityColor(alert.severity)}10`
                      }}
                    >
                      <ListItemIcon>
                        {getSeverityIcon(alert.severity)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <PersonIcon fontSize="small" />
                            <Typography variant="body1" fontWeight="bold">
                              {alert.memberName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              allergique à
                            </Typography>
                            <Chip
                              label={alert.allergen}
                              size="small"
                              sx={{
                                backgroundColor: getSeverityColor(alert.severity),
                                color: "white",
                                fontWeight: "bold"
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                              <RestaurantIcon fontSize="small" />
                              <Typography variant="body2" fontWeight="medium">
                                Recette : {alert.recipeName}
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              Ingrédients problématiques :
                            </Typography>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                              {alert.ingredients.map((ingredient, idx) => (
                                <Chip
                                  key={idx}
                                  label={`${ingredient.ingredientName} (${ingredient.quantity} ${ingredient.unit})`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: "0.75rem" }}
                                />
                              ))}
                            </Box>
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                mt: 1,
                                color: getSeverityColor(alert.severity),
                                fontWeight: "bold"
                              }}
                            >
                              Sévérité : {alert.severity}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                
                {Object.keys(groupedAlerts).length > 1 && 
                 Object.keys(groupedAlerts).indexOf(key) < Object.keys(groupedAlerts).length - 1 && (
                  <Divider sx={{ my: 2 }} />
                )}
              </Box>
            ))}

            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>Recommandations</AlertTitle>
              <Typography variant="body2">
                • Vérifiez les ingrédients de substitution possibles<br/>
                • Consultez un professionnel de santé si nécessaire<br/>
                • Modifiez le planning ou choisissez d'autres recettes<br/>
                • Assurez-vous que tous les membres de la famille sont informés
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={onClose}
          variant="contained"
          color="primary"
          fullWidth
        >
          Compris
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AllergyAlertModal;

