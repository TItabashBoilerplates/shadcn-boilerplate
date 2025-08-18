// Material Design 3 Color System for Tamagui
// Based on Material Design 3 guidelines with proper color roles

export const materialColors = {
  // Primary Colors - Main brand colors
  primary: {
    primary: '#6442d6',
    primaryContainer: '#e8ddff',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#21005d',
    primaryFixed: '#e8ddff',
    onPrimaryFixed: '#21005d',
    primaryFixedDim: '#d0bcff',
    onPrimaryFixedVariant: '#4c2a7d',
  },
  
  // Secondary Colors - Complementary colors
  secondary: {
    secondary: '#5d5d74',
    secondaryContainer: '#e2e0fc',
    onSecondary: '#ffffff',
    onSecondaryContainer: '#1a1a2e',
    secondaryFixed: '#e2e0fc',
    onSecondaryFixed: '#1a1a2e',
    secondaryFixedDim: '#c6c4df',
    onSecondaryFixedVariant: '#45455c',
  },
  
  // Tertiary Colors - Accent colors
  tertiary: {
    tertiary: '#7d526b',
    tertiaryContainer: '#f1d3f9',
    onTertiary: '#ffffff',
    onTertiaryContainer: '#321226',
    tertiaryFixed: '#f1d3f9',
    onTertiaryFixed: '#321226',
    tertiaryFixedDim: '#d5b7dc',
    onTertiaryFixedVariant: '#633d53',
  },
  
  // Error Colors - Error states
  error: {
    error: '#ff6240',
    errorContainer: '#ffd9d2',
    onError: '#ffffff',
    onErrorContainer: '#2d0a00',
  },
  
  // Surface Colors - Backgrounds and containers
  surface: {
    surface: '#fefbff',
    surfaceDim: '#dfd8e7',
    surfaceBright: '#fefbff',
    surfaceContainer: '#f3ecfb',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f9f2ff',
    surfaceContainerHigh: '#ede6f5',
    surfaceContainerHighest: '#e7e1f0',
    onSurface: '#1c1b20',
    onSurfaceVariant: '#484650',
    outline: '#79747e',
    outlineVariant: '#cac4d0',
    inverseSurface: '#313036',
    inverseOnSurface: '#f4f0f7',
    inversePrimary: '#d0bcff',
    scrim: '#000000',
    shadow: '#000000',
  },
}

export const materialDarkColors = {
  // Primary Colors - Main brand colors
  primary: {
    primary: '#d0bcff',
    primaryContainer: '#4c2a7d',
    onPrimary: '#21005d',
    onPrimaryContainer: '#e8ddff',
    primaryFixed: '#e8ddff',
    onPrimaryFixed: '#21005d',
    primaryFixedDim: '#d0bcff',
    onPrimaryFixedVariant: '#4c2a7d',
  },
  
  // Secondary Colors - Complementary colors
  secondary: {
    secondary: '#c6c4df',
    secondaryContainer: '#45455c',
    onSecondary: '#1a1a2e',
    onSecondaryContainer: '#e2e0fc',
    secondaryFixed: '#e2e0fc',
    onSecondaryFixed: '#1a1a2e',
    secondaryFixedDim: '#c6c4df',
    onSecondaryFixedVariant: '#45455c',
  },
  
  // Tertiary Colors - Accent colors
  tertiary: {
    tertiary: '#d5b7dc',
    tertiaryContainer: '#633d53',
    onTertiary: '#321226',
    onTertiaryContainer: '#f1d3f9',
    tertiaryFixed: '#f1d3f9',
    onTertiaryFixed: '#321226',
    tertiaryFixedDim: '#d5b7dc',
    onTertiaryFixedVariant: '#633d53',
  },
  
  // Error Colors - Error states
  error: {
    error: '#ff8a65',
    errorContainer: '#5d1a00',
    onError: '#2d0a00',
    onErrorContainer: '#ffd9d2',
  },
  
  // Surface Colors - Backgrounds and containers
  surface: {
    surface: '#131218',
    surfaceDim: '#131218',
    surfaceBright: '#39363e',
    surfaceContainer: '#1f1d24',
    surfaceContainerLowest: '#0e0d13',
    surfaceContainerLow: '#1c1b20',
    surfaceContainerHigh: '#2a282e',
    surfaceContainerHighest: '#353339',
    onSurface: '#e7e1f0',
    onSurfaceVariant: '#cac4d0',
    outline: '#938f99',
    outlineVariant: '#484650',
    inverseSurface: '#e7e1f0',
    inverseOnSurface: '#313036',
    inversePrimary: '#6442d6',
    scrim: '#000000',
    shadow: '#000000',
  },
}

// Convert Material Design colors to Tamagui theme format
export const materialLightTheme = {
  // Background colors
  background: materialColors.surface.surface,
  backgroundHover: materialColors.surface.surfaceContainerLow,
  backgroundPress: materialColors.surface.surfaceContainerLowest,
  backgroundFocus: materialColors.surface.surfaceContainerHigh,
  backgroundStrong: materialColors.surface.surfaceContainerHighest,
  backgroundTransparent: 'transparent',
  
  // Text colors
  color: materialColors.surface.onSurface,
  colorHover: materialColors.surface.onSurface,
  colorPress: materialColors.surface.onSurface,
  colorFocus: materialColors.primary.primary,
  colorTransparent: 'transparent',
  
  // Border colors
  borderColor: materialColors.surface.outline,
  borderColorHover: materialColors.surface.outline,
  borderColorPress: materialColors.surface.outline,
  borderColorFocus: materialColors.primary.primary,
  
  // Primary colors
  primary: materialColors.primary.primary,
  primaryHover: materialColors.primary.primary,
  primaryPress: materialColors.primary.primary,
  primaryFocus: materialColors.primary.primary,
  
  // Secondary colors
  secondary: materialColors.secondary.secondary,
  secondaryHover: materialColors.secondary.secondary,
  secondaryPress: materialColors.secondary.secondary,
  secondaryFocus: materialColors.secondary.secondary,
  
  // Tertiary colors
  tertiary: materialColors.tertiary.tertiary,
  tertiaryHover: materialColors.tertiary.tertiary,
  tertiaryPress: materialColors.tertiary.tertiary,
  tertiaryFocus: materialColors.tertiary.tertiary,
  
  // Error colors
  red: materialColors.error.error,
  redHover: materialColors.error.error,
  redPress: materialColors.error.error,
  redFocus: materialColors.error.error,
  
  // Success colors (derived from Material Design green)
  green: '#4caf50',
  greenHover: '#4caf50',
  greenPress: '#4caf50',
  greenFocus: '#4caf50',
  
  // Warning colors (derived from Material Design amber)
  yellow: '#ff9800',
  yellowHover: '#ff9800',
  yellowPress: '#ff9800',
  yellowFocus: '#ff9800',
  
  // Info colors (derived from Material Design blue)
  blue: '#2196f3',
  blueHover: '#2196f3',
  bluePress: '#2196f3',
  blueFocus: '#2196f3',
  
  // Placeholder colors
  placeholderColor: materialColors.surface.onSurfaceVariant,
  
  // Outline colors
  outlineColor: materialColors.surface.outline,
  
  // Surface colors
  surface1: materialColors.surface.surfaceContainer,
  surface2: materialColors.surface.surfaceContainerHigh,
  surface3: materialColors.surface.surfaceContainerHighest,
  surface4: materialColors.surface.surfaceContainerHighest,

  // Additional color tokens for compatibility
  color1: materialColors.surface.onSurface,
  color2: materialColors.surface.onSurface,
  color3: materialColors.surface.onSurface,
  color4: materialColors.surface.onSurface,
  color5: materialColors.surface.onSurface,
  color6: materialColors.surface.onSurface,
  color7: materialColors.surface.onSurface,
  color8: materialColors.surface.onSurface,
  color9: materialColors.surface.onSurface,
  color10: materialColors.surface.onSurfaceVariant,
  color11: materialColors.surface.onSurface,
  color12: materialColors.surface.onSurface,

  // Blue color tokens
  blue1: '#e3f2fd',
  blue2: '#bbdefb',
  blue3: '#90caf9',
  blue4: '#64b5f6',
  blue5: '#42a5f5',
  blue6: '#2196f3',
  blue7: '#1e88e5',
  blue8: '#1976d2',
  blue9: '#1565c0',
  blue10: '#0d47a1',
  blue11: '#0d47a1',
  blue12: '#0d47a1',

  // Green color tokens
  green1: '#e8f5e8',
  green2: '#c8e6c8',
  green3: '#a5d6a5',
  green4: '#81c784',
  green5: '#66bb6a',
  green6: '#4caf50',
  green7: '#43a047',
  green8: '#388e3c',
  green9: '#2e7d32',
  green10: '#1b5e20',
  green11: '#1b5e20',
  green12: '#1b5e20',

  // Red color tokens
  red1: '#ffebee',
  red2: '#ffcdd2',
  red3: '#ef9a9a',
  red4: '#e57373',
  red5: '#ef5350',
  red6: '#f44336',
  red7: '#e53935',
  red8: '#d32f2f',
  red9: '#c62828',
  red10: '#b71c1c',
  red11: '#b71c1c',
  red12: '#b71c1c',

  // Yellow color tokens
  yellow1: '#fffde7',
  yellow2: '#fff9c4',
  yellow3: '#fff59d',
  yellow4: '#fff176',
  yellow5: '#ffee58',
  yellow6: '#ffeb3b',
  yellow7: '#fdd835',
  yellow8: '#f9a825',
  yellow9: '#f57f17',
  yellow10: '#ff6f00',
  yellow11: '#ff6f00',
  yellow12: '#ff6f00',

  // Shadow color tokens
  shadow1: 'rgba(0, 0, 0, 0.04)',
  shadow2: 'rgba(0, 0, 0, 0.08)',
  shadow3: 'rgba(0, 0, 0, 0.12)',
  shadow4: 'rgba(0, 0, 0, 0.16)',
  shadow5: 'rgba(0, 0, 0, 0.20)',
  shadow6: 'rgba(0, 0, 0, 0.24)',
  shadowColor: 'rgba(0, 0, 0, 0.04)',
  
  // Accent colors
  accentBackground: materialColors.primary.primary,
  accentColor: materialColors.primary.onPrimary,
  
  // Black and white tokens
  black1: '#000000',
  black2: '#111111',
  black3: '#222222',
  black4: '#333333',
  black5: '#444444',
  black6: '#555555',
  black7: '#666666',
  black8: '#777777',
  black9: '#888888',
  black10: '#999999',
  black11: '#aaaaaa',
  black12: '#ffffff',
  
  white1: '#ffffff',
  white2: '#f5f5f5',
  white3: '#eeeeee',
  white4: '#e0e0e0',
  white5: '#bdbdbd',
  white6: '#9e9e9e',
  white7: '#757575',
  white8: '#616161',
  white9: '#424242',
  white10: '#212121',
  white11: '#000000',
  white12: '#000000',
}

export const materialDarkTheme = {
  // Background colors
  background: materialDarkColors.surface.surface,
  backgroundHover: materialDarkColors.surface.surfaceContainerLow,
  backgroundPress: materialDarkColors.surface.surfaceContainerLowest,
  backgroundFocus: materialDarkColors.surface.surfaceContainerHigh,
  backgroundStrong: materialDarkColors.surface.surfaceContainerHighest,
  backgroundTransparent: 'transparent',
  
  // Text colors
  color: materialDarkColors.surface.onSurface,
  colorHover: materialDarkColors.surface.onSurface,
  colorPress: materialDarkColors.surface.onSurface,
  colorFocus: materialDarkColors.primary.primary,
  colorTransparent: 'transparent',
  
  // Border colors
  borderColor: materialDarkColors.surface.outline,
  borderColorHover: materialDarkColors.surface.outline,
  borderColorPress: materialDarkColors.surface.outline,
  borderColorFocus: materialDarkColors.primary.primary,
  
  // Primary colors
  primary: materialDarkColors.primary.primary,
  primaryHover: materialDarkColors.primary.primary,
  primaryPress: materialDarkColors.primary.primary,
  primaryFocus: materialDarkColors.primary.primary,
  
  // Secondary colors
  secondary: materialDarkColors.secondary.secondary,
  secondaryHover: materialDarkColors.secondary.secondary,
  secondaryPress: materialDarkColors.secondary.secondary,
  secondaryFocus: materialDarkColors.secondary.secondary,
  
  // Tertiary colors
  tertiary: materialDarkColors.tertiary.tertiary,
  tertiaryHover: materialDarkColors.tertiary.tertiary,
  tertiaryPress: materialDarkColors.tertiary.tertiary,
  tertiaryFocus: materialDarkColors.tertiary.tertiary,
  
  // Error colors
  red: materialDarkColors.error.error,
  redHover: materialDarkColors.error.error,
  redPress: materialDarkColors.error.error,
  redFocus: materialDarkColors.error.error,
  
  // Success colors (derived from Material Design green)
  green: '#66bb6a',
  greenHover: '#66bb6a',
  greenPress: '#66bb6a',
  greenFocus: '#66bb6a',
  
  // Warning colors (derived from Material Design amber)
  yellow: '#ffb74d',
  yellowHover: '#ffb74d',
  yellowPress: '#ffb74d',
  yellowFocus: '#ffb74d',
  
  // Info colors (derived from Material Design blue)
  blue: '#42a5f5',
  blueHover: '#42a5f5',
  bluePress: '#42a5f5',
  blueFocus: '#42a5f5',
  
  // Placeholder colors
  placeholderColor: materialDarkColors.surface.onSurfaceVariant,
  
  // Outline colors
  outlineColor: materialDarkColors.surface.outline,
  
  // Surface colors
  surface1: materialDarkColors.surface.surfaceContainer,
  surface2: materialDarkColors.surface.surfaceContainerHigh,
  surface3: materialDarkColors.surface.surfaceContainerHighest,
  surface4: materialDarkColors.surface.surfaceContainerHighest,

  // Additional color tokens for compatibility
  color1: materialDarkColors.surface.onSurface,
  color2: materialDarkColors.surface.onSurface,
  color3: materialDarkColors.surface.onSurface,
  color4: materialDarkColors.surface.onSurface,
  color5: materialDarkColors.surface.onSurface,
  color6: materialDarkColors.surface.onSurface,
  color7: materialDarkColors.surface.onSurface,
  color8: materialDarkColors.surface.onSurface,
  color9: materialDarkColors.surface.onSurface,
  color10: materialDarkColors.surface.onSurfaceVariant,
  color11: materialDarkColors.surface.onSurface,
  color12: materialDarkColors.surface.onSurface,

  // Blue color tokens (dark theme)
  blue1: '#0d47a1',
  blue2: '#1565c0',
  blue3: '#1976d2',
  blue4: '#1e88e5',
  blue5: '#2196f3',
  blue6: '#42a5f5',
  blue7: '#64b5f6',
  blue8: '#90caf9',
  blue9: '#bbdefb',
  blue10: '#e3f2fd',
  blue11: '#e3f2fd',
  blue12: '#e3f2fd',

  // Green color tokens (dark theme)
  green1: '#1b5e20',
  green2: '#2e7d32',
  green3: '#388e3c',
  green4: '#43a047',
  green5: '#4caf50',
  green6: '#66bb6a',
  green7: '#81c784',
  green8: '#a5d6a5',
  green9: '#c8e6c8',
  green10: '#e8f5e8',
  green11: '#e8f5e8',
  green12: '#e8f5e8',

  // Red color tokens (dark theme)
  red1: '#b71c1c',
  red2: '#c62828',
  red3: '#d32f2f',
  red4: '#e53935',
  red5: '#f44336',
  red6: '#ef5350',
  red7: '#e57373',
  red8: '#ef9a9a',
  red9: '#ffcdd2',
  red10: '#ffebee',
  red11: '#ffebee',
  red12: '#ffebee',

  // Yellow color tokens (dark theme)
  yellow1: '#ff6f00',
  yellow2: '#f57f17',
  yellow3: '#f9a825',
  yellow4: '#fdd835',
  yellow5: '#ffeb3b',
  yellow6: '#ffee58',
  yellow7: '#fff176',
  yellow8: '#fff59d',
  yellow9: '#fff9c4',
  yellow10: '#fffde7',
  yellow11: '#fffde7',
  yellow12: '#fffde7',

  // Shadow color tokens (dark theme)
  shadow1: 'rgba(0, 0, 0, 0.20)',
  shadow2: 'rgba(0, 0, 0, 0.30)',
  shadow3: 'rgba(0, 0, 0, 0.40)',
  shadow4: 'rgba(0, 0, 0, 0.50)',
  shadow5: 'rgba(0, 0, 0, 0.60)',
  shadow6: 'rgba(0, 0, 0, 0.70)',
  shadowColor: 'rgba(0, 0, 0, 0.20)',
  
  // Accent colors
  accentBackground: materialDarkColors.primary.primary,
  accentColor: materialDarkColors.primary.onPrimary,
  
  // Black and white tokens (inverted for dark theme)
  black1: '#ffffff',
  black2: '#f5f5f5',
  black3: '#eeeeee',
  black4: '#e0e0e0',
  black5: '#bdbdbd',
  black6: '#9e9e9e',
  black7: '#757575',
  black8: '#616161',
  black9: '#424242',
  black10: '#212121',
  black11: '#000000',
  black12: '#000000',
  
  white1: '#000000',
  white2: '#111111',
  white3: '#222222',
  white4: '#333333',
  white5: '#444444',
  white6: '#555555',
  white7: '#666666',
  white8: '#777777',
  white9: '#888888',
  white10: '#999999',
  white11: '#aaaaaa',
  white12: '#ffffff',
}