# ELWOZ ECO SmartCare – Cyfrowy Punkt Obsługi Mieszkańca
**Wersja:** 0.2.8 (Stabilizacja silnika CRM, obsługa limitów 15 RPM, eliminacja blokad LockService, audyt kolejki AI, Service API pod v0.3.0)  
**Projekt zaliczeniowy:** *Nowoczesne technologie w marketingu i sprzedaży* – Uniwersytet WSB Merito w Gdańsku  
**Przedsiębiorstwo:** ELWOZ ECO Sp. z o.o.  
**Obszar wdrożenia:** Rejon Kartuz i okoliczne sołectwa  
**Oficjalna strona przedsiębiorstwa:** [elwozeco.pl](https://elwozeco.pl/)  
**Dedykowane konto testowe Google:** `wsb.student.tester@gmail.com`  
**Publiczna strona demonstracyjna (GitHub Pages):** [https://mlatala88.github.io/elwoz-eco-smartcare/](https://mlatala88.github.io/elwoz-eco-smartcare/)  
**Aktywny formularz Google Forms:** [https://docs.google.com/forms/d/e/1FAIpQLSdZXjHX0Tt5GqF5yacDZpouKtrcsxPBhXx-K2s5cqYfEFtnkA/viewform](https://docs.google.com/forms/d/e/1FAIpQLSdZXjHX0Tt5GqF5yacDZpouKtrcsxPBhXx-K2s5cqYfEFtnkA/viewform)  
**Zweryfikowany link do opinii Google:** [https://search.google.com/local/writereview?placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA](https://search.google.com/local/writereview?placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA)

---


- **Zautomatyzowany audyt testowy (`tests/test-v028-audit.js`):** Kompletny zestaw 40 testów automatycznych (100% PASS, 40/40) pokrywający kolejkę AI, barierę 15 RPM (4200 ms), cooldown 429, blokady współbieżności per-ticket, dynamiczną komunikację CX/PR, robocze godziny SLA (7:00-16:00), ochronę PII oraz Service API.

## Spis treści
1. [Kontekst i cel projektu](#1-kontekst-i-cel-projektu)
2. [Główne założenia i architektura](#2-główne-założenia-i-architektura)
3. [Dedykowane konto testowe i podział środowisk](#3-dedykowane-konto-testowe-i-podział-środowisk)
4. [Twarde zabezpieczenie serwerowe (Server-Side Whitelist Guard)](#4-twarde-zabezpieczenie-serwerowe-server-side-whitelist-guard)
5. [Wykorzystane technologie](#5-wykorzystane-technologie)
6. [Struktura repozytorium](#6-struktura-repozytorium)
7. [Instrukcja instalacji Container-bound oraz aktualizacji plików Apps Script](#7-instrukcja-instalacji-container-bound-oraz-funkcja-jednoklikowej-aktualizacji)
8. [Natywny formularz Google Forms i eliminacja localStorage](#8-natywny-formularz-google-forms-i-eliminacja-localstorage)
9. [Menu pracownika „SmartCare” w Google Sheets](#9-menu-pracownika-smartcare-w-google-sheets)
10. [Rzetelne szablony wiadomości i procedura komunikacji](#10-rzetelne-szablony-wiadomości-i-procedura-komunikacji)
11. [Zarządzanie reputacją i zasady opinii Google](#11-zarządzanie-reputacją-i-zasady-opinii-google)
12. [Dziennik audytu (HISTORIA KOMUNIKACJI)](#12-dziennik-audytu-historia-komunikacji)
13. [Rozszerzony Dashboard i Rejestr Zgłoszeń (Kalkulacje KPI i Wykresy)](#13-rozszerzony-dashboard-i-rejestr-zgłoszeń-kalkulacje-kpi-i-wykresy)
14. [Gemini Structured Outputs, kontrola tokenów i diagnostyka](#14-gemini-structured-outputs-kontrola-tokenów-i-diagnostyka)
15. [Instrukcja publikacji na GitHub Pages](#15-instrukcja-publikacji-na-github-pages)
16. [Generowanie Kodu QR (Dla pojemników i prezentacji)](#16-generowanie-kodu-qr-dla-pojemników-i-prezentacji)
17. [Procedura testowania i weryfikacja](#17-procedura-testowania-i-weryfikacja)
18. [Koszty, limity i wymagania licencyjne](#18-koszty-limity-i-wymagania-licencyjne)
19. [Wykaz działań wymagających ręcznej autoryzacji](#19-wykaz-działań-wymagających-ręcznej-autoryzacji)

---

## 1. Kontekst i cel projektu

Projekt **ELWOZ ECO SmartCare** realizowany jest na Uniwersytecie WSB Merito w Gdańsku jako studencki projekt wdrożeniowy dedykowany spółce **ELWOZ ECO Sp. z o.o.**, odpowiedzialnej za odbiór odpadów komunalnych w rejonie Kartuz.

Wydanie **0.2.7 (Customer Service Intelligence - CSI)** przekształca system rejestracji zgłoszeń w inteligentnego asystenta pracownika biura obsługi klienta:
- **Automatyczna analiza w tle (nieblokująca):** Po wpłynięciu formularza funkcja `handleNewTicketSubmit` nieblokująco uruchamia proces analizy AI, nie opóźniając rejestracji zgłoszenia ani wysyłki powiadomień wewnętrznych.
- **Lokalna pre-walidacja regułowa (`preValidateTicketData`):** Weryfikacja kompletności danych zależna od kategorii (brak wymogu numeru posesji przy pochwałach/sugestiach vs wymóg przy braku odbioru), kontrola formatu e-mail/telefonu, wykrywanie pozorowanych odpowiedzi oraz rozbieżności między frakcją w formularzu a treścią opisu (np. BIO vs plastik).
- **Wykrywanie zagrożeń i powtarzalności:** Automatyczne flagowanie słów kluczowych fetoru, szczurów, zablokowanego przejazdu lub wielokrotnych reklamacji z rekomendacją priorytetu PILNY.
- **4 poziomy priorytetów i SLA:** `PILNY` (15 min), `WYSOKI` (1h), `STANDARDOWY` (4h), `NISKI` (24h) z autokalibracją terminów reakcji.
- **Pre-generowana pierwsza odpowiedź (0 sekund oczekiwania):** Odpowiedź jest generowana w tle i zapisywana w CRM (`Proponowana odpowiedź AI`), dzięki czemu otwarcie kreatora wiadomości przez pracownika jest natychmiastowe (0 sekund zamiast 20s oczekiwania na LLM).
- **🎯 Centralny Panel Obsługi Zgłoszenia (`actionOpenCentralTicketHub`):** Nowoczesne okno modalne 920x680px integrujące widok 360° mieszkańca, inteligencję AI, planowanie kolejnego kroku operacyjnego, określenie strony odpowiedzialnej (*Przedsiębiorstwo* vs *Mieszkaniec*) oraz natychmiastowe akcje.
- **📊 Kolejka spraw i filtry operacyjne (`actionOpenQueueBrowser`):** Interaktywna przeglądarka zgłoszeń filtrująca sprawy po przeterminowanym SLA, priorytecie PILNY/WYSOKI, braku 1. odpowiedzi, braku kolejnego kroku lub oczekiwaniu na mieszkańca.
- **Customer Service Intelligence Dashboard:** Dynamiczne metryki spraw pilnych/wysokich, przeterminowanych SLA, brakujących odpowiedzi i kroków z pełnym wsparciem ustawień regionalnych `pl_PL` (średnik `;`) i silnikiem Apps Script Ground Truth.
- **Jednoklikowa aktualizacja:** Funkcja `🚀 Aktualizuj system do v0.2.7` w menu arkusza.
- **Human-in-the-Loop:** Przed wysłaniem jakiejkolwiek korespondencji pracownik weryfikuje treść w oknie dialogowym, a twarda blokada serwerowa chroni przed wysyłką poza dedykowane konto testerskie `wsb.student.tester@gmail.com`.

---

## 2. Główne założenia i architektura

- **Prawdziwy obieg danych:** Zgłoszenia z formularza trafiają bezpośrednio do arkusza Google Sheets za pośrednictwem natywnej integracji Google Forms (brak symulacji w pamięci przeglądarki).
- **Zasada Human-in-the-Loop:** Sztuczna inteligencja nie podejmuje wiążących decyzji prawnych, nie wymyśla terminów odbioru, nie deklaruje uznania reklamacji i nie wysyła wiadomości bez wyraźnej autoryzacji pracownika.
- **Odpowiedzialność za słowo:** Szablony wiadomości opierają się wyłącznie na potwierdzonych faktach i wpisie w polu *Sposób rozwiązania sprawy*, bez niepotwierdzonych deklaracji o załogach w terenie.
- **Brak haseł i kluczy w kodzie:** Żadne hasła, klucze API ani tokeny dostępowe nie są umieszczane w kodzie źródłowym ani repozytorium GitHub.

---

## 3. Dedykowane konto testowe i podział środowisk

Projekt wykorzystuje architekturę dwukontową:

1. **Dedykowane konto Google:** `wsb.student.tester@gmail.com`
   - Właściciel prywatnego arkusza Google Sheets (*ELWOZ ECO SmartCare – Centrum zgłoszeń*);
   - Właściciel publicznego formularza Google Forms;
   - Środowisko wykonawcze skryptów Google Apps Script (`setup.gs`, `communication.gs`, `ai.gs`);
   - Właściciel bezpłatnego projektu Google AI Studio (klucz Gemini Flash w `ScriptProperties`);
   - **Jedyny bezwarunkowo zatwierdzony serwerowy cel testowy dla korespondencji e-mail.**
2. **Konto GitHub użytkownika:**
   - Hostuje publiczne repozytorium kodu `elwoz-eco-smartcare`;
   - Serwuje stronę demonstracyjną przez **GitHub Pages**.

---

## 4. Twarde zabezpieczenie serwerowe (Server-Side Whitelist Guard)

W module [google/communication.gs](google/communication.gs) wdrożono bezwzględną weryfikację po stronie serwera w funkcji `processSendEmail`:

```javascript
// Stała serwerowa – jedyny dopuszczalny odbiorca testowy
const APPROVED_TEST_RECIPIENT = "wsb.student.tester@gmail.com";

// BEZWARUNKOWA BLOKADA WYSYŁKI:
const targetEmail = APPROVED_TEST_RECIPIENT;

if (!targetEmail || targetEmail.toLowerCase().trim() !== APPROVED_TEST_RECIPIENT.toLowerCase().trim()) {
  return {
    success: false,
    error: "BEZWARUNKOWA BLOKADA BEZPIECZEŃSTWA: Dozwolony odbiorca to wyłącznie " + APPROVED_TEST_RECIPIENT
  };
}
```

### Charakterystyka zabezpieczenia:
1. **Brak przełącznika na produkcję:** W prototypie akademickim wysyłka na jakikolwiek inny adres jest trwale i bezwarunkowo zablokowana.
2. **Odporność na błędy i manipulacje:** Niezależnie od parametrów przekazanych z formularza lub wpisów w arkuszu, backend zawsze wymusza adres `wsb.student.tester@gmail.com`.
3. **Zabezpieczenie przed duplikatami:** Moduł sprawdza historię korespondencji i blokuje wysłanie identycznej wiadomości do tego samego zgłoszenia w oknie 5 minut.
4. **Wymuszony prefiks i stopka:** Wszystkie wiadomości testowe posiadają w temacie prefiks `[TEST]` oraz stopkę projektu WSB Merito.

---

## 5. Wykorzystane technologie

- **Frontend:** HTML5, CSS3 (Mobile-First, barwy ELWOZ ECO: zieleń `#1b7a3e`, granat `#143d59`), Vanilla JavaScript (ES6+).
- **Hosting:** GitHub Pages (statyczny hosting z SSL/HTTPS).
- **Rejestracja i Baza CRM:** Google Forms & Google Sheets (*Centrum zgłoszeń*).
- **Backend i Bezpieczeństwo:** Google Apps Script (Container-bound), LockService, Google MailApp ze stałą Whitelist.
- **Sztuczna Inteligencja:** Google Gemini Flash API (`gemini-3.6-flash` przez Google AI Studio) oraz wariant manualny w `docs/prompt-ai.md`.

---

## 6. Struktura repozytorium

```
elwoz-eco-smartcare/
├── index.html                   # Strona główna Cyfrowego Punktu Obsługi (mobile-first, v0.2.3)
├── css/
│   └── style.css                # Style wizualne inspirowane marką ELWOZ ECO
├── js/
│   ├── config.js                # Konfiguracja linków, adresów Google Forms i alertów (v0.2.3)
│   └── app.js                   # Obsługa widoku natywnego formularza i bezpośredniego linku
├── assets/
│   ├── logo.svg                 # Wektorowe logo ELWOZ ECO SmartCare
│   ├── favicon.svg              # Favicon strony
│   ├── qr-code.svg              # Kod QR prowadzący do GitHub Pages
│   ├── qr-code.png              # Kod QR o wysokiej rozdzielczości (1000x1000 px)
│   ├── naklejka-pojemnik-szablon.svg # Gotowy projekt naklejki na pojemnik komunalny
│   └── generate_qr.js           # Skrypt Node.js generujący QR dla opublikowanego URL
├── google/
│   ├── setup.gs                 # Instalator Container-bound + funkcja aktualizacji formuł KPI
│   ├── communication.gs         # Moduł komunikacji, szablony, LockService, escapeHtml i Whitelist
│   └── ai.gs                    # Moduł AI z dialogiem weryfikacji i dynamicznym Gemini Flash
├── docs/
│   ├── prompt-ai.md             # Instrukcja promptu, procedury anonimizacji i zasady AI
│   └── testy.md                 # Procedura testowa, 16 scenariuszy i matryca efektywności
├── CHANGELOG.md                 # Dziennik zmian wydań (v0.1.0 -> v0.2.3)
└── README.md                    # Niniejsza dokumentacja wdrożeniowa
```

---

## 7. Instrukcja instalacji Container-bound oraz funkcja jednoklikowej aktualizacji

### Dla nowej instalacji:
1. Zaloguj się na dedykowane konto: `wsb.student.tester@gmail.com`.
2. Otwórz [Google Sheets](https://sheets.google.com/) i utwórz nowy arkusz.
3. Wybierz: **Rozszerzenia → Apps Script**.
4. Wklej zawartość plików `google/setup.gs`, `google/communication.gs` oraz `google/ai.gs`.
5. Uruchom funkcję **`setupSmartCareSystem`** i zaakceptuj uprawnienia.

### Dla istniejącej instalacji (aktualizacja do Customer Service Intelligence v0.2.7):
Jeśli arkusz i formularz są już zainstalowane na koncie `wsb.student.tester@gmail.com`:
1. Otwórz edytor Apps Script w istniejącym arkuszu Google Sheets (**Rozszerzenia → Apps Script**).
2. Zaktualizuj zawartość plików:
   - `setup.gs` – wklej zaktualizowaną zawartość z `google/setup.gs` (wersja 0.2.7 ze strukturą kolumn CSI, nowymi priorytetami, KPI i migracją danych);
   - `communication.gs` – wklej zaktualizowaną zawartość z `google/communication.gs` (wersja 0.2.7 z Centralnym Panelem Obsługi, Kolejką spraw oraz gotową 1. odpowiedzią w 0s);
   - `ai.gs` – wklej zaktualizowaną zawartość z `google/ai.gs` (wersja 0.2.7 z lokalną kontrolą danych, automatyczną analizą w tle i schematem 10 pól).
3. Zapisz projekt (Ctrl + S).
4. Przeładuj arkusz Google Sheets (F5) i z menu wybierz:
   **`📋 SmartCare -> 🚀 Aktualizuj system do v0.2.7`**.
5. Funkcja automatycznie:
   - Doda nowe kolumny operacyjne do zakładki `ZGŁOSZENIA` (od kolumny AF: *Sugerowany priorytet AI*, *Lokalna kontrola danych*, *Następne działanie*, *Strona odpowiedzialna*, *Termin SLA 1. reakcji*, *Przekroczenie SLA*, *Rekomendowany kolejny krok AI* itp.);
   - Skonfiguruje reguły poprawności danych i formatowanie warunkowe dla 4 priorytetów (`PILNY`, `WYSOKI`, `STANDARDOWY`, `NISKI`), stanów analizy AI oraz stron odpowiedzialnych;
   - Rozszerzy Dashboard o wskaźniki CSI: sprawy pilne/wysokie, przeterminowane SLA, brakujące pierwsze odpowiedzi i kolejne kroki z pełną autokalibracją regionalną (`pl_PL`);
   - Zaktualizuje zakładki `USTAWIENIA`, `TESTY` (scenariusze A-J) oraz `INSTRUKCJA AI`;
   - Wyświetli raport z wynikiem weryfikacji.

---

## 8. Natywny formularz Google Forms i automatyczna analiza AI

W wersji **0.2.7**:
- Mieszkaniec wypełnia rzeczywisty formularz Google Forms osadzony w responsywnej ramce iframe lub za pomocą przycisku bezpośredniego otwarcia formularza.
- Adres aktywnego formularza jest skonfigurowany w `js/config.js`:
  `https://docs.google.com/forms/d/e/1FAIpQLSdZXjHX0Tt5GqF5yacDZpouKtrcsxPBhXx-K2s5cqYfEFtnkA/viewform`.
- Zgłoszenie natychmiast pojawia się w arkuszu odpowiedzi.
- Zainstalowany wyzwalacz `onFormSubmit` (`handleNewTicketSubmit` chroniony `LockService`):
  1. Nadaje unikalny identyfikator sprawy (`ELW-2026-XXXX`);
  2. Inicjalizuje termin SLA 1. reakcji zależnie od priorytetu;
  3. Natychmiast wysyła powiadomienie e-mail do dyspozytora BOK (`wsb.student.tester@gmail.com`);
  4. Nieblokująco uruchamia automatyczną analizę AI (`triggerAutoAiAnalysisForTicket`), która dokonuje lokalnej kontroli danych i odpytuje model Gemini Flash, pre-generując pierwszą odpowiedź w CRM.

---

## 9. Menu pracownika „SmartCare” w Google Sheets

W arkuszu kalkulacyjnym na koncie `wsb.student.tester@gmail.com` dostępne jest menu operacyjne: **📋 SmartCare**:

| Opcja menu | Rola i działanie |
|---|---|
| **1. 🎯 Obsłuż zgłoszenie (Centrum Obsługi)** | Otwiera Centralny Panel Obsługi Zgłoszenia (widok 360°, inteligencja AI, edycja priorytetu, planowanie kolejnego kroku, wgląd w błędy AI, akcje natychmiastowe). |
| **2. 📊 Kolejka spraw i filtry operacyjne** | Otwiera interaktywną przeglądarkę zgłoszeń filtrującą sprawy po SLA, priorytecie PILNY/WYSOKI, braku odpowiedzi lub oczekiwaniu na mieszkańca. |
| **3. 🤖 Analizuj zgłoszenie przez AI** | Otwiera okno weryfikacji zanonimizowanego opisu (Human-in-the-Loop) i ręcznie uruchamia/ponawia analizę przez **Gemini Flash**. |
| **⚡ Przetwórz kolejkę AI (v0.2.8)** | Przetwarza oczekujące i błędne analizy z bezpiecznym 2-sekundowym odstępem zapobiegającym przekroczeniu limitu 15 RPM. |
| **🔧 Wykryj i uzupełnij brakujące zgłoszenia (v0.2.8)** | Wyszukuje nieprzetworzone odpowiedzi z formularza (np. po awarii LockService), nadaje kolejne unikalne ID oraz ustala status i SLA bez ponownej wysyłki e-maili. |
| **4. ✉️ Przygotuj pierwszą odpowiedź / potwierdzenie** | Błyskawiczny kreator pierwszej odpowiedzi (0s wait!) zasilany pre-generowaną przez AI treścią z CRM o ustrukturyzowanym formacie 4-punktowym. |
| **5. ✉️ Przygotuj informację o postępach** | Generuje szablon B informujący o weryfikacji okoliczności zgłoszenia. |
| **6. ✉️ Przygotuj informację o rozwiązaniu** | Wymaga uzupełnienia pola *Sposób rozwiązania sprawy*; generuje szablon C ze zweryfikowanym linkiem do opinii. |
| **7. ⭐ Przygotuj prośbę o opinię Google** | Generuje szablon D z bezpośrednim linkiem Google (`placeid=ChIJ13yCwGSa_UYRqkDdyWL8wdA`); chroni przed duplikacją. |
| **8. 📞 Odnotuj kontakt telefoniczny** | Rejestruje notatkę z rozmowy i aktualizuje daty kontaktu oraz statusy w CRM. |
| **9. 📜 Wyświetl historię komunikacji** | Prezentuje pełny dziennik zdarzeń dla wybranego zgłoszenia. |
| **🔍 Kontrola spójności systemu (v0.2.8)** | Weryfikuje poprawność wskaźników Dashboardu, wykresów, nieprzetworzonych zgłoszeń i błędów AI. |
| **🔍 Test diagnostyczny Gemini API** | Testuje integrację z modelem Gemini Flash na danych mockowych (schemat 10 pól) i wyświetla diagnostykę tokenów. |
| **🚀 Aktualizuj system do v0.2.8** | Idempotentna funkcja aktualizacji struktury CRM (kolumna `Szczegóły błędu AI`), Dashboardu (Sekcja 4: Diagnostyka), warstwy Service API i przywracania spraw. |
| **⚙️ Ustawienia / Klucz Gemini API** | Pozwala bezpiecznie zapisać klucz API w Script Properties bez umieszczania go w kodzie. |

---



---

## 9a. Warstwa Service API dla aplikacji webowej SmartCare Manager (v0.3.0)

W ramach wersji **v0.2.8** zaimplementowano kompletną warstwę bezstanowego interfejsu programistycznego (Service API) w Google Apps Script, która uniezależnia logikę biznesową od interfejsu arkusza kalkulacyjnego i przygotowuje system na budowę profesjonalnej aplikacji webowej w kolejnym etapie:

- `apiGetTicketsList(filters)` – pobieranie listy zgłoszeń z filtrowaniem po statusie, priorytecie, stanie AI oraz wyszukiwaniem tekstowym,
- `apiGetTicketDetails(ticketId)` – pobieranie pełnych danych i metadanych operacyjnych pojedynczego zgłoszenia,
- `apiGetAiAnalysis(ticketId)` – pobieranie struktury wniosków Gemini AI, sugestii priorytetu, ustaleń pre-walidacji oraz szczegółów błędów,
- `apiGetCommunicationHistory(ticketId)` – pobieranie wpisów z dziennika komunikacji dla wybranej sprawy,
- `apiGetDashboardStats()` – pobieranie kompletnego zestawu metryk KPI i wskaźników operacyjnych,
- `apiGetNextActionsList()` – pobieranie listy spraw wymagających natychmiastowego działania (brak kroku, zagrożenie SLA, błędy AI),
- `apiGetDiagnostics()` – pobieranie diagnostyki środowiska (trigger, klucz API, liczba odpowiedzi vs zarejestrowanych zgłoszeń),
- `apiUpdateTicket(ticketId, updates)` – bezpieczna modyfikacja pól sprawy pod ochroną LockService z automatyczną aktualizacją znaczników czasu,
- `apiTriggerAiAnalysis(ticketId)` – uruchomienie analizy AI dla wskazanego zgłoszenia,
- `apiReconcileUnprocessedTickets()` – automatyczne wykrycie i uzupełnienie brakujących zgłoszeń.

> [!NOTE]
> Funkcje Service API operują w bezpiecznym kontekście kontenera Google Apps Script (`google.script.run`) i nie wystawiają publicznych, nieuwierzytelnionych endpointów HTTP na świat zewnętrzny.

## 10. Rzetelne szablony wiadomości i procedura komunikacji

Szablony są oparte wyłącznie na zweryfikowanych informacjach:
1. **Szablon A (Potwierdzenie przyjęcia):** Potwierdza rejestrację sprawy testowej pod nadanym ID (`ELW-2026-XXXX`), wskazuje zgłoszoną frakcję i ulicę oraz informuje o oczekiwaniu na weryfikację przez dyspozytora.
2. **Szablon B (Informacja o postępach):** Informuje o przekazaniu sprawy do dyspozytora w Kartuzach w celu wyjaśnienia okoliczności.
3. **Szablon C (Informacja o rozwiązaniu):** Prezentuje treść wpisaną przez pracownika w kolumnie *Sposób rozwiązania sprawy*.
4. **Szablon D (Neutralna prośba o opinię):** Neutralne zaproszenie do wystawienia recenzji. Wysyłka jest zablokowana, dopóki w `USTAWIENIA` nie zostanie wprowadzony zweryfikowany adres URL wizytówki Google.

---

## 11. Zarządzanie reputacją i zasady opinii Google

- **Bezwzględna blokada placeholdera:** Zgodnie z wytycznymi v0.2.3 system nie pozwala wysłać wiadomości zawierającej tekst zastępczy, a CRM nie oznacza prośby jako wysłanej bez zweryfikowanego linku.
- **Brak review gatingu:** Zaproszenie nie jest uzależnione od oceny satysfakcji.
- **Neutralność:** Brak sugerowania gwiazdek, brak nagród i korzyści majątkowych.
- **Zabezpieczenie przed duplikatami:** Blokada ponownej wysyłki w oknie 5 minut oraz ostrzeżenie przy próbie powtórnej wysyłki.

---

## 12. Dziennik audytu (HISTORIA KOMUNIKACJI)

Każde zdarzenie kontaktowe jest rejestrowane w zakładce `HISTORIA KOMUNIKACJI`:
- Numer zgłoszenia, data i godzina;
- Rodzaj działania i kanał (`e-mail`, `telefon`);
- Adresat (`wsb.student.tester@gmail.com`);
- Temat i pełna treść wiadomości / notatka;
- Login pracownika;
- Status: `wysłano`, `odnotowano kontakt`, `błąd wysyłki`, `anulowano`;
- Informacja o błędzie.

---

## 13. Rozszerzony Dashboard i Rejestr Zgłoszeń (Kalkulacje KPI CSI i Wykresy)

W wersji **0.2.7 (Customer Service Intelligence)** zakładka `DASHBOARD` została rozbudowana o dedykowany blok wskaźników operacyjnych CSI:
- **Obsługa polskiego locale Google Sheets (`pl_PL`):** Formuły automatycznie przyjmują separator średnika (`;`) na podstawie `getSpreadsheetLocale()`, eliminując konflikt z przecinkiem jako separatorem dziesiętnym.
- **Niezależny silnik obliczeniowy Apps Script:** W razie błędu ewaluacji formuł funkcja `calculateDashboardMetrics` w czystym JavaScript odczytuje dane CRM i wpisuje obliczone wartości bezpośrednio do komórek, gwarantując brak błędów `#ERROR!` i niepuste wykresy.
- **Dynamiczne mapowanie kolumn po nagłówkach (`getTicketsColumnMap`):** Formuły dynamicznie odnajdują faktyczne położenie nagłówków, w tym nowych kolumn CSI.
- **Ścisła weryfikacja integralności (`validateDashboardIntegrity`):** Sprawdzanie braku błędów `#ERROR!`, `#REF!`, `#VALUE!`, `#N/A` oraz zgodności liczby zgłoszeń z CRM; blokada okna sukcesu w przypadku wystąpienia nieprawidłowości.
- **Metryki Customer Service Intelligence (wiersz 11):**
  - **Sprawy PILNE i WYSOKIE (B11):** Liczba aktywnych zgłoszeń o najwyższych priorytetach wymagających natychmiastowej obsługi,
  - **Przekroczone SLA (C11):** Liczba spraw, w których upłynął termin pierwszej reakcji bez kontaktu z mieszkańcem,
  - **Brak 1. odpowiedzi (D11):** Nowe zgłoszenia oczekujące na wysłanie potwierdzenia przyjęcia,
  - **Brak kolejnego kroku (E11):** Zgłoszenia aktywne bez przypisanego następnego działania operacyjnego,
  - **Wysłane prośby o opinię (F11):** Rzeczywista liczba wysłanych zaproszeń Google Review.
- **Wykresy analityczne Google Sheets:**
  - **Wykres 1 (Słupkowy / BarChart):** Wizualizuje liczbę zgłoszeń według poszczególnych kategorii z zakresu `B13:C22`.
  - **Wykres 2 (Kolumnowy / ColumnChart):** Prezentuje aktualny rozkład statusów z zakresu `E13:F19`.

---

## 14. Gemini Structured Outputs, kontrola tokenów i diagnostyka

W wersji **0.2.7** system wykorzystuje ustrukturyzowany schemat 10 pól JSON dopasowany do wymogów CRM i obsługi klienta:
1. **Zwiększenie limitu tokenów (maxOutputTokens: 8192):** Zapewnia pełne wygenerowanie struktury JSON bez ucięć.
2. **Optymalizacja poziomu myślenia (thinkingConfig):** Wymuszenie `thinkingLevel: "MINIMAL"` (Gemini 3+) oraz `thinkingBudget: 0` (Gemini 2.5).
3. **Temperatura (temperature: 1.0):** Zgodnie z zaleceniami Google dla modeli rozumujących Gemini ze Structured Outputs.
4. **Wczesna kontrola finishReason:** Flagi `finishReason` (`MAX_TOKENS`, `SAFETY`, `RECITATION`) są sprawdzane BEZWZGLĘDNIE przed parsowaniem JSON.
5. **Kontrolowane ponowienie (1 retry):** W przypadku błędu sieci system automatycznie ponawia próbę po 1 sekundzie.
6. **Samodzielna funkcja diagnostyczna w menu:** Opcja `📋 SmartCare -> 🔍 Test diagnostyczny Gemini API` pozwala sprawdzić model, kod HTTP, czas odpowiedzi, odfiltrowane myśli oraz zużycie tokenów (`usageMetadata`).
7. **Natywne Gemini Structured Outputs:** Zapytanie przekazuje `responseSchema` (10 pól OpenAPI) oraz `responseMimeType: "application/json"`.
8. **Filtracja bloków myśli (`thought: true`):** Wszystkie części rozumowania modelu są bezwzględnie odfiltrowywane.
9. **Maskowanie klucza API i danych osobowych:** Wszystkie wywołania sieciowe i komunikaty błędów filtrują parametr `key=` za pomocą funkcji `maskApiKey`.
10. **Procedura anonimizacji:** Model otrzymuje wyłącznie zanonimizowany kontekst operacyjny.

---

## 15. Instrukcja publikacji na GitHub Pages

Repozytorium GitHub: `mlatala88/elwoz-eco-smartcare`

1. Wypchnij kod do repozytorium:
   ```bash
   git add .
   git commit -m "Release v0.2.7: Customer Service Intelligence (CSI)"
   git push origin main
   ```
2. Publikacja jest aktywna pod adresem:
   **[https://mlatala88.github.io/elwoz-eco-smartcare/](https://mlatala88.github.io/elwoz-eco-smartcare/)**

---

## 16. Generowanie Kodu QR (Dla pojemników i prezentacji)

Generator Node.js ze skonfigurowanym adresem GitHub Pages:

```bash
node assets/generate_qr.js https://mlatala88.github.io/elwoz-eco-smartcare/
```

Wygenerowane pliki:
- `assets/qr-code.svg`
- `assets/qr-code.png` (1000×1000 px)

---

## 17. Procedura testowania i weryfikacja

Przed prezentacją zaliczeniową zespół wykonuje scenariusze testowe TEST-01 do TEST-35 (w tym scenariusze akceptacyjne CSI A–J) opisane w [docs/testy.md](docs/testy.md) z poziomu konta `wsb.student.tester@gmail.com`.

---

## 18. Koszty, limity i wymagania licencyjne

- **Koszty infrastruktury:** **0,00 zł**.
- **Limit MailApp na koncie Gmail:** 100 wiadomości/dzień.
- **Limit Gemini Flash (Free Tier):** Bezpłatne limity Google AI Studio (brak płatnych usług).

---

## 19. Wykaz działań wymagających ręcznej autoryzacji

1. **Aktualizacja Apps Script:** Wklejenie zaktualizowanego kodu w edytorze arkusza na koncie `wsb.student.tester@gmail.com`.
2. **Aktualizacja systemu:** Wybór z menu *📋 SmartCare → 🚀 Aktualizuj system do v0.2.7*.
3. **Konfiguracja klucza Gemini Flash:** Wprowadzenie darmowego klucza z [aistudio.google.com](https://aistudio.google.com/) przez menu arkusza.

---

*ELWOZ ECO SmartCare v0.2.7 – Uniwersytet WSB Merito w Gdańsku.*
