# Dziennik Zmian (CHANGELOG) – ELWOZ ECO SmartCare

Wszystkie istotne zmiany i wydania w projekcie **ELWOZ ECO SmartCare** są rejestrowane w tym dokumencie zgodnie z konwencją [Semantic Versioning](https://semver.org/).

---

## [0.2.2] – 2026-11-25
### Wydanie Naprawcze: Pełna realizacja 15 punktów po niezależnym audycie kodu

#### Naprawione błędy i wdrożone poprawki:
1. **Usunięcie pozorowanego zapisu `localStorage`:** Całkowicie usunięto z `js/app.js` i `index.html` fałszywy zapis do `localStorage` (`elwoz_test_tickets`) oraz sztuczny generator numerów w przeglądarce. Zgłoszenia trafiają wyłącznie bezpośrednio do Google Sheets za pośrednictwem natywnego formularza Google Forms.
2. **Poprawa instalacji Apps Script (Container-bound):** Skrypt `google/setup.gs` został przebudowany jako projekt powiązany z arkuszem (`SpreadsheetApp.getActiveSpreadsheet()`), uruchamiany przez *Rozszerzenia → Apps Script*, eliminując błędne wywołania `DriveApp.getFilesByName()` i `SpreadsheetApp.create()`.
3. **Usunięcie nieistniejącej metody `setGridlines()`:** Zastąpiono błędne `dash.setGridlines(true)` poprawną metodą `dash.setHiddenGridlines(false)` w `setup.gs`.
4. **Aktualizacja modelu Gemini API:** Wycofano wszystkie odwołania do nieaktualnych wersji modelu i wdrożono najnowszy model `gemini-2.0-flash` we wszystkich modułach i dokumentacji.
5. **Poprawa mapowania nagłówków formularza i CRM:** Ujednolicono nazwy pytań formularza Google i kolumn arkusza oraz wprowadzono elastyczne dopasowywanie nagłówków.
6. **Rzeczywiste powiązanie formularza z arkuszem:** Zapewniono identyfikację arkusza odpowiedzi przez `s.getFormUrl()` i konfigurację jako `ZGŁOSZENIA` z dopisywaniem kolumn operacyjnych za polami formularza.
7. **Zabezpieczenie przed wstrzyknięciem HTML i JavaScript (XSS):** W module `google/communication.gs` wdrożono funkcję `escapeHtml()` i zabezpieczono wszystkie zmienne interpolowane w oknach dialogowych HTML (tematy, treści, notatki, loginy, identyfikatory).
8. **Sekwencyjny generator unikalnych identyfikatorów zgłoszeń:** W `setup.gs` wprowadzono funkcję `getNextUniqueTicketId()`, która analizuje całą kolumnę ID i wyznacza kolejny numer na podstawie `max(ID) + 1` (np. `ELW-2026-0001`), eliminując ryzyko duplikatów.
9. **Zachowanie danych podczas ponownego uruchomienia instalatora:** Usunięto destrukcyjne `testSheet.clear()`. Ponowne uruchomienie `setupSmartCareSystem()` zachowuje wpisane wyniki testów, zgłoszenia, historię korespondencji i parametry konfiguracyjne.
10. **Bezwarunkowa blokada wysyłki poza `wsb.student.tester@gmail.com`:** Usunięto warunek `if (settings.isDemoMode)` i możliwość przełączenia na produkcję. W prototypie wysyłka poczty na jakikolwiek adres poza `wsb.student.tester@gmail.com` jest bezwzględnie blokowana przez backend.
11. **Twarda anonimizacja danych przesyłanych do AI:** Z promptów AI usunięto numer posesji oraz dane kontaktowe mieszkańca, a treść zgłoszenia jest filtrowana przez regex usuwający telefony, e-maile i numery PESEL.
12. **Zabezpieczenie przed duplikatami wysyłek i obsługa błędów:** Wprowadzono kontrolę 5-minutowego okna czasowego zapobiegającą podwójnej wysyłce tego samego szablonu. W razie błędu `MailApp` status w CRM nie jest oznaczany jako wysłany.
13. **Poprawa kalkulacji czasu reakcji i KPI:** Daty są zapisywane jako rzeczywiste obiekty `Date` (zamiast stringów tekstowych), a formuły w `DASHBOARD` obsługują zarówno formaty `Date`, jak i `DATEVALUE`.
14. **Usunięcie fikcyjnego linku do opinii Google:** Usunięto z kodu i bazy link `PLACEHOLDER_KARTUZY`. Pole pozostaje puste do czasu zweryfikowania autentycznego Profilu Firmy Google ELWOZ ECO w Kartuzach.
15. **Weryfikacja szablonów wiadomości:** Usunięto niepotwierdzone deklaracje o załogach i trasach. Szablony opierają się wyłącznie na potwierdzonych faktach i wpisie w polu *Sposób rozwiązania sprawy*.

---

## [0.2.1] – 2026-11-25
### Wydanie Bezpieczeństwa: Dedykowane Konto Testowe i Twarda Blokada Serwerowa
- Powiązanie usług Google z dedykowanym kontem projektowym: `wsb.student.tester@gmail.com`.
- Wprowadzenie serwerowej blokady odbiorcy testowego.

---

## [0.2.0] – 2026-11-25
### Rozszerzenie: Moduł Komunikacji z Klientem i Zarządzania Reputacją
- Dodanie menu `SmartCare` (szablony A–D, rejestracja rozmów telefonicznych, historia).
- Zakładki `USTAWIENIA` oraz `HISTORIA KOMUNIKACJI`.

---

## [0.1.0] – 2026-11-25
### Wydanie Inicjalne (Prototyp Studencki WSB Merito)
- Responsywny interfejs WWW w barwach ELWOZ ECO.
- Arkusz CRM *ELWOZ ECO SmartCare – Centrum zgłoszeń*.
- Wariant manualny promptu AI i automatyczny w `google/ai.gs`.
- Generator kodu QR i szablon naklejki na pojemnik.
