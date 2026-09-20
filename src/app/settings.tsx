import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { buildDemoDatabase } from '@/lib/demo';
import { useStore } from '@/lib/store';
import { Radius, Spacing } from '@/theme/colors';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db, removeApiary, replaceAll, reset } = useStore();

  const exportData = async () => {
    const payload = JSON.stringify(db);
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(payload);
        Alert.alert('Kopyalandı', 'Yedek JSON panoya kopyalandı.');
        return;
      }
      await Share.share({ title: 'Kovan Defteri yedeği', message: payload });
    } catch {
      Alert.alert('Dışa aktarılamadı', 'Yedeği paylaşırken bir sorun oluştu.');
    }
  };

  const loadDemo = () =>
    confirm({
      title: 'Örnek veri yüklensin mi?',
      message: 'Mevcut tüm kayıtlarınızın yerine 5 kovanlık örnek bir sezon yüklenir.',
      confirmLabel: 'Yükle',
      onConfirm: () => replaceAll(buildDemoDatabase()),
    });

  const wipe = () =>
    confirm({
      title: 'Tüm veriler silinsin mi?',
      message: 'Bu işlem geri alınamaz.',
      confirmLabel: 'Hepsini sil',
      destructive: true,
      onConfirm: reset,
    });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <Section
        title={`Arılıklar (${db.apiaries.length})`}
        action={
          <Pressable onPress={() => router.push('/apiary/new')} hitSlop={8}>
            <Text variant="label" style={{ color: theme.primary }}>
              Ekle
            </Text>
          </Pressable>
        }>
        <Card padded={false}>
          {db.apiaries.length === 0 ? (
            <View style={{ padding: Spacing.lg }}>
              <Text variant="body" color="textMuted">
                Henüz arılık yok.
              </Text>
            </View>
          ) : (
            db.apiaries.map((a, i) => {
              const count = db.hives.filter((h) => h.apiaryId === a.id).length;
              return (
                <View
                  key={a.id}
                  style={[
                    styles.row,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                  ]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="heading">{a.name}</Text>
                    <Text variant="caption" color="textMuted">
                      {count} kovan{a.location ? ` · ${a.location}` : ''}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      confirm({
                        title: `${a.name} silinsin mi?`,
                        message: `Bu arılıktaki ${count} kovan ve tüm kayıtları da silinir.`,
                        confirmLabel: 'Sil',
                        destructive: true,
                        onConfirm: () => removeApiary(a.id),
                      })
                    }>
                    <Ionicons name="trash-outline" size={20} color={theme.danger} />
                  </Pressable>
                </View>
              );
            })
          )}
        </Card>
      </Section>

      <Section title="Veri">
        <View style={{ gap: Spacing.md }}>
          <Card>
            <Text variant="heading">
              {db.hives.length} kovan · {db.inspections.length} muayene · {db.harvests.length} hasat
            </Text>
            <Text variant="caption" color="textMuted" style={{ marginTop: Spacing.xs }}>
              Tüm kayıtlar yalnızca bu cihazda tutulur. İnternet bağlantısı gerekmez, hiçbir veri
              dışarı gönderilmez.
            </Text>
          </Card>
          <Button title="Yedeği dışa aktar" variant="secondary" icon="share-outline" onPress={exportData} />
          <Button title="Örnek veri yükle" variant="secondary" icon="flask-outline" onPress={loadDemo} />
          <Button title="Tüm verileri sil" variant="danger" icon="trash-outline" onPress={wipe} />
        </View>
      </Section>

      <Section title="Ana arı işaret renkleri">
        <Card>
          <Text variant="body" color="textMuted" style={{ marginBottom: Spacing.md }}>
            Uluslararası standart — yılın son hanesine göre:
          </Text>
          <View style={{ gap: Spacing.sm }}>
            {[
              { years: '1 ve 6', label: 'Beyaz', hex: '#E8E8E8' },
              { years: '2 ve 7', label: 'Sarı', hex: '#F2C230' },
              { years: '3 ve 8', label: 'Kırmızı', hex: '#CC3B32' },
              { years: '4 ve 9', label: 'Yeşil', hex: '#3A9D5D' },
              { years: '5 ve 0', label: 'Mavi', hex: '#2F6FD0' },
            ].map((r) => (
              <View key={r.label} style={styles.colorRow}>
                <View style={[styles.swatch, { backgroundColor: r.hex, borderColor: theme.border }]} />
                <Text variant="body" style={{ flex: 1 }}>
                  {r.label}
                </Text>
                <Text variant="caption" color="textMuted">
                  {r.years} ile biten yıllar
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </Section>

      <Text variant="caption" color="textMuted" center>
        Kovan Defteri · çevrimdışı arıcılık kaydı
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
