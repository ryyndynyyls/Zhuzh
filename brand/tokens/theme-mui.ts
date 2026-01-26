import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * Zhuzh MUI Theme
 * Material Design 3 inspired theme for the Zhuzh app
 */

const zhuzh = {
  orange: '#FF8731',
  yellow: '#FFF845',
  lime: '#80FF9C',
  cream: '#F7F6E6',
  dark: '#33332F',
  error: '#FF6B6B',
};

const lightPalette = {
  primary: {
    main: zhuzh.orange,
    light: '#FFAF67',
    dark: '#E66D1A',
    contrastText: zhuzh.dark,
  },
  secondary: {
    main: zhuzh.dark,
    light: '#52524A',
    dark: '#1A1917',
    contrastText: zhuzh.cream,
  },
  success: {
    main: zhuzh.lime,
    light: '#B8FFCA',
    dark: '#2ECC5E',
    contrastText: zhuzh.dark,
  },
  warning: {
    main: zhuzh.yellow,
    light: '#FFFB99',
    dark: '#E6DF00',
    contrastText: zhuzh.dark,
  },
  error: {
    main: zhuzh.error,
    light: '#FF9999',
    dark: '#E64545',
    contrastText: '#FFFFFF',
  },
  background: {
    default: zhuzh.cream,
    paper: '#FFFFFF',
  },
  text: {
    primary: zhuzh.dark,
    secondary: '#6B6B63',
    disabled: '#BDBDB3',
  },
  divider: '#E0DFD3',
};

const darkPalette = {
  primary: {
    main: zhuzh.orange,
    light: '#FFAF67',
    dark: '#CC5500',
    contrastText: zhuzh.dark,
  },
  secondary: {
    main: zhuzh.cream,
    light: '#FFFFFF',
    dark: '#E0DFD3',
    contrastText: zhuzh.dark,
  },
  success: {
    main: zhuzh.lime,
    light: '#B8FFCA',
    dark: '#2ECC5E',
    contrastText: zhuzh.dark,
  },
  warning: {
    main: zhuzh.yellow,
    light: '#FFFB99',
    dark: '#E6DF00',
    contrastText: zhuzh.dark,
  },
  error: {
    main: zhuzh.error,
    light: '#FF9999',
    dark: '#E64545',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#1A1917',
    paper: '#2A2520',
  },
  text: {
    primary: zhuzh.cream,
    secondary: '#A8A89E',
    disabled: '#52524A',
  },
  divider: '#3D3D36',
};

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: { fontWeight: 600, fontSize: '2.5rem', lineHeight: 1.2 },
    h2: { fontWeight: 600, fontSize: '2rem', lineHeight: 1.25 },
    h3: { fontWeight: 600, fontSize: '1.75rem', lineHeight: 1.3 },
    h4: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.35 },
    h5: { fontWeight: 500, fontSize: '1.25rem', lineHeight: 1.4 },
    h6: { fontWeight: 500, fontSize: '1rem', lineHeight: 1.5 },
    subtitle1: { fontWeight: 500, fontSize: '1rem', lineHeight: 1.5 },
    subtitle2: { fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.5 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { fontWeight: 500, textTransform: 'none' },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
    overline: { fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(51, 51, 47, 0.05)',
    '0 2px 4px rgba(51, 51, 47, 0.08), 0 1px 2px rgba(51, 51, 47, 0.04)',
    '0 4px 8px rgba(51, 51, 47, 0.10), 0 2px 4px rgba(51, 51, 47, 0.06)',
    '0 8px 16px rgba(51, 51, 47, 0.12), 0 4px 8px rgba(51, 51, 47, 0.08)',
    '0 16px 32px rgba(51, 51, 47, 0.14), 0 8px 16px rgba(51, 51, 47, 0.10)',
    // Fill remaining with elevation 5
    ...Array(19).fill('0 16px 32px rgba(51, 51, 47, 0.14), 0 8px 16px rgba(51, 51, 47, 0.10)'),
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: '0 2px 4px rgba(51, 51, 47, 0.08)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(51, 51, 47, 0.12)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 4px rgba(51, 51, 47, 0.08), 0 1px 2px rgba(51, 51, 47, 0.04)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem',
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    ...lightPalette,
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    ...darkPalette,
  },
});

// Default export for convenience
export default lightTheme;

// Brand colors export for direct use
export const brand = zhuzh;
