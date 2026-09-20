import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/colors';

/** 1–5 arası hızlı puanlama. Alan etiketleri sağda gösterilir. */
export function Scale({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (next: number) => void;
  labels: string[];
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= value;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${n} / 5`}
              onPress={() => onChange(n)}
              style={({ pressed }) => [
                styles.dot,
                {
                  backgroundColor: active ? theme.primary : theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <Text variant="heading" style={{ color: active ? theme.onPrimary : theme.textMuted }}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" color="textMuted">
        {labels[value] ?? ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  dot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
