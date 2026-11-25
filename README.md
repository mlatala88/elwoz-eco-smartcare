# ELWOZ ECO SmartCare – Cyfrowy Punkt Obsługi Mieszkańca
**Wersja:** 0.2.1 (Zarządzanie reputacją, komunikacja i dedykowane konto testowe)  
**Projekt zaliczeniowy:** *Nowoczesne technologie w marketingu i sprzedaży* – Uniwersytet WSB Merito w Gdańsku  
**Przedsiębiorstwo:** ELWOZ ECO Sp. z o.o.  
**Obszar wdrożenia:** Rejon Kartuz i okoliczne sołectwa  
**Oficjalna strona przedsiębiorstwa:** [elwozeco.pl](https://elwozeco.pl/)  
**Dedykowane konto testowe ekosystemu Google:** `wsb.student.tester@gmail.com`

---

## Spis treści
1. [Kontekst i cel projektu](#1-kontekst-i-cel-projektu)
2. [Główne założenia i architektura](#2-główne-założenia-i-architektura)
3. [Dedykowane konto testowe i podział środowisk](#3-dedykowane-konto-testowe-i-podział-środowisk)
4. [Twarde zabezpieczenie serwerowe (Server-Side Whitelist)](#4-twarde-zabezpieczenie-serwerowe-server-side-whitelist)
5. [Wykorzystane technologie](#5-wykorzystane-technologie)
6. [Struktura repozytorium](#6-struktura-repozytorium)
7. [Instrukcja wdrożenia na koncie wsb.student.tester@gmail.com](#7-instrukcja-wdrożenia-na-koncie-wsbstudenttestergmailcom)
8. [Menu pracownika „SmartCare” w Google Sheets](#8-menu-pracownika-smartcare-w-google-sheets)
9. [Szablony wiadomości i procedura komunikacji](#9-szablony-wiadomości-i-procedura-komunikacji)
10. [Zarządzanie reputacją i Opinie Google](#10-zarządzanie-reputacją-i-opinie-google)
11. [Dziennik audytu (HISTORIA KOMUNIKACJI)](#11-dziennik-audytu-historia-komunikacji)
12. [Rozszerzony Dashboard i Rejestr Zgłoszeń](#12-rozszerzony-dashboard-i-rejestr-zgłoszeń)
13. [Instrukcja publikacji na GitHub Pages](#13-instrukcja-publikacji-na-github-pages)
14. [Generowanie Kodu QR (Dla pojemników i prezentacji)](#14-generowanie-kodu-qr-dla-pojemników-i-prezentacji)
15. [Procedura testowania i weryfikacja](#15-procedura-testowania-i-weryfikacja)
16. [Koszty, limity i wymagania licencyjne](#16-koszty-limity-i-wymagania-licencyjne)
17. [Wykaz działań wymagających ręcznej autoryzacji](#17-wykaz-działań-wymagających-ręcznej-autoryzacji)

---

## 1. Kontekst i cel projektu

Projekt **ELWOZ ECO SmartCare** realizowany jest na Uniwersytecie WSB Merito w Gdańsku jako studencki projekt wdrożeniowy dedykowany spółce **ELWOZ ECO Sp. z o.o.**, odpowiedzialnej za odbiór odpadów komunalnych w rejonie Kartuz.

Wydanie **0.2.1** wprowadza dedykowane konto testowe Google oraz **twarde zabezpieczenie serwerowe**, gwarantujące, że w fazie akademickiej żaden e-mail nie trafi do przypadkowej osoby, a cała komunikacja testowa jest izolowana w bezpiecznym środowisku.

---

## 2. Główne założenia i architektura

- **Pełna izolacja danych testowych:** System operuje na danych fikcyjnych, a wiadomości e-mail w trybie demonstracyjnym są restrykcyjnie blokowane przed opuszczeniem dedykowanego konta projektowego.
- **Zasada Human-in-the-Loop:** Sztuczna inteligencja nie podejmuje wiążących decyzji prawnych, nie wymyśla terminów odbioru, nie deklaruje uznania reklamacji i nie wysyła wiadomości bez wyraźnej autoryzacji pracownika.
- **Etyka pozyskiwania opinii Google:** Prośby o recenzję są w pełni neutralne, nie stosują tzw. *review gatingu* (selekcjonowania wyłącznie zadowolonych klientów) i nie oferują korzyści majątkowych za recenzje.
- **Brak haseł i kluczy w kodzie:** Żadne hasła, klucze API ani tokeny dostępowe nie są umieszczane w kodzie źródłowym ani repozytorium GitHub.

---

## 3. Dedykowane konto testowe i podział środowisk

W celu zachowania pełnego rozdziału odpowiedzialności projekt wykorzystuje architekturę dwukontową:

1. **Dedykowane konto Google:** `wsb.student.tester@gmail.com`
   - Właściciel prywatnego arkusza Google Sheets (*Centrum zgłoszeń*);
   - Właściciel publicznego formularza Google Forms;
   - Środowisko wykonawcze Google Apps Script (`setup.gs`, `communication.gs`, `ai.gs`);
   - Właściciel bezpłatnego projektu Google AI Studio (klucz Gemini API przechowywany bezpiecznie w `ScriptProperties`);
   - **Jedyny zatwierdzony serwerowy odbiorca testowy wiadomości e-mail.**
2. **Konto GitHub użytkownika:**
   - Hostuje publiczne repozytorium kodu `elwoz-eco-smartcare`;
   - Odpowiada za serwowanie strony demonstracyjnej przez **GitHub Pages**.

---

## 4. Twarde zabezpieczenie serwerowe (Server-Side Whitelist)

W module backendowym [google/communication.gs](google/communication.gs) wdrożono twardą regułę bezpieczeństwa po stronie serwera Google Apps Script:

```javascript
// Stała bezpieczeństwa po stronie backendu
const APPROVED_TEST_RECIPIENT = "wsb.student.tester@gmail.com";

// Weryfikacja w funkcji wysyłki MailApp
if (settings.isDemoMode) {
  if (!targetEmail || targetEmail.toLowerCase().trim() !== APPROVED_TEST_RECIPIENT.toLowerCase().trim()) {
    const securityErr = `BLOKADA BEZPIECZEŃSTWA SERWERA: W trybie demonstracyjnym wysyłka na adres '${targetEmail}' jest zabroniona! Dozwolony odbiorca to wyłącznie: ${APPROVED_TEST_RECIPIENT}`;
    Logger.log(securityErr);
    // Odnotowanie próby naruszenia w historii komunikacji i przerwanie wykonania
    return;
  }
}
```

### Dlaczego to zabezpieczenie jest bezwzględne?
1. **Odporność na manipulację w przeglądarce:** Nawet jeśli tester w oknie dialogowym lub przez narzędzia deweloperskie spróbuje podać inny adres, backend Google Apps Script natychmiast odrzuci transakcję.
2. **Odporność na błędy w arkuszu:** Wpisanie innego adresu w zakładce `USTAWIENIA` nie odblokuje wysyłki – stała w kodzie serwera uniemożliwia transfer na obcy adres.
3. **Automatyczny prefiks i stopka:** Każda wiadomość testowa otrzymuje w temacie znacznik `[TEST]` oraz stopkę informującą o projekcie WSB Merito.

---

## 5. Wykorzystane technologie

- **Frontend:** HTML5, CSS3 (Mobile-First, barwy ELWOZ ECO: zieleń `#1b7a3e`, granat `#143d59`), Vanilla JavaScript (ES6+).
- **Hosting:** GitHub Pages (darmowy hosting statyczny z szyfrowaniem SSL).
- **Rejestracja i Baza CRM:** Google Forms & Google Sheets (*ELWOZ ECO SmartCare – Centrum zgłoszeń*).
- **Backend i Bezpieczeństwo:** Google Apps Script (`setup.gs`, `communication.gs`, `ai.gs`), Google MailApp z filtrem Whitelist.
- **Sztuczna Inteligencja:** Google Gemini API (`gemini-1.5-flash` przez Google AI Studio) oraz wariant manualny z promptem w `docs/prompt-ai.md`.

---

## 6. Struktura repozytorium

```
elwoz-eco-smartcare/
├── index.html                   # Strona główna Cyfrowego Punktu Obsługi (mobile-first)
├── css/
│   └── style.css                # Style wizualne inspirowane ELWOZ ECO Sp. z o.o.
├── js/
│   ├── config.js                # Konfiguracja linków, adresów Google Forms i alertów
│   └── app.js                   # Obsługa formularza, walidacja i generator ID spraw
├── assets/
│   ├── logo.svg                 # Wektorowe logo ELWOZ ECO SmartCare
│   ├── favicon.svg              # Favicon strony
│   ├── naklejka-pojemnik-szablon.svg # Gotowy projekt naklejki na pojemnik komunalny
│   └── generate_qr.js           # Skrypt Node.js generujący QR dla opublikowanego URL
├── google/
│   ├── setup.gs                 # Automatyczny instalator/aktualizator arkusza i zakładek
│   ├── communication.gs         # Moduł komunikacji, szablony, MailApp i Server-Side Whitelist
│   └── ai.gs                    # Integracja analityczna Gemini API z menu SmartCare
├── docs/
│   ├── prompt-ai.md             # Szablon promptu manualnego, anonimizacja i zasady AI
│   └── testy.md                 # Procedura testowa, 12 scenariuszy i matryca efektywności
├── CHANGELOG.md                 # Historia wydań projektu (v0.1.0 -> v0.2.0 -> v0.2.1)
└── README.md                    # Kompletna dokumentacja wdrożeniowa
```

---

## 7. Instrukcja wdrożenia na koncie wsb.student.tester@gmail.com

### Krok 1: Zaloguj się na dedykowane konto testowe
1. Otwórz przeglądarkę (najlepiej w osobnym profilu lub oknie prywatnym) i zaloguj się na:  
   **`wsb.student.tester@gmail.com`**.
2. Wejdź na [https://script.google.com/](https://script.google.com/).

### Krok 2: Utworzenie projektu Google Apps Script
1. Kliknij **Nowy projekt** i nazwij go: **„ELWOZ ECO SmartCare”**.
2. Wklej zawartość plików z katalogu `google/`:
   - W pliku domyślnym wklej kod z [google/setup.gs](google/setup.gs).
   - Kliknij **+** -> **Skrypt**, nazwij plik `communication.gs` i wklej zawartość [google/communication.gs](google/communication.gs).
   - Kliknij **+** -> **Skrypt**, nazwij plik `ai.gs` i wklej zawartość [google/ai.gs](google/ai.gs).
3. Zapisz projekt (Ctrl + S).

### Krok 3: Uruchomienie instalatora systemu
1. Z listy funkcji wybierz **`setupSmartCareSystem`** i kliknij **„Uruchom”**.
2. Zaakceptuj uprawnienia do tworzenia Arkuszy, Formularzy i wysyłki poczty przez konto `wsb.student.tester@gmail.com`.
3. W Dzienniku wykonania skopiuj link do nowo utworzonego formularza Google Form i wklej go do pliku [js/config.js](js/config.js) w sekcji `googleForm.directUrl`.

### Krok 4: Konfiguracja Gemini API (Opcjonalnie)
1. Będąc zalogowanym jako `wsb.student.tester@gmail.com`, wejdź na [https://aistudio.google.com/](https://aistudio.google.com/).
2. Wygeneruj bezpłatny klucz API (Free Tier).
3. W arkuszu kalkulacyjnym wybierz z menu: **📋 SmartCare -> ⚙️ Ustawienia / Klucz Gemini API** i wklej klucz.  
   *Klucz zapisuje się w bezpiecznych właściwościach projektu (`ScriptProperties`) i NIGDY nie trafia do repozytorium GitHub.*

---

## 8. Menu pracownika „SmartCare” w Google Sheets

Po otwarciu arkusza kalkulacyjnego na koncie `wsb.student.tester@gmail.com` w menu głównym dostępny jest panel: **📋 SmartCare**:

| Opcja menu | Rola i działanie |
|---|---|
| **1. 🤖 Analizuj zgłoszenie przez AI** | Analiza zaznaczonego zgłoszenia przez Gemini API (streszczenie, brakujące dane, sugerowany priorytet i krok operacyjny). |
| **2. ✉️ Przygotuj potwierdzenie przyjęcia** | Otwiera okno dialogowe z uzupełnionym szablonem A (nr sprawy, frakcja, lokalizacja). |
| **3. ✉️ Przygotuj informację o postępach** | Otwiera okno dialogowe z szablonem B informującym o weryfikacji przez zespół w terenie. |
| **4. ✉️ Przygotuj informację o rozwiązaniu** | Wymaga wpisania *Sposobu rozwiązania sprawy*; generuje szablon C z opcją dołączenia linku do recenzji Google. |
| **5. ⭐ Przygotuj prośbę o opinię Google** | Otwiera szablon D z neutralnym zaproszeniem do Profilu Firmy Google (ostrzega przy ponownej wysyłce). |
| **6. 📞 Odnotuj kontakt telefoniczny** | Rejestracja notatki z rozmowy telefonicznej, wyniku kontaktu i aktualizacja daty ostatniego kontaktu. |
| **7. 📜 Wyświetl historię komunikacji** | Prezentuje pełną tabelę dotychczasowej korespondencji dla zaznaczonego ID zgłoszenia. |
| **⚙️ Ustawienia / Klucz Gemini API** | Bezpieczny konfigurator klucza API zapisywanego w `ScriptProperties`. |

---

## 9. Szablony wiadomości i procedura komunikacji

System posiada 4 edytowalne szablony wiadomości działające natywnie bez konieczności połączenia z zewnętrznym API:

1. **Szablon A (Potwierdzenie przyjęcia):** Informuje o nadaniu ID (`ELW-2026-XXXX`) i przekazaniu do dyspozytorni POK Kartuzy.
2. **Szablon B (Informacja o postępach):** Raportuje o bezpośrednich działaniach weryfikacyjnych załogi wywozowej.
3. **Szablon C (Informacja o rozwiązaniu):** Prezentuje rzeczywisty opis wykonanych działań (np. *„Zastępczy odbiór bioodpadów wykonany w dn. 25.11”*).
4. **Szablon D (Neutralna prośba o opinię):** Zaproszenie do wystawienia recenzji w Profilu Firmy Google.

---

## 10. Zarządzanie reputacją i Opinie Google

W zakładce `USTAWIENIA` znajduje się pole **„Zweryfikowany link do opinii Google”**.

- **Brak review gatingu:** Zaproszenie nie jest uzależnione od oceny satysfakcji.
- **Brak zachęt i nagród:** Zgodność z wytycznymi Google Maps & Business Profile.
- **Neutralność:** Brak sugerowania ocen i gwiazdek.
- **Ochrona przed duplikatami:** Blokada ponownej wysyłki bez wyraźnego potwierdzenia dyspozytora.

---

## 11. Dziennik audytu (HISTORIA KOMUNIKACJI)

Każda operacja wysyłki mailowej lub odnotowania rozmowy telefonicznej jest trwale rejestrowana w dedykowanej zakładce `HISTORIA KOMUNIKACJI`:
- Numer zgłoszenia;
- Data i godzina;
- Rodzaj działania i kanał (`e-mail`, `telefon`);
- Adresat (`wsb.student.tester@gmail.com` w trybie demo);
- Temat i pełna treść wiadomości / notatka;
- Pracownik odpowiedzialny;
- Status: `wysłano`, `odnotowano kontakt`, `błąd wysyłki`, `anulowano`;
- Informacja o błędzie / blokadzie bezpieczeństwa.

---

## 12. Rozszerzony Dashboard i Rejestr Zgłoszeń

Wskaźniki w zakładce `DASHBOARD` wyliczane są dynamicznie z danych rejestru:
- Wolumeny spraw: *Wszystkie*, *Nowe*, *W realizacji*, *Zakończone*, *Odsetek zakończonych*;
- *Sprawy oczekujące na kontakt* (wniosek o kontakt + status Nowe / Do weryfikacji);
- *Średni czas pierwszej reakcji* oraz *Średni czas rozwiązania* (obliczane **wyłącznie** dla wierszy z uzupełnionymi datami);
- *Średnia ocena satysfakcji (1–5)* oraz liczba zebranych ocen;
- *Liczba wysłanych próśb o opinię Google* oraz *odsetek spraw zakończonych z prośbą* (*Liczba próśb ≠ liczba wystawionych opinii*).

---

## 13. Instrukcja publikacji na GitHub Pages

Repozytorium GitHub pozostaje na Twoim dotychczasowym koncie użytkownika:

1. Wypchnij kod do repozytorium:
   ```bash
   git add .
   git commit -m "Release v0.2.1: Server-side security and dedicated tester account"
   git push -u origin main
   ```
2. W ustawieniach repozytorium (*Settings -> Pages*) włącz publikację z gałęzi **main** i katalogu **/(root)**.
3. Strona będzie dostępna pod adresem: `https://TWOJ_LOGIN.github.io/elwoz-eco-smartcare/`.

---

## 14. Generowanie Kodu QR (Dla pojemników i prezentacji)

Uruchom generator Node.js ze swoim opublikowanym adresem GitHub Pages:

```bash
node assets/generate_qr.js https://TWOJ_LOGIN.github.io/elwoz-eco-smartcare/
```

Skrypt wygeneruje wektorowy kod `assets/qr-code.svg` oraz plik rastrowy `assets/qr-code.png` (1000×1000 px), gotowy do druku naklejek na pojemniki komunalne ([assets/naklejka-pojemnik-szablon.svg](assets/naklejka-pojemnik-szablon.svg)).

---

## 15. Procedura testowania i weryfikacja

Przed prezentacją zaliczeniową członkowie zespołu wykonują testy opisane w [docs/testy.md](docs/testy.md) z poziomu konta `wsb.student.tester@gmail.com`:
- Sprawdzenie przygotowania i edycji szablonów A–D;
- Test wysyłki na `wsb.student.tester@gmail.com`;
- **Test TEST-11:** Weryfikacja twardej blokady serwerowej uniemożliwiającej wysyłkę na jakikolwiek inny adres e-mail;
- Sprawdzenie rejestracji notatki telefonicznej w historii;
- Walidacja blokady wysłania rozwiązania bez uzupełnienia sposobu rozwiązania sprawy;
- Weryfikacja kalkulacji w Dashboardzie.

---

## 16. Koszty, limity i wymagania licencyjne

- **Koszty całkowite:** **0,00 zł**.
- **Limit MailApp na koncie Gmail:** 100 wiadomości/dzień (w zupełności wystarczający do testów demonstracyjnych).
- **Limit Gemini API (Google AI Studio Free Tier):** 15 zapytań/minutę.

---

## 17. Wykaz działań wymagających ręcznej autoryzacji

1. **Logowanie na konto testerskie:** Zalogowanie się na `wsb.student.tester@gmail.com` w celu utworzenia projektu Apps Script.
2. **Akceptacja uprawnień Apps Script:** Jednorazowa autoryzacja uprawnień `MailApp`, `Spreadsheets` i `Forms` na koncie `wsb.student.tester@gmail.com`.
3. **Pobranie klucza Gemini API:** Wygenerowanie darmowego klucza na [aistudio.google.com](https://aistudio.google.com/) i wprowadzenie go przez menu arkusza (*SmartCare -> Ustawienia / Klucz Gemini API*).
4. **Publikacja GitHub Pages:** Aktywacja Pages w ustawieniach Twojego repozytorium na GitHubie.

---

*ELWOZ ECO SmartCare v0.2.1 – Uniwersytet WSB Merito w Gdańsku.*
