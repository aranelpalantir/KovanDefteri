# Kovan Defteri

**Canlı:** https://kovan-defteri.pages.dev

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

### Geliştirme

```bash
npm install
npx expo start --lan
```

Telefonda **Expo Go** ile QR kodu okutun ya da `exp://<bilgisayar-ip>:8081` adresini
elle girin. Bilgisayarda birden çok ağ adaptörü varsa (VMware, VirtualBox, Hyper-V, VPN)
doğru olanı seçmeye dikkat edin — `npm run serve:web` çıktısı tüm adresleri listeler.

Tarayıcı önizlemesi için `npx expo start --web`.

> Expo SDK 57 Node.js **20.19.4+** ister. Bu makinede v20.11.1 kurulu; uygulama çalışıyor
> ancak Metro başlarken sürüm uyarısı veriyor. Sorun yaşarsanız Node LTS'i güncelleyin.

Uygulamayı boş görmek istemiyorsanız **Ayarlar → Örnek veri yükle** ile 5 kovanlık
gerçekçi bir sezon yükleyebilirsiniz.

### Web derlemesi (PWA)

```bash
npm run build:web
npm run serve:web
```

`build:web` statik derlemeyi `dist/` altına çıkarır ve `scripts/pwa-postbuild.js` ile
PWA başlık etiketlerini enjekte eder. `serve:web` bağımlılıksız bir statik sunucuyla
`dist/` klasörünü ağa açar (SPA fallback dahil).

Uygulama ana ekrana eklenebilir bir web uygulaması olarak paketlenmiştir:
`manifest.json`, maskable ikonlar, `apple-touch-icon`, tam ekran (`standalone`) mod ve
çevrimdışı önbellek için bir service worker.

**Önemli kısıt:** Service worker yalnızca **güvenli bağlamda** (https veya localhost)
kaydolur. Uygulamayı LAN üzerinden düz `http://192.168.x.x:8088` ile açarsanız ana
ekrana ekleme, ikon ve tam ekran mod çalışır ama **çevrimdışı açılmaz** — sayfa yine
sunucuya bağlanmak ister. Bu yüzden asıl dağıtım HTTPS üzerinden yapılıyor.

### Yayınlama (Cloudflare Pages)

```bash
npm run build:web
npx wrangler pages deploy dist --project-name=kovan-defteri --branch=main
```

`public/_redirects` SPA fallback'i, `public/_headers` önbellek politikasını belirler:
uygulama kabuğu ve service worker her zaman taze, hash'li paketler kalıcı önbellekte.

Wrangler 4.x Node 22+ ister; bu makinedeki Node 20.11.1 ile 3.114.17 sürümü kullanılıyor.

#### Neden iOS'ta ana ekrana eklemek önemli

Safari, 7 gün boyunca girilmeyen sitelerin `localStorage` verisini siler. Kovan
kayıtları tarayıcı sekmesinde tutulursa bir hafta sonra kaybolabilir. Ana ekrana
eklenen web uygulamaları bu kuralın dışındadır, o yüzden uygulamayı sekmede değil
ana ekrandan kullanın.

#### İkonlar

```bash
npm run icons
```

`scripts/make-icons.js` tüm ikonları (petek deseni) bağımlılık kullanmadan üretir:
RGBA tamponu doldurup `zlib` ile PNG kodlar, 3x supersampling ile kenarları yumuşatır.
Palet değişirse betikteki renkleri güncelleyip yeniden çalıştırmak yeterli.

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
public/                   web derlemesine olduğu gibi kopyalanan dosyalar
  manifest.json           PWA manifesti
  sw.js                   çevrimdışı önbellek service worker
  icons/                  PWA ve apple-touch ikonları
scripts/
  make-icons.js           ikon üreteci (bağımlılıksız PNG kodlayıcı)
  pwa-postbuild.js        dist/index.html'e PWA etiketlerini enjekte eder
  serve-dist.js           dist/ için statik sunucu (SPA fallback)
```

Veri tek bir JSON belgesi olarak `AsyncStorage` içinde `kovan-defteri/v1` anahtarında
tutulur. Her mutasyon sonrası diske yazılır; okuma tarafı `useStore()` üzerinden gider.

## Bilinen sınırlar

- Yedekleme JSON'u dışa aktarır ama içe aktarma ekranı henüz yok.
- Bildirim (push/yerel hatırlatma) yok; görevler uygulama içinde listelenir.
- Fotoğraf eki ve konum/harita desteği yok.
- Önbellek adı (`kovan-defteri-v1`) elle yönetiliyor. Yeni dağıtımlarda kabuk ağ-önce
  çekildiği ve paket adları hash'li olduğu için güncellemeler kendiliğinden geçer;
  ancak eski paketler önbellekte birikir. Temizlemek için `sw.js` içindeki `VERSION`
  değerini artırmak yeterli.
