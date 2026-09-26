/**
 * `expo export --platform web` ciktisini yayina hazirlar.
 *
 * Iki is yapar:
 *
 * 1. assets/node_modules -> assets/vendor yeniden adlandirmasi.
 *    Cloudflare Pages "node_modules" adli klasorleri yuklemiyor; Expo ise
 *    varliklari kaynak agacindaki yollarina gore yaziyor, yani ikon fontu
 *    assets/node_modules/@expo/vector-icons/... altinda kaliyor ve hic
 *    yayina cikmiyor. Klasoru yeniden adlandirip paketteki referanslari
 *    guncelliyoruz.
 *
 * 2. dist/index.html'e PWA baslik etiketlerini enjekte eder.
 *    web.output "single" oldugunda Expo Router `+html.tsx` kullanmiyor,
 *    index.html'i kendi sablonundan uretiyor ve mudahale kancasi yok.
 *
 * Betik idempotent: ayni dist uzerinde birden cok kez calistirilabilir.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html yok. Once: npx expo export --platform web');
  process.exit(1);
}

// ---------------------------------------------------------------- 1) varliklar

const OLD_SEGMENT = 'assets/node_modules/';
const NEW_SEGMENT = 'assets/vendor/';

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function relocateVendorAssets() {
  const from = path.join(distDir, 'assets', 'node_modules');
  const to = path.join(distDir, 'assets', 'vendor');

  if (fs.existsSync(from)) {
    if (fs.existsSync(to)) fs.rmSync(to, { recursive: true, force: true });
    try {
      fs.renameSync(from, to);
    } catch (err) {
      // Windows'ta klasoru acik tutan bir surec varsa (ornegin dist'i servis
      // eden bir sunucu) rename EPERM verir; kopyalayip silmek daha dayanikli.
      if (err.code !== 'EPERM' && err.code !== 'EBUSY') throw err;
      fs.cpSync(from, to, { recursive: true });
      fs.rmSync(from, { recursive: true, force: true });
    }
    console.log('assets/node_modules -> assets/vendor tasindi');
  }

  // Referanslari her durumda tara: yeniden adlandirma onceki calistirmada
  // yapilmis olabilir ama yeni bir paket eski yolu tasiyor olabilir.
  let rewritten = 0;
  const renames = new Map();
  const textFiles = walk(distDir).filter((f) => /\.(js|html|json|map|css)$/i.test(f));

  for (const file of textFiles) {
    const before = fs.readFileSync(file, 'utf8');
    if (!before.includes(OLD_SEGMENT)) continue;
    const after = before.split(OLD_SEGMENT).join(NEW_SEGMENT);
    fs.writeFileSync(file, after);
    rewritten += before.split(OLD_SEGMENT).length - 1;
    console.log(`  referanslar guncellendi: ${path.relative(distDir, file)}`);

    // Expo dosya adindaki hash'i ICERIKTEN uretiyor ve bu dosyalari
    // "immutable" olarak servis ediyoruz. Icerigi hash'lendikten sonra
    // degistirirsek URL ayni kalir ve CDN/tarayici/service worker eski
    // kopyayi sonsuza dek servis edebilir. Bu yuzden adi da yeniliyoruz.
    const base = path.basename(file);
    const m = base.match(/^(.*)-([0-9a-f]{8,64})(\.[a-z]+)$/i);
    if (!m) continue;
    const fresh = crypto.createHash('md5').update(after).digest('hex').slice(0, m[2].length);
    if (fresh === m[2]) continue;
    const newBase = `${m[1]}-${fresh}${m[3]}`;
    fs.renameSync(file, path.join(path.dirname(file), newBase));
    renames.set(base, newBase);
    console.log(`  yeniden adlandirildi: ${base} -> ${newBase}`);
  }

  // Adi degisen dosyalara yapilan tum atiflari guncelle (index.html dahil).
  if (renames.size > 0) {
    for (const file of walk(distDir).filter((f) => /\.(js|html|json|map|css)$/i.test(f))) {
      let text = fs.readFileSync(file, 'utf8');
      let touched = false;
      for (const [from, to] of renames) {
        if (text.includes(from)) {
          text = text.split(from).join(to);
          touched = true;
        }
      }
      if (touched) {
        fs.writeFileSync(file, text);
        console.log(`  atiflar guncellendi: ${path.relative(distDir, file)}`);
      }
    }
  }

  if (rewritten > 0) console.log(`toplam ${rewritten} referans yeniden yazildi`);

  // Yayina cikmasi imkansiz bir yol kalmadigini dogrula.
  const leftovers = walk(distDir).filter((f) => f.split(path.sep).includes('node_modules'));
  if (leftovers.length > 0) {
    console.error('HATA: hala node_modules iceren yollar var:');
    leftovers.forEach((f) => console.error('  ' + path.relative(distDir, f)));
    process.exit(1);
  }
}

// ------------------------------------------------------------------ 2) baslik

const MARKER = '<!-- kovan-pwa -->';

const headTags = `${MARKER}
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Kovan Defteri" />
    <meta name="format-detection" content="telephone=no" />
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#FFFBF3" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#14110C" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
    <style id="kovan-shell">
      :root { --kovan-bg: #FFFBF3; }
      @media (prefers-color-scheme: dark) { :root { --kovan-bg: #14110C; } }
      html, body { background-color: var(--kovan-bg); }
      body { overscroll-behavior-y: none; -webkit-tap-highlight-color: transparent; }
    </style>
    <script id="kovan-sw">
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').then(function (reg) {
            reg.update();
          }).catch(function () {});
        });
      }
    </script>`;

function injectHead() {
  let html = fs.readFileSync(indexPath, 'utf8');

  if (html.includes(MARKER)) {
    console.log('index.html zaten islenmis, baslik enjeksiyonu atlandi');
    return;
  }

  const before = html;

  html = html.replace(
    /<meta name="viewport"[^>]*>/i,
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />',
  );
  html = html.replace(/\s*<meta name="theme-color" content="[^"]*"\s*\/?>/i, '');
  html = html.replace('</head>', `${headTags}\n  </head>`);

  if (html === before) {
    console.error('index.html beklenen yapida degil, hicbir sey degismedi.');
    process.exit(1);
  }

  fs.writeFileSync(indexPath, html);
  console.log('index.html PWA etiketleriyle guncellendi');
}

// ------------------------------------------------------------------ 3) kontrol

function verify() {
  const required = [
    'manifest.json',
    'sw.js',
    '_redirects',
    '_headers',
    'icons/apple-touch-icon.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
  ];
  const missing = required.filter((f) => !fs.existsSync(path.join(distDir, f)));
  if (missing.length > 0) {
    console.error(`dist icinde eksik dosyalar: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Ikon fontu gercekten orada mi? Bu kirilirsa uygulamada simge yerine
  // bos kutular cikiyor ve /* fallback kurali 404'u gizledigi icin
  // hata fark edilmiyor.
  const fonts = walk(distDir).filter((f) => f.toLowerCase().endsWith('.ttf'));
  if (fonts.length === 0) {
    console.error('HATA: dist icinde hic .ttf yok, ikon fontu kayip.');
    process.exit(1);
  }

  console.log(`dogrulandi: ${required.length} zorunlu dosya + ${fonts.length} font`);
  fonts.forEach((f) => console.log('  font: ' + path.relative(distDir, f).replace(/\\/g, '/')));
}

// --------------------------------------------------------- 4) derleme kimligi

function stampServiceWorker() {
  const swPath = path.join(distDir, 'sw.js');
  if (!fs.existsSync(swPath)) {
    console.error('dist/sw.js yok.');
    process.exit(1);
  }

  // build-info.ts bir TypeScript dosyasi, require edilemez; kimligi
  // dogrudan iceriginden okuyoruz.
  const infoPath = path.join(__dirname, '..', 'src', 'lib', 'build-info.ts');
  const info = fs.readFileSync(infoPath, 'utf8');
  const match = info.match(/BUILD_ID = '([^']+)'/);
  if (!match) {
    console.error('build-info.ts icinde BUILD_ID bulunamadi. Once: node scripts/build-info.js');
    process.exit(1);
  }
  const BUILD_ID = match[1];

  let sw = fs.readFileSync(swPath, 'utf8');

  if (!sw.includes('__BUILD_ID__')) {
    console.log('sw.js zaten damgalanmis, atlaniyor');
    return;
  }

  sw = sw.split('__BUILD_ID__').join(BUILD_ID);
  fs.writeFileSync(swPath, sw);
  console.log(`sw.js derleme kimligiyle damgalandi: ${BUILD_ID}`);
}

relocateVendorAssets();
injectHead();
stampServiceWorker();
verify();
