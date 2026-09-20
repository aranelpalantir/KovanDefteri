import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HiveCard } from '@/components/hive-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { hiveAlerts, worstSeverity } from '@/lib/beekeeping';
import { seasonHint } from '@/lib/date';
import { useStore } from '@/lib/store';
import { Radius, Spacing } from '@/theme/colors';

type Filter = 'hepsi' | 'dikkat' | 'gecikmiş';

export default function HivesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db, ready, hivesOf, inspectionsOf } = useStore();
  const [apiaryId, setApiaryId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('hepsi');

  const activeApiary = db.apiaries.find((a) => a.id === apiaryId) ?? db.apiaries[0];
  const season = seasonHint();

  const hives = useMemo(
    () => (activeApiary ? hivesOf(activeApiary.id) : []),
    [activeApiary, hivesOf],
  );

  const rows = useMemo(
    () =>
      hives.map((hive) => {
        const inspections = inspectionsOf(hive.id);
        const alerts = hiveAlerts(hive, inspections[0]);
        return { hive, inspections, alerts, severity: worstSeverity(alerts) };
      }),
    [hives, inspectionsOf],
  );

  const visible = rows.filter((r) => {
    if (filter === 'dikkat') return r.severity === 'danger' || r.severity === 'warning';
    if (filter === 'gecikmiş') return r.alerts.some((a) => a.key === 'stale' || a.key === 'due');
    return true;
  });

  const attention = rows.filter((r) => r.severity === 'danger' || r.severity === 'warning').length;

  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  if (db.apiaries.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg, justifyContent: 'center' }]}>
        <EmptyState
          icon="home-outline"
          title="Kovan Defterine hoş geldiniz"
          message="Başlamak için bir arılık oluşturun. Kovanlarınızı, muayenelerinizi ve hasadınızı tamamen çevrimdışı takip edeceksiniz."
          actionLabel="Arılık ekle"
          onAction={() => router.push('/apiary/new')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
              <Ionicons name="settings-outline" size={22} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={visible}
        keyExtractor={(item) => item.hive.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListHeaderComponent={
          <View style={{ gap: Spacing.lg, marginBottom: Spacing.lg }}>
            {db.apiaries.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.sm }}>
                {db.apiaries.map((a) => {
                  const selected = a.id === activeApiary?.id;
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => setApiaryId(a.id)}
                      style={[
                        styles.tab,
                        {
                          backgroundColor: selected ? theme.primary : theme.surface,
                          borderColor: selected ? theme.primary : theme.border,
                        },
                      ]}>
                      <Text
                        variant="label"
                        style={{ color: selected ? theme.onPrimary : theme.text }}>
                        {a.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Card style={{ backgroundColor: theme.primarySoft, borderColor: 'transparent' }}>
              <View style={styles.seasonRow}>
                <Ionicons name="leaf-outline" size={18} color={theme.primary} />
                <Text variant="heading" style={{ color: theme.primary }}>
                  {season.season}
                </Text>
              </View>
              <Text variant="body" style={{ marginTop: Spacing.xs }}>
                {season.tip}
              </Text>
            </Card>

            <View style={styles.summaryRow}>
              <Text variant="title">{hives.length} kovan</Text>
              {attention > 0 && (
                <Text variant="label" style={{ color: theme.warning }}>
                  {attention} kovan dikkat istiyor
                </Text>
              )}
            </View>

            <View style={styles.filters}>
              {(['hepsi', 'dikkat', 'gecikmiş'] as Filter[]).map((f) => {
                const selected = f === filter;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFilter(f)}
                    style={[
                      styles.filter,
                      {
                        backgroundColor: selected ? theme.surfaceAlt : 'transparent',
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}>
                    <Text
                      variant="caption"
                      style={{ color: selected ? theme.primary : theme.textMuted }}>
                      {f}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <HiveCard
            hive={item.hive}
            inspections={item.inspections}
            onPress={() => router.push(`/hive/${item.hive.id}`)}
          />
        )}
        ListEmptyComponent={
          hives.length === 0 ? (
            <EmptyState
              icon="cube-outline"
              title="Bu arılıkta kovan yok"
              message="İlk kovanı ekleyin, ardından muayene kaydı tutmaya başlayın."
              actionLabel="Kovan ekle"
              onAction={() => router.push(`/hive/new?apiaryId=${activeApiary?.id}`)}
            />
          ) : (
            <EmptyState
              icon="funnel-outline"
              title="Bu filtrede kovan yok"
              message="Filtreyi değiştirerek tüm kovanları görebilirsiniz."
            />
          )
        }
      />

      <View style={[styles.footer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        <Button
          title="Kovan ekle"
          icon="add"
          onPress={() => router.push(`/hive/new?apiaryId=${activeApiary?.id}`)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  tab: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  seasonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  filters: { flexDirection: 'row', gap: Spacing.sm },
  filter: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
