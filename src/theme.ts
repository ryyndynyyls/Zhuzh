import { createTheme, ThemeOptions, alpha } from '@mui/material/styles';
import { colors, typography, spacing, radii, shadows, transitions, brand } from './styles/tokens';

/**
 * Zhuzh MUI Theme
 * 
 * Typography: Plus Jakarta Sans + JetBrains Mono
 * Style: Linear-inspired, professional creative agency
 * 
 * Created: January 2026
 */

// Re-export brand colors for backward compatibility
export { brand };

// =============================================================================
// LIGHT PALETTE
// =============================================================================

const lightPalette = {
  primary: {
    main: brand.orange,
    light: '#FFAF67',
    dark: '#E66D1A',
    contrastText: brand.dark,
  },
  secondary: {
    main: brand.dark,
    light: '#52524A',
    dark: '#1A1917',
    contrastText: brand.cream,
  },
  success: {
    main: '#2ECC5E',
    light: '#B8FFCA',
    dark: '#1B8A3E',
    contrastText: brand.dark,
  },
  warning: {
    main: '#FFC107',
    light: '#FFFB99',
    dark: '#B86E00',
    contrastText: brand.dark,
  },
  error: {
    main: '#DC3545',
    light: '#FF9999',
    dark: '#B02A37',
    contrastText: '#FFFFFF',
  },
  background: {
    default: colors.light.bg.primary,
    paper: colors.light.bg.secondary,
  },
  text: {
    primary: colors.light.text.primary,
    secondary: colors.light.text.secondary,
    disabled: colors.light.text.disabled,
  },
  divider: colors.light.border.default,
  action: {
    hover: colors.light.bg.hover,
    selected: alpha(brand.orange, 0.08),
    focus: alpha(brand.orange, 0.12),
  },
};

// =============================================================================
// DARK PALETTE
// =============================================================================

const darkPalette = {
  primary: {
    main: brand.orange,
    light: '#FFAF67',
    dark: '#CC5500',
    contrastText: brand.dark,
  },
  secondary: {
    main: brand.cream,
    light: '#FFFFFF',
    dark: '#E0DFD3',
    contrastText: brand.dark,
  },
  success: {
    main: brand.lime,
    light: '#B8FFCA',
    dark: '#2ECC5E',
    contrastText: brand.dark,
  },
  warning: {
    main: brand.yellow,
    light: '#FFFB99',
    dark: '#E6DF00',
    contrastText: brand.dark,
  },
  error: {
    main: '#FF6B6B',
    light: '#FF9999',
    dark: '#E64545',
    contrastText: '#FFFFFF',
  },
  background: {
    default: colors.dark.bg.primary,
    paper: colors.dark.bg.secondary,
  },
  text: {
    primary: colors.dark.text.primary,
    secondary: colors.dark.text.secondary,
    disabled: colors.dark.text.disabled,
  },
  divider: colors.dark.border.default,
  action: {
    hover: colors.dark.bg.hover,
    selected: alpha(brand.orange, 0.12),
    focus: alpha(brand.orange, 0.16),
  },
};

// =============================================================================
// TYPOGRAPHY CONFIG
// =============================================================================

const typographyConfig = {
  fontFamily: typography.fontFamily.sans,
  
  // Display / Hero headings
  h1: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize['3xl'],
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h2: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize['2xl'],
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.tight,
  },
  h3: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.xl,
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.normal,
  },
  h4: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.lg,
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.normal,
  },
  h5: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.normal,
  },
  h6: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.normal,
  },
  
  // Body text
  subtitle1: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.normal,
  },
  subtitle2: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
  },
  body1: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.regular,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
  },
  body2: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.regular,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
  
  // UI elements
  button: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.sm,
    textTransform: 'none' as const,
    letterSpacing: typography.letterSpacing.normal,
  },
  caption: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.regular,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.normal,
  },
  overline: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.xs,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
};

// =============================================================================
// COMPONENT OVERRIDES
// =============================================================================

const getComponentOverrides = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';
  const colorScheme = isDark ? colors.dark : colors.light;
  const shadowScheme = isDark ? shadows.dark : shadows.light;
  
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: typography.fontFamily.sans,
          // Smooth scrolling
          scrollBehavior: 'smooth',
          // Better text rendering
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        // Monospace for code/data elements
        'code, pre, kbd, samp': {
          fontFamily: typography.fontFamily.mono,
        },
        // Selection styling
        '::selection': {
          backgroundColor: alpha(brand.orange, 0.3),
          color: isDark ? colors.dark.text.primary : colors.light.text.primary,
        },
      },
    },
    
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: radii.md,
          padding: `${spacing[2.5]} ${spacing[4]}`,
          fontWeight: typography.fontWeight.medium,
          transition: transitions.default,
          '&:focus-visible': {
            outline: `2px solid ${brand.orange}`,
            outlineOffset: '2px',
          },
        },
        contained: {
          boxShadow: shadowScheme.sm,
          '&:hover': {
            boxShadow: shadowScheme.md,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        outlined: {
          borderColor: colorScheme.border.default,
          '&:hover': {
            borderColor: colorScheme.border.strong,
            backgroundColor: colorScheme.bg.hover,
          },
        },
        text: {
          '&:hover': {
            backgroundColor: colorScheme.bg.hover,
          },
        },
        sizeSmall: {
          padding: `${spacing[1.5]} ${spacing[3]}`,
          fontSize: typography.fontSize.xs,
        },
        sizeLarge: {
          padding: `${spacing[3]} ${spacing[5]}`,
          fontSize: typography.fontSize.base,
        },
      },
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radii.lg,
          backgroundColor: colorScheme.bg.secondary,
          border: `1px solid ${colorScheme.border.subtle}`,
          boxShadow: shadowScheme.sm,
          transition: transitions.default,
          '&:hover': {
            boxShadow: shadowScheme.md,
          },
        },
      },
    },
    
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove MUI's gradient overlay
          borderRadius: radii.lg,
        },
        elevation1: {
          boxShadow: shadowScheme.xs,
        },
        elevation2: {
          boxShadow: shadowScheme.sm,
        },
        elevation3: {
          boxShadow: shadowScheme.md,
        },
        elevation4: {
          boxShadow: shadowScheme.lg,
        },
      },
    },
    
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radii.md,
          fontWeight: typography.fontWeight.medium,
          fontSize: typography.fontSize.xs,
          height: '28px',
          transition: transitions.fast,
        },
        outlined: {
          borderColor: colorScheme.border.default,
        },
        filled: {
          '&:hover': {
            opacity: 0.9,
          },
        },
      },
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: radii.md,
            transition: transitions.default,
            '& fieldset': {
              borderColor: colorScheme.border.default,
              transition: transitions.default,
            },
            '&:hover fieldset': {
              borderColor: colorScheme.border.strong,
            },
            '&.Mui-focused fieldset': {
              borderColor: brand.orange,
              borderWidth: '2px',
            },
          },
          '& .MuiInputBase-input': {
            padding: `${spacing[3]} ${spacing[3.5]}`,
          },
        },
      },
    },
    
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: radii.md,
        },
      },
    },
    
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: radii.xl,
          backgroundColor: colorScheme.bg.elevated,
          border: `1px solid ${colorScheme.border.subtle}`,
          boxShadow: shadowScheme.xl,
        },
      },
    },
    
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colorScheme.bg.secondary,
          borderRight: `1px solid ${colorScheme.border.subtle}`,
        },
      },
    },
    
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colorScheme.bg.secondary,
          borderBottom: `1px solid ${colorScheme.border.subtle}`,
          boxShadow: 'none',
        },
      },
    },
    
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: radii.md,
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium,
          backgroundColor: isDark ? colors.dark.bg.elevated : colors.light.text.primary,
          color: isDark ? colors.dark.text.primary : colors.light.text.inverse,
          padding: `${spacing[1.5]} ${spacing[2.5]}`,
          boxShadow: shadowScheme.md,
        },
        arrow: {
          color: isDark ? colors.dark.bg.elevated : colors.light.text.primary,
        },
      },
    },
    
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: radii.lg,
          border: `1px solid ${colorScheme.border.subtle}`,
          boxShadow: shadowScheme.lg,
          marginTop: spacing[1],
        },
      },
    },
    
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: radii.sm,
          margin: `${spacing[0.5]} ${spacing[1]}`,
          padding: `${spacing[2]} ${spacing[3]}`,
          transition: transitions.fast,
          '&:hover': {
            backgroundColor: colorScheme.bg.hover,
          },
          '&.Mui-selected': {
            backgroundColor: alpha(brand.orange, isDark ? 0.12 : 0.08),
            '&:hover': {
              backgroundColor: alpha(brand.orange, isDark ? 0.16 : 0.12),
            },
          },
        },
      },
    },
    
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            borderColor: colorScheme.border.subtle,
          },
        },
      },
    },
    
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.xs,
            textTransform: 'uppercase',
            letterSpacing: typography.letterSpacing.wide,
            color: colorScheme.text.secondary,
            backgroundColor: colorScheme.bg.tertiary,
          },
        },
      },
    },
    
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: transitions.fast,
          '&:hover': {
            backgroundColor: colorScheme.bg.hover,
          },
        },
      },
    },
    
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: colorScheme.border.subtle,
        },
      },
    },
    
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: radii.full,
          backgroundColor: colorScheme.border.subtle,
        },
        bar: {
          borderRadius: radii.full,
        },
      },
    },
    
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: colorScheme.border.subtle,
        },
      },
    },
    
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 44,
          height: 24,
          padding: 0,
        },
        switchBase: {
          padding: 2,
          '&.Mui-checked': {
            transform: 'translateX(20px)',
            '& + .MuiSwitch-track': {
              backgroundColor: brand.orange,
              opacity: 1,
            },
          },
        },
        thumb: {
          width: 20,
          height: 20,
          boxShadow: shadowScheme.sm,
        },
        track: {
          borderRadius: radii.full,
          backgroundColor: colorScheme.border.strong,
          opacity: 1,
        },
      },
    },
    
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2,
          borderRadius: radii.full,
        },
      },
    },
    
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: typography.fontWeight.medium,
          fontSize: typography.fontSize.sm,
          textTransform: 'none',
          minHeight: 48,
          padding: `${spacing[3]} ${spacing[4]}`,
          transition: transitions.default,
          '&:hover': {
            backgroundColor: colorScheme.bg.hover,
          },
        },
      },
    },
    
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: radii.lg,
        },
        standardSuccess: {
          backgroundColor: colorScheme.success.bg,
          border: `1px solid ${colorScheme.success.border}`,
          color: colorScheme.success.text,
        },
        standardWarning: {
          backgroundColor: colorScheme.warning.bg,
          border: `1px solid ${colorScheme.warning.border}`,
          color: colorScheme.warning.text,
        },
        standardError: {
          backgroundColor: colorScheme.error.bg,
          border: `1px solid ${colorScheme.error.border}`,
          color: colorScheme.error.text,
        },
        standardInfo: {
          backgroundColor: colorScheme.info.bg,
          border: `1px solid ${colorScheme.info.border}`,
          color: colorScheme.info.text,
        },
      },
    },
    
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiPaper-root': {
            borderRadius: radii.lg,
          },
        },
      },
    },
  };
};

// =============================================================================
// BASE THEME CONFIG
// =============================================================================

const createBaseTheme = (mode: 'light' | 'dark'): ThemeOptions => ({
  typography: typographyConfig,
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    mode === 'dark' ? shadows.dark.xs : shadows.light.xs,
    mode === 'dark' ? shadows.dark.sm : shadows.light.sm,
    mode === 'dark' ? shadows.dark.md : shadows.light.md,
    mode === 'dark' ? shadows.dark.lg : shadows.light.lg,
    mode === 'dark' ? shadows.dark.xl : shadows.light.xl,
    // Fill remaining with highest elevation
    ...Array(19).fill(mode === 'dark' ? shadows.dark.xl : shadows.light.xl),
  ] as any,
  components: getComponentOverrides(mode),
});

// =============================================================================
// THEME EXPORTS
// =============================================================================

export const lightTheme = createTheme({
  ...createBaseTheme('light'),
  palette: {
    mode: 'light',
    ...lightPalette,
  },
});

export const darkTheme = createTheme({
  ...createBaseTheme('dark'),
  palette: {
    mode: 'dark',
    ...darkPalette,
  },
});

// Default export for convenience
export default lightTheme;

// Legacy export for existing code that imports `theme`
export const theme = darkTheme;
