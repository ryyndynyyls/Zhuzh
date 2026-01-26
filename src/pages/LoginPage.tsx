import React from 'react';
import { Box, Button, Card, CardContent, Typography, Container } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function LoginPage() {
  const { user, loading, signInWithSlack } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#1A1917'
        }}
      >
        <Typography color="white">Loading...</Typography>
      </Box>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#1A1917'
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ bgcolor: '#2A2520', color: 'white' }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 1 }}>
              ⏱ Zhuzh
            </Typography>
            <Typography variant="body1" color="grey.400" sx={{ mb: 4 }}>
              Slack-first timekeeping and budget tracking
            </Typography>

            <Button
              variant="contained"
              size="large"
              onClick={signInWithSlack}
              sx={{
                bgcolor: '#4A154B',
                '&:hover': { bgcolor: '#611f69' },
                textTransform: 'none',
                py: 1.5,
                px: 4,
                fontSize: '1rem'
              }}
            >
              <Box component="span" sx={{ mr: 1 }}>
                <svg width="20" height="20" viewBox="0 0 54 54" fill="none">
                  <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
                  <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
                  <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
                  <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336 0v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.25a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
                </svg>
              </Box>
              Sign in with Slack
            </Button>

            <Typography variant="caption" color="grey.500" sx={{ display: 'block', mt: 3 }}>
              Use your company Slack account to sign in
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
