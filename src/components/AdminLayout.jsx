import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, useTheme } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ListAlt as ListAltIcon,
  Store as StoreIcon, // For Ingredients and Vendors
  LocalShipping as DeliveryIcon,
  // Add other icons if used in drawerItems
} from '@mui/icons-material';

const drawerWidth = 240;

const drawerItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/admin" },
  { text: "Users", icon: <PeopleIcon />, path: "/admin/users" },
  { text: "Recipes", icon: <ListAltIcon />, path: "/admin/recipes" },
  { text: "Ingredients", icon: <StoreIcon />, path: "/admin/ingredients" },
  { text: "Vendors", icon: <StoreIcon />, path: "/admin/vendors" },
  { text: "Deliveries", icon: <DeliveryIcon />, path: "/admin/deliveries" },
];

function AdminLayout({ children }) {
  const theme = useTheme();
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            // Adding some basic styling for the drawer paper
            backgroundColor: theme.palette.grey[100], // A light grey background
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
        variant="persistent"
        anchor="left"
        open={true} // Persistent drawer is always open
      >
        <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: theme.spacing(0, 1) }}>
          {/* You can add a Logo or Admin Panel Title here */}
          <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
            Admin Panel
          </Typography>
        </Toolbar>
        {/* <Divider /> */}
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {drawerItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    component={RouterLink}
                    to={item.path}
                    sx={{
                      minHeight: 48,
                      justifyContent: 'initial',
                      px: 2.5,
                      mb: 0.5, // Margin bottom for spacing
                      borderRadius: '4px', // Rounded corners
                      margin: theme.spacing(0.5, 1), // Margin around items
                      backgroundColor: isActive ? theme.palette.primary.main : 'transparent',
                      color: isActive ? theme.palette.primary.contrastText : theme.palette.text.primary,
                      '&:hover': {
                        backgroundColor: isActive ? theme.palette.primary.dark : theme.palette.action.hover,
                        color: isActive ? theme.palette.primary.contrastText : theme.palette.text.primary,
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: 3, // Margin right for icon
                        justifyContent: 'center',
                        color: isActive ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      sx={{ opacity: 1 }}
                      primaryTypographyProps={{ fontWeight: isActive ? 'bold' : 'normal' }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          marginLeft: `${drawerWidth}px`, // Ensure content doesn't go under the drawer if drawer is not 'persistent' in the traditional sense in some setups
          mt: 0 // Assuming no global AppBar for admin, so no need for Toolbar spacer here.
                  // If there WAS an admin-specific AppBar, a <Toolbar /> might be needed here.
        }}
      >
        {/* This Toolbar was a spacer in AdminDashboard, might not be needed if no Admin specific AppBar is used.
            If pages need space from the top, they can add it themselves or we can add a <Toolbar /> here.
            For now, let's remove it to see the effect.
        */}
        {/* <Toolbar /> */}
        {children}
      </Box>
    </Box>
  );
}

export default AdminLayout;
