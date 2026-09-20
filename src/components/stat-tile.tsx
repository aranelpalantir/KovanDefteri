import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme/colors';

export function StatTile({
  icon,
  value,
  label,
  tone = 'primary',
  minWidth = 140,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Sarma eşiği — üç tileı yan yana sığdırmak için küçültülebilir. */
  minWidth?: number;
}) {
  const theme = useTheme();
  const bg = {
    primary: theme.primarySoft,
    success: theme.successSoft,
    warning: theme.warningSoft,
    danger: theme.dangerSoft,
    info: theme.infoSoft,
  }[tone];
  const fg = {
    primary: theme.primary,
    success: theme.success,
    warning: theme.warning,
    danger: theme.danger,
    info: theme.info,
  }[tone];

  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border, minWidth }]}>
      <View style={[styles.icon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={fg} />
      </View>
      <Text variant="title" numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: Spacing.xs,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
});
