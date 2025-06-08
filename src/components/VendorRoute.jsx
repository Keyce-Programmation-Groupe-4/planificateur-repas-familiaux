"use client"

import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { CircularProgress, Box } from "@mui/material"

function VendorRoute({ children }) {
  const { currentUser, userData, loading } = useAuth()
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if userData exists and then if isVendor is true
  // Also check if the vendor is approved and active
  if (!userData || !userData.isVendor) {
    // If not a vendor, redirect to home page or an "access denied" page
    // For now, redirecting to home page
    return <Navigate to="/" replace />
  }

  if (!userData.isApproved || !userData.isActive) {
    // If vendor is not approved or not active, redirect to a specific page
    // This page should inform them about the status.
    // For now, redirecting to home page, but ideally, this would be a dedicated page.
    // Consider creating a '/vendor/pending-approval' page in a later step.
    // You could also pass state to the destination page.
    return <Navigate to="/vendor/pending-approval" state={{ from: location }} replace />;
  }

  return children
}

export default VendorRoute
