import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipGroup, MultiChipGroup } from '@/components/ui/chips';
import { DateField } from '@/components/ui/date-field';
import { Field, Input } from '@/components/ui/field';
import { Scale } from '@/components/ui/scale';
import { Stepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { ToggleRow } from '@/components/ui/toggle-row';
import { useTheme } from '@/hooks/use-theme';
import { STRENGTH_LABELS, TEMPERAMENT_LABELS, suggestedInterval, swarmRisk } from '@/lib/beekeeping';
import { addDays, formatLong, todayISO } from '@/lib/date';
import { useStore } from '@/lib/store';
import {
  ACTIONS,
  PROBLEMS,
  QUEEN_CELL_STATES,
  STORE_LEVELS,
  type HiveAction,
  type Problem,
  type QueenCellState,
  type StoreLevel,
} from '@/lib/types';
import { Spacing } from '@/theme/colors';

export default function NewInspectionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { hiveId } = useLocalSearchParams<{ hiveId: string }>();
  const { db, addInspection, addTask, lastInspection } = useStore();

  const hive = db.hives.find((h) => h.id === hiveId);
  const previous = hiveId ? lastInspection(hiveId) : undefined;

  const [date, setDate] = useState(todayISO());
  const [strength, setStrength] = useState(previous?.strength ?? 3);
  const [temperament, setTemperament] = useState(previous?.temperament ?? 2);
  const [queenSeen, setQueenSeen] = useState(false);
  const [eggsSeen, setEggsSeen] = useState(true);
  const [totalFrames, setTotalFrames] = useState(previous?.totalFrames ?? 10);
  const [broodFrames, setBroodFrames] = useState(previous?.broodFrames ?? 4);
  const [honeyFrames, setHoneyFrames] = useState(previous?.honeyFrames ?? 3);
  const [queenCells, setQueenCells] = useState<QueenCellState>('yok');
  const [stores, setStores] = useState<StoreLevel>('orta');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [actions, setActions] = useState<HiveAction[]>([]);
  const [notes, setNotes] = useState('');
  const [createTask, setCreateTask] = useState(true);

  const interval = suggestedInterval({ queenCells, strength });
  const nextCheck = addDays(date, interval);
  const risk = swarmRisk({ queenCells, strength, honeyFrames, totalFrames });

  const save = () => {
    if (!hiveId) return;
    addInspection({
      hiveId,
      date,
      strength,
      temperament,
      queenSeen,
      eggsSeen,
      broodFrames,
      honeyFrames,
      totalFrames,
      queenCells,
      stores,
      problems,
      actions,
      notes: notes.trim() || undefined,
      nextCheck,
    });

    if (createTask && hive) {
      addTask({
        hiveId,
        title: `${hive.code} nolu kovanı kontrol et`,
        due: nextCheck,
      });
    }

    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: hive ? `Kovan ${hive.code} — Muayene` : 'Muayene' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Muayene tarihi">
          <DateField value={date} onChange={setDate} />
        </Field>

        <Field label="Koloni gücü" hint="Arı yoğunluğu ve dolu çerçeve sayısına göre.">
          <Scale value={strength} onChange={setStrength} labels={STRENGTH_LABELS} />
        </Field>

        <Field label="Huy" hint="Kovanı açarken gösterdiği tepki.">
          <Scale value={temperament} onChange={setTemperament} labels={TEMPERAMENT_LABELS} />
        </Field>

        <View style={{ gap: Spacing.md }}>
          <ToggleRow
            label="Ana arı görüldü"
            hint="Ananın kendisini gördüyseniz işaretleyin."
            value={queenSeen}
            onChange={setQueenSeen}
          />
          <ToggleRow
            label="Yumurta var"
            hint="Ana görülmese de taze yumurta analığın kanıtıdır."
            value={eggsSeen}
            onChange={setEggsSeen}
          />
        </View>

        {!queenSeen && !eggsSeen && (
          <Card style={{ backgroundColor: theme.dangerSoft, borderColor: 'transparent' }}>
            <Text variant="heading" style={{ color: theme.danger }}>
              Analık şüphesi
            </Text>
            <Text variant="body" style={{ marginTop: Spacing.xs }}>
              Ne ana ne yumurta var. Birkaç gün içinde tekrar bakın; gerekirse yavrulu çerçeve verin
              ya da ana takviyesi yapın.
            </Text>
          </Card>
        )}

        <Field label="Toplam çerçeve">
          <Stepper value={totalFrames} onChange={setTotalFrames} min={1} max={30} />
        </Field>

        <Field label="Yavrulu çerçeve">
          <Stepper value={broodFrames} onChange={setBroodFrames} min={0} max={totalFrames} />
        </Field>

        <Field label="Ballı çerçeve">
          <Stepper value={honeyFrames} onChange={setHoneyFrames} min={0} max={totalFrames} />
        </Field>

        <Field label="Ana arı memesi" hint="Yüksük, açık ya da kapalı meme oğul habercisidir.">
          <ChipGroup options={QUEEN_CELL_STATES} value={queenCells} onChange={setQueenCells} />
        </Field>

        {risk >= 2 && (
          <Card style={{ backgroundColor: theme.warningSoft, borderColor: 'transparent' }}>
            <Text variant="heading" style={{ color: theme.warning }}>
              Oğul riski yüksek
            </Text>
            <Text variant="body" style={{ marginTop: Spacing.xs }}>
              Bölme yapmayı, memeleri bozmayı ya da kovanı genişletmeyi değerlendirin. Kontrol
              aralığı otomatik olarak 7 güne çekildi.
            </Text>
          </Card>
        )}

        <Field label="Yem durumu">
          <ChipGroup options={STORE_LEVELS} value={stores} onChange={setStores} />
        </Field>

        <Field label="Sorunlar" hint="Gördüğünüz her belirtiyi işaretleyin.">
          <MultiChipGroup options={PROBLEMS} values={problems} onChange={setProblems} />
        </Field>

        <Field label="Yapılan işlemler">
          <MultiChipGroup options={ACTIONS} values={actions} onChange={setActions} />
        </Field>

        <Field label="Not">
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Serbest gözlem..."
            multiline
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
        </Field>

        <Card style={{ backgroundColor: theme.surfaceAlt, borderColor: 'transparent' }}>
          <Text variant="heading">Sonraki kontrol: {formatLong(nextCheck)}</Text>
          <Text variant="caption" color="textMuted" style={{ marginTop: Spacing.xs }}>
            Koloninin durumuna göre {interval} gün sonrası önerildi.
          </Text>
          <View style={{ marginTop: Spacing.md }}>
            <ToggleRow
              label="Görev listesine ekle"
              value={createTask}
              onChange={setCreateTask}
            />
          </View>
        </Card>

        <Button title="Muayeneyi kaydet" icon="checkmark" onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxl },
});
