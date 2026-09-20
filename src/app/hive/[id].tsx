import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { InspectionCard } from '@/components/inspection-card';
import { StatTile } from '@/components/stat-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Section } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { hiveAlerts, queenAge, queenMark, sum } from '@/lib/beekeeping';
import { confirm } from '@/lib/confirm';
import { formatLong, formatShort } from '@/lib/date';
import { useStore } from '@/lib/store';
import { Radius, Spacing } from '@/theme/colors';

export default function HiveDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, inspectionsOf, harvestsOf, removeHive, removeInspection, removeHarvest } = useStore();

  const hive = db.hives.find((h) => h.id === id);

  if (!hive) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center' }}>
        <EmptyState icon="alert-circle-outline" title="Kovan bulunamadı" message="Bu kayıt silinmiş olabilir." />
      </View>
    );
  }

  const inspections = inspectionsOf(hive.id);
  const harvests = harvestsOf(hive.id);
  const last = inspections[0];
  const alerts = hiveAlerts(hive, last);
  const mark = queenMark(hive.queenYear);
  const totalHoney = sum(harvests.filter((h) => h.product === 'Bal').map((h) => h.amountKg));
  const apiary = db.apiaries.find((a) => a.id === hive.apiaryId);

  const confirmDeleteHive = () =>
    confirm({
      title: `${hive.code} numaralı kovan silinsin mi?`,
      message: 'Bu kovana ait tüm muayene ve hasat kayıtları da silinir. Geri alınamaz.',
      confirmLabel: 'Sil',
      destructive: true,
      onConfirm: () => {
        removeHive(hive.id);
        router.back();
      },
    });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen
        options={{
          title: `Kovan ${hive.code}`,
          headerRight: () => (
            <Pressable onPress={() => router.push(`/hive/new?apiaryId=${hive.apiaryId}&edit=${hive.id}`)} hitSlop={12}>
              <Ionicons name="create-outline" size={22} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.identity}>
            <View style={[styles.mark, { backgroundColor: mark.hex, borderColor: theme.border }]}>
              <Text
                variant="display"
                style={{ color: mark.label === 'Beyaz' || mark.label === 'Sarı' ? '#2A2118' : '#FFFFFF' }}>
                {hive.code}
              </Text>
            </View>
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <Text variant="title">{hive.breed}</Text>
              <Text variant="caption" color="textMuted">
                {hive.type} kovan · {apiary?.name ?? 'arılık yok'}
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
                <Badge label={hive.status} severity={hive.status === 'aktif' ? 'ok' : hive.status === 'ölü' ? 'danger' : 'warning'} />
                <Badge
                  label={`Ana ${hive.queenYear} · ${mark.label} · ${queenAge(hive)} yaş`}
                  severity="info"
                />
              </View>
            </View>
          </View>

          {hive.notes ? (
            <Text variant="body" color="textMuted" style={{ marginTop: Spacing.md }}>
              {hive.notes}
            </Text>
          ) : null}
        </Card>

        {alerts.length > 0 && (
          <Card style={{ backgroundColor: theme.surfaceAlt, borderColor: 'transparent' }}>
            <Text variant="label" color="textMuted" style={{ marginBottom: Spacing.sm }}>
              DURUM
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {alerts.map((a) => (
                <Badge key={a.key} label={a.label} severity={a.severity} />
              ))}
            </View>
          </Card>
        )}

        <View style={styles.tiles}>
          <StatTile
            icon="clipboard-outline"
            value={`${inspections.length}`}
            label="muayene"
            tone="info"
            minWidth={96}
          />
          <StatTile
            icon="water-outline"
            value={totalHoney.toFixed(1)}
            label="kg toplam bal"
            tone="primary"
            minWidth={96}
          />
          <StatTile
            icon="calendar-outline"
            value={last ? formatShort(last.date) : '—'}
            label="son bakım"
            tone="success"
            minWidth={96}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <View style={{ flex: 2 }}>
            <Button
              title="Muayene ekle"
              icon="add-circle-outline"
              onPress={() => router.push(`/inspection/new?hiveId=${hive.id}`)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Hasat"
              variant="secondary"
              icon="basket-outline"
              onPress={() => router.push(`/harvest/new?hiveId=${hive.id}`)}
            />
          </View>
        </View>

        {harvests.length > 0 && (
          <Section title="Hasat kayıtları">
            <Card padded={false}>
              {harvests.map((h, i) => (
                <Pressable
                  key={h.id}
                  onLongPress={() =>
                    confirm({
                      title: 'Hasat kaydı silinsin mi?',
                      message: formatLong(h.date),
                      confirmLabel: 'Sil',
                      destructive: true,
                      onConfirm: () => removeHarvest(h.id),
                    })
                  }
                  style={[
                    styles.harvestRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <Text variant="heading">{h.product}</Text>
                    <Text variant="caption" color="textMuted">
                      {formatLong(h.date)}
                      {h.notes ? ` · ${h.notes}` : ''}
                    </Text>
                  </View>
                  <Text variant="title">{h.amountKg} kg</Text>
                </Pressable>
              ))}
            </Card>
            <Text variant="caption" color="textMuted">
              Silmek için kayda basılı tutun.
            </Text>
          </Section>
        )}

        <Section title={`Muayene geçmişi (${inspections.length})`}>
          {inspections.length === 0 ? (
            <EmptyState
              icon="clipboard-outline"
              title="Henüz muayene yok"
              message="İlk muayeneyi kaydedin; uygulama koloni gücünü, oğul riskini ve bakım aralığını buradan takip edecek."
              actionLabel="Muayene ekle"
              onAction={() => router.push(`/inspection/new?hiveId=${hive.id}`)}
            />
          ) : (
            <View style={{ gap: Spacing.md }}>
              {inspections.map((ins) => (
                <InspectionCard
                  key={ins.id}
                  inspection={ins}
                  onDelete={() =>
                    confirm({
                      title: 'Muayene silinsin mi?',
                      message: formatLong(ins.date),
                      confirmLabel: 'Sil',
                      destructive: true,
                      onConfirm: () => removeInspection(ins.id),
                    })
                  }
                />
              ))}
            </View>
          )}
        </Section>

        <Button title="Kovanı sil" variant="danger" icon="trash-outline" onPress={confirmDeleteHive} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  identity: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'center' },
  mark: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  harvestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
});
