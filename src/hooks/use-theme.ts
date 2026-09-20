import { useColorScheme } from 'react-native';

import { Colors, type Palette } from '@/theme/colors';

export function useTheme(): Palette & { isDark: boolean } {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { ...(isDark ? Colors.dark : Colors.light), isDark };
}
