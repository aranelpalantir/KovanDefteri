/**
 * `expo export --platform web` sonrası dist/index.html'e PWA başlık etiketlerini yazar.
 *
 * Neden ayrı bir adım: web.output "single" olduğunda Expo Router `+html.tsx`
 * dosyasını kullanmıyor, index.html'i kendi şablonundan üretiyor. Şablona
 * müdahale edecek desteklenen bir kanca da yok. Bu yüzden başlığı derlemeden
 * sonra biz tamamlıyoruz.
 *
 * Betik idempotent: aynı dist üzerinde birden çok kez çalıştırılabilir.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html yok. Önce: npx expo export --platform web');
  process.exit(1);
}

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
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>`;

let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes(MARKER)) {
  console.log('dist/index.html zaten islenmis, atlaniyor.');
  process.exit(0);
}

const before = html;

// 1) Çentikli ekranlarda tam kanama için viewport'u değiştir.
html = html.replace(
  /<meta name="viewport"[^>]*>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />',
);

// 2) app.json'dan gelen koşulsuz theme-color'ı kaldır; yerine açık/koyu olanları koyacağız.
html = html.replace(/\s*<meta name="theme-color" content="[^"]*"\s*\/?>/i, '');

// 3) Etiketleri </head> öncesine ekle.
html = html.replace('</head>', `${headTags}\n  </head>`);

if (html === before) {
  console.error('index.html beklenen yapida degil, hicbir sey degismedi.');
  process.exit(1);
}

fs.writeFileSync(indexPath, html);

// Derleme çıktısının beklenen PWA dosyalarını içerdiğini doğrula.
const required = ['manifest.json', 'sw.js', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];
const missing = required.filter((f) => !fs.existsSync(path.join(distDir, f)));

if (missing.length > 0) {
  console.error(`dist icinde eksik dosyalar: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('dist/index.html PWA etiketleriyle guncellendi.');
console.log(`Dogrulanan dosyalar: ${required.join(', ')}`);
