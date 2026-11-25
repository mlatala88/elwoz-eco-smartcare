# ELWOZ ECO SmartCare – Cyfrowy Punkt Obsługi Mieszkańca
**Wersja:** 0.2.0 (w tym Moduł Komunikacji i Zarządzania Reputacją)  
**Projekt zaliczeniowy:** *Nowoczesne technologie w marketingu i sprzedaży* – Uniwersytet WSB Merito w Gdańsku  
**Przedsiębiorstwo:** ELWOZ ECO Sp. z o.o.  
**Obszar wdrożenia:** Rejon Kartuz i okoliczne sołectwa  
**Oficjalna strona przedsiębiorstwa:** [elwozeco.pl](https://elwozeco.pl/)

---

## Spis treści
1. [Kontekst i cel projektu](#1-kontekst-i-cel-projektu)
2. [Główne założenia i architektura](#2-główne-założenia-i-architektura)
3. [Wykorzystane technologie](#3-wykorzystane-technologie)
4. [Struktura repozytorium](#4-struktura-repozytorium)
5. [Instrukcja konfiguracji usług Google (Krok po kroku)](#5-instrukcja-konfiguracji-usług-google-krok-po-kroku)
6. [Menu pracownika „SmartCare” w Google Sheets](#6-menu-pracownika-smartcare-w-google-sheets)
7. [Szablony wiadomości i procedura komunikacji](#7-szablony-wiadomości-i-procedura-komunikacji)
8. [Zarządzanie reputacją i Opinie Google](#8-zarządzanie-reputacją-i-opinie-google)
9. [Dziennik audytu (HISTORIA KOMUNIKACJI)](#9-dziennik-audytu-historia-komunikacji)
10. [Rozszerzony Dashboard i Rejestr Zgłoszeń](#10-rozszerzony-dashboard-i-rejestr-zgłoszeń)
11. [Tryb demonstracyjny i zasady bezpieczeństwa](#11-tryb-demonstracyjny-i-zasady-bezpieczeństwa)
12. [Instrukcja publikacji na GitHub Pages](#12-instrukcja-publikacji-na-github-pages)
13. [Generowanie Kodu QR (Dla pojemników i prezentacji)](#13-generowanie-kodu-qr-dla-pojemników-i-prezentacji)
14. [Procedura testowania i weryfikacja](#14-procedura-testowania-i-weryfikacja)
15. [Koszty, limity i wymagania licencyjne](#15-koszty-limity-i-wymagania-licencyjne)
16. [Wykaz działań wymagających ręcznej autoryzacji](#16-wykaz-działań-wymagających-ręcznej-autoryzacji)

---

## 1. Kontekst i cel projektu

Projekt **ELWOZ ECO SmartCare** realizowany jest na Uniwersytecie WSB Merito w Gdańsku jako studencki projekt wdrożeniowy dedykowany spółce **ELWOZ ECO Sp. z o.o.**, odpowiedzialnej za odbiór odpadów komunalnych w rejonie Kartuz.

Wersja **0.2.0** rozszerza pierwotny rejestr zgłoszeń o **kompletny obieg obsługi klienta i zarządzania reputacją**:
- **Przyjęcie zgłoszenia** bez konieczności logowania i instalacji aplikacji przez mieszkańca;
- **Wstępna analiza AI** odciążająca dyspozytora w diagnozie problemu;
- **Potwierdzenie rozpoczęcia obsługi** i stała informacja zwrotna o postępach;
- **Rozwiązanie problemu** z udokumentowanym opisem podjętych działań naprawczych;
- **Badanie satysfakcji mieszkańca** (skala 1–5);
- **Zaproszenie do wystawienia autentycznej recenzji w Profilu Firmy Google**, budującej wiarygodną reputację przedsiębiorstwa w oparciu o rzeczywistą jakość obsługi.

---

## 2. Główne założenia i architektura

- **Pełna kompatybilność i brak zbędnych frameworków:** Rozwiązanie bazuje na czystym HTML5, CSS3, JavaScript, Google Forms, Google Sheets, Apps Script i MailApp.
- **Zasada Human-in-the-Loop:** Sztuczna inteligencja nie podejmuje wiążących decyzji prawnych, nie wymyśla terminów odbioru, nie deklaruje uznania reklamacji i nie wysyła wiadomości bez wyraźnej autoryzacji pracownika.
- **Bezpieczeństwo danych (Tryb demonstracyjny):** W fazie akademickiej cała komunikacja e-mail kierowana jest wyłącznie na zatwierdzony adres testowy z prefiksem `[TEST]`. Żadne dane fikcyjne nie trafiają do prawdziwych mieszkańców.
- **Etyka pozyskiwania opinii Google:** Prośby o opinię są w pełni neutralne, nie stosują tzw. *review gatingu* (selekcjonowania wyłącznie zadowolonych klientów) i nie oferują korzyści majątkowych za recenzje.

---

## 3. Wykorzystane technologie

- **Frontend:** HTML5, CSS3 (Mobile-First, barwy ELWOZ ECO: zieleń `#1b7a3e`, granat `#143d59`), Vanilla JavaScript (ES6+).
- **Hosting:** GitHub Pages (darmowy hosting statyczny z szyfrowaniem SSL).
- **Rejestracja i Baza CRM:** Google Forms & Google Sheets (*ELWOZ ECO SmartCare – Centrum zgłoszeń*).
- **Backend i Automatyzacja:** Google Apps Script (`setup.gs`, `communication.gs`, `ai.gs`), Google MailApp.
- **Sztuczna Inteligencja:** Google Gemini API (`gemini-1.5-flash`) oraz bezpłatny wariant manualny z gotowym promptem dla ChatGPT / Gemini.

---

## 4. Struktura repozytorium

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
│   ├── communication.gs         # Moduł komunikacji, szablony, okna dialogowe, MailApp
│   └── ai.gs                    # Integracja analityczna Gemini API z menu SmartCare
├── docs/
│   ├── prompt-ai.md             # Szablon promptu manualnego, anonimizacja i zasady AI
│   └── testy.md                 # Procedura testowa, 12 scenariuszy i matryca efektywności
├── CHANGELOG.md                 # Historia wydań projektu (v0.1.0 -> v0.2.0)
└── README.md                    # Kompletna dokumentacja wdrożeniowa
```

---

## 5. Instrukcja konfiguracji usług Google (Krok po kroku)

### Krok 1: Otwórz projekt w Google Apps Script
1. Zaloguj się na konto Google i przejdź pod adres: [https://script.google.com/](https://script.google.com/).
2. Utwórz **Nowy projekt** i nazwij go: **„ELWOZ ECO SmartCare”**.

### Krok 2: Wklejenie plików skryptu
1. W pliku domyślnym `Kod.gs` (lub zmieniając jego nazwę na `setup.gs`) wklej zawartość [google/setup.gs](google/setup.gs).
2. Kliknij ikonę **+** (Dodaj plik) -> **Skrypt**, nazwij plik `communication.gs` i wklej zawartość [google/communication.gs](google/communication.gs).
3. Kliknij ikonę **+** -> **Skrypt**, nazwij plik `ai.gs` i wklej zawartość [google/ai.gs](google/ai.gs).
4. Zapisz projekt (Ctrl + S).

### Krok 3: Uruchomienie instalatora
1. Z listy funkcji wybierz: **`setupSmartCareSystem`** i kliknij **„Uruchom”**.
2. Zaakceptuj uprawnienia do tworzenia Arkuszy, Formularzy i wysyłki poczty przez Twoje konto Google.
3. W Dzienniku wykonania otrzymasz linki do prywatnego arkusza CRM oraz publicznego formularza.

---

## 6. Menu pracownika „SmartCare” w Google Sheets

Po otwarciu arkusza w górnym pasku narzędzi pojawi się dedykowane menu: **📋 SmartCare**:

| Opcja menu | Rola i działanie |
|---|---|
| **1. 🤖 Analizuj zgłoszenie przez AI** | Błyskawiczna analiza zaznaczonego zgłoszenia przez Gemini API (streszczenie, braki, kategoria, sugerowane działanie). |
| **2. ✉️ Przygotuj potwierdzenie przyjęcia** | Otwiera okno dialogowe z uzupełnionym szablonem A z danymi sprawy i lokalizacji. |
| **3. ✉️ Przygotuj informację o postępach** | Otwiera okno dialogowe z szablonem B informującym o trwającej weryfikacji w terenie. |
| **4. ✉️ Przygotuj informację o rozwiązaniu** | Weryfikuje uzupełnienie pola *Sposób rozwiązania sprawy*, generuje szablon C z opcją dołączenia linku do opinii Google. |
| **5. ⭐ Przygotuj prośbę o opinię Google** | Otwiera szablon D z neutralnym zaproszeniem do Profilu Firmy Google (ostrzega przy ponownej wysyłce). |
| **6. 📞 Odnotuj kontakt telefoniczny** | Umożliwia rejestrację notatki z rozmowy telefonicznej, wyniku kontaktu i aktualizację daty kontaktu. |
| **7. 📜 Wyświetl historię komunikacji** | Prezentuje pełną tabelę dotychczasowej korespondencji dla zaznaczonego ID zgłoszenia. |
| **⚙️ Ustawienia / Klucz Gemini API** | Bezpieczny konfigurator klucza API zapisywanego w `ScriptProperties`. |

---

## 7. Szablony wiadomości i procedura komunikacji

System posiada 4 edytowalne szablony wiadomości działające natywnie bez konieczności połączenia z zewnętrznym API:

1. **Szablon A (Potwierdzenie przyjęcia):** Informuje mieszkańca o zarejestrowaniu sprawy, nadanym identyfikatorze (`ELW-2026-XXXX`) i przekazaniu do dyspozytorni w Kartuzach.
2. **Szablon B (Informacja o postępach):** Raportuje o weryfikacji zgłoszenia przez zespół logistyczny i załogę rejonową.
3. **Szablon C (Informacja o rozwiązaniu):** Pobiera wpisany przez pracownika rzeczywisty sposób rozwiązania sprawy (np. *„Zastępczy odbiór bioodpadów zrealizowany w dniu 25.11 przez brygadę nr 2”*). Posiada opcję dołączenia zaproszenia do opinii Google.
4. **Szablon D (Neutralna prośba o opinię):** Samodzielna wiadomość z podziękowaniem za kontakt i odnośnikiem do Profilu Firmy Google.

Pracownik w oknie dialogowym może:
- Wprowadzić własne modyfikacje w temacie i treści;
- Skorzystać z przycisku *„✨ Usprawnij treść z AI”* (wygładzenie stylistyczne);
- Świadomie kliknąć *„Zatwierdź i wyślij”*.

---

## 8. Zarządzanie reputacją i Opinie Google

W zakładce `USTAWIENIA` znajduje się pole **„Zweryfikowany link do opinii Google”**.

### Etyczne standardy zbierania recenzji:
- **Brak review gatingu:** Zaproszenie do opinii nie jest uzależnione od uprzednio wystawionej oceny satysfakcji.
- **Brak zachęt:** Nie oferuje się nagród, bonifikat ani zniżek za wystawienie recenzji.
- **Neutralność:** Treść prośby nie sugeruje liczby gwiazdek ani pozytywnego wydźwięku.
- **Brak fałszywych profili:** W szablonie umieszczono bezpieczny placeholder linku do uzupełnienia po autoryzacji rzeczywistej wizytówki Google ELWOZ ECO w Kartuzach.
- **Ochrona przed spamem:** System blokuje ponowne wysłanie prośby do tego samego zgłoszenia bez wyraźnego potwierdzenia pracownika.

---

## 9. Dziennik audytu (HISTORIA KOMUNIKACJI)

Każda operacja wysyłki mailowej lub odnotowania rozmowy telefonicznej jest trwale zapisywana w dedykowanej zakładce `HISTORIA KOMUNIKACJI`:
- Numer zgłoszenia;
- Data i godzina operacji;
- Rodzaj działania (np. *Potwierdzenie przyjęcia*, *Kontakt telefoniczny*);
- Kanał (*e-mail*, *telefon*, *inny*);
- Rzeczywisty adres odbiorcy;
- Temat i pełna treść wysłanej wiadomości lub notatka z rozmowy;
- Login pracownika odpowiedzialnego;
- Status operacji: `wysłano`, `odnotowano kontakt`, `błąd wysyłki`, `anulowano`;
- Informacja o błędzie (jeśli wystąpił).

---

## 10. Rozszerzony Dashboard i Rejestr Zgłoszeń

### Wskaźniki w zakładce `DASHBOARD`:
- **Wszystkie zgłoszenia, Nowe, W realizacji, Zakończone;**
- **Odsetek zakończonych zgłoszeń;**
- **Liczba spraw oczekujących na kontakt** (zgłoszenia z zaznaczoną prośbą o kontakt będące w statusie *Nowe* lub *Do weryfikacji*);
- **Średni czas pierwszej reakcji** (wyliczany **wyłącznie** dla wierszy z uzupełnioną datą kontaktu);
- **Średni czas rozwiązania sprawy** (wyliczany **wyłącznie** dla spraw z uzupełnioną datą rozwiązania);
- **Średnia ocena satysfakcji (1–5)** oraz łączna liczba zebranych ocen;
- **Liczba wysłanych próśb o opinię Google** oraz **odsetek zakończonych spraw z wysłaną prośbą** (*wyraźne rozróżnienie: liczba próśb ≠ liczba wystawionych opinii*).

---

## 11. Tryb demonstracyjny i zasady bezpieczeństwa

Domyślnie system działa w **Trybie Demonstracyjnym** (`USTAWIENIA: TAK`):
1. **Poczta testowa:** Wszelka korespondencja mailowa wysyłana z poziomu arkusza trafia **wyłącznie** na adres zdefiniowany w polu *Testowy adres e-mail* (np. adres studenta / zespołu). Fikcyjne adresy wpisane w zgłoszeniach nie otrzymują żadnych wiadomości.
2. **Prefiks [TEST]:** Każdy temat wiadomości automatycznie otrzymuje oznaczenie `[TEST]`.
3. **Stopka akademicka:** Do każdej wiadomości dołączana jest nota informująca o studenckim charakterze prototypu realizowanego dla Uniwersytetu WSB Merito w Gdańsku.
4. **Przejście na tryb produkcyjny:** Wymaga zmiany parametru w zakładce `USTAWIENIA` na `NIE` po uprzednim formalnym uzgodnieniu z dyrekcją ELWOZ ECO Sp. z o.o.

---

## 12. Instrukcja publikacji na GitHub Pages

1. Zainicjuj repozytorium na GitHub o nazwie `elwoz-eco-smartcare`.
2. Wypchnij pliki:
   ```bash
   git add .
   git commit -m "Wydanie v0.2.0: Moduł komunikacji i reputacji"
   git branch -M main
   git remote add origin https://github.com/TWOJ_LOGIN/elwoz-eco-smartcare.git
   git push -u origin main
   ```
3. W ustawieniach repozytorium (*Settings -> Pages*) włącz publikację z gałęzi **main** i katalogu **/(root)**.
4. Strona będzie dostępna pod adresem: `https://TWOJ_LOGIN.github.io/elwoz-eco-smartcare/`.

---

## 13. Generowanie Kodu QR (Dla pojemników i prezentacji)

Uruchom generator Node.js ze swoim opublikowanym adresem GitHub Pages:

```bash
node assets/generate_qr.js https://TWOJ_LOGIN.github.io/elwoz-eco-smartcare/
```

Skrypt wygeneruje wektorowy plik `assets/qr-code.svg` oraz plik rastrowy `assets/qr-code.png` (1000×1000 px), gotowy do wklejenia do prezentacji oraz do szablonu [assets/naklejka-pojemnik-szablon.svg](assets/naklejka-pojemnik-szablon.svg).

---

## 14. Procedura testowania i weryfikacja

Przed prezentacją zaliczeniową członkowie zespołu realizują 12 scenariuszy testowych opisanych w dokumencie [docs/testy.md](docs/testy.md):
- Przygotowanie i edycja szablonów A, B, C i D;
- Wysyłka e-mail na adres testowy w trybie demo;
- Weryfikacja zapisu w historii komunikacji;
- Rejestracja kontaktu telefonicznego;
- Walidacja wymogu wpisania sposobu rozwiązania sprawy;
- Dołączenie linku do opinii Google;
- Ostrzeżenie przed ponowną prośbą o opinię;
- Zabezpieczenie przed wysyłką do obcych osób;
- Obsługa błędów wysyłki `MailApp`.

---

## 15. Koszty, limity i wymagania licencyjne

- **Koszty infrastruktury:** **0,00 zł** (wszystkie narzędzia mieszczą się w bezpłatnych limitach GitHub Pages, Google Workspace i Google AI Studio).
- **Limity wysyłki Google MailApp:** 100 wiadomości/dzień dla kont darmowych (@gmail.com) lub 1500 wiadomości/dzień dla kont Google Workspace uczelni / firmy.
- **Limit Gemini API (Free Tier):** 15 zapytań/min (RPM), w zupełności wystarczający do jednostkowej pracy dyspozytora.

---

## 16. Wykaz działań wymagających ręcznej autoryzacji

W celu zachowania bezpieczeństwa Twojego konta Google i GitHub:
1. **Autoryzacja uprawnień Apps Script:** Uruchomienie funkcji instalacyjnej w Google Apps Script wymaga jednorazowego zatwierdzenia uprawnień do zarządzania Arkuszami, Formularzami i usługą `MailApp` (wysyłka poczty w imieniu użytkownika).
2. **Publikacja na Twoim GitHubie:** Samodzielne utworzenie repozytorium i uruchomienie Pages w menu konta GitHub.
3. **Konfiguracja adresu testowego:** Wpisanie własnego adresu e-mail w komórce `B11` zakładki `USTAWIENIA`, aby odbierać testowe wiadomości generowane przez system.

---

*ELWOZ ECO SmartCare v0.2.0 – Projekt wdrożeniowy Uniwersytetu WSB Merito w Gdańsku.*
