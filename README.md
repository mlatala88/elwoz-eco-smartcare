# ELWOZ ECO SmartCare – Cyfrowy Punkt Obsługi Mieszkańca
**Wersja:** 0.2.2 (Poprawki po niezależnym audycie kodu – 15 punktów naprawczych)  
**Projekt zaliczeniowy:** *Nowoczesne technologie w marketingu i sprzedaży* – Uniwersytet WSB Merito w Gdańsku  
**Przedsiębiorstwo:** ELWOZ ECO Sp. z o.o.  
**Obszar wdrożenia:** Rejon Kartuz i okoliczne sołectwa  
**Oficjalna strona przedsiębiorstwa:** [elwozeco.pl](https://elwozeco.pl/)  
**Dedykowane konto testowe Google:** `wsb.student.tester@gmail.com`

---

## Spis treści
1. [Kontekst i cel projektu](#1-kontekst-i-cel-projektu)
2. [Główne założenia i architektura](#2-główne-założenia-i-architektura)
3. [Dedykowane konto testowe i podział środowisk](#3-dedykowane-konto-testowe-i-podział-środowisk)
4. [Twarde zabezpieczenie serwerowe (Server-Side Whitelist Guard)](#4-twarde-zabezpieczenie-serwerowe-server-side-whitelist-guard)
5. [Wykorzystane technologie](#5-wykorzystane-technologie)
6. [Struktura repozytorium](#6-struktura-repozytorium)
7. [Instrukcja instalacji Container-bound (Krok po kroku)](#7-instrukcja-instalacji-container-bound-krok-po-kroku)
8. [Natywny formularz Google Forms i eliminacja localStorage](#8-natywny-formularz-google-forms-i-eliminacja-localstorage)
9. [Menu pracownika „SmartCare” w Google Sheets](#9-menu-pracownika-smartcare-w-google-sheets)
10. [Rzetelne szablony wiadomości i procedura komunikacji](#10-rzetelne-szablony-wiadomości-i-procedura-komunikacji)
11. [Zarządzanie reputacją i zasady opinii Google](#11-zarządzanie-reputacją-i-zasady-opinii-google)
12. [Dziennik audytu (HISTORIA KOMUNIKACJI)](#12-dziennik-audytu-historia-komunikacji)
13. [Rozszerzony Dashboard i Rejestr Zgłoszeń](#13-rozszerzony-dashboard-i-rejestr-zgłoszeń)
14. [Instrukcja publikacji na GitHub Pages](#14-instrukcja-publikacji-na-github-pages)
15. [Generowanie Kodu QR (Dla pojemników i prezentacji)](#15-generowanie-kodu-qr-dla-pojemników-i-prezentacji)
16. [Procedura testowania i weryfikacja](#16-procedura-testowania-i-weryfikacja)
17. [Koszty, limity i wymagania licencyjne](#17-koszty-limity-i-wymagania-licencyjne)
18. [Wykaz działań wymagających ręcznej autoryzacji](#18-wykaz-działań-wymagających-ręcznej-autoryzacji)

---

## 1. Kontekst i cel projektu

Projekt **ELWOZ ECO SmartCare** realizowany jest na Uniwersytecie WSB Merito w Gdańsku jako studencki projekt wdrożeniowy dedykowany spółce **ELWOZ ECO Sp. z o.o.**, odpowiedzialnej za odbiór odpadów komunalnych w rejonie Kartuz.

Wydanie **0.2.2** wdraża kompletny pakiet poprawek po niezależnym audycie kodu:
- Wyeliminowano pozorowany zapis zgłoszeń przez `localStorage` na rzecz natywnego przesyłu przez Google Forms do Google Sheets;
- Przebudowano instalator na model **Container-bound Script** (Apps Script powiązany z arkuszem kalkulacyjnym);
- Naprawiono kalkulacje wskaźników KPI (czas reakcji, czas rozwiązania) oraz usunięto błędy środowiskowe (`setGridlines`);
- Wdrożono model **Gemini 2.0 Flash** z twardą anonimizacją danych;
- Zabezpieczono okna dialogowe przed podatnościami XSS / HTML Injection (`escapeHtml`);
- Wdrożono sekwencyjny generator unikalnych identyfikatorów (`max(ID) + 1`) oraz zabezpieczenie przed duplikatami wysyłek;
- Wprowadzono bezwarunkową blokadę wysyłki na serwerze ograniczoną do `wsb.student.tester@gmail.com`.

---

## 2. Główne założenia i architektura

- **Prawdziwy obieg danych:** Zgłoszenia z formularza trafiają bezpośrednio do arkusza Google Sheets za pośrednictwem natywnej integracji Google Forms (brak symulacji w pamięci przeglądarki).
- **Zasada Human-in-the-Loop:** Sztuczna inteligencja nie podejmuje wiążących decyzji prawnych, nie wymyśla terminów odbioru, nie deklaruje uznania reklamacji i nie wysyła wiadomości bez wyraźnej autoryzacji pracownika.
- **Odpowiedzialność za słowo:** Szablony wiadomości opierają się wyłącznie na potwierdzonych faktach i wpisie w polu *Sposób rozwiązania sprawy*, bez niepotwierdzonych deklaracji o załogach w terenie.
- **Brak haseł i kluczy w kodzie:** Żadne hasła, klucze API ani tokeny dostępowe nie są umieszczane w kodzie źródłowym ani repozytorium GitHub.

---

## 3. Dedykowane konto testowe i podział środowisk

W celu zachowania pełnego rozdziału odpowiedzialności projekt wykorzystuje architekturę dwukontową:

1. **Dedykowane konto Google:** `wsb.student.tester@gmail.com`
   - Właściciel prywatnego arkusza Google Sheets (*ELWOZ ECO SmartCare – Centrum zgłoszeń*);
   - Właściciel publicznego formularza Google Forms;
   - Środowisko wykonawcze skryptów Google Apps Script (`setup.gs`, `communication.gs`, `ai.gs`);
   - Właściciel bezpłatnego projektu Google AI Studio (klucz Gemini 2.0 Flash przechowywany w `ScriptProperties`);
   - **Jedyny bezwarunkowo zatwierdzony serwerowy cel testowy dla korespondencji e-mail.**
2. **Konto GitHub użytkownika:**
   - Hostuje publiczne repozytorium kodu `elwoz-eco-smartcare`;
   - Odpowiada za serwowanie strony demonstracyjnej przez **GitHub Pages**.

---

## 4. Twarde zabezpieczenie serwerowe (Server-Side Whitelist Guard)

W module [google/communication.gs](google/communication.gs) wdrożono bezwzględną weryfikację po stronie serwera w funkcji `processSendEmail`:

```javascript
// Stała serwerowa – jedyny dopuszczalny odbiorca testowy
const APPROVED_TEST_RECIPIENT = "wsb.student.tester@gmail.com";

// BEZWARUNKOWA BLOKADA WYSYŁKI:
const targetEmail = APPROVED_TEST_RECIPIENT;

if (!targetEmail || targetEmail.toLowerCase().trim() !== APPROVED_TEST_RECIPIENT.toLowerCase().trim()) {
  throw new Error("BEZWARUNKOWA BLOKADA BEZPIECZEŃSTWA: Dozwolony odbiorca to wyłącznie " + APPROVED_TEST_RECIPIENT);
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
- **Backend i Bezpieczeństwo:** Google Apps Script (Container-bound), Google MailApp ze stałą Whitelist.
- **Sztuczna Inteligencja:** Google Gemini API (`gemini-2.0-flash` przez Google AI Studio) oraz wariant manualny w `docs/prompt-ai.md`.

---

## 6. Struktura repozytorium

```
elwoz-eco-smartcare/
├── index.html                   # Strona główna Cyfrowego Punktu Obsługi (mobile-first)
├── css/
│   └── style.css                # Style wizualne inspirowane marką ELWOZ ECO
├── js/
│   ├── config.js                # Konfiguracja linków, adresów Google Forms i alertów
│   └── app.js                   # Obsługa widoku natywnego formularza (bez localStorage)
├── assets/
│   ├── logo.svg                 # Wektorowe logo ELWOZ ECO SmartCare
│   ├── favicon.svg              # Favicon strony
│   ├── naklejka-pojemnik-szablon.svg # Gotowy projekt naklejki na pojemnik komunalny
│   └── generate_qr.js           # Skrypt Node.js generujący QR dla opublikowanego URL
├── google/
│   ├── setup.gs                 # Instalator Container-bound (Arkusz, Formularz, CRM, Dashboard)
│   ├── communication.gs         # Moduł komunikacji, szablony, MailApp, escapeHtml i Whitelist
│   └── ai.gs                    # Integracja analityczna Gemini 2.0 Flash z menu SmartCare
├── docs/
│   ├── prompt-ai.md             # Szablon promptu manualnego, anonimizacja i zasady AI
│   └── testy.md                 # Procedura testowa, 12 scenariuszy i matryca efektywności
├── CHANGELOG.md                 # Dziennik zmian wydania v0.2.2 (15 punktów naprawczych)
└── README.md                    # Niniejsza dokumentacja wdrożeniowa
```

---

## 7. Instrukcja instalacji Container-bound (Krok po kroku)

Zgodnie z wymaganiami audytu projekt Apps Script musi być **powiązany z arkuszem Google Sheets** (Container-bound), a nie tworzony jako projekt samodzielny.

### Krok 1: Otwórz arkusz na koncie wsb.student.tester@gmail.com
1. Zaloguj się w przeglądarce na dedykowane konto testowe: **`wsb.student.tester@gmail.com`**.
2. Otwórz [Google Sheets](https://sheets.google.com/) i utwórz **Pusty arkusz**.

### Krok 2: Uruchomienie edytora Apps Script w arkuszu
1. W górnym menu arkusza wybierz: **Rozszerzenia → Apps Script** (Extensions → Apps Script).
2. Zmień nazwę projektu w edytorze na: **„ELWOZ ECO SmartCare”**.

### Krok 3: Wklejenie kodu źródłowego
1. W pliku domyślnym `Kod.gs` (lub zmieniając jego nazwę na `setup.gs`) wklej kod z [google/setup.gs](google/setup.gs).
2. Kliknij **+** (Dodaj plik) -> **Skrypt**, nazwij go `communication.gs` i wklej zawartość [google/communication.gs](google/communication.gs).
3. Kliknij **+** -> **Skrypt**, nazwij go `ai.gs` i wklej zawartość [google/ai.gs](google/ai.gs).
4. Zapisz projekt (Ctrl + S).

### Krok 4: Uruchomienie instalatora
1. Z listy funkcji wybierz: **`setupSmartCareSystem`** i kliknij **„Uruchom”**.
2. Zaakceptuj uprawnienia do zarządzania arkuszem, tworzenia formularza i wysyłki poczty przez konto `wsb.student.tester@gmail.com`.
3. Skrypt:
   - nada arkuszowi nazwę *ELWOZ ECO SmartCare – Centrum zgłoszeń*,
   - utworzy formularz Google Form i połączy go z arkuszem,
   - skonfiguruje zakładki `ZGŁOSZENIA`, `DASHBOARD`, `HISTORIA KOMUNIKACJI`, `USTAWIENIA`, `TESTY`, `INSTRUKCJA AI`,
   - zainstaluje wyzwalacz `onFormSubmit` nadający sekwencyjne numery ID (`ELW-2026-XXXX`).
4. W Dzienniku wykonania skopiuj publiczny link formularza Google Form i wklej go do pliku [js/config.js](js/config.js) w polu `googleForm.directUrl`.

---

## 8. Natywny formularz Google Forms i eliminacja localStorage

W wersji **0.2.2** całkowicie wyeliminowano pozorowany zapis do `localStorage`:
- Mieszkaniec wypełnia **rzeczywisty formularz Google Forms** osadzony w responsywnej ramce iframe na stronie głównej lub otwierany bezpośrednio.
- Zgłoszenie natychmiast pojawia się w arkuszu odpowiedzi Google Sheets.
- Zainstalowany wyzwalacz `onFormSubmit` automatycznie nadaje unikalny identyfikator sprawy oraz status *Nowe*.

---

## 9. Menu pracownika „SmartCare” w Google Sheets

W arkuszu kalkulacyjnym na koncie `wsb.student.tester@gmail.com` dostępne jest menu operacyjne: **📋 SmartCare**:

| Opcja menu | Rola i działanie |
|---|---|
| **1. 🤖 Analizuj zgłoszenie przez AI** | Zanonimizowana analiza zaznaczonego zgłoszenia przez model **Gemini 2.0 Flash** (streszczenie, brakujące dane, sugerowane działanie). |
| **2. ✉️ Przygotuj potwierdzenie przyjęcia** | Generuje szablon A w oknie modalnym (zabezpieczonym funkcją `escapeHtml`). |
| **3. ✉️ Przygotuj informację o postępach** | Generuje szablon B informujący o weryfikacji okoliczności zgłoszenia. |
| **4. ✉️ Przygotuj informację o rozwiązaniu** | Wymaga uzupełnienia pola *Sposób rozwiązania sprawy*; generuje szablon C z opcją dołączenia prośby o opinię. |
| **5. ⭐ Przygotuj prośbę o opinię Google** | Generuje szablon D z neutralną prośbą o recenzję (zabezpieczenie przed duplikatami). |
| **6. 📞 Odnotuj kontakt telefoniczny** | Rejestruje notatkę z rozmowy i aktualizuje daty kontaktu jako obiekty `Date`. |
| **7. 📜 Wyświetl historię komunikacji** | Prezentuje pełną tabelę audytową dotychczasowej korespondencji dla zaznaczonego ID. |
| **⚙️ Ustawienia / Klucz Gemini API** | Bezpieczny konfigurator klucza API w `ScriptProperties`. |

---

## 10. Rzetelne szablony wiadomości i procedura komunikacji

Szablony zostały oczyszczone z niepotwierdzonych deklaracji operacyjnych:
1. **Szablon A (Potwierdzenie przyjęcia):** Potwierdza rejestrację sprawy testowej pod nadanym ID (`ELW-2026-XXXX`), wskazuje zgłoszoną frakcję i ulicę oraz informuje o oczekiwaniu na weryfikację przez dyspozytora.
2. **Szablon B (Informacja o postępach):** Informuje o przekazaniu sprawy do dyspozytora w Kartuzach w celu wyjaśnienia okoliczności.
3. **Szablon C (Informacja o rozwiązaniu):** Prezentuje treść wpisaną przez pracownika w kolumnie *Sposób rozwiązania sprawy*.
4. **Szablon D (Neutralna prośba o opinię):** Neutralne zaproszenie do wystawienia recenzji. Jeśli link w `USTAWIENIA` nie został jeszcze zweryfikowany, system nie wstawia fikcyjnych linków, lecz czytelną notę.

---

## 11. Zarządzanie reputacją i zasady opinii Google

- **Usunięcie fikcyjnego linku:** Wycofano link `PLACEHOLDER_KARTUZY`. Pole w `USTAWIENIA` pozostaje puste do momentu autoryzacji oficjalnej wizytówki.
- **Brak review gatingu:** Zaproszenie nie jest uzależnione od uprzednio wystawionej oceny satysfakcji.
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

## 13. Rozszerzony Dashboard i Rejestr Zgłoszeń

Wskaźniki w zakładce `DASHBOARD` zostały naprawione pod kątem spójności typów danych:
- *Wszystkie zgłoszenia, Nowe, W realizacji, Zakończone, Odsetek zakończonych*;
- *Sprawy oczekujące na kontakt*;
- *Średni czas pierwszej reakcji* oraz *Średni czas rozwiązania* – wyliczane za pomocą formuł obsługujących obiekty `Date` oraz `DATEVALUE`, eliminując błędy formatu;
- *Średnia ocena satysfakcji (1–5)* oraz liczba zebranych ocen;
- *Liczba wysłanych próśb o opinię Google* oraz *odsetek spraw zakończonych z prośbą*.

---

## 14. Instrukcja publikacji na GitHub Pages

Repozytorium GitHub pozostaje na Twoim koncie użytkownika:

1. Wypchnij kod do repozytorium:
   ```bash
   git add .
   git commit -m "Release v0.2.2: 15 audit fixes implemented"
   git push -u origin main
   ```
2. W ustawieniach repozytorium (*Settings -> Pages*) włącz publikację z gałęzi **main** i katalogu **/(root)**.
3. Strona będzie dostępna pod adresem: `https://TWOJ_LOGIN.github.io/elwoz-eco-smartcare/`.

---

## 15. Generowanie Kodu QR (Dla pojemników i prezentacji)

Uruchom generator Node.js ze swoim adresem GitHub Pages:

```bash
node assets/generate_qr.js https://TWOJ_LOGIN.github.io/elwoz-eco-smartcare/
```

Skrypt wygeneruje pliki `assets/qr-code.svg` oraz `assets/qr-code.png` (1000×1000 px) gotowe do druku naklejek na kubły ([assets/naklejka-pojemnik-szablon.svg](assets/naklejka-pojemnik-szablon.svg)).

---

## 16. Procedura testowania i weryfikacja

Przed prezentacją zaliczeniową członkowie zespołu wykonują testy opisane w [docs/testy.md](docs/testy.md) z poziomu konta `wsb.student.tester@gmail.com`:
- Weryfikacja działania natywnego formularza Google Forms;
- Testy szablonów A–D w oknach dialogowych zabezpieczonych `escapeHtml`;
- **Test TEST-11:** Weryfikacja twardej blokady serwerowej uniemożliwiającej wysyłkę na adres inny niż `wsb.student.tester@gmail.com`;
- Weryfikacja kalkulacji czasów reakcji w Dashboardzie;
- Sprawdzenie zabezpieczenia przed duplikatami wysyłek.

---

## 17. Koszty, limity i wymagania licencyjne

- **Koszty infrastruktury:** **0,00 zł**.
- **Limit MailApp na koncie Gmail:** 100 wiadomości/dzień.
- **Limit Gemini 2.0 Flash (Free Tier):** 15 zapytań/minutę.

---

## 18. Wykaz działań wymagających ręcznej autoryzacji

1. **Utworzenie arkusza i uruchomienie Apps Script:** Otwarcie nowego arkusza na koncie `wsb.student.tester@gmail.com` i uruchomienie edytora przez *Rozszerzenia → Apps Script*.
2. **Akceptacja uprawnień Apps Script:** Jednorazowa autoryzacja uprawnień `SpreadsheetApp`, `FormApp` i `MailApp` na koncie `wsb.student.tester@gmail.com`.
3. **Pobranie klucza Gemini 2.0 Flash:** Wygenerowanie darmowego klucza na [aistudio.google.com](https://aistudio.google.com/) i wprowadzenie go przez menu arkusza.
4. **Wklejenie linku formularza w `js/config.js`:** Skopiowanie adresu URL formularza z dziennika Apps Script do konfiguracji strony WWW.
5. **Publikacja GitHub Pages:** Aktywacja Pages w ustawieniach Twojego repozytorium na GitHubie.

---

*ELWOZ ECO SmartCare v0.2.2 – Uniwersytet WSB Merito w Gdańsku.*
