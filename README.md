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

#### Cloudflare Pages tuzağı: `node_modules`

Pages, **adı `node_modules` olan klasörleri yüklemiyor.** Expo ise varlıkları kaynak
ağacındaki yollarına göre yazıyor, yani ikon fontu `dist/assets/node_modules/@expo/...`
altında kalıyor ve hiç yayına çıkmıyor. Sonuç: uygulamada simge yerine boş kutular.
`_redirects` içindeki `/*` kuralı 404'ü 200 + HTML'e çevirdiği için hata da sessiz
kalıyor — font isteği `text/html` dönüyor ve kimse fark etmiyor.

`scripts/pwa-postbuild.js` bunu iki adımda çözer:

1. `assets/node_modules/` → `assets/vendor/` taşır, pakettteki referansları düzeltir.
2. **Değiştirdiği dosyanın adını yeniler.** Expo dosya adındaki hash'i içerikten
   üretiyor ve bu dosyalar `immutable` servis ediliyor; içeriği hash'lendikten sonra
   değiştirirsek URL sabit kalır ve CDN, tarayıcı ya da service worker eski kopyayı
   süresiz servis edebilir. Betik yeni içeriğin hash'ini hesaplayıp dosyayı yeniden
   adlandırır ve `index.html`'deki atfı günceller.

Derleme, `dist` içinde hiç `.ttf` kalmazsa ya da `node_modules` içeren bir yol
kalırsa hata verip durur — bu sessiz kırılmaya karşı asıl güvenlik ağı budur.

Wrangler 4.x Node 22+ ister; bu makinedeki Node 20.11.1 ile 3.114.17 sürümü kullanılıyor.

### Güncellemeler

Her derleme `scripts/build-info.js` ile damgalanır (tarih, saat, git hash). Damga hem
Ayarlar → Uygulama bölümünde görünür hem de service worker önbellek adına girer, yani
her yayın kendi önbelleğini alır ve eskiler `activate` sırasında silinir.

**Kullanıcının yapması gereken bir şey yok.** Uygulama çevrimiçi her açılışta kendini
tazeler: gezinme isteği önce ağa gider, gelen yeni `index.html` önbelleğe yazılır, onun
gösterdiği yeni paket önbellekte olmadığı için ağdan çekilip önbelleğe yazılır. Çevrimdışı
kopya da böylece güncellenmiş olur.

Geriye kalan tek fark service worker'ın **kendi** kodudur (önbellekleme mantığı, ağ zaman
aşımı gibi). O da bekleyen worker'ın devralmasıyla gelir ve kendiliğinden olur: uygulama
tamamen kapatılıp açıldığında eski worker'ı kullanan istemci kalmaz, bekleyen etkinleşir.

Bu ölçülerek doğrulandı — eski worker aktifken, onun önbelleğinde yeni kabuk ve yeni
paket bulundu. Bu yüzden erken sürümlerdeki "yeni sürüm hazır / şimdi güncelle" akışı
kaldırıldı: kullanıcıya yapması gerekmeyen bir iş gösteriyordu.

### Çevrimdışı hazırlık

Ayarlar → Çevrimdışı hazırlık, arıcının asıl sorusunu yanıtlar: *şimdi sinyalim kesilse
bu uygulama açılır mı?*

`src/lib/offline.ts` uygulamanın açılması için gereken dosyaları (kabuk, çalışan paket,
ikon fontu) **çalışma anında belgeden toplar** — paket adı her derlemede değiştiği ve font
yolu pakete gömülü olduğu için sabit bir liste bir sonraki derlemede yanlış olurdu.
Ardından her birinin önbellekte olup olmadığına bakar.

İlk ziyarette sayfa, service worker kontrolü almadan yüklenir; istekleri ondan geçmediği
için paket ve font önbelleğe girmez. Bu durumda uygulama, kullanıcı o an internetteyse
eksiği bir kez kendiliğinden tamamlar (`sw.js` içindeki `REFRESH_CACHE` mesajı ile;
service worker'ın içindeki `fetch` kendi dinleyicisine takılmadığı için gerçekten ağa
gidilir). Elle "Çevrimdışı kopyayı tazele" düğmesi, arılığa çıkmadan emin olmak
isteyenler için durur.

### Yedekleme

Ayarlar → Yedekleme:

- **Yedek dosyası indir** — web'de gerçek bir `.json` dosyası indirir
  (`kovan-defteri-YYYY-AA-GG.json`), native'de paylaşım sayfası açar.
- **Yedekten geri yükle** — dosya seçtirir. Dosya seçilemeyen ortamlar için
  metin yapıştırma seçeneği de var.

Geri yükleme iki aşamalı: dosya önce doğrulanır ve içeriğinin özeti
(kaç arılık/kovan/muayene, alındığı tarih) gösterilir; kullanıcı onaylayana kadar
hiçbir şey yazılmaz. **Bozuk bir dosya mevcut kayıtların üzerine yazmaz.** Geri
yükleme birleştirme değil, yerine koymadır ve bu ekranda açıkça yazar.

Eski sürümün düz veritabanı JSON'u da kabul edilir, sarmalanmış yeni biçim de.

### Verilerin silinebileceği durumlar

Kayıtlar `localStorage`'da, yalnızca cihazda. Bilinen kayıp senaryoları:

| Durum | Sonuç |
|---|---|
| Safari → Geçmişi ve Web Sitesi Verilerini Sil | **Silinir** |
| Safari → Gelişmiş → Web Sitesi Verileri → siteyi sil | **Silinir** |
| Ana ekran ikonunu silmek | **Silinir** |
| Tarayıcı sekmesinde 7 gün girilmemek (ITP) | Sekmede silinir; ana ekrana eklenmiş uygulamada silinmez |
| Cihaz depolaması kritik seviyeye düşmek | Silinebilir |
| Uygulama güncellemesi | Silinmez — güncelleme yalnızca kodu değiştirir |
| Telefonu kaybetmek / sıfırlamak | **Silinir**, iCloud yedeğinde olduğuna güvenilmemeli |

Kısacası: düzenli olarak yedek dosyası indirin ve telefonun dışında bir yerde tutun.

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

### Şema göçü

`src/lib/migrate.ts` sürümlü bir göç zinciri tutar. Yeni bir kırıcı değişiklik için:

1. `SCHEMA_VERSION`'ı artırın.
2. `MIGRATIONS` listesine `{ to, describe, migrate }` ekleyin.
3. `scripts/migrations.test.ts` içine eski bir belgeyle test ekleyin.

Dosya çalışma zamanında hiçbir şey import etmez (yalnızca tip), bu yüzden Node onu
doğrudan çalıştırabiliyor:

```bash
npm run test:migrations
```

Davranış kuralları:

| Durum | Sonuç |
|---|---|
| Sürüm bilgisi yok | v1 sayılır |
| Eksik diziler | Boş dizi ile tamamlanır |
| Belge uygulamadan **yeni** | **Reddedilir** — eski kod yeni alanları anlamaz, üzerine yazarsa veri gider |
| Göç hata verir | Hiçbir şey yazılmaz |
| Bozuk JSON | Reddedilir |

### Okunamayan veri

`loadDatabase()` eskiden bozuk JSON'da boş veritabanı dönüyordu; ardından ilk kayıtta
orijinalin üzerine yazılıyordu. Artık hata yukarı bildiriliyor ve uygulama **kilitleniyor**:
hiçbir mutasyon kabul edilmiyor, diske yazılmıyor ve uygulamanın yerine
`src/components/recovery-screen.tsx` çıkıyor. Ham metin ekranda gösteriliyor, dosya olarak
alınabiliyor; "sıfırdan başla" ayrı ve onaylı bir seçim.

## Bilinen sınırlar

- Bildirim (push/yerel hatırlatma) yok; görevler uygulama içinde listelenir.
- Yedekleme elle; otomatik ya da buluta senkron yedek yok.
- Geri yükleme birleştirme yapmaz, yerine koyar.
- Fotoğraf eki ve konum/harita desteği yok.
- Önbellek adı (`kovan-defteri-v1`) elle yönetiliyor. Yeni dağıtımlarda kabuk ağ-önce
  çekildiği ve paket adları hash'li olduğu için güncellemeler kendiliğinden geçer;
  ancak eski paketler önbellekte birikir. Temizlemek için `sw.js` içindeki `VERSION`
  değerini artırmak yeterli.
