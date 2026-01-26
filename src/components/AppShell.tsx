import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  Tune as PreferencesIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { Sidebar } from './Sidebar';
import { TeamMemberModal } from './TeamMemberModal';
import { TimeTrackerWidget } from './TimeTrackerWidget';
import { UserAvatar } from './shared/UserAvatar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const PREFS_STORAGE_KEY = 'zhuzh_user_preferences';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const HEADER_HEIGHT = 64;

// Map routes to view names
const routeToView: Record<string, string> = {
  '/': 'dashboard',
  '/budget': 'budget',
  '/approvals': 'approvals',
  '/timesheet': 'timesheet',
  '/resources': 'resources',
  '/team': 'team',
  '/reports': 'reports',
  '/settings': 'settings',
  '/admin/archives': 'admin/archives',
};

export const AppShell: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState<string>('Use All Five');
  const [timeTrackerEnabled, setTimeTrackerEnabled] = useState<boolean>(false);

  // Load user preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) {
        const prefs = JSON.parse(saved);
        setTimeTrackerEnabled(prefs.liveTimeTrackingEnabled || false);
      }
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    }

    // Listen for storage changes (when prefs are updated in Settings)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PREFS_STORAGE_KEY && e.newValue) {
        try {
          const prefs = JSON.parse(e.newValue);
          setTimeTrackerEnabled(prefs.liveTimeTrackingEnabled || false);
        } catch (err) {
          console.warn('Failed to parse preferences:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch organization name
  useEffect(() => {
    async function fetchOrganization() {
      if (!user?.org_id) return;
      
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', user.org_id)
          .single();
        
        if (error) {
          console.error('Failed to fetch organization:', error);
          return;
        }
        
        if (data?.name) {
          setOrganizationName(data.name);
        }
      } catch (err) {
        console.error('Error fetching organization:', err);
      }
    }
    
    fetchOrganization();
  }, [user?.org_id]);

  // Derive active view from current route
  const activeView = routeToView[location.pathname] || 
    Object.entries(routeToView).find(([route]) => 
      location.pathname.startsWith(route) && route !== '/'
    )?.[1] || 
    'dashboard';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const handleNavigate = (view: string) => {
    const routes: Record<string, string> = {
      dashboard: '/',
      budget: '/budget',
      approvals: '/approvals',
      timesheet: '/timesheet',
      resources: '/resources',
      reports: '/reports',
      team: '/team',
      settings: '/settings',
      'admin/archives': '/admin/archives',
    };
    navigate(routes[view] || '/');
  };

  const handleOpenProfile = () => {
    handleMenuClose();
    setProfileModalOpen(true);
  };

  const handleOpenPreferences = () => {
    handleMenuClose();
    navigate('/settings');
  };

  const handleLogout = async () => {
    handleMenuClose();
    await signOut();
    navigate('/login');
  };

  const currentSidebarWidth = sidebarCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH
    : SIDEBAR_WIDTH;

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          bgcolor: '#1A1917',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Get user info with fallbacks
  const userName = user?.name || user?.email?.split('@')[0] || 'User';
  const userRole = (user?.role as 'employee' | 'pm' | 'admin') || 'employee';
  const userAvatar = (user as any)?.avatar_url;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#1A1917' }}>
      {/* Sidebar */}
      <Sidebar
        userRole={userRole}
        activeView={activeView}
        collapsed={sidebarCollapsed}
        onNavigate={handleNavigate}
        onToggleCollapse={handleToggleSidebar}
        userName={userName}
        userAvatar={userAvatar}
        organizationName={organizationName}
      />

      {/* Main content area */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          ml: `${currentSidebarWidth}px`,
          transition: 'margin-left 0.3s ease',
        }}
      >
        {/* Header */}
        <AppBar
          position="fixed"
          sx={{
            width: `calc(100% - ${currentSidebarWidth}px)`,
            ml: `${currentSidebarWidth}px`,
            height: HEADER_HEIGHT,
            bgcolor: '#2A2520',
            borderBottom: '1px solid #374151',
            boxShadow: 'none',
            transition: 'width 0.3s ease, margin-left 0.3s ease',
          }}
        >
          <Toolbar sx={{ height: HEADER_HEIGHT, minHeight: HEADER_HEIGHT }}>
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, color: '#E5E7EB', fontWeight: 600 }}
            >
              {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
            </Typography>

            {/* User menu */}
            <IconButton
              size="large"
              aria-label="account menu"
              aria-controls="user-menu"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              sx={{ color: '#E5E7EB' }}
            >
              <UserAvatar
                name={userName}
                avatarUrl={userAvatar}
                discipline={(user as any)?.discipline}
                size="sm"
              />
            </IconButton>
            <Menu
              id="user-menu"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              PaperProps={{
                sx: {
                  bgcolor: '#2A2520',
                  border: '1px solid #374151',
                  minWidth: 180,
                  '& .MuiMenuItem-root': {
                    color: '#E5E7EB',
                    py: 1.5,
                    '&:hover': {
                      bgcolor: '#374151',
                    },
                  },
                },
              }}
            >
              <MenuItem onClick={handleOpenProfile}>
                <PersonIcon sx={{ mr: 1.5, color: '#9CA3AF' }} />
                My Profile
              </MenuItem>
              <MenuItem onClick={handleOpenPreferences}>
                <PreferencesIcon sx={{ mr: 1.5, color: '#9CA3AF' }} />
                Preferences
              </MenuItem>
              <Divider sx={{ borderColor: '#374151', my: 1 }} />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1.5, color: '#9CA3AF' }} />
                Sign Out
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Content area - renders child routes */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            mt: `${HEADER_HEIGHT}px`,
            p: 3,
            bgcolor: '#1A1917',
            minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Profile Modal */}
      {user && (
        <TeamMemberModal
          open={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          userId={user.id}
          currentUserId={user.id}
          currentUserRole={userRole}
        />
      )}

      {/* Time Tracker Widget - only show if enabled in preferences */}
      {timeTrackerEnabled && user && (
        <TimeTrackerWidget userId={user.id} orgId={user.org_id} />
      )}
    </Box>
  );
};

export default AppShell;
