# ELWOZ ECO SmartCare Manager v0.3.0 – Instrukcja Wdrożenia i Podręcznik Administratora

**Wersja:** 0.3.0 (Customer Service Intelligence & Web App CRM Integration)  
**Data wydania:** 26 listopada 2026 r.  
**Autorzy projektu:** Uniwersytet WSB Merito w Gdańsku – Zespół Badawczo-Wdrożeniowy:  
- Michał Latała (Administrator Systemu)
- Barbara Seroka (Pracownik Obsługi Klienta)
- Diana Skierka (Pracownik Obsługi Klienta)
- Anna Fedoruk (Pracownik Obsługi Klienta)
- Michał Wadyński (Obserwator)

---

## 1. Wprowadzenie i architektura v0.3.0

Wydanie **SmartCare Manager v0.3.0** integruje nowoczesną aplikację internetową typu Single Page Application (SPA) z ustabilizowanym silnikiem CRM **ELWOZ ECO SmartCare v0.2.8** opartym na Google Sheets, modelach Google Gemini API oraz automatycznej komunikacji e-mail.

System działa w unikalnej architekturze dwutrybowej (**Dual-Mode Architecture**):
1. **Tryb CONNECTED (Produkcyjny / Zintegrowany):**
   - Prywatny panel dyspozytorski pracownika biura obsługi mieszkańców (POK Kartuzy).
   - Bezpośrednie połączenie z rzeczywistą bazą 11 zgłoszeń w Google Sheets (`ELW-2026-0001` do `ELW-2026-0011`).
   - Rzeczywiste wywołania Gemini API (analizy zgłoszeń, asystent redakcyjny CX/PR).
   - Rejestracja korespondencji w zakładce `HISTORIA KOMUNIKACJI` z bezwzględną blokadą wysyłki testowej.
2. **Tryb DEMO (Demonstracyjny / Szkoleniowy):**
   - Działa lokalnie lub na GitHub Pages z 30 syntetycznymi zgłoszeniami w `LocalStorage` (`DemoDataProvider`).
   - Pełna symulacja wskaźników CSI, wykresów i asystenta AI bez połączenia z prywatnym arkuszem Google.
   - Żadne dane rzeczywistych mieszkańców ani klucze API nie trafiają do publicznego kodu.

---

## 2. Dostęp zespołowy i role projektowe

Dostęp do systemu jest ściśle ograniczony do 5 zweryfikowanych członków zespołu projektowego:

| Imię i nazwisko | Rola operacyjna | Uprawnienia w systemie | Adres e-mail |
|---|---|---|---|
| **Michał Latała** | Administrator | Pełny dostęp: zarządzanie zgłoszeniami, wysyłka, konfiguracja, diagnostyka, audyt | `wsb.student.tester@gmail.com` |
| **Barbara Seroka** | Pracownik obsługi klienta | Obsługa zgłoszeń, zmiana statusów, edycja notatek, wysyłka wiadomości, asystent AI | `barbara.seroka@example.com` |
| **Diana Skierka** | Pracownik obsługi klienta | Obsługa zgłoszeń, zmiana statusów, edycja notatek, wysyłka wiadomości, asystent AI | `diana.skierka@example.com` |
| **Anna Fedoruk** | Pracownik obsługi klienta | Obsługa zgłoszeń, zmiana statusów, edycja notatek, wysyłka wiadomości, asystent AI | `anna.fedoruk@example.com` |
| **Michał Wadyński** | Obserwator | Tryb podglądu (Read-Only): przeglądanie zgłoszeń, dashboardu i raportów bez edycji | `michal.wadynski@example.com` |

---

## 3. Specyfika autoryzacji na kontach konsumenckich `@gmail.com`

### Ograniczenie techniczne Google Apps Script:
Gdy aplikacja Apps Script Web App jest wdrożona z uprawnieniem *Wykonaj jako: Ja (właściciel)* na darmowym koncie konsumenckim `@gmail.com`, Google ze względów bezpieczeństwa i ochrony prywatności **maskuje tożsamość użytkowników zewnętrznych** – wywołanie `Session.getActiveUser().getEmail()` zwraca pusty ciąg (`""`).

### Rozwiązanie zaimplementowane w SmartCare Manager v0.3.0:
1. **Automatyczna detekcja sesji:** Backend sprawdza, czy `Session.getActiveUser().getEmail()` zwraca zweryfikowany adres e-mail (działa w środowisku Google Workspace).
2. **Autoryzacja kodem PIN zespołu:** W przypadku kont `@gmail.com` pracownik wybiera swoje nazwisko z listy 5 osób i wprowadza wspólny kod PIN zespołu:
   - Domyślny PIN zespołu: **`1926`** (rok nadania praw miejskich Kartuzom).
   - Kod PIN może zostać w każdej chwili zmieniony przez Administratora w *Project Settings → Script Properties* pod kluczem `SMARTCARE_PIN`.
3. **Podpisany token sesji:** Po weryfikacji tożsamość jest bezpiecznie zapamiętywana w `sessionStorage`. Wszystkie operacje (aktualizacja zgłoszenia, wysłanie e-maila, rozmowa telefoniczna) rejestrują rzeczywiste nazwisko pracownika w audycie CRM (`operatorName`).

---

## 4. Instrukcja wdrożenia jako Google Apps Script Web App (Wariant A – Rekomendowany)

Ta metoda uruchamia menedżera bezpośrednio w infrastrukturze chmurowej Google bez konieczności utrzymywania zewnętrznych serwerów.

### Krok 1: Otwarcie edytora Apps Script
1. Otwórz arkusz CRM **ELWOZ ECO SmartCare v0.2.8** w Google Sheets.
2. Z menu wybierz: **Rozszerzenia → Apps Script**.

### Krok 2: Weryfikacja i aktualizacja plików źródłowych
Upewnij się, że w projekcie Apps Script znajdują się poniższe pliki z gałęzi `integration/smartcare-v030`:
- `setup.gs` – Główny silnik CRM, kalkulacja CSI, obsługa formularza i kolejki;
- `ai.gs` – Integracja z Gemini API, obsługa Structured Outputs, rate limiting 15 RPM;
- `communication.gs` – Bezpieczna wysyłka e-mail, szablony, serwerowy Pre-Send Guardrail;
- `webapp.gs` – Backend Web App, kontroler JSON-RPC, obsługa sesji 5 członków zespołu;
- `webapp.html` – Kompletny, skompilowany szablon aplikacji internetowej SPA (wygenerowany przez `scripts/build-webapp.js`).

### Krok 3: Konfiguracja parametrów Script Properties
W menu edytora Apps Script wybierz **Ustawienia projektu** (ikona koła zębatego) → **Niestandardowe właściwości** (Script Properties):
- `GEMINI_API_KEY`: Klucz API z Google AI Studio;
- `SMARTCARE_PIN`: Kod autoryzacyjny zespołu (`1926`);
- `APPROVED_TEST_RECIPIENT`: `wsb.student.tester@gmail.com`.

### Krok 4: Utworzenie wdrożenia Web App
1. W prawym górnym rogu edytora kliknij: **Wdróż → Nowe wdrożenie**.
2. Kliknij ikonę koła zębatego i wybierz: **Aplikacja internetowa** (Web App).
3. Wypełnij pola konfiguracji:
   - **Opis:** `SmartCare Manager v0.3.0 – POK Kartuzy`
   - **Wykonaj jako:** `Ja (twoj_adres@gmail.com)` *(gwarantuje dostęp do arkusza i klucza API)*
   - **Kto ma dostęp:** `Każdy` (dla kont konsumenckich) lub `Wszyscy w domenie` (dla Google Workspace).
4. Kliknij **Wdróż** i zaakceptuj wymagane uprawnienia Google OAuth.
5. Skopiuj wygenerowany **Adres URL aplikacji internetowej** (np. `https://script.google.com/macros/s/.../exec`).

---

## 5. Instrukcja uruchomienia z zewnętrznego hostingu (Wariant B)

Jeżeli menedżer ma być hostowany na osobnym serwerze (np. GitHub Pages, serwer lokalny `localhost:3000`):
1. Uruchom serwer lokalny:
   ```powershell
   node manager/tests/server.js
   ```
2. Otwórz w przeglądarce: `http://localhost:3000/manager/`.
3. Przejdź do zakładki **Ustawienia**:
   - Przełącz tryb z **DEMO** na **CONNECTED (Rzeczywisty CRM Google Sheets)**.
   - Wklej wygenerowany adres URL Web App z Kroku 4.
4. Kliknij **Zapisz ustawienia**. Aplikacja połączy się bezpośrednio z arkuszem CRM przez autoryzowane żądania POST.

---

## 6. Procedury bezpieczeństwa i reguły biznesowe

### 1. Bezwzględna ochrona odbiorcy testowego (Whitelist Guard):
- Wszystkie wiadomości e-mail wysyłane z poziomu menedżera trafiają **wyłącznie** na adres `wsb.student.tester@gmail.com`.
- Próba wysyłki na jakikolwiek inny adres jest blokowana na poziomie backendu Apps Script błędem `403 Forbidden`.
- W interfejsie użytkownika widoczny jest stały komunikat informacyjny o bezpiecznym trybie testowym.

### 2. Pre-Send Quality Control Guardrail (CX/PR):
- Zarówno **temat**, jak i **treść** wiadomości podlegają bezwarunkowej weryfikacji przed wysyłką.
- Blokowane są wulgaryzmy, inwektywy (w tym 'pacanie', 'spieprzaj dziadu'), agresja, obwinianie mieszkańca oraz ujawnianie wewnętrznych nagan czy zwolnień kierowców.

### 3. Ochrona procedury zamykania zgłoszenia:
- Zmiana statusu na **Rozwiązane** lub **Zamknięte** bezwzględnie wymaga wpisania rzeczywistego sposobu rozwiązania sprawy (minimum 5 znaków).
- System blokuje szablony zawierające teksty zastępcze typu `[opis wykonanych działań]` lub `[wpisz...]`.
- Data rozwiązania sprawy jest ustawiana automatycznie i chroniona przed przypadkowym nadpisaniem.

### 4. Dynamiczne wskaźniki SLA:
- Sprawy, w których udzielono już pierwszej odpowiedzi, **nie są** oznaczane jako aktywnie naruszające SLA pierwszej reakcji.
- Wskaźniki przeliczają się dynamicznie w czasie rzeczywistym.

---

## 7. Weryfikacja wdrożenia i uruchomienie testów

Projekt zawiera pełny pakiet 157 testów automatycznych:
```powershell
# 1. Testy jednostkowe widoków i logiki demonstracyjnej (65 testów)
node manager/tests/runTests.js

# 2. Testy stabilizacji silnika backendu Apps Script v0.2.8 (48 testów)
node tests/test-v028-audit.js

# 3. Testy integracyjne menedżera z silnikiem CRM (Scenariusze A-O, 44 testy)
node tests/test-v030-integration.js
```

Wszystkie 157 testów musi zakończyć się statusem **100% PASS**.
