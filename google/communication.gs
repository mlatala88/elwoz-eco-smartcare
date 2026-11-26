/**
 * ============================================================================
 * ELWOZ ECO SmartCare - Moduł Komunikacji & Customer Service Intelligence (communication.gs)
 * Wersja: 0.2.8 (CSI - Centrum Obsługi, Stabilizacja silnika, Kolejka AI 15 RPM, Instant Composer 0s)
 * Projekt edukacyjny: Uniwersytet WSB Merito w Gdańsku
 * Dedykowane konto testowe: wsb.student.tester@gmail.com
 * ============================================================================
 * 
 * ZAKRES MODUŁU v0.2.7:
 * 1. Niestandardowe menu arkusza „SmartCare” (z Centrum Obsługi Zgłoszeń i Kolejką spraw).
 * 2. Centralny panel obsługi zgłoszenia (Obsłuż zgłoszenie) – zintegrowany widok 360° mieszkańca,
 *    inteligencji AI, planowania kolejnego kroku oraz natychmiastowych akcji.
 * 3. Przeglądarka kolejki spraw i filtrów operacyjnych (Kolejka spraw i filtry operacyjne).
 * 4. Błyskawiczny kreator pierwszej odpowiedzi (0 sekund oczekiwania pracownika) zasilany
 *    pre-generowaną treścią z kolumny CRM 'Proponowana odpowiedź AI'.
 * 5. Cztery edytowalne szablony wiadomości oparte WYŁĄCZNIE na zweryfikowanych faktach (CX/PR).
 * 6. BEZWARUNKOWA blokada wysyłki na serwerze: dozwolony odbiorca to WYŁĄCZNIE wsb.student.tester@gmail.com.
 * 7. Zabezpieczenie przed równoczesną wysyłką za pomocą LockService oraz duplikatami (5-minutowe okno).
 * 8. Autentyczny zweryfikowany link do profilu Google i blokada placeholdera.
 * 9. Stylizacja i korekta językowa AI przez zweryfikowany model Gemini Flash (8192 tokeny, filtr myśli).
 * 10. Automatyczna weryfikacja terminów SLA i zintegrowane odświeżanie Dashboardu.
 */

// Jedyny bezwarunkowo autoryzowany odbiorca testowy
const APPROVED_TEST_RECIPIENT = "wsb.student.tester@gmail.com";

// Domyślny, autentyczny link do profilu Google (zgodny z USTAWIENIA)
const VERIFIED_GOOGLE_REVIEW_URL_DEFAULT = "https://search.google.com/local/writereview?placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA";

/**
 * Automatyczne utworzenie menu SmartCare po otwarciu arkusza (v0.2.7)
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📋 SmartCare")
    .addItem("1. 🎯 Obsłuż zgłoszenie (Centrum Obsługi)", "actionOpenCentralTicketHub")
    .addItem("2. 📊 Kolejka spraw i filtry operacyjne", "actionOpenQueueBrowser")
    .addItem("3. 🤖 Analizuj zgłoszenie przez AI", "actionAnalyzeWithAi")
    .addItem("⚡ Przetwórz kolejkę AI (v0.2.8)", "actionProcessAiQueue")
    .addItem("🔧 Wykryj i uzupełnij brakujące zgłoszenia (v0.2.8)", "actionReconcileTickets")
    .addSeparator()
    .addItem("4. ✉️ Przygotuj pierwszą odpowiedź / potwierdzenie", "actionPrepareConfirmation")
    .addItem("5. ✉️ Przygotuj informację o postępach", "actionPrepareProgressUpdate")
    .addItem("6. ✉️ Przygotuj informację o rozwiązaniu", "actionPrepareResolution")
    .addItem("7. ⭐ Przygotuj prośbę o opinię Google", "actionPrepareReviewRequest")
    .addSeparator()
    .addItem("8. 📞 Odnotuj kontakt telefoniczny", "actionLogPhoneCall")
    .addItem("9. 📜 Wyświetl historię komunikacji", "actionViewCommunicationHistory")
    .addSeparator()
    .addItem("🔍 Kontrola spójności systemu (v0.2.8)", "actionValidateSystem")
    .addItem("🔍 Test diagnostyczny Gemini API", "testGeminiApiIntegration")
    .addItem("🚀 Aktualizuj system do v0.2.8", "updateSystemToV028")
    .addItem("⚙️ Ustawienia / Klucz Gemini API", "configureGeminiApiKeyFromComm")
    .addToUi();
}

/**
 * Kompatybilność wsteczna - wywołanie aktualizacji do najnowszej wersji
 */
function updateDashboardKpiFormulasOnly() {
  if (typeof updateSystemToV028 === "function") {
    updateSystemToV028();
  } else if (typeof updateSystemToV027 === "function") {
    updateSystemToV027();
  } else if (typeof updateSystemToV026 === "function") {
    updateSystemToV026();
  }
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
    googleReviewUrl: VERIFIED_GOOGLE_REVIEW_URL_DEFAULT,
    senderName: "ELWOZ ECO SmartCare – POK Kartuzy",
    testEmail: APPROVED_TEST_RECIPIENT
  };

  if (!settingsSheet) return defaultSettings;

  try {
    const data = settingsSheet.getRange("A3:B18").getValues();
    const settingsMap = {};
    for (let row of data) {
      if (row[0]) settingsMap[row[0].toString().trim()] = (row[1] || "").toString().trim();
    }

    let reviewUrl = settingsMap["Zweryfikowany link do opinii Google"] || defaultSettings.googleReviewUrl;
    if (reviewUrl.includes("PLACEHOLDER") || !isVerifiedReviewUrl(reviewUrl)) {
      reviewUrl = defaultSettings.googleReviewUrl;
    }

    return {
      companyName: settingsMap["Nazwa przedsiębiorstwa"] || defaultSettings.companyName,
      facilityName: settingsMap["Nazwa placówki"] || defaultSettings.facilityName,
      contactEmail: settingsMap["Adres e-mail do kontaktu"] || defaultSettings.contactEmail,
      contactPhone: settingsMap["Numer telefonu"] || defaultSettings.contactPhone,
      website: settingsMap["Oficjalna strona internetowa"] || defaultSettings.website,
      googleReviewUrl: reviewUrl,
      senderName: settingsMap["Nazwa nadawcy wiadomości"] || defaultSettings.senderName,
      testEmail: APPROVED_TEST_RECIPIENT
    };
  } catch (err) {
    Logger.log("Błąd odczytu USTAWIENIA: " + err.toString());
    return defaultSettings;
  }
}

/**
 * Pobiera dane zaznaczonego zgłoszenia z zakładki ZGŁOSZENIA (v0.2.7)
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

  return getTicketDataByRow(sheet, row);
}

/**
 * Pobiera kompletny obiekt danych zgłoszenia dla wskazanego wiersza
 */
function getTicketDataByRow(sheet, row) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const values = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

  const getV = (possibleNames) => {
    const list = Array.isArray(possibleNames) ? possibleNames : [possibleNames];
    for (let name of list) {
      const target = String(name).trim().toLowerCase();
      for (let i = 0; i < headers.length; i++) {
        const h = String(headers[i] || "").trim().toLowerCase();
        if (h === target || h.startsWith(target) || h.includes(target)) {
          const val = values[i];
          if (val instanceof Date) {
            return Utilities.formatDate(val, "Europe/Warsaw", "yyyy-MM-dd HH:mm");
          }
          return (val !== null && val !== undefined) ? String(val).trim() : "";
        }
      }
    }
    return "";
  };

  const ticketId = getV("ID Zgłoszenia") || `Wiersz-${row}`;
  const timestamp = getV("Sygnatura czasowa") || getV("Data zgłoszenia");
  const residentEmail = getV("Adres e-mail");
  const residentPhone = getV("Numer telefonu");
  const residentName = getV("Imię i nazwisko") || "Mieszkańcu";
  const ticketType = getV("Rodzaj zgłoszenia");
  const wasteFraction = getV("Rodzaj odpadów");
  const city = getV("Miejscowość");
  const street = getV("Ulica lub lokalizacja");
  const houseNumber = getV(["Numer posesji lub identyfikator miejsca", "Numer posesji", "Nr posesji", "Numer domu"]);
  const contactRequest = getV("Prośba o kontakt ze strony pracownika");
  const description = getV("Opis zgłoszenia");

  // Kolumny operacyjne CSI v0.2.7
  const status = getV("Status") || "Nowe";
  const priority = getV("Priorytet") || "STANDARDOWY";
  const aiSuggestedPriority = getV("Sugerowany priorytet AI");
  const aiPriorityRationale = getV("Uzasadnienie priorytetu AI");
  const aiState = getV("Stan analizy AI") || "Oczekuje";
  const localDataControl = getV("Lokalna kontrola danych");
  const contradictions = getV("Wykryte sprzeczności AI");
  const assignedEmployee = getV("Pracownik odpowiedzialny");
  const nextAction = getV("Następne działanie");
  const responsibleSide = getV("Strona odpowiedzialna") || "Przedsiębiorstwo";
  const nextActionDeadline = getV("Termin następnego działania");
  const slaDeadline = getV("Termin SLA 1. reakcji");
  const slaOverdue = getV("Przekroczenie SLA");
  const employeeNote = getV("Notatka pracownika");
  const residentContactResult = getV(["Wynik kontaktu z mieszkańcem", "Wynik kontaktu"]);

  // Kolumny komunikacyjne i KPI
  const confirmDate = getV("Data potwierdzenia przyjęcia");
  const firstContactDate = getV("Data pierwszego kontaktu");
  const lastContactDate = getV("Data ostatniego kontaktu");
  const resolveDate = getV("Data rozwiązania");
  const resolutionMethod = getV("Sposób rozwiązania sprawy");
  const satisfactionRating = getV("Ocena satysfakcji mieszkańca");
  const satisfactionNote = getV("Komentarz do oceny");
  const reviewSent = getV("Prośba o opinię wysłana").toUpperCase() === "TAK";
  const reviewSentDate = getV("Data wysłania prośby o opinię");

  // Inteligencja AI
  const aiCategory = getV("Kategoria AI");
  const aiSummary = getV("Streszczenie AI");
  const aiMissingInfo = getV("Brakujące informacje AI");
  const aiSuggestedAction = getV("Sugerowane działanie AI");
  const aiDraftResponse = getV("Proponowana odpowiedź AI");
  const aiRecommendedNextStep = getV("Rekomendowany kolejny krok AI");
  const aiErrorDetails = getV(["Szczegóły błędu AI", "Błąd AI"]);

  let fullLocation = city;
  if (street) fullLocation += `, ul. ${street}`;
  if (houseNumber) fullLocation += ` ${houseNumber}`;

  return {
    row,
    headers,
    ticketId,
    timestamp,
    residentEmail,
    residentPhone,
    residentName,
    ticketType,
    wasteFraction,
    city,
    street,
    houseNumber,
    location: fullLocation,
    contactRequest,
    description,
    status,
    priority,
    aiSuggestedPriority,
    aiPriorityRationale,
    aiState,
    localDataControl,
    contradictions,
    assignedEmployee,
    nextAction,
    responsibleSide,
    nextActionDeadline,
    slaDeadline,
    slaOverdue,
    employeeNote,
    residentContactResult,
    confirmDate,
    firstContactDate,
    lastContactDate,
    resolveDate,
    resolutionMethod,
    satisfactionRating,
    satisfactionNote,
    reviewSent,
    reviewSentDate,
    aiCategory,
    aiSummary,
    aiMissingInfo,
    aiSuggestedAction,
    aiDraftResponse,
    aiRecommendedNextStep
  };
}

/**
 * ============================================================================
 * 1. CENTRALNY PANEL OBSŁUGI ZGŁOSZENIA (Obsłuż zgłoszenie - v0.2.7)
 * ============================================================================
 * Nowoczesny panel 360° dla pracownika:
 * - Pełny kontekst mieszkańca i zgłoszenia,
 * - Wyniki inteligencji AI & lokalnej kontroli danych,
 * - Zarządzanie statusem, priorytetem, kolejnym krokiem i notatkami,
 * - Natychmiastowe przyciski operacyjne (Odpowiedź 0s, Telefon, Historia, AI).
 */
function actionOpenCentralTicketHub() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

  const priorityColors = {
    "PILNY": { bg: "#fee2e2", text: "#991b1b", border: "#f87171" },
    "WYSOKI": { bg: "#ffedd5", text: "#9a3412", border: "#fb923c" },
    "STANDARDOWY": { bg: "#dbeafe", text: "#1e40af", border: "#60a5fa" },
    "NISKI": { bg: "#dcfce7", text: "#166534", border: "#4ade80" }
  };
  const prioStyle = priorityColors[ticket.priority] || priorityColors["STANDARDOWY"];

  const aiBadgeColors = {
    "Gotowa": { bg: "#dcfce7", text: "#166534" },
    "Wymaga weryfikacji": { bg: "#fef3c7", text: "#92400e" },
    "W trakcie": { bg: "#e0f2fe", text: "#0369a1" },
    "Błąd": { bg: "#fee2e2", text: "#991b1b" },
    "Oczekuje": { bg: "#f1f5f9", text: "#475569" }
  };
  const aiStyle = aiBadgeColors[ticket.aiState] || aiBadgeColors["Oczekuje"];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 16px; background: #f8fafc; color: #1e293b; font-size: 13px; line-height: 1.45; }
    .header-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 14px; }
    .header-title { font-size: 17px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px; }
    .pill { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 14px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .card-title { font-size: 13px; font-weight: 700; color: #143d59; margin-top: 0; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
    .field-row { display: flex; margin-bottom: 5px; }
    .field-label { width: 140px; color: #64748b; font-weight: 600; font-size: 12px; }
    .field-val { flex: 1; color: #0f172a; word-break: break-word; }
    .desc-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 12px; max-height: 80px; overflow-y: auto; margin-top: 6px; white-space: pre-wrap; }
    .ai-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; margin-bottom: 10px; }
    .warn-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #92400e; margin-bottom: 8px; }
    .form-group { margin-bottom: 8px; }
    label { display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 3px; }
    input[type="text"], input[type="date"], select, textarea { width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 12px; font-family: inherit; }
    input:focus, select:focus, textarea:focus { border-color: #059669; outline: none; }
    textarea { height: 60px; resize: vertical; }
    .btn-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; align-items: center; margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    .btn-group-left { display: flex; gap: 8px; }
    .btn-group-right { display: flex; gap: 8px; }
    button { padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; transition: 0.15s; }
    .btn-primary { background: #1b7a3e; color: #ffffff; }
    .btn-primary:hover { background: #145a32; }
    .btn-action-mail { background: #0284c7; color: #ffffff; }
    .btn-action-mail:hover { background: #0369a1; }
    .btn-action-phone { background: #f59e0b; color: #ffffff; }
    .btn-action-phone:hover { background: #d97706; }
    .btn-secondary { background: #e2e8f0; color: #334155; }
    .btn-secondary:hover { background: #cbd5e1; }
    .btn-ai-reload { background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe; }
    .btn-ai-reload:hover { background: #e9d5ff; }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="header-title">
      <span>🎯 Centrum Obsługi Zgłoszenia: ${escapeHtml(ticket.ticketId)}</span>
      <span class="pill" style="background:${prioStyle.bg}; color:${prioStyle.text}; border:1px solid ${prioStyle.border};">Priorytet: ${escapeHtml(ticket.priority)}</span>
      <span class="pill" style="background:${aiStyle.bg}; color:${aiStyle.text};">AI: ${escapeHtml(ticket.aiState)}</span>
    </div>
    <div>
      <span style="font-size:12px; color:#64748b;">Status: <strong>${escapeHtml(ticket.status)}</strong> | SLA: <strong>${escapeHtml(ticket.slaDeadline || "Brak")}</strong></span>
    </div>
  </div>

  <div class="grid">
    <!-- LEWA KOLUMNA: Mieszkaniec & Treść & Inteligencja AI -->
    <div>
      <div class="card" style="margin-bottom: 12px;">
        <h4 class="card-title">👤 Dane zgłoszenia & Mieszkaniec</h4>
        <div class="field-row"><span class="field-label">Imię i nazwisko:</span><span class="field-val"><strong>${escapeHtml(ticket.residentName)}</strong></span></div>
        <div class="field-row"><span class="field-label">Lokalizacja:</span><span class="field-val">📍 ${escapeHtml(ticket.location)}</span></div>
        <div class="field-row"><span class="field-label">Kontakt:</span><span class="field-val">✉️ ${escapeHtml(ticket.residentEmail || "brak e-mail")} | 📞 ${escapeHtml(ticket.residentPhone || "brak tel")}</span></div>
        <div class="field-row"><span class="field-label">Frakcja / Kategoria:</span><span class="field-val"><strong>${escapeHtml(ticket.wasteFraction || "Nieokreślona")}</strong> (${escapeHtml(ticket.ticketType)})</span></div>
        <div class="field-row"><span class="field-label">Wpłynęło:</span><span class="field-val">${escapeHtml(ticket.timestamp)} ${ticket.contactRequest ? '<span style="color:#b45309; font-weight:bold;">[Wnioskowano o kontakt]</span>' : ''}</span></div>
        
        <label style="margin-top:8px;">Oryginalny opis mieszkańca:</label>
        <div class="desc-box">${escapeHtml(ticket.description)}</div>
      </div>

      <div class="card">
        <h4 class="card-title">🤖 Customer Service Intelligence (AI)</h4>
        
        ${ticket.localDataControl ? `
        <div class="warn-box">
          <strong>Lokalna kontrola danych:</strong> ${escapeHtml(ticket.localDataControl)}
          ${ticket.contradictions && ticket.contradictions !== "Brak sprzeczności" ? `<br>⚠️ <strong>Wykryta sprzeczność:</strong> ${escapeHtml(ticket.contradictions)}` : ''}
        </div>` : ''}

        <div class="ai-box">
          <div style="margin-bottom:6px;"><strong>Kategoria AI:</strong> ${escapeHtml(ticket.aiCategory || ticket.ticketType)}</div>
          <div style="margin-bottom:6px;"><strong>Streszczenie AI:</strong> ${escapeHtml(ticket.aiSummary || "Analiza oczekuje na uruchomienie.")}</div>
          <div style="margin-bottom:6px;"><strong>Sugerowany priorytet:</strong> <span style="font-weight:bold; color:#b91c1c;">${escapeHtml(ticket.aiSuggestedPriority || "STANDARDOWY")}</span> <em>(${escapeHtml(ticket.aiPriorityRationale || "Brak uzasadnienia")})</em></div>
          <div style="margin-bottom:6px;"><strong>Brakujące informacje:</strong> ${escapeHtml(ticket.aiMissingInfo || "Brak braków")}</div>
          <div style="margin-bottom:6px;"><strong>Rekomendowane zadanie:</strong> 🎯 ${escapeHtml(ticket.aiRecommendedNextStep || ticket.aiSuggestedAction || "Weryfikacja zgłoszenia")}</div>
          <div><strong>Strona kolejnego kroku:</strong> ${ticket.responsibleSide === "Mieszkaniec" ? '<span style="color:#b45309; font-weight:bold;">Mieszkaniec (oczekujemy na dane)</span>' : '<span style="color:#1e40af; font-weight:bold;">Przedsiębiorstwo (działanie POK/dyspozytora)</span>'}</div>
        </div>
      </div>
    </div>

    <!-- PRAWA KOLUMNA: Zarządzanie sprawą & Kolejny krok -->
    <div>
      <div class="card" style="height: 100%; box-sizing: border-box;">
        <h4 class="card-title">⚙️ Planowanie działań & Zarządzanie sprawą</h4>
        
        <form id="ticketPanelForm">
          <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label for="pStatus">Status sprawy:</label>
              <select id="pStatus">
                <option value="Nowe" ${ticket.status === 'Nowe' ? 'selected' : ''}>Nowe</option>
                <option value="Do weryfikacji" ${ticket.status === 'Do weryfikacji' ? 'selected' : ''}>Do weryfikacji</option>
                <option value="W realizacji" ${ticket.status === 'W realizacji' ? 'selected' : ''}>W realizacji</option>
                <option value="Rozwiązane" ${ticket.status === 'Rozwiązane' ? 'selected' : ''}>Rozwiązane</option>
                <option value="Zamknięte" ${ticket.status === 'Zamknięte' ? 'selected' : ''}>Zamknięte</option>
              </select>
            </div>
            <div class="form-group">
              <label for="pPriority">Zatwierdzony Priorytet:</label>
              <select id="pPriority">
                <option value="PILNY" ${ticket.priority === 'PILNY' ? 'selected' : ''}>🔴 PILNY (15 min)</option>
                <option value="WYSOKI" ${ticket.priority === 'WYSOKI' ? 'selected' : ''}>🟠 WYSOKI (1 godz.)</option>
                <option value="STANDARDOWY" ${ticket.priority === 'STANDARDOWY' ? 'selected' : ''}>🔵 STANDARDOWY (4 godz.)</option>
                <option value="NISKI" ${ticket.priority === 'NISKI' ? 'selected' : ''}>🟢 NISKI (24 godz.)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="pNextAction">Następne działanie operacyjne:</label>
            <input type="text" id="pNextAction" value="${escapeHtml(ticket.nextAction || ticket.aiRecommendedNextStep || '')}" placeholder="np. Weryfikacja zapisu GPS śmieciarki">
          </div>

          <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label for="pResponsibleSide">Strona odpowiedzialna:</label>
              <select id="pResponsibleSide">
                <option value="Przedsiębiorstwo" ${ticket.responsibleSide === 'Przedsiębiorstwo' ? 'selected' : ''}>Przedsiębiorstwo (ELWOZ)</option>
                <option value="Mieszkaniec" ${ticket.responsibleSide === 'Mieszkaniec' ? 'selected' : ''}>Mieszkaniec (oczekiwanie na info)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="pAgent">Pracownik odpowiedzialny:</label>
              <input type="text" id="pAgent" value="${escapeHtml(ticket.assignedEmployee || '')}" placeholder="Login pracownika">
            </div>
          </div>

          <div class="form-group">
            <label for="pNextDeadline">Termin wykonania następnego kroku:</label>
            <input type="text" id="pNextDeadline" value="${escapeHtml(ticket.nextActionDeadline || '')}" placeholder="np. 2026-11-26 12:00">
          </div>

          <div class="form-group">
            <label for="pResolution">Sposób rozwiązania sprawy (wymagany przed zamknięciem):</label>
            <textarea id="pResolution" placeholder="Faktyczne działania podjęte w terenie...">${escapeHtml(ticket.resolutionMethod || '')}</textarea>
          </div>

          <div class="form-group">
            <label for="pNote">Wewnętrzna notatka pracownika:</label>
            <textarea id="pNote" placeholder="Ustalenia dyspozytorni, kontakt telefoniczny...">${escapeHtml(ticket.employeeNote || '')}</textarea>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- DOLNA BELKA AKCJI -->
  <div class="btn-actions">
    <div class="btn-group-left">
      <button type="button" class="btn-primary" onclick="saveHubChanges()">💾 Zapisz zmiany w CRM</button>
      <button type="button" class="btn-ai-reload" onclick="reRunAiAnalysis()">🤖 Przelicz AI ponownie</button>
    </div>
    <div class="btn-group-right">
      <button type="button" class="btn-action-mail" onclick="openFastEmail()">✉️ Przygotuj odpowiedź (0s wait)</button>
      <button type="button" class="btn-action-phone" onclick="openPhoneCall()">📞 Telefon</button>
      <button type="button" class="btn-secondary" onclick="openHistory()">📜 Historia</button>
      <button type="button" class="btn-secondary" onclick="google.script.host.close()">Zamknij</button>
    </div>
  </div>

  <script>
    function saveHubChanges() {
      const payload = {
        ticketId: ${JSON.stringify(ticket.ticketId)},
        rowNum: ${ticket.row},
        status: document.getElementById('pStatus').value,
        priority: document.getElementById('pPriority').value,
        nextAction: document.getElementById('pNextAction').value.trim(),
        responsibleSide: document.getElementById('pResponsibleSide').value,
        assignedEmployee: document.getElementById('pAgent').value.trim(),
        nextActionDeadline: document.getElementById('pNextDeadline').value.trim(),
        resolutionMethod: document.getElementById('pResolution').value.trim(),
        employeeNote: document.getElementById('pNote').value.trim()
      };

      google.script.run
        .withSuccessHandler((res) => {
          if (res && res.success) {
            alert('Zmiany zostały pomyślnie zapisane w rejestrze ZGŁOSZENIA.');
            google.script.host.close();
          } else {
            alert('Błąd zapisu: ' + (res.error || 'Nieznany błąd'));
          }
        })
        .withFailureHandler((err) => {
          alert('Błąd połączenia z serwerem: ' + err);
        })
        .saveTicketPanelUpdates(payload);
    }

    function openFastEmail() {
      google.script.host.close();
      google.script.run.actionPrepareConfirmation();
    }

    function openPhoneCall() {
      google.script.host.close();
      google.script.run.actionLogPhoneCall();
    }

    function openHistory() {
      google.script.host.close();
      google.script.run.actionViewCommunicationHistory();
    }

    function reRunAiAnalysis() {
      google.script.host.close();
      google.script.run.actionAnalyzeWithAi();
    }
  </script>
</body>
</html>`;

  const uiOutput = HtmlService.createHtmlOutput(html).setWidth(920).setHeight(680);
  SpreadsheetApp.getUi().showModalDialog(uiOutput, `SmartCare – Centrum Obsługi Zgłoszenia (${ticket.ticketId})`);
}

/**
 * Backend zapisu aktualizacji z Centralnego Panelu Obsługi (v0.2.7)
 */
function saveTicketPanelUpdates(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ZGŁOSZENIA");
  if (!sheet) {
    return { success: false, error: "Brak zakładki ZGŁOSZENIA." };
  }

  const row = payload.rowNum;
  if (!row || row <= 1) {
    return { success: false, error: "Nieprawidłowy numer wiersza." };
  }

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());

  setValByHeader(sheet, row, headers, "Status", payload.status);
  setValByHeader(sheet, row, headers, "Priorytet", payload.priority);
  setValByHeader(sheet, row, headers, "Następne działanie", payload.nextAction);
  setValByHeader(sheet, row, headers, "Strona odpowiedzialna", payload.responsibleSide);
  setValByHeader(sheet, row, headers, "Pracownik odpowiedzialny", payload.assignedEmployee);
  setValByHeader(sheet, row, headers, "Termin następnego działania", payload.nextActionDeadline);
  setValByHeader(sheet, row, headers, "Sposób rozwiązania sprawy", payload.resolutionMethod);
  setValByHeader(sheet, row, headers, "Notatka pracownika", payload.employeeNote);

  // Jeśli status to Rozwiązane i brak daty rozwiązania, ustaw datę bieżącą
  if (payload.status === "Rozwiązane") {
    const resolveIdx = headers.indexOf("Data rozwiązania");
    if (resolveIdx !== -1) {
      const cur = sheet.getRange(row, resolveIdx + 1).getValue();
      if (!cur) {
        sheet.getRange(row, resolveIdx + 1).setValue(new Date()).setNumberFormat("yyyy-MM-dd HH:mm");
      }
    }
  }

  SpreadsheetApp.flush();
  if (typeof refreshDashboardStats === "function") {
    try { refreshDashboardStats(ss); } catch (_) {}
  }

  return { success: true };
}

/**
 * ============================================================================
 * 2. PRZEGLĄDARKA KOLEJKI SPRAW I FILTRY OPERACYJNE (v0.2.7)
 * ============================================================================
 * Pozwala przeglądać zgłoszenia według priorytetów, SLA i braków kolejnego kroku.
 */
function actionOpenQueueBrowser() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ZGŁOSZENIA");
  if (!sheet || sheet.getLastRow() <= 1) {
    SpreadsheetApp.getUi().alert("Informacja", "Brak zgłoszeń w rejestrze ZGŁOSZENIA.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  const tickets = [];

  for (let r = 2; r <= lastRow; r++) {
    const t = getTicketDataByRow(sheet, r);
    if (t.ticketId) {
      tickets.push(t);
    }
  }

  const ticketsJson = JSON.stringify(tickets);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 16px; background: #f8fafc; color: #1e293b; font-size: 13px; }
    h3 { margin-top: 0; color: #0f172a; font-size: 16px; border-bottom: 2px solid #059669; padding-bottom: 6px; }
    .filter-tabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .tab-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; font-size: 12px; font-weight: 600; cursor: pointer; }
    .tab-btn.active { background: #143d59; color: #ffffff; border-color: #143d59; }
    .count-badge { background: #e2e8f0; color: #0f172a; padding: 1px 6px; border-radius: 999px; font-size: 10px; margin-left: 4px; }
    .tab-btn.active .count-badge { background: #059669; color: #ffffff; }
    table { width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 11px; color: #475569; border-bottom: 1px solid #cbd5e1; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; vertical-align: middle; }
    tr:hover td { background: #f8fafc; }
    .pill { display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 10px; font-weight: 700; }
    .btn-open { background: #059669; color: #ffffff; padding: 4px 10px; border-radius: 4px; border: none; font-size: 11px; font-weight: 600; cursor: pointer; }
    .btn-open:hover { background: #047857; }
    .table-container { max-height: 480px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; }
  </style>
</head>
<body>
  <h3>📊 Kolejka spraw i filtry operacyjne Customer Service Intelligence (v0.2.7)</h3>

  <div class="filter-tabs" id="filterTabs">
    <button class="tab-btn active" onclick="setFilter('active')">Wszystkie aktywne <span class="count-badge" id="cActive">0</span></button>
    <button class="tab-btn" onclick="setFilter('sla')">Przekroczone SLA <span class="count-badge" id="cSla">0</span></button>
    <button class="tab-btn" onclick="setFilter('urgent')">Pilne i Wysokie <span class="count-badge" id="cUrgent">0</span></button>
    <button class="tab-btn" onclick="setFilter('noFirst')">Brak 1. odpowiedzi <span class="count-badge" id="cNoFirst">0</span></button>
    <button class="tab-btn" onclick="setFilter('noNext')">Brak kolejnego kroku <span class="count-badge" id="cNoNext">0</span></button>
    <button class="tab-btn" onclick="setFilter('resident')">Oczekuje na mieszkańca <span class="count-badge" id="cResident">0</span></button>
    <button class="tab-btn" onclick="setFilter('company')">Oczekuje na firmę <span class="count-badge" id="cCompany">0</span></button>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width: 100px;">ID Sprawy</th>
          <th style="width: 80px;">Status</th>
          <th style="width: 90px;">Priorytet</th>
          <th>Mieszkaniec & Lokalizacja</th>
          <th>Kolejny krok operacyjny</th>
          <th style="width: 90px;">Strona</th>
          <th style="width: 110px;">Termin SLA</th>
          <th style="width: 80px;">Akcja</th>
        </tr>
      </thead>
      <tbody id="tableBody"></tbody>
    </table>
  </div>

  <script>
    const allTickets = ${ticketsJson};
    let currentFilter = 'active';

    function setFilter(filter) {
      currentFilter = filter;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      event.target.closest('.tab-btn').classList.add('active');
      renderTable();
    }

    function matchesFilter(t, filter) {
      const isResolved = t.status === 'Rozwiązane' || t.status === 'Zamknięte';
      if (filter === 'active') return !isResolved;
      if (filter === 'sla') return t.slaOverdue === 'TAK' && !isResolved;
      if (filter === 'urgent') return (t.priority === 'PILNY' || t.priority === 'WYSOKI') && !isResolved;
      if (filter === 'noFirst') return !t.firstContactDate && !isResolved;
      if (filter === 'noNext') return (!t.nextAction || t.nextAction.trim() === '') && !isResolved;
      if (filter === 'resident') return t.responsibleSide === 'Mieszkaniec' && !isResolved;
      if (filter === 'company') return (t.responsibleSide === 'Przedsiębiorstwo' || !t.responsibleSide) && !isResolved;
      return true;
    }

    function updateCounts() {
      document.getElementById('cActive').innerText = allTickets.filter(t => matchesFilter(t, 'active')).length;
      document.getElementById('cSla').innerText = allTickets.filter(t => matchesFilter(t, 'sla')).length;
      document.getElementById('cUrgent').innerText = allTickets.filter(t => matchesFilter(t, 'urgent')).length;
      document.getElementById('cNoFirst').innerText = allTickets.filter(t => matchesFilter(t, 'noFirst')).length;
      document.getElementById('cNoNext').innerText = allTickets.filter(t => matchesFilter(t, 'noNext')).length;
      document.getElementById('cResident').innerText = allTickets.filter(t => matchesFilter(t, 'resident')).length;
      document.getElementById('cCompany').innerText = allTickets.filter(t => matchesFilter(t, 'company')).length;
    }

    function renderTable() {
      const tbody = document.getElementById('tableBody');
      const filtered = allTickets.filter(t => matchesFilter(t, currentFilter));

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#94a3b8;">Brak spraw spełniających kryteria wybranego filtra.</td></tr>';
        return;
      }

      let html = '';
      for (let t of filtered) {
        const prioColors = {
          'PILNY': 'background:#fee2e2; color:#991b1b;',
          'WYSOKI': 'background:#ffedd5; color:#9a3412;',
          'STANDARDOWY': 'background:#dbeafe; color:#1e40af;',
          'NISKI': 'background:#dcfce7; color:#166534;'
        };
        const pStyle = prioColors[t.priority] || prioColors['STANDARDOWY'];
        const isOverdue = t.slaOverdue === 'TAK';

        html += '<tr>' +
          '<td><strong>' + (t.ticketId || '') + '</strong></td>' +
          '<td><span class="pill" style="background:#f1f5f9; color:#334155;">' + (t.status || 'Nowe') + '</span></td>' +
          '<td><span class="pill" style="' + pStyle + '">' + (t.priority || 'STANDARDOWY') + '</span></td>' +
          '<td><strong>' + (t.residentName || 'Mieszkaniec') + '</strong><br><small style="color:#64748b;">📍 ' + (t.location || '') + '</small></td>' +
          '<td>' + (t.nextAction || '<em style="color:#ef4444;">Brak przypisanego kroku</em>') + '</td>' +
          '<td>' + (t.responsibleSide === 'Mieszkaniec' ? '<span style="color:#b45309; font-weight:600;">Mieszkaniec</span>' : 'Firma') + '</td>' +
          '<td>' + (isOverdue ? '<span style="color:#b91c1c; font-weight:bold;">⚠️ ' + (t.slaDeadline || 'Przekroczone') + '</span>' : (t.slaDeadline || '-')) + '</td>' +
          '<td><button class="btn-open" onclick="openTicket(' + t.row + ')">Obsłuż</button></td>' +
          '</tr>';
      }
      tbody.innerHTML = html;
    }

    function openTicket(rowNum) {
      google.script.host.close();
      google.script.run.selectRowAndOpenHub(rowNum);
    }

    updateCounts();
    renderTable();
  </script>
</body>
</html>`;

  const uiOutput = HtmlService.createHtmlOutput(html).setWidth(940).setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(uiOutput, "SmartCare – Kolejka spraw i filtry operacyjne");
}

/**
 * Zaznacza wiersz w arkuszu ZGŁOSZENIA i otwiera Centrum Obsługi Zgłoszenia
 */
function selectRowAndOpenHub(rowNum) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ZGŁOSZENIA");
  if (sheet) {
    ss.setActiveSheet(sheet);
    sheet.setActiveRange(sheet.getRange(rowNum, 1));
    actionOpenCentralTicketHub();
  }
}

/**
 * 3. Akcja: Analizuj zgłoszenie przez AI
 */
function actionAnalyzeWithAi() {
  if (typeof analyzeSelectedTicket === "function") {
    analyzeSelectedTicket();
  } else {
    SpreadsheetApp.getUi().alert("Informacja", "Moduł ai.gs jest dostępny. Uruchom analizę bezpośrednio.", SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Generuje treść awaryjnej pierwszej odpowiedzi dopasowaną do kategorii (v0.2.8)
 * - dla pochwały: ciepłe podziękowanie i przekazanie załodze (bez GPS!)
 * - dla zgłoszenia niekompletnego: prośba o doprecyzowanie danych
 * - dla reklamacji kompletnej: potwierdzenie weryfikacji operacyjnej
 */
function generateTailoredEmergencyConfirmation(ticket, settings) {
  const isPraise = /pochwał|podzięk/i.test(ticket.ticketType || "");
  const hasIssues = Boolean(ticket.aiMissingInfo || (ticket.localDataControl && ticket.localDataControl.includes("Wymaga uzupełnienia")));

  if (isPraise) {
    return (
`Dzień dobry, ${ticket.residentName},

Serdecznie dziękujemy za przesłanie miłych słów dotyczących pracy naszej załogi w rejonie Kartuz (${ticket.location || "Rejon Kartuzy"}).

Pana/Pani opinia została zarejestrowana w naszym systemie pod numerem sprawy ${ticket.ticketId}. Tego typu sygnały są dla całego zespołu ELWOZ ECO cennym potwierdzeniem jakości świadczonych usług i motywacją do codziennej rzetelnej pracy.

Z poważaniem,
${settings.senderName}
${settings.facilityName}
ul. Mściwoja II 14, 83-300 Kartuzy
Tel. ${settings.contactPhone} | ${settings.website}`
    );
  }

  if (hasIssues) {
    return (
`Dzień dobry, ${ticket.residentName},

Potwierdzamy zarejestrowanie zgłoszenia ${ticket.ticketId} w systemie ELWOZ ECO SmartCare:
• Rodzaj zgłoszenia: ${ticket.ticketType || "Zgłoszenie komunalne"}
• Frakcja odpadów: ${ticket.wasteFraction || "Nieokreślona"}
• Wskazana lokalizacja: ${ticket.location || "Do doprecyzowania"}

W celu sprawnego podjęcia działań operacyjnych w terenie uprzejmie prosimy o doprecyzowanie brakujących danych (np. numer posesji lub dokładna lokalizacja pojemnika).

Po otrzymaniu informacji niezwłocznie skierujemy sprawę do realizacji.

W razie pytań prosimy o kontakt z biurem POK Kartuzy (tel. ${settings.contactPhone}, e-mail: ${settings.contactEmail}), powołując się na numer sprawy ${ticket.ticketId}.

Z poważaniem,
${settings.senderName}
${settings.facilityName}
ul. Mściwoja II 14, 83-300 Kartuzy
Tel. ${settings.contactPhone} | ${settings.website}`
    );
  }

  return (
`Dzień dobry, ${ticket.residentName},

Potwierdzamy zarejestrowanie zgłoszenia w systemie ELWOZ ECO SmartCare:
• Numer sprawy: ${ticket.ticketId}
• Rodzaj zgłoszenia: ${ticket.ticketType}
• Frakcja odpadów: ${ticket.wasteFraction}
• Wskazana ulica / rejon: ${ticket.location}

1. Ustalenia wstępne: Zgłoszenie zostało poprawnie zarejestrowane w naszym systemie CRM.
2. Działania ze strony Mieszkańca: Ze strony Mieszkańca na ten moment nie są wymagane żadne dodatkowe działania.
3. Kolejny krok przedsiębiorstwa: Zgłoszenie zostało zarejestrowane w rejestrze CRM i oczekuje na weryfikację operacyjną.
4. Strona odpowiedzialna za realizację: Przedsiębiorstwo ELWOZ ECO.

W przypadku pytań prosimy o kontakt z biurem POK Kartuzy (tel. ${settings.contactPhone}, e-mail: ${settings.contactEmail}), powołując się na numer sprawy ${ticket.ticketId}.

Z poważaniem,
${settings.senderName}
${settings.facilityName}
ul. Mściwoja II 14, 83-300 Kartuzy
Tel. ${settings.contactPhone} | ${settings.website}`
  );
}

/**
 * 4. Akcja: Przygotuj potwierdzenie przyjęcia / pierwszą odpowiedź (Szablon A - v0.2.8)
 * Zabezpieczenie v0.2.8: Jeśli Stan analizy AI to "Błąd", nie używamy starej propozycji z CRM,
 * lecz generujemy bezpieczną odpowiedź dopasowaną do kategorii (Pochwała, Niekompletne, Reklamacja).
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

  let body = "";
  const isAiError = ticket.aiState === "Błąd";

  if (!isAiError && ticket.aiDraftResponse && ticket.aiDraftResponse.trim().length > 20) {
    body = ticket.aiDraftResponse.trim();
  } else {
    body = generateTailoredEmergencyConfirmation(ticket, settings);
  }

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
 * 5. Akcja: Przygotuj informację o postępach (Szablon B - v0.2.8)
 * Dynamicznie buduje treść na podstawie rzeczywistych notatek i ustaleń:
 * notatka pracownika, następne działanie, strona odpowiedzialna, wynik kontaktu z mieszkańcem.
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

  const progressDetails = [];
  if (ticket.status) {
    progressDetails.push(`• Aktualny status sprawy: ${ticket.status}`);
  }
  if (ticket.nextAction) {
    progressDetails.push(`• Kolejne zaplanowane działanie: ${ticket.nextAction}`);
  }
  if (ticket.responsibleSide) {
    progressDetails.push(`• Strona odpowiedzialna za realizację kroku: ${ticket.responsibleSide}`);
  }
  if (ticket.residentContactResult) {
    progressDetails.push(`• Dotychczasowy wynik kontaktu z Mieszkańcem: ${ticket.residentContactResult}`);
  }

  let detailsSection = "";
  if (progressDetails.length > 0) {
    detailsSection = "Aktualne ustalenia w toku sprawy:\n" + progressDetails.join("\n") + "\n\n";
  } else {
    detailsSection = `Sprawa znajduje się w toku realizacji (status: ${ticket.status || "W toku"}). Trwają czynności związane z obsługą zgłoszenia.\n\n`;
  }

  const body = 
`Dzień dobry, ${ticket.residentName},

Informujemy o aktualnym statusie zgłoszenia ${ticket.ticketId} dotyczącego: ${ticket.ticketType} (${ticket.location}):

${detailsSection}O kolejnych ustaleniach lub sposobie ostatecznego załatwienia sprawy powiadomimy w kolejnej wiadomości.

W razie pytań prosimy o kontakt z biurem POK Kartuzy (tel. ${settings.contactPhone}, e-mail: ${settings.contactEmail}), powołując się na numer sprawy ${ticket.ticketId}.

Z poważaniem,
${settings.senderName}
${settings.facilityName}
ul. Mściwoja II 14, 83-300 Kartuzy
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
 * 6. Akcja: Przygotuj informację o rozwiązaniu (Szablon C)
 */
function actionPrepareResolution() {
  const ticket = getSelectedTicketData();
  if (!ticket) return;

  if (!ticket.residentEmail) {
    promptMissingEmail(ticket);
    return;
  }

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
 * 7. Akcja: Przygotuj prośbę o opinię Google (Szablon D)
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
 * 8. Akcja: Odnotuj kontakt telefoniczny
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
      <option value="Mieszkaniec doprecyzował numer posesji / dane">Mieszkaniec doprecyzował dane / numer posesji</option>
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

  const uiOutput = HtmlService.createHtmlOutput(html).setWidth(480).setHeight(400);
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
    const sideIdx = headers.indexOf("Strona odpowiedzialna");

    for (let r = 1; r < data.length; r++) {
      if (String(data[r][idIdx]).trim() === String(ticketId).trim()) {
        const rowNum = r + 1;
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
        // Po udanej rozmowie strona odpowiedzialna wraca na Przedsiębiorstwo
        if (sideIdx !== -1) {
          ticketSheet.getRange(rowNum, sideIdx + 1).setValue("Przedsiębiorstwo");
        }
        break;
      }
    }
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(`Zapisano kontakt telefoniczny dla ${ticketId}.`, "SmartCare", 5);
  if (typeof refreshDashboardStats === "function") {
    try { refreshDashboardStats(ss); } catch (_) {}
  }
}

/**
 * 9. Akcja: Wyświetl historię komunikacji dla zgłoszenia
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
 * Uniwersalne okno dialogowe podglądu, edycji i wysyłki wiadomości e-mail (v0.2.7)
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
        <button type="button" class="btn-ai" id="btnAi" onclick="personalizeWithAi()">✨ Usprawnij styl z AI (Gemini Flash)</button>
      </div>
      <textarea id="emailBody" required>${safeBody}</textarea>
      <div id="aiStatusBox" style="display: none; padding: 8px 12px; border-radius: 6px; font-size: 0.825rem; margin-top: 6px; line-height: 1.4;"></div>
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
    function escapeHtmlClient(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

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
            alert('Błąd operacji:\\n\\n' + errMsg + '\\n\\nOkno wiadomości pozostaje otwarte. Popraw treść lub spróbuj ponownie.');
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
      const btnAi = document.getElementById('btnAi');
      const btnSubmit = document.getElementById('btnSubmit');
      const statusBox = document.getElementById('aiStatusBox');
      const currentText = bodyEl.value.trim();

      if (!currentText) {
        alert('Treść wiadomości nie może być pusta.');
        return;
      }

      bodyEl.disabled = true;
      if (btnAi) {
        btnAi.disabled = true;
        btnAi.innerText = 'AI przygotowuje odpowiedź…';
      }
      if (btnSubmit) {
        btnSubmit.disabled = true;
      }

      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.style.background = '#f3e8ff';
        statusBox.style.color = '#6b21a8';
        statusBox.style.border = '1px solid #d8b4fe';
        statusBox.innerHTML = '⏳ <strong>AI przygotowuje odpowiedź…</strong> (Gemini Flash weryfikuje styl, gramatykę i zasady PR)';
      }

      google.script.run
        .withSuccessHandler((polished) => {
          bodyEl.disabled = false;
          if (btnAi) {
            btnAi.disabled = false;
            btnAi.innerText = '✨ Usprawnij styl z AI (Gemini Flash)';
          }
          if (btnSubmit) {
            btnSubmit.disabled = false;
          }

          if (polished && typeof polished === 'string' && polished.trim() !== '') {
            bodyEl.value = polished.trim();
            if (statusBox) {
              statusBox.style.display = 'block';
              statusBox.style.background = '#ecfdf5';
              statusBox.style.color = '#065f46';
              statusBox.style.border = '1px solid #a7f3d0';
              statusBox.innerHTML = '✓ <strong>Sukces:</strong> Styl wiadomości został pomyślnie zoptymalizowany przez AI.';
            }
          } else {
            if (statusBox) {
              statusBox.style.display = 'block';
              statusBox.style.background = '#fef2f2';
              statusBox.style.color = '#991b1b';
              statusBox.style.border = '1px solid #fecaca';
              statusBox.innerHTML = '⚠️ <strong>Uwaga:</strong> AI nie zwróciło nowej treści. Zachowano treść oryginalną.';
            }
          }
        })
        .withFailureHandler((err) => {
          bodyEl.disabled = false;
          if (btnAi) {
            btnAi.disabled = false;
            btnAi.innerText = '✨ Usprawnij styl z AI (Gemini Flash)';
          }
          if (btnSubmit) {
            btnSubmit.disabled = false;
          }
          const safeErr = escapeHtmlClient(err ? (err.message || String(err)) : 'Nieznany błąd');
          if (statusBox) {
            statusBox.style.display = 'block';
            statusBox.style.background = '#fef2f2';
            statusBox.style.color = '#991b1b';
            statusBox.style.border = '1px solid #fecaca';
            statusBox.innerHTML = '✗ <strong>Błąd AI:</strong> ' + safeErr + '<br><small>Możesz wysłać treść w obecnej postaci lub spróbować ponownie.</small>';
          } else {
            alert('Błąd AI: ' + safeErr);
          }
        })
        .polishMessageWithAi(${JSON.stringify(params.ticketId)}, currentText);
    }
  </script>
</body>
</html>`;

  const uiOutput = HtmlService.createHtmlOutput(html).setWidth(640).setHeight(560);
  SpreadsheetApp.getUi().showModalDialog(uiOutput, `SmartCare – Przygotowanie wiadomości e-mail`);
}

/**
 * Serwerowa kontrola jakości treści wiadomości przed wysyłką (v0.2.8)
 * Bezwzględnie blokuje wysyłkę obraźliwych, agresywnych, sarkastycznych lub wulgarnych treści,
 * również wtedy, gdy pracownik nie skorzystał z asystenta AI.
 *
 * @param {string} subject Temat wiadomości
 * @param {string} body Treść wiadomości
 * @returns {{ isValid: boolean, reason?: string }}
 */
function validateMessageContentQuality(subject, body) {
  const fullText = `${subject || ""} ${body || ""}`.toLowerCase();

  // 1. Wykrywanie wulgaryzmów i przekleństw w języku polskim
  const vulgarities = [
    /\bkurw/i,
    /\bchuj/i,
    /\bpierdol/i,
    /\bjeb/i,
    /\bgówn/i,
    /\bspierdal/i,
    /\bspieprz/i,
    /\bpieprz/i,
    /\bsuk/i,
    /\bpedał/i,
    /\bciul/i,
    /\bdupek/i
  ];

  for (let pattern of vulgarities) {
    if (pattern.test(fullText)) {
      return {
        isValid: false,
        reason: "wykryto niedopuszczalne wulgaryzmy lub przekleństwa"
      };
    }
  }

  // 2. Wykrywanie agresji, obelg, sarkazmu i lekceważenia mieszkańca
  const offensiveTerms = [
    /\bidiot/i,
    /\bkretyn/i,
    /\bdebil/i,
    /\bpacan/i,
    /\bdziad/i,
    /\bspieprzaj dziadu\b/i,
    /\bbaran/i,
    /\bbezczeln/i,
    /\bdurn/i,
    /\boszust/i,
    /\bkłamc/i,
    /\bzłodziej/i,
    /\bwynoś się\b/i,
    /\bspadaj\b/i,
    /\bmorda\b/i,
    /\bzamknij się\b/i,
    /\bgłupek/i,
    /\bnie zawracaj głowy\b/i,
    /\bwasza wina i tyle\b/i,
    /\bjak się nie podoba\b/i
  ];

  for (let pattern of offensiveTerms) {
    if (pattern.test(fullText)) {
      return {
        isValid: false,
        reason: "wykryto agresywne, obraźliwe lub lekceważące sformułowania wobec mieszkańca"
      };
    }
  }

  return { isValid: true };
}

/**
 * Backend wysyłki poczty z BEZWARUNKOWĄ blokadą serwerową, LockService oraz zabezpieczeniem przed duplikatami (v0.2.7)
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
    const targetEmail = APPROVED_TEST_RECIPIENT;

    if (!targetEmail || targetEmail.toLowerCase().trim() !== APPROVED_TEST_RECIPIENT.toLowerCase().trim()) {
      const criticalErr = `BEZWARUNKOWA BLOKADA SERWERA: Próba wysyłki na inny adres niż ${APPROVED_TEST_RECIPIENT} została zablokowana!`;
      Logger.log(criticalErr);
      return {
        success: false,
        error: criticalErr
      };
    }

    // 2. SERWEROWA KONTROLA JAKOŚCI TREŚCI I BLOKADA OBRAŹLIWYCH SFORMUŁOWAŃ (v0.2.8):
    const qualityCheck = validateMessageContentQuality(payload.subject, payload.body);
    if (!qualityCheck.isValid) {
      const blockMsg = `SERWEROWA BLOKADA JAKOŚCI TREŚCI: Wiadomość narusza standardy Customer Experience i PR (${qualityCheck.reason}). Wiadomość NIE została wysłana. Skoryguj treść przed ponowną próbą.`;
      Logger.log(`[Content Quality Guard] ${blockMsg} dla zgłoszenia ${payload.ticketId}.`);
      return {
        success: false,
        error: blockMsg
      };
    }

    // 3. WERYFIKACJA LINKU DO OPINII GOOGLE:
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
        payload.addedReviewRequest = false;
      }
    }

    // 6. Wymuszenie stopki akademickiej WSB Merito
    finalBody += `\n\n------------------------------------------------------------\n` +
      `[WIADOMOŚĆ TESTOWA – PROTOTYP WSB MERITO]\n` +
      `Wiadomość wygenerowana w ramach studenckiego projektu wdrożeniowego ELWOZ ECO SmartCare (v0.2.7).\n` +
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

    // 8. Zapis w HISTORIA KOMUNIKACJI
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
      if (typeof refreshDashboardStats === "function") {
        try { refreshDashboardStats(ss); } catch (_) {}
      }
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
 * Automatyczna kontrola przeterminowanych spraw (SLA) i powiadamianie (v0.2.7)
 */
function checkOverdueTicketsAndNotify() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ticketSheet = ss.getSheetByName("ZGŁOSZENIA");
  if (!ticketSheet || ticketSheet.getLastRow() <= 1) return;

  const data = ticketSheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const now = new Date();

  const idIdx = headers.indexOf("ID Zgłoszenia");
  const statusIdx = headers.indexOf("Status");
  const firstContactIdx = headers.indexOf("Data pierwszego kontaktu");
  const slaDeadlineIdx = headers.indexOf("Termin SLA 1. reakcji");
  const slaOverdueIdx = headers.indexOf("Przekroczenie SLA");

  if (slaDeadlineIdx === -1 || slaOverdueIdx === -1) return;

  const overdueList = [];

  for (let r = 1; r < data.length; r++) {
    const status = String(data[r][statusIdx] || "").trim();
    if (status === "Rozwiązane" || status === "Zamknięte") continue;

    const hasFirstContact = data[r][firstContactIdx] !== null && data[r][firstContactIdx] !== undefined && String(data[r][firstContactIdx]).trim() !== "";
    if (hasFirstContact) continue;

    const deadlineVal = data[r][slaDeadlineIdx];
    if (deadlineVal) {
      const deadline = new Date(deadlineVal);
      if (!isNaN(deadline.getTime()) && deadline < now) {
        ticketSheet.getRange(r + 1, slaOverdueIdx + 1).setValue("TAK");
        overdueList.push(data[r][idIdx]);
      }
    }
  }

  if (overdueList.length > 0) {
    Logger.log(`Wykryto ${overdueList.length} przeterminowanych spraw SLA: ${overdueList.join(", ")}`);
    if (typeof refreshDashboardStats === "function") {
      try { refreshDashboardStats(ss); } catch (_) {}
    }
  }
}

/**
 * Personalizacja wiadomości z użyciem zweryfikowanego modelu Gemini Flash (v0.2.7)
 */
function polishMessageWithAi(ticketId, templateText) {
  let lastError = null;
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      if (attempt > 0) {
        Logger.log(`Ponawianie stylizacji wiadomości przez Gemini API (próba 2/2)...`);
        Utilities.sleep(1000);
      }
      return polishMessageWithAiDirect(ticketId, templateText);
    } catch (err) {
      lastError = err;
      const errMsg = err.message || String(err);
      if (errMsg.includes("401") || errMsg.includes("403") || errMsg.includes("SAFETY") || errMsg.includes("RECITATION")) {
        throw err;
      }
      Logger.log(`Próba stylizacji ${attempt + 1} nie powiodła się: ${String(errMsg).replace(/key=[a-zA-Z0-9_-]+/g, "key=[UKRYTY]")}`);
    }
  }
  throw lastError;
}

/**
 * Bezpośrednie wywołanie Gemini API do stylizacji wiadomości (v0.2.7)
 */
function polishMessageWithAiDirect(ticketId, templateText) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiKey = scriptProperties.getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Brak klucza Gemini API w Script Properties. Użyj gotowego szablonu.");
  }

  const targetModel = (typeof getVerifiedGeminiModel === "function")
    ? getVerifiedGeminiModel(apiKey)
    : ((typeof SMARTCARE_AI_CONFIG !== "undefined" && SMARTCARE_AI_CONFIG.defaultModel) ? SMARTCARE_AI_CONFIG.defaultModel : "gemini-3.6-flash");

  const thinkingConfig = (typeof getThinkingConfigForModel === "function")
    ? getThinkingConfigForModel(targetModel)
    : (String(targetModel).includes("2.5") ? { thinkingBudget: 0 } : { thinkingLevel: "MINIMAL" });

  const cleanTemplate = anonymizeText(templateText);

  const systemPrompt = 
    "Jesteś profesjonalnym asystentem redakcyjnym oraz ekspertem ds. komunikacji Customer Experience (CX) i PR w firmie komunalnej ELWOZ ECO w Kartuzach.\n" +
    "Twoim celem jest wygładzenie stylu, korekta językowa i profesjonalna redakcja poniższej wiadomości roboczej do mieszkańca.\n\n" +
    "BEZWZGLĘDNE ZASADY PROFESJONALNEJ KOMUNIKACJI CX, PR I STANDARDÓW ETYCZNYCH (v0.2.8):\n" +
    "1. CAŁKOWITE ELIMINOWANIE AGRESJI, OBELG I LEKCEWAŻENIA: Bezwzględnie wyklucz wszelkie obelgi, przekleństwa, sformułowania agresywne, pretensjonalne, sarkastyczne, protekcjonalne lub lekceważące mieszkańca (w tym zwroty typu 'pacanie', 'spieprzaj dziadu', 'spadaj', 'idioto', 'durniu').\n" +
    "2. ŁAGODZENIE KONFLIKTÓW: Stosuj deeskalację emocji, wykazując empatię, spokój i profesjonalne zrozumienie dla sytuacji mieszkańca, unikając postawy konfrontacyjnej.\n" +
    "3. ZACHOWANIE POTWIERDZONYCH FAKTÓW I STANOWISKA SPÓŁKI: Zachowaj wyłącznie potwierdzone fakty i merytoryczne stanowisko przedsiębiorstwa. Nie zmieniaj sensu ustaleń faktycznych.\n" +
    "4. KULTURALNE PRZEDSTAWIANIE ODMOWY: Wszelkie odmowy (np. brak wystawionego pojemnika) przedstawiaj kulturalnie, ze spokojnym, życzliwym i rzeczowym wyjaśnieniem przyczyn regulaminowych, bez złośliwości ani pouczania.\n" +
    "5. ZASADA PRAWDY - NIEWYMYŚLANIE FAKTÓW ANI DALSZYCH DZIAŁAŃ: Bezwzględnie nie dopisuj faktów, rzekomych ustaleń z kierowcami, decyzji ani kolejnych działań operacyjnych (np. fikcyjnych podjazdów śmieciarek), które nie wynikają z przekazanego tekstu roboczego.\n" +
    "6. WYMAGANIE UZUPEŁNIENIA INFORMACJI (Gdy notatka nie zawiera wartości merytorycznej): Jeśli przekazany tekst roboczy nie zawiera żadnej merytorycznej wartości informacyjnej (np. zawiera same uwagi emocjonalne lub jest pusty), wygeneruj uprzejmą prośbę o sprecyzowanie szczegółów sprawy zamiast wymyślać fikcyjne ustalenia.\n" +
    "7. POPRAWIAJ GRAMATYKĘ, ORTOGRAFIĘ, INTERPUNKCJĘ I STYL: Dbaj o wysoki standard polszczyzny, powitanie 'Dzień dobry,', uprzejmy zwrot końcowy 'Z poważaniem,' i oficjalne dane kontaktowe do POK w Kartuzach.\n" +
    "8. OCHRONA WIZERUNKU PRZEDSIĘBIORSTWA I PRACOWNIKÓW: Bezwzględnie nie ujawniaj wewnętrznych kar, reprymend, nagan, rozmów dyscyplinujących ani konsekwencji służbowych pracowników lub załóg śmieciarek.\n" +
    "9. USUWAJ PRZYPADKOWE ELEMENTY INTERFEJSU: Wytnij techniczne pozostałości, znaczniki UI lub etykiety formularza (np. '[Opis]', 'ID Zgłoszenia:', 'Pole edytowalne:', 'Wiersz:').\n" +
    "10. OCHRONA PRAWNA SPÓŁKI: NIGDY nie deklaruj formalnego uznania winy spółki ani uznania roszczeń reklamacyjnych. NIGDY nie obiecuj rekompensat finansowych ani bonifikat.\n" +
    "11. ZACHOWAJ NUMER SPRAWY: Zachowaj numer identyfikacyjny zgłoszenia (np. ELW-...) oraz oficjalne dane POK w Kartuzach.\n" +
    "12. Odpowiedź zwróć w formacie JSON z kluczem stylizowanaTresc.";

  const polishSchema = {
    type: "OBJECT",
    properties: {
      stylizowanaTresc: {
        type: "STRING",
        description: "Profesjonalna, wygładzona stylistycznie, poprawna gramatycznie, empatyczna treść wiadomości e-mail do mieszkańca po polsku zgodna z zasadami CX i PR"
      }
    },
    required: ["stylizowanaTresc"]
  };

  const payload = {
    contents: [
      {
        parts: [
          { text: systemPrompt + "\n\nOto treść szablonu do stylistycznego dopracowania:\n" + cleanTemplate }
        ]
      }
    ],
    generationConfig: {
      temperature: 1.0,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: polishSchema,
      thinkingConfig: thinkingConfig
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${apiKey}`;
  
  // Wspólna kontrola limitu zapytań Gemini (v0.2.8)
  if (typeof enforceGeminiRateLimit === "function") {
    enforceGeminiRateLimit(targetModel);
  }

  let response;
  try {
    response = UrlFetchApp.fetch(endpoint, options);
  } catch (netErr) {
    const safeNetMsg = String(netErr).replace(/key=[a-zA-Z0-9_-]+/g, "key=[UKRYTY]");
    throw new Error(`Błąd połączenia z Gemini API: ${safeNetMsg}`);
  }

  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  let headers = {};
  try {
    if (typeof response.getAllHeaders === "function") headers = response.getAllHeaders() || {};
    else if (typeof response.getHeaders === "function") headers = response.getHeaders() || {};
  } catch (_) {}

  const quotaInfo = (typeof parseGeminiQuotaError === "function")
    ? parseGeminiQuotaError(responseCode, responseText, headers)
    : {
        isQuota: responseCode === 429 || (responseText && responseText.includes("RESOURCE_EXHAUSTED")),
        limitType: "RPM",
        retryDelaySec: 60,
        message: "Przekroczono limit zapytań Gemini API (HTTP 429). Aktywowano 60s cooldown."
      };

  if (quotaInfo.isQuota) {
    const cooldownTime = Date.now() + quotaInfo.retryDelaySec * 1000;
    PropertiesService.getScriptProperties().setProperty("GEMINI_BACKOFF_UNTIL", String(cooldownTime));
    PropertiesService.getScriptProperties().setProperty("GEMINI_LAST_QUOTA_TYPE", quotaInfo.limitType);
    throw new Error(`${quotaInfo.message} Odczekaj chwilę i spróbuj ponownie.`);
  }
  if (responseCode === 401 || responseCode === 403) {
    throw new Error("Błąd autoryzacji Gemini API (kod 401/403). Sprawdź klucz API.");
  }
  if (responseCode !== 200) {
    let apiErrMsg = `Kod HTTP ${responseCode}`;
    try {
      const errJson = JSON.parse(responseText);
      if (errJson.error && errJson.error.message) {
        apiErrMsg += `: ${errJson.error.message}`;
      }
    } catch (_) {}
    throw new Error(`API Gemini (${targetModel}) zwróciło błąd: ${apiErrMsg.replace(/key=[a-zA-Z0-9_-]+/g, "key=[UKRYTY]")}`);
  }

  let jsonResponse;
  try {
    jsonResponse = JSON.parse(responseText);
  } catch (_) {
    throw new Error("Nieprawidłowa odpowiedź serwera Gemini.");
  }

  if (!jsonResponse.candidates || !jsonResponse.candidates[0].content) {
    throw new Error("Nieprawidłowa odpowiedź z modelu Gemini.");
  }

  const candidate = jsonResponse.candidates[0];

  if (candidate.finishReason === "SAFETY") {
    throw new Error("Generowanie odpowiedzi zostało zablokowane przez filtry bezpieczeństwa (SAFETY).");
  }
  if (candidate.finishReason === "RECITATION") {
    throw new Error("Generowanie odpowiedzi zostało zablokowane (RECITATION).");
  }
  if (candidate.finishReason === "MAX_TOKENS") {
    throw new Error("Model osiągnął limit tokenów (finishReason: MAX_TOKENS) przed ukończeniem wiadomości.");
  }

  const parts = candidate.content.parts || [];
  const validParts = parts.filter(p => !p.thought && typeof p.text === "string" && p.text.trim() !== "");
  if (validParts.length === 0) {
    throw new Error("Model Gemini nie zwrócił treści wiadomości.");
  }

  const rawText = validParts.map(p => p.text).join("").trim();

  try {
    let cleanJson = rawText;
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    }
    const parsed = JSON.parse(cleanJson);
    if (parsed && typeof parsed.stylizowanaTresc === "string" && parsed.stylizowanaTresc.trim() !== "") {
      return parsed.stylizowanaTresc.trim();
    }
  } catch (_) {}

  return rawText;
}

/**
 * Twarda funkcja anonimizacji tekstu przed przekazaniem do AI
 */
function anonymizeText(text) {
  if (!text) return "";
  return String(text)
    .replace(/kartuzy@elwozeco\.pl/gi, "___POK_EMAIL___")
    .replace(/58\s*681\s*22\s*99/g, "___POK_PHONE1___")
    .replace(/605\s*347\s*455/g, "___POK_PHONE2___")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[E-MAIL USUNIĘTO]")
    .replace(/\b\d{11}\b/g, "[IDENTYFIKATOR USUNIĘTO]")
    .replace(/(?:\+?48[\s-]?)?(?:\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b|\b\d{9}\b)/g, "[NUMER TELEFONU USUNIĘTO]")
    .replace(/___POK_EMAIL___/g, "kartuzy@elwozeco.pl")
    .replace(/___POK_PHONE1___/g, "58 681 22 99")
    .replace(/___POK_PHONE2___/g, "605 347 455");
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


/**
 * ============================================================================
 * AKCJE MENU SMARTCARE v0.2.8
 * ============================================================================
 */

/**
 * Akcja menu: Uruchomienie przetwarzania kolejki AI (v0.2.8)
 */
function actionProcessAiQueue() {
  const ui = SpreadsheetApp.getUi();
  if (typeof processAiAnalysisQueue !== "function") {
    ui.alert("Błąd", "Funkcja processAiAnalysisQueue nie jest dostępna w module ai.gs.", ui.ButtonSet.OK);
    return;
  }
  const res = processAiAnalysisQueue(5);
  const msg = `Przetworzono z kolejki AI: ${res.processedCount} zgłoszeń.\n` +
    `• Zakończone sukcesem: ${res.successCount}\n` +
    `• Błędy / ponowienia: ${res.errorCount}` +
    (res.errors && res.errors.length > 0 ? `\n\nSzczegóły:\n• ${res.errors.join("\n• ")}` : "");
  ui.alert("Kolejka analizy AI (v0.2.8)", msg, ui.ButtonSet.OK);
}

/**
 * Akcja menu: Wykrycie i uzupełnienie brakujących zgłoszeń formularza (v0.2.8)
 */
function actionReconcileTickets() {
  const ui = SpreadsheetApp.getUi();
  if (typeof reconcileUnprocessedFormResponses !== "function") {
    ui.alert("Błąd", "Funkcja reconcileUnprocessedFormResponses nie jest dostępna w setup.gs.", ui.ButtonSet.OK);
    return;
  }
  const res = reconcileUnprocessedFormResponses();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (typeof refreshDashboardStats === "function") {
    try { refreshDashboardStats(ss); } catch (_) {}
  }

  if (res.reconciledCount > 0) {
    ui.alert(
      "Uzupełniono brakujące zgłoszenia (v0.2.8)",
      `Wykryto i pomyślnie uzupełniono ${res.reconciledCount} brakujące(-ych) zgłoszeń z formularza.\n\n` +
      `Nadane identyfikatory: ${res.reconciledIds.join(", ")}\n\n` +
      `Wszystkie sprawy otrzymały status 'Nowe', priorytet 'STANDARDOWY' oraz wstępny termin SLA. Zgłoszenia oczekują na analizę w kolejce AI.`,
      ui.ButtonSet.OK
    );
  } else {
    ui.alert("Kontrola zgłoszeń (v0.2.8)", "Wszystkie odpowiedzi z formularza posiadają już przypisane numery zgłoszeń i dane operacyjne. Nie wykryto braków.", ui.ButtonSet.OK);
  }
}

/**
 * Akcja menu: Weryfikacja integralności Dashboardu i CRM (v0.2.8)
 */
function actionValidateSystem() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (typeof validateDashboardIntegrity !== "function") {
    ui.alert("Błąd", "Funkcja validateDashboardIntegrity nie jest dostępna w setup.gs.", ui.ButtonSet.OK);
    return;
  }
  const validation = validateDashboardIntegrity(ss);
  if (validation.isValid) {
    ui.alert(
      "Kontrola spójności systemu (v0.2.8)",
      `Weryfikacja zakończona pełnym sukcesem!\n\n` +
      `Liczba zgłoszeń w CRM: ${validation.actualTickets}\n` +
      `Wykresy: ${validation.chartsCount}\n` +
      `Ustawienia regionalne: ${validation.locale}\n` +
      `Brak błędów formuł i wskaźników.`,
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      "Ostrzeżenie integralności systemu (v0.2.8)",
      `Wykryto następujące uwagi do rozwiązania:\n• ${validation.errors.join("\n• ")}`,
      ui.ButtonSet.OK
    );
  }
}
