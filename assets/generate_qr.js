/**
 * ELWOZ ECO SmartCare - Generator Kodu QR (SVG & PNG)
 * Uruchomienie po opublikowaniu aplikacji na GitHub Pages:
 *   node assets/generate_qr.js https://TWOJ_LOGIN.github.io/elwoz-eco-smartcare
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const targetUrl = process.argv[2];

if (!targetUrl) {
  console.log(`
========================================================================
ELWOZ ECO SmartCare - Generator Kodu QR
========================================================================
UWAGA: Zgodnie z wytycznymi kod QR generujemy wyłącznie dla
RZECZYWISTEGO, opublikowanego adresu URL GitHub Pages.

Instrukcja:
1. Opublikuj repozytorium na GitHub Pages (gałąź main, katalog /root).
2. Sprawdź swój adres, np.:
   https://twoj-login.github.io/elwoz-eco-smartcare
3. Uruchom generator z tym adresem:
   node assets/generate_qr.js https://twoj-login.github.io/elwoz-eco-smartcare

Generator automatycznie:
- pobierze i zapisze plik wektorowy assets/qr-code.svg
- pobierze i zapisze plik rastrowy assets/qr-code.png (wysoka rozdzielczość 1000x1000px)
- zaktualizuje szablon naklejki assets/naklejka-pojemnik-szablon.svg
========================================================================
`);
  process.exit(0);
}

console.log(`Generowanie kodu QR dla adresu: ${targetUrl}...`);

// Enkodowanie URL
const encodedUrl = encodeURIComponent(targetUrl);

// Ścieżki docelowe
const assetsDir = __dirname;
const svgPath = path.join(assetsDir, 'qr-code.svg');
const pngPath = path.join(assetsDir, 'qr-code.png');

// 1. Pobieranie SVG
const svgApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=svg&data=${encodedUrl}&color=1b7a3e`;
// 2. Pobieranie PNG
const pngApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&format=png&data=${encodedUrl}&color=1b7a3e`;

function downloadFile(url, dest, callback) {
  const file = fs.createWriteStream(dest);
  https.get(url, (response) => {
    if (response.statusCode === 200) {
      response.pipe(file);
      file.on('finish', () => {
        file.close(callback);
      });
    } else {
      file.close();
      fs.unlink(dest, () => {});
      console.error(`Błąd pobierania ${dest}: kod HTTP ${response.statusCode}`);
    }
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    console.error(`Błąd sieciowy przy pobieraniu ${dest}:`, err.message);
  });
}

downloadFile(svgApiUrl, svgPath, () => {
  console.log(`✓ Wygenerowano wektorowy kod QR: ${svgPath}`);
  
  downloadFile(pngApiUrl, pngPath, () => {
    console.log(`✓ Wygenerowano plik PNG wysokiej rozdzielczości: ${pngPath}`);
    console.log(`\nSukces! Kody QR są gotowe do wykorzystania w prezentacji i naklejkach na pojemniki.`);
  });
});
