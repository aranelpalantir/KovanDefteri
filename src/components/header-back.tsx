import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/colors';

/**
 * Basliktaki geri dugmesi.
 *
 * Varsayilan geri dugmesi yalnizca gezinme yiginiinda onceki bir ekran varsa
 * ciziliyor. Sayfa dogrudan bir alt adreste acildiginda (uygulama /settings
 * uzerindeyken yeniden yuklenirse, ya da iOS uygulamayi son adreste geri
 * yuklerse) yigin tek elemanli kaliyor ve hicbir geri dugmesi cikmiyor.
 * Tam ekran modda tarayici geri tusu da olmadigi icin kullanici ekranda
 * kapali kaliyordu.
 *
 * Bu yuzden dugmeyi kendimiz ciziyoruz: geri gidilebiliyorsa geri gider,
 * gidilemiyorsa kovan listesine dondurur. Cikis her zaman var.
 */
export function HeaderBack() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Geri"
      hitSlop={12}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}>
      <Ionicons name="chevron-back" size={26} color={theme.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingRight: Spacing.sm, marginLeft: -Spacing.xs },
});
