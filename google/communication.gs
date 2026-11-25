/**
 * ============================================================================
 * ELWOZ ECO SmartCare - Moduł Komunikacji i Zarządzania Reputacją (communication.gs)
 * Wersja: 0.2.1
 * Projekt edukacyjny: Uniwersytet WSB Merito w Gdańsku
 * Dedykowane konto testowe: wsb.student.tester@gmail.com
 * ============================================================================
 * 
 * Moduł realizuje:
 * 1. Niestandardowe menu arkusza „SmartCare”.
 * 2. Przygotowywanie 4 edytowalnych szablonów wiadomości (Potwierdzenie, Postępy, Rozwiązanie, Opinia Google).
 * 3. Obsługę okien dialogowych podglądu i edycji wiadomości (HtmlService).
 * 4. Opcjonalną personalizację szablonu z użyciem Gemini AI (z poszanowaniem zakazu wymyślania faktów).
 * 5. TWARDE ZABEZPIECZENIE SERWEROWE: W trybie demonstracyjnym wysyłka jest możliwa
 *    WYŁĄCZNIE na zatwierdzony adres wsb.student.tester@gmail.com z prefiksem [TEST].
 * 6. Zapis pełnego audytu operacji w zakładce HISTORIA KOMUNIKACJI.
 * 7. Rejestrację rozmów telefonicznych i aktualizację dat kontaktu oraz statusów opinii w rejestrze ZGŁOSZENIA.
 */

// Jedyny zatwierdzony serwerowo adres testowy
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
    .addItem("⚙️ Ustawienia / Klucz Gemini API", "configureGeminiApiKeyFromComm")
    .addToUi();
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
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=PLACEHOLDER_KARTUZY",
    senderName: "ELWOZ ECO SmartCare – POK Kartuzy",
    isDemoMode: true,
    testEmail: APPROVED_TEST_RECIPIENT
  };

  if (!settingsSheet) return defaultSettings;

  try {
    const data = settingsSheet.getRange("A3:B11").getValues();
    const settingsMap = {};
    for (let row of data) {
      if (row[0]) settingsMap[row[0].toString().trim()] = (row[1] || "").toString().trim();
    }

    return {
      companyName: settingsMap["Nazwa przedsiębiorstwa"] || defaultSettings.companyName,
      facilityName: settingsMap["Nazwa placówki"] || defaultSettings.facilityName,
      contactEmail: settingsMap["Adres e-mail do kontaktu"] || defaultSettings.contactEmail,
      contactPhone: settingsMap["Numer telefonu"] || defaultSettings.contactPhone,
      website: settingsMap["Oficjalna strona internetowa"] || defaultSettings.website,
      googleReviewUrl: settingsMap["Zweryfikowany link do opinii Google"] || defaultSettings.googleReviewUrl,
      senderName: settingsMap["Nazwa nadawcy wiadomości"] || defaultSettings.senderName,
      isDemoMode: (settingsMap["Ustawienie trybu demonstracyjnego"] || "TAK").toUpperCase() === "TAK",
      testEmail: APPROVED_TEST_RECIPIENT // Zawsze wymuszany zatwierdzony adres testerski
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
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const values = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

  const getV = (name) => {
    const idx = headers.indexOf(name);
    return idx !== -1 ? (values[idx] || "").toString().trim() : "";
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
    location: `${city}, ${street} ${houseNumber}`.trim(),
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
    SpreadsheetApp.getUi().alert("Informacja", "Moduł ai.gs jest dostępny. Uruchom analizę lub skorzystaj z promptu w INSTRUKCJA AI.", SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 2. Akcja: Przygotuj potwierdzenie przyjęcia (Szablon A)
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

Dziękujemy za kontakt z Cyfrowym Punktem Obsługi Mieszkańca ELWOZ ECO SmartCare.

Potwierdzamy zarejestrowanie zgłoszenia:
• Numer sprawy: ${ticket.ticketId}
• Rodzaj zgłoszenia: ${ticket.ticketType}
• Frakcja odpadów: ${ticket.wasteFraction}
• Lokalizacja: ${ticket.location}

Zgłoszenie zostało przekazane do dyspozytorni Punktu Obsługi Klienta w Kartuzach. Sprawa jest obecnie weryfikowana przez nasz zespół logistyczny.

W przypadku pytań prosimy o kontakt z biurem POK Kartuzy (tel. ${settings.contactPhone}, e-mail: ${settings.contactEmail}), podając numer sprawy ${ticket.ticketId}.

Z poważaniem,
Zespół Obsługi Mieszkańców ELWOZ ECO Sp. z o.o.
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
 */
function actionPrepareProgressUpdate() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

  if (!ticket.residentEmail) {
    promptMissingEmail(ticket);
    return;
  }

  const settings = getSmartCareSettings();
  const subject = `Informacja o postępach w sprawie ${ticket.ticketId} – ELWOZ ECO SmartCare`;

  const body = 
`Dzień dobry, ${ticket.residentName},

Przekazujemy bieżącą informację dotyczącą zgłoszenia ${ticket.ticketId} (${ticket.location}):

Nasz zespół operacyjny prowadzi obecnie bezpośrednią weryfikację sprawy w rejonie Kartuz wraz z brygadą wywozową i dyspozytorem. Dokładamy starań, aby sytuacja została wyjaśniona w możliwie najkrótszym czasie.

Powiadomimy Cię niezwłocznie o zakończeniu działań i sposobie rozwiązania problemu.

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
 */
function actionPrepareResolution() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

  if (!ticket.residentEmail) {
    promptMissingEmail(ticket);
    return;
  }

  // Walidacja: sprawdzenie czy pracownik wpisał rzeczywisty sposób rozwiązania sprawy
  if (!ticket.resolutionMethod) {
    SpreadsheetApp.getUi().alert(
      "Wymagane pole: Sposób rozwiązania sprawy",
      "Przed przygotowaniem informacji o rozwiązaniu zgłoszenia należy uzupełnić kolumnę 'Sposób rozwiązania sprawy' w arkuszu.\n\n" +
      "Wpisz rzeczywiste działania podjęte przez przedsiębiorstwo (np. 'Zastępczy odbiór bioodpadów wykonany w dn. 25.11' lub 'Wymieniono uszkodzony pojemnik 240L na nowy').",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const settings = getSmartCareSettings();
  const subject = `Rozwiązanie zgłoszenia ${ticket.ticketId} – ELWOZ ECO SmartCare`;

  let body = 
`Dzień dobry, ${ticket.residentName},

Informujemy, że zgłoszenie ${ticket.ticketId} dotyczące: ${ticket.ticketType} (${ticket.location}) zostało zrealizowane.

Wykonane działania:
${ticket.resolutionMethod}

Dziękujemy za zgłoszenie sytuacji, co pozwala nam na bieżąco dbać o czystość i sprawny odbiór odpadów w gminie Kartuzy.

Z poważaniem,
${settings.senderName}
Tel. ${settings.contactPhone} | ${settings.website}`;

  openEmailDialog({
    ticketId: ticket.ticketId,
    actionType: "Informacja o rozwiązaniu",
    recipient: ticket.residentEmail,
    subject: subject,
    body: body,
    includeReviewOption: true,
    alreadyReviewed: ticket.reviewSent,
    alreadyReviewedDate: ticket.reviewSentDate
  });
}

/**
 * 5. Akcja: Przygotuj prośbę o opinię Google (Szablon D)
 */
function actionPrepareReviewRequest() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

  if (!ticket.residentEmail) {
    promptMissingEmail(ticket);
    return;
  }

  // Zabezpieczenie przed ponowną prośbą o opinię
  if (ticket.reviewSent) {
    const confirmRetry = SpreadsheetApp.getUi().alert(
      "Prośba o opinię była już wysłana",
      `Prośba o opinię do zgłoszenia ${ticket.ticketId} została już zarejestrowana jako wysłana w dniu: ${ticket.reviewSentDate || 'wcześniej'}.\n\nCzy na pewno chcesz wysłać ją ponownie?`,
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    if (confirmRetry !== SpreadsheetApp.getUi().Button.YES) {
      return;
    }
  }

  const settings = getSmartCareSettings();
  const subject = `Twoja opinia o obsłudze zgłoszenia ${ticket.ticketId} – ELWOZ ECO`;

  const body = 
`Dzień dobry, ${ticket.residentName},

Niedawno zakończyliśmy obsługę Twojego zgłoszenia (${ticket.ticketId}) dotyczącego odbioru odpadów w rejonie Kartuz.

Nieustannie pracujemy nad podnoszeniem standardów obsługi mieszkańców. Będziemy wdzięczni za poświęcenie minuty i podzielenie się obiektywną opinią na temat Twoich doświadczeń z ELWOZ ECO w Profilu Firmy Google:

👉 Wystaw opinię w Google:
${settings.googleReviewUrl}

Każda autentyczna recenzja pomaga nam lepiej dopasować usługi do potrzeb mieszkańców naszej gminy.

Z poważaniem,
${settings.senderName}
${settings.companyName}`;

  openEmailDialog({
    ticketId: ticket.ticketId,
    actionType: "Prośba o opinię",
    recipient: ticket.residentEmail,
    subject: subject,
    body: body,
    includeReviewOption: false
  });
}

/**
 * Pomocniczy komunikat przy braku adresu e-mail
 */
function promptMissingEmail(ticket) {
  const ui = SpreadsheetApp.getUi();
  let msg = `Zgłoszenie ${ticket.ticketId} nie zawiera adresu e-mail mieszkańca.\n\n`;
  if (ticket.residentPhone) {
    msg += `Dostępny jest numer telefonu: ${ticket.residentPhone}.\nCzy chcesz teraz odnotować kontakt telefoniczny?`;
    const res = ui.alert("Brak adresu e-mail", msg, ui.ButtonSet.YES_NO);
    if (res === ui.Button.YES) {
      actionLogPhoneCall();
    }
  } else {
    msg += "Mieszkaniec nie podał również numeru telefonu (zgłoszenie anonimowe). Korespondencja bezpośrednia nie jest możliwa.";
    ui.alert("Brak danych kontaktowych", msg, ui.ButtonSet.OK);
  }
}

/**
 * 6. Akcja: Odnotuj kontakt telefoniczny
 */
function actionLogPhoneCall() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

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
    Zgłoszenie: <strong>${ticket.ticketId}</strong> | Rozmówca: <strong>${ticket.residentName}</strong> (${ticket.residentPhone || 'brak nr'})
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
    <textarea id="callNotes" placeholder="Krótkie podsumowanie ustaleń..." required></textarea>

    <label for="agent">Pracownik odpowiedzialny:</label>
    <input type="text" id="agent" value="${Session.getActiveUser().getEmail().split('@')[0]}" required>

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
        .processLogPhoneCall('${ticket.ticketId}', '${ticket.residentPhone || ''}', result, notes, agent);
    }
  </script>
</body>
</html>`;

  const uiOutput = HtmlService.createHtmlOutput(html).setWidth(480).setHeight(380);
  SpreadsheetApp.getUi().showModalDialog(uiOutput, "SmartCare – Rejestracja kontaktu telefonicznego");
}

/**
 * Backend zapisu rozmowy telefonicznej
 */
function processLogPhoneCall(ticketId, phone, result, notes, agent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const histSheet = ss.getSheetByName("HISTORIA KOMUNIKACJI");
  const ticketSheet = ss.getSheetByName("ZGŁOSZENIA");
  const now = Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd HH:mm");

  // 1. Zapis w historii komunikacji
  if (histSheet) {
    histSheet.appendRow([
      ticketId,
      now,
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

  // 2. Aktualizacja w ZGŁOSZENIA
  if (ticketSheet) {
    const data = ticketSheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf("ID Zgłoszenia");
    const lastContactIdx = headers.indexOf("Data ostatniego kontaktu");
    const firstContactIdx = headers.indexOf("Data pierwszego kontaktu");
    const resultIdx = headers.indexOf("Wynik kontaktu z mieszkańcem");
    const noteIdx = headers.indexOf("Notatka pracownika");

    for (let r = 1; r < data.length; r++) {
      if (data[r][idIdx] === ticketId) {
        const rowNum = r + 1;
        if (lastContactIdx !== -1) ticketSheet.getRange(rowNum, lastContactIdx + 1).setValue(now);
        if (firstContactIdx !== -1 && !data[r][firstContactIdx]) ticketSheet.getRange(rowNum, firstContactIdx + 1).setValue(now);
        if (resultIdx !== -1) ticketSheet.getRange(rowNum, resultIdx + 1).setValue(result);
        if (noteIdx !== -1) {
          const currentNote = data[r][noteIdx] || "";
          ticketSheet.getRange(rowNum, noteIdx + 1).setValue((currentNote ? currentNote + " | " : "") + `Tel (${now}): ${notes}`);
        }
        break;
      }
    }
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(`Zapisano kontakt telefoniczny dla ${ticketId}.`, "SmartCare", 5);
}

/**
 * 7. Akcja: Wyświetl historię komunikacji dla zgłoszenia
 */
function actionViewCommunicationHistory() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const histSheet = ss.getSheetByName("HISTORIA KOMUNIKACJI");
  if (!histSheet) {
    SpreadsheetApp.getUi().alert("Brak historii", "Zakładka 'HISTORIA KOMUNIKACJI' nie została jeszcze utworzona.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const data = histSheet.getDataRange().getValues();
  const historyList = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === ticket.ticketId) {
      historyList.push({
        date: data[i][1],
        action: data[i][2],
        channel: data[i][3],
        recipient: data[i][4],
        subject: data[i][5],
        content: data[i][6],
        agent: data[i][7],
        status: data[i][8],
        error: data[i][9]
      });
    }
  }

  let htmlRows = "";
  if (historyList.length === 0) {
    htmlRows = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">Brak wpisów w historii dla tego zgłoszenia.</td></tr>`;
  } else {
    for (let h of historyList) {
      const statusClass = h.status === 'wysłano' ? 'color:#1b5e20; font-weight:600;' : (h.status === 'błąd wysyłki' ? 'color:#b71c1c; font-weight:600;' : 'color:#0d47a1;');
      htmlRows += `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.85rem;">
          <td style="padding: 8px;">${h.date}</td>
          <td style="padding: 8px;"><strong>${h.action}</strong><br><span style="color:#64748b;">${h.channel}</span></td>
          <td style="padding: 8px;"><strong>${h.subject}</strong><br><div style="color:#475569; font-size:0.8rem; max-height:60px; overflow-y:auto;">${h.content.replace(/\n/g, '<br>')}</div></td>
          <td style="padding: 8px; ${statusClass}">${h.status}${h.error ? '<br><small style="color:red">'+h.error+'</small>' : ''}</td>
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
  <h3>Historia korespondencji – Zgłoszenie ${ticket.ticketId}</h3>
  <div style="font-size:0.85rem; color:#64748b;">Mieszkaniec: <strong>${ticket.residentName}</strong> | Status w CRM: <strong>${ticket.status}</strong></div>
  
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
 */
function openEmailDialog(params) {
  const settings = getSmartCareSettings();
  const actualTarget = APPROVED_TEST_RECIPIENT; // Wymuszony zatwierdzony adres testowy

  const html = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; color: #1e293b; background: #f8fafc; margin: 0; }
    h3 { margin-top: 0; color: #143d59; font-size: 1.15rem; display: flex; align-items: center; justify-content: space-between; }
    .badge { font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; font-weight: 700; }
    .badge-demo { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
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
    <span>Podgląd i wysyłka: ${params.actionType}</span>
    ${settings.isDemoMode ? '<span class="badge badge-demo">TRYB DEMO (ZABEZPIECZONY)</span>' : ''}
  </h3>

  ${settings.isDemoMode ? `
  <div class="demo-alert">
    <strong>Twarde zabezpieczenie serwerowe WSB Merito:</strong><br>
    Wiadomość zostanie wysłana WYŁĄCZNIE na zatwierdzony adres testowy: <strong>${actualTarget}</strong>.<br>
    Temat otrzyma prefiks <code>[TEST]</code>. Adres fikcyjnego mieszkańca (<em>${params.recipient}</em>) nie otrzyma wiadomości.
  </div>` : ''}

  <form id="emailForm">
    <div class="form-group">
      <label>Adresat (Odbiorca testowy):</label>
      <input type="text" value="${actualTarget} (Zatwierdzone konto testerskie)" readonly style="background: #f1f5f9; font-weight: 600; color: #1e40af;">
    </div>

    <div class="form-group">
      <label for="emailSubject">Temat wiadomości:</label>
      <input type="text" id="emailSubject" value="${settings.isDemoMode ? '[TEST] ' : ''}${params.subject}" required>
    </div>

    <div class="form-group">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <label for="emailBody" style="margin-bottom:0;">Treść wiadomości (edytowalna):</label>
        <button type="button" class="btn-ai" onclick="personalizeWithAi()">✨ Usprawnij treść z AI</button>
      </div>
      <textarea id="emailBody" required>${params.body}</textarea>
    </div>

    ${params.includeReviewOption ? `
    <div class="review-box">
      <label style="cursor: pointer; display: flex; align-items: flex-start; gap: 8px; margin: 0;">
        <input type="checkbox" id="addGoogleReview" ${params.alreadyReviewed ? '' : 'checked'} style="margin-top: 2px;">
        <span>
          <strong>Dołącz zaproszenie do wystawienia neutralnej opinii Google</strong><br>
          ${params.alreadyReviewed ? '<span style="color:#b45309;">⚠️ Prośba o opinię była już wysłana w dn. ' + (params.alreadyReviewedDate || 'wcześniej') + '. Ponowne zaznaczenie wymaga świadomej decyzji.</span>' : 'Zgodnie z zasadami: brak nagród, brak filtrowania zadowolenia, neutralna prośba.'}
        </span>
      </label>
    </div>` : ''}

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

      if (addReview) {
        body += '\\n\\n---\\n👉 Podziel się z nami opinią w Google:\\n${settings.googleReviewUrl}\\n(Twoja obiektywna ocena pomaga nam doskonalić usługi komunalne w rejonie Kartuz)';
      }

      document.getElementById('btnSubmit').disabled = true;
      document.getElementById('btnSubmit').innerText = 'Wysyłanie...';

      google.script.run
        .withSuccessHandler((res) => {
          google.script.host.close();
        })
        .withFailureHandler((err) => {
          alert('Błąd wysyłki: ' + err);
          document.getElementById('btnSubmit').disabled = false;
          document.getElementById('btnSubmit').innerText = 'Zatwierdź i wyślij';
        })
        .processSendEmail({
          ticketId: '${params.ticketId}',
          actionType: '${params.actionType}',
          originalRecipient: '${params.recipient}',
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
        .polishMessageWithAi('${params.ticketId}', currentText);
    }
  </script>
</body>
</html>`;

  const uiOutput = HtmlService.createHtmlOutput(html).setWidth(640).setHeight(540);
  SpreadsheetApp.getUi().showModalDialog(uiOutput, `SmartCare – Przygotowanie wiadomości e-mail`);
}

/**
 * Backend wysyłki e-mail przez MailApp z TWARDYM ZABEZPIECZENIEM SERWEROWYM
 */
function processSendEmail(payload) {
  const settings = getSmartCareSettings();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const histSheet = ss.getSheetByName("HISTORIA KOMUNIKACJI");
  const ticketSheet = ss.getSheetByName("ZGŁOSZENIA");
  const now = Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd HH:mm");
  const agent = Session.getActiveUser().getEmail().split('@')[0] || "Pracownik";

  // W trybie demonstracyjnym docelowy adres jest twardo ustawiony na APPROVED_TEST_RECIPIENT
  const targetEmail = settings.isDemoMode ? APPROVED_TEST_RECIPIENT : payload.originalRecipient;

  // TWARDE ZABEZPIECZENIE PO STRONIE SERWERA (SERVER-SIDE SECURITY ENFORCEMENT):
  // Jeśli system jest w trybie demonstracyjnym, dozwolona jest wysyłka WYŁĄCZNIE na APPROVED_TEST_RECIPIENT.
  // Każda próba przekierowania na inny adres jest natychmiast blokowana na poziomie backendu.
  if (settings.isDemoMode) {
    if (!targetEmail || targetEmail.toLowerCase().trim() !== APPROVED_TEST_RECIPIENT.toLowerCase().trim()) {
      const securityErr = `BLOKADA BEZPIECZEŃSTWA SERWERA: W trybie demonstracyjnym wysyłka na adres '${targetEmail}' jest zabroniona! Dozwolony odbiorca to wyłącznie: ${APPROVED_TEST_RECIPIENT}`;
      Logger.log(securityErr);
      if (histSheet) {
        histSheet.appendRow([
          payload.ticketId,
          now,
          payload.actionType,
          "e-mail",
          targetEmail || "NIEZNANY",
          payload.subject || "BRAK TEMATU",
          payload.body || "",
          agent,
          "błąd wysyłki",
          securityErr
        ]);
      }
      SpreadsheetApp.getUi().alert("Naruszenie Bezpieczeństwa", securityErr, SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
  }

  // Wymuszenie prefiksu [TEST] w trybie demonstracyjnym
  let finalSubject = payload.subject;
  if (settings.isDemoMode && !finalSubject.startsWith("[TEST]")) {
    finalSubject = `[TEST] ${finalSubject}`;
  }

  // Wymuszenie stopki demonstracyjnej w trybie demo
  let finalBody = payload.body;
  if (settings.isDemoMode) {
    finalBody += `\n\n------------------------------------------------------------\n` +
      `[WIADOMOŚĆ TESTOWA – PROTOTYP WSB MERITO]\n` +
      `Wiadomość wygenerowana w ramach studenckiego projektu wdrożeniowego ELWOZ ECO SmartCare.\n` +
      `Fikcyjny adresat zgłoszenia: ${payload.originalRecipient}\n` +
      `Rzeczywisty zatwierdzony odbiorca testowy: ${APPROVED_TEST_RECIPIENT}`;
  }

  let sendStatus = "przygotowano";
  let errorMessage = "";

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

  // 1. Zapis w HISTORIA KOMUNIKACJI
  if (histSheet) {
    histSheet.appendRow([
      payload.ticketId,
      now,
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

  // 2. Aktualizacja ZGŁOSZENIA tylko gdy wysyłka powiodła się
  if (sendStatus === "wysłano" && ticketSheet) {
    const data = ticketSheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf("ID Zgłoszenia");
    const confirmDateIdx = headers.indexOf("Data potwierdzenia przyjęcia");
    const firstContactIdx = headers.indexOf("Data pierwszego kontaktu");
    const lastContactIdx = headers.indexOf("Data ostatniego kontaktu");
    const resolveDateIdx = headers.indexOf("Data rozwiązania");
    const opinionIdx = headers.indexOf("Prośba o opinię wysłana");
    const opinionDateIdx = headers.indexOf("Data wysłania prośby o opinię");
    const statusIdx = headers.indexOf("Status");

    for (let r = 1; r < data.length; r++) {
      if (data[r][idIdx] === payload.ticketId) {
        const rowNum = r + 1;

        if (payload.actionType === "Potwierdzenie przyjęcia") {
          if (confirmDateIdx !== -1 && !data[r][confirmDateIdx]) ticketSheet.getRange(rowNum, confirmDateIdx + 1).setValue(now);
          if (firstContactIdx !== -1 && !data[r][firstContactIdx]) ticketSheet.getRange(rowNum, firstContactIdx + 1).setValue(now);
          if (statusIdx !== -1 && data[r][statusIdx] === "Nowe") ticketSheet.getRange(rowNum, statusIdx + 1).setValue("Do weryfikacji");
        }

        if (payload.actionType === "Informacja o postępach") {
          if (lastContactIdx !== -1) ticketSheet.getRange(rowNum, lastContactIdx + 1).setValue(now);
          if (statusIdx !== -1 && data[r][statusIdx] === "Do weryfikacji") ticketSheet.getRange(rowNum, statusIdx + 1).setValue("W realizacji");
        }

        if (payload.actionType === "Informacja o rozwiązaniu") {
          if (lastContactIdx !== -1) ticketSheet.getRange(rowNum, lastContactIdx + 1).setValue(now);
          if (resolveDateIdx !== -1 && !data[r][resolveDateIdx]) ticketSheet.getRange(rowNum, resolveDateIdx + 1).setValue(now);
          if (statusIdx !== -1) ticketSheet.getRange(rowNum, statusIdx + 1).setValue("Rozwiązane");
        }

        if (payload.actionType === "Prośba o opinię" || payload.addedReviewRequest) {
          if (opinionIdx !== -1) ticketSheet.getRange(rowNum, opinionIdx + 1).setValue("TAK");
          if (opinionDateIdx !== -1) ticketSheet.getRange(rowNum, opinionDateIdx + 1).setValue(now);
        }

        break;
      }
    }
  }

  if (sendStatus === "wysłano") {
    SpreadsheetApp.getActiveSpreadsheet().toast(`Wysłano: ${payload.actionType} na ${targetEmail}`, "SmartCare Sukces", 5);
  } else {
    SpreadsheetApp.getUi().alert("Błąd wysyłki", `Nie udało się wysłać wiadomości:\n${errorMessage}\n\nOperacja została odnotowana w HISTORIA KOMUNIKACJI jako 'błąd wysyłki'.`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Personalizacja wiadomości z użyciem Gemini AI (z poszanowaniem reguł bezpieczeństwa)
 */
function polishMessageWithAi(ticketId, templateText) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiKey = scriptProperties.getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Brak klucza Gemini API w Script Properties. Użyj gotowego szablonu.");
  }

  const systemPrompt = 
    "Jesteś asystentem komunikacji w firmie komunalnej ELWOZ ECO w Kartuzach.\n" +
    "Twoim celem jest wygładzenie i uczynienie poniższej wiadomości bardziej naturalną, empatyczną i profesjonalną.\n" +
    "ŚCIŚLE PRZESTRZEGAJ ZASAD:\n" +
    "1. NIE wymyślaj żadnych działań, które nie wynikają z podanego tekstu.\n" +
    "2. NIE deklaruj uznania winy ani reklamacji.\n" +
    "3. NIE obiecuj terminów, których nie ma w szablonie.\n" +
    "4. NIE obiecuj odszkodowań ani zniżek.\n" +
    "5. Zachowaj kluczowe informacje, numery spraw i odnośniki w nienaruszonej formie.\n" +
    "6. Zwróć wyłącznie samą treść wygładzonej wiadomości bez dodatkowych komentarzy.";

  const payload = {
    contents: [
      {
        parts: [
          { text: systemPrompt + "\n\nOto treść szablonu do wygładzenia:\n" + templateText }
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

  const response = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, options);
  if (response.getResponseCode() !== 200) {
    throw new Error(`API Gemini zwróciło kod ${response.getResponseCode()}`);
  }

  const json = JSON.parse(response.getContentText());
  return json.candidates[0].content.parts[0].text.trim();
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
        ui.alert("Sukces", "Klucz zapisany w Script Properties.", ui.ButtonSet.OK);
      }
    }
  }
}
