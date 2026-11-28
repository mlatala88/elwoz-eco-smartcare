# Kontrakt integracji SmartCare Manager v0.3.0

Aktualizacja: 28 listopada 2026. Źródłem kontraktu są `google/webapp.gs`, `google/access.gs`, publiczne API w `google/setup.gs` i adapter `manager/js/data/gasProvider.js`.

## Tożsamość i transport

Każde publiczne API sprawdza uprawnienie po stronie serwera, korzystając z `Session.getActiveUser().getEmail()` oraz `SMARTCARE_STAFF_EMAILS`. Nieznane/puste konto jest odrzucane. Parametr `operator`, PIN i profil z przeglądarki nie uprawniają do operacji. Role są przypisane na serwerze. Funkcje wewnętrzne mają końcowy `_`, więc nie są dostępne przez `google.script.run`.

Podstawowy transport to osadzony Web App z `google.script.run`. Wyniki RPC są obiektami/tablicami właściwymi dla danej metody, bez wspólnego opakowania. Wyjątek trafia do failure handler. Wynik z jawnym `success: false` jest również błędem w adapterze.

`doPost` przyjmuje `{action, payload: [...], operator}` i zwraca `{success: true, data}` lub `{success: false, error}`; `operator` nie jest źródłem tożsamości. Zewnętrzny klient nie ma w tej wersji kompletnego przepływu OAuth/CORS. Samo podanie adresu endpointu nie zapewnia autoryzacji. Wariant osadzony jest ścieżką odbioru produkcyjnej integracji.

## Najważniejsze odpowiedzi

| Metoda | Wynik / zasady |
|---|---|
| `apiGetCurrentUser()` | Potwierdzony użytkownik Google lub informacja o braku uwierzytelnienia |
| `apiVerifyUser(email, pin)` | Nie przyznaje dostępu; stary mechanizm PIN wyłączony |
| `apiGetStaff()` | Tylko aktywne osoby z poprawnego mapowania rzeczywistych kont |
| `apiGetTickets(filters)` | Tablica camelCase zgodna z widokiem; wartości `all`, „Wszystkie”, „Wszyscy” oznaczają brak ograniczenia |
| `apiGetTicketById(id)` | Obiekt zgłoszenia albo `null` |
| `apiUpdateTicket(id, updates)` | Aktualizacja z walidacją i uprawnieniami; jeden zestaw definicji API |
| `apiGetCommunications(ticketId)` | Tablica z `actionType` i zgodnym aliasem `type`; kanały/statusy ujednolicone dla UI |
| `apiAddCommunication(data)` | Walidacja, istniejące zgłoszenie, zapis lub błąd; e-mail przez dotychczasowy mechanizm i wymuszonego odbiorcę testowego |
| `apiGetCsiStats(period, range)` | Statystyki z tego samego filtrowania okresu co lista |
| `apiGetDiagnostics()` | Odczyt arkusza, liczby błędów AI/komunikacji, stan instalacji wyzwalaczy i konfiguracji; bez wywołania Gemini |
| `apiRunDiagnosticsTest()` | `{success, timestamp, latencyMs, diagnostics, allPassed, tests:[{name,status,latency,details}]}`; `success` dotyczy wykonania procedury, `allPassed` wyniku testów |
| `apiGetSettings()` | `companyName`, `branch`, `email`, `phone`, `address`, `workingHours`, `googleReviewUrl`, `testEmail` |
| `apiUpdateSettings(settings)` | Administrator, wyłącznie sześć pól poniżej; blokada zapisu i zwrot odczytanych ustawień |

Zapis ustawień obsługuje `companyName`, `branch`, `email`, `phone`, `workingHours`, `googleReviewUrl`. Odrzuca pozostałe klucze, formuły i niezweryfikowany link opinii. Nie zapisuje ustawień Gemini ani indywidualnych kluczy. Lista pracowników connected jest tylko do odczytu — brak endpointu aktualizacji personelu jest jawnie uwzględniony w UI.

Zaproszenie „Zaproszenie do opinii Google” jest normalizowane do istniejącego typu silnika „Prośba o opinię”, aby walidacja i pola historii/opinii były spójne. Wewnętrzna notatka nie oznacza kontaktu z mieszkańcem. Wysyłka bez dostępnego silnika poczty nie zwraca fikcyjnego sukcesu.

## Regresje i wdrożenie

`node scripts/test-all.js` sprawdza kontrakty z rzeczywistymi metodami źródłowymi i atrapami usług. [Raport](RAPORT-TESTOW.md) precyzuje zakres. [Instrukcja aktualizacji](INSTRUKCJA-WDROZENIA-V030.md) opisuje zachowanie istniejącego URL, mapowanie kont i migrację wyzwalaczy.
