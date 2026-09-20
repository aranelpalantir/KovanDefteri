import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider } from '@/lib/store';
import { Colors } from '@/theme/colors';

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const palette = isDark ? Colors.dark : Colors.light;

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: palette.primary,
      background: palette.bg,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
    },
  };

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerTintColor: palette.primary,
              headerTitleStyle: { color: palette.text },
              contentStyle: { backgroundColor: palette.bg },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="apiary/new" options={{ title: 'Yeni Arılık', presentation: 'modal' }} />
            <Stack.Screen name="hive/new" options={{ title: 'Yeni Kovan', presentation: 'modal' }} />
            <Stack.Screen name="hive/[id]" options={{ title: 'Kovan' }} />
            <Stack.Screen name="inspection/new" options={{ title: 'Muayene', presentation: 'modal' }} />
            <Stack.Screen name="harvest/new" options={{ title: 'Hasat', presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ title: 'Ayarlar' }} />
          </Stack>
        </ThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
