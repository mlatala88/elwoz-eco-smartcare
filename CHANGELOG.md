# Dziennik Zmian (CHANGELOG) – ELWOZ ECO SmartCare

Wszystkie istotne zmiany i wydania w projekcie **ELWOZ ECO SmartCare** są rejestrowane w tym dokumencie zgodnie z konwencją [Semantic Versioning](https://semver.org/).

---

## [0.2.6] – 2026-11-25
### Wydanie Końcowe (FINAL RELEASE): Całkowita naprawa Dashboardu, dynamiczne mapowanie kolumn, wykresy analityczne, automatyczne powiadomienia e-mail, zweryfikowany profil Google oraz standardy CX i PR

#### Naprawione błędy i wdrożone usprawnienia:
1. **Całkowita naprawa Dashboardu i formuł statystycznych (`google/setup.gs`):**
   - **Dynamiczne mapowanie kolumn (`getTicketsColumnMap`):** Wyeliminowano sztywne litery kolumn (np. `B2:B`, `N2:N`), które przy dodaniu nowych kolumn przez Apps Script lub Google Forms rozjeżdżały zakresy danych. Formuły KPI pobierają teraz litery kolumn dynamicznie po dokładnych nazwach nagłówków arkusza `ZGŁOSZENIA`.
   - **Poprawa składni formuł Google Apps Script:** Zastąpiono przecinki regionalne/średniki (`;`) składnią US English z przecinkami (`,`), wymaganą natywnie przez metodę `Range.setFormula()`. Wyeliminowało to błąd ewaluacji `#ERROR!` w komórkach arkusza `DASHBOARD`.
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
7. **Poprawa czytelności rejestru `ZGŁOSZENIA` (`google/setup.gs`):**
   - Funkcja `formatTicketsSheetForReadability` ustawia stałą, ergonomiczną wysokość wierszy danych (28px) oraz strategię zawijania tekstu `SpreadsheetApp.WrapStrategy.CLIP` dla kolumn z długimi opisami i odpowiedziami AI.
   - Zapobiega to rozciąganiu wierszy na kilkaset pikseli i drastycznie zwiększa przejrzystość arkusza, przy zachowaniu pełnej zawartości komórek.
8. **Bezpieczna funkcja jednoklikowej aktualizacji (`updateSystemToV026`):**
   - W menu `📋 SmartCare` dodano pozycję `🚀 Aktualizuj system do v0.2.6`, która w sposób idempotentny odświeża formuły Dashboardu, generuje wykresy, dopisuje nowe parametry do USTAWIENIA, formatuje arkusz ZGŁOSZENIA i wyświetla raport podsumowujący bez utraty jakichkolwiek istniejących danych.

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
