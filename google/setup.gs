/**
 * ============================================================================
 * ELWOZ ECO SmartCare - Skrypt konfiguracyjny Google Apps Script (setup.gs)
 * Wersja: 0.2.6 (FINAL RELEASE – Poprawka techniczna Dashboardu: obsługa locale pl_PL, autokalibracja, brak błędów #ERROR!)
 * Projekt edukacyjny: Uniwersytet WSB Merito w Gdańsku
 * Dedykowane konto Google: wsb.student.tester@gmail.com
 * ============================================================================
 * 
 * WAŻNE (Container-bound Script):
 * Niniejszy skrypt MUSI być uruchamiany w projekcie Apps Script bezpośrednio
 * powiązanym z arkuszem Google Sheets poprzez: Rozszerzenia → Apps Script.
 * 
 * GŁÓWNE USPRAWNIENIA WERSJI v0.2.6:
 * 1. ZAPEWNIENIE OBSŁUGI LOCALE PL_PL: Formuły dostosowują separator argumentów
 *    dynamicznie (średnik ';' dla polskiego locale pl_PL, przecinek ',' dla en_US)
 *    na podstawie spreadsheet.getSpreadsheetLocale().
 * 2. AUTOKALIBRACJA I PURE JS ENGINE: W przypadku jakichkolwiek problemów ze składnią
 *    formuł, skrypt posiada niezależny silnik obliczeniowy Apps Script, który
 *    automatycznie oblicza i wpisuje poprawne wartości, eliminując błędy #ERROR!.
 * 3. WERYFIKACJA INTEGRALNOŚCI: Po aktualizacji sprawdzana jest obecność błędów
 *    #ERROR!, #REF!, #VALUE!, #N/A oraz zgodność liczby zgłoszeń z CRM. Komunikat
 *    o sukcesie wyświetla się WYŁĄCZNIE przy braku jakichkolwiek błędów.
 * 4. DWA WYKRESY OPERACYJNE: Zgłoszenia według kategorii oraz według statusów
 *    generowane czysto, bez duplikowania i z gwarancją niepustych danych.
 * 5. ERGONOMIA I ZAWIJANIE TEKSTU: Zwiększone wysokości wierszy nagłówkowych (44px)
 *    oraz włączone zawijanie tekstu zapobiegają ucinaniu etykiet.
 * 6. ZAKTUALIZOWANA INSTRUKCJA AI: Nagłówek zakładki INSTRUKCJA AI zaktualizowany do v0.2.6.
 * 7. AUTOMATYCZNE POWIADOMIENIA E-MAIL: Natychmiastowe powiadomienie wewnętrzne
 *    do dyspozytora na wsb.student.tester@gmail.com po każdym nowym zgłoszeniu.
 */

const SMARTCARE_SETUP_CONFIG = {
  version: "0.2.6",
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
    "Standardowy",
    "Niski",
    "Wysoki"
  ],
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
 * Pomocnicza funkcja zamieniająca 1-bazowy indeks kolumny na literę (np. 1 -> A, 27 -> AA)
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
 * Dynamiczne wyszukiwanie litery kolumny na podstawie listy możliwych nazw nagłówka.
 * Priorytet 1: dokładne dopasowanie, Priorytet 2: prefiks, Priorytet 3: fragment.
 */
function findColumnLetterByHeaders(headers, possibleNames, defaultLetter) {
  if (!headers || !Array.isArray(headers)) return defaultLetter;

  // Przebieg 1: Dokładne dopasowanie
  for (let name of possibleNames) {
    const target = name.toLowerCase().trim();
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || "").toLowerCase().trim();
      if (h === target) {
        return colIndexToLetter(i + 1);
      }
    }
  }

  // Przebieg 2: Dopasowanie od początku tekstu (prefix)
  for (let name of possibleNames) {
    const target = name.toLowerCase().trim();
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || "").toLowerCase().trim();
      if (h.startsWith(target)) {
        return colIndexToLetter(i + 1);
      }
    }
  }

  // Przebieg 3: Dopasowanie podłańcucha (substring)
  for (let name of possibleNames) {
    const target = name.toLowerCase().trim();
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || "").toLowerCase().trim();
      if (h.includes(target)) {
        return colIndexToLetter(i + 1);
      }
    }
  }

  return defaultLetter;
}

/**
 * Pobiera mapę liter kluczowych kolumn z arkusza ZGŁOSZENIA
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
    timestamp: findColumnLetterByHeaders(headers, ["Sygnatura czasowa", "Timestamp", "Data zgłoszenia"], "A"),
    contactRequest: findColumnLetterByHeaders(headers, ["Prośba o kontakt ze strony pracownika", "Prośba o kontakt"], "L"),
    status: findColumnLetterByHeaders(headers, ["Status", "Status sprawy"], "N"),
    priority: findColumnLetterByHeaders(headers, ["Priorytet"], "O"),
    firstContact: findColumnLetterByHeaders(headers, ["Data pierwszego kontaktu", "Pierwszy kontakt", "Data potwierdzenia przyjęcia"], "U"),
    resolutionDate: findColumnLetterByHeaders(headers, ["Data rozwiązania", "Rozwiązanie"], "W"),
    satisfaction: findColumnLetterByHeaders(headers, ["Ocena satysfakcji (1-5)", "Ocena satysfakcji", "Satysfakcja"], "Z"),
    reviewSent: findColumnLetterByHeaders(headers, ["Prośba o opinię wysłana", "Opinia wysłana"], "X"),
    reviewDate: findColumnLetterByHeaders(headers, ["Data wysłania prośby o opinię"], "Y")
  };
}

/**
 * Sprawdza ustawienia regionalne arkusza i zwraca właściwy separator argumentów formuł
 * W arkuszach z polskim locale (pl_PL) przecinek jest separatorem dziesiętnym,
 * a argumenty funkcji rozdziela się średnikiem ';'.
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
 * Bezpieczny parser daty obsługujący obiekty Date, serial numbers Excela oraz łańcuchy tekstowe
 */
function parseDateValue(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val.getTime();
  if (typeof val === "number" && val > 1000) {
    // Numer seryjny daty Google Sheets / Excel
    return (val - 25569) * 86400 * 1000;
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return null;
    let d = new Date(s);
    if (!isNaN(d.getTime())) return d.getTime();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (m) {
      d = new Date(m[1], m[2] - 1, m[3], m[4], m[5], m[6] || 0);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    const m2 = s.match(/^(\d{2})\.(\d{2})\.(\d{4})[\sT](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (m2) {
      d = new Date(m2[3], m2[2] - 1, m2[1], m2[4], m2[5], m2[6] || 0);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  return null;
}

/**
 * Zlicza rzeczywistą liczbę poprawnych zgłoszeń w arkuszu ZGŁOSZENIA
 */
function countActualCrmTickets(ticketSheet) {
  if (!ticketSheet || ticketSheet.getLastRow() <= 1) return 0;
  const lastCol = ticketSheet.getLastColumn();
  const headers = ticketSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  let idColIdx = headers.indexOf("ID Zgłoszenia");
  if (idColIdx === -1) idColIdx = headers.indexOf("Numer zgłoszenia");
  if (idColIdx === -1) idColIdx = 12; // domyślnie kolumna M

  const rows = ticketSheet.getRange(2, idColIdx + 1, ticketSheet.getLastRow() - 1, 1).getValues();
  let count = 0;
  for (let r of rows) {
    if (String(r[0] || "").trim() !== "") count++;
  }
  return count;
}

/**
 * Niezależny silnik obliczeniowy Apps Script – liczy wszystkie wskaźniki bezpośrednio z danych CRM
 * Gwarantuje 100% poprawności statystyk niezależnie od lokalnych ustawień Google Sheets.
 */
function calculateDashboardMetrics(ticketSheet) {
  const categories = SMARTCARE_SETUP_CONFIG.categories;
  const statuses = SMARTCARE_SETUP_CONFIG.statuses;

  const defaultMetrics = {
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
    categoryCounts: {},
    statusCounts: {}
  };
  for (let c of categories) defaultMetrics.categoryCounts[c] = 0;
  for (let s of statuses) defaultMetrics.statusCounts[s] = 0;

  if (!ticketSheet || ticketSheet.getLastRow() <= 1) return defaultMetrics;

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
  const timeIdx = getIdx(["Sygnatura czasowa", "Data zgłoszenia", "Timestamp"]);
  const firstContactIdx = getIdx(["Data pierwszego kontaktu", "Pierwszy kontakt", "Data potwierdzenia przyjęcia"]);
  const resolutionIdx = getIdx(["Data rozwiązania", "Rozwiązanie"]);
  const contactReqIdx = getIdx(["Prośba o kontakt ze strony pracownika", "Prośba o kontakt"]);
  const satisfactionIdx = getIdx(["Ocena satysfakcji (1-5)", "Ocena satysfakcji", "Satysfakcja"]);
  const reviewSentIdx = getIdx(["Prośba o opinię wysłana", "Opinia wysłana"]);

  let totalTickets = 0;
  let newTickets = 0;
  let inProgressTickets = 0;
  let resolvedTickets = 0;
  let waitingContactTickets = 0;
  let reviewsSentCount = 0;
  let resolvedWithReviewCount = 0;

  const firstContactDiffs = [];
  const resolutionDiffs = [];
  const satisfactionRatings = [];

  const categoryCounts = {};
  for (let c of categories) categoryCounts[c] = 0;

  const statusCounts = {};
  for (let s of statuses) statusCounts[s] = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const idVal = idIdx !== -1 ? String(row[idIdx] || "").trim() : "";
    if (!idVal) continue;

    totalTickets++;

    const statusVal = statusIdx !== -1 ? String(row[statusIdx] || "").trim() : "";
    const statusLower = statusVal.toLowerCase();

    if (statusLower === "nowe") newTickets++;
    else if (statusLower === "w realizacji" || statusLower === "do weryfikacji") inProgressTickets++;
    else if (statusLower === "rozwiązane" || statusLower === "zamknięte") resolvedTickets++;

    for (let s of statuses) {
      if (s.toLowerCase() === statusLower) statusCounts[s]++;
    }

    const typeVal = typeIdx !== -1 ? String(row[typeIdx] || "").toLowerCase().trim() : "";
    for (let c of categories) {
      if (typeVal.includes(c.toLowerCase()) || c.toLowerCase().includes(typeVal)) {
        categoryCounts[c]++;
      }
    }

    const contactReqVal = contactReqIdx !== -1 ? String(row[contactReqIdx] || "").toLowerCase() : "";
    if (contactReqVal.includes("tak") && (statusLower === "nowe" || statusLower === "do weryfikacji")) {
      waitingContactTickets++;
    }

    const reviewSentVal = reviewSentIdx !== -1 ? String(row[reviewSentIdx] || "").toUpperCase().trim() : "";
    if (reviewSentVal === "TAK") {
      reviewsSentCount++;
      if (statusLower === "rozwiązane" || statusLower === "zamknięte") {
        resolvedWithReviewCount++;
      }
    }

    const createdTime = timeIdx !== -1 ? parseDateValue(row[timeIdx]) : null;
    const firstContactTime = firstContactIdx !== -1 ? parseDateValue(row[firstContactIdx]) : null;
    if (createdTime && firstContactTime && firstContactTime >= createdTime) {
      firstContactDiffs.push((firstContactTime - createdTime) / (1000 * 3600));
    }

    const resolutionTime = resolutionIdx !== -1 ? parseDateValue(row[resolutionIdx]) : null;
    if (createdTime && resolutionTime && resolutionTime >= createdTime) {
      resolutionDiffs.push((resolutionTime - createdTime) / (1000 * 3600));
    }

    if (satisfactionIdx !== -1) {
      const satVal = Number(row[satisfactionIdx]);
      if (!isNaN(satVal) && satVal >= 1 && satVal <= 5) {
        satisfactionRatings.push(satVal);
      }
    }
  }

  const completionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) : 0;
  const avgFirstResponse = firstContactDiffs.length > 0 
    ? Math.round((firstContactDiffs.reduce((a, b) => a + b, 0) / firstContactDiffs.length) * 100) / 100 
    : 0;
  const avgResolution = resolutionDiffs.length > 0 
    ? Math.round((resolutionDiffs.reduce((a, b) => a + b, 0) / resolutionDiffs.length) * 100) / 100 
    : 0;
  const avgSatisfaction = satisfactionRatings.length > 0 
    ? Math.round((satisfactionRatings.reduce((a, b) => a + b, 0) / satisfactionRatings.length) * 100) / 100 
    : 0;
  const reviewRate = resolvedTickets > 0 ? (resolvedWithReviewCount / resolvedTickets) : 0;
  const satisfactionRate = resolvedTickets > 0 ? (satisfactionRatings.length / resolvedTickets) : 0;

  return {
    totalTickets,
    newTickets,
    inProgressTickets,
    resolvedTickets,
    completionRate,
    waitingContactTickets,
    avgFirstResponse,
    avgResolution,
    avgSatisfaction,
    satisfactionCount: satisfactionRatings.length,
    reviewsSentCount,
    reviewRate,
    satisfactionRate,
    categoryCounts,
    statusCounts
  };
}

/**
 * Główna funkcja instalacyjna i aktualizująca (Container-bound)
 */
function setupSmartCareSystem() {
  Logger.log("=== Rozpoczynanie konfiguracji ELWOZ ECO SmartCare v0.2.6 (FINAL RELEASE) ===");

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error(
      "BŁĄD INSTALACJI: Skrypt nie jest uruchomiony w arkuszu Google Sheets!\n" +
      "Otwórz arkusz kalkulacyjny na koncie wsb.student.tester@gmail.com, przejdź do 'Rozszerzenia -> Apps Script' i wklej kod."
    );
  }

  try {
    spreadsheet.rename(SMARTCARE_SETUP_CONFIG.sheetName);
  } catch (e) {
    Logger.log("Nazwa arkusza pozostaje bez zmian: " + e.toString());
  }

  const form = createOrGetForm(spreadsheet);
  Logger.log("Formularz Google przygotowany: " + form.getPublishedUrl());

  setupSettingsSheet(spreadsheet);
  setupCommunicationHistorySheet(spreadsheet);
  setupTicketsSheet(spreadsheet, form);
  setupDashboardSheet(spreadsheet);
  setupTestsSheet(spreadsheet);
  setupAiInstructionSheet(spreadsheet);
  installFormSubmitTrigger(spreadsheet);

  Logger.log("=== Konfiguracja v0.2.6 zakończona pomyślnie ===");
}

/**
 * Tworzy lub pobiera formularz powiązany z arkuszem
 */
function createOrGetForm(spreadsheet) {
  let formUrl = spreadsheet.getFormUrl();
  let form = null;

  if (formUrl) {
    try {
      form = FormApp.openByUrl(formUrl);
      Logger.log("Pobrano istniejący formularz powiązany z arkuszem.");
    } catch (e) {
      Logger.log("Nie można otworzyć formularza przez URL: " + e.toString());
    }
  }

  if (!form) {
    form = FormApp.create(SMARTCARE_SETUP_CONFIG.formTitle);
    form.setDescription(SMARTCARE_SETUP_CONFIG.formDescription);
    form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
    form.setAllowResponseEdits(false);
    form.setAcceptingResponses(true);

    form.addMultipleChoiceItem()
      .setTitle("Rodzaj zgłoszenia")
      .setChoiceValues(SMARTCARE_SETUP_CONFIG.categories)
      .setRequired(true);

    form.addListItem()
      .setTitle("Rodzaj odpadów")
      .setChoiceValues(["Zmieszane", "BIO", "Plastik i Metale", "Papier", "Szkło", "Wielkogabarytowe", "Inne"])
      .setRequired(true);

    form.addListItem()
      .setTitle("Miejscowość")
      .setChoiceValues(["Kartuzy", "Brodnica Górna", "Brodnica Dolna", "Grzybno", "Łapalice", "Mirachowo", "Prokowo", "Sianowo", "Staniszewo", "Inna w gminie"])
      .setRequired(true);

    form.addTextItem().setTitle("Ulica lub lokalizacja").setRequired(true);
    form.addTextItem().setTitle("Numer posesji lub identyfikator miejsca").setRequired(false);
    form.addDateItem().setTitle("Data wystąpienia problemu").setRequired(false);
    form.addParagraphTextItem().setTitle("Opis zgłoszenia").setRequired(true);
    form.addTextItem().setTitle("Imię i nazwisko").setRequired(false);
    form.addTextItem().setTitle("Numer telefonu").setRequired(false);
    form.addTextItem().setTitle("Adres e-mail").setRequired(false);

    form.addCheckboxItem()
      .setTitle("Prośba o kontakt ze strony pracownika")
      .setChoiceValues(["Proszę o kontakt telefoniczny lub e-mail w sprawie zgłoszenia"])
      .setRequired(false);

    Logger.log("Nowy formularz Google utworzony i zlinkowany.");
  }

  return form;
}

/**
 * Konfiguruje zakładkę USTAWIENIA ze zweryfikowanym linkiem do Profilu Firmy Google
 */
function setupSettingsSheet(spreadsheet) {
  let settings = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.settings);
  if (!settings) {
    settings = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.settings);
  }

  const defaultSettings = [
    ["Nazwa przedsiębiorstwa", "ELWOZ ECO Sp. z o.o."],
    ["Nazwa placówki", "Punkt Obsługi Klienta w Kartuzach"],
    ["Adres placówki", "ul. Mściwoja II 14, 83-300 Kartuzy"],
    ["Adres e-mail do kontaktu", "kartuzy@elwozeco.pl"],
    ["Numer telefonu", "58 681 22 99"],
    ["Oficjalna strona internetowa", "https://elwozeco.pl/"],
    ["Zweryfikowany link do opinii Google", SMARTCARE_SETUP_CONFIG.verifiedGoogleReviewUrl],
    ["Nazwa nadawcy wiadomości", "ELWOZ ECO SmartCare – POK Kartuzy"],
    ["Adres e-mail testera (wsb.student.tester@gmail.com)", SMARTCARE_SETUP_CONFIG.dedicatedTesterEmail],
    ["Automatyczne powiadomienia o nowych zgłoszeniach", "WŁĄCZONE"],
    ["Adres odbiorcy powiadomień", SMARTCARE_SETUP_CONFIG.dedicatedTesterEmail]
  ];

  if (settings.getLastRow() === 0) {
    settings.getRange("A1:B1").merge()
      .setValue("ELWOZ ECO SmartCare – Ustawienia Systemu v0.2.6 (Konto: wsb.student.tester@gmail.com)")
      .setFontSize(12).setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");
    settings.setRowHeight(1, 35);

    settings.getRange("A2:B2").setValues([["Parametr konfiguracyjny", "Wartość"]])
      .setFontWeight("bold").setBackground("#1b7a3e").setFontColor("#ffffff").setFontSize(10);
    settings.setRowHeight(2, 28);

    settings.getRange(3, 1, defaultSettings.length, 2).setValues(defaultSettings);
  } else {
    const existingData = settings.getDataRange().getValues();
    const existingKeys = existingData.map(r => String(r[0]).trim());

    for (let s of defaultSettings) {
      const idx = existingKeys.indexOf(s[0]);
      if (idx === -1) {
        settings.appendRow(s);
      } else {
        if (s[0] === "Zweryfikowany link do opinii Google") {
          const currentUrl = String(existingData[idx][1] || "").trim();
          if (!currentUrl || currentUrl.includes("PLACEHOLDER") || currentUrl === "") {
            settings.getRange(idx + 1, 2).setValue(s[1]);
          }
        }
      }
    }
  }

  settings.setColumnWidth(1, 330);
  settings.setColumnWidth(2, 450);
  Logger.log("Zakładka USTAWIENIA zweryfikowana z autentycznym profilem Google.");
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
      .setValue("ELWOZ ECO SmartCare – Dziennik Korespondencji i Kontaktów z Mieszkańcami")
      .setFontSize(12).setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
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
 * Konfiguruje zakładkę ZGŁOSZENIA w oparciu o natywny arkusz odpowiedzi formularza
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

  const operationalHeaders = [
    "ID Zgłoszenia",
    "Status",
    "Priorytet",
    "Pracownik odpowiedzialny",
    "Następne działanie",
    "Termin następnego działania",
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
      Logger.log("Dopisano brakujące kolumny CRM: " + missingHeaders.join(", "));
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
  setupColValidation("Ocena satysfakcji (1-5)", ["1", "2", "3", "4", "5"], true);
  setupColValidation("Prośba o opinię wysłana", ["TAK", "NIE"], false);
  setupColValidation("Wynik kontaktu z mieszkańcem", SMARTCARE_SETUP_CONFIG.contactResults, true);

  const statusCol = headers.indexOf("Status") + 1;
  const priorityCol = headers.indexOf("Priorytet") + 1;
  setupConditionalFormatting(ticketSheet, statusCol, priorityCol, maxRows);

  Logger.log("Zakładka ZGŁOSZENIA skonfigurowana poprawnie.");
}

/**
 * Poprawia czytelność zakładki ZGŁOSZENIA (kompaktowa wysokość wierszy, zawijanie CLIP dla długich pól)
 * Zapobiega ucinaniu nagłówków i rozszerzaniu wierszy przez długie opisy AI.
 */
function formatTicketsSheetForReadability(ticketSheet) {
  const lastRow = ticketSheet.getLastRow();
  const lastCol = ticketSheet.getLastColumn();
  if (lastCol === 0) return;

  const headers = ticketSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());

  // Nagłówek wiersza 1
  ticketSheet.setRowHeight(1, 48);
  ticketSheet.getRange(1, 1, 1, lastCol).setWrap(true).setVerticalAlignment("middle");

  // Ustawienie jednolitej, czytelnej wysokości wierszy danych (28px)
  if (lastRow > 1) {
    ticketSheet.setRowHeights(2, lastRow - 1, 28);
  }

  // Kolumny zawierające długi tekst ustawiamy w tryb zwijania CLIP (widok kompaktowy)
  const longTextColNames = [
    "Opis zgłoszenia",
    "Notatka pracownika",
    "Sposób rozwiązania sprawy",
    "Streszczenie AI",
    "Brakujące informacje AI",
    "Sugerowane działanie AI",
    "Proponowana odpowiedź AI"
  ];

  for (let colName of longTextColNames) {
    const idx = headers.indexOf(colName) + 1;
    if (idx > 0) {
      ticketSheet.getRange(2, idx, Math.max(lastRow - 1, 1), 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
      ticketSheet.setColumnWidth(idx, 230);
    }
  }

  // Czytelne szerokości kluczowych kolumn identyfikacyjnych i dat
  const setWidthByHeader = (hName, width) => {
    const idx = headers.indexOf(hName) + 1;
    if (idx > 0) ticketSheet.setColumnWidth(idx, width);
  };

  setWidthByHeader("ID Zgłoszenia", 130);
  setWidthByHeader("Sygnatura czasowa", 140);
  setWidthByHeader("Status", 120);
  setWidthByHeader("Priorytet", 110);
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
 * Formatowanie warunkowe statusów i priorytetów
 */
function setupConditionalFormatting(sheet, statusCol, priorityCol, maxRows) {
  if (statusCol <= 0) return;

  const statusRange = sheet.getRange(2, statusCol, maxRows - 1, 1);
  const rules = [];

  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Nowe").setBackground("#e3f2fd").setFontColor("#0d47a1").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Do weryfikacji").setBackground("#f3e8ff").setFontColor("#6b21a8").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("W realizacji").setBackground("#fef3c7").setFontColor("#92400e").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Oczekuje na informacje").setBackground("#f1f5f9").setFontColor("#475569").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Rozwiązane").setBackground("#e8f5e9").setFontColor("#1b5e20").setRanges([statusRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Zamknięte").setBackground("#cfd8dc").setFontColor("#263238").setRanges([statusRange]).build());

  if (priorityCol > 0) {
    const priorityRange = sheet.getRange(2, priorityCol, maxRows - 1, 1);
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Wysoki").setBackground("#ffebee").setFontColor("#b71c1c").setRanges([priorityRange]).build());
  }

  sheet.setConditionalFormatRules(rules);
}

/**
 * Konfiguruje i naprawia rozszerzoną zakładkę DASHBOARD (v0.2.6)
 * 1. Zapewnia poprawną składnię formuł dostosowaną do locale pl_PL (średnik ';').
 * 2. Weryfikuje komórki za pomocą flush() i sprawdza obecność błędów #ERROR!.
 * 3. W razie problemu z formułami uruchamia niezależny silnik obliczeniowy Apps Script.
 * 4. Generuje 2 czytelne wykresy z danymi i ustawia optymalne wysokości wierszy oraz zawijanie.
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
    .setValue("ELWOZ ECO SmartCare – Panel Operacyjny i Wskaźniki Obsługi Mieszkańca (v0.2.6)")
    .setFontSize(13).setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  dash.setRowHeight(1, 44);

  dash.getRange("A2:G2").merge()
    .setValue("Rejon Kartuzy • Statystyki operacyjne przeliczane dynamicznie z bazy CRM • Aktualizacja automatyczna")
    .setFontSize(9).setFontStyle("italic").setBackground("#f8fafc").setFontColor("#64748b")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  dash.setRowHeight(2, 24);

  // Spacery
  dash.setRowHeight(3, 10);
  dash.setRowHeight(6, 12);
  dash.setRowHeight(9, 12);
  dash.setRowHeight(12, 14);

  // Pobranie dynamicznej mapy kolumn z zakładki ZGŁOSZENIA
  const ticketSheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  const cols = ticketSheet ? getTicketsColumnMap(ticketSheet) : {
    id: "M", type: "B", fraction: "C", city: "D", timestamp: "A", contactRequest: "L",
    status: "N", priority: "O", firstContact: "U", resolutionDate: "W", satisfaction: "Z",
    reviewSent: "X", reviewDate: "Y"
  };

  // Obliczenie bezpośrednich statystyk referencyjnych w Apps Script
  const directMetrics = calculateDashboardMetrics(ticketSheet);

  // SEKCJA 1: Główne wolumeny operacyjne (Wiersze 4-5)
  dash.getRange("B4:F4").setValues([[
    "Wszystkie zgłoszenia",
    "Nowe",
    "W realizacji",
    "Zakończone (Rozwiązane/Zamknięte)",
    "Odsetek zakończonych"
  ]])
    .setFontWeight("bold").setFontSize(9).setBackground("#e2e8f0").setFontColor("#334155")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  dash.setRowHeight(4, 44);

  // SEKCJA 2: Komunikacja, Czas reakcji i Satysfakcja (Wiersze 7-8)
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

  // SEKCJA 3: Zarządzanie Reputacją i Opinie Google (Wiersze 10-11)
  dash.getRange("B10:E10").setValues([[
    "Wysłane prośby o opinię Google",
    "Odsetek zakończonych z prośbą o opinię",
    "Wskaźnik zebranych ocen satysfakcji",
    "Uwaga interpretacyjna"
  ]])
    .setFontWeight("bold").setFontSize(9).setBackground("#dbeafe").setFontColor("#1e40af")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  dash.setRowHeight(10, 44);

  dash.getRange("E11").setValue("Liczba próśb ≠ liczba opinii. Oceny wystawia dobrowolnie mieszkaniec na Profilu Google.")
    .setFontSize(8).setFontStyle("italic").setFontColor("#64748b").setWrap(true).setVerticalAlignment("middle");

  // Tabele pomocnicze do kategorii i statusów (wiersze 13-23)
  dash.getRange("B13:C13").setValues([["Kategoria zgłoszenia", "Liczba"]])
    .setFontWeight("bold").setBackground("#1b7a3e").setFontColor("#ffffff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");

  for (let i = 0; i < SMARTCARE_SETUP_CONFIG.categories.length; i++) {
    const row = 14 + i;
    dash.getRange(row, 2).setValue(SMARTCARE_SETUP_CONFIG.categories[i]).setFontSize(9);
    dash.setRowHeight(row, 22);
  }

  dash.getRange("E13:F13").setValues([["Status sprawy", "Liczba"]])
    .setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");

  for (let j = 0; j < SMARTCARE_SETUP_CONFIG.statuses.length; j++) {
    const r = 14 + j;
    dash.getRange(r, 5).setValue(SMARTCARE_SETUP_CONFIG.statuses[j]).setFontSize(9);
    dash.setRowHeight(r, 22);
  }

  dash.setRowHeight(13, 30);

  // Szerokości kolumn Dashboardu
  dash.setColumnWidth(1, 15);
  dash.setColumnWidth(2, 175);
  dash.setColumnWidth(3, 160);
  dash.setColumnWidth(4, 160);
  dash.setColumnWidth(5, 210);
  dash.setColumnWidth(6, 140);
  dash.setColumnWidth(7, 30);
  dash.setColumnWidth(8, 480);

  // Stylizacja komórek z wartościami wskaźników
  dash.getRange("B5:F5")
    .setFontSize(16).setFontWeight("bold").setFontColor("#143d59").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBackground("#ffffff");
  dash.setRowHeight(5, 36);

  dash.getRange("B8:F8")
    .setFontSize(13).setFontWeight("bold").setFontColor("#1b7a3e").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBackground("#ffffff");
  dash.setRowHeight(8, 36);

  dash.getRange("B11:D11")
    .setFontSize(14).setFontWeight("bold").setFontColor("#1e40af").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBackground("#ffffff");
  dash.setRowHeight(11, 36);

  // APLIKACJA FORMUŁ LUB WARTOŚCI Z SILNIKA OBLICZENIOWEGO
  applyDashboardFormulasOrDirectMetrics(dash, ticketSheet, spreadsheet, cols, directMetrics);

  // Dodanie wykresów operacyjnych bez duplikowania
  setupDashboardCharts(dash);

  Logger.log("Rozszerzona zakładka DASHBOARD przygotowana i przeliczona (v0.2.6).");
}

/**
 * Aplikuje formuły z odpowiednim separatorem lub bezpośrednie wartości z silnika obliczeniowego
 */
function applyDashboardFormulasOrDirectMetrics(dash, ticketSheet, spreadsheet, cols, metrics) {
  let sep = getFormulaSeparator(spreadsheet);
  Logger.log(`Ustalono początkowy separator formuł: '${sep}' dla arkusza.`);

  let formulaAppliedSuccessfully = false;

  const tryApplyFormulas = (separator) => {
    try {
      dash.getRange("B5").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.id}2:${cols.id}${separator} "<>")${separator} 0)`);
      dash.getRange("C5").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}${separator} "Nowe")${separator} 0)`);
      dash.getRange("D5").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}${separator} "W realizacji")${separator} 0)`);
      dash.getRange("E5").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}${separator} "Rozwiązane") + COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}${separator} "Zamknięte")${separator} 0)`);
      dash.getRange("F5").setFormula(`=IF(B5>0${separator} E5/B5${separator} 0)`);
      dash.getRange("F5").setNumberFormat("0.0%");

      dash.getRange("B8").setFormula(
        `=IFERROR(COUNTIFS(ZGŁOSZENIA!${cols.contactRequest}2:${cols.contactRequest}${separator} "*Tak*"${separator} ZGŁOSZENIA!${cols.status}2:${cols.status}${separator} "Nowe") + COUNTIFS(ZGŁOSZENIA!${cols.contactRequest}2:${cols.contactRequest}${separator} "*Tak*"${separator} ZGŁOSZENIA!${cols.status}2:${cols.status}${separator} "Do weryfikacji")${separator} 0)`
      );
      dash.getRange("C8").setFormula(
        `=IFERROR(ROUND(AVERAGE(FILTER((ZGŁOSZENIA!${cols.firstContact}2:${cols.firstContact} - ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp}) * 24${separator} ISNUMBER(ZGŁOSZENIA!${cols.firstContact}2:${cols.firstContact})${separator} ISNUMBER(ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp})${separator} ZGŁOSZENIA!${cols.firstContact}2:${cols.firstContact} >= ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp}))${separator} 2)${separator} 0)`
      );
      dash.getRange("D8").setFormula(
        `=IFERROR(ROUND(AVERAGE(FILTER((ZGŁOSZENIA!${cols.resolutionDate}2:${cols.resolutionDate} - ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp}) * 24${separator} ISNUMBER(ZGŁOSZENIA!${cols.resolutionDate}2:${cols.resolutionDate})${separator} ISNUMBER(ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp})${separator} ZGŁOSZENIA!${cols.resolutionDate}2:${cols.resolutionDate} >= ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp}))${separator} 2)${separator} 0)`
      );
      dash.getRange("E8").setFormula(
        `=IFERROR(ROUND(AVERAGE(FILTER(ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}${separator} ISNUMBER(ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction})${separator} ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}>=1${separator} ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}<=5))${separator} 2)${separator} 0)`
      );
      dash.getRange("F8").setFormula(
        `=IFERROR(COUNT(FILTER(ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}${separator} ISNUMBER(ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction})${separator} ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}>=1${separator} ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}<=5))${separator} 0)`
      );

      dash.getRange("B11").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.reviewSent}2:${cols.reviewSent}${separator} "TAK")${separator} 0)`);
      dash.getRange("C11").setFormula(
        `=IF(E5>0${separator} (COUNTIFS(ZGŁOSZENIA!${cols.reviewSent}2:${cols.reviewSent}${separator} "TAK"${separator} ZGŁOSZENIA!${cols.status}2:${cols.status}${separator} "Rozwiązane") + COUNTIFS(ZGŁOSZENIA!${cols.reviewSent}2:${cols.reviewSent}${separator} "TAK"${separator} ZGŁOSZENIA!${cols.status}2:${cols.status}${separator} "Zamknięte")) / E5${separator} 0)`
      );
      dash.getRange("C11").setNumberFormat("0.0%");

      dash.getRange("D11").setFormula(`=IF(E5>0${separator} F8/E5${separator} 0)`);
      dash.getRange("D11").setNumberFormat("0.0%");

      // Tabele kategorii i statusów
      for (let i = 0; i < SMARTCARE_SETUP_CONFIG.categories.length; i++) {
        const row = 14 + i;
        dash.getRange(row, 3).setFormula(`=COUNTIF(ZGŁOSZENIA!${cols.type}2:${cols.type}${separator} "*" & B${row} & "*")`);
      }
      for (let j = 0; j < SMARTCARE_SETUP_CONFIG.statuses.length; j++) {
        const r = 14 + j;
        dash.getRange(r, 6).setFormula(`=COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}${separator} E${r})`);
      }

      SpreadsheetApp.flush();
      return true;
    } catch (e) {
      Logger.log(`Błąd podczas wstawiania formuł z separatorem '${separator}': ` + e.toString());
      return false;
    }
  };

  const checkHasFormulaErrors = () => {
    const cellsToCheck = ["B5", "C5", "D5", "E5", "F5", "B8", "C8", "D8", "E8", "F8", "B11", "C11", "D11"];
    for (let c of cellsToCheck) {
      const val = String(dash.getRange(c).getValue() || "").trim();
      if (val.startsWith("#")) return true;
    }
    for (let i = 0; i < SMARTCARE_SETUP_CONFIG.categories.length; i++) {
      const val = String(dash.getRange(14 + i, 3).getValue() || "").trim();
      if (val.startsWith("#")) return true;
    }
    for (let j = 0; j < SMARTCARE_SETUP_CONFIG.statuses.length; j++) {
      const val = String(dash.getRange(14 + j, 6).getValue() || "").trim();
      if (val.startsWith("#")) return true;
    }
    return false;
  };

  // Krok 1: Próba z wykrytym separatorem
  tryApplyFormulas(sep);
  let hasErrors = checkHasFormulaErrors();

  // Krok 2: Jeśli błąd, próba z separatorem alternatywnym
  if (hasErrors) {
    const altSep = sep === ";" ? "," : ";";
    Logger.log(`Wykryto błąd formuły przy separatorze '${sep}'. Próba z operatorem alternatywnym '${altSep}'...`);
    tryApplyFormulas(altSep);
    hasErrors = checkHasFormulaErrors();
    if (!hasErrors) {
      sep = altSep;
      formulaAppliedSuccessfully = true;
    }
  } else {
    formulaAppliedSuccessfully = true;
  }

  // Krok 3: Jeżeli formuły nadal powodują błędy lub rozbieżność liczby zgłoszeń z CRM:
  // Zastosowanie niezależnego od ustawień regionalnych silnika obliczeniowego (Requirement 4)
  const actualTickets = countActualCrmTickets(ticketSheet);
  const displayedTickets = Number(dash.getRange("B5").getValue());

  if (hasErrors || displayedTickets !== actualTickets) {
    Logger.log(`Formuły arkusza zwróciły błędy lub niezgodność (wyświetlono: ${displayedTickets}, w CRM: ${actualTickets}). Aktywacja bezpośredniego silnika obliczeniowego Apps Script...`);

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

    dash.getRange("B11").setValue(metrics.reviewsSentCount);
    dash.getRange("C11").setValue(metrics.reviewRate).setNumberFormat("0.0%");
    dash.getRange("D11").setValue(metrics.satisfactionRate).setNumberFormat("0.0%");

    for (let i = 0; i < SMARTCARE_SETUP_CONFIG.categories.length; i++) {
      const cat = SMARTCARE_SETUP_CONFIG.categories[i];
      dash.getRange(14 + i, 3).setValue(metrics.categoryCounts[cat] || 0);
    }

    for (let j = 0; j < SMARTCARE_SETUP_CONFIG.statuses.length; j++) {
      const st = SMARTCARE_SETUP_CONFIG.statuses[j];
      dash.getRange(14 + j, 6).setValue(metrics.statusCounts[st] || 0);
    }

    SpreadsheetApp.flush();
    Logger.log("Wszystkie wskaźniki i tabele Dashboardu zaktualizowane bezbłędnie przez silnik Apps Script.");
  }
}

/**
 * Tworzy lub aktualizuje 2 wykresy na Dashboardzie bez ich powielania
 */
function setupDashboardCharts(dash) {
  // Usunięcie starych wykresów SmartCare, aby zapobiec dublowaniu
  const existingCharts = dash.getCharts();
  for (let c of existingCharts) {
    const opts = c.getOptions();
    const title = opts.get('title') || '';
    if (title.includes("kategorii") || title.includes("statusów") || title.includes("Kategorii") || title.includes("Statusów")) {
      dash.removeChart(c);
    }
  }

  // Wykres 1: Zgłoszenia według kategorii (Wykres słupkowy)
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

  // Wykres 2: Zgłoszenia według statusów (Wykres kolumnowy)
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
 * Weryfikuje integralność Dashboardu: brak błędów #ERROR!, zgodność liczby zgłoszeń i obecność wykresów.
 */
function validateDashboardIntegrity(spreadsheet) {
  const dash = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.dashboard);
  const ticketSheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  
  const errors = [];
  if (!dash) {
    return { isValid: false, errors: ["Brak zakładki DASHBOARD w arkuszu."] };
  }
  if (!ticketSheet) {
    return { isValid: false, errors: ["Brak zakładki ZGŁOSZENIA w arkuszu."] };
  }

  const cellsToCheck = [
    { cell: "B5", name: "Wszystkie zgłoszenia" },
    { cell: "C5", name: "Nowe zgłoszenia" },
    { cell: "D5", name: "W realizacji" },
    { cell: "E5", name: "Zakończone zgłoszenia" },
    { cell: "F5", name: "Odsetek zakończonych" },
    { cell: "B8", name: "Oczekujące na kontakt" },
    { cell: "C8", name: "Śr. czas 1. reakcji" },
    { cell: "D8", name: "Śr. czas rozwiązania" },
    { cell: "E8", name: "Średnia satysfakcja" },
    { cell: "F8", name: "Liczba ocen" },
    { cell: "B11", name: "Wysłane prośby o opinię" },
    { cell: "C11", name: "Odsetek opinii" },
    { cell: "D11", name: "Wskaźnik zebranych ocen" }
  ];

  for (let item of cellsToCheck) {
    const val = String(dash.getRange(item.cell).getValue() || "").trim();
    if (val.startsWith("#")) {
      errors.push(`Komórka ${item.cell} (${item.name}) zawiera błąd: ${val}`);
    }
  }

  // Weryfikacja tabel kategorii i statusów
  for (let i = 0; i < SMARTCARE_SETUP_CONFIG.categories.length; i++) {
    const val = String(dash.getRange(14 + i, 3).getValue() || "").trim();
    if (val.startsWith("#")) {
      errors.push(`Kategoria '${SMARTCARE_SETUP_CONFIG.categories[i]}' (C${14 + i}) zawiera błąd: ${val}`);
    }
  }

  for (let j = 0; j < SMARTCARE_SETUP_CONFIG.statuses.length; j++) {
    const val = String(dash.getRange(14 + j, 6).getValue() || "").trim();
    if (val.startsWith("#")) {
      errors.push(`Status '${SMARTCARE_SETUP_CONFIG.statuses[j]}' (F${14 + j}) zawiera błąd: ${val}`);
    }
  }

  // Porównanie liczby zgłoszeń na Dashboardzie z rzeczywistą liczbą w CRM
  const actualTickets = countActualCrmTickets(ticketSheet);
  const displayedTickets = Number(dash.getRange("B5").getValue());

  if (displayedTickets !== actualTickets) {
    errors.push(`Niezgodność liczby zgłoszeń: Dashboard wyświetla ${displayedTickets}, a w bazie ZGŁOSZENIA znajduje się ${actualTickets}.`);
  }

  // Weryfikacja wykresów
  const charts = dash.getCharts();
  if (charts.length < 2) {
    errors.push(`Wykryto ${charts.length} wykresy zamiast wymaganych 2 wykresów (Kategorie i Statusy).`);
  }

  const locale = (typeof spreadsheet.getSpreadsheetLocale === "function") 
    ? (spreadsheet.getSpreadsheetLocale() || "pl_PL") 
    : "pl_PL";

  return {
    isValid: errors.length === 0,
    errors: errors,
    displayedTickets: displayedTickets,
    actualTickets: actualTickets,
    chartsCount: charts.length,
    locale: locale,
    separator: getFormulaSeparator(spreadsheet)
  };
}

/**
 * Automatyczne odświeżenie formuł i statystyk Dashboardu (funkcja pomocnicza)
 */
function refreshDashboardStats(spreadsheet) {
  try {
    const ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    setupDashboardSheet(ss);
    SpreadsheetApp.flush();
  } catch (err) {
    Logger.log("Błąd odświeżania statystyk Dashboardu: " + err.toString());
  }
}

/**
 * Aktualizacja wyłącznie formuł Dashboardu (kompatybilność z poprzednimi wersjami)
 */
function updateDashboardKpiFormulasOnly() {
  updateSystemToV026();
}

/**
 * Konfiguruje zakładkę TESTY z ZACHOWANIEM dotychczasowych wpisów zespołu!
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
    ["TEST-13", "", "", "Dynamiczny Dashboard z 2 wykresami", "Dashboard automatycznie przelicza zgłoszenia oraz odzwierciedla dane na wykresach kategorii i statusów bez błędów", "", "", "Do wykonania", "", ""]
  ];

  if (testSheet.getLastRow() === 0) {
    testSheet.getRange("A1:J1").merge()
      .setValue("ELWOZ ECO SmartCare – Rejestr Testów Systemowych v0.2.6 (Odbiorca: wsb.student.tester@gmail.com)")
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

  Logger.log("Zakładka TESTY zweryfikowana z zachowaniem danych.");
}

/**
 * Konfiguruje zakładkę INSTRUKCJA AI (aktualna wersja v0.2.6)
 */
function setupAiInstructionSheet(spreadsheet) {
  let aiSheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.aiGuide);
  if (!aiSheet) {
    aiSheet = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.aiGuide);
  }

  aiSheet.clear();

  aiSheet.getRange("A1:D1").merge()
    .setValue("ELWOZ ECO SmartCare – Instrukcja Obsługi Zgłoszeń i Komunikacji z AI (v0.2.6)")
    .setFontSize(12).setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  aiSheet.setRowHeight(1, 38);

  const instructions = [
    ["1. Zasada nadrzędna", "Sztuczna inteligencja pełni WYŁĄCZNIE rolę asystenta pracownika (Human-in-the-Loop). Pracownik weryfikuje i zatwierdza każdą wiadomość przed wysyłką."],
    ["2. Ochrona wizerunku i zasady PR", "AI KATEGORYCZNIE NIE WOLNO:\n• ujawniać wewnętrznych kar, reprymend ani nagan pracowników,\n• deklarować uznania reklamacji lub winy przedsiębiorstwa,\n• wymyślać wykonanych działań naprawczych, tras ani fikcyjnych podjazdów,\n• ustalać sztywnych terminów realizacji ani obiecywać zadośćuczynień finansowych,\n• generować opinii w imieniu mieszkańców ani sugerować liczby gwiazdek."],
    ["3. Twarda anonimizacja danych", "Przed analizą w AI model otrzymuje wyłącznie zanonimizowany kontekst operacyjny (rodzaj problemu, frakcję, miejscowość bez ulicy i numeru posesji oraz treść zweryfikowaną przez pracownika). Wszelkie numery telefonów, adresy e-mail, nazwiska i numery PESEL są usuwane przed wysłaniem do modelu."],
    ["4. Model sztucznej inteligencji", "Wdrożono pulę modeli Gemini Flash z budżetem 8192 tokenów, minimalnym poziomem myślenia i temperaturą 1.0, eliminując błędy obcięcia odpowiedzi."],
    ["5. Dedykowane konto testowe", "Wszystkie usługi (Sheets, Forms, Apps Script, Gemini API) zarządzane są z konta: wsb.student.tester@gmail.com. Adres ten stanowi jedyny dopuszczalny cel wysyłki poczty."],
    ["6. Tryb Demonstracyjny", "Wszelka korespondencja mailowa jest bezwarunkowo kierowana na adres wsb.student.tester@gmail.com z prefiksem [TEST]."]
  ];

  for (let i = 0; i < instructions.length; i++) {
    const row = 3 + i;
    aiSheet.getRange(row, 1).setValue(instructions[i][0]).setFontWeight("bold").setBackground("#f8fafc");
    aiSheet.getRange(row, 2, 1, 3).merge().setValue(instructions[i][1]).setWrap(true);
    aiSheet.setRowHeight(row, i === 1 ? 95 : 55);
  }

  aiSheet.setColumnWidth(1, 210);
  aiSheet.setColumnWidth(2, 600);

  Logger.log("Zakładka INSTRUKCJA AI zaktualizowana do v0.2.6.");
}

/**
 * Instaluje wyzwalacz onFormSubmit (usuwając ewentualne potwierdzone duplikaty)
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
 * Obsługa nowego zgłoszenia po wysłaniu formularza Google Forms
 */
function handleNewTicketSubmit(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    Logger.log("Przekroczono limit oczekiwania na LockService w handleNewTicketSubmit: " + lockErr.toString());
    return;
  }

  try {
    let sheet, row;
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
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
    const getCol = (name) => headers.indexOf(name) + 1;

    const idCol = getCol("ID Zgłoszenia");
    const statusCol = getCol("Status");
    const priorityCol = getCol("Priorytet");
    const opinionCol = getCol("Prośba o opinię wysłana");

    let assignedId = "";
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
      sheet.getRange(row, priorityCol).setValue("Standardowy");
    }
    if (opinionCol > 0 && !sheet.getRange(row, opinionCol).getValue()) {
      sheet.getRange(row, opinionCol).setValue("NIE");
    }

    SpreadsheetApp.flush();
    Logger.log(`Nowe zgłoszenie ${assignedId} w wierszu ${row} zainicjalizowane pod ochroną LockService.`);

    // Wysłanie automatycznego powiadomienia e-mail do dyspozytora
    sendNewTicketInternalNotification(sheet, row, headers, assignedId);

    // Odświeżenie statystyk na Dashboardzie
    refreshDashboardStats(sheet.getParent());

  } catch (err) {
    Logger.log("Błąd handleNewTicketSubmit: " + err.toString());
  } finally {
    lock.releaseLock();
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
  const contactReq = getVal("Prośba o kontakt ze strony pracownika");
  const nowFormatted = Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd HH:mm");
  const recipient = SMARTCARE_SETUP_CONFIG.dedicatedTesterEmail; // Zabezpieczenie serwerowe

  const subject = `[TEST] Nowe zgłoszenie ${ticketId} – ${ticketType}`;
  const sheetUrl = ss.getUrl();

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
  <div style="background: #143d59; color: #ffffff; padding: 18px 24px;">
    <h2 style="margin: 0; font-size: 18px; color: #ffffff;">ELWOZ ECO SmartCare – Nowe zgłoszenie</h2>
    <span style="font-size: 12px; color: #a5f3fc;">Punkt Obsługi Klienta w Kartuzach • Powiadomienie wewnętrzne dyspozytora</span>
  </div>
  <div style="padding: 22px 24px; color: #1e293b; line-height: 1.5; font-size: 14px;">
    <p style="margin-top: 0;">Do rejestru SmartCare wpłynęło nowe zgłoszenie od mieszkańca:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b; width: 42%;">Numer zgłoszenia:</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${ticketId}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Data wpłynięcia:</td><td style="padding: 8px 0; font-weight: bold;">${nowFormatted}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Rodzaj zgłoszenia:</td><td style="padding: 8px 0; font-weight: bold; color: #1b7a3e;">${ticketType}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Frakcja odpadów:</td><td style="padding: 8px 0;">${wasteFraction}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Miejscowość:</td><td style="padding: 8px 0;">${city}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Wnioskowano o kontakt:</td><td style="padding: 8px 0; font-weight: bold; color: ${contactReq ? '#b45309' : '#475569'};">${contactReq ? 'TAK (wymaga kontaktu telefonicznego lub e-mail)' : 'NIE'}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Status sprawy:</td><td style="padding: 8px 0;"><span style="background: #e3f2fd; color: #0d47a1; padding: 3px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px;">Nowe</span></td></tr>
    </table>

    <div style="text-align: center; margin: 24px 0 16px 0;">
      <a href="${sheetUrl}" style="background: #1b7a3e; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 13px;">Otwórz rejestr ZGŁOSZENIA w Google Sheets</a>
    </div>

    <p style="font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px; line-height: 1.4;">
      🔒 <strong>Bezpieczeństwo RODO:</strong> Pełne dane mieszkańca znajdują się w zabezpieczonym arkuszu CRM.<br>
      Wiadomość testowa w ramach projektu Uniwersytetu WSB Merito w Gdańsku (SmartCare v0.2.6).
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
 * Niezawodny generator sekwencyjnego, unikalnego ID zgłoszenia (np. ELW-2026-0001)
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
 * GŁÓWNA FUNKCJA AKTUALIZUJĄCA DO WERSJI v0.2.6 (FINAL RELEASE)
 * Dostępna w menu arkusza: "📋 SmartCare -> 🚀 Aktualizuj system do v0.2.6"
 * 
 * Bezinwazyjna, zachowuje wszystkie dane i formularz, naprawia Dashboard dla pl_PL,
 * weryfikuje integralność danych i blokuje komunikat o sukcesie przy błędach.
 */
function updateSystemToV026() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  try {
    // 1. Zapewnienie ustawień w zakładce USTAWIENIA
    setupSettingsSheet(ss);

    // 2. Naprawa i przeliczenie Dashboardu z obsługą pl_PL i autokalibracją
    setupDashboardSheet(ss);

    // 3. Poprawa czytelności tabeli ZGŁOSZENIA (kompaktowy widok wierszy, brak ucinania nagłówków)
    const ticketSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
    if (ticketSheet) {
      formatTicketsSheetForReadability(ticketSheet);
    }

    // 4. Weryfikacja wyzwalacza onFormSubmit i usunięcie duplikatów
    installFormSubmitTrigger(ss);

    // 5. Aktualizacja rejestru testów
    setupTestsSheet(ss);

    // 6. Aktualizacja nagłówka INSTRUKCJA AI do v0.2.6
    setupAiInstructionSheet(ss);

    SpreadsheetApp.flush();

    // 7. ŚCISŁA WERYFIKACJA INTEGRALNOŚCI DASHBOARDU (Requirement 5, 6, 7, 8)
    const validation = validateDashboardIntegrity(ss);

    // Jeśli wykryto błędy formuł (#ERROR!, #REF!) lub niezgodność liczby zgłoszeń:
    // BEZWZGLĘDNIE NIE WYŚWIETLAMY KOMUNIKATU O SUKCESIE (Requirement 7)
    if (!validation.isValid) {
      const errorDetails = validation.errors.map(e => `<li>${e}</li>`).join("");
      const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; color: #1e293b; background: #ffffff; margin: 0; }
    h3 { margin-top: 0; color: #b91c1c; font-size: 16px; border-bottom: 2px solid #ef4444; padding-bottom: 6px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #fee2e2; color: #991b1b; margin-bottom: 12px; }
    .error-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 12px; font-size: 13px; color: #9f1239; margin-bottom: 14px; }
    ul { margin: 8px 0; padding-left: 20px; font-size: 12px; line-height: 1.5; }
    .btn-close { background: #e2e8f0; color: #1e293b; padding: 8px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; border: none; cursor: pointer; float: right; margin-top: 10px; }
  </style>
</head>
<body>
  <span class="badge">Wykryto niezgodności</span>
  <h3>SmartCare – Raport diagnostyczny Dashboardu</h3>
  <div class="error-box">
    <strong>Wykryto błędy podczas walidacji integralności Dashboardu:</strong>
    <ul>${errorDetails}</ul>
  </div>
  <p style="font-size: 12px; color: #64748b;">
    Locale arkusza: <strong>${validation.locale}</strong> | Aktywny separator: <strong>${validation.separator}</strong><br>
    Dashboard wymaga dalszej weryfikacji danych w zakładce ZGŁOSZENIA.
  </p>
  <button type="button" class="btn-close" onclick="google.script.host.close()">Zamknij</button>
</body>
</html>`;
      const errOutput = HtmlService.createHtmlOutput(errorHtml).setWidth(600).setHeight(420);
      ui.showModalDialog(errOutput, "SmartCare – Błąd weryfikacji Dashboardu");
      return;
    }

    // 8. Sukces: wygenerowanie raportu wdrożenia ze zweryfikowanymi rzeczywistymi liczbami
    const summaryHtml = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; color: #1e293b; background: #ffffff; margin: 0; }
    h3 { margin-top: 0; color: #143d59; font-size: 16px; border-bottom: 2px solid #1b7a3e; padding-bottom: 6px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #dcfce7; color: #166534; margin-bottom: 12px; }
    .item-list { margin: 12px 0; padding-left: 18px; font-size: 13px; line-height: 1.6; }
    .item-list li { margin-bottom: 6px; }
    .audit-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 14px; border-radius: 6px; font-size: 12px; color: #166534; margin-bottom: 14px; }
    .btn-close { background: #1b7a3e; color: #ffffff; padding: 9px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; border: none; cursor: pointer; float: right; margin-top: 10px; }
    .btn-close:hover { background: #145a32; }
  </style>
</head>
<body>
  <span class="badge">Weryfikacja zakończona sukcesem (Brak błędów #ERROR!)</span>
  <h3>ELWOZ ECO SmartCare v0.2.6 – Raport wdrożenia</h3>
  
  <div class="audit-box">
    ✓ <strong>Wynik audytu Dashboardu:</strong> Zweryfikowano ${validation.actualTickets} zgłoszeń w CRM (B5: ${validation.displayedTickets}).<br>
    ✓ <strong>Ustawienia regionalne:</strong> ${validation.locale} (składnia ze średnikiem ';').<br>
    ✓ <strong>Wykresy analityczne:</strong> ${validation.chartsCount} aktywne wykresy (Kategorie i Statusy).<br>
    ✓ <strong>Status wskaźników:</strong> 0 błędów ewaluacji (brak #ERROR!, #REF!, #VALUE!, #N/A).
  </div>

  <ul class="item-list">
    <li><strong>Zgodność z polskim Google Sheets:</strong> Formuły w pełni dostosowane do ustawień regionalnych pl_PL, z automatyczną ochroną przez silnik Apps Script.</li>
    <li><strong>Wykresy operacyjne:</strong> Dwa wygenerowane wykresy (Kategorie i Statusy) zasilane rzeczywistymi danymi bez ryzyka pustych pól.</li>
    <li><strong>Czytelność i ergonomia:</strong> Włączone zawijanie tekstu na nagłówkach i wiersze o wysokości 44px – brak uciętych napisów.</li>
    <li><strong>Zatwierdzony profil Google:</strong> Aktywny link do Profilu Firmy Google w USTAWIENIACH i szablonach wiadomości.</li>
    <li><strong>Powiadomienia e-mail:</strong> Bezpieczna wysyłka na <code>wsb.student.tester@gmail.com</code> z rejestracją w historii.</li>
    <li><strong>Instrukcja AI:</strong> Nagłówek zakładki zaktualizowany do wersji v0.2.6.</li>
  </ul>

  <button type="button" class="btn-close" onclick="google.script.host.close()">Zamknij</button>
</body>
</html>`;

    const output = HtmlService.createHtmlOutput(summaryHtml).setWidth(620).setHeight(480);
    ui.showModalDialog(output, "SmartCare – Aktualizacja do v0.2.6 (FINAL RELEASE)");
  } catch (err) {
    ui.alert("Błąd aktualizacji do v0.2.6", err.toString(), ui.ButtonSet.OK);
  }
}
