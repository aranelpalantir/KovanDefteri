/**
 * dist/ klasörünü ağa açan bağımlılıksız statik sunucu.
 *
 * Tek sayfalık derleme olduğu için bilinmeyen yollar index.html'e düşürülür
 * (SPA fallback), böylece /hive/xyz gibi adresler doğrudan açılabilir.
 *
 *   node scripts/serve-dist.js [port]
 */
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const port = Number(process.argv[2]) || 8088;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

if (!fs.existsSync(distDir)) {
  console.error('dist/ yok. Once: npm run build:web');
  process.exit(1);
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad Request');
  }

  // Dizin dışına çıkma denemelerini engelle.
  const resolved = path.resolve(distDir, '.' + pathname);
  if (resolved !== distDir && !resolved.startsWith(distDir + path.sep)) {
    return send(res, 403, 'Forbidden');
  }

  let filePath = resolved;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // SPA fallback: uzantısız ve bulunamayan yollar uygulama kabuğuna gider.
  if (!fs.existsSync(filePath)) {
    if (path.extname(pathname) === '') {
      filePath = path.join(distDir, 'index.html');
    } else {
      return send(res, 404, 'Not Found');
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = TYPES[ext] ?? 'application/octet-stream';

  // Service worker ve kabuk her zaman taze; hash'li varlıklar uzun süre önbellekte.
  const immutable = filePath.includes(`${path.sep}_expo${path.sep}`) || filePath.includes(`${path.sep}assets${path.sep}`);
  const cacheControl =
    ext === '.html' || filePath.endsWith('sw.js')
      ? 'no-cache'
      : immutable
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=3600';

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 500, 'Internal Server Error');
    send(res, 200, data, { 'Content-Type': type, 'Cache-Control': cacheControl });
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Kovan Defteri  ->  http://localhost:${port}`);
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) {
        console.log(`  ${name.padEnd(28)} http://${a.address}:${port}`);
      }
    }
  }
  console.log('\nNot: Service worker yalnizca https veya localhost uzerinde kaydolur.');
});
