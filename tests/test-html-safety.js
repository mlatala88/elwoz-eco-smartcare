const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const attack = `"'><img src=x onerror=alert(1)></textarea><svg onload=alert(2)> &`;
const fields = ['id', 'timestamp', 'city', 'street', 'houseNumber', 'type', 'fraction', 'priority', 'status', 'assignee', 'nextAction', 'nextActionDeadline', 'aiState', 'applicantName', 'applicantPhone', 'applicantEmail', 'contactRequest', 'slaDeadline', 'satisfactionScore', 'description', 'incidentDate', 'aiSummary', 'aiMissingInfo', 'contradictions', 'suggestedPriority', 'priorityRationale', 'aiSuggestedAction', 'aiDraftReply', 'resolutionMethod', 'employeeNote'];
const ticket = Object.fromEntries(fields.map(field => [field, attack]));
const comm = Object.fromEntries(['id', 'ticketId', 'timestamp', 'actionType', 'channel', 'recipient', 'subject', 'content', 'author', 'status'].map(field => [field, attack]));
function element() {
  const children = new Map();
  return { innerHTML: '', style: {}, querySelector(selector) { if (!children.has(selector)) children.set(selector, element()); return children.get(selector); }, querySelectorAll: () => [] };
}
function load(file, name, bindings = {}) {
  const context = vm.createContext({ window: {}, console, ...bindings });
  const helper = path.join(root, 'manager/js/components/escapeHtml.js');
  if (fs.existsSync(helper)) vm.runInContext(fs.readFileSync(helper, 'utf8').replace(/export /g, ''), context);
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export class ', 'class ').replace('import("../components/modal.js")', 'Promise.resolve({Modal: MockModal})');
  vm.runInContext(source + `\nthis.View = ${name};`, context);
  return context.View;
}
function safe(html) {
  assert.equal(/<img\b|<svg\b|"'><|<\/textarea><svg/i.test(html), false, 'Untrusted HTML must not become elements or attributes');
  assert.match(html, /&lt;img/);
  assert.match(html, /&quot;/);
}

test('ticket detail renders malicious text, attributes and textarea content as text without mutating records', async () => {
  const Detail = load('manager/js/views/detailView.js', 'DetailView');
  const container = element();
  const provider = { getTicketById: async () => ticket, getStaff: async () => [{ name: attack, role: attack }], getCommunications: async () => [comm], getTickets: async () => [ticket] };
  const view = new Detail(container, {}, provider, {});
  view.bindEvents = () => {};
  await view.render({ id: attack });
  safe(container.innerHTML);
  assert.equal(ticket.description, attack);
  assert.equal(ticket.aiDraftReply, attack);
  assert.equal((container.innerHTML.match(/<\/textarea>/g) || []).length, 4);
});

test('ticket table escapes every displayed column including data attributes and title', () => {
  const Tickets = load('manager/js/views/ticketsView.js', 'TicketsView');
  const container = element();
  const view = new Tickets(container, {}, {}, {});
  view.visibleColumns = new Set(view.columnDefs.map(column => column.id));
  view.renderTableBody([ticket]);
  safe(container.querySelector('#tickets-table-body').innerHTML);
});

test('communication table and notifications escape stored message and location fields', async () => {
  const Comms = load('manager/js/views/commsView.js', 'CommsView');
  const container = element();
  const view = new Comms(container, {}, { getCommunications: async () => [comm] }, {});
  await view.loadComms();
  safe(container.querySelector('#comms-table-body').innerHTML);
  const Topbar = load('manager/js/components/topbar.js', 'Topbar');
  const topbar = Object.create(Topbar.prototype);
  topbar.container = element();
  topbar.dataProvider = { getTickets: async () => [{ ...ticket, priority: 'PILNY' }] };
  await topbar.loadNotifications();
  safe(topbar.container.querySelector('#notif-list').innerHTML);
});

test('URL search and filter badge values cannot escape quoted attributes or inject HTML', async () => {
  const Tickets = load('manager/js/views/ticketsView.js', 'TicketsView');
  const container = element();
  const view = new Tickets(container, {}, { getStaff: async () => [], getTickets: async () => [] }, {});
  view.bindEvents = () => {};
  await view.render({ search: attack, metricKey: attack, from: attack, to: attack });
  safe(container.innerHTML);
  safe(container.querySelector('#active-metric-badge').innerHTML);
});

test('full message preview escapes content while passing a plain text title to Modal', async () => {
  let options;
  class MockModal { constructor(value) { options = value; this.element = element(); } open() {} }
  const Comms = load('manager/js/views/commsView.js', 'CommsView', { MockModal });
  new Comms(element(), {}, {}, {}).showFullMessageModal(comm);
  await Promise.resolve();
  safe(options.content);
  assert.equal(options.title, `Podgląd korespondencji – ${attack}`);
});

test('task queue and dashboard cards escape imported ticket and statistic fields', async () => {
  const Tasks = load('manager/js/views/tasksView.js', 'TasksView');
  const container = element();
  const view = new Tasks(container, {}, { getTickets: async () => [{ ...ticket, status: 'Nowe', responsibleSide: attack }] }, {});
  view.filterOnlyMine = false;
  await view.loadTasks();
  safe(container.querySelector('#tasks-table-body').innerHTML);
  const Dashboard = load('manager/js/views/dashboardView.js', 'DashboardView');
  const dashboard = new Dashboard(container, {}, {}, {});
  dashboard.renderTopUrgent([ticket]);
  safe(container.querySelector('#top-urgent-tbody').innerHTML);
  dashboard.renderKpis({ total: attack });
  safe(container.querySelector('#kpi-grid').innerHTML);
});

test('settings renders stored settings, staff and endpoint as attribute-safe text', async () => {
  const Settings = load('manager/js/views/settingsView.js', 'SettingsView', { localStorage: { getItem: () => attack } });
  const container = element();
  const settings = Object.fromEntries(['companyName', 'branch', 'email', 'phone', 'workingHours', 'googleReviewUrl'].map(key => [key, attack]));
  const view = new Settings(container, {}, { getSettings: async () => settings, getStaff: async () => [{ name: attack, role: attack, email: attack }] }, {});
  view.bindEvents = () => {};
  await view.render();
  safe(container.innerHTML);
  assert.equal(settings.companyName, attack);
});

test('reports and satisfaction views escape category names, employee fields and citizen feedback', async () => {
  const Reports = load('manager/js/views/reportsView.js', 'ReportsView');
  const container = element();
  const stats = { categoryMap: { [attack]: 1 }, csatDistribution: {}, feedbackCount: 1, total: 1, newCount: attack };
  const provider = { getStats: async () => stats, getTickets: async () => [{ ...ticket, satisfactionScore: 1, citizenFeedback: attack }], getStaff: async () => [{ name: attack, role: attack }] };
  const reports = new Reports(container, {}, provider, {});
  await reports.loadReportData();
  safe(container.querySelector('#rep-kpi-grid').innerHTML);
  safe(container.querySelector('#rep-staff-tbody').innerHTML);
  safe(container.querySelector('#rep-cat-tbody').innerHTML);
  const Csat = load('manager/js/views/csatView.js', 'CsatView');
  await new Csat(container, {}, provider, {}).loadCsatData();
  safe(container.querySelector('#low-csat-list').innerHTML);
  safe(container.querySelector('#csat-comments-tbody').innerHTML);
});
