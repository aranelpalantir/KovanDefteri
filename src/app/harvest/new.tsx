import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chips';
import { DateField } from '@/components/ui/date-field';
import { Field, Input } from '@/components/ui/field';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/date';
import { useStore } from '@/lib/store';
import { PRODUCTS, type Product } from '@/lib/types';
import { Spacing } from '@/theme/colors';

export default function NewHarvestScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { hiveId } = useLocalSearchParams<{ hiveId: string }>();
  const { db, addHarvest } = useStore();

  const hive = db.hives.find((h) => h.id === hiveId);

  const [date, setDate] = useState(todayISO());
  const [product, setProduct] = useState<Product>('Bal');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const parsed = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed > 0;

  const save = () => {
    if (!hiveId || !valid) return;
    addHarvest({
      hiveId,
      date,
      product,
      amountKg: Math.round(parsed * 100) / 100,
      notes: notes.trim() || undefined,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: hive ? `Kovan ${hive.code} — Hasat` : 'Hasat' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Hasat tarihi">
          <DateField value={date} onChange={setDate} />
        </Field>

        <Field label="Ürün">
          <ChipGroup options={PRODUCTS} value={product} onChange={setProduct} />
        </Field>

        <Field label="Miktar (kg)" hint="Süzme sonrası net miktarı yazın.">
          <Input
            value={amount}
            onChangeText={setAmount}
            placeholder="12,5"
            keyboardType="decimal-pad"
            autoFocus
          />
        </Field>

        <Field label="Not">
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Çam balı, ikinci süzüm..."
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </Field>

        <View style={{ height: Spacing.sm }} />
        <Button title="Hasadı kaydet" icon="checkmark" onPress={save} disabled={!valid} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxl },
});
