/**
 * Server-side access control. Identity is supplied ONLY by Google's active
 * session. Never authorize with getEffectiveUser(), a PIN, token or operator
 * object supplied by the browser.
 *
 * Optional Script Property SMARTCARE_STAFF_EMAILS is a complete JSON mapping
 * from existing staff IDs to real Google account email addresses. For example:
 * {"staff-1":"real-admin@gmail.com","staff-5":"real-reader@gmail.com"}
 * If absent, only the existing dedicated tester account is enabled.
 * An invalid configuration denies access; no fallback is used for bad JSON.
 */
function getSmartCareStaff_() {
  const denied = () => { throw new Error('ACCESS_DENIED: Brak dostępu do SmartCare.'); };
  let mapping;
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('SMARTCARE_STAFF_EMAILS');
    mapping = raw === null || raw === undefined
      ? { 'staff-1': 'wsb.student.tester@gmail.com' }
      : JSON.parse(raw);
  } catch (_) {
    denied();
  }
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping) || !Object.keys(mapping).length) denied();

  const seen = new Set();
  return Object.keys(mapping).map(id => {
    const member = SMARTCARE_TEAM_MEMBERS.find(item => item.id === id);
    const email = typeof mapping[id] === 'string' ? mapping[id].trim().toLowerCase() : '';
    if (!member || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /@(?:[^@]*\.)?example\.(?:com|net|org)$/.test(email) || seen.has(email)) denied();
    seen.add(email);
    return { id: member.id, name: member.name, role: member.role, email: email,
      active: member.active === true, permissions: Array.isArray(member.permissions) ? member.permissions.slice() : [] };
  }).filter(member => member.active);
}

function requireSmartCarePermission_(permission) {
  let email = '';
  try {
    email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  } catch (_) {}
  // Blank identity is expected for some execute-as-owner deployments. Deny it.
  if (!email) throw new Error('ACCESS_DENIED: Nie można potwierdzić tożsamości Google.');
  const member = getSmartCareStaff_().find(item => item.email === email);
  if (!member || !member.permissions.includes(permission)) {
    throw new Error('ACCESS_DENIED: Brak dostępu do tej operacji SmartCare.');
  }
  return member;
}

/**
 * Explicit one-time migration, run by an authorized administrator in the editor
 * after uploading the private trigger implementations. Never invoked on load.
 * Creates replacements before removing legacy handlers; repeat runs are safe.
 */
function migrateSmartCareTriggers() {
  requireSmartCarePermission_('admin');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const before = ScriptApp.getProjectTriggers();
    const unsupported = before.filter(trigger => ['processAiAnalysisQueue', 'checkOverdueTicketsAndNotify'].includes(trigger.getHandlerFunction()));
    if (unsupported.length) {
      throw new Error('Zachowano istniejące wyzwalacze. Przenieś ręcznie wyzwalacze processAiAnalysisQueue / checkOverdueTicketsAndNotify na nazwy z końcowym _, zachowując ich harmonogram, i ponów migrację.');
    }
    const spreadsheet = getSmartCareSpreadsheet_();
    if (!spreadsheet) throw new Error('Brak skonfigurowanego arkusza SmartCare.');
    installFormSubmitTrigger_(spreadsheet);
    installScheduledQueueTrigger_(spreadsheet);
    const installed = ScriptApp.getProjectTriggers();
    if (!installed.some(t => t.getHandlerFunction() === 'handleNewTicketSubmit_') ||
        !installed.some(t => t.getHandlerFunction() === 'scheduledQueueAndReconcile_')) {
      throw new Error('Nie potwierdzono nowych wyzwalaczy. Stare wyzwalacze pozostawiono bez zmian.');
    }
    let removed = 0;
    before.forEach(trigger => {
      const name = trigger.getHandlerFunction();
      if (name === 'scheduledQueueAndReconcile' ||
          (name === 'handleNewTicketSubmit' && trigger.getTriggerSourceId() === spreadsheet.getId())) {
        ScriptApp.deleteTrigger(trigger);
        removed++;
      }
    });
    return { success: true, removedLegacyTriggers: removed };
  } finally {
    lock.releaseLock();
  }
}
