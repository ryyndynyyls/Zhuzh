import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { ZhuzhPageLoader } from './ZhuzhPageLoader';
import type { UserRole } from '../types/database';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: UserRole[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading state with spinning diamond
  if (loading) {
    return <ZhuzhPageLoader message="Loading..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole && user && !requiredRole.includes(user.role)) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#0F0F0E',
          gap: 2
        }}
      >
        <Typography variant="h5" color="error.main">
          Access Denied
        </Typography>
        <Typography color="grey.400">
          You don't have permission to view this page.
        </Typography>
        <Typography color="grey.500" variant="body2">
          Required role: {requiredRole.join(' or ')}
        </Typography>
      </Box>
    );
  }

  // Render children or outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
}
