import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  LocalLaundryService as LaundryIcon,
  Inventory as InventoryIcon,
  BarChart as ReportIcon,
  People as PeopleIcon,
  AccountCircle,
  ExitToApp as LogoutIcon,
  Store as BranchIcon,
  Receipt as ServiceIcon,
  ArrowBack as ArrowBackIcon,
  AccountBalanceWallet as ExpenseIcon,
} from '@mui/icons-material';

const drawerWidth = 260;

const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const currentDrawerWidth = isAdmin() ? drawerWidth : 0;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['ROLE_ADMIN', 'ROLE_USER'] },
    { text: 'Transactions', icon: <LaundryIcon />, path: '/transactions', roles: ['ROLE_ADMIN'] },
    { text: 'Services & Rates', icon: <ServiceIcon />, path: '/services', roles: ['ROLE_ADMIN'] },
    { text: 'Expenses Ledger', icon: <ExpenseIcon />, path: '/expenses', roles: ['ROLE_ADMIN'] },
    { text: 'Branches', icon: <BranchIcon />, path: '/branches', roles: ['ROLE_ADMIN'] },
    { text: 'Soap Inventory', icon: <InventoryIcon />, path: '/inventory', roles: ['ROLE_ADMIN'] },
    { text: 'Reports & Analytics', icon: <ReportIcon />, path: '/reports', roles: ['ROLE_ADMIN'] },
    { text: 'Employee Accounts', icon: <PeopleIcon />, path: '/users', roles: ['ROLE_ADMIN'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, backgroundColor: theme.palette.primary.dark }}>
        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
          <LaundryIcon sx={{ fontSize: 18 }} />
        </Avatar>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>
          Tacky laundry service
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      <List sx={{ px: 1, py: 2, flex: 1 }}>
        {filteredMenuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  backgroundColor: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: active ? 'secondary.main' : 'rgba(255, 255, 255, 0.75)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    '& .MuiListItemIcon-root': { color: 'white' }
                  },
                }}
              >
                <ListItemIcon sx={{ color: active ? 'secondary.main' : 'rgba(255, 255, 255, 0.6)', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: active ? 600 : 400 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      <Box sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.15)' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', textAlign: 'center' }}>
          Tacky Laundry Service v1.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { md: `${currentDrawerWidth}px` },
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: isAdmin() ? { md: 'none' } : 'none' }}
          >
            <MenuIcon />
          </IconButton>
          {!isAdmin() && location.pathname !== '/dashboard' && (
            <IconButton
              color="inherit"
              aria-label="back to dashboard"
              edge="start"
              onClick={() => navigate('/dashboard')}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            {location.pathname === '/dashboard' ? 'Overview Dashboard' :
             location.pathname === '/transactions' ? 'Laundry Logs' :
             location.pathname === '/branches' ? 'Branch Management' :
             location.pathname === '/inventory' ? 'Soap Stock Inventory' :
             location.pathname === '/reports' ? 'Performance Reports' :
             location.pathname === '/users' ? 'Employee Management' : 'System'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {user?.fullName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {user?.role === 'ROLE_ADMIN' 
                  ? `Administrator (${user?.branchName || 'All Branches'})` 
                  : `Employee (${user?.branchName || 'No Branch Assigned'})`}
              </Typography>
            </Box>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="primary"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>{user?.username}</MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" color="error" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      {isAdmin() && (
        <Box
          component="nav"
          sx={{ width: { md: currentDrawerWidth }, flexShrink: { md: 0 } }}
          aria-label="mailbox folders"
        >
          {/* Mobile Drawer */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawerContent}
          </Drawer>
          {/* Desktop Drawer */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        </Box>
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          overflowX: 'hidden',
          mt: 8,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
