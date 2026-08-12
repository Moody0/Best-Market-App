export const Colors = {
  primary: '#F97316',
  primaryAccent: '#FF7A00',
  background: '#121212',
  surface: '#1E1E1E',
  surfaceAlt: '#1A1A1A',
  input: '#2A2A2A',
  border: '#333333',
  divider: '#383838',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#71717A',
  imageContainer: '#FFFFFF',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#EAB308',
};

export const ThemeColors = {
  light: {
    primary: '#FF5A00',
    primaryHover: '#E65100',
    primaryLight: '#FFF2E8',
    background: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceAlt: '#F4F4F5',
    input: '#F8F8F8',
    border: '#E5E7EB',
    divider: '#F1F5F9',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    imageContainer: '#F4F4F5',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
    tint: '#FF5A00',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#FF5A00',
  },
  dark: {
    primary: '#F97316',
    primaryHover: '#FF7A00',
    primaryLight: 'rgba(249, 115, 22, 0.12)',
    background: '#121212',
    surface: '#1E1E1E',
    surfaceAlt: '#1A1A1A',
    input: '#2A2A2A',
    border: '#333333',
    divider: '#383838',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#71717A',
    imageContainer: '#FFFFFF',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#EAB308',
    tint: '#F97316',
    tabIconDefault: '#71717A',
    tabIconSelected: '#F97316',
  }
};

export type ThemePalette = typeof ThemeColors.light;

export default {
  light: ThemeColors.light,
  dark: ThemeColors.dark,
};
