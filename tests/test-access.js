const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
function accessContext(email = '', mapping) {
  const context = vm.createContext({
    Session: {
      getActiveUser: () => ({ getEmail: () => email }),
      getEffectiveUser: () => { throw new Error('Effective identity must not authorize visitors'); }
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => mapping === undefined ? null : mapping }) }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'google/webapp.gs'), 'utf8'), context);
  const accessFile = path.join(root, 'google/access.gs');
  if (fs.existsSync(accessFile)) vm.runInContext(fs.readFileSync(accessFile, 'utf8'), context);
  return context;
}

test('authorization rejects masked, outsider and placeholder accounts; only configured Google identity grants access', () => {
  const admin = accessContext('WSB.STUDENT.TESTER@gmail.com');
  assert.equal(typeof admin.requireSmartCarePermission_, 'function', 'Server authorization helper is required');
  assert.equal(admin.requireSmartCarePermission_('admin').id, 'staff-1');
  for (const email of ['', 'outsider@gmail.com', 'barbara.seroka@example.com']) {
    assert.throws(() => accessContext(email).requireSmartCarePermission_('read'), /ACCESS_DENIED/);
  }
});

test('staff mapping cannot upgrade observer permissions or trust caller identity', () => {
  const context = accessContext('reader@gmail.com', JSON.stringify({ 'staff-5': 'reader@gmail.com' }));
  assert.equal(context.requireSmartCarePermission_('read').id, 'staff-5');
  for (const permission of ['write', 'close', 'comms', 'ai', 'admin', 'diagnostics']) {
    assert.throws(() => context.requireSmartCarePermission_(permission, { id: 'staff-1' }), /ACCESS_DENIED/);
  }
  assert.throws(() => accessContext('wsb.student.tester@gmail.com', JSON.stringify({ 'staff-5': 'reader@gmail.com' })).requireSmartCarePermission_('read'), /ACCESS_DENIED/);
});

test('invalid or ambiguous roster fails closed and inactive staff cannot authenticate', () => {
  for (const mapping of ['{', 'null', '[]', '{}', '{"unknown":"a@gmail.com"}', '{"staff-1":"a@example.com"}', '{"staff-1":"same@gmail.com","staff-2":"SAME@gmail.com"}']) {
    assert.throws(() => accessContext('wsb.student.tester@gmail.com', mapping).requireSmartCarePermission_('read'), /ACCESS_DENIED/);
  }
  const context = accessContext('wsb.student.tester@gmail.com');
  vm.runInContext('SMARTCARE_TEAM_MEMBERS[0].active = false', context);
  assert.throws(() => context.requireSmartCarePermission_('read'), /ACCESS_DENIED/);
});

function frontendContext(provider) {
  const context = vm.createContext({
    console, URLSearchParams,
    window: { location: { search: '?mode=connected', hash: '' } },
    localStorage: { getItem: () => null },
    sessionStorage: { getItem: () => JSON.stringify({ id: 'staff-1', role: 'Administrator' }) },
    document: { addEventListener() {}, getElementById: () => ({ innerHTML: '', querySelector: () => ({ textContent: '' }) }) },
    AppsScriptDataProvider: function () { return provider; },
    DemoDataProvider: function () { return provider; }
  });
  const source = fs.readFileSync(path.join(root, 'manager/js/app.js'), 'utf8').replace(/^import .*;\r?\n/gm, '');
  vm.runInContext(source + '\nthis.AppForTest = App;', context);
  return context;
}

test('connected startup checks Google authentication before staff or CRM reads and fails closed', async () => {
  const calls = [];
  const provider = {
    checkAuth: async () => { calls.push('auth'); return { authenticated: false }; },
    getStaff: async () => { calls.push('staff'); return [{ id: 'staff-1' }]; },
    setCurrentUser: user => calls.push(user ? 'user' : 'clear')
  };
  const context = frontendContext(provider);
  const app = new context.AppForTest();
  await assert.rejects(app.resolveUserIdentity(), /dostępu|tożsamości/i);
  assert.equal(app.state.currentUser, null);
  assert.equal(calls.includes('staff'), false);
  assert.equal(calls.includes('user'), false);
});

test('connected identity comes from server even if session storage claims admin', async () => {
  const user = { id: 'staff-5', name: 'Reader', permissions: ['read'] };
  const provider = { checkAuth: async () => ({ authenticated: true, user }), setCurrentUser: value => { provider.currentUser = value; } };
  const app = new (frontendContext(provider).AppForTest)();
  await app.resolveUserIdentity();
  assert.equal(app.state.currentUser, user);
  assert.equal(provider.currentUser, user);
});

test('failed connected initialization starts no views, subscriptions or polling', async () => {
  for (const checkAuth of [async () => ({ authenticated: false }), async () => { throw new Error('Network failure'); }]) {
    const provider = { checkAuth, setCurrentUser() {}, getStaff: () => assert.fail('Staff read before authorization'), subscribe: () => assert.fail('Subscription before authorization') };
    const app = new (frontendContext(provider).AppForTest)();
    app.startAutoRefreshPolling = () => assert.fail('Polling before authorization');
    await app.init();
    assert.equal(app.state.currentUser, null);
    assert.equal(app.currentViewInstance, null);
  }
});

test('demo identity and profile selection remain independent of Google authentication', async () => {
  const user = { id: 'demo-user' };
  const provider = { getStaff: async () => [user] };
  const app = new (frontendContext(provider).AppForTest)();
  app.mode = 'demo';
  await app.resolveUserIdentity();
  assert.equal(app.state.currentUser, user);
});

test('connected profile cannot open the demo impersonation dialog', () => {
  const context = vm.createContext({});
  const source = fs.readFileSync(path.join(root, 'manager/js/components/topbar.js'), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export class Topbar', 'class Topbar');
  vm.runInContext(source + '\nthis.TopbarForTest = Topbar;', context);
  const topbar = Object.create(context.TopbarForTest.prototype);
  topbar.state = { mode: 'connected' };
  Object.defineProperty(topbar, 'staffList', { get: () => { throw new Error('Impersonation list accessed'); } });
  assert.doesNotThrow(() => topbar.showStaffSwitchModal());
});

function migrationContext(names) {
  const context = accessContext('wsb.student.tester@gmail.com');
  const makeTrigger = name => ({ getHandlerFunction: () => name, getTriggerSourceId: () => 'crm-sheet' });
  let triggers = names.map(makeTrigger);
  const mutations = [];
  context.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
  context.ScriptApp = {
    getProjectTriggers: () => triggers.slice(),
    deleteTrigger: trigger => { mutations.push('delete:' + trigger.getHandlerFunction()); triggers = triggers.filter(item => item !== trigger); }
  };
  context.getSmartCareSpreadsheet_ = () => ({ getId: () => 'crm-sheet' });
  const install = name => {
    if (!triggers.some(trigger => trigger.getHandlerFunction() === name)) {
      mutations.push('install:' + name);
      triggers.push(makeTrigger(name));
    }
  };
  context.installFormSubmitTrigger_ = () => install('handleNewTicketSubmit_');
  context.installScheduledQueueTrigger_ = () => install('scheduledQueueAndReconcile_');
  return { context, mutations, names: () => triggers.map(trigger => trigger.getHandlerFunction()) };
}

test('trigger migration creates replacements before removing legacy handlers and is idempotent', () => {
  const state = migrationContext(['handleNewTicketSubmit', 'scheduledQueueAndReconcile', 'unrelatedJob']);
  assert.equal(state.context.migrateSmartCareTriggers().removedLegacyTriggers, 2);
  assert.deepEqual(state.mutations.slice(0, 2), ['install:handleNewTicketSubmit_', 'install:scheduledQueueAndReconcile_']);
  assert.deepEqual(state.names().sort(), ['handleNewTicketSubmit_', 'scheduledQueueAndReconcile_', 'unrelatedJob'].sort());
  assert.equal(state.context.migrateSmartCareTriggers().removedLegacyTriggers, 0);
  assert.equal(state.mutations.length, 4);
});

test('trigger migration refuses unsupported schedules or unauthorized callers without mutations', () => {
  const manual = migrationContext(['processAiAnalysisQueue', 'handleNewTicketSubmit']);
  assert.throws(() => manual.context.migrateSmartCareTriggers(), /harmonogram/);
  assert.deepEqual(manual.mutations, []);
  const outsider = migrationContext(['handleNewTicketSubmit']);
  outsider.context.Session.getActiveUser = () => ({ getEmail: () => 'outsider@gmail.com' });
  assert.throws(() => outsider.context.migrateSmartCareTriggers(), /ACCESS_DENIED/);
  assert.deepEqual(outsider.mutations, []);
});
