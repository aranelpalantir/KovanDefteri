import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { hiveAlerts, queenMark, strengthTrend, worstSeverity, type Trend } from '@/lib/beekeeping';
import { daysSince } from '@/lib/date';
import type { Hive, Inspection } from '@/lib/types';
import { Radius, Spacing } from '@/theme/colors';

const TREND_ICON: Record<Trend, keyof typeof Ionicons.glyphMap> = {
  up: 'trending-up',
  down: 'trending-down',
  flat: 'remove',
  unknown: 'help',
};

export function HiveCard({
  hive,
  inspections,
  onPress,
}: {
  hive: Hive;
  inspections: Inspection[];
  onPress: () => void;
}) {
  const theme = useTheme();
  const last = inspections[0];
  const alerts = hiveAlerts(hive, last);
  const severity = worstSeverity(alerts);
  const mark = queenMark(hive.queenYear);
  const trend = strengthTrend(inspections);

  const accent = {
    ok: theme.success,
    info: theme.info,
    warning: theme.warning,
    danger: theme.danger,
  }[severity];

  return (
    <Card onPress={onPress} accent={accent}>
      <View style={styles.top}>
        <View style={[styles.mark, { backgroundColor: mark.hex, borderColor: theme.border }]}>
          <Text variant="heading" style={{ color: mark.label === 'Beyaz' || mark.label === 'Sarı' ? '#2A2118' : '#FFFFFF' }}>
            {hive.code}
          </Text>
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading">
            {hive.breed} · {hive.type}
          </Text>
          <Text variant="caption" color="textMuted">
            {last ? `Son muayene ${daysSince(last.date)} gün önce` : 'Henüz muayene kaydı yok'}
          </Text>
        </View>

        {last ? (
          <View style={styles.strength}>
            <View style={styles.trendRow}>
              <Text variant="display" style={{ fontSize: 24 }}>
                {last.strength}
              </Text>
              <Ionicons
                name={TREND_ICON[trend]}
                size={14}
                color={trend === 'down' ? theme.danger : trend === 'up' ? theme.success : theme.textMuted}
              />
            </View>
            <Text variant="caption" color="textMuted">
              güç
            </Text>
          </View>
        ) : null}
      </View>

      {alerts.length > 0 && (
        <View style={styles.badges}>
          {alerts.slice(0, 3).map((a) => (
            <Badge key={a.key} label={a.label} severity={a.severity} />
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  mark: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strength: { alignItems: 'center' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
});
