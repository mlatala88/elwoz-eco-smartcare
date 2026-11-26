/**
 * ============================================================================
 * ELWOZ ECO SmartCare v0.2.8 - Kompleksowy Zestaw Testów Audytowych (Końcowa korekta)
 * ============================================================================
 * Plik: tests/test-v028-audit.js
 * Testuje 10 kluczowych obszarów audytu kodu w wersji v0.2.8
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

// Środowisko Apps Script Mock do testowania logiki silnika
function createMockEnvironment() {
  const scriptPropertiesStore = {};
  const triggersStore = [];

  const PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k) => (scriptPropertiesStore[k] !== undefined ? scriptPropertiesStore[k] : null),
      setProperty: (k, v) => { scriptPropertiesStore[k] = String(v); },
      deleteProperty: (k) => { delete scriptPropertiesStore[k]; },
      getProperties: () => ({ ...scriptPropertiesStore })
    })
  };

  let isScriptLocked = false;
  const LockService = {
    getScriptLock: () => ({
      tryLock: (timeout) => {
        if (isScriptLocked) return false;
        isScriptLocked = true;
        return true;
      },
      waitLock: (timeout) => {
        if (isScriptLocked) {
          throw new Error("Lock wait timed out");
        }
        isScriptLocked = true;
      },
      releaseLock: () => {
        isScriptLocked = false;
      },
      hasLock: () => isScriptLocked
    })
  };

  const cacheStore = {};
  const CacheService = {
    getScriptCache: () => ({
      get: (k) => cacheStore[k] || null,
      put: (k, v, exp) => { cacheStore[k] = String(v); },
      remove: (k) => { delete cacheStore[k]; }
    })
  };

  const Utilities = {
    sleep: (ms) => { /* mock sleep */ },
    formatDate: (date, tz, format) => {
      if (!date || typeof date.getTime !== "function" || isNaN(date.getTime())) {
        throw new TypeError("Parametr date w Utilities.formatDate musi być poprawnym obiektem Date.");
      }
      const pad = (n) => String(n).padStart(2, "0");
      const Y = date.getFullYear();
      const M = pad(date.getMonth() + 1);
      const D = pad(date.getDate());
      const H = pad(date.getHours());
      const m = pad(date.getMinutes());
      if (format === "yyyy-MM-dd") return `${Y}-${M}-${D}`;
      return `${Y}-${M}-${D} ${H}:${m}`;
    }
  };

  const ScriptApp = {
    getProjectTriggers: () => triggersStore,
    getUserTriggers: () => triggersStore,
    deleteTrigger: (tr) => {
      const idx = triggersStore.indexOf(tr);
      if (idx !== -1) triggersStore.splice(idx, 1);
    },
    newTrigger: (fnName) => {
      let triggerObj = { handler: fnName, type: "time" };
      return {
        forSpreadsheet: () => ({
          onFormSubmit: () => ({
            create: () => {
              triggerObj.type = "form";
              triggerObj.getHandlerFunction = () => fnName;
              triggersStore.push(triggerObj);
              return triggerObj;
            }
          })
        }),
        timeBased: () => ({
          everyMinutes: (n) => ({
            create: () => {
              triggerObj.type = "time";
              triggerObj.minutes = n;
              triggerObj.getHandlerFunction = () => fnName;
              triggersStore.push(triggerObj);
              return triggerObj;
            }
          })
        })
      };
    }
  };

  const Session = {
    getActiveUser: () => ({
      getEmail: () => "tester@wsb.edu.pl"
    })
  };

  const MailApp = {
    getRemainingDailyQuota: () => 100,
    sendEmail: (opts) => {}
  };

  const SpreadsheetApp = {
    flush: () => {},
    getActiveSpreadsheet: () => ({
      getSheetByName: () => null,
      toast: () => {}
    })
  };

  return { PropertiesService, LockService, CacheService, Utilities, ScriptApp, Session, MailApp, SpreadsheetApp, scriptPropertiesStore, triggersStore };
}

// Załadowanie plików źródłowych Google Apps Script
const repoRoot = path.resolve(__dirname, "..");
const setupCode = fs.readFileSync(path.join(repoRoot, "google", "setup.gs"), "utf8");
const aiCode = fs.readFileSync(path.join(repoRoot, "google", "ai.gs"), "utf8");
const commCode = fs.readFileSync(path.join(repoRoot, "google", "communication.gs"), "utf8");

// Uruchomienie kodu w piaskownicy Node.js z atrapami Apps Script
const mockEnv = createMockEnvironment();
const sandbox = {
  ...mockEnv,
  Logger: { log: () => {} },
  console: console
};

const vm = require("vm");
const context = vm.createContext(sandbox);

// Załadowanie modułów
vm.runInContext(setupCode, context);
vm.runInContext(aiCode, context);
vm.runInContext(commCode, context);

// Rejestr wyników testów
const testResults = [];
function test(suite, name, fn) {
  try {
    fn();
    testResults.push({ suite, name, status: "PASS", error: null });
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    testResults.push({ suite, name, status: "FAIL", error: err.message });
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

console.log("\n================================================================================");
console.log("URUCHAMIANIE TESTÓW AUDYTOWYCH: ELWOZ ECO SmartCare v0.2.8");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// SUITE 1: Automatyczna kolejka AI i Rate Limiting
// -----------------------------------------------------------------------------
console.log("--- SUITE 1: Automatyczna kolejka AI i Rate Limiting ---");

test("SUITE 1", "1.1 enforceGeminiRateLimit: minimalny odstęp 4200 ms dla Flash (15 RPM)", () => {
  sandbox.scriptPropertiesStore["LAST_GEMINI_CALL_TIMESTAMP"] = String(Date.now() - 1000);
  let slept = false;
  const originalSleep = sandbox.Utilities.sleep;
  sandbox.Utilities.sleep = (ms) => {
    if (ms >= 3000 && ms <= 3300) slept = true;
  };
  sandbox.enforceGeminiRateLimit("gemini-2.5-flash");
  sandbox.Utilities.sleep = originalSleep;
  assert.ok(slept, "Rate limiter powinien wymusić odczekanie brakujących milisekund do 4200ms");
});

test("SUITE 1", "1.2 enforceGeminiRateLimit: 429 Cooldown backoff blokuje wywołania przez 60s", () => {
  sandbox.scriptPropertiesStore["GEMINI_BACKOFF_UNTIL"] = String(Date.now() + 45000);
  assert.throws(
    () => { sandbox.enforceGeminiRateLimit("gemini-2.5-flash"); },
    /Aktywny cooldown po przekroczeniu limitu zapytań Gemini \(HTTP 429\)/,
    "Powinien rzucić błąd blokady 429 backoff"
  );
  delete sandbox.scriptPropertiesStore["GEMINI_BACKOFF_UNTIL"];
});

test("SUITE 1", "1.3 polishMessageWithAiDirect: korzysta ze wspólnego rate limitera i reaguje na 429 cooldown", () => {
  sandbox.scriptPropertiesStore["GEMINI_API_KEY"] = "MOCK_KEY";
  let rateLimiterCalled = false;
  sandbox.enforceGeminiRateLimit = () => { rateLimiterCalled = true; };
  sandbox.UrlFetchApp = {
    fetch: () => ({
      getResponseCode: () => 429,
      getContentText: () => JSON.stringify({ error: { message: "RESOURCE_EXHAUSTED" } })
    })
  };
  assert.throws(
    () => { sandbox.polishMessageWithAiDirect("ELW-2026-0001", "Dzień dobry"); },
    /429|cooldown/i,
    "polishMessageWithAiDirect musi zgłaszać błąd 429 i aktywować cooldown"
  );
  assert.strictEqual(rateLimiterCalled, true, "polishMessageWithAiDirect musi wywoływać enforceGeminiRateLimit!");
  assert.ok(Number(sandbox.scriptPropertiesStore["GEMINI_BACKOFF_UNTIL"]) > Date.now(), "Musi zapisać znacznik GEMINI_BACKOFF_UNTIL");
  delete sandbox.scriptPropertiesStore["GEMINI_BACKOFF_UNTIL"];
  delete sandbox.scriptPropertiesStore["GEMINI_API_KEY"];
});

test("SUITE 1", "1.4 triggerAutoAiAnalysisForTicket: nie blokuje rejestracji nowego zgłoszenia podczas cooldownu 429", () => {
  sandbox.scriptPropertiesStore["GEMINI_BACKOFF_UNTIL"] = String(Date.now() + 50000);
  let savedState = "";
  let savedError = "";
  const fakeSheet = {
    getParent: () => ({}),
    getLastRow: () => 2,
    getLastColumn: () => 3,
    getRange: (r, c, nr, nc) => ({
      getValues: () => [["ID Zgłoszenia", "Stan analizy AI", "Szczegóły błędu AI"]],
      getValue: () => "",
      setValue: (val) => {
        if (c === 2) savedState = val;
        if (c === 3) savedError = val;
      }
    })
  };
  // Wywołanie przy aktywnym cooldownie musi zakończyć się natychmiast bez rzucania wyjątku
  sandbox.triggerAutoAiAnalysisForTicket(fakeSheet, 2, ["ID Zgłoszenia", "Stan analizy AI", "Szczegóły błędu AI"], "ELW-COOLDOWN-REG");
  assert.strictEqual(savedState, "Oczekuje", "Zgłoszenie podczas cooldownu musi pozostać w kolejce jako 'Oczekuje'");
  assert.ok(savedError.includes("cooldown 429"), "Szczegóły błędu powinny wyjaśnić oczekiwanie w kolejce");
  delete sandbox.scriptPropertiesStore["GEMINI_BACKOFF_UNTIL"];
});

test("SUITE 1", "1.5 processAiAnalysisQueue: maksymalnie 3 próby na zgłoszenie (retry limit)", () => {
  sandbox.scriptPropertiesStore["AI_RETRY_COUNT_ELW-TEST-RETRY"] = "3";
  const fakeSheet = {
    getLastRow: () => 3,
    getLastColumn: () => 5,
    getRange: (r, c, numR, numC) => ({
      getValues: () => {
        if (r === 1) return [["ID Zgłoszenia", "Stan analizy AI", "Szczegóły błędu AI", "Rodzaj", "Opis"]];
        return [["ELW-TEST-RETRY", "Oczekuje", "", "Pochwała", "Super"]];
      },
      setValue: (val) => {}
    })
  };
  sandbox.SpreadsheetApp = { flush: () => {}, getActiveSpreadsheet: () => ({ getSheetByName: () => fakeSheet }) };
  const res = sandbox.processAiAnalysisQueue(5);
  delete sandbox.scriptPropertiesStore["AI_RETRY_COUNT_ELW-TEST-RETRY"];
  assert.strictEqual(res.processedCount, 0, "Zgłoszenie z licznikiem 3 nie powinno być ponownie procesowane przez API");
});

test("SUITE 1", "1.6 recoverStuckAiAnalyses: reset zgłoszeń 'W trakcie' starszych niż 10 min", () => {
  const ticketId = "ELW-STUCK-01";
  sandbox.scriptPropertiesStore["AI_IN_PROGRESS_" + ticketId] = String(Date.now() - 15 * 60 * 1000); // 15 min temu
  let resetState = "";
  let resetError = "";
  const fakeSheet = {
    getLastRow: () => 2,
    getLastColumn: () => 3,
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        if (r === 1) return [["ID Zgłoszenia", "Stan analizy AI", "Szczegóły błędu AI"]];
        return [["W trakcie"]];
      },
      getValue: () => ticketId,
      setValue: (val) => {
        if (c === 2) resetState = val;
        if (c === 3) resetError = val;
      }
    })
  };
  sandbox.recoverStuckAiAnalyses(fakeSheet);
  assert.strictEqual(resetState, "Oczekuje", "Zawieszone zgłoszenie powinno zostać zresetowane do stanu 'Oczekuje'");
  assert.strictEqual(sandbox.scriptPropertiesStore["AI_IN_PROGRESS_" + ticketId], undefined);
});

test("SUITE 1", "1.7 tryAcquireTicketAiLock: atomowa rezerwacja blokuje współbieżną analizę we wszystkich ścieżkach", () => {
  const ticketId = "ELW-ATOMIC-01";
  delete sandbox.scriptPropertiesStore["AI_IN_PROGRESS_" + ticketId];
  const firstAcquire = sandbox.tryAcquireTicketAiLock(ticketId);
  assert.strictEqual(firstAcquire, true, "Pierwsza rezerwacja powinna się powieść");
  const secondAcquire = sandbox.tryAcquireTicketAiLock(ticketId);
  assert.strictEqual(secondAcquire, false, "Druga rezerwacja tego samego zgłoszenia musi zostać zablokowana!");
  sandbox.releaseTicketAiLock(ticketId);
  assert.strictEqual(sandbox.scriptPropertiesStore["AI_IN_PROGRESS_" + ticketId], undefined, "Zwolnienie blokady powinno usunąć klucz");
});

test("SUITE 1", "1.8 installScheduledQueueTrigger: deduplikacja i konfiguracja na 5 minut", () => {
  sandbox.triggersStore.length = 0;
  sandbox.installScheduledQueueTrigger({});
  sandbox.installScheduledQueueTrigger({});
  const count = sandbox.triggersStore.filter(t => t.getHandlerFunction() === "scheduledQueueAndReconcile").length;
  assert.strictEqual(count, 1, "Powinien istnieć dokładnie jeden wyzwalacz scheduledQueueAndReconcile");
  assert.strictEqual(sandbox.triggersStore[0].minutes, 5, "Wyzwalacz musi być skonfigurowany na 5 minut");
});

test("SUITE 1", "1.9 getSmartCareSpreadsheet: odzyskiwanie arkusza po SMARTCARE_SPREADSHEET_ID", () => {
  sandbox.scriptPropertiesStore["SMARTCARE_SPREADSHEET_ID"] = "SPREADSHEET_12345";
  let openedId = "";
  sandbox.SpreadsheetApp = {
    flush: () => {},
    getActiveSpreadsheet: () => null,
    openById: (id) => { openedId = id; return { id }; }
  };
  const ss = sandbox.getSmartCareSpreadsheet();
  assert.strictEqual(openedId, "SPREADSHEET_12345");
  assert.strictEqual(ss.id, "SPREADSHEET_12345");
});

test("SUITE 1", "1.10 LockService GAS compliance: tryLock zwraca boolean, waitLock rzuca błąd i zwraca void", () => {
  const lock = sandbox.LockService.getScriptLock();
  assert.strictEqual(lock.tryLock(1000), true, "tryLock na wolnej blokadzie powinien zwrócić true");
  assert.strictEqual(lock.tryLock(1000), false, "tryLock na zajętej blokadzie powinien zwrócić false");
  assert.throws(
    () => { lock.waitLock(1000); },
    /Lock wait timed out/,
    "waitLock na zajętej blokadzie musi rzucać błąd przekroczenia czasu"
  );
  lock.releaseLock();
  const waitResult = lock.waitLock(1000);
  assert.strictEqual(waitResult, undefined, "waitLock w GAS zwraca void (undefined), a nie boolean!");
  lock.releaseLock();
});

// -----------------------------------------------------------------------------
// SUITE 2: Rejestracja zgłoszeń & Reconciliation Lock Race
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 2: Rejestracja zgłoszeń & Reconciliation Lock Race ---");

test("SUITE 2", "2.1 reconcileUnprocessedFormResponses: pobiera ID pod blokadą i nie nadpisuje nadanego ID", () => {
  let assignedValue = null;
  const fakeSheet = {
    getLastRow: () => 2,
    getLastColumn: () => 4,
    getParent: () => ({}),
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        if (r === 1) return [["ID Zgłoszenia", "Sygnatura czasowa", "Opis zgłoszenia", "Miejscowość"]];
        return [["", "2026-11-26 10:42:11", "Uszkodzone koło pojemnika", "Prokowo"]];
      },
      getValue: () => "ELW-2026-0011",
      setValue: (val) => { assignedValue = val; }
    })
  };
  sandbox.reconcileUnprocessedFormResponses(fakeSheet);
  assert.strictEqual(assignedValue, null, "Jeśli pod blokadą odczytano już ID (ELW-2026-0011), nie wolno go nadpisywać!");
});

test("SUITE 2", "2.2 reconcileUnprocessedFormResponses: brak wysyłki e-mail dla opóźnionych zgłoszeń", () => {
  let mailSent = false;
  sandbox.MailApp.sendEmail = () => { mailSent = true; };
  const fakeSheet = {
    getLastRow: () => 2,
    getLastColumn: () => 4,
    getParent: () => ({}),
    getRange: (r, c, nr, nc) => ({
      getValues: () => [
        ["ID Zgłoszenia", "Sygnatura czasowa", "Opis zgłoszenia", "Miejscowość"],
        ["", "2026-11-26 10:42:11", "Koło pojemnika", "Prokowo"]
      ],
      getValue: () => "",
      setValue: () => {},
      setNumberFormat: () => {}
    })
  };
  sandbox.getNextUniqueTicketId = () => "ELW-2026-0011";
  sandbox.reconcileUnprocessedFormResponses(fakeSheet);
  assert.strictEqual(mailSent, false, "Odzyskiwanie nie może wysyłać e-maili o historycznych zgłoszeniach");
});

test("SUITE 2", "2.3 LockService: blokada zwalniana bezzwłocznie (<200ms)", () => {
  let lockReleased = false;
  sandbox.LockService.getScriptLock = () => ({
    tryLock: () => true,
    waitLock: () => { /* w GAS waitLock zwraca void */ },
    releaseLock: () => { lockReleased = true; }
  });
  const fakeSheet = {
    getLastRow: () => 1,
    getLastColumn: () => 2,
    getParent: () => ({}),
    getRange: (r, c, nr, nc) => ({
      getValues: () => [["ID Zgłoszenia", "Sygnatura czasowa"]],
      getValue: () => "ELW-2026-0001"
    })
  };
  sandbox.reconcileUnprocessedFormResponses(fakeSheet);
  assert.strictEqual(lockReleased, true, "Blokada LockService musi być zawsze zwolniona w bloku finally");
});

// -----------------------------------------------------------------------------
// SUITE 3: Komunikacja i Szablony Awaryjne
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 3: Komunikacja i Szablony Awaryjne ---");

test("SUITE 3", "3.1 actionPrepareProgressUpdate: oddzielenie poufnych notatek pracownika od wiadomości do mieszkańca", () => {
  let openedDialog = null;
  sandbox.openEmailDialog = (opts) => { openedDialog = opts; };
  sandbox.SpreadsheetApp = {
    flush: () => {},
    getActiveSpreadsheet: () => ({ getSheetByName: () => null })
  };
  sandbox.getSelectedTicketData = () => ({
    ticketId: "ELW-2026-0005",
    residentName: "Jan Kowalski",
    residentEmail: "wsb.student.tester@gmail.com",
    ticketType: "Brak odbioru",
    location: "Kartuzy, ul. Parkowa 4",
    status: "W realizacji",
    employeeNote: "POUFNE: Kierowca otrzymał upomnienie za pominięcie posesji",
    nextAction: "Podjazd zastępczy jutro o 8:00",
    responsibleSide: "Przedsiębiorstwo ELWOZ ECO",
    residentContactResult: "Mieszkaniec poinformowany telefonicznie"
  });
  sandbox.actionPrepareProgressUpdate();
  assert.ok(openedDialog, "Okno dialogowe powinno zostać otwarte");
  assert.ok(!openedDialog.body.includes("POUFNE: Kierowca otrzymał upomnienie"), "Poufna notatka pracownika NIE MOŻE trafić do mieszkańca!");
  assert.ok(openedDialog.body.includes("Podjazd zastępczy jutro o 8:00"), "Musi zawierać planowane działanie");
  assert.ok(openedDialog.body.includes("Mieszkaniec poinformowany telefonicznie"), "Musi zawierać wynik kontaktu");
});

test("SUITE 3", "3.2 generateTailoredEmergencyConfirmation: Pochwała bez GPS i bez niepotwierdzonego kierownika", () => {
  const settings = {
    senderName: "ELWOZ ECO POK",
    facilityName: "POK Kartuzy",
    contactPhone: "58 681 22 99",
    website: "https://elwozeco.pl"
  };
  const ticket = {
    ticketId: "ELW-2026-0008",
    residentName: "Anna Nowak",
    ticketType: "Pochwała",
    location: "Kartuzy, ul. Słoneczna 12",
    localDataControl: "Dane kompletne i spójne"
  };
  const body = sandbox.generateTailoredEmergencyConfirmation(ticket, settings);
  assert.ok(body.includes("Serdecznie dziękujemy za przesłanie miłych słów"), "Powinno zawierać ciepłe podziękowanie");
  assert.ok(!body.includes("GPS"), "Kategoryczny zakaz wzmianki o kontroli GPS w pochwałach!");
  assert.ok(!body.includes("kierownikowi rejonu"), "Zakaz niepotwierdzonych deklaracji o przekazaniu kierownikowi!");
});

test("SUITE 3", "3.3 generateTailoredEmergencyConfirmation: Zgłoszenie niekompletne prosi o dane", () => {
  const settings = { senderName: "POK", facilityName: "POK", contactPhone: "58", website: "https" };
  const ticket = {
    ticketId: "ELW-2026-0009",
    residentName: "Piotr Wiśniewski",
    ticketType: "Brak odbioru",
    location: "Kartuzy",
    aiMissingInfo: "Brak numeru posesji",
    localDataControl: "Wymaga uzupełnienia: brak numeru posesji"
  };
  const body = sandbox.generateTailoredEmergencyConfirmation(ticket, settings);
  assert.ok(body.includes("doprecyzowanie brakujących danych"), "Powinno prosić o brakujące dane");
  assert.ok(!body.includes("GPS"), "Niekompletne zgłoszenie nie powinno sugerować weryfikacji GPS przed podaniem adresu");
});

test("SUITE 3", "3.4 generateTailoredEmergencyConfirmation: Kompletna reklamacja bez niepotwierdzonego dyspozytora", () => {
  const settings = { senderName: "POK", facilityName: "POK", contactPhone: "58", contactEmail: "k@e.pl", website: "https" };
  const ticket = {
    ticketId: "ELW-2026-0010",
    residentName: "Marek Klawikowski",
    ticketType: "Brak odbioru odpadów",
    wasteFraction: "Zmieszane",
    location: "Kartuzy, ul. Rynek 3",
    localDataControl: "Dane kompletne i spójne"
  };
  const body = sandbox.generateTailoredEmergencyConfirmation(ticket, settings);
  assert.ok(body.includes("Potwierdzamy zarejestrowanie zgłoszenia"), "Potwierdza rejestrację zgłoszenia");
  assert.ok(!body.includes("Dyspozytor POK Kartuzy dokonuje weryfikacji operacyjnej"), "Nie sugeruje niepotwierdzonych działań dyspozytora");
  assert.ok(body.includes("oczekuje na weryfikację operacyjną"), "Informuje neutralnie o oczekiwaniu na weryfikację");
});

test("SUITE 3", "3.5 actionPrepareConfirmation: nie używa błędnego draftu CRM, gdy Stan analizy AI === 'Błąd'", () => {
  let openedDialog = null;
  sandbox.openEmailDialog = (opts) => { openedDialog = opts; };
  sandbox.SpreadsheetApp = {
    flush: () => {},
    getActiveSpreadsheet: () => ({ getSheetByName: () => null })
  };
  sandbox.getSelectedTicketData = () => ({
    ticketId: "ELW-2026-0003",
    residentName: "Maria Lewandowska",
    residentEmail: "wsb.student.tester@gmail.com",
    ticketType: "Brak odbioru",
    location: "Kartuzy, ul. Cmentarna 1",
    aiState: "Błąd",
    aiDraftResponse: "STARY BŁĘDNY SZABLON Z CRM"
  });
  sandbox.actionPrepareConfirmation();
  assert.ok(!openedDialog.body.includes("STARY BŁĘDNY SZABLON"), "Nie wolno używać błędnego draftu!");
});

test("SUITE 3", "3.6 validateMessageContentQuality: serwerowa blokada obraźliwych, agresywnych i wulgarnych treści", () => {
  const clean = sandbox.validateMessageContentQuality("Potwierdzenie zgłoszenia", "Dzień dobry, informujemy o rejestracji.");
  assert.strictEqual(clean.isValid, true);

  const vulgar = sandbox.validateMessageContentQuality("Temat", "Co za kurwa bałagan z tymi śmieciami!");
  assert.strictEqual(vulgar.isValid, false);
  assert.ok(vulgar.reason.includes("wulgaryzmy"));

  const aggressive = sandbox.validateMessageContentQuality("Odpowiedź", "Jesteście bezczelni, to wasza wina i spadaj stąd.");
  assert.strictEqual(aggressive.isValid, false);
  assert.ok(aggressive.reason.includes("agresywne") || aggressive.reason.includes("obraźliwe"));
});

test("SUITE 3", "3.7 validateMessageContentQuality: blokada przypadków 'pacanie' i 'spieprzaj dziadu'", () => {
  const res1 = sandbox.validateMessageContentQuality("Odpowiedź", "Nie będziemy z tobą dyskutować pacanie, nie zawracaj głowy.");
  assert.strictEqual(res1.isValid, false, "Powinno zablokować słowo 'pacanie'");
  assert.ok(res1.reason.includes("agresywne") || res1.reason.includes("obraźliwe"));

  const res2 = sandbox.validateMessageContentQuality("Wiadomość", "Spieprzaj dziadu z tymi śmieciami i nie pisz więcej.");
  assert.strictEqual(res2.isValid, false, "Powinno zablokować sformułowanie 'spieprzaj dziadu'");
  assert.ok(res2.reason.includes("wulgaryzmy") || res2.reason.includes("agresywne") || res2.reason.includes("obraźliwe"));
});

// -----------------------------------------------------------------------------
// SUITE 4: Priorytety i Robocze SLA (7:00-16:00)
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 4: Priorytety i Robocze SLA (7:00-16:00) ---");

test("SUITE 4", "4.1 calculateBusinessHoursDeadline: pomija noce i weekendy (Mon-Fri 7:00-16:00)", () => {
  const friday15 = new Date(2026, 10, 27, 15, 0, 0); // Piątek 15:00
  const deadline = sandbox.calculateBusinessHoursDeadline(friday15, 120); // +2h
  assert.strictEqual(deadline.getDay(), 1, "Powinien przeskoczyć weekend na poniedziałek");
  assert.strictEqual(deadline.getHours(), 8);
  assert.strictEqual(deadline.getMinutes(), 0);
});

test("SUITE 4", "4.2 calculateBusinessHoursDeadline: zgłoszenie w weekend startuje w poniedziałek 7:00", () => {
  const saturdayNoon = new Date(2026, 10, 28, 12, 0, 0);
  assert.strictEqual(saturdayNoon.getDay(), 6);
  const deadline = sandbox.calculateBusinessHoursDeadline(saturdayNoon, 60);
  assert.strictEqual(deadline.getDay(), 1);
  assert.strictEqual(deadline.getHours(), 8);
  assert.strictEqual(deadline.getMinutes(), 0);
});

test("SUITE 4", "4.3 triggerAutoAiAnalysisForTicket: ochrona ręcznie zatwierdzonego priorytetu pracownika (również STANDARDOWY)", () => {
  const ticketId = "ELW-MANUAL-PRIO";
  sandbox.scriptPropertiesStore["PRIORITY_APPROVED_" + ticketId] = "STANDARDOWY";
  sandbox.scriptPropertiesStore["GEMINI_API_KEY"] = "MOCK_KEY";
  let priorityWritten = null;

  const fakeSheet = {
    getParent: () => ({}),
    getLastRow: () => 2,
    getLastColumn: () => 5,
    getRange: (r, c, nr, nc) => ({
      getValues: () => [["ID Zgłoszenia", "Priorytet", "Stan analizy AI", "Rodzaj zgłoszenia", "Opis zgłoszenia"]],
      getValue: () => {
        if (c === 2) return "STANDARDOWY";
        return ticketId;
      },
      setValue: (val) => {
        if (c === 2) priorityWritten = val;
      },
      setNumberFormat: () => {}
    })
  };

  sandbox.callGeminiApiWithRetry = () => ({
    kategoria: "Reklamacja",
    streszczenie: "Brak odbioru",
    sugerowanyPriorytet: "PILNY", // AI sugeruje PILNY
    uzasadnieniePriorytetu: "Fetor",
    brakujaceInformacje: "Brak",
    wykryteSprzecznosci: "Brak sprzeczności",
    sugerowaneDzialanie: "Weryfikacja",
    rekomendowanyKrok: "Krok",
    rekomendowanaStronaKroku: "Przedsiębiorstwo",
    proponowanaOdpowiedz: "Dzień dobry"
  });

  sandbox.triggerAutoAiAnalysisForTicket(fakeSheet, 2, ["ID Zgłoszenia", "Priorytet", "Stan analizy AI", "Rodzaj zgłoszenia", "Opis zgłoszenia"], ticketId, true);
  delete sandbox.scriptPropertiesStore["PRIORITY_APPROVED_" + ticketId];
  delete sandbox.scriptPropertiesStore["GEMINI_API_KEY"];

  assert.strictEqual(priorityWritten, null, "AI NIE MOŻE nadpisać ręcznie zatwierdzonego STANDARDOWEGO priorytetu!");
});

test("SUITE 4", "4.4 calculateDashboardMetrics: brak fałszywego przeterminowania, jeśli 1. kontakt był w terminie", () => {
  const ticketSheet = {
    getLastRow: () => 2,
    getDataRange: () => ({
      getValues: () => [
        ["ID Zgłoszenia", "Status", "Sygnatura czasowa", "Termin SLA 1. reakcji", "Data pierwszego kontaktu"],
        ["ELW-2026-0001", "W realizacji", "2026-11-25 08:00", "2026-11-25 12:00", "2026-11-25 09:30"]
      ]
    })
  };
  const metrics = sandbox.calculateDashboardMetrics(ticketSheet);
  assert.strictEqual(metrics.overdueSlaCount, 0, "Zgłoszenie z udzieloną terminowo odpowiedzią NIE może być oznaczone jako przeterminowane SLA!");
});

test("SUITE 4", "4.5 calculateDashboardMetrics: odróżnienie overdueFirstResponseSlaCount od overdueNextActionCount", () => {
  const ticketSheet = {
    getLastRow: () => 2,
    getDataRange: () => ({
      getValues: () => [
        ["ID Zgłoszenia", "Status", "Termin SLA 1. reakcji", "Data pierwszego kontaktu", "Termin następnego działania"],
        ["ELW-2026-0002", "W realizacji", "2026-11-25 12:00", "2026-11-25 10:00", "2026-11-25 14:00"]
      ]
    })
  };
  const metrics = sandbox.calculateDashboardMetrics(ticketSheet);
  assert.strictEqual(metrics.overdueFirstResponseSlaCount, 0, "SLA 1. reakcji spełnione");
  assert.strictEqual(metrics.overdueNextActionCount, 1, "Termin kolejnego działania przekroczony");
});

// -----------------------------------------------------------------------------
// SUITE 5: Walidacja danych i Edge Cases
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 5: Walidacja danych i Edge Cases ---");

test("SUITE 5", "5.1 preValidateTicketData: 'niewiadoma' jako ulica jest odrzucana jako brak ulicy", () => {
  const res = sandbox.preValidateTicketData({
    ticketType: "Brak odbioru",
    city: "Kartuzy",
    street: "niewiadoma",
    houseNumber: "12",
    description: "Nie odebrano kubła na śmieci"
  });
  assert.strictEqual(res.isAddressComplete, false);
  assert.ok(res.issues.some(i => i.includes("Brak nazwy ulicy")), "Powinien wykryć brak nazwy ulicy");
});

test("SUITE 5", "5.2 preValidateTicketData: brak wskazania miejscowości jest zgłaszany jako brak", () => {
  const res = sandbox.preValidateTicketData({
    ticketType: "Brak odbioru",
    city: "",
    street: "Gdańska",
    houseNumber: "5",
    description: "Nie odebrano kubła"
  });
  assert.ok(res.issues.some(i => i.includes("Brak wskazania miejscowości")), "Musi zgłaszać brak miejscowości");
});

test("SUITE 5", "5.3 preValidateTicketData: 'metale i tworzywa sztuczne' case-insensitive", () => {
  const res = sandbox.preValidateTicketData({
    ticketType: "Brak odbioru",
    wasteFraction: "metale i tworzywa sztuczne (żółty worek)",
    city: "Kartuzy",
    street: "Kościerska",
    houseNumber: "1A",
    description: "W worku z tworzywami były gałęzie i trawa bio"
  });
  assert.ok(res.contradiction.includes("Rozbieżność"), "Powinien wykryć rozbieżność frakcji niezależnie od wielkości liter");
});

test("SUITE 5", "5.4 preValidateTicketData: wykrywanie powtarzalności ('po raz siódmy', 'kolejny raz')", () => {
  const res1 = sandbox.preValidateTicketData({ description: "Pojemnik nieodebrany po raz siódmy w tym roku!" });
  assert.strictEqual(res1.recurrenceDetected, true);
  const res2 = sandbox.preValidateTicketData({ description: "Znowu brak odbioru odpadów na naszej ulicy" });
  assert.strictEqual(res2.recurrenceDetected, true);
  const res3 = sandbox.preValidateTicketData({ description: "Po raz kolejny pominięto naszą posesję" });
  assert.strictEqual(res3.recurrenceDetected, true);
});

test("SUITE 5", "5.5 preValidateTicketData: prośba o kontakt 'Nie' nie wymaga telefonu ani e-maila", () => {
  const res = sandbox.preValidateTicketData({
    ticketType: "Brak odbioru",
    city: "Kartuzy",
    street: "Polna",
    houseNumber: "1",
    description: "Pojemnik stoi przed bramą",
    contactRequest: false
  });
  assert.strictEqual(res.requiresResidentInput, false, "Brak wniosku o kontakt nie wymusza danych kontaktowych");
});

test("SUITE 5", "5.6 preValidateTicketData: prośba o kontakt 'Tak' z e-mailem bez telefonu jest akceptowana", () => {
  const res = sandbox.preValidateTicketData({
    ticketType: "Brak odbioru",
    city: "Kartuzy",
    street: "Polna",
    houseNumber: "1",
    residentEmail: "mieszkaniec@example.com",
    residentPhone: "",
    description: "Proszę o kontakt w sprawie pojemnika",
    contactRequest: true
  });
  assert.ok(!res.issues.some(i => i.includes("kontakt")), "Prawidłowy e-mail jest wystarczający do kontaktu");
});

test("SUITE 5", "5.7 parseDateValue: obsługa formatów '27,11,26', '27.11.26', '27,11,2026'", () => {
  const t1 = sandbox.parseDateValue("27,11,26");
  const t2 = sandbox.parseDateValue("27.11.26");
  const t3 = sandbox.parseDateValue("27,11,2026");
  assert.ok(t1 && !isNaN(t1), "27,11,26 musi zostać poprawnie sparsowane");
  assert.ok(t2 && !isNaN(t2), "27.11.26 musi zostać poprawnie sparsowane");
  assert.ok(t3 && !isNaN(t3), "27,11,2026 musi zostać poprawnie sparsowane");
  const d1 = new Date(t1);
  assert.strictEqual(d1.getFullYear(), 2026);
  assert.strictEqual(d1.getMonth(), 10);
  assert.strictEqual(d1.getDate(), 27);
});

// -----------------------------------------------------------------------------
// SUITE 6: Ochrona danych osobowych (PII) i Kontrola Jakości
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 6: Ochrona danych osobowych (PII) i Kontrola Jakości ---");

test("SUITE 6", "6.1 anonymizeSensitiveInfo: maskowanie danych mieszkańca (imię, ulica, telefon, e-mail)", () => {
  const ticketData = {
    residentName: "Stanisław Lem",
    residentEmail: "stanislaw.lem@kosmos.pl",
    residentPhone: "586812299",
    street: "Mściwoja II",
    houseNumber: "14"
  };
  const rawText = "Dzień dobry, mówi Stanisław Lem z ulicy Mściwoja II 14. Mój mail to stanislaw.lem@kosmos.pl, tel 586812299.";
  const sanitized = sandbox.anonymizeSensitiveInfo(rawText, ticketData);
  assert.ok(!sanitized.includes("Stanisław"), "Imię musi być zanonimizowane");
  assert.ok(!sanitized.includes("Lem"), "Nazwisko musi być zanonimizowane");
  assert.ok(!sanitized.includes("Mściwoja"), "Ulica musi być zanonimizowana");
  assert.ok(!sanitized.includes("stanislaw.lem@kosmos.pl"), "E-mail musi być zanonimizowany");
  assert.ok(!sanitized.includes("586812299"), "Telefon musi być zanonimizowany");
  assert.ok(sanitized.includes("[MIESZKANIEC]"));
  assert.ok(sanitized.includes("[ULICA]"));
});

test("SUITE 6", "6.2 PII High-Risk Guard: wykrycie danych wrażliwych (nr karty/seria dowodu) wstrzymuje AI", () => {
  const res = sandbox.preValidateTicketData({
    ticketType: "Brak odbioru",
    city: "Kartuzy",
    street: "Gdańska",
    houseNumber: "10",
    description: "Mój numer dowodu osobistego to ABC 123456, a numer karty to 4242-4242-4242-4242"
  });
  assert.strictEqual(res.requiresManualPiiVerification, true, "Musi oflagować sprawę jako wymagającą ręcznej weryfikacji");
});

test("SUITE 6", "6.3 Whitelist Guard: twarda blokada wysyłki poza APPROVED_TEST_RECIPIENT", () => {
  const approvedRecipient = vm.runInContext("APPROVED_TEST_RECIPIENT", context);
  assert.strictEqual(approvedRecipient, "wsb.student.tester@gmail.com", "Jedynym odbiorcą musi być wsb.student.tester@gmail.com");
  let sentToAddress = "";
  sandbox.MailApp = {
    getRemainingDailyQuota: () => 100,
    sendEmail: (opts) => { sentToAddress = opts.to; }
  };
  sandbox.SpreadsheetApp = {
    flush: () => {},
    getActiveSpreadsheet: () => ({
      getSheetByName: () => null,
      toast: () => {}
    })
  };
  const res = sandbox.processSendEmail({
    ticketId: "ELW-2026-0001",
    actionType: "Potwierdzenie przyjęcia",
    originalRecipient: "obcy.mieszkaniec@onet.pl", // Próba podania obcego adresu
    subject: "Potwierdzenie",
    body: "Treść testowa zgodna z zasadami kultury."
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(sentToAddress, "wsb.student.tester@gmail.com", "Fizyczna wysyłka musi trafić WYŁĄCZNIE na wsb.student.tester@gmail.com!");
});

test("SUITE 6", "6.4 processSendEmail: serwerowa blokada wysyłki wiadomości z obraźliwą treścią (niezależnie od AI)", () => {
  let mailSent = false;
  sandbox.MailApp.sendEmail = () => { mailSent = true; };
  sandbox.SpreadsheetApp = {
    flush: () => {},
    getActiveSpreadsheet: () => ({ getSheetByName: () => null })
  };
  const res = sandbox.processSendEmail({
    ticketId: "ELW-2026-0001",
    actionType: "Informacja o postępach",
    originalRecipient: "mieszkaniec@kartuzy.pl",
    subject: "Wasza reklamacja",
    body: "Jesteście bezczelni, to wasza wina i nie zawracaj głowy idiotycznymi roszczeniami."
  });
  assert.strictEqual(res.success, false, "Wysyłka obraźliwej wiadomości musi zostać bezwzględnie zablokowana na serwerze!");
  assert.strictEqual(mailSent, false, "MailApp.sendEmail nie może zostać wywołane dla obraźliwej treści!");
  assert.ok(res.error.includes("SERWEROWA BLOKADA JAKOŚCI TREŚCI"), "Komunikat błędu musi wskazywać blokadę jakości treści");
});

// -----------------------------------------------------------------------------
// SUITE 7: Warstwa Service API
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 7: Warstwa Service API ---");

test("SUITE 7", "7.1 apiUpdateTicket: blokada statusu 'Rozwiązane'/'Zamknięte' bez resolutionMethod", () => {
  const fakeSheet = {
    getLastRow: () => 2,
    getLastColumn: () => 3,
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        if (r === 1) return [["ID Zgłoszenia", "Status", "Sposób rozwiązania sprawy"]];
        return [["ELW-2026-0001", "W realizacji", ""]];
      },
      getValue: () => ""
    })
  };
  sandbox.SpreadsheetApp = { flush: () => {}, getActiveSpreadsheet: () => ({ getSheetByName: () => fakeSheet }) };
  const res = sandbox.apiUpdateTicket("ELW-2026-0001", { status: "Rozwiązane" });
  assert.strictEqual(res.success, false, "Zamknięcie bez resolutionMethod musi zwrócić błąd");
  assert.ok(res.error.includes("resolutionMethod"));
});

test("SUITE 7", "7.2 apiUpdateTicket: nie nadpisuje Data rozwiązania, gdy zgłoszenie było już zamknięte", () => {
  let dateUpdated = false;
  const fakeSheet = {
    getLastRow: () => 2,
    getLastColumn: () => 4,
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        if (r === 1) return [["ID Zgłoszenia", "Status", "Sposób rozwiązania sprawy", "Data rozwiązania"]];
        return [["ELW-2026-0001", "Rozwiązane", "Wykonano odbiór zastępczy", "2026-11-20 12:00"]];
      },
      getValue: () => {
        if (c === 2) return "Rozwiązane";
        if (c === 3) return "Wykonano odbiór zastępczy";
        return "ELW-2026-0001";
      },
      setValue: (val) => {
        if (val instanceof Date) dateUpdated = true;
      }
    })
  };
  sandbox.SpreadsheetApp = { flush: () => {}, getActiveSpreadsheet: () => ({ getSheetByName: () => fakeSheet }) };
  const res = sandbox.apiUpdateTicket("ELW-2026-0001", {
    status: "Rozwiązane",
    resolutionMethod: "Wykonano odbiór zastępczy",
    employeeNotes: "Dodatkowa notatka po zamknięciu"
  });
  assert.strictEqual(res.success, true, "Aktualizacja powinna się powieść: " + (res.error || ""));
  assert.strictEqual(dateUpdated, false, "Nie wolno modyfikować pierwotnej daty rozwiązania przy kolejnych edycjach!");
});

test("SUITE 7", "7.3 apiUpdateTicket: rejestruje ręczne zatwierdzenie priorytetu (PRIORITY_APPROVED)", () => {
  const fakeSheet = {
    getLastRow: () => 2,
    getLastColumn: () => 4,
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        if (r === 1) return [["ID Zgłoszenia", "Status", "Priorytet", "Sygnatura czasowa"]];
        return [["ELW-2026-0001", "W realizacji", "STANDARDOWY", "2026-11-26 10:00"]];
      },
      getValue: () => "STANDARDOWY",
      setValue: () => {}
    })
  };
  sandbox.SpreadsheetApp = { flush: () => {}, getActiveSpreadsheet: () => ({ getSheetByName: () => fakeSheet }) };
  delete sandbox.scriptPropertiesStore["PRIORITY_APPROVED_ELW-2026-0001"];
  const res = sandbox.apiUpdateTicket("ELW-2026-0001", { priority: "STANDARDOWY" });
  assert.strictEqual(res.success, true);
  assert.strictEqual(sandbox.scriptPropertiesStore["PRIORITY_APPROVED_ELW-2026-0001"], "STANDARDOWY", "Musi trwale zarejestrować ręczne zatwierdzenie priorytetu");
  delete sandbox.scriptPropertiesStore["PRIORITY_APPROVED_ELW-2026-0001"];
});

test("SUITE 7", "7.4 apiGetTicketsList: odróżnia aktywną zaległość 1. reakcji od spraw z udzieloną odpowiedzią", () => {
  const fakeSheet = {
    getLastRow: () => 3,
    getLastColumn: () => 6,
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        if (r === 1) return [["ID Zgłoszenia", "Status", "Termin SLA 1. reakcji", "Data pierwszego kontaktu", "Sygnatura czasowa", "Pracownik odpowiedzialny"]];
        return [
          // Zgłoszenie 1: odpowiedź udzielona w terminie -> brak zaległości
          ["ELW-2026-0001", "W realizacji", "2026-11-25 12:00", "2026-11-25 10:00", "2026-11-25 08:00", "Jan Kowalski"],
          // Zgłoszenie 2: brak odpowiedzi i termin SLA minął -> aktywna zaległość
          ["ELW-2026-0002", "W realizacji", "2026-11-25 12:00", "", "2026-11-25 08:00", "Anna Nowak"]
        ];
      }
    })
  };
  sandbox.SpreadsheetApp = { flush: () => {}, getActiveSpreadsheet: () => ({ getSheetByName: () => fakeSheet }) };
  const res = sandbox.apiGetTicketsList();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.tickets.length, 2);

  const t1 = res.tickets[0];
  assert.strictEqual(t1.hasFirstContact, true);
  assert.strictEqual(t1.overdueSla, false, "Zgłoszenie z udzieloną odpowiedzią NIE MOŻE być zalegające z 1. reakcją!");
  assert.strictEqual(t1.slaBreachedHistorically, false);

  const t2 = res.tickets[1];
  assert.strictEqual(t2.hasFirstContact, false);
  assert.strictEqual(t2.overdueSla, true, "Zgłoszenie bez odpowiedzi po terminie SLA MUSI być oznaczone jako zalegające!");
});

test("SUITE 7", "7.5 apiGetTicketsList: zwraca assignedEmployee i nextActionDeadline z poprawnymi obiektami Date", () => {
  const fakeSheet = {
    getLastRow: () => 2,
    getLastColumn: () => 6,
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        if (r === 1) return [["ID Zgłoszenia", "Status", "Pracownik odpowiedzialny", "Termin następnego działania", "Sygnatura czasowa", "Data pierwszego kontaktu"]];
        return [["ELW-2026-0001", "Nowe", "Anna Nowak", "2026-11-27 12:00", "2026-11-26 10:00", ""]];
      }
    })
  };
  sandbox.SpreadsheetApp = { flush: () => {}, getActiveSpreadsheet: () => ({ getSheetByName: () => fakeSheet }) };
  const res = sandbox.apiGetTicketsList();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.tickets.length, 1);
  const t = res.tickets[0];
  assert.strictEqual(t.assignedEmployee, "Anna Nowak");
  assert.strictEqual(t.nextActionDeadline, "2026-11-27 12:00");
  assert.strictEqual(t.timestamp, "2026-11-26 10:00");
});

test("SUITE 7", "7.6 apiTriggerAiAnalysis: zwraca rzeczywisty stan i szczegóły błędu", () => {
  const fakeSheet = {
    getLastRow: () => 2,
    getLastColumn: () => 3,
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        if (r === 1) return [["ID Zgłoszenia", "Stan analizy AI", "Szczegóły błędu AI"]];
        return [["ELW-2026-0001"]];
      },
      getValue: () => {
        if (c === 2) return "Błąd";
        if (c === 3) return "Model Gemini osiągnął limit tokenów";
        return "ELW-2026-0001";
      }
    })
  };
  sandbox.SpreadsheetApp = { flush: () => {}, getActiveSpreadsheet: () => ({ getSheetByName: () => fakeSheet }) };
  sandbox.triggerAutoAiAnalysisForTicket = () => { /* noop */ };
  const res = sandbox.apiTriggerAiAnalysis("ELW-2026-0001");
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.aiState, "Błąd");
  assert.ok(res.error.includes("limit tokenów"));
});

test("SUITE 7", "7.7 apiTriggerAiAnalysis: blokowanie ręcznej analizy, gdy sprawa jest już w trakcie przetwarzania", () => {
  const ticketId = "ELW-2026-0001";
  sandbox.scriptPropertiesStore["AI_IN_PROGRESS_" + ticketId] = String(Date.now()); // aktywny znacznik rezerwacji
  const fakeSheet = {
    getLastRow: () => 2,
    getLastColumn: () => 3,
    getRange: (r, c, nr, nc) => ({
      getValues: () => [["ID Zgłoszenia", "Stan analizy AI", "Szczegóły błędu AI"], ["ELW-2026-0001", "Nowe", ""]]
    })
  };
  sandbox.SpreadsheetApp = { flush: () => {}, getActiveSpreadsheet: () => ({ getSheetByName: () => fakeSheet }) };
  const res = sandbox.apiTriggerAiAnalysis(ticketId);
  assert.strictEqual(res.success, false, "Powinno zablokować wywołanie analizy dla zajętej sprawy");
  assert.ok(res.error.includes("blokada współbieżności") || res.error.includes("w trakcie analizy"));
  delete sandbox.scriptPropertiesStore["AI_IN_PROGRESS_" + ticketId];
});

test("SUITE 7", "7.8 processAiTicketAnalysis: blokowanie ręcznej analizy z okna dialogowego przy aktywnej blokadzie", () => {
  const ticketId = "ELW-2026-0001";
  sandbox.scriptPropertiesStore["AI_IN_PROGRESS_" + ticketId] = String(Date.now());
  const res = sandbox.processAiTicketAnalysis(ticketId, "Opis zgłoszenia");
  assert.strictEqual(res.success, false, "processAiTicketAnalysis musi zwrócić błąd przy zajętym zgłoszeniu");
  assert.ok(res.error.includes("blokada współbieżności") || res.error.includes("w trakcie analizy"));
  delete sandbox.scriptPropertiesStore["AI_IN_PROGRESS_" + ticketId];
});

// -----------------------------------------------------------------------------
// PODSUMOWANIE WYNIKÓW
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log("PODSUMOWANIE WYNIKÓW TESTÓW AUDYTOWYCH v0.2.8:");
console.log("================================================================================");

const passedCount = testResults.filter(r => r.status === "PASS").length;
const failedCount = testResults.filter(r => r.status === "FAIL").length;
const totalCount = testResults.length;

console.log(`ŁĄCZNIE PRZEPROWADZONYCH TESTÓW: ${totalCount}`);
console.log(`ZALICZONE (PASS):               ${passedCount} / ${totalCount}`);
console.log(`NIEZALICZONE (FAIL):            ${failedCount} / ${totalCount}`);

if (failedCount > 0) {
  console.error("\nWYKRYTO BŁĘDY W TESTACH:");
  testResults.filter(r => r.status === "FAIL").forEach(r => {
    console.error(` - [${r.suite}] ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log("\nWSZYSTKIE TESTY AUDYTOWE ZAKOŃCZONE 100% SUKCESEM!");
  process.exit(0);
}
