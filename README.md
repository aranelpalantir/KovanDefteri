# Kovan Defteri

Arıcılar için çevrimdışı kovan muayene ve üretim takibi. Kağıt defterin yerini alır:
her kovanın muayene geçmişini, ana arı durumunu, oğul riskini, yem seviyesini ve hasadını
tek yerde tutar. İnternet bağlantısı gerekmez; hiçbir veri cihazdan çıkmaz.

## Ne yapar

- **Arılık → kovan → muayene** hiyerarşisi. Gezginci arıcılık için birden çok arılık.
- **Muayene formu** tek ekranda: koloni gücü, huy, ana/yumurta durumu, çerçeve sayıları,
  ana arı memesi, yem seviyesi, sorunlar (varroa, kireç hastalığı, yavru çürüklüğü…) ve
  yapılan işlemler.
- **Türetilmiş uyarılar** — uygulama kayıtları okuyup kendisi yorumluyor:
  - *Oğul riski*: kapalı/açık meme + yüksek güç + dolu ballık kombinasyonu.
  - *Analık şüphesi*: ne ana ne yumurta görüldüyse.
  - *Bakım gecikmesi*: 14 günü aşan aralıklarda sarı, 21 günü aşınca kırmızı.
  - *Ana yenileme*: ana arı 3 yaşını geçtiğinde.
- **Uyarlanabilir kontrol aralığı**: memeli kovanda 7 gün, güçlü kovanda 10, diğerlerinde 14.
  Sonraki kontrol otomatik görev olarak listeye düşer.
- **Ana arı işaret rengi** uluslararası standarda göre yıldan hesaplanır (1/6 beyaz,
  2/7 sarı, 3/8 kırmızı, 4/9 yeşil, 5/0 mavi) ve kovan kartında kart rengi olur.
- **Sezon özeti**: aylık bal hasadı grafiği, kovan verimlilik sıralaması, koloni durum
  dağılımı, acil ilgi isteyen kovanlar.
- **Mevsim ipucu**: içinde bulunulan aya göre ne yapılması gerektiğini hatırlatır.

## Çalıştırma

```bash
npm install
npx expo start
```

Telefonda **Expo Go** ile QR kodu okutun. Web önizlemesi için `npx expo start --web`.

> Expo SDK 57 Node.js **20.19.4+** ister. Bu makinede v20.11.1 kurulu; uygulama çalışıyor
> ancak Metro başlarken sürüm uyarısı veriyor. Sorun yaşarsanız Node LTS'i güncelleyin.

Uygulamayı boş görmek istemiyorsanız **Ayarlar → Örnek veri yükle** ile 5 kovanlık
gerçekçi bir sezon yükleyebilirsiniz.

## Mimari

```
src/
  app/                    expo-router rotaları
    (tabs)/               Kovanlar · Görevler · Özet
    hive/[id].tsx         kovan detayı ve muayene geçmişi
    hive/new.tsx          kovan ekle/düzenle
    inspection/new.tsx    muayene formu
    harvest/new.tsx       hasat kaydı
    apiary/new.tsx        arılık ekle
    settings.tsx          arılık yönetimi, yedek, örnek veri
  components/             ekranlara özel kartlar + ui/ altında tasarım sistemi
  lib/
    types.ts              veri modeli ve sabit listeler
    beekeeping.ts         alan bilgisi: uyarılar, oğul riski, ana arı rengi, trend
    date.ts               ISO tarih yardımcıları ve Türkçe biçimlendirme
    store.tsx             React context tabanlı veri deposu
    storage.ts            AsyncStorage kalıcılığı
    demo.ts               örnek sezon üreteci
    confirm.ts            platformlar arası onay kutusu
  theme/colors.ts         bal temalı açık/koyu palet
```

Veri tek bir JSON belgesi olarak `AsyncStorage` içinde `kovan-defteri/v1` anahtarında
tutulur. Her mutasyon sonrası diske yazılır; okuma tarafı `useStore()` üzerinden gider.

## Bilinen sınırlar

- Yedekleme JSON'u dışa aktarır ama içe aktarma ekranı henüz yok.
- Bildirim (push/yerel hatırlatma) yok; görevler uygulama içinde listelenir.
- Fotoğraf eki ve konum/harita desteği yok.
