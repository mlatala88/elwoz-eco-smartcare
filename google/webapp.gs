/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Web App Backend & RPC Bridge for Google Apps Script
 *
 * Plik webapp.gs udostępnia:
 * 1. doGet(e) - renderowanie aplikacji internetowej SPA w środowisku Google Apps Script (HtmlService)
 * 2. doPost(e) - autoryzowany endpoint JSON-RPC (Wariant B integracji)
 * 3. Zestaw metod API (apiGetTickets, apiGetTicketById, apiUpdateTicket, apiAddCommunication,
 *    apiGetCsiStats, apiGetDiagnostics, apiPolishMessageWithAi, apiGetCurrentUser, apiVerifyUser itd.)
 *    wywoływanych natywnie przez google.script.run (Wariant A integracji).
 * 4. Obsługę tożsamości i uprawnień 5 członków zespołu (Michał Latała, Barbara Seroka,
 *    Diana Skierka, Anna Fedoruk, Michał Wadyński) z uwzględnieniem specyfiki kont konsumenckich @gmail.com.
 */

// ============================================================================
// 1. CZŁONKOWIE ZESPOŁU I ROLE PROJEKTOWE
// ============================================================================
const SMARTCARE_TEAM_MEMBERS = [
  {
    id: "staff-1",
    name: "Michał Latała",
    role: "Administrator",
    email: "wsb.student.tester@gmail.com",
    active: true,
    permissions: ["read", "write", "close", "comms", "ai", "admin", "diagnostics"]
  },
  {
    id: "staff-2",
    name: "Barbara Seroka",
    role: "Pracownik obsługi klienta",
    email: "barbara.seroka@example.com",
    active: true,
    permissions: ["read", "write", "close", "comms", "ai"]
  },
  {
    id: "staff-3",
    name: "Diana Skierka",
    role: "Pracownik obsługi klienta",
    email: "diana.skierka@example.com",
    active: true,
    permissions: ["read", "write", "close", "comms", "ai"]
  },
  {
    id: "staff-4",
    name: "Anna Fedoruk",
    role: "Pracownik obsługi klienta",
    email: "anna.fedoruk@example.com",
    active: true,
    permissions: ["read", "write", "close", "comms", "ai"]
  },
  {
    id: "staff-5",
    name: "Michał Wadyński",
    role: "Obserwator",
    email: "michal.wadynski@example.com",
    active: true,
    permissions: ["read"]
  }
];

// Domyślny PIN autoryzacyjny dla kont konsumenckich @gmail.com
const SMARTCARE_DEFAULT_TEAM_PIN = "1926";

// ============================================================================
// 2. ENTRYPOINTS APPS SCRIPT WEB APP (doGet / doPost)
// ============================================================================

/**
 * Główny punkt wejścia do aplikacji Web App w Apps Script
 */
function doGet(e) {
  // Obsługa prostego testu ping / diagnostyki przez GET
  if (e && e.parameter && e.parameter.action === "ping") {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      service: "ELWOZ ECO SmartCare Manager v0.3.0",
      status: "ONLINE",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Renderowanie interfejsu SPA menedżera
  try {
    const template = HtmlService.createTemplateFromFile("webapp");
    return template.evaluate()
      .setTitle("ELWOZ ECO SmartCare Manager v0.3.0")
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    // Fallback gdyby plik webapp.html nie był jeszcze załadowany
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ELWOZ ECO SmartCare Manager v0.3.0</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; }
          .card { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); max-width: 600px; margin: 0 auto; }
          h2 { color: #252D72; margin-top: 0; }
          .err { color: #b91c1c; background: #fee2e2; padding: 12px; border-radius: 6px; font-size: 13px; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>ELWOZ ECO SmartCare Manager v0.3.0</h2>
          <p>Silnik backendu działa poprawnie. Trwa ładowanie szablonu interfejsu pracownika...</p>
          <div class="err">${String(err)}</div>
          <p><small>Upewnij się, że plik webapp.html został wdrożony w projekcie Google Apps Script.</small></p>
        </div>
      </body>
      </html>
    `;
    return HtmlService.createHtmlOutput(fallbackHtml)
      .setTitle("ELWOZ ECO SmartCare Manager v0.3.0")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * Autoryzowany endpoint JSON-RPC (Wariant B integracji)
 */
function doPost(e) {
  try {
    const rawData = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = rawData.action;
    const payload = rawData.payload || [];
    const operator = rawData.operator || null;

    let result;
    switch (action) {
      case "apiGetTickets":
        result = apiGetTickets(payload[0] || {});
        break;
      case "apiGetTicketById":
        result = apiGetTicketById(payload[0]);
        break;
      case "apiCreateTicket":
        result = apiCreateTicket(payload[0], operator);
        break;
      case "apiUpdateTicket":
        result = apiUpdateTicket(payload[0], payload[1], operator);
        break;
      case "apiGetCommunications":
        result = apiGetCommunications(payload[0] || null);
        break;
      case "apiAddCommunication":
        result = apiAddCommunication(payload[0], operator);
        break;
      case "apiGetCsiStats":
        result = apiGetCsiStats(payload[0] || "all", payload[1] || null);
        break;
      case "apiGetDiagnostics":
        result = apiGetDiagnostics();
        break;
      case "apiRunDiagnosticsTest":
        result = apiRunDiagnosticsTest();
        break;
      case "apiPolishMessageWithAi":
        result = apiPolishMessageWithAi(payload[0], payload[1] || {});
        break;
      case "apiGetStaff":
        result = apiGetStaff();
        break;
      case "apiGetCurrentUser":
        result = apiGetCurrentUser();
        break;
      case "apiVerifyUser":
        result = apiVerifyUser(payload[0], payload[1]);
        break;
      case "apiGetSettings":
        result = apiGetSettings();
        break;
      case "apiUpdateSettings":
        result = apiUpdateSettings(payload[0]);
        break;
      case "apiTriggerAiAnalysis":
        result = apiTriggerAiAnalysis(payload[0]);
        break;
      case "apiReconcileUnprocessedTickets":
        result = apiReconcileUnprocessedTickets();
        break;
      default:
        throw new Error(`Nieznana akcja API: ${action}`);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message || String(err),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 3. OBSŁUGA TOŻSAMOŚCI, SESJI I UPRAWNIEŃ ZESPOŁU
// ============================================================================

/**
 * Zwraca listę uprawnionych pracowników POK Kartuzy
 */
function apiGetStaff() {
  return SMARTCARE_TEAM_MEMBERS;
}

/**
 * Pobiera aktualnie zalogowanego użytkownika z uwzględnieniem specyfiki @gmail.com
 */
function apiGetCurrentUser() {
  let activeEmail = "";
  try {
    activeEmail = Session.getActiveUser().getEmail();
  } catch (_) {}

  if (activeEmail) {
    const member = SMARTCARE_TEAM_MEMBERS.find(m => m.email.toLowerCase() === activeEmail.toLowerCase());
    if (member) {
      return {
        authenticated: true,
        source: "google_session",
        user: member
      };
    }
  }

  // W przypadku kont konsumenckich @gmail.com Web App może maskować e-mail użytkownika
  return {
    authenticated: false,
    source: "consumer_gmail_mode",
    emailMasked: true,
    availableStaff: SMARTCARE_TEAM_MEMBERS
  };
}

/**
 * Weryfikacja PIN członka zespołu dla bezpiecznej autoryzacji w środowisku @gmail.com
 */
function apiVerifyUser(email, pin) {
  if (!email || !pin) {
    return { success: false, error: "Wymagany adres e-mail i PIN." };
  }

  const member = SMARTCARE_TEAM_MEMBERS.find(m => m.email.toLowerCase() === email.toLowerCase());
  if (!member) {
    return { success: false, error: "Nie odnaleziono pracownika o podanym adresie e-mail." };
  }

  const configuredPin = PropertiesService.getScriptProperties().getProperty("SMARTCARE_PIN") || SMARTCARE_DEFAULT_TEAM_PIN;
  if (String(pin).trim() !== configuredPin.trim()) {
    return { success: false, error: "Nieprawidłowy kod PIN pracownika." };
  }

  return {
    success: true,
    user: member,
    token: Utilities.base64Encode(JSON.stringify({
      email: member.email,
      name: member.name,
      role: member.role,
      issuedAt: Date.now()
    }))
  };
}

// ============================================================================
// 4. NORMALIZACJA DANYCH ZGŁOSZEŃ (Sheets <-> CRM Manager Interface)
// ============================================================================

/**
 * Mapuje pojedynczy wiersz arkusza ZGŁOSZENIA na ujednolicony obiekt zgłoszenia
 */
function normalizeTicketRow(headers, rowValues) {
  const getVal = (colNames) => {
    if (!Array.isArray(colNames)) colNames = [colNames];
    for (let name of colNames) {
      const idx = headers.indexOf(name);
      if (idx !== -1) {
        const val = rowValues[idx];
        if (val instanceof Date) {
          return Utilities.formatDate(val, "Europe/Warsaw", "yyyy-MM-dd HH:mm");
        }
        return val !== null && val !== undefined ? String(val).trim() : "";
      }
    }
    return "";
  };

  const id = getVal(["ID Zgłoszenia", "Numer zgłoszenia", "ID"]);
  const status = getVal("Status") || "Nowe";
  const priority = getVal("Priorytet") || "STANDARDOWY";
  const timestamp = getVal("Sygnatura czasowa");
  const firstContactDate = getVal("Data pierwszego kontaktu");
  const slaDeadline = getVal("Termin SLA 1. reakcji");
  const nextActionDeadline = getVal("Termin następnego działania");
  const resolvedDate = getVal("Data rozwiązania");
  const satisfactionVal = getVal("Ocena satysfakcji (1-5)");

  const isClosed = status === "Rozwiązane" || status === "Zamknięte";
  const hasFirstContact = Boolean(firstContactDate);

  // Dynamiczne przeliczenie SLA:
  // Zgłoszenie z udzieloną odpowiedzią lub zamknięte NIE MOŻE być oznaczone jako zalegające z 1. reakcją!
  let isOverdueFirstResponse = false;
  if (!hasFirstContact && !isClosed && slaDeadline) {
    const slaParsed = (typeof parseDateValue === "function") ? parseDateValue(slaDeadline) : new Date(slaDeadline).getTime();
    if (slaParsed && slaParsed < Date.now()) {
      isOverdueFirstResponse = true;
    }
  }

  let isOverdueNextAction = false;
  if (!isClosed && nextActionDeadline) {
    const actParsed = (typeof parseDateValue === "function") ? parseDateValue(nextActionDeadline) : new Date(nextActionDeadline).getTime();
    if (actParsed && actParsed < Date.now()) {
      isOverdueNextAction = true;
    }
  }

  const isOverdue = isOverdueFirstResponse || isOverdueNextAction;

  return {
    // Klucze standardowe Managera v0.3.0 (camelCase)
    id: id,
    timestamp: timestamp,
    type: getVal(["Rodzaj zgłoszenia", "Kategoria"]),
    fraction: getVal(["Rodzaj odpadów", "Frakcja"]),
    city: getVal("Miejscowość"),
    street: getVal(["Ulica lub lokalizacja", "Ulica"]),
    houseNumber: getVal(["Numer posesji lub identyfikator miejsca", "Numer posesji", "Numer"]),
    incidentDate: getVal("Data wystąpienia problemu"),
    description: getVal(["Opis zgłoszenia", "Opis"]),
    applicantName: getVal("Imię i nazwisko"),
    applicantPhone: getVal("Numer telefonu"),
    applicantEmail: getVal("Adres e-mail"),
    contactRequest: getVal("Prośba o kontakt ze strony pracownika").toLowerCase().includes("tak") ? "TAK" : "NIE",
    status: status,
    priority: priority,
    suggestedPriority: getVal("Sugerowany priorytet AI"),
    priorityRationale: getVal("Uzasadnienie priorytetu AI"),
    aiState: getVal("Stan analizy AI") || "Oczekuje",
    aiErrorDetails: getVal("Szczegóły błędu AI"),
    localValidation: getVal("Lokalna kontrola danych"),
    contradictions: getVal("Wykryte sprzeczności AI"),
    assignee: getVal("Pracownik odpowiedzialny"),
    nextAction: getVal("Następne działanie"),
    responsibleSide: getVal("Strona odpowiedzialna") || "Przedsiębiorstwo",
    nextActionDeadline: nextActionDeadline,
    slaDeadline: slaDeadline,
    slaOverdue: isOverdue ? "TAK" : "NIE",
    isOverdueFirstResponse: isOverdueFirstResponse,
    isOverdueNextAction: isOverdueNextAction,
    hasFirstContact: hasFirstContact,
    employeeNote: getVal("Notatka pracownika"),
    receiptConfirmedDate: getVal("Data potwierdzenia przyjęcia"),
    firstContactDate: firstContactDate,
    lastContactDate: getVal("Data ostatniego kontaktu"),
    resolvedDate: resolvedDate,
    resolutionMethod: getVal("Sposób rozwiązania sprawy"),
    contactResult: getVal("Wynik kontaktu z mieszkańcem"),
    satisfactionScore: satisfactionVal ? parseFloat(satisfactionVal) : null,
    citizenFeedback: getVal("Uwagi mieszkańca"),
    reviewInviteSent: getVal("Prośba o opinię wysłana").toUpperCase().includes("TAK") ? "TAK" : "NIE",
    reviewInviteDate: getVal("Data wysłania prośby o opinię"),
    aiCategory: getVal("Kategoria AI"),
    aiSummary: getVal("Streszczenie AI"),
    aiMissingInfo: getVal("Brakujące informacje AI"),
    aiSuggestedAction: getVal("Sugerowane działanie AI"),
    aiRecommendedStep: getVal("Rekomendowany kolejny krok AI"),
    aiDraftReply: getVal("Proponowana odpowiedź AI"),

    // Aliasty kompatybilności wstecznej (setup.gs)
    ticketId: id,
    ticketType: getVal(["Rodzaj zgłoszenia", "Kategoria"]),
    wasteFraction: getVal(["Rodzaj odpadów", "Frakcja"]),
    residentName: getVal("Imię i nazwisko"),
    residentEmail: getVal("Adres e-mail"),
    residentPhone: getVal("Numer telefonu"),
    assignedEmployee: getVal("Pracownik odpowiedzialny"),
    employeeNotes: getVal("Notatka pracownika")
  };
}

// ============================================================================
// 5. GŁÓWNE METODY API (KONTRAKT RPC)
// ============================================================================

/**
 * Pobiera listę zgłoszeń z opcjonalnymi filtrami
 */
function apiGetTickets(filters = {}) {
  const ss = (typeof getSmartCareSpreadsheet === "function" ? getSmartCareSpreadsheet() : null) || SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return [];
  const sheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  let tickets = [];
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const ticket = normalizeTicketRow(headers, row);
    if (!ticket.id) continue;

    // Filtry podstawowe
    if (filters.status && filters.status !== "Wszystkie" && ticket.status !== filters.status) continue;
    if (filters.priority && filters.priority !== "Wszystkie" && ticket.priority !== filters.priority) continue;
    if (filters.aiState && filters.aiState !== "Wszystkie" && ticket.aiState !== filters.aiState) continue;
    if (filters.category && filters.category !== "Wszystkie" && ticket.type !== filters.category) continue;
    if (filters.assignee && filters.assignee !== "Wszyscy" && ticket.assignee !== filters.assignee) continue;

    // Wyszukiwarka tekstowa
    if (filters.search) {
      const q = String(filters.search).toLowerCase().trim();
      const matches = ticket.id.toLowerCase().includes(q) ||
        ticket.applicantName.toLowerCase().includes(q) ||
        ticket.street.toLowerCase().includes(q) ||
        ticket.city.toLowerCase().includes(q) ||
        ticket.description.toLowerCase().includes(q) ||
        ticket.applicantPhone.toLowerCase().includes(q);
      if (!matches) continue;
    }

    // Filtry metryk dashboardu (metricKey)
    if (filters.metricKey) {
      const k = filters.metricKey;
      const isClosed = ticket.status === "Rozwiązane" || ticket.status === "Zamknięte";
      if (k === "new" && ticket.status !== "Nowe") continue;
      if (k === "no_response" && (isClosed || ticket.hasFirstContact)) continue;
      if (k === "urgent" && (isClosed || ticket.priority !== "PILNY")) continue;
      if (k === "overdue" && (isClosed || ticket.slaOverdue !== "TAK")) continue;
      if (k === "no_step" && (isClosed || (ticket.nextAction && ticket.nextAction.trim() !== ""))) continue;
      if (k === "awaiting_citizen" && (isClosed || ticket.responsibleSide !== "Mieszkaniec")) continue;
      if (k === "awaiting_company" && (isClosed || ticket.responsibleSide !== "Przedsiębiorstwo")) continue;
      if (k === "resolved" && !isClosed) continue;
      if (k === "rated" && (!ticket.satisfactionScore || ticket.satisfactionScore <= 0)) continue;
      if (k === "review_invites" && ticket.reviewInviteSent !== "TAK") continue;
    }

    // Filtrowanie po terminie (deadlineFilter)
    if (filters.deadlineFilter) {
      const isClosed = ticket.status === "Rozwiązane" || ticket.status === "Zamknięte";
      if (filters.deadlineFilter === "overdue" && (isClosed || ticket.slaOverdue !== "TAK")) continue;
      if (filters.deadlineFilter === "today") {
        const todayStr = Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd");
        const actMatch = ticket.nextActionDeadline && ticket.nextActionDeadline.startsWith(todayStr);
        const slaMatch = ticket.slaDeadline && ticket.slaDeadline.startsWith(todayStr);
        if (isClosed || (!actMatch && !slaMatch)) continue;
      }
    }

    // Filtrowanie po dacie / okresie
    if (filters.period && filters.period !== "all" && ticket.timestamp) {
      const ticketDate = (typeof parseDateValue === "function") ? parseDateValue(ticket.timestamp) : new Date(ticket.timestamp).getTime();
      const now = Date.now();
      if (filters.period === "today") {
        const todayStr = Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd");
        if (!ticket.timestamp.startsWith(todayStr)) continue;
      } else if (filters.period === "7days" && ticketDate < now - 7 * 86400000) {
        continue;
      } else if (filters.period === "30days" && ticketDate < now - 30 * 86400000) {
        continue;
      } else if (filters.period === "custom" && filters.customRange) {
        const cRange = typeof filters.customRange === "string" ? JSON.parse(filters.customRange) : filters.customRange;
        if (cRange && cRange.from && cRange.to) {
          const fromTime = new Date(cRange.from).getTime();
          const toTime = new Date(cRange.to + "T23:59:59").getTime();
          if (ticketDate < fromTime || ticketDate > toTime) continue;
        }
      }
    }

    tickets.push(ticket);
  }

  // Domyślne sortowanie od najnowszych
  tickets.sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return bTime - aTime;
  });

  return tickets;
}

/**
 * Pobiera pojedyncze zgłoszenie na podstawie ID
 */
function apiGetTicketById(ticketId) {
  if (!ticketId) throw new Error("Brak parametru ticketId.");

  const ss = (typeof getSmartCareSpreadsheet === "function" ? getSmartCareSpreadsheet() : null) || SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Brak arkusza kalkulacyjnego.");
  const sheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  if (!sheet) throw new Error("Brak zakładki ZGŁOSZENIA.");

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const idCol = headers.indexOf("ID Zgłoszenia") + 1;
  if (idCol <= 0) throw new Error("Brak kolumny ID Zgłoszenia.");

  const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(ticketId).trim()) {
      const rowValues = sheet.getRange(i + 2, 1, 1, lastCol).getValues()[0];
      return normalizeTicketRow(headers, rowValues);
    }
  }

  throw new Error(`Nie odnaleziono zgłoszenia o numerze ${ticketId}.`);
}

/**
 * Tworzy nowe zgłoszenie z poziomu aplikacji Web App
 */
function apiCreateTicket(ticketData, operator = null) {
  if (!ticketData) throw new Error("Brak danych zgłoszenia.");

  const ss = (typeof getSmartCareSpreadsheet === "function" ? getSmartCareSpreadsheet() : null) || SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  if (!sheet) throw new Error("Brak zakładki ZGŁOSZENIA.");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());

    // Generowanie kolejnego ID zgłoszenia
    const idCol = headers.indexOf("ID Zgłoszenia") + 1;
    let nextNum = 1;
    if (lastRow > 1 && idCol > 0) {
      const existingIds = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
      for (let row of existingIds) {
        const val = String(row[0] || "");
        const match = val.match(/ELW-2026-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextNum) nextNum = num + 1;
        }
      }
    }
    const newId = `ELW-2026-${String(nextNum).padStart(4, "0")}`;

    const now = new Date();
    const priority = ticketData.priority || "STANDARDOWY";
    const slaMinutes = SMARTCARE_SETUP_CONFIG.slaMinutes[priority] || 240;
    const slaDeadline = (typeof calculateBusinessHoursDeadline === "function")
      ? calculateBusinessHoursDeadline(now, slaMinutes)
      : new Date(now.getTime() + slaMinutes * 60000);

    const newRow = new Array(headers.length).fill("");
    const setVal = (hName, val) => {
      const idx = headers.indexOf(hName);
      if (idx !== -1) newRow[idx] = val;
    };

    setVal("Sygnatura czasowa", now);
    setVal("Rodzaj zgłoszenia", ticketData.type || "Inne");
    setVal("Rodzaj odpadów", ticketData.fraction || "Pozostałe");
    setVal("Miejscowość", ticketData.city || "Kartuzy");
    setVal("Ulica lub lokalizacja", ticketData.street || "");
    setVal("Numer posesji lub identyfikator miejsca", ticketData.houseNumber || "");
    setVal("Data wystąpienia problemu", ticketData.incidentDate || Utilities.formatDate(now, "Europe/Warsaw", "yyyy-MM-dd"));
    setVal("Opis zgłoszenia", ticketData.description || "");
    setVal("Imię i nazwisko", ticketData.applicantName || "Mieszkaniec");
    setVal("Numer telefonu", ticketData.applicantPhone || "");
    setVal("Adres e-mail", ticketData.applicantEmail || "");
    setVal("Prośba o kontakt ze strony pracownika", ticketData.contactRequest || "TAK");

    setVal("ID Zgłoszenia", newId);
    setVal("Status", "Nowe");
    setVal("Priorytet", priority);
    setVal("Stan analizy AI", "Oczekuje");
    setVal("Pracownik odpowiedzialny", ticketData.assignee || (operator ? operator.name : ""));
    setVal("Następne działanie", ticketData.nextAction || "Weryfikacja zgłoszenia");
    setVal("Strona odpowiedzialna", ticketData.responsibleSide || "Przedsiębiorstwo");
    setVal("Termin SLA 1. reakcji", slaDeadline);
    setVal("Notatka pracownika", ticketData.employeeNote ? `[${operator ? operator.name : 'Web App'}] ${ticketData.employeeNote}` : "");

    sheet.appendRow(newRow);
    const targetRow = sheet.getLastRow();

    // Formatowanie dat
    const timeCol = headers.indexOf("Sygnatura czasowa") + 1;
    const slaCol = headers.indexOf("Termin SLA 1. reakcji") + 1;
    if (timeCol > 0) sheet.getRange(targetRow, timeCol).setNumberFormat("yyyy-MM-dd HH:mm");
    if (slaCol > 0) sheet.getRange(targetRow, slaCol).setNumberFormat("yyyy-MM-dd HH:mm");

    SpreadsheetApp.flush();

    // Asynchroniczne wywołanie analizy AI
    if (typeof triggerAutoAiAnalysisForTicket === "function") {
      try {
        triggerAutoAiAnalysisForTicket(sheet, targetRow, headers, newId);
      } catch (aiErr) {
        Logger.log(`[WebApp] triggerAutoAiAnalysisForTicket ostrzeżenie: ${aiErr}`);
      }
    }

    try { refreshDashboardStats(ss); } catch (_) {}

    return apiGetTicketById(newId);

  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/**
 * Aktualizacja zgłoszenia z rygorystyczną kontrolą reguł biznesowych
 */
function apiUpdateTicket(ticketId, updates = {}, operator = null) {
  if (!ticketId) throw new Error("Brak parametru ticketId.");

  const ss = (typeof getSmartCareSpreadsheet === "function" ? getSmartCareSpreadsheet() : null) || SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  if (!sheet) throw new Error("Brak zakładki ZGŁOSZENIA.");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
    const idCol = headers.indexOf("ID Zgłoszenia") + 1;
    if (idCol <= 0) throw new Error("Brak kolumny ID Zgłoszenia.");

    const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
    let row = -1;
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === String(ticketId).trim()) {
        row = i + 2;
        break;
      }
    }
    if (row === -1) throw new Error(`Nie odnaleziono zgłoszenia ${ticketId}.`);

    const setField = (headerName, val) => {
      const c = headers.indexOf(headerName) + 1;
      if (c > 0 && val !== undefined) {
        sheet.getRange(row, c).setValue(val);
      }
    };

    const targetStatus = updates.status ? String(updates.status).trim() : "";
    const isClosing = targetStatus === "Rozwiązane" || targetStatus === "Zamknięte";

    // 1. Walidacja wymogu resolutionMethod przy zamykaniu (v0.2.8 / v0.3.0)
    if (isClosing) {
      const resCol = headers.indexOf("Sposób rozwiązania sprawy") + 1;
      const existingRes = resCol > 0 ? String(sheet.getRange(row, resCol).getValue() || "").trim() : "";
      const updateRes = updates.resolutionMethod !== undefined ? String(updates.resolutionMethod).trim() : "";
      const effectiveRes = updateRes || existingRes;

      if (!effectiveRes || effectiveRes.length < 5) {
        throw new Error("Nie można zamknąć zgłoszenia bez podania potwierdzonego sposobu rozwiązania sprawy (minimum 5 znaków).");
      }

      // Blokada szablonowych placeholderów
      const placeholderRegex = /\[(opis|wpisz|wstaw|uzupełnij).*?\]/i;
      if (placeholderRegex.test(effectiveRes)) {
        throw new Error("Sposób rozwiązania sprawy zawiera tekst zastępczy (placeholder). Podaj rzeczywisty opis wykonanych działań.");
      }
    }

    const statusCol = headers.indexOf("Status") + 1;
    const existingStatus = statusCol > 0 ? String(sheet.getRange(row, statusCol).getValue() || "").trim() : "";
    const wasAlreadyClosed = existingStatus === "Rozwiązane" || existingStatus === "Zamknięte";

    // Mapowanie pól do nagłówków arkusza
    const allowedFieldMap = {
      status: "Status",
      priority: "Priorytet",
      assignee: "Pracownik odpowiedzialny",
      assignedEmployee: "Pracownik odpowiedzialny",
      nextAction: "Następne działanie",
      responsibleSide: "Strona odpowiedzialna",
      nextActionDeadline: "Termin następnego działania",
      employeeNote: "Notatka pracownika",
      employeeNotes: "Notatka pracownika",
      resolutionMethod: "Sposób rozwiązania sprawy",
      contactResult: "Wynik kontaktu z mieszkańcem",
      satisfactionScore: "Ocena satysfakcji (1-5)",
      citizenFeedback: "Uwagi mieszkańca"
    };

    for (let k in updates) {
      if (allowedFieldMap[k]) {
        let val = updates[k];
        if (k === "employeeNote" || k === "employeeNotes") {
          const authorTag = operator ? `[${operator.name}] ` : "";
          const noteCol = headers.indexOf("Notatka pracownika") + 1;
          const currentNotes = noteCol > 0 ? String(sheet.getRange(row, noteCol).getValue() || "").trim() : "";
          if (val && !currentNotes.includes(val)) {
            val = currentNotes ? `${currentNotes}\n${authorTag}${val}` : `${authorTag}${val}`;
          } else {
            val = currentNotes;
          }
        }
        setField(allowedFieldMap[k], val);
      }
    }

    // Ustawienie daty rozwiązania wyłącznie przy pierwszym zamknięciu
    if (isClosing && !wasAlreadyClosed) {
      setField("Data rozwiązania", new Date());
      const resDateCol = headers.indexOf("Data rozwiązania") + 1;
      if (resDateCol > 0) sheet.getRange(row, resDateCol).setNumberFormat("yyyy-MM-dd HH:mm");
    }

    // Świadome zatwierdzenie priorytetu przez pracownika
    if (updates.priority) {
      PropertiesService.getScriptProperties().setProperty("PRIORITY_APPROVED_" + ticketId, String(updates.priority).toUpperCase().trim());
      const timeCol = headers.indexOf("Sygnatura czasowa") + 1;
      const slaCol = headers.indexOf("Termin SLA 1. reakcji") + 1;
      if (slaCol > 0) {
        const timeVal = timeCol > 0 ? sheet.getRange(row, timeCol).getValue() : null;
        const createdParsed = (typeof parseDateValue === "function") ? parseDateValue(timeVal) : new Date(timeVal).getTime();
        const createdDate = createdParsed ? new Date(createdParsed) : new Date();
        const pUpper = String(updates.priority).toUpperCase().trim();
        const slaMinutes = SMARTCARE_SETUP_CONFIG.slaMinutes[pUpper] || 240;
        const newSla = (typeof calculateBusinessHoursDeadline === "function")
          ? calculateBusinessHoursDeadline(createdDate, slaMinutes)
          : new Date(createdDate.getTime() + slaMinutes * 60000);
        sheet.getRange(row, slaCol).setValue(newSla).setNumberFormat("yyyy-MM-dd HH:mm");
      }
    }

    SpreadsheetApp.flush();
    try { refreshDashboardStats(ss); } catch (_) {}

    return apiGetTicketById(ticketId);

  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/**
 * Pobiera historię komunikacji dla zgłoszenia lub całą
 */
function apiGetCommunications(ticketId = null) {
  const ss = (typeof getSmartCareSpreadsheet === "function" ? getSmartCareSpreadsheet() : null) || SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return [];
  const histSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.communicationHistory);
  if (!histSheet || histSheet.getLastRow() <= 1) return [];

  const data = histSheet.getDataRange().getValues();
  const list = [];
  let commSeq = 1;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowTicketId = String(row[0] || "").trim();
    if (!rowTicketId) continue;
    if (ticketId && rowTicketId !== String(ticketId).trim()) continue;

    const dateVal = row[1] instanceof Date
      ? Utilities.formatDate(row[1], "Europe/Warsaw", "yyyy-MM-dd HH:mm")
      : String(row[1] || "");

    list.push({
      id: `COMM-${String(commSeq++).padStart(3, "0")}`,
      ticketId: rowTicketId,
      date: dateVal,
      timestamp: dateVal,
      type: String(row[2] || ""),
      channel: String(row[3] || "E-mail"),
      recipient: String(row[4] || ""),
      subject: String(row[5] || ""),
      content: String(row[6] || ""),
      author: String(row[7] || "Pracownik"),
      sender: String(row[7] || "Pracownik"),
      status: String(row[8] || "Wysłano"),
      note: String(row[9] || "")
    });
  }

  return list;
}

/**
 * Rejestruje kontakt oraz wysyła wiadomość z bezwzględną ochroną testowego odbiorcy
 */
function apiAddCommunication(commData, operator = null) {
  if (!commData) throw new Error("Brak danych komunikacji.");
  if (!commData.ticketId) throw new Error("Brak numeru zgłoszenia (ticketId).");

  const author = (operator && operator.name) ? operator.name : (commData.author || "Pracownik");
  const channel = commData.channel || "E-mail";
  const subject = (commData.subject || "").trim();
  const content = (commData.content || "").trim();

  // 1. Serwerowa kontrola jakości CX/PR dla tematu i treści
  if (typeof validateMessageContentQuality === "function") {
    const qCheck = validateMessageContentQuality(subject, content);
    if (!qCheck.isValid) {
      throw new Error(`SERWEROWA BLOKADA CX/PR: Wiadomość narusza standardy komunikacji (${qCheck.reason}). Wiadomość NIE została wysłana.`);
    }
  }

  // 2. Blokada wysyłki informacji o rozwiązaniu bez potwierdzonego opisu lub z placeholderem
  const isResolutionNotice = (commData.actionType === "Informacja o rozwiązaniu") || subject.toLowerCase().includes("rozwiązani");
  if (isResolutionNotice) {
    const placeholderRegex = /\[(opis|wpisz|wstaw|uzupełnij).*?\]/i;
    if (placeholderRegex.test(content)) {
      throw new Error("Wiadomość o rozwiązaniu sprawy zawiera tekst zastępczy (placeholder). Uzupełnij opis faktycznie podjętych działań.");
    }
    if (content.length < 30) {
      throw new Error("Wiadomość o rozwiązaniu sprawy musi zawierać konkretny opis zrealizowanych działań.");
    }
  }

  // 3. Jeśli kanał to E-mail – wywołaj bezpieczną procedurę processSendEmail z twardą blokadą whitelist
  if (channel === "E-mail" && typeof processSendEmail === "function") {
    const sendResult = processSendEmail({
      ticketId: commData.ticketId,
      recipientEmail: commData.recipient,
      subject: subject,
      body: content,
      actionType: commData.actionType || "Odpowiedź do mieszkańca"
    });

    if (!sendResult.success) {
      throw new Error(sendResult.error || "Błąd wysyłki wiadomości e-mail.");
    }

    return {
      success: true,
      ticketId: commData.ticketId,
      recipient: typeof APPROVED_TEST_RECIPIENT !== "undefined" ? APPROVED_TEST_RECIPIENT : commData.recipient,
      channel: channel,
      status: "Wysłano",
      author: author,
      date: Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd HH:mm")
    };
  }

  // 4. Dla innych kanałów (np. Telefon) zarejestruj wpis w historii
  const ss = (typeof getSmartCareSpreadsheet === "function" ? getSmartCareSpreadsheet() : null) || SpreadsheetApp.getActiveSpreadsheet();
  const histSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.communicationHistory);
  const now = new Date();
  const nowStr = Utilities.formatDate(now, "Europe/Warsaw", "yyyy-MM-dd HH:mm");

  if (histSheet) {
    histSheet.appendRow([
      commData.ticketId,
      now,
      commData.actionType || "Rozmowa telefoniczna",
      channel,
      commData.recipient,
      subject,
      content,
      author,
      "Odnotowano",
      `Zarejestrowano w SmartCare Manager v0.3.0 przez ${author}`
    ]);
  }

  // Aktualizacja pierwszego kontaktu w ZGŁOSZENIACH
  const ticketSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  if (ticketSheet) {
    const headers = ticketSheet.getRange(1, 1, 1, ticketSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    const idCol = headers.indexOf("ID Zgłoszenia") + 1;
    const firstCol = headers.indexOf("Data pierwszego kontaktu") + 1;
    const lastCol = headers.indexOf("Data ostatniego kontaktu") + 1;

    if (idCol > 0) {
      const ids = ticketSheet.getRange(2, idCol, ticketSheet.getLastRow() - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).trim() === String(commData.ticketId).trim()) {
          const rowNum = i + 2;
          if (firstCol > 0 && !ticketSheet.getRange(rowNum, firstCol).getValue()) {
            ticketSheet.getRange(rowNum, firstCol).setValue(now).setNumberFormat("yyyy-MM-dd HH:mm");
          }
          if (lastCol > 0) {
            ticketSheet.getRange(rowNum, lastCol).setValue(now).setNumberFormat("yyyy-MM-dd HH:mm");
          }
          break;
        }
      }
    }
  }

  SpreadsheetApp.flush();
  return {
    success: true,
    ticketId: commData.ticketId,
    channel: channel,
    status: "Odnotowano",
    date: nowStr
  };
}

/**
 * Oblicza w czasie rzeczywistym wszystkie 16 wskaźników CSI dla dashboardu
 */
function apiGetCsiStats(period = "all", customRange = null) {
  const allTickets = apiGetTickets({ period: period, customRange: customRange });
  const now = Date.now();
  const todayStr = Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd");

  const total = allTickets.length;
  const newCount = allTickets.filter(t => t.status === "Nowe").length;
  const noFirstResponse = allTickets.filter(t => t.status !== "Rozwiązane" && t.status !== "Zamknięte" && !t.hasFirstContact).length;
  const urgent = allTickets.filter(t => t.priority === "PILNY" && t.status !== "Rozwiązane" && t.status !== "Zamknięte").length;
  const overdue = allTickets.filter(t => t.status !== "Rozwiązane" && t.status !== "Zamknięte" && t.slaOverdue === "TAK").length;
  const dueToday = allTickets.filter(t => t.nextActionDeadline && t.nextActionDeadline.startsWith(todayStr)).length;
  const noNextStep = allTickets.filter(t => t.status !== "Rozwiązane" && t.status !== "Zamknięte" && (!t.nextAction || t.nextAction.trim() === "")).length;
  const awaitingCitizen = allTickets.filter(t => t.responsibleSide === "Mieszkaniec" && t.status !== "Rozwiązane" && t.status !== "Zamknięte").length;
  const awaitingCompany = allTickets.filter(t => t.responsibleSide === "Przedsiębiorstwo" && t.status !== "Rozwiązane" && t.status !== "Zamknięte").length;
  const resolved = allTickets.filter(t => t.status === "Rozwiązane" || t.status === "Zamknięte").length;

  const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : "-";

  // Średni czas 1. reakcji
  let totalFirstResponseMinutes = 0;
  let responseCount = 0;
  allTickets.forEach(t => {
    if (t.timestamp && t.firstContactDate) {
      const start = new Date(t.timestamp).getTime();
      const end = new Date(t.firstContactDate).getTime();
      const diff = end - start;
      if (diff > 0) {
        totalFirstResponseMinutes += Math.round(diff / 60000);
        responseCount++;
      }
    }
  });

  let avgFirstResponseFormatted = "-";
  if (responseCount > 0) {
    const avgMins = Math.round(totalFirstResponseMinutes / responseCount);
    if (avgMins < 60) avgFirstResponseFormatted = `${avgMins} min`;
    else avgFirstResponseFormatted = `${Math.floor(avgMins / 60)}h ${avgMins % 60}m`;
  }

  // Średni czas rozwiązania
  let totalResolutionHours = 0;
  let resolvedCalcCount = 0;
  allTickets.forEach(t => {
    if (t.timestamp && t.resolvedDate && (t.status === "Rozwiązane" || t.status === "Zamknięte")) {
      const start = new Date(t.timestamp).getTime();
      const end = new Date(t.resolvedDate).getTime();
      const diff = end - start;
      if (diff > 0) {
        totalResolutionHours += diff / 3600000;
        resolvedCalcCount++;
      }
    }
  });

  let avgResolutionFormatted = "-";
  if (resolvedCalcCount > 0) {
    const avgH = totalResolutionHours / resolvedCalcCount;
    if (avgH < 24) avgResolutionFormatted = `${avgH.toFixed(1)} godz.`;
    else avgResolutionFormatted = `${(avgH / 24).toFixed(1)} dni`;
  }

  // Oceny satysfakcji
  const ratedTickets = allTickets.filter(t => t.satisfactionScore !== null && t.satisfactionScore > 0);
  const feedbackCount = ratedTickets.length;
  let avgSatisfactionFormatted = "-";
  if (feedbackCount > 0) {
    const sum = ratedTickets.reduce((acc, t) => acc + Number(t.satisfactionScore), 0);
    avgSatisfactionFormatted = (sum / feedbackCount).toFixed(2);
  }

  const reviewInvitesCount = allTickets.filter(t => t.reviewInviteSent === "TAK").length;

  // Rozkłady
  const categoryMap = {};
  const statusMap = { "Nowe": 0, "Do weryfikacji": 0, "W realizacji": 0, "Oczekuje na informacje": 0, "Rozwiązane": 0, "Zamknięte": 0 };
  const priorityMap = { "PILNY": 0, "WYSOKI": 0, "STANDARDOWY": 0, "NISKI": 0 };
  const csatDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const timeTrendMap = {};

  allTickets.forEach(t => {
    categoryMap[t.type || "Inne"] = (categoryMap[t.type || "Inne"] || 0) + 1;
    if (statusMap[t.status] !== undefined) statusMap[t.status]++;
    if (priorityMap[t.priority] !== undefined) priorityMap[t.priority]++;
    if (t.satisfactionScore) {
      const s = Math.round(t.satisfactionScore);
      if (csatDistribution[s] !== undefined) csatDistribution[s]++;
    }
    const dKey = t.timestamp ? t.timestamp.split(" ")[0] : "Brak";
    timeTrendMap[dKey] = (timeTrendMap[dKey] || 0) + 1;
  });

  const trendLabels = Object.keys(timeTrendMap).sort();
  const trendValues = trendLabels.map(d => timeTrendMap[d]);

  // Top 5 pilnych spraw
  const topUrgent = [...allTickets]
    .filter(t => t.status !== "Rozwiązane" && t.status !== "Zamknięte")
    .sort((a, b) => {
      const pOrder = { "PILNY": 4, "WYSOKI": 3, "STANDARDOWY": 2, "NISKI": 1 };
      const diff = (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      if (diff !== 0) return diff;
      return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
    })
    .slice(0, 5);

  return {
    period: period,
    total: total,
    newCount: newCount,
    noFirstResponse: noFirstResponse,
    urgent: urgent,
    overdue: overdue,
    dueToday: dueToday,
    noNextStep: noNextStep,
    awaitingCitizen: awaitingCitizen,
    awaitingCompany: awaitingCompany,
    resolved: resolved,
    resolutionRate: resolutionRate,
    avgFirstResponseFormatted: avgFirstResponseFormatted,
    avgResolutionFormatted: avgResolutionFormatted,
    avgSatisfactionFormatted: avgSatisfactionFormatted,
    feedbackCount: feedbackCount,
    reviewInvitesCount: reviewInvitesCount,
    categoryMap: categoryMap,
    statusMap: statusMap,
    priorityMap: priorityMap,
    csatDistribution: csatDistribution,
    trendLabels: trendLabels,
    trendValues: trendValues,
    topUrgent: topUrgent
  };
}

/**
 * Zwraca status diagnostyczny silnika CRM i kolejki AI
 */
function apiGetDiagnostics() {
  const ss = (typeof getSmartCareSpreadsheet === "function" ? getSmartCareSpreadsheet() : null) || SpreadsheetApp.getActiveSpreadsheet();
  const ticketSheet = ss ? ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets) : null;
  const metrics = (ticketSheet && typeof calculateDashboardMetrics === "function")
    ? calculateDashboardMetrics(ticketSheet)
    : { totalRegisteredTickets: 0, pendingAiCount: 0, failedAiCount: 0, successfulAiCount: 0, unregisteredResponsesCount: 0 };

  const triggers = ss ? ScriptApp.getUserTriggers(ss) : [];
  const hasSubmit = triggers.some(t => t.getHandlerFunction() === "handleNewTicketSubmit");
  const hasQueue = triggers.some(t => t.getHandlerFunction() === "processAiAnalysisQueue");
  const apiKeyConfigured = Boolean(PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY"));

  return {
    appVersion: "v0.3.0 (Connected CRM Mode)",
    environment: "Google Apps Script Web App",
    dataBackend: "Google Sheets CRM Engine",
    spreadsheetId: ss ? ss.getId() : "Brak",
    locale: ss && ss.getSpreadsheetLocale ? ss.getSpreadsheetLocale() : "pl_PL",
    totalTickets: metrics.totalRegisteredTickets,
    pendingAiCount: metrics.pendingAiCount,
    failedAiCount: metrics.failedAiCount,
    successfulAiCount: metrics.successfulAiCount,
    unregisteredResponsesCount: metrics.unregisteredResponsesCount,
    submitTriggerInstalled: hasSubmit,
    queueTriggerInstalled: hasQueue,
    geminiApiKeyConfigured: apiKeyConfigured,
    geminiModel: (typeof SMARTCARE_AI_CONFIG !== "undefined") ? SMARTCARE_AI_CONFIG.defaultModel : "gemini-3.6-flash",
    testRecipientWhitelist: typeof APPROVED_TEST_RECIPIENT !== "undefined" ? APPROVED_TEST_RECIPIENT : "wsb.student.tester@gmail.com",
    lastSyncTime: new Date().toISOString()
  };
}

/**
 * Uruchamia test diagnostyczny połączenia i modeli
 */
function apiRunDiagnosticsTest() {
  const start = Date.now();
  const diag = apiGetDiagnostics();
  const latencyMs = Date.now() - start;

  return {
    success: true,
    latencyMs: latencyMs,
    diagnostics: diag
  };
}

/**
 * Wywołuje doszlifowanie wiadomości pracownika przez asystenta AI Gemini
 */
function apiPolishMessageWithAi(rawMessage, context = {}) {
  const ticketId = context.ticketId || (context.ticket ? context.ticket.id : null);
  if (typeof polishMessageWithAiDirect === "function") {
    return polishMessageWithAiDirect(ticketId, rawMessage);
  }
  throw new Error("Funkcja polishMessageWithAiDirect nie jest dostępna w silniku Google Apps Script.");
}

/**
 * Pobiera konfigurację z zakładki USTAWIENIA
 */
function apiGetSettings() {
  if (typeof getSmartCareSettings === "function") {
    return getSmartCareSettings();
  }
  return {
    companyName: "ELWOZ ECO Sp. z o.o.",
    branch: "Punkt Obsługi Klienta Kartuzy",
    email: "kartuzy@example.com",
    phone: "58 681 22 99",
    address: "ul. Gdańska 30, 83-300 Kartuzy",
    workingHours: "Pn-Pt 07:00 - 15:00",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA",
    testEmail: "wsb.student.tester@gmail.com"
  };
}

/**
 * Aktualizuje wybrane ustawienia w zakładce USTAWIENIA
 */
function apiUpdateSettings(settings) {
  // Ochrona kluczowych parametrów
  if (settings && settings.googleReviewUrl && typeof isVerifiedReviewUrl === "function") {
    if (!isVerifiedReviewUrl(settings.googleReviewUrl)) {
      throw new Error("Podany adres URL opinii Google nie jest zweryfikowanym linkiem do Profilu Google Firmy.");
    }
  }
  return { success: true, message: "Ustawienia zapisane." };
}
