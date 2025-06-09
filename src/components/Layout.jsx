"use client"

import { useState, useEffect } from "react"
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
  Collapse,
  Paper,
  Slide,
  Zoom,
  SwipeableDrawer,
  BottomNavigation,
  BottomNavigationAction,
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
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Store as StoreIcon,
  AdminPanelSettings as AdminIcon,
  ExpandLess,
  ExpandMore,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material"
import { useAuth } from "../contexts/AuthContext"
import { auth } from "../firebaseConfig"
import { signOut } from "firebase/auth"

const navigationCategories = [
  {
    title: "Principal",
    items: [
      { path: "/", label: "Accueil", icon: HomeIcon, color: "primary" },
      { path: "/planner", label: "Planificateur", icon: CalendarIcon, color: "secondary" },
    ],
  },
  {
    title: "Cuisine",
    items: [
      { path: "/recipes", label: "Mes Recettes", icon: RestaurantIcon, color: "warning" },
      { path: "/ingredients", label: "Ingrédients", icon: LocalGroceryStoreIcon, color: "success" },
      { path: "/stock", label: "Garde Manger", icon: KitchenIcon, color: "info" },
    ],
  },
  {
    title: "Shopping",
    items: [
      { path: "/shopping-list", label: "Liste de Courses", icon: ShoppingCartIcon, color: "error" },
      { path: "/deliveries", label: "Mes Livraisons", icon: LocalShippingIcon, color: "secondary" },
      { path: "/vendors", label: "Vendeurs", icon: StoreIcon, color: "primary" },
    ],
  },
  {
    title: "Social",
    items: [{ path: "/family", label: "Ma Famille", icon: PeopleIcon, color: "warning" }],
  },
]

const allNavigationItems = navigationCategories.flatMap((category) => category.items)

export default function ClientLayout({ children }) {
  const { currentUser, userData } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const isTablet = useMediaQuery(theme.breakpoints.between("md", "lg"))
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"))

  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null)
  const [moreOptionsAnchor, setMoreOptionsAnchor] = useState(null)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [bottomNavValue, setBottomNavValue] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Update bottom navigation based on current route
  useEffect(() => {
    const currentPath = location.pathname
    const mainPaths = ["/", "/planner", "/recipes", "/shopping-list", "/family"]
    const currentIndex = mainPaths.findIndex((path) => currentPath === path || currentPath.startsWith(path))
    if (currentIndex !== -1) {
      setBottomNavValue(currentIndex)
    }
  }, [location.pathname])

  useEffect(() => {
    const initialExpanded = {}
    navigationCategories.forEach((category) => {
      initialExpanded[category.title] =
        category.items.some((item) => isActivePath(item.path)) || category.title === "Principal"
    })
    setExpandedCategories(initialExpanded)
  }, [location.pathname])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleProfileMenuOpen = (event) => {
    setProfileMenuAnchor(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null)
  }

  const handleMoreOptionsOpen = (event) => {
    setMoreOptionsAnchor(event.currentTarget)
  }

  const handleMoreOptionsClose = () => {
    setMoreOptionsAnchor(null)
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
    return location.pathname === path || (path !== "/" && location.pathname.startsWith(path))
  }

  const isActiveCategory = (category) => {
    return category.items.some((item) => isActivePath(item.path))
  }

  const handleBottomNavChange = (event, newValue) => {
    setBottomNavValue(newValue)
    const paths = ["/", "/planner", "/recipes", "/shopping-list", "/family"]
    if (paths[newValue]) {
      navigate(paths[newValue])
    }
  }

  const drawer = (
    <Paper
      elevation={0}
      sx={{
        width: 300,
        height: "100%",
        background: `linear-gradient(145deg, 
          ${alpha(theme.palette.background.paper, 0.98)} 0%, 
          ${alpha(theme.palette.primary.main, 0.03)} 50%,
          ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRight: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
      }}
    >
      {/* Enhanced Header */}
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.primary.main, 0.08)} 0%, 
            ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 20% 50%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%)`,
          }}
        />
        <Box sx={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            <img src={Logo1 || "/placeholder.svg"} alt="Logo" style={{ width: "24px", height: "auto" }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: "1.1rem",
                lineHeight: 1.2,
              }}
            >
              EasyMeal 2025
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
              Planification culinaire
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            position: "relative",
            zIndex: 1,
            color: theme.palette.text.secondary,
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              transform: "rotate(90deg)",
            },
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Enhanced User Profile Section */}
      {currentUser && (
        <Box
          sx={{
            p: 3,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            background: `linear-gradient(135deg, 
              ${alpha(theme.palette.background.paper, 0.8)} 0%, 
              ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ position: "relative" }}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                  border: `3px solid ${alpha(theme.palette.background.paper, 0.8)}`,
                }}
              >
                {userData?.displayName?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
              </Avatar>
              <Box
                sx={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: theme.palette.success.main,
                  border: `2px solid ${theme.palette.background.paper}`,
                }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: "1rem" }} noWrap>
                {userData?.displayName || "Utilisateur"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.8rem" }}>
                {currentUser.email}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {userData?.isAdmin && (
                  <Chip
                    label="Admin"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.7rem",
                      backgroundColor: alpha(theme.palette.warning.main, 0.15),
                      color: theme.palette.warning.main,
                      fontWeight: 600,
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                    }}
                  />
                )}
                <Chip
                  label="En ligne"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
                    backgroundColor: alpha(theme.palette.success.main, 0.15),
                    color: theme.palette.success.main,
                    fontWeight: 600,
                  }}
                />
              </Stack>
            </Box>
          </Stack>
        </Box>
      )}

      {/* Enhanced Navigation */}
      <Box sx={{ flex: 1, overflow: "auto", py: 2 }}>
        <List sx={{ px: 2 }}>
          {currentUser ? (
            <>
              {navigationCategories.map((category, categoryIndex) => (
                <Box key={category.title}>
                  <Zoom in timeout={300 + categoryIndex * 100}>
                    <ListItemButton
                      onClick={() => toggleCategory(category.title)}
                      sx={{
                        borderRadius: 3,
                        mb: 1,
                        py: 1.5,
                        px: 2,
                        backgroundColor: isActiveCategory(category)
                          ? alpha(theme.palette.primary.main, 0.12)
                          : "transparent",
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          transform: "translateX(4px)",
                        },
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        border: `1px solid ${
                          isActiveCategory(category) ? alpha(theme.palette.primary.main, 0.2) : "transparent"
                        }`,
                      }}
                    >
                      <ListItemText
                        primary={category.title}
                        primaryTypographyProps={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: isActiveCategory(category) ? theme.palette.primary.main : theme.palette.text.secondary,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      />
                      {expandedCategories[category.title] ? (
                        <ExpandLess sx={{ color: theme.palette.primary.main }} />
                      ) : (
                        <ExpandMore sx={{ color: theme.palette.text.secondary }} />
                      )}
                    </ListItemButton>
                  </Zoom>

                  <Collapse in={expandedCategories[category.title]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ pl: 1 }}>
                      {category.items.map((item, itemIndex) => {
                        const Icon = item.icon
                        const isActive = isActivePath(item.path)
                        return (
                          <Slide
                            key={item.path}
                            direction="right"
                            in={expandedCategories[category.title]}
                            timeout={200 + itemIndex * 50}
                          >
                            <ListItem disablePadding sx={{ mb: 0.5 }}>
                              <ListItemButton
                                component={RouterLink}
                                to={item.path}
                                onClick={handleDrawerToggle}
                                sx={{
                                  borderRadius: 3,
                                  py: 1.5,
                                  px: 2,
                                  ml: 2,
                                  backgroundColor: isActive
                                    ? `linear-gradient(135deg, ${alpha(theme.palette[item.color].main, 0.15)} 0%, ${alpha(theme.palette[item.color].main, 0.08)} 100%)`
                                    : "transparent",
                                  color: isActive ? theme.palette[item.color].main : theme.palette.text.primary,
                                  border: isActive
                                    ? `1px solid ${alpha(theme.palette[item.color].main, 0.3)}`
                                    : "1px solid transparent",
                                  "&:hover": {
                                    backgroundColor: alpha(theme.palette[item.color].main, 0.1),
                                    transform: "translateX(8px)",
                                    boxShadow: `0 4px 12px ${alpha(theme.palette[item.color].main, 0.2)}`,
                                  },
                                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                  position: "relative",
                                  overflow: "hidden",
                                  "&::before": isActive
                                    ? {
                                        content: '""',
                                        position: "absolute",
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: 4,
                                        backgroundColor: theme.palette[item.color].main,
                                        borderRadius: "0 2px 2px 0",
                                      }
                                    : {},
                                }}
                              >
                                <ListItemIcon
                                  sx={{
                                    color: isActive ? theme.palette[item.color].main : theme.palette.text.secondary,
                                    minWidth: 40,
                                    transition: "all 0.3s ease",
                                  }}
                                >
                                  <Icon sx={{ fontSize: "1.4rem" }} />
                                </ListItemIcon>
                                <ListItemText
                                  primary={item.label}
                                  primaryTypographyProps={{
                                    fontWeight: isActive ? 600 : 400,
                                    fontSize: "0.95rem",
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          </Slide>
                        )
                      })}
                    </List>
                  </Collapse>
                </Box>
              ))}

              {/* Enhanced Admin Section */}
              {userData?.isAdmin && (
                <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.15)}` }}>
                  <Zoom in timeout={800}>
                    <ListItem disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        component={RouterLink}
                        to="/admin"
                        onClick={handleDrawerToggle}
                        sx={{
                          borderRadius: 3,
                          py: 1.5,
                          px: 2,
                          backgroundColor: isActivePath("/admin")
                            ? `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.15)} 0%, ${alpha(theme.palette.warning.main, 0.08)} 100%)`
                            : "transparent",
                          color: isActivePath("/admin") ? theme.palette.warning.main : theme.palette.text.primary,
                          border: `1px solid ${
                            isActivePath("/admin") ? alpha(theme.palette.warning.main, 0.3) : "transparent"
                          }`,
                          "&:hover": {
                            backgroundColor: alpha(theme.palette.warning.main, 0.1),
                            transform: "translateX(4px)",
                            boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.2)}`,
                          },
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: isActivePath("/admin") ? theme.palette.warning.main : theme.palette.text.secondary,
                            minWidth: 40,
                          }}
                        >
                          <AdminIcon sx={{ fontSize: "1.4rem" }} />
                        </ListItemIcon>
                        <ListItemText
                          primary="Administration"
                          primaryTypographyProps={{
                            fontWeight: isActivePath("/admin") ? 600 : 400,
                            fontSize: "0.95rem",
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  </Zoom>
                </Box>
              )}

              {/* Enhanced Logout Section */}
              <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.15)}` }}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={handleLogout}
                    sx={{
                      borderRadius: 3,
                      py: 1.5,
                      px: 2,
                      color: theme.palette.error.main,
                      "&:hover": {
                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                        transform: "translateX(4px)",
                      },
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <ListItemIcon sx={{ color: theme.palette.error.main, minWidth: 40 }}>
                      <LogoutIcon sx={{ fontSize: "1.4rem" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Déconnexion"
                      primaryTypographyProps={{ fontSize: "0.95rem", fontWeight: 500 }}
                    />
                  </ListItemButton>
                </ListItem>
              </Box>
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
                    py: 2,
                    px: 2,
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      transform: "translateX(4px)",
                    },
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
                    py: 2,
                    px: 2,
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      transform: "translateX(4px)",
                    },
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
    </Paper>
  )

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Enhanced AppBar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: isScrolled
            ? `linear-gradient(135deg, 
                ${alpha(theme.palette.background.paper, 0.98)} 0%, 
                ${alpha(theme.palette.primary.main, 0.02)} 100%)`
            : `linear-gradient(135deg, 
                ${alpha(theme.palette.background.paper, 0.95)} 0%, 
                ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          color: theme.palette.text.primary,
          zIndex: theme.zIndex.drawer + 1,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: isScrolled ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}` : "none",
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: { xs: "64px", sm: "72px" } }}>
          {(isMobile || isTablet) && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{
                mr: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                  transform: "scale(1.05)",
                },
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Enhanced Logo */}
          <Typography
            variant="h5"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              fontWeight: 800,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textDecoration: "none",
              fontSize: { xs: "1.3rem", sm: "1.5rem", md: "1.7rem" },
              letterSpacing: "-0.5px",
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 1.5 },
              "&:hover": {
                transform: "scale(1.02)",
              },
              transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <Box
              sx={{
                width: { xs: 36, sm: 44 },
                height: { xs: 36, sm: 44 },
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <img
                src={Logo1 || "/placeholder.svg"}
                alt="Logo"
                style={{
                  width: isMobile ? "20px" : "24px",
                  height: "auto",
                }}
              />
            </Box>
            EasyMeal 2025
          </Typography>

          {/* Desktop Navigation */}
          {isDesktop && (
            <Stack direction="row" spacing={1} alignItems="center">
              {currentUser ? (
                <>
                  {allNavigationItems.slice(0, 4).map((item) => {
                    const isActive = isActivePath(item.path)
                    return (
                      <Button
                        key={item.path}
                        component={RouterLink}
                        to={item.path}
                        startIcon={<item.icon />}
                        sx={{
                          color: isActive ? theme.palette[item.color].main : theme.palette.text.primary,
                          backgroundColor: isActive ? alpha(theme.palette[item.color].main, 0.1) : "transparent",
                          borderRadius: 3,
                          px: 2,
                          py: 1,
                          fontWeight: isActive ? 600 : 400,
                          textTransform: "none",
                          fontSize: "0.9rem",
                          minWidth: "auto",
                          border: `1px solid ${isActive ? alpha(theme.palette[item.color].main, 0.3) : "transparent"}`,
                          "&:hover": {
                            backgroundColor: alpha(theme.palette[item.color].main, 0.08),
                            transform: "translateY(-1px)",
                            boxShadow: `0 4px 12px ${alpha(theme.palette[item.color].main, 0.2)}`,
                          },
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      >
                        {item.label}
                      </Button>
                    )
                  })}

                  {allNavigationItems.length > 4 && (
                    <Tooltip title="Plus d'options">
                      <IconButton
                        size="small"
                        onClick={handleMoreOptionsOpen}
                        sx={{
                          color: theme.palette.text.secondary,
                          "&:hover": {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          },
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Tooltip>
                  )}

                  <Menu
                    anchorEl={moreOptionsAnchor}
                    open={Boolean(moreOptionsAnchor)}
                    onClose={handleMoreOptionsClose}
                    PaperProps={{
                      sx: {
                        borderRadius: 3,
                        mt: 1,
                        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                      },
                    }}
                  >
                    {allNavigationItems.slice(4).map((item) => (
                      <MenuItem
                        key={item.path}
                        component={RouterLink}
                        to={item.path}
                        onClick={handleMoreOptionsClose}
                        sx={{
                          py: 1.5,
                          "&:hover": {
                            backgroundColor: alpha(theme.palette[item.color].main, 0.05),
                          },
                        }}
                      >
                        <item.icon sx={{ mr: 2, fontSize: "1.2rem", color: theme.palette[item.color].main }} />
                        {item.label}
                      </MenuItem>
                    ))}
                  </Menu>

                  {userData?.isAdmin && (
                    <Button
                      component={RouterLink}
                      to="/admin"
                      startIcon={<AdminIcon />}
                      sx={{
                        color: isActivePath("/admin") ? theme.palette.warning.main : theme.palette.text.primary,
                        backgroundColor: isActivePath("/admin")
                          ? alpha(theme.palette.warning.main, 0.1)
                          : "transparent",
                        borderRadius: 3,
                        px: 2,
                        py: 1,
                        fontWeight: isActivePath("/admin") ? 600 : 400,
                        textTransform: "none",
                        fontSize: "0.9rem",
                        ml: 1,
                        border: `1px solid ${
                          isActivePath("/admin") ? alpha(theme.palette.warning.main, 0.3) : "transparent"
                        }`,
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.warning.main, 0.08),
                          transform: "translateY(-1px)",
                        },
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    >
                      Admin
                    </Button>
                  )}

                  <Tooltip title="Notifications">
                    <IconButton
                      sx={{
                        ml: 2,
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

                  <IconButton
                    onClick={handleProfileMenuOpen}
                    sx={{
                      ml: 1,
                      p: 0.5,
                      "&:hover": {
                        transform: "scale(1.05)",
                      },
                      transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        fontSize: "1rem",
                        fontWeight: 600,
                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`,
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
                        minWidth: 220,
                      },
                    }}
                  >
                    <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
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
                    <MenuItem
                      sx={{
                        py: 1.5,
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        },
                      }}
                    >
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
                      fontSize: "0.9rem",
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
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
                      fontSize: "0.9rem",
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.3)}`,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                      },
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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

      {/* Enhanced Drawer */}
      <SwipeableDrawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        onOpen={handleDrawerToggle}
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
      </SwipeableDrawer>

      {/* Main Content */}
      <Container
        component="main"
        maxWidth="xl"
        sx={{
          flexGrow: 1,
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3 },
          width: "100%",
          maxWidth: "100%",
          mb: isMobile ? 8 : 0, // Add margin bottom for mobile bottom navigation
        }}
      >
        <Fade in timeout={600}>
          <Box sx={{ width: "100%" }}>{children}</Box>
        </Fade>
      </Container>

      {/* Mobile Bottom Navigation */}
      {isMobile && currentUser && (
        <Paper
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar,
            background: `linear-gradient(135deg, 
              ${alpha(theme.palette.background.paper, 0.98)} 0%, 
              ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            backdropFilter: "blur(20px)",
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
          elevation={8}
        >
          <BottomNavigation
            value={bottomNavValue}
            onChange={handleBottomNavChange}
            sx={{
              backgroundColor: "transparent",
              "& .MuiBottomNavigationAction-root": {
                color: theme.palette.text.secondary,
                "&.Mui-selected": {
                  color: theme.palette.primary.main,
                },
                minWidth: "auto",
                padding: "6px 12px 8px",
              },
            }}
          >
            <BottomNavigationAction label="Accueil" icon={<HomeIcon />} />
            <BottomNavigationAction label="Planning" icon={<CalendarIcon />} />
            <BottomNavigationAction label="Recettes" icon={<RestaurantIcon />} />
            <BottomNavigationAction label="Courses" icon={<ShoppingCartIcon />} />
            <BottomNavigationAction label="Famille" icon={<PeopleIcon />} />
          </BottomNavigation>
        </Paper>
      )}

      {/* Enhanced Footer */}
      <Box
        component="footer"
        sx={{
          py: { xs: 4, sm: 6 },
          px: 3,
          mt: "auto",
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.background.paper, 0.95)} 0%, 
            ${alpha(theme.palette.primary.main, 0.03)} 50%,
            ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
          backdropFilter: "blur(20px)",
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: `linear-gradient(90deg, 
              transparent 0%, 
              ${theme.palette.primary.main} 25%, 
              ${theme.palette.secondary.main} 75%, 
              transparent 100%)`,
          }}
        />
        <Container maxWidth="xl">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 3, sm: 4 }}
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
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "center", sm: "flex-start" },
                  gap: 1.5,
                  fontSize: { xs: "1.1rem", sm: "1.3rem" },
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  <RestaurantIcon sx={{ color: "white", fontSize: "1.2rem" }} />
                </Box>
                EasyMeal 2025
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                Savourez chaque moment culinaire en famille
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
              <Chip
                label="v2.1.0"
                size="small"
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.8rem" } }}>
                © {new Date().getFullYear()} - Conçu pour l'avenir culinaire
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}
