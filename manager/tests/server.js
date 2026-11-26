/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Local Static HTTP Server
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const urlParts = req.url.split('?');
  const reqUrl = urlParts[0];

  // Automatyczne przekierowanie do menedżera
  if (reqUrl === '/' || reqUrl === '') {
    res.writeHead(302, { 'Location': '/manager/index.html' });
    res.end();
    return;
  }

  const decodedPath = decodeURI(reqUrl);
  const filePath = path.join(rootDir, decodedPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Nie odnaleziono pliku: ' + decodedPath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

const PORT = 8092;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`SmartCare Manager v0.3.0 Server running at http://127.0.0.1:${PORT}/manager/index.html`);
});
