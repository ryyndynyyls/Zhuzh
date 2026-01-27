import { Box, Button, Card, CardContent, Typography, Container, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { brand, colors } from '../styles/tokens';

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
          bgcolor: colors.dark.bg.primary,
        }}
        role="status"
        aria-label="Loading authentication"
      >
        <CircularProgress 
          sx={{ color: brand.orange }} 
          aria-label="Loading"
        />
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
        bgcolor: colors.dark.bg.primary,
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card 
          sx={{ 
            bgcolor: colors.dark.bg.secondary,
            border: `1px solid ${colors.dark.border.subtle}`,
            borderRadius: 3,
          }}
          component="main"
          role="main"
        >
          <CardContent sx={{ textAlign: 'center', p: { xs: 3, sm: 5 } }}>
            {/* Logo */}
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 1.5,
                mb: 1,
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: brand.orange,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}
                aria-hidden="true"
              >
                ⏱
              </Box>
              <Typography 
                variant="h3" 
                component="h1"
                sx={{ 
                  color: colors.dark.text.primary,
                  fontWeight: 600,
                }}
              >
                Zhuzh
              </Typography>
            </Box>

            {/* Tagline */}
            <Typography 
              variant="body1" 
              sx={{ 
                color: colors.dark.text.secondary,
                mb: 4,
                fontSize: '1.1rem',
              }}
            >
              Slack-first timekeeping and budget tracking
            </Typography>

            {/* Sign in button */}
            <Button
              variant="contained"
              size="large"
              onClick={signInWithSlack}
              aria-label="Sign in with your Slack account"
              sx={{
                bgcolor: brand.orange,
                color: brand.dark,
                fontWeight: 600,
                '&:hover': { 
                  bgcolor: '#E67A2C',
                  transform: 'translateY(-1px)',
                },
                '&:focus-visible': {
                  outline: `3px solid ${brand.cream}`,
                  outlineOffset: '2px',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                textTransform: 'none',
                py: 1.75,
                px: 4,
                fontSize: '1rem',
                borderRadius: 2,
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(255, 135, 49, 0.25)',
              }}
            >
              <Box 
                component="span" 
                sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}
                aria-hidden="true"
              >
                <svg width="20" height="20" viewBox="0 0 54 54" fill="none" role="img" aria-label="Slack logo">
                  <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
                  <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
                  <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
                  <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336 0v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.25a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
                </svg>
              </Box>
              Sign in with Slack
            </Button>

            {/* Helper text */}
            <Typography 
              variant="body2" 
              sx={{ 
                color: colors.dark.text.secondary,
                mt: 3,
              }}
            >
              Use your company Slack account to sign in
            </Typography>
          </CardContent>
        </Card>

        {/* Footer */}
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block',
            textAlign: 'center',
            mt: 3,
            color: colors.dark.text.tertiary,
          }}
        >
          Confirmation over tracking. Trust over surveillance.
        </Typography>
      </Container>
    </Box>
  );
}
