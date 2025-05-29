"use client"

import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { CircularProgress, Box } from "@mui/material"

function AdminRoute({ children }) {
  const { currentUser, userData, loading } = useAuth()

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (!userData?.isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
