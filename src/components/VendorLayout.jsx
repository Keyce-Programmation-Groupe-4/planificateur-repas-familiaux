"use client"

import { useState } from "react"
import { Outlet, Link as RouterLink, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  alpha,
  Fade,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Stack,
  Badge,
  Tooltip,
  Paper,
} from "@mui/material"
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Inventory as InventoryIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material"

const drawerWidth = 280

const navigationItems = [
  { text: "Tableau de Bord", icon: <DashboardIcon />, path: "/vendor/dashboard" },
  { text: "Profil Vendeur", icon: <PersonIcon />, path: "/vendor/profile" },
  { text: "Mes Produits", icon: <InventoryIcon />, path: "/vendor/products" },
]

export default function VendorLayout() {
  const { currentUser, userData, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"))
  const isTablet = useMediaQuery(theme.breakpoints.between("md", "lg"))

  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleProfileMenuOpen = (event) => {
    setProfileMenuAnchor(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null)
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate("/login")
      handleProfileMenuClose()
    } catch (error) {
      console.error("Failed to log out:", error)
    }
  }

  const isActivePath = (path) => {
    return location.pathname === path
  }

  const drawer = (
    <Paper
      elevation={0}
      sx={{
        width: drawerWidth,
        height: "100%",
        background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Espace Vendeur
        </Typography>
        <IconButton
          onClick={handleDrawerToggle}
          sx={{ color: theme.palette.text.secondary }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {currentUser && (
        <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 48,
                height: 48,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              }}
            >
              {userData?.name?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {userData?.name || "Vendeur"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentUser.email}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}

      <Box sx={{ flex: 1, overflow: "auto", py: 1 }}>
        <List sx={{ px: 2 }}>
          {navigationItems.map((item) => {
            const isActive = isActivePath(item.path)
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  onClick={handleDrawerToggle}
                  sx={{
                    borderRadius: 2,
                    py: 1.2,
                    backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.15) : "transparent",
                    color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                      minWidth: 36,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{ fontWeight: isActive ? 600 : 400 }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
          <Divider sx={{ my: 2 }} />
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                py: 1.2,
                color: theme.palette.error.main,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                },
              }}
            >
              <ListItemIcon sx={{ color: theme.palette.error.main, minWidth: 36 }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Déconnexion" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Paper>
  )

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          color: theme.palette.text.primary,
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          {(isMobile || isTablet) && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h5"
            component={RouterLink}
            to="/vendor/dashboard"
            sx={{
              flexGrow: 1,
              fontWeight: 800,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textDecoration: "none",
            }}
          >
            Espace Vendeur
          </Typography>

          {!isMobile && !isTablet && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              {currentUser ? (
                <>
                  {navigationItems.map((item) => {
                    const isActive = isActivePath(item.path)
                    return (
                      <Button
                        key={item.path}
                        component={RouterLink}
                        to={item.path}
                        startIcon={item.icon}
                        sx={{
                          color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                          backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.08) : "transparent",
                          borderRadius: 2,
                          px: 1.5,
                          py: 0.8,
                          fontWeight: isActive ? 600 : 400,
                          textTransform: "none",
                        }}
                      >
                        {item.text}
                      </Button>
                    )
                  })}
                  <Tooltip title="Notifications">
                    <IconButton sx={{ ml: 1 }}>
                      <Badge badgeContent={3} color="error">
                        <NotificationsIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  <IconButton onClick={handleProfileMenuOpen} sx={{ ml: 1, p: 0.5 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                      }}
                    >
                      {userData?.name?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
                  <Menu
                    anchorEl={profileMenuAnchor}
                    open={Boolean(profileMenuAnchor)}
                    onClose={handleProfileMenuClose}
                    PaperProps={{
                      sx: {
                        borderRadius: 3,
                        mt: 1,
                        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                      },
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {userData?.name || "Vendeur"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {currentUser.email}
                      </Typography>
                    </Box>
                    <MenuItem
                      component={RouterLink}
                      to="/vendor/profile"
                      onClick={handleProfileMenuClose}
                      sx={{ py: 1.5 }}
                    >
                      <PersonIcon sx={{ mr: 2 }} />
                      Profil
                    </MenuItem>
                    <MenuItem sx={{ py: 1.5 }}>
                      <SettingsIcon sx={{ mr: 2 }} />
                      Paramètres
                    </MenuItem>
                    <Divider sx={{ my: 0.5 }} />
                    <MenuItem
                      onClick={handleLogout}
                      sx={{ py: 1.5, color: theme.palette.error.main }}
                    >
                      <LogoutIcon sx={{ mr: 2 }} />
                      Déconnexion
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  sx={{ borderRadius: 2, textTransform: "none" }}
                >
                  Connexion
                </Button>
              )}
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>

      <Container
        component="main"
        maxWidth="xl"
        sx={{ flexGrow: 1, py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}
      >
        <Fade in timeout={600}>
          <Box sx={{ width: "100%" }}>
            <Outlet />
          </Box>
        </Fade>
      </Container>

      <Box
        component="footer"
        sx={{
          py: { xs: 3, sm: 4 },
          px: 3,
          mt: "auto",
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}
      >
        <Container maxWidth="xl">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 2, sm: 3 }}
            alignItems="center"
            justifyContent="space-between"
          >
            <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Espace Vendeur
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gérer vos produits et commandes
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
              <Chip
                label="v2.1.0"
                size="small"
                sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}
              />
              <Typography variant="caption" color="text.secondary">
                © {new Date().getFullYear()} - Conçu pour l'avenir
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}