"use client"

import { useState, useEffect } from "react"
import Logo1 from "/public/Logo1.png"
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom"
import {
  AppBar,
  Toolbar,
  Typography,
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
  Collapse,
  TextField,
  InputAdornment,
  Tooltip,
  Paper,
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
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Store as StoreIcon,
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material"
import { useAuth } from "../contexts/AuthContext"
import { auth } from "../firebaseConfig"
import { signOut } from "firebase/auth"

const navigationCategories = [
  {
    title: "Principal",
    items: [
      { path: "/", label: "Accueil", icon: HomeIcon },
      { path: "/planner", label: "Planificateur", icon: CalendarIcon },
    ],
  },
  {
    title: "Cuisine",
    items: [
      { path: "/recipes", label: "Mes Recettes", icon: RestaurantIcon },
      { path: "/ingredients", label: "Ingrédients", icon: LocalGroceryStoreIcon },
      { path: "/stock", label: "Garde Manger", icon: KitchenIcon },
    ],
  },
  {
    title: "Shopping",
    items: [
      { path: "/shopping-list", label: "Liste de Courses", icon: ShoppingCartIcon },
      { path: "/deliveries", label: "Mes Livraisons", icon: LocalShippingIcon },
      { path: "/vendors", label: "Vendeurs", icon: StoreIcon },
    ],
  },
  {
    title: "Social",
    items: [{ path: "/family", label: "Ma Famille", icon: PeopleIcon }],
  },
]

export default function Layout({ children }) {
  const { currentUser, userData } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"))

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    setSidebarOpen(!isMobile)
  }, [isMobile])

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen)
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

  const toggleCategory = (categoryTitle) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryTitle]: !prev[categoryTitle],
    }))
  }

  const isActivePath = (path) => {
    return location.pathname === path
  }

  const isActiveCategory = (category) => {
    return category.items.some((item) => isActivePath(item.path))
  }

  // Initialize expanded categories
  useEffect(() => {
    const initialExpanded = {}
    navigationCategories.forEach((category) => {
      initialExpanded[category.title] = isActiveCategory(category) || category.title === "Principal"
    })
    setExpandedCategories(initialExpanded)
  }, [location.pathname])

  // Modern Sidebar
  const sidebar = (
    <Paper
      elevation={0}
      sx={{
        width: 280,
        height: "100vh",
        background: `linear-gradient(145deg, 
          ${alpha(theme.palette.background.paper, 0.95)} 0%, 
          ${alpha(theme.palette.primary.main, 0.02)} 50%,
          ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
        backdropFilter: "blur(20px)",
        borderRight: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 1200,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Sidebar Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 100%)`,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              fontSize: "1.1rem",
            }}
          >
            <img src={Logo1 || "/placeholder.svg"} alt="Logo" style={{ width: "32px", height: "auto" }} />
            EasyMeal 2025
          </Typography>
          {isMobile && (
            <IconButton
              onClick={handleSidebarToggle}
              sx={{
                color: theme.palette.text.secondary,
                "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.05) },
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Stack>

        {/* Search Bar */}
        <TextField
          fullWidth
          size="small"
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme.palette.text.secondary, fontSize: "1.2rem" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mt: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.background.paper, 0.7),
              backdropFilter: "blur(10px)",
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              "&:hover": {
                backgroundColor: alpha(theme.palette.background.paper, 0.9),
              },
              "&.Mui-focused": {
                backgroundColor: alpha(theme.palette.background.paper, 1),
                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
              },
            },
          }}
        />
      </Box>

      {/* User Info */}
      {currentUser && (
        <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 48,
                height: 48,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                fontSize: "1.2rem",
                fontWeight: 700,
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              {userData?.displayName?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: "0.95rem" }} noWrap>
                {userData?.displayName || "Utilisateur"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {currentUser.email}
              </Typography>
              {userData?.isAdmin && (
                <Chip
                  label="Admin"
                  size="small"
                  sx={{
                    mt: 0.5,
                    height: 20,
                    fontSize: "0.7rem",
                    backgroundColor: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.main,
                  }}
                />
              )}
            </Box>
          </Stack>
        </Box>
      )}

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: "auto", py: 1 }}>
        {currentUser ? (
          <List sx={{ px: 2 }}>
            {navigationCategories.map((category) => (
              <Box key={category.title}>
                <ListItemButton
                  onClick={() => toggleCategory(category.title)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    py: 1,
                    backgroundColor: isActiveCategory(category)
                      ? alpha(theme.palette.primary.main, 0.08)
                      : "transparent",
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                >
                  <ListItemText
                    primary={category.title}
                    primaryTypographyProps={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  />
                  {expandedCategories[category.title] ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>

                <Collapse in={expandedCategories[category.title]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 1 }}>
                    {category.items.map((item) => {
                      const Icon = item.icon
                      const isActive = isActivePath(item.path)
                      return (
                        <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                          <ListItemButton
                            component={RouterLink}
                            to={item.path}
                            onClick={isMobile ? handleSidebarToggle : undefined}
                            sx={{
                              borderRadius: 2,
                              py: 1.2,
                              px: 2,
                              backgroundColor: isActive
                                ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`
                                : "transparent",
                              color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                              border: isActive
                                ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                                : "1px solid transparent",
                              "&:hover": {
                                backgroundColor: alpha(theme.palette.primary.main, 0.06),
                                transform: "translateX(4px)",
                              },
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                                minWidth: 36,
                              }}
                            >
                              <Icon sx={{ fontSize: "1.3rem" }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={item.label}
                              primaryTypographyProps={{
                                fontWeight: isActive ? 600 : 400,
                                fontSize: "0.9rem",
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      )
                    })}
                  </List>
                </Collapse>
              </Box>
            ))}

            {/* Admin Section */}
            {userData?.isAdmin && (
              <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    component={RouterLink}
                    to="/admin"
                    onClick={isMobile ? handleSidebarToggle : undefined}
                    sx={{
                      borderRadius: 2,
                      py: 1.2,
                      px: 2,
                      backgroundColor: isActivePath("/admin") ? alpha(theme.palette.warning.main, 0.1) : "transparent",
                      color: isActivePath("/admin") ? theme.palette.warning.main : theme.palette.text.primary,
                      "&:hover": {
                        backgroundColor: alpha(theme.palette.warning.main, 0.08),
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isActivePath("/admin") ? theme.palette.warning.main : theme.palette.text.secondary,
                        minWidth: 36,
                      }}
                    >
                      <AdminIcon sx={{ fontSize: "1.3rem" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Administration"
                      primaryTypographyProps={{
                        fontWeight: isActivePath("/admin") ? 600 : 400,
                        fontSize: "0.9rem",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              </Box>
            )}

            {/* Logout */}
            <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={handleLogout}
                  sx={{
                    borderRadius: 2,
                    py: 1.2,
                    px: 2,
                    color: theme.palette.error.main,
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.error.main, 0.08),
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: theme.palette.error.main, minWidth: 36 }}>
                    <LogoutIcon sx={{ fontSize: "1.3rem" }} />
                  </ListItemIcon>
                  <ListItemText primary="Déconnexion" primaryTypographyProps={{ fontSize: "0.9rem" }} />
                </ListItemButton>
              </ListItem>
            </Box>
          </List>
        ) : (
          <List sx={{ px: 2 }}>
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                component={RouterLink}
                to="/login"
                onClick={isMobile ? handleSidebarToggle : undefined}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  px: 2,
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <LoginIcon />
                </ListItemIcon>
                <ListItemText primary="Connexion" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={RouterLink}
                to="/signup"
                onClick={isMobile ? handleSidebarToggle : undefined}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  px: 2,
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <PersonAddIcon />
                </ListItemIcon>
                <ListItemText primary="Inscription" />
              </ListItemButton>
            </ListItem>
          </List>
        )}
      </Box>
    </Paper>
  )

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      {!isMobile ? (
        <Box
          sx={{
            width: sidebarOpen ? 280 : 0,
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
          }}
        >
          {sidebar}
        </Box>
      ) : (
        <Drawer
          variant="temporary"
          open={sidebarOpen}
          onClose={handleSidebarToggle}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              background: "transparent",
              boxShadow: "none",
              width: 280,
            },
          }}
          BackdropProps={{
            sx: {
              backgroundColor: alpha(theme.palette.common.black, 0.7),
              backdropFilter: "blur(8px)",
            },
          }}
        >
          {sidebar}
        </Drawer>
      )}

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top Bar */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, 
              ${alpha(theme.palette.background.paper, 0.95)} 0%, 
              ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            backdropFilter: "blur(20px)",
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            color: theme.palette.text.primary,
          }}
        >
          <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: "64px !important" }}>
            {/* Menu Toggle */}
            <IconButton
              color="inherit"
              aria-label="toggle sidebar"
              onClick={handleSidebarToggle}
              sx={{
                mr: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                  transform: "scale(1.05)",
                },
                transition: "all 0.2s ease",
              }}
            >
              <MenuIcon />
            </IconButton>

            {/* Page Title */}
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
              {navigationCategories.flatMap((cat) => cat.items).find((item) => item.path === location.pathname)
                ?.label || "EasyMeal"}
            </Typography>

            {/* Right Side Actions */}
            <Stack direction="row" spacing={1} alignItems="center">
              {currentUser && (
                <>
                  {/* Notifications */}
                  <Tooltip title="Notifications">
                    <IconButton
                      sx={{
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      <Badge badgeContent={3} color="error">
                        <NotificationsIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>

                  {/* Profile */}
                  <IconButton
                    onClick={handleProfileMenuOpen}
                    sx={{
                      p: 0.5,
                      "&:hover": {
                        transform: "scale(1.05)",
                      },
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        fontSize: "0.9rem",
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
                        borderRadius: 3,
                        mt: 1,
                        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                        backdropFilter: "blur(20px)",
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                        minWidth: 200,
                      },
                    }}
                  >
                    <MenuItem component={RouterLink} to="/profile" onClick={handleProfileMenuClose} sx={{ py: 1.5 }}>
                      <PersonIcon sx={{ mr: 2, fontSize: "1.2rem" }} />
                      Profil
                    </MenuItem>
                    <MenuItem sx={{ py: 1.5 }}>
                      <SettingsIcon sx={{ mr: 2, fontSize: "1.2rem" }} />
                      Paramètres
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
              )}
            </Stack>
          </Toolbar>
        </AppBar>

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

        {/* Modern Footer */}
        <Box
          component="footer"
          sx={{
            py: 3,
            px: 3,
            mt: "auto",
            background: `linear-gradient(135deg, 
              ${alpha(theme.palette.background.paper, 0.95)} 0%, 
              ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            backdropFilter: "blur(20px)",
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Container maxWidth="xl">
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="body2" color="text.secondary">
                © {new Date().getFullYear()} EasyMeal 2025 - Conçu pour l'avenir
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  label="v2.1.0"
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                  }}
                />
              </Stack>
            </Stack>
          </Container>
        </Box>
      </Box>
    </Box>
  )
}
