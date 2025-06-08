export const DELIVERY_STATUSES = {
  PENDING_VENDOR_CONFIRMATION: {
    key: "pending_vendor_confirmation",
    label: "En attente de confirmation du vendeur",
    adminLabel: "Attente Vendeur",
    userLabel: "En attente de confirmation du vendeur",
    color: "warning",
    step: 0,
  },
  PENDING_USER_ACCEPTANCE: {
    key: "pending_user_acceptance",
    label: "En attente de votre approbation",
    adminLabel: "Attente Client",
    userLabel: "En attente de votre approbation",
    color: "info",
    step: 1,
  },
  CONFIRMED: {
    key: "confirmed",
    label: "Confirmée par vous",
    adminLabel: "Confirmée",
    userLabel: "Confirmée par vous",
    color: "primary",
    step: 2,
  },
  SHOPPING: {
    key: "shopping",
    label: "Achats en cours",
    adminLabel: "Achats",
    userLabel: "Achats en cours",
    color: "secondary",
    step: 3,
  },
  OUT_FOR_DELIVERY: {
    key: "out_for_delivery",
    label: "En cours de livraison",
    adminLabel: "En Livraison",
    userLabel: "En cours de livraison",
    color: "secondary",
    step: 4,
  },
  DELIVERED: {
    key: "delivered",
    label: "Livrée",
    adminLabel: "Livrée",
    userLabel: "Livrée",
    color: "success",
    step: 5,
  },
  CANCELLED_BY_VENDOR: {
    key: "cancelled_by_vendor",
    label: "Annulée par le vendeur",
    adminLabel: "Annulée (Vendeur)",
    userLabel: "Annulée par le vendeur",
    color: "error",
    step: -1, // Indicates a terminal state, not part of the positive flow
  },
  CANCELLED_BY_USER: {
    key: "cancelled_by_user",
    label: "Annulée par vous",
    adminLabel: "Annulée (Client)",
    userLabel: "Annulée par vous",
    color: "error",
    step: -1, // Indicates a terminal state
  },
  CANCELLED: {
    key: "cancelled",
    label: "Annulée",
    adminLabel: "Annulée", // Default admin label if not specified in AdminDeliveryManagement
    userLabel: "Annulée",
    color: "error", // Default color, matches other cancelled statuses
    step: -1, // Indicates a terminal state
  },
};

// Export an array version for easier iteration if needed
export const DELIVERY_STATUS_LIST = Object.values(DELIVERY_STATUSES);

// Helper function to get a status by its key
export const getDeliveryStatusByKey = (key) => {
  return DELIVERY_STATUS_LIST.find(status => status.key === key) || null;
};

// Helper function to get a status by its enum-like key (e.g., PENDING_VENDOR_CONFIRMATION)
export const getDeliveryStatus = (enumKey) => {
  return DELIVERY_STATUSES[enumKey] || null;
};
