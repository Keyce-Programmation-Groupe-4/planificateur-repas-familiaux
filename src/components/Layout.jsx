"use client"

import { useState } from "react"
import Logo1 from "/public/Logo1.png"
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom"
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
} from "@mui/material"
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  CalendarMonth as CalendarIcon,
  Restaurant as RestaurantIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  Kitchen as KitchenIcon,
  LocalGroceryStore as LocalGroceryStoreIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalShipping as LocalShippingIcon,
} from "@mui/icons-material"
import { useAuth } from "../contexts/AuthContext"
import { auth } from "../firebaseConfig"
import { signOut } from "firebase/auth"

const navigationItems = [
  { path: "/", label: "Accueil", icon: HomeIcon },
  { path: "/planner", label: "Planificateur", icon: CalendarIcon },
  { path: "/recipes", label: "Mes Recettes", icon: RestaurantIcon },
  { path: "/shopping-list", label: "Liste de Courses", icon: ShoppingCartIcon },
  { path: "/stock", label: "Garde Manger", icon: KitchenIcon },
  { path: "/ingredients", label: "Ingrédients", icon: LocalGroceryStoreIcon },
  { path: "/family", label: "Ma Famille", icon: PeopleIcon },
  { path: "/deliveries", label: "Mes Livraisons", icon: LocalShippingIcon }, // Ajout du lien vers les livraisons
]

export default function Layout({ children }) {
  const { currentUser, userData } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

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
      await signOut(auth)
      navigate("/login")
      handleProfileMenuClose()
    } catch (error) {
      console.error("Failed to log out:", error)
    }
  }

  const isActivePath = (path) => {
    return location.pathname === path
  }

  // Mobile Navigation Drawer
  const drawer = (
    <Box
      sx={{
        width: 280,
        height: "100%",
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.accent} 100%)`,
        backdropFilter: "blur(20px)",
        borderRight: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      }}
    >
      {/* Drawer Header */}
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
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <div>
            <img
              src={Logo1 || "/placeholder.svg"}
              alt="Logo de l'application"
              style={{ width: "40px", height: "auto" }}
            />{" "}
            EasyMeal 2025
          </div>
        </Typography>
        <IconButton onClick={handleDrawerToggle} sx={{ color: theme.palette.text.secondary }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* User Info */}
      {currentUser && (
        <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 48,
                height: 48,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                fontSize: "1.2rem",
                fontWeight: 600,
              }}
            >
              {userData?.displayName?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {userData?.displayName || "Utilisateur"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentUser.email}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}

      {/* Navigation Items */}
      <List sx={{ px: 2, py: 2 }}>
        {currentUser ? (
          <>
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = isActivePath(item.path)
              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    component={RouterLink}
                    to={item.path}
                    onClick={handleDrawerToggle}
                    sx={{
                      borderRadius: 3,
                      py: 1.5,
                      px: 2,
                      backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.1) : "transparent",
                      color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                      "&:hover": {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        transform: "translateX(4px)",
                      },
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                        minWidth: 40,
                      }}
                    >
                      <Icon />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
            <Divider sx={{ my: 2, mx: 2 }} />
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleLogout}
                sx={{
                  borderRadius: 3,
                  py: 1.5,
                  px: 2,
                  mx: 2,
                  color: theme.palette.error.main,
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.error.main, 0.08),
                  },
                }}
              >
                <ListItemIcon sx={{ color: theme.palette.error.main, minWidth: 40 }}>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Déconnexion" />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          <>
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                component={RouterLink}
                to="/login"
                onClick={handleDrawerToggle}
                sx={{
                  borderRadius: 3,
                  py: 1.5,
                  px: 2,
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <LoginIcon />
                </ListItemIcon>
                <ListItemText primary="Connexion" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={RouterLink}
                to="/signup"
                onClick={handleDrawerToggle}
                sx={{
                  borderRadius: 3,
                  py: 1.5,
                  px: 2,
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <PersonAddIcon />
                </ListItemIcon>
                <ListItemText primary="Inscription" />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Modern AppBar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          color: theme.palette.text.primary,
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{
                mr: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  transform: "scale(1.05)",
                },
                transition: "all 0.2s ease",
              }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo */}
          <Typography
            variant="h5"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textDecoration: "none",
              fontSize: { xs: "1.3rem", sm: "1.5rem" },
              letterSpacing: "-0.5px",
              display: "flex",
              alignItems: "center",
              gap: 1,
              "&:hover": {
                transform: "scale(1.02)",
              },
              transition: "transform 0.2s ease",
            }}
          >
            <div>
              <img
                src={Logo1 || "/placeholder.svg"}
                alt="Logo de l'application"
                style={{ width: "50px", height: "auto" }}
              />{" "}
              EasyMeal 2025
            </div>
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Stack direction="row" spacing={1} alignItems="center">
              {currentUser ? (
                <>
                  {navigationItems.map((item) => {
                    const isActive = isActivePath(item.path)
                    return (
                      <Button
                        key={item.path}
                        component={RouterLink}
                        to={item.path}
                        startIcon={<item.icon />}
                        sx={{
                          color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                          backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.1) : "transparent",
                          borderRadius: 3,
                          px: 2,
                          py: 1,
                          fontWeight: isActive ? 600 : 400,
                          textTransform: "none",
                          "&:hover": {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            transform: "translateY(-1px)",
                          },
                          transition: "all 0.2s ease",
                        }}
                      >
                        {item.label}
                      </Button>
                    )
                  })}

                  {/* Profile Menu */}
                  <IconButton
                    onClick={handleProfileMenuOpen}
                    sx={{
                      ml: 2,
                      p: 0.5,
                      "&:hover": {
                        transform: "scale(1.05)",
                      },
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        fontSize: "1rem",
                        fontWeight: 600,
                      }}
                    >
                      {userData?.displayName?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>

                  <Menu
                    anchorEl={profileMenuAnchor}
                    open={Boolean(profileMenuAnchor)}
                    onClose={handleProfileMenuClose}
                    PaperProps={{
                      sx: {
                        borderRadius: 4,
                        mt: 1,
                        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                        backdropFilter: "blur(20px)",
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                        minWidth: 200,
                      },
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {userData?.displayName || "Utilisateur"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {currentUser.email}
                      </Typography>
                    </Box>
                    <MenuItem
                      component={RouterLink}
                      to="/profile"
                      onClick={handleProfileMenuClose}
                      sx={{
                        py: 1.5,
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        },
                      }}
                    >
                      <PersonIcon sx={{ mr: 2, fontSize: "1.2rem" }} />
                      Profil
                    </MenuItem>
                    <Divider sx={{ my: 0.5 }} />
                    <MenuItem
                      onClick={handleLogout}
                      sx={{
                        py: 1.5,
                        color: theme.palette.error.main,
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.error.main, 0.05),
                        },
                      }}
                    >
                      <LogoutIcon sx={{ mr: 2, fontSize: "1.2rem" }} />
                      Déconnexion
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Stack direction="row" spacing={1}>
                  <Button
                    component={RouterLink}
                    to="/login"
                    variant="outlined"
                    startIcon={<LoginIcon />}
                    sx={{
                      borderRadius: 3,
                      textTransform: "none",
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    Connexion
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/signup"
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    sx={{
                      borderRadius: 3,
                      textTransform: "none",
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.3)}`,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    Inscription
                  </Button>
                </Stack>
              )}
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        PaperProps={{
          sx: {
            background: "transparent",
            boxShadow: "none",
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: alpha(theme.palette.common.black, 0.7),
            backdropFilter: "blur(8px)",
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Container
        component="main"
        maxWidth="xl"
        sx={{
          flexGrow: 1,
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Fade in timeout={600}>
          <Box>{children}</Box>
        </Fade>
      </Container>

      {/* Futuristic Footer */}
      <Box
        component="footer"
        sx={{
          py: 4,
          px: 3,
          mt: "auto",
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          backdropFilter: "blur(20px)",
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative Elements */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: `linear-gradient(90deg, transparent 0%, ${theme.palette.primary.main} 50%, transparent 100%)`,
          }}
        />

        <Container maxWidth="xl">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center" justifyContent="space-between">
            <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  mb: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <RestaurantIcon sx={{ color: theme.palette.primary.main }} />
                EasyMeal 2025
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Savourez chaque moment culinaire en famille
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label="v2.0.0"
                size="small"
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  borderRadius: 2,
                }}
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
