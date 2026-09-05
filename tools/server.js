#!/usr/bin/env node
// GARGANTUA — zero-dependency static server with correct MIME types and a
// /.shots upload endpoint used by the URL screenshot automation (?shotSave=1).

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const u = decodeURIComponent((req.url || '/').split('?')[0]);

  if (req.method === 'POST' && u === '/.shots') {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 60e6) req.destroy();
    });
    req.on('end', () => {
      try {
        const { name, data } = JSON.parse(body);
        const safe = String(name || 'shot.png').replace(/[^\w.-]/g, '_');
        const b64 = String(data).replace(/^data:image\/png;base64,/, '');
        const dir = path.join(ROOT, 'shots');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, safe), Buffer.from(b64, 'base64'));
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('saved shots/' + safe);
        console.log('[shots] saved', safe);
      } catch (e) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end('bad request');
      }
    });
    return;
  }

  let file = path.normalize(path.join(ROOT, u === '/' ? 'index.html' : u));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('forbidden');
    return;
  }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err2, buf) => {
      if (err2) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('404 ' + u);
        return;
      }
      res.writeHead(200, {
        'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-cache',
      });
      res.end(buf);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`GARGANTUA static server → http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  const urls = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) urls.push(`http://${net.address}:${PORT}`);
    }
  }
  if (urls.length) {
    console.log('  LAN (same Wi-Fi, open on your phone):');
    urls.forEach((u) => console.log('    ' + u + '/?preset=1'));
  }
  console.log('  try: http://localhost:' + PORT + '/?preset=1&hideui=1');
});
