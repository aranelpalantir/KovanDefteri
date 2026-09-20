import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StatTile } from '@/components/stat-tile';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Section } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { hiveAlerts, queenAge, sum, worstSeverity } from '@/lib/beekeeping';
import { daysUntil, fromISO } from '@/lib/date';
import { useStore } from '@/lib/store';
import { HIVE_STATUSES } from '@/lib/types';
import { Radius, Spacing } from '@/theme/colors';

const MONTH_LABELS = ['O', 'Ş', 'M', 'N', 'M', 'H', 'T', 'A', 'E', 'E', 'K', 'A'];

export default function StatsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db, lastInspection } = useStore();
  const year = new Date().getFullYear();

  const stats = useMemo(() => {
    const honeyThisYear = db.harvests.filter(
      (h) => h.product === 'Bal' && fromISO(h.date).getFullYear() === year,
    );

    const monthly = Array.from({ length: 12 }, (_, m) =>
      sum(honeyThisYear.filter((h) => fromISO(h.date).getMonth() === m).map((h) => h.amountKg)),
    );

    const perHive = db.hives
      .map((hive) => ({
        hive,
        kg: sum(honeyThisYear.filter((h) => h.hiveId === hive.id).map((h) => h.amountKg)),
      }))
      .filter((r) => r.kg > 0)
      .sort((a, b) => b.kg - a.kg);

    const statusCounts = HIVE_STATUSES.map((s) => ({
      status: s,
      count: db.hives.filter((h) => h.status === s).length,
    })).filter((r) => r.count > 0);

    const attention = db.hives
      .map((hive) => {
        const alerts = hiveAlerts(hive, lastInspection(hive.id));
        return { hive, alerts, severity: worstSeverity(alerts) };
      })
      .filter((r) => r.severity === 'danger')
      .sort((a, b) => b.alerts.length - a.alerts.length);

    const oldQueens = db.hives.filter((h) => queenAge(h) >= 2 && h.status !== 'ölü').length;
    const openTasks = db.tasks.filter((t) => !t.done).length;
    const overdueTasks = db.tasks.filter((t) => !t.done && daysUntil(t.due) < 0).length;

    return {
      totalHoney: sum(honeyThisYear.map((h) => h.amountKg)),
      monthly,
      perHive,
      statusCounts,
      attention,
      oldQueens,
      openTasks,
      overdueTasks,
      activeHives: db.hives.filter((h) => h.status === 'aktif').length,
    };
  }, [db, lastInspection, year]);

  if (db.hives.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center' }}>
        <EmptyState
          icon="stats-chart-outline"
          title="Henüz veri yok"
          message="Kovan ve muayene kaydı ekledikçe sezon özeti burada oluşacak."
        />
      </View>
    );
  }

  const maxMonth = Math.max(1, ...stats.monthly);
  const avgPerHive = stats.activeHives > 0 ? stats.totalHoney / stats.activeHives : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <View style={styles.tiles}>
        <StatTile icon="cube-outline" value={`${db.hives.length}`} label="toplam kovan" tone="info" />
        <StatTile icon="pulse-outline" value={`${stats.activeHives}`} label="aktif koloni" tone="success" />
        <StatTile
          icon="water-outline"
          value={`${stats.totalHoney.toFixed(1)} kg`}
          label={`${year} bal hasadı`}
          tone="primary"
        />
        <StatTile
          icon="alarm-outline"
          value={`${stats.overdueTasks}`}
          label={`gecikmiş görev · ${stats.openTasks} açık`}
          tone={stats.overdueTasks > 0 ? 'danger' : 'success'}
        />
      </View>

      <Section title={`${year} bal hasadı`}>
        <Card>
          <View style={styles.chart}>
            {stats.monthly.map((kg, i) => (
              <View key={i} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(kg > 0 ? 6 : 0, (kg / maxMonth) * 100)}%`,
                        backgroundColor: kg > 0 ? theme.primary : 'transparent',
                      },
                    ]}
                  />
                </View>
                <Text variant="caption" color="textMuted">
                  {MONTH_LABELS[i]}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="caption" color="textMuted" style={{ marginTop: Spacing.sm }}>
            En yüksek ay {maxMonth.toFixed(1)} kg · aktif kovan başına ortalama{' '}
            {avgPerHive.toFixed(1)} kg
          </Text>
        </Card>
      </Section>

      {stats.perHive.length > 0 && (
        <Section title="Kovan verimliliği">
          <Card padded={false}>
            {stats.perHive.slice(0, 8).map((row, i) => (
              <Pressable
                key={row.hive.id}
                onPress={() => router.push(`/hive/${row.hive.id}`)}
                style={[
                  styles.rankRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                ]}>
                <Text variant="heading" style={{ width: 40 }}>
                  {row.hive.code}
                </Text>
                <View style={[styles.rankTrack, { backgroundColor: theme.surfaceAlt }]}>
                  <View
                    style={[
                      styles.rankFill,
                      {
                        width: `${(row.kg / stats.perHive[0].kg) * 100}%`,
                        backgroundColor: theme.primary,
                      },
                    ]}
                  />
                </View>
                <Text variant="label" style={{ width: 64, textAlign: 'right' }}>
                  {row.kg.toFixed(1)} kg
                </Text>
              </Pressable>
            ))}
          </Card>
        </Section>
      )}

      <Section title="Koloni durumu">
        <Card>
          <View style={{ gap: Spacing.sm }}>
            {stats.statusCounts.map((row) => (
              <View key={row.status} style={styles.statusRow}>
                <Text variant="body" style={{ flex: 1 }}>
                  {row.status}
                </Text>
                <View style={[styles.rankTrack, { backgroundColor: theme.surfaceAlt, flex: 2 }]}>
                  <View
                    style={[
                      styles.rankFill,
                      {
                        width: `${(row.count / db.hives.length) * 100}%`,
                        backgroundColor: row.status === 'ölü' ? theme.danger : theme.success,
                      },
                    ]}
                  />
                </View>
                <Text variant="label" style={{ width: 28, textAlign: 'right' }}>
                  {row.count}
                </Text>
              </View>
            ))}
          </View>
          {stats.oldQueens > 0 && (
            <Text variant="caption" color="textMuted" style={{ marginTop: Spacing.md }}>
              {stats.oldQueens} kovanda ana arı 2 yaş ve üzeri — yenileme planlayın.
            </Text>
          )}
        </Card>
      </Section>

      {stats.attention.length > 0 && (
        <Section title="Acil ilgi isteyenler">
          <View style={{ gap: Spacing.md }}>
            {stats.attention.map((row) => (
              <Card key={row.hive.id} onPress={() => router.push(`/hive/${row.hive.id}`)} accent={theme.danger}>
                <Text variant="heading">
                  Kovan {row.hive.code} · {row.hive.breed}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm }}>
                  {row.alerts.map((a) => (
                    <Badge key={a.key} label={a.label} severity={a.severity} />
                  ))}
                </View>
              </Card>
            ))}
          </View>
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxl },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, height: 140 },
  barColumn: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  barTrack: { height: 110, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: Radius.sm, minHeight: 0 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  rankTrack: { flex: 1, height: 10, borderRadius: Radius.pill, overflow: 'hidden' },
  rankFill: { height: '100%', borderRadius: Radius.pill },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
