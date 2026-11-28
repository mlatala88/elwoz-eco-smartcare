const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const attack = `</script><img src=x onerror=alert(1)>"'&\u2028\u2029`;
function environment() {
  let html;
  const sheet = { getLastRow: () => 2 };
  const env = vm.createContext({
    requireSmartCarePermission_() {},
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }), getUi: () => ({ showModalDialog() {} }) },
    HtmlService: { createHtmlOutput: text => { html = text; return { setWidth() { return this; }, setHeight() { return this; } }; } }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../google/communication.gs'), 'utf8'), env);
  env.getTicketDataByRow_ = () => ({ ticketId: attack, status: attack, priority: attack, residentName: attack, location: attack, nextAction: attack, slaDeadline: attack, row: 2 });
  return { env, html: () => html };
}

test('legacy queue cannot close its script with ticket data or create stored HTML elements', () => {
  const state = environment();
  state.env.actionOpenQueueBrowser();
  const html = state.html();
  assert.equal(html.includes(attack), false, 'Raw closing script payload must not be embedded');
  assert.equal((html.match(/<\/script>/g) || []).length, 1);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const nodes = new Map();
  const document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, {}); return nodes.get(id); } };
  vm.runInNewContext(script, { document });
  const rendered = nodes.get('tableBody').innerHTML;
  assert.equal(/<img|<\/script>/.test(rendered), false);
  assert.match(rendered, /&lt;img/);
});

test('inline JSON serializer preserves original text and neutralizes script delimiters', () => {
  const { env } = environment();
  assert.equal(typeof env.serializeForHtmlScript_, 'function');
  const encoded = env.serializeForHtmlScript_({ value: attack });
  assert.equal(encoded.includes('<'), false);
  assert.equal(encoded.includes('\u2028'), false);
  assert.equal(encoded.includes('\u2029'), false);
  assert.equal(JSON.parse(encoded).value, attack);
});
