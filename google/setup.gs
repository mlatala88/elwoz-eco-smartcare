/**
 * ============================================================================
 * ELWOZ ECO SmartCare - Skrypt konfiguracyjny Google Apps Script (setup.gs)
 * Wersja: 0.2.0 (Rozszerzenie: Moduł komunikacji i zarządzania reputacją)
 * Projekt edukacyjny: Uniwersytet WSB Merito w Gdańsku
 * ============================================================================
 * 
 * Skrypt tworzy lub aktualizuje ekosystem:
 * 1. Formularz Google Forms (lub zachowuje istniejący).
 * 2. Arkusz: "ELWOZ ECO SmartCare – Centrum zgłoszeń".
 * 3. Zakładki:
 *    - DASHBOARD (rozszerzone KPI, czasy reakcji, statystyki opinii)
 *    - ZGŁOSZENIA (z nowymi polami komunikacji, satysfakcji i opinii)
 *    - HISTORIA KOMUNIKACJI (rejestr wysłanych wiadomości i rozmów)
 *    - USTAWIENIA (parametry placówki, link do opinii, tryb demonstracyjny)
 *    - TESTY (rejestr scenariuszy testowych i pomiary efektywności)
 *    - INSTRUKCJA AI (zasady promptowania, anonimizacji i ograniczeń)
 * 4. Instaluje wyzwalacz onFormSubmit nadający ID i status "Nowe".
 * 
 * Bezpieczny przy ponownym uruchomieniu (nie niszczy istniejących danych).
 */

const SMARTCARE_SETUP_CONFIG = {
  sheetName: "ELWOZ ECO SmartCare – Centrum zgłoszeń",
  formTitle: "ELWOZ ECO SmartCare – Zgłoszenie Mieszkańca (Prototyp Testowy)",
  formDescription: "Cyfrowy Punkt Obsługi Mieszkańca – Rejon Kartuzy.\n" +
    "UWAGA: Formularz stanowi studencki prototyp WSB Merito. Wprowadzaj WYŁĄCZNIE fikcyjne dane testowe. " +
    "W przypadku rzeczywistych reklamacji prosimy o kontakt pod adresem: kartuzy@elwozeco.pl.",
  prefixId: "ELW-2026-",
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
  contactResults: [
    "Mieszkaniec potwierdził rozwiązanie",
    "Wyjaśniono zasady / harmonogram",
    "Wymaga dalszej weryfikacji w terenie",
    "Brak kontaktu (nie odbiera / brak odp.)",
    "Oczekuje na ponowny kontakt"
  ]
};

/**
 * Główna funkcja instalacyjna i aktualizująca
 */
function setupSmartCareSystem() {
  Logger.log("=== Rozpoczynanie konfiguracji/aktualizacji ELWOZ ECO SmartCare v0.2.0 ===");

  // 1. Sprawdzenie lub utworzenie arkusza kalkulacyjnego
  let spreadsheet;
  const existingFiles = DriveApp.getFilesByName(SMARTCARE_SETUP_CONFIG.sheetName);
  
  if (existingFiles.hasNext()) {
    const file = existingFiles.next();
    spreadsheet = SpreadsheetApp.open(file);
    Logger.log("Odnaleziono istniejący arkusz CRM: " + spreadsheet.getUrl());
  } else {
    spreadsheet = SpreadsheetApp.create(SMARTCARE_SETUP_CONFIG.sheetName);
    Logger.log("Utworzono nowy arkusz CRM: " + spreadsheet.getUrl());
  }

  // 2. Utworzenie lub pobranie formularza Google Form
  const form = createOrGetForm();
  Logger.log("Formularz Google przygotowany: " + form.getPublishedUrl());

  // 3. Połączenie formularza z arkuszem kalkulacyjnym
  try {
    form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  } catch (e) {
    Logger.log("Formularz jest już powiązany z arkuszem lub powiązanie istnieje.");
  }
  Utilities.sleep(1500);

  // 4. Konfiguracja zakładki USTAWIENIA (tworzona jako pierwsza dla konfiguracji globalnej)
  setupSettingsSheet(spreadsheet);

  // 5. Konfiguracja zakładki HISTORIA KOMUNIKACJI
  setupCommunicationHistorySheet(spreadsheet);

  // 6. Konfiguracja zakładki ZGŁOSZENIA (z polami komunikacji)
  setupTicketsSheet(spreadsheet);

  // 7. Konfiguracja zakładki DASHBOARD (z rozszerzonymi KPI)
  setupDashboardSheet(spreadsheet);

  // 8. Konfiguracja zakładki TESTY
  setupTestsSheet(spreadsheet);

  // 9. Konfiguracja zakładki INSTRUKCJA AI
  setupAiInstructionSheet(spreadsheet);

  // 10. Instalacja wyzwalacza onFormSubmit
  installFormSubmitTrigger(spreadsheet);

  Logger.log("=== Konfiguracja v0.2.0 zakończona pomyślnie! ===");
  Logger.log("Arkusz CRM: " + spreadsheet.getUrl());
  Logger.log("Formularz publiczny: " + form.getPublishedUrl());
}

/**
 * Tworzy formularz Google z wymaganymi polami (lub pobiera istniejący)
 */
function createOrGetForm() {
  const existingForms = DriveApp.getFilesByName(SMARTCARE_SETUP_CONFIG.formTitle);
  if (existingForms.hasNext()) {
    const file = existingForms.next();
    return FormApp.openById(file.getId());
  }

  const form = FormApp.create(SMARTCARE_SETUP_CONFIG.formTitle);
  form.setDescription(SMARTCARE_SETUP_CONFIG.formDescription);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setCollectEmail(false);

  form.addListItem()
    .setTitle("Rodzaj zgłoszenia")
    .setHelpText("Wybierz charakter problemu")
    .setRequired(true)
    .setChoiceValues([
      "brak odbioru odpadów",
      "niepełny odbiór odpadów",
      "uszkodzony pojemnik",
      "bałagan po odbiorze",
      "brak worków",
      "problem z harmonogramem",
      "sugestia",
      "pochwała",
      "inne"
    ]);

  form.addListItem()
    .setTitle("Rodzaj odpadów")
    .setHelpText("Wskaż frakcję, której dotyczy zgłoszenie")
    .setRequired(false)
    .setChoiceValues([
      "nie dotyczy / nie wiem",
      "odpady zmieszane",
      "papier",
      "metale i tworzywa sztuczne",
      "szkło",
      "BIO",
      "odpady wielkogabarytowe",
      "inne"
    ]);

  form.addTextItem().setTitle("Miejscowość").setRequired(true);
  form.addTextItem().setTitle("Ulica lub lokalizacja").setRequired(true);
  form.addTextItem().setTitle("Numer posesji lub identyfikator miejsca").setRequired(true);
  form.addDateItem().setTitle("Data wystąpienia problemu").setRequired(false);
  form.addParagraphTextItem().setTitle("Opis zgłoszenia").setHelpText("Szczegóły zdarzenia (tylko fikcyjne dane!)").setRequired(true);
  form.addTextItem().setTitle("Imię i nazwisko (opcjonalne)").setRequired(false);
  form.addTextItem().setTitle("Numer telefonu (opcjonalny)").setRequired(false);
  form.addTextItem().setTitle("Adres e-mail (opcjonalny)").setRequired(false);
  form.addCheckboxItem()
    .setTitle("Prośba o kontakt ze strony pracownika")
    .setChoiceValues(["Tak, proszę o kontakt w sprawie tego zgłoszenia"])
    .setRequired(false);

  return form;
}

/**
 * Konfiguruje zakładkę USTAWIENIA
 */
function setupSettingsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.settings);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.settings);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange("A1:C1").merge()
      .setValue("ELWOZ ECO SmartCare – Konfiguracja i Ustawienia Systemowe")
      .setFontSize(12)
      .setFontWeight("bold")
      .setBackground("#143d59")
      .setFontColor("#ffffff")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);

    sheet.getRange("A2:C2").setValues([["Parametr konfiguracyjny", "Wartość", "Opis i instrukcja"]])
      .setFontWeight("bold")
      .setBackground("#e2e8f0")
      .setFontColor("#1e293b");

    const settingsData = [
      ["Nazwa przedsiębiorstwa", "ELWOZ ECO Sp. z o.o.", "Oficjalna nazwa podmiotu komunalnego"],
      ["Nazwa placówki", "Punkt Obsługi Klienta w Kartuzach", "Jednostka terenowa odpowiedzialna za rejon Kartuz"],
      ["Adres e-mail do kontaktu", "kartuzy@elwozeco.pl", "Oficjalny adres e-mail dyspozytorni POK"],
      ["Numer telefonu", "58 681 22 99", "Telefon kontaktowy POK Kartuzy"],
      ["Oficjalna strona internetowa", "https://elwozeco.pl/", "Główny portal spółki"],
      [
        "Zweryfikowany link do opinii Google",
        "https://search.google.com/local/writereview?placeid=PLACEHOLDER_KARTUZY",
        "Bezpośredni link do wystawienia recenzji z Profilu Firmy Google (do uzupełnienia po autoryzacji)"
      ],
      ["Nazwa nadawcy wiadomości", "ELWOZ ECO SmartCare – POK Kartuzy", "Nagłówek nadawcy w wysyłanych wiadomościach"],
      ["Ustawienie trybu demonstracyjnego", "TAK", "TAK = wiadomości wysyłane WYŁĄCZNIE na adres testowy z tematem [TEST]; NIE = tryb produkcyjny"],
      ["Testowy adres e-mail", "test@student.wsb.pl", "Adres, na który trafia cała korespondencja w trybie demonstracyjnym"]
    ];

    sheet.getRange(3, 1, settingsData.length, 3).setValues(settingsData);

    const demoRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["TAK", "NIE"], false)
      .setAllowInvalid(false)
      .build();
    sheet.getRange("B10").setDataValidation(demoRule);

    sheet.setColumnWidth(1, 260);
    sheet.setColumnWidth(2, 360);
    sheet.setColumnWidth(3, 400);
  }

  Logger.log("Zakładka USTAWIENIA przygotowana.");
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
      .setValue("ELWOZ ECO SmartCare – Dziennik Korespondencji i Historii Komunikacji")
      .setFontSize(12)
      .setFontWeight("bold")
      .setBackground("#143d59")
      .setFontColor("#ffffff")
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
      .setBackground("#1b7a3e")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setFontSize(9)
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

  Logger.log("Zakładka HISTORIA KOMUNIKACJI przygotowana.");
}

/**
 * Konfiguruje zakładkę ZGŁOSZENIA (z rozszerzonymi kolumnami komunikacji i satysfakcji)
 */
function setupTicketsSheet(spreadsheet) {
  let ticketSheet = null;
  const sheets = spreadsheet.getSheets();
  
  for (let s of sheets) {
    if (s.getName().indexOf("Odpowiedzi z formularza") !== -1 || s.getName() === SMARTCARE_SETUP_CONFIG.sheetTabs.tickets) {
      ticketSheet = s;
      break;
    }
  }

  if (!ticketSheet) {
    ticketSheet = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  } else {
    ticketSheet.setName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
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
      "Numer posesji",
      "Data wystąpienia problemu",
      "Opis zgłoszenia",
      "Imię i nazwisko",
      "Numer telefonu",
      "Adres e-mail",
      "Prośba o kontakt"
    ];
    const allHeaders = baseFormHeaders.concat(operationalHeaders);
    ticketSheet.getRange(1, 1, 1, allHeaders.length).setValues([allHeaders]);
  } else {
    const existingHeaderValues = ticketSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const missingHeaders = operationalHeaders.filter(h => existingHeaderValues.indexOf(h) === -1);
    
    if (missingHeaders.length > 0) {
      ticketSheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]);
      Logger.log("Dodano brakujące kolumny operacyjne: " + missingHeaders.join(", "));
    }
  }

  const totalCols = ticketSheet.getLastColumn();
  const headerRange = ticketSheet.getRange(1, 1, 1, totalCols);
  headerRange.setBackground("#1b7a3e")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(9)
    .setWrap(true)
    .setVerticalAlignment("middle");
  
  ticketSheet.setRowHeight(1, 40);
  ticketSheet.setFrozenRows(1);
  ticketSheet.setFrozenColumns(2);

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

  Logger.log("Zakładka ZGŁOSZENIA skonfigurowana pomyślnie.");
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
 * Konfiguruje rozszerzoną zakładkę DASHBOARD
 */
function setupDashboardSheet(spreadsheet) {
  let dash = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.dashboard);
  if (!dash) {
    dash = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.dashboard, 0);
  }

  dash.clear();
  dash.setGridlines(true);

  // Nagłówek Dashboardu
  dash.getRange("A1:G1").merge()
    .setValue("ELWOZ ECO SmartCare – Panel Operacyjny i Zarządzanie Doświadczeniem Mieszkańca")
    .setFontSize(13)
    .setFontWeight("bold")
    .setBackground("#143d59")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  dash.setRowHeight(1, 42);

  dash.getRange("A2:G2").merge()
    .setValue("Rejon Kartuzy • Wskaźniki wyliczane dynamicznie na podstawie rzeczywistych danych rejestru ZGŁOSZENIA.")
    .setFontSize(9)
    .setFontStyle("italic")
    .setBackground("#f8fafc")
    .setFontColor("#64748b")
    .setHorizontalAlignment("center");
  dash.setRowHeight(2, 22);

  // SEKCJA 1: Główne wolumeny operacyjne (Wiersze 4-5)
  dash.getRange("B4:F4").setValues([[
    "Wszystkie zgłoszenia",
    "Nowe",
    "W realizacji",
    "Zakończone (Rozwiązane/Zamknięte)",
    "Odsetek zakończonych"
  ]])
    .setFontWeight("bold")
    .setFontSize(9)
    .setBackground("#e2e8f0")
    .setFontColor("#334155")
    .setHorizontalAlignment("center");

  dash.getRange("B5").setFormula('=IFERROR(COUNTA(FILTER(ZGŁOSZENIA!B2:B; ZGŁOSZENIA!B2:B<>"")); 0)');
  dash.getRange("C5").setFormula('=IFERROR(COUNTIF(ZGŁOSZENIA!N2:N; "Nowe"); 0)');
  dash.getRange("D5").setFormula('=IFERROR(COUNTIF(ZGŁOSZENIA!N2:N; "W realizacji"); 0)');
  dash.getRange("E5").setFormula('=IFERROR(COUNTIF(ZGŁOSZENIA!N2:N; "Rozwiązane") + COUNTIF(ZGŁOSZENIA!N2:N; "Zamknięte"); 0)');
  dash.getRange("F5").setFormula('=IF(B5>0; TEXT(E5/B5; "0,0%"); "0,0%")');

  dash.getRange("B5:F5")
    .setFontSize(16)
    .setFontWeight("bold")
    .setFontColor("#143d59")
    .setHorizontalAlignment("center")
    .setBackground("#ffffff");
  dash.setRowHeight(5, 36);

  // SEKCJA 2: Komunikacja, Czas reakcji i Rozwiązania (Wiersze 7-8)
  dash.getRange("B7:F7").setValues([[
    "Sprawy oczekujące na kontakt",
    "Śr. czas 1. reakcji (dni)",
    "Śr. czas rozwiązania (dni)",
    "Średnia satysfakcja (1-5)",
    "Liczba zebranych ocen"
  ]])
    .setFontWeight("bold")
    .setFontSize(9)
    .setBackground("#e2e8f0")
    .setFontColor("#334155")
    .setHorizontalAlignment("center");

  dash.getRange("B8").setFormula(
    '=IFERROR(COUNTIFS(ZGŁOSZENIA!L2:L; "*Tak*"; ZGŁOSZENIA!N2:N; "Nowe") + COUNTIFS(ZGŁOSZENIA!L2:L; "*Tak*"; ZGŁOSZENIA!N2:N; "Do weryfikacji"); 0)'
  );

  dash.getRange("C8").setFormula(
    '=IFERROR(ROUND(AVERAGE(FILTER(INT(ZGŁOSZENIA!U2:U) - INT(ZGŁOSZENIA!A2:A); ISNUMBER(ZGŁOSZENIA!U2:U); ZGŁOSZENIA!U2:U<>"")); 1); "brak danych")'
  );

  dash.getRange("D8").setFormula(
    '=IFERROR(ROUND(AVERAGE(FILTER(INT(ZGŁOSZENIA!W2:W) - INT(ZGŁOSZENIA!A2:A); ISNUMBER(ZGŁOSZENIA!W2:W); ZGŁOSZENIA!W2:W<>"")); 1); "brak danych")'
  );

  dash.getRange("E8").setFormula(
    '=IFERROR(ROUND(AVERAGE(FILTER(ZGŁOSZENIA!Z2:Z; ISNUMBER(ZGŁOSZENIA!Z2:Z); ZGŁOSZENIA!Z2:Z<>"")); 2); "brak ocen")'
  );

  dash.getRange("F8").setFormula(
    '=IFERROR(COUNT(FILTER(ZGŁOSZENIA!Z2:Z; ISNUMBER(ZGŁOSZENIA!Z2:Z); ZGŁOSZENIA!Z2:Z<>"")); 0)'
  );

  dash.getRange("B8:F8")
    .setFontSize(13)
    .setFontWeight("bold")
    .setFontColor("#1b7a3e")
    .setHorizontalAlignment("center")
    .setBackground("#ffffff");
  dash.setRowHeight(8, 34);

  // SEKCJA 3: Zarządzanie Reputacją i Opinie Google (Wiersze 10-11)
  dash.getRange("B10:E10").setValues([[
    "Wysłane prośby o opinię Google",
    "Odsetek zakończonych z prośbą o opinię",
    "Wskaźnik zebranych ocen satysfakcji",
    "Uwaga interpretacyjna"
  ]])
    .setFontWeight("bold")
    .setFontSize(9)
    .setBackground("#dbeafe")
    .setFontColor("#1e40af")
    .setHorizontalAlignment("center");

  dash.getRange("B11").setFormula('=IFERROR(COUNTIF(ZGŁOSZENIA!AB2:AB; "TAK"); 0)');
  dash.getRange("C11").setFormula('=IF(E5>0; TEXT(B11/E5; "0,0%"); "0,0%")');
  dash.getRange("D11").setFormula('=IF(E5>0; TEXT(F8/E5; "0,0%"); "0,0%")');

  dash.getRange("E11").setValue("Liczba próśb ≠ liczba wystawionych opinii. Recenzje wystawia dobrowolnie mieszkaniec na Google.")
    .setFontSize(8)
    .setFontStyle("italic")
    .setFontColor("#64748b")
    .setWrap(true);

  dash.getRange("B11:D11")
    .setFontSize(14)
    .setFontWeight("bold")
    .setFontColor("#1e40af")
    .setHorizontalAlignment("center")
    .setBackground("#ffffff");
  dash.setRowHeight(11, 34);

  // Tabele pomocnicze do kategorii i statusów (wiersze 13-23)
  dash.getRange("B13:C13").setValues([["Kategoria zgłoszenia", "Liczba"]])
    .setFontWeight("bold").setBackground("#1b7a3e").setFontColor("#ffffff");

  const categories = [
    "brak odbioru odpadów", "niepełny odbiór odpadów", "uszkodzony pojemnik",
    "bałagan po odbiorze", "brak worków", "problem z harmonogramem",
    "sugestia", "pochwała", "inne"
  ];
  for (let i = 0; i < categories.length; i++) {
    const row = 14 + i;
    dash.getRange(row, 2).setValue(categories[i]);
    dash.getRange(row, 3).setFormula(`=COUNTIF(ZGŁOSZENIA!B2:B; "${categories[i]}")`);
  }

  dash.getRange("E13:F13").setValues([["Status sprawy", "Liczba"]])
    .setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff");

  for (let j = 0; j < SMARTCARE_SETUP_CONFIG.statuses.length; j++) {
    const r = 14 + j;
    dash.getRange(r, 5).setValue(SMARTCARE_SETUP_CONFIG.statuses[j]);
    dash.getRange(r, 6).setFormula(`=COUNTIF(ZGŁOSZENIA!N2:N; "${SMARTCARE_SETUP_CONFIG.statuses[j]}")`);
  }

  dash.setColumnWidth(1, 20);
  dash.setColumnWidth(2, 210);
  dash.setColumnWidth(3, 110);
  dash.setColumnWidth(4, 180);
  dash.setColumnWidth(5, 180);
  dash.setColumnWidth(6, 110);
  dash.setColumnWidth(7, 260);

  Logger.log("Rozszerzona zakładka DASHBOARD przygotowana.");
}

/**
 * Konfiguruje zakładkę TESTY z uwzględnieniem komunikacji i reputacji
 */
function setupTestsSheet(spreadsheet) {
  let testSheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tests);
  if (!testSheet) {
    testSheet = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.tests);
  }

  testSheet.clear();

  testSheet.getRange("A1:J1").merge()
    .setValue("ELWOZ ECO SmartCare – Rejestr Testów Systemowych (w tym modułu komunikacji i reputacji)")
    .setFontSize(12)
    .setFontWeight("bold")
    .setBackground("#143d59")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  testSheet.setRowHeight(1, 38);

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

  testSheet.getRange(2, 1, 1, testHeaders.length).setValues([testHeaders])
    .setBackground("#1b7a3e")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(9)
    .setHorizontalAlignment("center");
  testSheet.setRowHeight(2, 30);

  const testScenarios = [
    ["TEST-01", "", "", "Przygotowanie potwierdzenia przyjęcia zgłoszenia", "W oknie dialogowym pojawia się uzupełniony szablon potwierdzenia z danymi zgłoszenia", "", "", "Do wykonania", "", ""],
    ["TEST-02", "", "", "Edycja wiadomości przed wysyłką", "Pracownik może zmienić temat i treść w oknie dialogowym; zmiany są uwzględniane w wysyłce", "", "", "Do wykonania", "", ""],
    ["TEST-03", "", "", "Wysyłka na zatwierdzony adres testowy (Tryb Demo)", "Wiadomość trafia wyłącznie na adres testowy z USTAWIENIA, a w temacie dodano [TEST]", "", "", "Do wykonania", "", ""],
    ["TEST-04", "", "", "Zapis historii wysyłki w HISTORIA KOMUNIKACJI", "Po zatwierdzeniu wysyłki w arkuszu historii pojawia się kompletny wiersz ze statusem 'wysłano'", "", "", "Do wykonania", "", ""],
    ["TEST-05", "", "", "Obsługa zgłoszenia bez adresu e-mail", "System informuje pracownika o braku e-maila i proponuje odnotowanie kontaktu telefonicznego", "", "", "Do wykonania", "", ""],
    ["TEST-06", "", "", "Odnotowanie kontaktu telefonicznego", "Zapis notatki z rozmowy w historii komunikacji i aktualizacja daty ostatniego kontaktu w CRM", "", "", "Do wykonania", "", ""],
    ["TEST-07", "", "", "Przygotowanie informacji o rozwiązaniu problemu", "System wymaga uzupełnienia pola 'Sposób rozwiązania sprawy' przed przygotowaniem wiadomości", "", "", "Do wykonania", "", ""],
    ["TEST-08", "", "", "Dodanie linku do opinii Google do wiadomości o rozwiązaniu", "Szablon zawiera neutralną prośbę i zweryfikowany link z USTAWIENIA; brak wymuszeń i ocen", "", "", "Do wykonania", "", ""],
    ["TEST-09", "", "", "Zapis oceny satysfakcji mieszkańca (1-5)", "Wpisanie oceny aktualizuje wskaźnik średniej satysfakcji w DASHBOARD; ocena nie jest wymagana do zamknięcia", "", "", "Do wykonania", "", ""],
    ["TEST-10", "", "", "Zabezpieczenie przed ponowną prośbą o opinię", "Gdy prośba była już wysłana, system wyświetla ostrzeżenie i żąda dodatkowego potwierdzenia", "", "", "Do wykonania", "", ""],
    ["TEST-11", "", "", "Zabezpieczenie przed wysyłką do prawdziwego klienta w trybie demo", "Nawet jeśli w formularzu wpisano obcy e-mail, tryb demo przekierowuje na adres testowy", "", "", "Do wykonania", "", ""],
    ["TEST-12", "", "", "Obsługa błędów wysyłki (MailApp)", "W razie błędu sieci/limitu status to 'błąd wysyłki', a wiersz nie jest oznaczany jako 'wysłano'", "", "", "Do wykonania", "", ""]
  ];

  testSheet.getRange(3, 1, testScenarios.length, 10).setValues(testScenarios);

  const testStatusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Zaliczony", "Niezaliczony", "W toku", "Do wykonania"], true)
    .build();
  testSheet.getRange(3, 8, testScenarios.length, 1).setDataValidation(testStatusRule);

  testSheet.setColumnWidth(1, 80);
  testSheet.setColumnWidth(2, 130);
  testSheet.setColumnWidth(3, 90);
  testSheet.setColumnWidth(4, 280);
  testSheet.setColumnWidth(5, 270);
  testSheet.setColumnWidth(6, 270);

  Logger.log("Zakładka TESTY przygotowana.");
}

/**
 * Konfiguruje zakładkę INSTRUKCJA AI
 */
function setupAiInstructionSheet(spreadsheet) {
  let aiSheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.aiGuide);
  if (!aiSheet) {
    aiSheet = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.aiGuide);
  }

  aiSheet.clear();

  aiSheet.getRange("A1:D1").merge()
    .setValue("ELWOZ ECO SmartCare – Instrukcja Obsługi Zgłoszeń i Komunikacji z AI")
    .setFontSize(12)
    .setFontWeight("bold")
    .setBackground("#143d59")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  aiSheet.setRowHeight(1, 36);

  const instructions = [
    ["1. Zasada nadrzędna", "Sztuczna inteligencja pełni WYŁĄCZNIE rolę asystenta pracownika (Human-in-the-Loop). Pracownik weryfikuje i zatwierdza każdą wiadomość przed wysyłką."],
    ["2. Ograniczenia i zakazy dla AI", "AI KATEGORYCZNIE NIE WOLNO:\n• deklarować uznania reklamacji lub winy przedsiębiorstwa,\n• wymyślać wykonanych działań naprawczych (działania muszą pochodzić z notatek pracownika),\n• ustalać sztywnych terminów realizacji,\n• obiecywać jakichkolwiek odszkodowań finansowych,\n• generować opinii w imieniu mieszkańców ani sugerować liczby gwiazdek."],
    ["3. Anonimizacja danych", "Przed analizą w AI model otrzymuje wyłącznie zanonimizowany kontekst operacyjny (rodzaj problemu, frakcję, miejscowość, ulicę oraz treść zgłoszenia). Nazwiska, telefony i prywatne maile NIE są przesyłane do promptu."],
    ["4. Menu 'SmartCare'", "Wszystkie działania wykonuje się z menu arkusza: 'SmartCare':\n• Analizuj zgłoszenie przez AI\n• Przygotuj potwierdzenie przyjęcia\n• Przygotuj informację o postępach\n• Przygotuj informację o rozwiązaniu\n• Przygotuj prośbę o opinię\n• Odnotuj kontakt telefoniczny\n• Wyświetl historię komunikacji."],
    ["5. Tryb Demonstracyjny", "Domyślnie aktywny w USTAWIENIA (wartość TAK). Wszelka korespondencja mailowa jest kierowana na zatwierdzony adres testowy z prefiksem [TEST]."]
  ];

  for (let i = 0; i < instructions.length; i++) {
    const row = 3 + i;
    aiSheet.getRange(row, 1).setValue(instructions[i][0]).setFontWeight("bold").setBackground("#f8fafc");
    aiSheet.getRange(row, 2, 1, 3).merge().setValue(instructions[i][1]).setWrap(true);
    aiSheet.setRowHeight(row, i === 1 ? 95 : 55);
  }

  aiSheet.setColumnWidth(1, 210);
  aiSheet.setColumnWidth(2, 600);

  Logger.log("Zakładka INSTRUKCJA AI przygotowana.");
}

/**
 * Instaluje wyzwalacz onFormSubmit
 */
function installFormSubmitTrigger(spreadsheet) {
  const triggers = ScriptApp.getUserTriggers(spreadsheet);
  let exists = false;
  for (let t of triggers) {
    if (t.getHandlerFunction() === "handleNewTicketSubmit") {
      exists = true;
      break;
    }
  }

  if (!exists) {
    ScriptApp.newTrigger("handleNewTicketSubmit")
      .forSpreadsheet(spreadsheet)
      .onFormSubmit()
      .create();
    Logger.log("Wyzwalacz handleNewTicketSubmit zainstalowany.");
  }
}

/**
 * Obsługa nowego zgłoszenia po wysłaniu formularza
 */
function handleNewTicketSubmit(e) {
  try {
    const sheet = e.range.getSheet();
    const row = e.range.getRow();

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const getCol = (name) => headers.indexOf(name) + 1;

    const idCol = getCol("ID Zgłoszenia");
    const statusCol = getCol("Status");
    const priorityCol = getCol("Priorytet");
    const opinionCol = getCol("Prośba o opinię wysłana");

    if (idCol > 0 && !sheet.getRange(row, idCol).getValue()) {
      const paddedId = String(row - 1).padStart(4, "0");
      sheet.getRange(row, idCol).setValue(SMARTCARE_SETUP_CONFIG.prefixId + paddedId);
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

    Logger.log(`Nowe zgłoszenie w wierszu ${row} zainicjalizowane.`);
  } catch (err) {
    Logger.log("Błąd onFormSubmit: " + err.toString());
  }
}
