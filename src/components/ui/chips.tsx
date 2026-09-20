import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/colors';

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <Text variant="label" style={{ color: selected ? theme.onPrimary : theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Tek seçimli etiket grubu. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => (
        <Chip key={opt} label={opt} selected={opt === value} onPress={() => onChange(opt)} />
      ))}
    </View>
  );
}

/** Çok seçimli etiket grubu. */
export function MultiChipGroup<T extends string>({
  options,
  values,
  onChange,
}: {
  options: readonly T[];
  values: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const selected = values.includes(opt);
        return (
          <Chip
            key={opt}
            label={opt}
            selected={selected}
            onPress={() =>
              onChange(selected ? values.filter((v) => v !== opt) : [...values, opt])
            }
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
});
