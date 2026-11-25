# ELWOZ ECO SmartCare – Cyfrowy Punkt Obsługi Mieszkańca
**Wersja:** 0.1.0  
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
6. [Instrukcja publikacji na GitHub Pages](#6-instrukcja-publikacji-na-github-pages)
7. [Generowanie Kodu QR (Dla pojemników i prezentacji)](#7-generowanie-kodu-qr-dla-pojemników-i-prezentacji)
8. [Instrukcja obsługi zgłoszeń (Prosty CRM w Google Sheets)](#8-instrukcja-obsługi-zgłoszeń-prosty-crm-w-google-sheets)
9. [Instrukcja wykorzystania AI (Dwa warianty)](#9-instrukcja-wykorzystania-ai-dwa-warianty)
10. [Procedura testowania i weryfikacja](#10-procedura-testowania-i-weryfikacja)
11. [Zasady ochrony danych i anonimizacji](#11-zasady-ochrony-danych-i-anonimizacji)
12. [Znane ograniczenia](#12-znane-ograniczenia)
13. [Koszty, limity i wymagania licencyjne](#13-koszty-limity-i-wymagania-licencyjne)
14. [Wykaz działań wymagających ręcznej autoryzacji](#14-wykaz-działań-wymagających-ręcznej-autoryzacji)

---

## 1. Kontekst i cel projektu

Projekt **ELWOZ ECO SmartCare** powstał w odpowiedzi na wyzwania operacyjne związane z obsługą mieszkańców w sektorze gospodarki odpadami komunalnymi w rejonie Kartuz.

Celem aplikacji jest:
- **Uproszczenie ścieżki zgłaszania nieprawidłowości:** Mieszkaniec po zeskanowaniu kodu QR z naklejki na pojemniku może w 30 sekund zgłosić brak odbioru, pęknięty kubeł czy brak worków – bez instalowania aplikacji i bez logowania.
- **Uporządkowanie obsługi wewnątrz przedsiębiorstwa:** Zgłoszenia trafiają do prywatnego arkusza Google Sheets pełniącego rolę prostego CRM z automatycznym nadawaniem numerów spraw i kontrolą statusów.
- **Wsparcie pracowników za pomocą AI:** Sztuczna inteligencja pomaga w kategoryzacji spraw, weryfikacji brakujących informacji i przygotowaniu empatycznych szkiców odpowiedzi, nie zastępując człowieka w podejmowaniu decyzji.
- **Wykorzystanie istniejącej infrastruktury:** Spółka ELWOZ ECO posiada już asystenta internetowego na stronie głównej – SmartCare nie powiela funkcji chatbota, skupiając się wyłącznie na procesie reklamacyjno-obsługowym.

---

## 2. Główne założenia i architektura

- **Maksymalna prostota:** Brak baz danych SQL/NoSQL wymagających płatnego hostingu, brak frameworków SPA.
- **Prywatność i bezpieczeństwo:** Formularz zgłoszeniowy jest publiczny (zbiera wyłącznie zgłoszenia testowe), natomiast rejestr zgłoszeń (CRM w Google Sheets) pozostaje prywatny, dostępny wyłącznie dla uprawnionych pracowników.
- **Odporność na awarie AI:** System działa w pełni poprawnie nawet przy braku połączenia z API sztucznej inteligencji (dostępny wariant manualny).
- **Zasada Human-in-the-Loop:** AI nie podejmuje wiążących decyzji, nie obiecuje odszkodowań, nie ustala terminów odbioru i nie wysyła wiadomości bez autoryzacji pracownika.

```
[Mieszkaniec] ---> Skanuje Kod QR z kubła
       │
       ▼
[GitHub Pages: index.html] ---> Wypełnia prosty formularz (dane fikcyjne)
       │
       ▼
[Google Forms / Apps Script] ---> onFormSubmit (nadanie ID, status: "Nowe")
       │
       ▼
[Google Sheets CRM: ZGŁOSZENIA] <--- Pracownik analizuje zgłoszenie
       │
       ├──> Wariant A: Kopiuje opis do promptu (ChatGPT / Gemini Web)
       └──> Wariant B: Menu "SmartCare AI" -> "Analizuj zaznaczone zgłoszenie" (Gemini API)
       │
       ▼
[DASHBOARD] ---> Dynamiczne wskaźniki KPI, czasy reakcji, wykresy statusów
```

---

## 3. Wykorzystane technologie

- **Frontend:** Czysty HTML5 (semantyka, dostępność WCAG), CSS3 (zmienne CSS, mobile-first, elastyczny grid/flexbox), czysty Vanilla JavaScript (ES6+).
- **Hosting strony:** GitHub Pages (darmowy, stabilny hosting statyczny, SSL/HTTPS).
- **Rejestracja danych:** Google Forms (natywne połączenie z arkuszem, wysoka niezawodność, brak konieczności logowania przez mieszkańców).
- **Baza danych / CRM:** Google Sheets (rejestr zgłoszeń, widok CRM, formatowanie warunkowe, listy rozwijane, dynamiczny dashboard ze wskaźnikami KPI).
- **Automatyzacja backendowa:** Google Apps Script (konfigurator `setup.gs`, instalowalny trigger `onFormSubmit`, obsługa AI w `ai.gs`).
- **Sztuczna inteligencja:** Model Google Gemini (`gemini-1.5-flash` przez bezpłatne Google AI Studio API) oraz gotowy prompt manualny dla ChatGPT / Gemini.

---

## 4. Struktura repozytorium

```
elwoz-eco-smartcare/
├── index.html                   # Główna strona aplikacji (mobile-first)
├── css/
│   └── style.css                # Style wizualne inspirowane marką ELWOZ ECO
├── js/
│   ├── config.js                # Konfiguracja linków, adresów formularza i ostrzeżeń
│   └── app.js                   # Obsługa walidacji, generator ID, nawigacja
├── assets/
│   ├── logo.svg                 # Wektorowy logotyp ELWOZ ECO SmartCare
│   ├── favicon.svg              # Ikona strony
│   ├── naklejka-pojemnik-szablon.svg # Gotowy projekt naklejki na pojemnik z miejscem na QR
│   └── generate_qr.js           # Skrypt Node.js generujący QR dla docelowego adresu URL
├── google/
│   ├── setup.gs                 # Automatyczny skrypt instalacyjny arkusza i formularza
│   └── ai.gs                    # Integracja Gemini AI z poziomu arkusza Google Sheets
├── docs/
│   ├── prompt-ai.md             # Gotowy prompt systemowy i procedura obsługi manualnej
│   └── testy.md                 # 10 scenariuszy testowych i matryca efektywności AI
├── CHANGELOG.md                 # Historia wydań projektu
└── README.md                    # Niniejsza dokumentacja
```

---

## 5. Instrukcja konfiguracji usług Google (Krok po kroku)

Automatyczny skrypt `google/setup.gs` tworzy i konfiguruje cały ekosystem za Ciebie.

### Krok 1: Otwórz Google Apps Script
1. Zaloguj się na swoje konto Google i przejdź do: [https://script.google.com/](https://script.google.com/).
2. Kliknij przycisk **„Nowy projekt”** (lewy górny róg).
3. Zmień nazwę projektu z *Projekt bez tytułu* na **„ELWOZ ECO SmartCare Setup”**.

### Krok 2: Wklejenie kodu instalacyjnego
1. W edytorze kodu zaznacz cały domyślny tekst i usuń go.
2. Otwórz plik [google/setup.gs](google/setup.gs), skopiuj całą jego zawartość i wklej do edytora.
3. Jeśli chcesz korzystać również z wariantu automatycznego AI:
   - Kliknij ikonkę **+** obok sekcji *Pliki* i wybierz **Skrypt**.
   - Nazwij plik `ai.gs`.
   - Skopiuj zawartość pliku [google/ai.gs](google/ai.gs) i wklej do nowo utworzonego pliku.
4. Kliknij ikonę dyskietki **„Zapisz projekt”** (Ctrl + S).

### Krok 3: Uruchomienie i autoryzacja
1. Na górnym pasku narzędzi upewnij się, że w polu wyboru funkcji wybrana jest: **`setupSmartCareSystem`**.
2. Kliknij przycisk **„Uruchom”** (Run).
3. Pojawi się okno autoryzacji:
   - Kliknij **„Sprawdź uprawnienia”**.
   - Wybierz swoje konto Google.
   - Jeśli pojawi się komunikat *„Aplikacja nie została zweryfikowana przez Google”*, kliknij **Zaawansowane** (na dole), a następnie **Otwórz: ELWOZ ECO SmartCare Setup (niebezpieczne)**.
   - Kliknij **„Zezwól”**.

### Krok 4: Odczytanie linków z Dziennika
1. W dolnej części ekranu (Dziennik wykonania) pojawią się komunikaty:
   ```
   === Konfiguracja zakończona pomyślnie! ===
   1. Arkusz CRM (Prywatny): https://docs.google.com/spreadsheets/d/...
   2. Publiczny link do wypełniania: https://docs.google.com/forms/d/e/.../viewform
   ```
2. Skopiuj link formularza i wklej go w pliku [js/config.js](js/config.js):
   ```javascript
   googleForm: {
     directUrl: "TUTAJ_WKLEJ_LINK_DO_FORMULARZA",
     embedUrl: "TUTAJ_WKLEJ_LINK_DO_FORMULARZA?embedded=true",
     isFormConfigured: true
   }
   ```

---

## 6. Instrukcja publikacji na GitHub Pages

Aplikacja jest statyczną stroną WWW, co pozwala na jej bezpłatne i błyskawiczne wdrożenie na GitHub Pages.

1. **Utwórz nowe repozytorium na GitHub:**
   - Przejdź do [github.com/new](https://github.com/new).
   - Nazwij repozytorium: `elwoz-eco-smartcare`.
   - Ustaw widoczność jako **Public**.
   - Nie dodawaj automatycznego README ani pliku .gitignore (są już w projekcie).
2. **Prześlij pliki do repozytorium:**
   ```bash
   git init
   git add .
   git commit -m "Wydanie 0.1.0: ELWOZ ECO SmartCare"
   git branch -M main
   git remote add origin https://github.com/TWOJ_LOGIN/elwoz-eco-smartcare.git
   git push -u origin main
   ```
3. **Aktywuj GitHub Pages:**
   - W repozytorium na GitHub wejdź w **Settings** -> zakładka **Pages** (w menu po lewej).
   - W sekcji *Build and deployment* -> *Branch*: wybierz gałąź **main** oraz katalog **/(root)**.
   - Kliknij **Save**.
4. Po około 1–2 minutach strona będzie dostępna pod adresem:  
   `https://TWOJ_LOGIN.github.io/elwoz-eco-smartcare/`

---

## 7. Generowanie Kodu QR (Dla pojemników i prezentacji)

Zgodnie z wymaganiami projektowymi kod QR musi prowadzić do **rzeczywistego, działającego adresu URL**.

Po opublikowaniu strony na GitHub Pages uruchom przygotowany skrypt w Node.js:

```bash
node assets/generate_qr.js https://TWOJ_LOGIN.github.io/elwoz-eco-smartcare/
```

Skrypt automatycznie:
1. Pobierze i wygeneruje wektorowy plik `assets/qr-code.svg` w kolorystyce firmowej ELWOZ ECO (`#1b7a3e`).
2. Pobierze i wygeneruje plik rastrowy wysokiej rozdzielczości `assets/qr-code.png` (1000×1000 px), idealny do druku naklejek i wklejenia do prezentacji na uczelni.
3. Zaktualizuje szablon naklejki na pojemnik: [assets/naklejka-pojemnik-szablon.svg](assets/naklejka-pojemnik-szablon.svg).

---

## 8. Instrukcja obsługi zgłoszeń (Prosty CRM w Google Sheets)

Po uruchomieniu skryptu `setup.gs` arkusz **ELWOZ ECO SmartCare – Centrum zgłoszeń** zawiera 4 zakładki:

### 1. Zakładka `DASHBOARD`
- Zapewnia podgląd kluczowych wskaźników operacyjnych w czasie rzeczywistym:
  - Łączna liczba zgłoszeń, liczba spraw nowych, w realizacji i rozwiązanych;
  - Średni czas pierwszej reakcji oraz średni czas rozwiązania sprawy (formuły obliczają średnią wyłącznie dla spraw, które mają uzupełnione daty);
  - Średnia satysfakcja mieszkańców (w skali 1–5);
  - Zliczenia spraw według kategorii i statusu.

### 2. Zakładka `ZGŁOSZENIA` (Rejestr operacyjny)
- **Dane z formularza:** Sygnatura czasowa, rodzaj zgłoszenia, frakcja, miejscowość, ulica, numer posesji, data zdarzenia, opis, dane kontaktowe.
- **Kolumny operacyjne pracownika:**
  - `ID Zgłoszenia` – unikalny identyfikator sprawy (np. `ELW-2026-0001`);
  - `Status` – lista rozwijana: *Nowe* (niebieski), *Do weryfikacji* (fiolet), *W realizacji* (żółty), *Oczekuje na informacje* (szary), *Rozwiązane* (zielony), *Zamknięte* (grafit);
  - `Priorytet` – lista rozwijana: *Standardowy*, *Niski*, *Wysoki*;
  - `Pracownik odpowiedzialny`, `Następne działanie`, `Termin następnego działania`, `Notatka pracownika`;
  - `Data pierwszego kontaktu` oraz `Data rozwiązania` – wpisywane po podjęciu działań;
  - `Sposób rozwiązania sprawy`;
  - `Ocena satysfakcji (1-5)` – ocena odnotowana przez pracownika po kontakcie z mieszkańcem;
  - Kolumny analizy AI: `Kategoria AI`, `Streszczenie AI`, `Brakujące informacje AI`, `Sugerowane działanie AI`, `Proponowana odpowiedź AI`.

### 3. Zakładka `TESTY`
- Zawiera rejestr 10 scenariuszy testowych oraz tabelę pomiaru oszczędności czasu pracy pracownika.

### 4. Zakładka `INSTRUKCJA AI`
- Zawiera podręcznik procedury anonimizacji oraz gotowy prompt do wklejenia w ChatGPT / Gemini.

---

## 9. Instrukcja wykorzystania AI (Dwa warianty)

### Wariant A: Manualny (Podstawowy, 100% bezpłatny, bez API)
1. Pracownik zaznacza wiersz ze zgłoszeniem w arkuszu.
2. Zgodnie z zasadami ochrony danych kopiuje wyłącznie: rodzaj zgłoszenia, frakcję, miejscowość, ulicę oraz treść opisu zdarzenia (bez nazwiska i telefonu).
3. Otwiera [ChatGPT](https://chatgpt.com/) lub [Google Gemini](https://gemini.google.com/) i wkleja gotowy prompt z pliku [docs/prompt-ai.md](docs/prompt-ai.md).
4. Otrzymane 6 pól wynikowych wkleja do odpowiednich kolumn CRM w arkuszu.

### Wariant B: Automatyczny (Apps Script + Gemini API)
1. Pracownik pobiera bezpłatny klucz API z [Google AI Studio](https://aistudio.google.com/).
2. W arkuszu Google Sheets klika w menu: **🤖 SmartCare AI -> Ustaw / sprawdź klucz Gemini API** i wkleja swój klucz. Klucz zapisuje się we właściwościach projektu (`ScriptProperties`), niewidocznych publicznie.
3. Pracownik zaznacza wiersz ze zgłoszeniem i klika: **🤖 SmartCare AI -> Analizuj zaznaczone zgłoszenie**.
4. Skrypt przesyła zanonimizowane dane, odbiera ustrukturyzowany format JSON i automatycznie wypełnia kolumny AI w wybranym wierszu.

---

## 10. Procedura testowania i weryfikacja

Przed prezentacją końcową członkowie zespołu przeprowadzają testy zgodnie z plikiem [docs/testy.md](docs/testy.md).

Procedura obejmuje 10 kluczowych scenariuszy:
1. Brak odbioru odpadów BIO.
2. Uszkodzenie pojemnika (zgłoszenie wymiany).
3. Bałagan na posesji po odbiorze.
4. Zgłoszenie anonimowe (brak danych kontaktowych).
5. Zgłoszenie z fikcyjnym numerem telefonu.
6. Próba wysłania formularza bez wypełnienia pól obowiązkowych (walidacja).
7. Zgłoszenie pochwały dla załogi.
8. Weryfikacja prywatności arkusza Google Sheets (próba otwarcia w trybie incognito).
9. Analiza zgłoszenia przez sztuczną inteligencję.
10. Sprawdzenie odporności AI na halucynacje (brak obietnic odszkodowań i zmyślonych dat).

Wyniki pomiarów czasu (bez AI vs z AI) są wpisywane bezpośrednio przez testerów do tabeli w zakładce `TESTY`.

---

## 11. Zasady ochrony danych i anonimizacji

- **Etap prototypu:** Wszystkie zgłoszenia na etapie testów studenckich muszą zawierać **wyłącznie dane fikcyjne**.
- **Ostrzeżenia w interfejsie:** Strona WWW oraz formularz zawierają wyraźne alerty o prototypowym charakterze i zakazie podawania prawdziwych danych wrażliwych.
- **Odpowiedzialność:** Zgłoszenia testowe nie są przekazywane do dyspozytorni rzeczywistego przedsiębiorstwa. W sprawach pilnych aplikacja kieruje do oficjalnych numerów POK Kartuzy (58 681 22 99).
- **Zasada minimalizacji danych:** Formularz nie wymaga numeru PESEL, załączania zdjęć ani zakładania konta.

---

## 12. Znane ograniczenia

- **Brak załączania zdjęć:** Zgodnie z założeniami minimalizmu i braku konieczności logowania do konta Google przez mieszkańców wyłączono przesyłanie plików (Google Forms wymaga logowania, jeśli formularz zawiera pole przesyłania plików).
- **Czas odświeżania dashboardu:** Formuły arkusza przeliczają się natychmiast, jednak przy dużej liczbie zgłoszeń wykresy mogą wymagać odświeżenia strony arkusza.
- **Limit zapytań bezpłatnego Gemini API:** Darmowy limit w Google AI Studio wynosi 15 zapytań na minutę (RPM), co w zupełności wystarcza do jednostkowej analizy zgłoszeń przez pracownika.

---

## 13. Koszty, limity i wymagania licencyjne

| Komponent | Wykorzystana usługa | Koszt | Limity bezpłatne |
|---|---|---|---|
| Hosting strony WWW | GitHub Pages | **0 zł** | 100 GB transferu/mc, 1 GB przestrzeni |
| Formularz i CRM | Google Forms & Google Sheets | **0 zł** | W ramach darmowego konta Google (15 GB) |
| Automatyzacja | Google Apps Script | **0 zł** | 90 min czasu wykonania/dzień, do 20 000 wywołań |
| Sztuczna Inteligencja | Google AI Studio (Gemini 1.5 Flash) | **0 zł** | Bezpłatna warstwa (Free Tier: 15 RPM, 1M TPM) |
| Alternatywa AI | ChatGPT / Gemini Web (manualnie) | **0 zł** | Bezpłatne wersje przeglądarkowe |
| **ŁĄCZNY KOSZT UTRZYMANIA:** | | **0,00 zł** | **Rozwiązanie bezkosztowe** |

---

## 14. Wykaz działań wymagających ręcznej autoryzacji

W celu zachowania pełnego bezpieczeństwa i zgodności z uprawnieniami właściciela konta, poniższe kroki wymagają jednorazowej, ręcznej akceptacji przez użytkownika:

1. **Autoryzacja skryptu Apps Script:** Pierwsze uruchomienie funkcji `setupSmartCareSystem` w Google Apps Script wymaga potwierdzenia uprawnień do zarządzania Arkuszami i Formularzami na Twoim koncie Google.
2. **Utworzenie repozytorium GitHub:** Publikacja kodu na Twoim koncie GitHub i aktywacja GitHub Pages w menu *Settings -> Pages*.
3. **Pobranie klucza Gemini API (opcjonalnie):** Jeśli chcesz korzystać z analizy bezpośrednio w arkuszu, pobierz bezpłatny klucz z [aistudio.google.com](https://aistudio.google.com/) i wklej go przez menu arkusza.

---

*ELWOZ ECO SmartCare v0.1.0 – Projekt zrealizowany w celach edukacyjnych dla Uniwersytetu WSB Merito w Gdańsku.*
