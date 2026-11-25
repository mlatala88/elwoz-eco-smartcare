# ELWOZ ECO SmartCare – Cyfrowy Punkt Obsługi Mieszkańca
**Wersja:** 0.2.5 (Rozwiązanie wyczerpania tokenów: 8192 max tokens, thinkingLevel MINIMAL, wczesna kontrola finishReason, diagnostyka)  
**Projekt zaliczeniowy:** *Nowoczesne technologie w marketingu i sprzedaży* – Uniwersytet WSB Merito w Gdańsku  
**Przedsiębiorstwo:** ELWOZ ECO Sp. z o.o.  
**Obszar wdrożenia:** Rejon Kartuz i okoliczne sołectwa  
**Oficjalna strona przedsiębiorstwa:** [elwozeco.pl](https://elwozeco.pl/)  
**Dedykowane konto testowe Google:** `wsb.student.tester@gmail.com`  
**Publiczna strona demonstracyjna (GitHub Pages):** [https://mlatala88.github.io/elwoz-eco-smartcare/](https://mlatala88.github.io/elwoz-eco-smartcare/)  
**Aktywny formularz Google Forms:** [https://docs.google.com/forms/d/e/1FAIpQLSdZXjHX0Tt5GqF5yacDZpouKtrcsxPBhXx-K2s5cqYfEFtnkA/viewform](https://docs.google.com/forms/d/e/1FAIpQLSdZXjHX0Tt5GqF5yacDZpouKtrcsxPBhXx-K2s5cqYfEFtnkA/viewform)

---

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
13. [Rozszerzony Dashboard i Rejestr Zgłoszeń (Kalkulacje KPI)](#13-rozszerzony-dashboard-i-rejestr-zgłoszeń-kalkulacje-kpi)
14. [Gemini Structured Outputs, kontrola tokenów i diagnostyka](#14-gemini-structured-outputs-kontrola-tokenów-i-diagnostyka)
15. [Instrukcja publikacji na GitHub Pages](#15-instrukcja-publikacji-na-github-pages)
16. [Generowanie Kodu QR (Dla pojemników i prezentacji)](#16-generowanie-kodu-qr-dla-pojemników-i-prezentacji)
17. [Procedura testowania i weryfikacja](#17-procedura-testowania-i-weryfikacja)
18. [Koszty, limity i wymagania licencyjne](#18-koszty-limity-i-wymagania-licencyjne)
19. [Wykaz działań wymagających ręcznej autoryzacji](#19-wykaz-działań-wymagających-ręcznej-autoryzacji)

---

## 1. Kontekst i cel projektu

Projekt **ELWOZ ECO SmartCare** realizowany jest na Uniwersytecie WSB Merito w Gdańsku jako studencki projekt wdrożeniowy dedykowany spółce **ELWOZ ECO Sp. z o.o.**, odpowiedzialnej za odbiór odpadów komunalnych w rejonie Kartuz.

Wydanie **0.2.5** rozwiązuje problem ucinania odpowiedzi przez wyczerpanie tokenów (`finishReason: MAX_TOKENS`) oraz eliminuje błąd `Treść wygenerowana przez model nie zawiera struktury JSON (brak klamer)`:
- **Zwiększenie limitu tokenów do 8192:** Budżet tokenów wyjściowych (`maxOutputTokens: 8192`) zapewnia pełne wygenerowanie struktury JSON nawet przy dłuższym procesie myślowym modeli Flash;
- **Konfiguracja poziomu myślenia (thinkingConfig):** Wymuszenie `thinkingLevel: "MINIMAL"` (dla Gemini 3+) oraz `thinkingBudget: 0` (dla Gemini 2.5) minimalizuje zbędną konsumpcję tokenów i skraca czas oczekiwania;
- **Zalecana temperatura (temperature: 1.0):** Zgodnie z oficjalną dokumentacją Google dla modeli rozumujących Gemini ze Structured Outputs, temperatura 1.0 zapobiega zapętleniom i degradacji myślenia;
- **Wczesna kontrola finishReason:** Sprawdzanie `MAX_TOKENS`, `SAFETY`, `RECITATION` następuje BEZWZGLĘDNIE przed parsowaniem JSON;
- **Jednorazowe kontrolowane ponowienie (1 retry):** Automatyczna druga próba przy ucięciu odpowiedzi lub chwilowej niestabilności połączenia;
- **Pełna diagnostyka odpowiedzi:** Rejestracja modelu, kodu HTTP, finishReason, liczby części, odfiltrowanych bloków myśli oraz tokenów (`usageMetadata`);
- **Samodzielna funkcja testowa w menu:** Opcja `🔍 Test diagnostyczny Gemini API` w menu arkusza pozwala zweryfikować integrację na danych przykładowych jednym kliknięciem;
- **Twarde maskowanie danych:** Brak klucza API (`key=[UKRYTY]`), promptu i danych osobowych w jakichkolwiek logach.
- **Zabezpieczenie wysyłki e-mail:** Równoczesna wysyłka chroniona `LockService`, a błędy serwera nie zamykają okna edycji wiadomości;
- **Rygorystyczna blokada placeholdera w opiniach:** Prośba o opinię nie może zostać wysłana ani oznaczona w CRM bez autentycznego linku w `USTAWIENIA`;
- **Aktualizacja modeli Gemini Flash:** Usunięto wyłączony model `gemini-2.0-flash`, wprowadzając domyślnie `gemini-3.6-flash` oraz dynamiczne wykrywanie bezpłatnych modeli wspierających `generateContent`;
- **Human-in-the-Loop w module AI:** Przed wysłaniem zapytania do modelu pracownik weryfikuje oczyszczony opis w oknie dialogowym (brak ulicy, numeru posesji, nazwiska i kontaktu).

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

### Dla istniejącej instalacji (aktualizacja do v0.2.5):
Jeśli arkusz i formularz są już zainstalowane na Twoim koncie:
1. Otwórz edytor Apps Script w istniejącym arkuszu Google Sheets (**Rozszerzenia → Apps Script**).
2. Zaktualizuj zawartość **WYŁĄCZNIE DWÓCH PLIKÓW**:
   - `ai.gs` – wklej nową zawartość z repozytorium `google/ai.gs` (wersja 0.2.5);
   - `communication.gs` – wklej nową zawartość z repozytorium `google/communication.gs` (wersja 0.2.5).
3. Zapisz projekt (Ctrl + S).
4. Przeładuj arkusz Google Sheets – w menu pojawi się opcja `📋 SmartCare -> 🔍 Test diagnostyczny Gemini API`, która pozwala zweryfikować poprawność integracji.
   *(Nie musisz uruchamiać instalatora od nowa ani tworzyć nowego formularza czy arkusza!)*

---

## 8. Natywny formularz Google Forms i eliminacja localStorage

W wersji **0.2.3**:
- Mieszkaniec wypełnia rzeczywisty formularz Google Forms osadzony w responsywnej ramce iframe lub za pomocą przycisku bezpośredniego otwarcia formularza.
- Adres aktywnego formularza jest skonfigurowany w `js/config.js`:
  `https://docs.google.com/forms/d/e/1FAIpQLSdZXjHX0Tt5GqF5yacDZpouKtrcsxPBhXx-K2s5cqYfEFtnkA/viewform`.
- Zgłoszenie natychmiast pojawia się w arkuszu odpowiedzi.
- Zainstalowany wyzwalacz `onFormSubmit` (chroniony `LockService`) natychmiast nadaje unikalny identyfikator sprawy oraz status *Nowe*.

---

## 9. Menu pracownika „SmartCare” w Google Sheets

W arkuszu kalkulacyjnym na koncie `wsb.student.tester@gmail.com` dostępne jest menu operacyjne: **📋 SmartCare**:

| Opcja menu | Rola i działanie |
|---|---|
| **1. 🤖 Analizuj zgłoszenie przez AI** | Otwiera okno weryfikacji zanonimizowanego opisu (Human-in-the-Loop) i analizuje sprawę przez **Gemini Flash**. |
| **2. ✉️ Przygotuj potwierdzenie przyjęcia** | Generuje szablon A w oknie modalnym (zabezpieczonym funkcją `escapeHtml`). |
| **3. ✉️ Przygotuj informację o postępach** | Generuje szablon B informujący o weryfikacji okoliczności zgłoszenia. |
| **4. ✉️ Przygotuj informację o rozwiązaniu** | Wymaga uzupełnienia pola *Sposób rozwiązania sprawy*; generuje szablon C. |
| **5. ⭐ Przygotuj prośbę o opinię Google** | Blokuje wysyłkę z placeholderem; wymaga autentycznego linku w USTAWIENIACH. |
| **6. 📞 Odnotuj kontakt telefoniczny** | Rejestruje notatkę z rozmowy i aktualizuje daty kontaktu jako obiekty `Date`. |
| **7. 📜 Wyświetl historię komunikacji** | Prezentuje pełną tabelę audytową dotychczasowej korespondencji dla zaznaczonego ID. |
| **🔄 Aktualizuj formuły Dashboardu (v0.2.3)** | Bezpiecznie aktualizuje formuły KPI w godzinach bez modyfikacji danych. |
| **⚙️ Ustawienia / Klucz Gemini API** | Bezpieczny konfigurator klucza API w `ScriptProperties`. |

---

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

## 13. Rozszerzony Dashboard i Rejestr Zgłoszeń (Kalkulacje KPI)

Wskaźniki w zakładce `DASHBOARD`:
- **Czas pierwszej reakcji (komórka C8):** Liczony w godzinach z dokładnością do dwóch miejsc po przecinku:
  `=IFERROR(ROUND(AVERAGE(FILTER((ZGŁOSZENIA!U2:U - ZGŁOSZENIA!A2:A)*24; ISNUMBER(ZGŁOSZENIA!U2:U); ISNUMBER(ZGŁOSZENIA!A2:A))); 2); 0)`
- **Czas rozwiązania sprawy (komórka D8):** Liczony w godzinach z dokładnością do dwóch miejsc po przecinku:
  `=IFERROR(ROUND(AVERAGE(FILTER((ZGŁOSZENIA!W2:W - ZGŁOSZENIA!A2:A)*24; ISNUMBER(ZGŁOSZENIA!W2:W); ISNUMBER(ZGŁOSZENIA!A2:A))); 2); 0)`
- **Odsetek zakończonych z prośbą o opinię (komórka C11):** Obliczany wyłącznie wśród spraw rozwiązanych / zamkniętych:
  `=IFERROR(ROUND(COUNTIFS(ZGŁOSZENIA!X2:X; "TAK"; ZGŁOSZENIA!H2:H; "Rozwiązane") / MAX(1; COUNTIF(ZGŁOSZENIA!H2:H; "Rozwiązane") + COUNTIF(ZGŁOSZENIA!H2:H; "Zamknięte")); 4); 0)`

---

## 14. Gemini Structured Outputs, kontrola tokenów i diagnostyka

W wersji **0.2.5** wyeliminowano błąd `Treść wygenerowana przez model nie zawiera struktury JSON (brak klamer)` oraz wprowadzono pełną stabilność tokenową:
1. **Zwiększenie limitu tokenów (maxOutputTokens: 8192):** Poprzedni limit 1000 tokenów był wyczerpywany przez myśli modeli Flash, co uniemożliwiało wygenerowanie JSON. Limit 8192 zapewnia pełną swobodę generowania.
2. **Optymalizacja poziomu myślenia (thinkingConfig):** Wymuszenie `thinkingLevel: "MINIMAL"` (Gemini 3+) oraz `thinkingBudget: 0` (Gemini 2.5) zapobiega zbędnemu zużywaniu tokenów.
3. **Oficjalna temperatura (temperature: 1.0):** Zgodnie z zaleceniami Google dla modeli rozumujących Gemini ze Structured Outputs, temperatura 1.0 zapobiega błędom i zapętleniom.
4. **Wczesna kontrola finishReason:** Flagi `finishReason` (`MAX_TOKENS`, `SAFETY`, `RECITATION`) są sprawdzane BEZWZGLĘDNIE przed parsowaniem JSON.
5. **Kontrolowane ponowienie (1 retry):** W przypadku ucięcia odpowiedzi lub chwilowego błędu sieci system automatycznie ponawia próbę po 1 sekundzie.
6. **Samodzielna funkcja diagnostyczna w menu:** Opcja `📋 SmartCare -> 🔍 Test diagnostyczny Gemini API` pozwala sprawdzić model, kod HTTP, czas odpowiedzi, odfiltrowane myśli oraz zużycie tokenów (`usageMetadata`).
7. **Natywne Gemini Structured Outputs:** Zapytanie przekazuje `responseSchema` (z typem `OBJECT` i wymaganymi polami) oraz `responseMimeType: "application/json"`.
8. **Filtracja bloków myśli (`thought: true`):** Wszystkie części rozumowania modelu są bezwzględnie odfiltrowywane.
9. **Maskowanie klucza API i danych osobowych:** Wszystkie wywołania sieciowe i komunikaty błędów filtrują parametr `key=` za pomocą funkcji `maskApiKey`.
10. **Procedura anonimizacji:** Model otrzymuje wyłącznie rodzaj zgłoszenia, frakcję odpadów, miejscowość (Kartuzy) oraz zweryfikowany opis. Ulica, numer domu i dane kontaktowe są bezwzględnie usuwane.

---

## 15. Instrukcja publikacji na GitHub Pages

Repozytorium GitHub: `mlatala88/elwoz-eco-smartcare`

1. Wypchnij kod do repozytorium:
   ```bash
   git add .
   git commit -m "Release v0.2.5: Fix token exhaustion with 8192 max tokens, minimal thinking level, early finishReason check, and diagnostic function"
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

Przed prezentacją zaliczeniową zespół wykonuje 16 scenariuszy opisanych w [docs/testy.md](docs/testy.md) z poziomu konta `wsb.student.tester@gmail.com`.

---

## 18. Koszty, limity i wymagania licencyjne

- **Koszty infrastruktury:** **0,00 zł**.
- **Limit MailApp na koncie Gmail:** 100 wiadomości/dzień.
- **Limit Gemini Flash (Free Tier):** Bezpłatne limity Google AI Studio (brak płatnych usług).

---

## 19. Wykaz działań wymagających ręcznej autoryzacji

1. **Aktualizacja Apps Script:** Wklejenie zaktualizowanego kodu w edytorze arkusza na koncie `wsb.student.tester@gmail.com`.
2. **Aktualizacja formuł Dashboardu:** Kliknięcie *SmartCare → 🔄 Aktualizuj formuły Dashboardu (v0.2.3)*.
3. **Konfiguracja klucza Gemini Flash:** Wprowadzenie darmowego klucza z [aistudio.google.com](https://aistudio.google.com/) przez menu arkusza.

---

*ELWOZ ECO SmartCare v0.2.3 – Uniwersytet WSB Merito w Gdańsku.*
