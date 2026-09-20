/**
 * Her derlemede src/lib/build-info.ts dosyasini yeniden uretir.
 *
 * Amac: kullanicinin elindeki surumun hangi derleme oldugunu Ayarlar
 * ekranindan gorebilmesi ve service worker onbelleginin her yayinda
 * kendiliginden tazelenmesi.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function gitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'local';
  }
}

function gitDirty() {
  try {
    const out = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
const hash = gitHash();
const dirty = gitDirty();

// Onbellek anahtari ve guncelleme karsilastirmasi icin tek benzersiz kimlik.
const buildId = `${stamp}-${pad(now.getHours())}${pad(now.getMinutes())}-${hash}${dirty ? '-dirty' : ''}`;

const contents = `/**
 * OTOMATIK URETILDI — elle duzenlemeyin.
 * Kaynak: scripts/build-info.js (her \`npm run build:web\` calistiginda yenilenir)
 */

export const BUILD_ID = '${buildId}';
export const BUILD_DATE = '${stamp}';
export const BUILD_TIME = '${time}';
export const BUILD_COMMIT = '${hash}';
export const BUILD_DIRTY = ${dirty};

/** Ayarlar ekraninda gosterilen kisa surum etiketi. */
export const VERSION_LABEL = '${stamp} · ${hash}${dirty ? ' (kaydedilmemis degisiklikler)' : ''}';
`;

const target = path.join(__dirname, '..', 'src', 'lib', 'build-info.ts');
fs.writeFileSync(target, contents);
console.log(`build-info.ts yazildi: ${buildId}`);
