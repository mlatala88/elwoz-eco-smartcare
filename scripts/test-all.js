// Offline regression suite. No Google service, email or AI network calls.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const suites = [
  'tests/test-v028-audit.js',
  'tests/test-v030-integration.js',
  'manager/tests/runTests.js',
  'tests/test-deployed-regressions.js',
  'tests/test-browser-contracts.js',
  'tests/test-rpc-security.js',
  'tests/test-access.js',
  'tests/test-module-contracts.js',
  'tests/test-html-safety.js',
  'tests/test-shared-text.js'
];
if (fs.existsSync(path.join(root, 'tests/test-legacy-html-safety.js'))) suites.push('tests/test-legacy-html-safety.js');
for (const file of suites) {
  const result = spawnSync(process.execPath, [file], { cwd: root, encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error || result.status !== 0) {
    console.error('FAILED: ' + file, result.error || '');
    process.exit(result.status || 1);
  }
}
const build = spawnSync(process.execPath, ['scripts/build-webapp.js'], { cwd: root, encoding: 'utf8' });
process.stdout.write(build.stdout || '');
process.stderr.write(build.stderr || '');
if (build.error || build.status !== 0) process.exit(build.status || 1);
const html = fs.readFileSync(path.join(root, 'google/webapp.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) throw new Error('Expected one bundled inline script');
new vm.Script(scripts[0][1], { filename: 'google/webapp.html:inline' });
console.log('PASS: all ' + suites.length + ' offline suites and rebuilt Web App JavaScript syntax');
