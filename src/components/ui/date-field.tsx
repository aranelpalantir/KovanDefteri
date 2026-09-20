import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatLong, relativeDays, todayISO } from '@/lib/date';
import type { ISODate } from '@/lib/types';
import { Radius, Spacing } from '@/theme/colors';

/**
 * Takvim açmadan gün seçimi — arıcı eldivenle tek elle kullanabilsin diye
 * ok tuşları ve "Bugün" kısayolu.
 */
export function DateField({
  value,
  onChange,
}: {
  value: ISODate;
  onChange: (next: ISODate) => void;
}) {
  const theme = useTheme();

  const arrow = (icon: 'chevron-back' | 'chevron-forward', delta: number) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => onChange(addDays(value, delta))}
      style={({ pressed }) => [styles.arrow, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={20} color={theme.text} />
    </Pressable>
  );

  const isToday = value === todayISO();

  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {arrow('chevron-back', -1)}
        <View style={styles.center}>
          <Text variant="heading">{formatLong(value)}</Text>
          <Text variant="caption" color="textMuted">
            {relativeDays(value)}
          </Text>
        </View>
        {arrow('chevron-forward', 1)}
      </View>
      {!isToday && (
        <Pressable onPress={() => onChange(todayISO())} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text variant="label" style={{ color: theme.primary }}>
            Bugüne dön
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  arrow: { paddingVertical: 12, paddingHorizontal: Spacing.lg },
  center: { flex: 1, alignItems: 'center' },
});
