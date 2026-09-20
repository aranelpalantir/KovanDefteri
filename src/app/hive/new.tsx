import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chips';
import { DateField } from '@/components/ui/date-field';
import { Field, Input } from '@/components/ui/field';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { queenMark } from '@/lib/beekeeping';
import { todayISO } from '@/lib/date';
import { useStore } from '@/lib/store';
import {
  BREEDS,
  HIVE_STATUSES,
  HIVE_TYPES,
  type Breed,
  type HiveStatus,
  type HiveType,
} from '@/lib/types';
import { Spacing } from '@/theme/colors';

const CURRENT_YEAR = new Date().getFullYear();
const QUEEN_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3].map(String);

export default function HiveFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { apiaryId, edit } = useLocalSearchParams<{ apiaryId?: string; edit?: string }>();
  const { db, addHive, updateHive } = useStore();

  const existing = edit ? db.hives.find((h) => h.id === edit) : undefined;
  const targetApiary = existing?.apiaryId ?? apiaryId ?? db.apiaries[0]?.id;

  const [code, setCode] = useState(existing?.code ?? suggestNextCode(db.hives.map((h) => h.code)));
  const [type, setType] = useState<HiveType>(existing?.type ?? 'Langstroth');
  const [breed, setBreed] = useState<Breed>(existing?.breed ?? 'Anadolu');
  const [queenYear, setQueenYear] = useState(String(existing?.queenYear ?? CURRENT_YEAR));
  const [status, setStatus] = useState<HiveStatus>(existing?.status ?? 'aktif');
  const [startedAt, setStartedAt] = useState(existing?.startedAt ?? todayISO());
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const mark = queenMark(Number(queenYear));

  const save = () => {
    const trimmed = code.trim();
    if (!trimmed || !targetApiary) return;
    const payload = {
      apiaryId: targetApiary,
      code: trimmed,
      type,
      breed,
      queenYear: Number(queenYear),
      status,
      startedAt,
      notes: notes.trim() || undefined,
    };
    if (existing) updateHive(existing.id, payload);
    else addHive(payload);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: existing ? 'Kovanı Düzenle' : 'Yeni Kovan' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Kovan numarası" hint="Kovanın üzerindeki etiket. Listelerde bu görünür.">
          <Input value={code} onChangeText={setCode} placeholder="12" maxLength={6} />
        </Field>

        <Field label="Kovan tipi">
          <ChipGroup options={HIVE_TYPES} value={type} onChange={setType} />
        </Field>

        <Field label="Ana arı ırkı">
          <ChipGroup options={BREEDS} value={breed} onChange={setBreed} />
        </Field>

        <Field
          label="Ana arı yılı"
          hint={`Uluslararası işaret rengi: ${mark.label}. Ananın yaşı ve yenileme uyarısı bu yıldan hesaplanır.`}>
          <ChipGroup options={QUEEN_YEARS} value={queenYear} onChange={setQueenYear} />
          <View style={[styles.markPreview, { backgroundColor: mark.hex, borderColor: theme.border }]}>
            <Text
              variant="label"
              style={{ color: mark.label === 'Beyaz' || mark.label === 'Sarı' ? '#2A2118' : '#FFFFFF' }}>
              {mark.label} işaret
            </Text>
          </View>
        </Field>

        <Field label="Durum">
          <ChipGroup options={HIVE_STATUSES} value={status} onChange={setStatus} />
        </Field>

        <Field label="Kuruluş tarihi">
          <DateField value={startedAt} onChange={setStartedAt} />
        </Field>

        <Field label="Not">
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Kovanın geçmişi, özel durumlar..."
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </Field>

        <View style={{ height: Spacing.sm }} />
        <Button
          title={existing ? 'Değişiklikleri kaydet' : 'Kovanı kaydet'}
          icon="checkmark"
          onPress={save}
          disabled={!code.trim()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Mevcut sayısal kodların en büyüğünün bir fazlası. */
function suggestNextCode(codes: string[]): string {
  const numbers = codes.map((c) => Number(c)).filter((n) => Number.isFinite(n));
  if (numbers.length === 0) return '1';
  return String(Math.max(...numbers) + 1);
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxl },
  markPreview: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
});
