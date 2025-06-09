import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
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
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Stack,
  Badge,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ListAlt as ListAltIcon,
  Store as StoreIcon,
  LocalShipping as DeliveryIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import Logo1 from '/public/Logo1.png';

const drawerWidth = 280;

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
  { text: 'Recipes', icon: <ListAltIcon />, path: '/admin/recipes' },
  { text: 'Ingredients', icon: <StoreIcon />, path: '/admin/ingredients' },
  { text: 'Vendors', icon: <StoreIcon />, path: '/admin/vendors' },
  { text: 'Deliveries', icon: <DeliveryIcon />, path: '/admin/deliveries' },
];

export default function AdminLayout({ children }) {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
      handleProfileMenuClose();
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const drawer = (
    <Paper
      elevation={0}
      sx={{
        width: drawerWidth,
        height: '100%',
        background: `linear-gradient(145deg, 
          ${alpha(theme.palette.background.paper, 0.98)} 0%, 
          ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 100%)`,
        }}
      >
        <Typography
          variant='h6'
          sx={{
            fontWeight: 800,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            fontSize: '1.1rem',
          }}
        >
          <img src={Logo1 || '/placeholder.svg'} alt='Logo' style={{ width: '32px', height: 'auto' }} />
          Admin Panel
        </Typography>
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              transform: 'rotate(90deg)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {currentUser && (
        <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Stack direction='row' spacing={2} alignItems='center'>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                fontSize: '1.2rem',
                fontWeight: 700,
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
              }}
            >
              {userData?.displayName?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant='subtitle1' sx={{ fontWeight: 600, fontSize: '0.95rem' }} noWrap>
                {userData?.displayName || 'Utilisateur'}
              </Typography>
              <Typography variant='caption' color='text.secondary' noWrap>
                {currentUser.email}
              </Typography>
              {userData?.isAdmin && (
                <Chip
                  label='Admin'
                  size='small'
                  sx={{
                    mt: 0.5,
                    height: 20,
                    fontSize: '0.7rem',
                    backgroundColor: alpha(theme.palette.warning.main, 0.15),
                    color: theme.palette.warning.main,
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </Stack>
        </Box>
      )}

      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        <List sx={{ px: 2 }}>
          {currentUser ? (
            <>
              {navItems.map((item) => {
                const isActive = isActivePath(item.path);
                return (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      component={RouterLink}
                      to={item.path}
                      onClick={handleDrawerToggle}
                      sx={{
                        borderRadius: 2,
                        py: 1.2,
                        px: 2,
                        backgroundColor: isActive
                          ? alpha(theme.palette.primary.main, 0.15)
                          : 'transparent',
                        color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                        border: isActive
                          ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                          : '1px solid transparent',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          transform: 'translateX(4px)',
                        },
                        transition: 'all 0.3s ease',
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
                        primaryTypographyProps={{
                          fontWeight: isActive ? 600 : 400,
                          fontSize: '0.9rem',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
              <Divider sx={{ my: 2, mx: 2, borderColor: alpha(theme.palette.divider, 0.15) }} />
              <ListItem disablePadding>
                <ListItemButton
                  onClick={handleLogout}
                  sx={{
                    borderRadius: 2,
                    py: 1.2,
                    px: 2,
                    mx: 2,
                    color: theme.palette.error.main,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ListItemIcon sx={{ color: theme.palette.error.main, minWidth: 36 }}>
                    <LogoutIcon sx={{ fontSize: '1.3rem' }} />
                  </ListItemIcon>
                  <ListItemText primary='Déconnexion' primaryTypographyProps={{ fontSize: '0.9rem' }} />
                </ListItemButton>
              </ListItem>
            </>
          ) : (
            <>
              <ListItem disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  component={RouterLink}
                  to='/login'
                  onClick={handleDrawerToggle}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      transform: 'translateX(4px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <LogoutIcon />
                  </ListItemIcon>
                  <ListItemText primary='Connexion' />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to='/signup'
                  onClick={handleDrawerToggle}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      transform: 'translateX(4px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <LogoutIcon />
                  </ListItemIcon>
                  <ListItemText primary='Inscription' />
                </ListItemButton>
              </ListItem>
            </>
          )}
        </List>
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar
        position='sticky'
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.background.paper, 0.95)} 0%, 
            ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          color: theme.palette.text.primary,
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: { xs: '56px', sm: '64px' } }}>
          {(isMobile || isTablet) && (
            <IconButton
              color='inherit'
              aria-label='open drawer'
              edge='start'
              onClick={handleDrawerToggle}
              sx={{
                mr: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant='h5'
            component={RouterLink}
            to='/admin'
            sx={{
              flexGrow: 1,
              fontWeight: 800,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textDecoration: 'none',
              fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.5rem' },
              letterSpacing: '-0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 1.5 },
              '&:hover': {
                transform: 'scale(1.02)',
              },
              transition: 'transform 0.2s ease',
            }}
          >
            <img
              src={Logo1 || '/placeholder.svg'}
              alt='Logo'
              style={{
                width: isMobile ? '32px' : '40px',
                height: 'auto',
              }}
            />
            Admin Panel
          </Typography>
          {!isMobile && !isTablet && (
            <Stack direction='row' spacing={0.5} alignItems='center'>
              {currentUser ? (
                <>
                  {navItems.map((item) => {
                    const isActive = isActivePath(item.path);
                    return (
                      <Button
                        key={item.path}
                        component={RouterLink}
                        to={item.path}
                        startIcon={item.icon}
                        sx={{
                          color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                          backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                          borderRadius: 2,
                          px: 1.5,
                          py: 0.8,
                          fontWeight: isActive ? 600 : 400,
                          textTransform: 'none',
                          fontSize: '0.875rem',
                          minWidth: 'auto',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.06),
                            transform: 'translateY(-1px)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {item.text}
                      </Button>
                    );
                  })}
                  <Tooltip title='Notifications'>
                    <IconButton
                      sx={{
                        ml: 1,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      <Badge badgeContent={3} color='error'>
                        <NotificationsIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    onClick={handleProfileMenuOpen}
                    sx={{
                      ml: 1,
                      p: 0.5,
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`,
                      }}
                    >
                      {userData?.displayName?.charAt(0) || currentUser?.email?.charAt(0).toUpperCase()}
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
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                        minWidth: 200,
                      },
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                      <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                        {userData?.displayName || 'Utilisateur'}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {currentUser?.email}
                      </Typography>
                    </Box>
                    <MenuItem
                      component={RouterLink}
                      to='/profile'
                      onClick={handleProfileMenuClose}
                      sx={{
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        },
                      }}
                    >
                      <PersonIcon sx={{ mr: 2, fontSize: '1.2rem' }} />
                      Profil
                    </MenuItem>
                    <MenuItem
                      sx={{
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        },
                      }}
                    >
                      <SettingsIcon sx={{ mr: 2, fontSize: '1.2rem' }} />
                      Paramètres
                    </MenuItem>
                    <Divider sx={{ my: 0.5 }} />
                    <MenuItem
                      onClick={handleLogout}
                      sx={{
                        py: 1.5,
                        color: theme.palette.error.main,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.error.main, 0.05),
                        },
                      }}
                    >
                      <LogoutIcon sx={{ mr: 2, fontSize: '1.2rem' }} />
                      Déconnexion
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Stack direction='row' spacing={1}>
                  <Button
                    component={RouterLink}
                    to='/login'
                    variant='outlined'
                    startIcon={<LogoutIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      fontSize: '0.875rem',
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Connexion
                  </Button>
                  <Button
                    component={RouterLink}
                    to='/signup'
                    variant='contained'
                    startIcon={<LogoutIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.3)}`,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                      },
                      transition: 'all 0.3s ease',
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

      <Drawer
        variant='temporary'
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        PaperProps={{
          sx: {
            background: 'transparent',
            boxShadow: 'none',
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: alpha(theme.palette.common.black, 0.7),
            backdropFilter: 'blur(8px)',
          },
        }}
      >
        {drawer}
      </Drawer>

      <Container
        component='main'
        maxWidth='xl'
        sx={{
          flexGrow: 1,
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3 },
          width: '100%',
          maxWidth: '100%',
        }}
      >
        <Box sx={{ width: '100%' }}>{children}</Box>
      </Container>

      <Box
        component='footer'
        sx={{
          py: { xs: 3, sm: 4 },
          px: 3,
          mt: 'auto',
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.background.paper, 0.95)} 0%, 
            ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${theme.palette.primary.main} 50%, transparent 100%)`,
          }}
        />
        <Container maxWidth='xl'>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 2, sm: 3 }}
            alignItems='center'
            justifyContent='space-between'
          >
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography
                variant='h6'
                sx={{
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: { xs: 'center', sm: 'flex-start' },
                  gap: 1,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                }}
              >
                <AdminIcon sx={{ color: theme.palette.primary.main }} />
                Admin Panel
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                Gérer votre plateforme culinaire
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems='center'>
              <Chip
                label='v2.1.0'
                size='small'
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              />
              <Typography variant='caption' color='text.secondary' sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                © {new Date().getFullYear()} - Conçu pour l'avenir
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}