import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/colors';
import type { Severity } from '@/lib/beekeeping';

export function Badge({ label, severity = 'info' }: { label: string; severity?: Severity }) {
  const theme = useTheme();
  const map = {
    ok: { bg: theme.successSoft, fg: theme.success },
    info: { bg: theme.infoSoft, fg: theme.info },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
  } as const;
  const tone = map[severity];

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text variant="caption" style={{ color: tone.fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    maxWidth: 220,
  },
});
