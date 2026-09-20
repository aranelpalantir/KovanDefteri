import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/colors';

type CardProps = ViewProps & {
  onPress?: () => void;
  padded?: boolean;
  accent?: string;
};

export function Card({ onPress, padded = true, accent, style, children, ...rest }: CardProps) {
  const theme = useTheme();
  const base = [
    styles.card,
    {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      padding: padded ? Spacing.lg : 0,
    },
    accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null,
    style,
  ];

  if (!onPress) {
    return (
      <View style={base} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [...base, pressed && { opacity: 0.7 }]}
      {...rest}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
