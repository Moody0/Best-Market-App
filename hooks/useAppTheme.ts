import { useColorScheme } from 'react-native';
import { useMemo } from 'react';
import { useThemeStore } from '@/store/theme';
import { ThemeColors, ThemePalette } from '@/constants/Colors';

export function useAppTheme(): { colors: ThemePalette; isDark: boolean } {
  const systemColorScheme = useColorScheme();
  const themePreference = useThemeStore(state => state.themePreference);

  let isDark = true;
  
  if (themePreference === 'system') {
    isDark = systemColorScheme === 'dark';
  } else {
    isDark = themePreference === 'dark';
  }

  return useMemo(() => {
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    return { colors, isDark };
  }, [isDark]);
}
