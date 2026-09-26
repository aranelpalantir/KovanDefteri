import * as Linking from 'expo-linking';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/colors';

export default function TabsLayout() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.bg },
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.bg },
        // Ayarlar ve GitHub baglantisi her sekmede ve her veri durumunda erisilebilir olmali.
        headerRight: () => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.md,
              marginRight: Spacing.lg,
            }}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="GitHub Deposu"
              onPress={() => Linking.openURL('https://github.com/aranelpalantir/KovanDefteri')}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="logo-github" size={22} color={theme.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ayarlar"
              onPress={() => router.push('/settings')}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="settings-outline" size={22} color={theme.text} />
            </Pressable>
          </View>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kovanlar',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Görevler',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Özet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
