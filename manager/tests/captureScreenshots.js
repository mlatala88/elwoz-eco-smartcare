/**
 * Automated Screenshot Capturer using Chrome Headless CLI
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outDir = path.resolve(rootDir, 'docs', 'screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Start HTTP Server
const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/manager/index.html';

  const filePath = path.join(rootDir, reqPath);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

const PORT = 8095;

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Server started on port ${PORT}. Starting screenshot capture...`);

  const views = [
    { name: '01_dashboard_1920x1080.png', route: '#dashboard', width: 1920, height: 1080 },
    { name: '02_dashboard_1366x768.png', route: '#dashboard', width: 1366, height: 768 },
    { name: '03_tasks_queue_1920x1080.png', route: '#tasks', width: 1920, height: 1080 },
    { name: '04_tickets_list_1920x1080.png', route: '#tickets', width: 1920, height: 1080 },
    { name: '05_ticket_detail_3col_1920x1080.png', route: '#detail?id=ELW-2026-0001', width: 1920, height: 1080 },
    { name: '06_ticket_detail_1366x768.png', route: '#detail?id=ELW-2026-0001', width: 1366, height: 768 },
    { name: '07_communication_log_1920x1080.png', route: '#comms', width: 1920, height: 1080 },
    { name: '08_csat_reputation_1920x1080.png', route: '#csat', width: 1920, height: 1080 },
    { name: '09_reports_analytics_1920x1080.png', route: '#reports', width: 1920, height: 1080 },
    { name: '10_diagnostics_1920x1080.png', route: '#diagnostics', width: 1920, height: 1080 },
    { name: '11_settings_1920x1080.png', route: '#settings', width: 1920, height: 1080 }
  ];

  for (const v of views) {
    const targetUrl = `http://127.0.0.1:${PORT}/manager/index.html${v.route}`;
    const outFile = path.join(outDir, v.name);
    console.log(`Capturing: ${v.name} (${targetUrl})...`);

    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--window-size=${v.width},${v.height}`,
      `--screenshot=${outFile}`,
      '--virtual-time-budget=2000',
      targetUrl
    ];

    try {
      await execFileAsync(chromePath, args);
      console.log(`  ✓ Saved: ${v.name} (${fs.statSync(outFile).size} bytes)`);
    } catch (e) {
      console.error(`  ✗ Error capturing ${v.name}:`, e.message);
    }
  }

  console.log('All screenshots captured!');
  server.close(() => {
    process.exit(0);
  });
});
