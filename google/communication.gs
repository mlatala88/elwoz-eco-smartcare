/**
 * ============================================================================
 * ELWOZ ECO SmartCare - Moduł Komunikacji i Zarządzania Reputacją (communication.gs)
 * Wersja: 0.2.3 (LockService, obsługa błędów dialogu, blokada placeholdera opinii)
 * Projekt edukacyjny: Uniwersytet WSB Merito w Gdańsku
 * Dedykowane konto testowe: wsb.student.tester@gmail.com
 * ============================================================================
 * 
 * ZAKRES MODUŁU:
 * 1. Niestandardowe menu arkusza „SmartCare”.
 * 2. Cztery edytowalne szablony wiadomości oparte WYŁĄCZNIE na zweryfikowanych faktach.
 * 3. Pełne zabezpieczenie okien dialogowych przed wstrzyknięciem HTML/JS (escapeHtml).
 * 4. BEZWARUNKOWA blokada wysyłki na serwerze: dozwolony odbiorca to WYŁĄCZNIE wsb.student.tester@gmail.com.
 * 5. Zabezpieczenie przed równoczesną wysyłką za pomocą LockService.
 * 6. Zabezpieczenie przed duplikatami wysyłek (kontrola 5-minutowego okna).
 * 7. Blokada placeholdera w prośbie o opinię – brak oznaczania jako wysłane bez zweryfikowanego linku.
 * 8. Bezpieczna stylizacja wiadomości przez zweryfikowany model Gemini Flash.
 * 9. Zapis dat w arkuszu jako obiekty Date z poprawnym formatem dla formuł KPI w godzinach.
 */

// Jedyny bezwarunkowo autoryzowany odbiorca testowy
const APPROVED_TEST_RECIPIENT = "wsb.student.tester@gmail.com";

/**
 * Automatyczne utworzenie menu SmartCare po otwarciu arkusza
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📋 SmartCare")
    .addItem("1. 🤖 Analizuj zgłoszenie przez AI", "actionAnalyzeWithAi")
    .addSeparator()
    .addItem("2. ✉️ Przygotuj potwierdzenie przyjęcia", "actionPrepareConfirmation")
    .addItem("3. ✉️ Przygotuj informację o postępach", "actionPrepareProgressUpdate")
    .addItem("4. ✉️ Przygotuj informację o rozwiązaniu", "actionPrepareResolution")
    .addItem("5. ⭐ Przygotuj prośbę o opinię Google", "actionPrepareReviewRequest")
    .addSeparator()
    .addItem("6. 📞 Odnotuj kontakt telefoniczny", "actionLogPhoneCall")
    .addItem("7. 📜 Wyświetl historię komunikacji", "actionViewCommunicationHistory")
    .addSeparator()
    .addItem("🔄 Aktualizuj formuły Dashboardu (v0.2.3)", "updateDashboardKpiFormulasOnly")
    .addItem("⚙️ Ustawienia / Klucz Gemini API", "configureGeminiApiKeyFromComm")
    .addToUi();
}

/**
 * Weryfikacja czy adres URL Profilu Firmy Google jest autentycznym linkiem (a nie placeholderem)
 */
function isVerifiedReviewUrl(url) {
  if (!url) return false;
  const trimmed = String(url).trim();
  if (trimmed === "" || trimmed.includes("PLACEHOLDER")) return false;
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

/**
 * Funkcja sanityzacji tekstu zabezpieczająca przed wstrzyknięciem HTML i XSS
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Pobiera ustawienia systemowe z zakładki USTAWIENIA
 */
function getSmartCareSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName("USTAWIENIA");
  
  const defaultSettings = {
    companyName: "ELWOZ ECO Sp. z o.o.",
    facilityName: "Punkt Obsługi Klienta w Kartuzach",
    contactEmail: "kartuzy@elwozeco.pl",
    contactPhone: "58 681 22 99",
    website: "https://elwozeco.pl/",
    googleReviewUrl: "", // Usunięto fikcyjny link do opinii
    senderName: "ELWOZ ECO SmartCare – POK Kartuzy",
    testEmail: APPROVED_TEST_RECIPIENT
  };

  if (!settingsSheet) return defaultSettings;

  try {
    const data = settingsSheet.getRange("A3:B11").getValues();
    const settingsMap = {};
    for (let row of data) {
      if (row[0]) settingsMap[row[0].toString().trim()] = (row[1] || "").toString().trim();
    }

    let reviewUrl = settingsMap["Zweryfikowany link do opinii Google"] || "";
    if (reviewUrl.includes("PLACEHOLDER")) {
      reviewUrl = ""; // Wyczyszczenie fikcyjnego linku jeśli istniał
    }

    return {
      companyName: settingsMap["Nazwa przedsiębiorstwa"] || defaultSettings.companyName,
      facilityName: settingsMap["Nazwa placówki"] || defaultSettings.facilityName,
      contactEmail: settingsMap["Adres e-mail do kontaktu"] || defaultSettings.contactEmail,
      contactPhone: settingsMap["Numer telefonu"] || defaultSettings.contactPhone,
      website: settingsMap["Oficjalna strona internetowa"] || defaultSettings.website,
      googleReviewUrl: reviewUrl,
      senderName: settingsMap["Nazwa nadawcy wiadomości"] || defaultSettings.senderName,
      testEmail: APPROVED_TEST_RECIPIENT // Bezwarunkowo wymuszony adres testerski
    };
  } catch (err) {
    Logger.log("Błąd odczytu USTAWIENIA: " + err.toString());
    return defaultSettings;
  }
}

/**
 * Pobiera dane zaznaczonego zgłoszenia z zakładki ZGŁOSZENIA
 */
function getSelectedTicketData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  if (sheet.getName() !== "ZGŁOSZENIA") {
    ui.alert("Niewłaściwa zakładka", "Przejdź do zakładki 'ZGŁOSZENIA' i zaznacz wiersz ze zgłoszeniem mieszkańca.", ui.ButtonSet.OK);
    return null;
  }

  const row = sheet.getActiveRange().getRow();
  if (row <= 1) {
    ui.alert("Brak wyboru", "Zaznacz wiersz z konkretnym zgłoszeniem (poniżej nagłówka).", ui.ButtonSet.OK);
    return null;
  }

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const values = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

  const getV = (colName) => {
    // Elastyczne wyszukiwanie dopasowania nagłówka
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] === colName || headers[i].startsWith(colName)) {
        return (values[i] !== null && values[i] !== undefined) ? String(values[i]).trim() : "";
      }
    }
    return "";
  };

  const ticketId = getV("ID Zgłoszenia") || `Wiersz-${row}`;
  const residentEmail = getV("Adres e-mail");
  const residentPhone = getV("Numer telefonu");
  const residentName = getV("Imię i nazwisko") || "Mieszkańcu";
  const ticketType = getV("Rodzaj zgłoszenia");
  const wasteFraction = getV("Rodzaj odpadów");
  const city = getV("Miejscowość");
  const street = getV("Ulica lub lokalizacja");
  const houseNumber = getV("Numer posesji");
  const description = getV("Opis zgłoszenia");
  const resolutionMethod = getV("Sposób rozwiązania sprawy");
  const reviewSent = getV("Prośba o opinię wysłana").toUpperCase() === "TAK";
  const reviewSentDate = getV("Data wysłania prośby o opinię");
  const status = getV("Status");

  return {
    row,
    headers,
    ticketId,
    residentEmail,
    residentPhone,
    residentName,
    ticketType,
    wasteFraction,
    city,
    street,
    houseNumber,
    location: `${city}, ${street}`.trim(), // Bez numeru posesji w nagłówku ogólnym
    description,
    resolutionMethod,
    reviewSent,
    reviewSentDate,
    status
  };
}

/**
 * 1. Akcja: Analizuj zgłoszenie przez AI
 */
function actionAnalyzeWithAi() {
  if (typeof analyzeSelectedTicket === "function") {
    analyzeSelectedTicket();
  } else {
    SpreadsheetApp.getUi().alert("Informacja", "Moduł ai.gs jest dostępny. Uruchom analizę bezpośrednio.", SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 2. Akcja: Przygotuj potwierdzenie przyjęcia (Szablon A)
 * POPRAWKA AUDYTU: Usunięto niepotwierdzone deklaracje o załogach logistycznych w terenie.
 */
function actionPrepareConfirmation() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

  if (!ticket.residentEmail) {
    promptMissingEmail(ticket);
    return;
  }

  const settings = getSmartCareSettings();
  const subject = `Potwierdzenie przyjęcia zgłoszenia ${ticket.ticketId} – ELWOZ ECO SmartCare`;
  
  const body = 
`Dzień dobry, ${ticket.residentName},

Potwierdzamy zarejestrowanie zgłoszenia w systemie demonstracyjnym ELWOZ ECO SmartCare:
• Numer sprawy: ${ticket.ticketId}
• Rodzaj zgłoszenia: ${ticket.ticketType}
• Frakcja odpadów: ${ticket.wasteFraction}
• Wskazana ulica / rejon: ${ticket.location}

Zgłoszenie oczekuje na weryfikację przez dyspozytora Punktu Obsługi Klienta w Kartuzach.

W przypadku pytań prosimy o kontakt z biurem POK Kartuzy (tel. ${settings.contactPhone}, e-mail: ${settings.contactEmail}), powołując się na numer sprawy ${ticket.ticketId}.

Z poważaniem,
${settings.senderName}
${settings.facilityName}
ul. Mściwoja II 14, 83-300 Kartuzy
Tel. ${settings.contactPhone} | ${settings.website}`;

  openEmailDialog({
    ticketId: ticket.ticketId,
    actionType: "Potwierdzenie przyjęcia",
    recipient: ticket.residentEmail,
    subject: subject,
    body: body,
    includeReviewOption: false
  });
}

/**
 * 3. Akcja: Przygotuj informację o postępach (Szablon B)
 * POPRAWKA AUDYTU: Rzeczowa informacja bez fikcyjnych opisów tras śmieciarek.
 */
function actionPrepareProgressUpdate() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

  if (!ticket.residentEmail) {
    promptMissingEmail(ticket);
    return;
  }

  const settings = getSmartCareSettings();
  const subject = `Informacja o statusie sprawy ${ticket.ticketId} – ELWOZ ECO SmartCare`;

  const body = 
`Dzień dobry, ${ticket.residentName},

Informujemy o aktualnym statusie zgłoszenia ${ticket.ticketId} dotyczącego: ${ticket.ticketType} (${ticket.location}):

Sprawa została przekazana do dyspozytora rejonu Kartuzy w celu weryfikacji okoliczności zdarzenia. O kolejnych ustaleniach lub sposobie załatwienia sprawy powiadomimy w kolejnej wiadomości.

Z poważaniem,
${settings.senderName}
Tel. ${settings.contactPhone} | ${settings.website}`;

  openEmailDialog({
    ticketId: ticket.ticketId,
    actionType: "Informacja o postępach",
    recipient: ticket.residentEmail,
    subject: subject,
    body: body,
    includeReviewOption: false
  });
}

/**
 * 4. Akcja: Przygotuj informację o rozwiązaniu (Szablon C)
 * POPRAWKA AUDYTU: Wymaga uzupełnienia rzeczywistego sposobu załatwienia sprawy.
 */
function actionPrepareResolution() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

  if (!ticket.residentEmail) {
    promptMissingEmail(ticket);
    return;
  }

  // Wymóg uzupełnienia rzeczywistego działania podjętego przez przedsiębiorstwo
  if (!ticket.resolutionMethod) {
    SpreadsheetApp.getUi().alert(
      "Wymagane pole: Sposób rozwiązania sprawy",
      "Przed przygotowaniem informacji o rozwiązaniu zgłoszenia należy uzupełnić kolumnę 'Sposób rozwiązania sprawy' w arkuszu.\n\n" +
      "Wpisz faktyczne działania podjęte w sprawie (np. 'Zrealizowano odbiór zastępczy bioodpadów w dn. 25.11' lub 'Wymieniono uszkodzony pojemnik 240L na nowy').",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const settings = getSmartCareSettings();
  const subject = `Rozwiązanie zgłoszenia ${ticket.ticketId} – ELWOZ ECO SmartCare`;

  let body = 
`Dzień dobry, ${ticket.residentName},

Informujemy o zakończeniu obsługi zgłoszenia ${ticket.ticketId} (${ticket.ticketType}, ${ticket.location}).

Sposób załatwienia sprawy:
${ticket.resolutionMethod}

Dziękujemy za kontakt z Punktem Obsługi Klienta w Kartuzach.

Z poważaniem,
${settings.senderName}
Tel. ${settings.contactPhone} | ${settings.website}`;

  const hasVerifiedReviewLink = isVerifiedReviewUrl(settings.googleReviewUrl);

  openEmailDialog({
    ticketId: ticket.ticketId,
    actionType: "Informacja o rozwiązaniu",
    recipient: ticket.residentEmail,
    subject: subject,
    body: body,
    includeReviewOption: true,
    hasVerifiedReviewLink: hasVerifiedReviewLink,
    alreadyReviewed: ticket.reviewSent,
    alreadyReviewedDate: ticket.reviewSentDate
  });
}

/**
 * 5. Akcja: Przygotuj prośbę o opinię Google (Szablon D)
 * POPRAWKA v0.2.3: Blokada prośby z placeholderem. Wysyłka wymaga zweryfikowanego linku w USTAWIENIACH.
 */
function actionPrepareReviewRequest() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

  if (!ticket.residentEmail) {
    promptMissingEmail(ticket);
    return;
  }

  const settings = getSmartCareSettings();
  if (!isVerifiedReviewUrl(settings.googleReviewUrl)) {
    SpreadsheetApp.getUi().alert(
      "Brak zweryfikowanego linku do opinii Google",
      "Nie można przygotować prośby o opinię, ponieważ w zakładce 'USTAWIENIA' nie wprowadzono autentycznego linku do Profilu Firmy Google.\n\n" +
      "Zgodnie z zasadami systemu prośba o opinię nie może zawierać tekstu zastępczego (placeholdera). Uzupełnij pole 'Zweryfikowany link do opinii Google' w zakładce USTAWIENIA.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  if (ticket.reviewSent) {
    const confirmRetry = SpreadsheetApp.getUi().alert(
      "Prośba o opinię była już wysłana",
      `Prośba o opinię do zgłoszenia ${ticket.ticketId} została już zarejestrowana w dniu: ${ticket.reviewSentDate || 'wcześniej'}.\n\nCzy na pewno chcesz przygotować ponowną wiadomość?`,
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    if (confirmRetry !== SpreadsheetApp.getUi().Button.YES) {
      return;
    }
  }

  const subject = `Opinia o obsłudze zgłoszenia ${ticket.ticketId} – ELWOZ ECO`;
  const linkSection = `👉 Wystaw obiektywną recenzję w Profilu Firmy Google:\n${settings.googleReviewUrl}`;

  const body = 
`Dzień dobry, ${ticket.residentName},

Niedawno zakończyliśmy obsługę zgłoszenia ${ticket.ticketId} w rejonie Kartuz.

Będziemy wdzięczni za podzielenie się opinią na temat kontaktu z naszym Biurem Obsługi Klienta:

${linkSection}

Każda autentyczna opinia pozwala nam rzetelnie oceniać i usprawniać standardy obsługi mieszkańców.

Z poważaniem,
${settings.senderName}
${settings.companyName}`;

  openEmailDialog({
    ticketId: ticket.ticketId,
    actionType: "Prośba o opinię",
    recipient: ticket.residentEmail,
    subject: subject,
    body: body,
    includeReviewOption: false,
    hasVerifiedReviewLink: true
  });
}

/**
 * Pomocniczy komunikat przy braku adresu e-mail
 */
function promptMissingEmail(ticket) {
  const ui = SpreadsheetApp.getUi();
  let msg = `Zgłoszenie ${ticket.ticketId} nie posiada wpisanego adresu e-mail mieszkańca.\n\n`;
  if (ticket.residentPhone) {
    msg += `Podano numer telefonu: ${ticket.residentPhone}.\nCzy chcesz zarejestrować kontakt telefoniczny?`;
    const res = ui.alert("Brak adresu e-mail", msg, ui.ButtonSet.YES_NO);
    if (res === ui.Button.YES) {
      actionLogPhoneCall();
    }
  } else {
    msg += "Mieszkaniec nie podał numeru telefonu (zgłoszenie anonimowe). Bezpośrednia korespondencja nie jest możliwa.";
    ui.alert("Brak danych kontaktowych", msg, ui.ButtonSet.OK);
  }
}

/**
 * 6. Akcja: Odnotuj kontakt telefoniczny
 * POPRAWKA AUDYTU: Pełna sanityzacja escapeHtml w oknie modalnym.
 */
function actionLogPhoneCall() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

  const safeTicketId = escapeHtml(ticket.ticketId);
  const safeResidentName = escapeHtml(ticket.residentName);
  const safeResidentPhone = escapeHtml(ticket.residentPhone || "brak numeru");
  const safeUserEmail = escapeHtml(Session.getActiveUser().getEmail().split("@")[0]);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 14px; color: #1e293b; background: #f8fafc; margin: 0; }
    h3 { margin-top: 0; color: #143d59; font-size: 1.1rem; }
    .info { font-size: 0.85rem; color: #64748b; margin-bottom: 12px; }
    label { font-weight: 600; font-size: 0.85rem; display: block; margin-top: 10px; margin-bottom: 4px; }
    input, select, textarea { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-family: inherit; font-size: 0.9rem; }
    textarea { height: 80px; resize: vertical; }
    .btn-bar { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; }
    button { padding: 9px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 0.85rem; }
    .btn-save { background: #1b7a3e; color: #fff; }
    .btn-save:hover { background: #145a32; }
    .btn-cancel { background: #e2e8f0; color: #334155; }
  </style>
</head>
<body>
  <h3>Odnotuj rozmowę telefoniczną</h3>
  <div class="info">
    Zgłoszenie: <strong>${safeTicketId}</strong> | Rozmówca: <strong>${safeResidentName}</strong> (${safeResidentPhone})
  </div>
  
  <form id="callForm">
    <label for="callResult">Wynik rozmowy z mieszkańcem:</label>
    <select id="callResult" required>
      <option value="Mieszkaniec potwierdził rozwiązanie">Mieszkaniec potwierdził rozwiązanie</option>
      <option value="Wyjaśniono zasady / harmonogram">Wyjaśniono zasady / harmonogram</option>
      <option value="Wymaga dalszej weryfikacji w terenie">Wymaga dalszej weryfikacji w terenie</option>
      <option value="Oczekuje na ponowny kontakt">Oczekuje na ponowny kontakt</option>
      <option value="Brak kontaktu (nie odbiera / brak odp.)">Brak kontaktu (nie odbiera)</option>
    </select>

    <label for="callNotes">Notatka z przebiegu rozmowy:</label>
    <textarea id="callNotes" placeholder="Rzeczowe podsumowanie rozmowy..." required></textarea>

    <label for="agent">Pracownik odpowiedzialny:</label>
    <input type="text" id="agent" value="${safeUserEmail}" required>

    <div class="btn-bar">
      <button type="button" class="btn-cancel" onclick="google.script.host.close()">Anuluj</button>
      <button type="button" class="btn-save" onclick="saveCall()">Zapisz w historii</button>
    </div>
  </form>

  <script>
    function saveCall() {
      const result = document.getElementById('callResult').value;
      const notes = document.getElementById('callNotes').value.trim();
      const agent = document.getElementById('agent').value.trim();
      if (!notes) { alert('Wpisz krótką notatkę z rozmowy.'); return; }

      google.script.run
        .withSuccessHandler(() => { google.script.host.close(); })
        .withFailureHandler(err => { alert('Błąd zapisu: ' + err); })
        .processLogPhoneCall(${JSON.stringify(ticket.ticketId)}, ${JSON.stringify(ticket.residentPhone || "")}, result, notes, agent);
    }
  </script>
</body>
</html>`;

  const uiOutput = HtmlService.createHtmlOutput(html).setWidth(480).setHeight(380);
  SpreadsheetApp.getUi().showModalDialog(uiOutput, "SmartCare – Rejestracja kontaktu telefonicznego");
}

/**
 * Backend zapisu rozmowy telefonicznej (zapis z obiektem Date dla KPI)
 */
function processLogPhoneCall(ticketId, phone, result, notes, agent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const histSheet = ss.getSheetByName("HISTORIA KOMUNIKACJI");
  const ticketSheet = ss.getSheetByName("ZGŁOSZENIA");
  const now = new Date();
  const nowStr = Utilities.formatDate(now, "Europe/Warsaw", "yyyy-MM-dd HH:mm");

  if (histSheet) {
    histSheet.appendRow([
      ticketId,
      nowStr,
      "Kontakt telefoniczny",
      "telefon",
      phone,
      `Rozmowa telefoniczna: ${result}`,
      notes,
      agent,
      "odnotowano kontakt",
      ""
    ]);
  }

  if (ticketSheet) {
    const data = ticketSheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const idIdx = headers.indexOf("ID Zgłoszenia");
    const lastContactIdx = headers.indexOf("Data ostatniego kontaktu");
    const firstContactIdx = headers.indexOf("Data pierwszego kontaktu");
    const resultIdx = headers.indexOf("Wynik kontaktu z mieszkańcem");
    const noteIdx = headers.indexOf("Notatka pracownika");

    for (let r = 1; r < data.length; r++) {
      if (String(data[r][idIdx]).trim() === String(ticketId).trim()) {
        const rowNum = r + 1;
        // Zapis jako Date object z formatowaniem dla spójności KPI
        if (lastContactIdx !== -1) {
          ticketSheet.getRange(rowNum, lastContactIdx + 1).setValue(now).setNumberFormat("yyyy-MM-dd HH:mm");
        }
        if (firstContactIdx !== -1 && !data[r][firstContactIdx]) {
          ticketSheet.getRange(rowNum, firstContactIdx + 1).setValue(now).setNumberFormat("yyyy-MM-dd HH:mm");
        }
        if (resultIdx !== -1) ticketSheet.getRange(rowNum, resultIdx + 1).setValue(result);
        if (noteIdx !== -1) {
          const currentNote = data[r][noteIdx] || "";
          ticketSheet.getRange(rowNum, noteIdx + 1).setValue((currentNote ? currentNote + " | " : "") + `Tel (${nowStr}): ${notes}`);
        }
        break;
      }
    }
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(`Zapisano kontakt telefoniczny dla ${ticketId}.`, "SmartCare", 5);
}

/**
 * 7. Akcja: Wyświetl historię komunikacji dla zgłoszenia
 * POPRAWKA AUDYTU: Pełna sanityzacja escapeHtml w tabeli historii.
 */
function actionViewCommunicationHistory() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const histSheet = ss.getSheetByName("HISTORIA KOMUNIKACJI");
  if (!histSheet) {
    SpreadsheetApp.getUi().alert("Brak historii", "Zakładka 'HISTORIA KOMUNIKACJI' nie została znaleziona.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const data = histSheet.getDataRange().getValues();
  const historyList = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(ticket.ticketId).trim()) {
      historyList.push({
        date: escapeHtml(data[i][1]),
        action: escapeHtml(data[i][2]),
        channel: escapeHtml(data[i][3]),
        recipient: escapeHtml(data[i][4]),
        subject: escapeHtml(data[i][5]),
        content: escapeHtml(data[i][6]),
        agent: escapeHtml(data[i][7]),
        status: escapeHtml(data[i][8]),
        error: escapeHtml(data[i][9])
      });
    }
  }

  let htmlRows = "";
  if (historyList.length === 0) {
    htmlRows = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">Brak wpisów w historii dla zgłoszenia ${escapeHtml(ticket.ticketId)}.</td></tr>`;
  } else {
    for (let h of historyList) {
      const statusStyle = h.status === 'wysłano' ? 'color:#1b5e20; font-weight:600;' : (h.status.indexOf('błąd') !== -1 ? 'color:#b71c1c; font-weight:600;' : 'color:#0d47a1;');
      htmlRows += `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.85rem;">
          <td style="padding: 8px;">${h.date}</td>
          <td style="padding: 8px;"><strong>${h.action}</strong><br><span style="color:#64748b;">${h.channel}</span></td>
          <td style="padding: 8px;"><strong>${h.subject}</strong><br><div style="color:#475569; font-size:0.8rem; max-height:60px; overflow-y:auto;">${h.content.replace(/\n/g, '<br>')}</div></td>
          <td style="padding: 8px; ${statusStyle}">${h.status}${h.error ? '<br><small style="color:#b71c1c;">'+h.error+'</small>' : ''}</td>
          <td style="padding: 8px; color:#64748b;">${h.agent}</td>
        </tr>`;
    }
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 14px; color: #1e293b; background: #ffffff; margin: 0; }
    h3 { margin-top: 0; color: #143d59; font-size: 1.15rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 0.8rem; color: #475569; border-bottom: 2px solid #cbd5e1; }
    .btn-close { margin-top: 16px; padding: 8px 16px; background: #143d59; color: #fff; border: none; border-radius: 6px; cursor: pointer; float: right; }
  </style>
</head>
<body>
  <h3>Historia korespondencji – Zgłoszenie ${escapeHtml(ticket.ticketId)}</h3>
  <div style="font-size:0.85rem; color:#64748b;">Mieszkaniec: <strong>${escapeHtml(ticket.residentName)}</strong> | Status w CRM: <strong>${escapeHtml(ticket.status)}</strong></div>
  
  <table>
    <thead>
      <tr>
        <th style="width: 110px;">Data</th>
        <th style="width: 140px;">Akcja / Kanał</th>
        <th>Temat i treść</th>
        <th style="width: 90px;">Status</th>
        <th style="width: 80px;">Pracownik</th>
      </tr>
    </thead>
    <tbody>
      ${htmlRows}
    </tbody>
  </table>

  <button class="btn-close" onclick="google.script.host.close()">Zamknij</button>
</body>
</html>`;

  const uiOutput = HtmlService.createHtmlOutput(html).setWidth(800).setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(uiOutput, `SmartCare – Historia zgłoszenia ${ticket.ticketId}`);
}

/**
 * Uniwersalne okno dialogowe podglądu, edycji i wysyłki wiadomości e-mail
 * POPRAWKA AUDYTU:
 * 1. Zabezpieczenie escapeHtml we wszystkich elementach widoku.
 * 2. Bezwarunkowe oznaczenie odbiorcy jako wsb.student.tester@gmail.com.
 * 3. Bezpieczne przekazanie JSON w wywołaniu script.run.
 */
function openEmailDialog(params) {
  const safeTicketId = escapeHtml(params.ticketId);
  const safeActionType = escapeHtml(params.actionType);
  const safeRecipient = escapeHtml(params.recipient);
  const safeTargetEmail = escapeHtml(APPROVED_TEST_RECIPIENT);
  const safeSubject = escapeHtml("[TEST] " + params.subject.replace(/^\[TEST\]\s*/i, ""));
  const safeBody = escapeHtml(params.body);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; color: #1e293b; background: #f8fafc; margin: 0; }
    h3 { margin-top: 0; color: #143d59; font-size: 1.15rem; display: flex; align-items: center; justify-content: space-between; }
    .badge { font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; font-weight: 700; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .demo-alert { background: #fffbeb; border: 1px solid #fde68a; padding: 10px 12px; border-radius: 6px; font-size: 0.8rem; color: #92400e; margin-bottom: 14px; line-height: 1.4; }
    .form-group { margin-bottom: 12px; }
    label { font-weight: 600; font-size: 0.825rem; display: block; margin-bottom: 4px; color: #334155; }
    input[type="text"], textarea { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-family: inherit; font-size: 0.9rem; }
    input[type="text"]:focus, textarea:focus { border-color: #1b7a3e; outline: none; }
    textarea { height: 180px; resize: vertical; line-height: 1.45; }
    .review-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 0.825rem; }
    .btn-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
    button { padding: 9px 18px; border-radius: 6px; font-weight: 700; cursor: pointer; border: none; font-size: 0.85rem; }
    .btn-send { background: #1b7a3e; color: #ffffff; }
    .btn-send:hover { background: #145a32; }
    .btn-cancel { background: #e2e8f0; color: #334155; }
    .btn-ai { background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe; font-size: 0.8rem; }
    .btn-ai:hover { background: #e9d5ff; }
  </style>
</head>
<body>
  <h3>
    <span>Podgląd i wysyłka: ${safeActionType}</span>
    <span class="badge">SERWEROWA BLOKADA TESTOWA</span>
  </h3>

  <div class="demo-alert">
    <strong>Bezwarunkowa blokada serwera (wsb.student.tester@gmail.com):</strong><br>
    Wiadomość testowa zostanie wysłana WYŁĄCZNIE na zatwierdzony adres testowy: <strong>${safeTargetEmail}</strong>.<br>
    W temacie dodano <code>[TEST]</code>. Adres fikcyjnego mieszkańca (<em>${safeRecipient}</em>) nie otrzyma wiadomości.
  </div>

  <form id="emailForm">
    <div class="form-group">
      <label>Adresat (Jedyny autoryzowany cel testowy):</label>
      <input type="text" value="${safeTargetEmail} (Zatwierdzone konto testerskie)" readonly style="background: #f1f5f9; font-weight: 600; color: #1e40af;">
    </div>

    <div class="form-group">
      <label for="emailSubject">Temat wiadomości:</label>
      <input type="text" id="emailSubject" value="${safeSubject}" required>
    </div>

    <div class="form-group">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <label for="emailBody" style="margin-bottom:0;">Treść wiadomości (edytowalna):</label>
        <button type="button" class="btn-ai" onclick="personalizeWithAi()">✨ Usprawnij styl z AI (Gemini Flash)</button>
      </div>
      <textarea id="emailBody" required>${safeBody}</textarea>
    </div>

    ${params.includeReviewOption ? (params.hasVerifiedReviewLink ? `
    <div class="review-box">
      <label style="cursor: pointer; display: flex; align-items: flex-start; gap: 8px; margin: 0;">
        <input type="checkbox" id="addGoogleReview" ${params.alreadyReviewed ? '' : 'checked'} style="margin-top: 2px;">
        <span>
          <strong>Dołącz zaproszenie do wystawienia neutralnej opinii Google</strong><br>
          ${params.alreadyReviewed ? '<span style="color:#b45309;">⚠️ Prośba o opinię była już wysłana w dn. ' + escapeHtml(params.alreadyReviewedDate || 'wcześniej') + '. Ponowne zaznaczenie wymaga świadomej decyzji pracownika.</span>' : 'Zgodnie z zasadami etycznymi: brak nagród, brak filtrowania ocen, pełna neutralność.'}
        </span>
      </label>
    </div>` : `
    <div class="review-box" style="background: #f1f5f9; border-color: #cbd5e1;">
      <span style="font-size:0.8rem; color:#64748b;">
        ℹ️ <strong>Zaproszenie do opinii Google nieaktywne:</strong> W zakładce <code>USTAWIENIA</code> nie wprowadzono zweryfikowanego adresu Profilu Google. Prośba o opinię nie może zawierać tekstu zastępczego (placeholdera).
      </span>
    </div>`) : ''}

    <div class="btn-bar">
      <button type="button" class="btn-cancel" onclick="google.script.host.close()">Anuluj</button>
      <button type="button" class="btn-send" id="btnSubmit" onclick="sendNow()">Zatwierdź i wyślij</button>
    </div>
  </form>

  <script>
    function sendNow() {
      const subject = document.getElementById('emailSubject').value.trim();
      let body = document.getElementById('emailBody').value.trim();
      const addReviewCheck = document.getElementById('addGoogleReview');
      const addReview = addReviewCheck ? addReviewCheck.checked : false;

      if (!subject || !body) {
        alert('Temat i treść wiadomości nie mogą być puste.');
        return;
      }

      document.getElementById('btnSubmit').disabled = true;
      document.getElementById('btnSubmit').innerText = 'Wysyłanie...';

      google.script.run
        .withSuccessHandler((res) => {
          if (res && res.success) {
            google.script.host.close();
          } else {
            const errMsg = (res && res.error) ? res.error : 'Nieznany błąd podczas wysyłki wiadomości.';
            alert('Błąd operacji:\n\n' + errMsg + '\n\nOkno wiadomości pozostaje otwarte. Popraw treść lub spróbuj ponownie.');
            document.getElementById('btnSubmit').disabled = false;
            document.getElementById('btnSubmit').innerText = 'Zatwierdź i wyślij';
          }
        })
        .withFailureHandler((err) => {
          alert('Błąd serwera (Apps Script): ' + err);
          document.getElementById('btnSubmit').disabled = false;
          document.getElementById('btnSubmit').innerText = 'Zatwierdź i wyślij';
        })
        .processSendEmail({
          ticketId: ${JSON.stringify(params.ticketId)},
          actionType: ${JSON.stringify(params.actionType)},
          originalRecipient: ${JSON.stringify(params.recipient)},
          subject: subject,
          body: body,
          addedReviewRequest: addReview
        });
    }

    function personalizeWithAi() {
      const bodyEl = document.getElementById('emailBody');
      const currentText = bodyEl.value;
      bodyEl.disabled = true;

      google.script.run
        .withSuccessHandler((polished) => {
          bodyEl.disabled = false;
          if (polished) bodyEl.value = polished;
        })
        .withFailureHandler((err) => {
          bodyEl.disabled = false;
          alert('AI niedostępne (skorzystaj ze standardowego szablonu): ' + err);
        })
        .polishMessageWithAi(${JSON.stringify(params.ticketId)}, currentText);
    }
  </script>
</body>
</html>`;

  const uiOutput = HtmlService.createHtmlOutput(html).setWidth(640).setHeight(540);
  SpreadsheetApp.getUi().showModalDialog(uiOutput, `SmartCare – Przygotowanie wiadomości e-mail`);
}

/**
 * Backend wysyłki poczty z BEZWARUNKOWĄ blokadą serwerową, LockService oraz zabezpieczeniem przed duplikatami
 * POPRAWKI AUDYTU v0.2.3:
 * 1. Zabezpieczenie równoczesnej wysyłki za pomocą LockService.
 * 2. Bezwarunkowa blokada adresu wysyłki: TYLKO wsb.student.tester@gmail.com.
 * 3. Zabezpieczenie przed duplikatem (kontrola ostatnich 5 minut).
 * 4. Blokada placeholdera opinii Google: brak oznaczania rekordu w CRM i wysyłki bez zweryfikowanego linku.
 * 5. Zwracanie jednoznacznego wyniku { success, error } zapobiegające zamykaniu okna przy błędzie.
 * 6. Zapis obiektów Date z formatowaniem komórek dla prawidłowego działania KPI w godzinach.
 */
function processSendEmail(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return {
      success: false,
      error: "Serwer jest obecnie zajęty inną operacją wysyłki. Spróbuj ponownie za chwilę."
    };
  }

  try {
    const settings = getSmartCareSettings();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const histSheet = ss.getSheetByName("HISTORIA KOMUNIKACJI");
    const ticketSheet = ss.getSheetByName("ZGŁOSZENIA");
    const now = new Date();
    const nowStr = Utilities.formatDate(now, "Europe/Warsaw", "yyyy-MM-dd HH:mm");
    const agent = Session.getActiveUser().getEmail().split('@')[0] || "Pracownik";

    // 1. BEZWARUNKOWA BLOKADA SERWEROWA ODBIORCY:
    // W prototypie studenckim cała korespondencja trafia WYŁĄCZNIE na wsb.student.tester@gmail.com
    const targetEmail = APPROVED_TEST_RECIPIENT;

    if (!targetEmail || targetEmail.toLowerCase().trim() !== APPROVED_TEST_RECIPIENT.toLowerCase().trim()) {
      const criticalErr = `BEZWARUNKOWA BLOKADA SERWERA: Próba wysyłki na inny adres niż ${APPROVED_TEST_RECIPIENT} została zablokowana!`;
      Logger.log(criticalErr);
      return {
        success: false,
        error: criticalErr
      };
    }

    // 2. WERYFIKACJA LINKU DO OPINII GOOGLE:
    const hasVerifiedReviewLink = isVerifiedReviewUrl(settings.googleReviewUrl);
    if (payload.actionType === "Prośba o opinię" && !hasVerifiedReviewLink) {
      return {
        success: false,
        error: "Brak zweryfikowanego linku do Profilu Google w USTAWIENIACH. Prośba o opinię nie może zostać wysłana z tekstem zastępczym (placeholderem) ani oznaczona w CRM."
      };
    }

    // 3. KONTROLA DUPLIKATÓW W CIĄGU OSTATNICH 5 MINUT:
    if (histSheet && histSheet.getLastRow() > 2) {
      const recentHistory = histSheet.getRange(3, 1, histSheet.getLastRow() - 2, 9).getValues();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      for (let row of recentHistory) {
        const histTicketId = String(row[0]).trim();
        const histAction = String(row[2]).trim();
        const histDate = new Date(row[1]);
        const histStatus = String(row[8]).trim();

        if (histTicketId === String(payload.ticketId).trim() && 
            histAction === String(payload.actionType).trim() && 
            histStatus === "wysłano" && 
            !isNaN(histDate.getTime()) && 
            histDate > fiveMinutesAgo) {
          
          return {
            success: false,
            error: `Wiadomość typu '${payload.actionType}' dla zgłoszenia ${payload.ticketId} została już wysłana w ciągu ostatnich 5 minut (${row[1]}). Operacja została zablokowana, aby zapobiec duplikatom.`
          };
        }
      }
    }

    // 4. Wymuszenie prefiksu [TEST] w temacie
    let finalSubject = payload.subject;
    if (!finalSubject.startsWith("[TEST]")) {
      finalSubject = `[TEST] ${finalSubject}`;
    }

    // 5. Dołączenie opinii jeśli wybrano w formularzu i link jest zweryfikowany
    let finalBody = payload.body;
    if (payload.addedReviewRequest) {
      if (hasVerifiedReviewLink) {
        finalBody += `\n\n---\n👉 Będziemy wdzięczni za podzielenie się obiektywną opinią w Profilu Firmy Google:\n${settings.googleReviewUrl}`;
      } else {
        // Blokada wstrzykiwania tekstu zastępczego (placeholdera)
        payload.addedReviewRequest = false;
      }
    }

    // 6. Wymuszenie stopki akademickiej WSB Merito
    finalBody += `\n\n------------------------------------------------------------\n` +
      `[WIADOMOŚĆ TESTOWA – PROTOTYP WSB MERITO]\n` +
      `Wiadomość wygenerowana w ramach studenckiego projektu wdrożeniowego ELWOZ ECO SmartCare.\n` +
      `Fikcyjny adresat zgłoszenia: ${payload.originalRecipient}\n` +
      `Jedyny zatwierdzony serwerowo odbiorca testowy: ${APPROVED_TEST_RECIPIENT}`;

    let sendStatus = "przygotowano";
    let errorMessage = "";

    // 7. Rzeczywista wysyłka przez MailApp z obsługą błędów
    try {
      const quota = MailApp.getRemainingDailyQuota();
      if (quota <= 0) {
        throw new Error("Wyczerpano dzienny limit wysyłki Google MailApp.");
      }

      MailApp.sendEmail({
        to: targetEmail,
        subject: finalSubject,
        body: finalBody,
        name: settings.senderName
      });

      sendStatus = "wysłano";
    } catch (err) {
      sendStatus = "błąd wysyłki";
      errorMessage = err.toString();
      Logger.log(`Błąd wysyłki dla ${payload.ticketId}: ${errorMessage}`);
    }

    // 8. Zapis w HISTORIA KOMUNIKACJI (zawsze rejestrujemy próbę)
    if (histSheet) {
      histSheet.appendRow([
        payload.ticketId,
        nowStr,
        payload.actionType,
        "e-mail",
        targetEmail,
        finalSubject,
        finalBody,
        agent,
        sendStatus,
        errorMessage
      ]);
    }

    // 9. Aktualizacja ZGŁOSZENIA WYŁĄCZNIE wtedy, gdy wysyłka powiodła się
    if (sendStatus === "wysłano" && ticketSheet) {
      const data = ticketSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const idIdx = headers.indexOf("ID Zgłoszenia");
      const confirmDateIdx = headers.indexOf("Data potwierdzenia przyjęcia");
      const firstContactIdx = headers.indexOf("Data pierwszego kontaktu");
      const lastContactIdx = headers.indexOf("Data ostatniego kontaktu");
      const resolveDateIdx = headers.indexOf("Data rozwiązania");
      const opinionIdx = headers.indexOf("Prośba o opinię wysłana");
      const opinionDateIdx = headers.indexOf("Data wysłania prośby o opinię");
      const statusIdx = headers.indexOf("Status");

      for (let r = 1; r < data.length; r++) {
        if (String(data[r][idIdx]).trim() === String(payload.ticketId).trim()) {
          const rowNum = r + 1;

          if (payload.actionType === "Potwierdzenie przyjęcia") {
            if (confirmDateIdx !== -1 && !data[r][confirmDateIdx]) {
              ticketSheet.getRange(rowNum, confirmDateIdx + 1).setValue(now).setNumberFormat("yyyy-MM-dd HH:mm");
            }
            if (firstContactIdx !== -1 && !data[r][firstContactIdx]) {
              ticketSheet.getRange(rowNum, firstContactIdx + 1).setValue(now).setNumberFormat("yyyy-MM-dd HH:mm");
            }
            if (statusIdx !== -1 && data[r][statusIdx] === "Nowe") {
              ticketSheet.getRange(rowNum, statusIdx + 1).setValue("Do weryfikacji");
            }
          }

          if (payload.actionType === "Informacja o postępach") {
            if (lastContactIdx !== -1) {
              ticketSheet.getRange(rowNum, lastContactIdx + 1).setValue(now).setNumberFormat("yyyy-MM-dd HH:mm");
            }
            if (statusIdx !== -1 && data[r][statusIdx] === "Do weryfikacji") {
              ticketSheet.getRange(rowNum, statusIdx + 1).setValue("W realizacji");
            }
          }

          if (payload.actionType === "Informacja o rozwiązaniu") {
            if (lastContactIdx !== -1) {
              ticketSheet.getRange(rowNum, lastContactIdx + 1).setValue(now).setNumberFormat("yyyy-MM-dd HH:mm");
            }
            if (resolveDateIdx !== -1 && !data[r][resolveDateIdx]) {
              ticketSheet.getRange(rowNum, resolveDateIdx + 1).setValue(now).setNumberFormat("yyyy-MM-dd HH:mm");
            }
            if (statusIdx !== -1) {
              ticketSheet.getRange(rowNum, statusIdx + 1).setValue("Rozwiązane");
            }
          }

          // POPRAWKA v0.2.3: Oznaczanie prośby o opinię wyłącznie wtedy, gdy link jest zweryfikowany
          if ((payload.actionType === "Prośba o opinię" || payload.addedReviewRequest) && hasVerifiedReviewLink) {
            if (opinionIdx !== -1) {
              ticketSheet.getRange(rowNum, opinionIdx + 1).setValue("TAK");
            }
            if (opinionDateIdx !== -1) {
              ticketSheet.getRange(rowNum, opinionDateIdx + 1).setValue(now).setNumberFormat("yyyy-MM-dd HH:mm");
            }
          }

          break;
        }
      }
    }

    if (sendStatus === "wysłano") {
      SpreadsheetApp.getActiveSpreadsheet().toast(`Wysłano: ${payload.actionType} na ${targetEmail}`, "SmartCare Sukces", 5);
      return {
        success: true,
        status: "wysłano",
        targetEmail: targetEmail
      };
    } else {
      return {
        success: false,
        error: errorMessage || "Wystąpił błąd podczas wysyłki wiadomości e-mail."
      };
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Personalizacja wiadomości z użyciem zweryfikowanego modelu Gemini Flash
 * POPRAWKA v0.2.3:
 * 1. Zastąpiono wycofany model gemini-2.0-flash dynamiczną weryfikacją bezpłatnych modeli Flash.
 * 2. Ścisły zakaz wymyślania załóg, tras i ustaleń.
 */
function polishMessageWithAi(ticketId, templateText) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiKey = scriptProperties.getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Brak klucza Gemini API w Script Properties. Użyj gotowego szablonu.");
  }

  // Dynamiczne ustalenie modelu z bezpłatnej puli Flash
  const targetModel = (typeof getVerifiedGeminiModel === "function")
    ? getVerifiedGeminiModel(apiKey)
    : ((typeof SMARTCARE_AI_CONFIG !== "undefined" && SMARTCARE_AI_CONFIG.defaultModel) ? SMARTCARE_AI_CONFIG.defaultModel : "gemini-3.6-flash");

  // Twarda anonimizacja treści wejściowej
  const cleanTemplate = anonymizeText(templateText);

  const systemPrompt = 
    "Jesteś asystentem redakcyjnym w firmie komunalnej ELWOZ ECO w Kartuzach.\n" +
    "Twoim celem jest wygładzenie stylu poniższej wiadomości, aby była profesjonalna, empatyczna i naturalna.\n" +
    "BEZWZGLĘDNE ZASADY PRAWDY I BEZPIECZEŃSTWA:\n" +
    "1. NIE wymyślaj żadnych działań logistycznych, tras śmieciarek ani załóg, których nie ma w podanym tekście.\n" +
    "2. NIE deklaruj uznania winy ani reklamacji przedsiębiorstwa.\n" +
    "3. NIE obiecuj terminów, których nie ma w szablonie.\n" +
    "4. NIE obiecuj zniżek ani odszkodowań.\n" +
    "5. Zachowaj numer zgłoszenia oraz dane kontaktowe bez zmian.\n" +
    "6. Zwróć wyłącznie samą treść wygładzonej wiadomości bez komentarzy wstępnych i końcowych.";

  const payload = {
    contents: [
      {
        parts: [
          { text: systemPrompt + "\n\nOto treść szablonu do stylistycznego dopracowania:\n" + cleanTemplate }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 800
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${apiKey}`, options);
  if (response.getResponseCode() !== 200) {
    throw new Error(`API Gemini (${targetModel}) zwróciło kod ${response.getResponseCode()}`);
  }

  const json = JSON.parse(response.getContentText());
  if (!json.candidates || !json.candidates[0].content) {
    throw new Error("Nieprawidłowa odpowiedź z modelu Gemini.");
  }

  return json.candidates[0].content.parts[0].text.trim();
}

/**
 * Twarda funkcja anonimizacji tekstu przed przekazaniem do AI
 */
function anonymizeText(text) {
  if (!text) return "";
  return String(text)
    // 1. Usunięcie adresów e-mail
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[E-MAIL USUNIĘTO]")
    // 2. Usunięcie numerów PESEL (11 cyfr)
    .replace(/\b\d{11}\b/g, "[IDENTYFIKATOR USUNIĘTO]")
    // 3. Usunięcie numerów telefonów (z prefiksem +48 lub 9 cyfr ze spacjami/myślnikami)
    .replace(/(?:\+?48[\s-]?)?(?:\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b|\b\d{9}\b)/g, "[NUMER TELEFONU USUNIĘTO]");
}

/**
 * Konfigurator klucza API dostępny z menu SmartCare
 */
function configureGeminiApiKeyFromComm() {
  if (typeof configureGeminiApiKey === "function") {
    configureGeminiApiKey();
  } else {
    const ui = SpreadsheetApp.getUi();
    const scriptProps = PropertiesService.getScriptProperties();
    const current = scriptProps.getProperty("GEMINI_API_KEY");
    const resp = ui.prompt("Klucz Gemini API", "Wklej klucz z aistudio.google.com:", ui.ButtonSet.OK_CANCEL);
    if (resp.getSelectedButton() === ui.Button.OK) {
      const val = resp.getResponseText().trim();
      if (val) {
        scriptProps.setProperty("GEMINI_API_KEY", val);
        ui.alert("Sukces", "Klucz Gemini zapisany w Script Properties.", ui.ButtonSet.OK);
      }
    }
  }
}
