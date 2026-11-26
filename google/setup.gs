/**
 * ============================================================================
 * ELWOZ ECO SmartCare - Skrypt konfiguracyjny Google Apps Script (setup.gs)
 * Wersja: 0.2.8 (Customer Service Intelligence – Stabilizacja silnika CRM, eliminacja blokad, kolejka AI)
 * Projekt edukacyjny: Uniwersytet WSB Merito w Gdańsku
 * Dedykowane konto Google: wsb.student.tester@gmail.com
 * ============================================================================
 * 
 * WAŻNE (Container-bound Script):
 * Niniejszy skrypt MUSI być uruchamiany w projekcie Apps Script bezpośrednio
 * powiązanym z arkuszem Google Sheets poprzez: Rozszerzenia → Apps Script.
 * 
 * GŁÓWNE USPRAWNIENIA WERSJI v0.2.7 (CUSTOMER SERVICE INTELLIGENCE):
 * 1. AUTOMATYCZNA ANALIZA NOWYCH ZGŁOSZEŃ PRZEZ AI:
 *    - Nowe zgłoszenia są automatycznie analizowane przez Gemini Flash w tle.
 *    - Stan analizy AI: Oczekuje, W trakcie, Gotowa, Wymaga weryfikacji, Błąd.
 * 2. LOKALNA KONTROLA DANYCH PRZED WYSŁANIEM DO AI:
 *    - Weryfikacja braków adresowych zależna od kategorii (adres niewymagany dla pochwał/sugestii).
 *    - Wykrywanie sprzeczności, odpowiedzi zastępczych, potencjalnych zagrożeń i filtr PII.
 * 3. 4-POZIOMOWA PRIORYTETYZACJA (PILNY, WYSOKI, STANDARDOWY, NISKI):
 *    - Rozróżnienie sugerowanego priorytetu AI i zatwierdzonego priorytetu pracownika.
 * 4. ZARZĄDZANIE KOLEJNYMI KROKAMI I KONTROLA TERMINÓW SLA:
 *    - Przypisanie strony odpowiedzialnej (Przedsiębiorstwo vs Mieszkaniec).
 *    - Konfigurowalne cele czasowe pierwszej reakcji (SLA: Pilny 15m, Wysoki 1h, Standardowy 4h, Niski 24h).
 * 5. ROZSZERZONY DASHBOARD CUSTOMER SERVICE INTELLIGENCE:
 *    - Nowe wskaźniki: sprawy przeterminowane SLA, bez 1. odpowiedzi, bez kolejnego kroku,
 *      podział zadań (firma / mieszkaniec), autokalibracja dla locale pl_PL i niezależny silnik.
 * 6. CENTRALNY PANEL OBSŁUGI ZGŁOSZENIA (Centrum Obsługi w communication.gs).
 * 7. ZACHOWANIE KOMPATYBILNOŚCI I PUNKTU PRZYWRACANIA DLA v0.2.6:
 *    - Wszystkie istniejące zgłoszenia, ustawienia, powiadomienia i linki do opinii są zachowane.
 */

const SMARTCARE_SETUP_CONFIG = {
  version: "0.2.8",
  sheetName: "ELWOZ ECO SmartCare – Centrum zgłoszeń",
  formTitle: "ELWOZ ECO SmartCare – Zgłoszenie Mieszkańca (Prototyp Testowy)",
  formDescription: "Cyfrowy Punkt Obsługi Mieszkańca – Rejon Kartuzy.\n" +
    "UWAGA: Formularz stanowi studencki prototyp WSB Merito. Wprowadzaj WYŁĄCZNIE fikcyjne dane testowe. " +
    "W przypadku rzeczywistych reklamacji prosimy o kontakt pod adresem: kartuzy@elwozeco.pl.",
  prefixId: "ELW-2026-",
  dedicatedTesterEmail: "wsb.student.tester@gmail.com",
  verifiedGoogleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA",
  sheetTabs: {
    dashboard: "DASHBOARD",
    tickets: "ZGŁOSZENIA",
    communicationHistory: "HISTORIA KOMUNIKACJI",
    settings: "USTAWIENIA",
    tests: "TESTY",
    aiGuide: "INSTRUKCJA AI"
  },
  statuses: [
    "Nowe",
    "Do weryfikacji",
    "W realizacji",
    "Oczekuje na informacje",
    "Rozwiązane",
    "Zamknięte"
  ],
  priorities: [
    "PILNY",
    "WYSOKI",
    "STANDARDOWY",
    "NISKI"
  ],
  analysisStates: [
    "Oczekuje",
    "W trakcie",
    "Gotowa",
    "Wymaga weryfikacji",
    "Błąd"
  ],
  responsibleSides: [
    "Przedsiębiorstwo",
    "Mieszkaniec"
  ],
  slaMinutes: {
    "PILNY": 15,
    "WYSOKI": 60,
    "STANDARDOWY": 240,
    "NISKI": 1440
  },
  categories: [
    "brak odbioru odpadów",
    "niepełny odbiór odpadów",
    "uszkodzony pojemnik",
    "bałagan po odbiorze",
    "brak worków",
    "problem z harmonogramem",
    "sugestia",
    "pochwała",
    "inne"
  ],
  contactResults: [
    "Mieszkaniec potwierdził rozwiązanie",
    "Wyjaśniono zasady / harmonogram",
    "Wymaga dalszej weryfikacji w terenie",
    "Brak kontaktu (nie odbiera / brak odp.)",
    "Oczekuje na ponowny kontakt"
  ]
};

/**
 * Sanityzacja tekstu dla okien dialogowych
 */
function escapeHtmlSetup(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Zamiana indeksu kolumny na literę (np. 1 -> A, 27 -> AA)
 */
function colIndexToLetter(colIndex) {
  let temp, letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = Math.floor((colIndex - temp - 1) / 26);
  }
  return letter;
}

/**
 * Dynamiczne wyszukiwanie litery kolumny na podstawie możliwych nazw nagłówka
 */
function findColumnLetterByHeaders(headers, possibleNames, defaultLetter) {
  if (!headers || !Array.isArray(headers)) return defaultLetter;

  // 1. Dokładne dopasowanie
  for (let name of possibleNames) {
    const target = name.toLowerCase().trim();
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || "").toLowerCase().trim();
      if (h === target) return colIndexToLetter(i + 1);
    }
  }

  // 2. Prefiksowe dopasowanie
  for (let name of possibleNames) {
    const target = name.toLowerCase().trim();
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || "").toLowerCase().trim();
      if (h.startsWith(target)) return colIndexToLetter(i + 1);
    }
  }

  // 3. Częściowe dopasowanie
  for (let name of possibleNames) {
    const target = name.toLowerCase().trim();
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || "").toLowerCase().trim();
      if (h.includes(target)) return colIndexToLetter(i + 1);
    }
  }

  return defaultLetter;
}

/**
 * Mapa liter kluczowych kolumn arkusza ZGŁOSZENIA (wzbogacona o pola v0.2.7)
 */
function getTicketsColumnMap(ticketSheet) {
  const lastCol = ticketSheet ? ticketSheet.getLastColumn() : 0;
  const headers = lastCol > 0 
    ? ticketSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim())
    : [];

  return {
    id: findColumnLetterByHeaders(headers, ["ID Zgłoszenia", "Numer zgłoszenia", "ID"], "M"),
    type: findColumnLetterByHeaders(headers, ["Rodzaj zgłoszenia", "Kategoria problemu", "Kategoria"], "B"),
    fraction: findColumnLetterByHeaders(headers, ["Rodzaj odpadów", "Frakcja"], "C"),
    city: findColumnLetterByHeaders(headers, ["Miejscowość"], "D"),
    street: findColumnLetterByHeaders(headers, ["Ulica lub lokalizacja", "Ulica"], "E"),
    houseNumber: findColumnLetterByHeaders(headers, ["Numer posesji lub identyfikator miejsca", "Numer posesji"], "F"),
    timestamp: findColumnLetterByHeaders(headers, ["Sygnatura czasowa", "Timestamp", "Data zgłoszenia"], "A"),
    contactRequest: findColumnLetterByHeaders(headers, ["Prośba o kontakt ze strony pracownika", "Prośba o kontakt"], "L"),
    status: findColumnLetterByHeaders(headers, ["Status", "Status sprawy"], "N"),
    priority: findColumnLetterByHeaders(headers, ["Priorytet"], "O"),
    suggestedPriority: findColumnLetterByHeaders(headers, ["Sugerowany priorytet AI", "Rekomendowany priorytet AI"], "P"),
    priorityRationale: findColumnLetterByHeaders(headers, ["Uzasadnienie priorytetu AI"], "Q"),
    aiState: findColumnLetterByHeaders(headers, ["Stan analizy AI", "Status AI"], "R"),
    localValidation: findColumnLetterByHeaders(headers, ["Lokalna kontrola danych", "Walidacja lokalna"], "S"),
    contradictions: findColumnLetterByHeaders(headers, ["Wykryte sprzeczności AI", "Sprzeczności AI"], "T"),
    assignee: findColumnLetterByHeaders(headers, ["Pracownik odpowiedzialny", "Opiekun"], "U"),
    nextAction: findColumnLetterByHeaders(headers, ["Następne działanie", "Kolejny krok"], "V"),
    responsibleSide: findColumnLetterByHeaders(headers, ["Strona odpowiedzialna", "Kto wykonuje"], "W"),
    nextActionDeadline: findColumnLetterByHeaders(headers, ["Termin następnego działania", "Termin kolejnego kroku"], "X"),
    slaDeadline: findColumnLetterByHeaders(headers, ["Termin SLA 1. reakcji", "Termin SLA"], "Y"),
    slaOverdue: findColumnLetterByHeaders(headers, ["Przekroczenie SLA", "Status SLA"], "Z"),
    firstContact: findColumnLetterByHeaders(headers, ["Data pierwszego kontaktu", "Pierwszy kontakt", "Data potwierdzenia przyjęcia"], "AC"),
    lastContact: findColumnLetterByHeaders(headers, ["Data ostatniego kontaktu"], "AD"),
    resolutionDate: findColumnLetterByHeaders(headers, ["Data rozwiązania", "Rozwiązanie"], "AE"),
    resolutionMethod: findColumnLetterByHeaders(headers, ["Sposób rozwiązania sprawy"], "AF"),
    satisfaction: findColumnLetterByHeaders(headers, ["Ocena satysfakcji (1-5)", "Ocena satysfakcji", "Satysfakcja"], "AH"),
    reviewSent: findColumnLetterByHeaders(headers, ["Prośba o opinię wysłana", "Opinia wysłana"], "AJ"),
    reviewDate: findColumnLetterByHeaders(headers, ["Data wysłania prośby o opinię"], "AK"),
    aiSummary: findColumnLetterByHeaders(headers, ["Streszczenie AI"], "AM"),
    aiGaps: findColumnLetterByHeaders(headers, ["Brakujące informacje AI"], "AN"),
    aiAction: findColumnLetterByHeaders(headers, ["Sugerowane działanie AI"], "AO"),
    aiNextStep: findColumnLetterByHeaders(headers, ["Rekomendowany kolejny krok AI"], "AP"),
    aiResponse: findColumnLetterByHeaders(headers, ["Proponowana odpowiedź AI"], "AQ")
  };
}

/**
 * Pobiera właściwy separator formuł na podstawie ustawień regionalnych arkusza
 */
function getFormulaSeparator(spreadsheet) {
  let locale = "pl_PL";
  try {
    if (spreadsheet && typeof spreadsheet.getSpreadsheetLocale === "function") {
      locale = spreadsheet.getSpreadsheetLocale() || "pl_PL";
    }
  } catch (e) {
    locale = "pl_PL";
  }

  const locLower = String(locale).toLowerCase();
  const commaSeparated = [
    "en_us", "en_gb", "en_ca", "en_au", "en", "ja_jp", "ja", "zh_cn", "zh_tw", "zh", "ko_kr", "ko"
  ];
  for (let cl of commaSeparated) {
    if (locLower === cl || locLower.startsWith(cl + "_") || locLower.startsWith(cl + "-")) {
      return ",";
    }
  }
  return ";";
}

/**
 * Parser dat obsługujący instancje Date, numery seryjne oraz stringi
 * (YYYY-MM-DD, DD.MM.YYYY, DD,MM,YY, DD.MM.YY z rozszerzeniem roku 2-cyfrowego)
 */
function parseDateValue(val) {
  if (val === null || val === undefined || val === "") return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val.getTime();
  if (typeof val === "number" && val > 1000) {
    return (val - 25569) * 86400 * 1000;
  }
  if (typeof val === "string") {
    let s = val.trim();
    if (!s) return null;
    
    // Normalizacja przecinków na kropki (np. "27,11,26" -> "27.11.26")
    s = s.replace(/,/g, ".");
    
    // Format YYYY-MM-DD z opcjonalnym czasem
    const m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m1) {
      const yr = Number(m1[1]);
      const mo = Number(m1[2]) - 1;
      const da = Number(m1[3]);
      const hr = Number(m1[4] || 0);
      const mi = Number(m1[5] || 0);
      const se = Number(m1[6] || 0);
      const d = new Date(yr, mo, da, hr, mi, se);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    
    // Format DD.MM.YYYY lub DD.MM.YY z opcjonalnym czasem
    const m2 = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})(?:[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m2) {
      let yr = Number(m2[3]);
      if (yr < 100) yr += 2000;
      const mo = Number(m2[2]) - 1;
      const da = Number(m2[1]);
      const hr = Number(m2[4] || 0);
      const mi = Number(m2[5] || 0);
      const se = Number(m2[6] || 0);
      const d = new Date(yr, mo, da, hr, mi, se);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    let d = new Date(s);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return null;
}

/**
 * Oblicza termin SLA z uwzględnieniem roboczych godzin biura POK Kartuzy (Pon-Pt 07:00-16:00, 540 min/dzień)
 * @param {Date|number} startDate Data początkowa (np. data zgłoszenia)
 * @param {number} minutesMin Minuty SLA (np. PILNY: 15, WYSOKI: 60, STANDARDOWY: 240, NISKI: 1440)
 * @returns {Date} Termin końcowy SLA
 */
function calculateBusinessHoursDeadline(startDate, minutesMin) {
  const baseTime = startDate instanceof Date ? startDate.getTime() : (Number(startDate) || Date.now());
  let current = new Date(baseTime);
  let remainingMinutes = Math.max(1, Number(minutesMin) || 240);

  const WORK_START_HOUR = 7;
  const WORK_END_HOUR = 16;

  while (remainingMinutes > 0) {
    const day = current.getDay(); // 0: Nd, 6: Sob
    if (day === 0) { // Niedziela -> przeskok do poniedziałku 07:00
      current.setDate(current.getDate() + 1);
      current.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }
    if (day === 6) { // Sobota -> przeskok do poniedziałku 07:00
      current.setDate(current.getDate() + 2);
      current.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }

    const currentMinuteOfDay = current.getHours() * 60 + current.getMinutes();
    const startMinuteOfDay = WORK_START_HOUR * 60;
    const endMinuteOfDay = WORK_END_HOUR * 60;

    if (currentMinuteOfDay < startMinuteOfDay) {
      current.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }
    if (currentMinuteOfDay >= endMinuteOfDay) {
      current.setDate(current.getDate() + 1);
      current.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }

    const remainingInWorkDay = endMinuteOfDay - currentMinuteOfDay;
    if (remainingMinutes <= remainingInWorkDay) {
      current = new Date(current.getTime() + remainingMinutes * 60 * 1000);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= remainingInWorkDay;
      current.setDate(current.getDate() + 1);
      current.setHours(WORK_START_HOUR, 0, 0, 0);
    }
  }
  return current;
}

/**
 * Bezpiecznie pobiera instancję arkusza SmartCare, również przy wywołaniach z wyzwalaczy czasowych
 * bez aktywnego arkusza (zapisane ID w ScriptProperties)
 */
function getSmartCareSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (_) {}

  const storedId = PropertiesService.getScriptProperties().getProperty("SMARTCARE_SPREADSHEET_ID");
  if (storedId) {
    try {
      return SpreadsheetApp.openById(storedId);
    } catch (e) {
      Logger.log("Nie można otworzyć arkusza po zapisanym ID: " + e.toString());
    }
  }
  return null;
}

/**
 * Zwraca faktyczną liczbę aktywnych zgłoszeń w arkuszu ZGŁOSZENIA
 */
function countActualCrmTickets(ticketSheet) {
  if (!ticketSheet || ticketSheet.getLastRow() <= 1) return 0;
  const lastCol = ticketSheet.getLastColumn();
  const headers = ticketSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  let idColIdx = headers.indexOf("ID Zgłoszenia");
  if (idColIdx === -1) idColIdx = headers.indexOf("Numer zgłoszenia");
  if (idColIdx === -1) idColIdx = 12;

  const rows = ticketSheet.getRange(2, idColIdx + 1, ticketSheet.getLastRow() - 1, 1).getValues();
  let count = 0;
  for (let r of rows) {
    if (String(r[0] || "").trim() !== "") count++;
  }
  return count;
}

/**
 * Niezależny silnik analityczny Apps Script obliczający metryki Customer Service Intelligence
 */
function calculateDashboardMetrics(ticketSheet) {
  const categories = SMARTCARE_SETUP_CONFIG.categories;
  const statuses = SMARTCARE_SETUP_CONFIG.statuses;
  const priorities = SMARTCARE_SETUP_CONFIG.priorities;

  const metrics = {
    totalTickets: 0,
    newTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    completionRate: 0,
    waitingContactTickets: 0,
    avgFirstResponse: 0,
    avgResolution: 0,
    avgSatisfaction: 0,
    satisfactionCount: 0,
    reviewsSentCount: 0,
    reviewRate: 0,
    satisfactionRate: 0,
    // Rozszerzone metryki CSI & Silnika (v0.2.8):
    totalFormResponses: 0,
    totalRegisteredTickets: 0,
    unregisteredResponsesCount: 0,
    successfulAiCount: 0,
    failedAiCount: 0,
    pendingAiCount: 0,
    urgentHighCount: 0,
    overdueSlaCount: 0,
    overdueFirstResponseSlaCount: 0,
    overdueNextActionCount: 0,
    historicalOverdueFirstResponseCount: 0,
    missingFirstResponseCount: 0,
    missingNextStepCount: 0,
    waitingResidentCount: 0,
    waitingCompanyCount: 0,
    dueTodayCount: 0,
    categoryCounts: {},
    statusCounts: {},
    priorityCounts: {},
    aiStateCounts: {}
  };

  for (let c of categories) metrics.categoryCounts[c] = 0;
  for (let s of statuses) metrics.statusCounts[s] = 0;
  for (let p of priorities) metrics.priorityCounts[p] = 0;
  for (let a of SMARTCARE_SETUP_CONFIG.analysisStates) metrics.aiStateCounts[a] = 0;

  if (!ticketSheet || ticketSheet.getLastRow() <= 1) return metrics;

  const data = ticketSheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  const getIdx = (possibleNames) => {
    for (let name of possibleNames) {
      const target = name.toLowerCase().trim();
      for (let i = 0; i < headers.length; i++) {
        if (String(headers[i] || "").toLowerCase().trim() === target) return i;
      }
    }
    for (let name of possibleNames) {
      const target = name.toLowerCase().trim();
      for (let i = 0; i < headers.length; i++) {
        if (String(headers[i] || "").toLowerCase().trim().startsWith(target)) return i;
      }
    }
    return -1;
  };

  const idIdx = getIdx(["ID Zgłoszenia", "Numer zgłoszenia", "ID"]);
  const statusIdx = getIdx(["Status", "Status sprawy"]);
  const typeIdx = getIdx(["Rodzaj zgłoszenia", "Kategoria problemu", "Kategoria"]);
  const priorityIdx = getIdx(["Priorytet"]);
  const timeIdx = getIdx(["Sygnatura czasowa", "Data zgłoszenia", "Timestamp"]);
  const firstContactIdx = getIdx(["Data pierwszego kontaktu", "Pierwszy kontakt", "Data potwierdzenia przyjęcia"]);
  const resolutionIdx = getIdx(["Data rozwiązania", "Rozwiązanie"]);
  const contactReqIdx = getIdx(["Prośba o kontakt ze strony pracownika", "Prośba o kontakt"]);
  const satisfactionIdx = getIdx(["Ocena satysfakcji (1-5)", "Ocena satysfakcji", "Satysfakcja"]);
  const reviewSentIdx = getIdx(["Prośba o opinię wysłana", "Opinia wysłana"]);
  const aiStateIdx = getIdx(["Stan analizy AI", "Status AI"]);
  const nextActionIdx = getIdx(["Następne działanie", "Kolejny krok"]);
  const sideIdx = getIdx(["Strona odpowiedzialna", "Kto wykonuje"]);
  const actionDeadlineIdx = getIdx(["Termin następnego działania", "Termin kolejnego kroku"]);
  const slaDeadlineIdx = getIdx(["Termin SLA 1. reakcji", "Termin SLA"]);

  const firstContactDiffs = [];
  const resolutionDiffs = [];
  const satisfactionRatings = [];
  let resolvedWithReviewCount = 0;

  const now = new Date();
  const todayStr = Utilities.formatDate(now, "Europe/Warsaw", "yyyy-MM-dd");

  const descIdx = getIdx(["Opis zgłoszenia", "Opis problemu", "Opis"]);
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const idVal = idIdx !== -1 ? String(row[idIdx] || "").trim() : "";
    const timeVal = timeIdx !== -1 ? row[timeIdx] : "";
    const typeValRaw = typeIdx !== -1 ? String(row[typeIdx] || "").trim() : "";
    const descValRaw = descIdx !== -1 ? String(row[descIdx] || "").trim() : "";

    const hasFormData = Boolean(timeVal || typeValRaw || descValRaw);
    if (hasFormData) {
      metrics.totalFormResponses++;
    }

    if (!idVal) {
      if (hasFormData) {
        metrics.unregisteredResponsesCount++;
      }
      continue;
    }

    metrics.totalTickets++;
    metrics.totalRegisteredTickets++;

    const statusVal = statusIdx !== -1 ? String(row[statusIdx] || "").trim() : "";
    const statusLower = statusVal.toLowerCase();
    const isClosed = statusLower === "rozwiązane" || statusLower === "zamknięte";

    if (statusLower === "nowe") metrics.newTickets++;
    else if (statusLower === "w realizacji" || statusLower === "do weryfikacji") metrics.inProgressTickets++;
    else if (isClosed) metrics.resolvedTickets++;

    for (let s of statuses) {
      if (s.toLowerCase() === statusLower) metrics.statusCounts[s]++;
    }

    const typeVal = typeIdx !== -1 ? String(row[typeIdx] || "").toLowerCase().trim() : "";
    for (let c of categories) {
      if (typeVal.includes(c.toLowerCase()) || c.toLowerCase().includes(typeVal)) {
        metrics.categoryCounts[c]++;
      }
    }

    // Priorytety
    let prioVal = priorityIdx !== -1 ? String(row[priorityIdx] || "").toUpperCase().trim() : "STANDARDOWY";
    if (prioVal === "WYSOKI" || prioVal === "PILNY") metrics.urgentHighCount++;
    if (metrics.priorityCounts[prioVal] !== undefined) {
      metrics.priorityCounts[prioVal]++;
    } else {
      metrics.priorityCounts["STANDARDOWY"]++;
    }

    // Stan analizy AI (v0.2.8)
    const aiState = aiStateIdx !== -1 ? String(row[aiStateIdx] || "").trim() : "";
    if (metrics.aiStateCounts[aiState] !== undefined) {
      metrics.aiStateCounts[aiState]++;
    }
    if (aiState === "Gotowa" || aiState === "Wykonana") {
      metrics.successfulAiCount++;
    } else if (aiState === "Błąd") {
      metrics.failedAiCount++;
    } else if (aiState === "Oczekuje" || aiState === "W trakcie") {
      metrics.pendingAiCount++;
    }

    // Prośba o kontakt
    const contactReqVal = contactReqIdx !== -1 ? String(row[contactReqIdx] || "").toLowerCase() : "";
    if (contactReqVal.includes("tak") && !isClosed) {
      metrics.waitingContactTickets++;
    }

    // Opinia Google
    const reviewSentVal = reviewSentIdx !== -1 ? String(row[reviewSentIdx] || "").toUpperCase().trim() : "";
    if (reviewSentVal === "TAK") {
      metrics.reviewsSentCount++;
      if (isClosed) resolvedWithReviewCount++;
    }

    // Czasy reakcji i rozwiązania
    const createdTime = timeIdx !== -1 ? parseDateValue(row[timeIdx]) : null;
    const firstContactTime = firstContactIdx !== -1 ? parseDateValue(row[firstContactIdx]) : null;
    if (createdTime && firstContactTime && firstContactTime >= createdTime) {
      firstContactDiffs.push((firstContactTime - createdTime) / (1000 * 3600));
    }

    const resolutionTime = resolutionIdx !== -1 ? parseDateValue(row[resolutionIdx]) : null;
    if (createdTime && resolutionTime && resolutionTime >= createdTime) {
      resolutionDiffs.push((resolutionTime - createdTime) / (1000 * 3600));
    }

    // Oceny satysfakcji
    if (satisfactionIdx !== -1) {
      const satVal = Number(row[satisfactionIdx]);
      if (!isNaN(satVal) && satVal >= 1 && satVal <= 5) {
        satisfactionRatings.push(satVal);
      }
    }

    // Metryki operacyjne otwartych spraw (CSI v0.2.7):
    if (!isClosed) {
      // Brak pierwszej odpowiedzi
      if (!firstContactTime) {
        metrics.missingFirstResponseCount++;
      }

      // Kontrola SLA 1. reakcji (v0.2.8):
      // Nie oznaczamy jako przeterminowanego, jeśli pierwsza odpowiedź została udzielona w terminie!
      const slaTime = slaDeadlineIdx !== -1 ? parseDateValue(row[slaDeadlineIdx]) : null;
      if (slaTime) {
        if (!firstContactTime) {
          if (now.getTime() > slaTime) {
            metrics.overdueSlaCount++;
            metrics.overdueFirstResponseSlaCount++;
          }
        } else {
          if (firstContactTime > slaTime) {
            metrics.historicalOverdueFirstResponseCount++;
          }
        }
      }

      // Kontrola terminu kolejnego działania (odrębnie od SLA pierwszej reakcji! v0.2.8)
      const actDeadline = actionDeadlineIdx !== -1 ? parseDateValue(row[actionDeadlineIdx]) : null;
      if (actDeadline && now.getTime() > actDeadline) {
        metrics.overdueNextActionCount++;
      }

      // Brak kolejnego kroku
      const nextAct = nextActionIdx !== -1 ? String(row[nextActionIdx] || "").trim() : "";
      if (!nextAct) {
        metrics.missingNextStepCount++;
      }

      // Strona odpowiedzialna
      const side = sideIdx !== -1 ? String(row[sideIdx] || "").trim() : "";
      if (side.toLowerCase().includes("mieszkaniec")) {
        metrics.waitingResidentCount++;
      } else {
        metrics.waitingCompanyCount++;
      }

      // Zaplanowane na dzisiaj
      if (actDeadline) {
        const dStr = Utilities.formatDate(new Date(actDeadline), "Europe/Warsaw", "yyyy-MM-dd");
        if (dStr === todayStr) metrics.dueTodayCount++;
      }
    }
  }

  metrics.completionRate = metrics.totalTickets > 0 ? (metrics.resolvedTickets / metrics.totalTickets) : 0;
  metrics.avgFirstResponse = firstContactDiffs.length > 0 
    ? Math.round((firstContactDiffs.reduce((a, b) => a + b, 0) / firstContactDiffs.length) * 100) / 100 
    : 0;
  metrics.avgResolution = resolutionDiffs.length > 0 
    ? Math.round((resolutionDiffs.reduce((a, b) => a + b, 0) / resolutionDiffs.length) * 100) / 100 
    : 0;
  metrics.avgSatisfaction = satisfactionRatings.length > 0 
    ? Math.round((satisfactionRatings.reduce((a, b) => a + b, 0) / satisfactionRatings.length) * 100) / 100 
    : 0;
  metrics.satisfactionCount = satisfactionRatings.length;
  metrics.reviewRate = metrics.resolvedTickets > 0 ? (resolvedWithReviewCount / metrics.resolvedTickets) : 0;
  metrics.satisfactionRate = metrics.resolvedTickets > 0 ? (satisfactionRatings.length / metrics.resolvedTickets) : 0;

  return metrics;
}

/**
 * Konfiguruje zakładkę USTAWIENIA z autentycznym linkiem do opinii Google i regułami SLA
 */
function setupSettingsSheet(spreadsheet) {
  // Zapamiętanie ID arkusza dla wyzwalaczy czasowych
  if (spreadsheet && spreadsheet.getId) {
    try {
      PropertiesService.getScriptProperties().setProperty("SMARTCARE_SPREADSHEET_ID", spreadsheet.getId());
    } catch (_) {}
  }

  let settingsSheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.settings);
  if (!settingsSheet) {
    settingsSheet = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.settings);
  }

  const defaultSettings = [
    ["Nazwa przedsiębiorstwa", "ELWOZ ECO Sp. z o.o."],
    ["Nazwa placówki", "Punkt Obsługi Klienta w Kartuzach"],
    ["Adres placówki", "ul. Mściwoja II 14, 83-300 Kartuzy"],
    ["Adres e-mail do kontaktu", "kartuzy@elwozeco.pl"],
    ["Numer telefonu", "58 681 22 99"],
    ["Oficjalna strona internetowa", "https://elwozeco.pl/"],
    ["Nazwa nadawcy wiadomości", "ELWOZ ECO SmartCare – POK Kartuzy"],
    ["Zweryfikowany link do opinii Google", SMARTCARE_SETUP_CONFIG.verifiedGoogleReviewUrl],
    ["Tryb demonstracyjny / testowy", "TAK"],
    ["Zatwierdzony odbiorca testowy", SMARTCARE_SETUP_CONFIG.dedicatedTesterEmail],
    ["Automatyczne powiadomienia o nowych zgłoszeniach", "WŁĄCZONE"],
    ["Adres odbiorcy powiadomień", SMARTCARE_SETUP_CONFIG.dedicatedTesterEmail],
    ["Automatyczna analiza AI nowych zgłoszeń", "WŁĄCZONE"],
    ["SLA - Czas 1. reakcji PILNY (min)", "15"],
    ["SLA - Czas 1. reakcji WYSOKI (min)", "60"],
    ["SLA - Czas 1. reakcji STANDARDOWY (godz.)", "4"],
    ["SLA - Czas 1. reakcji NISKI (godz.)", "24"],
    ["Godziny pracy POK", "07:00 - 16:00 (Pn - Pt)"]
  ];

  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.getRange("A1:B1").merge()
      .setValue("ELWOZ ECO SmartCare – Konfiguracja Systemu (v0.2.7)")
      .setFontSize(12).setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");
    settingsSheet.setRowHeight(1, 35);

    settingsSheet.getRange(3, 1, defaultSettings.length, 2).setValues(defaultSettings);
    settingsSheet.getRange(3, 1, defaultSettings.length, 1).setFontWeight("bold").setBackground("#f8fafc");
  } else {
    const existing = settingsSheet.getRange(3, 1, Math.max(settingsSheet.getLastRow() - 2, 1), 2).getValues();
    const existingKeys = existing.map(r => String(r[0]).trim());

    for (let def of defaultSettings) {
      const idx = existingKeys.indexOf(def[0]);
      if (idx === -1) {
        settingsSheet.appendRow(def);
      } else {
        if (def[0] === "Zweryfikowany link do opinii Google") {
          const currentVal = String(existing[idx][1] || "").trim();
          if (!currentVal || currentVal.includes("PLACEHOLDER") || currentVal === "") {
            settingsSheet.getRange(idx + 3, 2).setValue(SMARTCARE_SETUP_CONFIG.verifiedGoogleReviewUrl);
          }
        }
      }
    }
  }

  settingsSheet.setColumnWidth(1, 320);
  settingsSheet.setColumnWidth(2, 420);

  Logger.log("Zakładka USTAWIENIA zaktualizowana dla v0.2.7.");
}

/**
 * Konfiguruje zakładkę HISTORIA KOMUNIKACJI
 */
function setupCommunicationHistorySheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.communicationHistory);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.communicationHistory);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange("A1:J1").merge()
      .setValue("ELWOZ ECO SmartCare – Rejestr Korespondencji i Działań Reputacyjnych (v0.2.7)")
      .setFontSize(12).setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);

    const headers = [
      "Numer zgłoszenia",
      "Data i godzina",
      "Rodzaj działania",
      "Kanał kontaktu",
      "Adres odbiorcy",
      "Temat wiadomości",
      "Treść wiadomości lub notatka z rozmowy",
      "Pracownik odpowiedzialny",
      "Status operacji",
      "Informacja o błędzie"
    ];

    sheet.getRange(2, 1, 1, headers.length).setValues([headers])
      .setBackground("#1b7a3e").setFontColor("#ffffff").setFontWeight("bold").setFontSize(9)
      .setVerticalAlignment("middle");
    sheet.setRowHeight(2, 30);
    sheet.setFrozenRows(2);

    sheet.setColumnWidth(1, 130);
    sheet.setColumnWidth(2, 130);
    sheet.setColumnWidth(3, 180);
    sheet.setColumnWidth(4, 90);
    sheet.setColumnWidth(5, 180);
    sheet.setColumnWidth(6, 220);
    sheet.setColumnWidth(7, 350);
    sheet.setColumnWidth(8, 140);
    sheet.setColumnWidth(9, 110);
    sheet.setColumnWidth(10, 160);
  }

  Logger.log("Zakładka HISTORIA KOMUNIKACJI zweryfikowana.");
}

/**
 * Konfiguruje zakładkę ZGŁOSZENIA z kompletnym modelem danych Customer Service Intelligence (v0.2.7)
 */
function setupTicketsSheet(spreadsheet, form) {
  let ticketSheet = null;
  const sheets = spreadsheet.getSheets();

  for (let s of sheets) {
    if (s.getFormUrl() || s.getName().indexOf("Odpowiedzi z formularza") !== -1 || s.getName() === SMARTCARE_SETUP_CONFIG.sheetTabs.tickets) {
      ticketSheet = s;
      break;
    }
  }

  if (!ticketSheet) {
    ticketSheet = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  } else {
    if (ticketSheet.getName() !== SMARTCARE_SETUP_CONFIG.sheetTabs.tickets) {
      ticketSheet.setName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
    }
  }

  // Kompletny zestaw kolumn operacyjnych v0.2.7
  const operationalHeaders = [
    "ID Zgłoszenia",
    "Status",
    "Priorytet",
    "Sugerowany priorytet AI",
    "Uzasadnienie priorytetu AI",
    "Stan analizy AI",
    "Szczegóły błędu AI",
    "Lokalna kontrola danych",
    "Wykryte sprzeczności AI",
    "Pracownik odpowiedzialny",
    "Następne działanie",
    "Strona odpowiedzialna",
    "Termin następnego działania",
    "Termin SLA 1. reakcji",
    "Przekroczenie SLA",
    "Notatka pracownika",
    "Data potwierdzenia przyjęcia",
    "Data pierwszego kontaktu",
    "Data ostatniego kontaktu",
    "Data rozwiązania",
    "Sposób rozwiązania sprawy",
    "Wynik kontaktu z mieszkańcem",
    "Ocena satysfakcji (1-5)",
    "Uwagi mieszkańca",
    "Prośba o opinię wysłana",
    "Data wysłania prośby o opinię",
    "Kategoria AI",
    "Streszczenie AI",
    "Brakujące informacje AI",
    "Sugerowane działanie AI",
    "Rekomendowany kolejny krok AI",
    "Proponowana odpowiedź AI"
  ];

  const lastCol = ticketSheet.getLastColumn();

  if (lastCol === 0) {
    const baseFormHeaders = [
      "Sygnatura czasowa",
      "Rodzaj zgłoszenia",
      "Rodzaj odpadów",
      "Miejscowość",
      "Ulica lub lokalizacja",
      "Numer posesji lub identyfikator miejsca",
      "Data wystąpienia problemu",
      "Opis zgłoszenia",
      "Imię i nazwisko",
      "Numer telefonu",
      "Adres e-mail",
      "Prośba o kontakt ze strony pracownika"
    ];
    const allHeaders = baseFormHeaders.concat(operationalHeaders);
    ticketSheet.getRange(1, 1, 1, allHeaders.length).setValues([allHeaders]);
  } else {
    const existingHeaderValues = ticketSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
    const missingHeaders = operationalHeaders.filter(h => existingHeaderValues.indexOf(h) === -1);
    
    if (missingHeaders.length > 0) {
      ticketSheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]);
      Logger.log("Dopisano nowe kolumny CSI v0.2.7: " + missingHeaders.join(", "));
    }
  }

  const totalCols = ticketSheet.getLastColumn();
  const headerRange = ticketSheet.getRange(1, 1, 1, totalCols);
  headerRange.setBackground("#1b7a3e").setFontColor("#ffffff").setFontWeight("bold").setFontSize(9)
    .setWrap(true).setVerticalAlignment("middle");
  
  ticketSheet.setRowHeight(1, 48);
  ticketSheet.setFrozenRows(1);
  ticketSheet.setFrozenColumns(2);

  formatTicketsSheetForReadability(ticketSheet);

  const headers = ticketSheet.getRange(1, 1, 1, totalCols).getValues()[0];
  const maxRows = Math.max(ticketSheet.getMaxRows(), 200);

  const setupColValidation = (colName, listValues, allowInvalid = false) => {
    const idx = headers.indexOf(colName) + 1;
    if (idx > 0) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(listValues, true)
        .setAllowInvalid(allowInvalid)
        .build();
      ticketSheet.getRange(2, idx, maxRows - 1, 1).setDataValidation(rule);
    }
  };

  setupColValidation("Status", SMARTCARE_SETUP_CONFIG.statuses);
  setupColValidation("Priorytet", SMARTCARE_SETUP_CONFIG.priorities);
  setupColValidation("Sugerowany priorytet AI", SMARTCARE_SETUP_CONFIG.priorities, true);
  setupColValidation("Stan analizy AI", SMARTCARE_SETUP_CONFIG.analysisStates, true);
  setupColValidation("Strona odpowiedzialna", SMARTCARE_SETUP_CONFIG.responsibleSides, true);
  setupColValidation("Przekroczenie SLA", ["TAK", "NIE"], true);
  setupColValidation("Ocena satysfakcji (1-5)", ["1", "2", "3", "4", "5"], true);
  setupColValidation("Prośba o opinię wysłana", ["TAK", "NIE"], false);
  setupColValidation("Wynik kontaktu z mieszkańcem", SMARTCARE_SETUP_CONFIG.contactResults, true);

  const statusCol = headers.indexOf("Status") + 1;
  const priorityCol = headers.indexOf("Priorytet") + 1;
  const aiStateCol = headers.indexOf("Stan analizy AI") + 1;
  setupConditionalFormatting(ticketSheet, statusCol, priorityCol, aiStateCol, maxRows);

  Logger.log("Zakładka ZGŁOSZENIA skonfigurowana dla v0.2.7.");
}

/**
 * Poprawia czytelność zakładki ZGŁOSZENIA (kompaktowa wysokość wierszy, zawijanie CLIP dla długich pól)
 */
function formatTicketsSheetForReadability(ticketSheet) {
  const lastRow = ticketSheet.getLastRow();
  const lastCol = ticketSheet.getLastColumn();
  if (lastCol === 0) return;

  const headers = ticketSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());

  ticketSheet.setRowHeight(1, 48);
  ticketSheet.getRange(1, 1, 1, lastCol).setWrap(true).setVerticalAlignment("middle");

  if (lastRow > 1) {
    ticketSheet.setRowHeights(2, lastRow - 1, 28);
  }

  const longTextColNames = [
    "Opis zgłoszenia",
    "Notatka pracownika",
    "Sposób rozwiązania sprawy",
    "Streszczenie AI",
    "Brakujące informacje AI",
    "Wykryte sprzeczności AI",
    "Sugerowane działanie AI",
    "Rekomendowany kolejny krok AI",
    "Proponowana odpowiedź AI"
  ];

  for (let colName of longTextColNames) {
    const idx = headers.indexOf(colName) + 1;
    if (idx > 0) {
      ticketSheet.getRange(2, idx, Math.max(lastRow - 1, 1), 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
      ticketSheet.setColumnWidth(idx, 220);
    }
  }

  const setWidthByHeader = (hName, width) => {
    const idx = headers.indexOf(hName) + 1;
    if (idx > 0) ticketSheet.setColumnWidth(idx, width);
  };

  setWidthByHeader("ID Zgłoszenia", 130);
  setWidthByHeader("Sygnatura czasowa", 140);
  setWidthByHeader("Status", 120);
  setWidthByHeader("Priorytet", 110);
  setWidthByHeader("Sugerowany priorytet AI", 120);
  setWidthByHeader("Stan analizy AI", 120);
  setWidthByHeader("Lokalna kontrola danych", 160);
  setWidthByHeader("Rodzaj zgłoszenia", 180);
  setWidthByHeader("Rodzaj odpadów", 140);
  setWidthByHeader("Miejscowość", 120);
  setWidthByHeader("Ulica lub lokalizacja", 180);
  setWidthByHeader("Numer posesji lub identyfikator miejsca", 120);
  setWidthByHeader("Imię i nazwisko", 150);
  setWidthByHeader("Adres e-mail", 180);
  setWidthByHeader("Numer telefonu", 130);
  setWidthByHeader("Prośba o kontakt ze strony pracownika", 200);
  setWidthByHeader("Pracownik odpowiedzialny", 150);
  setWidthByHeader("Następne działanie", 200);
  setWidthByHeader("Strona odpowiedzialna", 140);
  setWidthByHeader("Termin następnego działania", 150);
  setWidthByHeader("Termin SLA 1. reakcji", 150);
  setWidthByHeader("Przekroczenie SLA", 120);
  setWidthByHeader("Sposób rozwiązania sprawy", 220);
  setWidthByHeader("Notatka pracownika", 200);
  setWidthByHeader("Wynik kontaktu z mieszkańcem", 180);
  setWidthByHeader("Data potwierdzenia przyjęcia", 150);
  setWidthByHeader("Data pierwszego kontaktu", 150);
  setWidthByHeader("Data ostatniego kontaktu", 150);
  setWidthByHeader("Data rozwiązania", 150);
  setWidthByHeader("Prośba o opinię wysłana", 150);
  setWidthByHeader("Data wysłania prośby o opinię", 160);
  setWidthByHeader("Ocena satysfakcji (1-5)", 140);
  setWidthByHeader("Data zebrania opinii", 150);
}

/**
 * Formatowanie warunkowe dla statusów, priorytetów i stanów AI
 */
function setupConditionalFormatting(sheet, statusCol, priorityCol, aiStateCol, maxRows) {
  const rules = [];

  // 1. Statusy
  if (statusCol > 0) {
    const statusRange = sheet.getRange(2, statusCol, maxRows - 1, 1);
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Nowe").setBackground("#e3f2fd").setFontColor("#0d47a1").setRanges([statusRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Do weryfikacji").setBackground("#f3e8ff").setFontColor("#6b21a8").setRanges([statusRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("W realizacji").setBackground("#fef3c7").setFontColor("#92400e").setRanges([statusRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Oczekuje na informacje").setBackground("#f1f5f9").setFontColor("#475569").setRanges([statusRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Rozwiązane").setBackground("#e8f5e9").setFontColor("#1b5e20").setRanges([statusRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Zamknięte").setBackground("#cfd8dc").setFontColor("#263238").setRanges([statusRange]).build());
  }

  // 2. Czteropoziomowe Priorytety (PILNY, WYSOKI, STANDARDOWY, NISKI)
  if (priorityCol > 0) {
    const priorityRange = sheet.getRange(2, priorityCol, maxRows - 1, 1);
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("PILNY").setBackground("#fee2e2").setFontColor("#991b1b").setBold(true).setRanges([priorityRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("WYSOKI").setBackground("#ffedd5").setFontColor("#9a3412").setRanges([priorityRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("STANDARDOWY").setBackground("#dbeafe").setFontColor("#1e40af").setRanges([priorityRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("NISKI").setBackground("#dcfce7").setFontColor("#166534").setRanges([priorityRange]).build());
  }

  // 3. Stany analizy AI
  if (aiStateCol > 0) {
    const aiRange = sheet.getRange(2, aiStateCol, maxRows - 1, 1);
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Gotowa").setBackground("#ecfdf5").setFontColor("#065f46").setRanges([aiRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Wymaga weryfikacji").setBackground("#fef3c7").setFontColor("#92400e").setRanges([aiRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("W trakcie").setBackground("#f3e8ff").setFontColor("#6b21a8").setRanges([aiRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Błąd").setBackground("#fee2e2").setFontColor("#991b1b").setRanges([aiRange]).build());
  }

  sheet.setConditionalFormatRules(rules);
}

/**
 * Konfiguruje rozszerzoną zakładkę DASHBOARD (Customer Service Intelligence v0.2.7)
 */
function setupDashboardSheet(spreadsheet) {
  let dash = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.dashboard);
  if (!dash) {
    dash = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.dashboard, 0);
  }

  dash.clear();
  dash.setHiddenGridlines(false);

  // Nagłówek Dashboardu
  dash.getRange("A1:G1").merge()
    .setValue("ELWOZ ECO SmartCare – Panel Operacyjny Customer Service Intelligence (v0.2.7)")
    .setFontSize(13).setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  dash.setRowHeight(1, 44);

  dash.getRange("A2:G2").merge()
    .setValue("Rejon Kartuzy • Analityka zgłoszeń, monitoring SLA i zarządzanie kolejkiem spraw w czasie rzeczywistym")
    .setFontSize(9).setFontStyle("italic").setBackground("#f8fafc").setFontColor("#64748b")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  dash.setRowHeight(2, 24);

  // SEKCJA 1: Wolumeny operacyjne (Wiersze 4-5)
  dash.getRange("B4:F4").setValues([[
    "Wszystkie zgłoszenia",
    "Nowe",
    "W realizacji",
    "Zakończone (Rozwiązane / Zamknięte)",
    "Odsetek zakończonych"
  ]])
    .setFontWeight("bold").setFontSize(9).setBackground("#e2e8f0").setFontColor("#334155")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  dash.setRowHeight(4, 44);

  dash.getRange("B5:F5")
    .setFontSize(16).setFontWeight("bold").setFontColor("#143d59").setHorizontalAlignment("center")
    .setVerticalAlignment("middle").setBackground("#ffffff");
  dash.setRowHeight(5, 36);

  // SEKCJA 2: Czas & Standardy SLA (Wiersze 7-8)
  dash.getRange("B7:F7").setValues([[
    "Sprawy oczekujące na kontakt",
    "Śr. czas 1. reakcji (godz.)",
    "Śr. czas rozwiązania (godz.)",
    "Średnia satysfakcja (skala 1–5)",
    "Liczba zebranych ocen"
  ]])
    .setFontWeight("bold").setFontSize(9).setBackground("#e2e8f0").setFontColor("#334155")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  dash.setRowHeight(7, 44);

  dash.getRange("B8:F8")
    .setFontSize(14).setFontWeight("bold").setFontColor("#1b7a3e").setHorizontalAlignment("center")
    .setVerticalAlignment("middle").setBackground("#ffffff");
  dash.setRowHeight(8, 36);

  // SEKCJA 3: Kontrola Jakości i CSI (Wiersze 10-11)
  dash.getRange("B10:F10").setValues([[
    "Sprawy PILNE i WYSOKIE",
    "Przekroczone terminy SLA",
    "Brak pierwszej odpowiedzi",
    "Sprawy bez kolejnego kroku",
    "Wysłane prośby o opinię"
  ]])
    .setFontWeight("bold").setFontSize(9).setBackground("#dbeafe").setFontColor("#1e40af")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  dash.setRowHeight(10, 44);

  dash.getRange("B11:F11")
    .setFontSize(14).setFontWeight("bold").setFontColor("#b91c1c").setHorizontalAlignment("center")
    .setVerticalAlignment("middle").setBackground("#ffffff");
  dash.setRowHeight(11, 36);

  // Tabele pomocnicze do kategorii i statusów (wiersze 13-23)
  dash.getRange("B13:C13").setValues([["Kategoria zgłoszenia", "Liczba"]])
    .setFontWeight("bold").setBackground("#1b7a3e").setFontColor("#ffffff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);

  dash.getRange("E13:F13").setValues([["Status sprawy", "Liczba"]])
    .setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  dash.setRowHeight(13, 32);

  // SEKCJA 4: Diagnostyka Silnika & AI (Wiersze 24-26) (v0.2.8)
  dash.getRange("B24:F24").merge().setValue("DIAGNOSTYKA SILNIKA CRM I SZTUCZNEJ INTELIGENCJI (v0.2.8)")
    .setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  dash.setRowHeight(24, 28);

  dash.getRange("B25:F25").setValues([[
    "Odpowiedzi formularza ogółem",
    "Nieprzetworzone odpowiedzi (bez ID)",
    "Analizy AI zakończone sukcesem",
    "Błędy analizy AI",
    "Oczekujące w kolejce AI"
  ]])
    .setFontWeight("bold").setFontSize(9).setBackground("#e2e8f0").setFontColor("#334155")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  dash.setRowHeight(25, 36);

  dash.getRange("B26:F26")
    .setFontSize(14).setFontWeight("bold").setFontColor("#0f172a").setHorizontalAlignment("center")
    .setVerticalAlignment("middle").setBackground("#ffffff");
  dash.setRowHeight(26, 34);

  // Szerokości kolumn Dashboardu
  dash.setColumnWidth(1, 15);
  dash.setColumnWidth(2, 180);
  dash.setColumnWidth(3, 160);
  dash.setColumnWidth(4, 160);
  dash.setColumnWidth(5, 200);
  dash.setColumnWidth(6, 160);
  dash.setColumnWidth(7, 30);
  dash.setColumnWidth(8, 480);

  const ticketSheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  applyDashboardMetricsAndFormulas(dash, ticketSheet, spreadsheet);

  setupDashboardCharts(dash);

  Logger.log("Rozszerzona zakładka DASHBOARD (v0.2.7) przygotowana.");
}

/**
 * Aplikacja metryk na Dashboardzie z autokalibracją regionalną (pl_PL / en_US)
 */
function applyDashboardMetricsAndFormulas(dash, ticketSheet, spreadsheet) {
  const cols = ticketSheet ? getTicketsColumnMap(ticketSheet) : {
    id: "M", type: "B", fraction: "C", city: "D", timestamp: "A", contactRequest: "L",
    status: "N", priority: "O", firstContact: "AC", resolutionDate: "AE", satisfaction: "AH",
    reviewSent: "AJ", reviewDate: "AK"
  };

  const metrics = calculateDashboardMetrics(ticketSheet);
  const preferredSep = getFormulaSeparator(spreadsheet);
  const alternateSep = preferredSep === ";" ? "," : ";";

  function setFormulasWithSeparator(sep) {
    // Sekcja 1: Wolumeny
    dash.getRange("B5").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.id}2:${cols.id}${sep} "<>")${sep} 0)`);
    dash.getRange("C5").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}${sep} "Nowe")${sep} 0)`);
    dash.getRange("D5").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}${sep} "W realizacji") + COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}${sep} "Do weryfikacji")${sep} 0)`);
    dash.getRange("E5").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}${sep} "Rozwiązane") + COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}${sep} "Zamknięte")${sep} 0)`);
    dash.getRange("F5").setFormula(`=IF(B5>0${sep} E5/B5${sep} 0)`);
    dash.getRange("F5").setNumberFormat("0.0%");

    // Sekcja 2: Czas & Satysfakcja
    dash.getRange("B8").setFormula(
      `=IFERROR(COUNTIFS(ZGŁOSZENIA!${cols.contactRequest}2:${cols.contactRequest}${sep} "*Tak*"${sep} ZGŁOSZENIA!${cols.status}2:${cols.status}${sep} "Nowe") + COUNTIFS(ZGŁOSZENIA!${cols.contactRequest}2:${cols.contactRequest}${sep} "*Tak*"${sep} ZGŁOSZENIA!${cols.status}2:${cols.status}${sep} "Do weryfikacji")${sep} 0)`
    );
    dash.getRange("C8").setFormula(
      `=IFERROR(ROUND(AVERAGE(FILTER((ZGŁOSZENIA!${cols.firstContact}2:${cols.firstContact} - ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp}) * 24${sep} ISNUMBER(ZGŁOSZENIA!${cols.firstContact}2:${cols.firstContact})${sep} ISNUMBER(ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp})${sep} ZGŁOSZENIA!${cols.firstContact}2:${cols.firstContact} >= ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp}))${sep} 2)${sep} 0)`
    );
    dash.getRange("D8").setFormula(
      `=IFERROR(ROUND(AVERAGE(FILTER((ZGŁOSZENIA!${cols.resolutionDate}2:${cols.resolutionDate} - ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp}) * 24${sep} ISNUMBER(ZGŁOSZENIA!${cols.resolutionDate}2:${cols.resolutionDate})${sep} ISNUMBER(ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp})${sep} ZGŁOSZENIA!${cols.resolutionDate}2:${cols.resolutionDate} >= ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp}))${sep} 2)${sep} 0)`
    );
    dash.getRange("E8").setFormula(
      `=IFERROR(ROUND(AVERAGE(FILTER(ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}${sep} ISNUMBER(ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction})${sep} ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}>=1${sep} ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}<=5))${sep} 2)${sep} 0)`
    );
    dash.getRange("F8").setFormula(
      `=IFERROR(COUNT(FILTER(ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}${sep} ISNUMBER(ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction})${sep} ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}>=1${sep} ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}<=5))${sep} 0)`
    );

    // Sekcja 3: CSI & Kontrola jakości (v0.2.7)
    dash.getRange("B11").setValue(metrics.urgentHighCount);
    dash.getRange("C11").setValue(metrics.overdueSlaCount);
    dash.getRange("D11").setValue(metrics.missingFirstResponseCount);
    dash.getRange("E11").setValue(metrics.missingNextStepCount);
    dash.getRange("F11").setValue(metrics.reviewsSentCount);

    // Tabele kategorii
    for (let i = 0; i < SMARTCARE_SETUP_CONFIG.categories.length; i++) {
      const row = 14 + i;
      dash.getRange(row, 2).setValue(SMARTCARE_SETUP_CONFIG.categories[i]);
      dash.getRange(row, 3).setFormula(`=COUNTIF(ZGŁOSZENIA!${cols.type}2:${cols.type}${sep} "*" & B${row} & "*")`);
    }

    // Tabele statusów
    for (let j = 0; j < SMARTCARE_SETUP_CONFIG.statuses.length; j++) {
      const r = 14 + j;
      dash.getRange(r, 5).setValue(SMARTCARE_SETUP_CONFIG.statuses[j]);
      dash.getRange(r, 6).setFormula(`=COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}${sep} E${r})`);
    }
  }

  function hasAnyFormulaError() {
    const checkCells = ["B5", "C5", "D5", "E5", "F5", "B8", "C8", "D8", "E8", "F8"];
    for (let a of checkCells) {
      const val = String(dash.getRange(a).getValue() || "");
      if (val.startsWith("#")) return true;
    }
    for (let i = 0; i < SMARTCARE_SETUP_CONFIG.categories.length; i++) {
      const val = String(dash.getRange(14 + i, 3).getValue() || "");
      if (val.startsWith("#")) return true;
    }
    for (let j = 0; j < SMARTCARE_SETUP_CONFIG.statuses.length; j++) {
      const val = String(dash.getRange(14 + j, 6).getValue() || "");
      if (val.startsWith("#")) return true;
    }
    return false;
  }

  setFormulasWithSeparator(preferredSep);
  SpreadsheetApp.flush();

  if (hasAnyFormulaError()) {
    Logger.log(`Próba z separatorem alternatywnym '${alternateSep}'...`);
    setFormulasWithSeparator(alternateSep);
    SpreadsheetApp.flush();
  }

  // Obsługa braku ocen satysfakcji (v0.2.8: 'Brak ocen' zamiast 0)
  if (metrics.satisfactionCount === 0) {
    dash.getRange("E8").setValue("Brak ocen");
  }

  // Zasilenie Sekcji 4: Diagnostyka Silnika & AI (v0.2.8)
  dash.getRange("B26").setValue(metrics.totalFormResponses);
  dash.getRange("C26").setValue(metrics.unregisteredResponsesCount);
  dash.getRange("D26").setValue(metrics.successfulAiCount);
  dash.getRange("E26").setValue(metrics.failedAiCount);
  dash.getRange("F26").setValue(metrics.pendingAiCount);

  if (metrics.unregisteredResponsesCount > 0) {
    dash.getRange("C26").setBackground("#fee2e2").setFontColor("#991b1b");
  } else {
    dash.getRange("C26").setBackground("#dcfce7").setFontColor("#166534");
  }

  if (metrics.failedAiCount > 0) {
    dash.getRange("E26").setBackground("#fee2e2").setFontColor("#991b1b");
  } else {
    dash.getRange("E26").setBackground("#dcfce7").setFontColor("#166534");
  }

  // W przypadku problemów z formułami zasil bezpośrednimi danymi z Apps Script
  const displayedCount = Number(dash.getRange("B5").getValue());
  const needsDirectOverride = hasAnyFormulaError() || isNaN(displayedCount) || (displayedCount !== metrics.totalTickets && metrics.totalTickets > 0);

  if (needsDirectOverride) {
    Logger.log("Zastosowano bezpośrednie zasilenie liczbami z silnika Apps Script.");
    dash.getRange("B5").setValue(metrics.totalTickets);
    dash.getRange("C5").setValue(metrics.newTickets);
    dash.getRange("D5").setValue(metrics.inProgressTickets);
    dash.getRange("E5").setValue(metrics.resolvedTickets);
    dash.getRange("F5").setValue(metrics.completionRate).setNumberFormat("0.0%");

    dash.getRange("B8").setValue(metrics.waitingContactTickets);
    dash.getRange("C8").setValue(metrics.avgFirstResponse);
    dash.getRange("D8").setValue(metrics.avgResolution);
    dash.getRange("E8").setValue(metrics.avgSatisfaction);
    dash.getRange("F8").setValue(metrics.satisfactionCount);

    dash.getRange("B11").setValue(metrics.urgentHighCount);
    dash.getRange("C11").setValue(metrics.overdueSlaCount);
    dash.getRange("D11").setValue(metrics.missingFirstResponseCount);
    dash.getRange("E11").setValue(metrics.missingNextStepCount);
    dash.getRange("F11").setValue(metrics.reviewsSentCount);

    for (let i = 0; i < SMARTCARE_SETUP_CONFIG.categories.length; i++) {
      const row = 14 + i;
      dash.getRange(row, 2).setValue(SMARTCARE_SETUP_CONFIG.categories[i]);
      dash.getRange(row, 3).setValue(metrics.categoryCounts[SMARTCARE_SETUP_CONFIG.categories[i]] || 0);
    }

    for (let j = 0; j < SMARTCARE_SETUP_CONFIG.statuses.length; j++) {
      const r = 14 + j;
      dash.getRange(r, 5).setValue(SMARTCARE_SETUP_CONFIG.statuses[j]);
      dash.getRange(r, 6).setValue(metrics.statusCounts[SMARTCARE_SETUP_CONFIG.statuses[j]] || 0);
    }

    SpreadsheetApp.flush();
  }
}

/**
 * Tworzy 2 wykresy analityczne bez duplikowania
 */
function setupDashboardCharts(dash) {
  const existingCharts = dash.getCharts();
  for (let c of existingCharts) {
    const opts = c.getOptions();
    const title = opts.get('title') || '';
    if (title.includes("kategorii") || title.includes("statusów") || title.includes("Kategorii") || title.includes("Statusów")) {
      dash.removeChart(c);
    }
  }

  // Wykres 1: Kategorie (Bar)
  const categoryRange = dash.getRange("B13:C22");
  const chart1 = dash.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(categoryRange)
    .setPosition(13, 8, 0, 0)
    .setOption('title', 'Zgłoszenia według kategorii')
    .setOption('legend', { position: 'none' })
    .setOption('colors', ['#1b7a3e'])
    .setOption('width', 460)
    .setOption('height', 280)
    .build();
  dash.insertChart(chart1);

  // Wykres 2: Statusy (Column)
  const statusRange = dash.getRange("E13:F19");
  const chart2 = dash.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(statusRange)
    .setPosition(25, 8, 0, 0)
    .setOption('title', 'Zgłoszenia według statusów')
    .setOption('legend', { position: 'none' })
    .setOption('colors', ['#143d59'])
    .setOption('width', 460)
    .setOption('height', 240)
    .build();
  dash.insertChart(chart2);

  dash.setColumnWidth(8, 480);
}

/**
 * Weryfikuje integralność Dashboardu
 */
function validateDashboardIntegrity(spreadsheet) {
  const ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
  const dash = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.dashboard);
  const ticketSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  
  const errors = [];
  const checkedCells = [
    { cell: "B5", label: "Wszystkie zgłoszenia" },
    { cell: "C5", label: "Nowe" },
    { cell: "D5", label: "W realizacji" },
    { cell: "E5", label: "Zakończone" },
    { cell: "F5", label: "Odsetek zakończonych" },
    { cell: "B8", label: "Oczekujące na kontakt" },
    { cell: "C8", label: "Śr. czas 1. reakcji" },
    { cell: "D8", label: "Śr. czas rozwiązania" },
    { cell: "E8", label: "Średnia satysfakcja" },
    { cell: "F8", label: "Liczba zebranych ocen" },
    { cell: "B11", label: "Sprawy PILNE i WYSOKIE" },
    { cell: "C11", label: "Przekroczone SLA" },
    { cell: "D11", label: "Brak 1. odpowiedzi" },
    { cell: "E11", label: "Brak kolejnego kroku" },
    { cell: "F11", label: "Wysłane prośby o opinię" }
  ];

  if (!dash) {
    return {
      isValid: false,
      errors: ["Brak zakładki DASHBOARD w arkuszu."],
      displayedTickets: 0,
      actualTickets: 0,
      chartsCount: 0,
      locale: "nieznane"
    };
  }

  for (let item of checkedCells) {
    const range = dash.getRange(item.cell);
    const valStr = String(range.getValue() || "").trim();
    const dispStr = String(range.getDisplayValue() || "").trim();
    if (valStr.startsWith("#") || dispStr.startsWith("#")) {
      errors.push(`Komórka ${item.cell} (${item.label}) zawiera błąd: ${dispStr || valStr}`);
    }
  }

  for (let i = 0; i < SMARTCARE_SETUP_CONFIG.categories.length; i++) {
    const row = 14 + i;
    const cat = SMARTCARE_SETUP_CONFIG.categories[i];
    const valStr = String(dash.getRange(row, 3).getValue() || "").trim();
    if (valStr.startsWith("#")) {
      errors.push(`Kategoria '${cat}' (wiersz ${row}) zawiera błąd: ${valStr}`);
    }
  }

  for (let j = 0; j < SMARTCARE_SETUP_CONFIG.statuses.length; j++) {
    const r = 14 + j;
    const stat = SMARTCARE_SETUP_CONFIG.statuses[j];
    const valStr = String(dash.getRange(r, 6).getValue() || "").trim();
    if (valStr.startsWith("#")) {
      errors.push(`Status '${stat}' (wiersz ${r}) zawiera błąd: ${valStr}`);
    }
  }

  const actualTickets = countActualCrmTickets(ticketSheet);
  const displayedVal = dash.getRange("B5").getValue();
  const displayedTickets = Number(displayedVal);

  if (isNaN(displayedTickets)) {
    errors.push(`Komórka B5 nie zawiera liczby zgłoszeń: '${displayedVal}'.`);
  } else if (displayedTickets !== actualTickets) {
    errors.push(`Niezgodność liczby zgłoszeń: Dashboard pokazuje ${displayedTickets}, a w CRM znajduje się ${actualTickets}.`);
  }

  // Weryfikacja diagnostyczna v0.2.8: nieprzetworzone odpowiedzi formularza i błędy AI
  const metrics = calculateDashboardMetrics(ticketSheet);
  if (metrics.unregisteredResponsesCount > 0) {
    errors.push(`Wykryto ${metrics.unregisteredResponsesCount} nieprzetworzoną(-e) odpowiedź(-i) formularza bez nadanego ID Zgłoszenia (np. z powodu blokady LockService). Wymagane użycie funkcji 'Wykryj i uzupełnij brakujące zgłoszenia'.`);
  }
  if (metrics.failedAiCount > 0) {
    errors.push(`Wykryto ${metrics.failedAiCount} zgłoszenie(-a) ze statusem błędu AI ('Błąd'). Sprawdź kolumnę 'Szczegóły błędu AI' i uruchom 'Przetwórz kolejkę AI'.`);
  }

  const charts = dash.getCharts();
  if (charts.length < 2) {
    errors.push(`Na Dashboardzie znaleziono tylko ${charts.length} wykres(y), oczekiwano 2.`);
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    displayedTickets: displayedTickets,
    actualTickets: actualTickets,
    chartsCount: charts.length,
    locale: ss.getSpreadsheetLocale ? ss.getSpreadsheetLocale() : "nieznane"
  };
}

/**
 * Automatyczne odświeżenie formuł i statystyk Dashboardu
 */
function refreshDashboardStats(spreadsheet) {
  try {
    const ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    const dash = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.dashboard);
    if (!dash) return;

    setupDashboardSheet(ss);
    SpreadsheetApp.flush();
  } catch (err) {
    Logger.log("Błąd odświeżania statystyk Dashboardu: " + err.toString());
  }
}

/**
 * Konfiguruje zakładkę TESTY z uwzględnieniem scenariuszy A-J (v0.2.7)
 */
function setupTestsSheet(spreadsheet) {
  let testSheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tests);
  if (!testSheet) {
    testSheet = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.tests);
  }

  const testHeaders = [
    "ID Testu",
    "Osoba testująca",
    "Data testu",
    "Scenariusz testowy",
    "Oczekiwany rezultat",
    "Rzeczywisty rezultat",
    "Czas wykonania",
    "Status testu",
    "Uwagi",
    "Ewentualna poprawka"
  ];

  const testScenarios = [
    ["TEST-01", "", "", "Przygotowanie potwierdzenia przyjęcia zgłoszenia", "W oknie dialogowym pojawia się uzupełniony szablon potwierdzenia z danymi zgłoszenia", "", "", "Do wykonania", "", ""],
    ["TEST-02", "", "", "Edycja wiadomości przed wysyłką", "Pracownik może zmienić temat i treść w oknie dialogowym; zmiany są uwzględniane w wysyłce", "", "", "Do wykonania", "", ""],
    ["TEST-03", "", "", "Wysyłka na dedykowany adres testowy (wsb.student.tester@gmail.com)", "Wiadomość trafia WYŁĄCZNIE na wsb.student.tester@gmail.com; temat zawiera [TEST]", "", "", "Do wykonania", "", ""],
    ["TEST-04", "", "", "Zapis historii wysyłki w HISTORIA KOMUNIKACJI", "Po zatwierdzeniu wysyłki w arkuszu historii pojawia się kompletny wiersz ze statusem 'wysłano'", "", "", "Do wykonania", "", ""],
    ["TEST-05", "", "", "Obsługa zgłoszenia bez adresu e-mail", "System informuje pracownika o braku e-maila i proponuje odnotowanie kontaktu telefonicznego", "", "", "Do wykonania", "", ""],
    ["TEST-06", "", "", "Odnotowanie kontaktu telefonicznego", "Zapis notatki z rozmowy w historii komunikacji i aktualizacja daty ostatniego kontaktu w CRM", "", "", "Do wykonania", "", ""],
    ["TEST-07", "", "", "Przygotowanie informacji o rozwiązaniu problemu", "System wymaga uzupełnienia pola 'Sposób rozwiązania sprawy' przed przygotowaniem wiadomości", "", "", "Do wykonania", "", ""],
    ["TEST-08", "", "", "Zatwierdzony link do opinii Google", "Szablon zawiera neutralną prośbę i zweryfikowany link z USTAWIENIA; brak wymuszeń i nagród", "", "", "Do wykonania", "", ""],
    ["TEST-09", "", "", "Zapis oceny satysfakcji mieszkańca (1-5)", "Wpisanie oceny aktualizuje wskaźnik średniej satysfakcji w DASHBOARD; ocena nie jest wymagana do zamknięcia", "", "", "Do wykonania", "", ""],
    ["TEST-10", "", "", "Zabezpieczenie przed ponowną prośbą o opinię", "Gdy prośba była już wysłana, system wyświetla ostrzeżenie i żąda dodatkowego potwierdzenia", "", "", "Do wykonania", "", ""],
    ["TEST-11", "", "", "Twarda blokada serwerowa wysyłki na inny adres niż wsb.student.tester@gmail.com", "Próba wysłania na jakikolwiek inny adres zostaje bezwarunkowo zablokowana przez backend", "", "", "Do wykonania", "", ""],
    ["TEST-12", "", "", "Automatyczne powiadomienie o nowym zgłoszeniu", "Po wypełnieniu formularza dyspozytor natychmiast otrzymuje e-mail z powiadomieniem na wsb.student.tester@gmail.com", "", "", "Do wykonania", "", ""],
    ["TEST-13", "", "", "Dynamiczny Dashboard z 2 wykresami", "Dashboard automatycznie przelicza zgłoszenia testowe oraz odzwierciedla dane na wykresach kategorii i statusów", "", "", "Do wykonania", "", ""],
    // Nowe scenariusze akceptacyjne v0.2.7 (A - J):
    ["TEST-26", "", "", "Scenariusz A: Niekompletny adres i rozbieżność frakcji", "Lokalna kontrola danych wykrywa brak numeru posesji oraz rozbieżność frakcji; AI przygotowuje pytania uzupełniające", "", "", "Do wykonania", "", ""],
    ["TEST-27", "", "", "Scenariusz B: Powtarzający się problem (rekomendacja PILNY)", "AI wykrywa powtarzalność problemu, rekomenduje priorytet PILNY z uzasadnieniem i ustawia termin reakcji 15 min", "", "", "Do wykonania", "", ""],
    ["TEST-28", "", "", "Scenariusz C: Zwykła pochwała lub sugestia", "Lokalna kontrola nie wymaga numeru posesji; AI proponuje podziękowanie i zamyka sprawę bez zbędnych pytań", "", "", "Do wykonania", "", ""],
    ["TEST-29", "", "", "Scenariusz D: Zgłoszenie kompletne z pierwszą odpowiedzią", "AI natychmiast generuje kompletną odpowiedź; pracownik jednym kliknięciem otwiera i zatwierdza treść", "", "", "Do wykonania", "", ""],
    ["TEST-30", "", "", "Scenariusz E: Zaplanowane działanie na jutro (nie zakończone)", "Wpisanie zaplanowanego działania nie zamyka sprawy, lecz sugeruje aktualizację postępów", "", "", "Do wykonania", "", ""],
    ["TEST-31", "", "", "Scenariusz F: Sprawa przeterminowana SLA", "System wykrywa brak reakcji w określonym czasie i oznacza sprawę jako przeterminowaną na Dashboardzie", "", "", "Do wykonania", "", ""],
    ["TEST-32", "", "", "Scenariusz G: Sprawa bez zaplanowanego kolejnego kroku", "Dashboard odnotowuje brak kolejnego działania i wyróżnia sprawę w kolejce do przypisania zadania", "", "", "Do wykonania", "", ""],
    ["TEST-33", "", "", "Scenariusz H: Zgłoszenie z danymi osobowymi (filtr PII)", "Lokalny filtr PII blokuje automatyczne wysłanie danych do AI i oznacza stan jako 'Wymaga weryfikacji'", "", "", "Do wykonania", "", ""],
    ["TEST-34", "", "", "Scenariusz I: Obsługa limitu API / offline queue", "Przy niedostępności API system nie blokuje zapisu CRM i podstawia bezpieczny szablon roboczy", "", "", "Do wykonania", "", ""],
    ["TEST-35", "", "", "Scenariusz J: Jednoczesne wpłynięcie kilku zgłoszeń (LockService)", "LockService kolejkuje zgłoszenia, nadaje unikalne ID i zapobiega kolizjom danych", "", "", "Do wykonania", "", ""]
  ];

  if (testSheet.getLastRow() === 0) {
    testSheet.getRange("A1:J1").merge()
      .setValue("ELWOZ ECO SmartCare – Rejestr Testów Systemowych v0.2.7 (Customer Service Intelligence)")
      .setFontSize(12).setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");
    testSheet.setRowHeight(1, 38);

    testSheet.getRange(2, 1, 1, testHeaders.length).setValues([testHeaders])
      .setBackground("#1b7a3e").setFontColor("#ffffff").setFontWeight("bold").setFontSize(9)
      .setHorizontalAlignment("center");
    testSheet.setRowHeight(2, 30);

    testSheet.getRange(3, 1, testScenarios.length, 10).setValues(testScenarios);
  } else {
    const existingIds = testSheet.getRange(3, 1, Math.max(testSheet.getLastRow() - 2, 1), 1).getValues().map(r => r[0]);
    for (let scenario of testScenarios) {
      if (existingIds.indexOf(scenario[0]) === -1) {
        testSheet.appendRow(scenario);
      }
    }
  }

  const testStatusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Zaliczony", "Niezaliczony", "W toku", "Do wykonania"], true)
    .build();
  testSheet.getRange(3, 8, Math.max(testSheet.getLastRow() - 2, 1), 1).setDataValidation(testStatusRule);

  testSheet.setColumnWidth(1, 80);
  testSheet.setColumnWidth(2, 130);
  testSheet.setColumnWidth(3, 90);
  testSheet.setColumnWidth(4, 280);
  testSheet.setColumnWidth(5, 270);
  testSheet.setColumnWidth(6, 270);

  Logger.log("Zakładka TESTY zaktualizowana dla v0.2.7.");
}

/**
 * Konfiguruje zakładkę INSTRUKCJA AI (v0.2.7)
 */
function setupAiInstructionSheet(spreadsheet) {
  let aiSheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.aiGuide);
  if (!aiSheet) {
    aiSheet = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.aiGuide);
  }

  aiSheet.getRange("A1:D1").merge()
    .setValue("ELWOZ ECO SmartCare – Instrukcja Obsługi Zgłoszeń i Customer Service Intelligence (v0.2.7)")
    .setFontSize(12).setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  aiSheet.setRowHeight(1, 38);

  const instructions = [
    ["1. Zasada nadrzędna", "Sztuczna inteligencja pełni WYŁĄCZNIE rolę asystenta pracownika (Human-in-the-Loop). Pracownik weryfikuje i zatwierdza każdą wiadomość przed wysyłką."],
    ["2. Automatyczna analiza zgłoszeń", "Nowe zgłoszenia są automatycznie poddawane lokalnej walidacji i analizie przez model Gemini Flash. Wyniki (kategoria, streszczenie, sugerowany priorytet, sprzeczności, kolejny krok i pierwsza odpowiedź) trafiają bezpośrednio do CRM."],
    ["3. Ochrona wizerunku i zasady PR", "AI KATEGORYCZNIE NIE WOLNO:\n• ujawniać wewnętrznych kar, reprymend ani nagan pracowników,\n• deklarować uznania reklamacji lub winy przedsiębiorstwa,\n• wymyślać wykonanych działań naprawczych, tras ani fikcyjnych podjazdów,\n• ustalać sztywnych terminów realizacji ani obiecywać zadośćuczynień finansowych,\n• generować opinii w imieniu mieszkańców ani sugerować liczby gwiazdek."],
    ["4. Twarda anonimizacja danych", "Przed analizą w AI model otrzymuje wyłącznie zanonimizowany kontekst operacyjny (rodzaj problemu, frakcję, miejscowość bez ulicy i numeru posesji oraz treść zweryfikowaną przez pracownika). Wszelkie numery telefonów, adresy e-mail, nazwiska i numery PESEL są usuwane przed wysłaniem do modelu."],
    ["5. Priorytetyzacja i SLA", "System wyróżnia 4 poziomy priorytetów: PILNY (15 min), WYSOKI (1h), STANDARDOWY (4h) i NISKI (24h). AI rekomenduje priorytet, ale pracownik ma pełne prawo jego zmiany."],
    ["6. Dedykowane konto testowe", "Wszystkie usługi (Sheets, Forms, Apps Script, Gemini API) zarządzane są z konta: wsb.student.tester@gmail.com. Adres ten stanowi jedyny dopuszczalny cel wysyłki poczty."],
    ["7. Tryb Demonstracyjny", "Wszelka korespondencja mailowa jest bezwarunkowo kierowana na adres wsb.student.tester@gmail.com z prefiksem [TEST]."]
  ];

  for (let i = 0; i < instructions.length; i++) {
    const row = 3 + i;
    aiSheet.getRange(row, 1).setValue(instructions[i][0]).setFontWeight("bold").setBackground("#f8fafc").setVerticalAlignment("middle");
    aiSheet.getRange(row, 2, 1, 3).merge().setValue(instructions[i][1]).setWrap(true).setVerticalAlignment("middle");
    aiSheet.setRowHeight(row, i === 2 ? 95 : 55);
  }

  aiSheet.setColumnWidth(1, 230);
  aiSheet.setColumnWidth(2, 600);

  Logger.log("Zakładka INSTRUKCJA AI zaktualizowana do v0.2.7.");
}

/**
 * Instaluje wyzwalacz onFormSubmit
 */
function installFormSubmitTrigger(spreadsheet) {
  const triggers = ScriptApp.getUserTriggers(spreadsheet);
  let count = 0;

  for (let t of triggers) {
    if (t.getHandlerFunction() === "handleNewTicketSubmit") {
      count++;
      if (count > 1) {
        ScriptApp.deleteTrigger(t);
        Logger.log("Usunięto zduplikowany wyzwalacz handleNewTicketSubmit.");
      }
    }
  }

  if (count === 0) {
    ScriptApp.newTrigger("handleNewTicketSubmit")
      .forSpreadsheet(spreadsheet)
      .onFormSubmit()
      .create();
    Logger.log("Wyzwalacz handleNewTicketSubmit zainstalowany.");
  }
}

/**
 * Instaluje cykliczny wyzwalacz czasowy do automatycznego przetwarzania kolejki AI
 * oraz odzyskiwania pominiętych zgłoszeń formularza (v0.2.8).
 * Zapewnia dokładnie JEDEN wyzwalacz tego typu (deduplikacja).
 */
function installScheduledQueueTrigger(spreadsheet) {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;

  for (let t of triggers) {
    if (t.getHandlerFunction() === "scheduledQueueAndReconcile") {
      count++;
      if (count > 1) {
        ScriptApp.deleteTrigger(t);
        Logger.log("Usunięto zduplikowany wyzwalacz scheduledQueueAndReconcile.");
      }
    }
  }

  if (count === 0) {
    ScriptApp.newTrigger("scheduledQueueAndReconcile")
      .timeBased()
      .everyMinutes(5)
      .create();
    Logger.log("Zainstalowano cykliczny wyzwalacz scheduledQueueAndReconcile (co 5 minut).");
  }
}

/**
 * Cykliczne zadanie uruchamiane przez wyzwalacz czasowy (oraz ręcznie z menu).
 * Działa bez konieczności obecności aktywnego arkusza (używa getSmartCareSpreadsheet).
 */
function scheduledQueueAndReconcile() {
  const ss = getSmartCareSpreadsheet();
  if (!ss) {
    Logger.log("[scheduledQueueAndReconcile] Brak dostępu do arkusza.");
    return;
  }
  const ticketSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  if (!ticketSheet || ticketSheet.getLastRow() <= 1) return;

  // 1. Odzyskanie zawieszonych analiz AI w stanie "W trakcie" (>10 min)
  recoverStuckAiAnalyses(ticketSheet);

  // 2. Automatyczne wykrycie i uzupełnienie brakujących zgłoszeń formularza
  reconcileUnprocessedFormResponses(ticketSheet);

  // 3. Przetworzenie kolejki AI z kontrolą limitu 15 RPM
  if (typeof processAiAnalysisQueue === "function") {
    processAiAnalysisQueue(3);
  }
}

/**
 * Odzyskuje zgłoszenia zawieszone w stanie "W trakcie" dłużej niż 10 minut
 */
function recoverStuckAiAnalyses(ticketSheet) {
  if (!ticketSheet || ticketSheet.getLastRow() <= 1) return;
  const lastRow = ticketSheet.getLastRow();
  const lastCol = ticketSheet.getLastColumn();
  const headers = ticketSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());

  const idCol = headers.indexOf("ID Zgłoszenia") + 1;
  const aiStateCol = headers.indexOf("Stan analizy AI") + 1;
  const aiErrorCol = headers.indexOf("Szczegóły błędu AI") + 1;

  if (aiStateCol <= 0) return;

  const states = ticketSheet.getRange(2, aiStateCol, lastRow - 1, 1).getValues();
  const props = PropertiesService.getScriptProperties();
  const now = Date.now();
  const TEN_MINUTES_MS = 10 * 60 * 1000;

  for (let i = 0; i < states.length; i++) {
    const stateVal = String(states[i][0] || "").trim();
    if (stateVal === "W trakcie") {
      const rowNum = i + 2;
      const ticketId = idCol > 0 ? String(ticketSheet.getRange(rowNum, idCol).getValue() || "").trim() : `Wiersz ${rowNum}`;
      const inProgressTime = Number(props.getProperty("AI_IN_PROGRESS_" + ticketId) || 0);

      // Jeśli minęło ponad 10 minut (lub brak znacznika czasu), zresetuj do "Oczekuje"
      if (!inProgressTime || (now - inProgressTime > TEN_MINUTES_MS)) {
        ticketSheet.getRange(rowNum, aiStateCol).setValue("Oczekuje");
        if (aiErrorCol > 0) {
          ticketSheet.getRange(rowNum, aiErrorCol).setValue("Automatycznie wznowiono analizę po przekroczeniu limitu czasu (timeout > 10 min)");
        }
        props.deleteProperty("AI_IN_PROGRESS_" + ticketId);
        Logger.log(`[Auto-Recovery] Zresetowano zawieszoną analizę dla zgłoszenia ${ticketId} (wiersz ${rowNum}) do stanu Oczekuje.`);
      }
    }
  }
}

/**
 * Atomowa rezerwacja zgłoszenia do analizy AI we wszystkich ścieżkach (v0.2.8)
 * Blokuje równoległe uruchomienie analizy tej samej sprawy przez formularz, kolejkę i pracownika.
 */
function tryAcquireTicketAiLock(ticketId) {
  if (!ticketId) return false;
  const lock = LockService.getScriptLock();
  try {
    if (!lock.waitLock(3000)) return false;
    const props = PropertiesService.getScriptProperties();
    const inProgressKey = "AI_IN_PROGRESS_" + ticketId;
    const currentLockTime = Number(props.getProperty(inProgressKey) || 0);
    const now = Date.now();
    // Jeśli blokada jest aktywna i ma mniej niż 3 minuty, rezerwacja zajęta
    if (currentLockTime && (now - currentLockTime < 180000)) {
      return false;
    }
    props.setProperty(inProgressKey, String(now));
    return true;
  } catch (err) {
    return false;
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/**
 * Zwalnia atomową rezerwację zgłoszenia do analizy AI (v0.2.8)
 */
function releaseTicketAiLock(ticketId) {
  if (!ticketId) return;
  try {
    PropertiesService.getScriptProperties().deleteProperty("AI_IN_PROGRESS_" + ticketId);
  } catch (_) {}
}

/**
 * Obsługa nowego zgłoszenia po wysłaniu formularza Google Forms (v0.2.7)
 * - Nadanie unikalnego ID
 * - Wyliczenie terminu SLA
 * - Inicjalizacja stanu analizy AI
 * - Natychmiastowe powiadomienie e-mail do dyspozytora
 * - Nieblokujące uruchomienie automatycznej analizy AI
 */
function handleNewTicketSubmit(e) {
  const lock = LockService.getScriptLock();
  let assignedId = "";
  let sheet = null;
  let row = 0;
  let headers = [];

  // Faza 1: Błyskawiczna rejestracja pod LockService (<200ms)
  try {
    lock.waitLock(10000);

    if (e && e.range) {
      sheet = e.range.getSheet();
      row = e.range.getRow();
    } else {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      sheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
      row = sheet.getLastRow();
    }

    if (!sheet || row <= 1) return;

    const lastCol = sheet.getLastColumn();
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
    const getCol = (name) => headers.indexOf(name) + 1;

    const idCol = getCol("ID Zgłoszenia");
    const statusCol = getCol("Status");
    const priorityCol = getCol("Priorytet");
    const aiStateCol = getCol("Stan analizy AI");
    const slaDeadlineCol = getCol("Termin SLA 1. reakcji");
    const opinionCol = getCol("Prośba o opinię wysłana");
    const sideCol = getCol("Strona odpowiedzialna");

    if (idCol > 0) {
      const currentId = sheet.getRange(row, idCol).getValue();
      if (!currentId) {
        assignedId = getNextUniqueTicketId(sheet, idCol);
        sheet.getRange(row, idCol).setValue(assignedId);
        PropertiesService.getScriptProperties().setProperty("LAST_ASSIGNED_TICKET_ID", assignedId);
      } else {
        assignedId = String(currentId).trim();
      }
    }

    if (statusCol > 0 && !sheet.getRange(row, statusCol).getValue()) {
      sheet.getRange(row, statusCol).setValue("Nowe");
    }
    if (priorityCol > 0 && !sheet.getRange(row, priorityCol).getValue()) {
      sheet.getRange(row, priorityCol).setValue("STANDARDOWY");
    }
    if (aiStateCol > 0 && !sheet.getRange(row, aiStateCol).getValue()) {
      sheet.getRange(row, aiStateCol).setValue("Oczekuje");
    }
    if (sideCol > 0 && !sheet.getRange(row, sideCol).getValue()) {
      sheet.getRange(row, sideCol).setValue("Przedsiębiorstwo");
    }
    if (opinionCol > 0 && !sheet.getRange(row, opinionCol).getValue()) {
      sheet.getRange(row, opinionCol).setValue("NIE");
    }

    // Wyliczenie wstępnego terminu SLA w godzinach roboczych (4 godziny dla zgłoszenia Standardowego)
    if (slaDeadlineCol > 0 && !sheet.getRange(row, slaDeadlineCol).getValue()) {
      const now = new Date();
      const slaMinutes = SMARTCARE_SETUP_CONFIG.slaMinutes["STANDARDOWY"] || 240;
      const slaDate = calculateBusinessHoursDeadline(now, slaMinutes);
      sheet.getRange(row, slaDeadlineCol).setValue(slaDate).setNumberFormat("yyyy-MM-dd HH:mm");
    }

    SpreadsheetApp.flush();
    Logger.log(`[v0.2.8] Nowe zgłoszenie ${assignedId} w wierszu ${row} zarejestrowane pod LockService (<200ms).`);
  } catch (err) {
    Logger.log("Błąd w fazie rejestracji zgłoszenia: " + err.toString());
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }

  // Faza 2: Operacje asynchroniczne i powiadomienia (BEZWZGLĘDNIE POZA BLOKIEM LOCKSERVICE)
  if (sheet && row > 1 && assignedId) {
    // 1. Powiadomienie e-mail (odizolowane)
    try {
      sendNewTicketInternalNotification(sheet, row, headers, assignedId);
    } catch (mailErr) {
      Logger.log(`Błąd powiadomienia e-mail dla ${assignedId}: ${mailErr.toString()}`);
    }

    // 2. Automatyczna analiza AI (odizolowana, nie blokuje bazy)
    try {
      if (typeof triggerAutoAiAnalysisForTicket === "function") {
        triggerAutoAiAnalysisForTicket(sheet, row, headers, assignedId);
      }
    } catch (aiErr) {
      Logger.log(`Błąd automatycznej analizy AI dla ${assignedId}: ${aiErr.toString()}`);
    }

    // 3. Odświeżenie statystyk na Dashboardzie
    try {
      refreshDashboardStats(sheet.getParent());
    } catch (_) {}
  }
}

/**
 * Wysyła automatyczne powiadomienie e-mail o nowym zgłoszeniu do dyspozytora POK
 */
function sendNewTicketInternalNotification(sheet, row, headers, ticketId) {
  if (!ticketId) return;

  const ss = sheet.getParent();
  const settingsSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.settings);
  let notificationsEnabled = true;

  if (settingsSheet) {
    const sData = settingsSheet.getDataRange().getValues();
    for (let r of sData) {
      if (String(r[0]).trim() === "Automatyczne powiadomienia o nowych zgłoszeniach") {
        if (String(r[1]).trim().toUpperCase() === "WYŁĄCZONE") {
          notificationsEnabled = false;
        }
      }
    }
  }

  if (!notificationsEnabled) {
    Logger.log(`Powiadomienia e-mail wyłączone w USTAWIENIACH dla zgłoszenia ${ticketId}.`);
    return;
  }

  const rowValues = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  const getVal = (name) => {
    const idx = headers.indexOf(name);
    return idx !== -1 ? String(rowValues[idx] || "").trim() : "";
  };

  const ticketType = getVal("Rodzaj zgłoszenia") || "Zgłoszenie komunalne";
  const wasteFraction = getVal("Rodzaj odpadów") || "Nie określono";
  const city = getVal("Miejscowość") || "Rejon Kartuzy";
  const priority = getVal("Priorytet") || "STANDARDOWY";
  const contactReq = getVal("Prośba o kontakt ze strony pracownika");
  const nowFormatted = Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd HH:mm");
  const recipient = SMARTCARE_SETUP_CONFIG.dedicatedTesterEmail;

  const isUrgent = priority === "PILNY" || priority === "WYSOKI";
  const subjectPrefix = isUrgent ? "[PILNE][TEST]" : "[TEST]";
  const subject = `${subjectPrefix} Nowe zgłoszenie ${ticketId} – ${ticketType}`;
  const sheetUrl = ss.getUrl();

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
  <div style="background: ${isUrgent ? '#b91c1c' : '#143d59'}; color: #ffffff; padding: 18px 24px;">
    <h2 style="margin: 0; font-size: 18px; color: #ffffff;">ELWOZ ECO SmartCare – Nowe zgłoszenie ${isUrgent ? '(PILNE)' : ''}</h2>
    <span style="font-size: 12px; color: #a5f3fc;">Punkt Obsługi Klienta w Kartuzach • Powiadomienie wewnętrzne dyspozytora</span>
  </div>
  <div style="padding: 22px 24px; color: #1e293b; line-height: 1.5; font-size: 14px;">
    <p style="margin-top: 0;">Do rejestru SmartCare wpłynęło nowe zgłoszenie od mieszkańca:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b; width: 42%;">Numer zgłoszenia:</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${ticketId}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Priorytet:</td><td style="padding: 8px 0; font-weight: bold; color: ${isUrgent ? '#b91c1c' : '#1e40af'};">${priority}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Data wpłynięcia:</td><td style="padding: 8px 0; font-weight: bold;">${nowFormatted}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Rodzaj zgłoszenia:</td><td style="padding: 8px 0; font-weight: bold; color: #1b7a3e;">${ticketType}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Frakcja odpadów:</td><td style="padding: 8px 0;">${wasteFraction}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Miejscowość:</td><td style="padding: 8px 0;">${city}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Wnioskowano o kontakt:</td><td style="padding: 8px 0; font-weight: bold; color: ${contactReq ? '#b45309' : '#475569'};">${contactReq ? 'TAK (wymaga kontaktu)' : 'NIE'}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Status sprawy:</td><td style="padding: 8px 0;"><span style="background: #e3f2fd; color: #0d47a1; padding: 3px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px;">Nowe</span></td></tr>
    </table>

    <div style="text-align: center; margin: 24px 0 16px 0;">
      <a href="${sheetUrl}" style="background: #1b7a3e; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 13px;">Otwórz rejestr ZGŁOSZENIA w Google Sheets</a>
    </div>

    <p style="font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px; line-height: 1.4;">
      🔒 <strong>Bezpieczeństwo RODO:</strong> Pełne dane mieszkańca znajdują się w zabezpieczonym arkuszu CRM.<br>
      Wiadomość testowa w ramach projektu Uniwersytetu WSB Merito w Gdańsku (SmartCare v0.2.7).
    </p>
  </div>
</div>`;

  try {
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      htmlBody: htmlBody
    });

    const histSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.communicationHistory);
    if (histSheet) {
      histSheet.appendRow([
        ticketId,
        nowFormatted,
        "Powiadomienie wewnętrzne o nowym zgłoszeniu",
        "e-mail",
        recipient,
        subject,
        `Wysłano automatyczne powiadomienie do dyspozytora o nowym zgłoszeniu ${ticketId}.`,
        "System SmartCare",
        "wysłano (powiadomienie wewnętrzne)",
        ""
      ]);
    }
    Logger.log(`Wysłano powiadomienie e-mail o nowym zgłoszeniu ${ticketId} na ${recipient}.`);
  } catch (mailErr) {
    Logger.log("Błąd wysyłki powiadomienia e-mail (MailApp): " + mailErr.toString());
  }
}

/**
 * Generator unikalnego ID zgłoszenia (np. ELW-2026-0001)
 */
function getNextUniqueTicketId(sheet, idCol) {
  const lastRow = sheet.getLastRow();
  let maxSeq = 0;
  const regex = new RegExp("^" + SMARTCARE_SETUP_CONFIG.prefixId + "(\\d+)$");

  if (lastRow > 1) {
    const existingIds = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < existingIds.length; i++) {
      const val = String(existingIds[i][0]).trim();
      const match = val.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  try {
    const propId = PropertiesService.getScriptProperties().getProperty("LAST_ASSIGNED_TICKET_ID");
    if (propId) {
      const matchProp = String(propId).trim().match(regex);
      if (matchProp && matchProp[1]) {
        const propNum = parseInt(matchProp[1], 10);
        if (!isNaN(propNum) && propNum > maxSeq) {
          maxSeq = propNum;
        }
      }
    }
  } catch (e) {
    Logger.log("Błąd odczytu ScriptProperties: " + e.toString());
  }

  const nextSeq = maxSeq + 1;
  return SMARTCARE_SETUP_CONFIG.prefixId + String(nextSeq).padStart(4, "0");
}

/**
 * GŁÓWNA FUNKCJA AKTUALIZUJĄCA DO WERSJI v0.2.7 (Customer Service Intelligence)
 * Dostępna w menu arkusza: "📋 SmartCare -> 🚀 Aktualizuj system do v0.2.7"
 */
function updateSystemToV027() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  try {
    // 1. Zapewnienie ustawień SLA i AI w USTAWIENIACH
    setupSettingsSheet(ss);

    // 2. Dopisanie nowych kolumn CSI w arkuszu ZGŁOSZENIA
    const ticketSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
    if (ticketSheet) {
      setupTicketsSheet(ss);
      formatTicketsSheetForReadability(ticketSheet);

      // Migracja priorytetów i SLA dla istniejących spraw
      migrateTicketsDataV027(ticketSheet);
    }

    // 3. Konfiguracja Dashboardu z metrykami CSI
    setupDashboardSheet(ss);

    // 4. Aktualizacja wyzwalaczy (formularz + cykliczna kolejka AI v0.2.8)
    installFormSubmitTrigger(ss);
    installScheduledQueueTrigger(ss);

    // 5. Aktualizacja rejestru testów dla scenariuszy A-J
    setupTestsSheet(ss);

    // 6. Aktualizacja instrukcji AI
    setupAiInstructionSheet(ss);

    SpreadsheetApp.flush();

    // 7. Weryfikacja integralności
    const validation = validateDashboardIntegrity(ss);

    if (!validation.isValid) {
      let errorListHtml = "";
      for (let err of validation.errors) {
        errorListHtml += `<li style="color: #b91c1c; margin-bottom: 4px;">${escapeHtmlSetup(err)}</li>`;
      }

      const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; color: #1e293b; background: #fff5f5; margin: 0; }
    h3 { margin-top: 0; color: #991b1b; font-size: 16px; border-bottom: 2px solid #ef4444; padding-bottom: 6px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #fee2e2; color: #991b1b; margin-bottom: 12px; }
    .err-list { margin: 12px 0; padding-left: 18px; font-size: 12px; line-height: 1.5; background: #ffffff; border: 1px solid #fecaca; padding: 12px 14px 12px 30px; border-radius: 6px; }
    .btn-close { background: #991b1b; color: #ffffff; padding: 9px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; border: none; cursor: pointer; float: right; margin-top: 12px; }
  </style>
</head>
<body>
  <span class="badge">Wykryto błędy weryfikacji</span>
  <h3>ELWOZ ECO SmartCare v0.2.7 – Błąd weryfikacji Dashboardu</h3>
  <ul class="err-list">${errorListHtml}</ul>
  <button type="button" class="btn-close" onclick="google.script.host.close()">Zamknij</button>
</body>
</html>`;

      const outputErr = HtmlService.createHtmlOutput(errorHtml).setWidth(640).setHeight(480);
      ui.showModalDialog(outputErr, "SmartCare – Ostrzeżenie weryfikacji v0.2.7");
      return;
    }

    // Sukces
    const summaryHtml = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; color: #1e293b; background: #ffffff; margin: 0; }
    h3 { margin-top: 0; color: #143d59; font-size: 16px; border-bottom: 2px solid #1b7a3e; padding-bottom: 6px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #dcfce7; color: #166534; margin-bottom: 12px; }
    .kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
    .kpi-val { font-size: 16px; font-weight: bold; color: #1b7a3e; }
    .item-list { margin: 12px 0; padding-left: 18px; font-size: 13px; line-height: 1.6; }
    .item-list li { margin-bottom: 5px; }
    .btn-close { background: #1b7a3e; color: #ffffff; padding: 9px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; border: none; cursor: pointer; float: right; margin-top: 8px; }
    .btn-close:hover { background: #145a32; }
  </style>
</head>
<body>
  <span class="badge">Aktualizacja v0.2.7 zakończona sukcesem</span>
  <h3>ELWOZ ECO SmartCare v0.2.7 – Customer Service Intelligence</h3>
  
  <div class="kpi-box">
    <span>Liczba zweryfikowanych zgłoszeń w CRM:</span>
    <span class="kpi-val">${validation.actualTickets}</span>
  </div>

  <p style="font-size: 13px;">System został pomyślnie zaktualizowany do wersji <strong>v0.2.7</strong>:</p>
  
  <ul class="item-list">
    <li><strong>Automatyczna analiza AI:</strong> Nowe zgłoszenia są automatycznie walidowane i analizowane przez Gemini w tle.</li>
    <li><strong>Priorytetyzacja (PILNY, WYSOKI, STANDARDOWY, NISKI):</strong> Wdrożono czytelną hierarchię spraw z celami czasowymi SLA.</li>
    <li><strong>Centralny Panel Obsługi:</strong> W menu dostępna jest funkcja <em>🎯 Obsłuż zgłoszenie</em> łącząca pełny kontekst, AI i akcje.</li>
    <li><strong>Zarządzanie kolejnymi krokami:</strong> Śledzenie strony odpowiedzialnej (Przedsiębiorstwo vs Mieszkaniec) oraz terminów realizacji.</li>
    <li><strong>Dashboard CSI:</strong> Nowe wskaźniki spraw przeterminowanych, bez odpowiedzi i bez zaplanowanego działania.</li>
    <li><strong>Integralność danych:</strong> Brak błędów formuł (0 błędów), zachowane wszystkie rekordy i wykresy.</li>
  </ul>

  <button type="button" class="btn-close" onclick="google.script.host.close()">Zamknij</button>
</body>
</html>`;

    const output = HtmlService.createHtmlOutput(summaryHtml).setWidth(640).setHeight(500);
    ui.showModalDialog(output, "SmartCare – Aktualizacja do v0.2.7 (CSI)");
  } catch (err) {
    ui.alert("Błąd aktualizacji do v0.2.7", err.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Pomocnicza migracja danych dla v0.2.7 (normalizacja priorytetów, SLA, stany AI)
 */
function migrateTicketsDataV027(ticketSheet) {
  if (!ticketSheet || ticketSheet.getLastRow() <= 1) return;
  const lastCol = ticketSheet.getLastColumn();
  const headers = ticketSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const data = ticketSheet.getDataRange().getValues();

  const getColIdx = (name) => headers.indexOf(name);
  const prioIdx = getColIdx("Priorytet");
  const aiStateIdx = getColIdx("Stan analizy AI");
  const aiSugPrioIdx = getColIdx("Sugerowany priorytet AI");
  const sideIdx = getColIdx("Strona odpowiedzialna");
  const slaDeadlineIdx = getColIdx("Termin SLA 1. reakcji");
  const timeIdx = getColIdx("Sygnatura czasowa");
  const aiSummaryIdx = getColIdx("Streszczenie AI");

  for (let r = 1; r < data.length; r++) {
    const rowNum = r + 1;

    // Normalizacja priorytetu
    if (prioIdx !== -1) {
      let p = String(data[r][prioIdx] || "").toUpperCase().trim();
      if (!p || p === "STANDARDOWY" || p === "STANDARD") p = "STANDARDOWY";
      else if (p.includes("WYSOK")) p = "WYSOKI";
      else if (p.includes("PILN")) p = "PILNY";
      else if (p.includes("NISK")) p = "NISKI";
      if (data[r][prioIdx] !== p) ticketSheet.getRange(rowNum, prioIdx + 1).setValue(p);
    }

    // Stan analizy AI dla istniejących spraw
    if (aiStateIdx !== -1 && !data[r][aiStateIdx]) {
      const hasSummary = aiSummaryIdx !== -1 && String(data[r][aiSummaryIdx] || "").trim() !== "";
      ticketSheet.getRange(rowNum, aiStateIdx + 1).setValue(hasSummary ? "Gotowa" : "Oczekuje");
    }

    // Domyślna strona odpowiedzialna
    if (sideIdx !== -1 && !data[r][sideIdx]) {
      ticketSheet.getRange(rowNum, sideIdx + 1).setValue("Przedsiębiorstwo");
    }

    // Wyliczenie SLA dla zgłoszeń z pustym terminem
    if (slaDeadlineIdx !== -1 && !data[r][slaDeadlineIdx]) {
      const created = timeIdx !== -1 ? parseDateValue(data[r][timeIdx]) : null;
      if (created) {
        const slaDate = calculateBusinessHoursDeadline(new Date(created), 240);
        ticketSheet.getRange(rowNum, slaDeadlineIdx + 1).setValue(slaDate).setNumberFormat("yyyy-MM-dd HH:mm");
      }
    }
  }
}

/**
 * Kompatybilność z menu v0.2.6
 */
function updateSystemToV026() {
  updateSystemToV027();
}


/**
 * ============================================================================
 * MODUŁ STABILIZACJI SILNIKA & UZUPEŁNIANIA FORMULARZA (v0.2.8)
 * ============================================================================
 */

/**
 * Automatyczne wykrywanie nieprzetworzonych odpowiedzi Google Forms i uzupełnianie danych operacyjnych.
 * Bezpiecznie przypisuje kolejne numery ID (np. ELW-2026-XXXX), wstępny status, SLA i stan AI
 * BEZ ponownego wysyłania historycznych powiadomień e-mail.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} [ticketSheet] Opcjonalny arkusz zgłoszeń
 * @returns {{ reconciledCount: number, reconciledIds: string[] }}
 */
function reconcileUnprocessedFormResponses(ticketSheet) {
  const ss = ticketSheet ? ticketSheet.getParent() : getSmartCareSpreadsheet();
  const sheet = ticketSheet || (ss ? ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets) : null);
  if (!sheet) {
    return { reconciledCount: 0, reconciledIds: [] };
  }

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());

  const getColIdx = (names) => {
    for (let name of names) {
      const idx = headers.indexOf(name);
      if (idx !== -1) return idx;
    }
    for (let name of names) {
      const target = name.toLowerCase();
      for (let i = 0; i < headers.length; i++) {
        if (headers[i].toLowerCase().includes(target)) return i;
      }
    }
    return -1;
  };

  const idIdx = getColIdx(["ID Zgłoszenia", "Numer zgłoszenia", "ID"]);
  const timeIdx = getColIdx(["Sygnatura czasowa", "Timestamp", "Data"]);
  const typeIdx = getColIdx(["Rodzaj zgłoszenia", "Kategoria"]);
  const descIdx = getColIdx(["Opis zgłoszenia", "Opis"]);
  const statusIdx = getColIdx(["Status"]);
  const prioIdx = getColIdx(["Priorytet"]);
  const aiStateIdx = getColIdx(["Stan analizy AI"]);
  const sideIdx = getColIdx(["Strona odpowiedzialna"]);
  const opinionIdx = getColIdx(["Prośba o opinię wysłana"]);
  const slaIdx = getColIdx(["Termin SLA 1. reakcji"]);

  if (idIdx === -1) return { reconciledCount: 0, reconciledIds: [] };

  const reconciledIds = [];
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    // KRYTYCZNE (v0.2.8): Odczytujemy dane wiersza PO założeniu blokady!
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { reconciledCount: 0, reconciledIds: [] };
    const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    for (let i = 0; i < data.length; i++) {
      const rowNum = i + 2;
      // Pobieramy numer zgłoszenia bezpośrednio pod blokadą, sprawdzając również aktualną wartość w komórce
      const currentCellVal = String(sheet.getRange(rowNum, idIdx + 1).getValue() || "").trim();
      const timestampVal = timeIdx !== -1 ? data[i][timeIdx] : "";
      const descVal = descIdx !== -1 ? String(data[i][descIdx] || "").trim() : "";
      const typeVal = typeIdx !== -1 ? String(data[i][typeIdx] || "").trim() : "";

      const hasFormData = Boolean(timestampVal || descVal || typeVal);
      // Jeśli zgłoszenie ma dane formularza, ale NIE ma jeszcze ID (nie zostało w międzyczasie nadane przez submit)
      if (hasFormData && !currentCellVal) {
        const newId = getNextUniqueTicketId(sheet, idIdx + 1);
        sheet.getRange(rowNum, idIdx + 1).setValue(newId);
        PropertiesService.getScriptProperties().setProperty("LAST_ASSIGNED_TICKET_ID", newId);

        if (statusIdx !== -1 && !data[i][statusIdx]) {
          sheet.getRange(rowNum, statusIdx + 1).setValue("Nowe");
        }
        if (prioIdx !== -1 && !data[i][prioIdx]) {
          sheet.getRange(rowNum, prioIdx + 1).setValue("STANDARDOWY");
        }
        if (aiStateIdx !== -1 && !data[i][aiStateIdx]) {
          sheet.getRange(rowNum, aiStateIdx + 1).setValue("Oczekuje");
        }
        if (sideIdx !== -1 && !data[i][sideIdx]) {
          sheet.getRange(rowNum, sideIdx + 1).setValue("Przedsiębiorstwo");
        }
        if (opinionIdx !== -1 && !data[i][opinionIdx]) {
          sheet.getRange(rowNum, opinionIdx + 1).setValue("NIE");
        }

        if (slaIdx !== -1 && !data[i][slaIdx]) {
          const createdParsed = parseDateValue(timestampVal);
          const createdDate = createdParsed ? new Date(createdParsed) : new Date();
          const slaDate = calculateBusinessHoursDeadline(createdDate, 240);
          sheet.getRange(rowNum, slaIdx + 1).setValue(slaDate).setNumberFormat("yyyy-MM-dd HH:mm");
        }

        reconciledIds.push(newId);
        Logger.log(`[v0.2.8 Reconciliation] Uzupełniono brakujące zgłoszenie w wierszu ${rowNum}: ${newId}`);
      }
    }

    if (reconciledIds.length > 0) {
      SpreadsheetApp.flush();
    }
  } catch (err) {
    Logger.log("Błąd w reconcileUnprocessedFormResponses: " + err.toString());
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }

  // UWAGA: Nie wysyłamy powiadomień e-mail w reconciliation (zapobieganie spamowi dla historycznych spraw)
  return { reconciledCount: reconciledIds.length, reconciledIds: reconciledIds };
}

/**
 * ============================================================================
 * SERVICE API LAYER (Dla przyszłej aplikacji webowej SmartCare Manager v0.3.0)
 * ============================================================================
 * Wszystkie funkcje operują bezpośrednio w środowisku Google Apps Script (google.script.run)
 * bez wystawiania nieautoryzowanych publicznych webhooków HTTP.
 */

/**
 * Pobiera listę podsumowań zgłoszeń z opcjonalnym filtrowaniem
 * @param {Object} [filters] Opcjonalne filtry: status, priority, aiState, searchQuery
 * @returns {{ success: boolean, count: number, tickets: Array<Object> }}
 */
function apiGetTicketsList(filters = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, count: 0, tickets: [] };
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const getIdx = (name) => headers.indexOf(name);
  const idIdx = getIdx("ID Zgłoszenia");
  const timeIdx = getIdx("Sygnatura czasowa");
  const typeIdx = getIdx("Rodzaj zgłoszenia");
  const fractionIdx = getIdx("Rodzaj odpadów");
  const cityIdx = getIdx("Miejscowość");
  const streetIdx = getIdx("Ulica lub lokalizacja");
  const houseIdx = getIdx("Numer posesji lub identyfikator miejsca") !== -1 ? getIdx("Numer posesji lub identyfikator miejsca") : getIdx("Numer posesji");
  const nameIdx = getIdx("Imię i nazwisko");
  const emailIdx = getIdx("Adres e-mail");
  const phoneIdx = getIdx("Numer telefonu");
  const descIdx = getIdx("Opis zgłoszenia");
  const contactReqIdx = getIdx("Prośba o kontakt ze strony pracownika");
  const statusIdx = getIdx("Status");
  const prioIdx = getIdx("Priorytet");
  const aiStateIdx = getIdx("Stan analizy AI");
  const aiErrorIdx = getIdx("Szczegóły błędu AI");
  const nextActionIdx = getIdx("Następne działanie");
  const sideIdx = getIdx("Strona odpowiedzialna");
  const slaIdx = getIdx("Termin SLA 1. reakcji");
  const firstContactIdx = getIdx("Data pierwszego kontaktu");
  const empIdx = getIdx("Pracownik odpowiedzialny");
  const nextActionDeadlineIdx = getIdx("Termin następnego działania");

  const now = new Date();
  const list = [];

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const ticketId = idIdx !== -1 ? String(row[idIdx] || "").trim() : "";
    if (!ticketId) continue;

    const statusVal = statusIdx !== -1 ? String(row[statusIdx] || "Nowe").trim() : "Nowe";
    const prioVal = prioIdx !== -1 ? String(row[prioIdx] || "STANDARDOWY").trim() : "STANDARDOWY";
    const aiStateVal = aiStateIdx !== -1 ? String(row[aiStateIdx] || "Oczekuje").trim() : "Oczekuje";

    if (filters.status && filters.status !== "Wszystkie" && statusVal !== filters.status) continue;
    if (filters.priority && filters.priority !== "Wszystkie" && prioVal !== filters.priority) continue;
    if (filters.aiState && filters.aiState !== "Wszystkie" && aiStateVal !== filters.aiState) continue;

    const desc = descIdx !== -1 ? String(row[descIdx] || "") : "";
    const residentName = nameIdx !== -1 ? String(row[nameIdx] || "") : "";
    const street = streetIdx !== -1 ? String(row[streetIdx] || "") : "";
    const city = cityIdx !== -1 ? String(row[cityIdx] || "") : "";

    if (filters.searchQuery) {
      const q = String(filters.searchQuery).toLowerCase().trim();
      const matches = ticketId.toLowerCase().includes(q) ||
        residentName.toLowerCase().includes(q) ||
        street.toLowerCase().includes(q) ||
        city.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q);
      if (!matches) continue;
    }

    const slaDate = slaIdx !== -1 ? parseDateValue(row[slaIdx]) : null;
    const firstContactTime = firstContactIdx !== -1 ? parseDateValue(row[firstContactIdx]) : null;
    const hasFirstContact = Boolean(firstContactTime);
    const isClosed = statusVal === "Rozwiązane" || statusVal === "Zamknięte";
    
    // Rozróżnienie aktualnej zaległości od historycznego przekroczenia (v0.2.8):
    // Zgłoszenie z udzieloną już odpowiedzią NIE JEST oznaczane jako zalegające z 1. reakcją!
    const isOverdueFirstResponse = Boolean(!hasFirstContact && !isClosed && slaDate && slaDate < now.getTime());
    const slaBreachedHistorically = Boolean(hasFirstContact && slaDate && firstContactTime > slaDate);
    const nextActDeadlineTime = nextActionDeadlineIdx !== -1 ? parseDateValue(row[nextActionDeadlineIdx]) : null;
    const isOverdueNextAction = Boolean(!isClosed && nextActDeadlineTime && nextActDeadlineTime < now.getTime());

    list.push({
      ticketId: ticketId,
      timestamp: timeIdx !== -1 && row[timeIdx] ? Utilities.formatDate(new Date(parseDateValue(row[timeIdx]) || Date.now()), "Europe/Warsaw", "yyyy-MM-dd HH:mm") : "",
      ticketType: typeIdx !== -1 ? String(row[typeIdx] || "") : "",
      wasteFraction: fractionIdx !== -1 ? String(row[fractionIdx] || "") : "",
      city: city,
      street: street,
      houseNumber: houseIdx !== -1 ? String(row[houseIdx] || "") : "",
      residentName: residentName,
      residentEmail: emailIdx !== -1 ? String(row[emailIdx] || "") : "",
      residentPhone: phoneIdx !== -1 ? String(row[phoneIdx] || "") : "",
      contactRequest: contactReqIdx !== -1 ? String(row[contactReqIdx] || "").toLowerCase().includes("tak") : false,
      status: statusVal,
      priority: prioVal,
      aiState: aiStateVal,
      aiErrorDetails: aiErrorIdx !== -1 ? String(row[aiErrorIdx] || "") : "",
      assignedEmployee: empIdx !== -1 ? String(row[empIdx] || "") : "",
      nextAction: nextActionIdx !== -1 ? String(row[nextActionIdx] || "") : "",
      responsibleSide: sideIdx !== -1 ? String(row[sideIdx] || "Przedsiębiorstwo") : "Przedsiębiorstwo",
      nextActionDeadline: nextActDeadlineTime ? Utilities.formatDate(new Date(nextActDeadlineTime), "Europe/Warsaw", "yyyy-MM-dd HH:mm") : "",
      slaDeadline: slaDate ? Utilities.formatDate(new Date(slaDate), "Europe/Warsaw", "yyyy-MM-dd HH:mm") : "",
      hasFirstContact: hasFirstContact,
      firstContactDate: firstContactTime ? Utilities.formatDate(new Date(firstContactTime), "Europe/Warsaw", "yyyy-MM-dd HH:mm") : "",
      overdueSla: isOverdueFirstResponse,
      isOverdueFirstResponse: isOverdueFirstResponse,
      slaBreachedHistorically: slaBreachedHistorically,
      isOverdueNextAction: isOverdueNextAction
    });
  }

  return { success: true, count: list.length, tickets: list };
}

/**
 * Pobiera pełne szczegóły pojedynczego zgłoszenia po ID
 * @param {string} ticketId Numer sprawy (np. ELW-2026-0001)
 * @returns {{ success: boolean, ticket?: Object, error?: string }}
 */
function apiGetTicketDetails(ticketId) {
  if (!ticketId) return { success: false, error: "Brak parametru ticketId." };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  if (!sheet) return { success: false, error: "Brak zakładki ZGŁOSZENIA." };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const idCol = headers.indexOf("ID Zgłoszenia") + 1;
  if (idCol <= 0) return { success: false, error: "Brak kolumny ID Zgłoszenia." };

  const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  let targetRow = -1;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(ticketId).trim()) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow === -1) {
    return { success: false, error: `Nie odnaleziono zgłoszenia o numerze ${ticketId}.` };
  }

  const rowValues = sheet.getRange(targetRow, 1, 1, lastCol).getValues()[0];
  const ticketObj = { rowNumber: targetRow };
  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    let val = rowValues[c];
    if (val instanceof Date) {
      val = Utilities.formatDate(val, "Europe/Warsaw", "yyyy-MM-dd HH:mm");
    } else {
      val = val !== null && val !== undefined ? String(val).trim() : "";
    }
    ticketObj[h] = val;
  }

  return { success: true, ticket: ticketObj };
}

/**
 * Pobiera wyniki analizy AI dla danego zgłoszenia
 * @param {string} ticketId Numer sprawy
 * @returns {{ success: boolean, aiAnalysis?: Object, error?: string }}
 */
function apiGetAiAnalysis(ticketId) {
  const res = apiGetTicketDetails(ticketId);
  if (!res.success) return res;

  const t = res.ticket;
  return {
    success: true,
    ticketId: ticketId,
    aiAnalysis: {
      kategoria: t["Kategoria AI"] || "",
      streszczenie: t["Streszczenie AI"] || "",
      sugerowanyPriorytet: t["Sugerowany priorytet AI"] || "",
      uzasadnieniePriorytetu: t["Uzasadnienie priorytetu AI"] || "",
      brakujaceInformacje: t["Brakujące informacje AI"] || "",
      wykryteSprzecznosci: t["Wykryte sprzeczności AI"] || "",
      sugerowaneDzialanie: t["Sugerowane działanie AI"] || "",
      rekomendowanyKrok: t["Rekomendowany kolejny krok AI"] || "",
      proponowanaOdpowiedz: t["Proponowana odpowiedź AI"] || "",
      stanAnalizy: t["Stan analizy AI"] || "Oczekuje",
      szczegolyBledu: t["Szczegóły błędu AI"] || "",
      lokalnaKontrola: t["Lokalna kontrola danych"] || ""
    }
  };
}

/**
 * Pobiera historię komunikacji dla zgłoszenia
 * @param {string} ticketId Numer sprawy
 * @returns {{ success: boolean, history: Array<Object> }}
 */
function apiGetCommunicationHistory(ticketId) {
  if (!ticketId) return { success: false, error: "Brak parametru ticketId." };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const histSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.communicationHistory);
  if (!histSheet || histSheet.getLastRow() <= 1) {
    return { success: true, ticketId: ticketId, history: [] };
  }

  const data = histSheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0]).trim() === String(ticketId).trim()) {
      list.push({
        ticketId: String(row[0]).trim(),
        date: row[1] instanceof Date ? Utilities.formatDate(row[1], "Europe/Warsaw", "yyyy-MM-dd HH:mm") : String(row[1] || ""),
        type: String(row[2] || ""),
        channel: String(row[3] || ""),
        recipient: String(row[4] || ""),
        subject: String(row[5] || ""),
        content: String(row[6] || ""),
        sender: String(row[7] || ""),
        status: String(row[8] || ""),
        note: String(row[9] || "")
      });
    }
  }

  return { success: true, ticketId: ticketId, history: list };
}

/**
 * Pobiera wszystkie metryki i KPI dashboardu
 * @returns {{ success: boolean, metrics: Object }}
 */
function apiGetDashboardStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ticketSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  const metrics = calculateDashboardMetrics(ticketSheet);
  return { success: true, metrics: metrics };
}

/**
 * Pobiera listę pilnych zgłoszeń wymagających podjęcia działania
 * @returns {{ success: boolean, count: number, actions: Array<Object> }}
 */
function apiGetNextActionsList() {
  const listRes = apiGetTicketsList();
  if (!listRes.success) return listRes;

  const actionable = listRes.tickets.filter(t => {
    const isClosed = t.status === "Rozwiązane" || t.status === "Zamknięte";
    if (isClosed) return false;
    return Boolean(!t.nextAction || t.overdueSla || t.responsibleSide === "Przedsiębiorstwo" || t.aiState === "Błąd" || t.aiState === "Oczekuje");
  });

  return { success: true, count: actionable.length, actions: actionable };
}

/**
 * Pobiera diagnostykę stanu silnika i środowiska
 * @returns {{ success: boolean, diagnostics: Object }}
 */
function apiGetDiagnostics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ticketSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  const metrics = calculateDashboardMetrics(ticketSheet);
  const validation = validateDashboardIntegrity(ss);

  const triggers = ScriptApp.getUserTriggers(ss);
  const hasSubmitTrigger = triggers.some(t => t.getHandlerFunction() === "handleNewTicketSubmit");
  const apiKeyConfigured = Boolean(PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY"));

  return {
    success: true,
    diagnostics: {
      version: SMARTCARE_SETUP_CONFIG.version,
      locale: ss.getSpreadsheetLocale ? ss.getSpreadsheetLocale() : "nieznane",
      totalFormResponses: metrics.totalFormResponses,
      totalRegisteredTickets: metrics.totalRegisteredTickets,
      unregisteredResponsesCount: metrics.unregisteredResponsesCount,
      successfulAiCount: metrics.successfulAiCount,
      failedAiCount: metrics.failedAiCount,
      pendingAiCount: metrics.pendingAiCount,
      triggersInstalled: hasSubmitTrigger,
      geminiApiKeyConfigured: apiKeyConfigured,
      dashboardValid: validation.isValid,
      integrityErrors: validation.errors
    }
  };
}

/**
 * Bezpieczna aktualizacja pól operacyjnych zgłoszenia
 * @param {string} ticketId Numer sprawy
 * @param {Object} updates Pola do zaktualizowania
 * @returns {{ success: boolean, ticketId: string, updatedFields?: string[], error?: string }}
 */
function apiUpdateTicket(ticketId, updates = {}) {
  if (!ticketId) return { success: false, error: "Brak parametru ticketId." };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  if (!sheet) return { success: false, error: "Brak zakładki ZGŁOSZENIA." };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

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

    const allowedFields = {
      status: "Status",
      priority: "Priorytet",
      assignedEmployee: "Pracownik odpowiedzialny",
      nextAction: "Następne działanie",
      responsibleSide: "Strona odpowiedzialna",
      nextActionDeadline: "Termin następnego działania",
      employeeNotes: "Notatka pracownika",
      resolutionMethod: "Sposób rozwiązania sprawy",
      residentContactResult: "Wynik kontaktu z mieszkańcem"
    };

    // Sprawdzenie wymogu resolutionMethod przy zamykaniu (v0.2.8)
    const targetStatus = updates.status ? String(updates.status).trim() : "";
    const isClosing = targetStatus === "Rozwiązane" || targetStatus === "Zamknięte";
    
    if (isClosing) {
      const resCol = headers.indexOf("Sposób rozwiązania sprawy") + 1;
      const existingRes = resCol > 0 ? String(sheet.getRange(row, resCol).getValue() || "").trim() : "";
      const updateRes = updates.resolutionMethod !== undefined ? String(updates.resolutionMethod).trim() : "";
      const effectiveRes = updateRes || existingRes;

      if (!effectiveRes || effectiveRes.length < 5) {
        throw new Error("Nie można zamknąć zgłoszenia bez podania potwierdzonego sposobu rozwiązania sprawy (resolutionMethod).");
      }
    }

    const statusCol = headers.indexOf("Status") + 1;
    const existingStatus = statusCol > 0 ? String(sheet.getRange(row, statusCol).getValue() || "").trim() : "";
    const wasAlreadyClosed = existingStatus === "Rozwiązane" || existingStatus === "Zamknięte";

    const updatedKeys = [];
    for (let k in updates) {
      if (allowedFields[k]) {
        setField(allowedFields[k], updates[k]);
        updatedKeys.push(k);
      }
    }

    // Tylko przy przejściu ze statusu otwartego na zamknięty ustawiamy nową datę rozwiązania
    if (isClosing && !wasAlreadyClosed) {
      setField("Data rozwiązania", new Date());
    }

    // Jeśli pracownik zatwierdził lub zmienił priorytet, rejestrujemy świadome zatwierdzenie (v0.2.8)
    if (updates.priority) {
      PropertiesService.getScriptProperties().setProperty("PRIORITY_APPROVED_" + ticketId, String(updates.priority).toUpperCase().trim());
      const timeCol = headers.indexOf("Sygnatura czasowa") + 1;
      const slaCol = headers.indexOf("Termin SLA 1. reakcji") + 1;
      if (slaCol > 0) {
        const timeVal = timeCol > 0 ? sheet.getRange(row, timeCol).getValue() : null;
        const createdParsed = parseDateValue(timeVal);
        const createdDate = createdParsed ? new Date(createdParsed) : new Date();
        const pUpper = String(updates.priority).toUpperCase().trim();
        const slaMinutes = SMARTCARE_SETUP_CONFIG.slaMinutes[pUpper] || 240;
        const newSla = calculateBusinessHoursDeadline(createdDate, slaMinutes);
        sheet.getRange(row, slaCol).setValue(newSla).setNumberFormat("yyyy-MM-dd HH:mm");
      }
    }

    SpreadsheetApp.flush();
    try { refreshDashboardStats(ss); } catch (_) {}

    return { success: true, ticketId: ticketId, updatedFields: updatedKeys };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/**
 * Uruchamia pojedynczą analizę AI dla danego zgłoszenia przez API
 * @param {string} ticketId Numer sprawy
 * @returns {{ success: boolean, ticketId?: string, aiState?: string, message?: string, error?: string }}
 */
function apiTriggerAiAnalysis(ticketId) {
  const ss = getSmartCareSpreadsheet() || SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, error: "Brak arkusza kalkulacyjnego." };
  const sheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  if (!sheet) return { success: false, error: "Brak zakładki ZGŁOSZENIA." };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const idCol = headers.indexOf("ID Zgłoszenia") + 1;
  const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();

  let targetRow = -1;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(ticketId).trim()) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow === -1) return { success: false, error: `Nie znaleziono zgłoszenia ${ticketId}.` };

  if (typeof triggerAutoAiAnalysisForTicket === "function") {
    try {
      triggerAutoAiAnalysisForTicket(sheet, targetRow, headers, ticketId, true);

      const aiStateCol = headers.indexOf("Stan analizy AI") + 1;
      const aiErrorCol = headers.indexOf("Szczegóły błędu AI") + 1;
      const finalState = aiStateCol > 0 ? String(sheet.getRange(targetRow, aiStateCol).getValue() || "").trim() : "";
      const errorDetails = aiErrorCol > 0 ? String(sheet.getRange(targetRow, aiErrorCol).getValue() || "").trim() : "";

      if (finalState === "Błąd") {
        return {
          success: false,
          ticketId: ticketId,
          aiState: "Błąd",
          error: errorDetails || "Analiza AI zakończyła się błędem."
        };
      }

      return {
        success: true,
        ticketId: ticketId,
        aiState: finalState,
        message: `Analiza AI dla ${ticketId} zakończona w stanie: ${finalState}.`
      };
    } catch (e) {
      return { success: false, ticketId: ticketId, aiState: "Błąd", error: e.toString() };
    }
  }
  return { success: false, error: "Funkcja triggerAutoAiAnalysisForTicket nie jest dostępna." };
}

/**
 * Uruchamia procedurę uzupełniania nieprzetworzonych zgłoszeń przez API
 * @returns {{ success: boolean, reconciledCount: number, reconciledIds: string[] }}
 */
function apiReconcileUnprocessedTickets() {
  const res = reconcileUnprocessedFormResponses();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try { refreshDashboardStats(ss); } catch (_) {}
  return { success: true, reconciledCount: res.reconciledCount, reconciledIds: res.reconciledIds };
}

/**
 * ============================================================================
 * GŁÓWNA FUNKCJA AKTUALIZUJĄCA DO WERSJI v0.2.8 (Customer Service Intelligence)
 * ============================================================================
 */
function updateSystemToV028() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  try {
    // 1. Zapewnienie ustawień w USTAWIENIACH
    setupSettingsSheet(ss);

    // 2. Dopisanie nowej kolumny 'Szczegóły błędu AI' w arkuszu ZGŁOSZENIA
    const ticketSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
    if (ticketSheet) {
      setupTicketsSheet(ss);
      formatTicketsSheetForReadability(ticketSheet);

      // Normalizacja priorytetów i SLA
      migrateTicketsDataV027(ticketSheet);

      // Wykrycie i uzupełnienie nieprzetworzonych zgłoszeń (np. 26.11.2026, 10:42:11)
      const reconRes = reconcileUnprocessedFormResponses(ticketSheet);
      if (reconRes.reconciledCount > 0) {
        Logger.log(`[v0.2.8] Przywrócono i nadano ID dla ${reconRes.reconciledCount} zgłoszeń: ${reconRes.reconciledIds.join(', ')}`);
      }
    }

    // 3. Konfiguracja Dashboardu z sekcją Diagnostyki Silnika & AI
    setupDashboardSheet(ss);

    // 4. Aktualizacja wyzwalaczy (formularz + cykliczna kolejka AI v0.2.8)
    installFormSubmitTrigger(ss);
    installScheduledQueueTrigger(ss);

    // 5. Aktualizacja rejestru testów
    setupTestsSheet(ss);

    // 6. Aktualizacja instrukcji AI
    setupAiInstructionSheet(ss);

    SpreadsheetApp.flush();

    // 7. Weryfikacja integralności
    const validation = validateDashboardIntegrity(ss);

    if (!validation.isValid) {
      let errorListHtml = "";
      for (let err of validation.errors) {
        errorListHtml += `<li style="color: #b91c1c; margin-bottom: 4px;">${escapeHtmlSetup(err)}</li>`;
      }

      const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; color: #1e293b; background: #fff5f5; margin: 0; }
    h3 { margin-top: 0; color: #991b1b; font-size: 16px; border-bottom: 2px solid #ef4444; padding-bottom: 6px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #fee2e2; color: #991b1b; margin-bottom: 12px; }
    .err-list { margin: 12px 0; padding-left: 18px; font-size: 12px; line-height: 1.5; background: #ffffff; border: 1px solid #fecaca; padding: 12px 14px 12px 30px; border-radius: 6px; }
    .btn-close { background: #991b1b; color: #ffffff; padding: 9px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; border: none; cursor: pointer; float: right; margin-top: 12px; }
  </style>
</head>
<body>
  <span class="badge">Wykryto ostrzeżenia weryfikacji</span>
  <h3>ELWOZ ECO SmartCare v0.2.8 – Raport kontroli integralności</h3>
  <ul class="err-list">${errorListHtml}</ul>
  <p style="font-size: 12px; color: #64748b;">Jeżeli wykryto błędy analizy AI lub nieprzetworzone zgłoszenia, skorzystaj z menu <em>SmartCare → Wykryj i uzupełnij brakujące zgłoszenia</em> oraz <em>Przetwórz kolejkę AI</em>.</p>
  <button type="button" class="btn-close" onclick="google.script.host.close()">Zamknij</button>
</body>
</html>`;

      const outputErr = HtmlService.createHtmlOutput(errorHtml).setWidth(640).setHeight(480);
      ui.showModalDialog(outputErr, "SmartCare – Ostrzeżenie weryfikacji v0.2.8");
      return;
    }

    // Sukces aktualizacji
    const summaryHtml = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; color: #1e293b; background: #ffffff; margin: 0; }
    h3 { margin-top: 0; color: #143d59; font-size: 16px; border-bottom: 2px solid #1b7a3e; padding-bottom: 6px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #dcfce7; color: #166534; margin-bottom: 12px; }
    .kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
    .kpi-val { font-size: 16px; font-weight: bold; color: #1b7a3e; }
    .item-list { margin: 12px 0; padding-left: 18px; font-size: 13px; line-height: 1.6; }
    .item-list li { margin-bottom: 5px; }
    .btn-close { background: #1b7a3e; color: #ffffff; padding: 9px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; border: none; cursor: pointer; float: right; margin-top: 8px; }
    .btn-close:hover { background: #145a32; }
  </style>
</head>
<body>
  <span class="badge">Aktualizacja v0.2.8 zakończona sukcesem</span>
  <h3>ELWOZ ECO SmartCare v0.2.8 – Stabilizacja silnika & CSI</h3>
  
  <div class="kpi-box">
    <span>Liczba zweryfikowanych zgłoszeń w CRM:</span>
    <span class="kpi-val">${validation.actualTickets}</span>
  </div>

  <p style="font-size: 13px;">Silnik systemu został pomyślnie zaktualizowany do wersji <strong>v0.2.8</strong>:</p>
  
  <ul class="item-list">
    <li><strong>Eliminacja blokady LockService:</strong> Rejestracja zgłoszenia trwa poniżej 200ms pod blokadą, a wysyłka e-mail i analiza AI działają asynchronicznie poza blokadą.</li>
    <li><strong>Automatyczne przywracanie zgłoszeń:</strong> Moduł <em>reconcileUnprocessedFormResponses</em> wykrywa i uzupełnia brakujące ID bez duplikacji powiadomień.</li>
    <li><strong>Nowa kolumna CRM 'Szczegóły błędu AI':</strong> Czytelna rejestracja przyczyn błędów (np. limity 15 RPM / timeout) bez sztucznego fałszowania wyników modelem awaryjnym.</li>
    <li><strong>Kolejka zapytań AI:</strong> Bezpieczne przetwarzanie z zachowaniem 2-sekundowego odstępu pomiędzy zapytaniami dla bezpłatnego planu Gemini.</li>
    <li><strong>Diagnostyka Silnika na Dashboardzie:</strong> Nowa Sekcja 4 śledzi odpowiedzi formularza, stan kolejki i błędy AI.</li>
    <li><strong>Gotowość na SmartCare Manager v0.3.0:</strong> Zaimplementowano bezstanową warstwę Service API (<em>apiGetTicketsList, apiGetTicketDetails, apiUpdateTicket</em> itd.).</li>
  </ul>

  <button type="button" class="btn-close" onclick="google.script.host.close()">Zamknij</button>
</body>
</html>`;

    const output = HtmlService.createHtmlOutput(summaryHtml).setWidth(640).setHeight(520);
    ui.showModalDialog(output, "SmartCare – Aktualizacja do v0.2.8");
  } catch (err) {
    ui.alert("Błąd aktualizacji do v0.2.8", err.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Kompatybilność z menu v0.2.7 i v0.2.6
 */
function updateSystemToV027() {
  updateSystemToV028();
}

function updateSystemToV026() {
  updateSystemToV028();
}
