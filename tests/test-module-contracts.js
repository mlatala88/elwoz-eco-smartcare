const test = require('node:test');
const assert = require('node:assert/strict');
const { setupGasEnvironment } = require('./test-v030-integration');

function environment() {
  const env = setupGasEnvironment();
  const ss = env.SpreadsheetApp.getActiveSpreadsheet();
  const settings = ss.getSheetByName('USTAWIENIA') || ss.insertSheet('USTAWIENIA');
  settings.data = [['Ustawienia', ''], ['', ''],
    ['Nazwa przedsiębiorstwa', 'Firma'], ['Nazwa placówki', 'Biuro'],
    ['Adres e-mail do kontaktu', 'biuro@example.com'], ['Numer telefonu', '123'],
    ['Zweryfikowany link do opinii Google', 'https://search.google.com/local/writereview?placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA'],
    ['Godziny pracy POK', '07:00 - 16:00'], ['Automatyczna analiza AI nowych zgłoszeń', 'WŁĄCZONE']];
  // Existing fixture supports numeric ranges only; production settings reader uses A1.
  const getRange = settings.getRange.bind(settings);
  settings.getRange = (row, ...args) => row === 'A3:B18' ? getRange(3, 1, 16, 2) : getRange(row, ...args);
  return { env, ss, settings };
}

test('communication readback exposes UI action, channel and status without losing legacy type', () => {
  const { env, ss } = environment();
  ss.getSheetByName('HISTORIA KOMUNIKACJI').appendRow(['ELW-2026-0001', '2026-11-27 10:00', 'Potwierdzenie przyjęcia', 'e-mail', 'test@example.com', 'Temat', 'Treść', 'Operator', 'wysłano', '']);
  const row = env.apiGetCommunications('ELW-2026-0001').at(-1);
  assert.equal(row.actionType, 'Potwierdzenie przyjęcia');
  assert.equal(row.type, row.actionType);
  assert.equal(row.channel, 'E-mail');
  assert.equal(row.status, 'Wysłano');
});

test('manager review invitation uses engine action and persists invitation bookkeeping', () => {
  const { env, ss } = environment();
  ss.getSheetByName('ZGŁOSZENIA').data[1][36] = 'NIE';
  env.apiAddCommunication({ ticketId: 'ELW-2026-0001', channel: 'E-mail', actionType: 'Zaproszenie do opinii Google', subject: 'Prośba o opinię', content: 'Dziękujemy za kontakt. Zapraszamy do podzielenia się opinią.', recipient: 'test@example.com' });
  assert.equal(env.apiGetTicketById('ELW-2026-0001').reviewInviteSent, 'TAK');
  assert.equal(env.apiGetCommunications('ELW-2026-0001').at(-1).actionType, 'Prośba o opinię');
});

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function viewClass(name, extra = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../manager/js/views/', name[0].toLowerCase() + name.slice(1) + '.js'), 'utf8');
  const context = { window: {}, console, setTimeout, clearTimeout, ...extra };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../manager/js/components/escapeHtml.js'), 'utf8').replace('export function ', 'function '), context);
  vm.runInContext(source.replace(/^import .*;\r?\n/gm, '').replace(`export class ${name}`, `globalThis.View = class ${name}`).replaceAll('import("../components/toast.js")', 'Promise.resolve({Toast:{success(){},error(){},warning(){}}})'), context);
  return context.View;
}
function container() {
  const nodes = new Map();
  return { nodes, innerHTML: '', querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector, { innerHTML: '', textContent: '', style: {}, disabled: false, setAttribute() {}, querySelectorAll() { return []; } });
    return nodes.get(selector);
  }, querySelectorAll() { return []; } };
}

test('reports requests the same period for ticket tables and KPI totals', async () => {
  const c = container(); let filters;
  const View = viewClass('ReportsView');
  const view = new View(c, {}, {
    getStats: async () => ({ total: 1, categoryMap: {} }),
    getTickets: async f => { filters = f; return []; }, getStaff: async () => []
  }, {});
  view.currentPeriod = '7days';
  await view.loadReportData();
  assert.equal(filters && filters.period, '7days');
});

test('task badges respect owner filter and Warsaw calendar day near UTC midnight', async () => {
  class FixedDate extends Date { constructor(value) { super(value === undefined ? '2026-11-27T23:30:00Z' : value); } }
  const c = container();
  const View = viewClass('TasksView', { Date: FixedDate });
  const ticket = { id: 'T1', status: 'Nowe', priority: 'PILNY', assignee: 'Operator', nextActionDeadline: '2026-11-28 09:00', fraction: 'Papier' };
  const view = new View(c, {}, { getTickets: async () => [ticket, { ...ticket, id: 'T2', assignee: 'Other' }] }, { currentUser: { name: 'Operator' } });
  view.filterOnlyMine = true;
  view.activeQueue = 'today';
  await view.loadTasks();
  assert.equal(c.querySelector('#tab-badge-today').textContent, 1);
  assert.equal(c.querySelector('#tab-badge-immediate').textContent, 1);
  assert.match(c.querySelector('#tasks-table-body').innerHTML, /T1/);
  assert.doesNotMatch(c.querySelector('#tasks-table-body').innerHTML, /T2/);
});

test('connected diagnostics disables simulation and restores failed test button', async () => {
  const c = container();
  const View = viewClass('DiagnosticsView');
  const view = new View(c, {}, { runDiagnosticsTest: async () => { throw new Error('offline'); } }, { mode: 'connected' });
  view.bindEvents();
  assert.equal(c.querySelector('#btn-toggle-sim-error').disabled, true);
  await c.querySelector('#btn-run-diag-test').onclick();
  assert.equal(c.querySelector('#btn-run-diag-test').disabled, false);
});

test('connected settings keeps fixed roster read-only', async () => {
  const c = container();
  const View = viewClass('SettingsView');
  const view = new View(c, {}, { getSettings: async () => ({}), getStaff: async () => [] }, { mode: 'connected' });
  await view.render();
  assert.equal(c.querySelector('#btn-add-staff').disabled, true);
  assert.equal(c.querySelector('#btn-add-staff').onclick, undefined);
});

test('diagnostics returns measurable card values and rendered test rows without probing Gemini', () => {
  const { env } = environment();
  env.UrlFetchApp.fetch = () => { throw new Error('Diagnostics must not call Gemini'); };
  const diag = env.apiGetDiagnostics();
  assert.equal(diag.sheetsConnection, 'OK');
  assert.equal(typeof diag.latencyMs, 'number');
  assert.equal(typeof diag.aiErrors, 'number');
  const result = env.apiRunDiagnosticsTest();
  assert.ok(result.timestamp);
  assert.ok(result.tests.length >= 3);
  assert.ok(result.tests.every(t => t.name && t.status && t.latency && t.details));
});

test('settings maps UI names and persists only supplied organization fields with readback', () => {
  const { env, settings } = environment();
  assert.equal(env.apiGetSettings().branch, 'Biuro');
  assert.equal(env.apiGetSettings().email, 'biuro@example.com');
  let acquired = 0, released = 0;
  env.LockService.getScriptLock = () => ({ waitLock() { acquired++; }, releaseLock() { released++; } });
  const saved = env.apiUpdateSettings({ branch: 'Nowe biuro', phone: '456', workingHours: '08:00 - 16:00' });
  assert.equal(saved.branch, 'Nowe biuro');
  assert.equal(env.apiGetSettings().phone, '456');
  assert.equal(env.apiGetSettings().workingHours, '08:00 - 16:00');
  assert.equal(settings.data.find(r => r[0] === 'Nazwa przedsiębiorstwa')[1], 'Firma');
  assert.equal(settings.data.find(r => r[0] === 'Automatyczna analiza AI nowych zgłoszeń')[1], 'WŁĄCZONE');
  assert.equal(acquired, 1);
  assert.equal(released, 1);
});

test('unsupported AI configuration and formula input are rejected before any settings write', () => {
  const { env, settings } = environment();
  const before = JSON.stringify(settings.data);
  assert.throws(() => env.apiUpdateSettings({ companyName: 'Changed', allowEmployeeApiKeys: true }), /ustaw|obsług|dozwol/i);
  assert.throws(() => env.apiUpdateSettings({ companyName: '=IMPORTXML("url")' }), /formu|tekst/i);
  assert.equal(JSON.stringify(settings.data), before);
});

test('missing mail engine and unknown tickets fail instead of recording successful communication', () => {
  const { env } = environment();
  env.processSendEmail = undefined;
  assert.throws(() => env.apiAddCommunication({ ticketId: 'ELW-2026-0001', channel: 'E-mail', content: 'Wiadomość' }), /wysy|dostęp/i);
  assert.throws(() => env.apiAddCommunication({ ticketId: 'MISSING', channel: 'Telefon', content: 'Notatka' }), /zgłoszen/i);
});

test('web app communication works without an active spreadsheet and records the verified author', () => {
  const { env, ss } = environment();
  env.PropertiesService.getScriptProperties().setProperty('SMARTCARE_SPREADSHEET_ID', ss.getId());
  env.SpreadsheetApp.getActiveSpreadsheet = () => null;
  env.SpreadsheetApp.openById = id => { assert.equal(id, ss.getId()); return ss; };
  let sent = 0;
  env.MailApp.sendEmail = () => { sent++; };
  env.apiAddCommunication({ ticketId: 'ELW-2026-0001', channel: 'E-mail', subject: 'Potwierdzenie', content: 'Potwierdzamy otrzymanie zgłoszenia i przystąpienie do weryfikacji.', author: 'Sfałszowany autor' });
  assert.equal(sent, 1);
  assert.equal(env.apiGetCommunications('ELW-2026-0001').at(-1).author, 'Michał Latała');
});
