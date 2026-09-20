import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { STRENGTH_LABELS, TEMPERAMENT_LABELS, swarmRisk } from '@/lib/beekeeping';
import { formatLong, relativeDays } from '@/lib/date';
import type { Inspection } from '@/lib/types';
import { Spacing } from '@/theme/colors';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="caption">{value}</Text>
    </View>
  );
}

export function InspectionCard({
  inspection,
  onDelete,
}: {
  inspection: Inspection;
  onDelete?: () => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const risk = swarmRisk(inspection);

  return (
    <Card onPress={() => setOpen((v) => !v)}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading">{formatLong(inspection.date)}</Text>
          <Text variant="caption" color="textMuted">
            {relativeDays(inspection.date)} · güç {inspection.strength}/5 ·{' '}
            {inspection.broodFrames} yavrulu çerçeve
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.textMuted}
        />
      </View>

      <View style={styles.badges}>
        {inspection.queenSeen && <Badge label="Ana görüldü" severity="ok" />}
        {!inspection.queenSeen && inspection.eggsSeen && <Badge label="Yumurta var" severity="ok" />}
        {!inspection.queenSeen && !inspection.eggsSeen && (
          <Badge label="Ana yok/şüpheli" severity="danger" />
        )}
        {inspection.queenCells !== 'yok' && (
          <Badge label={`Memeli: ${inspection.queenCells}`} severity={risk >= 2 ? 'danger' : 'warning'} />
        )}
        {inspection.problems.map((p) => (
          <Badge key={p} label={p} severity="warning" />
        ))}
      </View>

      {open && (
        <View style={[styles.details, { borderTopColor: theme.border }]}>
          <Row label="Koloni gücü" value={`${inspection.strength}/5 · ${STRENGTH_LABELS[inspection.strength]}`} />
          <Row label="Huy" value={`${inspection.temperament}/5 · ${TEMPERAMENT_LABELS[inspection.temperament]}`} />
          <Row
            label="Çerçeveler"
            value={`${inspection.totalFrames} toplam · ${inspection.broodFrames} yavru · ${inspection.honeyFrames} bal`}
          />
          <Row label="Yem durumu" value={inspection.stores} />
          {inspection.actions.length > 0 && (
            <Row label="Yapılan işlemler" value={inspection.actions.join(', ')} />
          )}
          {inspection.nextCheck && <Row label="Sonraki kontrol" value={formatLong(inspection.nextCheck)} />}
          {inspection.notes ? (
            <View style={{ gap: 2, marginTop: Spacing.xs }}>
              <Text variant="caption" color="textMuted">
                Not
              </Text>
              <Text variant="body">{inspection.notes}</Text>
            </View>
          ) : null}

          {onDelete && (
            <Pressable onPress={onDelete} style={styles.delete} hitSlop={8}>
              <Ionicons name="trash-outline" size={15} color={theme.danger} />
              <Text variant="label" style={{ color: theme.danger }}>
                Kaydı sil
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  details: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
});
