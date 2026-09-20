/**
 * Kovan Defteri PWA ikon üreteci.
 * Bağımlılık yok: RGBA tampon + zlib ile PNG yazar, 3x supersampling ile yumuşatır.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------- PNG kodlayıcı ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Her tarama satırının başına filtre baytı (0 = None).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Geometri ----------
const hex = (s) => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16),
];

/** Sivri tepeli düzgün altıgenin içinde mi? */
function inHexagon(px, py, cx, cy, r) {
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  if (dy > r) return false;
  // Sivri tepe: genişlik = sqrt(3)/2 * r
  const w = (Math.sqrt(3) / 2) * r;
  if (dx > w) return false;
  // Eğik kenarlar
  return r * w - dx * (r / 2) - w * dy >= 0;
}

/**
 * Bal peteği: merkez + 6 komşu altıgen.
 * scale: ikonun kısa kenarına göre petek yarıçapı katsayısı.
 */
function renderIcon(size, opts = {}) {
  const { padding = 0.22, bg = '#D98A0B', fg = '#FFFBF3', accent = '#8A5A06' } = opts;
  const SS = 3; // supersampling
  const dim = size * SS;
  const out = Buffer.alloc(size * size * 4);

  const bgc = hex(bg);
  const fgc = hex(fg);
  const acc = hex(accent);

  const cx = dim / 2;
  const cy = dim / 2;
  // Petek kümesinin dış yarıçapı: sqrt(3)*R (komşu mesafesi) + R
  const usable = (dim / 2) * (1 - padding);
  const R = usable / (Math.sqrt(3) + 1);
  const spacing = Math.sqrt(3) * R;
  const rDraw = R * 0.9; // aralarında boşluk kalsın

  const centers = [[cx, cy]];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    centers.push([cx + spacing * Math.cos(a), cy + spacing * Math.sin(a)]);
  }

  // Supersample edilmiş örnekleri topla
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x * SS + sx + 0.5;
          const py = y * SS + sy + 0.5;
          let c = bgc;
          for (let i = 0; i < centers.length; i++) {
            const [hx, hy] = centers[i];
            if (inHexagon(px, py, hx, hy, rDraw)) {
              // Merkez altıgen koyu, çevredekiler krem — petek hissi
              c = fgc;
              break;
            }
          }
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = 255;
    }
  }

  return encodePng(size, size, out);
}

// ---------- Çıktı ----------
const root = process.argv[2] ?? path.join(__dirname, '..');

const iconDir = path.join(root, 'public', 'icons');
fs.mkdirSync(iconDir, { recursive: true });

const targets = [
  // Maskable ikonlarda güvenli alan için daha çok boşluk bırakıyoruz.
  { file: path.join(iconDir, 'icon-192.png'), size: 192, padding: 0.3 },
  { file: path.join(iconDir, 'icon-512.png'), size: 512, padding: 0.3 },
  // iOS köşeleri kendisi yuvarlıyor; tam kanama daha iyi duruyor.
  { file: path.join(iconDir, 'apple-touch-icon.png'), size: 180, padding: 0.16 },
  { file: path.join(iconDir, 'favicon-32.png'), size: 32, padding: 0.12 },
  { file: path.join(root, 'assets', 'images', 'favicon.png'), size: 48, padding: 0.12 },
  { file: path.join(root, 'assets', 'images', 'icon.png'), size: 1024, padding: 0.18 },
  { file: path.join(root, 'assets', 'images', 'splash-icon.png'), size: 512, padding: 0.1 },
  {
    file: path.join(root, 'assets', 'images', 'android-icon-foreground.png'),
    size: 1024,
    padding: 0.34,
    bg: '#00000000',
  },
];

for (const t of targets) {
  const buf = renderIcon(t.size, { padding: t.padding, bg: t.bg === '#00000000' ? '#FDF3DF' : undefined });
  fs.writeFileSync(t.file, buf);
  console.log(`${path.relative(root, t.file)}  ${t.size}x${t.size}  ${(buf.length / 1024).toFixed(1)} KB`);
}
