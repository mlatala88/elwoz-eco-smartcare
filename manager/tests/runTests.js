/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Automated Test Suite (Weryfikacja warstwy danych, logiki CSI i reguł CX/PR)
 */

import { DemoDataProvider } from "../js/data/demoProvider.js";
import { INITIAL_TICKETS } from "../js/data/initialDataset.js";

// Mock localStorage dla środowiska Node.js
class MockStorage {
  constructor() { this.store = {}; }
  getItem(key) { return this.store[key] || null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}
globalThis.localStorage = new MockStorage();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log("=== ELWOZ ECO SmartCare Manager v0.3.0 - Test Suite ===\n");

  const provider = new DemoDataProvider();

  // Test 1: Inicjalizacja danych
  console.log("1. Inicjalizacja i zbiór danych");
  const tickets = await provider.getTickets();
  assert(tickets.length === 30, `Zbiór zawiera 30 syntetycznych zgłoszeń (znaleziono: ${tickets.length})`);
  assert(tickets.every(t => t.id && t.id.startsWith("ELW-2026-")), "Wszystkie zgłoszenia posiadają prawidłowy format ID (ELW-2026-XXXX)");
  assert(tickets.every(t => t.status && t.priority && t.type && t.city), "Wszystkie zgłoszenia posiadają wymagane pola operacyjne");

  // Test 2: Obliczanie 16 wskaźników CSI
  console.log("\n2. Wskaźniki Customer Service Intelligence (Dashboard)");
  const stats = await provider.getStats("all");
  assert(stats.total === 30, `Wszystkie zgłoszenia: ${stats.total}`);
  assert(stats.newCount >= 1, `Nowe zgłoszenia: ${stats.newCount}`);
  assert(stats.urgent >= 1, `Zgłoszenia pilne: ${stats.urgent}`);
  assert(stats.resolved >= 1, `Zgłoszenia rozwiązane: ${stats.resolved}`);
  assert(stats.resolutionRate !== "-", `Wskaźnik rozwiązań: ${stats.resolutionRate}%`);
  assert(stats.avgFirstResponseFormatted !== "-", `Średni czas 1. reakcji wyliczony: ${stats.avgFirstResponseFormatted}`);
  assert(stats.avgResolutionFormatted !== "-", `Średni czas rozwiązania wyliczony: ${stats.avgResolutionFormatted}`);
  assert(stats.avgSatisfactionFormatted !== "-", `Średnia ocena satysfakcji wyliczona: ${stats.avgSatisfactionFormatted} ★`);
  assert(stats.feedbackCount >= 1, `Liczba zebranych ocen satysfakcji: ${stats.feedbackCount}`);
  assert(stats.reviewInvitesCount >= 1, `Wysłane zaproszenia Google: ${stats.reviewInvitesCount}`);

  // Test 3: Filtry klikalnych wskaźników KPI
  console.log("\n3. Klikalność i filtrowanie wskaźników");
  const newFiltered = await provider.getTickets({ metricKey: "new" });
  assert(newFiltered.every(t => t.status === "Nowe"), "Filtr 'new' zwraca wyłącznie status 'Nowe'");

  const urgentFiltered = await provider.getTickets({ metricKey: "urgent" });
  assert(urgentFiltered.every(t => t.priority === "PILNY" && t.status !== "Rozwiązane"), "Filtr 'urgent' zwraca wyłącznie otwarte sprawy PILNE");

  const overdueFiltered = await provider.getTickets({ metricKey: "overdue" });
  assert(overdueFiltered.every(t => t.status !== "Rozwiązane"), "Filtr 'overdue' zwraca wyłącznie otwarte sprawy");

  const noStepFiltered = await provider.getTickets({ metricKey: "no_step" });
  assert(noStepFiltered.every(t => t.status !== "Rozwiązane" && (!t.nextAction || t.nextAction.trim() === "")), "Filtr 'no_step' poprawnie wykrywa sprawy bez kolejnego kroku");

  // Test 4: Dodawanie i edycja zgłoszenia
  console.log("\n4. Operacje CRUD zgłoszeń");
  const newTicket = await provider.createTicket({
    type: "Brak odbioru odpadów",
    fraction: "BIO",
    city: "Kartuzy",
    street: "Testowa",
    houseNumber: "99",
    description: "Zgłoszenie testowe zautomatyzowane.",
    priority: "WYSOKI"
  });
  assert(newTicket.id === "ELW-2026-0031", `Wygenerowano unikalny identyfikator: ${newTicket.id}`);
  
  const updated = await provider.updateTicket(newTicket.id, {
    status: "W realizacji",
    assignee: "Piotr Wiśniewski",
    nextAction: "Podjazd testowy"
  });
  assert(updated.status === "W realizacji" && updated.assignee === "Piotr Wiśniewski", "Aktualizacja statusu i opiekuna zapisana pomyślnie");

  // Test 5: Komunikacja i automatyczne daty cyklu życia
  console.log("\n5. Dziennik komunikacji i audyt");
  const comm = await provider.addCommunication({
    ticketId: newTicket.id,
    recipient: "tester@przyklad.pl",
    channel: "E-mail",
    subject: "Potwierdzenie przyjęcia zgłoszenia",
    content: "Dzień dobry, potwierdzamy przyjęcie.",
    author: "Piotr Wiśniewski",
    actionType: "Potwierdzenie przyjęcia"
  });
  assert(comm.id.startsWith("COMM-"), `Utworzono wpis komunikacji: ${comm.id}`);
  
  const refreshedTicket = await provider.getTicketById(newTicket.id);
  assert(refreshedTicket.firstContactDate && refreshedTicket.lastContactDate, "Data pierwszego i ostatniego kontaktu została automatycznie zaktualizowana w zgłoszeniu");

  // Test 6: AI Message Polishing & Standardy CX/PR
  console.log("\n6. Asystent AI i standardy redakcyjne CX/PR");
  const rawMsg = "Kierowca dostanie naganę i karę finansową za pominięcie posesji. Sprawdzimy to.";
  const polished = await provider.polishMessageWithAi(rawMsg);
  assert(polished.startsWith("Dzień dobry,"), "AI zapewnia uprzejmy zwrot powitalny 'Dzień dobry,'");
  assert(!polished.includes("nagana") && !polished.includes("kara finansowa"), "AI skutecznie usuwa wzmianki o naganach i karach służbowych kierowców");
  assert(polished.includes("POK Kartuzy") || polished.includes("Punkt Obsługi Klienta"), "AI dołącza oficjalną sygnaturę POK Kartuzy");

  // Test 7: Diagnostyka i symulator błędów
  console.log("\n7. Diagnostyka i odporność na błędy");
  const diag = await provider.getDiagnostics();
  assert(diag.sheetsConnection === "OK", "Stan bazy danych: OK");
  assert(diag.appVersion.includes("v0.3.0"), `Wersja aplikacji: ${diag.appVersion}`);

  const testSuite = await provider.runDiagnosticsTest();
  assert(testSuite.tests.every(t => t.status === "PASSED"), "Wszystkie komponenty pakietu diagnostycznego zaliczone");

  await provider.toggleSimulatedError();
  const diagError = await provider.getDiagnostics();
  assert(diagError.simulatedErrorMode === true, "Symulator błędu API pomyślnie aktywowany");
  
  let caughtError = false;
  try {
    await provider.polishMessageWithAi("Test");
  } catch (e) {
    caughtError = true;
  }
  assert(caughtError, "Aplikacja prawidłowo zgłasza błąd w trybie symulacji awarii API");

  await provider.toggleSimulatedError(); // wyłącz symulację

  // Test 8: Reset danych demonstracyjnych
  console.log("\n8. Przywracanie danych fabrycznych");
  await provider.resetDemoData();
  const afterResetTickets = await provider.getTickets();
  assert(afterResetTickets.length === 30, `Po resecie zbiór zawiera fabryczne 30 zgłoszeń (znaleziono: ${afterResetTickets.length})`);

  console.log(`\n========================================`);
  console.log(`WYNIK TESTÓW: ${passed} zaliczonych, ${failed} błędów.`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(e => {
  console.error("Nieoczekiwany błąd testów:", e);
  process.exit(1);
});
