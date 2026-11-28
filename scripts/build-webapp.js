/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Build script: Bundles Manager web app into a single Google Apps Script webapp.html template
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MANAGER_DIR = path.join(ROOT_DIR, 'manager');
const GOOGLE_DIR = path.join(ROOT_DIR, 'google');

console.log('=== Rozpoczynanie budowania szablonu Google Apps Script webapp.html ===');

// 1. Zbieranie stylów CSS
const cssFiles = [
  'css/main.css',
  'css/components.css',
  'css/dashboard.css',
  'css/detail.css',
  'css/responsive.css'
];

let bundledCss = '';
for (const file of cssFiles) {
  const filePath = path.join(MANAGER_DIR, file);
  if (fs.existsSync(filePath)) {
    bundledCss += `\n/* === ${file} === */\n` + fs.readFileSync(filePath, 'utf8');
  } else {
    console.warn(`Ostrzeżenie: brak pliku CSS ${file}`);
  }
}

// 2. Kolejność zależności modułów JavaScript
const jsFiles = [
  'js/components/escapeHtml.js',
  'js/data/initialDataset.js',
  'js/data/cxGuardrail.js',
  'js/data/dataProvider.js',
  'js/data/demoProvider.js',
  'js/data/gasProvider.js',
  'js/components/toast.js',
  'js/components/modal.js',
  'js/components/sidebar.js',
  'js/components/topbar.js',
  'js/views/dashboardView.js',
  'js/views/tasksView.js',
  'js/views/ticketsView.js',
  'js/views/detailView.js',
  'js/views/commsView.js',
  'js/views/csatView.js',
  'js/views/reportsView.js',
  'js/views/diagnosticsView.js',
  'js/views/settingsView.js',
  'js/app.js'
];

let bundledJs = '';

for (const relPath of jsFiles) {
  const fullPath = path.join(MANAGER_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Błąd: brak pliku JS ${relPath}`);
    process.exit(1);
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Usunięcie importów statycznych
  content = content.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm, '');

  // Zastąpienie dynamicznych importów bezpośrednimi obietnicami
  content = content.replace(/import\s*\(\s*['"][^'"]*toast(?:\.js)?['"]\s*\)/g, 'Promise.resolve({ Toast })');
  content = content.replace(/import\s*\(\s*['"][^'"]*modal(?:\.js)?['"]\s*\)/g, 'Promise.resolve({ Modal })');
  content = content.replace(/import\s*\(\s*['"][^'"]*dashboardView(?:\.js)?['"]\s*\)/g, 'Promise.resolve({ DashboardView })');

  // Zastąpienie eksportów deklaracjami lokalnymi/globalnymi
  content = content.replace(/^export\s+(class|function|const|let|var)\s+/gm, '$1 ');
  content = content.replace(/^export\s*\{[\s\S]*?\};?/gm, '');
  content = content.replace(/^export\s+default\s+.*?;?/gm, '');

  bundledJs += `\n// ==========================================\n// MODUŁ: ${relPath}\n// ==========================================\n` + content;
}

// 3. Budowanie kompletnego szablonu HTML dla Google Apps Script HtmlService
const webappHtml = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ELWOZ ECO SmartCare Manager v0.3.0</title>
  
  <!-- CDN Vendor Libraries dla środowiska Google Apps Script -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>

  <!-- Skompilowane Style CSS (Central Design System) -->
  <style>
${bundledCss}
  </style>
</head>
<body>
  <!-- Główny kontener aplikacji SPA -->
  <div id="app">
    <!-- Pasek boczny nawigacji (230px zwijany) -->
    <aside id="sidebar-container"></aside>

    <!-- Główny obszar roboczy -->
    <div class="app-main">
      <!-- Górny pasek Topbar (64px) z wyszukiwarką, powiadomieniami i profilem -->
      <header id="topbar-container"></header>

      <!-- Dynamiczny obszar zawartości widoków -->
      <main id="content-container" class="app-content" role="main"></main>
    </div>
  </div>

  <!-- Skompilowany rdzeń aplikacji SPA (SmartCare Manager Engine) -->
  <script>
(function() {
${bundledJs}
})();
  </script>
</body>
</html>
`;

const outputPath = path.join(GOOGLE_DIR, 'webapp.html');
fs.writeFileSync(outputPath, webappHtml, 'utf8');

console.log(`✓ Pomyślnie wygenerowano plik szablonu: ${outputPath}`);
console.log(`  Rozmiar: ${(Buffer.byteLength(webappHtml, 'utf8') / 1024).toFixed(1)} KB`);
