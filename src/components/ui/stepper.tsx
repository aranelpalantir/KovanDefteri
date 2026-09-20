import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/colors';

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 40,
  suffix,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const theme = useTheme();
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const button = (icon: 'remove' | 'add', delta: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => onChange(clamp(value + delta))}
      style={({ pressed }) => [
        styles.btn,
        { borderColor: theme.border, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
      ]}>
      <Ionicons name={icon} size={20} color={theme.text} />
    </Pressable>
  );

  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {button('remove', -1, value <= min)}
      <Text variant="heading" style={styles.value}>
        {value}
        {suffix ? ` ${suffix}` : ''}
      </Text>
      {button('add', 1, value >= max)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
  },
  value: { flex: 1, textAlign: 'center' },
});
