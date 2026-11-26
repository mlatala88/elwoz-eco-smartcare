/**
 * ELWOZ ECO SmartCare Manager v0.3.0
 * Automated Test Suite (Weryfikacja warstwy danych, logiki CSI i reguł CX/PR)
 */

import { DemoDataProvider } from "../js/data/demoProvider.js";
import { INITIAL_TICKETS } from "../js/data/initialDataset.js";
import { evaluateMessageQuality, simulateCxAiRefine } from "../js/data/cxGuardrail.js";

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
    recipient: "tester@example.com",
    channel: "E-mail",
    subject: "Potwierdzenie przyjęcia zgłoszenia",
    content: "Dzień dobry, potwierdzamy przyjęcie.",
    author: "Piotr Wiśniewski",
    actionType: "Potwierdzenie przyjęcia"
  });
  assert(comm.id.startsWith("COMM-"), `Utworzono wpis komunikacji: ${comm.id}`);
  
  const refreshedTicket = await provider.getTicketById(newTicket.id);
  assert(refreshedTicket.firstContactDate && refreshedTicket.lastContactDate, "Data pierwszego i ostatniego kontaktu została automatycznie zaktualizowana w zgłoszeniu");

  // Test 5b: addCommunication NIE wymyśla samodzielnie sposobu rozwiązania (Wymóg 4)
  const ticketWithoutRes = await provider.createTicket({
    type: "Reklamacja odbioru",
    status: "W realizacji",
    resolutionMethod: ""
  });
  await provider.addCommunication({
    ticketId: ticketWithoutRes.id,
    recipient: "mieszkaniec@example.com",
    channel: "E-mail",
    actionType: "Informacja o rozwiązaniu",
    subject: "Informacja o rozwiązaniu",
    content: "Dzień dobry, informujemy o zgłoszeniu."
  });
  const checkTicketAfterComm = await provider.getTicketById(ticketWithoutRes.id);
  assert(!checkTicketAfterComm.resolutionMethod || checkTicketAfterComm.resolutionMethod === "", "addCommunication NIE dopisuje samodzielnie fikcyjnego sposobu rozwiązania sprawy");

  // Test 6: Scenariusze akceptacyjne CX/PR A-H i Pre-Send Guardrail
  console.log("\n6. Scenariusze akceptacyjne CX/PR (A-H) i Pre-Send Guardrail");

  // Scenariusz A1: Odmowa bez uzasadnienia merytorycznego -> wzywa pracownika do podania przyczyny (Wymóg 2)
  let sceneACaught = false;
  try {
    await provider.polishMessageWithAi("NIE MA TAKIEJ OPCJI PACANIE", { ticket: newTicket, staffName: "Anna Nowak" });
  } catch (e) {
    sceneACaught = true;
    assert(e.message.includes("odmowę, lecz brakuje merytorycznego uzasadnienia") || e.message.includes("Podaj powód odmowy"), `Scenariusz A1: AI nie wymyśla regulaminów, lecz wymaga uzupełnienia danych przez pracownika (${e.message})`);
  }
  assert(sceneACaught, "Scenariusz A1: Pomyślnie zablokowano generowanie samej odmowy bez uzasadnienia");

  // Scenariusz A2: Odmowa ze wskazanym faktem merytorycznym (Wymóg 1 & 10)
  const sceneA2 = await provider.polishMessageWithAi("Odmowa odbioru - opony samochodowe nie podlegają zbiórce komunalnej", { ticket: newTicket, staffName: "Anna Nowak" });
  assert(!sceneA2.toLowerCase().includes("pacan"), "Scenariusz A2: Brak inwektyw");
  assert(sceneA2.includes("opony") && (sceneA2.includes("zbiórce") || sceneA2.includes("standardow")), "Scenariusz A2: Ściśle zachowano fakt merytoryczny o oponach");
  assert(!sceneA2.includes("06:00") && !sceneA2.includes("godziny 06:00"), "Scenariusz A2: Brak zmyślonej godziny 06:00");
  assert(!sceneA2.includes("dyspozytorni") && !sceneA2.includes("kierownictw"), "Scenariusz A2: Brak zmyślonych działań dyspozytorni lub kierownictwa");

  // Scenariusz B: Brak faktów / inwektywa (odmowa wygenerowania)
  let sceneBCaught = false;
  try {
    await provider.polishMessageWithAi("Spieprzaj dziadu", { ticket: newTicket });
  } catch (e) {
    sceneBCaught = true;
    assert(e.message.includes("nie zawiera informacji merytorycznych"), `Scenariusz B: AI odmawia odpowiedzi na samą inwektywę i żąda faktów (${e.message})`);
  }
  assert(sceneBCaught, "Scenariusz B: Pomyślnie zablokowano generowanie przy braku faktów operacyjnych");

  // Scenariusz C: Fakty zamiast obwiniania (Wymóg 1, 2, 10)
  const sceneC = await provider.polishMessageWithAi("To nie nasz problem, sam jesteś sobie winien, w pojemniku na odpady zmieszane znajdował się gruz budowlany", { ticket: newTicket, staffName: "Anna Nowak" });
  assert(!sceneC.includes("nie nasz problem") && !sceneC.includes("twoja wina") && !sceneC.includes("sam jesteś sobie winien"), "Scenariusz C: Usunięto obwinianie mieszkańca");
  assert(sceneC.includes("gruz"), "Scenariusz C: Ściśle zachowano rzeczywisty fakt o gruzie bez zmyślania");
  assert(!sceneC.includes("06:00") && !sceneC.includes("godziny 06:00"), "Scenariusz C: Brak zmyślonej godziny 06:00");

  // Scenariusz D: Ochrona tajemnicy wewnętrznej przedsiębiorstwa
  const sceneD = await provider.polishMessageWithAi("Kierowca dostał reprymendę i ma przeprosić klienta, jutro nastąpi ponowny odbiór", { ticket: newTicket, staffName: "Anna Nowak" });
  assert(!sceneD.toLowerCase().includes("reprymend") && !sceneD.toLowerCase().includes("przeprosić"), "Scenariusz D: Usunięto wzmianki o reprymendach i karach personelu");
  assert(sceneD.includes("odbiór"), "Scenariusz D: Zachowano zapowiedź ponownego odbioru");

  // Scenariusz E: Działanie planowane vs wykonane
  const sceneE = await provider.polishMessageWithAi("Jutro sprawdzimy możliwość wymiany pojemnika", { ticket: newTicket, staffName: "Anna Nowak" });
  assert(sceneE.toLowerCase().includes("planowan") || sceneE.toLowerCase().includes("sprawdzimy"), "Scenariusz E: Poprawnie oznaczono działanie jako planowane/weryfikację, a nie wykonane");

  // Scenariusz F: Działanie wykonane
  const sceneF = await provider.polishMessageWithAi("Pojemnik został dzisiaj wymieniony", { ticket: newTicket, staffName: "Anna Nowak" });
  assert(sceneF.includes("zostało") || sceneF.includes("wymieniony"), "Scenariusz F: Potwierdzono pomyślne wykonanie zadania");

  // Scenariusz G: Uprzejma prośba o brakujący adres
  const sceneG = await provider.polishMessageWithAi("Nie możemy zrealizować dodatkowego odbioru bez podania adresu", { ticket: newTicket, staffName: "Anna Nowak" });
  assert(sceneG.includes("adres") && (sceneG.includes("prosimy") || sceneG.includes("niezbędne") || sceneG.includes("doprecyzowanie")), "Scenariusz G: Uprzejmie sformułowano prośbę o uzupełnienie adresu nieruchomości");

  // Scenariusz H: Niezależny Pre-Send Guardrail przed wysyłką (Wymóg 3)
  const guardFail1 = evaluateMessageQuality("NIE MA TAKIEJ OPCJI PACANIE!");
  assert(!guardFail1.isValid, "Scenariusz H: Guardrail blokuje inwektywy ('pacan')");
  assert(guardFail1.blockedReason === "Wiadomość nie spełnia standardów komunikacji z mieszkańcem. Popraw treść lub skorzystaj z asystenta AI.", "Scenariusz H: Zwrócono wymagany oficjalny komunikat błędu guardraila");

  const guardProfanityLeet = evaluateMessageQuality("Niech ten d.e.b.i.l sam to sprząta.");
  assert(!guardProfanityLeet.isValid, "Scenariusz H: Guardrail blokuje próby obchodzenia filtrów (leetspeak/kropki 'd.e.b.i.l')");

  const guardProfanityInflected = evaluateMessageQuality("Wy kurwy jebane, gdzie jest odbiór!");
  assert(!guardProfanityInflected.isValid, "Scenariusz H: Guardrail blokuje polskie wulgaryzmy w formach fleksyjnych");

  const guardFail2 = evaluateMessageQuality("To nie nasz problem, doucz się segregacji.");
  assert(!guardFail2.isValid, "Scenariusz H: Guardrail blokuje pasywną agresję i lekceważenie mieszkańca");

  const guardEmpty = evaluateMessageQuality("");
  assert(!guardEmpty.isValid, "Scenariusz H: Guardrail blokuje pustą treść wiadomości");

  const guardOk = evaluateMessageQuality(sceneA2);
  assert(guardOk.isValid, "Scenariusz H: Guardrail zatwierdza profesjonalną wiadomość po korekcie AI");

  // Test 7: Wymóg sposobu rozwiązania przy zamykaniu zgłoszenia (Rozwiązane i Zamknięte - Wymóg 5)
  console.log("\n7. Wymóg opisu sposobu rozwiązania sprawy (spójność Rozwiązane i Zamknięte)");
  let caughtClosureError = false;
  try {
    await provider.updateTicket(newTicket.id, {
      status: "Rozwiązane",
      resolutionMethod: "" // puste!
    });
  } catch (e) {
    caughtClosureError = true;
    assert(e.message.includes("sposobu rozwiązania"), `Prawidłowo zablokowano zamknięcie sprawy jako Rozwiązane bez opisu: ${e.message}`);
  }
  assert(caughtClosureError, "Zgłoszenie nie może zostać zamknięte bez podania rzeczywistego sposobu rozwiązania");

  let caughtZamknieteError = false;
  try {
    await provider.updateTicket(newTicket.id, {
      status: "Zamknięte",
      resolutionMethod: "" // puste!
    });
  } catch (e) {
    caughtZamknieteError = true;
    assert(e.message.includes("sposobu rozwiązania"), `Prawidłowo zablokowano zamknięcie sprawy jako Zamknięte bez opisu: ${e.message}`);
  }
  assert(caughtZamknieteError, "Status Zamknięte również wymaga wpisania rzeczywistego sposobu rozwiązania");

  const properlyClosed = await provider.updateTicket(newTicket.id, {
    status: "Rozwiązane",
    resolutionMethod: "Wymieniono uszkodzony pojemnik 120L BIO na nowy z atestem."
  });
  assert(properlyClosed.status === "Rozwiązane" && properlyClosed.resolutionMethod.includes("Wymieniono"), "Pomyślnie zamknięto sprawę z prawidłowym opisem rozwiązania");

  // Test 8: Bezpieczeństwo statusu komunikacji i dynamiczne SLA (Wymóg 6)
  console.log("\n8. Odporność na błędy doręczenia i dynamiczne SLA");
  const uncontactedTicket = await provider.createTicket({
    type: "Reklamacja",
    applicantEmail: "nieistniejacy@example.com",
    status: "Nowe"
  });
  assert(!uncontactedTicket.firstContactDate, "Nowe zgłoszenie nie posiada daty pierwszego kontaktu");

  await provider.addCommunication({
    ticketId: uncontactedTicket.id,
    recipient: "nieistniejacy@example.com",
    channel: "E-mail",
    actionType: "Informacja o rozwiązaniu",
    status: "Błąd", // Błąd wysyłki!
    errorMessage: "SMTP 550 Mailbox not found"
  });

  const ticketAfterFailedComm = await provider.getTicketById(uncontactedTicket.id);
  assert(!ticketAfterFailedComm.firstContactDate, "Błąd doręczenia NIE ustawia daty pierwszego kontaktu");
  assert(ticketAfterFailedComm.status !== "Rozwiązane", "Błąd doręczenia NIE powoduje zamknięcia zgłoszenia");

  // Dynamiczne SLA: termin w przeszłości z flagą slaOverdue: "NIE"
  const slaTestTicket = await provider.createTicket({
    type: "Brak odbioru",
    status: "W realizacji",
    slaDeadline: "2026-01-01 10:00:00",
    slaOverdue: "NIE"
  });
  const overdueTickets = await provider.getTickets({ deadlineFilter: "overdue" });
  assert(overdueTickets.some(t => t.id === slaTestTicket.id), "Dynamiczne SLA wykrywa zaległość po dacie terminu, ignorując statyczną flagę slaOverdue='NIE'");

  // Test 9: Diagnostyka i symulator błędów (Wymóg 8)
  console.log("\n9. Rzeczywista diagnostyka komponentów i symulator błędów");
  const diag = await provider.getDiagnostics();
  assert(diag.sheetsConnection === "OK", "Stan bazy danych: OK");
  assert(diag.appVersion.includes("v0.3.0"), `Wersja aplikacji: ${diag.appVersion}`);

  const testSuite = await provider.runDiagnosticsTest();
  assert(testSuite.tests.length === 5, "Pakiet diagnostyczny uruchamia 5 rzeczywistych testów komponentów");
  assert(testSuite.tests.every(t => t.latency && t.latency.includes("ms")), "Każdy test diagnostyczny raportuje zmierzone opóźnienie w ms");
  assert(testSuite.tests.find(t => t.name.includes("43 kolumny CSI")).status === "PASSED", "Rzeczywisty test formatu 43 kolumn zaliczony dynamicznie");
  assert(testSuite.tests.every(t => t.status === "PASSED"), "Wszystkie komponenty pakietu diagnostycznego zaliczone");

  await provider.toggleSimulatedError();
  const diagError = await provider.getDiagnostics();
  assert(diagError.simulatedErrorMode === true, "Symulator błędu API pomyślnie aktywowany");
  
  const testSuiteWithError = await provider.runDiagnosticsTest();
  const apiTest = testSuiteWithError.tests.find(t => t.name.includes("Gemini API"));
  assert(apiTest && apiTest.status === "FAILED", "Diagnostyka dynamicznie wykazuje FAILED dla symulatora Gemini przy włączonym błędzie");

  let caughtError = false;
  try {
    await provider.polishMessageWithAi("Test wiadomości operacyjnej.");
  } catch (e) {
    caughtError = true;
  }
  assert(caughtError, "Aplikacja prawidłowo zgłasza błąd w trybie symulacji awarii API");

  await provider.toggleSimulatedError(); // wyłącz symulację

  // Test 9b: Własny zakres dat (Wymóg 7)
  console.log("\n9b. Filtrowanie po własnym zakresie dat");
  const customTickets = await provider.getTickets({
    period: "custom",
    customRange: { from: "2026-01-01", to: "2026-12-31" }
  });
  assert(Array.isArray(customTickets) && customTickets.length > 0, "Filtrowanie po własnym zakresie dat działa poprawnie");

  // Test 10: Reset danych demonstracyjnych
  console.log("\n10. Przywracanie danych fabrycznych");
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
