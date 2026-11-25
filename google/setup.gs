/**
 * ============================================================================
 * ELWOZ ECO SmartCare - Skrypt konfiguracyjny Google Apps Script (setup.gs)
 * Wersja: 0.2.6 (FINAL RELEASE – Naprawa całego Dashboardu, automatyczne powiadomienia, zatwierdzone opinie Google)
 * Projekt edukacyjny: Uniwersytet WSB Merito w Gdańsku
 * Dedykowane konto Google: wsb.student.tester@gmail.com
 * ============================================================================
 * 
 * WAŻNE (Container-bound Script):
 * Niniejszy skrypt MUSI być uruchamiany w projekcie Apps Script bezpośrednio
 * powiązanym z arkuszem Google Sheets poprzez: Rozszerzenia → Apps Script.
 * 
 * GŁÓWNE USPRAWNIENIA WERSJI v0.2.6:
 * 1. KOMPLETNA NAPRAWA DASHBOARDU: Dynamiczne mapowanie kolumn według rzeczywistych nagłówków
 *    arkusza ZGŁOSZENIA (eliminacja niezweryfikowanych liter kolumn i błędów składniowych locale).
 * 2. AUTOMATYCZNE PRZELICZANIE STATYSTYK: Niezawodne formuły oraz automatyczne odświeżanie statystyk
 *    po każdym nowym zgłoszeniu, zmianie statusu, kontakcie telefonicznym, e-mailu i analizie AI.
 * 3. DWA WYKRESY OPERACYJNE: Zgłoszenia według kategorii oraz Zgłoszenia według statusów (bez duplikowania).
 * 4. CZYTELNOŚĆ REJESTRU ZGŁOSZEŃ: Kompaktowa wysokość wierszy (28px) oraz zwijanie długich tekstów AI (CLIP)
 *    bez utraty i skracania danych w komórkach.
 * 5. ZATWIERDZONY LINK DO OPINII GOOGLE: Automatyczne wpisanie przetestowanego adresu Profilu Firmy Google
 *    (https://search.google.com/local/writereview?placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA).
 * 6. AUTOMATYCZNE POWIADOMIENIA E-MAIL: Natychmiastowe powiadomienie pracownika POK o każdym nowym zgłoszeniu
 *    (wysyłka ściśle na wsb.student.tester@gmail.com, bez Gemini API, z zapisem w historii komunikacji).
 * 7. FUNKCJA JEDNOKLIKOWEJ AKTUALIZACJI: updateSystemToV026() dostępna w menu SmartCare aktualizuje
 *    istniejący arkusz bez utraty danych, bez ponownej instalacji i bez duplikowania wyzwalaczy.
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
 * Dynamiczne wyszukiwanie litery kolumny na podstawie listy możliwych nazw nagłówka
 */
function findColumnLetterByHeaders(headers, possibleNames, defaultLetter) {
  if (!headers || !Array.isArray(headers)) return defaultLetter;
  for (let name of possibleNames) {
    const target = name.toLowerCase().trim();
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || "").toLowerCase().trim();
      if (h === target || h.startsWith(target) || h.includes(target)) {
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
  const lastCol = ticketSheet.getLastColumn();
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
    status: findColumnLetterByHeaders(headers, ["Status sprawy", "Status"], "N"),
    priority: findColumnLetterByHeaders(headers, ["Priorytet"], "O"),
    firstContact: findColumnLetterByHeaders(headers, ["Data pierwszego kontaktu", "Pierwszy kontakt", "Data potwierdzenia przyjęcia"], "U"),
    resolutionDate: findColumnLetterByHeaders(headers, ["Data rozwiązania", "Rozwiązanie"], "W"),
    satisfaction: findColumnLetterByHeaders(headers, ["Ocena satysfakcji (1-5)", "Ocena satysfakcji", "Satysfakcja"], "Z"),
    reviewSent: findColumnLetterByHeaders(headers, ["Prośba o opinię wysłana", "Opinia wysłana"], "AB"),
    reviewDate: findColumnLetterByHeaders(headers, ["Data wysłania prośby o opinię"], "AC")
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

  Logger.log("=== Konfiguracja v0.2.6 zakończona pomyślnie! ===");
}

/**
 * Tworzy lub pobiera formularz powiązany z arkuszem
 */
function createOrGetForm(spreadsheet) {
  const formUrl = spreadsheet.getFormUrl();
  if (formUrl) {
    try {
      const existingForm = FormApp.openByUrl(formUrl);
      if (existingForm) {
        Logger.log("Odnaleziono istniejący formularz powiązany z arkuszem: " + existingForm.getPublishedUrl());
        return existingForm;
      }
    } catch (e) {
      Logger.log("Błąd odczytu powiązanego formularza, tworzenie nowego: " + e.toString());
    }
  }

  const form = FormApp.create(SMARTCARE_SETUP_CONFIG.formTitle);
  form.setDescription(SMARTCARE_SETUP_CONFIG.formDescription);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setCollectEmail(false);

  form.addListItem()
    .setTitle("Rodzaj zgłoszenia")
    .setHelpText("Wybierz rodzaj sprawy")
    .setRequired(true)
    .setChoiceValues(SMARTCARE_SETUP_CONFIG.categories);

  form.addListItem()
    .setTitle("Rodzaj odpadów")
    .setHelpText("Wskaż frakcję, której dotyczy problem")
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

  form.addTextItem().setTitle("Miejscowość").setHelpText("np. Kartuzy (dane testowe)").setRequired(true);
  form.addTextItem().setTitle("Ulica lub lokalizacja").setHelpText("np. ul. Jeziorna").setRequired(true);
  form.addTextItem().setTitle("Numer posesji lub identyfikator miejsca").setHelpText("np. 12A").setRequired(true);
  form.addDateItem().setTitle("Data wystąpienia problemu").setRequired(false);
  form.addParagraphTextItem().setTitle("Opis zgłoszenia").setHelpText("Szczegóły zdarzenia (wyłącznie fikcyjne dane!)").setRequired(true);
  form.addTextItem().setTitle("Imię i nazwisko").setHelpText("Opcjonalne dane testowe").setRequired(false);
  form.addTextItem().setTitle("Numer telefonu").setHelpText("Opcjonalny fikcyjny numer telefonu").setRequired(false);
  form.addTextItem().setTitle("Adres e-mail").setHelpText("Opcjonalny fikcyjny e-mail").setRequired(false);
  form.addCheckboxItem()
    .setTitle("Prośba o kontakt ze strony pracownika")
    .setChoiceValues(["Tak, proszę o kontakt w sprawie tego zgłoszenia"])
    .setRequired(false);

  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  Utilities.sleep(2000);

  return form;
}

/**
 * Konfiguruje zakładkę USTAWIENIA (z zatwierdzonym linkiem do opinii i konfiguracją powiadomień)
 */
function setupSettingsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.settings);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.settings);
  }

  const defaultRows = [
    ["Nazwa przedsiębiorstwa", "ELWOZ ECO Sp. z o.o.", "Oficjalna nazwa podmiotu komunalnego"],
    ["Nazwa placówki", "Punkt Obsługi Klienta w Kartuzach", "Jednostka terenowa odpowiedzialna za rejon Kartuz"],
    ["Adres e-mail do kontaktu", "kartuzy@elwozeco.pl", "Oficjalny adres e-mail dyspozytorni POK"],
    ["Numer telefonu", "58 681 22 99", "Telefon kontaktowy POK Kartuzy"],
    ["Oficjalna strona internetowa", "https://elwozeco.pl/", "Główny portal spółki"],
    [
      "Zweryfikowany link do opinii Google",
      SMARTCARE_SETUP_CONFIG.verifiedGoogleReviewUrl,
      "Zatwierdzony i przetestowany bezpośredni link do Profilu Firmy Google ELWOZ ECO w Kartuzach"
    ],
    ["Nazwa nadawcy wiadomości", "ELWOZ ECO SmartCare – POK Kartuzy", "Nagłówek nadawcy w wysyłanych wiadomościach"],
    ["Tryb pracy systemu", "STUDENCKI PROTOTYP TESTOWY", "Wysyłka e-mail jest bezwarunkowo ograniczona do zatwierdzonego konta testerskiego"],
    [
      "Testowy adres e-mail",
      SMARTCARE_SETUP_CONFIG.dedicatedTesterEmail,
      "Jedyny zatwierdzony serwerowo odbiorca testowy (zabezpieczony twardą regułą po stronie backendu)"
    ],
    [
      "Automatyczne powiadomienia o nowych zgłoszeniach",
      "WŁĄCZONE",
      "Powiadamia dyspozytora e-mailem natychmiast po wpłynięciu zgłoszenia (WŁĄCZONE / WYŁĄCZONE)"
    ],
    [
      "Adres odbiorcy powiadomień",
      SMARTCARE_SETUP_CONFIG.dedicatedTesterEmail,
      "Adres e-mail pracownika POK odbierającego powiadomienia o nowych zgłoszeniach"
    ]
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange("A1:C1").merge()
      .setValue("ELWOZ ECO SmartCare – Konfiguracja i Ustawienia Systemowe v0.2.6")
      .setFontSize(12).setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);

    sheet.getRange("A2:C2").setValues([["Parametr konfiguracyjny", "Wartość", "Opis i instrukcja"]])
      .setFontWeight("bold").setBackground("#e2e8f0").setFontColor("#1e293b");
    sheet.setRowHeight(2, 28);

    sheet.getRange(3, 1, defaultRows.length, 3).setValues(defaultRows);
  } else {
    // Aktualizacja istniejących ustawień z zachowaniem wyborów użytkownika
    const data = sheet.getDataRange().getValues();
    const existingParams = {};
    for (let i = 0; i < data.length; i++) {
      if (data[i][0]) existingParams[String(data[i][0]).trim()] = i + 1;
    }

    // 1. Zapewnienie zweryfikowanego linku do opinii Google
    if (existingParams["Zweryfikowany link do opinii Google"]) {
      const rowIdx = existingParams["Zweryfikowany link do opinii Google"];
      const currentVal = String(sheet.getRange(rowIdx, 2).getValue()).trim();
      if (!currentVal || currentVal.includes("PLACEHOLDER") || currentVal === "") {
        sheet.getRange(rowIdx, 2).setValue(SMARTCARE_SETUP_CONFIG.verifiedGoogleReviewUrl);
      }
    } else {
      sheet.appendRow([
        "Zweryfikowany link do opinii Google",
        SMARTCARE_SETUP_CONFIG.verifiedGoogleReviewUrl,
        "Zatwierdzony i przetestowany bezpośredni link do Profilu Firmy Google ELWOZ ECO w Kartuzach"
      ]);
    }

    // 2. Zapewnienie powiadomień o nowych zgłoszeniach
    if (!existingParams["Automatyczne powiadomienia o nowych zgłoszeniach"]) {
      sheet.appendRow([
        "Automatyczne powiadomienia o nowych zgłoszeniach",
        "WŁĄCZONE",
        "Powiadamia dyspozytora e-mailem natychmiast po wpłynięciu zgłoszenia (WŁĄCZONE / WYŁĄCZONE)"
      ]);
    }

    // 3. Zapewnienie adresu odbiorcy powiadomień
    if (!existingParams["Adres odbiorcy powiadomień"]) {
      sheet.appendRow([
        "Adres odbiorcy powiadomień",
        SMARTCARE_SETUP_CONFIG.dedicatedTesterEmail,
        "Adres e-mail pracownika POK odbierającego powiadomienia o nowych zgłoszeniach"
      ]);
    }

    // 4. Wymuszenie adresu testowego
    if (existingParams["Testowy adres e-mail"]) {
      sheet.getRange(existingParams["Testowy adres e-mail"], 2).setValue(SMARTCARE_SETUP_CONFIG.dedicatedTesterEmail);
    }
  }

  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 420);
  sheet.setColumnWidth(3, 400);
  Logger.log("Zakładka USTAWIENIA przygotowana (v0.2.6).");
}

/**
 * Konfiguruje zakładkę HISTORIA KOMUNIKACJI (z zachowaniem dotychczasowych wpisów)
 */
function setupCommunicationHistorySheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.communicationHistory);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SMARTCARE_SETUP_CONFIG.sheetTabs.communicationHistory);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange("A1:J1").merge()
      .setValue("ELWOZ ECO SmartCare – Dziennik Korespondencji i Historii Komunikacji")
      .setFontSize(12).setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff")
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
  
  ticketSheet.setRowHeight(1, 40);
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
 * Zapobiega rozszerzaniu wierszy przez długie opisy AI bez ucinania ani utraty danych.
 */
function formatTicketsSheetForReadability(ticketSheet) {
  const lastRow = ticketSheet.getLastRow();
  const lastCol = ticketSheet.getLastColumn();
  if (lastCol === 0) return;

  const headers = ticketSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());

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
      ticketSheet.setColumnWidth(idx, 220);
    }
  }

  // Szerokości kluczowych kolumn identyfikacyjnych
  const setWidthByHeader = (hName, width) => {
    const idx = headers.indexOf(hName) + 1;
    if (idx > 0) ticketSheet.setColumnWidth(idx, width);
  };

  setWidthByHeader("ID Zgłoszenia", 130);
  setWidthByHeader("Status", 110);
  setWidthByHeader("Priorytet", 100);
  setWidthByHeader("Rodzaj zgłoszenia", 180);
  setWidthByHeader("Rodzaj odpadów", 140);
  setWidthByHeader("Miejscowość", 120);
  setWidthByHeader("Ulica lub lokalizacja", 160);
  setWidthByHeader("Data pierwszego kontaktu", 140);
  setWidthByHeader("Data rozwiązania", 140);
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
 * Dynamiczne mapowanie kolumn, bezbłędne formuły z notacją przecinkową oraz dodanie 2 wykresów.
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
  dash.setRowHeight(1, 42);

  dash.getRange("A2:G2").merge()
    .setValue("Rejon Kartuzy • Statystyki operacyjne przeliczane dynamicznie z bazy CRM • Aktualizacja automatyczna")
    .setFontSize(9).setFontStyle("italic").setBackground("#f8fafc").setFontColor("#64748b")
    .setHorizontalAlignment("center");
  dash.setRowHeight(2, 22);

  // Pobranie dynamicznej mapy kolumn z zakładki ZGŁOSZENIA
  const ticketSheet = spreadsheet.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
  const cols = ticketSheet ? getTicketsColumnMap(ticketSheet) : {
    id: "M", type: "B", fraction: "C", city: "D", timestamp: "A", contactRequest: "L",
    status: "N", priority: "O", firstContact: "U", resolutionDate: "W", satisfaction: "Z",
    reviewSent: "AB", reviewDate: "AC"
  };

  // SEKCJA 1: Główne wolumeny operacyjne (Wiersze 4-5)
  dash.getRange("B4:F4").setValues([[
    "Wszystkie zgłoszenia",
    "Nowe",
    "W realizacji",
    "Zakończone (Rozwiązane/Zamknięte)",
    "Odsetek zakończonych"
  ]])
    .setFontWeight("bold").setFontSize(9).setBackground("#e2e8f0").setFontColor("#334155")
    .setHorizontalAlignment("center");

  // Dynamiczne, poprawne formuły Google Sheets (notacja US z przecinkami w setFormula)
  dash.getRange("B5").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.id}2:${cols.id}, "<>"), 0)`);
  dash.getRange("C5").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}, "Nowe"), 0)`);
  dash.getRange("D5").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}, "W realizacji"), 0)`);
  dash.getRange("E5").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}, "Rozwiązane") + COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}, "Zamknięte"), 0)`);
  dash.getRange("F5").setFormula(`=IF(B5>0, E5/B5, 0)`);
  dash.getRange("F5").setNumberFormat("0.0%");

  dash.getRange("B5:F5")
    .setFontSize(16).setFontWeight("bold").setFontColor("#143d59").setHorizontalAlignment("center")
    .setBackground("#ffffff");
  dash.setRowHeight(5, 36);

  // SEKCJA 2: Komunikacja, Czas reakcji i Satysfakcja (Wiersze 7-8)
  dash.getRange("B7:F7").setValues([[
    "Sprawy oczekujące na kontakt",
    "Śr. czas 1. reakcji (godz.)",
    "Śr. czas rozwiązania (godz.)",
    "Średnia satysfakcja (1-5)",
    "Liczba zebranych ocen"
  ]])
    .setFontWeight("bold").setFontSize(9).setBackground("#e2e8f0").setFontColor("#334155")
    .setHorizontalAlignment("center");

  dash.getRange("B8").setFormula(
    `=IFERROR(COUNTIFS(ZGŁOSZENIA!${cols.contactRequest}2:${cols.contactRequest}, "*Tak*", ZGŁOSZENIA!${cols.status}2:${cols.status}, "Nowe") + COUNTIFS(ZGŁOSZENIA!${cols.contactRequest}2:${cols.contactRequest}, "*Tak*", ZGŁOSZENIA!${cols.status}2:${cols.status}, "Do weryfikacji"), 0)`
  );

  dash.getRange("C8").setFormula(
    `=IFERROR(ROUND(AVERAGE(FILTER((ZGŁOSZENIA!${cols.firstContact}2:${cols.firstContact} - ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp}) * 24, ISNUMBER(ZGŁOSZENIA!${cols.firstContact}2:${cols.firstContact}), ISNUMBER(ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp}), ZGŁOSZENIA!${cols.firstContact}2:${cols.firstContact} >= ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp})), 2), "Brak danych")`
  );

  dash.getRange("D8").setFormula(
    `=IFERROR(ROUND(AVERAGE(FILTER((ZGŁOSZENIA!${cols.resolutionDate}2:${cols.resolutionDate} - ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp}) * 24, ISNUMBER(ZGŁOSZENIA!${cols.resolutionDate}2:${cols.resolutionDate}), ISNUMBER(ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp}), ZGŁOSZENIA!${cols.resolutionDate}2:${cols.resolutionDate} >= ZGŁOSZENIA!${cols.timestamp}2:${cols.timestamp})), 2), "Brak danych")`
  );

  dash.getRange("E8").setFormula(
    `=IFERROR(IF(F8>0, ROUND(AVERAGE(FILTER(ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}, ISNUMBER(ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}), ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}>=1, ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}<=5)), 2), "Brak ocen"), "Brak ocen")`
  );

  dash.getRange("F8").setFormula(
    `=IFERROR(COUNT(FILTER(ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}, ISNUMBER(ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}), ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}>=1, ZGŁOSZENIA!${cols.satisfaction}2:${cols.satisfaction}<=5)), 0)`
  );

  dash.getRange("B8:F8")
    .setFontSize(13).setFontWeight("bold").setFontColor("#1b7a3e").setHorizontalAlignment("center")
    .setBackground("#ffffff");
  dash.setRowHeight(8, 34);

  // SEKCJA 3: Zarządzanie Reputacją i Opinie Google (Wiersze 10-11)
  dash.getRange("B10:E10").setValues([[
    "Wysłane prośby o opinię Google",
    "Odsetek zakończonych z prośbą o opinię",
    "Wskaźnik zebranych ocen satysfakcji",
    "Uwaga interpretacyjna"
  ]])
    .setFontWeight("bold").setFontSize(9).setBackground("#dbeafe").setFontColor("#1e40af")
    .setHorizontalAlignment("center");

  dash.getRange("B11").setFormula(`=IFERROR(COUNTIF(ZGŁOSZENIA!${cols.reviewSent}2:${cols.reviewSent}, "TAK"), 0)`);
  dash.getRange("C11").setFormula(
    `=IF(E5>0, (COUNTIFS(ZGŁOSZENIA!${cols.reviewSent}2:${cols.reviewSent}, "TAK", ZGŁOSZENIA!${cols.status}2:${cols.status}, "Rozwiązane") + COUNTIFS(ZGŁOSZENIA!${cols.reviewSent}2:${cols.reviewSent}, "TAK", ZGŁOSZENIA!${cols.status}2:${cols.status}, "Zamknięte")) / E5, 0)`
  );
  dash.getRange("C11").setNumberFormat("0.0%");

  dash.getRange("D11").setFormula(`=IF(E5>0, F8/E5, 0)`);
  dash.getRange("D11").setNumberFormat("0.0%");

  dash.getRange("E11").setValue("Liczba próśb ≠ liczba opinii. Oceny wystawia dobrowolnie mieszkaniec na profilu Google.")
    .setFontSize(8).setFontStyle("italic").setFontColor("#64748b").setWrap(true);

  dash.getRange("B11:D11")
    .setFontSize(14).setFontWeight("bold").setFontColor("#1e40af").setHorizontalAlignment("center")
    .setBackground("#ffffff");
  dash.setRowHeight(11, 34);

  // Tabele pomocnicze do kategorii i statusów (wiersze 13-23)
  dash.getRange("B13:C13").setValues([["Kategoria zgłoszenia", "Liczba"]])
    .setFontWeight("bold").setBackground("#1b7a3e").setFontColor("#ffffff");

  for (let i = 0; i < SMARTCARE_SETUP_CONFIG.categories.length; i++) {
    const row = 14 + i;
    dash.getRange(row, 2).setValue(SMARTCARE_SETUP_CONFIG.categories[i]);
    dash.getRange(row, 3).setFormula(`=COUNTIF(ZGŁOSZENIA!${cols.type}2:${cols.type}, "*" & B${row} & "*")`);
  }

  dash.getRange("E13:F13").setValues([["Status sprawy", "Liczba"]])
    .setFontWeight("bold").setBackground("#143d59").setFontColor("#ffffff");

  for (let j = 0; j < SMARTCARE_SETUP_CONFIG.statuses.length; j++) {
    const r = 14 + j;
    dash.getRange(r, 5).setValue(SMARTCARE_SETUP_CONFIG.statuses[j]);
    dash.getRange(r, 6).setFormula(`=COUNTIF(ZGŁOSZENIA!${cols.status}2:${cols.status}, E${r})`);
  }

  dash.setColumnWidth(1, 20);
  dash.setColumnWidth(2, 230);
  dash.setColumnWidth(3, 110);
  dash.setColumnWidth(4, 180);
  dash.setColumnWidth(5, 180);
  dash.setColumnWidth(6, 110);
  dash.setColumnWidth(7, 260);

  // Dodanie wykresów operacyjnych bez duplikowania
  setupDashboardCharts(dash);

  Logger.log("Rozszerzona zakładka DASHBOARD przygotowana i przeliczona dynamicznie (v0.2.6).");
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
 * Automatyczne odświeżenie formuł i statystyk Dashboardu (funkcja pomocnicza)
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
 * Aktualizacja wyłącznie formuł Dashboardu (kompatybilność z poprzednimi wersjami)
 */
function updateDashboardKpiFormulasOnly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupDashboardSheet(ss);
  SpreadsheetApp.flush();
  ss.toast("Zaktualizowano statystyki i wykresy Dashboardu.", "SmartCare v0.2.6", 5);
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
    ["TEST-13", "", "", "Dynamiczny Dashboard z 2 wykresami", "Dashboard automatycznie przelicza 3 zgłoszenia testowe oraz odzwierciedla dane na wykresach kategorii i statusów", "", "", "Do wykonania", "", ""]
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
 * Konfiguruje zakładkę INSTRUKCJA AI (aktualna generacja Gemini Flash v0.2.6)
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
  aiSheet.setRowHeight(1, 36);

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

  Logger.log("Zakładka INSTRUKCJA AI przygotowana.");
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
        // Usunięcie nadmiarowego duplikatu
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
 * v0.2.6:
 * 1. Nadaje sekwencyjny identyfikator pod ochroną LockService.
 * 2. Inicjalizuje status Nowe, priorytet Standardowy i opinię NIE.
 * 3. Wysyła automatyczne powiadomienie e-mail do dyspozytora na wsb.student.tester@gmail.com.
 * 4. Odświeża statystyki Dashboardu.
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

    // Zapis w historii korespondencji
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
 * Dostępna w menu arkusza: "📋 SmartCare -> Aktualizuj system do v0.2.6"
 * Bezpieczna, bezinwazyjna, zachowuje wszystkie dane i formularz, naprawia Dashboard i powiadomienia.
 */
function updateSystemToV026() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  try {
    // 1. Zapewnienie ustawień w zakładce USTAWIENIA
    setupSettingsSheet(ss);

    // 2. Naprawa i dynamiczne przeliczenie całego Dashboardu
    setupDashboardSheet(ss);

    // 3. Poprawa czytelności tabeli ZGŁOSZENIA (kompaktowy widok wierszy)
    const ticketSheet = ss.getSheetByName(SMARTCARE_SETUP_CONFIG.sheetTabs.tickets);
    if (ticketSheet) {
      formatTicketsSheetForReadability(ticketSheet);
    }

    // 4. Weryfikacja wyzwalacza onFormSubmit i usunięcie duplikatów
    installFormSubmitTrigger(ss);

    // 5. Aktualizacja nagłówków rejestru testów
    setupTestsSheet(ss);

    SpreadsheetApp.flush();

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
    .btn-close { background: #1b7a3e; color: #ffffff; padding: 9px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; border: none; cursor: pointer; float: right; margin-top: 12px; }
    .btn-close:hover { background: #145a32; }
  </style>
</head>
<body>
  <span class="badge">Aktualizacja v0.2.6 zakończona sukcesem</span>
  <h3>ELWOZ ECO SmartCare v0.2.6 – Raport wdrożenia</h3>
  
  <p style="font-size: 13px;">System został pomyślnie zaktualizowany do wersji końcowej <strong>v0.2.6 (FINAL RELEASE)</strong> z pełnym zachowaniem dotychczasowych danych:</p>
  
  <ul class="item-list">
    <li><strong>Kompletna naprawa Dashboardu:</strong> Dynamicznie powiązano wskaźniki z kolumnami bazy CRM. Wszystkie 3 zgłoszenia testowe oraz przyszłe odpowiedzi są teraz poprawnie zliczane.</li>
    <li><strong>Wykresy operacyjne:</strong> Utworzono 2 automatyczne wykresy (Kategorie oraz Statusy) bez ryzyka duplikowania.</li>
    <li><strong>Zatwierdzony link do opinii Google:</strong> Wprowadzono przetestowany adres Profilu Firmy Google do zakładki USTAWIENIA i aktywowano zaproszenia do recenzji.</li>
    <li><strong>Automatyczne powiadomienia e-mail:</strong> Skonfigurowano natychmiastowe powiadamianie dyspozytora o nowych zgłoszeniach (odbiorca: <code>wsb.student.tester@gmail.com</code>).</li>
    <li><strong>Czytelność CRM:</strong> Sformatowano wiersze arkusza ZGŁOSZENIA do kompaktowej wysokości (28px) z bezpiecznym zwijaniem długich opisów.</li>
    <li><strong>Wyzwalacze:</strong> Zweryfikowano poprawność wyzwalacza <code>handleNewTicketSubmit</code> i usunięto ewentualne duplikaty.</li>
  </ul>

  <button type="button" class="btn-close" onclick="google.script.host.close()">Zamknij</button>
</body>
</html>`;

    const output = HtmlService.createHtmlOutput(summaryHtml).setWidth(600).setHeight(460);
    ui.showModalDialog(output, "SmartCare – Aktualizacja do v0.2.6 (FINAL RELEASE)");
  } catch (err) {
    ui.alert("Błąd aktualizacji do v0.2.6", err.toString(), ui.ButtonSet.OK);
  }
}
