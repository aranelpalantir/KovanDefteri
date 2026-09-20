import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ColorName } from '@/theme/colors';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'mono';

export type TextProps = RNTextProps & {
  variant?: Variant;
  color?: ColorName;
  center?: boolean;
};

const variants = StyleSheet.create({
  display: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  caption: { fontSize: 12, fontWeight: '500' },
  mono: { fontSize: 13, fontVariant: ['tabular-nums'] },
});

export function Text({ variant = 'body', color = 'text', center, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[variants[variant], { color: theme[color] }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}
