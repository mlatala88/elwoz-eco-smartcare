# ELWOZ ECO SmartCare – Kontrakt Integracji z Backendem Google Apps Script

**Wersja dokumentu:** 1.0 (dla Managera v0.3.0)  
**Środowisko docelowe:** Google Apps Script Web App (prywatny panel pracownika z autoryzacją Google Workspace)  
**Cel:** Formalna specyfikacja interfejsu programistycznego łączącego aplikację SmartCare Manager z backendem CRM i silnikiem Gemini API.

---

## 1. Zasady bezpieczeństwa i architektury komunikacji

1. **Brak publicznych endpointów:** Panel pracownika nie może posiadać publicznego, anonimowego dostępu. Aplikacja produkcyjna musi być wdrożona w Google Apps Script jako Web App z ustawieniem:
   - *Execute as:* `User accessing the web app` (lub dedykowane konto serwisowe dyspozytorni);
   - *Who has access:* `Only domain users` (organizacja Google Workspace ELWOZ ECO).
2. **Zakaz przechowywania kluczy API w kliencie:** Przeglądarka internetowa nie przechowuje klucza `GEMINI_API_KEY`. Wszelka komunikacja z modelem Gemini Flash odbywa się wyłącznie na serwerze Apps Script za pośrednictwem `UrlFetchApp`.
3. **Dwie metody integracji:**
   - **Wariant A (Aplikacja osadzona GAS):** Uruchomienie jako szablon HTML (`HtmlService.createHtmlOutputFromFile`). Wywołania metod przez natywny mechanizm `google.script.run`.
   - **Wariant B (Dedykowana aplikacja SPA):** Komunikacja z endpointem Web App przez żądania `POST` z nagłówkiem uwierzytelniającym token sesji Google.

---

## 2. Zestawienie metod API (Kontrakt RPC)

Wszystkie metody backendu zwracają ujednolicony format odpowiedzi:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
```

### 2.1. Zarządzanie zgłoszeniami (Tickets)

#### `apiGetTickets(filters: TicketFilters): Promise<Ticket[]>`
Pobiera listę zgłoszeń z arkusza `ZGŁOSZENIA` z opcjonalnym filtrowaniem serwerowym.
- **Parametry:**
  ```json
  {
    "search": "Kowalski",
    "status": "W realizacji",
    "priority": "PILNY",
    "category": "Brak odbioru odpadów",
    "assignee": "Anna Nowak",
    "deadlineFilter": "overdue",
    "metricKey": "urgent"
  }
  ```
- **Zwraca:** Tablicę obiektów zgłoszeń zawierających 43 kolumny CSI.

#### `apiGetTicketById(id: string): Promise<Ticket>`
Pobiera pojedyncze zgłoszenie na podstawie identyfikatora (np. `ELW-2026-0001`).

#### `apiCreateTicket(ticketData: Partial<Ticket>): Promise<Ticket>`
Tworzy nowe zgłoszenie z blokadą współbieżności `LockService`.
- **Wymagane pola:** `type`, `fraction`, `city`, `street`, `houseNumber`, `description`.
- **Backend automatycznie generuje:** unikalne `id` (`ELW-2026-XXXX`), `timestamp`, wstępny status `Nowe` oraz inicjuje asynchroniczną analizę AI w tle (`triggerAutoAiAnalysisForTicket`).

#### `apiUpdateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket>`
Aktualizuje wybrane pola w arkuszu zgłoszeń.
- **Specjalne reguły walidacji backendu:**
  - Jeśli `status === "Rozwiązane"`, pole `resolutionMethod` **musi** być niepuste.
  - Automatyczna aktualizacja `resolvedDate` przy zmianie statusu na `Rozwiązane`.
  - Automatyczne wyliczanie `slaOverdue` na podstawie sygnatury czasowej i terminu SLA.

---

### 2.2. Dziennik komunikacji (Communications)

#### `apiGetCommunications(ticketId?: string): Promise<CommunicationEntry[]>`
Odczytuje wpisy z zakładki `HISTORIA KOMUNIKACJI`. Jeśli przekazano `ticketId`, filtruje wpisy dla konkretnego zgłoszenia.

#### `apiAddCommunication(entry: CommunicationInput): Promise<CommunicationEntry>`
Rejestruje kontakt w historii oraz realizuje wysyłkę e-mail:
- **Twardy strażnik wysyłki testowej (Backend Whitelist Guard):** W trybie demonstracyjnym backend zezwala wyłącznie na wysyłkę na adres zdefiniowany w ustawieniach (`wsb.student.tester@gmail.com`). Próba wysyłki na inny adres zwraca błąd `403 Forbidden` i blokuje operację.
- **Aktualizacja zgłoszenia:** Automatycznie aktualizuje w arkuszu `ZGŁOSZENIA` pola `firstContactDate`, `lastContactDate` oraz statusy prośby o opinię.

---

### 2.3. Asystent Gemini API (AI Assistant)

#### `apiPolishMessageWithAi(rawMessage: string, context: { ticketId: string }): Promise<string>`
Koryguje stylistycznie i redakcyjnie szkic wiadomości pracownika.
- **Rygorystyczne standardy CX/PR:**
  - Zapewnienie zwrotu *Dzień dobry,* i oficjalnego podpisu POK Kartuzy;
  - Bezwzględne wycięcie wzmianek o naganach, karach i zwolnieniach kierowców;
  - Eliminacja technicznych znaczników i żargonu.

---

### 2.4. Telemetria i wskaźniki CSI (Analytics & Diagnostics)

#### `apiGetCsiStats(period: string, customRange?: { from: string, to: string }): Promise<CsiStats>`
Niezależny silnik wyliczający w czasie rzeczywistym wszystkie 16 wskaźników operacyjnych, czasy reakcji, czasy rozwiązań oraz rozkłady kategorii i ocen satysfakcji.

#### `apiGetDiagnostics(): Promise<DiagnosticsStatus>`
Zwraca stan zdrowia systemu (połączenie z arkuszem, stan wyzwalaczy czasowych, dostępność Gemini API, statystyki nieprzetworzonych wierszy).

#### `apiRunDiagnosticsTest(): Promise<DiagnosticsTestResults>`
Uruchamia syntetyczne zapytanie testowe do Gemini API z pomiarem czasu odpowiedzi i weryfikacją Structured Outputs.

---

## 3. Schemat obiektu zgłoszenia (TypeScript Interface)

```typescript
interface Ticket {
  id: string; // ELW-2026-0001
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  type: string; // Rodzaj zgłoszenia
  fraction: string; // Frakcja odpadów
  city: string; // Miejscowość
  street: string; // Ulica
  houseNumber: string; // Numer posesji
  incidentDate: string; // Data wystąpienia problemu
  description: string; // Oryginalny opis
  applicantName: string; // Imię i nazwisko
  applicantPhone: string; // Telefon
  applicantEmail: string; // E-mail
  contactRequest: "TAK" | "NIE";
  status: "Nowe" | "Do weryfikacji" | "W realizacji" | "Oczekuje na informacje" | "Rozwiązane";
  priority: "PILNY" | "WYSOKI" | "STANDARDOWY" | "NISKI";
  suggestedPriority: "PILNY" | "WYSOKI" | "STANDARDOWY" | "NISKI";
  priorityRationale: string;
  aiState: "Przeanalizowano" | "Wymaga weryfikacji" | "Błąd" | "Brak";
  localValidation: string;
  contradictions: string;
  assignee: string; // Pracownik odpowiedzialny
  nextAction: string; // Kolejny krok
  responsibleSide: "Przedsiębiorstwo" | "Mieszkaniec";
  nextActionDeadline: string; // Termin następnego działania
  slaDeadline: string; // Termin SLA 1. reakcji
  slaOverdue: "TAK" | "NIE";
  employeeNote: string;
  receiptConfirmedDate: string;
  firstContactDate: string;
  lastContactDate: string;
  resolvedDate: string;
  resolutionMethod: string;
  contactResult: string;
  satisfactionScore: number | null; // 1-5
  citizenFeedback: string;
  reviewInviteSent: "TAK" | "NIE";
  reviewInviteDate: string;
  aiCategory: string;
  aiSummary: string;
  aiMissingInfo: string;
  aiSuggestedAction: string;
  aiRecommendedStep: string;
  aiDraftReply: string;
}
```

---

## 4. Wytyczne wdrożenia produkcyjnego (Checklista gotowości)

- [ ] Potwierdzenie pełnej stabilizacji silnika Google Apps Script w wersji v0.2.8.
- [ ] Utworzenie modułu `api.gs` w projekcie Apps Script implementującego powyższe funkcje.
- [ ] Przełączenie adaptera w `app.js` z `DemoDataProvider` na `AppsScriptDataProvider`.
- [ ] Weryfikacja działania w domenie Google Workspace z kontami pracowników POK Kartuzy.
