"use client"

import { Outlet, Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Drawer,
  IconButton,
  Divider,
  Paper,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import InventoryIcon from "@mui/icons-material/Inventory"; // Added for Products
import { useState } from "react";

const drawerWidth = 240;

function VendorLayout() {
  const { logout, userData } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
      // Optionally show an error message to the user
    }
  };

  const drawerItems = (
    <Box sx={{ overflow: 'auto' }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold', color: 'primary.main' }}>
          Espace Vendeur
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding component={RouterLink} to="/vendor/dashboard" sx={{ color: 'text.primary' }}>
          <ListItemButton>
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Tableau de Bord" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding component={RouterLink} to="/vendor/profile" sx={{ color: 'text.primary' }}>
          <ListItemButton>
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="Profil Vendeur" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding component={RouterLink} to="/vendor/products" sx={{ color: 'text.primary' }}>
          <ListItemButton>
            <ListItemIcon>
              <InventoryIcon />
            </ListItemIcon>
            <ListItemText primary="Mes Produits" />
          </ListItemButton>
        </ListItem>
        {/* Add more vendor-specific links here as needed */}
      </List>
      <Divider sx={{ my: 1 }} />
      <List>
        <ListItem disablePadding onClick={handleLogout} sx={{ color: 'text.primary' }}>
          <ListItemButton>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Déconnexion" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          // backgroundColor: 'background.paper',
          // color: 'text.primary'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }} // Changed sm to md
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
             {userData?.name ? `Vendeur: ${userData.name}` : "Espace Vendeur"}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Déconnexion
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: "block", md: "none" }, // Changed sm to md
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
          },
        }}
      >
        {drawerItems}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" }, // Changed sm to md
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
          },
        }}
        open
      >
        {drawerItems}
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` }, // Changed sm to md
          overflow: "auto", // Ensure content is scrollable if it overflows
        }}
      >
        <Toolbar /> {/* Necessary to offset content below AppBar */}
        <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}> {/* Added some margin top/bottom */}
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 2 }, borderRadius: 2, minHeight: '80vh' }}> {/* Added minHeight */}
            <Outlet />
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}

export default VendorLayout;
