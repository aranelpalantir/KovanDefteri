import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { Section } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { exportBackup, parseBackup, pickBackupFile } from '@/lib/backup';
import { BUILD_COMMIT, BUILD_DATE, BUILD_TIME, VERSION_LABEL } from '@/lib/build-info';
import { daysSince, formatLong, relativeDays } from '@/lib/date';
import { confirm } from '@/lib/confirm';
import { buildDemoDatabase } from '@/lib/demo';
import { useStore } from '@/lib/store';
import { useAppUpdates } from '@/lib/updates';
import type { Database } from '@/lib/types';
import { Radius, Spacing } from '@/theme/colors';

type Notice = { tone: 'ok' | 'error' | 'info'; text: string } | null;

type Pending = { db: Database; summary: string; exportedAt?: string } | null;

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { db, removeApiary, replaceAll, reset, markBackupTaken } = useStore();
  const updates = useAppUpdates();

  const [notice, setNotice] = useState<Notice>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');

  const recordCount =
    db.apiaries.length + db.hives.length + db.inspections.length + db.harvests.length;

  const backup = backupFreshness();

  /**
   * Yedegin ne kadar bayat oldugunu soyler. Kayit yoksa uyarmaya gerek yok;
   * kayit varken hic yedek alinmamissa bu en riskli durum.
   */
  function backupFreshness(): {
    text: string;
    hint?: string;
    color: string;
    icon: 'shield-checkmark-outline' | 'alert-circle-outline' | 'time-outline' | 'information-circle-outline';
  } {
    if (recordCount === 0) {
      return {
        text: 'Yedeklenecek kayıt yok',
        color: theme.textMuted,
        icon: 'information-circle-outline',
      };
    }
    if (!db.lastBackupAt) {
      return {
        text: 'Hiç yedek alınmadı',
        hint: 'Telefonu kaybederseniz bu kayıtların kopyası hiçbir yerde yok.',
        color: theme.danger,
        icon: 'alert-circle-outline',
      };
    }
    const day = db.lastBackupAt.slice(0, 10);
    const gap = daysSince(day);
    if (gap > 21) {
      return {
        text: `Son yedek ${gap} gün önce`,
        hint: `${formatLong(day)} tarihinden beri yedek alınmadı.`,
        color: theme.danger,
        icon: 'alert-circle-outline',
      };
    }
    if (gap > 7) {
      return {
        text: `Son yedek ${gap} gün önce`,
        hint: 'Arılığa her gidişten sonra yedek almanız önerilir.',
        color: theme.warning,
        icon: 'time-outline',
      };
    }
    return {
      text: `Son yedek ${relativeDays(day)}`,
      hint: formatLong(day),
      color: theme.success,
      icon: 'shield-checkmark-outline',
    };
  }

  const doExport = async () => {
    setNotice(null);
    if (recordCount === 0) {
      setNotice({ tone: 'info', text: 'Yedeklenecek kayıt yok.' });
      return;
    }
    const result = await exportBackup(db);
    if (result.ok) markBackupTaken();
    setNotice(
      result.ok
        ? {
            tone: 'ok',
            text:
              result.how === 'download'
                ? 'Yedek dosyası indirildi. iPhone’da Dosyalar uygulamasında, İndirilenler klasöründe.'
                : 'Yedek paylaşıma açıldı.',
          }
        : { tone: 'error', text: result.error },
    );
  };

  const loadText = (raw: string) => {
    const parsed = parseBackup(raw);
    if (!parsed.ok) {
      setNotice({ tone: 'error', text: parsed.error });
      setPending(null);
      return;
    }
    setNotice(null);
    setPending({ db: parsed.db, summary: parsed.summary, exportedAt: parsed.exportedAt });
  };

  const doPickFile = async () => {
    setNotice(null);
    const raw = await pickBackupFile();
    if (raw === null) return;
    loadText(raw);
  };

  const applyPending = () => {
    if (!pending) return;
    replaceAll(pending.db);
    setPending(null);
    setPasted('');
    setPasteOpen(false);
    setNotice({ tone: 'ok', text: 'Yedek geri yüklendi.' });
  };

  const loadDemo = () =>
    confirm({
      title: 'Örnek veri yüklensin mi?',
      message: 'Mevcut tüm kayıtlarınızın yerine 5 kovanlık örnek bir sezon yüklenir.',
      confirmLabel: 'Yükle',
      onConfirm: () => {
        replaceAll(buildDemoDatabase());
        setNotice({ tone: 'ok', text: 'Örnek veri yüklendi.' });
      },
    });

  const wipe = () =>
    confirm({
      title: 'Tüm veriler silinsin mi?',
      message: 'Bu işlem geri alınamaz. Önce yedek almanız önerilir.',
      confirmLabel: 'Hepsini sil',
      destructive: true,
      onConfirm: () => {
        reset();
        setNotice({ tone: 'ok', text: 'Tüm kayıtlar silindi.' });
      },
    });

  const noticeColor =
    notice?.tone === 'ok' ? theme.success : notice?.tone === 'error' ? theme.danger : theme.info;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {notice && (
        <Card style={{ borderColor: noticeColor }}>
          <Text variant="body" style={{ color: noticeColor }}>
            {notice.text}
          </Text>
        </Card>
      )}

      {updates.updateReady && (
        <Card style={{ backgroundColor: theme.primarySoft, borderColor: 'transparent' }}>
          <Text variant="heading" style={{ color: theme.primary }}>
            Yeni sürüm hazır
          </Text>
          <Text variant="body" style={{ marginTop: Spacing.xs, marginBottom: Spacing.md }}>
            İndirildi ve kurulmayı bekliyor. Kayıtlarınız etkilenmez.
          </Text>
          <Button
            title={updates.applying ? 'Güncelleniyor…' : 'Şimdi güncelle'}
            icon="refresh"
            loading={updates.applying}
            onPress={updates.applyUpdate}
          />
        </Card>
      )}

      <Section title="Yedekleme">
        <View style={{ gap: Spacing.md }}>
          <Card accent={backup.color}>
            <Text variant="heading">{recordCount} kayıt</Text>
            <Text variant="caption" color="textMuted" style={{ marginTop: Spacing.xs }}>
              {db.hives.length} kovan · {db.inspections.length} muayene · {db.harvests.length} hasat
            </Text>

            <View style={[styles.backupRow, { borderTopColor: theme.border }]}>
              <Ionicons name={backup.icon} size={16} color={backup.color} />
              <Text variant="label" style={{ color: backup.color, flex: 1 }}>
                {backup.text}
              </Text>
            </View>
            {backup.hint ? (
              <Text variant="caption" color="textMuted">
                {backup.hint}
              </Text>
            ) : null}

            <Text variant="caption" color="textMuted" style={{ marginTop: Spacing.md }}>
              Kayıtlar yalnızca bu cihazda. Buluta gönderilmiyor, otomatik yedeklenmiyor — yedek
              almak size bağlı.
            </Text>
          </Card>

          <Button title="Yedek dosyası indir" variant="secondary" icon="download-outline" onPress={doExport} />

          {Platform.OS === 'web' && (
            <Button
              title="Yedekten geri yükle"
              variant="secondary"
              icon="folder-open-outline"
              onPress={doPickFile}
            />
          )}

          <Pressable onPress={() => setPasteOpen((v) => !v)} hitSlop={8}>
            <Text variant="label" style={{ color: theme.primary }}>
              {pasteOpen ? 'Metin yapıştırmayı kapat' : 'Dosya seçemiyorsanız: metin yapıştır'}
            </Text>
          </Pressable>

          {pasteOpen && (
            <View style={{ gap: Spacing.sm }}>
              <Input
                value={pasted}
                onChangeText={setPasted}
                placeholder="Yedek JSON içeriğini buraya yapıştırın"
                multiline
                style={{ minHeight: 120, textAlignVertical: 'top' }}
              />
              <Button
                title="Yapıştırılanı oku"
                variant="secondary"
                icon="clipboard-outline"
                onPress={() => loadText(pasted)}
                disabled={pasted.trim().length === 0}
              />
            </View>
          )}

          {pending && (
            <Card style={{ borderColor: theme.warning }}>
              <Text variant="heading">Yedek okundu</Text>
              <Text variant="body" color="textMuted" style={{ marginTop: Spacing.xs }}>
                {pending.summary}
                {pending.exportedAt
                  ? `\nAlındığı tarih: ${new Date(pending.exportedAt).toLocaleString('tr-TR')}`
                  : ''}
              </Text>
              <Text variant="body" style={{ marginTop: Spacing.md, color: theme.warning }}>
                Bu yedek mevcut {recordCount} kaydın yerine geçecek. Birleştirme yapılmaz.
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Button title="Vazgeç" variant="secondary" onPress={() => setPending(null)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Geri yükle" icon="checkmark" onPress={applyPending} />
                </View>
              </View>
            </Card>
          )}
        </View>
      </Section>

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
                    accessibilityLabel={`${a.name} arılığını sil`}
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

      <Section title="Uygulama">
        <Card>
          <View style={styles.versionRow}>
            <Text variant="body" color="textMuted">
              Sürüm
            </Text>
            <Text variant="label">{BUILD_DATE}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text variant="body" color="textMuted">
              Derleme
            </Text>
            <Text variant="mono" color="textMuted">
              {BUILD_TIME} · {BUILD_COMMIT}
            </Text>
          </View>

          {updates.supported ? (
            <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
              <Button
                title={updates.checking ? 'Bakılıyor…' : 'Güncelleme denetle'}
                variant="secondary"
                icon="refresh-outline"
                loading={updates.checking}
                onPress={updates.checkNow}
              />
              <Text variant="caption" color="textMuted">
                {updates.updateReady
                  ? 'Yeni sürüm indirildi, yukarıdan uygulayabilirsiniz.'
                  : updates.lastChecked
                    ? `Son bakılan: ${updates.lastChecked.toLocaleTimeString('tr-TR')} — bu en güncel sürüm.`
                    : 'İnternete bağlandığınızda güncellemeler kendiliğinden inip burada bildirilir.'}
              </Text>
            </View>
          ) : (
            <Text variant="caption" color="textMuted" style={{ marginTop: Spacing.md }}>
              Çevrimdışı güncelleme yalnızca ana ekrana eklenmiş web sürümünde çalışır.
            </Text>
          )}
        </Card>
      </Section>

      <Section title="Veri">
        <View style={{ gap: Spacing.md }}>
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
        Kovan Defteri · {VERSION_LABEL}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  versionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  backupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xs,
  },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
