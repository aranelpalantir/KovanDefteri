import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { Spacing } from '@/theme/colors';

export default function NewApiaryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { addApiary } = useStore();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addApiary({ name: trimmed, location: location.trim() || undefined, notes: notes.trim() || undefined });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="body" color="textMuted">
          Arılık, kovanlarınızın durduğu yer. Gezginci arıcılık yapıyorsanız her konak için ayrı
          arılık açabilirsiniz.
        </Text>

        <Field label="Arılık adı">
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Örn. Çam ormanı mevkii"
            autoFocus
            returnKeyType="next"
          />
        </Field>

        <Field label="Konum" hint="Köy, mevki ya da koordinat — serbest metin.">
          <Input value={location} onChangeText={setLocation} placeholder="Örn. Marmaris / Osmaniye köyü" />
        </Field>

        <Field label="Not">
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Flora, su durumu, yol tarifi..."
            multiline
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
        </Field>

        <View style={{ height: Spacing.sm }} />
        <Button title="Arılığı kaydet" icon="checkmark" onPress={save} disabled={!name.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
});
