import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { useStore } from '@/lib/store';
import { Radius, Spacing } from '@/theme/colors';

/**
 * Kayitlar okunamadiginda uygulamanin yerine bu ekran cikar.
 *
 * Amaci tek: kullaniciyi veriyi ezmekten alikoymak ve ham metni disari
 * cikarmasina imkan vermek. Uygulama bu haldeyken hicbir sey yazmiyor.
 */
export function RecoveryScreen() {
  const theme = useTheme();
  const { issue, startFresh } = useStore();

  if (!issue) return null;

  const saveRaw = async () => {
    if (!issue.raw) return;
    const name = `kovan-defteri-kurtarma-${Date.now()}.json`;

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([issue.raw], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      } catch {
        // Sessizce gec: asagida metin zaten ekranda.
      }
      return;
    }

    try {
      await Share.share({ title: name, message: issue.raw });
    } catch {
      // Paylasim acilamazsa metin ekranda duruyor.
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <View style={[styles.badge, { backgroundColor: theme.dangerSoft }]}>
        <Ionicons name="warning-outline" size={28} color={theme.danger} />
      </View>

      <Text variant="title" center>
        Kayıtlar okunamadı
      </Text>

      <Text variant="body" color="textMuted" center>
        {issue.message}
      </Text>

      <Card style={{ backgroundColor: theme.surfaceAlt, borderColor: 'transparent' }}>
        <Text variant="body">
          Uygulama şu an hiçbir şey yazmıyor. Kayıtlarınız cihazda duruyor ve bu ekranda
          kaldığınız sürece üzerine yazılmayacak.
        </Text>
      </Card>

      {issue.raw ? (
        <>
          <Button
            title="Ham veriyi dosya olarak al"
            icon="download-outline"
            variant="secondary"
            onPress={saveRaw}
          />
          <Text variant="caption" color="textMuted">
            Önce bunu yapın. Dosya elinizde olursa kayıtlar kurtarılabilir — elle düzeltilip
            Ayarlar → Yedekten geri yükle ile okutulabilir.
          </Text>

          <Card padded={false}>
            <ScrollView style={styles.rawBox} horizontal={false}>
              <Text variant="mono" color="textMuted" style={{ padding: Spacing.md }}>
                {issue.raw.slice(0, 4000)}
                {issue.raw.length > 4000 ? '\n…' : ''}
              </Text>
            </ScrollView>
          </Card>
        </>
      ) : (
        <Text variant="body" color="textMuted">
          Cihaz deposuna erişilemediği için ham veri gösterilemiyor.
        </Text>
      )}

      <View style={{ height: Spacing.md }} />

      <Button
        title="Sıfırdan başla"
        variant="danger"
        icon="trash-outline"
        onPress={() =>
          confirm({
            title: 'Mevcut kayıtlar silinsin mi?',
            message:
              'Okunamayan belge silinir ve boş bir defterle başlarsınız. Önce ham veriyi aldığınızdan emin olun — bu işlem geri alınamaz.',
            confirmLabel: 'Sil ve başla',
            destructive: true,
            onConfirm: startFresh,
          })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  rawBox: { maxHeight: 220, borderRadius: Radius.lg },
});
