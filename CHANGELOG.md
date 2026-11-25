# Dziennik Zmian (CHANGELOG) – ELWOZ ECO SmartCare

Wszystkie istotne zmiany i wydania w projekcie **ELWOZ ECO SmartCare** są rejestrowane w tym dokumencie zgodnie z konwencją [Semantic Versioning](https://semver.org/).

---

## [0.2.3] – 2026-11-25
### Wydanie Naprawcze: Realizacja zaleceń ponownego audytu kodu (v0.2.3)

#### Naprawione błędy i wdrożone poprawki:
1. **Kalkulacja czasów reakcji i rozwiązania w godzinach (`setup.gs`):**
   - Usunięto funkcję `INT()` z obliczania różnic dat w komórkach C8 i D8 arkusza `DASHBOARD`.
   - Czas pierwszej reakcji oraz czas rozwiązania sprawy są obecnie obliczane w godzinach z dokładnością do dwóch miejsc po przecinku (`ROUND(AVERAGE(...) * 24; 2)`).
2. **Bezpieczne nadawanie identyfikatorów zgłoszeń (`setup.gs`):**
   - Procedura `handleNewTicketSubmit` oraz `getNextUniqueTicketId` zostały zabezpieczone za pomocą `LockService.getScriptLock()`.
   - Wprowadzono trwały licznik monotoniczny `LAST_ASSIGNED_TICKET_ID` w `ScriptProperties`, gwarantujący brak kolizji identyfikatorów przy współbieżnych zgłoszeniach.
   - Zapewniono nienaruszalność istniejących już identyfikatorów.
3. **Kalkulacja odsetka próśb o opinię wyłącznie wśród zakończonych spraw (`setup.gs`):**
   - Poprawiono formułę w komórce C11 arkusza `DASHBOARD`. Mianownik uwzględnia wyłącznie sprawy o statusie *Rozwiązane* lub *Zamknięte*, eliminując zaniżanie wskaźnika przez sprawy nowe i w toku.
4. **Samodzielna funkcja aktualizacji formuł Dashboardu (`setup.gs`):**
   - Dodano funkcję `updateDashboardKpiFormulasOnly()` dostępną w menu arkusza, umożliwiającą natychmiastową aktualizację formuł w istniejących wdrożeniach bez konieczności ponownej instalacji czy ryzyka utraty danych.
5. **Obsługa błędów wysyłki i brak zamykania modala (`communication.gs`):**
   - Poprawiono funkcję `processSendEmail`, aby zwracała jednoznaczny obiekt wyniku `{ success, status, targetEmail, error }`.
   - Jeśli serwer zwróci błąd (np. blokada duplikatu, limit quota, błąd sieci), okno dialogowe edycji wiadomości **nie jest zamykane**, umożliwiając pracownikowi skorygowanie treści lub ponowienie próby.
6. **Rygorystyczna blokada placeholdera w prośbach o opinię Google (`communication.gs`):**
   - Wprowadzono funkcję walidacji `isVerifiedReviewUrl`.
   - Jeśli w zakładce `USTAWIENIA` nie podano zweryfikowanego linku do Profilu Firmy Google, system blokuje wysłanie prośby o opinię i nie pozwala na dołączenie tekstu zastępczego (placeholdera).
   - Rekord w arkuszu `ZGŁOSZENIA` nie jest oznaczany jako *Prośba o opinię wysłana = TAK*, jeśli link nie był zweryfikowany.
7. **Zabezpieczenie współbieżności wysyłki poczty (`communication.gs`):**
   - Funkcja `processSendEmail` została zabezpieczona blokadą skryptu (`LockService.getScriptLock()`).
   - Zachowano bezwzględną, serwerową blokadę odbiorcy testowego: wysyłka dozwolona jest wyłącznie na adres `wsb.student.tester@gmail.com`.
8. **Wycofanie modelu `gemini-2.0-flash` i dynamiczna konfiguracja Flash (`ai.gs`, `communication.gs`):**
   - Całkowicie wycofano nieaktualny model `gemini-2.0-flash` (wyłączony 1 czerwca 2026 r.).
   - Wprowadzono wspólną konfigurację `SMARTCARE_AI_CONFIG` z domyślnym modelem `gemini-3.6-flash`.
   - Wdrożono funkcję `getVerifiedGeminiModel(apiKey)` weryfikującą przez API listę dostępnych modeli bezpłatnych wspierających `generateContent`.
   - Całość operuje wyłącznie w bezpłatnych limitach Google AI Studio (brak płatnych usług).
9. **Rygorystyczna anonimizacja danych i weryfikacja przez pracownika (`ai.gs`):**
   - Zlikwidowano przekazywanie do AI nazwy ulicy, numeru posesji, nazwiska oraz danych kontaktowych mieszkańca (przekazywana jest jedynie ogólna miejscowość, np. *Kartuzy*).
   - Dodano interaktywne okno dialogowe weryfikacji przed wysyłką do AI (*Human-in-the-Loop*), w którym pracownik może przejrzeć i zedytować tekst po wstępnym regex-czyszczeniu.
10. **Rzeczywista integracja Google Forms i interfejs WWW (`js/config.js`, `index.html`):**
    - Wprowadzono do konfiguracji rzeczywisty adres utworzonego formularza Google Forms.
    - Dodano dedykowany przycisk bezpośredniego otwarcia formularza w nowej karcie (`btnOpenDirectLink`).
    - Zaktualizowano wersję na stronie głównej do `0.2.3`.

---

## [0.2.2] – 2026-11-25
### Wydanie Naprawcze: Pełna realizacja 15 punktów po niezależnym audycie kodu
- Eliminacja localStorage, instalator Container-bound, zabezpieczenia XSS, unikalne ID, blokada whitelist `wsb.student.tester@gmail.com`.

---

## [0.2.1] – 2026-11-25
### Wydanie Bezpieczeństwa: Dedykowane Konto Testowe i Twarda Blokada Serwerowa
- Powiązanie usług Google z kontem `wsb.student.tester@gmail.com`.

---

## [0.2.0] – 2026-11-25
### Rozszerzenie: Moduł Komunikacji z Klientem i Zarządzania Reputacją
- Dodanie menu `SmartCare` (szablony A–D, rejestracja rozmów, historia).

---

## [0.1.0] – 2026-11-25
### Wydanie Inicjalne (Prototyp Studencki WSB Merito)
- Responsywny interfejs WWW, arkusz CRM, warianty promptu AI, kody QR.
