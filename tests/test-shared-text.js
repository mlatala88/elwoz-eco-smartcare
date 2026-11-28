const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const attack = '<img src=x onerror=alert(1)>';
function element() {
  const children = new Map();
  return { innerHTML: '', textContent: '', classList: { add() {}, remove() {} }, appendChild() {}, querySelector(s) { if (!children.has(s)) children.set(s, element()); return children.get(s); } };
}
function load(name, exportName) {
  const context = vm.createContext({ document: { createElement: element, body: element() }, window: {}, requestAnimationFrame() {}, setTimeout() {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../manager/js/components/', name), 'utf8').replace(/^export /gm, '') + `\nthis.result = ${exportName};`, context);
  return context.result;
}
test('toast displays server message as text', () => {
  const toast = load('toast.js', 'Toast').show(attack, 'error', 0);
  assert.ok(!toast.innerHTML.includes(attack));
  assert.equal(toast.querySelector('.toast-message').textContent, attack);
});
test('confirmation title, body and button labels remain text', () => {
  const modal = load('modal.js', 'Modal').confirm(attack, () => {}, attack, attack, attack);
  assert.ok(!modal.element.innerHTML.includes(attack));
  assert.equal(modal.element.querySelector('.modal-title').textContent, attack);
  assert.equal(modal.element.querySelector('.modal-confirm-message').textContent, attack);
  assert.equal(modal.element.querySelector('#modal-confirm-btn').textContent, attack);
});
