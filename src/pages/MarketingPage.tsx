import React from 'react';
import { Box, Typography, Button, Container, Grid } from '@mui/material';
import { colors, spacing, radii, typography, shadows, transitions } from '../styles/tokens';
import { getStaggeredStyle, pageSlideUp, hoverLift } from '../styles/animations';

const valueProps = [
  {
    title: 'Confirmation over tracking',
    description: 'Employees confirm pre-planned hours on Friday. No daily timesheets.',
  },
  {
    title: 'Slack-native',
    description: 'Lives where your team already works. No new app to adopt.',
  },
  {
    title: 'Trust-based',
    description: 'Built by a creative agency, for creative agencies.',
  },
];

export function MarketingPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.dark.bg.primary} 0%, ${colors.dark.bg.secondary} 50%, ${colors.dark.bg.tertiary} 100%)`,
        color: colors.dark.text.primary,
        fontFamily: typography.fontFamily.sans,
        overflow: 'hidden',
      }}
    >
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          px: spacing[4],
          py: spacing[20],
          ...pageSlideUp,
        }}
      >
        <Container maxWidth="md">
          {/* Logo / Brand */}
          <Typography
            component="span"
            sx={{
              display: 'inline-block',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              letterSpacing: typography.letterSpacing.wider,
              textTransform: 'uppercase',
              color: colors.brand.orange,
              mb: spacing[6],
            }}
          >
            Zhuzh
          </Typography>

          {/* Headline */}
          <Typography
            component="h1"
            sx={{
              fontSize: {
                xs: typography.fontSize['2xl'],
                sm: typography.fontSize['3xl'],
                md: typography.fontSize['4xl'],
              },
              fontWeight: typography.fontWeight.bold,
              lineHeight: typography.lineHeight.tight,
              letterSpacing: typography.letterSpacing.tight,
              color: colors.dark.text.primary,
              mb: spacing[6],
            }}
          >
            Stop tracking time.
            <br />
            Start confirming it.
          </Typography>

          {/* Subhead */}
          <Typography
            sx={{
              fontSize: {
                xs: typography.fontSize.base,
                md: typography.fontSize.lg,
              },
              fontWeight: typography.fontWeight.regular,
              lineHeight: typography.lineHeight.relaxed,
              color: colors.dark.text.secondary,
              maxWidth: '540px',
              mx: 'auto',
              mb: spacing[10],
            }}
          >
            Zhuzh is Slack-first resource management built for creative teams.
          </Typography>

          {/* CTA Button */}
          <Button
            href="mailto:hello@zhuzh.io"
            variant="contained"
            sx={{
              backgroundColor: colors.brand.orange,
              color: colors.dark.text.inverse,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              fontFamily: typography.fontFamily.sans,
              px: spacing[8],
              py: spacing[3],
              borderRadius: radii.lg,
              textTransform: 'none',
              boxShadow: shadows.glow.orange,
              transition: transitions.default,
              '&:hover': {
                backgroundColor: colors.brand.orange,
                transform: 'translateY(-2px)',
                boxShadow: `${shadows.glow.orange}, ${shadows.dark.lg}`,
              },
              '&:active': {
                transform: 'translateY(0)',
              },
            }}
          >
            Join the Pilot
          </Button>
        </Container>
      </Box>

      {/* Value Props Section */}
      <Box
        sx={{
          py: { xs: spacing[16], md: spacing[24] },
          px: spacing[4],
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {valueProps.map((prop, index) => (
              <Grid size={{ xs: 12, md: 4 }} key={prop.title}>
                <Box
                  sx={{
                    backgroundColor: colors.dark.bg.secondary,
                    border: `1px solid ${colors.dark.border.subtle}`,
                    borderRadius: radii.lg,
                    p: { xs: spacing[6], md: spacing[8] },
                    height: '100%',
                    ...getStaggeredStyle(index, 'fadeInUp', {
                      initialDelay: 100,
                      staggerDelay: 100,
                    }),
                    ...hoverLift,
                    '&:hover': {
                      ...hoverLift['&:hover'],
                      borderColor: colors.dark.border.default,
                      backgroundColor: colors.dark.bg.tertiary,
                    },
                  }}
                >
                  <Typography
                    component="h3"
                    sx={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                      lineHeight: typography.lineHeight.snug,
                      color: colors.dark.text.primary,
                      mb: spacing[3],
                    }}
                  >
                    {prop.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.regular,
                      lineHeight: typography.lineHeight.relaxed,
                      color: colors.dark.text.secondary,
                    }}
                  >
                    {prop.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Social Proof Section */}
      <Box
        sx={{
          py: { xs: spacing[12], md: spacing[16] },
          px: spacing[4],
          textAlign: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Typography
            sx={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              letterSpacing: typography.letterSpacing.wide,
              textTransform: 'uppercase',
              color: colors.dark.text.tertiary,
              mb: spacing[2],
            }}
          >
            Currently in pilot at
          </Typography>
          <Typography
            sx={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: colors.dark.text.secondary,
            }}
          >
            Use All Five
          </Typography>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          py: spacing[8],
          px: spacing[4],
          textAlign: 'center',
          borderTop: `1px solid ${colors.dark.border.subtle}`,
        }}
      >
        <Typography
          sx={{
            fontSize: typography.fontSize.sm,
            color: colors.dark.text.tertiary,
          }}
        >
          &copy; {new Date().getFullYear()} Zhuzh. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}

export default MarketingPage;
