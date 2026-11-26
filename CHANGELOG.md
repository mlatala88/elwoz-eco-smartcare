# Dziennik Zmian (CHANGELOG) – ELWOZ ECO SmartCare

Wszystkie istotne zmiany i wydania w projekcie **ELWOZ ECO SmartCare** są rejestrowane w tym dokumencie zgodnie z konwencją [Semantic Versioning](https://semver.org/).

---

## [0.2.8] – 2026-11-26
### Stabilizacja silnika CRM, obsługa limitów 15 RPM, eliminacja blokad rejestracji, audyt kolejki AI i warstwa Service API pod v0.3.0

Wydanie **v0.2.8** stanowi kluczową aktualizację stabilizacyjną silnika przed planowaną budową aplikacji webowej *SmartCare Manager v0.3.0*. Wszystkie modyfikacje powstały na bazie rzeczywistych testów użytkowników oraz niezależnego audytu kodu, zapewniając bezwzględną niezawodność, eliminację zacięć kolejki AI, obsługę limitów bezpłatnego planu Gemini oraz pełną ochronę danych.

#### Kluczowe poprawki i usprawnienia silnika (po audycie kodu v0.2.8):
1. **Automatyczna cykliczna kolejka AI & Ochrona Limitów 15 RPM (`scheduledQueueAndReconcile`):**
   - **Instalacja wyzwalacza czasowego (5 minut):** Wprowadzono funkcję `installScheduledQueueTrigger` uruchamiającą cykliczne przetwarzanie kolejki i uzupełnianie pominiętych zgłoszeń co 5 minut (`.everyMinutes(5)`), co optymalizuje zużycie dziennego limitu czasu wykonania Apps Script (90 min/dzień dla kont konsumenckich `@gmail.com`).
   - **Gwarancja unikalności wyzwalacza:** Mechanizm deduplikacji usuwa ewentualne zduplikowane wyzwalacze czasowe przed utworzeniem nowego (dokładnie 1 wyzwalacz typu `time-driven`).
   - **Odporność na brak aktywnego arkusza (Trigger Context):** Funkcje wyzwalane czasowo odzyskują arkusz poprzez trwały identyfikator w Script Properties: `SMARTCARE_SPREADSHEET_ID` w funkcji `getSmartCareSpreadsheet()`.
   - **Wspólna bariera Rate Limiting (4200 ms dla Flash 15 RPM):** Zaimplementowano funkcję `enforceGeminiRateLimit(modelName)` gwarantującą minimalny odstęp 4200 ms pomiędzy kolejnymi wywołaniami API Gemini we WSZYSTKICH ścieżkach generowania (zarówno analiza zgłoszeń, jak i redagowanie wiadomości w `polishMessageWithAiDirect`).
   - **Współbieżny Backoff po błędzie HTTP 429 (`RESOURCE_EXHAUSTED`):** W przypadku błędu 429 system zapisuje w Script Properties blokadę `GEMINI_BACKOFF_UNTIL` na 60 sekund. W tym czasie wszystkie kolejne żądania są bezpiecznie odraczane, a nowe zgłoszenia z formularza pozostają w stanie `"Oczekuje"` bez blokowania rejestracji.
   - **Limit maksymalnie 3 prób na zgłoszenie (`AI_RETRY_COUNT_${ticketId}`):** Po 3 nieudanych próbach stan AI przyjmuje wartość `"Błąd"`, a w kolumnie `Szczegóły błędu AI` zapisywany jest komunikat `"Przekroczono limit prób (3/3)"`.
   - **Atomowa rezerwacja per-ticket & odzyskiwanie zawieszonych analiz:** Wprowadzono `tryAcquireTicketAiLock(ticketId)` i `releaseTicketAiLock(ticketId)` chroniące przed współbieżną analizą tego samego zgłoszenia przez formularz, kolejkę czasową i akcję pracownika. Zgłoszenia w stanie `"W trakcie"` starsze niż 10 minut są automatycznie resetowane do stanu `"Oczekuje"` (`recoverStuckAiAnalyses`).

2. **Rejestracja zgłoszeń & Eliminacja wyścigu LockService (Race Condition):**
   - **Ponowny odczyt komórki pod blokadą:** W `reconcileUnprocessedFormResponses` komórka identyfikatora wiersza jest odczytywana *ponownie po* uzyskaniu blokady `LockService`. Zapobiega to nadpisaniu numeru ID, jeżeli `handleNewTicketSubmit` nadał identyfikator ułamek sekundy wcześniej.
   - **Brak spamu e-mail dla opóźnionych zgłoszeń:** Procedura uzupełniająca nigdy nie wysyła powiadomień e-mail dla zgłoszeń z przeszłości.
   - **Błyskawiczne zwalnianie blokady:** Czas trzymania blokady `LockService` ograniczono do <200ms; blokada jest zawsze zwalniana w bloku `finally` i nigdy nie obejmuje operacji sieciowych ani zapytań AI.

3. **Komunikacja, Szablony Awaryjne i Ochrona Jakości Treści (CX/PR):**
   - **Wyłączenie poufnych notatek pracownika z wiadomości do mieszkańca:** W `actionPrepareProgressUpdate` wewnętrzne notatki pracownika (`ticket.employeeNote`) zawierające uwagi dyspozytora lub dane o pracownikach nie są dołączane do korespondencji wychodzącej.
   - **Usunięcie niepotwierdzonych deklaracji operacyjnych:** Z szablonów i propozycji awaryjnych usunięto wzmianki o „przekazaniu pochwały kierownikowi” oraz „weryfikacji zlecenia przez dyspozytora”, opierając treść wyłącznie na faktach.
   - **Serwerowy filtr jakości treści (`validateMessageContentQuality`):** Zaimplementowano weryfikację jakości w `processSendEmail`, blokującą wysyłkę wiadomości zawierających wulgaryzmy, sformułowania agresywne, obelżywe lub sarkastyczne, niezależnie od tego, czy pracownik skorzystał z AI.
   - **Dedykowane szablony awaryjne (`generateTailoredEmergencyConfirmation`):**
     - *Pochwała / Podziękowanie:* Ciepłe podziękowanie w imieniu załogi, informacja o rejestrze wyróżnień, bezwzględny zakaz wspominania o GPS śmieciarki lub dochodzeniu dyspozytorskim.
     - *Zgłoszenie niekompletne:* Precyzyjna prośba o uzupełnienie brakujących danych (np. numer posesji, frakcja).
     - *Kompletna reklamacja:* Potwierdzenie rejestracji i przekazanie do weryfikacji operacyjnej w rejonie Kartuz.
   - **Ochrona przed błędnymi szkicami:** `actionPrepareConfirmation` ignoruje stary roboczy szkic CRM, jeśli `Stan analizy AI === "Błąd"`.

4. **Priorytety & Robocze Godziny SLA (07:00-16:00):**
   - **Trwałe rozróżnienie priorytetu domyślnego od zatwierdzonego:** Wprowadzono znacznik `PRIORITY_APPROVED_${ticketId}`. Model AI ani automatyczne procedury nigdy nie nadpisują żadnego ręcznie zatwierdzonego priorytetu pracownika (w tym priorytetu `STANDARDOWY`).
   - **Kalkulacja SLA w godzinach roboczych (`calculateBusinessHoursDeadline`):** Terminy SLA są obliczane wyłącznie w oknie poniedziałek–piątek w godzinach 07:00–16:00 (540 min roboczych/dzień). Noce i weekendy są pomijane; zgłoszenie weekendowe startuje w poniedziałek o 07:00.
   - **Precyzja Dashboardu i Service API:** Pierwszy kontakt nie jest oznaczany jako przeterminowany, jeżeli faktyczna data pierwszego kontaktu mieściła się w terminie SLA (`firstContactTime <= slaDeadline`). W `apiGetTicketsList` wyraźnie odróżniono aktywną zaległość pierwszej reakcji (`isOverdueFirstResponse`) od historycznego naruszenia SLA (`slaBreachedHistorically`).

5. **Rozszerzona Pre-walidacja & Edge Cases (`preValidateTicketData`):**
   - Odrzucenie wartości `"niewiadoma"` jako poprawnej nazwy ulicy (flaga braku ulicy).
   - Oflagowanie braku wskazania miejscowości w danych adresowych.
   - Niewrażliwość na wielkość liter frakcji `"metale i tworzywa sztuczne"`.
   - Wykrywanie fraz powtarzalności: `"po raz siódmy"`, `"po raz kolejny"`, `"kolejny raz"`, `"znowu"`.
   - Prośba o kontakt: zaznaczenie `"Nie"` nie wymaga numeru telefonu ani e-maila; zaznaczenie `"Tak"` z poprawnym adresem e-mail jest akceptowane bez wymuszania telefonu.
   - Elastyczny parser dat `parseDateValue` obsługujący formaty dwucyfrowe i separatory przecinkowe: `"27,11,26"`, `"27.11.26"`, `"27,11,2026"`.

6. **Ochrona Danych Osobowych (PII Guard & Strict Whitelist):**
   - **Lokalne maskowanie PII (`anonymizeSensitiveInfo`):** Skuteczne wycinanie z opisu imienia, nazwiska, nazwy ulicy, numeru posesji, telefonu i adresu e-mail zgłaszającego.
   - **PII High-Risk Guard:** Wykrycie w opisie danych wysokiego ryzyka (np. 16-cyfrowy numer karty płatniczej, seria i numer dowodu osobistego) bezwzględnie wstrzymuje wysyłkę do API Gemini i ustawia `Stan analizy AI = "Wymaga weryfikacji"`.
   - **Strict Whitelist Guard:** Serwer bezwarunkowo ogranicza wysyłkę e-mail do `APPROVED_TEST_RECIPIENT = "wsb.student.tester@gmail.com"`. Każda próba przekierowania jest blokowana i logowana.

7. **Warstwa Service API pod SmartCare Manager v0.3.0:**
   - `apiUpdateTicket`: bezwzględna blokada przejścia w stan `"Rozwiązane"` lub `"Zamknięte"` bez wypełnionego pola `resolutionMethod` (Sposób rozwiązania sprawy).
   - `apiUpdateTicket`: zabezpieczenie przed nadpisywaniem `Data rozwiązania` przy kolejnych edycjach już zamkniętej sprawy.
   - `apiGetTicketsList`: rozszerzenie zwracanego obiektu o pola `assignedEmployee` i `nextActionDeadline`.
   - `apiTriggerAiAnalysis`: zwracanie rzeczywistego stanu operacji i szczegółów błędu.
   - Pełna zgodność typów `Utilities.formatDate` (wymuszenie poprawnych instancji obiektów `Date`).

8. **Zautomatyzowany Zestaw Testów Audytowych (`tests/test-v028-audit.js`):**
   - 33 testy jednostkowe i integracyjne w 7 modułach audytowych, 100% PASS (33/33).
   - Repozytorium zachowuje kompletny kod testowy do weryfikacji przez zespół oceniający.

---

## [0.2.7] – 2026-11-25
### Customer Service Intelligence (CSI): Inteligentny asystent biura obsługi klienta, automatyczna analiza w tle, 4 poziomy priorytetów i SLA, Centralny Panel Obsługi oraz Kolejka Spraw

#### Nowe moduły i kluczowe innowacje v0.2.7:
1. **Automatyczna analiza w tle bez blokowania zgłoszenia (`google/ai.gs`, `google/setup.gs`):**
   - Po zarejestrowaniu zgłoszenia przez formularz Google Forms funkcja `handleNewTicketSubmit` niezwłocznie przypisuje identyfikator sprawy, a następnie asynchronicznie/w tle wywołuje procedurę `triggerAutoAiAnalysisForTicket`.
   - Analiza wykonuje lokalną pre-walidację oraz odpytuje model Gemini Flash, zapisując pełną strukturę 9 pól do CRM (`Stan analizy AI`: *Gotowa* lub *Wymaga weryfikacji*).
   - Ewentualne chwilowe problemy z API Gemini nie blokują zapisu zgłoszenia ani powiadomień e-mail.
2. **Lokalna pre-walidacja regułowa przed wywołaniem AI (`preValidateTicketData`):**
   - Weryfikacja regułowa bez zużywania tokenów LLM:
     - **Reguły zależne od kategorii:** Pochwały i wnioski nie wymagają dokładnego adresu; brak odbioru i uszkodzone pojemniki wymagają miejscowości i ulicy z numerem posesji.
     - **Poprawność danych kontaktowych:** Weryfikacja formatu e-mail oraz długości numeru telefonu.
     - **Wykrywanie pozornych odpowiedzi:** Filtrowanie placeholderów (*test, asdf, xxx, brak, nie wiem*).
     - **Wykrywanie sprzeczności logicznych:** Wykrywanie rozbieżności między zadeklarowaną frakcją (np. BIO) a treścią opisu (np. plastik, tworzywa sztuczne).
     - **Wykrywanie słów kluczowych zagrożenia/pilności:** Automatyczne flagowanie słów kluczowych (*zagrożenie, wyciek, gryzonie, fetor, smród, pożar, zablokowany dojazd*) oraz powtarzalności (*kolejny raz, znowu*).
     - **Ochrona prywatności i filtr RODO:** Maskowanie numerów PESEL, e-maili i telefonów przed przekazaniem do modelu.
3. **Rozszerzony schemat Structured Outputs (10 pól):**
   - Zwiększono schemat JSON do 10 pól: `kategoria`, `streszczenie`, `sugerowanyPriorytet` (PILNY, WYSOKI, STANDARDOWY, NISKI), `uzasadnieniePriorytetu`, `brakujaceInformacje`, `wykryteSprzecznosci`, `sugerowaneDzialanie`, `rekomendowanyKrok`, `rekomendowanaStronaKroku`, `proponowanaOdpowiedz`.
4. **4-stopniowy model priorytetów oraz SLA:**
   - **PILNY** (czerwony, 15 min): zagrożenie sanitarne, bezpieczeństwo, fetor, zablokowany dojazd, wielokrotne reklamacje,
   - **WYSOKI** (pomarańczowy, 60 min): brak odbioru całej ulicy, reklamacja ponowna,
   - **STANDARDOWY** (niebieski, 240 min = 4 godz.): standardowy brak odbioru, wymiana pojemnika,
   - **NISKI** (zielony, 1440 min = 24 godz.): zapytania ogólne, wnioski, pochwały.
5. **🎯 Centralny Panel Obsługi Zgłoszenia (`actionOpenCentralTicketHub`):**
   - Okno modalne 920x680px stanowiące zintegrowany pulpit dyspozytora:
     - Pełny podgląd danych mieszkańca, problemu i lokalizacji,
     - Wyniki pre-walidacji regułowej oraz wnioski AI,
     - Edytor stanu: status, priorytet, pracownik odpowiedzialny,
     - Zarządzanie kolejnym krokiem: treść działania, strona odpowiedzialna (*Przedsiębiorstwo* / *Mieszkaniec*), termin kroku oraz stan SLA,
     - Szybka komunikacja: przejście do szablonów z pre-wypełnioną treścią AI w 0 sekund,
     - Zapis do CRM za pomocą funkcji `saveTicketPanelUpdates`.
6. **📊 Przeglądarka Kolejki Spraw i Filtry Operacyjne (`actionOpenQueueBrowser`):**
   - Interaktywna przeglądarka spraw z filtrami operacyjnymi:
     - Wszystkie aktywne,
     - Przeterminowane SLA / Pilne,
     - Brak kolejnego kroku,
     - Oczekuje na mieszkańca,
     - Termin dzisiaj.
   - Bezpośredni przycisk *🎯 Obsłuż* otwierający Centralny Panel dla wybranej sprawy.
7. **⏰ Monitorowanie SLA i Skonsolidowany Alert E-mail (`actionCheckSlaAlerts`):**
   - Weryfikacja aktywnych spraw pod kątem przekroczenia SLA i braku kolejnego kroku.
   - Wysłanie pojedynczego, estetycznego raportu e-mail do `wsb.student.tester@gmail.com`.
8. **Gotowa pierwsza odpowiedź ładowana w 0 sekund:**
   - Wykorzystanie pola `Proponowana odpowiedź AI` bezpośrednio w szablonie potwierdzenia, eliminujące 24-sekundowy czas oczekiwania na generowanie tekstu.
9. **Rozszerzony Dashboard operacyjny CSI (`setup.gs`):**
   - Wzbogacenie Dashboardu o sekcję wskaźników CSI: sprawy pilne/wysokie, przeterminowane SLA, brakujące pierwsze odpowiedzi, brakujące kolejne kroki, sprawy oczekujące na mieszkańca oraz z terminem na dzisiaj.
   - Zapewnienie pełnej kompatybilności z `pl_PL` i silnikiem Ground Truth.
10. **Bezpieczna funkcja aktualizacji systemu (`updateSystemToV027`):**
    - Dodaje nowe kolumny do `ZGŁOSZENIA`, aktualizuje arkusz `USTAWIENIA`, formatowanie warunkowe priorytetów oraz Dashboard CSI.
    - Zero utraty danych: zachowuje wszystkie istniejące zgłoszenia testowe (`ELW-2026-0001` do `ELW-2026-0003`) oraz ich historię.

---

## [0.2.6] – 2026-11-25
### Wydanie Końcowe (FINAL RELEASE): Całkowita naprawa Dashboardu, dynamiczne mapowanie kolumn, wykresy analityczne, automatyczne powiadomienia e-mail, zweryfikowany profil Google oraz standardy CX i PR

#### Naprawione błędy i wdrożone usprawnienia:
1. **Całkowita naprawa Dashboardu i formuł statystycznych (`google/setup.gs`):**
   - **Dynamiczne mapowanie kolumn (`getTicketsColumnMap`):** Wyeliminowano sztywne litery kolumn (np. `B2:B`, `N2:N`), które przy dodaniu nowych kolumn przez Apps Script lub Google Forms rozjeżdżały zakresy danych. Formuły KPI pobierają teraz litery kolumn dynamicznie po dokładnych nazwach nagłówków arkusza `ZGŁOSZENIA`.
   - **Zgodność z ustawieniami regionalnymi (pl_PL vs en_US):** Funkcja `getFormulaSeparator(spreadsheet)` dynamicznie sprawdza `getSpreadsheetLocale()`. W arkuszach z polskim locale (`pl_PL`) argumenty funkcji formuł rozdzielane są średnikami (`;`), zapobiegając konfliktom z przecinkiem jako separatorem dziesiętnym i eliminując błędy `#ERROR!`.
   - **Niezależny silnik obliczeniowy Apps Script (Ground Truth Engine):** Funkcja `calculateDashboardMetrics` w czystym JavaScript przetwarza dane z CRM i w razie jakichkolwiek problemów ze składnią formuł w środowisku użytkownika bezpiecznie wpisuje obliczone wartości, gwarantując niezawodność wskaźników i wykresów.
   - **Ścisła weryfikacja integralności (`validateDashboardIntegrity`):** Sprawdzanie braku błędów `#ERROR!`, `#REF!`, `#VALUE!`, `#N/A` oraz porównanie liczby zgłoszeń z CRM; blokada okna sukcesu w przypadku wystąpienia nieprawidłowości.
   - **Prawidłowe zliczanie zgłoszeń i kategorii:** Zastąpiono podatną na błędy konstrukcję `COUNTA(FILTER(...))` stabilną funkcją `COUNTIF(range, "<>")` oraz `COUNTIF(range, "*" & category & "*")`, dzięki czemu 3 istniejące zgłoszenia testowe (`ELW-2026-0001`, `ELW-2026-0002`, `ELW-2026-0003`) zwracają łączną liczbę 3 i po 1 w odpowiednich kategoriach (zamiast błędnego wyniku 1 i 0).
   - **Wskaźnik zadowolenia mieszkańców:** Formuła `AVERAGE(IFERROR(FILTER(...)))` poprawnie liczy średnią arytmetyczną z wypełnionych ocen (np. 4.50 przy ocenach 4 i 5), a w przypadku braku ocen wyświetla bezpieczną wartość `0.0`.
   - **Odsetek opinii:** Prawidłowo kalkulowany wyłącznie z mianownika zgłoszeń o statusie *Rozwiązane*.
2. **Dodanie 2 wykresów analitycznych do Dashboardu (`google/setup.gs`):**
   - **Wykres 1 (Słupkowy - BAR):** „Zgłoszenia według kategorii” – wizualizacja rozkładu problemów mieszkańców z dynamicznym źródłem danych `DASHBOARD!B15:C20`.
   - **Wykres 2 (Kolumnowy - COLUMN):** „Zgłoszenia według statusów” – rozkład stanów spraw z dynamicznym źródłem danych `DASHBOARD!E15:F19`.
   - **Zabezpieczenie przed duplikacją wykresów:** Funkcja `setupDashboardCharts` usuwa istniejące wykresy przed wygenerowaniem nowych, zapobiegając nawarstwianiu się obiektów.
3. **Automatyczne powiadomienia e-mail o nowych zgłoszeniach (`google/setup.gs`, `google/communication.gs`):**
   - Po wysłaniu formularza Google Forms funkcja `handleNewTicketSubmit` (działająca w bezpiecznym bloku `LockService`) natychmiast wysyła estetyczne, responsywne powiadomienie HTML do biura obsługi klienta.
   - Odbiorca jest bezwarunkowo ograniczony do autoryzowanego konta testowego: `wsb.student.tester@gmail.com`.
   - W zakładce `USTAWIENIA` dodano parametry sterujące: `Automatyczne powiadomienia o nowych zgłoszeniach` (`WŁĄCZONE` / `WYŁĄCZONE`) oraz `Adres odbiorcy powiadomień`.
   - Każde wysłane powiadomienie wewnętrzne jest rejestrowane w `HISTORIA KOMUNIKACJI` z akcją `Nowe zgłoszenie (powiadomienie)` i nie jest wliczane do czasu reakcji na rzecz mieszkańca.
4. **Integracja zweryfikowanego profilu i linku do opinii Google:**
   - Wprowadzono zatwierdzony i sprawdzony bezpośredni link do wystawiania opinii w Profilu Google: `https://search.google.com/local/writereview?placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA`.
   - Link jest domyślnie skonfigurowany w `USTAWIENIA` oraz w `communication.gs`.
   - Aktywowano opcję dołączania neutralnego zaproszenia do opinii w szablonie rozwiązania zgłoszenia oraz jako niezależną wiadomość z prośbą o opinię (z ochroną przed ponowną przypadkową wysyłką).
5. **Blokada przycisków i statusy w oknie edycji wiadomości (`google/communication.gs`):**
   - W oknie `showEmailComposer` funkcja `personalizeWithAi` blokuje przycisk zatwierdzania i wysyłki (`btnSubmit.disabled = true`) na czas generowania stylizacji przez model Gemini Flash.
   - Wyświetlany jest animowany komunikat: `AI przygotowuje odpowiedź… (Gemini Flash weryfikuje styl, gramatykę i zasady PR)`.
   - Po zakończeniu działania (zarówno przy sukcesie, jak i przy błędzie) przyciski są odblokowywane, a pracownik ma pełną swobodę ręcznej weryfikacji i edycji treści przed ostatecznym kliknięciem *Zatwierdź i wyślij*.
   - Zachowano poprawne escapowanie znaków nowej linii `\\n` w skryptach modalnych, eliminując błędy parsera JS w oknie klienta.
6. **Wdrożenie rygorystycznych standardów komunikacji PR i CX (`google/communication.gs`):**
   - Wzbogacono prompt systemowy dla asystenta redakcyjnego o jednoznaczne wytyczne:
     - Neutralny i profesjonalny zwrot powitalny: *Dzień dobry,*,
     - Wyrażenie podziękowania za kontakt oraz stosowne przeprosiny za niedogodności w uzasadnionych przypadkach,
     - Ścisły zakaz ujawniania wewnętrznych kar, reprymend, nagan, rozmów dyscyplinujących pracowników lub załóg pojazdów,
     - Ścisły zakaz zmyślania faktów, tras i ustaleń niewynikających z dokumentacji,
     - Ścisły zakaz formalnego uznawania roszczeń finansowych lub odszkodowawczych spółki,
     - Automatyczne wycinanie pozostałości znaczników interfejsu (np. `[Opis]`, `ID Zgłoszenia:`).
7. **Poprawa czytelności rejestru `ZGŁOSZENIA` oraz zawijania nagłówków Dashboardu (`google/setup.gs`):**
   - Funkcja `formatTicketsSheetForReadability` ustawia stałą, ergonomiczną wysokość wierszy danych (28px) oraz strategię zawijania tekstu `SpreadsheetApp.WrapStrategy.CLIP` dla kolumn z długimi opisami i odpowiedziami AI.
   - Włączono pełne zawijanie tekstu nagłówków (`setWrap(true)`) na Dashboardzie (wiersze 4, 7, 10, 13) oraz w arkuszu ZGŁOSZENIA (wiersz 1 z wysokością 48px), eliminując ucięte napisy.
8. **Zgodność z polskimi ustawieniami regionalnymi (pl_PL) i autokalibracja formuł (`google/setup.gs`):**
   - Wprowadzono dynamiczne wykrywanie separatora formuł przez `getFormulaSeparator(spreadsheet)` na podstawie `getSpreadsheetLocale()`. W arkuszach z polskim locale stosowany jest średnik (`;`), eliminujący konflikt z przecinkiem dziesiętnym i błędy `#ERROR!`.
   - Zaimplementowano dwuetapową autokalibrację z próbą alternatywnego separatora w razie wykrycia problemów ze składnią.
9. **Niezależny silnik analityczny Apps Script (Ground Truth Engine):**
   - Funkcja `calculateDashboardMetrics(ticketSheet)` w czystym JavaScript przetwarza dane z CRM, obliczając wolumeny, czasy reakcji w godzinach, satysfakcję i rozkłady.
   - W przypadku trudności z ewaluacją formuł w arkuszu klienta, dane są natychmiast uzupełniane czystymi wartościami liczbowymi bez błędów `#ERROR!`, co gwarantuje pełne i bezbłędne działanie obu wykresów.
10. **Rzeczywista walidacja integralności i blokada fałszywego sukcesu (`validateDashboardIntegrity`):**
    - Po aktualizacji skrypt wykonuje `SpreadsheetApp.flush()` i weryfikuje każdy wskaźnik pod kątem błędów `#ERROR!`, `#REF!`, `#VALUE!`, `#N/A`, `#NAME?`, `#DIV/0!`, `#NUM!`.
    - Skrypt porównuje liczbę zgłoszeń wyświetlaną w B5 z faktyczną liczbą w CRM oraz sprawdza obecność 2 wykresów.
    - W przypadku wykrycia jakichkolwiek błędów skrypt **nie wyświetla komunikatu o sukcesie**, lecz okno ostrzegawcze z dokładną listą nieprawidłowych komórek.
11. **Aktualizacja zakładki `INSTRUKCJA AI`:**
    - Zaktualizowano nagłówek zakładki do wersji `v0.2.6 (FINAL RELEASE)`.
12. **Bezpieczna funkcja jednoklikowej aktualizacji (`updateSystemToV026`):**
    - W menu `📋 SmartCare` dostępna jest pozycja `🚀 Aktualizuj system do v0.2.6`, która w sposób idempotentny odświeża formuły Dashboardu, kalibruje locale, weryfikuje wykresy, dopisuje nowe parametry do USTAWIENIA, formatuje arkusz ZGŁOSZENIA i wyświetla raport podsumowujący bez utraty danych.

#### Naprawione błędy i wdrożone poprawki:
1. **Usunięcie błędu „Treść wygenerowana przez model nie zawiera struktury JSON (brak klamer)” (`ai.gs`):**
   - Zidentyfikowano przyczynę: limit `maxOutputTokens: 1000` był wyczerpywany przez wewnętrzny łańcuch rozumowania (reasoning tokens) nowoczesnych modeli z rodziny Gemini Flash, przez co model osiągał `finishReason: MAX_TOKENS` i urywał wypowiedź zanim wygenerował klamry JSON.
   - Zwiększono limit `maxOutputTokens` z 1000 do **8192**.
2. **Wdrożenie konfiguracji poziomu myślenia `thinkingConfig` (`ai.gs`, `communication.gs`):**
   - Wprowadzono `thinkingConfig.thinkingLevel: "MINIMAL"` dla modeli Gemini 3+ oraz `thinkingBudget: 0` dla Gemini 2.5, ograniczając zbędną konsumpcję tokenów na myśli wstępne i gwarantując natychmiastowe generowanie czystego JSON.
3. **Optymalizacja temperatury modelu (`temperature: 1.0`):**
   - Zastosowano oficjalne zalecenie Google dla modeli rozumujących Gemini ze Structured Outputs (temperatura 1.0 zapobiega zapętleniom, obcięciom i degradacji głębokości wnioskowania).
4. **Wczesna kontrola `finishReason` przed próbą parsowania JSON (`ai.gs`, `communication.gs`):**
   - Sprawdzanie flag `finishReason` (`MAX_TOKENS`, `SAFETY`, `RECITATION`) następuje BEZWZGLĘDNIE przed parsowaniem JSON. Przy ucięciu odpowiedzi natychmiast zgłaszana jest czytelna informacja o tokenach zamiast mylącego błędu składniowego.
5. **Selekcja zweryfikowanych modeli generujących tekst (`ai.gs`):**
   - Funkcja `getVerifiedGeminiModel` filtruje wyłącznie modele tekstowe obsługujące `generateContent` i Structured Outputs z bezpłatnej puli (`gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-2.5-flash`), wykluczając modele specjalistyczne.
6. **Pełna diagnostyka odpowiedzi i zużycia tokenów (`ai.gs`):**
   - Do każdego wyniku dołączana jest pełna diagnostyka: aktywny model, kod HTTP, `finishReason`, liczba części odpowiedzi, liczba odfiltrowanych bloków myśli (`thought: true`), długość tekstu oraz zużycie tokenów z `usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `thinkingTokenCount`, `totalTokenCount`).
7. **Kontrolowane ponowienie zapytania (1 retry) (`ai.gs`, `communication.gs`):**
   - Zaimplementowano pojedyncze ponowienie próby (`callGeminiApiWithRetry` / `polishMessageWithAi`) z 1-sekundowym opóźnieniem przy ucięciu odpowiedzi lub przejściowym błędzie sieci.
8. **Samodzielna funkcja diagnostyczna `testGeminiApiIntegration` (`ai.gs`, `communication.gs`):**
   - Dodano funkcję testową i nową pozycję w menu arkusza: `📋 SmartCare -> 🔍 Test diagnostyczny Gemini API`, pozwalającą przetestować całe połączenie API na danych mockowych i wyświetlić sformatowane okno dialogowe z kompletem metadanych wykonania.
9. **Twarde maskowanie danych i klucza API:**
   - Wszelkie logi, powiadomienia i komunikaty błędów bezwzględnie maskują klucz API (`key=[UKRYTY]`), prompt oraz dane osobowe mieszkańców.

---

## [0.2.4] – 2026-11-25
### Wydanie Naprawcze: Natywne Gemini Structured Outputs, filtracja bloków 'thought' i stabilność API

#### Naprawione błędy i wdrożone poprawki:
1. **Usunięcie błędu `SyntaxError: Unexpected token 'o', " o weryfika"... is not valid JSON` (`ai.gs`):**
   - Zidentyfikowano przyczynę: modele rozumujące (thinking models / Gemini Flash) zwracają w `candidates[0].content.parts` proces myślowy (`thought: true`) przed właściwą odpowiedzią. Poprzednia wersja odczytywała `parts[0].text`, trafiając na tekst myśli modelu zaczynający się od `" o weryfikacji..."`.
   - Wprowadzono bezwzględne filtrowanie części odpowiedzi: części z `part.thought === true` są pomijane, a właściwa treść jest odczytywana wyłącznie z części merytorycznych (`!part.thought`).
2. **Natywna implementacja Gemini Structured Outputs (`ai.gs`):**
   - Wdrożono schemat `responseSchema` zgodny z dokumentacją REST API Gemini (`https://ai.google.dev/gemini-api/docs/generate-content/structured-output`) oraz `responseMimeType: "application/json"`.
   - Wymuszono ścisłą strukturę pól odpowiadających kolumnom arkusza CRM: `kategoria`, `streszczenie`, `sugerowanyPriorytet`, `brakujaceInformacje`, `sugerowaneDzialanie`, `proponowanaOdpowiedz`.
3. **Rozróżnienie warstwy HTTP API od treści wygenerowanej przez model (`ai.gs`):**
   - Obsłużono kody błędów HTTP: 429 (przekroczenie limitu / Quota Exceeded), 401/403 (błąd autoryzacji / zły klucz), 500/503 (chwilowa niedostępność usługi).
   - Wprowadzono weryfikację flag zakończenia generowania: `SAFETY`, `RECITATION` oraz `MAX_TOKENS`.
4. **Weryfikacja kompletności struktury przed zapisem do CRM (`ai.gs`):**
   - Dodano funkcję `validateAiAnalysisResult`, która sprawdza obecność i niepustość wszystkich wymaganych pól przed wywołaniem zapisu do komórek arkusza `ZGŁOSZENIA`.
   - Błędne lub niekompletne odpowiedzi nie są zapisywane do CRM.
5. **Obsługa błędów w oknie weryfikacji Human-in-the-Loop (`ai.gs`):**
   - W przypadku wystąpienia błędu okno dialogowe analizy **nie jest zamykane**, a treść edytowana przez pracownika pozostaje nienaruszona.
   - W oknie wyświetla się czytelny komunikat błędu z przyciskiem umożliwiającym natychmiastowe ponowienie próby (`🤖 Ponów analizę AI`).
6. **Poprawa personalizacji wiadomości AI (`communication.gs`):**
   - W funkcji `polishMessageWithAi` wdrożono filtrowanie bloków `thought: true` oraz dedykowany schemat Structured Output (`stylizowanaTresc`), eliminując ryzyko wklejenia myśli modelu do treści e-maila.
7. **Bezpieczeństwo i maskowanie klucza API (`ai.gs`, `communication.gs`):**
   - Wszelkie logi błędów oraz komunikaty sieciowe filtrują parametr `key=` za pomocą funkcji `maskApiKey`, uniemożliwiając wyciek klucza do logów Execution Transcript.

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
