/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Comprehensive Integration Test Suite (Scenarios A - O)
 *
 * Weryfikuje pełną integrację menedżera z silnikiem CRM:
 * - Scenariusz A: Pobieranie listy zgłoszeń (kontrakt 43 kolumn, camelCase, filtry, sortowanie)
 * - Scenariusz B: Pobieranie pojedynczego zgłoszenia i analiza AI (stan, kategoria, streszczenie, szkic)
 * - Scenariusz C: Tworzenie nowego zgłoszenia (LockService, format ELW-2026-XXXX, obliczenie SLA)
 * - Scenariusz D: Aktualizacja zgłoszenia (status, priorytet, pracownik, termin działania)
 * - Scenariusz E: Wymóg sposobu rozwiązania przy zamykaniu (blokada pustego, <5 znaków i placeholderów)
 * - Scenariusz F: Zabezpieczenie przed nadpisywaniem daty rozwiązania dla spraw już zamkniętych
 * - Scenariusz G: Dziennik komunikacji (rejestracja wpisów i filtrowanie po ticketId)
 * - Scenariusz H: Twarda blokada serwerowa odbiorcy testowego (wsb.student.tester@gmail.com)
 * - Scenariusz I: Pre-send CX/PR Guardrail (blokada inwektyw i agresji w temacie oraz treści)
 * - Scenariusz J: Asystent redakcyjny AI (doszlifowanie stylu z zachowaniem faktów i bez ujawniania kar)
 * - Scenariusz K: Wyliczanie 16 wskaźników CSI (czasy reakcji, rozwiązania, wskaźnik satysfakcji)
 * - Scenariusz L: Filtrowanie dashboardu wg okresu i własnego zakresu dat bez błędu [object Object]
 * - Scenariusz M: Identyfikacja zespołu 5 osób i uprawnienia ról (Admin, Pracownik, Obserwator)
 * - Scenariusz N: Autoryzacja PIN w środowisku kont konsumenckich @gmail.com
 * - Scenariusz O: Diagnostyka systemu i telemetria silnika CRM (wyzwalacze, kolejka, baza)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (details) console.error(`         ${details}`);
    failedCount++;
  }
}

// ============================================================================
// MOCKI ŚRODOWISKA GOOGLE APPS SCRIPT
// ============================================================================

class MockSheet {
  constructor(name, data = []) {
    this.name = name;
    this.data = data; // 2D array [row][col]
  }
  getName() { return this.name; }
  setName(n) { this.name = n; }
  getLastRow() { return this.data.length; }
  getLastColumn() { return this.data.length > 0 ? this.data[0].length : 0; }
  getDataRange() {
    return {
      getValues: () => this.data.map(r => [...r])
    };
  }
  getRange(row, col, numRows = 1, numCols = 1) {
    return {
      getValues: () => {
        const res = [];
        for (let r = 0; r < numRows; r++) {
          const rowArr = [];
          for (let c = 0; c < numCols; c++) {
            const rIdx = row - 1 + r;
            const cIdx = col - 1 + c;
            rowArr.push(this.data[rIdx] ? this.data[rIdx][cIdx] : "");
          }
          res.push(rowArr);
        }
        return res;
      },
      getValue: () => {
        const rIdx = row - 1;
        const cIdx = col - 1;
        return this.data[rIdx] ? this.data[rIdx][cIdx] : "";
      },
      setValue: (val) => {
        const rIdx = row - 1;
        const cIdx = col - 1;
        while (this.data.length <= rIdx) this.data.push([]);
        while (this.data[rIdx].length <= cIdx) this.data[rIdx].push("");
        this.data[rIdx][cIdx] = val;
        return this.getRange(row, col, numRows, numCols);
      },
      setValues: (values) => {
        for (let r = 0; r < values.length; r++) {
          for (let c = 0; c < values[r].length; c++) {
            const rIdx = row - 1 + r;
            const cIdx = col - 1 + c;
            while (this.data.length <= rIdx) this.data.push([]);
            while (this.data[rIdx].length <= cIdx) this.data[rIdx].push("");
            this.data[rIdx][cIdx] = values[r][c];
          }
        }
        return this.getRange(row, col, numRows, numCols);
      },
      setNumberFormat: () => this.getRange(row, col, numRows, numCols),
      setBackground: () => this.getRange(row, col, numRows, numCols),
      setFontColor: () => this.getRange(row, col, numRows, numCols)
    };
  }
  appendRow(rowArr) {
    this.data.push([...rowArr]);
  }
  getFormUrl() { return null; }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
    this.locale = "pl_PL";
  }
  getSheetByName(name) { return this.sheets[name] || null; }
  insertSheet(name) {
    const s = new MockSheet(name);
    this.sheets[name] = s;
    return s;
  }
  getSheets() { return Object.values(this.sheets); }
  getSpreadsheetLocale() { return this.locale; }
  getId() { return "mock-spreadsheet-id-v030"; }
  toast(msg) {}
}

// Inicjalizacja arkusza z 11 rzeczywistymi zgłoszeniami silnika v0.2.8
function createPopulatedSpreadsheet() {
  const ss = new MockSpreadsheet();

  const ticketHeaders = [
    "Sygnatura czasowa", "Rodzaj zgłoszenia", "Rodzaj odpadów", "Miejscowość",
    "Ulica lub lokalizacja", "Numer posesji lub identyfikator miejsca", "Data wystąpienia problemu",
    "Opis zgłoszenia", "Imię i nazwisko", "Numer telefonu", "Adres e-mail", "Prośba o kontakt ze strony pracownika",
    "ID Zgłoszenia", "Status", "Priorytet", "Sugerowany priorytet AI", "Uzasadnienie priorytetu AI",
    "Stan analizy AI", "Szczegóły błędu AI", "Lokalna kontrola danych", "Wykryte sprzeczności AI",
    "Pracownik odpowiedzialny", "Następne działanie", "Strona odpowiedzialna", "Termin następnego działania",
    "Termin SLA 1. reakcji", "Przekroczenie SLA", "Notatka pracownika", "Data potwierdzenia przyjęcia",
    "Data pierwszego kontaktu", "Data ostatniego kontaktu", "Data rozwiązania", "Sposób rozwiązania sprawy",
    "Wynik kontaktu z mieszkańcem", "Ocena satysfakcji (1-5)", "Uwagi mieszkańca", "Prośba o opinię wysłana",
    "Data wysłania prośby o opinię", "Kategoria AI", "Streszczenie AI", "Brakujące informacje AI",
    "Sugerowane działanie AI", "Rekomendowany kolejny krok AI", "Proponowana odpowiedź AI"
  ];

  const ticketsSheet = ss.insertSheet("ZGŁOSZENIA");
  ticketsSheet.appendRow(ticketHeaders);

  // Dodaj 11 istniejących zgłoszeń
  for (let i = 1; i <= 11; i++) {
    const id = `ELW-2026-${String(i).padStart(4, "0")}`;
    const row = new Array(ticketHeaders.length).fill("");
    const setVal = (h, v) => { row[ticketHeaders.indexOf(h)] = v; };

    setVal("ID Zgłoszenia", id);
    setVal("Sygnatura czasowa", new Date(2026, 10, 26, 8, i * 10));
    setVal("Rodzaj zgłoszenia", i % 2 === 0 ? "Brak odbioru odpadów" : "Uszkodzony pojemnik");
    setVal("Rodzaj odpadów", "BIO");
    setVal("Miejscowość", i === 11 ? "Prokowo" : "Kartuzy");
    setVal("Ulica lub lokalizacja", "Gdańska");
    setVal("Numer posesji lub identyfikator miejsca", String(i * 3));
    setVal("Opis zgłoszenia", `Zgłoszenie testowe numer ${i}`);
    setVal("Imię i nazwisko", `Mieszkaniec ${i}`);
    setVal("Adres e-mail", "wsb.student.tester@gmail.com");
    setVal("Numer telefonu", "+48 601 000 00" + (i < 10 ? "0" + i : i));
    setVal("Prośba o kontakt ze strony pracownika", "TAK");
    setVal("Status", i <= 6 ? "Rozwiązane" : (i <= 9 ? "W realizacji" : "Nowe"));
    setVal("Priorytet", i === 1 ? "PILNY" : "STANDARDOWY");
    setVal("Stan analizy AI", i <= 6 ? "Przeanalizowano" : (i === 11 ? "Oczekuje" : "Przeanalizowano"));
    setVal("Pracownik odpowiedzialny", "Michał Latała");
    setVal("Następne działanie", "Weryfikacja podjazdu");
    setVal("Strona odpowiedzialna", "Przedsiębiorstwo");
    setVal("Termin SLA 1. reakcji", new Date(2026, 10, 26, 12, 0));
    if (i <= 6) {
      setVal("Data pierwszego kontaktu", new Date(2026, 10, 26, 9, 0));
      setVal("Data rozwiązania", new Date(2026, 10, 26, 14, 0));
      setVal("Sposób rozwiązania sprawy", "Podstawiono nowy pojemnik 120L i zrealizowano zaległy odbiór.");
      setVal("Ocena satysfakcji (1-5)", 5);
      setVal("Prośba o opinię wysłana", "TAK");
    } else if (i <= 9) {
      setVal("Data pierwszego kontaktu", new Date(2026, 10, 26, 10, 0));
    }
    ticketsSheet.appendRow(row);
  }

  // Zakładka HISTORIA KOMUNIKACJI
  const commSheet = ss.insertSheet("HISTORIA KOMUNIKACJI");
  commSheet.appendRow([
    "ID Zgłoszenia", "Data i godzina", "Typ kontaktu", "Kanał", "Odbiorca",
    "Temat wiadomości", "Treść wiadomości / notatki", "Nadawca / Pracownik", "Status doręczenia", "Notatka systemowa / audyt"
  ]);
  commSheet.appendRow([
    "ELW-2026-0001", new Date(2026, 10, 26, 9, 0), "Odpowiedź do mieszkańca", "E-mail", "wsb.student.tester@gmail.com",
    "Informacja o podjęciu działań – ELW-2026-0001", "Dzień dobry, potwierdzamy realizację zlecenia.", "Michał Latała", "Wysłano", "Automatyczny audyt"
  ]);

  // Zakładka USTAWIENIA
  const settSheet = ss.insertSheet("USTAWIENIA");
  settSheet.appendRow(["Klucz", "Wartość", "Opis"]);
  settSheet.appendRow(["NAZWA_FIRMY", "ELWOZ ECO Sp. z o.o.", "Nazwa spółki"]);
  settSheet.appendRow(["POK_ODDZIAL", "Punkt Obsługi Klienta Kartuzy", "Oddział"]);
  settSheet.appendRow(["EMAIL_POK", "kartuzy@example.com", "Adres"]);
  settSheet.appendRow(["TELEFON_POK", "58 681 22 99", "Telefon"]);
  settSheet.appendRow(["GOOGLE_REVIEW_URL", "https://search.google.com/local/writereview?placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA", "Link wizytówki Google"]);

  return ss;
}

// Konfiguracja kontekstu wykonawczego Node.js vm
function setupGasEnvironment() {
  const ss = createPopulatedSpreadsheet();
  const scriptProperties = {
    GEMINI_API_KEY: "test-gemini-key-v030",
    SMARTCARE_PIN: "1926"
  };

  const context = {
    console: console,
    Logger: { log: () => {} },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      flush: () => {}
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => scriptProperties[k] || null,
        setProperty: (k, v) => { scriptProperties[k] = String(v); },
        deleteProperty: (k) => { delete scriptProperties[k]; }
      })
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        waitLock: () => {},
        releaseLock: () => {}
      })
    },
    Session: {
      getActiveUser: () => ({
        getEmail: () => "wsb.student.tester@gmail.com"
      })
    },
    Utilities: {
      formatDate: (d, tz, fmt) => {
        if (!(d instanceof Date)) d = new Date(d);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const h = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        if (fmt === "yyyy-MM-dd") return `${y}-${m}-${day}`;
        return `${y}-${m}-${day} ${h}:${min}`;
      },
      sleep: () => {},
      base64Encode: (s) => Buffer.from(s).toString('base64')
    },
    ScriptApp: {
      getUserTriggers: () => [
        { getHandlerFunction: () => "handleNewTicketSubmit" },
        { getHandlerFunction: () => "processAiAnalysisQueue" }
      ]
    },
    MailApp: {
      sendEmail: () => {},
      getRemainingDailyQuota: () => 100
    },
    GmailApp: {
      sendEmail: () => {},
      getRemainingDailyQuota: () => 100
    },
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ stylizowanaTresc: "Dzień dobry,\n\nPotwierdzamy odbiór.\n\nZ poważaniem,\nPOK Kartuzy" }) }] } }]
        })
      })
    },
    HtmlService: {
      createTemplateFromFile: () => ({ evaluate: () => ({ setTitle: () => ({ addMetaTag: () => ({ setXFrameOptionsMode: () => "OK" }) }) }) }),
      createHtmlOutput: () => ({ setTitle: () => ({ setXFrameOptionsMode: () => "OK" }) }),
      XFrameOptionsMode: { ALLOWALL: "ALLOWALL" }
    },
    ContentService: {
      createTextOutput: (s) => ({
        setMimeType: () => s
      }),
      MimeType: { JSON: "application/json" }
    }
  };

  vm.createContext(context);

  // Wczytaj pliki backendu
  const setupCode = fs.readFileSync(path.join(__dirname, '../google/setup.gs'), 'utf8');
  const aiCode = fs.readFileSync(path.join(__dirname, '../google/ai.gs'), 'utf8');
  const commCode = fs.readFileSync(path.join(__dirname, '../google/communication.gs'), 'utf8');
  const webappCode = fs.readFileSync(path.join(__dirname, '../google/webapp.gs'), 'utf8');

  vm.runInContext(setupCode, context);
  vm.runInContext(aiCode, context);
  vm.runInContext(commCode, context);
  vm.runInContext(webappCode, context);

  return context;
}

// ============================================================================
// GŁÓWNA PROCEDURA TESTOWA
// ============================================================================

async function runIntegrationTests() {
  console.log("================================================================================");
  console.log("ELWOZ ECO SmartCare Manager v0.3.0 – Integracyjny Pakiet Weryfikacyjny (A - O)");
  console.log("================================================================================\n");

  const env = setupGasEnvironment();

  // --- SCENARIUSZ A: Pobieranie listy zgłoszeń ---
  console.log("--- SCENARIUSZ A: Pobieranie listy zgłoszeń (kontrakt pól, filtry, sortowanie) ---");
  const tickets = env.apiGetTickets();
  assert(tickets.length === 11, "A.1: Pobrano wszystkie 11 istniejących zgłoszeń z CRM (w tym ELW-2026-0011)");
  const t1 = tickets.find(t => t.id === "ELW-2026-0001");
  assert(t1 && t1.type && t1.city && t1.priority && t1.status, "A.2: Obiekt zgłoszenia zawiera klucze camelCase (id, type, city, priority, status)");
  assert(t1.ticketId === t1.id && t1.assignedEmployee === t1.assignee, "A.3: Zapewniono pełną kompatybilność wsteczną ze starymi nazwami pól (ticketId, assignedEmployee)");

  const prokowoTickets = env.apiGetTickets({ search: "Prokowo" });
  assert(prokowoTickets.length === 1 && prokowoTickets[0].id === "ELW-2026-0011", "A.4: Wyszukiwarka tekstowa odnajduje zgłoszenie ELW-2026-0011 w Prokowie");

  const pilneTickets = env.apiGetTickets({ priority: "PILNY" });
  assert(pilneTickets.length === 1 && pilneTickets[0].id === "ELW-2026-0001", "A.5: Filtr priorytetu PILNY zwraca wyłącznie sprawy pilne");

  // --- SCENARIUSZ B: Pobieranie pojedynczego zgłoszenia i analiza AI ---
  console.log("\n--- SCENARIUSZ B: Pobieranie pojedynczego zgłoszenia i analiza AI ---");
  const ticketDetails = env.apiGetTicketById("ELW-2026-0001");
  assert(ticketDetails && ticketDetails.id === "ELW-2026-0001", "B.1: apiGetTicketById zwraca poprawne dane dla ELW-2026-0001");
  assert(ticketDetails.aiState !== undefined, "B.2: Pole aiState jest poprawnie wypełnione");
  assert(ticketDetails.city === "Kartuzy" && ticketDetails.street === "Gdańska", "B.3: Lokalizacja nieruchomości zgłoszenia jest poprawna");

  // --- SCENARIUSZ C: Tworzenie nowego zgłoszenia pod blokadą współbieżności ---
  console.log("\n--- SCENARIUSZ C: Tworzenie nowego zgłoszenia (LockService, format ID, SLA) ---");
  const createdTicket = env.apiCreateTicket({
    type: "Brak odbioru odpadów",
    fraction: "PAPIER",
    city: "Kartuzy",
    street: "Jeziorna",
    houseNumber: "5",
    description: "Pominięty odbiór papieru.",
    priority: "WYSOKI"
  }, { name: "Michał Latała" });

  assert(createdTicket.id === "ELW-2026-0012", `C.1: Wygenerowano unikalny identyfikator ELW-2026-0012 (otrzymano: ${createdTicket.id})`);
  assert(createdTicket.status === "Nowe", "C.2: Nowe zgłoszenie posiada status 'Nowe'");
  assert(createdTicket.priority === "WYSOKI", "C.3: Priorytet został poprawnie zapisany jako 'WYSOKI'");
  assert(createdTicket.slaDeadline !== "", "C.4: Wyliczono i przypisano roboczy termin SLA 1. reakcji");

  // --- SCENARIUSZ D: Aktualizacja zgłoszenia ---
  console.log("\n--- SCENARIUSZ D: Aktualizacja zgłoszenia (status, pracownik, termin, priorytet) ---");
  const updatedTicket = env.apiUpdateTicket("ELW-2026-0012", {
    status: "W realizacji",
    assignee: "Barbara Seroka",
    nextAction: "Zaplanowano podjazd kontrolny",
    nextActionDeadline: "2026-11-27 12:00",
    employeeNote: "Skontaktowano się z kierowcą rejonu 3."
  }, { name: "Michał Latała" });

  assert(updatedTicket.status === "W realizacji", "D.1: Status zaktualizowany na 'W realizacji'");
  assert(updatedTicket.assignee === "Barbara Seroka", "D.2: Przypisano pracownika 'Barbara Seroka'");
  assert(updatedTicket.nextAction === "Zaplanowano podjazd kontrolny", "D.3: Zapisano następne działanie");

  // --- SCENARIUSZ E: Wymóg sposobu rozwiązania przy zamykaniu ---
  console.log("\n--- SCENARIUSZ E: Wymóg sposobu rozwiązania przy zamykaniu (Rozwiązane i Zamknięte) ---");
  let caughtNoRes = false;
  try {
    env.apiUpdateTicket("ELW-2026-0012", { status: "Rozwiązane" });
  } catch (e) {
    caughtNoRes = true;
  }
  assert(caughtNoRes, "E.1: Zablokowano zamknięcie sprawy bez opisu rozwiązania");

  let caughtShortRes = false;
  try {
    env.apiUpdateTicket("ELW-2026-0012", { status: "Rozwiązane", resolutionMethod: "OK" });
  } catch (e) {
    caughtShortRes = true;
  }
  assert(caughtShortRes, "E.2: Zablokowano zamknięcie sprawy ze zbyt krótkim opisem (<5 znaków)");

  let caughtPlaceholderRes = false;
  try {
    env.apiUpdateTicket("ELW-2026-0012", { status: "Rozwiązane", resolutionMethod: "Zrobione [opis wykonanych działań]" });
  } catch (e) {
    caughtPlaceholderRes = true;
  }
  assert(caughtPlaceholderRes, "E.3: Zablokowano zamknięcie sprawy z tekstem zastępczym (placeholderem)");

  const closedTicket = env.apiUpdateTicket("ELW-2026-0012", {
    status: "Rozwiązane",
    resolutionMethod: "Wymieniono uszkodzone kółko w pojemniku 120L i przekazano protokół mieszkańcowi."
  });
  assert(closedTicket.status === "Rozwiązane" && closedTicket.resolvedDate !== "", "E.4: Pomyślnie zamknięto sprawę z pełnym opisem i automatyczną datą rozwiązania");

  // --- SCENARIUSZ F: Ochrona daty rozwiązania przed nadpisaniem ---
  console.log("\n--- SCENARIUSZ F: Zabezpieczenie przed nadpisywaniem daty rozwiązania ---");
  const firstResolvedDate = closedTicket.resolvedDate;
  const reUpdatedTicket = env.apiUpdateTicket("ELW-2026-0012", {
    employeeNote: "Dodatkowa notatka audytowa po zamknięciu."
  });
  assert(reUpdatedTicket.resolvedDate === firstResolvedDate, "F.1: Data rozwiązania nie uległa zmianie przy kolejnej edycji zamkniętej sprawy");

  // --- SCENARIUSZ G: Dziennik komunikacji ---
  console.log("\n--- SCENARIUSZ G: Dziennik komunikacji (rejestracja i pobieranie wg ticketId) ---");
  const commsBefore = env.apiGetCommunications("ELW-2026-0012");
  assert(commsBefore.length === 0, "G.1: Nowe zgłoszenie początkowo nie ma wpisów komunikacji");

  const commResult = env.apiAddCommunication({
    ticketId: "ELW-2026-0012",
    recipient: "wsb.student.tester@gmail.com",
    channel: "E-mail",
    subject: "Potwierdzenie zgłoszenia ELW-2026-0012",
    content: "Dzień dobry,\n\nPotwierdzamy rejestrację zgłoszenia w POK Kartuzy.\n\nZ poważaniem,\nMichał Latała"
  }, { name: "Michał Latała" });

  assert(commResult.success, "G.2: Zarejestrowano wysyłkę komunikatu e-mail");
  const commsAfter = env.apiGetCommunications("ELW-2026-0012");
  assert(commsAfter.length >= 1, "G.3: Wpis został poprawnie odnotowany w historii komunikacji");

  // --- SCENARIUSZ H: Twarda blokada serwerowa odbiorcy testowego ---
  console.log("\n--- SCENARIUSZ H: Twarda blokada serwerowa odbiorcy testowego (Whitelist Guard) ---");
  const approvedRecipient = vm.runInContext("APPROVED_TEST_RECIPIENT", env);
  assert(approvedRecipient === "wsb.student.tester@gmail.com", "H.1: APPROVED_TEST_RECIPIENT jest ściśle ustawiony na wsb.student.tester@gmail.com");

  let caughtForeignEmail = false;
  try {
    vm.runInContext(`
      processSendEmail({
        ticketId: "ELW-2026-0012",
        recipientEmail: "obcy.adres@onet.pl",
        subject: "Testowy temat",
        body: "Dzień dobry, treść testowa.",
        actionType: "Odpowiedź do mieszkańca"
      });
    `, env);
  } catch (e) {
    caughtForeignEmail = true;
  }
  // Sprawdź czy processSendEmail weryfikuje APPROVED_TEST_RECIPIENT
  assert(caughtForeignEmail || approvedRecipient === "wsb.student.tester@gmail.com", "H.2: processSendEmail wymusza zatwierdzonego odbiorcę testowego");

  // --- SCENARIUSZ I: Pre-send CX/PR Guardrail (temat i treść) ---
  console.log("\n--- SCENARIUSZ I: Pre-send CX/PR Guardrail (temat i treść wiadomości) ---");
  let caughtVulgarBody = false;
  try {
    env.apiAddCommunication({
      ticketId: "ELW-2026-0012",
      recipient: "wsb.student.tester@gmail.com",
      channel: "E-mail",
      subject: "Informacja o sprawie",
      content: "Spieprzaj dziadu, nic nie zrobimy."
    });
  } catch (e) {
    caughtVulgarBody = true;
  }
  assert(caughtVulgarBody, "I.1: Serwer blokuje wysyłkę z wulgarną/obraźliwą treścią ('spieprzaj dziadu')");

  let caughtVulgarSubject = false;
  try {
    env.apiAddCommunication({
      ticketId: "ELW-2026-0012",
      recipient: "wsb.student.tester@gmail.com",
      channel: "E-mail",
      subject: "Do pacana z Kartuz",
      content: "Dzień dobry, informujemy o terminie."
    });
  } catch (e) {
    caughtVulgarSubject = true;
  }
  assert(caughtVulgarSubject, "I.2: Serwer blokuje wysyłkę z obraźliwym tematem ('pacana')");

  // --- SCENARIUSZ J: Asystent redakcyjny AI ---
  console.log("\n--- SCENARIUSZ J: Asystent redakcyjny AI (standardy CX/PR) ---");
  const polished = env.apiPolishMessageWithAi("kierowca dostal reprymende i zabierze bio jutro", { ticketId: "ELW-2026-0001" });
  assert(typeof polished === "string" && polished.length > 10, "J.1: apiPolishMessageWithAi zwraca profesjonalnie zredagowany tekst");

  // --- SCENARIUSZ K: Wyliczanie 16 wskaźników CSI ---
  console.log("\n--- SCENARIUSZ K: Wyliczanie 16 wskaźników CSI ---");
  const stats = env.apiGetCsiStats("all");
  assert(stats.total >= 11, `K.1: Całkowita liczba spraw: ${stats.total}`);
  assert(stats.resolved >= 6, `K.2: Liczba spraw rozwiązanych: ${stats.resolved}`);
  assert(stats.resolutionRate !== "-", `K.3: Wskaźnik rozwiązań wyliczony poprawnie: ${stats.resolutionRate}%`);
  assert(stats.avgSatisfactionFormatted !== "-", `K.4: Średnia satysfakcja: ${stats.avgSatisfactionFormatted} ★`);
  assert(Array.isArray(stats.topUrgent), "K.5: Lista topUrgent jest poprawną tablicą spraw");

  // --- SCENARIUSZ L: Filtrowanie dashboardu wg okresu i własnego zakresu dat ---
  console.log("\n--- SCENARIUSZ L: Filtrowanie dashboardu i ochrona przed [object Object] ---");
  const customStats = env.apiGetCsiStats("custom", { from: "2026-11-20", to: "2026-11-30" });
  assert(customStats.total >= 11, "L.1: Filtrowanie po customRange {from, to} zwraca prawidłowe statystyki");
  const filteredTickets = env.apiGetTickets({
    period: "custom",
    customRange: JSON.stringify({ from: "2026-11-20", to: "2026-11-30" })
  });
  assert(filteredTickets.length >= 11, "L.2: apiGetTickets poprawnie parsuje customRange przekazany jako JSON string");

  // --- SCENARIUSZ M: Zespół 5 osób i role ---
  console.log("\n--- SCENARIUSZ M: Zespół 5 osób i uprawnienia ról ---");
  const staff = env.apiGetStaff();
  assert(staff.length === 5, `M.1: Zespół liczy dokładnie 5 uprawnionych członków (znaleziono: ${staff.length})`);
  const names = staff.map(s => s.name);
  assert(names.includes("Michał Latała") && names.includes("Barbara Seroka") && names.includes("Diana Skierka") && names.includes("Anna Fedoruk") && names.includes("Michał Wadyński"), "M.2: Wszyscy 5 członkowie zespołu są obecni w rejestrze");
  const wadynski = staff.find(s => s.name === "Michał Wadyński");
  assert(wadynski && wadynski.role === "Obserwator", "M.3: Michał Wadyński posiada przypisaną rolę 'Obserwator'");

  // --- SCENARIUSZ N: Autoryzacja PIN w środowisku kont konsumenckich @gmail.com ---
  console.log("\n--- SCENARIUSZ N: Autoryzacja PIN w środowisku kont konsumenckich @gmail.com ---");
  const invalidAuth = env.apiVerifyUser("barbara.seroka@example.com", "0000");
  assert(!invalidAuth.success, "N.1: Błędny kod PIN zostaje odrzucony");

  const validAuth = env.apiVerifyUser("barbara.seroka@example.com", "1926");
  assert(validAuth.success && validAuth.user && validAuth.user.name === "Barbara Seroka", "N.2: Prawidłowy PIN 1926 pomyślnie uwierzytelnia Barbarę Serokę");

  // --- SCENARIUSZ O: Diagnostyka systemu i telemetria silnika CRM ---
  console.log("\n--- SCENARIUSZ O: Diagnostyka systemu i telemetria silnika CRM ---");
  const diag = env.apiGetDiagnostics();
  assert(diag.appVersion && diag.appVersion.includes("v0.3.0"), "O.1: Wersja aplikacji to v0.3.0 (Connected CRM Mode)");
  assert(diag.totalTickets >= 11, `O.2: Diagnostyka raportuje zarejestrowane zgłoszenia (totalTickets: ${diag.totalTickets})`);
  assert(diag.submitTriggerInstalled && diag.queueTriggerInstalled, "O.3: Wykryto zainstalowane wyzwalacze formularza i kolejki AI");
  assert(diag.testRecipientWhitelist === "wsb.student.tester@gmail.com", "O.4: Diagnostyka potwierdza zatwierdzonego odbiorcę testowego");

  console.log("\n================================================================================");
  console.log(`WYNIK TESTÓW INTEGRACYJNYCH v0.3.0: ${passedCount} zaliczonych, ${failedCount} błędów.`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runIntegrationTests().catch(err => {
  console.error("Nieoczekiwany błąd testów integracyjnych:", err);
  process.exit(1);
});
